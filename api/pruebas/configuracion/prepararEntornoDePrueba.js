/**
 * Módulo: Setup global de Jest — fuerza modo consola en GestorDeNotificaciones
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 20/09/2026
 */

// Referenciado desde jest.config.js (setupFiles): corre antes de que cualquier
// archivo de prueba importe la aplicación, así que llega antes que el
// `import 'dotenv/config'` de src/configuracion/entorno.js.
//
// Se ASIGNA cadena vacía (no se borra con `delete`) a propósito: dotenv, por
// defecto, no sobreescribe una variable que ya existe en process.env aunque su
// valor sea "" — solo la completa si está `undefined`. Dejarlas ya definidas
// aquí, aunque vacías, es lo que evita que el .env de cada máquina (con SMTP_*
// llenas o vacías) determine el resultado de la suite: siempre gana el modo
// consola durante las pruebas, sin conexión de red real.
process.env.SMTP_HOST = '';
process.env.SMTP_PUERTO = '';
process.env.SMTP_USUARIO = '';
process.env.SMTP_CONTRASENA = '';
process.env.SMTP_REMITENTE = '';
