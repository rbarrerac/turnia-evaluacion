/**
 * Módulo: Enrutador principal de la aplicación
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 15/09/2026
 * Modificado por: Luis — 07/10/2026 (Incremento 7A: ruta /admin/horario, CU-10)
 */

import { Routes, Route } from 'react-router-dom';
import BarraNavegacion from './componentes/BarraNavegacion.jsx';
import RutaProtegida from './componentes/RutaProtegida.jsx';
import PaginaInicio from './paginas/PaginaInicio.jsx';
import PaginaRegistro from './paginas/PaginaRegistro.jsx';
import PaginaInicioSesion from './paginas/PaginaInicioSesion.jsx';
import PaginaCatalogo from './paginas/PaginaCatalogo.jsx';
import PaginaReservar from './paginas/PaginaReservar.jsx';
import PaginaMisCitas from './paginas/PaginaMisCitas.jsx';
import PaginaTrabajos from './paginas/PaginaTrabajos.jsx';
import PaginaPerfil from './paginas/PaginaPerfil.jsx';
import PaginaSeguridad from './paginas/PaginaSeguridad.jsx';
import PaginaPanelAdmin from './paginas/administradora/PaginaPanelAdmin.jsx';
import PaginaAgenda from './paginas/administradora/PaginaAgenda.jsx';
import PaginaGestionServicios from './paginas/administradora/PaginaGestionServicios.jsx';
import PaginaContenidoAdmin from './paginas/administradora/PaginaContenidoAdmin.jsx';
import PaginaConfiguracionHorario from './paginas/administradora/PaginaConfiguracionHorario.jsx';

function App() {
  return (
    <>
      <BarraNavegacion />
      <Routes>
        <Route path="/" element={<PaginaInicio />} />
        <Route path="/registro" element={<PaginaRegistro />} />
        <Route path="/inicio-sesion" element={<PaginaInicioSesion />} />
        <Route path="/servicios" element={<PaginaCatalogo />} />
        <Route path="/trabajos" element={<PaginaTrabajos />} />
        <Route
          path="/reservar/:servicioId"
          element={
            <RutaProtegida rolRequerido="clienta">
              <PaginaReservar />
            </RutaProtegida>
          }
        />
        <Route
          path="/mis-citas"
          element={
            <RutaProtegida rolRequerido="clienta">
              <PaginaMisCitas />
            </RutaProtegida>
          }
        />
        <Route
          path="/perfil"
          element={
            <RutaProtegida>
              <PaginaPerfil />
            </RutaProtegida>
          }
        />
        <Route
          path="/seguridad"
          element={
            <RutaProtegida>
              <PaginaSeguridad />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin"
          element={
            <RutaProtegida rolRequerido="administradora">
              <PaginaPanelAdmin />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin/agenda"
          element={
            <RutaProtegida rolRequerido="administradora">
              <PaginaAgenda />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin/servicios"
          element={
            <RutaProtegida rolRequerido="administradora">
              <PaginaGestionServicios />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin/horario"
          element={
            <RutaProtegida rolRequerido="administradora">
              <PaginaConfiguracionHorario />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin/contenido"
          element={
            <RutaProtegida rolRequerido="administradora">
              <PaginaContenidoAdmin />
            </RutaProtegida>
          }
        />
      </Routes>
    </>
  );
}

export default App;
