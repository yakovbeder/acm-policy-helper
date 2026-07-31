import {
  Alert,
  Button,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Label,
  LabelGroup,
  Radio,
  Spinner,
} from '@patternfly/react-core';
import MinusCircleIcon from '@patternfly/react-icons/dist/esm/icons/minus-circle-icon';
import PlusCircleIcon from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon';
import {
  ClusterMultiSelect,
  ClusterTypeaheadSelect,
} from '../ClusterCatalogSelect';
import { SelectField } from '../SelectField';
import { useClusterCatalog } from '../../hooks/useClusterCatalog';
import { usePlacementTargets } from '../../hooks/usePlacementTargets';
import type { MatchExpression, PlacementConfig, PolicyFormState } from '../../types';

interface Props {
  form: PolicyFormState;
  onChange: (patch: Partial<PolicyFormState>) => void;
}

const OPERATORS: MatchExpression['operator'][] = ['In', 'NotIn', 'Exists', 'DoesNotExist'];

export function PlacementStep({ form, onChange }: Props) {
  const placement = form.placement;
  const { clusterSets, labels, loading, error } = useClusterCatalog();
  const {
    targets: placementTargets,
    loading: targetsLoading,
    error: targetsError,
  } = usePlacementTargets(form.namespace);

  const updatePlacement = (patch: Partial<PlacementConfig>) => {
    onChange({ placement: { ...placement, ...patch } });
  };

  const matchLabelsEntries = Object.entries(placement.labelSelector.matchLabels || {});
  const hasMatchLabels = matchLabelsEntries.some(([key]) => key.trim());
  const hasMatchExpressions = (placement.labelSelector.matchExpressions || []).some((expr) =>
    expr.key.trim()
  );
  const showEmptySelectorNote =
    placement.mode === 'labelSelector' && !hasMatchLabels && !hasMatchExpressions;

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

  if (loading) {
    return (
      <HelperText>
        <HelperTextItem icon={<Spinner size="sm" />}>
          Loading ManagedClusterSets and cluster labels…
        </HelperTextItem>
      </HelperText>
    );
  }

  return (
    <Form>
      <FormGroup label="Placement targeting" fieldId="placement-mode">
        <div className="policy-radio-options" role="radiogroup" aria-label="Placement targeting">
          <Radio
            id="mode-labels"
            name="placement-mode"
            label="Cluster label selectors"
            description="Select managed clusters using matchLabels and matchExpressions (ACM Placement predicate)."
            isChecked={placement.mode === 'labelSelector'}
            onChange={() => updatePlacement({ mode: 'labelSelector' })}
          />
          <Radio
            id="mode-clustersets"
            name="placement-mode"
            label="ManagedClusterSets"
            description="Target clusters via Placement spec.clusterSets plus optional label predicates."
            isChecked={placement.mode === 'clusterSets'}
            onChange={() => updatePlacement({ mode: 'clusterSets' })}
          />
        </div>
      </FormGroup>

      {error && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              Could not fully load hub cluster catalog ({error}). You can still type values
              manually where creatable fields allow it.
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}

      {placement.mode === 'labelSelector' && (
        <>
          {showEmptySelectorNote && (
            <Alert
              variant={
                !form.namespace.trim()
                  ? 'info'
                  : placementTargets && placementTargets.clusterSets.length === 0
                    ? 'warning'
                    : 'info'
              }
              title="Empty label selector targets all bound clusters"
              isInline
              style={{ marginBottom: '1rem' }}
            >
              {!form.namespace.trim() ? (
                <p>
                  With no matchLabels or matchExpressions, Placement selects all ManagedClusters
                  from ManagedClusterSets bound to the policy namespace. Choose a namespace in Policy
                  settings to preview those targets.
                </p>
              ) : targetsLoading ? (
                <HelperText>
                  <HelperTextItem icon={<Spinner size="sm" />}>
                    Loading ManagedClusterSetBindings for namespace {form.namespace}…
                  </HelperTextItem>
                </HelperText>
              ) : targetsError ? (
                <p>
                  With no matchLabels or matchExpressions, Placement selects all clusters from
                  ManagedClusterSets bound to <strong>{form.namespace}</strong>. Could not load
                  current bindings ({targetsError}).
                </p>
              ) : placementTargets && placementTargets.clusterSets.length === 0 ? (
                <p>
                  No ManagedClusterSetBindings found in <strong>{form.namespace}</strong>. An empty
                  Placement selector will select <strong>zero</strong> clusters until a binding
                  exists in that namespace.
                </p>
              ) : (
                <>
                  <p>
                    With no matchLabels or matchExpressions, Placement selects all clusters from
                    ManagedClusterSets bound to <strong>{form.namespace}</strong>.
                  </p>
                  <p style={{ marginTop: '0.5rem', marginBottom: '0.25rem' }}>
                    Bound cluster sets:
                  </p>
                  <LabelGroup numLabels={12}>
                    {placementTargets?.clusterSets.map((set) => (
                      <Label key={set} color="blue">
                        {set}
                      </Label>
                    ))}
                  </LabelGroup>
                  <p style={{ marginTop: '0.75rem', marginBottom: '0.25rem' }}>
                    Clusters currently in those sets ({placementTargets?.clusters.length ?? 0}):
                  </p>
                  {placementTargets && placementTargets.clusters.length > 0 ? (
                    <LabelGroup numLabels={20}>
                      {placementTargets.clusters.map((cluster) => (
                        <Label key={cluster} color="grey">
                          {cluster}
                        </Label>
                      ))}
                    </LabelGroup>
                  ) : (
                    <HelperText>
                      <HelperTextItem>
                        No ManagedClusters currently match the bound sets (or membership could not
                        be resolved from the clusterset label).
                      </HelperTextItem>
                    </HelperText>
                  )}
                </>
              )}
            </Alert>
          )}
          <FormGroup label="matchLabels" fieldId="match-labels">
            {matchLabelsEntries.map(([key, value], index) => (
              <div
                key={`label-${index}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr auto',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                }}
              >
                <ClusterTypeaheadSelect
                  id={`label-key-${index}`}
                  value={key}
                  options={labels.keys}
                  placeholder="Select label key"
                  onChange={(v) => setMatchLabel(index, v, value)}
                />
                <ClusterTypeaheadSelect
                  id={`label-value-${index}`}
                  value={value}
                  options={labels.valuesByKey[key] || []}
                  placeholder="Select label value"
                  onChange={(v) => setMatchLabel(index, key, v)}
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
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Keys and values are loaded from ManagedCluster labels on the hub.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </>
      )}

      {placement.mode === 'clusterSets' && (
        <FormGroup label="Cluster sets" isRequired fieldId="cluster-sets">
          <ClusterMultiSelect
            id="cluster-sets"
            values={placement.clusterSets}
            options={clusterSets}
            placeholder="Select ManagedClusterSets"
            onChange={(next) => updatePlacement({ clusterSets: next })}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                {clusterSets.length
                  ? `Available on hub: ${clusterSets.join(', ')}. A ManagedClusterSetBinding is generated for each selected set in the policy namespace.`
                  : 'No ManagedClusterSets found. Ensure ACM is installed and this app can list managedclustersets.'}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
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
            <ClusterTypeaheadSelect
              id={`expr-key-${index}`}
              value={expr.key}
              options={labels.keys}
              placeholder="Select label key"
              onChange={(v) => updateExpression(index, { key: v })}
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
            <ClusterMultiSelect
              id={`expr-values-${index}`}
              values={expr.values || []}
              options={labels.valuesByKey[expr.key] || []}
              placeholder={
                expr.operator === 'Exists' || expr.operator === 'DoesNotExist'
                  ? 'N/A for this operator'
                  : 'Select values'
              }
              isDisabled={expr.operator === 'Exists' || expr.operator === 'DoesNotExist'}
              onChange={(values) => updateExpression(index, { values })}
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
