/**
 * Módulo: Página de galería de trabajos
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 18/09/2026
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { obtener, urlArchivo } from '../api/clienteApi.js';

function PaginaTrabajos() {
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensajeError, setMensajeError] = useState(null);

  useEffect(() => {
    async function cargarGaleria() {
      try {
        const respuesta = await obtener('/trabajos');
        setCategorias(respuesta.datos ?? []);
      } catch (error) {
        setMensajeError(error.message);
      } finally {
        setCargando(false);
      }
    }

    cargarGaleria();
  }, []);

  return (
    <div className="px-4 py-10 mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Mis trabajos</h1>
      <p className="mt-1 text-gray-500 dark:text-gray-400">
        Algunos de los diseños y trabajos que hemos hecho para nuestras clientas.
      </p>

      {cargando && <p className="mt-8 text-gray-500 dark:text-gray-400">Cargando galería...</p>}
      {mensajeError && (
        <p className="p-3 mt-8 text-red-800 bg-red-100 rounded dark:bg-red-900 dark:text-red-200">
          {mensajeError}
        </p>
      )}

      {!cargando && !mensajeError && categorias.length === 0 && (
        <p className="mt-8 text-gray-500 dark:text-gray-400">Todavía no hay categorías de trabajos.</p>
      )}

      {!cargando &&
        !mensajeError &&
        categorias.map((categoria) => (
          <section key={categoria.id} className="mt-10 first:mt-8">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{categoria.nombre}</h2>

            {categoria.fotos.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                Aún no hay fotos en esta categoría. ¡Vuelve pronto!
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 mt-4 sm:grid-cols-3 md:grid-cols-4">
                {categoria.fotos.map((foto) => (
                  <figure
                    key={foto.id}
                    className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700"
                  >
                    <img
                      src={urlArchivo(`trabajos/${foto.archivo}`)}
                      alt={foto.titulo ?? categoria.nombre}
                      className="object-cover w-full aspect-square"
                      loading="lazy"
                    />
                    {(foto.titulo || foto.descripcion) && (
                      <figcaption className="p-2 text-xs text-gray-600 dark:text-gray-300">
                        {foto.titulo && <p className="font-medium">{foto.titulo}</p>}
                        {foto.descripcion && <p className="mt-0.5">{foto.descripcion}</p>}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            )}
          </section>
        ))}

      <Link to="/" className="inline-block mt-10 text-pink-600 hover:underline dark:text-pink-400">
        Volver al inicio
      </Link>
    </div>
  );
}

export default PaginaTrabajos;
