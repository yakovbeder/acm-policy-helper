import { describe, expect, it } from 'vitest';
import { formatLintErrors, lintYaml, splitMultiDocYaml } from './yamlLinter';

describe('lintYaml', () => {
  it('returns no errors for valid yaml', () => {
    const errors = lintYaml('apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: demo\n');
    expect(errors).toEqual([]);
  });

  it('returns errors for invalid yaml', () => {
    const errors = lintYaml('foo: [bar\n');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].line).toBeGreaterThan(0);
  });

  it('returns empty for blank content', () => {
    expect(lintYaml('   \n')).toEqual([]);
  });
});

describe('formatLintErrors', () => {
  it('formats line and column', () => {
    expect(formatLintErrors([{ message: 'bad', line: 2, column: 3 }])).toEqual([
      'Line 2:3 — bad',
    ]);
  });
});

describe('splitMultiDocYaml', () => {
  it('splits multi-document yaml', () => {
    const content = `apiVersion: v1
kind: ConfigMap
metadata:
  name: one
---
apiVersion: v1
kind: Secret
metadata:
  name: two
`;
    const parts = splitMultiDocYaml(content);
    expect(parts).toHaveLength(2);
    expect(parts[0].name).toContain('configmap-one');
    expect(parts[1].name).toContain('secret-two');
  });
});
