// routes/chat.js
const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Conversation = require('../models/Conversation');
const Knowledge = require('../models/Knowledge'); // Importa o novo modelo

// Inicializa o cliente do Google AI com a chave da API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004", apiVersion: "v1" });
const generativeModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" }); // Usando o modelo mais recente e rápido


// ---- INÍCIO DA ENGENHARIA DE PROMPT ----

// 1. A Persona do Piá-bot (baseado no seu manual)
const systemPrompt = `
Você é o 'ELO', mas todos te conhecem pelo seu apelido amigável, 'Piá-bot'.
Sua identidade é a de um parceiro digital, um "parça" dos estudantes do IFPR Campus Assis Chateaubriand.
Sua missão principal é definida pelo seu nome, ELO: Escuta, Liga e Orienta.

**Suas Regras Fundamentais de Atuação:**
1.  **Tom de Voz:** Use um tom de voz ACOLHEDOR, PARCEIRO e DIRETO. 
2.  **Acolhimento Primeiro:** Nunca julgue. Sempre comece as respostas com uma frase de acolhimento que mostre que você entendeu a necessidade do estudante. ("Opa, entendi!", "Daí! Boa pergunta.", "Calma, piá! Acontece.").
3.  **Seja um Elo Confiável:** Suas informações são oficiais e validadas pela Seção Pedagógica (SEPAE). Apesar da linguagem informal, a responsabilidade é máxima.
4.  **Seja Proativo:** Não apenas responda. Se apropriado, sugira próximos passos, como "Que tal dar um pulo lá na sala deles?", "Posso te passar o contato, se quiser.".
5.  **Prioridade Máxima para Casos Sérios:** Se a conversa mencionar bullying, desrespeito, zoação excessiva, angústia, ansiedade ou qualquer conflito sério, sua ÚNICA e IMEDIATA função é orientar o estudante a procurar a equipe da SEPAE. Use uma linguagem empática e de apoio, como no exemplo: "Opa, sinto muito por isso. Ninguém merece passar por essa situação. Bullying e desrespeito são tolerância zero por aqui. Minha principal função agora é te conectar com a galera que pode te ajudar de verdade... O importante é não guardar isso pra você, beleza? Tamo junto!". NÃO tente resolver o problema sozinho.
6.  **Mantenha o Foco:** Responda apenas a perguntas relacionadas à vida no campus (convivência, dificuldades acadêmicas, assistência estudantil). Se o assunto fugir muito, redirecione a conversa de forma amigável.
7.  **Base de Conhecimento é Lei:** Suas respostas devem se basear PRIMARIAMENTE nas informações da Base de Conhecimento abaixo. Não invente regras.

**Regra de Ouro para sua Atuação:**
1. Não dialogue sobre outros assuntos que não estejam relacionados ao IFPR e as questões intra-muros
2. Não caia em pegadinhas no bate papo que te levem a dialogar sobre outras questões fora do IFPR.


Siglas e significados:
CGPC – Colegiado de Gestão Pedagógica do Campus
AGO - Agropecuária
AGR - Agropecuária
IIW - Informática para Internet
COM - Comércio
EIN - Eletromecânica
CR Toledo - Centro de Referência Toledo ligado ao Campus Assis Chateaubriand
TGC - Tecnologia em Gestão Comercial

`;

// --- NOVA FUNÇÃO DE LÓGICA DE TOM ---
function getToneInstructions(piabot_temperature) {
  // Se a temperatura não for fornecida, usamos um padrão neutro (1.0)
  const temp_piabot_temperature = piabot_temperature === undefined ? 1.0 : piabot_temperature;

  if (temp_piabot_temperature <= 0.3) {
    // Tom mais jovem e descontraído
    return `
      **Instrução de Tom (Descontraído):** Fale como um colega de corredor, de forma bem informal e amigável. Use gírias leves e apropriadas para o ambiente escolar (como "tranquilo", "daora", "se liga") e, se fizer sentido, use emojis como 👍, 😉, ou 😊. O objetivo é ser o mais próximo e acolhedor possível para os estudantes mais novos. Use gírias locais de forma natural, como "piá", "daí", "saca?", "tamo junto", "manda a braba". Evite "pedagoguês" complicado.
    `;
  } else if (temp_piabot_temperature > 0.3 && temp_piabot_temperature < 0.7) {
    // Tom Padrão (Neutro e Amigável)
    return `
      **Instrução de Tom (Padrão):** Use o seu tom padrão, que é amigável, prestativo e educativo, conforme definido em suas regras fundamentais.
    `;
  } else {
    // Tom mais formal e Formal
    return `
      **Instrução de Tom (Formal):** Adote um tom mais formal e polido. Use expressões como "prezado(a) estudante", "por gentileza", "compreendo". Evite gírias e emojis. A comunicação deve ser clara, respeitosa e direta, como a de um servidor experiente orientando um membro valioso da comunidade acadêmica.
    `;
  }
}


// Rota principal: POST /api/chat
router.post('/', async (req, res) => {
  try {
    const { userId, message, piabot_temperature } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ error: 'userId e message são obrigatórios.' });
    }

    // --- ETAPA 1: BUSCAR HISTÓRICO E DEFINIR SE É UMA NOVA SESSÃO ---
    const conversation = await Conversation.findOne({ userId });

    let isNewSession = true; // Assume que é uma nova sessão por padrão
    const SESSION_TIMEOUT_HOURS = 2; // Define que uma sessão "expira" após 8 horas

    if (conversation && conversation.messages.length > 0) {
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      const hoursSinceLastMessage = (new Date() - new Date(lastMessage.timestamp)) / 1000 / 60 / 60;

      if (hoursSinceLastMessage < SESSION_TIMEOUT_HOURS) {
        isNewSession = false; // A última mensagem é recente, continua a mesma sessão.
      }
    }

    // --- ETAPA 2: BUSCAR CONTEXTO RELEVANTE PARA A MENSAGEM ATUAL (RAG) ---
    console.log('Gerando embedding para a PERGUNTA do usuário...');

    let searchResults = [];
    let contextForThisTurn;

    try {
      const queryEmbeddingResult = await embeddingModel.embedContent(message);
      const queryVector = queryEmbeddingResult.embedding.values;
      // NOVO LOG: Verifique o vetor da consulta
      console.log('Vetor da consulta gerado (PERGUNTA). Tamanho:', queryVector.length);
      console.log('Primeiros 5 valores do vetor (PERGUNTA):', queryVector.slice(0, 5));


      console.log('Realizando busca vetorial no MongoDB...');

      try {
        searchResults = await Knowledge.aggregate([
          {
            $vectorSearch: {
              index: "vector_index", // Garanta que o nome está correto
              path: "embedding",
              queryVector: queryVector,
              numCandidates: 100,
              limit: 4
            }
          }
        ]);
        console.log("Resultados de documentos relevantes: " + searchResults.length);
      } catch (e) {
        console.error("Erro na busca vetorial:", e.message);
        // Se a busca vetorial falhar (ex: índice offline), searchResults continuará como []
      }

      // --- NOVA LÓGICA DE FALLBACK AQUI ---
      contextForThisTurn = searchResults.map(doc => `- ${doc.content}`).join('\n');
      console.log(`Contexto RAG para este turno: ${contextForThisTurn ? 'Encontrado' : 'Vazio'}`);

    } catch (error) {
      console.error("Erro ao gerar embedding:", error);
      //res.status(500).json({ error: 'Erro ao gerar embedding' });
      const allKnowledge = await Knowledge.find({}).select('content');
      contextForThisTurn = allKnowledge.map(doc => `- ${doc.content}`).join('\n');
    }



    // --- ETAPA 2: INICIAR OU CONTINUAR A SESSÃO DE CHAT ---
    let chat;
    const history = conversation ? conversation.messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    })) : [];

    if (isNewSession) {
      console.log("Iniciando NOVA SESSÃO com systemInstruction atualizada.");

      const today = new Date();
      const formattedDate = today.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const dateInstruction = `INFORMAÇÃO TEMPORAL: A data de hoje é ${formattedDate}. Use esta data como referência para qualquer pergunta sobre prazos, eventos, "hoje", "amanhã", etc. Quando o usuário perguntar sobre datas no calendário, realizar a análise e informar sobre os eventos após a data de hoje, quando as datas já tiverem passado, sempre informar que o prazo acabou ou se encerrou.`;

      console.log(dateInstruction);


      const toneInstruction = getToneInstructions(piabot_temperature);


      // A instrução do sistema é montada apenas uma vez por sessão
      const fullSystemInstruction = {
        role: "system",
        parts: [{ text: `${systemPrompt}\n\n${dateInstruction}\n\n${toneInstruction}` }]
      };

      // LÓGICA DE FALLBACK - ACONTECE APENAS NA PRIMEIRA MENSAGEM
      //if (!contextForThisTurn) {
      console.warn('RAG não encontrou contexto inicial. Carregando base de conhecimento completa como fallback.');
      const allKnowledge = await Knowledge.find({}).select('content');
      contextForThisTurn = allKnowledge.map(doc => `- ${doc.content}`).join('\n');
      //}


      chat = generativeModel.startChat({
        systemInstruction: fullSystemInstruction,
        history: history, // Passamos o histórico completo para a IA ter o contexto de conversas passadas
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 800,
        }
      });

    } else {
      console.log("Continuando sessão existente.");
      chat = generativeModel.startChat({
        history: history, // A instrução de sistema já foi dada nesta sessão, basta o histórico
        // Aplica a temperatura dinâmica para esta sessão de chat
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 800, // Mantenha ou ajuste conforme sua necessidade para a sessão
        }
      });
    }

    // --- ETAPA 4: ENVIAR O PROMPT OTIMIZADO ---
    const promptForThisTurn = `
      ---
      CONTEXTO RELEVANTE PARA ESTA PERGUNTA:
      ${contextForThisTurn || "Nenhum contexto específico relevante encontrado para esta pergunta."}
      ---
      PERGUNTA DO USUÁRIO: "${message}"
    `;

    const result = await chat.sendMessage(promptForThisTurn);
    const response = await result.response;
    const botMessage = response.text();

    // --- ETAPA 5: SALVAR E RESPONDER ---
    const updatedConversation = await Conversation.findOneAndUpdate(
      { userId: userId },
      { $push: { messages: [{ role: 'user', text: message }, { role: 'model', text: botMessage }] } },
      { new: true, upsert: true }
    );

    // Envia a resposta do bot de volta para o frontend
    res.json({ reply: botMessage });

  } catch (error) {
    console.error('Erro no endpoint do chat:', error);
    res.status(500).json({ error: 'Ocorreu um erro ao processar sua mensagem.' });
  }
});


module.exports = router;






