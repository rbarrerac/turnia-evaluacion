/**
 * Módulo: Envoltorio de fetch hacia la API REST de Turnia
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 15/09/2026
 * Modificado por: Luis — 07/10/2026 (Incremento 7A: el error lanzado conserva código, estado HTTP y detalles)
 * Modificado por: Luis — 08/10/2026 (Incremento 8: rutas relativas cuando VITE_URL_API está vacía)
 */

// En desarrollo, VITE_URL_API trae la URL completa de la API (ver web/.env.example).
// En el despliegue con Docker se construye con VITE_URL_API vacía: el frontend y la API
// comparten origen detrás de Nginx, así que las peticiones son relativas ("/api/...").
const URL_BASE = import.meta.env.VITE_URL_API || '/api';
// URL de los archivos estáticos (galería de trabajos): la misma raíz que la API,
// sin el sufijo "/api". Con rutas relativas queda vacía y las fotos se piden en
// "/archivos/trabajos/<archivo>" del mismo origen.
const URL_ARCHIVOS = URL_BASE.replace(/\/api\/?$/, '');

async function peticion(ruta, opciones = {}) {
  // Con FormData (subida de archivos) el navegador debe fijar su propio
  // Content-Type (con el boundary del multipart); no se debe forzar JSON.
  const esFormData = typeof FormData !== 'undefined' && opciones.body instanceof FormData;

  const respuesta = await fetch(`${URL_BASE}${ruta}`, {
    ...opciones,
    headers: {
      ...(esFormData ? {} : { 'Content-Type': 'application/json' }),
      ...opciones.headers,
    },
  });

  const cuerpo = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const mensaje = cuerpo?.error?.mensaje ?? `Error en la petición (${respuesta.status})`;
    // Además del mensaje (que ya usaban todas las páginas), se conservan el código
    // de error, el estado HTTP y los detalles opcionales (p. ej. la lista de citas
    // de CONFLICTO_CON_CITAS) para las páginas que necesiten reaccionar a ellos.
    const error = new Error(mensaje);
    error.codigo = cuerpo?.error?.codigo ?? null;
    error.estadoHttp = respuesta.status;
    error.detalles = cuerpo?.error?.detalles ?? null;
    throw error;
  }

  return cuerpo;
}

const CLAVE_TOKEN = 'turnia_token';

export function obtenerToken() {
  return localStorage.getItem(CLAVE_TOKEN);
}

export function guardarToken(token) {
  localStorage.setItem(CLAVE_TOKEN, token);
}

export function borrarToken() {
  localStorage.removeItem(CLAVE_TOKEN);
}

function encabezadosAutenticados() {
  const token = obtenerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function obtener(ruta) {
  return peticion(ruta, { method: 'GET', headers: encabezadosAutenticados() });
}

export function enviar(ruta, cuerpo) {
  return peticion(ruta, {
    method: 'POST',
    headers: encabezadosAutenticados(),
    body: JSON.stringify(cuerpo),
  });
}

// Subida de archivos (multipart/form-data), p. ej. una foto de la galería de trabajos.
export function enviarArchivo(ruta, formData) {
  return peticion(ruta, {
    method: 'POST',
    headers: encabezadosAutenticados(),
    body: formData,
  });
}

// Construye la URL pública de un archivo guardado en el almacenamiento del servidor
// (p. ej. una foto de la galería), a partir del nombre de archivo devuelto por la API.
export function urlArchivo(rutaRelativa) {
  return `${URL_ARCHIVOS}/archivos/${rutaRelativa}`;
}

export function actualizar(ruta, cuerpo) {
  return peticion(ruta, {
    method: 'PUT',
    headers: encabezadosAutenticados(),
    body: JSON.stringify(cuerpo),
  });
}

export function actualizarParcial(ruta, cuerpo) {
  return peticion(ruta, {
    method: 'PATCH',
    headers: encabezadosAutenticados(),
    body: JSON.stringify(cuerpo),
  });
}

export function eliminar(ruta) {
  return peticion(ruta, { method: 'DELETE', headers: encabezadosAutenticados() });
}
