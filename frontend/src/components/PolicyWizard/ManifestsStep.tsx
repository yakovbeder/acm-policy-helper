import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  FileUpload,
  Form,
  FormGroup,
  FormHelperText,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  List,
  ListItem,
  Stack,
  StackItem,
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
      <Stack hasGutter>
        <StackItem>
          <Tabs
            activeKey={activeTab}
            onSelect={(_e, key) => setActiveTab(key)}
            aria-label="Manifest input methods"
          >
            <Tab eventKey={0} title={<TabTitleText>Paste YAML</TabTitleText>}>
              <Stack hasGutter>
                <StackItem>
                  <LazyYamlEditor
                    value={pasteContent}
                    onChange={setPasteContent}
                    isDark={isDark}
                    onLintErrors={setPasteErrors}
                    height="280px"
                    isResizable
                  />
                </StackItem>
                {pasteErrors.length > 0 && (
                  <StackItem>
                    <Alert variant="warning" title="YAML lint issues" isInline>
                      <List>
                        {pasteErrors.slice(0, 5).map((err) => (
                          <ListItem key={err}>{err}</ListItem>
                        ))}
                      </List>
                    </Alert>
                  </StackItem>
                )}
                <StackItem>
                  <Button
                    variant="secondary"
                    onClick={handleAddPaste}
                    isDisabled={!pasteContent.trim()}
                  >
                    Add pasted YAML
                  </Button>
                </StackItem>
              </Stack>
            </Tab>
            <Tab eventKey={1} title={<TabTitleText>Upload file</TabTitleText>}>
              <Stack hasGutter>
                <StackItem>
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
                </StackItem>
                {uploadWarning && (
                  <StackItem>
                    <Alert variant="warning" title="Uploaded file has lint issues" isInline>
                      {uploadWarning}
                    </Alert>
                  </StackItem>
                )}
              </Stack>
            </Tab>
          </Tabs>
        </StackItem>

        <StackItem>
          <Title headingLevel="h3">Manifests ({form.manifests.length})</Title>
        </StackItem>

        {form.manifests.length === 0 && (
          <StackItem>
            <Alert variant="info" title="No manifests added yet" isInline>
              Paste YAML or upload a file containing the Kubernetes resources to wrap in a
              Configuration Policy.
            </Alert>
          </StackItem>
        )}

        {form.manifests.map((manifest) => (
          <StackItem key={manifest.id}>
            <Card isCompact>
              <CardHeader
                actions={{
                  actions: (
                    <Button
                      variant="plain"
                      icon={<TrashIcon />}
                      aria-label={`Remove ${manifest.name}`}
                      onClick={() =>
                        setManifests(form.manifests.filter((m) => m.id !== manifest.id))
                      }
                    />
                  ),
                }}
              >
                <CardTitle>{manifest.name}</CardTitle>
              </CardHeader>
              <CardBody>
                <Stack hasGutter>
                  {!form.consolidateManifests && (
                    <StackItem>
                      <Grid hasGutter>
                        <GridItem md={6} sm={12}>
                          <FormGroup
                            label="ConfigurationPolicy name"
                            fieldId={`cp-name-${manifest.id}`}
                          >
                            <TextInput
                              id={`cp-name-${manifest.id}`}
                              value={manifest.configPolicyName || stemFromFileName(manifest.name)}
                              onChange={(_e, v) =>
                                updateManifest(manifest.id, { configPolicyName: v })
                              }
                            />
                            <FormHelperText>
                              <HelperText>
                                <HelperTextItem>
                                  Name needs to be unique to the namespace on each of the managed
                                  clusters.
                                </HelperTextItem>
                              </HelperText>
                            </FormHelperText>
                          </FormGroup>
                        </GridItem>
                        <GridItem md={6} sm={12}>
                          <FormGroup
                            label="Compliance type"
                            fieldId={`cp-compliance-${manifest.id}`}
                          >
                            <SelectField
                              id={`cp-compliance-${manifest.id}`}
                              value={manifest.complianceType || form.complianceType}
                              onChange={(v) =>
                                updateManifest(manifest.id, {
                                  complianceType: v as ComplianceType,
                                })
                              }
                              options={[
                                { value: 'musthave', label: 'musthave' },
                                { value: 'mustonlyhave', label: 'mustonlyhave' },
                                { value: 'mustnothave', label: 'mustnothave' },
                              ]}
                            />
                          </FormGroup>
                        </GridItem>
                      </Grid>
                    </StackItem>
                  )}
                  {form.consolidateManifests && (
                    <StackItem>
                      <FormHelperText>
                        <HelperText>
                          <HelperTextItem>
                            Consolidated into one ConfigurationPolicy. Enable separate mode in
                            Policy settings to name each template.
                          </HelperTextItem>
                        </HelperText>
                      </FormHelperText>
                    </StackItem>
                  )}
                  <StackItem>
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
                      isResizable
                    />
                  </StackItem>
                  {manifest.lintErrors && manifest.lintErrors.length > 0 && (
                    <StackItem>
                      <Alert variant="danger" title="Lint errors" isInline>
                        <List>
                          {manifest.lintErrors.slice(0, 5).map((err) => (
                            <ListItem key={err}>{err}</ListItem>
                          ))}
                        </List>
                      </Alert>
                    </StackItem>
                  )}
                </Stack>
              </CardBody>
            </Card>
          </StackItem>
        ))}
      </Stack>
    </Form>
  );
}
