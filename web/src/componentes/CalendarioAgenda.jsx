/**
 * Módulo: Lista de citas de la agenda de la administradora
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 18/09/2026
 * Modificado por: Luis — 07/10/2026 (Incremento 7B: declaración de propTypes para ESLint)
 *
 * Decisión de diseño (Incremento 4, CU-08): se usa una vista de LISTA, no una
 * cuadrícula de calendario, por legibilidad con el volumen esperado de citas
 * (10–15 por día). El nombre del archivo se conserva porque así está declarado
 * en la sección 3 de ARQUITECTURA.md.
 */

import PropTypes from 'prop-types';

const ETIQUETAS_ESTADO = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

const ESTILOS_ESTADO = {
  pendiente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  confirmada: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completada: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelada: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

// RN-08: no se puede completar una cita hasta que pasen 10 minutos desde su inicio.
const DIEZ_MINUTOS_EN_MS = 10 * 60 * 1000;

// RN-04 — acciones que la administradora puede tomar desde cada estado.
const ACCIONES_POR_ESTADO = {
  pendiente: [
    {
      estado: 'confirmada',
      etiqueta: 'Confirmar',
      estilo: 'text-blue-700 border-blue-300 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-gray-700',
    },
    {
      estado: 'cancelada',
      etiqueta: 'Cancelar',
      estilo: 'text-red-700 border-red-300 hover:bg-red-50 dark:text-red-300 dark:border-red-700 dark:hover:bg-gray-700',
    },
  ],
  confirmada: [
    {
      estado: 'completada',
      etiqueta: 'Completar',
      estilo: 'text-green-700 border-green-300 hover:bg-green-50 dark:text-green-300 dark:border-green-700 dark:hover:bg-gray-700',
    },
    {
      estado: 'cancelada',
      etiqueta: 'Cancelar',
      estilo: 'text-red-700 border-red-300 hover:bg-red-50 dark:text-red-300 dark:border-red-700 dark:hover:bg-gray-700',
    },
  ],
  completada: [],
  cancelada: [],
};

function formatearHora(iso) {
  const fecha = new Date(iso);
  const horas = String(fecha.getUTCHours()).padStart(2, '0');
  const minutos = String(fecha.getUTCMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

function CalendarioAgenda({ citas, onCambiarEstado, actualizandoId }) {
  if (citas.length === 0) {
    return <p className="py-3 text-sm text-gray-500 dark:text-gray-400">No hay citas en este rango.</p>;
  }

  return (
    <ul className="space-y-2">
      {citas.map((cita) => {
        const acciones = ACCIONES_POR_ESTADO[cita.estado] ?? [];
        const msTranscurridos = Date.now() - new Date(cita.inicia_en).getTime();

        return (
          <li
            key={cita.id}
            className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                {formatearHora(cita.inicia_en)}–{formatearHora(cita.termina_en)}
              </span>
              <span className="font-medium text-gray-800 dark:text-gray-100">
                {cita.clienta?.nombre ?? 'Clienta'}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {cita.servicio?.nombre ?? 'Servicio'}
              </span>
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${ESTILOS_ESTADO[cita.estado] ?? ''}`}
              >
                {ETIQUETAS_ESTADO[cita.estado] ?? cita.estado}
              </span>
            </div>

            {acciones.length > 0 && (
              <div className="flex gap-2">
                {acciones.map((accion) => {
                  const esCompletar = accion.estado === 'completada';
                  const bloqueadaPorTiempo = esCompletar && msTranscurridos < DIEZ_MINUTOS_EN_MS;

                  return (
                    <button
                      key={accion.estado}
                      type="button"
                      disabled={actualizandoId === cita.id || bloqueadaPorTiempo}
                      title={
                        bloqueadaPorTiempo
                          ? 'RN-08: aún no han pasado 10 minutos desde el inicio de la cita.'
                          : undefined
                      }
                      onClick={() => onCambiarEstado(cita, accion.estado)}
                      className={`px-2 py-1 text-xs border rounded disabled:opacity-50 ${accion.estilo}`}
                    >
                      {accion.etiqueta}
                    </button>
                  );
                })}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

CalendarioAgenda.propTypes = {
  citas: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      estado: PropTypes.string.isRequired,
      inicia_en: PropTypes.string.isRequired,
      termina_en: PropTypes.string.isRequired,
      clienta: PropTypes.shape({ nombre: PropTypes.string }),
      servicio: PropTypes.shape({ nombre: PropTypes.string }),
    }),
  ).isRequired,
  onCambiarEstado: PropTypes.func.isRequired,
  actualizandoId: PropTypes.string,
};

export default CalendarioAgenda;
