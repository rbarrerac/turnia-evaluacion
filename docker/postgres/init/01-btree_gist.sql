-- Módulo: Inicialización de PostgreSQL en Docker — extensión btree_gist
-- Proyecto: Turnia
-- Autor: Ronald
-- Fecha de creación: 08/10/2026
--
-- La imagen oficial de postgres ejecuta los archivos de /docker-entrypoint-initdb.d
-- una sola vez, cuando el volumen de datos está vacío, como superusuario y sobre la
-- base POSTGRES_DB. btree_gist es necesaria para la restricción EXCLUDE
-- "sin_superposicion" de la tabla citas (RN-02), que aplica prisma/aplicarRestricciones.js.
CREATE EXTENSION IF NOT EXISTS btree_gist;
