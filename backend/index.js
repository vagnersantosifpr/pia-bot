// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

connectDB();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

// Confia no proxy para obter o IP real do cliente (essencial para rate-limiting em PaaS como Render/Heroku)
app.set('trust proxy', 1);

app.use(express.json());

// ---- ADICIONE ESTAS LINHAS ----
// Define um prefixo para todas as rotas de chat
app.use('/api/chat', require('./routes/chat'));
// ---------------------------------
// Rota de Autenticação (pública)
app.use('/api/auth', require('./routes/auth'));

// Rotas de Admin (protegidas)
app.use('/api/admin', require('./routes/admin'));


app.get('/', (req, res) => {
  res.send('Servidor AssisBot está online e pronto para conversar!');
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});