/**
 * Módulo: Controlador de contenido — textos editables de la página de inicio
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 18/09/2026
 */

import GestorDeContenido from '../servicios/GestorDeContenido.js';

const gestorDeContenido = new GestorDeContenido();

export async function obtener(peticion, respuesta, siguiente) {
  try {
    const contenido = await gestorDeContenido.obtenerContenido();
    respuesta.json({ exito: true, datos: contenido });
  } catch (error) {
    siguiente(error);
  }
}

export async function actualizar(peticion, respuesta, siguiente) {
  try {
    const contenido = await gestorDeContenido.actualizarContenido(peticion.body);
    respuesta.json({ exito: true, datos: contenido });
  } catch (error) {
    siguiente(error);
  }
}
