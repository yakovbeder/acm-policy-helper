import { parseAllDocuments, YAMLError } from 'yaml';

export interface YamlLintError {
  message: string;
  line: number;
  column: number;
}

export function lintYaml(content: string): YamlLintError[] {
  if (!content.trim()) {
    return [];
  }

  const errors: YamlLintError[] = [];
  try {
    const docs = parseAllDocuments(content, {
      prettyErrors: true,
      uniqueKeys: true,
    });

    for (const doc of docs) {
      for (const err of doc.errors) {
        errors.push(toLintError(err));
      }
      for (const warn of doc.warnings) {
        errors.push(toLintError(warn));
      }
    }
  } catch (err: unknown) {
    if (err instanceof YAMLError) {
      errors.push(toLintError(err));
    } else {
      errors.push({
        message: err instanceof Error ? err.message : String(err),
        line: 1,
        column: 1,
      });
    }
  }

  return errors;
}

function toLintError(err: YAMLError | { message: string; linePos?: [{ line: number; col: number }] }): YamlLintError {
  const linePos = (err as YAMLError).linePos?.[0];
  return {
    message: err.message.replace(/\n+/g, ' ').trim(),
    line: linePos?.line ?? 1,
    column: linePos?.col ?? 1,
  };
}

export function formatLintErrors(errors: YamlLintError[]): string[] {
  return errors.map((e) => `Line ${e.line}:${e.column} — ${e.message}`);
}

export function splitMultiDocYaml(content: string): { name: string; content: string }[] {
  const docs = parseAllDocuments(content, { prettyErrors: true });
  const results: { name: string; content: string }[] = [];

  docs.forEach((doc, index) => {
    if (doc.errors.length || doc.contents === null) {
      return;
    }
    const text = String(doc);
    const js = doc.toJS() as { kind?: string; metadata?: { name?: string } } | null;
    const kind = js?.kind || 'manifest';
    const name = js?.metadata?.name || `doc-${index + 1}`;
    results.push({
      name: `${kind}-${name}.yaml`.toLowerCase(),
      content: text.trim() + '\n',
    });
  });

  return results;
}
