/**
 * Módulo: Página de inicio — bienvenida pública del salón
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 18/09/2026
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAutenticacion } from '../contexto/ContextoAutenticacion.jsx';
import { obtener } from '../api/clienteApi.js';

// Valores de respaldo mientras se carga (o si falta alguna clave en) el contenido
// editable desde el mini-CMS (GET /api/contenido).
const CONTENIDO_POR_DEFECTO = {
  inicio_titulo: 'Bella Aurora — Estudio de Belleza',
  inicio_subtitulo: 'Haz tu cita aquí:',
  atiende_nombre: 'Aurora Marroquín',
  atiende_bio:
    '34 años, técnica en uñas con 10 años de experiencia. Especialista en nail art y uñas acrílicas.',
  trabajos_intro: 'Conoce algunos de los diseños y trabajos que hemos hecho para nuestras clientas.',
};

function PaginaInicio() {
  const { usuario } = useAutenticacion() ?? {};
  const destinoReservar = usuario ? '/servicios' : '/inicio-sesion';
  const [contenido, setContenido] = useState(CONTENIDO_POR_DEFECTO);

  useEffect(() => {
    async function cargarContenido() {
      try {
        const respuesta = await obtener('/contenido');
        setContenido((anterior) => ({ ...anterior, ...respuesta.datos }));
      } catch {
        // Si falla la carga, se conservan los valores por defecto: la página sigue siendo utilizable.
      }
    }

    cargarContenido();
  }, []);

  return (
    <div className="px-4 py-10 mx-auto max-w-4xl">
      <section className="text-center">
        <p className="text-sm font-medium tracking-widest text-pink-600 uppercase dark:text-pink-400">
          Bienvenida a
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-800 sm:text-4xl dark:text-gray-100">
          {contenido.inicio_titulo}
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">{contenido.inicio_subtitulo}</p>
        <Link
          to={destinoReservar}
          className="inline-block px-6 py-3 mt-4 font-medium text-white bg-pink-600 rounded-lg shadow hover:bg-pink-700"
        >
          Reservar cita
        </Link>

        {!usuario && (
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            ¿Ya tienes cuenta?{' '}
            <Link to="/inicio-sesion" className="text-pink-600 hover:underline dark:text-pink-400">
              Inicia sesión
            </Link>{' '}
            o{' '}
            <Link to="/registro" className="text-pink-600 hover:underline dark:text-pink-400">
              regístrate
            </Link>
            .
          </p>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 mt-12 sm:grid-cols-2">
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Quién te atiende</h2>
          <p className="mt-3 text-gray-600 dark:text-gray-300">
            <span className="font-medium">{contenido.atiende_nombre}</span>, {contenido.atiende_bio}
          </p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Mis trabajos</h2>
          <p className="mt-3 text-gray-600 dark:text-gray-300">{contenido.trabajos_intro}</p>
          <Link
            to="/trabajos"
            className="inline-block px-4 py-2 mt-4 text-sm font-medium text-pink-700 border border-pink-300 rounded hover:bg-pink-50 dark:text-pink-300 dark:border-pink-700 dark:hover:bg-gray-700"
          >
            Ver galería
          </Link>
        </div>
      </section>
    </div>
  );
}

export default PaginaInicio;
