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
  TOKEN_EXPIRY = "5m" // 5 minutes
} = process.env;

// Middleware pour vérifier le token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticação não fornecido" });
  }

  const token = authHeader.split(" ")[1];
  
  try {
    const [header, payload, signature] = token.split(".");
    const expectedSignature = crypto
      .createHmac("sha256", TOKEN_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64");

    if (signature !== expectedSignature) {
      return res.status(401).json({ error: "Token inválido" });
    }

    const payloadData = JSON.parse(Buffer.from(payload, "base64").toString());
    
    // Vérifier l'expiration
    if (payloadData.exp < Date.now() / 1000) {
      return res.status(401).json({ error: "Token expirado" });
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido" });
  }
};

// Endpoint pour obtenir un token
app.get("/get-token", (req, res) => {
  try {
    const header = Buffer.from(JSON.stringify({
      alg: "HS256",
      typ: "JWT"
    })).toString("base64");

    const payload = Buffer.from(JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + (parseInt(TOKEN_EXPIRY) * 60),
      iat: Math.floor(Date.now() / 1000)
    })).toString("base64");

    const signature = crypto
      .createHmac("sha256", TOKEN_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64");

    const token = `${header}.${payload}.${signature}`;
    
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: "Erro ao gerar token" });
  }
});

// Endpoint pour soumettre le formulaire
app.post("/submit", verifyToken, async (req, res) => {
  try {
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