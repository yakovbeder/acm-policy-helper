/**
 * Monaco themes matching OpenShift console YAML editor colors
 * (console-light / console-dark from openshift/console).
 *
 * Light: tan/brown keys, blue values
 * Dark: cyan/blue keys, yellow/orange values
 */
import type { editor as MonacoEditor } from 'monaco-editor';

export const OPENSHIFT_YAML_LIGHT = 'openshift-yaml-light';
export const OPENSHIFT_YAML_DARK = 'openshift-yaml-dark';

// PatternFly color tokens used by OpenShift console theme.ts
const light = {
  background: '#ffffff',
  foreground: '#151515',
  lineNumber: '#4d4d4d',
  lineNumberActive: '#000000',
  number: '#204d00',
  type: '#73480b',
  string: '#003366',
  keyword: '#21134d',
  comment: '#4d4d4d',
};

const dark = {
  background: '#1f1f1f',
  foreground: '#ffffff',
  lineNumber: '#e0e0e0',
  lineNumberActive: '#ffffff',
  number: '#afdc8f',
  type: '#92c5f9',
  string: '#ffcc17',
  keyword: '#b6a6e9',
  comment: '#c7c7c7',
};

function rules(colors: typeof light): MonacoEditor.ITokenThemeRule[] {
  // Strip '#' — Monaco theme foregrounds are hex without the hash.
  const fg = (hex: string) => hex.replace('#', '');
  return [
    { token: 'number', foreground: fg(colors.number) },
    { token: 'type', foreground: fg(colors.type) },
    { token: 'string', foreground: fg(colors.string) },
    { token: 'string.yaml', foreground: fg(colors.string) },
    { token: 'keyword', foreground: fg(colors.keyword) },
    { token: 'comment', foreground: fg(colors.comment) },
    { token: 'delimiter', foreground: fg(colors.foreground) },
  ];
}

let defined = false;

export function defineOpenShiftYamlThemes(editorApi: typeof MonacoEditor): void {
  if (defined) {
    return;
  }
  editorApi.defineTheme(OPENSHIFT_YAML_LIGHT, {
    base: 'vs',
    inherit: true,
    colors: {
      'editor.background': light.background,
      'editor.foreground': light.foreground,
      'editorLineNumber.activeForeground': light.lineNumberActive,
      'editorLineNumber.foreground': light.lineNumber,
    },
    rules: rules(light),
  });
  editorApi.defineTheme(OPENSHIFT_YAML_DARK, {
    base: 'vs-dark',
    inherit: true,
    colors: {
      'editor.background': dark.background,
      'editor.foreground': dark.foreground,
      'editorLineNumber.activeForeground': dark.lineNumberActive,
      'editorLineNumber.foreground': dark.lineNumber,
    },
    rules: rules(dark),
  });
  defined = true;
}

export function openshiftYamlThemeName(isDark: boolean): string {
  return isDark ? OPENSHIFT_YAML_DARK : OPENSHIFT_YAML_LIGHT;
}
