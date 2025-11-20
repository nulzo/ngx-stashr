# ngx-store

A slim, signal-based state management library for Angular 21. 

Inspired by Zustand.

## Installation

_TODO: need to finishing publishing_

## Usage

### Create a store

Define your state and actions in a store file (e.g., `counter.store.ts`).

```typescript
import { createStore } from 'ngx-store';

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const counterStore = createStore<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));
```

### Use in your components

Use the store directly in your components. It's just a signal really.

```typescript
import { Component } from '@angular/core';
import { counterStore } from './counter.store';

@Component({
  selector: 'app-counter',
  standalone: true,
  template: `
    <h1>Count: {{ store().count }}</h1>
    <button (click)="store().increment()">+</button>
    <button (click)="store().decrement()">-</button>
    <button (click)="store().reset()">Reset</button>
  `
})
export class CounterComponent {
  readonly store = counterStore;
}
```

### Selectors (ie computed state)

You can create computed signals for specific slices of state. This can further optimize performance if needed.

```typescript
@Component({ ... })
export class CounterDisplayComponent {
  readonly store = counterStore;
  
  // only updates when count changes
  readonly count = this.store.select(state => state.count);
  
  // derived state
  readonly doubleCount = this.store.select(state => state.count * 2);
}
```

## Middleware

### Persust

You can persist state to `localStorage` (or any other storage) using the `persist` middleware.

```typescript
import { createStore, persist } from 'ngx-store';

export const settingsStore = createStore(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'light' ? 'dark' : 'light' 
      })),
    }),
    {
      name: 'app-settings', // unique name
      // storage: sessionStorage // optional, just defaults as localStorage
    }
  )
);
```

### Logging and debugging

You can debug the state mutations with the `logger` middleware. It will report the previous state, action, and next state to the console.

```typescript
import { createStore, logger } from 'ngx-store';

export const store = createStore(
  logger(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 }), false, 'increment')
    }),
    { 
      name: 'CounterStore',
      enabled: true // defaults to true
    }
  )
);
```

### Chaining middlwares

You can compose middleware by swallowing. Just make sure `persist` sits as the outer wrapper if chaining it.

```typescript
export const store = createStore(
  persist(
    logger(
      (set) => ({ count: 0 }),
      { name: 'MyStore' }
    ),
    { name: 'storage-key' }
  )
);
```

## Core API

### `createStore<T>(setup: StateCreator<T>)`

Creates a store. Returns a Signal that also contains API methods.

### Store Methods

- `store()`: Get the current state (signal).
- `store.get()`: Get the current state (non-reactive readonly snapshot).
- `store.set(partial, replace?, ...args)`: Update state. `partial` can be an object or a function `(state) => partial`. Optional `args` are passed to listeners (just useful for logging actions).
- `store.select(selector)`: Create a computed signal from the state.
- `store.subscribe(listener)`: Subscribe to state changes manually.
