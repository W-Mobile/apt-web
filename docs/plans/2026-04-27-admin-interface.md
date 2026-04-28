# APT Admin Interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a protected admin interface at `/admin` in apt-web where ADMINS-group users can manage Exercises, Workouts, and Programs (CRUD) — replacing the current Google Sheets + CLI script workflow.

**Architecture:** The frontend talks directly to the existing AWS Amplify Gen 2 GraphQL API (same backend as the mobile app) using the generated TypeScript client. Authentication uses the existing Cognito user pool — only users in the `ADMINS` group can access `/admin/*` routes. No new backend infrastructure needed; all CRUD operations use the existing DynamoDB tables and authorization rules already defined in `amplify/data/resource.ts`.

**Tech Stack:** React 18 + Vite + TypeScript, AWS Amplify JS SDK v6 (auth + API + storage), TailwindCSS + Shadcn UI, Vitest + React Testing Library for TDD.

**Design:** All UI components and pages MUST be built using the `frontend-design:frontend-design` skill. The design should follow the existing apt-web color profile:
- Backgrounds: `gray-950` (base), `gray-900` (cards/sidebar), `gray-800` (inputs/hover)
- Accents: `blue-600` (primary buttons, active nav), `blue-700` (hover)
- Text: `white` (headings/primary), `gray-300` (labels), `gray-400` (secondary), `gray-500` (placeholders)
- Borders: `gray-800` (dividers), `gray-700` (input borders)
- Destructive: `red-600` (delete buttons), `red-400` (delete text)

When implementing any task that creates or modifies UI components, invoke the `frontend-design:frontend-design` skill BEFORE writing the component code. This ensures high design quality and consistency across the admin interface.

**Development Environment:** All development and testing MUST happen against an Amplify sandbox — never against production. Setup:

1. In the backend repo (`/Users/tasdi/apt-backend`), run `npx ampx sandbox` to spin up a personal sandbox environment (separate DynamoDB tables, Cognito pool, S3 bucket)
2. The sandbox generates its own `amplify_outputs.json` — copy this to the apt-web root
3. Create a test admin user in the sandbox Cognito pool and add them to the `ADMINS` group:
   ```bash
   # Create user
   aws cognito-idp admin-create-user \
     --user-pool-id <sandbox-pool-id> \
     --username admin@test.com \
     --temporary-password TempPass123! \
     --user-attributes Name=email,Value=admin@test.com Name=given_name,Value=Test Name=family_name,Value=Admin

   # Add to ADMINS group
   aws cognito-idp admin-add-user-to-group \
     --user-pool-id <sandbox-pool-id> \
     --username admin@test.com \
     --group-name ADMINS
   ```
4. The sandbox environment is fully isolated — no risk of affecting production data
5. When switching to production, replace `amplify_outputs.json` with the production version from apt-backend

---

## Context: Backend Data Model

The backend lives at `/Users/tasdi/apt-backend`. The Amplify schema is in `amplify/data/resource.ts`. Key models the admin interface manages:

### Core Entities
| Model | Key Fields | Auth |
|-------|-----------|------|
| **Exercise** | `name` (required), `description`, `equipment` (required), `tags` (string[]), `isVisibleInDiscover` (bool) | ADMINS: full, SUBSCRIBERS: read |
| **Workout** | `name` (required), `description` (required) | ADMINS: full, SUBSCRIBERS: read |
| **Program** | `name` (required), `description` (required), `equipment` (required), `marketingText` (required), `warmupWorkoutID` | ADMINS: full, SUBSCRIBERS: read |
| **Period** | `programID` (required), `from` (int, required), `to` (int, required) | ADMINS: full, SUBSCRIBERS: read |

### Junction / Linking Tables
| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **WorkoutExercise** | `workoutID`, `exerciseID`, `sortOrder` (int), `superset` (string), `sets` (string), `reps` (string) | Links exercises to workouts with order and rep scheme |
| **PeriodWorkout** | `periodID`, `workoutID`, `workoutName`, `sortOrder` (int) | Links workouts to periods within a program |
| **ProgramMedia** | `programID`, `mediaID` | Links program to its poster image |
| **ExerciseVideoMedia** | `exerciseID`, `mediaID` | Links exercise to its video |
| **ExercisePosterMedia** | `exerciseID`, `mediaID` | Links exercise to its poster/thumbnail |
| **Media** | `fileKey` (string, S3 path), `type` (enum: image/video/none) | Stores S3 file references |

### S3 File Key Conventions
- Exercise video: `exercise_video/{name}.mp4`
- Exercise poster: `exercise_poster/{name}.webp`
- Program poster: `program_poster/{name}`

### Amplify Configuration
- **Region:** eu-north-1
- **User Pool ID:** eu-north-1_vzRDTjSH8
- **Cognito Groups:** ADMINS (precedence 0), SUBSCRIBERS (precedence 1), AMIR (precedence 2)
- **Auth mode:** userPool (Cognito)
- **Config file:** Copy `amplify_outputs.json` from apt-backend to apt-web root

---

## File Structure

```
src/
├── index.tsx                          # Add /admin/* routes (MODIFY)
├── admin/
│   ├── amplify-config.ts             # Amplify.configure() + client export
│   ├── auth/
│   │   ├── AdminAuthProvider.tsx      # Context: auth state, sign-in/out, ADMINS group check
│   │   ├── AdminAuthProvider.test.tsx
│   │   ├── AdminLogin.tsx            # Login form page
│   │   ├── AdminLogin.test.tsx
│   │   ├── ProtectedRoute.tsx        # Wrapper: redirects non-ADMINS to login
│   │   └── ProtectedRoute.test.tsx
│   ├── layout/
│   │   ├── AdminLayout.tsx           # Shell: sidebar nav + content area
│   │   └── AdminLayout.test.tsx
│   ├── exercises/
│   │   ├── ExerciseList.tsx          # Table with search/filter
│   │   ├── ExerciseList.test.tsx
│   │   ├── ExerciseForm.tsx          # Create/edit form with media upload
│   │   ├── ExerciseForm.test.tsx
│   │   └── exercise-api.ts           # Amplify CRUD calls for Exercise + media
│   ├── workouts/
│   │   ├── WorkoutList.tsx           # Table of workouts
│   │   ├── WorkoutList.test.tsx
│   │   ├── WorkoutForm.tsx           # Create/edit with exercise assignment
│   │   ├── WorkoutForm.test.tsx
│   │   └── workout-api.ts           # Amplify CRUD calls for Workout + WorkoutExercise
│   ├── programs/
│   │   ├── ProgramList.tsx           # Table of programs
│   │   ├── ProgramList.test.tsx
│   │   ├── ProgramForm.tsx           # Create/edit with periods + workout assignment
│   │   ├── ProgramForm.test.tsx
│   │   └── program-api.ts           # Amplify CRUD calls for Program + Period + PeriodWorkout + media
│   └── components/
│       ├── DataTable.tsx             # Reusable sortable table
│       ├── DataTable.test.tsx
│       ├── SearchInput.tsx           # Debounced search input
│       ├── SearchInput.test.tsx
│       ├── MediaUpload.tsx           # S3 file upload with preview
│       ├── MediaUpload.test.tsx
│       ├── ConfirmDialog.tsx         # "Are you sure?" dialog for deletes
│       └── ConfirmDialog.test.tsx
```

---

## Task 1: Project Setup — Testing Infrastructure

**Files:**
- Modify: `/Users/tasdi/apt-web/package.json`
- Modify: `/Users/tasdi/apt-web/tsconfig.app.json`
- Create: `/Users/tasdi/apt-web/vitest.config.ts`
- Create: `/Users/tasdi/apt-web/src/test-setup.ts`

- [ ] **Step 1: Install dev dependencies**

```bash
cd /Users/tasdi/apt-web
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/react-test-renderer
```

- [ ] **Step 2: Create Vitest config**

Create `/Users/tasdi/apt-web/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    globals: true,
  },
});
```

- [ ] **Step 3: Create test setup file**

Create `/Users/tasdi/apt-web/src/test-setup.ts`:

```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 4: Add test script to package.json**

Add to `scripts` in package.json:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 5: Verify setup with a smoke test**

Create `/Users/tasdi/apt-web/src/smoke.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('test setup', () => {
  it('works', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm run test:run`
Expected: 1 test passes.

- [ ] **Step 6: Remove smoke test and commit**

Delete `src/smoke.test.ts`.

```bash
git add -A && git commit -m "chore: add vitest + testing-library setup"
```

---

## Task 2: Install Amplify SDK + Configure

**Files:**
- Modify: `/Users/tasdi/apt-web/package.json`
- Create: `/Users/tasdi/apt-web/amplify_outputs.json` (copy from apt-backend)
- Create: `/Users/tasdi/apt-web/src/admin/amplify-config.ts`

- [ ] **Step 1: Install Amplify dependencies**

```bash
cd /Users/tasdi/apt-web
npm install aws-amplify
```

- [ ] **Step 2: Copy amplify_outputs.json from backend**

```bash
cp /Users/tasdi/apt-backend/amplify_outputs.json /Users/tasdi/apt-web/amplify_outputs.json
```

**Important:** Add `amplify_outputs.json` to `.gitignore` — it contains pool IDs and should not be committed. Each developer copies it from the backend project.

- [ ] **Step 3: Create Amplify config module**

Create `/Users/tasdi/apt-web/src/admin/amplify-config.ts`:

```typescript
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import outputs from '../../amplify_outputs.json';

Amplify.configure(outputs);

export const client = generateClient();
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: add aws-amplify SDK and config"
```

---

## Task 3: Auth — AdminAuthProvider

**Files:**
- Create: `/Users/tasdi/apt-web/src/admin/auth/AdminAuthProvider.tsx`
- Create: `/Users/tasdi/apt-web/src/admin/auth/AdminAuthProvider.test.tsx`

- [ ] **Step 1: Write failing test — provides auth context**

Create `/Users/tasdi/apt-web/src/admin/auth/AdminAuthProvider.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminAuthProvider, useAdminAuth } from './AdminAuthProvider';

// Mock aws-amplify/auth
vi.mock('aws-amplify/auth', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  fetchAuthSession: vi.fn(),
  getCurrentUser: vi.fn(),
}));

import { signIn, signOut, fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

function TestConsumer() {
  const { user, isAdmin, isLoading, login, logout } = useAdminAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="is-admin">{String(isAdmin)}</span>
      <span data-testid="user">{user?.username ?? 'none'}</span>
      <button onClick={() => login('admin@test.com', 'pass123')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}

describe('AdminAuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state and resolves to unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('not signed in'));

    render(
      <AdminAuthProvider>
        <TestConsumer />
      </AdminAuthProvider>
    );

    // Initially loading
    expect(screen.getByTestId('loading')).toHaveTextContent('true');

    // Resolves to not admin
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  it('login calls signIn and checks ADMINS group', async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error('not signed in'));
    vi.mocked(signIn).mockResolvedValue({ isSignedIn: true, nextStep: { signInStep: 'DONE' } });
    vi.mocked(fetchAuthSession).mockResolvedValue({
      tokens: {
        accessToken: {
          payload: {
            'cognito:groups': ['ADMINS'],
          },
        },
      },
    });
    vi.mocked(getCurrentUser).mockResolvedValue({ username: 'admin@test.com', userId: '123' });

    render(
      <AdminAuthProvider>
        <TestConsumer />
      </AdminAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await userEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
    });
    expect(signIn).toHaveBeenCalledWith({ username: 'admin@test.com', password: 'pass123' });
  });

  it('rejects non-ADMINS users after login', async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error('not signed in'));
    vi.mocked(signIn).mockResolvedValue({ isSignedIn: true, nextStep: { signInStep: 'DONE' } });
    vi.mocked(fetchAuthSession).mockResolvedValue({
      tokens: {
        accessToken: {
          payload: {
            'cognito:groups': ['SUBSCRIBERS'],
          },
        },
      },
    });
    vi.mocked(signOut).mockResolvedValue(undefined);

    render(
      <AdminAuthProvider>
        <TestConsumer />
      </AdminAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await userEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
    });
    expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/tasdi/apt-web && npx vitest run src/admin/auth/AdminAuthProvider.test.tsx
```

Expected: FAIL — module `./AdminAuthProvider` not found.

- [ ] **Step 3: Implement AdminAuthProvider**

Create `/Users/tasdi/apt-web/src/admin/auth/AdminAuthProvider.tsx`:

```tsx
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { signIn as amplifySignIn, signOut as amplifySignOut, fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

interface AdminUser {
  username: string;
  userId: string;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function useAdminAuth(): AdminAuthContextType {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
}

async function isUserInAdminsGroup(): Promise<boolean> {
  const session = await fetchAuthSession();
  const groups = (session.tokens?.accessToken?.payload?.['cognito:groups'] as string[] | undefined) ?? [];
  return groups.includes('ADMINS');
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkExistingSession() {
      try {
        const currentUser = await getCurrentUser();
        const admin = await isUserInAdminsGroup();
        if (admin) {
          setUser({ username: currentUser.username, userId: currentUser.userId });
          setIsAdmin(true);
        } else {
          await amplifySignOut();
        }
      } catch {
        // Not signed in — expected
      } finally {
        setIsLoading(false);
      }
    }
    checkExistingSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await amplifySignIn({ username: email, password });
      const admin = await isUserInAdminsGroup();
      if (!admin) {
        await amplifySignOut();
        setError('Du har inte admin-behörighet.');
        return;
      }
      const currentUser = await getCurrentUser();
      setUser({ username: currentUser.username, userId: currentUser.userId });
      setIsAdmin(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inloggningen misslyckades.');
    }
  }, []);

  const logout = useCallback(async () => {
    await amplifySignOut();
    setUser(null);
    setIsAdmin(false);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ user, isAdmin, isLoading, error, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/admin/auth/AdminAuthProvider.test.tsx
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(admin): add AdminAuthProvider with ADMINS group check"
```

---

## Task 4: Auth — AdminLogin Page

**Files:**
- Create: `/Users/tasdi/apt-web/src/admin/auth/AdminLogin.tsx`
- Create: `/Users/tasdi/apt-web/src/admin/auth/AdminLogin.test.tsx`

- [ ] **Step 1: Write failing test**

Create `/Users/tasdi/apt-web/src/admin/auth/AdminLogin.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminLogin } from './AdminLogin';

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('./AdminAuthProvider', () => ({
  useAdminAuth: () => ({
    login: mockLogin,
    isAdmin: false,
    isLoading: false,
    error: null,
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('AdminLogin', () => {
  it('renders email and password fields with submit button', () => {
    render(<AdminLogin />);
    expect(screen.getByLabelText(/e-post/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/lösenord/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logga in/i })).toBeInTheDocument();
  });

  it('calls login with email and password on submit', async () => {
    render(<AdminLogin />);
    await userEvent.type(screen.getByLabelText(/e-post/i), 'admin@test.com');
    await userEvent.type(screen.getByLabelText(/lösenord/i), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /logga in/i }));

    expect(mockLogin).toHaveBeenCalledWith('admin@test.com', 'secret123');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/admin/auth/AdminLogin.test.tsx
```

Expected: FAIL — module `./AdminLogin` not found.

- [ ] **Step 3: Implement AdminLogin**

Create `/Users/tasdi/apt-web/src/admin/auth/AdminLogin.tsx`:

```tsx
import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from './AdminAuthProvider';

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isAdmin, isLoading, error } = useAdminAuth();
  const navigate = useNavigate();

  if (isAdmin) {
    navigate('/admin');
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await login(email, password);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded-lg shadow-lg w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold text-white text-center">APT Admin</h1>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <div>
          <label htmlFor="email" className="block text-sm text-gray-300 mb-1">E-post</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-gray-300 mb-1">Lösenord</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Loggar in...' : 'Logga in'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/admin/auth/AdminLogin.test.tsx
```

Expected: All 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(admin): add AdminLogin page"
```

---

## Task 5: Auth — ProtectedRoute

**Files:**
- Create: `/Users/tasdi/apt-web/src/admin/auth/ProtectedRoute.tsx`
- Create: `/Users/tasdi/apt-web/src/admin/auth/ProtectedRoute.test.tsx`

- [ ] **Step 1: Write failing test**

Create `/Users/tasdi/apt-web/src/admin/auth/ProtectedRoute.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

const mockUseAdminAuth = vi.fn();

vi.mock('./AdminAuthProvider', () => ({
  useAdminAuth: () => mockUseAdminAuth(),
}));

describe('ProtectedRoute', () => {
  it('shows loading while auth is being checked', () => {
    mockUseAdminAuth.mockReturnValue({ isLoading: true, isAdmin: false });
    render(
      <MemoryRouter>
        <ProtectedRoute><p>Secret</p></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();
  });

  it('renders children when user is admin', () => {
    mockUseAdminAuth.mockReturnValue({ isLoading: false, isAdmin: true });
    render(
      <MemoryRouter>
        <ProtectedRoute><p>Secret</p></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByText('Secret')).toBeInTheDocument();
  });

  it('redirects to /admin/login when not admin', () => {
    mockUseAdminAuth.mockReturnValue({ isLoading: false, isAdmin: false });
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <ProtectedRoute><p>Secret</p></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/admin/auth/ProtectedRoute.test.tsx
```

Expected: FAIL — module `./ProtectedRoute` not found.

- [ ] **Step 3: Implement ProtectedRoute**

Create `/Users/tasdi/apt-web/src/admin/auth/ProtectedRoute.tsx`:

```tsx
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from './AdminAuthProvider';
import { ReactNode } from 'react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoading, isAdmin } = useAdminAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">Laddar...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/admin/auth/ProtectedRoute.test.tsx
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(admin): add ProtectedRoute with ADMINS group guard"
```

---

## Task 6: Admin Layout + Routing

**Files:**
- Create: `/Users/tasdi/apt-web/src/admin/layout/AdminLayout.tsx`
- Create: `/Users/tasdi/apt-web/src/admin/layout/AdminLayout.test.tsx`
- Modify: `/Users/tasdi/apt-web/src/index.tsx`

- [ ] **Step 1: Write failing test for AdminLayout**

Create `/Users/tasdi/apt-web/src/admin/layout/AdminLayout.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';

vi.mock('../auth/AdminAuthProvider', () => ({
  useAdminAuth: () => ({
    user: { username: 'admin@test.com', userId: '123' },
    isAdmin: true,
    logout: vi.fn(),
  }),
}));

describe('AdminLayout', () => {
  it('renders sidebar with nav links', () => {
    render(
      <MemoryRouter>
        <AdminLayout>
          <p>Page content</p>
        </AdminLayout>
      </MemoryRouter>
    );

    expect(screen.getByText('Exercises')).toBeInTheDocument();
    expect(screen.getByText('Workouts')).toBeInTheDocument();
    expect(screen.getByText('Program')).toBeInTheDocument();
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/admin/layout/AdminLayout.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement AdminLayout**

Create `/Users/tasdi/apt-web/src/admin/layout/AdminLayout.tsx`:

```tsx
import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAdminAuth } from '../auth/AdminAuthProvider';

const navItems = [
  { to: '/admin/exercises', label: 'Exercises' },
  { to: '/admin/workouts', label: 'Workouts' },
  { to: '/admin/programs', label: 'Program' },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAdminAuth();

  return (
    <div className="min-h-screen flex bg-gray-950 text-white">
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-lg font-bold">APT Admin</h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 mb-2">{user?.username}</p>
          <button
            onClick={logout}
            className="text-sm text-gray-400 hover:text-white"
          >
            Logga ut
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/admin/layout/AdminLayout.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Wire up routes in index.tsx**

Modify `/Users/tasdi/apt-web/src/index.tsx` — add admin routes:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Startsida } from "./screens/Startsida";
import { BasketballClubs } from "./screens/BasketballClubs";
import { PrivacyPolicy } from "./screens/PrivacyPolicy";
import { AdminAuthProvider } from "./admin/auth/AdminAuthProvider";
import { AdminLogin } from "./admin/auth/AdminLogin";
import { ProtectedRoute } from "./admin/auth/ProtectedRoute";
import { AdminLayout } from "./admin/layout/AdminLayout";

// Lazy placeholders — will be replaced with real components in later tasks
function ExercisesPlaceholder() { return <p>Exercises — kommer snart</p>; }
function WorkoutsPlaceholder() { return <p>Workouts — kommer snart</p>; }
function ProgramsPlaceholder() { return <p>Program — kommer snart</p>; }

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Startsida />} />
        <Route path="/basketball-clubs" element={<BasketballClubs />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />

        {/* Admin routes */}
        <Route path="/admin/login" element={
          <AdminAuthProvider>
            <AdminLogin />
          </AdminAuthProvider>
        } />
        <Route path="/admin/*" element={
          <AdminAuthProvider>
            <ProtectedRoute>
              <AdminLayout>
                <Routes>
                  <Route path="exercises/*" element={<ExercisesPlaceholder />} />
                  <Route path="workouts/*" element={<WorkoutsPlaceholder />} />
                  <Route path="programs/*" element={<ProgramsPlaceholder />} />
                  <Route index element={<ExercisesPlaceholder />} />
                </Routes>
              </AdminLayout>
            </ProtectedRoute>
          </AdminAuthProvider>
        } />
      </Routes>
    </Router>
  </StrictMode>,
);
```

- [ ] **Step 6: Verify dev server starts without errors**

```bash
cd /Users/tasdi/apt-web && npm run dev
```

Open `http://localhost:5173/admin/login` — should see login form.
Open `http://localhost:5173/` — should see existing homepage (unchanged).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(admin): add AdminLayout, sidebar nav, and /admin routes"
```

---

## Task 7: Shared Components — DataTable + SearchInput + ConfirmDialog

**Files:**
- Create: `/Users/tasdi/apt-web/src/admin/components/DataTable.tsx`
- Create: `/Users/tasdi/apt-web/src/admin/components/DataTable.test.tsx`
- Create: `/Users/tasdi/apt-web/src/admin/components/SearchInput.tsx`
- Create: `/Users/tasdi/apt-web/src/admin/components/SearchInput.test.tsx`
- Create: `/Users/tasdi/apt-web/src/admin/components/ConfirmDialog.tsx`
- Create: `/Users/tasdi/apt-web/src/admin/components/ConfirmDialog.test.tsx`

- [ ] **Step 1: Write failing test for DataTable**

Create `/Users/tasdi/apt-web/src/admin/components/DataTable.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from './DataTable';

interface TestRow {
  id: string;
  name: string;
  equipment: string;
}

const columns = [
  { key: 'name' as const, header: 'Namn' },
  { key: 'equipment' as const, header: 'Utrustning' },
];

const rows: TestRow[] = [
  { id: '1', name: 'Squat', equipment: 'Barbell' },
  { id: '2', name: 'Deadlift', equipment: 'Barbell' },
];

describe('DataTable', () => {
  it('renders column headers and row data', () => {
    render(<DataTable columns={columns} rows={rows} />);
    expect(screen.getByText('Namn')).toBeInTheDocument();
    expect(screen.getByText('Utrustning')).toBeInTheDocument();
    expect(screen.getByText('Squat')).toBeInTheDocument();
    expect(screen.getByText('Deadlift')).toBeInTheDocument();
  });

  it('calls onRowClick when a row is clicked', async () => {
    const onClick = vi.fn();
    render(<DataTable columns={columns} rows={rows} onRowClick={onClick} />);
    await userEvent.click(screen.getByText('Squat'));
    expect(onClick).toHaveBeenCalledWith(rows[0]);
  });

  it('shows empty message when no rows', () => {
    render(<DataTable columns={columns} rows={[]} emptyMessage="Inga resultat" />);
    expect(screen.getByText('Inga resultat')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/admin/components/DataTable.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement DataTable**

Create `/Users/tasdi/apt-web/src/admin/components/DataTable.tsx`:

```tsx
interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string }>({ columns, rows, onRowClick, emptyMessage }: DataTableProps<T>) {
  if (rows.length === 0) {
    return <p className="text-gray-500 text-center py-8">{emptyMessage ?? 'Ingen data'}</p>;
  }

  return (
    <table className="w-full text-sm text-left">
      <thead className="text-gray-400 border-b border-gray-800">
        <tr>
          {columns.map((col) => (
            <th key={String(col.key)} className="px-4 py-3 font-medium">{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.id}
            onClick={() => onRowClick?.(row)}
            className={onRowClick ? 'cursor-pointer hover:bg-gray-800' : ''}
          >
            {columns.map((col) => (
              <td key={String(col.key)} className="px-4 py-3 border-b border-gray-800/50">
                {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: Run DataTable tests**

```bash
npx vitest run src/admin/components/DataTable.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Write failing test for SearchInput**

Create `/Users/tasdi/apt-web/src/admin/components/SearchInput.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  it('renders with placeholder', () => {
    render(<SearchInput value="" onChange={vi.fn()} placeholder="Sök övningar..." />);
    expect(screen.getByPlaceholderText('Sök övningar...')).toBeInTheDocument();
  });

  it('calls onChange when user types', async () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox'), 'squat');
    expect(onChange).toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Implement SearchInput**

Create `/Users/tasdi/apt-web/src/admin/components/SearchInput.tsx`:

```tsx
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? 'Sök...'}
      className="px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none text-sm w-full max-w-xs"
    />
  );
}
```

- [ ] **Step 7: Write failing test for ConfirmDialog**

Create `/Users/tasdi/apt-web/src/admin/components/ConfirmDialog.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('does not render when not open', () => {
    render(<ConfirmDialog open={false} title="Ta bort?" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByText('Ta bort?')).not.toBeInTheDocument();
  });

  it('renders title and calls onConfirm', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog open={true} title="Ta bort?" message="Är du säker?" onConfirm={onConfirm} onCancel={vi.fn()} />);
    expect(screen.getByText('Ta bort?')).toBeInTheDocument();
    expect(screen.getByText('Är du säker?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /ja/i }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when cancelled', async () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog open={true} title="Ta bort?" onConfirm={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: /avbryt/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
```

- [ ] **Step 8: Implement ConfirmDialog**

Create `/Users/tasdi/apt-web/src/admin/components/ConfirmDialog.tsx`:

```tsx
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 rounded-lg p-6 max-w-sm w-full border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-2">{title}</h2>
        {message && <p className="text-gray-400 text-sm mb-4">{message}</p>}
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-300 hover:text-white">Avbryt</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">Ja, ta bort</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Run all component tests**

```bash
npx vitest run src/admin/components/
```

Expected: All tests PASS.

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat(admin): add DataTable, SearchInput, and ConfirmDialog components"
```

---

## Task 8: Exercise API Layer

**Files:**
- Create: `/Users/tasdi/apt-web/src/admin/exercises/exercise-api.ts`

This task has no tests of its own — it's a thin wrapper around `client.models.*`. The integration is tested through the Exercise list/form component tests which mock this module.

- [ ] **Step 1: Create exercise-api.ts**

Create `/Users/tasdi/apt-web/src/admin/exercises/exercise-api.ts`:

```typescript
import { client } from '../amplify-config';

export interface Exercise {
  id: string;
  name: string;
  description: string | null;
  equipment: string;
  tags: string[] | null;
  isVisibleInDiscover: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExerciseInput {
  name: string;
  description?: string;
  equipment: string;
  tags?: string[];
  isVisibleInDiscover?: boolean;
}

export interface UpdateExerciseInput {
  id: string;
  name?: string;
  description?: string;
  equipment?: string;
  tags?: string[];
  isVisibleInDiscover?: boolean;
}

export async function listExercises(): Promise<Exercise[]> {
  const allExercises: Exercise[] = [];
  let nextToken: string | null = null;

  do {
    const { data, nextToken: newToken } = await client.models.Exercise.list({
      nextToken: nextToken ?? undefined,
    });
    allExercises.push(...(data as unknown as Exercise[]));
    nextToken = newToken ?? null;
  } while (nextToken);

  return allExercises;
}

export async function getExercise(id: string): Promise<Exercise | null> {
  const { data } = await client.models.Exercise.get({ id });
  return data as unknown as Exercise | null;
}

export async function createExercise(input: CreateExerciseInput): Promise<Exercise> {
  const { data, errors } = await client.models.Exercise.create(input);
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as Exercise;
}

export async function updateExercise(input: UpdateExerciseInput): Promise<Exercise> {
  const { data, errors } = await client.models.Exercise.update(input);
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as Exercise;
}

export async function deleteExercise(id: string): Promise<void> {
  const { errors } = await client.models.Exercise.delete({ id });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat(admin): add exercise API layer"
```

---

## Task 9: ExerciseList Component

**Files:**
- Create: `/Users/tasdi/apt-web/src/admin/exercises/ExerciseList.tsx`
- Create: `/Users/tasdi/apt-web/src/admin/exercises/ExerciseList.test.tsx`

- [ ] **Step 1: Write failing test**

Create `/Users/tasdi/apt-web/src/admin/exercises/ExerciseList.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ExerciseList } from './ExerciseList';

const mockExercises = [
  { id: '1', name: 'Squat', description: 'Barbell squat', equipment: 'Barbell', tags: null, isVisibleInDiscover: true, createdAt: '', updatedAt: '' },
  { id: '2', name: 'Push-up', description: 'Bodyweight push-up', equipment: 'None', tags: null, isVisibleInDiscover: true, createdAt: '', updatedAt: '' },
  { id: '3', name: 'Deadlift', description: 'Conventional deadlift', equipment: 'Barbell', tags: null, isVisibleInDiscover: true, createdAt: '', updatedAt: '' },
];

vi.mock('./exercise-api', () => ({
  listExercises: vi.fn(() => Promise.resolve(mockExercises)),
}));

describe('ExerciseList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders exercises in a table after loading', async () => {
    render(<MemoryRouter><ExerciseList /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Squat')).toBeInTheDocument();
    });
    expect(screen.getByText('Push-up')).toBeInTheDocument();
    expect(screen.getByText('Deadlift')).toBeInTheDocument();
  });

  it('filters exercises by search text', async () => {
    render(<MemoryRouter><ExerciseList /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Squat')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByPlaceholderText(/sök/i), 'squat');

    expect(screen.getByText('Squat')).toBeInTheDocument();
    expect(screen.queryByText('Push-up')).not.toBeInTheDocument();
    expect(screen.queryByText('Deadlift')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/admin/exercises/ExerciseList.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement ExerciseList**

Create `/Users/tasdi/apt-web/src/admin/exercises/ExerciseList.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listExercises, Exercise } from './exercise-api';
import { DataTable } from '../components/DataTable';
import { SearchInput } from '../components/SearchInput';

const columns = [
  { key: 'name' as const, header: 'Namn' },
  { key: 'equipment' as const, header: 'Utrustning' },
  { key: 'description' as const, header: 'Beskrivning' },
];

export function ExerciseList() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    listExercises()
      .then(setExercises)
      .finally(() => setLoading(false));
  }, []);

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.equipment.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <p className="text-gray-400">Laddar exercises...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Exercises</h2>
        <button
          onClick={() => navigate('/admin/exercises/new')}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          Ny exercise
        </button>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Sök exercises..." />

      <DataTable
        columns={columns}
        rows={filtered}
        onRowClick={(row) => navigate(`/admin/exercises/${row.id}`)}
        emptyMessage="Inga exercises hittades"
      />
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/admin/exercises/ExerciseList.test.tsx
```

Expected: All 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(admin): add ExerciseList with search and table"
```

---

## Task 10: ExerciseForm Component (Create + Edit)

**Files:**
- Create: `/Users/tasdi/apt-web/src/admin/exercises/ExerciseForm.tsx`
- Create: `/Users/tasdi/apt-web/src/admin/exercises/ExerciseForm.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `/Users/tasdi/apt-web/src/admin/exercises/ExerciseForm.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ExerciseForm } from './ExerciseForm';

const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();
const mockNavigate = vi.fn();

vi.mock('./exercise-api', () => ({
  createExercise: (...args: unknown[]) => mockCreate(...args),
  updateExercise: (...args: unknown[]) => mockUpdate(...args),
  getExercise: (...args: unknown[]) => mockGet(...args),
  deleteExercise: (...args: unknown[]) => mockDelete(...args),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('ExerciseForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty form for creating a new exercise', () => {
    render(
      <MemoryRouter initialEntries={['/admin/exercises/new']}>
        <Routes>
          <Route path="/admin/exercises/new" element={<ExerciseForm />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/namn/i)).toHaveValue('');
    expect(screen.getByLabelText(/utrustning/i)).toHaveValue('');
    expect(screen.getByRole('button', { name: /spara/i })).toBeInTheDocument();
  });

  it('submits new exercise and navigates back', async () => {
    mockCreate.mockResolvedValue({ id: 'new-id', name: 'Squat', equipment: 'Barbell' });

    render(
      <MemoryRouter initialEntries={['/admin/exercises/new']}>
        <Routes>
          <Route path="/admin/exercises/new" element={<ExerciseForm />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText(/namn/i), 'Squat');
    await userEvent.type(screen.getByLabelText(/utrustning/i), 'Barbell');
    await userEvent.click(screen.getByRole('button', { name: /spara/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Squat',
        equipment: 'Barbell',
      }));
    });
    expect(mockNavigate).toHaveBeenCalledWith('/admin/exercises');
  });

  it('loads existing exercise for editing', async () => {
    mockGet.mockResolvedValue({
      id: '1', name: 'Squat', description: 'Deep squat', equipment: 'Barbell',
      tags: null, isVisibleInDiscover: true,
    });

    render(
      <MemoryRouter initialEntries={['/admin/exercises/1']}>
        <Routes>
          <Route path="/admin/exercises/:id" element={<ExerciseForm />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/namn/i)).toHaveValue('Squat');
    });
    expect(screen.getByLabelText(/utrustning/i)).toHaveValue('Barbell');
    expect(screen.getByLabelText(/beskrivning/i)).toHaveValue('Deep squat');
  });

  it('updates existing exercise on submit', async () => {
    mockGet.mockResolvedValue({
      id: '1', name: 'Squat', description: 'Deep squat', equipment: 'Barbell',
      tags: null, isVisibleInDiscover: true,
    });
    mockUpdate.mockResolvedValue({ id: '1', name: 'Back Squat' });

    render(
      <MemoryRouter initialEntries={['/admin/exercises/1']}>
        <Routes>
          <Route path="/admin/exercises/:id" element={<ExerciseForm />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/namn/i)).toHaveValue('Squat');
    });

    await userEvent.clear(screen.getByLabelText(/namn/i));
    await userEvent.type(screen.getByLabelText(/namn/i), 'Back Squat');
    await userEvent.click(screen.getByRole('button', { name: /spara/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        id: '1',
        name: 'Back Squat',
      }));
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/admin/exercises/ExerciseForm.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement ExerciseForm**

Create `/Users/tasdi/apt-web/src/admin/exercises/ExerciseForm.tsx`:

```tsx
import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExercise, createExercise, updateExercise, deleteExercise } from './exercise-api';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function ExerciseForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new' || !id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [equipment, setEquipment] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      getExercise(id).then((exercise) => {
        if (exercise) {
          setName(exercise.name);
          setDescription(exercise.description ?? '');
          setEquipment(exercise.equipment);
        }
        setLoading(false);
      });
    }
  }, [id, isNew]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isNew) {
        await createExercise({ name, description, equipment });
      } else {
        await updateExercise({ id: id!, name, description, equipment });
      }
      navigate('/admin/exercises');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    await deleteExercise(id);
    navigate('/admin/exercises');
  }

  if (loading) return <p className="text-gray-400">Laddar...</p>;

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-bold mb-4">{isNew ? 'Ny exercise' : 'Redigera exercise'}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm text-gray-300 mb-1">Namn</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>

        <div>
          <label htmlFor="equipment" className="block text-sm text-gray-300 mb-1">Utrustning</label>
          <input id="equipment" type="text" value={equipment} onChange={(e) => setEquipment(e.target.value)} required
            className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm text-gray-300 mb-1">Beskrivning</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Sparar...' : 'Spara'}
          </button>
          <button type="button" onClick={() => navigate('/admin/exercises')}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white">
            Avbryt
          </button>
          {!isNew && (
            <button type="button" onClick={() => setShowDelete(true)}
              className="px-4 py-2 text-sm text-red-400 hover:text-red-300 ml-auto">
              Ta bort
            </button>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={showDelete}
        title="Ta bort exercise?"
        message={`Vill du verkligen ta bort "${name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/admin/exercises/ExerciseForm.test.tsx
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(admin): add ExerciseForm for create/edit/delete"
```

---

## Task 11: Workout API Layer + WorkoutList + WorkoutForm

This task follows the same TDD pattern as Tasks 8-10 but for Workouts. The key difference is that WorkoutForm needs to manage **WorkoutExercise** junction records — assigning exercises to a workout with sortOrder, sets, reps, and superset.

**Files:**
- Create: `/Users/tasdi/apt-web/src/admin/workouts/workout-api.ts`
- Create: `/Users/tasdi/apt-web/src/admin/workouts/WorkoutList.tsx`
- Create: `/Users/tasdi/apt-web/src/admin/workouts/WorkoutList.test.tsx`
- Create: `/Users/tasdi/apt-web/src/admin/workouts/WorkoutForm.tsx`
- Create: `/Users/tasdi/apt-web/src/admin/workouts/WorkoutForm.test.tsx`

- [ ] **Step 1: Create workout-api.ts**

Create `/Users/tasdi/apt-web/src/admin/workouts/workout-api.ts`:

```typescript
import { client } from '../amplify-config';

export interface Workout {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutExercise {
  id: string;
  workoutID: string;
  exerciseID: string;
  sortOrder: number;
  superset: string | null;
  sets: string;
  reps: string;
}

export interface CreateWorkoutInput {
  name: string;
  description: string;
}

export interface CreateWorkoutExerciseInput {
  workoutID: string;
  exerciseID: string;
  sortOrder: number;
  superset?: string;
  sets: string;
  reps: string;
}

export async function listWorkouts(): Promise<Workout[]> {
  const all: Workout[] = [];
  let nextToken: string | null = null;
  do {
    const { data, nextToken: newToken } = await client.models.Workout.list({
      nextToken: nextToken ?? undefined,
    });
    all.push(...(data as unknown as Workout[]));
    nextToken = newToken ?? null;
  } while (nextToken);
  return all;
}

export async function getWorkout(id: string): Promise<Workout | null> {
  const { data } = await client.models.Workout.get({ id });
  return data as unknown as Workout | null;
}

export async function createWorkout(input: CreateWorkoutInput): Promise<Workout> {
  const { data, errors } = await client.models.Workout.create(input);
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as Workout;
}

export async function updateWorkout(input: { id: string; name?: string; description?: string }): Promise<Workout> {
  const { data, errors } = await client.models.Workout.update(input);
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as Workout;
}

export async function deleteWorkout(id: string): Promise<void> {
  const { errors } = await client.models.Workout.delete({ id });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
}

export async function getWorkoutExercises(workoutID: string): Promise<WorkoutExercise[]> {
  const all: WorkoutExercise[] = [];
  let nextToken: string | null = null;
  do {
    const { data, nextToken: newToken } = await client.models.WorkoutExercise.list({
      filter: { workoutID: { eq: workoutID } },
      nextToken: nextToken ?? undefined,
    });
    all.push(...(data as unknown as WorkoutExercise[]));
    nextToken = newToken ?? null;
  } while (nextToken);
  return all.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function createWorkoutExercise(input: CreateWorkoutExerciseInput): Promise<WorkoutExercise> {
  const { data, errors } = await client.models.WorkoutExercise.create(input);
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  return data as unknown as WorkoutExercise;
}

export async function deleteWorkoutExercise(id: string): Promise<void> {
  const { errors } = await client.models.WorkoutExercise.delete({ id });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
}
```

- [ ] **Step 2: Write failing test for WorkoutList**

Follow same pattern as ExerciseList.test.tsx: mock `listWorkouts`, verify table renders, verify search filter works.

- [ ] **Step 3: Implement WorkoutList**

Same structure as ExerciseList — table with search, link to form. Columns: name, description.

- [ ] **Step 4: Run tests, verify pass**

- [ ] **Step 5: Write failing tests for WorkoutForm**

Key tests:
- Renders empty form for new workout
- Loads existing workout with its exercises
- Can add an exercise to the workout (exercise picker — select from existing exercises)
- Can set sets/reps/superset for a workout exercise
- Can remove an exercise from the workout
- Submits and creates workout + all WorkoutExercise records

- [ ] **Step 6: Implement WorkoutForm**

The form has two sections:
1. **Workout details**: name, description
2. **Exercise list**: shows assigned exercises with sortOrder, sets, reps, superset. Has "Lägg till exercise" button that opens a picker (searchable dropdown of all exercises). Each row has remove button.

When saving a **new** workout: create Workout first, then create all WorkoutExercise records.
When saving an **existing** workout: update Workout, diff the exercise list (delete removed, create added, update changed).

- [ ] **Step 7: Run all workout tests**

```bash
npx vitest run src/admin/workouts/
```

Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(admin): add Workout CRUD with exercise assignment"
```

---

## Task 12: Program API Layer + ProgramList + ProgramForm

This is the most complex task. Programs have nested structure: Program → Periods → PeriodWorkouts.

**Files:**
- Create: `/Users/tasdi/apt-web/src/admin/programs/program-api.ts`
- Create: `/Users/tasdi/apt-web/src/admin/programs/ProgramList.tsx`
- Create: `/Users/tasdi/apt-web/src/admin/programs/ProgramList.test.tsx`
- Create: `/Users/tasdi/apt-web/src/admin/programs/ProgramForm.tsx`
- Create: `/Users/tasdi/apt-web/src/admin/programs/ProgramForm.test.tsx`

- [ ] **Step 1: Create program-api.ts**

```typescript
import { client } from '../amplify-config';

export interface Program {
  id: string;
  name: string;
  description: string;
  equipment: string;
  marketingText: string;
  warmupWorkoutID: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Period {
  id: string;
  programID: string;
  from: number;
  to: number;
}

export interface PeriodWorkout {
  id: string;
  periodID: string;
  workoutID: string;
  workoutName: string | null;
  sortOrder: number;
}

// CRUD functions for Program, Period, PeriodWorkout
// Same pagination pattern as exercise-api and workout-api.
// Include: listPrograms, getProgram, createProgram, updateProgram, deleteProgram
// Include: getPeriods (by programID), createPeriod, deletePeriod
// Include: getPeriodWorkouts (by periodID), createPeriodWorkout, deletePeriodWorkout
// Include: getFullProgram (fetches program + periods + periodWorkouts in one call)
```

Full implementation follows the same `client.models.X.list/get/create/update/delete` pattern.

- [ ] **Step 2: Write failing test for ProgramList**

Same pattern as ExerciseList: mock `listPrograms`, verify table renders with columns name, equipment, marketingText.

- [ ] **Step 3: Implement ProgramList**

- [ ] **Step 4: Run tests, verify pass**

- [ ] **Step 5: Write failing tests for ProgramForm**

Key tests:
- Renders empty form for new program (name, description, equipment, marketingText)
- Loads existing program with periods and workouts
- Can add a period (from/to week numbers)
- Can add a workout to a period (workout picker)
- Can remove a period
- Submits and creates Program + Periods + PeriodWorkouts

- [ ] **Step 6: Implement ProgramForm**

The form has sections:
1. **Program details**: name, description, equipment, marketingText
2. **Periods**: list of periods, each showing from-to week numbers. "Lägg till period" button.
3. **Each period** expands to show its workouts with sortOrder. "Lägg till workout" opens picker.

When saving new: create Program → create Periods → create PeriodWorkouts.
When editing: update Program, diff periods/workouts.

- [ ] **Step 7: Run all program tests**

```bash
npx vitest run src/admin/programs/
```

Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(admin): add Program CRUD with periods and workout assignment"
```

---

## Task 13: Wire Up Real Routes (Replace Placeholders)

**Files:**
- Modify: `/Users/tasdi/apt-web/src/index.tsx`

- [ ] **Step 1: Replace placeholder components with real imports**

Update `/Users/tasdi/apt-web/src/index.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Startsida } from "./screens/Startsida";
import { BasketballClubs } from "./screens/BasketballClubs";
import { PrivacyPolicy } from "./screens/PrivacyPolicy";
import { AdminAuthProvider } from "./admin/auth/AdminAuthProvider";
import { AdminLogin } from "./admin/auth/AdminLogin";
import { ProtectedRoute } from "./admin/auth/ProtectedRoute";
import { AdminLayout } from "./admin/layout/AdminLayout";
import { ExerciseList } from "./admin/exercises/ExerciseList";
import { ExerciseForm } from "./admin/exercises/ExerciseForm";
import { WorkoutList } from "./admin/workouts/WorkoutList";
import { WorkoutForm } from "./admin/workouts/WorkoutForm";
import { ProgramList } from "./admin/programs/ProgramList";
import { ProgramForm } from "./admin/programs/ProgramForm";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Startsida />} />
        <Route path="/basketball-clubs" element={<BasketballClubs />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />

        {/* Admin routes */}
        <Route path="/admin/login" element={
          <AdminAuthProvider>
            <AdminLogin />
          </AdminAuthProvider>
        } />
        <Route path="/admin/*" element={
          <AdminAuthProvider>
            <ProtectedRoute>
              <AdminLayout>
                <Routes>
                  <Route path="exercises" element={<ExerciseList />} />
                  <Route path="exercises/:id" element={<ExerciseForm />} />
                  <Route path="workouts" element={<WorkoutList />} />
                  <Route path="workouts/:id" element={<WorkoutForm />} />
                  <Route path="programs" element={<ProgramList />} />
                  <Route path="programs/:id" element={<ProgramForm />} />
                  <Route index element={<ExerciseList />} />
                </Routes>
              </AdminLayout>
            </ProtectedRoute>
          </AdminAuthProvider>
        } />
      </Routes>
    </Router>
  </StrictMode>,
);
```

- [ ] **Step 2: Run all tests**

```bash
cd /Users/tasdi/apt-web && npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 3: Manual testing in browser**

1. `npm run dev`
2. Go to `http://localhost:5173/` — verify public site works unchanged
3. Go to `http://localhost:5173/admin` — should redirect to `/admin/login`
4. Log in with ADMINS user — should see admin layout with sidebar
5. Navigate Exercises, Workouts, Program sections
6. Create, edit, delete items

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(admin): wire up all admin routes with real components"
```

---

## Task 14: Media Upload Component (Exercise Video + Program Poster)

**Files:**
- Create: `/Users/tasdi/apt-web/src/admin/components/MediaUpload.tsx`
- Create: `/Users/tasdi/apt-web/src/admin/components/MediaUpload.test.tsx`

This adds S3 file upload capability. Admin uploads an MP4 video (for exercises) or an image (for program posters). The component uploads to S3 using Amplify Storage, then creates a Media record in DynamoDB.

- [ ] **Step 1: Write failing test**

Create `/Users/tasdi/apt-web/src/admin/components/MediaUpload.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MediaUpload } from './MediaUpload';

describe('MediaUpload', () => {
  it('renders upload button with label', () => {
    render(<MediaUpload label="Ladda upp video" accept="video/mp4" onUpload={vi.fn()} />);
    expect(screen.getByText('Ladda upp video')).toBeInTheDocument();
  });

  it('shows file name after selection', async () => {
    const file = new File(['video'], 'squat.mp4', { type: 'video/mp4' });
    render(<MediaUpload label="Video" accept="video/mp4" onUpload={vi.fn()} />);

    const input = screen.getByLabelText(/video/i) as HTMLInputElement;
    await userEvent.upload(input, file);

    expect(screen.getByText('squat.mp4')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement MediaUpload**

Create `/Users/tasdi/apt-web/src/admin/components/MediaUpload.tsx`:

```tsx
import { useState, useRef } from 'react';
import { uploadData } from 'aws-amplify/storage';

interface MediaUploadProps {
  label: string;
  accept: string;
  fileKeyPrefix: string;
  onUpload: (fileKey: string) => void;
}

export function MediaUpload({ label, accept, fileKeyPrefix, onUpload }: MediaUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    setUploading(true);
    try {
      const fileKey = `${fileKeyPrefix}${file.name}`;
      await uploadData({ key: fileKey, data: file });
      onUpload(fileKey);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-sm text-gray-300 mb-1">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        aria-label={label}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="text-sm text-gray-400"
      />
      {fileName && <p className="text-xs text-gray-500 mt-1">{uploading ? 'Laddar upp...' : fileName}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Integrate MediaUpload into ExerciseForm and ProgramForm**

In ExerciseForm: add MediaUpload for video (accept: `video/mp4`, prefix: `exercise_video/`) and poster (accept: `image/*`, prefix: `exercise_poster/`). After upload, create Media + ExerciseVideoMedia/ExercisePosterMedia records.

In ProgramForm: add MediaUpload for poster (accept: `image/*`, prefix: `program_poster/`). After upload, create Media + ProgramMedia records.

- [ ] **Step 6: Run all tests**

```bash
npx vitest run
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(admin): add MediaUpload component with S3 integration"
```

---

## Summary of Execution Order

| Task | Description | Depends on |
|------|------------|-----------|
| 1 | Test infrastructure (Vitest) | — |
| 2 | Amplify SDK setup | — |
| 3 | AdminAuthProvider | 1, 2 |
| 4 | AdminLogin page | 3 |
| 5 | ProtectedRoute | 3 |
| 6 | AdminLayout + routing | 4, 5 |
| 7 | Shared components (DataTable, SearchInput, ConfirmDialog) | 1 |
| 8 | Exercise API layer | 2 |
| 9 | ExerciseList | 7, 8 |
| 10 | ExerciseForm | 7, 8 |
| 11 | Workout API + List + Form | 7, 8 (uses exercise picker) |
| 12 | Program API + List + Form | 7, 11 (uses workout picker) |
| 13 | Wire up final routes | 9, 10, 11, 12 |
| 14 | Media upload | 2, 10, 12 |

Tasks 1+2 can be done in parallel. Tasks 7+8 can be done in parallel. Tasks 9+10 can be done in parallel.
