import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { useRef } from 'react';
import { ErrorBoundary } from '@renderer/components/ErrorBoundary';

/** Throws on first render only (per component instance). After Try Again, React remounts so this instance is new and throws again. */
function ThrowOnce({ children }: { children: React.ReactNode }) {
  const threw = useRef(false);
  if (!threw.current) {
    threw.current = true;
    throw new Error('test error');
  }
  return <>{children}</>;
}

/** Renders ThrowOnce when shouldThrow is true, otherwise renders children. Use for "Try Again" test so after click we can show non-throwing content. */
function ThrowWhen({ shouldThrow, children }: { shouldThrow: boolean; children: React.ReactNode }) {
  if (shouldThrow) {
    return <ThrowOnce>{children}</ThrowOnce>;
  }
  return <>{children}</>;
}

describe('ErrorBoundary', () => {
  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <span>Child content</span>
      </ErrorBoundary>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('should show default error UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowOnce>
          <span>Recovered</span>
        </ThrowOnce>
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred. Please try refreshing the application.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('should render children again after Try Again is clicked', () => {
    let setThrow: (v: boolean) => void;
    const Parent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);
      setThrow = setShouldThrow;
      return (
        <ErrorBoundary>
          <ThrowWhen shouldThrow={shouldThrow}>
            <span>Recovered</span>
          </ThrowWhen>
        </ErrorBoundary>
      );
    };
    render(<Parent />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    setThrow!(false);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByText('Recovered')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('should render fallback when child throws and fallback prop is provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowOnce>
          <span>Recovered</span>
        </ThrowOnce>
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });
});
