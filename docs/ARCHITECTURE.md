# ארכיטקטורת האפליקציה

## סקירה כללית

האפליקציה בנויה על Next.js 16 עם App Router, TypeScript, ו-Supabase כמסד נתונים.

## מבנה הפרויקט

```
autohub/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes group
│   ├── (home)/                   # Home routes group
│   ├── api/                      # API routes
│   │   ├── middleware/          # API middleware
│   │   └── v1/                  # Versioned API
│   ├── components/              # Page-specific components
│   │   └── home/                # Home page components
│   ├── error.tsx                # Error page
│   ├── not-found.tsx            # 404 page
│   └── global-error.tsx         # Global error handler
│
├── components/                   # Shared components
│   ├── ui/                      # Design system
│   │   ├── Button.tsx
│   │   └── ...
│   ├── ErrorBoundary.tsx        # Error boundary component
│   └── ...
│
├── lib/
│   ├── api/                     # API client & middleware
│   │   └── middleware/
│   │       ├── auth.ts          # Authentication middleware
│   │       ├── validation.ts    # Request validation
│   │       └── error-handler.ts # Error handling
│   ├── config/                  # Configuration
│   │   └── env.ts              # Environment variables
│   ├── repositories/            # Data access layer
│   │   ├── BaseRepository.ts
│   │   └── PostsRepository.ts
│   ├── store/                   # State management
│   │   └── useAppStore.ts      # Zustand store
│   ├── hooks/                   # Custom hooks
│   ├── utils/                   # Utilities
│   └── types/                   # TypeScript types
│
├── __tests__/                   # Tests
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   └── e2e/                     # E2E tests
│
└── docs/                        # Documentation
    └── ARCHITECTURE.md
```

## שכבות האפליקציה

### 1. Presentation Layer (Components)
- **Location**: `app/components/`, `components/`
- **Responsibility**: UI rendering, user interactions
- **Pattern**: Container/Presentational components

### 2. Business Logic Layer (Hooks & Store)
- **Location**: `lib/hooks/`, `lib/store/`
- **Responsibility**: State management, business logic
- **Pattern**: Custom hooks, Zustand store

### 3. Data Access Layer (Repositories)
- **Location**: `lib/repositories/`
- **Responsibility**: Database operations, data fetching
- **Pattern**: Repository pattern

### 4. API Layer (Routes & Middleware)
- **Location**: `app/api/`
- **Responsibility**: API endpoints, request handling
- **Pattern**: Middleware composition

## State Management

### Zustand Store
- **Location**: `lib/store/useAppStore.ts`
- **Usage**: Global application state (user, notifications, UI state)
- **Benefits**: Lightweight, no boilerplate, TypeScript support

### Local State
- **Pattern**: `useState` for component-specific state
- **When to use**: State that doesn't need to be shared

## Error Handling

### Error Boundaries
- **Component**: `components/ErrorBoundary.tsx`
- **Usage**: Wrap components to catch React errors
- **Pages**: `app/error.tsx`, `app/not-found.tsx`, `app/global-error.tsx`

### API Error Handling
- **Middleware**: `lib/api/middleware/error-handler.ts`
- **Pattern**: Centralized error handling with logging

## Testing Strategy

### Unit Tests
- **Framework**: Jest + React Testing Library
- **Location**: `__tests__/unit/`
- **Coverage**: Components, utilities, hooks

### Integration Tests
- **Framework**: Jest
- **Location**: `__tests__/integration/`
- **Coverage**: API routes, repositories

### E2E Tests
- **Framework**: Playwright
- **Location**: `__tests__/e2e/`
- **Coverage**: User flows, critical paths

## Best Practices

### 1. Component Organization
- Split large components into smaller, focused components
- Use Container/Presentational pattern
- Keep components under 200 lines when possible

### 2. Type Safety
- Use TypeScript strictly
- Define types in `lib/types/`
- Use Zod for runtime validation

### 3. Performance
- Use `React.memo` for expensive components
- Implement code splitting with `dynamic()`
- Use `useMemo` and `useCallback` appropriately

### 4. Code Quality
- Follow ESLint rules
- Write tests for critical functionality
- Document complex logic

## Future Improvements

1. **Caching Strategy**: Implement React Query or SWR
2. **Monitoring**: Integrate Sentry for error tracking
3. **Analytics**: Add user analytics
4. **Performance**: Implement service workers for offline support



