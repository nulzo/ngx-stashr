import { createStore } from './store';
import { TestBed } from '@angular/core/testing';

interface TestState {
  count: number;
  name: string;
}

describe('ngx-store', () => {
  it('should create a store with initial state', () => {
    const useStore = createStore<TestState>(() => ({ count: 0, name: 'test' }));
    expect(useStore.get()).toEqual({ count: 0, name: 'test' });
    expect(useStore().count).toBe(0);
  });

  it('should update state via set', () => {
    const useStore = createStore<TestState>((set) => ({ count: 0, name: 'test' }));
    
    useStore.set({ count: 1 });
    expect(useStore.get().count).toBe(1);
    expect(useStore().count).toBe(1);
  });

  it('should update state via set with function', () => {
    const useStore = createStore<TestState>((set) => ({ count: 0, name: 'test' }));
    
    useStore.set((state) => ({ count: state.count + 1 }));
    expect(useStore.get().count).toBe(1);
  });

  it('should expose a working signal', () => {
    const useStore = createStore<TestState>(() => ({ count: 10, name: 'signal' }));
    
    // Signal access
    const state = useStore();
    expect(state.count).toBe(10);
  });

  it('should select a slice of state', () => {
    const useStore = createStore<TestState>(() => ({ count: 5, name: 'slice' }));
    const count = useStore.select(state => state.count);
    
    expect(count()).toBe(5);
    
    useStore.set({ count: 6 });
    expect(count()).toBe(6);
  });

  it('should subscribe to changes', () => {
    const useStore = createStore<TestState>(() => ({ count: 0, name: 'sub' }));
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
  
  it('should support actions in the store', () => {
      interface StoreWithActions extends TestState {
          inc: () => void;
      }
      
      const useStore = createStore<StoreWithActions>((set) => ({
          count: 0,
          name: 'actions',
          inc: () => set((state) => ({ count: state.count + 1 }))
      }));
      
      useStore().inc();
      expect(useStore().count).toBe(1);
  });
});
