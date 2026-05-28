import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('should render the application heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /planixor/i })).toBeInTheDocument();
  });
});
