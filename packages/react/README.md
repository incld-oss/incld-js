# @incld/react

Shared React provider, async behavior, accessible primitives, theming, labels, and error helpers for every INCLD feature package.

## Install and configure

```bash
npm install @incld/client @incld/react
```

```tsx
import {IncldProvider} from '@incld/react';
import '@incld/react/styles.css';

export function Providers({children}: {children: React.ReactNode}) {
  return (
    <IncldProvider
      baseUrl="/api/incld"
      appearance={{
        colorScheme: 'system',
        accentColor: 'emerald',
        radius: 'large',
        density: 'comfortable',
        variables: {fontFamily: 'Inter, sans-serif'},
      }}
      labels={{loading: 'Please wait', retry: 'Try again'}}
      onError={error => reportError(error.code, error.requestId)}
    >
      {children}
    </IncldProvider>
  );
}
```

The provider uses `IncldBrowser`, never a project secret. Mount a framework proxy under `/api/incld/v1/*`; the browser client appends `/v1` to the provider base URL.

## IncldProvider props

| Prop | Type | Default / behavior |
| --- | --- | --- |
| `children` | `ReactNode` | Required |
| `client` | `IncldBrowser` | Optional preconstructed client |
| `baseUrl` | `string` | `/api/incld`; ignored when `client` is supplied |
| `appearance` | `IncldAppearance` | System scheme, indigo, medium radius, comfortable density |
| `labels` | `Record<string, string>` | `{}`; shared localization overrides |
| `onError` | `(error: IncldError) => void` | Called by feature mutation hooks |
| `className` | `string` | Added to `.incld-root` |
| `style` | `CSSProperties` | Merged after mapped theme variables |

`appearance` accepts `colorScheme: 'light' | 'dark' | 'system'`, `accentColor: 'indigo' | 'blue' | 'emerald' | 'amber' | 'rose'`, `radius: 'small' | 'medium' | 'large'`, and `density: 'compact' | 'comfortable'`.

Theme variable keys are `accent`, `accentHover`, `accentContrast`, `accentInk`, `accentSoft`, `background`, `surface`, `surfaceHover`, `border`, `text`, `muted`, `danger`, `dangerSoft`, `dangerBorder`, `success`, `successSoft`, `successBorder`, `warning`, `warningSoft`, `warningBorder`, `radius`, `spacing`, `shadow`, `fontFamily`, `fontSize`, `lineHeight`, and `focusRing`. They map to `--incld-*` properties on the provider root.

## Hooks

- `useIncld()` returns `client`, resolved `appearance`, `labels`, `version`, `refresh()`, and `reportError(error)`. It throws outside a provider.
- `useIncldLabel(key, fallback)` returns a provider label or the fallback.
- `useAsyncResource(loader, dependencies)` is an abort-aware loader returning `{data, error, status, refresh}`. Status is `idle | loading | success | error`.

Mutations in feature packages call provider `refresh()`, causing mounted query hooks to refetch.

## Async component contract

List/detail components use:

```ts
interface AsyncViewProps {
  loading?: ReactNode;
  empty?: ReactNode;
  error?: (error: IncldError, retry: () => void) => ReactNode;
}
```

Omitted renderers use the accessible defaults below.

## Primitives

| Export | Props / behavior |
| --- | --- |
| `IncldButton` | Native button props plus `busy?`; disables and sets `aria-busy` |
| `IncldDialog` | `open`, `onOpenChange`, `title`, `children`, `description?`, `className?`, `backdropClassName?`, `closeLabel?`; focus trap, Escape/backdrop close, focus restoration |
| `IncldSpinner` | `label?`, `className?`; `role=status` |
| `IncldEmptyState` | `title`, `description?`, `className?` |
| `IncldErrorState` | `error`, `retry`, `className?`; `role=alert` |
| `IncldFieldError` | `error?`, `fields: string | string[]`, `id?`, `className?` |
| `errorMessagesFor` | `(error, ...fields)` returns deduplicated field messages |

Import each feature package's stylesheet once in addition to the shared stylesheet. Do not nest providers unless you intentionally need a separate browser client and refresh boundary.
