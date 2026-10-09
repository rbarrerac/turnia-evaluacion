/**
 * Módulo: GestorDeNotificaciones — envío de correos de confirmación y recordatorio
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 18/09/2026
 */

import nodemailer from 'nodemailer';
import prisma from '../configuracion/baseDeDatos.js';
import { entorno } from '../configuracion/entorno.js';

function smtpEstaCompleto() {
  const { host, puerto, usuario, contrasena, remitente } = entorno.smtp;
  return Boolean(
    host?.trim() && puerto?.trim() && usuario?.trim() && contrasena?.trim() && remitente?.trim(),
  );
}

function crearTransportador() {
  if (!smtpEstaCompleto()) return null;

  return nodemailer.createTransport({
    host: entorno.smtp.host,
    port: Number(entorno.smtp.puerto),
    secure: Number(entorno.smtp.puerto) === 465,
    auth: { user: entorno.smtp.usuario, pass: entorno.smtp.contrasena },
    // Si el host SMTP configurado no responde, que falle rápido en vez de
    // colgar la petición que disparó el envío (la llamada ya está en
    // try/catch en enviarConfirmacion/enviarRecordatorio).
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
  });
}

function formatearFechaHora(fecha) {
  const f = new Date(fecha);
  const dia = String(f.getUTCDate()).padStart(2, '0');
  const mes = String(f.getUTCMonth() + 1).padStart(2, '0');
  const anio = f.getUTCFullYear();
  const horas = String(f.getUTCHours()).padStart(2, '0');
  const minutos = String(f.getUTCMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
}

class GestorDeNotificaciones {
  constructor() {
    this.transportador = crearTransportador();

    if (this.transportador) {
      console.log(`GestorDeNotificaciones: modo SMTP real activo (host: ${entorno.smtp.host}).`);
    } else {
      console.log(
        'GestorDeNotificaciones: variables SMTP_* incompletas o ausentes; modo consola activo ' +
          '(los correos se imprimen en la terminal, no se envían de verdad). ' +
          'Defina SMTP_HOST, SMTP_PUERTO, SMTP_USUARIO, SMTP_CONTRASENA y SMTP_REMITENTE en api/.env para enviar correo real.',
      );
    }
  }

  async _enviarOImprimir({ para, asunto, cuerpo }) {
    if (this.transportador) {
      await this.transportador.sendMail({
        from: entorno.smtp.remitente,
        to: para,
        subject: asunto,
        text: cuerpo,
      });
      return;
    }

    console.log('--- Correo simulado (modo consola, no se envió realmente) ---');
    console.log(`Para: ${para}`);
    console.log(`Asunto: ${asunto}`);
    console.log(cuerpo);
    console.log('--- Fin del correo simulado ---');
  }

  async _obtenerCitaConDetalles(cita) {
    if (cita.clienta && cita.servicio) return cita;

    return prisma.citas.findUnique({
      where: { id: cita.id },
      include: { clienta: true, servicio: true },
    });
  }

  async _registrarNotificacion(citaId, tipo, exitoso) {
    return prisma.notificaciones.create({
      data: { cita_id: citaId, tipo, enviado_en: new Date(), exitoso },
    });
  }

  async enviarConfirmacion(cita) {
    const citaCompleta = await this._obtenerCitaConDetalles(cita);
    const asunto = 'Turnia — Confirmación de tu cita';
    const cuerpo =
      `Hola ${citaCompleta.clienta.nombre},\n\n` +
      `Tu cita para "${citaCompleta.servicio.nombre}" quedó registrada para el ` +
      `${formatearFechaHora(citaCompleta.inicia_en)}.\n\n` +
      'Te esperamos en Turnia.';

    let exitoso = true;
    try {
      await this._enviarOImprimir({ para: citaCompleta.clienta.correo, asunto, cuerpo });
    } catch (error) {
      console.error('GestorDeNotificaciones: error al enviar la confirmación:', error);
      exitoso = false;
    }

    await this._registrarNotificacion(citaCompleta.id, 'confirmacion', exitoso);
    return exitoso;
  }

  async enviarRecordatorio(cita) {
    const citaCompleta = await this._obtenerCitaConDetalles(cita);
    const asunto = 'Turnia — Recordatorio de tu cita';
    const cuerpo =
      `Hola ${citaCompleta.clienta.nombre},\n\n` +
      `Te recordamos tu cita para "${citaCompleta.servicio.nombre}" el ` +
      `${formatearFechaHora(citaCompleta.inicia_en)}.\n\n` +
      'Te esperamos en Turnia.';

    let exitoso = true;
    try {
      await this._enviarOImprimir({ para: citaCompleta.clienta.correo, asunto, cuerpo });
    } catch (error) {
      console.error('GestorDeNotificaciones: error al enviar el recordatorio:', error);
      exitoso = false;
    }

    await this._registrarNotificacion(citaCompleta.id, 'recordatorio', exitoso);
    return exitoso;
  }
}

export default GestorDeNotificaciones;
