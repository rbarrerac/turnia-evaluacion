/**
 * Módulo: Contexto global de sesión (usuaria autenticada)
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 18/09/2026
 * Modificado por: Luis — 07/10/2026 (Incremento 7B: declaración de propTypes para ESLint)
 */

import PropTypes from 'prop-types';
import { createContext, useContext, useEffect, useState } from 'react';
import { obtener, enviar, obtenerToken, guardarToken, borrarToken } from '../api/clienteApi.js';

const ContextoAutenticacion = createContext(null);

export function ProveedorAutenticacion({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let sigueMontado = true;

    async function restaurarSesion() {
      if (!obtenerToken()) {
        setCargando(false);
        return;
      }

      try {
        const respuesta = await obtener('/autenticacion/perfil');
        if (sigueMontado) setUsuario(respuesta.datos);
      } catch {
        borrarToken();
      } finally {
        if (sigueMontado) setCargando(false);
      }
    }

    restaurarSesion();

    return () => {
      sigueMontado = false;
    };
  }, []);

  async function iniciarSesion(correo, contrasena) {
    const respuesta = await enviar('/autenticacion/inicio-sesion', { correo, contrasena });
    guardarToken(respuesta.datos.token);
    setUsuario(respuesta.datos.usuario);
    return respuesta.datos.usuario;
  }

  async function registrar(datos) {
    const respuesta = await enviar('/autenticacion/registro', datos);
    return respuesta.datos;
  }

  function cerrarSesion() {
    borrarToken();
    setUsuario(null);
  }

  function actualizarUsuario(datosParciales) {
    setUsuario((anterior) => (anterior ? { ...anterior, ...datosParciales } : anterior));
  }

  const valor = { usuario, cargando, iniciarSesion, registrar, cerrarSesion, actualizarUsuario };

  return <ContextoAutenticacion.Provider value={valor}>{children}</ContextoAutenticacion.Provider>;
}

ProveedorAutenticacion.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useAutenticacion() {
  return useContext(ContextoAutenticacion);
}

export default ContextoAutenticacion;
