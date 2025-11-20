import { createStash } from '../core/store';
import { logger } from './logger';

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
});

