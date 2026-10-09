/**
 * Módulo: GestorDeContenido — almacén clave-valor del contenido de la página de inicio
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 18/09/2026
 */

import prisma from '../configuracion/baseDeDatos.js';

function crearError(codigo, mensaje, codigoHttp) {
  const error = new Error(mensaje);
  error.codigo = codigo;
  error.mensaje = mensaje;
  error.codigoHttp = codigoHttp;
  return error;
}

class GestorDeContenido {
  async obtenerContenido() {
    const filas = await prisma.contenido_sitio.findMany();
    return Object.fromEntries(filas.map((fila) => [fila.clave, fila.valor]));
  }

  // Upsert de las claves recibidas; ignora cualquier valor que no sea texto.
  async actualizarContenido(cambios) {
    if (typeof cambios !== 'object' || cambios === null || Array.isArray(cambios)) {
      throw crearError(
        'DATOS_INVALIDOS',
        'Debe enviar un objeto con las claves de contenido a actualizar.',
        400,
      );
    }

    const entradas = Object.entries(cambios).filter(([, valor]) => typeof valor === 'string');
    if (entradas.length === 0) {
      throw crearError('DATOS_INVALIDOS', 'No se recibió ningún valor de contenido válido.', 400);
    }

    await Promise.all(
      entradas.map(([clave, valor]) =>
        prisma.contenido_sitio.upsert({
          where: { clave },
          update: { valor },
          create: { clave, valor },
        }),
      ),
    );

    return this.obtenerContenido();
  }
}

export default GestorDeContenido;
