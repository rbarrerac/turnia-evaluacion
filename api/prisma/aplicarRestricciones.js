/**
 * Módulo: Aplica de forma idempotente las restricciones que Prisma no modela:
 *   EXCLUDE sin_superposicion sobre citas (RN-02) y las CHECK de servicios y horarios_atencion
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 18/09/2026
 * Modificado por: Ronald — 07/10/2026 (Incremento 7A: restricciones CHECK de la sección 4.2)
 */

import 'dotenv/config';
import { Client } from 'pg';

// Restricciones CHECK de la sección 4.2 de ARQUITECTURA.md. Cada una se aplica con
// DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT para que el script sea idempotente.
const RESTRICCIONES_CHECK = [
  { tabla: 'servicios', nombre: 'duracion_minutos_positiva', condicion: 'duracion_minutos > 0' },
  { tabla: 'servicios', nombre: 'precio_no_negativo', condicion: 'precio >= 0' },
  { tabla: 'horarios_atencion', nombre: 'dia_semana_valido', condicion: 'dia_semana BETWEEN 0 AND 6' },
  { tabla: 'horarios_atencion', nombre: 'horario_inicio_antes_de_fin', condicion: 'hora_inicio < hora_fin' },
];

async function principal() {
  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();

  try {
    console.log('Aplicando restricción "sin_superposicion" sobre la tabla citas...');

    await cliente.query('ALTER TABLE citas DROP CONSTRAINT IF EXISTS sin_superposicion;');
    await cliente.query(`
      ALTER TABLE citas ADD CONSTRAINT sin_superposicion
        EXCLUDE USING gist (
          tsrange(inicia_en, termina_en) WITH &&
        ) WHERE (estado <> 'cancelada');
    `);

    console.log('Restricción "sin_superposicion" aplicada correctamente.');

    for (const { tabla, nombre, condicion } of RESTRICCIONES_CHECK) {
      // eslint-disable-next-line no-await-in-loop
      await cliente.query(`ALTER TABLE ${tabla} DROP CONSTRAINT IF EXISTS ${nombre};`);
      // eslint-disable-next-line no-await-in-loop
      await cliente.query(`ALTER TABLE ${tabla} ADD CONSTRAINT ${nombre} CHECK (${condicion});`);
      console.log(`Restricción CHECK "${nombre}" (${tabla}: ${condicion}) aplicada correctamente.`);
    }
  } finally {
    await cliente.end();
  }
}

principal().catch((error) => {
  console.error('Error al aplicar las restricciones de la base de datos:', error.message);
  process.exitCode = 1;
});
