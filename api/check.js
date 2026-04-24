const { Redis } = require('@upstash/redis');
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = async (req, res) => {
  const locationId = "TU_LOCATION_ID_AQUI"; // Reemplaza esto con tu ID de GHL
  const leads = await redis.smembers(`active_leads:${locationId}`);
  const now = Date.now();
  const LIMIT = 5 * 60 * 1000; // 5 minutos en milisegundos

  for (const contactId of leads) {
    const inbound = await redis.get(`inbound:${locationId}:${contactId}`);
    const outbound = await redis.get(`outbound:${locationId}:${contactId}`) || 0;

    // Lógica: Si pasaron > 5 min y no ha respondido o su respuesta es vieja
    if (inbound && (now - inbound > LIMIT) && (outbound < inbound)) {
      console.log(`ALERTA: Lead ${contactId} sin respuesta.`);
      // AQUÍ IRÁ EL CÓDIGO PARA ENVIAR LA NOTIFICACIÓN (Email/SMS/Webhook)
    }
  }
  return res.status(200).send('Revisión completada');
};
