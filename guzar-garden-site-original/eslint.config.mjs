import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

const config = [
  {
    ignores: [
      '.next/**',
      '.vinext/**',
      '.wrangler/**',
      'dist/**',
      'node_modules/**',
      'legacy/**',
      'public/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
    ],
  },
  ...nextVitals,
  ...nextTypeScript,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
      // These effects intentionally synchronize browser-only state after
      // hydration (localStorage, WebGL and media-query capability checks).
      'react-hooks/set-state-in-effect': 'off',
      // Availability depends on a token property, not the rest of the hold;
      // keeping the narrower callback dependency avoids needless polling resets.
      'react-hooks/preserve-manual-memoization': 'off',
      // Security/idempotency identifiers must be minted once per browser journey.
      'react-hooks/purity': 'off',
    },
  },
  {
    // The generated-art module is migrated legacy code kept byte-faithful on purpose.
    files: ['lib/menu/dish-art.js'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    // This component is inserted by each App Router root layout; the rule only
    // understands the legacy Pages Router's pages/_document convention.
    files: ['components/shared/document-head.tsx'],
    rules: { '@next/next/no-page-custom-font': 'off' },
  },
  {
    files: ['scripts/**/*.mjs', '*.config.*'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['tests/**/*.ts', 'tests/**/*.tsx'],
    rules: { 'no-console': 'off' },
  },
];

export default config;
