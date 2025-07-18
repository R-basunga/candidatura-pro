require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

// Configuration
const {
  RECAPTCHA_SECRET,
  GOOGLE_SCRIPT_URL,
  TOKEN_SECRET,
  TOKEN_EXPIRY = 300 // 5 minutes
} = process.env;

// Génération de token JWT
const generateToken = () => {
  const header = Buffer.from(JSON.stringify({
    alg: "HS256",
    typ: "JWT"
  })).toString("base64");

  const payload = Buffer.from(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + Number(TOKEN_EXPIRY),
    iat: Math.floor(Date.now() / 1000)
  })).toString("base64");

  const signature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64");

  return `${header}.${payload}.${signature}`;
};

// Endpoint pour obtenir un token
app.get("/get-token", (req, res) => {
  try {
    const token = generateToken();
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: "Erro ao gerar token" });
  }
});

// Soumission du formulaire
app.post("/submit", async (req, res) => {
  try {
    // Vérification du token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token inválido" });
    }

    const token = authHeader.split(" ")[1];
    const [header, payload, signature] = token.split(".");
    
    const expectedSignature = crypto
      .createHmac("sha256", TOKEN_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64");

    if (signature !== expectedSignature) {
      return res.status(401).json({ error: "Token inválido" });
    }

    // Vérification de l'expiration
    const payloadData = JSON.parse(Buffer.from(payload, "base64").toString());
    if (payloadData.exp < Date.now() / 1000) {
      return res.status(401).json({ error: "Token expirado" });
    }

    // Vérification reCAPTCHA
    const { recaptchaToken, ...formData } = req.body;
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET}&response=${recaptchaToken}`;
    
    const { data: captchaRes } = await axios.post(verifyUrl);
    if (!captchaRes.success) {
      return res.status(400).json({ error: "Falha na verificação reCAPTCHA" });
    }

    // Envoi à Google Apps Script
    const response = await axios.post(GOOGLE_SCRIPT_URL, {
      ...formData,
      timestamp: new Date().toISOString()
    });

    res.json(response.data);
  } catch (error) {
    console.error("Erro no proxy:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor proxy rodando na porta ${PORT}`);
});