/**
 * Módulo: Página de agenda (vista de lista, diaria o semanal) de la administradora
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 18/09/2026
 * Modificado por: Luis — 07/10/2026 (Incremento 7B: motivo de la excepción de exhaustive-deps)
 */

import { useEffect, useState } from 'react';
import { obtener, actualizarParcial } from '../../api/clienteApi.js';
import CalendarioAgenda from '../../componentes/CalendarioAgenda.jsx';

const UN_DIA_EN_MS = 24 * 60 * 60 * 1000;
const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function hoyComoFechaUtc() {
  const hoy = new Date();
  return new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));
}

function aFechaUtc(fechaTexto) {
  const [anio, mes, dia] = fechaTexto.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

function comoTexto(fechaUtc) {
  return fechaUtc.toISOString().slice(0, 10);
}

function inicioDeSemana(fechaUtc) {
  const diaSemana = fechaUtc.getUTCDay();
  const diasDesdeElLunes = diaSemana === 0 ? 6 : diaSemana - 1;
  return new Date(fechaUtc.getTime() - diasDesdeElLunes * UN_DIA_EN_MS);
}

function formatearFechaLegible(fechaUtc) {
  return `${NOMBRES_DIA[fechaUtc.getUTCDay()]} ${String(fechaUtc.getUTCDate()).padStart(2, '0')}/${String(fechaUtc.getUTCMonth() + 1).padStart(2, '0')}`;
}

function agruparPorDia(citas) {
  const grupos = new Map();
  for (const cita of citas) {
    const clave = new Date(cita.inicia_en).toISOString().slice(0, 10);
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(cita);
  }
  return [...grupos.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
}

function PaginaAgenda() {
  const [modo, setModo] = useState('dia');
  const [fechaSeleccionada, setFechaSeleccionada] = useState(comoTexto(hoyComoFechaUtc()));
  const [citas, setCitas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensajeError, setMensajeError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [actualizandoId, setActualizandoId] = useState(null);

  async function cargarAgenda() {
    setCargando(true);
    setMensajeError(null);
    try {
      const fechaUtc = aFechaUtc(fechaSeleccionada);
      let desde;
      let hasta;
      if (modo === 'dia') {
        desde = fechaUtc;
        hasta = new Date(fechaUtc.getTime() + UN_DIA_EN_MS);
      } else {
        desde = inicioDeSemana(fechaUtc);
        hasta = new Date(desde.getTime() + 7 * UN_DIA_EN_MS);
      }

      const query = new URLSearchParams({
        desde: comoTexto(desde),
        hasta: comoTexto(hasta),
      }).toString();
      const respuesta = await obtener(`/citas/agenda?${query}`);
      setCitas(respuesta.datos ?? []);
    } catch (error) {
      setMensajeError(error.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarAgenda();
    // Solo debe recargar al cambiar el modo o la fecha: cargarAgenda se vuelve a crear
    // en cada render y como dependencia repetiría la petición en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, fechaSeleccionada]);

  function moverFecha(pasoEnDias) {
    const fechaUtc = aFechaUtc(fechaSeleccionada);
    setFechaSeleccionada(comoTexto(new Date(fechaUtc.getTime() + pasoEnDias * UN_DIA_EN_MS)));
  }

  async function manejarCambiarEstado(cita, nuevoEstado) {
    setMensajeError(null);
    setMensajeExito(null);
    setActualizandoId(cita.id);
    try {
      await actualizarParcial(`/citas/${cita.id}/estado`, { estado: nuevoEstado });
      setMensajeExito(`Cita de "${cita.clienta?.nombre ?? 'la clienta'}" actualizada.`);
      await cargarAgenda();
    } catch (error) {
      setMensajeError(error.message);
    } finally {
      setActualizandoId(null);
    }
  }

  const grupos = modo === 'semana' ? agruparPorDia(citas) : null;

  return (
    <div className="max-w-4xl px-4 py-8 mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Agenda</h1>

      {mensajeExito && (
        <p className="p-3 mt-4 text-sm text-green-800 bg-green-100 rounded dark:bg-green-900 dark:text-green-200">
          {mensajeExito}
        </p>
      )}
      {mensajeError && <p className="p-3 mt-4 text-sm text-red-800 bg-red-100 rounded dark:bg-red-900 dark:text-red-200">{mensajeError}</p>}

      <div className="flex flex-wrap items-center gap-3 mt-6">
        <div className="flex overflow-hidden border border-gray-300 rounded dark:border-gray-600">
          <button
            type="button"
            onClick={() => setModo('dia')}
            className={`px-3 py-1 text-sm ${modo === 'dia' ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200'}`}
          >
            Día
          </button>
          <button
            type="button"
            onClick={() => setModo('semana')}
            className={`px-3 py-1 text-sm ${modo === 'semana' ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200'}`}
          >
            Semana
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => moverFecha(modo === 'dia' ? -1 : -7)}
            className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            aria-label="Anterior"
          >
            &larr;
          </button>
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(evento) => setFechaSeleccionada(evento.target.value)}
            className="px-2 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
          <button
            type="button"
            onClick={() => moverFecha(modo === 'dia' ? 1 : 7)}
            className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            aria-label="Siguiente"
          >
            &rarr;
          </button>
        </div>
      </div>

      <div className="mt-6">
        {cargando && <p className="text-gray-500 dark:text-gray-400">Cargando agenda...</p>}

        {!cargando && modo === 'dia' && (
          <CalendarioAgenda
            citas={citas}
            onCambiarEstado={manejarCambiarEstado}
            actualizandoId={actualizandoId}
          />
        )}

        {!cargando && modo === 'semana' && (
          <div className="space-y-6">
            {grupos.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">No hay citas esta semana.</p>
            )}
            {grupos.map(([clave, citasDelDia]) => (
              <div key={clave}>
                <h2 className="mb-2 font-semibold text-gray-700 dark:text-gray-200">
                  {formatearFechaLegible(aFechaUtc(clave))}
                </h2>
                <CalendarioAgenda
                  citas={citasDelDia}
                  onCambiarEstado={manejarCambiarEstado}
                  actualizandoId={actualizandoId}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PaginaAgenda;
