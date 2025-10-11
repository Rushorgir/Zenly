// Root flat ESLint config for the repo
// - Frontend: Next.js + TypeScript (use eslint-config-next)
// - Backend: Node/Express (use recommended node rules)

const nextConfig = require('eslint-config-next')
const nextParser = require('eslint-config-next/parser')

module.exports = [
  {
    ignores: ['node_modules/**', 'frontend/.next/**', 'dist/**'],
  },

  // Backend (Node) files
  {
    files: ['backend/**/*.{js,mjs,cjs}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    plugins: {
      // node rules come from ESLint core and plugins as needed
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },

  // Frontend (Next + TS)
  {
    files: ['frontend/**/*.{js,jsx,ts,tsx}'],
    plugins: {
      import: require('eslint-plugin-import'),
      react: require('eslint-plugin-react'),
      'jsx-a11y': require('eslint-plugin-jsx-a11y'),
    },
    languageOptions: {
      parser: nextParser,
      parserOptions: nextConfig.parserOptions || {},
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
      },
    },
    rules: nextConfig.rules || {},
    settings: nextConfig.settings || {},
  },
]
