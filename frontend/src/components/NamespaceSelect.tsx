import { useEffect, useMemo, useState } from 'react';
import { TypeaheadSelect, type TypeaheadSelectOption } from '@patternfly/react-templates';
import { FormHelperText, HelperText, HelperTextItem, Spinner } from '@patternfly/react-core';
import { fetchNamespaces } from '../services/api';

interface Props {
  id: string;
  value: string;
  onChange: (namespace: string) => void;
  onBlur?: () => void;
  validated?: 'default' | 'error' | 'warning' | 'success';
}

export function NamespaceSelect({
  id,
  value,
  onChange,
  onBlur,
  validated = 'default',
}: Props) {
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchNamespaces();
        if (!cancelled) {
          setNamespaces(list);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setNamespaces([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo((): TypeaheadSelectOption[] => {
    const names = new Set(namespaces);
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
  }, [namespaces, value]);

  if (loading) {
    return (
      <HelperText>
        <HelperTextItem icon={<Spinner size="sm" />}>Loading namespaces…</HelperTextItem>
      </HelperText>
    );
  }

  const showError = validated === 'error';

  return (
    <>
      <TypeaheadSelect
        id={id}
        initialOptions={options}
        placeholder="Select namespace"
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
        isCreatable
        createOptionMessage={(filter) => `Use namespace "${filter}"`}
        noOptionsFoundMessage={(filter) => `No namespaces matching "${filter}"`}
        toggleProps={{
          isFullWidth: true,
          status: showError ? 'danger' : undefined,
          onBlur,
        }}
      />
      <FormHelperText>
        <HelperText>
          {showError ? (
            <HelperTextItem variant="error">Required</HelperTextItem>
          ) : (
            <HelperTextItem>
              {error
                ? `Could not list cluster namespaces (${error}). Type a namespace name.`
                : 'The namespace on the hub cluster where the policy resources will be created.'}
            </HelperTextItem>
          )}
        </HelperText>
      </FormHelperText>
    </>
  );
}
