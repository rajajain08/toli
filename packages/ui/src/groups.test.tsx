import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GroupTile, PersonHeader, ToggleRow } from './GroupTile';
import { Toggle } from './Toggle';

describe('GroupTile', () => {
  it('shows the name and the summary', () => {
    render(<GroupTile name="Weekend Crew" summary="4 members · 7 cards" />);
    expect(screen.getByText('Weekend Crew')).toBeInTheDocument();
    expect(screen.getByText('4 members · 7 cards')).toBeInTheDocument();
  });
});

describe('ToggleRow', () => {
  it('pairs a label with its switch', () => {
    render(
      <ToggleRow label="Weekend Crew">
        <Toggle on onChange={() => {}} label="Visible to Weekend Crew" />
      </ToggleRow>,
    );
    expect(screen.getByRole('switch', { name: 'Visible to Weekend Crew' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});

describe('PersonHeader', () => {
  it('shows the person and a note', () => {
    render(<PersonHeader id="u1" name="Rahul" note="2 cards" />);
    expect(screen.getByText('Rahul')).toBeInTheDocument();
    expect(screen.getByText('2 cards')).toBeInTheDocument();
  });
});
