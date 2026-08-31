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
  log?: (...args: unknown[]) => void;
}

export const logger = <T extends object>(
  config: StateCreator<T>,
  options: LoggerOptions = {}
): StateCreator<T> => {
  return (set, get, api) => {
    const enabled = options.enabled ?? true;
    const storeName = options.name ?? 'NgxStore';
    const log = options.log ?? console.log;

    const loggedSet: StoreApi<T>['set'] = (partial, replace, ...args) => {
      if (!enabled) {
        set(partial, replace, ...args);
        return;
      }

      const prevState = get();
      const action = args[0] ?? 'anonymous';

      set(partial, replace, ...args);

      const nextState = get();
      const time = new Date().toLocaleTimeString('en-GB', {
        hour12: false,
        fractionalSecondDigits: 3,
      });

      try {
        console.groupCollapsed(
          `%c${storeName}%c @ ${time} %c${action}`,
          'color: gray; font-weight: lighter;',
          'color: gray; font-weight: lighter;',
          'color: inherit; font-weight: bold;'
        );
      } catch {
        log(`${storeName} @ ${time} ${action}`);
      }

      log('%c prev state', 'color: #9E9E9E; font-weight: bold', prevState);
      log('%c action    ', 'color: #03A9F4; font-weight: bold', { type: action, payload: partial });
      log('%c next state', 'color: #4CAF50; font-weight: bold', nextState);

      try {
        console.groupEnd();
      } catch {
        // grouping unsupported; nothing to close
      }
    };

    api.set = loggedSet;

    return config(loggedSet, get, api);
  };
};
