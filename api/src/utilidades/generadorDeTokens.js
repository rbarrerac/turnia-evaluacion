/**
 * Módulo: Generación y verificación de tokens JWT
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 18/09/2026
 */

import jwt from 'jsonwebtoken';
import { entorno } from '../configuracion/entorno.js';

export function generarToken(cargaUtil) {
  return jwt.sign(cargaUtil, entorno.jwtSecret, { expiresIn: entorno.jwtExpiracion });
}

export function verificarToken(token) {
  return jwt.verify(token, entorno.jwtSecret);
}
