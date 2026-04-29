const { Redis } = require('@upstash/redis');
const axios = require('axios');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = async (req, res) => {
  const { code } = req.query;

  if (!code) return res.status(400).send('Falta el código de autorización');

  try {
    const response = await axios.post('https://services.leadconnectorhq.com/oauth/token', new URLSearchParams({
      client_id: process.env.GHL_CLIENT_ID,
      client_secret: process.env.GHL_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      user_type: 'Company', // Confirmado por tu JSON
      redirect_uri: `https://${process.env.VERCEL_URL}/api/auth`
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

    // Extraemos el companyId basándonos en tu respuesta real
    const companyId = response.data.companyId;

    if (!companyId) {
        return res.status(500).send('Error: No se encontró companyId en la respuesta final.');
    }

    // Guardamos en Redis usando el ID de la compañía
    await redis.set(`token:${companyId}`, response.data.access_token);
    
    res.send('¡Instalación exitosa! La conexión con la agencia ha sido establecida.');
  } catch (error) {
    console.error("Error en el intercambio:", error.response?.data || error.message);
    res.status(500).send('Error al procesar la instalación.');
  }
};
