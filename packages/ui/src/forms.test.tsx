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

describe('Checkbox', () => {
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
