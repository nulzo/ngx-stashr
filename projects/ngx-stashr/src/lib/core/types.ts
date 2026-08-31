import { CreateComputedOptions, Signal } from '@angular/core';

export type State = object;

export type PartialState<T> = Partial<T> | ((state: T) => Partial<T>);
export type StateListener<T> = (state: T, previousState: T, ...args: unknown[]) => void;

/**
 * Strictly typed state updater:
 * merging accepts a partial, replacing requires the full state.
 */
export type SetState<T> = {
  (partial: PartialState<T>, replace?: false, ...args: unknown[]): void;
  (state: T | ((state: T) => T), replace: true, ...args: unknown[]): void;
};

export interface StoreApi<T> {
  /**
   * Get the current state value (non-reactive).
   */
  get: () => T;

  /**
   * Update the state.
   * Can pass a partial state object or a function that receives current state and returns partial state.
   * The new state is merged with the existing state (shallow merge).
   *
   * Broad signature used for internal plumbing and middleware composition.
   * The public `Store<T>` exposes the stricter `SetState<T>` overloads.
   *
   * @param partial Partial state or updater function
   * @param replace If true, replaces the state entirely instead of merging
   * @param args Additional arguments that may be used by middleware
   */
  set: (partial: PartialState<T>, replace?: boolean, ...args: unknown[]) => void;

  /**
   * Subscribe to state changes.
   * @returns A cleanup function to unsubscribe
   */
  subscribe: (listener: StateListener<T>) => () => void;

  /**
   * Clean up the store (will clear listeners).
   */
  destroy: () => void;
}

export type Store<T> = Signal<T> &
  Omit<StoreApi<T>, 'set'> & {
    set: SetState<T>;

    /**
     * Select a slice of state as a computed signal.
     * Only notifies consumers when the selected value changes
     * (customizable via `options.equal`, e.g. a shallow comparison).
     */
    select: <K>(selector: (state: T) => K, options?: CreateComputedOptions<K>) => Signal<K>;
  };

// initializer function.
export type StateCreator<T> = (
  set: StoreApi<T>['set'],
  get: StoreApi<T>['get'],
  api: StoreApi<T>
) => T;
