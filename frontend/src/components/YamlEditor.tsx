import { useEffect, useMemo, useRef } from 'react';
import { CodeEditor, Language } from '@patternfly/react-code-editor';
import type { editor } from 'monaco-editor';
import { lintYaml } from '../services/yamlLinter';

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  isDark?: boolean;
  readOnly?: boolean;
  height?: string;
  onLintErrors?: (errors: string[]) => void;
}

export function YamlEditor({
  value,
  onChange,
  isDark = false,
  readOnly = false,
  height = '360px',
  onLintErrors,
}: YamlEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);

  const lintErrors = useMemo(() => lintYaml(value), [value]);

  useEffect(() => {
    onLintErrors?.(lintErrors.map((e) => `Line ${e.line}:${e.column} — ${e.message}`));
  }, [lintErrors, onLintErrors]);

  useEffect(() => {
    const monaco = monacoRef.current;
    const ed = editorRef.current;
    if (!monaco || !ed) {
      return;
    }
    const model = ed.getModel();
    if (!model) {
      return;
    }
    const markers = lintErrors.map((err) => ({
      severity: monaco.MarkerSeverity.Error,
      startLineNumber: err.line,
      startColumn: err.column,
      endLineNumber: err.line,
      endColumn: err.column + 1,
      message: err.message,
    }));
    monaco.editor.setModelMarkers(model, 'yaml-linter', markers);
  }, [lintErrors]);

  return (
    <CodeEditor
      isDarkTheme={isDark}
      isLineNumbersVisible
      isReadOnly={readOnly}
      isMinimapVisible={false}
      code={value}
      onChange={(val) => onChange(val || '')}
      language={Language.yaml}
      height={height}
      onEditorDidMount={(ed, monaco) => {
        editorRef.current = ed;
        monacoRef.current = monaco as typeof import('monaco-editor');
      }}
    />
  );
}
