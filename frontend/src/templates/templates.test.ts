import { parseAllDocuments } from 'yaml';
import { describe, expect, it } from 'vitest';
import { formFromTemplate, policyTemplates } from './index';
import { CATEGORY_ORDER } from './types';

describe('policy templates catalog', () => {
  it('has unique ids across all templates', () => {
    const ids = policyTemplates.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique names within each category', () => {
    for (const category of CATEGORY_ORDER) {
      const names = policyTemplates.filter((t) => t.category === category).map((t) => t.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('does not include operator, Gatekeeper, or Kyverno templates', () => {
    const haystack = policyTemplates
      .map((t) => `${t.id} ${t.name} ${t.description}`)
      .join('\n')
      .toLowerCase();
    expect(haystack).not.toMatch(/gatekeeper|kyverno/);
    expect(policyTemplates.some((t) => t.id.startsWith('op-'))).toBe(false);
    expect(CATEGORY_ORDER).not.toContain('operators');
  });

  it('parses every template manifest as YAML', () => {
    for (const template of policyTemplates) {
      expect(template.manifests.length).toBeGreaterThan(0);
      for (const manifest of template.manifests) {
        const docs = parseAllDocuments(manifest.content);
        expect(docs.length).toBeGreaterThan(0);
        for (const doc of docs) {
          expect(doc.errors, `${template.id}/${manifest.name}`).toEqual([]);
          expect(doc.toJSON()).not.toBeNull();
        }
      }
    }
  });

  it('formFromTemplate populates policy name and manifests', () => {
    const template = policyTemplates.find((t) => t.id === 'cc-remove-kubeadmin');
    expect(template).toBeDefined();
    const form = formFromTemplate(template!);
    expect(form.policyName).toBe('remove-kubeadmin');
    expect(form.manifests.length).toBe(1);
    expect(form.complianceType).toBe('mustnothave');
  });
});
