/**
 * Módulo: Página de edición del perfil de la usuaria
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 18/09/2026
 */

import { useState } from 'react';
import { actualizarParcial } from '../api/clienteApi.js';
import { useAutenticacion } from '../contexto/ContextoAutenticacion.jsx';

function PaginaPerfil() {
  const { usuario, actualizarUsuario } = useAutenticacion();
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [telefono, setTelefono] = useState(usuario?.telefono ?? '');
  const [enviando, setEnviando] = useState(false);
  const [mensajeError, setMensajeError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  async function manejarEnviar(evento) {
    evento.preventDefault();
    setMensajeError(null);
    setMensajeExito(null);

    if (nombre.trim().length === 0) {
      setMensajeError('El nombre es obligatorio.');
      return;
    }

    setEnviando(true);
    try {
      const respuesta = await actualizarParcial('/autenticacion/perfil', {
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
      });
      actualizarUsuario(respuesta.datos);
      setMensajeExito('Perfil actualizado correctamente.');
    } catch (error) {
      setMensajeError(error.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Mi perfil</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Actualiza tu nombre y teléfono de contacto.
        </p>

        {mensajeExito && (
          <p className="p-3 mt-4 text-sm text-green-800 bg-green-100 rounded dark:bg-green-900 dark:text-green-200">
            {mensajeExito}
          </p>
        )}
        {mensajeError && (
          <p className="p-3 mt-4 text-sm text-red-800 bg-red-100 rounded dark:bg-red-900 dark:text-red-200">
            {mensajeError}
          </p>
        )}

        <form onSubmit={manejarEnviar} className="mt-6 space-y-4">
          <label className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
            Correo electrónico
            <input
              value={usuario?.correo ?? ''}
              disabled
              className="px-3 py-2 mt-1 text-gray-400 border border-gray-300 rounded bg-gray-50 dark:border-gray-600 dark:bg-gray-800"
            />
            <span className="mt-1 text-xs text-gray-400">
              Para cambiar el correo, ve a la página de Seguridad.
            </span>
          </label>

          <label className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
            Nombre completo
            <input
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              required
              className="px-3 py-2 mt-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>

          <label className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
            Teléfono
            <input
              value={telefono}
              onChange={(evento) => setTelefono(evento.target.value)}
              className="px-3 py-2 mt-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>

          <button
            type="submit"
            disabled={enviando}
            className="w-full px-4 py-2 font-medium text-white bg-pink-600 rounded hover:bg-pink-700 disabled:opacity-50"
          >
            {enviando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default PaginaPerfil;
