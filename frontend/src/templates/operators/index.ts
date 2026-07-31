import type { PolicyTemplate } from '../types';

const OP_DEFAULTS = {
  remediationAction: 'enforce' as const,
  severity: 'medium' as const,
  complianceType: 'musthave' as const,
  consolidateManifests: true,
  standards: ['NIST SP 800-53'],
  categories: ['CM Configuration Management'],
  controls: ['CM-2 Baseline Configuration'],
};

export const operatorTemplates: PolicyTemplate[] = [
  {
    id: 'op-loki',
    name: 'Loki operator',
    description: 'Install the Red Hat Loki operator in openshift-operators-redhat.',
    category: 'operators',
    defaults: {
      ...OP_DEFAULTS,
      policyName: 'loki-operator',
      description: 'Deploys the Loki operator',
    },
    manifests: [
      {
        name: 'namespace',
        content: `apiVersion: v1
kind: Namespace
metadata:
  labels:
    openshift.io/cluster-monitoring: "true"
  name: openshift-operators-redhat`,
      },
      {
        name: 'metrics-secret',
        content: `apiVersion: v1
kind: Secret
metadata:
  annotations:
    kubernetes.io/service-account.name: loki-operator-controller-manager-metrics-reader
  labels:
    app.kubernetes.io/name: loki-operator
  name: loki-operator-controller-manager-metrics-token
  namespace: openshift-operators-redhat
type: kubernetes.io/service-account-token`,
      },
      {
        name: 'operatorpolicy',
        content: `apiVersion: policy.open-cluster-management.io/v1beta1
kind: OperatorPolicy
metadata:
  name: loki-operator-install
spec:
  complianceType: musthave
  complianceConfig:
    catalogSourceUnhealthy: NonCompliant
    deploymentsUnavailable: NonCompliant
    upgradesAvailable: Compliant
  remediationAction: enforce
  removalBehavior:
    clusterServiceVersions: Delete
    customResourceDefinitions: Delete
    operatorGroups: DeleteIfUnused
    subscriptions: Delete
  severity: critical
  upgradeApproval: Automatic
  subscription:
    channel: stable-6.5
    name: loki-operator
    namespace: openshift-operators-redhat
    source: redhat-operators
    sourceNamespace: openshift-marketplace`,
      },
    ],
  },
  {
    id: 'op-tekton',
    name: 'OpenShift Pipelines (Tekton)',
    description: 'Install the OpenShift Pipelines operator.',
    category: 'operators',
    defaults: {
      ...OP_DEFAULTS,
      policyName: 'pipelines-operator',
      description: 'Deploys OpenShift Pipelines operator',
    },
    manifests: [
      {
        name: 'namespace',
        content: `apiVersion: v1
kind: Namespace
metadata:
  labels:
    openshift.io/cluster-monitoring: "true"
  name: openshift-pipeline-operator`,
      },
      {
        name: 'operatorpolicy',
        content: `apiVersion: policy.open-cluster-management.io/v1beta1
kind: OperatorPolicy
metadata:
  name: pipelines-operator-install
spec:
  complianceType: musthave
  complianceConfig:
    catalogSourceUnhealthy: NonCompliant
    deploymentsUnavailable: NonCompliant
    upgradesAvailable: Compliant
  remediationAction: enforce
  removalBehavior:
    clusterServiceVersions: Delete
    customResourceDefinitions: Delete
    operatorGroups: DeleteIfUnused
    subscriptions: Delete
  severity: critical
  upgradeApproval: Automatic
  subscription:
    channel: pipelines-1.19
    name: openshift-pipelines-operator-rh
    namespace: openshift-pipeline-operator
    source: redhat-operators
    sourceNamespace: openshift-marketplace`,
      },
    ],
  },
  {
    id: 'op-compliance',
    name: 'Compliance operator',
    description: 'Install the Compliance operator (scans can be added later).',
    category: 'operators',
    defaults: {
      ...OP_DEFAULTS,
      policyName: 'compliance-operator',
      description: 'Deploys the Compliance operator',
      severity: 'high',
    },
    manifests: [
      {
        name: 'namespace',
        content: `apiVersion: v1
kind: Namespace
metadata:
  annotations:
    openshift.io/node-selector: ''
  labels:
    openshift.io/cluster-monitoring: "true"
    pod-security.kubernetes.io/enforce: privileged
  name: openshift-compliance`,
      },
      {
        name: 'operatorpolicy',
        content: `apiVersion: policy.open-cluster-management.io/v1beta1
kind: OperatorPolicy
metadata:
  name: compliance-operator-install
spec:
  complianceType: musthave
  complianceConfig:
    catalogSourceUnhealthy: NonCompliant
    deploymentsUnavailable: NonCompliant
    upgradesAvailable: Compliant
  remediationAction: enforce
  removalBehavior:
    clusterServiceVersions: Delete
    customResourceDefinitions: Delete
    operatorGroups: DeleteIfUnused
    subscriptions: Delete
  severity: critical
  upgradeApproval: Automatic
  subscription:
    channel: stable
    name: compliance-operator
    namespace: openshift-compliance
    source: redhat-operators
    sourceNamespace: openshift-marketplace
  operatorGroup:
    name: compliance-operator
    targetNamespaces:
      - openshift-compliance`,
      },
    ],
  },
  {
    id: 'op-cert-manager',
    name: 'cert-manager (Red Hat)',
    description: 'Install the Red Hat OpenShift cert-manager operator.',
    category: 'operators',
    defaults: {
      ...OP_DEFAULTS,
      policyName: 'cert-manager-operator',
      description: 'Deploys OpenShift cert-manager operator',
    },
    notes: ['Uses the Red Hat openshift-cert-manager-operator package, not community jetstack.'],
    manifests: [
      {
        name: 'namespace',
        content: `apiVersion: v1
kind: Namespace
metadata:
  labels:
    openshift.io/cluster-monitoring: "true"
  name: cert-manager-operator`,
      },
      {
        name: 'trusted-ca-configmap',
        content: `apiVersion: v1
kind: ConfigMap
metadata:
  name: trusted-ca
  namespace: cert-manager
  labels:
    config.openshift.io/inject-trusted-cabundle: 'true'`,
      },
      {
        name: 'operatorpolicy',
        content: `apiVersion: policy.open-cluster-management.io/v1beta1
kind: OperatorPolicy
metadata:
  name: cert-manager-operator-install
spec:
  complianceType: musthave
  complianceConfig:
    catalogSourceUnhealthy: NonCompliant
    deploymentsUnavailable: NonCompliant
    upgradesAvailable: Compliant
  remediationAction: enforce
  removalBehavior:
    clusterServiceVersions: Delete
    customResourceDefinitions: Delete
    operatorGroups: DeleteIfUnused
    subscriptions: Delete
  severity: critical
  upgradeApproval: Automatic
  subscription:
    channel: stable-v1.19
    name: openshift-cert-manager-operator
    namespace: cert-manager-operator
    source: redhat-operators
    sourceNamespace: openshift-marketplace
    config:
      env:
        - name: TRUSTED_CA_CONFIGMAP_NAME
          value: trusted-ca`,
      },
    ],
  },
  {
    id: 'op-gitops',
    name: 'OpenShift GitOps',
    description: 'Install the OpenShift GitOps operator (install only).',
    category: 'operators',
    defaults: {
      ...OP_DEFAULTS,
      policyName: 'gitops-operator',
      description: 'Deploys OpenShift GitOps operator',
    },
    manifests: [
      {
        name: 'operator-ns',
        content: `apiVersion: v1
kind: Namespace
metadata:
  name: openshift-gitops-operator
  labels:
    openshift.io/cluster-monitoring: 'true'
    argocd.argoproj.io/managed-by: openshift-gitops`,
      },
      {
        name: 'argocd-ns',
        content: `apiVersion: v1
kind: Namespace
metadata:
  name: openshift-gitops
  labels:
    openshift.io/cluster-monitoring: 'true'
    argocd.argoproj.io/managed-by: openshift-gitops`,
      },
      {
        name: 'operatorpolicy',
        content: `apiVersion: policy.open-cluster-management.io/v1beta1
kind: OperatorPolicy
metadata:
  name: gitops-operator-install
spec:
  complianceType: musthave
  complianceConfig:
    catalogSourceUnhealthy: NonCompliant
    deploymentsUnavailable: NonCompliant
    upgradesAvailable: Compliant
  remediationAction: enforce
  removalBehavior:
    clusterServiceVersions: Delete
    customResourceDefinitions: Delete
    operatorGroups: DeleteIfUnused
    subscriptions: Delete
  severity: critical
  upgradeApproval: Automatic
  subscription:
    channel: gitops-1.20
    name: openshift-gitops-operator
    namespace: openshift-gitops-operator
    source: redhat-operators
    sourceNamespace: openshift-marketplace
    config:
      env:
        - name: ARGOCD_CLUSTER_CONFIG_NAMESPACES
          value: openshift-gitops
        - name: DISABLE_DEFAULT_ARGOCD_CONSOLELINK
          value: "true"`,
      },
    ],
  },
  {
    id: 'op-acs',
    name: 'Advanced Cluster Security operator',
    description: 'Install the RHACS operator (Central/sensor configuration is separate).',
    category: 'operators',
    defaults: {
      ...OP_DEFAULTS,
      policyName: 'acs-operator',
      description: 'Deploys Advanced Cluster Security operator',
      severity: 'high',
    },
    notes: ['Install only. Configure Central and secured clusters after the operator is ready.'],
    manifests: [
      {
        name: 'ns-rhacs-operator',
        content: `apiVersion: v1
kind: Namespace
metadata:
  name: rhacs-operator`,
      },
      {
        name: 'ns-stackrox',
        content: `apiVersion: v1
kind: Namespace
metadata:
  name: stackrox`,
      },
      {
        name: 'operatorpolicy',
        content: `apiVersion: policy.open-cluster-management.io/v1beta1
kind: OperatorPolicy
metadata:
  name: advanced-cluster-security-operator-install
spec:
  complianceType: musthave
  complianceConfig:
    catalogSourceUnhealthy: NonCompliant
    deploymentsUnavailable: NonCompliant
    upgradesAvailable: Compliant
  remediationAction: enforce
  removalBehavior:
    clusterServiceVersions: Delete
    customResourceDefinitions: Delete
    operatorGroups: DeleteIfUnused
    subscriptions: Delete
  severity: critical
  upgradeApproval: Automatic
  subscription:
    channel: rhacs-4.10
    name: rhacs-operator
    namespace: rhacs-operator
    source: redhat-operators
    sourceNamespace: openshift-marketplace`,
      },
    ],
  },
  {
    id: 'op-aap',
    name: 'Ansible Automation Platform operator',
    description: 'Install the AAP operator (instance/storage configuration is separate).',
    category: 'operators',
    defaults: {
      ...OP_DEFAULTS,
      policyName: 'aap-operator',
      description: 'Deploys Ansible Automation Platform operator',
    },
    notes: ['Install only. Full AAP setup may require Object Storage / ODF.'],
    manifests: [
      {
        name: 'namespace',
        content: `apiVersion: v1
kind: Namespace
metadata:
  labels:
    openshift.io/cluster-monitoring: "true"
  name: ansible-automation-platform`,
      },
      {
        name: 'operatorpolicy',
        content: `apiVersion: policy.open-cluster-management.io/v1beta1
kind: OperatorPolicy
metadata:
  name: ansible-operator-install
spec:
  complianceType: musthave
  complianceConfig:
    catalogSourceUnhealthy: NonCompliant
    deploymentsUnavailable: NonCompliant
    upgradesAvailable: Compliant
  remediationAction: enforce
  removalBehavior:
    clusterServiceVersions: Delete
    customResourceDefinitions: Delete
    operatorGroups: DeleteIfUnused
    subscriptions: Delete
  severity: critical
  upgradeApproval: Automatic
  subscription:
    channel: stable-2.6
    name: ansible-automation-platform-operator
    namespace: ansible-automation-platform
    source: redhat-operators
    sourceNamespace: openshift-marketplace
  operatorGroup:
    name: ansible-automation-platform-operator
    targetNamespaces:
      - ansible-automation-platform`,
      },
    ],
  },
];
