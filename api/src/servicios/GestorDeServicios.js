/**
 * Módulo: GestorDeServicios — CRUD del catálogo de servicios
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

function validarDatosDeServicio(datos) {
  const errores = [];

  if (typeof datos.nombre !== 'string' || datos.nombre.trim().length === 0) {
    errores.push('El nombre del servicio es obligatorio.');
  }

  if (!Number.isInteger(datos.duracion_minutos) || datos.duracion_minutos <= 0) {
    errores.push('La duración debe ser un número entero de minutos mayor que cero.');
  }

  const precio = Number(datos.precio);
  if (Number.isNaN(precio) || precio < 0) {
    errores.push('El precio debe ser un número mayor o igual a cero.');
  }

  if (errores.length > 0) {
    throw crearError('DATOS_INVALIDOS', errores.join(' '), 400);
  }
}

class GestorDeServicios {
  async listarActivos() {
    return prisma.servicios.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });
  }

  // Uso de la administradora: incluye activos e inactivos (Incremento 4).
  async listarTodos() {
    return prisma.servicios.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  async obtenerPorId(id) {
    const servicio = await prisma.servicios.findUnique({ where: { id } });

    if (!servicio) {
      throw crearError('SERVICIO_NO_ENCONTRADO', 'El servicio solicitado no existe.', 404);
    }

    return servicio;
  }

  async crear(datos) {
    const datosNormalizados = {
      nombre: typeof datos.nombre === 'string' ? datos.nombre.trim() : datos.nombre,
      descripcion: datos.descripcion?.trim ? datos.descripcion.trim() || null : (datos.descripcion ?? null),
      duracion_minutos: Number(datos.duracion_minutos),
      precio: Number(datos.precio),
    };

    validarDatosDeServicio(datosNormalizados);

    return prisma.servicios.create({
      data: {
        nombre: datosNormalizados.nombre,
        descripcion: datosNormalizados.descripcion,
        duracion_minutos: datosNormalizados.duracion_minutos,
        precio: datosNormalizados.precio,
        activo: true,
      },
    });
  }

  async editar(id, datos) {
    await this.obtenerPorId(id);

    const datosNormalizados = {
      nombre: typeof datos.nombre === 'string' ? datos.nombre.trim() : datos.nombre,
      descripcion: datos.descripcion?.trim ? datos.descripcion.trim() || null : (datos.descripcion ?? null),
      duracion_minutos: Number(datos.duracion_minutos),
      precio: Number(datos.precio),
    };

    validarDatosDeServicio(datosNormalizados);

    return prisma.servicios.update({
      where: { id },
      data: {
        nombre: datosNormalizados.nombre,
        descripcion: datosNormalizados.descripcion,
        duracion_minutos: datosNormalizados.duracion_minutos,
        precio: datosNormalizados.precio,
      },
    });
  }

  async desactivar(id) {
    await this.obtenerPorId(id);

    return prisma.servicios.update({
      where: { id },
      data: { activo: false },
    });
  }

  async reactivar(id) {
    await this.obtenerPorId(id);

    return prisma.servicios.update({
      where: { id },
      data: { activo: true },
    });
  }
}

export default GestorDeServicios;
