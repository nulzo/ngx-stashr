import { createStash } from '../core/store';
import { persist } from './persist';

interface TestState {
  count: number;
}

describe('persist middleware', () => {
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
  });

  it('should persist state to storage', () => {
    const useStore = createStash(
      persist<TestState>(
        () => ({ count: 0 }),
        { name: 'test-storage', storage: mockStorage }
      )
    );

    useStore.set({ count: 1 });
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      'test-storage',
      jasmine.stringMatching(/"count":1/)
    );
  });

  it('should not write to storage when a set bails out as a no-op', () => {
    const useStore = createStash(
      persist<TestState>(
        () => ({ count: 0 }),
        { name: 'test-noop', storage: mockStorage }
      )
    );

    useStore.set((state) => state); // same reference → no state change
    expect(mockStorage.setItem).not.toHaveBeenCalled();
  });

  it('should hydrate state from storage', () => {
    mockStorage.getItem.and.returnValue(JSON.stringify({ state: { count: 10 }, version: 0 }));

    const useStore = createStash(
      persist<TestState>(
        () => ({ count: 0 }),
        { name: 'test-storage', storage: mockStorage }
      )
    );

    expect(useStore().count).toBe(10);
  });

  it('should merge stored state over defaults while keeping default keys', () => {
    mockStorage.getItem.and.returnValue(JSON.stringify({ state: { count: 10 }, version: 0 }));

    interface WithDefaults {
      count: number;
      label: string;
    }

    const useStore = createStash(
      persist<WithDefaults>(
        () => ({ count: 0, label: 'default' }),
        { name: 'test-merge', storage: mockStorage }
      )
    );

    expect(useStore().count).toBe(10);
    expect(useStore().label).toBe('default');
  });

  it('should skip hydration on version mismatch when no migrate is provided', () => {
    mockStorage.getItem.and.returnValue(JSON.stringify({ state: { count: 10 }, version: 1 }));
    const warnSpy = spyOn(console, 'warn');

    const useStore = createStash(
      persist<TestState>(
        () => ({ count: 0 }),
        { name: 'test-version', storage: mockStorage, version: 2 }
      )
    );

    expect(useStore().count).toBe(0);
    expect(warnSpy).toHaveBeenCalledWith(jasmine.stringMatching(/Version mismatch/));
  });

  it('should migrate persisted state on version mismatch', () => {
    mockStorage.getItem.and.returnValue(JSON.stringify({ state: { count: 10 }, version: 1 }));

    const useStore = createStash(
      persist<TestState>(
        () => ({ count: 0 }),
        {
          name: 'test-migrate',
          storage: mockStorage,
          version: 2,
          migrate: (persistedState, version) => {
            expect(version).toBe(1);
            return { count: (persistedState as TestState).count * 10 };
          },
        }
      )
    );

    expect(useStore().count).toBe(100);
  });

  it('should partialize state', () => {
    interface ComplexState {
      count: number;
      ignored: string;
    }

    const useStore = createStash(
      persist<ComplexState>(
        () => ({ count: 0, ignored: 'skip' }),
        {
          name: 'test-partial',
          storage: mockStorage,
          partialize: (state) => ({ count: state.count }),
        }
      )
    );

    useStore.set({ count: 1, ignored: 'change' });

    expect(mockStorage.setItem).toHaveBeenCalled();
    const args = mockStorage.setItem.calls.mostRecent().args;
    expect(args[1]).toContain('"count":1');
    expect(args[1]).not.toContain('"ignored":"change"');
  });

  it('should handle storage.setItem errors gracefully', () => {
    const consoleSpy = spyOn(console, 'error');
    mockStorage.setItem.and.throwError('QuotaExceeded');

    const useStore = createStash(
      persist<TestState>(
        () => ({ count: 0 }),
        { name: 'test-error', storage: mockStorage }
      )
    );

    // Should not throw
    expect(() => useStore.set({ count: 1 })).not.toThrow();

    // Should log error
    expect(consoleSpy).toHaveBeenCalledWith(
      jasmine.stringMatching(/Error saving to storage/),
      jasmine.anything()
    );
  });

  it('should handle storage.getItem errors gracefully', () => {
    const consoleSpy = spyOn(console, 'error');
    mockStorage.getItem.and.throwError('AccessDenied');

    let useStore: any;

    // Should not throw during initialization
    expect(() => {
      useStore = createStash(
        persist<TestState>(
          () => ({ count: 0 }),
          { name: 'test-hydrate-error', storage: mockStorage }
        )
      );
    }).not.toThrow();

    // Should have default state
    expect(useStore().count).toBe(0);

    // Should log error
    expect(consoleSpy).toHaveBeenCalledWith(
      jasmine.stringMatching(/Error hydrating from storage/),
      jasmine.anything()
    );
  });

  it('should not crash if storage is undefined', () => {
    const useStore = createStash(
      persist<TestState>(
        () => ({ count: 0 }),
        { name: 'test-no-storage', storage: undefined }
      )
    );

    expect(() => useStore.set({ count: 1 })).not.toThrow();
    expect(useStore().count).toBe(1);
  });
});
