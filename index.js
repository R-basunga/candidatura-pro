require('dotenv').config();
const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Muitas solicitações deste IP, tente novamente mais tarde'
});
app.use(limiter);

// Route de soumission
app.post('/submit', [
  body('nome').trim().notEmpty().withMessage('Nome é obrigatório'),
  body('email').trim().isEmail().withMessage('Email inválido'),
  body('recaptchaToken').notEmpty().withMessage('Token reCAPTCHA faltando')
], async (req, res) => {
  console.log("Requête reçue:", req.body);
  
  // Validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("Erreurs de validation:", errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { nome, email, skills, recaptchaToken } = req.body;

  try {
    // Vérification reCAPTCHA
    console.log("Vérification reCAPTCHA...");
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

    console.log("Réponse reCAPTCHA:", recaptchaResponse.data);
    
    if (!recaptchaResponse.data.success) {
      return res.status(400).json({ 
        message: 'Falha na verificação reCAPTCHA: ' + 
                 (recaptchaResponse.data['error-codes'] || '').join(', ')
      });
    }

    // Préparation des données pour Google Sheets
    const sheetData = {
      nome,
      email,
      skills: skills || '',
      timestamp: new Date().toISOString()
    };

    // Envoi à Google Apps Script
    console.log("Envoi à Google Apps Script:", sheetData);
    const scriptResponse = await axios.post(
      'https://script.google.com/macros/s/AKfycbxLg8aXgF0uVJ6sBvjR1yFqYdTd7jK2Zt1oX5mzqS0/exec',
      sheetData,
      {
        headers: { 'Content-Type': 'application/json' },
        // Important pour contourner les restrictions CORS
        transformRequest: [(data, headers) => {
          delete headers.common['Authorization'];
          return JSON.stringify(data);
        }]
      }
    );

    console.log("Réponse Google Apps Script:", scriptResponse.data);
    
    if (scriptResponse.data.result !== 'success') {
      throw new Error('Erro no Google Apps Script: ' + 
                     (scriptResponse.data.message || ''));
    }

    res.json({ success: true, message: 'Dados salvos com sucesso!' });
  } catch (error) {
    console.error('Erro completo:', error);
    
    let errorMessage = 'Erro interno do servidor';
    if (error.response) {
      console.error('Dados da resposta de erro:', error.response.data);
      errorMessage = error.response.data.message || 
                    error.response.data.error || 
                    JSON.stringify(error.response.data);
    }
    
    res.status(500).json({ 
      message: errorMessage,
      details: error.message
    });
  }
});

// Route de test
app.get('/test', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date(),
    recaptcha: !!process.env.RECAPTCHA_SECRET_KEY
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Test endpoint: http://localhost:${PORT}/test`);
});