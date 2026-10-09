/**
 * Módulo: Rutas de contenido — /api/contenido (mini-CMS de la página de inicio)
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 18/09/2026
 */

import { Router } from 'express';
import * as controladorContenido from '../controladores/contenido.controlador.js';
import { verificarAutenticacion } from '../middlewares/autenticacion.js';
import { verificarRol } from '../middlewares/autorizacion.js';

const enrutador = Router();

enrutador.get('/', controladorContenido.obtener);
enrutador.put(
  '/',
  verificarAutenticacion,
  verificarRol('administradora'),
  controladorContenido.actualizar,
);

export default enrutador;
