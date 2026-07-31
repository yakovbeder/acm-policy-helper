import { useMemo, useState } from 'react';
import {
  DataList,
  DataListCell,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Label,
  SearchInput,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  policyTemplates,
  type PolicyTemplate,
  type TemplateCategory,
} from '../../templates';

interface Props {
  selectedTemplateId: string | null;
  onSelectBlank: () => void;
  onSelectTemplate: (template: PolicyTemplate) => void;
}

type FilterCategory = TemplateCategory | 'all';

export function TemplateStep({ selectedTemplateId, onSelectBlank, onSelectTemplate }: Props) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<FilterCategory>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return policyTemplates.filter((t) => {
      if (category !== 'all' && t.category !== category) {
        return false;
      }
      if (!q) {
        return true;
      }
      const haystack = `${t.name} ${t.description} ${t.notes?.join(' ') ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [search, category]);

  const grouped = useMemo(() => {
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      items: filtered.filter((t) => t.category === cat),
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

  const isBlankSelected = selectedTemplateId === null || selectedTemplateId === 'blank';

  const handleSelectBlank = () => {
    onSelectBlank();
  };

  const handleSelectTemplate = (_event: React.MouseEvent | React.KeyboardEvent, id: string) => {
    const templateId = id.replace(/^template-/, '');
    const template = policyTemplates.find((t) => t.id === templateId);
    if (template) {
      onSelectTemplate(template);
    }
  };

  return (
    <div>
      <Title headingLevel="h2" size="xl" style={{ marginBottom: '0.5rem' }}>
        Choose a template
      </Title>
      <FormHelperText style={{ marginBottom: '1rem' }}>
        <HelperText>
          <HelperTextItem>
            Start from a blank policy or pick a built-in template.
            Replace any <code>PLACEHOLDER_*</code> values before applying.
          </HelperTextItem>
        </HelperText>
      </FormHelperText>

      <Toolbar style={{ marginBottom: '1rem', padding: 0 }}>
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              id="template-search"
              aria-label="Search templates"
              placeholder="Search templates"
              value={search}
              onChange={(_e, v) => setSearch(v)}
              onClear={() => setSearch('')}
            />
          </ToolbarItem>
          <ToolbarItem>
            <div className="template-category-filters" role="group" aria-label="Template categories">
              <Label
                color={category === 'all' ? 'blue' : 'grey'}
                onClick={() => setCategory('all')}
                style={{ cursor: 'pointer', marginRight: '0.5rem' }}
              >
                All
              </Label>
              {CATEGORY_ORDER.map((cat) => (
                <Label
                  key={cat}
                  color={category === cat ? 'blue' : 'grey'}
                  onClick={() => setCategory(cat)}
                  style={{ cursor: 'pointer', marginRight: '0.5rem' }}
                >
                  {CATEGORY_LABELS[cat]}
                </Label>
              ))}
            </div>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {/* Blank policy - always shown */}
      <DataList
        aria-label="Blank policy"
        isCompact
        selectedDataListItemId={isBlankSelected ? 'template-blank' : ''}
        onSelectDataListItem={handleSelectBlank}
      >
        <DataListItem id="template-blank" aria-labelledby="template-blank-title">
          <DataListItemRow>
            <DataListItemCells
              dataListCells={[
                <DataListCell key="name" width={2}>
                  <strong id="template-blank-title">Blank policy</strong>
                </DataListCell>,
                <DataListCell key="desc" width={5}>
                  Start from scratch — paste or upload your own manifests.
                </DataListCell>,
              ]}
            />
          </DataListItemRow>
        </DataListItem>
      </DataList>

      {/* Category groups */}
      {grouped.map((group) => (
        <div key={group.category} style={{ marginTop: '1.5rem' }}>
          <Title headingLevel="h3" size="md" style={{ marginBottom: '0.5rem' }}>
            {CATEGORY_LABELS[group.category]}
          </Title>
          <DataList
            aria-label={`${CATEGORY_LABELS[group.category]} templates`}
            isCompact
            selectedDataListItemId={
              group.items.some((t) => t.id === selectedTemplateId)
                ? `template-${selectedTemplateId}`
                : ''
            }
            onSelectDataListItem={handleSelectTemplate}
          >
            {group.items.map((template) => (
              <DataListItem
                key={template.id}
                id={`template-${template.id}`}
                aria-labelledby={`template-${template.id}-title`}
              >
                <DataListItemRow>
                  <DataListItemCells
                    dataListCells={[
                      <DataListCell key="name" width={2}>
                        <strong id={`template-${template.id}-title`}>{template.name}</strong>
                      </DataListCell>,
                      <DataListCell key="desc" width={5}>
                        {template.description}
                        {template.notes && template.notes.length > 0 && (
                          <HelperText style={{ marginTop: '0.25rem' }}>
                            {template.notes.map((note) => (
                              <HelperTextItem key={note} variant="indeterminate">
                                {note}
                              </HelperTextItem>
                            ))}
                          </HelperText>
                        )}
                      </DataListCell>,
                    ]}
                  />
                </DataListItemRow>
              </DataListItem>
            ))}
          </DataList>
        </div>
      ))}

      {filtered.length === 0 && (
        <HelperText style={{ marginTop: '1rem' }}>
          <HelperTextItem>No templates match your search.</HelperTextItem>
        </HelperText>
      )}
    </div>
  );
}
