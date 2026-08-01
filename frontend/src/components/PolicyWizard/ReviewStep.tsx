import { useEffect, useState } from 'react';
import {
  Alert,
  AlertActionCloseButton,
  Button,
  Flex,
  FlexItem,
  List,
  ListItem,
  Spinner,
} from '@patternfly/react-core';
import CheckCircleIcon from '@patternfly/react-icons/dist/esm/icons/check-circle-icon';
import ExternalLinkAltIcon from '@patternfly/react-icons/dist/esm/icons/external-link-alt-icon';
import DownloadIcon from '@patternfly/react-icons/dist/esm/icons/download-icon';
import CopyIcon from '@patternfly/react-icons/dist/esm/icons/copy-icon';
import UploadIcon from '@patternfly/react-icons/dist/esm/icons/upload-icon';
import { LazyYamlEditor } from '../LazyYamlEditor';
import { applyPolicy, fetchConsoleUrl } from '../../services/api';
import type { ApplyResult } from '../../types';

interface Props {
  yaml: string;
  policyName: string;
  namespace: string;
  isDark: boolean;
  isGenerating: boolean;
  generateError: string | null;
  editMode?: 'create' | 'edit';
}

export function ReviewStep({
  yaml,
  policyName,
  namespace,
  isDark,
  isGenerating,
  generateError,
  editMode = 'create',
}: Props) {
  const [copied, setCopied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResults, setApplyResults] = useState<ApplyResult[] | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [consoleUrl, setConsoleUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchConsoleUrl().then(setConsoleUrl);
  }, []);

  const download = () => {
    const blob = new Blob([yaml], { type: 'application/x-yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${policyName || 'acm-policy'}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const apply = async () => {
    setApplying(true);
    setApplyError(null);
    setApplyResults(null);
    try {
      const results = await applyPolicy(yaml);
      setApplyResults(results);
    } catch (err: unknown) {
      setApplyError(err instanceof Error ? err.message : String(err));
    } finally {
      setApplying(false);
    }
  };

  if (isGenerating) {
    return (
      <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapMd' }}>
        <Spinner size="lg" />
        <span>Generating Policy, Placement, and PlacementBinding…</span>
      </Flex>
    );
  }

  if (generateError) {
    return <Alert variant="danger" title="Generation failed" isInline>{generateError}</Alert>;
  }

  if (!yaml) {
    return (
      <Alert variant="info" title="No generated YAML yet" isInline>
        Complete previous steps and continue to generate the policy resources.
      </Alert>
    );
  }

  const hasApplyErrors = applyResults?.some((r) => r.status === 'error');

  return (
    <div>
      <Flex spaceItems={{ default: 'spaceItemsSm' }} style={{ marginBottom: '1rem' }}>
        <FlexItem>
          <Button variant="primary" icon={<DownloadIcon />} onClick={download}>
            Download YAML
          </Button>
        </FlexItem>
        <FlexItem>
          <Button
            variant="secondary"
            icon={copied ? <CheckCircleIcon /> : <CopyIcon />}
            onClick={copy}
          >
            {copied ? 'Copied' : 'Copy to clipboard'}
          </Button>
        </FlexItem>
        <FlexItem>
          <Button
            variant="secondary"
            icon={<UploadIcon />}
            onClick={apply}
            isLoading={applying}
            isDisabled={applying}
          >
            {editMode === 'edit' ? 'Update on cluster' : 'Apply to cluster'}
          </Button>
        </FlexItem>
      </Flex>

      {applyError && (
        <Alert
          variant="danger"
          title="Apply failed"
          isInline
          actionClose={<AlertActionCloseButton onClose={() => setApplyError(null)} />}
          style={{ marginBottom: '1rem' }}
        >
          {applyError}
        </Alert>
      )}

      {applyResults && (
        <Alert
          variant={hasApplyErrors ? 'warning' : 'success'}
          title={hasApplyErrors ? 'Apply completed with errors' : 'Resources applied'}
          isInline
          style={{ marginBottom: '1rem' }}
        >
          <List>
            {applyResults.map((r) => (
              <ListItem key={`${r.kind}-${r.name}`}>
                {r.kind}/{r.name}
                {r.namespace ? ` (${r.namespace})` : ''}: {r.status}
                {r.message ? ` — ${r.message}` : ''}
              </ListItem>
            ))}
          </List>
          {!hasApplyErrors && consoleUrl && policyName && namespace && (
            <Button
              variant="link"
              component="a"
              href={`${consoleUrl}/multicloud/governance/policies/details/${encodeURIComponent(namespace)}/${encodeURIComponent(policyName)}`}
              target="_blank"
              rel="noopener noreferrer"
              icon={<ExternalLinkAltIcon />}
              iconPosition="end"
              isInline
              style={{ marginTop: '0.5rem' }}
            >
              View Policy in ACM
            </Button>
          )}
        </Alert>
      )}

      <LazyYamlEditor
        value={yaml}
        onChange={() => undefined}
        isDark={isDark}
        readOnly
        height="480px"
        isResizable
      />
    </div>
  );
}
