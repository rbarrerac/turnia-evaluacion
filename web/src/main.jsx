/**
 * Módulo: Punto de entrada de React — monta la aplicación en el DOM
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 15/09/2026
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ProveedorAutenticacion } from './contexto/ContextoAutenticacion.jsx';
import { ProveedorTema } from './contexto/ContextoTema.jsx';
import './estilos/indice.css';

ReactDOM.createRoot(document.getElementById('raiz')).render(
  <React.StrictMode>
    <ProveedorTema>
      <BrowserRouter>
        <ProveedorAutenticacion>
          <App />
        </ProveedorAutenticacion>
      </BrowserRouter>
    </ProveedorTema>
  </React.StrictMode>,
);
