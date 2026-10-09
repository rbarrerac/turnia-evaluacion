/**
 * Módulo: Página de reserva de cita (selector de fecha/hora y confirmación)
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 18/09/2026
 * Modificado por: Luis — 07/10/2026 (Incremento 7B: motivo de la excepción de exhaustive-deps)
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { obtener, enviar } from '../api/clienteApi.js';
import SelectorDeHorario from '../componentes/SelectorDeHorario.jsx';

function formatearDuracion(minutos) {
  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;
  if (horas === 0) return `${minutosRestantes} min`;
  if (minutosRestantes === 0) return `${horas} h`;
  return `${horas} h ${minutosRestantes} min`;
}

function obtenerFechaMinima() {
  const hoy = new Date();
  return new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

function PaginaReservar() {
  const { servicioId } = useParams();

  const [servicio, setServicio] = useState(null);
  const [cargandoServicio, setCargandoServicio] = useState(true);
  const [errorServicio, setErrorServicio] = useState(null);

  const [fecha, setFecha] = useState('');
  const [horarios, setHorarios] = useState([]);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);
  const [errorHorarios, setErrorHorarios] = useState(null);

  const [horaSeleccionada, setHoraSeleccionada] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [mensajeError, setMensajeError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  useEffect(() => {
    let sigueMontado = true;
    obtener(`/servicios/${servicioId}`)
      .then((respuesta) => {
        if (sigueMontado) setServicio(respuesta.datos);
      })
      .catch((error) => {
        if (sigueMontado) setErrorServicio(error.message);
      })
      .finally(() => {
        if (sigueMontado) setCargandoServicio(false);
      });
    return () => {
      sigueMontado = false;
    };
  }, [servicioId]);

  async function cargarHorarios(fechaConsulta) {
    setCargandoHorarios(true);
    setErrorHorarios(null);
    try {
      const query = new URLSearchParams({ servicioId, fecha: fechaConsulta }).toString();
      const respuesta = await obtener(`/citas/disponibilidad?${query}`);
      setHorarios(respuesta.datos ?? []);
    } catch (error) {
      setErrorHorarios(error.message);
    } finally {
      setCargandoHorarios(false);
    }
  }

  useEffect(() => {
    setHoraSeleccionada(null);
    if (!fecha) {
      setHorarios([]);
      return;
    }
    cargarHorarios(fecha);
    // Solo debe recargar al cambiar la fecha o el servicio: cargarHorarios se vuelve a
    // crear en cada render y como dependencia repetiría la petición en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, servicioId]);

  async function manejarConfirmar() {
    if (!horaSeleccionada) return;

    setConfirmando(true);
    setMensajeError(null);
    try {
      await enviar('/citas', { servicioId, iniciaEn: horaSeleccionada });
      setMensajeExito('¡Cita reservada con éxito! Puedes verla en "Mis citas".');
      setHoraSeleccionada(null);
    } catch (error) {
      setMensajeError(error.message);
      setHoraSeleccionada(null);
      // El horario pudo ocuparse justo antes de confirmar: se refresca la lista.
      await cargarHorarios(fecha);
    } finally {
      setConfirmando(false);
    }
  }

  if (cargandoServicio) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Cargando servicio...</div>;
  }

  if (errorServicio || !servicio) {
    return (
      <div className="max-w-2xl px-4 py-8 mx-auto">
        <p className="text-red-600 dark:text-red-400">No se pudo cargar el servicio: {errorServicio}</p>
        <Link to="/servicios" className="text-pink-600 hover:underline">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl px-4 py-8 mx-auto">
      <Link to="/servicios" className="text-sm text-pink-600 hover:underline dark:text-pink-400">
        &larr; Volver al catálogo
      </Link>

      <div className="p-4 mt-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{servicio.nombre}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {formatearDuracion(servicio.duracion_minutos)} · Q{Number(servicio.precio).toFixed(2)}
        </p>
      </div>

      {mensajeExito ? (
        <div className="p-4 mt-6 text-green-800 bg-green-100 rounded dark:bg-green-900 dark:text-green-200">
          <p>{mensajeExito}</p>
          <Link to="/mis-citas" className="inline-block mt-2 underline text-green-900 dark:text-green-200">
            Ver mis citas
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <h2 className="mb-2 font-semibold text-gray-700 dark:text-gray-200">1. Elige una fecha</h2>
            <input
              type="date"
              min={obtenerFechaMinima()}
              value={fecha}
              onChange={(evento) => setFecha(evento.target.value)}
              className="px-3 py-2 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          {fecha && (
            <div className="mt-6">
              <h2 className="mb-2 font-semibold text-gray-700 dark:text-gray-200">2. Elige un horario</h2>
              {cargandoHorarios && <p className="text-sm text-gray-500 dark:text-gray-400">Buscando horarios...</p>}
              {errorHorarios && <p className="text-sm text-red-600 dark:text-red-400">{errorHorarios}</p>}
              {!cargandoHorarios && !errorHorarios && horarios.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No hay horarios disponibles ese día. Prueba con otra fecha.
                </p>
              )}
              {horarios.length > 0 && (
                <SelectorDeHorario
                  horariosDisponibles={horarios}
                  horaSeleccionada={horaSeleccionada}
                  onSeleccionar={setHoraSeleccionada}
                />
              )}
            </div>
          )}

          {horaSeleccionada && (
            <div className="mt-6">
              <h2 className="mb-2 font-semibold text-gray-700 dark:text-gray-200">3. Confirma tu cita</h2>
              {mensajeError && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{mensajeError}</p>}
              <button
                type="button"
                onClick={manejarConfirmar}
                disabled={confirmando}
                className="w-full px-4 py-2 font-medium text-white bg-pink-600 rounded hover:bg-pink-700 disabled:opacity-50 sm:w-auto"
              >
                {confirmando ? 'Reservando...' : 'Confirmar reserva'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PaginaReservar;
