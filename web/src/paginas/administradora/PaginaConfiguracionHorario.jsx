/**
 * Módulo: Página de configuración del horario de atención y días no laborables (CU-10)
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 15/09/2026
 * Modificado por: Luis — 07/10/2026 (Incremento 7A: implementación real de CU-10 y avisos de RN-09)
 * Modificado por: Luis — 07/10/2026 (Incremento 7B: propTypes y motivo de la excepción de exhaustive-deps)
 */

import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { obtener, enviar, actualizar, eliminar } from '../../api/clienteApi.js';

// Orden visual de lunes a domingo; dia_semana sigue la convención del backend (0 = domingo).
const DIAS_EN_ORDEN = [
  { dia_semana: 1, nombre: 'Lunes' },
  { dia_semana: 2, nombre: 'Martes' },
  { dia_semana: 3, nombre: 'Miércoles' },
  { dia_semana: 4, nombre: 'Jueves' },
  { dia_semana: 5, nombre: 'Viernes' },
  { dia_semana: 6, nombre: 'Sábado' },
  { dia_semana: 0, nombre: 'Domingo' },
];
const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const PATRON_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

const CLASES_ENTRADA =
  'px-2 py-1 border border-gray-300 rounded disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100';

// Igual que el resto del sitio (Agenda, Reservar), las fechas y horas se muestran en UTC,
// la misma convención con la que el backend calcula y valida los horarios.
function hoyComoTexto() {
  const hoy = new Date();
  return new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

function formatearFecha(fechaTexto) {
  const [anio, mes, dia] = fechaTexto.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return `${NOMBRES_DIA[fecha.getUTCDay()]} ${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${anio}`;
}

function formatearFechaHora(instanteIso) {
  const fecha = new Date(instanteIso);
  const hora = `${String(fecha.getUTCHours()).padStart(2, '0')}:${String(fecha.getUTCMinutes()).padStart(2, '0')}`;
  return `${formatearFecha(fecha.toISOString().slice(0, 10))}, ${hora}`;
}

// Misma validación que el servidor (GestorDeHorarios.configurarHorario), para avisar
// antes de enviar. Devuelve un mensaje por día con error, o un objeto vacío.
function validarSemana(dias) {
  const errores = {};
  for (const dia of dias) {
    if (!PATRON_HORA.test(dia.hora_inicio) || !PATRON_HORA.test(dia.hora_fin)) {
      errores[dia.dia_semana] = 'Indica la hora de inicio y de fin (HH:MM).';
    } else if (dia.hora_inicio >= dia.hora_fin) {
      errores[dia.dia_semana] = 'La hora de inicio debe ser anterior a la hora de fin.';
    }
  }
  return errores;
}

function AvisoConflicto({ conflicto, onCerrar }) {
  return (
    <div
      role="alert"
      className="p-4 mt-4 text-amber-900 border border-amber-300 rounded bg-amber-50 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-800"
    >
      <p className="font-semibold">{conflicto.mensaje}</p>
      <p className="mt-1 text-sm">
        Estas citas activas quedarían afectadas. Primero cancélalas desde la{' '}
        <Link to="/admin/agenda" className="underline hover:no-underline">
          Agenda
        </Link>{' '}
        y luego vuelve a intentarlo:
      </p>
      <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
        {conflicto.citas.map((cita) => (
          <li key={cita.id} className="break-words">
            {formatearFechaHora(cita.inicia_en)} — {cita.servicio} — {cita.clienta}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onCerrar}
        className="mt-3 text-sm underline hover:no-underline"
      >
        Entendido
      </button>
    </div>
  );
}

AvisoConflicto.propTypes = {
  conflicto: PropTypes.shape({
    mensaje: PropTypes.string.isRequired,
    citas: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        inicia_en: PropTypes.string.isRequired,
        servicio: PropTypes.string,
        clienta: PropTypes.string,
      }),
    ).isRequired,
  }).isRequired,
  onCerrar: PropTypes.func.isRequired,
};

function PaginaConfiguracionHorario() {
  const [dias, setDias] = useState([]);
  const [diasNoLaborables, setDiasNoLaborables] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [erroresPorDia, setErroresPorDia] = useState({});
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevoMotivo, setNuevoMotivo] = useState('');
  const [agregando, setAgregando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [mensajeError, setMensajeError] = useState(null);
  const [conflicto, setConflicto] = useState(null);

  function aplicarHorario(datos) {
    setDias(datos.dias);
    setDiasNoLaborables(datos.dias_no_laborables);
  }

  async function cargarHorario() {
    setCargando(true);
    try {
      const respuesta = await obtener('/horarios');
      aplicarHorario(respuesta.datos);
    } catch (error) {
      setMensajeError(error.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarHorario();
    // Carga inicial, solo al montar: cargarHorario se vuelve a crear en cada render,
    // así que incluirla como dependencia repetiría la petición en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function limpiarMensajes() {
    setMensajeExito(null);
    setMensajeError(null);
    setConflicto(null);
  }

  function manejarError(error) {
    if (error.codigo === 'CONFLICTO_CON_CITAS' && error.detalles?.citas) {
      setConflicto({ mensaje: error.message, citas: error.detalles.citas });
    } else {
      setMensajeError(error.message);
    }
  }

  function cambiarDia(diaSemana, cambios) {
    setDias((anteriores) => anteriores.map((dia) => (dia.dia_semana === diaSemana ? { ...dia, ...cambios } : dia)));
    setErroresPorDia((anteriores) => ({ ...anteriores, [diaSemana]: undefined }));
  }

  async function manejarGuardarHorario(evento) {
    evento.preventDefault();
    limpiarMensajes();

    const errores = validarSemana(dias);
    setErroresPorDia(errores);
    if (Object.keys(errores).length > 0) {
      setMensajeError('Revisa los días marcados antes de guardar.');
      return;
    }

    setGuardando(true);
    try {
      const respuesta = await actualizar('/horarios', { dias });
      aplicarHorario(respuesta.datos);
      setMensajeExito('Horario de atención guardado correctamente.');
    } catch (error) {
      manejarError(error);
    } finally {
      setGuardando(false);
    }
  }

  async function manejarAgregarDia(evento) {
    evento.preventDefault();
    limpiarMensajes();

    if (!nuevaFecha) {
      setMensajeError('Elige la fecha del día no laborable.');
      return;
    }
    if (nuevaFecha < hoyComoTexto()) {
      setMensajeError('No se puede registrar un día no laborable en una fecha pasada.');
      return;
    }

    setAgregando(true);
    try {
      await enviar('/horarios/dias-no-laborables', {
        fecha: nuevaFecha,
        motivo: nuevoMotivo.trim() || null,
      });
      setMensajeExito(`${formatearFecha(nuevaFecha)} se registró como día no laborable.`);
      setNuevaFecha('');
      setNuevoMotivo('');
      await cargarHorario();
    } catch (error) {
      manejarError(error);
    } finally {
      setAgregando(false);
    }
  }

  async function manejarEliminarDia(dia) {
    const confirmado = window.confirm(`¿Eliminar ${formatearFecha(dia.fecha)} de los días no laborables?`);
    if (!confirmado) return;

    limpiarMensajes();
    try {
      await eliminar(`/horarios/dias-no-laborables/${dia.id}`);
      setMensajeExito(`${formatearFecha(dia.fecha)} vuelve a ser un día laborable.`);
      await cargarHorario();
    } catch (error) {
      manejarError(error);
    }
  }

  if (cargando && dias.length === 0) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Cargando horario...</div>;
  }

  return (
    <div className="max-w-3xl px-4 py-8 mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Horario de atención</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Las horas se muestran en UTC, igual que en la Agenda y en las reservas.
      </p>

      {mensajeExito && (
        <p role="status" className="p-3 mt-4 text-green-800 bg-green-100 rounded dark:bg-green-900 dark:text-green-200">
          {mensajeExito}
        </p>
      )}
      {mensajeError && (
        <p role="alert" className="p-3 mt-4 text-red-800 bg-red-100 rounded dark:bg-red-900 dark:text-red-200">
          {mensajeError}
        </p>
      )}
      {conflicto && <AvisoConflicto conflicto={conflicto} onCerrar={() => setConflicto(null)} />}

      <form
        onSubmit={manejarGuardarHorario}
        className="p-4 mt-6 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700"
        noValidate
      >
        <h2 className="font-semibold text-gray-700 dark:text-gray-200">Horario semanal</h2>

        <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-700">
          {DIAS_EN_ORDEN.map(({ dia_semana: diaSemana, nombre }) => {
            const dia = dias.find((d) => d.dia_semana === diaSemana);
            if (!dia) return null;
            const error = erroresPorDia[diaSemana];
            return (
              <li key={diaSemana} className="py-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="w-24 font-medium text-gray-800 dark:text-gray-100">{nombre}</span>

                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={dia.activo}
                      onChange={(evento) => cambiarDia(diaSemana, { activo: evento.target.checked })}
                      className="w-4 h-4 accent-pink-600"
                    />
                    Atiende
                  </label>

                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <label className="flex items-center gap-1">
                      <span className="sr-only">Hora de inicio del {nombre}</span>
                      <input
                        type="time"
                        value={dia.hora_inicio}
                        disabled={!dia.activo}
                        onChange={(evento) => cambiarDia(diaSemana, { hora_inicio: evento.target.value })}
                        className={CLASES_ENTRADA}
                      />
                    </label>
                    <span aria-hidden="true">a</span>
                    <label className="flex items-center gap-1">
                      <span className="sr-only">Hora de fin del {nombre}</span>
                      <input
                        type="time"
                        value={dia.hora_fin}
                        disabled={!dia.activo}
                        onChange={(evento) => cambiarDia(diaSemana, { hora_fin: evento.target.value })}
                        className={CLASES_ENTRADA}
                      />
                    </label>
                  </div>

                  {!dia.activo && <span className="text-xs text-gray-400 dark:text-gray-500">Cerrado</span>}
                </div>
                {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
              </li>
            );
          })}
        </ul>

        <button
          type="submit"
          disabled={guardando}
          className="w-full px-4 py-2 mt-4 text-sm font-medium text-white bg-pink-600 rounded sm:w-auto hover:bg-pink-700 disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar horario'}
        </button>
      </form>

      <section className="p-4 mt-8 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200">Días no laborables</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Feriados, vacaciones u otros días en que el salón no atiende, aunque normalmente sí lo haga.
        </p>

        <form onSubmit={manejarAgregarDia} className="flex flex-col gap-3 mt-4 sm:flex-row sm:items-end" noValidate>
          <label className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
            Fecha
            <input
              type="date"
              value={nuevaFecha}
              min={hoyComoTexto()}
              onChange={(evento) => setNuevaFecha(evento.target.value)}
              className={`mt-1 ${CLASES_ENTRADA}`}
            />
          </label>
          <label className="flex flex-col flex-1 text-sm text-gray-600 dark:text-gray-300">
            Motivo (opcional)
            <input
              type="text"
              value={nuevoMotivo}
              maxLength={160}
              placeholder="Ej.: Feriado nacional"
              onChange={(evento) => setNuevoMotivo(evento.target.value)}
              className={`mt-1 ${CLASES_ENTRADA}`}
            />
          </label>
          <button
            type="submit"
            disabled={agregando}
            className="px-4 py-2 text-sm font-medium text-white bg-pink-600 rounded hover:bg-pink-700 disabled:opacity-50"
          >
            {agregando ? 'Agregando...' : 'Agregar'}
          </button>
        </form>

        <ul className="mt-4 divide-y divide-gray-100 dark:divide-gray-700">
          {diasNoLaborables.map((dia) => (
            <li key={dia.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="text-gray-800 dark:text-gray-100">{formatearFecha(dia.fecha)}</p>
                {dia.motivo && <p className="text-sm text-gray-500 break-words dark:text-gray-400">{dia.motivo}</p>}
              </div>
              <button
                type="button"
                onClick={() => manejarEliminarDia(dia)}
                className="text-sm text-red-600 hover:underline dark:text-red-400"
              >
                Eliminar
              </button>
            </li>
          ))}
          {diasNoLaborables.length === 0 && (
            <li className="py-2 text-sm text-gray-500 dark:text-gray-400">No hay días no laborables próximos.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

export default PaginaConfiguracionHorario;
