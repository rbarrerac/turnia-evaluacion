/**
 * Módulo: Página de seguridad — cambio de correo y de contraseña
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 18/09/2026
 */

import { useState } from 'react';
import { actualizarParcial } from '../api/clienteApi.js';
import { useAutenticacion } from '../contexto/ContextoAutenticacion.jsx';

function PaginaSeguridad() {
  const { usuario, actualizarUsuario } = useAutenticacion();

  const [correoNuevo, setCorreoNuevo] = useState('');
  const [contrasenaActualCorreo, setContrasenaActualCorreo] = useState('');
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  const [mensajeCorreo, setMensajeCorreo] = useState(null);
  const [errorCorreo, setErrorCorreo] = useState(null);

  const [contrasenaActual, setContrasenaActual] = useState('');
  const [contrasenaNueva, setContrasenaNueva] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [enviandoContrasena, setEnviandoContrasena] = useState(false);
  const [mensajeContrasena, setMensajeContrasena] = useState(null);
  const [errorContrasena, setErrorContrasena] = useState(null);

  async function manejarCambiarCorreo(evento) {
    evento.preventDefault();
    setErrorCorreo(null);
    setMensajeCorreo(null);
    setEnviandoCorreo(true);
    try {
      const respuesta = await actualizarParcial('/autenticacion/correo', {
        correoNuevo: correoNuevo.trim(),
        contrasenaActual: contrasenaActualCorreo,
      });
      actualizarUsuario(respuesta.datos);
      setMensajeCorreo('Correo actualizado correctamente.');
      setCorreoNuevo('');
      setContrasenaActualCorreo('');
    } catch (error) {
      setErrorCorreo(error.message);
    } finally {
      setEnviandoCorreo(false);
    }
  }

  async function manejarCambiarContrasena(evento) {
    evento.preventDefault();
    setErrorContrasena(null);
    setMensajeContrasena(null);

    if (contrasenaNueva.length < 8) {
      setErrorContrasena('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (contrasenaNueva !== confirmarContrasena) {
      setErrorContrasena('Las contraseñas nuevas no coinciden.');
      return;
    }

    setEnviandoContrasena(true);
    try {
      await actualizarParcial('/autenticacion/contrasena', { contrasenaActual, contrasenaNueva });
      setMensajeContrasena('Contraseña actualizada correctamente.');
      setContrasenaActual('');
      setContrasenaNueva('');
      setConfirmarContrasena('');
    } catch (error) {
      setErrorContrasena(error.message);
    } finally {
      setEnviandoContrasena(false);
    }
  }

  return (
    <div className="flex justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Seguridad</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Correo actual: <span className="font-medium">{usuario?.correo}</span>
          </p>
        </div>

        <form onSubmit={manejarCambiarCorreo} className="space-y-4">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200">Cambiar correo</h2>
          {mensajeCorreo && (
            <p className="p-3 text-sm text-green-800 bg-green-100 rounded dark:bg-green-900 dark:text-green-200">
              {mensajeCorreo}
            </p>
          )}
          {errorCorreo && (
            <p className="p-3 text-sm text-red-800 bg-red-100 rounded dark:bg-red-900 dark:text-red-200">
              {errorCorreo}
            </p>
          )}

          <label className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
            Nuevo correo electrónico
            <input
              type="email"
              value={correoNuevo}
              onChange={(evento) => setCorreoNuevo(evento.target.value)}
              required
              className="px-3 py-2 mt-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
            Contraseña actual
            <input
              type="password"
              value={contrasenaActualCorreo}
              onChange={(evento) => setContrasenaActualCorreo(evento.target.value)}
              required
              className="px-3 py-2 mt-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
          <button
            type="submit"
            disabled={enviandoCorreo}
            className="w-full px-4 py-2 font-medium text-white bg-pink-600 rounded hover:bg-pink-700 disabled:opacity-50"
          >
            {enviandoCorreo ? 'Guardando...' : 'Cambiar correo'}
          </button>
        </form>

        <form onSubmit={manejarCambiarContrasena} className="space-y-4">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200">Cambiar contraseña</h2>
          {mensajeContrasena && (
            <p className="p-3 text-sm text-green-800 bg-green-100 rounded dark:bg-green-900 dark:text-green-200">
              {mensajeContrasena}
            </p>
          )}
          {errorContrasena && (
            <p className="p-3 text-sm text-red-800 bg-red-100 rounded dark:bg-red-900 dark:text-red-200">
              {errorContrasena}
            </p>
          )}

          <label className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
            Contraseña actual
            <input
              type="password"
              value={contrasenaActual}
              onChange={(evento) => setContrasenaActual(evento.target.value)}
              required
              className="px-3 py-2 mt-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
            Nueva contraseña
            <input
              type="password"
              value={contrasenaNueva}
              onChange={(evento) => setContrasenaNueva(evento.target.value)}
              minLength={8}
              required
              className="px-3 py-2 mt-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
            Confirmar nueva contraseña
            <input
              type="password"
              value={confirmarContrasena}
              onChange={(evento) => setConfirmarContrasena(evento.target.value)}
              minLength={8}
              required
              className="px-3 py-2 mt-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
          <button
            type="submit"
            disabled={enviandoContrasena}
            className="w-full px-4 py-2 font-medium text-white bg-pink-600 rounded hover:bg-pink-700 disabled:opacity-50"
          >
            {enviandoContrasena ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default PaginaSeguridad;
