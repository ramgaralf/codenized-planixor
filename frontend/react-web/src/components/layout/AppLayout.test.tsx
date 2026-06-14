import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { AppLayout } from './AppLayout';

describe('AppLayout', () => {
  it('should render main content as a main element', () => {
    render(
      <AppLayout>
        <div>Main Content</div>
      </AppLayout>,
    );

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveTextContent('Main Content');
  });

  it('should render sidebar when provided', () => {
    render(
      <AppLayout sidebar={<div>Sidebar Content</div>}>
        <div>Main</div>
      </AppLayout>,
    );

    const sidebar = screen.getByRole('complementary', { name: '' });
    expect(sidebar).toHaveTextContent('Sidebar Content');
  });

  it('should render right panel when provided', () => {
    render(
      <AppLayout rightPanel={<div>Right Panel Content</div>}>
        <div>Main</div>
      </AppLayout>,
    );

    const asides = screen.getAllByRole('complementary');
    const rightPanel = asides.find((el) =>
      el.textContent?.includes('Right Panel Content'),
    );
    expect(rightPanel).toBeInTheDocument();
  });

  it('should render bottom nav when provided', () => {
    render(
      <AppLayout bottomNav={<div>Bottom Nav</div>}>
        <div>Main</div>
      </AppLayout>,
    );

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveTextContent('Bottom Nav');
  });

  it('should render FAB when provided', () => {
    render(
      <AppLayout fab={<button>+</button>}>
        <div>Main</div>
      </AppLayout>,
    );

    expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument();
  });

  it('should not render sidebar when not provided', () => {
    render(
      <AppLayout>
        <div>Main</div>
      </AppLayout>,
    );

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('should not render bottom nav when not provided', () => {
    render(
      <AppLayout>
        <div>Main</div>
      </AppLayout>,
    );

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('should apply layout class to the root container', () => {
    const { container } = render(
      <AppLayout>
        <div>Main</div>
      </AppLayout>,
    );

    const layoutDiv = container.firstElementChild;
    expect(layoutDiv).toHaveClass(/_layout/);
  });
});
