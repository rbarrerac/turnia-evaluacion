/**
 * Módulo: GestorDeGaleria — categorías y fotos de la galería de trabajos
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 18/09/2026
 * Modificado por: Ronald — 07/10/2026 (Incremento 7B: categoria_id mal formado ya no deja
 *   la foto subida huérfana en disco)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import prisma from '../configuracion/baseDeDatos.js';
import { entorno } from '../configuracion/entorno.js';
import { esUuidValido } from '../utilidades/validadores.js';

function crearError(codigo, mensaje, codigoHttp) {
  const error = new Error(mensaje);
  error.codigo = codigo;
  error.mensaje = mensaje;
  error.codigoHttp = codigoHttp;
  return error;
}

function normalizarTexto(valor) {
  return typeof valor === 'string' && valor.trim().length > 0 ? valor.trim() : null;
}

async function borrarArchivoDeDisco(nombreArchivo) {
  try {
    await fs.unlink(path.join(entorno.directorioSubidas, nombreArchivo));
  } catch (error) {
    // Un archivo ya ausente no es un error: el objetivo (que no exista en disco) ya se cumple.
    if (error.code !== 'ENOENT') throw error;
  }
}

class GestorDeGaleria {
  // Vista pública: solo categorías activas, con sus fotos, en el orden configurado.
  async listarCategoriasConFotos() {
    return prisma.categorias_galeria.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
      include: { fotos: { orderBy: { orden: 'asc' } } },
    });
  }

  async crearCategoria(datos) {
    const nombre = normalizarTexto(datos.nombre);
    if (!nombre) {
      throw crearError('DATOS_INVALIDOS', 'El nombre de la categoría es obligatorio.', 400);
    }

    try {
      return await prisma.categorias_galeria.create({
        data: {
          nombre,
          orden: Number.isInteger(datos.orden) ? datos.orden : 0,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw crearError('CATEGORIA_DUPLICADA', 'Ya existe una categoría con ese nombre.', 409);
      }
      throw error;
    }
  }

  async obtenerCategoriaPorId(id) {
    const categoria = await prisma.categorias_galeria.findUnique({ where: { id } });

    if (!categoria) {
      throw crearError('CATEGORIA_NO_ENCONTRADA', 'La categoría solicitada no existe.', 404);
    }

    return categoria;
  }

  async editarCategoria(id, datos) {
    await this.obtenerCategoriaPorId(id);

    const nombre = normalizarTexto(datos.nombre);
    if (!nombre) {
      throw crearError('DATOS_INVALIDOS', 'El nombre de la categoría es obligatorio.', 400);
    }

    try {
      return await prisma.categorias_galeria.update({
        where: { id },
        data: {
          nombre,
          orden: Number.isInteger(datos.orden) ? datos.orden : undefined,
          activo: typeof datos.activo === 'boolean' ? datos.activo : undefined,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw crearError('CATEGORIA_DUPLICADA', 'Ya existe una categoría con ese nombre.', 409);
      }
      throw error;
    }
  }

  // Borra la categoría, sus fotos (cascada a nivel de base de datos) y los archivos físicos.
  async eliminarCategoria(id) {
    const categoria = await prisma.categorias_galeria.findUnique({
      where: { id },
      include: { fotos: true },
    });

    if (!categoria) {
      throw crearError('CATEGORIA_NO_ENCONTRADA', 'La categoría solicitada no existe.', 404);
    }

    await prisma.categorias_galeria.delete({ where: { id } });
    await Promise.all(categoria.fotos.map((foto) => borrarArchivoDeDisco(foto.archivo)));

    return categoria;
  }

  // "archivo" es el objeto que deja multer en peticion.file (ya guardado en disco
  // con nombre seguro). Si la categoría no existe, se borra el archivo huérfano.
  async agregarFoto(categoriaId, archivo, datos = {}) {
    if (!categoriaId) {
      await borrarArchivoDeDisco(archivo.filename);
      throw crearError('DATOS_INVALIDOS', 'Debe indicar la categoría de la foto.', 400);
    }

    // Un id mal formado haría que Prisma lanzara P2023 antes de llegar a borrar el
    // archivo (quedaba huérfano en disco); se valida aquí para limpiarlo igual que arriba.
    if (!esUuidValido(categoriaId)) {
      await borrarArchivoDeDisco(archivo.filename);
      throw crearError('DATOS_INVALIDOS', 'El identificador de la categoría no es válido.', 400);
    }

    const categoria = await prisma.categorias_galeria.findUnique({ where: { id: categoriaId } });
    if (!categoria) {
      await borrarArchivoDeDisco(archivo.filename);
      throw crearError('CATEGORIA_NO_ENCONTRADA', 'La categoría solicitada no existe.', 404);
    }

    return prisma.fotos_galeria.create({
      data: {
        categoria_id: categoriaId,
        archivo: archivo.filename,
        titulo: normalizarTexto(datos.titulo),
        descripcion: normalizarTexto(datos.descripcion),
      },
    });
  }

  async eliminarFoto(id) {
    const foto = await prisma.fotos_galeria.findUnique({ where: { id } });

    if (!foto) {
      throw crearError('FOTO_NO_ENCONTRADA', 'La foto solicitada no existe.', 404);
    }

    await prisma.fotos_galeria.delete({ where: { id } });
    await borrarArchivoDeDisco(foto.archivo);

    return foto;
  }
}

export default GestorDeGaleria;
