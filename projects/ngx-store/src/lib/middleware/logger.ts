import { StateCreator, StoreApi } from '../core/types';

export interface LoggerOptions {
  /**
   * Name of the store to display in logs.
   * Defaults to 'NgxStore'.
   */
  name?: string;
  
  /**
   * Enable or disable logging.
   * Defaults to true.
   */
  enabled?: boolean;
  
  /**
   * Custom log function.
   */
  log?: (...args: any[]) => void;
}

export const logger = <T extends object>(
  config: StateCreator<T>,
  options: LoggerOptions = {}
): StateCreator<T> => {
  return (set, get, api) => {
    const enabled = options.enabled ?? true;
    const storeName = options.name ?? 'NgxStore';
    const log = options.log ?? console.log;
    
    // Safe console methods for environments where they might not exist
    const groupCollapsed = (console.groupCollapsed || console.log).bind(console);
    const groupEnd = (console.groupEnd || console.log).bind(console);

    const loggedSet: StoreApi<T>['set'] = (partial, replace, ...args) => {
      if (!enabled) {
        set(partial, replace, ...args);
        return;
      }

      const prevState = get();
      const action = args[0] ?? 'anonymous'; // Assume first extra arg is action name

      set(partial, replace, ...args);
      
      const nextState = get();
      
      const time = new Date();
      const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}.${time.getMilliseconds().toString().padStart(3, '0')}`;

      try {
        // CSS styling for console logs
        const headerCss = [
          'color: gray; font-weight: lighter;', // name
          'color: gray; font-weight: lighter;', // time
          'color: inherit; font-weight: bold;'  // action
        ];
        
        groupCollapsed(
          `%c${storeName}%c @ ${timeStr} %c${action}`, 
          ...headerCss
        );
      } catch (e) {
        log(`${storeName} @ ${timeStr} ${action}`);
      }

      log('%c prev state', 'color: #9E9E9E; font-weight: bold', prevState);
      log('%c action    ', 'color: #03A9F4; font-weight: bold', { type: action, payload: partial });
      log('%c next state', 'color: #4CAF50; font-weight: bold', nextState);

      try {
        groupEnd();
      } catch (e) {}
    };

    api.set = loggedSet;

    return config(loggedSet, get, api);
  };
};

