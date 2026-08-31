import { computed } from '@angular/core';
import { createStash } from './core/store';
import { shallow } from './shallow';

describe('shallow', () => {
  it('should return true for identical references and equal primitives', () => {
    const obj = { a: 1 };
    expect(shallow(obj, obj)).toBeTrue();
    expect(shallow(1, 1)).toBeTrue();
    expect(shallow('a', 'a')).toBeTrue();
    expect(shallow(null, null)).toBeTrue();
  });

  it('should return false for different primitives or null mismatches', () => {
    expect(shallow(1, 2)).toBeFalse();
    expect(shallow('a', 'b')).toBeFalse();
    expect(shallow(null, {})).toBeFalse();
    expect(shallow({}, null)).toBeFalse();
    expect(shallow(undefined, {})).toBeFalse();
  });

  it('should compare arrays element-wise', () => {
    expect(shallow([1, 2], [1, 2])).toBeTrue();
    expect(shallow([1, 2], [1, 3])).toBeFalse();
    expect(shallow([1, 2], [1, 2, 3])).toBeFalse();
    expect(shallow([], [])).toBeTrue();
  });

  it('should return false when comparing an array to a non-array', () => {
    expect(shallow([1], { 0: 1, length: 1 })).toBeFalse();
    expect(shallow({ 0: 1, length: 1 }, [1])).toBeFalse();
  });

  it('should compare plain objects key-wise', () => {
    expect(shallow({ a: 1, b: 2 }, { a: 1, b: 2 })).toBeTrue();
    expect(shallow({ a: 1 }, { a: 2 })).toBeFalse();
    expect(shallow({ a: 1 }, { a: 1, b: 2 })).toBeFalse();
    expect(shallow({ a: 1, b: 2 }, { a: 1 })).toBeFalse();
  });

  it('should be shallow: nested objects compare by reference', () => {
    const nested = { value: 1 };
    expect(shallow({ nested }, { nested })).toBeTrue();
    expect(shallow({ nested: { value: 1 } }, { nested: { value: 1 } })).toBeFalse();
  });

  it('should work as a select equality function', () => {
    interface ListState {
      items: number[];
      label: string;
    }

    const useStore = createStash<ListState>(() => ({ items: [1, 2], label: 'a' }));
    const items = useStore.select((state) => state.items, { equal: shallow });
    const consumerSpy = jasmine.createSpy('consumer');
    const tracked = computed(() => {
      consumerSpy();
      return items();
    });

    tracked();
    expect(consumerSpy).toHaveBeenCalledTimes(1);

    // unrelated update: same items by shallow equality → no recompute
    useStore.set({ label: 'b' });
    tracked();
    expect(consumerSpy).toHaveBeenCalledTimes(1);

    // same values, new array reference → still no recompute
    useStore.set({ items: [1, 2] });
    tracked();
    expect(consumerSpy).toHaveBeenCalledTimes(1);

    useStore.set({ items: [1, 2, 3] });
    tracked();
    expect(consumerSpy).toHaveBeenCalledTimes(2);
  });
});
