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

    // --- IMPRESIÓN CRÍTICA PARA EL LOG ---
    console.log("JSON RECIBIDO DE GHL:", JSON.stringify(response.data));

    // --- BUSCADOR MULTI-CAPA DE ID ---
    // GHL a veces lo pone en la raíz, a veces dentro de 'locationId', o en 'meta'
    const locationId = 
        response.data.locationId || 
        response.data.location_id || 
        (response.data.meta && response.data.meta.locationId) ||
        (response.data.context && response.data.context.locationId);

    if (!locationId) {
        // Si falla, mostramos el JSON real en pantalla para no adivinar más
        return res.status(500).send(`Error: No se halló ID. Datos recibidos: ${JSON.stringify(response.data)}`);
    }

    // Guardar el token (ahora sí con el ID real)
    await redis.set(`token:${locationId}`, response.data.access_token);
    
    res.send('¡Instalación exitosa! Ya puedes cerrar esta ventana.');
  } catch (error) {
    console.error("Error técnico:", error.response?.data || error.message);
    res.status(500).send('Error al intercambiar el token');
  }
};
