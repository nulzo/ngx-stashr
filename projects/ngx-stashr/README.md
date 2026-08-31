# ngx-stashr

A slim, signal-based library for stashing state in Angular 21. 

Inspired by React's [Zustand](https://github.com/pmndrs/zustand).

## Installation

```bash
npm i ngx-stashr
```

## Usage

### Create a stash

Define your state and actions in a state file (e.g., `counter.state.ts`).

```typescript
import { createStash } from 'ngx-stashr';

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const counterStash = createStash<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));
```

### Use in your components

Use the stash directly in your components. It's just a signal really.

```typescript
import { Component } from '@angular/core';
import { counterStash } from './counter.state';

@Component({
  selector: 'app-counter',
  template: `
    <h1>Count: {{ stash().count }}</h1>
    <button (click)="stash().increment()">+</button>
    <button (click)="stash().decrement()">-</button>
    <button (click)="stash().reset()">Reset</button>
  `
})
export class CounterComponent {
  readonly stash = counterStash;
}
```

### Selectors (ie computed state)

You can create computed signals for specific slices of state. This can further optimize performance if needed.

```typescript
@Component({ ... })
export class CounterDisplayComponent {
  readonly stash = counterStash;
  
  // only updates when count changes
  readonly count = this.stash.select(state => state.count);
  
  // derived state
  readonly doubleCount = this.stash.select(state => state.count * 2);
}
```

When selecting object or array slices, pass `shallow` as the equality function so consumers only update when the items actually change (selectors return fresh references otherwise):

```typescript
import { createStash, shallow } from 'ngx-stashr';

readonly items = this.stash.select(state => state.items, { equal: shallow });
```

## Middleware

### Persist

You can persist state to `localStorage` (or any other storage) using the `persist` middleware.

```typescript
import { createStash, persist } from 'ngx-stashr';

export const settingsStash = createStash(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'light' ? 'dark' : 'light' 
      })),
    }),
    {
      name: 'app-settings', // unique name
      // storage: sessionStorage // optional, defaults to localStorage
      // partialize: (state) => ({ theme: state.theme }), // optional, pick what to persist
      // version: 1, // optional, bump to invalidate old stored state
      // migrate: (persisted, version) => ({ theme: 'light' }), // optional, runs on version mismatch
      // merge: (persisted, current) => ({ ...current, ...persisted }), // optional, custom hydration merge
    }
  )
);
```

The `storage` option accepts any `StateStorage` (`getItem` / `setItem` / `removeItem`), so `localStorage`, `sessionStorage`, or your own adapter all work.

### Logging and debugging

You can debug the state mutations with the `logger` middleware. It will report the previous state, action, and next state to the console.

```typescript
import { createStash, logger } from 'ngx-stashr';

export const stash = createStash(
  logger(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 }), false, 'increment')
    }),
    { 
      name: 'CounterStash',
      enabled: true // defaults to true
    }
  )
);
```

### Chaining middleware

You can compose middleware by wrapping. Composition order does not matter — `persist` subscribes to state changes rather than wrapping `set`, so action names and listeners behave identically in any order.

```typescript
export const stash = createStash(
  persist(
    logger(
      (set) => ({ count: 0 }),
      { name: 'MyStash' }
    ),
    { name: 'storage-key' }
  )
);
```

## Core API

### `createStash<T>(setup: StateCreator<T>)`

Creates a stash. Returns a Signal that also contains API methods.

### Stash Methods

- `stash()`: Get the current state (signal).
- `stash.get()`: Get the current state (non-reactive readonly snapshot).
- `stash.getInitialState()`: Get the state the stash was created with (after hydration). Useful for resets: `stash.set(stash.getInitialState(), true)`.
- `stash.set(partial, replace?, ...args)`: Update state. `partial` can be an object or a function `(state) => partial`. Pass `replace: true` to replace the state entirely (requires the full state). Optional `args` are passed to listeners (just useful for logging actions).
- `stash.select(selector, options?)`: Create a computed signal from the state. Accepts computed options, e.g. `{ equal: shallowEqual }` to customize change detection for the selected slice.
- `stash.subscribe(listener)`: Subscribe to state changes manually.
- `stash.destroy()`: Clear all listeners.
