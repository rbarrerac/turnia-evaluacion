/**
 * Módulo: Página de registro de clientas
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 18/09/2026
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAutenticacion } from '../contexto/ContextoAutenticacion.jsx';

const FORMULARIO_VACIO = { nombre: '', correo: '', telefono: '', contrasena: '' };
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarFormulario(formulario) {
  if (formulario.nombre.trim().length === 0) return 'El nombre es obligatorio.';
  if (!PATRON_CORREO.test(formulario.correo.trim())) {
    return 'Ingresa un correo electrónico válido.';
  }
  if (formulario.contrasena.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  return null;
}

function PaginaRegistro() {
  const { registrar } = useAutenticacion();
  const navegar = useNavigate();
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [mensajeError, setMensajeError] = useState(null);

  function manejarCambio(evento) {
    const { name, value } = evento.target;
    setFormulario((anterior) => ({ ...anterior, [name]: value }));
  }

  async function manejarEnviar(evento) {
    evento.preventDefault();
    setMensajeError(null);

    const errorLocal = validarFormulario(formulario);
    if (errorLocal) {
      setMensajeError(errorLocal);
      return;
    }

    setEnviando(true);
    try {
      await registrar({
        nombre: formulario.nombre.trim(),
        correo: formulario.correo.trim(),
        telefono: formulario.telefono.trim() || null,
        contrasena: formulario.contrasena,
      });
      navegar('/inicio-sesion', { state: { registroExitoso: true }, replace: true });
    } catch (error) {
      setMensajeError(error.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Crear cuenta</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Regístrate para reservar tus citas en Turnia.
        </p>

        {mensajeError && (
          <p className="p-3 mt-4 text-sm text-red-800 bg-red-100 rounded dark:bg-red-900 dark:text-red-200">
            {mensajeError}
          </p>
        )}

        <form onSubmit={manejarEnviar} className="mt-6 space-y-4">
          <label className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
            Nombre completo
            <input
              name="nombre"
              value={formulario.nombre}
              onChange={manejarCambio}
              required
              className="px-3 py-2 mt-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>

          <label className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
            Correo electrónico
            <input
              type="email"
              name="correo"
              value={formulario.correo}
              onChange={manejarCambio}
              required
              className="px-3 py-2 mt-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>

          <label className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
            Teléfono (opcional)
            <input
              name="telefono"
              value={formulario.telefono}
              onChange={manejarCambio}
              className="px-3 py-2 mt-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>

          <label className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
            Contraseña
            <input
              type="password"
              name="contrasena"
              value={formulario.contrasena}
              onChange={manejarCambio}
              minLength={8}
              required
              className="px-3 py-2 mt-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
            <span className="mt-1 text-xs text-gray-400 dark:text-gray-500">Mínimo 8 caracteres.</span>
          </label>

          <button
            type="submit"
            disabled={enviando}
            className="w-full px-4 py-2 font-medium text-white bg-pink-600 rounded hover:bg-pink-700 disabled:opacity-50"
          >
            {enviando ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          ¿Ya tienes cuenta?{' '}
          <Link to="/inicio-sesion" className="text-pink-600 hover:underline dark:text-pink-400">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

export default PaginaRegistro;
