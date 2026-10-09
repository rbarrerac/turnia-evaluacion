/**
 * Módulo: Menú desplegable de la usuaria (perfil, seguridad, tema, cerrar sesión)
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 18/09/2026
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAutenticacion } from '../contexto/ContextoAutenticacion.jsx';
import { useTema } from '../contexto/ContextoTema.jsx';

function MenuUsuario() {
  const { usuario, cerrarSesion } = useAutenticacion();
  const { tema, alternarTema } = useTema();
  const navegar = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const referenciaMenu = useRef(null);

  useEffect(() => {
    function manejarClicFuera(evento) {
      if (referenciaMenu.current && !referenciaMenu.current.contains(evento.target)) {
        setAbierto(false);
      }
    }
    document.addEventListener('mousedown', manejarClicFuera);
    return () => document.removeEventListener('mousedown', manejarClicFuera);
  }, []);

  function manejarCerrarSesion() {
    setAbierto(false);
    cerrarSesion();
    navegar('/');
  }

  const inicial = usuario.nombre?.trim()?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <div className="relative" ref={referenciaMenu}>
      <button
        type="button"
        onClick={() => setAbierto((anterior) => !anterior)}
        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <span className="flex items-center justify-center w-7 h-7 text-sm font-semibold text-white rounded-full bg-pink-600">
          {inicial}
        </span>
        <span className="text-gray-700 dark:text-gray-200">{usuario.nombre}</span>
        <span className="text-xs text-gray-400" aria-hidden="true">
          ▾
        </span>
      </button>

      {abierto && (
        <div className="absolute right-0 z-10 w-52 mt-2 overflow-hidden bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-700">
          <Link
            to="/perfil"
            onClick={() => setAbierto(false)}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Mi perfil
          </Link>
          <Link
            to="/seguridad"
            onClick={() => setAbierto(false)}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Seguridad
          </Link>
          <button
            type="button"
            onClick={alternarTema}
            className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <span>Tema {tema === 'oscuro' ? 'oscuro' : 'claro'}</span>
            <span aria-hidden="true">{tema === 'oscuro' ? '🌙' : '☀️'}</span>
          </button>
          <button
            type="button"
            onClick={manejarCerrarSesion}
            className="block w-full px-4 py-2 text-sm text-left text-red-600 border-t border-gray-100 hover:bg-red-50 dark:border-gray-700 dark:text-red-400 dark:hover:bg-gray-700"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

export default MenuUsuario;
