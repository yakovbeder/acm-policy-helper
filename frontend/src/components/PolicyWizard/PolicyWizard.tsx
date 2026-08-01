import { useRef, useState } from 'react';
import {
  Alert,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Wizard,
  WizardFooterWrapper,
  WizardStep,
  useWizardContext,
} from '@patternfly/react-core';
import { fetchPolicy, fetchPolicyBundle, generatePolicy } from '../../services/api';
import { hydrateFormFromPolicyBundle } from '../../services/policyHydrate';
import { formFromTemplate, type PolicyTemplate } from '../../templates';
import { defaultFormState, type PolicyFormState } from '../../types';
import { ManifestsStep } from './ManifestsStep';
import { PlacementStep } from './PlacementStep';
import { PolicySettingsStep } from './PolicySettingsStep';
import { ReviewStep } from './ReviewStep';
import { TemplateStep } from './TemplateStep';

interface Props {
  isDark: boolean;
}

interface StepFooterProps {
  nextLabel?: string;
  isNextDisabled?: boolean;
  onBeforeNext?: () => boolean | Promise<boolean>;
  hideNext?: boolean;
}

function StepFooter({
  nextLabel = 'Next',
  isNextDisabled = false,
  onBeforeNext,
  hideNext = false,
}: StepFooterProps) {
  const { goToNextStep, goToPrevStep, activeStep } = useWizardContext();
  const [busy, setBusy] = useState(false);
  const isFirst = activeStep?.index === 1;

  return (
    <WizardFooterWrapper>
      <Button variant="secondary" onClick={goToPrevStep} isDisabled={isFirst || busy}>
        Back
      </Button>
      {!hideNext && (
        <Button
          variant="primary"
          isDisabled={isNextDisabled || busy}
          isLoading={busy}
          onClick={async () => {
            if (onBeforeNext) {
              setBusy(true);
              try {
                const ok = await onBeforeNext();
                if (!ok) {
                  return;
                }
              } finally {
                setBusy(false);
              }
            }
            goToNextStep();
          }}
        >
          {nextLabel}
        </Button>
      )}
    </WizardFooterWrapper>
  );
}

type EditMode = 'create' | 'edit';

export function PolicyWizard({ isDark }: Props) {
  const [form, setForm] = useState<PolicyFormState>(defaultFormState);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>('blank');
  const [generatedYaml, setGeneratedYaml] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<EditMode>('create');
  const [hydrateWarnings, setHydrateWarnings] = useState<string[]>([]);
  const [existingModalOpen, setExistingModalOpen] = useState(false);
  const [fetchingExisting, setFetchingExisting] = useState(false);
  const existingResolveRef = useRef<((ok: boolean) => void) | null>(null);

  const patchForm = (patch: Partial<PolicyFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setStepError(null);
    setGenerateError(null);
    // Any wizard change invalidates the Review preview until Generate
    setGeneratedYaml('');
    // Changing name/namespace leaves edit mode so existence can be re-checked
    if ('policyName' in patch || 'namespace' in patch) {
      setEditMode('create');
      setHydrateWarnings([]);
    }
  };

  const onSelectBlank = () => {
    setSelectedTemplateId('blank');
    setForm(defaultFormState());
    setEditMode('create');
    setHydrateWarnings([]);
    setGeneratedYaml('');
    setGenerateError(null);
    setStepError(null);
  };

  const onSelectTemplate = (template: PolicyTemplate) => {
    setSelectedTemplateId(template.id);
    setForm(formFromTemplate(template));
    setEditMode('create');
    setHydrateWarnings([]);
    setGeneratedYaml('');
    setGenerateError(null);
    setStepError(null);
  };

  const runGenerate = async (): Promise<boolean> => {
    setIsGenerating(true);
    setGenerateError(null);
    setStepError(null);
    try {
      const yaml = await generatePolicy(form);
      setGeneratedYaml(yaml);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setGenerateError(message);
      setStepError(`Policy generation failed: ${message}`);
      setGeneratedYaml('');
      return false;
    } finally {
      setIsGenerating(false);
    }
  };

  const finishExistingModal = (proceed: boolean) => {
    setExistingModalOpen(false);
    const resolve = existingResolveRef.current;
    existingResolveRef.current = null;
    resolve?.(proceed);
  };

  const checkExistingPolicy = async (): Promise<boolean> => {
    // Allow free step navigation like ACM; only prompt when both values are set.
    if (!form.policyName.trim() || !form.namespace.trim()) {
      setStepError(null);
      return true;
    }
    setStepError(null);

    if (editMode === 'edit') {
      return true;
    }

    try {
      const existing = await fetchPolicy(form.namespace.trim(), form.policyName.trim());
      if (!existing) {
        setEditMode('create');
        return true;
      }
      return await new Promise<boolean>((resolve) => {
        existingResolveRef.current = resolve;
        setExistingModalOpen(true);
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('Policy existence check failed:', message);
      return true;
    }
  };

  const onContinueAsNew = () => {
    setEditMode('create');
    setHydrateWarnings([]);
    finishExistingModal(true);
  };

  const onFetchAndEdit = async () => {
    setFetchingExisting(true);
    try {
      const bundle = await fetchPolicyBundle(form.namespace.trim(), form.policyName.trim());
      const hydrated = hydrateFormFromPolicyBundle(bundle);
      setForm(hydrated.form);
      setHydrateWarnings(hydrated.warnings);
      setEditMode('edit');
      setGeneratedYaml('');
      finishExistingModal(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setStepError(`Could not fetch policy: ${message}`);
      finishExistingModal(false);
    } finally {
      setFetchingExisting(false);
    }
  };

  return (
    <>
      {stepError && (
        <Alert variant="danger" title={stepError} isInline style={{ marginBottom: '1rem' }} />
      )}
      {editMode === 'edit' && (
        <Alert
          variant="info"
          title={`Editing existing policy ${form.policyName} in ${form.namespace}`}
          isInline
          style={{ marginBottom: '1rem' }}
        >
          Add or change manifests, then generate and apply to the cluster.
          {hydrateWarnings.length > 0 && (
            <ul style={{ marginTop: '0.5rem' }}>
              {hydrateWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      <Modal
        isOpen={existingModalOpen}
        onClose={() => finishExistingModal(false)}
        variant="medium"
        aria-labelledby="policy-exists-title"
        aria-describedby="policy-exists-body"
      >
        <ModalHeader title="Policy exists" labelId="policy-exists-title" />
        <ModalBody id="policy-exists-body">
          Policy <strong>{form.policyName}</strong> already exists in namespace{' '}
          <strong>{form.namespace}</strong>. Fetch it to edit and add manifests, or continue and
          overwrite on apply.
        </ModalBody>
        <ModalFooter>
          <Button variant="primary" onClick={onFetchAndEdit} isLoading={fetchingExisting}>
            Fetch and edit
          </Button>
          <Button variant="secondary" onClick={onContinueAsNew} isDisabled={fetchingExisting}>
            Continue as new
          </Button>
          <Button
            variant="link"
            onClick={() => finishExistingModal(false)}
            isDisabled={fetchingExisting}
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      {/* No isVisitRequired: match ACM — users can open any step from the nav anytime. */}
      <Wizard height="100%">
        <WizardStep id="templates" name="Template" footer={<StepFooter />}>
          <TemplateStep
            selectedTemplateId={selectedTemplateId}
            onSelectBlank={onSelectBlank}
            onSelectTemplate={onSelectTemplate}
          />
        </WizardStep>

        <WizardStep
          id="settings"
          name="Policy settings"
          footer={<StepFooter onBeforeNext={checkExistingPolicy} />}
        >
          <PolicySettingsStep form={form} onChange={patchForm} />
        </WizardStep>

        <WizardStep id="placement" name="Placement" footer={<StepFooter />}>
          <PlacementStep form={form} onChange={patchForm} />
        </WizardStep>

        <WizardStep
          id="manifests"
          name="Manifests"
          footer={
            <StepFooter
              nextLabel="Generate"
              isNextDisabled={form.manifests.length === 0}
              onBeforeNext={async () => {
                if (form.manifests.length === 0) {
                  setStepError('Add at least one YAML manifest before generating.');
                  return false;
                }
                if (
                  form.placement.mode === 'clusterSets' &&
                  form.placement.clusterSets.length === 0
                ) {
                  setStepError(
                    'Add at least one ManagedClusterSet, or switch to label selectors.'
                  );
                  return false;
                }
                if (!form.policyName.trim() || !form.namespace.trim()) {
                  setStepError('Policy name and namespace are required before generating.');
                  return false;
                }
                return runGenerate();
              }}
            />
          }
        >
          {generateError && (
            <Alert
              variant="danger"
              title="Could not generate policy"
              isInline
              style={{ marginBottom: '1rem' }}
            >
              {generateError}
            </Alert>
          )}
          <ManifestsStep form={form} onChange={patchForm} isDark={isDark} />
        </WizardStep>

        <WizardStep
          id="review"
          name="Review & apply"
          footer={<StepFooter hideNext />}
        >
          <ReviewStep
            yaml={generatedYaml}
            policyName={form.policyName}
            isDark={isDark}
            isGenerating={isGenerating}
            generateError={generateError}
            editMode={editMode}
          />
        </WizardStep>
      </Wizard>
    </>
  );
}
