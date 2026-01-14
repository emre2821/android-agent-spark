import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ProtectedRoute from './ProtectedRoute';
import { AuthContext } from '@/hooks/use-auth';

const baseAuthValue = {
  token: null,
  user: null,
  workspaces: [],
  currentWorkspace: null,
  currentRole: null,
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  setWorkspace: vi.fn(),
};

describe('ProtectedRoute', () => {
  it('redirects to login when unauthenticated', () => {
    render(
      <AuthContext.Provider value={baseAuthValue}>
        <MemoryRouter initialEntries={["/secure"]}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/secure" element={<div>Secret</div>} />
            </Route>
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders nested routes when authenticated', () => {
    render(
      <AuthContext.Provider
        value={{
          ...baseAuthValue,
          token: 'token',
          user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
          isAuthenticated: true,
        }}
      >
        <MemoryRouter initialEntries={["/secure"]}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/secure" element={<div>Secret</div>} />
            </Route>
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Secret')).toBeInTheDocument();
  });
});
