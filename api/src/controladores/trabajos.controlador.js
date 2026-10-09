/**
 * Módulo: Controlador de trabajos — galería de fotos por categoría
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 18/09/2026
 */

import GestorDeGaleria from '../servicios/GestorDeGaleria.js';

const gestorDeGaleria = new GestorDeGaleria();

export async function listarPublico(peticion, respuesta, siguiente) {
  try {
    const categorias = await gestorDeGaleria.listarCategoriasConFotos();
    respuesta.json({ exito: true, datos: categorias });
  } catch (error) {
    siguiente(error);
  }
}

export async function crearCategoria(peticion, respuesta, siguiente) {
  try {
    const categoria = await gestorDeGaleria.crearCategoria(peticion.body);
    respuesta.status(201).json({ exito: true, datos: categoria });
  } catch (error) {
    siguiente(error);
  }
}

export async function editarCategoria(peticion, respuesta, siguiente) {
  try {
    const categoria = await gestorDeGaleria.editarCategoria(peticion.params.id, peticion.body);
    respuesta.json({ exito: true, datos: categoria });
  } catch (error) {
    siguiente(error);
  }
}

export async function eliminarCategoria(peticion, respuesta, siguiente) {
  try {
    const categoria = await gestorDeGaleria.eliminarCategoria(peticion.params.id);
    respuesta.json({ exito: true, datos: categoria });
  } catch (error) {
    siguiente(error);
  }
}

export async function agregarFoto(peticion, respuesta, siguiente) {
  try {
    const foto = await gestorDeGaleria.agregarFoto(peticion.body.categoria_id, peticion.file, {
      titulo: peticion.body.titulo,
      descripcion: peticion.body.descripcion,
    });
    respuesta.status(201).json({ exito: true, datos: foto });
  } catch (error) {
    siguiente(error);
  }
}

export async function eliminarFoto(peticion, respuesta, siguiente) {
  try {
    const foto = await gestorDeGaleria.eliminarFoto(peticion.params.id);
    respuesta.json({ exito: true, datos: foto });
  } catch (error) {
    siguiente(error);
  }
}
