import { createStash } from '../core/store';
import { logger } from './logger';
import { persist } from './persist';

interface TestState {
  count: number;
}

describe('logger middleware', () => {
  let consoleSpy: any;
  let groupSpy: any;
  let groupEndSpy: any;

  beforeEach(() => {
    consoleSpy = spyOn(console, 'log');
    groupSpy = spyOn(console, 'groupCollapsed');
    groupEndSpy = spyOn(console, 'groupEnd');
  });

  it('should log state changes', () => {
    const useStore = createStash(
      logger<TestState>(
        (set) => ({ count: 0 }),
        { name: 'test-store' }
      )
    );

    useStore.set({ count: 1 }, false, 'increment');

    expect(groupSpy).toHaveBeenCalled();
    const groupArgs = groupSpy.calls.mostRecent().args;
    expect(groupArgs[0]).toContain('test-store');
    expect(groupArgs[0]).toContain('increment');

    expect(consoleSpy).toHaveBeenCalledWith(
      '%c prev state',
      jasmine.any(String),
      { count: 0 }
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      '%c next state',
      jasmine.any(String),
      { count: 1 }
    );

    expect(groupEndSpy).toHaveBeenCalled();
  });

  it('should use default action name if not provided', () => {
    const useStore = createStash(
      logger<TestState>(
        (set) => ({ count: 0 })
      )
    );

    useStore.set({ count: 1 });

    expect(groupSpy).toHaveBeenCalled();
    const groupArgs = groupSpy.calls.mostRecent().args;
    expect(groupArgs[0]).toContain('anonymous');
  });

  it('should not log if disabled', () => {
    const useStore = createStash(
      logger<TestState>(
        (set) => ({ count: 0 }),
        { enabled: false }
      )
    );

    useStore.set({ count: 1 });

    expect(groupSpy).not.toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should handle groupCollapsed error (fallback to log)', () => {
    groupSpy.and.throwError('Console error');

    const useStore = createStash(
      logger<TestState>(
        (set) => ({ count: 0 }),
        { name: 'test-fallback' }
      )
    );

    expect(() => useStore.set({ count: 1 })).not.toThrow();

    // Should fall back to console.log for the header
    expect(consoleSpy).toHaveBeenCalledWith(jasmine.stringMatching(/test-fallback/));
  });
});

describe('middleware composition (integration)', () => {
  let mockStorage: {
    getItem: jasmine.Spy;
    setItem: jasmine.Spy;
    removeItem: jasmine.Spy;
  };

  beforeEach(() => {
    mockStorage = {
      getItem: jasmine.createSpy('getItem').and.returnValue(null),
      setItem: jasmine.createSpy('setItem'),
      removeItem: jasmine.createSpy('removeItem'),
    };
    // Silence logs for integration test
    spyOn(console, 'log');
    spyOn(console, 'groupCollapsed');
    spyOn(console, 'groupEnd');
  });

  it('should work with persist(logger(...))', () => {
    const useStore = createStash<TestState>(
      persist(
        logger(
          (set) => ({ count: 0 }),
          { name: 'inner-logger' }
        ),
        { name: 'outer-persist', storage: mockStorage }
      )
    );

    useStore.set({ count: 1 }, false, 'update');

    // State should update
    expect(useStore().count).toBe(1);

    // Logger should have run with the action name intact
    expect(console.groupCollapsed).toHaveBeenCalled();
    const groupArgs = (console.groupCollapsed as jasmine.Spy).calls.mostRecent().args;
    expect(groupArgs[0]).toContain('update');

    // Persist should have run
    expect(mockStorage.setItem).toHaveBeenCalled();
  });

  it('should work with logger(persist(...))', () => {
    const useStore = createStash<TestState>(
      logger(
        persist(
          (set) => ({ count: 0 }),
          { name: 'inner-persist', storage: mockStorage }
        ),
        { name: 'outer-logger' }
      )
    );

    useStore.set({ count: 1 }, false, 'update');

    // State should update
    expect(useStore().count).toBe(1);

    // Logger should have run with the action name intact
    expect(console.groupCollapsed).toHaveBeenCalled();
    const groupArgs = (console.groupCollapsed as jasmine.Spy).calls.mostRecent().args;
    expect(groupArgs[0]).toContain('update');

    // Persist should have run
    expect(mockStorage.setItem).toHaveBeenCalled();
  });

  it('should behave identically regardless of composition order', () => {
    const listenerSpy = jasmine.createSpy('listener');

    const persistOuter = createStash<TestState>(
      persist(logger(() => ({ count: 0 })), { name: 'order-a', storage: mockStorage })
    );
    const loggerOuter = createStash<TestState>(
      logger(persist(() => ({ count: 0 }), { name: 'order-b', storage: mockStorage }))
    );

    persistOuter.subscribe(listenerSpy);
    loggerOuter.subscribe(listenerSpy);

    persistOuter.set({ count: 1 }, false, 'a');
    loggerOuter.set({ count: 1 }, false, 'b');

    // both orders forward action args to subscribers
    expect(listenerSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ count: 1 }),
      jasmine.objectContaining({ count: 0 }),
      'a'
    );
    expect(listenerSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ count: 1 }),
      jasmine.objectContaining({ count: 0 }),
      'b'
    );
  });
});
