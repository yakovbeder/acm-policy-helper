import {
  Button,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Radio,
  TextInput,
} from '@patternfly/react-core';
import MinusCircleIcon from '@patternfly/react-icons/dist/esm/icons/minus-circle-icon';
import PlusCircleIcon from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon';
import { ChipInput } from '../ChipInput';
import { SelectField } from '../SelectField';
import type { MatchExpression, PlacementConfig, PolicyFormState } from '../../types';

interface Props {
  form: PolicyFormState;
  onChange: (patch: Partial<PolicyFormState>) => void;
}

const OPERATORS: MatchExpression['operator'][] = ['In', 'NotIn', 'Exists', 'DoesNotExist'];

export function PlacementStep({ form, onChange }: Props) {
  const placement = form.placement;

  const updatePlacement = (patch: Partial<PlacementConfig>) => {
    onChange({ placement: { ...placement, ...patch } });
  };

  const matchLabelsEntries = Object.entries(placement.labelSelector.matchLabels || {});

  const setMatchLabel = (index: number, key: string, value: string) => {
    const entries = [...matchLabelsEntries];
    entries[index] = [key, value];
    const matchLabels = Object.fromEntries(entries.filter(([k]) => k.trim()));
    updatePlacement({
      labelSelector: { ...placement.labelSelector, matchLabels },
    });
  };

  const addMatchLabel = () => {
    updatePlacement({
      labelSelector: {
        ...placement.labelSelector,
        matchLabels: { ...placement.labelSelector.matchLabels, '': '' },
      },
    });
  };

  const removeMatchLabel = (index: number) => {
    const entries = matchLabelsEntries.filter((_, i) => i !== index);
    updatePlacement({
      labelSelector: {
        ...placement.labelSelector,
        matchLabels: Object.fromEntries(entries),
      },
    });
  };

  const expressions =
    placement.mode === 'labelSelector'
      ? placement.labelSelector.matchExpressions
      : placement.matchExpressions;

  const setExpressions = (next: MatchExpression[]) => {
    if (placement.mode === 'labelSelector') {
      updatePlacement({
        labelSelector: { ...placement.labelSelector, matchExpressions: next },
      });
    } else {
      updatePlacement({ matchExpressions: next });
    }
  };

  const updateExpression = (index: number, patch: Partial<MatchExpression>) => {
    const next = expressions.map((expr, i) => (i === index ? { ...expr, ...patch } : expr));
    setExpressions(next);
  };

  return (
    <Form>
      <FormGroup label="Placement targeting" fieldId="placement-mode">
        <Radio
          id="mode-labels"
          name="placement-mode"
          label="Cluster label selectors"
          description="Select managed clusters using matchLabels and matchExpressions."
          isChecked={placement.mode === 'labelSelector'}
          onChange={() => updatePlacement({ mode: 'labelSelector' })}
        />
        <Radio
          id="mode-clustersets"
          name="placement-mode"
          label="ManagedClusterSets"
          description="Select clusters from named cluster sets, with optional label predicates."
          isChecked={placement.mode === 'clusterSets'}
          onChange={() => updatePlacement({ mode: 'clusterSets' })}
        />
      </FormGroup>

      {placement.mode === 'labelSelector' && (
        <>
          <FormGroup label="matchLabels" fieldId="match-labels">
            {matchLabelsEntries.map(([key, value], index) => (
              <div
                key={`label-${index}`}
                style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}
              >
                <TextInput
                  aria-label={`label-key-${index}`}
                  placeholder="key"
                  value={key}
                  onChange={(_e, v) => setMatchLabel(index, v, value)}
                />
                <TextInput
                  aria-label={`label-value-${index}`}
                  placeholder="value"
                  value={value}
                  onChange={(_e, v) => setMatchLabel(index, key, v)}
                />
                <Button
                  variant="plain"
                  icon={<MinusCircleIcon />}
                  aria-label={`Remove label ${index}`}
                  onClick={() => removeMatchLabel(index)}
                />
              </div>
            ))}
            <Button variant="link" icon={<PlusCircleIcon />} onClick={addMatchLabel}>
              Add matchLabel
            </Button>
          </FormGroup>
        </>
      )}

      {placement.mode === 'clusterSets' && (
        <>
          <ChipInput
            label="Cluster sets"
            values={placement.clusterSets}
            onChange={(clusterSets) => updatePlacement({ clusterSets })}
            placeholder="default"
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                A ManagedClusterSetBinding will be generated for each cluster set in the policy
                namespace.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </>
      )}

      <FormGroup label="matchExpressions" fieldId="match-expressions">
        {expressions.map((expr, index) => (
          <div
            key={`expr-${index}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr auto',
              gap: '0.5rem',
              marginBottom: '0.5rem',
            }}
          >
            <TextInput
              aria-label={`expr-key-${index}`}
              placeholder="key"
              value={expr.key}
              onChange={(_e, v) => updateExpression(index, { key: v })}
            />
            <SelectField
              id={`expr-operator-${index}`}
              aria-label={`expr-operator-${index}`}
              value={expr.operator}
              onChange={(v) =>
                updateExpression(index, {
                  operator: v as MatchExpression['operator'],
                })
              }
              options={OPERATORS.map((op) => ({ value: op, label: op }))}
            />
            <TextInput
              aria-label={`expr-values-${index}`}
              placeholder="comma-separated values"
              value={(expr.values || []).join(',')}
              isDisabled={expr.operator === 'Exists' || expr.operator === 'DoesNotExist'}
              onChange={(_e, v) =>
                updateExpression(index, {
                  values: v
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
            <Button
              variant="plain"
              icon={<MinusCircleIcon />}
              aria-label={`Remove expression ${index}`}
              onClick={() => setExpressions(expressions.filter((_, i) => i !== index))}
            />
          </div>
        ))}
        <Button
          variant="link"
          icon={<PlusCircleIcon />}
          onClick={() =>
            setExpressions([...expressions, { key: '', operator: 'In', values: [] }])
          }
        >
          Add matchExpression
        </Button>
      </FormGroup>
    </Form>
  );
}
