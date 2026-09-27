import { useRef } from 'react';

/**
 * True once `values` differ from what they were on the first render.
 * Form modals use it to show Cancel only after something was edited.
 */
export function useDirty(values: unknown): boolean {
  const serialized = JSON.stringify(values);
  const initial = useRef(serialized);
  return serialized !== initial.current;
}
