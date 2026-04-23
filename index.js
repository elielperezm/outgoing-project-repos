const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = async (req, res) => {
  // 1. Verificación de salud del servidor
  if (req.method === 'GET' && !req.query.code) {
    return res.status(200).send('Servidor operativo y listo para recibir el código de GHL.');
  }

  // 2. Capturar el código de autorización que envía GHL al instalar
  const { code, locationId } = req.query;

  if (code) {
    try {
      // Guardamos el código temporal en Upstash para saber que la instalación inició
      // Usamos el locationId como llave para identificar a qué cuenta pertenece
      await redis.set(`code_${locationId}`, code, { ex: 600 }); // Expira en 10 min

      return res.status(200).send('¡Código de autorización recibido! El sistema está procesando la conexión...');
    } catch (error) {
      console.error('Error al guardar en Redis:', error);
      return res.status(500).send('Error interno al procesar la instalación.');
    }
  }

  return res.status(200).send('Esperando evento de GHL...');
};
