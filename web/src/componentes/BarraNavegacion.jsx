/**
 * Módulo: Barra de navegación principal
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 18/09/2026
 * Modificado por: Luis — 07/10/2026 (Incremento 7A: enlace "Horario" de la administradora)
 */

import { Link } from 'react-router-dom';
import { useAutenticacion } from '../contexto/ContextoAutenticacion.jsx';
import { useTema } from '../contexto/ContextoTema.jsx';
import MenuUsuario from './MenuUsuario.jsx';

function BotonTema() {
  const { tema, alternarTema } = useTema();

  return (
    <button
      type="button"
      onClick={alternarTema}
      aria-label={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      className="p-2 text-lg leading-none text-gray-600 rounded hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
    >
      <span aria-hidden="true">{tema === 'oscuro' ? '☀️' : '🌙'}</span>
    </button>
  );
}

function BarraNavegacion() {
  const { usuario } = useAutenticacion() ?? {};

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white shadow dark:bg-gray-900 dark:shadow-gray-800">
      <Link 
      to={ usuario?.rol === 'administradora'
      ? '/admin'
      : usuario?.rol === 'clienta'
      ? '/'
      : '/'
  } 
      className="text-2xl font-semibold tracking-wide text-pink-700 font-logo dark:text-pink-400">
        Turnia
      </Link>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {usuario?.rol === 'clienta' && (
          <>
            <Link to="/servicios" className="text-gray-600 hover:text-pink-600 dark:text-gray-300 dark:hover:text-pink-400">
              Servicios
            </Link>
            <Link to="/mis-citas" className="text-gray-600 hover:text-pink-600 dark:text-gray-300 dark:hover:text-pink-400">
              Mis citas
            </Link>
          </>
        )}

        {usuario?.rol === 'administradora' && (
          <>
            <Link to="/admin/agenda" className="text-gray-600 hover:text-pink-600 dark:text-gray-300 dark:hover:text-pink-400">
              Agenda
            </Link>
            <Link to="/admin/servicios" className="text-gray-600 hover:text-pink-600 dark:text-gray-300 dark:hover:text-pink-400">
              Servicios
            </Link>
            <Link to="/admin/horario" className="text-gray-600 hover:text-pink-600 dark:text-gray-300 dark:hover:text-pink-400">
              Horario
            </Link>
            <Link to="/admin/contenido" className="text-gray-600 hover:text-pink-600 dark:text-gray-300 dark:hover:text-pink-400">
              Contenido
            </Link>
          </>
        )}

        {!usuario && (
          <Link to="/servicios" className="text-gray-600 hover:text-pink-600 dark:text-gray-300 dark:hover:text-pink-400">
            Servicios
          </Link>
        )}

        <BotonTema />

        {usuario ? (
          <MenuUsuario />
        ) : (
          <>
            <Link to="/inicio-sesion" className="text-gray-600 hover:text-pink-600 dark:text-gray-300 dark:hover:text-pink-400">
              Iniciar sesión
            </Link>
            <Link
              to="/registro"
              className="px-3 py-1 text-white bg-pink-600 rounded hover:bg-pink-700 dark:bg-pink-600 dark:hover:bg-pink-500"
            >
              Registrarse
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default BarraNavegacion;
