/**
 * Módulo: Página de historial y cancelación de citas de la clienta
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 18/09/2026
 */

import { useEffect, useState } from 'react';
import { obtener, actualizarParcial } from '../api/clienteApi.js';

const ETIQUETAS_ESTADO = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

const ESTILOS_ESTADO = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  confirmada: 'bg-blue-100 text-blue-800',
  completada: 'bg-green-100 text-green-800',
  cancelada: 'bg-gray-200 text-gray-600',
};

function formatearFechaHora(iso) {
  const fecha = new Date(iso);
  const dia = String(fecha.getUTCDate()).padStart(2, '0');
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  const anio = fecha.getUTCFullYear();
  const horas = String(fecha.getUTCHours()).padStart(2, '0');
  const minutos = String(fecha.getUTCMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
}

function horasHastaLaCita(cita) {
  return (new Date(cita.inicia_en).getTime() - Date.now()) / (60 * 60 * 1000);
}

function esCancelable(cita) {
  return cita.estado !== 'cancelada' && cita.estado !== 'completada' && horasHastaLaCita(cita) >= 2;
}

function PaginaMisCitas() {
  const [citas, setCitas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensajeError, setMensajeError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [cancelandoId, setCancelandoId] = useState(null);

  async function cargarCitas() {
    setCargando(true);
    try {
      const respuesta = await obtener('/citas/mias');
      setCitas(respuesta.datos ?? []);
    } catch (error) {
      setMensajeError(error.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarCitas();
  }, []);

  async function manejarCancelar(cita) {
    const confirmado = window.confirm(
      `¿Cancelar la cita de "${cita.servicio?.nombre ?? 'este servicio'}"?`,
    );
    if (!confirmado) return;

    setMensajeError(null);
    setMensajeExito(null);
    setCancelandoId(cita.id);
    try {
      await actualizarParcial(`/citas/${cita.id}/cancelar`, {});
      setMensajeExito('Cita cancelada correctamente.');
      await cargarCitas();
    } catch (error) {
      setMensajeError(error.message);
    } finally {
      setCancelandoId(null);
    }
  }

  return (
    <div className="max-w-3xl px-4 py-8 mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Mis citas</h1>

      {mensajeExito && (
        <p className="p-3 mt-4 text-sm text-green-800 bg-green-100 rounded dark:bg-green-900 dark:text-green-200">{mensajeExito}</p>
      )}
      {mensajeError && <p className="p-3 mt-4 text-sm text-red-800 bg-red-100 rounded dark:bg-red-900 dark:text-red-200">{mensajeError}</p>}

      {cargando && <p className="mt-6 text-gray-500 dark:text-gray-400">Cargando tus citas...</p>}

      {!cargando && citas.length === 0 && (
        <p className="mt-6 text-gray-500 dark:text-gray-400">Todavía no tienes citas reservadas.</p>
      )}

      <ul className="mt-6 space-y-3">
        {citas.map((cita) => (
          <li key={cita.id} className="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{cita.servicio?.nombre ?? 'Servicio'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{formatearFechaHora(cita.inicia_en)}</p>
              </div>
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${ESTILOS_ESTADO[cita.estado] ?? ''}`}
              >
                {ETIQUETAS_ESTADO[cita.estado] ?? cita.estado}
              </span>
            </div>

            {esCancelable(cita) && (
              <button
                type="button"
                onClick={() => manejarCancelar(cita)}
                disabled={cancelandoId === cita.id}
                className="px-3 py-1 mt-3 text-sm text-red-700 border border-red-300 rounded hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                {cancelandoId === cita.id ? 'Cancelando...' : 'Cancelar'}
              </button>
            )}

            {!esCancelable(cita) && cita.estado !== 'cancelada' && cita.estado !== 'completada' && (
              <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                Ya no se puede cancelar: faltan menos de 2 horas para la cita.
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PaginaMisCitas;
