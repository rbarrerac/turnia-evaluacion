/**
 * Módulo: Middleware centralizado de manejo de errores
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 15/09/2026
 * Modificado por: Ronald — 07/10/2026 (Incremento 7A: P2023 de Prisma -> 400 DATOS_INVALIDOS
 *   y campo opcional `detalles` en el cuerpo del error, p. ej. CONFLICTO_CON_CITAS)
 */

// Códigos de Prisma que significan "el cliente mandó un identificador mal formado"
// (p. ej. GET /api/servicios/abc): P2023 = "Inconsistent column data: Error creating
// UUID ...", verificado empíricamente con findUnique({ where: { id: 'abc' } }). No es un
// fallo del servidor, así que se responde 400 en vez de 500 en cualquier endpoint.
const CODIGOS_PRISMA_DATOS_INVALIDOS = new Set(['P2023']);

function traducirErrorDePrisma(error) {
  if (CODIGOS_PRISMA_DATOS_INVALIDOS.has(error?.code)) {
    return {
      codigoHttp: 400,
      codigo: 'DATOS_INVALIDOS',
      mensaje: 'El identificador recibido no tiene un formato válido.',
    };
  }
  return null;
}

export function manejadorErrores(error, peticion, respuesta, _siguiente) {
  const traducido = traducirErrorDePrisma(error);
  const codigoHttp = traducido?.codigoHttp ?? error.codigoHttp ?? 500;

  // Solo se registran en consola los errores inesperados del servidor; los errores
  // de negocio/validación (4xx) son respuestas normales y ya llegan al cliente.
  if (codigoHttp >= 500) {
    console.error(error);
  }

  const codigo = traducido?.codigo ?? error.codigo ?? 'ERROR_INTERNO';
  const mensaje = traducido?.mensaje ?? error.mensaje ?? 'Ocurrió un error inesperado en el servidor.';

  const cuerpoError = { codigo, mensaje };
  if (!traducido && error.detalles !== undefined) {
    cuerpoError.detalles = error.detalles;
  }

  respuesta.status(codigoHttp).json({ exito: false, error: cuerpoError });
}

export default manejadorErrores;
