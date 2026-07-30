import { useState } from 'react';
import {
  Alert,
  Button,
  Wizard,
  WizardFooterWrapper,
  WizardStep,
  useWizardContext,
} from '@patternfly/react-core';
import { generatePolicy } from '../../services/api';
import { defaultFormState, type PolicyFormState } from '../../types';
import { ManifestsStep } from './ManifestsStep';
import { PlacementStep } from './PlacementStep';
import { PolicySettingsStep } from './PolicySettingsStep';
import { ReviewStep } from './ReviewStep';

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
      <Button
        variant="secondary"
        onClick={goToPrevStep}
        isDisabled={isFirst || busy}
      >
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

export function PolicyWizard({ isDark }: Props) {
  const [form, setForm] = useState<PolicyFormState>(defaultFormState);
  const [generatedYaml, setGeneratedYaml] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  const patchForm = (patch: Partial<PolicyFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setStepError(null);
  };

  const runGenerate = async (): Promise<boolean> => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const yaml = await generatePolicy(form);
      setGeneratedYaml(yaml);
      return true;
    } catch (err: unknown) {
      setGenerateError(err instanceof Error ? err.message : String(err));
      setGeneratedYaml('');
      return false;
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {stepError && (
        <Alert variant="danger" title={stepError} isInline style={{ marginBottom: '1rem' }} />
      )}
      <Wizard isVisitRequired height="100%">
        <WizardStep
          id="settings"
          name="Policy settings"
          footer={
            <StepFooter
              isNextDisabled={!form.policyName.trim() || !form.namespace.trim()}
              onBeforeNext={() => {
                if (!form.policyName.trim() || !form.namespace.trim()) {
                  setStepError('Policy name and namespace are required.');
                  return false;
                }
                setStepError(null);
                return true;
              }}
            />
          }
        >
          <PolicySettingsStep form={form} onChange={patchForm} />
        </WizardStep>

        <WizardStep
          id="placement"
          name="Placement"
          footer={
            <StepFooter
              onBeforeNext={() => {
                if (
                  form.placement.mode === 'clusterSets' &&
                  form.placement.clusterSets.length === 0
                ) {
                  setStepError(
                    'Add at least one ManagedClusterSet, or switch to label selectors.'
                  );
                  return false;
                }
                setStepError(null);
                return true;
              }}
            />
          }
        >
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
                  setStepError('Add at least one YAML manifest.');
                  return false;
                }
                setStepError(null);
                return runGenerate();
              }}
            />
          }
        >
          <ManifestsStep form={form} onChange={patchForm} isDark={isDark} />
        </WizardStep>

        <WizardStep
          id="review"
          name="Review & apply"
          footer={
            <StepFooter
              nextLabel="Regenerate"
              onBeforeNext={async () => {
                await runGenerate();
                return false;
              }}
            />
          }
        >
          <ReviewStep
            yaml={generatedYaml}
            policyName={form.policyName}
            isDark={isDark}
            isGenerating={isGenerating}
            generateError={generateError}
          />
        </WizardStep>
      </Wizard>
    </>
  );
}
