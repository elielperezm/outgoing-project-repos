const { Redis } = require('@upstash/redis');

// Configuración de conexión a Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = async (req, res) => {
  // Verificación simple de que el servidor está vivo
  if (req.method === 'GET') {
    return res.status(200).send('Servidor operativo');
  }

  // Aquí irá la lógica de los webhooks que construiremos luego
  return res.status(200).send('Webhook recibido');
};
