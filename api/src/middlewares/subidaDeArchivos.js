/**
 * Módulo: Middleware de subida de archivos (multer) — fotos de la galería de trabajos
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 18/09/2026
 */

import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { entorno } from '../configuracion/entorno.js';

fs.mkdirSync(entorno.directorioSubidas, { recursive: true });

const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

// Mapa cerrado de tipo MIME -> extensión: el nombre de archivo en disco se genera
// siempre con un UUID + esta extensión, nunca con el nombre original del cliente,
// para evitar ataques de path traversal o de sobrescritura de archivos.
const EXTENSION_POR_TIPO = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const almacenamientoEnDisco = multer.diskStorage({
  destination(peticion, archivo, cb) {
    cb(null, entorno.directorioSubidas);
  },
  filename(peticion, archivo, cb) {
    cb(null, `${randomUUID()}${EXTENSION_POR_TIPO[archivo.mimetype] ?? ''}`);
  },
});

function filtroDeTipo(peticion, archivo, cb) {
  if (!EXTENSION_POR_TIPO[archivo.mimetype]) {
    cb(new Error('TIPO_NO_PERMITIDO'));
    return;
  }
  cb(null, true);
}

const subida = multer({
  storage: almacenamientoEnDisco,
  fileFilter: filtroDeTipo,
  limits: { fileSize: TAMANO_MAXIMO_BYTES },
});

function crearErrorDeArchivo(mensaje) {
  const error = new Error(mensaje);
  error.codigo = 'ARCHIVO_INVALIDO';
  error.mensaje = mensaje;
  error.codigoHttp = 400;
  return error;
}

// Envuelve multer para traducir sus errores (tipo no permitido, tamaño excedido)
// al formato estándar de respuesta { exito: false, error: { codigo, mensaje } }.
export function subirFoto(peticion, respuesta, siguiente) {
  subida.single('archivo')(peticion, respuesta, (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        siguiente(crearErrorDeArchivo('La imagen no debe superar 5 MB.'));
        return;
      }
      if (error.message === 'TIPO_NO_PERMITIDO') {
        siguiente(crearErrorDeArchivo('Solo se permiten imágenes JPEG, PNG o WEBP.'));
        return;
      }
      siguiente(crearErrorDeArchivo('No se pudo procesar el archivo enviado.'));
      return;
    }

    if (!peticion.file) {
      siguiente(crearErrorDeArchivo('Debe adjuntar una imagen.'));
      return;
    }

    siguiente();
  });
}

export default subirFoto;
