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
});

