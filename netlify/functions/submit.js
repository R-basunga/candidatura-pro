// netlify/functions/submit.js
const axios = require('axios');

exports.handler = async (event) => {
  try {
    const { nome, email, skills, recaptchaToken } = JSON.parse(event.body);

    // Validation
    if (!nome || !email) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Nome e email são obrigatórios' }) };
    }

    // Vérification reCAPTCHA
    const recaptchaResp = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      { params: { secret: process.env.RECAPTCHA_SECRET, response: recaptchaToken } }
    );
    if (!recaptchaResp.data.success) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Falha reCAPTCHA' }) };
    }

    // Envoi vers Google Script Web App
    await axios.post(process.env.GOOGLE_SCRIPT_URL, {
      nome, email, skills, timestamp: new Date().toISOString(),
      token: process.env.SECRET_TOKEN
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
  }
};
