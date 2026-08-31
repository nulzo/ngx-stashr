/**
 * Shallow equality over primitives, arrays, and plain objects.
 * Pairs with `store.select(selector, { equal: shallow })` so consumers
 * only update when the selected items actually change.
 */
export function shallow<T>(valueA: T, valueB: T): boolean {
  if (Object.is(valueA, valueB)) {
    return true;
  }

  if (
    typeof valueA !== 'object' ||
    valueA === null ||
    typeof valueB !== 'object' ||
    valueB === null
  ) {
    return false;
  }

  if (Array.isArray(valueA) || Array.isArray(valueB)) {
    if (!Array.isArray(valueA) || !Array.isArray(valueB) || valueA.length !== valueB.length) {
      return false;
    }
    const b: unknown[] = valueB;
    return valueA.every((value, index) => Object.is(value, b[index]));
  }

  if (Object.getPrototypeOf(valueA) !== Object.getPrototypeOf(valueB)) {
    return false;
  }

  const a = valueA as Record<string, unknown>;
  const b = valueB as Record<string, unknown>;
  const keys = Object.keys(a);

  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => Object.hasOwn(b, key) && Object.is(a[key], b[key]))
  );
}
