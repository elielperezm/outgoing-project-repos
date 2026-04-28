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
      user_type: 'Location',
      redirect_uri: `https://${process.env.VERCEL_URL}/api/auth`
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

    // --- PASO DE DEBUG (El espía): ---
    // Esto imprimirá en los logs de Vercel todo lo que GHL nos responde
    console.log("Respuesta completa de GHL:", JSON.stringify(response.data));

    // --- LÓGICA DE EXTRACCIÓN MEJORADA: ---
    // Probamos extraer el ID de varias formas comunes por si GHL cambió el nombre
    const locationId = response.data.locationId || response.data.location_id; 

    if (!locationId) {
        console.error("¡ALERTA! No encontré el locationId en la respuesta de GHL:", response.data);
        return res.status(500).send('Error: La respuesta de GHL no contiene el ID de la ubicación.');
    }

    // --- GUARDADO EN REDIS: ---
    await redis.set(`token:${locationId}`, response.data.access_token);
    
    res.send('¡Instalación exitosa! Ya puedes cerrar esta ventana.');
  } catch (error) {
    console.error("Error al intercambiar el token:", error.response?.data || error.message);
    res.status(500).send('Error al intercambiar el token');
  }
};
