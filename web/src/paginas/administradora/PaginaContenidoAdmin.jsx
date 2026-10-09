/**
 * Módulo: Página de gestión de contenido — mini-CMS de la galería y la página de inicio
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 18/09/2026
 * Modificado por: Luis — 07/10/2026 (Incremento 7B: motivo de la excepción de exhaustive-deps)
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { obtener, enviar, enviarArchivo, actualizar, eliminar, urlArchivo } from '../../api/clienteApi.js';

const TIPOS_DE_IMAGEN_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

const CAMPOS_DE_CONTENIDO = [
  { clave: 'inicio_titulo', etiqueta: 'Título de inicio', tipo: 'input' },
  { clave: 'inicio_subtitulo', etiqueta: 'Subtítulo de inicio', tipo: 'input' },
  { clave: 'atiende_nombre', etiqueta: 'Nombre de quién atiende', tipo: 'input' },
  { clave: 'atiende_bio', etiqueta: 'Biografía de quién atiende', tipo: 'textarea' },
  { clave: 'trabajos_intro', etiqueta: 'Texto de la sección "Mis trabajos"', tipo: 'textarea' },
];

function SeccionGaleria() {
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nombreNuevaCategoria, setNombreNuevaCategoria] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [previsualizacion, setPrevisualizacion] = useState(null);
  const [tituloFoto, setTituloFoto] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [mensajeError, setMensajeError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);
  const referenciaInputArchivo = useRef(null);

  async function cargarCategorias() {
    setCargando(true);
    try {
      const respuesta = await obtener('/trabajos');
      const datos = respuesta.datos ?? [];
      setCategorias(datos);
      if (!categoriaSeleccionada && datos.length > 0) {
        setCategoriaSeleccionada(datos[0].id);
      }
    } catch (error) {
      setMensajeError(error.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarCategorias();
    // Carga inicial, solo al montar: cargarCategorias se vuelve a crear en cada render
    // y como dependencia repetiría la petición en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function limpiarMensajes() {
    setMensajeError(null);
    setMensajeExito(null);
  }

  async function manejarCrearCategoria(evento) {
    evento.preventDefault();
    limpiarMensajes();

    const nombre = nombreNuevaCategoria.trim();
    if (!nombre) return;

    try {
      await enviar('/trabajos/categorias', { nombre });
      setNombreNuevaCategoria('');
      setMensajeExito(`Categoría "${nombre}" creada correctamente.`);
      await cargarCategorias();
    } catch (error) {
      setMensajeError(error.message);
    }
  }

  async function manejarEliminarCategoria(categoria) {
    const confirmado = window.confirm(
      `¿Eliminar la categoría "${categoria.nombre}"? Se borrarán también todas sus fotos.`,
    );
    if (!confirmado) return;

    limpiarMensajes();
    try {
      await eliminar(`/trabajos/categorias/${categoria.id}`);
      setMensajeExito(`Categoría "${categoria.nombre}" eliminada.`);
      if (categoriaSeleccionada === categoria.id) {
        setCategoriaSeleccionada('');
      }
      await cargarCategorias();
    } catch (error) {
      setMensajeError(error.message);
    }
  }

  function manejarSeleccionDeArchivo(evento) {
    limpiarMensajes();
    const archivo = evento.target.files?.[0] ?? null;

    if (!archivo) {
      setArchivoSeleccionado(null);
      setPrevisualizacion(null);
      return;
    }

    if (!TIPOS_DE_IMAGEN_PERMITIDOS.includes(archivo.type)) {
      setMensajeError('Solo se permiten imágenes JPEG, PNG o WEBP.');
      evento.target.value = '';
      setArchivoSeleccionado(null);
      setPrevisualizacion(null);
      return;
    }

    if (archivo.size > TAMANO_MAXIMO_BYTES) {
      setMensajeError('La imagen no debe superar 5 MB.');
      evento.target.value = '';
      setArchivoSeleccionado(null);
      setPrevisualizacion(null);
      return;
    }

    setArchivoSeleccionado(archivo);
    setPrevisualizacion(URL.createObjectURL(archivo));
  }

  async function manejarSubirFoto(evento) {
    evento.preventDefault();
    limpiarMensajes();

    if (!categoriaSeleccionada) {
      setMensajeError('Seleccione una categoría antes de subir la foto.');
      return;
    }
    if (!archivoSeleccionado) {
      setMensajeError('Seleccione una imagen para subir.');
      return;
    }

    const formulario = new FormData();
    formulario.append('categoria_id', categoriaSeleccionada);
    formulario.append('archivo', archivoSeleccionado);
    if (tituloFoto.trim()) formulario.append('titulo', tituloFoto.trim());

    setSubiendo(true);
    try {
      await enviarArchivo('/trabajos', formulario);
      setMensajeExito('Foto subida correctamente.');
      setArchivoSeleccionado(null);
      setPrevisualizacion(null);
      setTituloFoto('');
      if (referenciaInputArchivo.current) referenciaInputArchivo.current.value = '';
      await cargarCategorias();
    } catch (error) {
      setMensajeError(error.message);
    } finally {
      setSubiendo(false);
    }
  }

  async function manejarEliminarFoto(foto) {
    const confirmado = window.confirm('¿Eliminar esta foto de la galería?');
    if (!confirmado) return;

    limpiarMensajes();
    try {
      await eliminar(`/trabajos/${foto.id}`);
      setMensajeExito('Foto eliminada.');
      await cargarCategorias();
    } catch (error) {
      setMensajeError(error.message);
    }
  }

  return (
    <section>
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Gestión de galería</h2>

      {mensajeExito && (
        <p className="p-3 mt-4 text-green-800 bg-green-100 rounded dark:bg-green-900 dark:text-green-200">
          {mensajeExito}
        </p>
      )}
      {mensajeError && (
        <p className="p-3 mt-4 text-red-800 bg-red-100 rounded dark:bg-red-900 dark:text-red-200">
          {mensajeError}
        </p>
      )}

      <form
        onSubmit={manejarCrearCategoria}
        className="flex flex-wrap items-end gap-3 p-4 mt-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700"
      >
        <label className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
          Nueva categoría
          <input
            value={nombreNuevaCategoria}
            onChange={(evento) => setNombreNuevaCategoria(evento.target.value)}
            placeholder="p. ej. Uñas de gel"
            className="px-2 py-1 mt-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </label>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-pink-600 rounded hover:bg-pink-700"
        >
          Crear categoría
        </button>
      </form>

      <form
        onSubmit={manejarSubirFoto}
        className="grid grid-cols-1 gap-3 p-4 mt-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 sm:grid-cols-2"
      >
        <h3 className="font-semibold text-gray-700 sm:col-span-2 dark:text-gray-200">Subir foto</h3>

        <label className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
          Categoría
          <select
            value={categoriaSeleccionada}
            onChange={(evento) => setCategoriaSeleccionada(evento.target.value)}
            className="px-2 py-1 mt-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">Seleccione una categoría</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
          Título (opcional)
          <input
            value={tituloFoto}
            onChange={(evento) => setTituloFoto(evento.target.value)}
            className="px-2 py-1 mt-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </label>

        <label className="flex flex-col text-sm text-gray-600 sm:col-span-2 dark:text-gray-300">
          Imagen (JPEG, PNG o WEBP, máx. 5 MB)
          <input
            ref={referenciaInputArchivo}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={manejarSeleccionDeArchivo}
            className="mt-1 text-sm text-gray-600 dark:text-gray-300"
          />
        </label>

        {previsualizacion && (
          <img
            src={previsualizacion}
            alt="Previsualización"
            className="object-cover w-32 h-32 border border-gray-200 rounded dark:border-gray-600"
          />
        )}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={subiendo}
            className="px-4 py-2 text-sm font-medium text-white bg-pink-600 rounded hover:bg-pink-700 disabled:opacity-50"
          >
            {subiendo ? 'Subiendo...' : 'Subir foto'}
          </button>
        </div>
      </form>

      <div className="mt-6">
        {cargando ? (
          <p className="text-gray-500 dark:text-gray-400">Cargando categorías...</p>
        ) : categorias.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No hay categorías todavía.</p>
        ) : (
          categorias.map((categoria) => (
            <div key={categoria.id} className="mt-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">{categoria.nombre}</h3>
                <button
                  onClick={() => manejarEliminarCategoria(categoria)}
                  className="text-sm text-red-600 hover:underline dark:text-red-400"
                >
                  Eliminar categoría
                </button>
              </div>

              {categoria.fotos.length === 0 ? (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Sin fotos todavía.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 mt-3 sm:grid-cols-4 md:grid-cols-6">
                  {categoria.fotos.map((foto) => (
                    <div key={foto.id} className="relative group">
                      <img
                        src={urlArchivo(`trabajos/${foto.archivo}`)}
                        alt={foto.titulo ?? categoria.nombre}
                        className="object-cover w-full border border-gray-200 rounded aspect-square dark:border-gray-700"
                      />
                      <button
                        onClick={() => manejarEliminarFoto(foto)}
                        className="absolute px-2 py-1 text-xs text-white bg-red-600 rounded top-1 right-1 hover:bg-red-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function SeccionContenidoDeInicio() {
  const [valores, setValores] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeError, setMensajeError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  useEffect(() => {
    async function cargarContenido() {
      try {
        const respuesta = await obtener('/contenido');
        setValores(respuesta.datos ?? {});
      } catch (error) {
        setMensajeError(error.message);
      } finally {
        setCargando(false);
      }
    }

    cargarContenido();
  }, []);

  function manejarCambio(clave, valor) {
    setValores((anterior) => ({ ...anterior, [clave]: valor }));
  }

  async function manejarGuardar(evento) {
    evento.preventDefault();
    setMensajeError(null);
    setMensajeExito(null);
    setGuardando(true);

    try {
      await actualizar('/contenido', valores);
      setMensajeExito('Contenido de inicio actualizado correctamente.');
    } catch (error) {
      setMensajeError(error.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Contenido de la página de inicio</h2>

      {mensajeExito && (
        <p className="p-3 mt-4 text-green-800 bg-green-100 rounded dark:bg-green-900 dark:text-green-200">
          {mensajeExito}
        </p>
      )}
      {mensajeError && (
        <p className="p-3 mt-4 text-red-800 bg-red-100 rounded dark:bg-red-900 dark:text-red-200">
          {mensajeError}
        </p>
      )}

      {cargando ? (
        <p className="mt-4 text-gray-500 dark:text-gray-400">Cargando contenido...</p>
      ) : (
        <form
          onSubmit={manejarGuardar}
          className="grid grid-cols-1 gap-3 p-4 mt-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700"
        >
          {CAMPOS_DE_CONTENIDO.map((campo) => (
            <label key={campo.clave} className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
              {campo.etiqueta}
              {campo.tipo === 'textarea' ? (
                <textarea
                  value={valores[campo.clave] ?? ''}
                  onChange={(evento) => manejarCambio(campo.clave, evento.target.value)}
                  rows={3}
                  className="px-2 py-1 mt-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
              ) : (
                <input
                  value={valores[campo.clave] ?? ''}
                  onChange={(evento) => manejarCambio(campo.clave, evento.target.value)}
                  className="px-2 py-1 mt-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
              )}
            </label>
          ))}

          <div>
            <button
              type="submit"
              disabled={guardando}
              className="px-4 py-2 text-sm font-medium text-white bg-pink-600 rounded hover:bg-pink-700 disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function PaginaContenidoAdmin() {
  return (
    <div className="max-w-5xl px-4 py-8 mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Catálogo / Información</h1>
      <p className="mt-1 text-gray-500 dark:text-gray-400">
        Edita la galería de trabajos y el contenido de la página pública de inicio.
      </p>

      <div className="mt-8">
        <SeccionGaleria />
      </div>
      <SeccionContenidoDeInicio />

      <Link to="/admin" className="inline-block mt-10 text-pink-600 hover:underline dark:text-pink-400">
        Volver al panel
      </Link>
    </div>
  );
}

export default PaginaContenidoAdmin;
