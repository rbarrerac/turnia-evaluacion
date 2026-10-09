/**
 * Módulo: Rutas de trabajos — /api/trabajos (galería de fotos por categoría)
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 18/09/2026
 */

import { Router } from 'express';
import * as controladorTrabajos from '../controladores/trabajos.controlador.js';
import { verificarAutenticacion } from '../middlewares/autenticacion.js';
import { verificarRol } from '../middlewares/autorizacion.js';
import { subirFoto } from '../middlewares/subidaDeArchivos.js';

const enrutador = Router();

enrutador.get('/', controladorTrabajos.listarPublico);

enrutador.post(
  '/categorias',
  verificarAutenticacion,
  verificarRol('administradora'),
  controladorTrabajos.crearCategoria,
);
enrutador.put(
  '/categorias/:id',
  verificarAutenticacion,
  verificarRol('administradora'),
  controladorTrabajos.editarCategoria,
);
enrutador.delete(
  '/categorias/:id',
  verificarAutenticacion,
  verificarRol('administradora'),
  controladorTrabajos.eliminarCategoria,
);

enrutador.post(
  '/',
  verificarAutenticacion,
  verificarRol('administradora'),
  subirFoto,
  controladorTrabajos.agregarFoto,
);
enrutador.delete(
  '/:id',
  verificarAutenticacion,
  verificarRol('administradora'),
  controladorTrabajos.eliminarFoto,
);

export default enrutador;
