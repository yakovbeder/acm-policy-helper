import { FormSelect, FormSelectOption } from '@patternfly/react-core';

interface SelectFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  'aria-label'?: string;
}

export function SelectField({
  id,
  value,
  onChange,
  options,
  'aria-label': ariaLabel,
}: SelectFieldProps) {
  return (
    <FormSelect
      id={id}
      value={value}
      onChange={(_e, v) => onChange(v)}
      aria-label={ariaLabel || id}
    >
      {options.map((opt) => (
        <FormSelectOption key={opt.value} value={opt.value} label={opt.label} />
      ))}
    </FormSelect>
  );
}
