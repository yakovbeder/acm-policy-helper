import { useMemo } from 'react';
import { SimpleSelect, type SimpleSelectOption } from '@patternfly/react-templates';

interface SelectFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  'aria-label'?: string;
  placeholder?: string;
  isDisabled?: boolean;
}

export function SelectField({
  id,
  value,
  onChange,
  options,
  'aria-label': ariaLabel,
  placeholder = 'Select a value',
  isDisabled = false,
}: SelectFieldProps) {
  const initialOptions = useMemo(
    (): SimpleSelectOption[] =>
      options.map((opt) => ({
        value: opt.value,
        content: opt.label,
        selected: opt.value === value,
      })),
    [options, value]
  );

  return (
    <SimpleSelect
      id={id}
      initialOptions={initialOptions}
      placeholder={placeholder}
      isDisabled={isDisabled}
      onSelect={(_e, selection) => {
        if (selection !== undefined && selection !== null) {
          onChange(String(selection));
        }
      }}
      toggleWidth="100%"
      toggleProps={{
        id,
        'aria-label': ariaLabel || id,
        isFullWidth: true,
        isDisabled,
      }}
    />
  );
}
