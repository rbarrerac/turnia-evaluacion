/**
 * Módulo: Rutas de servicios — /api/servicios
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 15/09/2026
 */

import { Router } from 'express';
import * as controladorServicios from '../controladores/servicios.controlador.js';
import { verificarAutenticacion } from '../middlewares/autenticacion.js';
import { verificarRol } from '../middlewares/autorizacion.js';

const enrutador = Router();

enrutador.get('/', controladorServicios.listar);
// Debe ir antes de "/:id": de lo contrario Express interpretaría "todos" como un id.
enrutador.get(
  '/todos',
  verificarAutenticacion,
  verificarRol('administradora'),
  controladorServicios.listarTodos,
);
enrutador.get('/:id', controladorServicios.obtenerPorId);
enrutador.post('/', verificarAutenticacion, verificarRol('administradora'), controladorServicios.crear);
enrutador.put('/:id', verificarAutenticacion, verificarRol('administradora'), controladorServicios.editar);
enrutador.delete(
  '/:id',
  verificarAutenticacion,
  verificarRol('administradora'),
  controladorServicios.desactivar,
);
enrutador.patch(
  '/:id/reactivar',
  verificarAutenticacion,
  verificarRol('administradora'),
  controladorServicios.reactivar,
);

export default enrutador;
