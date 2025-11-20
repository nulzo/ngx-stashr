import { StateCreator } from '../core/types';

export interface PersistOptions<T> {
  /**
   * Unique name for the storage key
   */
  name: string;
  
  /**
   * Storage engine to use. Defaults to localStorage.
   */
  storage?: Storage;
  
  /**
   * Filter parts of the state to persist.
   */
  partialize?: (state: T) => Partial<T>;
  
  /**
   * Version number for the stored state. 
   */
  version?: number;
}

export const persist = <T extends object>(
  config: StateCreator<T>,
  options: PersistOptions<T>
): StateCreator<T> => {
  return (set, get, api) => {
    const storage = options.storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
    const key = options.name;
    
    // Wrap set to persist changes
    const savedSet = api.set;
    
    api.set = (partial, replace) => {
      savedSet(partial, replace);
      
      if (!storage) return;
      
      const state = get();
      const stateToSave = options.partialize ? options.partialize(state) : state;
      
      try {
        const serialized = JSON.stringify({ 
          state: stateToSave, 
          version: options.version || 0 
        });
        storage.setItem(key, serialized);
      } catch (e) {
        console.error('[ngx-store/persist] Error saving to storage:', e);
      }
    };

    // Initialize base state
    let initialState = config(api.set, get, api);
    
    // Hydrate from storage
    if (storage) {
      try {
        const item = storage.getItem(key);
        if (item) {
          const { state: storedState } = JSON.parse(item);
          if (storedState) {
            initialState = { ...initialState, ...storedState };
          }
        }
      } catch (e) {
        console.error('[ngx-store/persist] Error hydrating from storage:', e);
      }
    }

    return initialState;
  };
};

