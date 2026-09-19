import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageDots } from './Bits';
import { CardRow } from './CardRow';
import { SearchField } from './SearchField';
import { SectionLabel } from './SectionLabel';
import { TrayChip } from './TrayChip';

describe('CardRow', () => {
  it('offers Add, then Remove once selected', () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <CardRow
        name="Atlas"
        issuer="Axis"
        tint="#262624"
        sub="Axis Bank · Travel"
        onToggle={onToggle}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add Atlas' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    rerender(<CardRow name="Atlas" issuer="Axis" tint="#262624" selected onToggle={onToggle} />);
    expect(screen.getByRole('button', { name: 'Remove Atlas' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
  it('is read-only without onToggle and shows tags', () => {
    render(<CardRow name="Atlas" issuer="Axis" tint="#262624" tags={['Travel', 'Lounge']} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Lounge')).toBeInTheDocument();
  });
});

describe('TrayChip', () => {
  it('removes', () => {
    const onRemove = vi.fn();
    render(<TrayChip name="Atlas" tint="#262624" onRemove={onRemove} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Atlas' }));
    expect(onRemove).toHaveBeenCalled();
  });
});

describe('SearchField', () => {
  it('is a labelled search input', () => {
    render(<SearchField id="q" label="Search cards" placeholder="Search by bank or card name" />);
    expect(screen.getByRole('searchbox', { name: 'Search cards' })).toBeInTheDocument();
  });
});

describe('SectionLabel', () => {
  it('shows a count badge', () => {
    render(<SectionLabel count={2}>Your cards</SectionLabel>);
    expect(screen.getByRole('heading', { name: 'Your cards' })).toBeInTheDocument();
    expect(screen.getByLabelText('2 selected')).toHaveTextContent('2');
  });
});

describe('PageDots', () => {
  it('marks the active dot and selects another', () => {
    const onSelect = vi.fn();
    render(
      <PageDots count={3} active={1} onSelect={onSelect} labelFor={(i) => `Show card ${i + 1}`} />,
    );
    expect(screen.getByRole('button', { name: 'Show card 2' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show card 3' }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });
});
