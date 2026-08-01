import { useEffect, useMemo, useRef } from 'react';
import { CodeEditor, Language } from '@patternfly/react-code-editor';
import type { editor } from 'monaco-editor';
import '../monaco/setupMonaco';
import {
  defineOpenShiftYamlThemes,
  openshiftYamlThemeName,
} from '../monaco/openshiftYamlTheme';
import { lintYaml } from '../services/yamlLinter';

export interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  isDark?: boolean;
  readOnly?: boolean;
  height?: string;
  /** Enable vertical drag-resize via the CSS resize grip (PF TextArea-style). */
  isResizable?: boolean;
  onLintErrors?: (errors: string[]) => void;
}

export function YamlEditor({
  value,
  onChange,
  isDark = false,
  readOnly = false,
  height = '360px',
  isResizable = false,
  onLintErrors,
}: YamlEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const themeName = openshiftYamlThemeName(isDark);

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

  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) {
      return;
    }
    defineOpenShiftYamlThemes(monaco.editor);
    monaco.editor.setTheme(themeName);
  }, [themeName]);

  useEffect(() => {
    editorRef.current?.layout();
  }, [height, isResizable]);

  useEffect(() => {
    if (!isResizable || !containerRef.current) {
      return;
    }
    const observer = new ResizeObserver(() => {
      editorRef.current?.layout();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isResizable]);

  const editor = (
    <CodeEditor
      isDarkTheme={isDark}
      isLineNumbersVisible
      isReadOnly={readOnly}
      isMinimapVisible={false}
      isFullHeight={isResizable}
      code={value}
      onChange={(val) => onChange(val || '')}
      language={Language.yaml}
      height={isResizable ? '100%' : height}
      editorProps={{
        theme: themeName,
        beforeMount: (monaco) => {
          defineOpenShiftYamlThemes(monaco.editor);
        },
      }}
      onEditorDidMount={(ed, monaco) => {
        editorRef.current = ed;
        monacoRef.current = monaco as typeof import('monaco-editor');
        defineOpenShiftYamlThemes(monaco.editor);
        monaco.editor.setTheme(themeName);
        ed.layout();
      }}
    />
  );

  if (!isResizable) {
    return editor;
  }

  return (
    <div ref={containerRef} className="yaml-editor-resizable" style={{ height }}>
      {editor}
    </div>
  );
}
