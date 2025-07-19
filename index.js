// Original Express server (no longer used in Netlify Deployment)
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['https://your-site.netlify.app', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

app.post('/submit', async (req, res) => {
  const { nome, email, skills, recaptchaToken } = req.body;
  try {
    if (!nome || !email) return res.status(400).json({ message: 'Nome e email são obrigatórios' });

    const recaptchaResp = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
      params: { secret: process.env.RECAPTCHA_SECRET, response: recaptchaToken }
    });
    if (!recaptchaResp.data.success) return res.status(400).json({ message: 'Falha reCAPTCHA' });

    const sheetResp = await axios.post(process.env.GOOGLE_SCRIPT_URL, { nome, email, skills, timestamp: new Date().toISOString() });
    if (sheetResp.data.result !== 'success') throw new Error('Erro no Google Sheets');

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
