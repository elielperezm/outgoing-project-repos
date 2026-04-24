const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = async (req, res) => {
  const { code, locationId } = req.query;

  if (!code) {
    return res.status(200).send('Servidor operativo. Esperando código de instalación.');
  }

  try {
    // 1. Intercambiar el código por el Access Token en GHL
    const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GHL_CLIENT_ID,
        client_secret: process.env.GHL_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        user_type: 'Location'
      })
    });

    const data = await response.json();

    if (data.access_token) {
      // 2. Guardar los tokens permanentemente en Redis usando el locationId
      await redis.set(`token_${locationId}`, JSON.stringify(data));
      return res.status(200).send('¡Éxito! Token obtenido y guardado. La App está lista.');
    } else {
      return res.status(500).send('Error al obtener el token: ' + JSON.stringify(data));
    }
  } catch (error) {
    return res.status(500).send('Error en el proceso de intercambio: ' + error.message);
  }
};
