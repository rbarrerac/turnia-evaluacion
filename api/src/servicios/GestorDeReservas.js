/**
 * Módulo: GestorDeReservas — núcleo de negocio: disponibilidad, reservas y estados de citas
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 18/09/2026
 * Modificado por: Ronald — 07/10/2026 (Incremento 7A: RN-02 ampliada — FECHA_PASADA,
 *   SERVICIO_INACTIVO y validación de entradas con DATOS_INVALIDOS)
 */

import prisma from '../configuracion/baseDeDatos.js';
import {
  calcularFin,
  generarIntervalos,
  haySuperposicion,
  descomponerFecha,
  combinarFechaConHora,
  UN_DIA_EN_MS,
} from '../utilidades/fechas.js';
import { esUuidValido, esFechaTextoValida, esInstanteValido } from '../utilidades/validadores.js';
import GestorDeNotificaciones from './GestorDeNotificaciones.js';

const DOS_HORAS_EN_MS = 2 * 60 * 60 * 1000;
const DIEZ_MINUTOS_EN_MS = 10 * 60 * 1000;

// RN-04 — transiciones de estado permitidas.
const TRANSICIONES_VALIDAS = {
  pendiente: ['confirmada', 'cancelada'],
  confirmada: ['completada', 'cancelada'],
  completada: [],
  cancelada: [],
};

function crearError(codigo, mensaje, codigoHttp) {
  const error = new Error(mensaje);
  error.codigo = codigo;
  error.mensaje = mensaje;
  error.codigoHttp = codigoHttp;
  return error;
}

// Los cálculos de horario son en UTC en todo el proyecto: `descomponerFecha` y
// `combinarFechaConHora` viven en utilidades/fechas.js (compartidas con GestorDeHorarios).

function validarServicioId(servicioId) {
  if (!esUuidValido(servicioId)) {
    throw crearError('DATOS_INVALIDOS', 'El identificador del servicio no es válido.', 400);
  }
}

// La fecha de consulta llega como texto "AAAA-MM-DD" desde la API, o como Date
// desde el código interno/pruebas. Cualquier otra cosa es una entrada inválida (400).
function validarFechaDeConsulta(fecha) {
  const esDateValida = fecha instanceof Date && !Number.isNaN(fecha.getTime());
  if (!esDateValida && !esFechaTextoValida(fecha)) {
    throw crearError('DATOS_INVALIDOS', 'La fecha es obligatoria y debe tener el formato AAAA-MM-DD.', 400);
  }
}

// RN-02 (ampliada en el Incremento 7A): el servicio debe existir (404) y estar activo (400).
async function obtenerServicioActivoOFallar(servicioId) {
  const servicio = await prisma.servicios.findUnique({ where: { id: servicioId } });
  if (!servicio) {
    throw crearError('SERVICIO_NO_ENCONTRADO', 'El servicio solicitado no existe.', 404);
  }
  if (!servicio.activo) {
    throw crearError('SERVICIO_INACTIVO', 'El servicio solicitado no está disponible actualmente.', 400);
  }
  return servicio;
}

async function obtenerCitasDelDia(fechaUtc) {
  return prisma.citas.findMany({
    where: {
      estado: { not: 'cancelada' },
      inicia_en: { gte: fechaUtc, lt: new Date(fechaUtc.getTime() + UN_DIA_EN_MS) },
    },
  });
}

class GestorDeReservas {
  // `reloj` es la función usada para obtener "ahora". Por defecto usa el reloj real
  // (() => new Date()), como en producción; las pruebas unitarias son las únicas que
  // lo sobreescriben, con un instante fijo, para que RN-03/RN-08 y el filtrado de
  // `calcularDisponibilidad` sean reproducibles sin depender de la hora real del reloj.
  constructor(reloj = () => new Date()) {
    this.reloj = reloj;
    this.gestorDeNotificaciones = new GestorDeNotificaciones();
  }

  async calcularDisponibilidad(servicioId, fecha) {
    validarServicioId(servicioId);
    validarFechaDeConsulta(fecha);
    const servicio = await obtenerServicioActivoOFallar(servicioId);
    const { fechaUtc, diaSemana } = descomponerFecha(fecha);

    // RN-02: no se consultan días ya pasados. Hoy sí se permite (los intervalos
    // anteriores a "ahora" se filtran más abajo).
    const { fechaUtc: hoyUtc } = descomponerFecha(this.reloj());
    if (fechaUtc.getTime() < hoyUtc.getTime()) {
      throw crearError('FECHA_PASADA', 'No se puede consultar disponibilidad de una fecha pasada.', 400);
    }

    const diaBloqueado = await prisma.dias_no_laborables.findUnique({ where: { fecha: fechaUtc } });
    if (diaBloqueado) {
      return [];
    }

    const horario = await prisma.horarios_atencion.findFirst({ where: { dia_semana: diaSemana } });
    if (!horario || !horario.activo) {
      return [];
    }

    const horaInicioJornada = combinarFechaConHora(fechaUtc, horario.hora_inicio);
    const horaFinJornada = combinarFechaConHora(fechaUtc, horario.hora_fin);
    const intervalosDelDia = generarIntervalos(
      horaInicioJornada,
      horaFinJornada,
      servicio.duracion_minutos,
    );

    const citasDelDia = await obtenerCitasDelDia(fechaUtc);
    const ahora = this.reloj().getTime();

    return intervalosDelDia.filter((inicioCandidato) => {
      if (inicioCandidato.getTime() <= ahora) return false;

      const finCandidato = calcularFin(inicioCandidato, servicio.duracion_minutos);
      return !citasDelDia.some((cita) => haySuperposicion(
        inicioCandidato,
        finCandidato,
        cita.inicia_en,
        cita.termina_en,
      ));
    });
  }

  async validarDisponibilidad(servicioId, iniciaEn) {
    validarServicioId(servicioId);
    if (!esInstanteValido(iniciaEn)) {
      throw crearError('DATOS_INVALIDOS', 'La fecha y hora de inicio de la cita no son válidas.', 400);
    }
    const servicio = await obtenerServicioActivoOFallar(servicioId);

    const inicio = new Date(iniciaEn);
    // RN-02: la cita debe ser futura.
    if (inicio.getTime() < this.reloj().getTime()) {
      throw crearError('FECHA_PASADA', 'No se puede reservar una cita en una fecha u hora pasada.', 400);
    }
    const fin = calcularFin(inicio, servicio.duracion_minutos);
    const { fechaUtc, diaSemana } = descomponerFecha(inicio);

    const diaBloqueado = await prisma.dias_no_laborables.findUnique({ where: { fecha: fechaUtc } });
    if (diaBloqueado) {
      throw crearError('FUERA_DE_HORARIO', 'Ese día el salón no atiende.', 400);
    }

    const horario = await prisma.horarios_atencion.findFirst({ where: { dia_semana: diaSemana } });
    if (!horario || !horario.activo) {
      throw crearError('FUERA_DE_HORARIO', 'Ese día el salón no atiende.', 400);
    }

    const horaInicioJornada = combinarFechaConHora(fechaUtc, horario.hora_inicio);
    const horaFinJornada = combinarFechaConHora(fechaUtc, horario.hora_fin);

    if (inicio.getTime() < horaInicioJornada.getTime() || fin.getTime() > horaFinJornada.getTime()) {
      throw crearError(
        'FUERA_DE_HORARIO',
        'El horario solicitado está fuera del horario de atención.',
        400,
      );
    }

    const citasDelDia = await obtenerCitasDelDia(fechaUtc);
    const seSuperpone = citasDelDia.some((cita) => haySuperposicion(
      inicio,
      fin,
      cita.inicia_en,
      cita.termina_en,
    ));
    if (seSuperpone) {
      throw crearError('DISPONIBILIDAD_OCUPADA', 'El horario ya no está disponible.', 409);
    }

    return { terminaEn: fin, duracionMinutos: servicio.duracion_minutos };
  }

  async reservar(clientaId, servicioId, iniciaEn, notas) {
    const { terminaEn } = await this.validarDisponibilidad(servicioId, iniciaEn);

    let cita;
    try {
      cita = await prisma.citas.create({
        data: {
          clienta_id: clientaId,
          servicio_id: servicioId,
          inicia_en: new Date(iniciaEn),
          termina_en: terminaEn,
          estado: 'pendiente',
          notas: notas || null,
        },
      });
    } catch (error) {
      // RN-02, condición de carrera: dos peticiones concurrentes pueden pasar la validación
      // de aplicación (arriba) antes de que la otra escriba. La restricción EXCLUDE de la base
      // de datos ("sin_superposicion") es quien tiene la última palabra en ese caso.
      const mensaje = error?.message ?? '';
      if (mensaje.includes('sin_superposicion') || mensaje.includes('23P01')) {
        throw crearError('DISPONIBILIDAD_OCUPADA', 'El horario ya no está disponible.', 409);
      }
      throw error;
    }

    // RN-05: se envía (o se imprime en modo consola) el correo de confirmación y se
    // registra en `notificaciones`. Un fallo aquí nunca debe hacer fallar la reserva
    // ya creada: se captura y se registra en consola, no se propaga a la peticion.
    try {
      await this.gestorDeNotificaciones.enviarConfirmacion(cita);
    } catch (error) {
      console.error('GestorDeReservas: no se pudo registrar la notificación de confirmación:', error);
    }

    return cita;
  }

  async cancelar(citaId, clientaId) {
    const cita = await prisma.citas.findUnique({ where: { id: citaId } });
    if (!cita) {
      throw crearError('CITA_NO_ENCONTRADA', 'La cita no existe.', 404);
    }

    if (cita.clienta_id !== clientaId) {
      throw crearError('SIN_PERMISO', 'No puede cancelar una cita que no es suya.', 403);
    }

    const msRestantes = cita.inicia_en.getTime() - this.reloj().getTime();
    if (msRestantes < DOS_HORAS_EN_MS) {
      throw crearError(
        'CANCELACION_TARDIA',
        'Solo se puede cancelar con al menos 2 horas de anticipación.',
        400,
      );
    }

    return prisma.citas.update({ where: { id: citaId }, data: { estado: 'cancelada' } });
  }

  async obtenerHistorial(clientaId) {
    return prisma.citas.findMany({
      where: { clienta_id: clientaId },
      orderBy: { inicia_en: 'desc' },
      include: { servicio: true },
    });
  }

  // Usado por GET /api/citas/agenda (administradora). La interfaz de agenda se
  // construye en el Incremento 4; aquí solo se deja el endpoint funcional.
  async obtenerAgenda(desde, hasta) {
    return prisma.citas.findMany({
      where: { inicia_en: { gte: new Date(desde), lt: new Date(hasta) } },
      orderBy: { inicia_en: 'asc' },
      include: {
        servicio: true,
        // select explícito: nunca exponer contrasena_hash en la agenda.
        clienta: { select: { id: true, nombre: true, correo: true, telefono: true } },
      },
    });
  }

  async cambiarEstado(citaId, nuevoEstado) {
    const cita = await prisma.citas.findUnique({ where: { id: citaId } });
    if (!cita) {
      throw crearError('CITA_NO_ENCONTRADA', 'La cita no existe.', 404);
    }

    if (!Object.prototype.hasOwnProperty.call(TRANSICIONES_VALIDAS, nuevoEstado)) {
      throw crearError('DATOS_INVALIDOS', 'El estado indicado no es válido.', 400);
    }

    const transicionesPermitidas = TRANSICIONES_VALIDAS[cita.estado];
    if (!transicionesPermitidas.includes(nuevoEstado)) {
      throw crearError(
        'TRANSICION_INVALIDA',
        `No se puede cambiar una cita de "${cita.estado}" a "${nuevoEstado}".`,
        400,
      );
    }

    // RN-08: no se puede completar una cita hasta que hayan pasado al menos 10
    // minutos desde su hora de inicio.
    if (nuevoEstado === 'completada') {
      const msTranscurridos = this.reloj().getTime() - cita.inicia_en.getTime();
      if (msTranscurridos < DIEZ_MINUTOS_EN_MS) {
        throw crearError(
          'COMPLETADO_ANTICIPADO',
          'No se puede completar una cita que aún no ha transcurrido: deben pasar al menos 10 minutos desde su inicio.',
          400,
        );
      }
    }

    return prisma.citas.update({ where: { id: citaId }, data: { estado: nuevoEstado } });
  }
}

export default GestorDeReservas;
