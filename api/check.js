const { Redis } = require('@upstash/redis');
const axios = require('axios');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const COMPANY_ID = "As2SuvF0uQD3XuW2x8e2"; // Tu ID de agencia confirmado

module.exports = async (req, res) => {
  try {
    // 1. Obtener todos los leads que han escrito (de la lista en Redis)
    const activeLeads = await redis.smembers(`active_leads:${COMPANY_ID}`);
    const now = Date.now();
    const quinceMinutos = 15 * 60 * 1000;

    // Traemos el token de la agencia
    const accessToken = await redis.get(`token:${COMPANY_ID}`);

    for (const contactId of activeLeads) {
      const lastInbound = await redis.get(`inbound:${COMPANY_ID}:${contactId}`);
      const lastOutbound = await redis.get(`outbound:${COMPANY_ID}:${contactId}`);

      // Si el lead escribió hace más de 15 min Y no hay respuesta posterior
      if (now - lastInbound > quinceMinutos && (!lastOutbound || lastOutbound < lastInbound)) {
        
        // 2. CREAR NOTA INTERNA (Tu objetivo principal)
        await axios.post(`https://services.leadconnectorhq.com/contacts/${contactId}/notes`, 
          { body: "⚠️ ALERTA: Este lead no ha recibido respuesta en más de 15 minutos." },
          { headers: { 'Authorization': `Bearer ${accessToken}`, 'Version': '2021-04-15' } }
        );

        // Sacamos al lead de la lista activa para no repetir la nota cada 5 min
        await redis.srem(`active_leads:${COMPANY_ID}`, contactId);
        console.log(`Nota creada para el contacto: ${contactId}`);
      }
    }

    res.status(200).send('Revisión completada');
  } catch (error) {
    console.error("Error en el check:", error.response?.data || error.message);
    res.status(500).send('Error en el proceso de verificación');
  }
};
