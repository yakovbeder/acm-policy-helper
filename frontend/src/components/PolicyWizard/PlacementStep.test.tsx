import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlacementStep } from './PlacementStep';
import { defaultFormState } from '../../types';

vi.mock('../../hooks/useClusterCatalog', () => ({
  useClusterCatalog: () => ({
    clusterSets: ['default', 'production'],
    labels: { keys: ['environment', 'region'], valuesByKey: { environment: ['dev', 'prod'] } },
    loading: false,
    error: null,
  }),
}));

vi.mock('../../hooks/usePlacementTargets', () => ({
  usePlacementTargets: () => ({
    targets: { clusterSets: ['default'], clusters: ['cluster-1'] },
    loading: false,
    error: null,
  }),
}));

vi.mock('../ClusterCatalogSelect', () => ({
  ClusterTypeaheadSelect: ({
    id,
    value,
    placeholder,
    onChange,
  }: {
    id: string;
    value: string;
    options: string[];
    placeholder: string;
    onChange: (v: string) => void;
  }) => (
    <input
      data-testid={id}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  ClusterMultiSelect: ({
    id,
    values,
    placeholder,
    onChange,
    isDisabled,
  }: {
    id: string;
    values: string[];
    options: string[];
    placeholder: string;
    onChange: (v: string[]) => void;
    isDisabled?: boolean;
  }) => (
    <select
      data-testid={id}
      multiple
      disabled={isDisabled}
      value={values}
      onChange={(e) =>
        onChange(Array.from(e.target.selectedOptions).map((o) => o.value))
      }
    >
      <option>{placeholder}</option>
    </select>
  ),
}));

vi.mock('../SelectField', () => ({
  SelectField: ({
    id,
    value,
    onChange,
    options,
  }: {
    id: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    'aria-label'?: string;
    isDisabled?: boolean;
  }) => (
    <select data-testid={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

describe('PlacementStep', () => {
  const setup = (overrides: Partial<ReturnType<typeof defaultFormState>> = {}) => {
    const form = { ...defaultFormState(), ...overrides };
    const onChange = vi.fn();
    const { container } = render(<PlacementStep form={form} onChange={onChange} />);
    return { form, onChange, container };
  };

  it('defaults to labelSelector mode', () => {
    const { container } = setup();
    const radio = container.querySelector('#mode-labels') as HTMLInputElement;
    expect(radio.checked).toBe(true);
  });

  it('shows empty-selector alert when namespace is set and no labels configured', () => {
    const { container } = setup({ namespace: 'policies' });
    expect(container.querySelector('.pf-v6-c-alert')).toBeInTheDocument();
    expect(container.querySelector('.pf-v6-c-alert__title')).toHaveTextContent(
      /empty label selector targets all bound clusters/i
    );
  });

  it('shows bound cluster sets and clusters in empty-selector alert', () => {
    const { container } = setup({ namespace: 'policies' });
    const alert = container.querySelector('.pf-v6-c-alert')!;
    expect(alert).toHaveTextContent('default');
    expect(alert).toHaveTextContent('cluster-1');
  });

  it('switches to clusterSets mode on radio click', () => {
    const { onChange, container } = setup();
    const radio = container.querySelector('#mode-clustersets') as HTMLInputElement;
    fireEvent.click(radio);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        placement: expect.objectContaining({ mode: 'clusterSets' }),
      })
    );
  });

  it('shows cluster sets select in clusterSets mode', () => {
    const { container } = setup({
      placement: {
        mode: 'clusterSets',
        labelSelector: { matchLabels: {}, matchExpressions: [] },
        clusterSets: [],
        matchExpressions: [],
      },
    });
    const radio = container.querySelector('#mode-clustersets') as HTMLInputElement;
    expect(radio.checked).toBe(true);
    expect(screen.getByTestId('cluster-sets')).toBeInTheDocument();
  });

  it('adds a matchLabel row', () => {
    const { onChange, container } = setup();
    const buttons = Array.from(container.querySelectorAll('button'));
    const addBtn = buttons.find((b) => b.textContent?.includes('Add matchLabel'))!;
    fireEvent.click(addBtn);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        placement: expect.objectContaining({
          labelSelector: expect.objectContaining({
            matchLabels: { '': '' },
          }),
        }),
      })
    );
  });

  it('adds a matchExpression row', () => {
    const { onChange, container } = setup();
    const buttons = Array.from(container.querySelectorAll('button'));
    const addBtn = buttons.find((b) => b.textContent?.includes('Add matchExpression'))!;
    fireEvent.click(addBtn);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        placement: expect.objectContaining({
          labelSelector: expect.objectContaining({
            matchExpressions: [{ key: '', operator: 'In', values: [] }],
          }),
        }),
      })
    );
  });

  it('hides empty-selector alert when matchLabels exist', () => {
    const { container } = setup({
      namespace: 'policies',
      placement: {
        mode: 'labelSelector',
        labelSelector: {
          matchLabels: { environment: 'dev' },
          matchExpressions: [],
        },
        clusterSets: [],
        matchExpressions: [],
      },
    });
    expect(container.querySelector('.pf-v6-c-alert')).not.toBeInTheDocument();
  });
});
