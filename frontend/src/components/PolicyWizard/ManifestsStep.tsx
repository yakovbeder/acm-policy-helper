import { useState } from 'react';
import {
  Alert,
  Button,
  FileUpload,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  List,
  ListItem,
  Tab,
  Tabs,
  TabTitleText,
  TextInput,
  Title,
} from '@patternfly/react-core';
import TrashIcon from '@patternfly/react-icons/dist/esm/icons/trash-icon';
import { SelectField } from '../SelectField';
import { LazyYamlEditor } from '../LazyYamlEditor';
import { formatLintErrors, lintYaml, splitMultiDocYaml } from '../../services/yamlLinter';
import type { ComplianceType, ManifestInput, PolicyFormState } from '../../types';

function stemFromFileName(name: string): string {
  return name.replace(/\.(ya?ml)$/i, '') || name;
}

interface Props {
  form: PolicyFormState;
  onChange: (patch: Partial<PolicyFormState>) => void;
  isDark: boolean;
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ManifestsStep({ form, onChange, isDark }: Props) {
  const [activeTab, setActiveTab] = useState<string | number>(0);
  const [pasteContent, setPasteContent] = useState('');
  const [pasteErrors, setPasteErrors] = useState<string[]>([]);
  const [uploadFilename, setUploadFilename] = useState('');
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);

  const setManifests = (manifests: ManifestInput[]) => onChange({ manifests });

  const addManifest = (name: string, content: string) => {
    const errors = formatLintErrors(lintYaml(content));
    setManifests([
      ...form.manifests,
      {
        id: newId(),
        name,
        content,
        lintErrors: errors,
        configPolicyName: stemFromFileName(name),
        complianceType: form.complianceType,
      },
    ]);
  };

  const updateManifest = (id: string, patch: Partial<ManifestInput>) => {
    onChange({
      manifests: form.manifests.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    });
  };

  const handleAddPaste = () => {
    if (!pasteContent.trim()) {
      return;
    }
    const errors = lintYaml(pasteContent);
    if (errors.length) {
      setPasteErrors(formatLintErrors(errors));
    } else {
      setPasteErrors([]);
    }

    const parts = splitMultiDocYaml(pasteContent);
    if (parts.length > 1) {
      setManifests([
        ...form.manifests,
        ...parts.map((p) => ({
          id: newId(),
          name: p.name,
          content: p.content,
          lintErrors: formatLintErrors(lintYaml(p.content)),
          configPolicyName: stemFromFileName(p.name),
          complianceType: form.complianceType,
        })),
      ]);
    } else {
      addManifest(`manifest-${form.manifests.length + 1}.yaml`, pasteContent);
    }
    setPasteContent('');
  };

  const onFileRead = (_event: unknown, data: string) => {
    const errors = formatLintErrors(lintYaml(data));
    if (errors.length) {
      setUploadWarning(`YAML lint warnings in ${uploadFilename || 'uploaded file'}: ${errors[0]}`);
    } else {
      setUploadWarning(null);
    }
    const parts = splitMultiDocYaml(data);
    if (parts.length > 1) {
      setManifests([
        ...form.manifests,
        ...parts.map((p) => ({
          id: newId(),
          name: p.name,
          content: p.content,
          lintErrors: formatLintErrors(lintYaml(p.content)),
          configPolicyName: stemFromFileName(p.name),
          complianceType: form.complianceType,
        })),
      ]);
    } else {
      addManifest(uploadFilename || `upload-${form.manifests.length + 1}.yaml`, data);
    }
  };

  return (
    <Form>
      <Tabs
        activeKey={activeTab}
        onSelect={(_e, key) => setActiveTab(key)}
        aria-label="Manifest input methods"
      >
        <Tab eventKey={0} title={<TabTitleText>Paste YAML</TabTitleText>}>
          <div style={{ marginTop: '1rem' }}>
            <LazyYamlEditor
              value={pasteContent}
              onChange={setPasteContent}
              isDark={isDark}
              onLintErrors={setPasteErrors}
              height="280px"
            />
            {pasteErrors.length > 0 && (
              <Alert
                variant="warning"
                title="YAML lint issues"
                isInline
                style={{ marginTop: '0.75rem' }}
              >
                <List>
                  {pasteErrors.slice(0, 5).map((err) => (
                    <ListItem key={err}>{err}</ListItem>
                  ))}
                </List>
              </Alert>
            )}
            <Button
              variant="secondary"
              onClick={handleAddPaste}
              style={{ marginTop: '0.75rem' }}
              isDisabled={!pasteContent.trim()}
            >
              Add pasted YAML
            </Button>
          </div>
        </Tab>
        <Tab eventKey={1} title={<TabTitleText>Upload file</TabTitleText>}>
          <div style={{ marginTop: '1rem' }}>
            <FormGroup label="Upload YAML file(s)" fieldId="file-upload">
              <FileUpload
                id="file-upload"
                type="text"
                value=""
                filename={uploadFilename}
                filenamePlaceholder="Drag and drop a .yaml or .yml file"
                onFileInputChange={(_e, file) => setUploadFilename(file?.name || '')}
                onDataChange={onFileRead}
                onClearClick={() => {
                  setUploadFilename('');
                  setUploadWarning(null);
                }}
                browseButtonText="Upload"
                dropzoneProps={{
                  accept: {
                    'text/yaml': ['.yaml', '.yml'],
                    'application/x-yaml': ['.yaml', '.yml'],
                  },
                }}
              />
            </FormGroup>
            {uploadWarning && (
              <Alert variant="warning" title="Uploaded file has lint issues" isInline>
                {uploadWarning}
              </Alert>
            )}
          </div>
        </Tab>
      </Tabs>

      <Title headingLevel="h3" style={{ marginTop: '1.5rem' }}>
        Manifests ({form.manifests.length})
      </Title>
      {form.manifests.length === 0 && (
        <Alert variant="info" title="No manifests added yet" isInline>
          Paste YAML or upload a file containing the Kubernetes resources to wrap in a
          Configuration Policy.
        </Alert>
      )}
      {form.manifests.map((manifest) => (
        <div
          key={manifest.id}
          style={{
            border: '1px solid var(--pf-t--global--border--color--default)',
            borderRadius: '4px',
            padding: '1rem',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
            }}
          >
            <strong>{manifest.name}</strong>
            <Button
              variant="plain"
              icon={<TrashIcon />}
              aria-label={`Remove ${manifest.name}`}
              onClick={() =>
                setManifests(form.manifests.filter((m) => m.id !== manifest.id))
              }
            />
          </div>
          {!form.consolidateManifests && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                marginBottom: '0.75rem',
              }}
            >
              <FormGroup label="ConfigurationPolicy name" fieldId={`cp-name-${manifest.id}`}>
                <TextInput
                  id={`cp-name-${manifest.id}`}
                  value={manifest.configPolicyName || stemFromFileName(manifest.name)}
                  onChange={(_e, v) => updateManifest(manifest.id, { configPolicyName: v })}
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      Name needs to be unique to the namespace on each of the managed clusters.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
              <FormGroup label="Compliance type" fieldId={`cp-compliance-${manifest.id}`}>
                <SelectField
                  id={`cp-compliance-${manifest.id}`}
                  value={manifest.complianceType || form.complianceType}
                  onChange={(v) =>
                    updateManifest(manifest.id, { complianceType: v as ComplianceType })
                  }
                  options={[
                    { value: 'musthave', label: 'musthave' },
                    { value: 'mustonlyhave', label: 'mustonlyhave' },
                    { value: 'mustnothave', label: 'mustnothave' },
                  ]}
                />
              </FormGroup>
            </div>
          )}
          {form.consolidateManifests && (
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Consolidated into one ConfigurationPolicy. Enable separate mode in Policy
                  settings to name each template.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
          <LazyYamlEditor
            value={manifest.content}
            onChange={(content) =>
              updateManifest(manifest.id, {
                content,
                lintErrors: formatLintErrors(lintYaml(content)),
              })
            }
            isDark={isDark}
            height="220px"
          />
          {manifest.lintErrors && manifest.lintErrors.length > 0 && (
            <Alert variant="danger" title="Lint errors" isInline style={{ marginTop: '0.5rem' }}>
              <List>
                {manifest.lintErrors.slice(0, 5).map((err) => (
                  <ListItem key={err}>{err}</ListItem>
                ))}
              </List>
            </Alert>
          )}
        </div>
      ))}
    </Form>
  );
}
