require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware critiques
app.use(cors({
  origin: ['https://candidaturas.netlify.app', 'http://localhost:3000','https://script.google.com/macros/s/AKfycbxLg8aXgF0uVJ6sBvjR1yFqYdTd7jK2Zt1oX5mzqS0/exec'],
  credentials: true
}));
app.use(express.json());

// Route corrigée
app.post('/submit', async (req, res) => {
  const { nome, email, skills, recaptchaToken } = req.body;
  try {
    // Valider les données
    if (!req.body.nome || !req.body.email) {
      return res.status(400).json({ 
        success: false,
        message: 'Nome e email são obrigatórios' 
      });
    }

    // Valider reCAPTCHA
    const recaptchaResponse = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: recaptchaToken
        }
      }
    );

    if (!recaptchaResponse.data.success) {
      return res.status(400).json({ 
        message: 'Falha na verificação reCAPTCHA' 
      });
    }

    // Envoyer à Google Sheets
    const sheetResponse = await axios.post(
      'https://script.google.com/macros/s/AKfycbxLg8aXgF0uVJ6sBvjR1yFqYdTd7jK2Zt1oX5mzqS0/exec',
      {
        nome,
        email,
        skills,
        timestamp: new Date().toISOString()
      }
    );

    if (sheetResponse.data.result !== 'success') {
      throw new Error('Erro no Google Sheets');
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erro no servidor:', error);
    res.status(500).json({ 
      message: error.response?.data?.message || 'Erro interno do servidor' 
    });
  }
});

// Route de santé
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});