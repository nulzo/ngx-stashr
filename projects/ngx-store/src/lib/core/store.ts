import { signal, computed, WritableSignal, Signal } from '@angular/core';
import { StateCreator, Store, StoreApi, PartialState, StateListener } from './types';

export function createStore<T extends object>(createState: StateCreator<T>): Store<T> {
  let state: T;
  const listeners = new Set<StateListener<T>>();

  const setState: StoreApi<T>['set'] = (partial, replace, ...args) => {
    const nextState = typeof partial === 'function' 
      ? (partial as (state: T) => Partial<T>)(state)
      : partial;

    const previousState = state;
    
    if (Object.is(nextState, previousState)) {
      return;
    }

    state = replace 
      ? (nextState as T)
      : { ...state, ...nextState };
    
    // Update the signal
    stateSignal.set(state);
    
    // Notify listeners
    listeners.forEach(listener => listener(state, previousState, ...args));
  };

  const getState: StoreApi<T>['get'] = () => state;

  const subscribe: StoreApi<T>['subscribe'] = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const destroy: StoreApi<T>['destroy'] = () => {
    listeners.clear();
  };

  const api: StoreApi<T> = {
    get: getState,
    set: setState,
    subscribe,
    destroy
  };

  // Initialize state using the creator
  state = createState(setState, getState, api);
  
  // Create the internal signal
  const stateSignal: WritableSignal<T> = signal<T>(state);

  // Create the result object which is a Signal function with API properties attached
  const storeFn = (() => stateSignal()) as Store<T>;
  
  // Assign signal properties
  Object.defineProperty(storeFn, 'name', { value: 'ngx-store' });
  // Mimic Signal API
  Object.assign(storeFn, stateSignal);
  
  // Attach Store API
  storeFn.get = api.get;
  storeFn.set = api.set;
  storeFn.subscribe = api.subscribe;
  storeFn.destroy = api.destroy;
  
  // Attach select method
  storeFn.select = <K>(selector: (state: T) => K): Signal<K> => {
    return computed(() => selector(stateSignal()));
  };

  return storeFn;
}
