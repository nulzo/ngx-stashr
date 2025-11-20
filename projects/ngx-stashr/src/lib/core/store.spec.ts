import { createStash } from '../core/store';
import { TestBed } from '@angular/core/testing';

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
    
    // @ts-ignore - Intentionally missing properties to test full replacement behavior if allowed by types, 
    // but strictly typed it requires full state. Let's provide full state but different.
    useStore.set({ count: 1, name: 'replaced' }, true);
    
    expect(useStore.get()).toEqual({ count: 1, name: 'replaced' });
    
    // If we use partial with replace: true, it should theoretically strictly set state to that partial object (casting it to T)
    // In JS land this wipes other keys.
    useStore.set({ count: 2 } as any, true);
    expect(useStore.get()).toEqual({ count: 2 } as any);
  });

  it('should not emit if state is identical (Object.is optimization)', () => {
    const useStore = createStash<TestState>(() => ({ count: 0, name: 'test' }));
    const spy = jasmine.createSpy('listener');
    useStore.subscribe(spy);

    const initialState = useStore.get();
    
    // 1. Set with same object reference (unlikely in typical usage but possible)
    useStore.set(initialState);
    expect(spy).not.toHaveBeenCalled();

    // 2. Set with partial that results in same object reference? 
    // The store implementation:
    // const nextState = ... 
    // if (Object.is(nextState, previousState)) return;
    // state = replace ? nextState : { ...state, ...nextState };
    
    // Note: The standard "shallow merge" always creates a new object reference: { ...state, ...nextState }.
    // So Object.is(nextState, previousState) only catches if the updater function returns the exact same state object.
    
    useStore.set((state) => state); // Returns same state object
    expect(spy).not.toHaveBeenCalled();

    // However, a standard partial set `{ count: 0 }` creates a new object via merge, so it WILL emit even if values are same.
    // This is standard Zustand behavior too (shallow equality check is usually done in selectors, not the root state update unless strict equality).
    // Our implementation: `if (Object.is(nextState, previousState))`
    // If we pass an object `{ count: 0 }`, nextState IS that object. previousState is the Store's state object. They are NOT the same reference.
    // so it proceeds to merge.
  });

  it('should expose a working signal', () => {
    const useStore = createStash<TestState>(() => ({ count: 10, name: 'signal' }));
    
    // Signal access
    const state = useStore();
    expect(state.count).toBe(10);
  });

  it('should select a slice of state', () => {
    const useStore = createStash<TestState>(() => ({ count: 5, name: 'slice' }));
    const count = useStore.select(state => state.count);
    
    expect(count()).toBe(5);
    
    useStore.set({ count: 6 });
    expect(count()).toBe(6);
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
  
  it('should support actions in the store', () => {
      interface StoreWithActions extends TestState {
          inc: () => void;
      }
      
      const useStore = createStash<StoreWithActions>((set) => ({
          count: 0,
          name: 'actions',
          inc: () => set((state) => ({ count: state.count + 1 }))
      }));
      
      useStore().inc();
      expect(useStore().count).toBe(1);
  });
});
