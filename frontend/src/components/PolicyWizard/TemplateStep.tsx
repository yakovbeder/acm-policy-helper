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
            Start from a blank policy or pick a built-in template. You can edit name, placement, and
            manifests in the following steps.
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
          <Card
            id="template-blank"
            isSelectable
            isSelected={isBlankSelected}
            onClick={onSelectBlank}
            isClickable
          >
            <CardHeader>
              <CardTitle>Blank policy</CardTitle>
            </CardHeader>
            <CardBody>Start from scratch and paste or upload your own manifests.</CardBody>
          </Card>
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
                <Card
                  id={`template-${template.id}`}
                  isSelectable
                  isSelected={selectedTemplateId === template.id}
                  onClick={() => onSelectTemplate(template)}
                  isClickable
                >
                  <CardHeader>
                    <CardTitle>{template.name}</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <p style={{ marginBottom: template.notes?.length ? '0.75rem' : 0 }}>
                      {template.description}
                    </p>
                    {template.notes?.map((note) => (
                      <HelperText key={note} style={{ marginTop: '0.25rem' }}>
                        <HelperTextItem variant="indeterminate">{note}</HelperTextItem>
                      </HelperText>
                    ))}
                  </CardBody>
                </Card>
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
