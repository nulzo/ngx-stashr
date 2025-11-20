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
    
    stateSignal.set(state);
    
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

  // initialize state.
  state = createState(setState, getState, api);
  // the internal signal.
  const stateSignal: WritableSignal<T> = signal<T>(state);
  // the result object is a signal function with properties attached.
  const storeFn = (() => stateSignal()) as Store<T>;

  // assign signal properties.
  Object.defineProperty(storeFn, 'name', { value: 'ngx-store' });
  Object.assign(storeFn, stateSignal);
  
  // TODO: can we clean this piece up???
  storeFn.get = api.get;
  storeFn.set = api.set;
  storeFn.subscribe = api.subscribe;
  storeFn.destroy = api.destroy;  
  storeFn.select = <K>(selector: (state: T) => K): Signal<K> => {
    return computed(() => selector(stateSignal()));
  };

  return storeFn;
}
