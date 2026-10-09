<!--
  Módulo: Guía principal del proyecto (instalación, pruebas y uso)
  Proyecto: Turnia
  Modificado por: Luis — 08/10/2026 (Incremento 8: despliegue en Raspberry Pi y avisos de npm install)
  Modificado por: Ronald — 08/10/2026 (se retira la sección de despliegue; la guía queda fuera del repositorio)
-->

# Turnia

**Turnia** es una plataforma web de gestión de citas para un salón de belleza (manicura y pedicura). Permite a las clientas reservar, consultar y cancelar sus citas en línea, y a la administradora gestionar el catálogo de servicios, la agenda y los estados de las citas, con correos automáticos de confirmación y recordatorio.

Proyecto del curso de **Aseguramiento de la Calidad del Software** — Universidad Mariano Gálvez de Guatemala.

> Arquitectura técnica completa (carpetas, modelo de datos, API, reglas de negocio y bitácora): ver **[ARQUITECTURA_PROYECTO.md](./ARQUITECTURA_PROYECTO.md)**.

---

## Requisitos del Sistema

| Programa | Versión | Para qué sirve |
|---|---|---|
| **Node.js** | 20 LTS (recomendado) | Ejecutar el backend y construir el frontend. Es la versión mínima: `nodemailer` y `node-cron` exigen Node 20 o superior |
| **PostgreSQL** | 16 o superior | Base de datos |
| **Git** | 2.x | Descargar el código y control de versiones |

> Solo necesitas tener PostgreSQL instalado y en ejecución, y saber la contraseña del superusuario `postgres` (la que definiste al instalarlo). El resto — crear la base de datos, el usuario, las tablas y los datos de prueba — lo hace **un solo comando**.

---

## Configuración Inicial

### 1. Clonar el repositorio

```bash
git clone https://github.com/rbarrerac/turnia.git
cd turnia
```

### 2. Configurar variables de entorno (backend)

```bash
cd api
cp .env.example .env      # en Windows (PowerShell): copy .env.example .env
```

Abre `api/.env` y completa **dos** valores mínimos:

```env
# Contraseña del superusuario de PostgreSQL (la que pusiste al instalar Postgres).
# Solo se usa para crear la base y el usuario de la app; nunca se sube al repositorio.
PG_SUPERCLAVE="tu-contraseña-de-postgres"

# Contraseña que tendrá el usuario dedicado de la aplicación (elígela tú).
# Debe coincidir con la que aparece dentro de DATABASE_URL.
DATABASE_URL="postgresql://turnia_app:elige-una-clave-app@localhost:5432/turnia"
```

Los demás valores ya vienen con valores por defecto que funcionan en local. El envío de correos es **opcional**: si no configuras las variables `SMTP_*`, el sistema imprime los correos en la consola (modo simulado) y todo lo demás funciona igual. Ver [Notificaciones por correo](#notificaciones-por-correo).

> **Nunca subas tu archivo `.env` al repositorio.** Ya está excluido en `.gitignore`.

### 3. Instalar dependencias

```bash
# Backend (dentro de api/)
npm install

# Frontend (en otra ventana, desde la raíz)
cd web
cp .env.example .env      # en Windows (PowerShell): copy .env.example .env
npm install
```

El `web/.env` le indica al frontend de desarrollo dónde está la API (`VITE_URL_API="http://localhost:4000/api"`). Sin ese archivo, el frontend pide la API en su mismo origen (`/api/...`), que solo funciona cuando el frontend y la API se sirven juntos; en desarrollo crea siempre el `web/.env`.

> **Avisos normales de `npm install`:**
> - **"N vulnerabilities"**: corresponden a herramientas de desarrollo (Jest, nodemon, Vite, Tailwind), que no se ejecutan en producción. Para comprobar solo las dependencias de producción usa `npm audit --omit=dev`: en `api/` debe dar **0 vulnerabilities**. En `web/` quedan 2 avisos moderados de `react-router-dom` 6, revisados y aceptados (no aplican a Turnia porque no usa renderizado en servidor ni navega a direcciones escritas por el usuario).
> - **"Update available ... prisma"**: Prisma avisa que existe una versión más nueva. Puede ignorarse; el proyecto está probado con la versión instalada.

### 4. Preparar la base de datos (un solo comando)

Desde la carpeta `api/`:

```bash
npm run preparar
```

Este comando hace **todo** de una vez:
1. Crea el usuario de base de datos `turnia_app` y la base de datos `turnia`.
2. Activa la extensión `btree_gist` (necesaria para impedir citas superpuestas).
3. Crea las tablas y aplica la restricción de no-superposición.
4. Carga los datos de arranque: catálogo de servicios, horario de atención, y las cuentas de prueba (administradora y clienta).

> Si necesitas empezar de cero (borrar todo y volver a crearlo), ejecuta:
> ```bash
> npm run reiniciar-bd && npm run preparar
> ```

> **Aviso para Windows:** detén el backend (`npm run dev`, con `Ctrl + C`) antes de ejecutar `npm run preparar` o `npm run esquema`. Mientras el servidor está corriendo, Prisma no puede reemplazar su motor y el comando falla con un error como `EPERM: operation not permitted, rename '...query_engine-windows.dll.node...'`. Al terminar, vuelve a iniciar el backend.

### 5. Iniciar el proyecto

Necesitas **dos** ventanas de terminal abiertas al mismo tiempo.

**Ventana 1 — Backend (desde `api/`):**
```bash
npm run dev          # API en http://localhost:4000
```

**Ventana 2 — Frontend (desde `web/`):**
```bash
npm run dev          # Web en http://localhost:5173
```

Abre el navegador en **http://localhost:5173**.

---

## Cuentas de Prueba

Se crean automáticamente al ejecutar `npm run preparar` (los valores salen de tu `api/.env`; estos son los de por defecto):

| Rol | Correo | Contraseña |
|---|---|---|
| Administradora    | `admin@turnia.gt`     | `Admin1234Dev!`   |
| Clienta           | `clienta@turnia.gt`   | `Clienta1234Dev!` |

> Puedes cambiar estos valores en `api/.env` (variables `CORREO_ADMIN`, `CONTRASENA_ADMIN`, `CORREO_CLIENTA`, `CONTRASENA_CLIENTA`) antes de correr `npm run preparar` o `npm run semilla`.

---

## Arranque rápido (para quien ya tiene todo instalado)

```bash
git clone https://github.com/rbarrerac/turnia.git

cd turnia/api
cp .env.example .env        # luego editar PG_SUPERCLAVE y DATABASE_URL
npm install
npm run preparar            # crea base, usuario, tablas, restricción y datos
npm run dev                 # backend en :4000

# en otra ventana:
cd ../web
cp .env.example .env
npm install
npm run dev                 # frontend en :5173
```

---

## Scripts (backend, dentro de `api/`)

| Script | Descripción |
|---|---|
| `npm run dev` | Inicia el backend con recarga automática (puerto 4000) |
| `npm start` | Inicia el backend sin recarga |
| `npm run preparar` | **Todo en uno:** crea usuario + base + extensión, sincroniza el esquema y la restricción, y carga los datos semilla |
| `npm run preparar-bd` | Solo crea el usuario, la base y la extensión |
| `npm run reiniciar-bd` | Borra el usuario y la base y los vuelve a crear desde cero |
| `npm run esquema` | Sincroniza las tablas (Prisma) y aplica la restricción de no-superposición |
| `npm run semilla` | Carga catálogo, horario y las cuentas de prueba (administradora y clienta) |
| `npm run prueba` | Ejecuta la batería de pruebas automatizadas (Jest, en serie) |
| `npm run cobertura` | Ejecuta la misma batería midiendo la cobertura (umbral mínimo del 70 %) |
| `npm run lint` | Análisis estático del código (ESLint) |

En el frontend (`web/`): `npm run dev`, `npm run build` y `npm run lint`.

---

## Mantenimiento de la Base de Datos

**Reiniciar (borrar y recrear todo):**
```bash
npm run reiniciar-bd && npm run preparar
```

> En Windows, detén antes el backend (ver el aviso de la sección 4 de la Configuración Inicial).

**Pasos manuales equivalentes** (por si prefieres hacerlo con `psql` a mano):
```bash
# 1) Borrar la base y el usuario existentes
psql -U postgres -c "DROP DATABASE IF EXISTS turnia;" -c "DROP ROLE IF EXISTS turnia_app;"

# 2) Crear el usuario y la base (con el usuario como dueño)
psql -U postgres -c "CREATE ROLE turnia_app WITH LOGIN PASSWORD 'la-clave-de-la-app';"
psql -U postgres -c "CREATE DATABASE turnia OWNER turnia_app;"

# 3) Activar la extensión necesaria
psql -U postgres -d turnia -c "CREATE EXTENSION IF NOT EXISTS btree_gist;"

# 4) Crear las tablas (con DATABASE_URL apuntando a turnia_app)
npx prisma generate && npx prisma db push

# 5) Aplicar la restricción de no-superposición
psql -U turnia_app -d turnia -c "ALTER TABLE citas DROP CONSTRAINT IF EXISTS sin_superposicion;" -c "ALTER TABLE citas ADD CONSTRAINT sin_superposicion EXCLUDE USING gist (tsrange(inicia_en, termina_en) WITH &&) WHERE (estado <> 'cancelada');"

# 6) Cargar los datos de arranque
npm run semilla
```

---

## Estructura del Proyecto

```
turnia/
├── README.md                 # Esta guía
├── ARQUITECTURA_PROYECTO.md  # Documento de arquitectura (público)
├── .gitignore
├── .gitattributes            # Fuerza fin de línea LF en los scripts .sh
├── sonar-project.properties  # Configuración del análisis con SonarQube
├── docker-compose.yml        # Servicios db, api y web del despliegue
├── .env.docker.example       # Plantilla de variables del despliegue (sin valores reales)
├── docker/postgres/init/     # SQL que se ejecuta al crear la base (extensión btree_gist)
├── scripts/disponibilidad/   # Registro y resumen de disponibilidad (RNF-04)
├── api/                      # Backend — API REST (Node.js + Express + Prisma)
│   ├── .env.example          # Plantilla de variables de entorno (sin valores reales)
│   ├── Dockerfile            # Imagen de la API para el despliegue
│   ├── docker-entrypoint.sh  # Prepara la base (esquema, restricciones, semilla) y arranca
│   ├── prisma/               # Esquema, semilla y preparación de la base de datos
│   ├── src/                  # Código fuente (rutas, controladores, lógica de negocio)
│   └── pruebas/              # Pruebas unitarias y de integración (Jest + Supertest)
└── web/                      # Frontend — SPA (React + Vite + Tailwind CSS)
    ├── .env.example          # URL de la API para el frontend de desarrollo
    ├── Dockerfile            # Construye el frontend y lo sirve con Nginx
    ├── nginx.conf            # HTTPS, SPA y proxy de /api y /archivos hacia la API
    ├── docker/               # Script que genera el certificado autofirmado
    └── src/                  # Páginas, componentes y estado de sesión
```

---

## API Endpoints

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| GET | `/api/salud` | Comprobar que la API está activa | Público |
| POST | `/api/autenticacion/registro` | Registrar una clienta | Público |
| POST | `/api/autenticacion/inicio-sesion` | Iniciar sesión (devuelve token) | Público |
| GET · PATCH | `/api/autenticacion/perfil` | Ver o editar el perfil propio (nombre, teléfono) | Con sesión |
| PATCH | `/api/autenticacion/correo` | Cambiar el correo (pide la contraseña actual) | Con sesión |
| PATCH | `/api/autenticacion/contrasena` | Cambiar la contraseña | Con sesión |
| GET | `/api/servicios` | Listar servicios activos | Público |
| GET | `/api/servicios/todos` | Listar todos los servicios (incluye inactivos) | Administradora |
| GET | `/api/servicios/:id` | Detalle de un servicio | Público |
| POST | `/api/servicios` | Crear un servicio | Administradora |
| PUT | `/api/servicios/:id` | Editar un servicio | Administradora |
| DELETE | `/api/servicios/:id` | Desactivar un servicio (borrado lógico) | Administradora |
| PATCH | `/api/servicios/:id/reactivar` | Reactivar un servicio | Administradora |
| GET | `/api/citas/disponibilidad` | Horarios libres para un servicio y fecha | Con sesión |
| POST | `/api/citas` | Crear una reserva | Clienta |
| GET | `/api/citas/mias` | Historial de citas de la clienta | Clienta |
| PATCH | `/api/citas/:id/cancelar` | Cancelar una cita | Clienta |
| GET | `/api/citas/agenda` | Agenda por día/semana (`desde`, `hasta`) | Administradora |
| PATCH | `/api/citas/:id/estado` | Cambiar estado de una cita | Administradora |
| GET | `/api/horarios` | Horario semanal y días no laborables próximos | Público |
| PUT | `/api/horarios` | Configurar el horario semanal | Administradora |
| POST | `/api/horarios/dias-no-laborables` | Agregar un día no laborable | Administradora |
| DELETE | `/api/horarios/dias-no-laborables/:id` | Eliminar un día no laborable | Administradora |
| GET | `/api/trabajos` | Galería pública: categorías activas con sus fotos | Público |
| POST | `/api/trabajos/categorias` | Crear una categoría de la galería | Administradora |
| PUT · DELETE | `/api/trabajos/categorias/:id` | Editar o eliminar una categoría (y sus fotos) | Administradora |
| POST | `/api/trabajos` | Subir una foto (`multipart/form-data`: `archivo`, `categoria_id`) | Administradora |
| DELETE | `/api/trabajos/:id` | Eliminar una foto | Administradora |
| GET | `/api/contenido` | Textos editables de la página de inicio | Público |
| PUT | `/api/contenido` | Editar los textos de la página de inicio | Administradora |

Formato de respuesta: JSON. Éxito → `{ "exito": true, "datos": { ... } }`. Error → `{ "exito": false, "error": { "codigo": "...", "mensaje": "..." } }`.

---

## Pruebas

Desde `api/`:

```bash
npm run prueba
```

Resultado esperado: **11 suites, 180 pruebas, 0 fallidas** (sin pruebas omitidas ni pendientes). Las pruebas de integración ejecutan la API en memoria (Supertest), por lo que no necesitas levantar el servidor ni usar Postman. Sí necesitan la base de datos preparada con `npm run preparar`.

> Las pruebas corren **en serie a propósito** (`--runInBand`): todas las suites comparten la misma base de datos y algunas modifican datos globales (por ejemplo, el horario semanal), así que no deben ejecutarse en paralelo. Cada suite crea sus propios datos y los borra al terminar.

### Cobertura

```bash
npm run cobertura
```

Ejecuta la misma batería midiendo la cobertura de `api/src` y **falla si cualquiera de las cuatro métricas (sentencias, ramas, funciones y líneas) queda por debajo del 70 %**. El reporte navegable queda en `api/coverage/index.html` (ábrelo en el navegador) y el archivo `api/coverage/lcov.info` es el que usa SonarQube. La carpeta `coverage/` no se sube al repositorio.

### Análisis estático (ESLint)

```bash
cd api && npm run lint     # backend
cd web && npm run lint     # frontend (React)
```

Ambos deben terminar con 0 errores.

---

## Análisis con SonarQube

En la raíz está `sonar-project.properties` con la configuración del análisis (código de `api/src` y `web/src`, pruebas de `api/pruebas` y exclusiones de `node_modules`, `coverage`, `dist` y las fotos subidas). SonarQube y SonarScanner no forman parte del proyecto: hay que tenerlos instalados aparte.

Antes de analizar, genera la cobertura para que SonarQube pueda leerla:

```bash
cd api
npm run cobertura          # crea api/coverage/lcov.info
cd ..
sonar-scanner              # desde la raíz, con el servidor de SonarQube y el token configurados
```

---

## Notificaciones por correo

Por defecto, el sistema funciona en **modo consola**: los correos de confirmación y recordatorio se imprimen en la terminal del backend en lugar de enviarse. Esto permite que el proyecto funcione sin credenciales de correo.

Para enviar correos reales (por ejemplo, con Gmail):

1. Activa la verificación en dos pasos en tu cuenta de Google.
2. Genera una **Contraseña de aplicación** (Google Account → Seguridad → Contraseñas de aplicaciones).
3. Completa en `api/.env`:
   ```env
   SMTP_HOST="smtp.gmail.com"
   SMTP_PUERTO="587"
   SMTP_USUARIO="tucorreo@gmail.com"
   SMTP_CONTRASENA="la-contraseña-de-aplicación-de-16-letras"
   SMTP_REMITENTE="Bella Aurora <tucorreo@gmail.com>"
   ```
4. Reinicia el backend. Ahora los correos se envían de verdad.

---

## Tecnologías

**Backend:** Node.js · Express · Prisma ORM · PostgreSQL · JWT · bcrypt · Nodemailer · node-cron
**Frontend:** React 18 · Vite · Tailwind CSS · React Router
**Pruebas y calidad:** Jest · Supertest · ESLint · SonarQube (configuración)
