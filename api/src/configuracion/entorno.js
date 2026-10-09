/**
 * Módulo: Carga y validación de variables de entorno
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 15/09/2026
 */

import 'dotenv/config';
import path from 'node:path';

const VARIABLES_CRITICAS = ['DATABASE_URL', 'JWT_SECRET', 'PUERTO_API', 'ORIGEN_PERMITIDO'];

function validarEntorno() {
  const faltantes = VARIABLES_CRITICAS.filter((clave) => !process.env[clave]);
  if (faltantes.length > 0) {
    throw new Error(
      `Faltan variables de entorno obligatorias: ${faltantes.join(', ')}. ` +
        'Copia api/.env.example a api/.env y completa los valores.',
    );
  }
}

validarEntorno();

export const entorno = {
  puertoApi: process.env.PUERTO_API,
  origenPermitido: process.env.ORIGEN_PERMITIDO,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiracion: process.env.JWT_EXPIRACION ?? '7d',
  // Carpeta donde se guardan las fotos subidas de la galería de trabajos (Incremento 6).
  // Por defecto, "almacenamiento/trabajos" dentro de api/; los estáticos se sirven
  // desde la carpeta padre ("almacenamiento") en /archivos, así que una foto queda
  // accesible en /archivos/trabajos/<archivo>.
  directorioSubidas: process.env.DIRECTORIO_SUBIDAS
    ? path.resolve(process.env.DIRECTORIO_SUBIDAS)
    : path.resolve(process.cwd(), 'almacenamiento', 'trabajos'),
  smtp: {
    host: process.env.SMTP_HOST,
    puerto: process.env.SMTP_PUERTO,
    usuario: process.env.SMTP_USUARIO,
    contrasena: process.env.SMTP_CONTRASENA,
    remitente: process.env.SMTP_REMITENTE,
  },
};

export default entorno;
