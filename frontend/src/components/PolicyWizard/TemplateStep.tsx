import { useMemo, useState } from 'react';
import {
  Content,
  ContentVariants,
  DataList,
  DataListCell,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  FormHelperText,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  Label,
  SearchInput,
  Title,
  ToggleGroup,
  ToggleGroupItem,
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

const BLANK_DESCRIPTION = 'Start from scratch — paste or upload your own manifests.';

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

  const orderedTemplates = useMemo(() => {
    return CATEGORY_ORDER.flatMap((cat) => filtered.filter((t) => t.category === cat));
  }, [filtered]);

  const isBlankSelected = selectedTemplateId === null || selectedTemplateId === 'blank';
  const selectedTemplate = !isBlankSelected
    ? policyTemplates.find((t) => t.id === selectedTemplateId) ?? null
    : null;
  const selectedDataListItemId = isBlankSelected
    ? 'template-blank'
    : selectedTemplate
      ? `template-${selectedTemplate.id}`
      : 'template-blank';

  const handleSelect = (_event: React.MouseEvent | React.KeyboardEvent, id: string) => {
    if (id === 'template-blank') {
      onSelectBlank();
      return;
    }
    const templateId = id.replace(/^template-/, '');
    const template = policyTemplates.find((t) => t.id === templateId);
    if (template) {
      onSelectTemplate(template);
    }
  };

  const detailTitle = isBlankSelected ? 'Blank policy' : (selectedTemplate?.name ?? 'Blank policy');
  const detailDescription = isBlankSelected
    ? BLANK_DESCRIPTION
    : (selectedTemplate?.description ?? BLANK_DESCRIPTION);
  const detailNotes = isBlankSelected ? undefined : selectedTemplate?.notes;
  const detailCategory =
    !isBlankSelected && selectedTemplate ? CATEGORY_LABELS[selectedTemplate.category] : null;

  return (
    <div>
      <Title headingLevel="h2" size="xl" style={{ marginBottom: '0.5rem' }}>
        Choose a template
      </Title>
      <FormHelperText style={{ marginBottom: '1rem' }}>
        <HelperText>
          <HelperTextItem>
            Start from a blank policy or pick a built-in template. Replace any{' '}
            <code>PLACEHOLDER_*</code> values before applying.
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
            <ToggleGroup isCompact aria-label="Template categories">
              <ToggleGroupItem
                text="All"
                buttonId="template-category-all"
                isSelected={category === 'all'}
                onChange={() => setCategory('all')}
              />
              {CATEGORY_ORDER.map((cat) => (
                <ToggleGroupItem
                  key={cat}
                  text={CATEGORY_LABELS[cat]}
                  buttonId={`template-category-${cat}`}
                  isSelected={category === cat}
                  onChange={() => setCategory(cat)}
                />
              ))}
            </ToggleGroup>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      <Grid hasGutter>
        <GridItem md={5} sm={12}>
          <div className="template-primary-list">
            <DataList
              aria-label="Policy templates"
              isCompact
              selectedDataListItemId={selectedDataListItemId}
              onSelectDataListItem={handleSelect}
            >
              <DataListItem id="template-blank" aria-labelledby="template-blank-title">
                <DataListItemRow>
                  <DataListItemCells
                    dataListCells={[
                      <DataListCell key="name">
                        <strong id="template-blank-title">Blank policy</strong>
                      </DataListCell>,
                    ]}
                  />
                </DataListItemRow>
              </DataListItem>
              {orderedTemplates.map((template) => (
                <DataListItem
                  key={template.id}
                  id={`template-${template.id}`}
                  aria-labelledby={`template-${template.id}-title`}
                >
                  <DataListItemRow>
                    <DataListItemCells
                      dataListCells={[
                        <DataListCell key="name">
                          <strong id={`template-${template.id}-title`}>{template.name}</strong>
                          {category === 'all' && (
                            <Label
                              isCompact
                              color="grey"
                              style={{ marginLeft: '0.5rem' }}
                            >
                              {CATEGORY_LABELS[template.category]}
                            </Label>
                          )}
                        </DataListCell>,
                      ]}
                    />
                  </DataListItemRow>
                </DataListItem>
              ))}
            </DataList>
          </div>
          {filtered.length === 0 && (
            <HelperText style={{ marginTop: '0.75rem' }}>
              <HelperTextItem>No templates match your search.</HelperTextItem>
            </HelperText>
          )}
        </GridItem>

        <GridItem md={7} sm={12}>
          <div className="template-detail-pane">
            <Title headingLevel="h3" size="lg" style={{ marginBottom: '0.5rem' }}>
              {detailTitle}
            </Title>
            {detailCategory && (
              <Label isCompact color="blue" style={{ marginBottom: '0.75rem' }}>
                {detailCategory}
              </Label>
            )}
            <Content component={ContentVariants.p}>{detailDescription}</Content>
            {detailNotes && detailNotes.length > 0 && (
              <HelperText style={{ marginTop: '0.75rem' }}>
                {detailNotes.map((note) => (
                  <HelperTextItem key={note} variant="indeterminate">
                    {note}
                  </HelperTextItem>
                ))}
              </HelperText>
            )}
          </div>
        </GridItem>
      </Grid>
    </div>
  );
}
