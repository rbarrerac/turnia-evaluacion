/**
 * Módulo: Enrutador principal — monta todas las sub-rutas bajo /api
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 15/09/2026
 * Modificado por: Ronald — 07/10/2026 (Incremento 7A: se retira /usuarios, sin caso de uso)
 */

import { Router } from 'express';
import enrutadorAutenticacion from './autenticacion.rutas.js';
import enrutadorServicios from './servicios.rutas.js';
import enrutadorCitas from './citas.rutas.js';
import enrutadorHorarios from './horarios.rutas.js';
import enrutadorTrabajos from './trabajos.rutas.js';
import enrutadorContenido from './contenido.rutas.js';

const enrutador = Router();

enrutador.get('/salud', (peticion, respuesta) => {
  respuesta.json({ exito: true, datos: { estado: 'activo' } });
});

enrutador.use('/autenticacion', enrutadorAutenticacion);
enrutador.use('/servicios', enrutadorServicios);
enrutador.use('/citas', enrutadorCitas);
enrutador.use('/horarios', enrutadorHorarios);
enrutador.use('/trabajos', enrutadorTrabajos);
enrutador.use('/contenido', enrutadorContenido);

export default enrutador;
