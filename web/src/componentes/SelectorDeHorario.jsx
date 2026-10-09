/**
 * Módulo: Selector de horario disponible para reservar una cita
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 18/09/2026
 * Modificado por: Luis — 07/10/2026 (Incremento 7B: declaración de propTypes para ESLint)
 */

import PropTypes from 'prop-types';

function formatearHora(horarioIso) {
  const fecha = new Date(horarioIso);
  const horas = String(fecha.getUTCHours()).padStart(2, '0');
  const minutos = String(fecha.getUTCMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

function SelectorDeHorario({ horariosDisponibles, horaSeleccionada, onSeleccionar }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {horariosDisponibles.map((horario) => {
        const seleccionado = horario === horaSeleccionada;
        return (
          <button
            key={horario}
            type="button"
            onClick={() => onSeleccionar(horario)}
            className={`px-3 py-2 text-sm rounded border transition-colors ${
              seleccionado
                ? 'bg-pink-600 text-white border-pink-600'
                : 'border-gray-300 text-gray-700 hover:border-pink-400 dark:border-gray-600 dark:text-gray-200 dark:hover:border-pink-500'
            }`}
          >
            {formatearHora(horario)}
          </button>
        );
      })}
    </div>
  );
}

SelectorDeHorario.propTypes = {
  horariosDisponibles: PropTypes.arrayOf(PropTypes.string).isRequired,
  horaSeleccionada: PropTypes.string,
  onSeleccionar: PropTypes.func.isRequired,
};

export default SelectorDeHorario;
