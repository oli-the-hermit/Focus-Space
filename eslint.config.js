// ESLint flat config. Guardrails for the SSoT refactor (documentation/refactor-plan.md):
// rules start as warnings so a run doubles as the audit report, and each one is
// switched to "error" once its phase is done.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import noComponentClass from './scripts/lint/no-component-class.js';

/** User-facing text belongs in src/constants/strings.ts. */
const NO_HARDCODED_TEXT = [
  {
    selector: 'JSXText[value=/[A-Za-z]{2,}/]',
    message: 'Move user-facing text to src/constants/strings.ts.'
  },
  {
    selector: 'JSXAttribute[name.name=/^(placeholder|title|alt|aria-label)$/] > Literal[value=/[A-Za-z]{2,}/]',
    message: 'Move user-facing text to src/constants/strings.ts.'
  },
  {
    // Text handed to components through objects, e.g. menu items and tabs: { label: 'Daily' }.
    selector: 'Property[key.name=/^(label|title|message|placeholder|ariaLabel|confirmLabel|primaryLabel|cancelLabel|emptyMessage|tooltip|hint)$/] > Literal[value=/[A-Za-z]{2,}/]',
    message: 'Move user-facing text to src/constants/strings.ts.'
  },
  {
    selector: 'JSXAttribute[name.name=/^(placeholder|title|alt|aria-label|label)$/] TemplateLiteral > TemplateElement[value.raw=/[A-Za-z]{2,}/]',
    message: 'Build user-facing text with format() from lib/i18n and a template in strings.ts.'
  }
];

/** Interactive elements come from the ui primitives (Button, IconButton, Field, Checkbox...). */
const NO_RAW_CONTROLS = [
  {
    selector: 'JSXOpeningElement[name.name=/^(button|input|select|textarea)$/]',
    message: 'Use the ui component (Button, IconButton, TextButton, Field, Checkbox, Switch, Select...) instead of a raw element.'
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
    plugins: { 'react-hooks': reactHooks, local: { rules: { 'no-component-class': noComponentClass } } },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      // Pastel Studio 1.5: components stay inside components/ui (documentation/inline-audit.md).
      'local/no-component-class': 'error',
      // Phase 8: intentional exceptions carry an eslint-disable comment saying why.
      'react-hooks/exhaustive-deps': 'error',
      // Phase 7 complete: every intentionally ignored error says why in a comment.
      'no-empty': 'error',
      // Off: "initialize, then assign in every branch" is intentional and readable here.
      'no-useless-assignment': 'off',
      // Phase 6 complete: user-facing text lives in constants/strings.ts.
      'no-restricted-syntax': ['error', ...NO_HARDCODED_TEXT, ...NO_RAW_CONTROLS]
    }
  },
  {
    // The dictionaries themselves, seed data and test fixtures.
    files: ['src/constants/strings.ts', 'src/constants/defaults.ts', 'src/**/*.test.ts'],
    rules: { 'no-restricted-syntax': 'off' }
  },
  {
    // UI primitives stay app-agnostic: text comes in through props, data through the caller.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      // The primitives are where the classes and raw elements live.
      'local/no-component-class': 'off',
      'no-restricted-syntax': ['error', ...NO_HARDCODED_TEXT],
      // Phase 5 complete: UI primitives are app-agnostic.
      'no-restricted-imports': ['error', {
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
