/**
 * Módulo: Configuración de la aplicación Express (sin levantar el servidor)
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 17/09/2026
 */

import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { entorno } from './configuracion/entorno.js';
import enrutadorPrincipal from './rutas/indice.js';
import { manejadorErrores } from './middlewares/manejadorErrores.js';

const aplicacion = express();

aplicacion.use(cors({ origin: entorno.origenPermitido }));
aplicacion.use(express.json());

// Sirve como estáticos la carpeta de almacenamiento local (galería de trabajos):
// una foto guardada en <directorioSubidas>/<archivo> queda accesible en
// /archivos/trabajos/<archivo>, ya que directorioSubidas termina en "trabajos".
aplicacion.use('/archivos', express.static(path.dirname(entorno.directorioSubidas)));

aplicacion.use('/api', enrutadorPrincipal);

aplicacion.use(manejadorErrores);

export default aplicacion;
