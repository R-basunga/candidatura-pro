const axios = require('axios');

exports.handler = async (event) => {
  try {
    const { nome, email, skills, recaptchaToken } = JSON.parse(event.body);
    if (!nome || !email) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Nome e email são obrigatórios' }) };
    }

    const recaptchaResp = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify', null,
      { params: { secret: process.env.RECAPTCHA_SECRET, response: recaptchaToken } }
    );
    if (!recaptchaResp.data.success) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Falha reCAPTCHA' }) };
    }

    await axios.post(process.env.GOOGLE_SCRIPT_URL, { nome, email, skills, timestamp: new Date().toISOString() });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
  }
};
