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
  return (
    <Form isHorizontal={false}>
      <FormGroup label="Policy name" isRequired fieldId="policy-name">
        <TextInput
          id="policy-name"
          value={form.policyName}
          onChange={(_e, v) => onChange({ policyName: v })}
          placeholder="Enter a policy name"
          isRequired
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>Example: my-config-policy</HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>

      <FormGroup label="Namespace" isRequired fieldId="namespace">
        <NamespaceSelect
          id="namespace"
          value={form.namespace}
          onChange={(namespace) => onChange({ namespace })}
        />
      </FormGroup>

      <FormGroup label="Remediation action" isRequired fieldId="remediation">
        <Radio
          id="remediation-inform"
          name="remediation"
          label="inform"
          isChecked={form.remediationAction === 'inform'}
          onChange={() => onChange({ remediationAction: 'inform' })}
        />
        <Radio
          id="remediation-enforce"
          name="remediation"
          label="enforce"
          isChecked={form.remediationAction === 'enforce'}
          onChange={() => onChange({ remediationAction: 'enforce' })}
        />
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
          onChange={(v) =>
            onChange({ complianceType: v as PolicyFormState['complianceType'] })
          }
          options={[
            { value: 'musthave', label: 'musthave' },
            { value: 'mustonlyhave', label: 'mustonlyhave' },
            { value: 'mustnothave', label: 'mustnothave' },
          ]}
        />
      </FormGroup>

      <FormGroup label="Prune object behavior" fieldId="prune">
        <SelectField
          id="prune"
          value={form.pruneObjectBehavior}
          onChange={(v) =>
            onChange({
              pruneObjectBehavior: v as PolicyFormState['pruneObjectBehavior'],
            })
          }
          options={[
            { value: 'None', label: 'None' },
            { value: 'DeleteAll', label: 'DeleteAll' },
            { value: 'DeleteIfCreated', label: 'DeleteIfCreated' },
          ]}
        />
      </FormGroup>

      <FormGroup label="Description" fieldId="description">
        <TextArea
          id="description"
          value={form.description}
          onChange={(_e, v) => onChange({ description: v })}
          resizeOrientation="vertical"
          rows={3}
        />
      </FormGroup>

      <FormGroup label="Disabled" fieldId="disabled">
        <Switch
          id="disabled"
          label={form.disabled ? 'Policy disabled' : 'Policy enabled'}
          isChecked={form.disabled}
          onChange={(_e, checked) => onChange({ disabled: checked })}
        />
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
