/**
 * Módulo: Script de semilla — catálogo de servicios, horario, administradora y clienta
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 18/09/2026
 */

import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATALOGO_SEMILLA = [
  { nombre: 'Manicura clásica', duracion_minutos: 45, precio: 90.0 },
  { nombre: 'Manicura con gelish', duracion_minutos: 60, precio: 150.0 },
  { nombre: 'Pedicura clásica', duracion_minutos: 60, precio: 120.0 },
  { nombre: 'Pedicura spa', duracion_minutos: 90, precio: 195.0 },
  { nombre: 'Manicura + pedicura', duracion_minutos: 120, precio: 250.0 },
  { nombre: 'Uñas acrílicas (set completo)', duracion_minutos: 120, precio: 300.0 },
  { nombre: 'Relleno de acrílico', duracion_minutos: 90, precio: 180.0 },
  { nombre: 'Uñas de gel / extensiones', duracion_minutos: 120, precio: 280.0 },
  { nombre: 'Retiro de acrílico/gel', duracion_minutos: 30, precio: 60.0 },
  { nombre: 'Decoración por uña (diseño)', duracion_minutos: 15, precio: 25.0 },
];

// Horario semanal por defecto: lunes (1) a sábado (6), 9:00–18:00. Domingo (0) inactivo.
const HORARIO_SEMANAL_SEMILLA = [0, 1, 2, 3, 4, 5, 6].map((diaSemana) => ({
  dia_semana: diaSemana,
  horaInicio: '09:00',
  horaFin: '18:00',
  activo: diaSemana !== 0,
}));

// Categorías iniciales de la galería de trabajos (Incremento 6), sin fotos todavía.
const CATEGORIAS_GALERIA_SEMILLA = ['Uñas acrílicas', 'Nail art', 'Pedicura'];

// Contenido por defecto de la página pública de inicio (Incremento 6, mini-CMS),
// tomado de los textos que antes estaban fijos en PaginaInicio.jsx.
const CONTENIDO_INICIO_SEMILLA = {
  inicio_titulo: 'Bella Aurora — Estudio de Belleza',
  inicio_subtitulo: 'Haz tu cita aquí:',
  atiende_nombre: 'Aurora Marroquín',
  atiende_bio:
    '34 años, técnica en uñas con 10 años de experiencia. Especialista en nail art y uñas acrílicas.',
  trabajos_intro: 'Conoce algunos de los diseños y trabajos que hemos hecho para nuestras clientas.',
};

async function sembrarAdministradora() {
  const correo = process.env.CORREO_ADMIN ?? 'admin@turnia.gt';
  let contrasena = process.env.CONTRASENA_ADMIN;

  if (!contrasena) {
    contrasena = 'Admin1234';
    console.warn(
      'ADVERTENCIA: la variable de entorno CONTRASENA_ADMIN no está definida. ' +
        'Se usará "Admin1234" únicamente como contraseña de desarrollo. ' +
        'Defina CONTRASENA_ADMIN en api/.env y cambie esta contraseña antes de producción.',
    );
  }

  const existente = await prisma.usuarios.findUnique({ where: { correo } });
  if (existente) {
    console.log(`Semilla: la usuaria administradora ya existe (${correo}); no se duplica.`);
    return;
  }

  const contrasenaHash = await bcrypt.hash(contrasena, 10);
  await prisma.usuarios.create({
    data: {
      nombre: 'Administradora',
      correo,
      contrasena_hash: contrasenaHash,
      rol: 'administradora',
    },
  });
  console.log(`Semilla: usuaria administradora creada (${correo}).`);
}

async function sembrarClienta() {
  const correo = process.env.CORREO_CLIENTA ?? 'clienta@turnia.gt';
  let contrasena = process.env.CONTRASENA_CLIENTA;

  if (!contrasena) {
    contrasena = 'Clienta1234';
    console.warn(
      'ADVERTENCIA: la variable de entorno CONTRASENA_CLIENTA no está definida. ' +
        'Se usará "Clienta1234" únicamente como contraseña de desarrollo. ' +
        'Defina CONTRASENA_CLIENTA en api/.env y cambie esta contraseña antes de producción.',
    );
  }

  const existente = await prisma.usuarios.findUnique({ where: { correo } });
  if (existente) {
    console.log(`Semilla: la usuaria clienta ya existe (${correo}); no se duplica.`);
    return;
  }

  const contrasenaHash = await bcrypt.hash(contrasena, 10);
  await prisma.usuarios.create({
    data: {
      nombre: 'Clienta de Prueba',
      correo,
      contrasena_hash: contrasenaHash,
      rol: 'clienta',
    },
  });
  console.log(`Semilla: usuaria clienta creada (${correo}).`);
}

async function sembrarCatalogoDeServicios() {
  let creados = 0;

  for (const servicio of CATALOGO_SEMILLA) {
    const existente = await prisma.servicios.findFirst({ where: { nombre: servicio.nombre } });
    if (existente) continue;

    await prisma.servicios.create({ data: servicio });
    creados += 1;
  }

  console.log(
    `Semilla: catálogo de servicios verificado (${creados} nuevos, ${CATALOGO_SEMILLA.length} en total).`,
  );
}

async function sembrarHorarioDeAtencion() {
  let creados = 0;

  for (const horario of HORARIO_SEMANAL_SEMILLA) {
    const existente = await prisma.horarios_atencion.findFirst({
      where: { dia_semana: horario.dia_semana },
    });
    if (existente) continue;

    await prisma.horarios_atencion.create({
      data: {
        dia_semana: horario.dia_semana,
        hora_inicio: new Date(`1970-01-01T${horario.horaInicio}:00Z`),
        hora_fin: new Date(`1970-01-01T${horario.horaFin}:00Z`),
        activo: horario.activo,
      },
    });
    creados += 1;
  }

  console.log(`Semilla: horario de atención semanal verificado (${creados} nuevos).`);
}

async function sembrarCategoriasDeGaleria() {
  let creadas = 0;

  for (const [indice, nombre] of CATEGORIAS_GALERIA_SEMILLA.entries()) {
    const existente = await prisma.categorias_galeria.findUnique({ where: { nombre } });
    if (existente) continue;

    await prisma.categorias_galeria.create({ data: { nombre, orden: indice } });
    creadas += 1;
  }

  console.log(
    `Semilla: categorías de galería verificadas (${creadas} nuevas, ${CATEGORIAS_GALERIA_SEMILLA.length} en total).`,
  );
}

async function sembrarContenidoDeInicio() {
  let creadas = 0;

  for (const [clave, valor] of Object.entries(CONTENIDO_INICIO_SEMILLA)) {
    const existente = await prisma.contenido_sitio.findUnique({ where: { clave } });
    if (existente) continue;

    await prisma.contenido_sitio.create({ data: { clave, valor } });
    creadas += 1;
  }

  console.log(
    `Semilla: contenido de inicio verificado (${creadas} claves nuevas, ${Object.keys(CONTENIDO_INICIO_SEMILLA).length} en total).`,
  );
}

async function principal() {
  console.log('Iniciando semilla de Turnia...');

  await sembrarAdministradora();
  await sembrarClienta();
  await sembrarCatalogoDeServicios();
  await sembrarHorarioDeAtencion();
  await sembrarCategoriasDeGaleria();
  await sembrarContenidoDeInicio();

  console.log('Semilla completada.');
}

principal()
  .catch((error) => {
    console.error('Error al ejecutar la semilla:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
