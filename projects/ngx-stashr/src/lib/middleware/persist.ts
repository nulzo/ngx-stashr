import { StateCreator } from '../core/types';

/**
 * Minimal storage contract. Satisfied by `localStorage`/`sessionStorage`,
 * but decoupled from the DOM `Storage` type so any backend can be adapted.
 */
export interface StateStorage {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
}

export interface PersistOptions<T> {
  /**
   * Unique name for the storage key
   */
  name: string;

  /**
   * Storage engine to use. Defaults to localStorage.
   */
  storage?: StateStorage;

  /**
   * Filter parts of the state to persist.
   */
  partialize?: (state: T) => Partial<T>;

  /**
   * Version number for the stored state.
   * On mismatch, hydration is skipped unless `migrate` is provided.
   */
  version?: number;

  /**
   * Migrate persisted state from an older version to the current one.
   */
  migrate?: (persistedState: unknown, version: number) => Partial<T>;

  /**
   * Custom merge for combining persisted state with the current state
   * during hydration. Defaults to a shallow merge.
   */
  merge?: (persistedState: unknown, currentState: T) => T;
}

export const persist = <T extends object>(
  config: StateCreator<T>,
  options: PersistOptions<T>
): StateCreator<T> => {
  return (set, get, api) => {
    const storage =
      options.storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    const version = options.version ?? 0;

    const initialState = config(set, get, api);

    if (!storage) {
      return initialState;
    }

    const save = (state: T) => {
      try {
        const stateToSave = options.partialize ? options.partialize(state) : state;
        storage.setItem(options.name, JSON.stringify({ state: stateToSave, version }));
      } catch (e) {
        console.error('[ngx-stashr/persist] Error saving to storage:', e);
      }
    };

    // subscribe instead of wrapping set: composes transparently in any
    // middleware order and never writes when a set bails out as a no-op.
    api.subscribe(save);

    const merge =
      options.merge ??
      ((persistedState: unknown, currentState: T) => ({
        ...currentState,
        ...(persistedState as Partial<T>),
      }));

    try {
      const item = storage.getItem(options.name);
      const stored = item
        ? (JSON.parse(item) as { state?: Partial<T>; version?: number })
        : null;

      if (stored?.state) {
        const storedVersion = stored.version ?? 0;

        if (storedVersion === version) {
          return merge(stored.state, initialState);
        }

        if (options.migrate) {
          const migrated = merge(options.migrate(stored.state, storedVersion), initialState);
          // write back so the stored version bumps and migration runs once
          save(migrated);
          return migrated;
        }

        console.warn(
          `[ngx-stashr/persist] Version mismatch for "${options.name}" ` +
            `(stored: ${storedVersion}, current: ${version}). Skipping hydration.`
        );
      }
    } catch (e) {
      console.error('[ngx-stashr/persist] Error hydrating from storage:', e);
    }

    return initialState;
  };
};
