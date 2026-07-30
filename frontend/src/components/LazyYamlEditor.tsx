import { lazy, Suspense } from 'react';
import { Spinner } from '@patternfly/react-core';
import type { YamlEditorProps } from './YamlEditor';

const YamlEditor = lazy(async () => {
  const mod = await import('./YamlEditor');
  return { default: mod.YamlEditor };
});

export function LazyYamlEditor(props: YamlEditorProps) {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Spinner aria-label="Loading YAML editor" />
        </div>
      }
    >
      <YamlEditor {...props} />
    </Suspense>
  );
}
