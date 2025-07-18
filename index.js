require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Route de soumission
app.post('/submit', async (req, res) => {
  try {
    const { nome, email, skills, recaptchaToken } = req.body;

    // Validation
    if (!nome || !email || !recaptchaToken) {
      return res.status(400).json({ 
        message: 'Por favor, preencha todos os campos obrigatórios.' 
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