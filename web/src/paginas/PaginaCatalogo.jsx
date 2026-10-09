/**
 * Módulo: Página de catálogo de servicios
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 17/09/2026
 */

import { useEffect, useState } from 'react';
import { obtener } from '../api/clienteApi.js';
import TarjetaServicio from '../componentes/TarjetaServicio.jsx';

function PaginaCatalogo() {
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensajeError, setMensajeError] = useState(null);

  useEffect(() => {
    let sigueMontado = true;

    obtener('/servicios')
      .then((respuesta) => {
        if (sigueMontado) setServicios(respuesta.datos ?? []);
      })
      .catch((error) => {
        if (sigueMontado) setMensajeError(error.message);
      })
      .finally(() => {
        if (sigueMontado) setCargando(false);
      });

    return () => {
      sigueMontado = false;
    };
  }, []);

  return (
    <div className="max-w-5xl px-4 py-8 mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Catálogo de servicios</h1>
      <p className="mt-1 text-gray-500 dark:text-gray-400">Elige el servicio que deseas reservar.</p>

      {cargando && <p className="mt-6 text-gray-500 dark:text-gray-400">Cargando servicios...</p>}

      {mensajeError && (
        <p className="p-3 mt-6 text-red-800 bg-red-100 rounded dark:bg-red-900 dark:text-red-200">
          No se pudo cargar el catálogo: {mensajeError}
        </p>
      )}

      {!cargando && !mensajeError && servicios.length === 0 && (
        <p className="mt-6 text-gray-500 dark:text-gray-400">Aún no hay servicios disponibles.</p>
      )}

      <div className="grid grid-cols-1 gap-4 mt-6 sm:grid-cols-2 lg:grid-cols-3">
        {servicios.map((servicio) => (
          <TarjetaServicio key={servicio.id} servicio={servicio} />
        ))}
      </div>
    </div>
  );
}

export default PaginaCatalogo;
