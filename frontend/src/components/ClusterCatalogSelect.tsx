import { useMemo } from 'react';
import {
  MultiTypeaheadSelect,
  TypeaheadSelect,
  type MultiTypeaheadSelectOption,
  type TypeaheadSelectOption,
} from '@patternfly/react-templates';

interface MultiProps {
  id: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  isDisabled?: boolean;
}

export function ClusterMultiSelect({
  id,
  values,
  options,
  onChange,
  placeholder,
  isDisabled,
}: MultiProps) {
  const initialOptions = useMemo((): MultiTypeaheadSelectOption[] => {
    const names = new Set([...options, ...values]);
    return Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        value: name,
        content: name,
        selected: values.includes(name),
      }));
  }, [options, values]);

  return (
    <MultiTypeaheadSelect
      id={id}
      initialOptions={initialOptions}
      placeholder={placeholder}
      isDisabled={isDisabled}
      onSelectionChange={(_e, selections) => onChange(selections.map(String))}
      noOptionsFoundMessage={(filter) => `No options matching "${filter}"`}
      toggleProps={{ isFullWidth: true }}
    />
  );
}

interface SingleProps {
  id: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder: string;
  isCreatable?: boolean;
}

export function ClusterTypeaheadSelect({
  id,
  value,
  options,
  onChange,
  placeholder,
  isCreatable = true,
}: SingleProps) {
  const initialOptions = useMemo((): TypeaheadSelectOption[] => {
    const names = new Set(options);
    if (value) {
      names.add(value);
    }
    return Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        value: name,
        content: name,
        selected: name === value,
      }));
  }, [options, value]);

  return (
    <TypeaheadSelect
      id={id}
      initialOptions={initialOptions}
      placeholder={placeholder}
      onSelect={(_e, selection) => {
        if (selection) {
          onChange(String(selection));
        }
      }}
      onInputChange={(filter) => {
        if (filter !== value) {
          onChange(filter);
        }
      }}
      isCreatable={isCreatable}
      createOptionMessage={(filter) => `Use "${filter}"`}
      noOptionsFoundMessage={(filter) => `No options matching "${filter}"`}
      toggleProps={{ isFullWidth: true }}
    />
  );
}
