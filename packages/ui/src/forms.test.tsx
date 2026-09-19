import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from './Checkbox';
import { TextField } from './TextField';

describe('TextField', () => {
  it('labels the input and shows a prefix', () => {
    render(<TextField id="phone" label="Your phone number" prefix="+91" type="tel" />);
    expect(screen.getByLabelText('Your phone number')).toHaveAttribute('type', 'tel');
    expect(screen.getByText('+91')).toBeInTheDocument();
  });
  it('announces an error', () => {
    render(<TextField id="phone" label="Phone" error="enter a valid phone number" />);
    expect(screen.getByRole('alert')).toHaveTextContent('enter a valid phone number');
    expect(screen.getByLabelText('Phone')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('TextField layout', () => {
  it('reserves the message line whether or not there is a message', () => {
    const { container, rerender } = render(<TextField id="n" label="Name" />);
    const slot = () =>
      container.querySelector('label')!.parentElement!.lastElementChild as HTMLElement;
    expect(slot().style.minHeight).toBe('18px');
    rerender(<TextField id="n" label="Name" error="required" />);
    expect(slot().style.minHeight).toBe('18px');
  });
});

describe('Checkbox', () => {
  it('can be marked invalid and described', () => {
    render(
      <Checkbox id="c" checked={false} onChange={() => {}} invalid describedBy="c-error">
        I agree
      </Checkbox>,
    );
    expect(screen.getByLabelText('I agree')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('I agree')).toHaveAttribute('aria-describedby', 'c-error');
  });
  it('toggles through the label', () => {
    const onChange = vi.fn();
    render(
      <Checkbox id="consent" checked={false} onChange={onChange}>
        I agree
      </Checkbox>,
    );
    fireEvent.click(screen.getByLabelText('I agree'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
