/**
 * Módulo: Preparación de la base de datos — rol de aplicación, base y extensión btree_gist
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 18/09/2026
 */

import 'dotenv/config';
import { Client } from 'pg';

function leerConfiguracion() {
  const { PG_SUPERUSUARIO, PG_SUPERCLAVE, DATABASE_URL } = process.env;
  const pgHost = process.env.PG_HOST ?? 'localhost';
  const pgPuerto = process.env.PG_PUERTO ?? '5432';

  const faltantes = ['PG_SUPERUSUARIO', 'PG_SUPERCLAVE', 'DATABASE_URL'].filter(
    (clave) => !process.env[clave],
  );
  if (faltantes.length > 0) {
    throw new Error(
      `Faltan variables de entorno obligatorias: ${faltantes.join(', ')}. ` +
        'Copia api/.env.example a api/.env y completa los valores antes de continuar.',
    );
  }

  let urlBaseDeDatos;
  try {
    urlBaseDeDatos = new URL(DATABASE_URL);
  } catch {
    throw new Error('DATABASE_URL no es una URL de conexión válida.');
  }

  const usuarioApp = decodeURIComponent(urlBaseDeDatos.username);
  const claveApp = decodeURIComponent(urlBaseDeDatos.password);
  const nombreBase = urlBaseDeDatos.pathname.replace(/^\//, '');

  if (!usuarioApp || !claveApp || !nombreBase) {
    throw new Error(
      'DATABASE_URL debe incluir usuario, contraseña y nombre de base ' +
        '(formato: postgresql://usuario:clave@host:puerto/base).',
    );
  }

  return {
    superusuario: PG_SUPERUSUARIO,
    superclave: PG_SUPERCLAVE,
    host: pgHost,
    puerto: Number(pgPuerto),
    usuarioApp,
    claveApp,
    nombreBase,
  };
}

function crearClienteSuperusuario(configuracion, baseDeDatos = 'postgres') {
  return new Client({
    host: configuracion.host,
    port: configuracion.puerto,
    user: configuracion.superusuario,
    password: configuracion.superclave,
    database: baseDeDatos,
  });
}

async function reiniciarBaseYRol(configuracion) {
  const cliente = crearClienteSuperusuario(configuracion);
  await cliente.connect();

  try {
    console.log(`Terminando conexiones activas a la base "${configuracion.nombreBase}"...`);
    await cliente.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
       WHERE datname = $1 AND pid <> pg_backend_pid();`,
      [configuracion.nombreBase],
    );

    console.log(`Eliminando base "${configuracion.nombreBase}" (si existe)...`);
    await cliente.query(`DROP DATABASE IF EXISTS "${configuracion.nombreBase}";`);

    console.log(`Eliminando rol "${configuracion.usuarioApp}" (si existe)...`);
    await cliente.query(`DROP ROLE IF EXISTS "${configuracion.usuarioApp}";`);
  } finally {
    await cliente.end();
  }
}

function comoLiteralSql(valor) {
  return `'${valor.replace(/'/g, "''")}'`;
}

async function crearRolSiNoExiste(cliente, configuracion) {
  const resultado = await cliente.query('SELECT 1 FROM pg_roles WHERE rolname = $1;', [
    configuracion.usuarioApp,
  ]);

  const claveLiteral = comoLiteralSql(configuracion.claveApp);

  if (resultado.rowCount > 0) {
    console.log(`El rol "${configuracion.usuarioApp}" ya existe; se sincroniza su contraseña.`);
    await cliente.query(`ALTER ROLE "${configuracion.usuarioApp}" WITH LOGIN PASSWORD ${claveLiteral};`);
    return;
  }

  console.log(`Creando rol "${configuracion.usuarioApp}"...`);
  await cliente.query(`CREATE ROLE "${configuracion.usuarioApp}" WITH LOGIN PASSWORD ${claveLiteral};`);
}

async function crearBaseSiNoExiste(cliente, configuracion) {
  const resultado = await cliente.query('SELECT 1 FROM pg_database WHERE datname = $1;', [
    configuracion.nombreBase,
  ]);

  if (resultado.rowCount > 0) {
    console.log(`La base "${configuracion.nombreBase}" ya existe; no se recrea.`);
    return;
  }

  console.log(`Creando base "${configuracion.nombreBase}" (propietario: ${configuracion.usuarioApp})...`);
  await cliente.query(`CREATE DATABASE "${configuracion.nombreBase}" OWNER "${configuracion.usuarioApp}";`);
}

async function crearExtensionEnLaBase(configuracion) {
  const cliente = crearClienteSuperusuario(configuracion, configuracion.nombreBase);
  await cliente.connect();

  try {
    console.log('Habilitando la extensión "btree_gist" (necesaria para la restricción sin_superposicion)...');
    await cliente.query('CREATE EXTENSION IF NOT EXISTS btree_gist;');
  } finally {
    await cliente.end();
  }
}

async function principal() {
  const reiniciar = process.argv.includes('--reiniciar');
  const configuracion = leerConfiguracion();

  console.log('Preparando la base de datos de Turnia...');

  if (reiniciar) {
    await reiniciarBaseYRol(configuracion);
  }

  const clienteSuperusuario = crearClienteSuperusuario(configuracion);
  await clienteSuperusuario.connect();
  try {
    await crearRolSiNoExiste(clienteSuperusuario, configuracion);
    await crearBaseSiNoExiste(clienteSuperusuario, configuracion);
  } finally {
    await clienteSuperusuario.end();
  }

  await crearExtensionEnLaBase(configuracion);

  console.log('Base de datos, rol y extensión listos.');
}

principal().catch((error) => {
  console.error('Error al preparar la base de datos:', error.message);
  process.exitCode = 1;
});
