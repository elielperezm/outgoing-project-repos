const { Redis } = require('@upstash/redis');
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).send('Esperando Webhooks');

  const event = req.body;
  const { contactId, locationId, direction } = event;

  if (contactId && locationId) {
    const timestamp = Date.now();
    
    if (direction === 'inbound') {
      // Registramos que llegó un mensaje del lead
      await redis.set(`inbound:${locationId}:${contactId}`, timestamp);
      await redis.sadd(`active_leads:${locationId}`, contactId); // Lo añadimos a lista de seguimiento
    } else if (direction === 'outbound') {
      // Registramos que el owner respondió
      await redis.set(`outbound:${locationId}:${contactId}`, timestamp);
    }
  }

  return res.status(200).send('OK');
};
