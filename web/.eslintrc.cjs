/**
 * Módulo: Configuración de ESLint del frontend (ESLint 8, formato .eslintrc)
 * Proyecto: Turnia
 * Autor: Luis
 * Fecha de creación: 07/10/2026
 */

// Es .cjs porque web/package.json declara "type": "module" y ESLint 8 carga
// .eslintrc.* con require().
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: 'detect' },
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist/', 'node_modules/'],
  overrides: [
    {
      // Archivos de configuración de herramientas (Vite, Tailwind, PostCSS y este
      // mismo): se ejecutan en Node, no en el navegador.
      files: ['*.config.js', '.eslintrc.cjs'],
      env: { node: true, browser: false },
    },
  ],
};
