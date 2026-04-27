const { Redis } = require('@upstash/redis');
const axios = require('axios'); // Necesitamos axios para hablar con GHL

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = async (req, res) => {
  // Buscamos todas las llaves de mensajes entrantes en Redis
  const keys = await redis.keys('inbound:*');
  const now = Date.now();
  const LIMIT = 15 * 60 * 1000; // 15 minutos exactos

  for (const key of keys) {
    const inboundTimestamp = await redis.get(key);
    
    // Extraemos los IDs de la llave (formato inbound:locationId:contactId)
    const [ , locationId, contactId] = key.split(':');

    // Verificamos si el owner ya respondió
    const outboundTimestamp = await redis.get(`outbound:${locationId}:${contactId}`) || 0;

    // LÓGICA: Si pasaron > 15 min Y la respuesta es más vieja que el mensaje del lead
    if (inboundTimestamp && (now - inboundTimestamp > LIMIT) && (outboundTimestamp < inboundTimestamp)) {
      
      // 1. Obtener el Token de GHL que guardamos en auth.js
      const token = await redis.get(`token:${locationId}`);

      if (token) {
        try {
          // 2. Crear la Nota Interna (Huella digital para supervisores)
          await axios.post(`https://services.leadconnectorhq.com/contacts/${contactId}/notes`, {
            body: "SISTEMA: Este lead no ha recibido respuesta en los últimos 15 minutos."
          }, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Version': '2021-07-28'
            }
          });

          // 3. Limpiamos Redis para que no repita la nota cada minuto
          await redis.del(key);
          console.log(`Nota creada para contacto ${contactId}`);
        } catch (error) {
          console.error(`Error al crear nota en GHL: ${error.response?.data || error.message}`);
        }
      }
    }
  }
  return res.status(200).send('Proceso de revisión terminado');
};
