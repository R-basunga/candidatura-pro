const axios = require("axios");

exports.handler = async (event) => {
  const { nome, email, recaptchaToken } = JSON.parse(event.body);

  // 1. Vérifier reCAPTCHA
  const recaptchaUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${recaptchaToken}`;
  const recaptchaRes = await axios.post(recaptchaUrl);

  if (!recaptchaRes.data.success) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "reCAPTCHA invalide" }),
    };
  }

  // 2. Envoyer à Google Sheets (via Apps Script)
  const googleScriptUrl = process.env.'https://script.google.com/macros/s/AKfycbxLg8aXgF0uVJ6sBvjR1yFqYdTd7jK2Zt1oX5mzqS0/exec';
  await axios.post(googleScriptUrl, { nome, email });

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};