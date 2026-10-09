/**
 * Módulo: Controlador de horarios — horario de atención y días no laborables (CU-10)
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 15/09/2026
 * Modificado por: Ronald — 07/10/2026 (Incremento 7A: conectado a GestorDeHorarios real)
 */

import GestorDeHorarios from '../servicios/GestorDeHorarios.js';

const gestorDeHorarios = new GestorDeHorarios();

export async function obtenerHorario(peticion, respuesta, siguiente) {
  try {
    const horario = await gestorDeHorarios.obtenerHorario();
    respuesta.json({ exito: true, datos: horario });
  } catch (error) {
    siguiente(error);
  }
}

export async function configurarHorario(peticion, respuesta, siguiente) {
  try {
    const horario = await gestorDeHorarios.configurarHorario(peticion.body?.dias);
    respuesta.json({ exito: true, datos: horario });
  } catch (error) {
    siguiente(error);
  }
}

export async function agregarDiaNoLaborable(peticion, respuesta, siguiente) {
  try {
    const { fecha, motivo } = peticion.body ?? {};
    const dia = await gestorDeHorarios.agregarDiaNoLaborable(fecha, motivo);
    respuesta.status(201).json({ exito: true, datos: dia });
  } catch (error) {
    siguiente(error);
  }
}

export async function eliminarDiaNoLaborable(peticion, respuesta, siguiente) {
  try {
    const dia = await gestorDeHorarios.eliminarDiaNoLaborable(peticion.params.id);
    respuesta.json({ exito: true, datos: dia });
  } catch (error) {
    siguiente(error);
  }
}
