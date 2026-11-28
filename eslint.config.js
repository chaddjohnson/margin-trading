import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import tseslint from 'typescript-eslint';

export default [
  {
    // apps/* are self-contained front-end apps with their own package.json and ESLint config (npm --prefix apps/<name> run lint)
    // research/**/cache/**: generated, git-ignored study caches (e.g. Strategy Lab scratch builds under
    // cache/strategy-lab-scratch/dist); research/**/results/**: sealed research records (never edited, not source).
    ignores: [
      'dist/**',
      'src/startTradingServer.js',
      'research/**/tmp/**',
      'research/**/freeze/source/**',
      'research/**/cache/**',
      'research/**/results/**',
      'src/d1-refinement/generated/**',
      '.cache/**',
      'apps/**'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    plugins: {
      prettier: prettierPlugin,
      import: importPlugin
    },
    rules: {
      'require-jsdoc': 'off',
      'prettier/prettier': ['warn'],
      'func-names': 'off',
      'no-param-reassign': 'off',
      radix: ['error', 'as-needed'],
      'consistent-return': 'off',
      'no-useless-escape': 'off',
      'no-use-before-define': ['warn', { functions: false }],
      'no-return-await': 'off',
      'object-curly-spacing': ['warn', 'always'],
      'max-len': 'off',
      'no-plusplus': 'off',
      'global-require': 'off',
      'class-methods-use-this': 'off',
      'no-await-in-loop': 'off',
      'import/no-extraneous-dependencies': 'off',
      'keyword-spacing': ['warn', { before: true, after: true }],
      'no-underscore-dangle': 'off',
      'space-infix-ops': 'warn',
      'no-else-return': 'off',
      'import/prefer-default-export': 'off',
      'import/no-unresolved': 'off',
      'import/newline-after-import': 'warn',
      'lines-between-class-members': 'off',
      'spaced-comment': ['warn', 'always', { block: { balanced: true } }],
      '@typescript-eslint/no-unused-vars': ['warn'],
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }
];
