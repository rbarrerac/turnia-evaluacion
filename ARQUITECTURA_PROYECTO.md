# Turnia — Documento de Arquitectura del Proyecto

> **Proyecto:** Turnia — Plataforma de Gestión de Citas para Salón de Belleza
> **Curso:** Aseguramiento de la Calidad del Software — Universidad Mariano Gálvez de Guatemala
> **Entrega:** 2 (Implementación)
> **Integrantes:** Ronald Adrián Barrera Conedera (5190-18-11874) · Luis Eduardo Santos Monzón (5190-16-11202)

---

## 0. Cómo usar este documento

Este documento define la estructura del proyecto Turnia: carpetas, dependencias, modelo de datos, clases, servicios, endpoints, reglas de negocio y una bitácora del desarrollo. Es la referencia técnica del proyecto.

**Reglas permanentes de desarrollo (aplican a todo el equipo):**

1. **Idioma español obligatorio.** Todos los nombres de clases, funciones, variables, rutas, endpoints, tablas y columnas se escriben en español. Solo permanecen en inglés las palabras reservadas del lenguaje (`function`, `const`, `import`, `async`, etc.) y los nombres de librerías de terceros.
2. **Encabezado de autoría en cada archivo.** Todo archivo de código inicia con el bloque de comentario definido en la sección 10.
3. **Registro vivo.** Además de la arquitectura, este documento contiene una **bitácora** (sección 12) con los avances, decisiones e incidentes del desarrollo.
4. **Gestión de secretos.** Ninguna credencial se escribe en el código ni se sube al repositorio. Todo secreto vive en `.env` (excluido por `.gitignore`); el repositorio incluye `.env.example` como plantilla.

---

## 1. Visión general del sistema

Turnia es una aplicación web que permite a las clientas de un salón de belleza reservar, consultar y cancelar citas en línea, y a la administradora (propietaria) gestionar el catálogo de servicios, la agenda y los estados de las citas. El sistema envía correos automáticos de confirmación y recordatorio.

- **Arquitectura:** tres capas (presentación, lógica de negocio, datos) bajo paradigma cliente-servidor.
- **Estilo de comunicación:** API REST sobre HTTP/HTTPS con JSON.
- **Autenticación:** tokens JWT sin estado; contraseñas con hash bcrypt.

---

## 2. Pila tecnológica (stack)

| Capa | Tecnología | Versión |
|---|---|---|
| Presentación | React + Vite | 18.x |
| Estilos | Tailwind CSS | 3.x |
| Lógica de negocio | Node.js + Express | 20 LTS / 4.x |
| ORM | Prisma | 5.x |
| Base de datos | PostgreSQL | 16.x |
| Autenticación | jsonwebtoken + bcrypt | — |
| Notificaciones | Nodemailer + node-cron | — |
| Preparación de la base de datos | pg (node-postgres) | 8.x |
| Pruebas | Jest + Supertest | 29.x |
| Análisis estático | ESLint | 8.x |
| Control de versiones | Git + GitHub | — |

**Lenguaje:** JavaScript (Node en modo ESM: `"type": "module"`). Prisma provee tipado en el editor sin necesidad de compilar TypeScript.

---

## 3. Estructura de carpetas (monorepo)

```
turnia/
├── README.md                     # Guía de instalación y ejecución
├── ARQUITECTURA_PROYECTO.md      # Este documento
├── .gitignore
├── .env.example                  # Plantilla de variables de entorno (sin valores reales)
│
├── api/                          # Backend — API REST (Node + Express)
│   ├── package.json
│   ├── .eslintrc.json
│   ├── jest.config.js
│   ├── prisma/
│   │   ├── schema.prisma         # Modelo de datos
│   │   ├── migrations/           # Migración SQL de la restricción de no-superposición
│   │   ├── prepararBd.js         # Crea el usuario, la base de datos y la extensión
│   │   ├── aplicarRestricciones.js  # Aplica la restricción de no-superposición
│   │   └── semilla.js            # Datos de arranque (catálogo, horario, cuentas)
│   ├── src/
│   │   ├── servidor.js           # Punto de entrada; levanta Express
│   │   ├── aplicacion.js         # Configuración de Express (reutilizable en pruebas)
│   │   ├── configuracion/
│   │   ├── middlewares/
│   │   │   ├── autenticacion.js  # Verifica token JWT
│   │   │   ├── autorizacion.js   # Verifica rol (administradora/clienta)
│   │   │   └── manejadorErrores.js
│   │   ├── rutas/
│   │   ├── controladores/
│   │   ├── servicios/            # Lógica de negocio (clases)
│   │   │   ├── GestorDeAutenticacion.js
│   │   │   ├── GestorDeServicios.js
│   │   │   ├── GestorDeReservas.js      # NÚCLEO: disponibilidad y reservas
│   │   │   ├── GestorDeHorarios.js
│   │   │   └── GestorDeNotificaciones.js
│   │   ├── utilidades/
│   │   │   ├── generadorDeTokens.js
│   │   │   ├── validadores.js
│   │   │   └── fechas.js         # Cálculo de rangos horarios
│   │   └── tareas/
│   │       └── recordatorios.tarea.js   # cron: recordatorio 24 h antes
│   └── pruebas/
│       ├── unitarias/
│       │   ├── gestorDeReservas.prueba.js
│       │   ├── gestorDeNotificaciones.prueba.js
│       │   └── fechas.prueba.js
│       └── integracion/
│           ├── autenticacion.prueba.js
│           ├── servicios.prueba.js
│           └── citas.prueba.js
│
└── web/                          # Frontend — SPA (React + Vite)
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx               # Enrutador principal
        ├── api/clienteApi.js     # Envoltorio de fetch hacia la API REST
        ├── contexto/
        │   ├── ContextoAutenticacion.jsx  # Estado global de sesión
        │   └── ContextoTema.jsx           # Tema claro/oscuro
        ├── componentes/
        │   ├── BarraNavegacion.jsx
        │   ├── MenuUsuario.jsx
        │   ├── TarjetaServicio.jsx
        │   ├── SelectorDeHorario.jsx
        │   ├── CalendarioAgenda.jsx
        │   └── RutaProtegida.jsx
        ├── paginas/
        │   ├── PaginaInicio.jsx
        │   ├── PaginaRegistro.jsx
        │   ├── PaginaInicioSesion.jsx
        │   ├── PaginaCatalogo.jsx
        │   ├── PaginaReservar.jsx
        │   ├── PaginaMisCitas.jsx
        │   ├── PaginaPerfil.jsx
        │   ├── PaginaSeguridad.jsx
        │   ├── PaginaTrabajos.jsx
        │   └── administradora/
        │       ├── PaginaPanelAdmin.jsx
        │       ├── PaginaAgenda.jsx
        │       ├── PaginaGestionServicios.jsx
        │       ├── PaginaConfiguracionHorario.jsx
        │       └── PaginaContenidoAdmin.jsx
        └── estilos/indice.css    # Directivas de Tailwind
```

---

## 4. Modelo de datos

Seis entidades principales. Nombres de tablas y columnas en español.

### 4.1 Diagrama entidad-relación (resumen textual)

```
usuarios (1) ──< (N) citas >── (N) (1) servicios
horarios_atencion (config semanal de la administradora)
dias_no_laborables (excepciones)
citas (1) ──< (N) notificaciones
```

### 4.2 Definición de tablas

**usuarios**
| Columna | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| nombre | VARCHAR(120) | NOT NULL |
| correo | VARCHAR(160) | NOT NULL, UNIQUE |
| telefono | VARCHAR(20) | NULL |
| contrasena_hash | VARCHAR(255) | NOT NULL |
| rol | ENUM(`administradora`, `clienta`) | NOT NULL, default `clienta` |
| activo | BOOLEAN | default true |
| creado_en | TIMESTAMP | default now() |

**servicios**
| Columna | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| nombre | VARCHAR(120) | NOT NULL |
| descripcion | TEXT | NULL |
| duracion_minutos | INTEGER | NOT NULL, CHECK > 0 |
| precio | DECIMAL(8,2) | NOT NULL, CHECK >= 0 |
| activo | BOOLEAN | default true |
| creado_en | TIMESTAMP | default now() |

**horarios_atencion**
| Columna | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| dia_semana | SMALLINT | NOT NULL, CHECK 0–6 (0 = domingo) |
| hora_inicio | TIME | NOT NULL |
| hora_fin | TIME | NOT NULL |
| activo | BOOLEAN | default true |

**dias_no_laborables**
| Columna | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| fecha | DATE | NOT NULL, UNIQUE |
| motivo | VARCHAR(160) | NULL |

**citas**
| Columna | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| clienta_id | UUID | FK → usuarios.id, NOT NULL |
| servicio_id | UUID | FK → servicios.id, NOT NULL |
| inicia_en | TIMESTAMP | NOT NULL |
| termina_en | TIMESTAMP | NOT NULL |
| estado | ENUM(`pendiente`,`confirmada`,`completada`,`cancelada`) | default `pendiente` |
| notas | TEXT | NULL |
| creado_en | TIMESTAMP | default now() |
| actualizado_en | TIMESTAMP | default now() |

> **Regla de integridad clave — no superposición de citas:** se define una restricción de exclusión de PostgreSQL sobre el rango temporal `[inicia_en, termina_en)` para las citas cuyo `estado` no sea `cancelada`. Esto garantiza a nivel de base de datos que dos citas activas no puedan solaparse, incluso ante peticiones concurrentes. Requiere la extensión `btree_gist`:
> ```sql
> CREATE EXTENSION IF NOT EXISTS btree_gist;
> ALTER TABLE citas ADD CONSTRAINT sin_superposicion
>   EXCLUDE USING gist ( tsrange(inicia_en, termina_en) WITH && )
>   WHERE (estado <> 'cancelada');
> ```
> Como Prisma no modela `EXCLUDE` de forma nativa, esta restricción se aplica con un paso SQL aparte (ver sección 12).

**notificaciones**
| Columna | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| cita_id | UUID | FK → citas.id, NOT NULL |
| tipo | ENUM(`confirmacion`,`recordatorio`) | NOT NULL |
| enviado_en | TIMESTAMP | NULL |
| exitoso | BOOLEAN | default false |

---

## 5. Reglas de negocio

1. **RN-01 — Cálculo de fin de cita.** `termina_en = inicia_en + servicio.duracion_minutos`. Se calcula en el servidor; nunca se confía en el cliente.
2. **RN-02 — Disponibilidad.** Una cita solo puede crearse si: (a) cae dentro del horario de atención del día, (b) la fecha no está en `dias_no_laborables`, y (c) no se superpone con otra cita activa.
3. **RN-03 — Cancelación.** Una clienta puede cancelar su cita solo si faltan **2 horas o más** para `inicia_en`. Al cancelar, el horario queda libre.
4. **RN-04 — Estados válidos.** Transiciones permitidas: `pendiente → confirmada → completada`; desde `pendiente` o `confirmada` se puede pasar a `cancelada`. No se permite reactivar una cita cancelada.
5. **RN-05 — Confirmación automática.** Al crear una cita se envía correo de confirmación (registro en `notificaciones`).
6. **RN-06 — Recordatorio automático.** Una tarea programada diaria envía recordatorio 24 h antes de cada cita en estado `confirmada`.
7. **RN-07 — Unicidad de correo.** No pueden existir dos usuarios con el mismo correo.
8. **RN-08 — Completado no anticipado.** Una cita solo puede marcarse como `completada` si ya pasaron al menos **10 minutos** desde su `inicia_en`. Si se intenta antes, error `COMPLETADO_ANTICIPADO` (400).

---

## 6. Diseño de la API REST

Base: `/api`. Formato: JSON. Autenticación: encabezado `Authorization: Bearer <token>`.

### 6.1 Autenticación — `/api/autenticacion`
| Método | Ruta | Descripción | Protegido | Caso de uso |
|---|---|---|---|---|
| POST | `/registro` | Registra una clienta | No | CU-01 |
| POST | `/inicio-sesion` | Autentica y devuelve token JWT | No | CU-02 |
| GET | `/perfil` | Devuelve datos del usuario autenticado | Sí | — |
| PATCH | `/perfil` | Actualiza nombre y teléfono | Sí | — |
| PATCH | `/correo` | Cambia el correo (pide contraseña actual) | Sí | — |
| PATCH | `/contrasena` | Cambia la contraseña (pide contraseña actual) | Sí | — |

### 6.2 Servicios — `/api/servicios`
| Método | Ruta | Descripción | Protegido | Caso de uso |
|---|---|---|---|---|
| GET | `/` | Lista servicios activos | No | CU-03 |
| GET | `/:id` | Detalle de un servicio | No | CU-03 |
| GET | `/todos` | Lista todos (incluye inactivos) | Sí (administradora) | CU-07 |
| POST | `/` | Crea servicio | Sí (administradora) | CU-07 |
| PUT | `/:id` | Edita servicio | Sí (administradora) | CU-07 |
| DELETE | `/:id` | Desactiva servicio (borrado lógico) | Sí (administradora) | CU-07 |
| PATCH | `/:id/reactivar` | Reactiva un servicio | Sí (administradora) | CU-07 |

### 6.3 Citas — `/api/citas`
| Método | Ruta | Descripción | Protegido | Caso de uso |
|---|---|---|---|---|
| GET | `/disponibilidad` | Horarios libres para un servicio y fecha | Sí | CU-04 |
| POST | `/` | Crea una reserva | Sí (clienta) | CU-04 |
| GET | `/mias` | Historial de citas de la clienta | Sí (clienta) | CU-06 |
| PATCH | `/:id/cancelar` | Cancela una cita | Sí (clienta) | CU-05 |
| GET | `/agenda` | Agenda por día/semana | Sí (administradora) | CU-08 |
| PATCH | `/:id/estado` | Cambia estado de la cita | Sí (administradora) | CU-09 |

### 6.4 Horarios — `/api/horarios`
| Método | Ruta | Descripción | Protegido | Caso de uso |
|---|---|---|---|---|
| GET | `/` | Consulta horario de atención | No | — |
| PUT | `/` | Configura horario semanal | Sí (administradora) | CU-10 |
| POST | `/dias-no-laborables` | Registra día no laborable | Sí (administradora) | CU-10 |
| DELETE | `/dias-no-laborables/:id` | Elimina día no laborable | Sí (administradora) | CU-10 |

### 6.5 Formato de respuesta estándar
```json
// Éxito
{ "exito": true, "datos": { ... } }
// Error
{ "exito": false, "error": { "codigo": "DISPONIBILIDAD_OCUPADA", "mensaje": "El horario ya no está disponible." } }
```

### 6.6 Códigos HTTP usados
`200` OK · `201` Creado · `400` Solicitud inválida · `401` No autenticado · `403` Sin permiso · `404` No encontrado · `409` Conflicto (p. ej. superposición) · `500` Error interno.

---

## 7. Clases de la lógica de negocio

**GestorDeAutenticacion**
- `registrar(nombre, correo, telefono, contrasena)`, `iniciarSesion(correo, contrasena)`.
- `actualizarPerfil(id, datos)`, `cambiarCorreo(id, datos)`, `cambiarContrasena(id, datos)`.

**GestorDeServicios**
- `listarActivos()`, `listarTodos()`, `obtenerPorId(id)`, `crear(datos)`, `editar(id, datos)`, `desactivar(id)`, `reactivar(id)`.

**GestorDeReservas** _(núcleo)_
- `calcularDisponibilidad(servicioId, fecha)`, `validarDisponibilidad(servicioId, iniciaEn)` (RN-02).
- `reservar(clientaId, servicioId, iniciaEn, notas)` (RN-01, RN-02, RN-05).
- `cancelar(citaId, clientaId)` (RN-03), `cambiarEstado(citaId, nuevoEstado)` (RN-04, RN-08), `obtenerHistorial(...)`, `obtenerAgenda(...)`.
- Recibe un reloj opcional en el constructor para poder fijar la hora en las pruebas (en producción usa la hora real).

**GestorDeHorarios**
- `obtenerHorario()`, `configurarHorario(dias)`, `agregarDiaNoLaborable(fecha, motivo)`, `eliminarDiaNoLaborable(id)`.

**GestorDeNotificaciones**
- `enviarConfirmacion(cita)`, `enviarRecordatorio(cita)`, `enviarRecordatoriosPendientes()` (RN-06).
- Si no hay configuración SMTP, opera en "modo consola" (imprime el correo en vez de enviarlo).

---

## 8. Frontend — páginas y flujo

| Página | Ruta | Actor | Descripción |
|---|---|---|---|
| PaginaInicio | `/` | Todos | Bienvenida pública del salón y acceso a reservar |
| PaginaRegistro | `/registro` | Clienta | Formulario de registro |
| PaginaInicioSesion | `/inicio-sesion` | Todos | Autenticación |
| PaginaCatalogo | `/servicios` | Todos | Lista de servicios con precio y duración |
| PaginaReservar | `/reservar/:servicioId` | Clienta | Selector de fecha/hora y confirmación |
| PaginaMisCitas | `/mis-citas` | Clienta | Historial y cancelación |
| PaginaPerfil | `/perfil` | Con sesión | Editar nombre y teléfono |
| PaginaSeguridad | `/seguridad` | Con sesión | Cambiar correo y contraseña |
| PaginaTrabajos | `/trabajos` | Todos | Galería de trabajos (en desarrollo) |
| PaginaPanelAdmin | `/admin` | Administradora | Panel de accesos con iconos |
| PaginaAgenda | `/admin/agenda` | Administradora | Agenda diaria/semanal |
| PaginaGestionServicios | `/admin/servicios` | Administradora | Gestión de servicios |
| PaginaConfiguracionHorario | `/admin/horario` | Administradora | Horario y días no laborables |
| PaginaContenidoAdmin | `/admin/contenido` | Administradora | Gestión de contenido (en desarrollo) |

El flujo de reserva es de tres pasos: elegir servicio → elegir fecha/hora → confirmar. La interfaz soporta tema claro/oscuro (con o sin sesión iniciada) y un menú de usuario desplegable.

---

## 9. Catálogo semilla (datos de ejemplo)

Precios y duraciones basados en el mercado real de salones en Ciudad de Guatemala. La administradora puede editarlos.

| Servicio | Duración (min) | Precio (Q) |
|---|---|---|
| Manicura clásica | 45 | 90.00 |
| Manicura con gelish | 60 | 150.00 |
| Pedicura clásica | 60 | 120.00 |
| Pedicura spa | 90 | 195.00 |
| Manicura + pedicura | 120 | 250.00 |
| Uñas acrílicas (set completo) | 120 | 300.00 |
| Relleno de acrílico | 90 | 180.00 |
| Uñas de gel / extensiones | 120 | 280.00 |
| Retiro de acrílico/gel | 30 | 60.00 |
| Decoración por uña (diseño) | 15 | 25.00 |

Además del catálogo y el horario por defecto (lunes a sábado 9:00–18:00, domingo inactivo), la semilla crea dos cuentas de prueba: una **administradora** y una **clienta**. Sus correos y contraseñas se definen por variables de entorno (ver README y sección 11); nunca se escriben en el código.

---

## 10. Encabezado de autoría (obligatorio en cada archivo)

```js
/**
 * Módulo: <nombre y propósito del archivo>
 * Proyecto: Turnia
 * Autor: Ronald            // o Luis
 * Fecha de creación: DD/MM/AAAA
 */
```

---

## 11. Variables de entorno (`.env.example`)

```
# Base de datos (usuario dedicado de la aplicación)
DATABASE_URL="postgresql://turnia_app:cambia-esta-clave-app@localhost:5432/turnia"

# Superusuario de PostgreSQL (solo para preparar la base de datos)
PG_SUPERUSUARIO="postgres"
PG_SUPERCLAVE="cambia-esta-clave-superusuario"
PG_HOST="localhost"
PG_PUERTO="5432"

# Autenticación
JWT_SECRET="cadena-larga-aleatoria-cambiar-en-produccion"
JWT_EXPIRACION="7d"

# Servidor de correo (SMTP) — opcional; si se deja vacío, se usa modo consola
SMTP_HOST="smtp.ejemplo.com"
SMTP_PUERTO="587"
SMTP_USUARIO="tu-correo@ejemplo.com"
SMTP_CONTRASENA="clave-de-aplicacion"
SMTP_REMITENTE="Turnia <no-responder@turnia.gt>"

# Servidor
PUERTO_API="4000"
ORIGEN_PERMITIDO="http://localhost:5173"

# Cuentas de arranque (semilla)
CORREO_ADMIN="admin@turnia.gt"
CONTRASENA_ADMIN="cambia-esta-clave"
CORREO_CLIENTA="clienta@turnia.gt"
CONTRASENA_CLIENTA="cambia-esta-clave"
```

---

## 12. Bitácora de desarrollo

Resumen cronológico y en lenguaje sencillo de lo que se construyó, quién lo hizo y las decisiones importantes.

### Andamiaje inicial (15/09/2026 — Ronald)
Se creó el esqueleto del proyecto: la estructura completa de carpetas del backend y del frontend, la configuración inicial, el modelo de datos (las seis tablas) y un servidor que ya arrancaba y respondía. Todavía sin lógica de negocio; solo la base sobre la que construir.

### Catálogo de servicios (17/09/2026 — Luis backend, Ronald frontend y pruebas)
Se implementó la gestión de servicios: listar, ver detalle, crear, editar y desactivar (la administradora "desactiva" en vez de borrar, para no perder el histórico). El catálogo público quedó abierto para cualquiera, mientras que crear o modificar servicios quedó protegido y solo disponible para la administradora. En el frontend se hizo la vista del catálogo (con precio en quetzales y duración legible) y la pantalla de gestión. Se agregaron las primeras pruebas automatizadas de este módulo.

### Autenticación: registro e inicio de sesión (18/09/2026 — Ronald backend, Luis frontend)
Se implementó el registro de clientas y el inicio de sesión con token. Las contraseñas se guardan cifradas (bcrypt) y nunca se devuelven al cliente; los mensajes de error no revelan si un correo existe o no, por seguridad. En el frontend se crearon las pantallas de registro e inicio de sesión, y la sesión se conserva al recargar la página.
> **Nota:** este módulo había quedado pendiente por error en un paso anterior; se detectó al intentar iniciar sesión y se implementó de inmediato. Quedó cubierto con pruebas.

### Motor de reservas — el núcleo (18/09/2026 — Ronald y Luis)
Es la parte central del sistema: calcular los horarios disponibles, crear reservas, cancelarlas (respetando la regla de 2 horas de anticipación), ver el historial y cambiar estados. Para garantizar que **dos citas nunca puedan solaparse**, se agregó una protección directamente en la base de datos (una restricción de PostgreSQL). Esto es importante porque, si dos personas intentan reservar el mismo horario al mismo tiempo, solo la base de datos puede decidir el conflicto de forma segura: se comprobó con una prueba en la que dos reservas simultáneas compiten por el mismo hueco y siempre una tiene éxito y la otra es rechazada. En el frontend se hizo el flujo de reserva en tres pasos y la pantalla "Mis citas".
> **Decisión:** el salón atiende de una sola técnica a la vez, así que la disponibilidad es global por horario (dos servicios distintos no pueden ocupar la misma franja).

### Panel de administradora (18/09/2026 — Ronald y Luis)
Se implementó la agenda (en vista de lista por día y por semana, más legible que un calendario para 10–15 citas diarias) y el cambio de estado de las citas desde la agenda. También se corrigieron dos detalles de usabilidad detectados al probar: los servicios desactivados ahora se pueden reactivar (antes "desaparecían" del panel), y el enlace a "Mis citas" quedó siempre visible en la barra de navegación.

### Notificaciones y mejoras de experiencia (18/09/2026 — Ronald y Luis)
Se agregaron los correos de confirmación (al reservar) y de recordatorio (24 horas antes, mediante una tarea programada). Si no hay un servidor de correo configurado, el sistema funciona igual e imprime los correos en la consola, para que cualquiera pueda probar el proyecto sin credenciales. Otras mejoras: la regla de no marcar una cita como "completada" hasta 10 minutos después de su inicio; la tipografía y el logo del salón; el modo claro/oscuro (disponible incluso sin iniciar sesión); un menú de usuario con edición de perfil y de seguridad (cambio de correo y contraseña, pidiendo la contraseña actual); y una nueva página de inicio del salón con un panel de accesos para la administradora.

### Calidad: pruebas estables y reproducibles (18/09/2026 — Ronald y Luis)
Se detectó que dos pruebas fallaban de forma intermitente porque dependían de la hora exacta en que se ejecutaban. Se corrigieron fijando un instante de tiempo controlado en esas pruebas, sin cambiar ninguna regla de negocio, de modo que la batería completa da siempre el mismo resultado sin importar el día o la hora. Con esto, la suite quedó en **65 pruebas, todas en verde**, verificada muchas veces seguidas sin fallos.

### Instalación en un solo comando (18/09/2026 — Ronald y Luis)
Para facilitar que cualquiera ponga el proyecto en marcha, se creó un proceso de preparación automática: un solo comando (`npm run preparar`) crea el usuario de base de datos, la base, la extensión necesaria, las tablas, la restricción de no-superposición y los datos de arranque (catálogo, horario y las cuentas de prueba de administradora y clienta). La aplicación se conecta con un usuario de base de datos dedicado (no con el superusuario). Se reorganizaron las variables de entorno en consecuencia. Todo quedó verificado: base creada correctamente, restricción activa, ambas cuentas funcionando y las 65 pruebas en verde.

---

## 13. Trazabilidad casos de uso → componentes

| Caso de uso | Endpoint | Clase | Página frontend |
|---|---|---|---|
| CU-01 Registrarse | POST /autenticacion/registro | GestorDeAutenticacion | PaginaRegistro |
| CU-02 Iniciar sesión | POST /autenticacion/inicio-sesion | GestorDeAutenticacion | PaginaInicioSesion |
| CU-03 Consultar servicios | GET /servicios | GestorDeServicios | PaginaCatalogo |
| CU-04 Reservar cita | POST /citas | GestorDeReservas | PaginaReservar |
| CU-05 Cancelar cita | PATCH /citas/:id/cancelar | GestorDeReservas | PaginaMisCitas |
| CU-06 Consultar historial | GET /citas/mias | GestorDeReservas | PaginaMisCitas |
| CU-07 Gestionar catálogo | POST/PUT/DELETE /servicios | GestorDeServicios | PaginaGestionServicios |
| CU-08 Ver calendario | GET /citas/agenda | GestorDeReservas | PaginaAgenda |
| CU-09 Gestionar estado | PATCH /citas/:id/estado | GestorDeReservas | PaginaAgenda |
| CU-10 Configurar horario | PUT /horarios | GestorDeHorarios | PaginaConfiguracionHorario |
| CU-11 Enviar confirmación | (interno, al reservar) | GestorDeNotificaciones | — |
| CU-12 Enviar recordatorio | (tarea programada diaria) | GestorDeNotificaciones | — |
