/**
 * Módulo: Cliente Prisma compartido (conexión a la base de datos)
 * Proyecto: Turnia
 * Autor: Ronald
 * Fecha de creación: 15/09/2026
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;
