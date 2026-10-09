# Migraciones — notas manuales

Prisma no soporta de forma nativa la restricción `EXCLUDE` de PostgreSQL ni las restricciones `CHECK`. Este proyecto usa `npx prisma db push` para sincronizar `schema.prisma` con la base de datos (no `prisma migrate`, porque la base ya existía con tablas creadas antes de adoptar Prisma Migrate — ver decisión en la bitácora del Incremento 2). Por eso, lo que Prisma no puede expresar en el esquema se agrega **manualmente** en carpetas de migración con un `migration.sql`, aplicado directamente con `psql` (no con `prisma migrate deploy`, que exigiría "bautizar" el historial de migraciones de una base ya existente).

## 1. Restricción de no superposición de citas (RN-02) — ✅ aplicada

Carpeta: `20260918000000_agregar_restriccion_sin_superposicion/migration.sql`.

`EXCLUDE` no tiene equivalente en el DSL de `schema.prisma` (Prisma no genera `CREATE EXTENSION` ni cláusulas `EXCLUDE USING gist`), así que no hay forma de que `prisma db push` la cree por sí solo. Requiere la extensión `btree_gist`:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE citas ADD CONSTRAINT sin_superposicion
  EXCLUDE USING gist (
    tsrange(inicia_en, termina_en) WITH &&
  ) WHERE (estado <> 'cancelada');
```

Esta restricción es la última línea de defensa contra citas superpuestas: aunque `GestorDeReservas.validarDisponibilidad` ya verifica disponibilidad en la capa de aplicación antes de crear una cita, dos peticiones concurrentes podrían pasar esa validación al mismo tiempo (ambas leen "libre" antes de que la otra escriba). La base de datos es quien tiene la última palabra y garantiza la exclusión mutua real. `GestorDeReservas.reservar` captura el error de Postgres que esta restricción produce (código `23P01`, `exclusion_violation`) y lo traduce a `DISPONIBILIDAD_OCUPADA` (409) — ver la prueba de concurrencia en `pruebas/integracion/citas.prueba.js` (Incremento 3).

Verificado con `psql -U postgres -d turnia -c "\d citas"`: la restricción aparece listada como `"sin_superposicion" EXCLUDE USING gist (tsrange(inicia_en, termina_en) WITH &&) WHERE (estado <> 'cancelada'::"EstadoCita")`.

## 2. Restricciones CHECK del modelo de datos (sección 4 de ARQUITECTURA.md) — ✅ aplicadas (Incremento 7A)

```sql
ALTER TABLE servicios ADD CONSTRAINT duracion_minutos_positiva CHECK (duracion_minutos > 0);
ALTER TABLE servicios ADD CONSTRAINT precio_no_negativo CHECK (precio >= 0);
ALTER TABLE horarios_atencion ADD CONSTRAINT dia_semana_valido CHECK (dia_semana BETWEEN 0 AND 6);
ALTER TABLE horarios_atencion ADD CONSTRAINT horario_inicio_antes_de_fin CHECK (hora_inicio < hora_fin);
```

Se aplican, junto con `sin_superposicion`, desde `prisma/aplicarRestricciones.js` (parte de `npm run esquema`), cada una con `DROP CONSTRAINT IF EXISTS` antes del `ADD`, así que el script es idempotente. `prisma db push` no las elimina (Prisma ignora las CHECK que no conoce). La validación equivalente sigue haciéndose también en la capa de aplicación (`GestorDeServicios`, `GestorDeHorarios`); la base de datos es la última línea de defensa.
