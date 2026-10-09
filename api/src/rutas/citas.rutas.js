/**
 * Módulo: Rutas de citas — /api/citas
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 15/09/2026
 */

import { Router } from 'express';
import * as controladorCitas from '../controladores/citas.controlador.js';
import { verificarAutenticacion } from '../middlewares/autenticacion.js';
import { verificarRol } from '../middlewares/autorizacion.js';

const enrutador = Router();

enrutador.get('/disponibilidad', verificarAutenticacion, controladorCitas.obtenerDisponibilidad);
enrutador.post('/', verificarAutenticacion, verificarRol('clienta'), controladorCitas.crear);
enrutador.get('/mias', verificarAutenticacion, verificarRol('clienta'), controladorCitas.listarMias);
enrutador.patch(
  '/:id/cancelar',
  verificarAutenticacion,
  verificarRol('clienta'),
  controladorCitas.cancelar,
);
enrutador.get(
  '/agenda',
  verificarAutenticacion,
  verificarRol('administradora'),
  controladorCitas.obtenerAgenda,
);
enrutador.patch(
  '/:id/estado',
  verificarAutenticacion,
  verificarRol('administradora'),
  controladorCitas.cambiarEstado,
);

export default enrutador;
