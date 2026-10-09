/**
 * Módulo: Punto de entrada de la API — levanta el servidor Express
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 15/09/2026
 * Modificado por: Ronald — 08/10/2026 (Incremento 8: escucha en 0.0.0.0 para funcionar dentro de Docker)
 */

import aplicacion from './aplicacion.js';
import { entorno } from './configuracion/entorno.js';
import { iniciarTareaRecordatorios } from './tareas/recordatorios.tarea.js';

// Se escucha en todas las interfaces IPv4 y no solo en localhost: dentro de Docker,
// Nginx llega a la API por la red interna del compose (http://api:4000).
const HOST_ESCUCHA = '0.0.0.0';

aplicacion.listen(Number(entorno.puertoApi), HOST_ESCUCHA, () => {
  console.log(`API de Turnia escuchando en ${HOST_ESCUCHA}:${entorno.puertoApi}`);
});

iniciarTareaRecordatorios();
