/**
 * Módulo: Contexto de tema claro/oscuro (disponible con o sin sesión iniciada)
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 18/09/2026
 * Modificado por: Luis — 07/10/2026 (Incremento 7B: declaración de propTypes para ESLint)
 */

import PropTypes from 'prop-types';
import { createContext, useContext, useEffect, useState } from 'react';

const ContextoTema = createContext(null);
const CLAVE_TEMA = 'turnia_tema';

function obtenerTemaInicial() {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA);
    if (guardado === 'claro' || guardado === 'oscuro') return guardado;
  } catch {
    // localStorage puede no estar disponible (modo privado, etc.); se sigue con la del sistema.
  }

  const prefiereOscuro = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefiereOscuro ? 'oscuro' : 'claro';
}

export function ProveedorTema({ children }) {
  const [tema, setTema] = useState(obtenerTemaInicial);

  useEffect(() => {
    const raiz = document.documentElement;
    if (tema === 'oscuro') {
      raiz.classList.add('dark');
    } else {
      raiz.classList.remove('dark');
    }
    try {
      localStorage.setItem(CLAVE_TEMA, tema);
    } catch {
      // Ignorar si localStorage no está disponible.
    }
  }, [tema]);

  function alternarTema() {
    setTema((anterior) => (anterior === 'oscuro' ? 'claro' : 'oscuro'));
  }

  const valor = { tema, alternarTema };

  return <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>;
}

ProveedorTema.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useTema() {
  return useContext(ContextoTema);
}

export default ContextoTema;
