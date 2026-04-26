const { Redis } = require('@upstash/redis');
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).send('Esperando Webhooks');

  const event = req.body;
  const { contactId, locationId, type } = event;

  if (contactId && locationId) {
    const timestamp = Date.now();
    
    // Si entra un mensaje del lead
    if (type === 'InboundMessage') {
      await redis.set(`inbound:${locationId}:${contactId}`, timestamp);
      await redis.sadd(`active_leads:${locationId}`, contactId);
      return res.status(200).send('Inbound registrado');
    } 
    
    // Si sale un mensaje del owner (respuesta)
    else if (type === 'OutboundMessage') {
      await redis.set(`outbound:${locationId}:${contactId}`, timestamp);
      return res.status(200).send('Outbound registrado');
    }
  }

  return res.status(200).send('Evento procesado');
};
