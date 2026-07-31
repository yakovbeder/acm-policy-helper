import { useState } from 'react';
import {
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Radio,
  Switch,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import { ChipInput } from '../ChipInput';
import { NamespaceSelect } from '../NamespaceSelect';
import { SelectField } from '../SelectField';
import type { PolicyFormState } from '../../types';

interface Props {
  form: PolicyFormState;
  onChange: (patch: Partial<PolicyFormState>) => void;
}

export function PolicySettingsStep({ form, onChange }: Props) {
  // Match ACM: empty required fields show Required when the step opens.
  const [nameTouched, setNameTouched] = useState(!form.policyName.trim());
  const [namespaceTouched, setNamespaceTouched] = useState(!form.namespace.trim());

  // PF6: validated error + "Required" helper after touch/blur when empty.
  const nameInvalid = nameTouched && !form.policyName.trim();
  const namespaceInvalid = namespaceTouched && !form.namespace.trim();

  return (
    <Form isHorizontal={false}>
      <FormGroup label="Name" isRequired fieldId="policy-name">
        <TextInput
          id="policy-name"
          value={form.policyName}
          onChange={(_e, v) => {
            setNameTouched(true);
            onChange({ policyName: v });
          }}
          onBlur={() => setNameTouched(true)}
          placeholder="Enter the name"
          isRequired
          validated={nameInvalid ? 'error' : 'default'}
        />
        <FormHelperText>
          <HelperText>
            {nameInvalid ? (
              <HelperTextItem variant="error">Required</HelperTextItem>
            ) : (
              <HelperTextItem>Example: my-config-policy</HelperTextItem>
            )}
          </HelperText>
        </FormHelperText>
      </FormGroup>

      <FormGroup label="Description" fieldId="description">
        <TextArea
          id="description"
          value={form.description}
          onChange={(_e, v) => onChange({ description: v })}
          placeholder="Enter the description"
          resizeOrientation="vertical"
          rows={3}
        />
      </FormGroup>

      <FormGroup label="Namespace" isRequired fieldId="namespace">
        <NamespaceSelect
          id="namespace"
          value={form.namespace}
          validated={namespaceInvalid ? 'error' : 'default'}
          onChange={(namespace) => {
            setNamespaceTouched(true);
            onChange({ namespace });
          }}
          onBlur={() => setNamespaceTouched(true)}
        />
      </FormGroup>

      <FormGroup label="Disable policy" fieldId="disabled">
        <Switch
          id="disabled"
          label={form.disabled ? 'Policy disabled' : 'Policy enabled'}
          isChecked={form.disabled}
          onChange={(_e, checked) => onChange({ disabled: checked })}
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              Select to disable the policy from being propagated to managed clusters.
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>

      <FormGroup label="Remediation" isRequired fieldId="remediation">
        <div className="policy-radio-options" role="radiogroup" aria-label="Remediation">
          <Radio
            id="remediation-inform"
            name="remediation"
            label="Inform"
            description="Reports the violation, which requires manual remediation."
            isChecked={form.remediationAction === 'inform'}
            onChange={() => onChange({ remediationAction: 'inform' })}
          />
          <Radio
            id="remediation-enforce"
            name="remediation"
            label="Enforce"
            description="Automatically runs remediation action that is defined in the source, if this feature is supported."
            isChecked={form.remediationAction === 'enforce'}
            onChange={() => onChange({ remediationAction: 'enforce' })}
          />
        </div>
      </FormGroup>

      <FormGroup label="Severity" fieldId="severity">
        <SelectField
          id="severity"
          value={form.severity}
          onChange={(v) => onChange({ severity: v as PolicyFormState['severity'] })}
          options={[
            { value: 'low', label: 'low' },
            { value: 'medium', label: 'medium' },
            { value: 'high', label: 'high' },
            { value: 'critical', label: 'critical' },
          ]}
        />
      </FormGroup>

      <FormGroup label="Compliance type" fieldId="compliance-type">
        <SelectField
          id="compliance-type"
          value={form.complianceType}
          isDisabled={!form.consolidateManifests}
          onChange={(v) =>
            onChange({ complianceType: v as PolicyFormState['complianceType'] })
          }
          options={[
            { value: 'musthave', label: 'musthave' },
            { value: 'mustonlyhave', label: 'mustonlyhave' },
            { value: 'mustnothave', label: 'mustnothave' },
          ]}
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              {form.consolidateManifests
                ? 'Default for all manifests. When separate ConfigurationPolicies are enabled, each manifest can override this.'
                : 'Disabled because each manifest sets its own compliance type in the Manifests step.'}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>

      <FormGroup label="ConfigurationPolicy layout" fieldId="consolidate">
        <Switch
          id="consolidate"
          aria-label="Separate ConfigurationPolicy per manifest"
          label={
            form.consolidateManifests
              ? 'One ConfigurationPolicy for all manifests'
              : 'Separate ConfigurationPolicy per manifest'
          }
          isChecked={!form.consolidateManifests}
          onChange={(_e, checked) => onChange({ consolidateManifests: !checked })}
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              Turn on to generate one ConfigurationPolicy template per manifest (different names
              and compliance types). Leave off to wrap all manifests in a single ConfigurationPolicy.
              Separate mode disables the global compliance type above.
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>

      <FormGroup label="Prune Object Behavior" fieldId="prune">
        <div
          className="policy-radio-options"
          role="radiogroup"
          aria-label="Prune Object Behavior"
        >
          <Radio
            id="prune-delete-if-created"
            name="prune"
            label="Delete If Created"
            description="Attempts to delete objects known to be created by the policy when the policy is deleted."
            isChecked={form.pruneObjectBehavior === 'DeleteIfCreated'}
            onChange={() => onChange({ pruneObjectBehavior: 'DeleteIfCreated' })}
          />
          <Radio
            id="prune-delete-all"
            name="prune"
            label="Delete All"
            description="Attempts to delete all of the objects related to the deleted policy."
            isChecked={form.pruneObjectBehavior === 'DeleteAll'}
            onChange={() => onChange({ pruneObjectBehavior: 'DeleteAll' })}
          />
          <Radio
            id="prune-none"
            name="prune"
            label="None"
            description="Does not delete any resources when the policy is deleted. This value is used by default."
            isChecked={form.pruneObjectBehavior === 'None'}
            onChange={() => onChange({ pruneObjectBehavior: 'None' })}
          />
        </div>
      </FormGroup>

      <ChipInput
        label="Standards"
        values={form.standards}
        onChange={(standards) => onChange({ standards })}
        placeholder="Add standard"
      />
      <ChipInput
        label="Categories"
        values={form.categories}
        onChange={(categories) => onChange({ categories })}
        placeholder="Add category"
      />
      <ChipInput
        label="Controls"
        values={form.controls}
        onChange={(controls) => onChange({ controls })}
        placeholder="Add control"
      />
    </Form>
  );
}
