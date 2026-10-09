/**
 * Módulo: Configuración de Jest para las pruebas del backend
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 15/09/2026
 * Modificado por: Luis — 07/10/2026 (Incremento 7B: medición de cobertura y umbral global del 70 %)
 */

export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/pruebas/**/*.prueba.js'],
  // Corre antes de que cada archivo de prueba importe la app: deja las SMTP_*
  // vacías en process.env para que GestorDeNotificaciones use siempre modo
  // consola durante la suite, sin importar el .env de la máquina (ver el
  // propio archivo para el detalle de por qué se asigna "" y no se borra).
  setupFiles: ['<rootDir>/pruebas/configuracion/prepararEntornoDePrueba.js'],
  verbose: true,
  // Cobertura (Incremento 7B). Se mide todo src/ aunque un archivo no lo importe
  // ninguna prueba (así no se infla el porcentaje); servidor.js queda fuera porque
  // solo arranca el proceso (listen + tarea cron) y no tiene lógica propia.
  collectCoverageFrom: ['src/**/*.js', '!src/servidor.js'],
  // lcov lo consume SonarQube (sonar-project.properties); html es el reporte navegable.
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  coverageThreshold: {
    global: { branches: 70, functions: 70, lines: 70, statements: 70 },
  },
};
