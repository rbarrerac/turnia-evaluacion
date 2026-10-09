/**
 * Módulo: Controlador de autenticación — registro, inicio de sesión y perfil
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 18/09/2026
 */

import GestorDeAutenticacion from '../servicios/GestorDeAutenticacion.js';

const gestorDeAutenticacion = new GestorDeAutenticacion();

export async function registrar(peticion, respuesta, siguiente) {
  try {
    const { nombre, correo, telefono, contrasena } = peticion.body;
    const usuario = await gestorDeAutenticacion.registrar(nombre, correo, telefono, contrasena);
    respuesta.status(201).json({ exito: true, datos: usuario });
  } catch (error) {
    siguiente(error);
  }
}

export async function iniciarSesion(peticion, respuesta, siguiente) {
  try {
    const { correo, contrasena } = peticion.body;
    const resultado = await gestorDeAutenticacion.iniciarSesion(correo, contrasena);
    respuesta.json({ exito: true, datos: resultado });
  } catch (error) {
    siguiente(error);
  }
}

export async function obtenerPerfil(peticion, respuesta, siguiente) {
  try {
    const usuario = await gestorDeAutenticacion.obtenerPorId(peticion.usuaria.id);
    respuesta.json({ exito: true, datos: usuario });
  } catch (error) {
    siguiente(error);
  }
}

export async function actualizarPerfil(peticion, respuesta, siguiente) {
  try {
    const usuario = await gestorDeAutenticacion.actualizarPerfil(peticion.usuaria.id, peticion.body);
    respuesta.json({ exito: true, datos: usuario });
  } catch (error) {
    siguiente(error);
  }
}

export async function cambiarCorreo(peticion, respuesta, siguiente) {
  try {
    const { correoNuevo, contrasenaActual } = peticion.body;
    const usuario = await gestorDeAutenticacion.cambiarCorreo(peticion.usuaria.id, {
      correoNuevo,
      contrasenaActual,
    });
    respuesta.json({ exito: true, datos: usuario });
  } catch (error) {
    siguiente(error);
  }
}

export async function cambiarContrasena(peticion, respuesta, siguiente) {
  try {
    const { contrasenaActual, contrasenaNueva } = peticion.body;
    await gestorDeAutenticacion.cambiarContrasena(peticion.usuaria.id, {
      contrasenaActual,
      contrasenaNueva,
    });
    respuesta.json({ exito: true, datos: { mensaje: 'Contraseña actualizada correctamente.' } });
  } catch (error) {
    siguiente(error);
  }
}
