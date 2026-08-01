import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PolicySettingsStep } from './PolicySettingsStep';
import { defaultFormState } from '../../types';

vi.mock('../NamespaceSelect', () => ({
  NamespaceSelect: ({
    value,
    onChange,
    onBlur,
    validated,
  }: {
    id: string;
    value: string;
    onChange: (v: string) => void;
    onBlur?: () => void;
    validated?: string;
  }) => (
    <input
      data-testid="namespace-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      aria-invalid={validated === 'error'}
    />
  ),
}));

describe('PolicySettingsStep', () => {
  const setup = (overrides: Partial<ReturnType<typeof defaultFormState>> = {}) => {
    const form = { ...defaultFormState(), ...overrides };
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<PolicySettingsStep form={form} onChange={onChange} />);
    return { form, onChange, user, container };
  };

  it('renders required fields', () => {
    const { container } = setup({ policyName: 'test' });
    expect(container.querySelector('#policy-name')).toBeInTheDocument();
    expect(screen.getByTestId('namespace-select')).toBeInTheDocument();
  });

  it('shows "Required" error for empty policy name on mount', () => {
    setup({ policyName: '' });
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('fires onChange when typing in the name field', async () => {
    const { onChange, user, container } = setup({ policyName: '' });
    const nameInput = container.querySelector('#policy-name') as HTMLInputElement;
    await user.type(nameInput, 'p');
    expect(onChange).toHaveBeenCalledWith({ policyName: 'p' });
  });

  it('calls onChange when selecting enforce remediation', () => {
    const { onChange, container } = setup({ remediationAction: 'inform' });
    const enforceRadio = container.querySelector('#remediation-enforce') as HTMLInputElement;
    fireEvent.click(enforceRadio);
    expect(onChange).toHaveBeenCalledWith({ remediationAction: 'enforce' });
  });

  it('disables compliance type when consolidateManifests is off', () => {
    setup({ consolidateManifests: false });
    expect(screen.getByText(/disabled because each manifest/i)).toBeInTheDocument();
  });

  it('toggles consolidateManifests via switch', () => {
    const { onChange, container } = setup({ consolidateManifests: true });
    const switchInput = container.querySelector('#consolidate') as HTMLInputElement;
    fireEvent.click(switchInput);
    expect(onChange).toHaveBeenCalledWith({ consolidateManifests: false });
  });

  it('calls onChange with pruneObjectBehavior', () => {
    const { onChange, container } = setup({ pruneObjectBehavior: 'None' });
    const deleteAllRadio = container.querySelector('#prune-delete-all') as HTMLInputElement;
    fireEvent.click(deleteAllRadio);
    expect(onChange).toHaveBeenCalledWith({ pruneObjectBehavior: 'DeleteAll' });
  });

  it('calls onChange with disabled toggle', () => {
    const { onChange, container } = setup({ disabled: false });
    const switchInput = container.querySelector('#disabled') as HTMLInputElement;
    fireEvent.click(switchInput);
    expect(onChange).toHaveBeenCalledWith({ disabled: true });
  });
});
