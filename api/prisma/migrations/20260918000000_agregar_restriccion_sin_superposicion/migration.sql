-- Módulo: Migración manual — restricción de no superposición de citas (RN-02)
-- Proyecto: Turnia
-- Autor: Ronald
-- Fecha de creación: 18/09/2026
--
-- Prisma no modela EXCLUDE de forma nativa (ver prisma/migrations/README.md),
-- por lo que esta restricción se agrega como migración SQL manual.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE citas ADD CONSTRAINT sin_superposicion
  EXCLUDE USING gist (
    tsrange(inicia_en, termina_en) WITH &&
  ) WHERE (estado <> 'cancelada');
