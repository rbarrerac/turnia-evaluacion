/**
 * Módulo: Pruebas de integración de /api/trabajos y /api/contenido
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 18/09/2026
 * Modificado por: Ronald — 07/10/2026 (Incremento 7B: editar/eliminar categoría, subidas
 *   rechazadas sin archivos huérfanos y validaciones de contenido)
 */

import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import aplicacion from '../../src/aplicacion.js';
import prisma from '../../src/configuracion/baseDeDatos.js';
import { entorno } from '../../src/configuracion/entorno.js';
import { generarToken } from '../../src/utilidades/generadorDeTokens.js';

const CLAVE_CONTENIDO_PRUEBA = 'atiende_nombre';
const BUFFER_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const idsDeCategoriasCreadas = [];
const idsDeFotosCreadas = [];

let tokenAdministradora;
let tokenClienta;
let valorOriginalDeContenido;

beforeAll(async () => {
  tokenAdministradora = generarToken({
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    nombre: 'Administradora de prueba (galería)',
    correo: 'admin.galeria@turnia.gt',
    rol: 'administradora',
  });

  tokenClienta = generarToken({
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    nombre: 'Clienta de prueba (galería)',
    correo: 'clienta.galeria@turnia.gt',
    rol: 'clienta',
  });

  const filaOriginal = await prisma.contenido_sitio.findUnique({
    where: { clave: CLAVE_CONTENIDO_PRUEBA },
  });
  valorOriginalDeContenido = filaOriginal?.valor ?? null;
});

afterAll(async () => {
  if (idsDeFotosCreadas.length > 0) {
    const fotos = await prisma.fotos_galeria.findMany({ where: { id: { in: idsDeFotosCreadas } } });
    for (const foto of fotos) {
      const ruta = path.join(entorno.directorioSubidas, foto.archivo);
      if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
    }
    await prisma.fotos_galeria.deleteMany({ where: { id: { in: idsDeFotosCreadas } } });
  }

  if (idsDeCategoriasCreadas.length > 0) {
    await prisma.categorias_galeria.deleteMany({ where: { id: { in: idsDeCategoriasCreadas } } });
  }

  if (valorOriginalDeContenido !== null) {
    await prisma.contenido_sitio.update({
      where: { clave: CLAVE_CONTENIDO_PRUEBA },
      data: { valor: valorOriginalDeContenido },
    });
  } else {
    await prisma.contenido_sitio.deleteMany({ where: { clave: CLAVE_CONTENIDO_PRUEBA } });
  }

  await prisma.$disconnect();
});

describe('GET /api/trabajos', () => {
  test('público devuelve 200 y la estructura de categorías con fotos', async () => {
    const categoria = await prisma.categorias_galeria.create({
      data: { nombre: `Categoría de prueba ${Date.now()}` },
    });
    idsDeCategoriasCreadas.push(categoria.id);

    const respuesta = await request(aplicacion).get('/api/trabajos');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.exito).toBe(true);
    expect(Array.isArray(respuesta.body.datos)).toBe(true);

    const encontrada = respuesta.body.datos.find((c) => c.id === categoria.id);
    expect(encontrada).toBeDefined();
    expect(Array.isArray(encontrada.fotos)).toBe(true);
    expect(encontrada.fotos.length).toBe(0);
  });
});

describe('POST /api/trabajos/categorias', () => {
  test('con administradora crea la categoría (201)', async () => {
    const respuesta = await request(aplicacion)
      .post('/api/trabajos/categorias')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .send({ nombre: `Categoría admin ${Date.now()}` });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.exito).toBe(true);
    expect(respuesta.body.datos.activo).toBe(true);
    idsDeCategoriasCreadas.push(respuesta.body.datos.id);
  });

  test('con clienta (no administradora) devuelve 403', async () => {
    const respuesta = await request(aplicacion)
      .post('/api/trabajos/categorias')
      .set('Authorization', `Bearer ${tokenClienta}`)
      .send({ nombre: `Categoría de clienta ${Date.now()}` });

    expect(respuesta.status).toBe(403);
  });

  test('sin token devuelve 401', async () => {
    const respuesta = await request(aplicacion)
      .post('/api/trabajos/categorias')
      .send({ nombre: `Categoría sin token ${Date.now()}` });

    expect(respuesta.status).toBe(401);
  });
});

describe('POST /api/trabajos (subir foto)', () => {
  let categoriaId;

  beforeAll(async () => {
    const categoria = await prisma.categorias_galeria.create({
      data: { nombre: `Categoría para fotos ${Date.now()}` },
    });
    categoriaId = categoria.id;
    idsDeCategoriasCreadas.push(categoriaId);
  });

  test('con administradora sube la foto (201) y queda accesible en /archivos', async () => {
    const respuesta = await request(aplicacion)
      .post('/api/trabajos')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .field('categoria_id', categoriaId)
      .field('titulo', 'Foto de prueba')
      .attach('archivo', BUFFER_PNG, 'foto.png');

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.exito).toBe(true);
    expect(respuesta.body.datos.categoria_id).toBe(categoriaId);
    expect(respuesta.body.datos.titulo).toBe('Foto de prueba');
    idsDeFotosCreadas.push(respuesta.body.datos.id);

    const rutaArchivo = path.join(entorno.directorioSubidas, respuesta.body.datos.archivo);
    expect(fs.existsSync(rutaArchivo)).toBe(true);

    const respuestaArchivo = await request(aplicacion).get(
      `/archivos/trabajos/${respuesta.body.datos.archivo}`,
    );
    expect(respuestaArchivo.status).toBe(200);
  });

  test('con un tipo de archivo no permitido devuelve 400 ARCHIVO_INVALIDO', async () => {
    const respuesta = await request(aplicacion)
      .post('/api/trabajos')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .field('categoria_id', categoriaId)
      .attach('archivo', Buffer.from('esto no es una imagen'), 'malo.gif');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.exito).toBe(false);
    expect(respuesta.body.error.codigo).toBe('ARCHIVO_INVALIDO');
  });

  test('sin token devuelve 401', async () => {
    const respuesta = await request(aplicacion)
      .post('/api/trabajos')
      .field('categoria_id', categoriaId)
      .attach('archivo', BUFFER_PNG, 'foto2.png');

    expect(respuesta.status).toBe(401);
  });
});

describe('DELETE /api/trabajos/:id (eliminar foto)', () => {
  test('elimina el registro y el archivo físico del disco', async () => {
    const categoria = await prisma.categorias_galeria.create({
      data: { nombre: `Categoría para eliminar foto ${Date.now()}` },
    });
    idsDeCategoriasCreadas.push(categoria.id);

    const subida = await request(aplicacion)
      .post('/api/trabajos')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .field('categoria_id', categoria.id)
      .attach('archivo', BUFFER_PNG, 'foto3.png');

    expect(subida.status).toBe(201);
    const rutaArchivo = path.join(entorno.directorioSubidas, subida.body.datos.archivo);
    expect(fs.existsSync(rutaArchivo)).toBe(true);

    const respuesta = await request(aplicacion)
      .delete(`/api/trabajos/${subida.body.datos.id}`)
      .set('Authorization', `Bearer ${tokenAdministradora}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.exito).toBe(true);
    expect(fs.existsSync(rutaArchivo)).toBe(false);

    const enBaseDeDatos = await prisma.fotos_galeria.findUnique({
      where: { id: subida.body.datos.id },
    });
    expect(enBaseDeDatos).toBeNull();
  });
});

describe('GET /api/contenido', () => {
  test('público devuelve 200 y un objeto de contenido', async () => {
    const respuesta = await request(aplicacion).get('/api/contenido');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.exito).toBe(true);
    expect(typeof respuesta.body.datos).toBe('object');
    expect(respuesta.body.datos).not.toBeNull();
  });
});

describe('PUT /api/contenido', () => {
  test('con administradora actualiza el contenido y lo refleja en una consulta posterior', async () => {
    const nuevoValor = `Valor de prueba ${Date.now()}`;

    const respuesta = await request(aplicacion)
      .put('/api/contenido')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .send({ [CLAVE_CONTENIDO_PRUEBA]: nuevoValor });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.exito).toBe(true);
    expect(respuesta.body.datos[CLAVE_CONTENIDO_PRUEBA]).toBe(nuevoValor);

    const consulta = await request(aplicacion).get('/api/contenido');
    expect(consulta.body.datos[CLAVE_CONTENIDO_PRUEBA]).toBe(nuevoValor);
  });

  test('con clienta (no administradora) devuelve 403', async () => {
    const respuesta = await request(aplicacion)
      .put('/api/contenido')
      .set('Authorization', `Bearer ${tokenClienta}`)
      .send({ [CLAVE_CONTENIDO_PRUEBA]: 'no debería aplicarse' });

    expect(respuesta.status).toBe(403);
  });
});

// Nombres de archivo presentes en la carpeta de subidas: sirve para comprobar que una
// subida rechazada no deja un archivo huérfano en disco.
function archivosEnDisco() {
  return fs.readdirSync(entorno.directorioSubidas).filter((nombre) => nombre !== '.gitkeep').sort();
}

const ID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

describe('PUT /api/trabajos/categorias/:id (editar categoría)', () => {
  let categoria;
  let otraCategoria;

  beforeAll(async () => {
    categoria = await prisma.categorias_galeria.create({
      data: { nombre: `Categoría a editar ${Date.now()}` },
    });
    otraCategoria = await prisma.categorias_galeria.create({
      data: { nombre: `Categoría existente ${Date.now()}` },
    });
    idsDeCategoriasCreadas.push(categoria.id, otraCategoria.id);
  });

  test('con administradora devuelve 200 y persiste nombre, orden y activo', async () => {
    const nombreNuevo = `Categoría editada ${Date.now()}`;
    const respuesta = await request(aplicacion)
      .put(`/api/trabajos/categorias/${categoria.id}`)
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .send({ nombre: `  ${nombreNuevo} `, orden: 7, activo: false });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.nombre).toBe(nombreNuevo);

    const enBase = await prisma.categorias_galeria.findUnique({ where: { id: categoria.id } });
    expect(enBase.nombre).toBe(nombreNuevo);
    expect(enBase.orden).toBe(7);
    expect(enBase.activo).toBe(false);

    // Una categoría inactiva ya no aparece en la galería pública.
    const publica = await request(aplicacion).get('/api/trabajos');
    expect(publica.body.datos.map((c) => c.id)).not.toContain(categoria.id);
  });

  test('sin nombre devuelve 400 DATOS_INVALIDOS', async () => {
    const respuesta = await request(aplicacion)
      .put(`/api/trabajos/categorias/${categoria.id}`)
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .send({ nombre: '   ' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('DATOS_INVALIDOS');
  });

  test('con el nombre de otra categoría devuelve 409 CATEGORIA_DUPLICADA', async () => {
    const respuesta = await request(aplicacion)
      .put(`/api/trabajos/categorias/${categoria.id}`)
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .send({ nombre: otraCategoria.nombre });

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.codigo).toBe('CATEGORIA_DUPLICADA');
  });

  test('con id inexistente devuelve 404 CATEGORIA_NO_ENCONTRADA', async () => {
    const respuesta = await request(aplicacion)
      .put(`/api/trabajos/categorias/${ID_INEXISTENTE}`)
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .send({ nombre: 'No existe' });

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error.codigo).toBe('CATEGORIA_NO_ENCONTRADA');
  });
});

describe('POST /api/trabajos/categorias (validaciones)', () => {
  test('sin nombre devuelve 400 DATOS_INVALIDOS', async () => {
    const respuesta = await request(aplicacion)
      .post('/api/trabajos/categorias')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .send({});

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('DATOS_INVALIDOS');
  });

  test('con un nombre repetido devuelve 409 CATEGORIA_DUPLICADA', async () => {
    const nombre = `Categoría repetida ${Date.now()}`;
    const primera = await request(aplicacion)
      .post('/api/trabajos/categorias')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .send({ nombre, orden: 3 });
    expect(primera.status).toBe(201);
    expect(primera.body.datos.orden).toBe(3);
    idsDeCategoriasCreadas.push(primera.body.datos.id);

    const segunda = await request(aplicacion)
      .post('/api/trabajos/categorias')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .send({ nombre });

    expect(segunda.status).toBe(409);
    expect(segunda.body.error.codigo).toBe('CATEGORIA_DUPLICADA');
  });
});

describe('DELETE /api/trabajos/categorias/:id (eliminar categoría)', () => {
  test('con administradora devuelve 200, borra la categoría, sus fotos y sus archivos', async () => {
    const categoria = await prisma.categorias_galeria.create({
      data: { nombre: `Categoría a eliminar ${Date.now()}` },
    });
    idsDeCategoriasCreadas.push(categoria.id);

    const subida = await request(aplicacion)
      .post('/api/trabajos')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .field('categoria_id', categoria.id)
      .attach('archivo', BUFFER_PNG, 'foto-categoria.png');
    expect(subida.status).toBe(201);
    const rutaArchivo = path.join(entorno.directorioSubidas, subida.body.datos.archivo);
    expect(fs.existsSync(rutaArchivo)).toBe(true);

    const respuesta = await request(aplicacion)
      .delete(`/api/trabajos/categorias/${categoria.id}`)
      .set('Authorization', `Bearer ${tokenAdministradora}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.id).toBe(categoria.id);
    expect(await prisma.categorias_galeria.findUnique({ where: { id: categoria.id } })).toBeNull();
    expect(await prisma.fotos_galeria.findUnique({ where: { id: subida.body.datos.id } })).toBeNull();
    expect(fs.existsSync(rutaArchivo)).toBe(false);
  });

  test('con id inexistente devuelve 404 CATEGORIA_NO_ENCONTRADA', async () => {
    const respuesta = await request(aplicacion)
      .delete(`/api/trabajos/categorias/${ID_INEXISTENTE}`)
      .set('Authorization', `Bearer ${tokenAdministradora}`);

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error.codigo).toBe('CATEGORIA_NO_ENCONTRADA');
  });
});

describe('POST /api/trabajos — subidas rechazadas no dejan archivos huérfanos', () => {
  test('a una categoría inexistente devuelve 404 y borra el archivo recibido', async () => {
    const antes = archivosEnDisco();

    const respuesta = await request(aplicacion)
      .post('/api/trabajos')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .field('categoria_id', ID_INEXISTENTE)
      .attach('archivo', BUFFER_PNG, 'huerfana.png');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error.codigo).toBe('CATEGORIA_NO_ENCONTRADA');
    expect(archivosEnDisco()).toEqual(antes);
  });

  test('sin categoria_id devuelve 400 DATOS_INVALIDOS y borra el archivo recibido', async () => {
    const antes = archivosEnDisco();

    const respuesta = await request(aplicacion)
      .post('/api/trabajos')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .attach('archivo', BUFFER_PNG, 'sin-categoria.png');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('DATOS_INVALIDOS');
    expect(archivosEnDisco()).toEqual(antes);
  });

  test('con un categoria_id mal formado devuelve 400 DATOS_INVALIDOS y borra el archivo recibido', async () => {
    const antes = archivosEnDisco();

    const respuesta = await request(aplicacion)
      .post('/api/trabajos')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .field('categoria_id', 'abc')
      .attach('archivo', BUFFER_PNG, 'id-malo.png');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('DATOS_INVALIDOS');
    expect(archivosEnDisco()).toEqual(antes);
  });

  test('sin archivo adjunto devuelve 400 ARCHIVO_INVALIDO', async () => {
    const respuesta = await request(aplicacion)
      .post('/api/trabajos')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .field('categoria_id', ID_INEXISTENTE);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('ARCHIVO_INVALIDO');
    expect(respuesta.body.error.mensaje).toBe('Debe adjuntar una imagen.');
  });

  test('una imagen de más de 5 MB devuelve 400 ARCHIVO_INVALIDO y no queda en disco', async () => {
    const antes = archivosEnDisco();
    const imagenGrande = Buffer.concat([BUFFER_PNG, Buffer.alloc(5 * 1024 * 1024)]);

    const respuesta = await request(aplicacion)
      .post('/api/trabajos')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .field('categoria_id', ID_INEXISTENTE)
      .attach('archivo', imagenGrande, 'grande.png');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('ARCHIVO_INVALIDO');
    expect(respuesta.body.error.mensaje).toBe('La imagen no debe superar 5 MB.');
    expect(archivosEnDisco()).toEqual(antes);
  });

  test('un archivo en un campo distinto de "archivo" devuelve 400 ARCHIVO_INVALIDO', async () => {
    const respuesta = await request(aplicacion)
      .post('/api/trabajos')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .field('categoria_id', ID_INEXISTENTE)
      .attach('imagen', BUFFER_PNG, 'campo-equivocado.png');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('ARCHIVO_INVALIDO');
    expect(respuesta.body.error.mensaje).toBe('No se pudo procesar el archivo enviado.');
  });
});

describe('DELETE /api/trabajos/:id (foto inexistente)', () => {
  test('con id inexistente devuelve 404 FOTO_NO_ENCONTRADA', async () => {
    const respuesta = await request(aplicacion)
      .delete(`/api/trabajos/${ID_INEXISTENTE}`)
      .set('Authorization', `Bearer ${tokenAdministradora}`);

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error.codigo).toBe('FOTO_NO_ENCONTRADA');
  });
});

describe('PUT /api/contenido (validaciones)', () => {
  test('con un arreglo en lugar de un objeto devuelve 400 DATOS_INVALIDOS', async () => {
    const respuesta = await request(aplicacion)
      .put('/api/contenido')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .send([{ [CLAVE_CONTENIDO_PRUEBA]: 'no debería aplicarse' }]);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('DATOS_INVALIDOS');
  });

  test('sin ningún valor de texto devuelve 400 y no modifica el contenido', async () => {
    const antes = await request(aplicacion).get('/api/contenido');

    const respuesta = await request(aplicacion)
      .put('/api/contenido')
      .set('Authorization', `Bearer ${tokenAdministradora}`)
      .send({ [CLAVE_CONTENIDO_PRUEBA]: 123, otra_clave: null });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('DATOS_INVALIDOS');

    const despues = await request(aplicacion).get('/api/contenido');
    expect(despues.body.datos).toEqual(antes.body.datos);
  });

  test('sin token devuelve 401', async () => {
    const respuesta = await request(aplicacion)
      .put('/api/contenido')
      .send({ [CLAVE_CONTENIDO_PRUEBA]: 'no debería aplicarse' });

    expect(respuesta.status).toBe(401);
  });
});
