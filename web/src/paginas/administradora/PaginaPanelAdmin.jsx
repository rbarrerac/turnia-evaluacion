/**
 * Módulo: Panel de inicio de la administradora
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 18/09/2026
 * Modificado por: Luis — 07/10/2026 (Incremento 7A: tarjeta "Horario", CU-10)
 */

import { Link } from 'react-router-dom';

const TARJETAS = [
  {
    titulo: 'Agenda',
    descripcion: 'Ver y gestionar las citas del día o la semana.',
    ruta: '/admin/agenda',
    icono: '📅',
  },
  {
    titulo: 'Servicios',
    descripcion: 'Administrar el catálogo de servicios.',
    ruta: '/admin/servicios',
    icono: '💅',
  },
  {
    titulo: 'Horario',
    descripcion: 'Configurar los días y horas de atención y los días no laborables.',
    ruta: '/admin/horario',
    icono: '🕒',
  },
  {
    titulo: 'Catálogo / Información',
    descripcion: 'Editar la galería de trabajos y el contenido de la página de inicio.',
    ruta: '/admin/contenido',
    icono: '🖼️',
  },
];

function PaginaPanelAdmin() {
  return (
    <div className="px-4 py-10 mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Panel de administración</h1>
      <p className="mt-1 text-gray-500 dark:text-gray-400">¿Qué deseas hacer hoy?</p>

      <div className="grid grid-cols-1 gap-4 mt-8 sm:grid-cols-2">
        {TARJETAS.map((tarjeta) => (
          <Link
            key={tarjeta.ruta}
            to={tarjeta.ruta}
            className="flex flex-col items-center p-6 text-center bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md dark:bg-gray-800 dark:border-gray-700"
          >
            <span className="text-4xl" aria-hidden="true">
              {tarjeta.icono}
            </span>
            <span className="mt-3 text-lg font-semibold text-gray-800 dark:text-gray-100">
              {tarjeta.titulo}
            </span>
            <span className="mt-1 text-sm text-gray-500 dark:text-gray-400">{tarjeta.descripcion}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default PaginaPanelAdmin;
