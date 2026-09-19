import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AvatarRow } from './AvatarRow';
import { Button, buttonStyle } from './Button';
import { CardTile } from './CardTile';
import { Chip } from './Chip';
import { TabBar } from './TabBar';
import { Toggle } from './Toggle';
import { Wordmark } from './Wordmark';
import { avatarColorFor, color, initialOf } from './tokens';

describe('tokens', () => {
  it('assigns a stable avatar colour per id', () => {
    expect(avatarColorFor('u1')).toBe(avatarColorFor('u1'));
    expect(color.avatars).toContain(avatarColorFor('anything'));
  });
  it('takes the initial of the first name', () => {
    expect(initialOf('raja jain')).toBe('R');
    expect(initialOf('   ')).toBe('?');
  });
});

describe('Wordmark', () => {
  it('is an image named Toli with an Iris tittle, lifted on Midnight', () => {
    const { rerender } = render(<Wordmark />);
    const paths = () => [...screen.getByRole('img', { name: 'Toli' }).querySelectorAll('path')];
    expect(paths().map((p) => p.getAttribute('fill'))).toEqual([color.ink, color.accent]);
    rerender(<Wordmark tone="paper" height={40} />);
    expect(paths().map((p) => p.getAttribute('fill'))).toEqual([color.paper, color.accentOnInk]);
    expect(screen.getByRole('img', { name: 'Toli' })).toHaveAttribute('height', '40');
  });
});

describe('Chip', () => {
  it('reflects selection via aria-pressed', () => {
    render(<Chip selected>Dining</Chip>);
    expect(screen.getByRole('button', { name: 'Dining' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Toggle', () => {
  it('is a switch that flips on click', () => {
    const onChange = vi.fn();
    render(<Toggle on={false} onChange={onChange} label="Visible to Weekend Crew" />);
    const sw = screen.getByRole('switch', { name: 'Visible to Weekend Crew' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('Toggle busy state', () => {
  it('says when a change has not been saved yet', () => {
    const { rerender } = render(<Toggle on onChange={() => {}} label="Visible to Crew" busy />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-busy', 'true');
    rerender(<Toggle on onChange={() => {}} label="Visible to Crew" />);
    expect(screen.getByRole('switch')).not.toHaveAttribute('aria-busy');
  });
});

describe('CardTile', () => {
  it('names the card by issuer and name only', () => {
    render(<CardTile name="Millennia" issuer="HDFC" tint="#6B4D9E" />);
    expect(screen.getByRole('img', { name: 'HDFC Millennia' })).toBeInTheDocument();
  });
  it('wallet variant is selectable', () => {
    const onClick = vi.fn();
    render(
      <CardTile name="Millennia" issuer="HDFC" tint="#6B4D9E" variant="wallet" onClick={onClick} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Select Millennia' }));
    expect(onClick).toHaveBeenCalled();
  });
});

describe('AvatarRow', () => {
  it('selects a person and exposes the invite action', () => {
    const onSelect = vi.fn();
    const invite = vi.fn();
    render(
      <AvatarRow
        people={[
          { id: 'all', name: 'Everyone' },
          { id: 'u1', name: 'Rahul' },
          { id: 'u2', name: 'Arjun', empty: true },
        ]}
        selectedId="all"
        onSelect={onSelect}
        action={{ label: 'Invite', onClick: invite }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Everyone' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Rahul' }));
    expect(onSelect).toHaveBeenCalledWith('u1');
    fireEvent.click(screen.getByRole('button', { name: 'Invite' }));
    expect(invite).toHaveBeenCalled();
  });
});

describe('TabBar', () => {
  const items = [
    { id: 'groups', label: 'Groups', href: '/groups', icon: <span /> },
    { id: 'find', label: 'Find', href: '/find', icon: <span /> },
  ];
  it('marks the active tab with aria-current and a dot', () => {
    render(<TabBar items={items} activeId="find" />);
    expect(screen.getByRole('link', { name: /Find/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByTestId('tab-dot')).toHaveLength(1);
  });
});

describe('Button', () => {
  it('renders a pill button', () => {
    render(<Button>Continue</Button>);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });
  it('gives every variant a visible surface, so no action reads as a text link', () => {
    for (const variant of ['primary', 'secondary', 'tonal', 'danger'] as const) {
      const { background } = buttonStyle({ variant });
      expect(background, variant).toBeTruthy();
      expect(background, variant).not.toBe('transparent');
    }
  });
  it('shows a disabled button as a flat, quiet surface', () => {
    render(<Button disabled>Continue</Button>);
    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).toBeDisabled();
    expect(button.style.boxShadow).toBe('');
    expect(button.style.cursor).toBe('not-allowed');
  });
  it('lends its look to a link without nesting a button in it', () => {
    expect(buttonStyle({ full: true })).toMatchObject({ width: '100%', textDecoration: 'none' });
  });
});
