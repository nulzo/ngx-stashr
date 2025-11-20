import { createStash } from '../core/store';
import { persist } from './persist';

interface TestState {
  count: number;
}

describe('persist middleware', () => {
  let mockStorage: any;

  beforeEach(() => {
    mockStorage = {
      getItem: jasmine.createSpy('getItem').and.returnValue(null),
      setItem: jasmine.createSpy('setItem'),
      removeItem: jasmine.createSpy('removeItem'),
      clear: jasmine.createSpy('clear'),
      key: jasmine.createSpy('key'),
      length: 0
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
            partialize: (state) => ({ count: state.count })
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
