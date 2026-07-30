import { useState } from 'react';
import {
  Button,
  Flex,
  FlexItem,
  Label,
  LabelGroup,
  TextInput,
} from '@patternfly/react-core';
import PlusIcon from '@patternfly/react-icons/dist/esm/icons/plus-icon';

interface ChipInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export function ChipInput({ label, values, onChange, placeholder }: ChipInputProps) {
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
    <div>
      <label className="pf-v6-c-form__label">
        <span className="pf-v6-c-form__label-text">{label}</span>
      </label>
      <Flex spaceItems={{ default: 'spaceItemsSm' }} style={{ marginTop: '0.5rem' }}>
        <FlexItem grow={{ default: 'grow' }}>
          <TextInput
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
      {values.length > 0 && (
        <LabelGroup style={{ marginTop: '0.5rem' }} numLabels={20}>
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
      )}
    </div>
  );
}
