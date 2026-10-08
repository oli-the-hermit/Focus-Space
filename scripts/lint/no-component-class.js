// ESLint rule: a ui component's classes stay inside src/components/ui. Elsewhere, render the
// component (or ask it for a prop) instead of rebuilding it from its classes.
// Checks the strings in className-like props (className, triggerClassName, ...), including
// the ones passed through cx() or a template literal.
import { componentClasses } from './component-classes.js';

const OWNER = componentClasses();
const CLASS_PROP = /className$/i;

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Use the ui component instead of its CSS classes.' },
    messages: {
      inline: '"{{cls}}" belongs to a ui component ({{file}}). Use the component, or give it a prop.'
    },
    schema: []
  },
  create(context) {
    const check = (node, text) => {
      for (const cls of text.split(/\s+/)) {
        const file = OWNER.get(cls);
        if (file) context.report({ node, messageId: 'inline', data: { cls, file } });
      }
    };
    const inClassProp = node =>
      context.sourceCode.getAncestors(node).some(a =>
        (a.type === 'JSXAttribute' && CLASS_PROP.test(a.name.name)) ||
        (a.type === 'Property' && a.key.type === 'Identifier' && CLASS_PROP.test(a.key.name))
      );
    return {
      Literal(node) {
        if (typeof node.value === 'string' && inClassProp(node)) check(node, node.value);
      },
      TemplateElement(node) {
        if (inClassProp(node)) check(node, node.value.cooked ?? '');
      }
    };
  }
};
