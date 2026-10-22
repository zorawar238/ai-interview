# Debugging & Incident Log

This document records technical issues, root causes, and verified engineering resolutions encountered throughout the platform's development.

---

## Incident 001: Next.js 16 Proxy Convention Deprecation Warning

- **Date:** 2026-10-14
- **Component:** `src/middleware.ts` -> `src/proxy.ts`
- **Symptom:**
  ```text
  The "middleware" file convention is deprecated, please use "proxy" instead.
  Read more: https://nextjs.org/docs/messages/deprecated-middleware
  ```
- **Root Cause:** Next.js 16 introduces the official `proxy` convention to separate edge request modification from general Node runtime middleware.
- **Resolution:**
  1. Renamed `src/middleware.ts` to `src/proxy.ts`.
  2. Updated the exported handler signature to:
     ```typescript
     export async function proxy(request: NextRequest) {
       return await updateSession(request)
     }
     ```
  3. Verified build with `next build`. Deprecation warning eliminated.

---

## Incident 002: Server Actions Missing `'use server'` Directive

- **Date:** 2026-10-12
- **Component:** `src/app/login/actions.ts`
- **Symptom:** Login and signup form actions failed with server action serialization errors when called from client components.
- **Root Cause:** Server actions require an explicit `'use server'` directive at the top of the file so Next.js generates remote procedure call (RPC) endpoint stubs.
- **Resolution:**
  - Added `'use server'` to the very first line of `src/app/login/actions.ts`.
  - Re-tested email/password sign-in and sign-up flows.

---

## Incident 003: React 19 Hydration Mismatch with In-Browser Web Speech APIs

- **Date:** 2026-10-14
- **Component:** `src/hooks/useWebSpeech.ts`
- **Symptom:**
  ```text
  Warning: Expected server HTML to contain matching text/markup in <div>.
  Cascading render warning during useEffect setState.
  ```
- **Root Cause:**
  - `window.SpeechRecognition` and `window.speechSynthesis` exist only on the browser window and are absent during SSR.
  - Setting state inside `useEffect` during initial mount caused an immediate client-side re-render, violating React 19's concurrent rendering rules.
- **Resolution:**
  - Refactored `useWebSpeech.ts` to use React 19's `useSyncExternalStore`:
    ```typescript
    const isSupported = useSyncExternalStore(
      subscribeNoop,
      () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition),
      () => false // Server snapshot
    )
    ```
  - Eliminates cascading renders, satisfies SSR hydration, and guarantees zero hydration mismatch warnings.

---

## Incident 004: Mid-Card Page Splitting During Report PDF Export

- **Date:** 2026-10-14
- **Component:** `src/app/globals.css` (`@media print`)
- **Symptom:**
  - When candidates printed their interview results or saved to PDF via `Ctrl+P`, question evaluation cards were split horizontally across two pages, cutting text and code snippets in half.
- **Root Cause:**
  - Modern web browsers permit page breaks inside block elements by default unless explicit CSS page break properties are defined.
- **Resolution:**
  - Added strict print rules in `src/app/globals.css`:
    ```css
    @media print {
      .question-card, .break-inside-avoid {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
    ```
  - Question cards and code snippets now cleanly push to the next page when reaching a page boundary.

---

## Incident 005: Turbopack Subprocess Argument Module Tracing Warning

- **Date:** 2026-10-22
- **Component:** `src/app/api/execute/route.ts`
- **Symptom:**
  ```text
  Warning: Module not found: Can't resolve (<dynamic> | '--experimental-strip-types' | '' | '-u')
  ```
- **Root Cause:**
  - Turbopack's static AST scanner analyzed `child_process['spawn']` with argument arrays containing flags like `'--experimental-strip-types'` and mistakenly checked if they resolved to bundled modules.
- **Resolution:**
  - Modernized the import to direct ESM `import { spawn } from 'node:child_process'`.
  - Maintained explicit string typing on argument arrays to ensure type safety.
