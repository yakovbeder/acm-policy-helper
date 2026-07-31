import { useMemo, useState } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  FormHelperText,
  Gallery,
  GalleryItem,
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

const SELECT_GROUP = 'template-gallery-selection';

function TemplateCard({
  id,
  titleId,
  title,
  description,
  notes,
  isSelected,
  onSelect,
}: {
  id: string;
  titleId: string;
  title: string;
  description: string;
  notes?: string[];
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card id={id} isSelectable isSelected={isSelected}>
      <CardHeader
        selectableActions={{
          variant: 'single',
          name: SELECT_GROUP,
          selectableActionId: `${id}-input`,
          selectableActionAriaLabelledby: titleId,
          onChange: (_event, checked) => {
            if (checked) {
              onSelect();
            }
          },
        }}
      >
        <CardTitle id={titleId}>{title}</CardTitle>
      </CardHeader>
      <CardBody>
        <p style={{ marginBottom: notes?.length ? '0.75rem' : 0 }}>{description}</p>
        {notes?.map((note) => (
          <HelperText key={note} style={{ marginTop: '0.25rem' }}>
            <HelperTextItem variant="indeterminate">{note}</HelperTextItem>
          </HelperText>
        ))}
      </CardBody>
    </Card>
  );
}

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

  return (
    <div>
      <Title headingLevel="h2" size="xl" style={{ marginBottom: '0.5rem' }}>
        Choose a template
      </Title>
      <FormHelperText style={{ marginBottom: '1rem' }}>
        <HelperText>
          <HelperTextItem>
            Start from a blank policy or pick a built-in template. Click a card to select it, then
            continue with Next. Replace any <code>PLACEHOLDER_*</code> values before applying.
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

      <Gallery hasGutter minWidths={{ default: '280px' }} style={{ marginBottom: '1.5rem' }}>
        <GalleryItem>
          <TemplateCard
            id="template-blank"
            titleId="template-blank-title"
            title="Blank policy"
            description="Start from scratch and paste or upload your own manifests."
            isSelected={isBlankSelected}
            onSelect={onSelectBlank}
          />
        </GalleryItem>
      </Gallery>

      {grouped.map((group) => (
        <div key={group.category} style={{ marginBottom: '1.5rem' }}>
          <Title headingLevel="h3" size="lg" style={{ marginBottom: '0.75rem' }}>
            {CATEGORY_LABELS[group.category]}
          </Title>
          <Gallery hasGutter minWidths={{ default: '280px' }}>
            {group.items.map((template) => (
              <GalleryItem key={template.id}>
                <TemplateCard
                  id={`template-${template.id}`}
                  titleId={`template-${template.id}-title`}
                  title={template.name}
                  description={template.description}
                  notes={template.notes}
                  isSelected={selectedTemplateId === template.id}
                  onSelect={() => onSelectTemplate(template)}
                />
              </GalleryItem>
            ))}
          </Gallery>
        </div>
      ))}

      {filtered.length === 0 && (
        <HelperText>
          <HelperTextItem>No templates match your search.</HelperTextItem>
        </HelperText>
      )}
    </div>
  );
}
