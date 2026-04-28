import { useMemo } from 'react';

export function useFormDirtyTracking<T>(initialValues: T | null, currentValues: T): boolean {
  return useMemo(() => {
    if (initialValues === null) return false;
    return JSON.stringify(initialValues) !== JSON.stringify(currentValues);
  }, [initialValues, currentValues]);
}
