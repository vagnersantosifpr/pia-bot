require('dotenv').config();
const mongoose = require('mongoose');
const AIModel = require('./models/AIModel');


const initialModels = [
  { name: 'Gemini 1.5 Flash', modelId: 'gemini-1.5-flash', isDefault: true, description: 'Modelo rápido e eficiente para tarefas do dia a dia.' },
  { name: 'Gemini 1.5 Pro', modelId: 'gemini-1.5-pro', isDefault: false, description: 'Modelo de alta performance para raciocínio complexo.' },
  { name: 'Gemini 1.5 Flash-8B', modelId: 'gemini-1.5-flash-8b', isDefault: false, description: 'Versão ultra-leve e econômica.' },
  { name: 'Gemini 2.0 Flash', modelId: 'gemini-2.0-flash', isDefault: false, description: 'Nova geração de modelos ultra-rápidos.' },
  { name: 'Gemini 1.0 Pro', modelId: 'gemini-1.0-pro', isDefault: false, description: 'Modelo legado estável.' },
  { name: 'Gemini Flash Latest', modelId: 'gemini-flash-latest', isDefault: false, description: 'Sempre aponta para a versão estável mais recente do Flash.' },
  { name: 'Gemini Flash Lite', modelId: 'gemini-flash-lite-latest', isDefault: false, description: 'Versão otimizada para latência mínima.' },
  // Modelos experimentais que podem ser desativados facilmente
  { name: 'Gemini 3.1 Pro Preview', modelId: 'gemini-3.1-pro-preview', isActive: false, isDefault: false, description: 'Preview tecnológico (Instável).' },
  { name: 'Gemini 3.1 Flash Preview', modelId: 'gemini-3.1-flash-preview', isActive: false, isDefault: false, description: 'Preview tecnológico (Instável).' }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Conectado ao MongoDB para seeding...');

    // Limpa a coleção atual (opcional, use com cautela)
    // await AIModel.deleteMany({});

    for (const modelData of initialModels) {
      await AIModel.findOneAndUpdate(
        { modelId: modelData.modelId },
        modelData,
        { upsert: true, new: true }
      );
    }

    console.log('Modelos de IA semeados com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro no seed:', error);
    process.exit(1);
  }
}

seed();