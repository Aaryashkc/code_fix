import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomePage from '@/app/page';

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
vi.mock('@/context/AuthContext', () => ({
  AuthContext: {
    Consumer: ({ children }: { children: React.ReactNode }) => children,
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
  useContext: () => ({
    user: null,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe('Smoke Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
