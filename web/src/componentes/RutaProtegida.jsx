/**
 * Módulo: Envoltorio de ruta que exige sesión iniciada (y opcionalmente un rol)
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 18/09/2026
 * Modificado por: Luis — 07/10/2026 (Incremento 7B: declaración de propTypes para ESLint)
 */

import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import { useAutenticacion } from '../contexto/ContextoAutenticacion.jsx';

function RutaProtegida({ children, rolRequerido }) {
  const { usuario, cargando } = useAutenticacion();

  if (cargando) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Cargando...</div>;
  }

  if (!usuario) {
    return <Navigate to="/inicio-sesion" replace />;
  }

  if (rolRequerido && usuario.rol !== rolRequerido) {
    return <Navigate to="/" replace />;
  }

  return children;
}

RutaProtegida.propTypes = {
  children: PropTypes.node.isRequired,
  rolRequerido: PropTypes.oneOf(['clienta', 'administradora']),
};

export default RutaProtegida;
