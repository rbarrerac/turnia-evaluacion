/**
 * Módulo: Middleware de autenticación — verifica el token JWT
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 18/09/2026
 */

import { verificarToken } from '../utilidades/generadorDeTokens.js';

export function verificarAutenticacion(peticion, respuesta, siguiente) {
  const encabezado = peticion.headers.authorization ?? '';
  const [tipo, token] = encabezado.split(' ');

  if (tipo !== 'Bearer' || !token) {
    respuesta.status(401).json({
      exito: false,
      error: {
        codigo: 'TOKEN_FALTANTE',
        mensaje: 'Debe iniciar sesión para acceder a este recurso.',
      },
    });
    return;
  }

  try {
    peticion.usuaria = verificarToken(token);
    siguiente();
  } catch (_error) {
    respuesta.status(401).json({
      exito: false,
      error: {
        codigo: 'TOKEN_INVALIDO',
        mensaje: 'La sesión no es válida o ha expirado.',
      },
    });
  }
}

export default verificarAutenticacion;
