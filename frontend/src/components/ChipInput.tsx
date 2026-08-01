import { useId, useState } from 'react';
import {
  Button,
  Flex,
  FlexItem,
  FormGroup,
  Label,
  LabelGroup,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import PlusIcon from '@patternfly/react-icons/dist/esm/icons/plus-icon';

interface ChipInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  /** Optional stable id; defaults to a React useId-based field id. */
  fieldId?: string;
}

export function ChipInput({
  label,
  values,
  onChange,
  placeholder,
  fieldId: fieldIdProp,
}: ChipInputProps) {
  const reactId = useId();
  const fieldId = fieldIdProp || `chip-input-${reactId}`;
  const [draft, setDraft] = useState('');

  const add = () => {
    const value = draft.trim();
    if (!value || values.includes(value)) {
      return;
    }
    onChange([...values, value]);
    setDraft('');
  };

  return (
    <FormGroup label={label} fieldId={fieldId}>
      <Stack hasGutter>
        <StackItem>
          <Flex spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem grow={{ default: 'grow' }}>
              <TextInput
                id={fieldId}
                value={draft}
                onChange={(_e, v) => setDraft(v)}
                placeholder={placeholder}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    add();
                  }
                }}
                aria-label={label}
              />
            </FlexItem>
            <FlexItem>
              <Button variant="secondary" icon={<PlusIcon />} onClick={add}>
                Add
              </Button>
            </FlexItem>
          </Flex>
        </StackItem>
        {values.length > 0 && (
          <StackItem>
            <LabelGroup numLabels={20}>
              {values.map((v) => (
                <Label
                  key={v}
                  onClose={() => onChange(values.filter((x) => x !== v))}
                  variant="outline"
                >
                  {v}
                </Label>
              ))}
            </LabelGroup>
          </StackItem>
        )}
      </Stack>
    </FormGroup>
  );
}
