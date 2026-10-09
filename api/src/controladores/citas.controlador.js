/**
 * Módulo: Controlador de citas — disponibilidad, reservas, historial, agenda y estados
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 18/09/2026
 * Modificado por: Ronald — 07/10/2026 (Incremento 7A: desde/hasta inválidos de la agenda -> 400)
 */

import GestorDeReservas from '../servicios/GestorDeReservas.js';
import { esInstanteValido } from '../utilidades/validadores.js';

function errorDatosInvalidos(mensaje) {
  const error = new Error(mensaje);
  error.codigo = 'DATOS_INVALIDOS';
  error.mensaje = mensaje;
  error.codigoHttp = 400;
  return error;
}

const gestorDeReservas = new GestorDeReservas();

export async function obtenerDisponibilidad(peticion, respuesta, siguiente) {
  try {
    const { servicioId, fecha } = peticion.query;
    const disponibilidad = await gestorDeReservas.calcularDisponibilidad(servicioId, fecha);
    respuesta.json({ exito: true, datos: disponibilidad });
  } catch (error) {
    siguiente(error);
  }
}

export async function crear(peticion, respuesta, siguiente) {
  try {
    const { servicioId, iniciaEn, notas } = peticion.body;
    const cita = await gestorDeReservas.reservar(peticion.usuaria.id, servicioId, iniciaEn, notas);
    respuesta.status(201).json({ exito: true, datos: cita });
  } catch (error) {
    siguiente(error);
  }
}

export async function listarMias(peticion, respuesta, siguiente) {
  try {
    const citas = await gestorDeReservas.obtenerHistorial(peticion.usuaria.id);
    respuesta.json({ exito: true, datos: citas });
  } catch (error) {
    siguiente(error);
  }
}

export async function cancelar(peticion, respuesta, siguiente) {
  try {
    const cita = await gestorDeReservas.cancelar(peticion.params.id, peticion.usuaria.id);
    respuesta.json({ exito: true, datos: cita });
  } catch (error) {
    siguiente(error);
  }
}

export async function obtenerAgenda(peticion, respuesta, siguiente) {
  try {
    const ahora = new Date();
    const inicioPorDefecto = new Date(
      Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()),
    );
    const finPorDefecto = new Date(inicioPorDefecto.getTime() + 7 * 24 * 60 * 60000);

    for (const parametro of ['desde', 'hasta']) {
      const valor = peticion.query[parametro];
      if (valor !== undefined && !esInstanteValido(valor)) {
        throw errorDatosInvalidos(`El parámetro "${parametro}" no es una fecha válida.`);
      }
    }

    const desde = peticion.query.desde ? new Date(peticion.query.desde) : inicioPorDefecto;
    const hasta = peticion.query.hasta ? new Date(peticion.query.hasta) : finPorDefecto;

    const agenda = await gestorDeReservas.obtenerAgenda(desde, hasta);
    respuesta.json({ exito: true, datos: agenda });
  } catch (error) {
    siguiente(error);
  }
}

export async function cambiarEstado(peticion, respuesta, siguiente) {
  try {
    const cita = await gestorDeReservas.cambiarEstado(peticion.params.id, peticion.body.estado);
    respuesta.json({ exito: true, datos: cita });
  } catch (error) {
    siguiente(error);
  }
}
