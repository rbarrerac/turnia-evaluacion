/**
 * Módulo: GestorDeHorarios — horario de atención semanal y días no laborables (CU-10, RN-09)
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 15/09/2026
 * Modificado por: Ronald — 07/10/2026 (Incremento 7A: implementación real de CU-10 y RN-09)
 */

import prisma from '../configuracion/baseDeDatos.js';
import {
  descomponerFecha,
  combinarFechaConHora,
  textoAHora,
  horaATexto,
  fechaATexto,
  UN_DIA_EN_MS,
} from '../utilidades/fechas.js';
import { esUuidValido, esFechaTextoValida, esHoraValida } from '../utilidades/validadores.js';

const DIAS_DE_LA_SEMANA = [0, 1, 2, 3, 4, 5, 6];
// Valores con los que se guarda un día que nunca se había configurado y llega
// inactivo sin horas: las columnas hora_inicio/hora_fin son NOT NULL y la CHECK
// horario_inicio_antes_de_fin exige hora_inicio < hora_fin también en días inactivos.
const HORA_INICIO_POR_DEFECTO = '09:00';
const HORA_FIN_POR_DEFECTO = '18:00';
const LONGITUD_MAXIMA_MOTIVO = 160;
const ESTADOS_ACTIVOS = ['pendiente', 'confirmada'];

function crearError(codigo, mensaje, codigoHttp, detalles) {
  const error = new Error(mensaje);
  error.codigo = codigo;
  error.mensaje = mensaje;
  error.codigoHttp = codigoHttp;
  if (detalles !== undefined) error.detalles = detalles;
  return error;
}

function datosInvalidos(mensaje) {
  return crearError('DATOS_INVALIDOS', mensaje, 400);
}

function describirCita(cita) {
  return {
    id: cita.id,
    inicia_en: cita.inicia_en,
    termina_en: cita.termina_en,
    estado: cita.estado,
    servicio: cita.servicio.nombre,
    clienta: cita.clienta.nombre,
  };
}

// RN-09: error con la lista de citas afectadas para que la interfaz pueda mostrarla.
function conflictoConCitas(mensaje, citas) {
  return crearError('CONFLICTO_CON_CITAS', mensaje, 409, { citas: citas.map(describirCita) });
}

const INCLUIR_DATOS_DE_CITA = {
  servicio: { select: { nombre: true } },
  // select explícito: nunca exponer datos sensibles de la clienta.
  clienta: { select: { nombre: true } },
};

function aFormatoDeDia(registro) {
  return {
    dia_semana: registro.dia_semana,
    activo: registro.activo,
    hora_inicio: horaATexto(registro.hora_inicio),
    hora_fin: horaATexto(registro.hora_fin),
  };
}

function aFormatoDeDiaNoLaborable(registro) {
  return { id: registro.id, fecha: fechaATexto(registro.fecha), motivo: registro.motivo };
}

// Valida la configuración semanal recibida y la normaliza a
// { dia_semana, activo, hora_inicio: "HH:MM" | undefined, hora_fin: "HH:MM" | undefined }.
function validarDias(dias) {
  if (!Array.isArray(dias) || dias.length === 0 || dias.length > 7) {
    throw datosInvalidos('Debe enviar entre 1 y 7 días de la semana en "dias".');
  }

  const vistos = new Set();
  return dias.map((dia) => {
    if (dia === null || typeof dia !== 'object') {
      throw datosInvalidos('Cada día debe ser un objeto con dia_semana, activo, hora_inicio y hora_fin.');
    }

    const { dia_semana: diaSemana, activo, hora_inicio: horaInicio, hora_fin: horaFin } = dia;

    if (!Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) {
      throw datosInvalidos('dia_semana debe ser un número entero entre 0 (domingo) y 6 (sábado).');
    }
    if (vistos.has(diaSemana)) {
      throw datosInvalidos(`El día ${diaSemana} aparece repetido.`);
    }
    vistos.add(diaSemana);

    if (typeof activo !== 'boolean') {
      throw datosInvalidos(`El campo "activo" del día ${diaSemana} debe ser verdadero o falso.`);
    }

    const traeHoras = horaInicio !== undefined || horaFin !== undefined;
    // Un día activo siempre exige horas; uno inactivo puede omitirlas (se conservan
    // las que ya tenía), pero si las envía deben ser igual de válidas.
    if (activo || traeHoras) {
      if (!esHoraValida(horaInicio) || !esHoraValida(horaFin)) {
        throw datosInvalidos(`Las horas del día ${diaSemana} deben tener el formato HH:MM (00:00 a 23:59).`);
      }
      if (horaInicio >= horaFin) {
        throw datosInvalidos(`En el día ${diaSemana} la hora de inicio debe ser anterior a la hora de fin.`);
      }
    }

    return {
      dia_semana: diaSemana,
      activo,
      hora_inicio: traeHoras ? horaInicio : undefined,
      hora_fin: traeHoras ? horaFin : undefined,
    };
  });
}

class GestorDeHorarios {
  // Mismo patrón que GestorDeReservas: `reloj` devuelve "ahora"; por defecto es el
  // reloj real y solo las pruebas lo sobreescriben con un instante fijo.
  constructor(reloj = () => new Date()) {
    this.reloj = reloj;
  }

  hoyUtc() {
    return descomponerFecha(this.reloj()).fechaUtc;
  }

  async obtenerHorario() {
    const [registros, diasNoLaborables] = await Promise.all([
      prisma.horarios_atencion.findMany({ orderBy: { dia_semana: 'asc' } }),
      prisma.dias_no_laborables.findMany({
        where: { fecha: { gte: this.hoyUtc() } },
        orderBy: { fecha: 'asc' },
      }),
    ]);

    const dias = DIAS_DE_LA_SEMANA.map((diaSemana) => {
      const registro = registros.find((r) => r.dia_semana === diaSemana);
      if (!registro) {
        return {
          dia_semana: diaSemana,
          activo: false,
          hora_inicio: HORA_INICIO_POR_DEFECTO,
          hora_fin: HORA_FIN_POR_DEFECTO,
        };
      }
      return aFormatoDeDia(registro);
    });

    return { dias, dias_no_laborables: diasNoLaborables.map(aFormatoDeDiaNoLaborable) };
  }

  async configurarHorario(dias) {
    const diasValidados = validarDias(dias);

    await prisma.$transaction(async (tx) => {
      const registrosActuales = await tx.horarios_atencion.findMany();

      // Horario semanal resultante: lo actual, con los días recibidos encima.
      const horarioResultante = new Map();
      for (const registro of registrosActuales) {
        horarioResultante.set(registro.dia_semana, aFormatoDeDia(registro));
      }
      for (const dia of diasValidados) {
        const anterior = horarioResultante.get(dia.dia_semana);
        horarioResultante.set(dia.dia_semana, {
          dia_semana: dia.dia_semana,
          activo: dia.activo,
          hora_inicio: dia.hora_inicio ?? anterior?.hora_inicio ?? HORA_INICIO_POR_DEFECTO,
          hora_fin: dia.hora_fin ?? anterior?.hora_fin ?? HORA_FIN_POR_DEFECTO,
        });
      }

      // RN-09: ninguna cita activa futura puede quedar fuera del nuevo horario.
      const citasFuturas = await tx.citas.findMany({
        where: { estado: { in: ESTADOS_ACTIVOS }, inicia_en: { gte: this.reloj() } },
        include: INCLUIR_DATOS_DE_CITA,
        orderBy: { inicia_en: 'asc' },
      });
      const citasAfectadas = citasFuturas.filter((cita) => {
        const { fechaUtc, diaSemana } = descomponerFecha(cita.inicia_en);
        const horario = horarioResultante.get(diaSemana);
        if (!horario || !horario.activo) return true;
        const inicioJornada = combinarFechaConHora(fechaUtc, textoAHora(horario.hora_inicio));
        const finJornada = combinarFechaConHora(fechaUtc, textoAHora(horario.hora_fin));
        return cita.inicia_en.getTime() < inicioJornada.getTime()
          || cita.termina_en.getTime() > finJornada.getTime();
      });
      if (citasAfectadas.length > 0) {
        throw conflictoConCitas(
          'El nuevo horario deja fuera citas activas. Cancélelas primero desde la Agenda.',
          citasAfectadas,
        );
      }

      for (const dia of diasValidados) {
        const horario = horarioResultante.get(dia.dia_semana);
        const datos = {
          activo: horario.activo,
          hora_inicio: textoAHora(horario.hora_inicio),
          hora_fin: textoAHora(horario.hora_fin),
        };
        const existente = registrosActuales.find((r) => r.dia_semana === dia.dia_semana);
        if (existente) {
          // eslint-disable-next-line no-await-in-loop
          await tx.horarios_atencion.update({ where: { id: existente.id }, data: datos });
        } else {
          // eslint-disable-next-line no-await-in-loop
          await tx.horarios_atencion.create({ data: { dia_semana: dia.dia_semana, ...datos } });
        }
      }
    });

    return this.obtenerHorario();
  }

  async agregarDiaNoLaborable(fecha, motivo) {
    if (!esFechaTextoValida(fecha)) {
      throw datosInvalidos('La fecha es obligatoria y debe tener el formato AAAA-MM-DD.');
    }
    if (motivo !== undefined && motivo !== null && typeof motivo !== 'string') {
      throw datosInvalidos('El motivo debe ser un texto.');
    }
    const motivoNormalizado = typeof motivo === 'string' && motivo.trim().length > 0 ? motivo.trim() : null;
    if (motivoNormalizado && motivoNormalizado.length > LONGITUD_MAXIMA_MOTIVO) {
      throw datosInvalidos(`El motivo no puede superar ${LONGITUD_MAXIMA_MOTIVO} caracteres.`);
    }

    const { fechaUtc } = descomponerFecha(fecha);
    if (fechaUtc.getTime() < this.hoyUtc().getTime()) {
      throw datosInvalidos('No se puede registrar un día no laborable en una fecha pasada.');
    }

    const existente = await prisma.dias_no_laborables.findUnique({ where: { fecha: fechaUtc } });
    if (existente) {
      throw crearError('DIA_YA_REGISTRADO', 'Esa fecha ya está registrada como día no laborable.', 409);
    }

    // RN-09: no se puede bloquear un día que tenga citas activas.
    const citasDelDia = await prisma.citas.findMany({
      where: {
        estado: { in: ESTADOS_ACTIVOS },
        inicia_en: { gte: fechaUtc, lt: new Date(fechaUtc.getTime() + UN_DIA_EN_MS) },
      },
      include: INCLUIR_DATOS_DE_CITA,
      orderBy: { inicia_en: 'asc' },
    });
    if (citasDelDia.length > 0) {
      throw conflictoConCitas(
        'Ese día tiene citas activas. Cancélelas primero desde la Agenda.',
        citasDelDia,
      );
    }

    try {
      const creado = await prisma.dias_no_laborables.create({
        data: { fecha: fechaUtc, motivo: motivoNormalizado },
      });
      return aFormatoDeDiaNoLaborable(creado);
    } catch (error) {
      // Resguardo ante condición de carrera: la columna fecha es UNIQUE.
      if (error?.code === 'P2002') {
        throw crearError('DIA_YA_REGISTRADO', 'Esa fecha ya está registrada como día no laborable.', 409);
      }
      throw error;
    }
  }

  async eliminarDiaNoLaborable(id) {
    if (!esUuidValido(id)) {
      throw datosInvalidos('El identificador del día no laborable no es válido.');
    }

    const existente = await prisma.dias_no_laborables.findUnique({ where: { id } });
    if (!existente) {
      throw crearError('DIA_NO_ENCONTRADO', 'El día no laborable no existe.', 404);
    }

    await prisma.dias_no_laborables.delete({ where: { id } });
    return aFormatoDeDiaNoLaborable(existente);
  }
}

export default GestorDeHorarios;
