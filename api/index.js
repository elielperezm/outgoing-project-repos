const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = async (req, res) => {
  if (req.method === 'GET' && !req.query.code) {
    return res.status(200).send('Servidor operativo y escuchando.');
  }

  const { code, locationId } = req.query;

  if (code) {
    try {
      await redis.set(`code_${locationId}`, code, { ex: 600 });
      return res.status(200).send('¡Código recibido y guardado correctamente!');
    } catch (error) {
      console.error(error);
      return res.status(500).send('Error al procesar.');
    }
  }

  return res.status(200).send('Esperando evento...');
};
