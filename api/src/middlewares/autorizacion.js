/**
 * Módulo: Middleware de autorización — verifica el rol (administradora/clienta)
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 17/09/2026
 */

export function verificarRol(rolRequerido) {
  return function autorizador(peticion, respuesta, siguiente) {
    if (!peticion.usuaria || peticion.usuaria.rol !== rolRequerido) {
      respuesta.status(403).json({
        exito: false,
        error: {
          codigo: 'SIN_PERMISO',
          mensaje: 'No tiene permisos para realizar esta acción.',
        },
      });
      return;
    }
    siguiente();
  };
}

export default verificarRol;
