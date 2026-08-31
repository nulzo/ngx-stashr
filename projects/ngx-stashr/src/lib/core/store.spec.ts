import { computed, isSignal } from '@angular/core';
import { createStash } from '../core/store';

interface TestState {
  count: number;
  name: string;
  nested?: {
    value: number;
  };
}

describe('ngx-stashr', () => {
  it('should create a store with initial state', () => {
    const useStore = createStash<TestState>(() => ({ count: 0, name: 'test' }));
    expect(useStore.get()).toEqual({ count: 0, name: 'test' });
    expect(useStore().count).toBe(0);
  });

  it('should be recognized as a signal', () => {
    const useStore = createStash<TestState>(() => ({ count: 0, name: 'signal' }));
    expect(isSignal(useStore)).toBeTrue();
    expect(computed(() => useStore().count)()).toBe(0);
  });

  it('should not leak writable signal methods that bypass middleware', () => {
    const useStore = createStash<TestState>(() => ({ count: 0, name: 'encapsulated' }));
    expect((useStore as any).update).toBeUndefined();
    expect((useStore as any).asReadonly).toBeUndefined();
  });

  it('should update state via set', () => {
    const useStore = createStash<TestState>((set) => ({ count: 0, name: 'test' }));

    useStore.set({ count: 1 });
    expect(useStore.get().count).toBe(1);
    expect(useStore().count).toBe(1);
  });

  it('should update state via set with function', () => {
    const useStore = createStash<TestState>((set) => ({ count: 0, name: 'test' }));

    useStore.set((state) => ({ count: state.count + 1 }));
    expect(useStore.get().count).toBe(1);
  });

  it('should merge state by default (shallow merge)', () => {
    const useStore = createStash<TestState>(() => ({ count: 0, name: 'test' }));

    useStore.set({ count: 1 });
    const state = useStore.get();

    expect(state.count).toBe(1);
    expect(state.name).toBe('test'); // name should be preserved
  });

  it('should replace state when replace flag is true', () => {
    const useStore = createStash<TestState>(() => ({ count: 0, name: 'test' }));

    useStore.set({ count: 1, name: 'replaced' }, true);

    expect(useStore.get()).toEqual({ count: 1, name: 'replaced' });

    // In JS land, a partial with replace: true wipes the other keys.
    useStore.set({ count: 2 } as any, true);
    expect(useStore.get()).toEqual({ count: 2 } as any);
  });

  it('should not emit if state is identical (Object.is optimization)', () => {
    const useStore = createStash<TestState>(() => ({ count: 0, name: 'test' }));
    const spy = jasmine.createSpy('listener');
    useStore.subscribe(spy);

    const initialState = useStore.get();

    // Set with same object reference
    useStore.set(initialState);
    expect(spy).not.toHaveBeenCalled();

    // Updater returning the exact same state object
    useStore.set((state) => state);
    expect(spy).not.toHaveBeenCalled();

    // A standard partial set `{ count: 0 }` creates a new object via merge,
    // so it WILL emit even if values are same (standard Zustand behavior).
  });

  it('should not crash when set is called during initialization', () => {
    const useStore = createStash<TestState>((set) => {
      set({ count: 99 }); // superseded by the returned initial state, but must not throw
      return { count: 0, name: 'init' };
    });

    expect(useStore().count).toBe(0);
    useStore.set({ count: 1 });
    expect(useStore().count).toBe(1);
  });

  it('should expose a working signal', () => {
    const useStore = createStash<TestState>(() => ({ count: 10, name: 'signal' }));

    const state = useStore();
    expect(state.count).toBe(10);
  });

  it('should select a slice of state', () => {
    const useStore = createStash<TestState>(() => ({ count: 5, name: 'slice' }));
    const count = useStore.select((state) => state.count);

    expect(count()).toBe(5);

    useStore.set({ count: 6 });
    expect(count()).toBe(6);
  });

  it('should not notify selector consumers when the selected slice is unchanged', () => {
    const useStore = createStash<TestState>(() => ({ count: 0, name: 'memo' }));
    const count = useStore.select((state) => state.count);
    const consumerSpy = jasmine.createSpy('consumer').and.callFake((c: number) => c * 2);
    const doubled = computed(() => consumerSpy(count()));

    expect(doubled()).toBe(0);
    expect(consumerSpy).toHaveBeenCalledTimes(1);

    // unrelated update: the selected value is equal, so consumers must not recompute
    useStore.set({ name: 'changed' });
    expect(doubled()).toBe(0);
    expect(consumerSpy).toHaveBeenCalledTimes(1);

    useStore.set({ count: 5 });
    expect(doubled()).toBe(10);
    expect(consumerSpy).toHaveBeenCalledTimes(2);
  });

  it('should support custom equality for selectors', () => {
    const useStore = createStash<TestState>(() => ({
      count: 0,
      name: 'eq',
      nested: { value: 1 },
    }));
    const nested = useStore.select((state) => state.nested, {
      equal: (a, b) => a?.value === b?.value,
    });
    const consumerSpy = jasmine.createSpy('consumer');
    const tracked = computed(() => {
      consumerSpy();
      return nested();
    });

    tracked();
    expect(consumerSpy).toHaveBeenCalledTimes(1);

    // new reference, equal value: suppressed by the custom equality
    useStore.set({ nested: { value: 1 } });
    tracked();
    expect(consumerSpy).toHaveBeenCalledTimes(1);

    useStore.set({ nested: { value: 2 } });
    tracked();
    expect(consumerSpy).toHaveBeenCalledTimes(2);
  });

  it('should subscribe to changes', () => {
    const useStore = createStash<TestState>(() => ({ count: 0, name: 'sub' }));
    const spy = jasmine.createSpy('listener');

    const unsub = useStore.subscribe(spy);

    useStore.set({ count: 1 });

    expect(spy).toHaveBeenCalled();
    const [newState, prevState] = spy.calls.mostRecent().args;
    expect(newState.count).toBe(1);
    expect(prevState.count).toBe(0);

    unsub();
    useStore.set({ count: 2 });
    expect(spy.calls.count()).toBe(1);
  });

  it('should pass action args through to listeners', () => {
    const useStore = createStash<TestState>(() => ({ count: 0, name: 'args' }));
    const spy = jasmine.createSpy('listener');
    useStore.subscribe(spy);

    useStore.set({ count: 1 }, false, 'increment');

    expect(spy).toHaveBeenCalledWith(
      jasmine.objectContaining({ count: 1 }),
      jasmine.objectContaining({ count: 0 }),
      'increment'
    );
  });

  it('should clear all listeners on destroy', () => {
    const useStore = createStash<TestState>(() => ({ count: 0, name: 'destroy' }));
    const spy1 = jasmine.createSpy('listener-1');
    const spy2 = jasmine.createSpy('listener-2');

    useStore.subscribe(spy1);
    useStore.subscribe(spy2);

    useStore.set({ count: 1 });
    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledTimes(1);

    useStore.destroy();

    useStore.set({ count: 2 });
    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledTimes(1);
  });

  it('should expose the initial state for resets', () => {
    const useStore = createStash<TestState>(() => ({ count: 0, name: 'initial' }));

    useStore.set({ count: 42, name: 'changed' });
    expect(useStore.get()).toEqual({ count: 42, name: 'changed' });

    useStore.set(useStore.getInitialState(), true);
    expect(useStore.get()).toEqual({ count: 0, name: 'initial' });
  });

  it('should support actions in the store', () => {
    interface StoreWithActions extends TestState {
      inc: () => void;
    }

    const useStore = createStash<StoreWithActions>((set) => ({
      count: 0,
      name: 'actions',
      inc: () => set((state) => ({ count: state.count + 1 })),
    }));

    useStore().inc();
    expect(useStore().count).toBe(1);
  });
});
