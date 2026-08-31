import { computed, signal, WritableSignal } from '@angular/core';
import { StateCreator, StateListener, Store, StoreApi } from './types';

export function createStash<T extends object>(createState: StateCreator<T>): Store<T> {
  let state: T;
  let stateSignal: WritableSignal<T>;
  const listeners = new Set<StateListener<T>>();

  const setState: StoreApi<T>['set'] = (partial, replace, ...args) => {
    const nextState =
      typeof partial === 'function' ? (partial as (state: T) => Partial<T>)(state) : partial;
    const previousState = state;

    if (Object.is(nextState, previousState)) {
      return;
    }

    state = replace ? (nextState as T) : { ...state, ...nextState };
    // undefined while the creator is still running (set during init)
    stateSignal?.set(state);
    listeners.forEach((listener) => listener(state, previousState, ...args));
  };

  const api: StoreApi<T> = {
    get: () => state,
    set: setState,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy: () => listeners.clear(),
  };

  state = createState(setState, api.get, api);
  stateSignal = signal(state);

  // the store is the readonly signal itself, with the api attached.
  // asReadonly() keeps raw writable-signal methods (update/asReadonly) from
  // leaking onto the store and bypassing middleware.
  const storeFn = stateSignal.asReadonly() as Store<T>;
  storeFn.get = api.get;
  storeFn.set = api.set;
  storeFn.subscribe = api.subscribe;
  storeFn.destroy = api.destroy;
  storeFn.select = (selector, options) => computed(() => selector(stateSignal()), options);

  return storeFn;
}
