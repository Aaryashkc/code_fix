import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomePage from '@/app/page';

const authState = vi.hoisted(() => ({
  user: null as null | { id: string; name: string; email: string; role: 'admin' },
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  refreshUser: vi.fn(),
  setUser: vi.fn(),
  isAuthenticated: false,
}));

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock AuthContext
vi.mock('@/context/AuthContext', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  return {
    AuthContext: React.createContext(authState),
  };
});

describe('Smoke Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = null;
    authState.isAuthenticated = false;
  });

  it('should render home page without crashing', () => {
    render(<HomePage />);
    expect(screen.getAllByText(/Yatra/i).length).toBeGreaterThan(0);
  });

  it('should have semantic main tag element', () => {
    render(<HomePage />);
    const main = document.querySelector('main');
    expect(main).toBeInTheDocument();
  });

  it('should render navigation elements', () => {
    render(<HomePage />);
    // Check for common navigation elements
    const navElements = document.querySelectorAll('nav, header, [role="navigation"]');
    expect(navElements.length).toBeGreaterThan(0);
  });

  it('should show an admin dashboard action instead of login when authenticated', () => {
    authState.user = {
      id: 'admin-id',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
    };
    authState.isAuthenticated = true;

    render(<HomePage />);

    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/admin/dashboard');
    expect(screen.queryByRole('button', { name: 'Login' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    expect(authState.logout).toHaveBeenCalledOnce();
  });
});
