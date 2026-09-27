// ESLint flat config. Guardrails for the SSoT refactor (documentation/refactor-plan.md):
// rules start as warnings so a run doubles as the audit report, and each one is
// switched to "error" once its phase is done.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/** User-facing text belongs in src/constants/strings.ts. */
const NO_HARDCODED_TEXT = [
  {
    selector: 'JSXText[value=/[A-Za-z]{2,}/]',
    message: 'Move user-facing text to src/constants/strings.ts.'
  },
  {
    selector: 'JSXAttribute[name.name=/^(placeholder|title|alt|aria-label)$/] > Literal[value=/[A-Za-z]{2,}/]',
    message: 'Move user-facing text to src/constants/strings.ts.'
  }
];

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'src-tauri/**',
      'documentation/**',
      'npm/**',
      'original-mockup/**',
      'app.js',
      'styles.css',
      'public/**'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Silent catches (mostly localStorage) move behind one storage helper in Phase 7.
      'no-empty': 'warn',
      'no-useless-assignment': 'warn',
      'no-restricted-syntax': ['warn', ...NO_HARDCODED_TEXT]
    }
  },
  {
    // UI primitives stay app-agnostic: text comes in through props, data through the caller.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['warn', {
        patterns: [
          { group: ['**/context/*', '**/context/**'], message: 'UI primitives must not read app state; pass it in as props.' },
          { group: ['**/lib/api', '**/lib/api.ts'], message: 'UI primitives must not call the API.' },
          { group: ['**/constants/strings', '**/constants/strings.ts'], message: 'UI primitives take text through a labels prop.' }
        ]
      }]
    }
  },
  {
    files: ['server/**/*.js', 'scripts/**/*.{js,ts,mjs}', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node }
  }
);
