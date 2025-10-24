import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { CreateAgentDialog } from './CreateAgentDialog';

describe('CreateAgentDialog', () => {
  const onClose = vi.fn();
  const onSubmit = vi.fn();

  beforeEach(() => {
    onClose.mockReset();
    onSubmit.mockReset();
  });

  it('submits the form with the entered data', () => {
    render(<CreateAgentDialog open onClose={onClose} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Agent Name'), {
      target: { value: 'Horizon' }
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Explores emergent opportunities' }
    });

    fireEvent.click(screen.getByRole('button', { name: /create agent/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Horizon',
      description: 'Explores emergent opportunities',
      status: 'active'
    });

    expect(screen.getByLabelText('Agent Name')).toHaveValue('');
  });

  it('closes when the cancel button is pressed', () => {
    render(<CreateAgentDialog open onClose={onClose} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
