/**
 * Módulo: Tarea cron — envía recordatorios 24 h antes de cada cita confirmada
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 18/09/2026
 */

import cron from 'node-cron';
import prisma from '../configuracion/baseDeDatos.js';
import GestorDeNotificaciones from '../servicios/GestorDeNotificaciones.js';

const UN_DIA_EN_MS = 24 * 60 * 60 * 1000;

const gestorDeNotificaciones = new GestorDeNotificaciones();

// RN-06: busca citas confirmadas que inician dentro de las próximas 24 horas y que
// todavía no tengan un recordatorio registrado, y les envía (o imprime) el recordatorio.
// Exportada por separado para poder probarla sin depender del cron.
export async function enviarRecordatoriosPendientes() {
  const ahora = new Date();
  const en24Horas = new Date(ahora.getTime() + UN_DIA_EN_MS);

  const citasProximas = await prisma.citas.findMany({
    where: {
      estado: 'confirmada',
      inicia_en: { gte: ahora, lte: en24Horas },
    },
    include: { clienta: true, servicio: true, notificaciones: true },
  });

  const pendientes = citasProximas.filter(
    (cita) => !cita.notificaciones.some((notificacion) => notificacion.tipo === 'recordatorio'),
  );

  for (const cita of pendientes) {
    await gestorDeNotificaciones.enviarRecordatorio(cita);
  }

  return pendientes.length;
}

// Expresión cron "0 8 * * *": minuto 0, hora 8, cualquier día del mes, cualquier mes,
// cualquier día de la semana -> se ejecuta todos los días a las 08:00 (hora del servidor).
export function iniciarTareaRecordatorios() {
  console.log('Tarea de recordatorios: programada todos los días a las 08:00 (cron "0 8 * * *").');

  return cron.schedule('0 8 * * *', () => {
    enviarRecordatoriosPendientes().catch((error) => {
      console.error('Tarea de recordatorios: error al ejecutarla:', error);
    });
  });
}

export default iniciarTareaRecordatorios;
