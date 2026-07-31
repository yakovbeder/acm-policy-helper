import type { PolicyTemplate } from '../types';

const CH_DEFAULTS = {
  remediationAction: 'inform' as const,
  severity: 'high' as const,
  complianceType: 'musthave' as const,
  consolidateManifests: true,
  standards: ['NIST SP 800-53'],
  categories: ['CM Configuration Management'],
  controls: ['CM-2 Baseline Configuration'],
};

export const clusterHealthTemplates: PolicyTemplate[] = [
  {
    id: 'ch-clusteroperator-health',
    name: 'ClusterOperator health',
    description: 'Inform when a named ClusterOperator is not Available.',
    category: 'cluster-health',
    defaults: {
      ...CH_DEFAULTS,
      policyName: 'clusteroperator-health',
      description: 'Reports ClusterOperator availability for a named operator',
    },
    notes: [
      'Replace PLACEHOLDER_OPERATOR_NAME with the ClusterOperator name to monitor (for example, dns or ingress).',
      'Production policies often loop over all operators dynamically; this template checks a single named operator.',
    ],
    manifests: [
      {
        name: 'clusteroperator',
        content: `apiVersion: config.openshift.io/v1
kind: ClusterOperator
metadata:
  name: PLACEHOLDER_OPERATOR_NAME
status:
  conditions:
    - type: Progressing
      status: "False"
    - type: Degraded
      status: "False"
    - type: Available
      status: "True"`,
      },
    ],
  },
  {
    id: 'ch-clusterversion-health',
    name: 'ClusterVersion health',
    description: 'Inform when ClusterVersion is not Available or is Failing.',
    category: 'cluster-health',
    defaults: {
      ...CH_DEFAULTS,
      policyName: 'clusterversion-health',
      description: 'Reports ClusterVersion availability and upgrade status',
    },
    notes: [
      'Checks that ClusterVersion conditions show Available=True, Failing=False, and Progressing=False.',
    ],
    manifests: [
      {
        name: 'clusterversion',
        content: `apiVersion: config.openshift.io/v1
kind: ClusterVersion
metadata:
  name: version
status:
  conditions:
    - type: Available
      status: "True"
    - type: Failing
      status: "False"
    - type: Progressing
      status: "False"`,
      },
    ],
  },
  {
    id: 'ch-machineconfigpool-health',
    name: 'MachineConfigPool health',
    description: 'Inform when master or worker MachineConfigPools are degraded or not fully updated.',
    category: 'cluster-health',
    defaults: {
      ...CH_DEFAULTS,
      policyName: 'machineconfigpool-health',
      description: 'Reports MachineConfigPool update and degradation status',
      consolidateManifests: false,
    },
    notes: [
      'Checks master and worker pools for Updated=True and Degraded=False.',
      'EUS upgrade pause scenarios may require relaxing these checks during controlled upgrades.',
    ],
    manifests: [
      {
        name: 'machineconfigpool-master',
        content: `apiVersion: machineconfiguration.openshift.io/v1
kind: MachineConfigPool
metadata:
  name: master
spec:
  paused: false
status:
  conditions:
    - type: RenderDegraded
      status: "False"
    - type: NodeDegraded
      status: "False"
    - type: Degraded
      status: "False"
    - type: Updated
      status: "True"
    - type: Updating
      status: "False"
  degradedMachineCount: 0
  unavailableMachineCount: 0`,
      },
      {
        name: 'machineconfigpool-worker',
        content: `apiVersion: machineconfiguration.openshift.io/v1
kind: MachineConfigPool
metadata:
  name: worker
spec:
  paused: false
status:
  conditions:
    - type: RenderDegraded
      status: "False"
    - type: NodeDegraded
      status: "False"
    - type: Degraded
      status: "False"
    - type: Updated
      status: "True"
    - type: Updating
      status: "False"
  degradedMachineCount: 0
  unavailableMachineCount: 0`,
      },
    ],
  },
  {
    id: 'ch-node-health',
    name: 'Node health',
    description: 'Inform when a named node is not Ready.',
    category: 'cluster-health',
    defaults: {
      ...CH_DEFAULTS,
      policyName: 'node-health',
      description: 'Reports node Ready status for a named node',
    },
    notes: [
      'Replace PLACEHOLDER_NODE_NAME with the node name to monitor.',
      'Production policies typically evaluate all nodes dynamically; this template checks a single named node.',
    ],
    manifests: [
      {
        name: 'node',
        content: `apiVersion: v1
kind: Node
metadata:
  name: PLACEHOLDER_NODE_NAME
status:
  conditions:
    - type: MemoryPressure
      status: "False"
    - type: DiskPressure
      status: "False"
    - type: PIDPressure
      status: "False"
    - type: Ready
      status: "True"`,
      },
    ],
  },
  {
    id: 'ch-operator-lifecycle',
    name: 'Operator lifecycle failures',
    description: 'Inform on failed OLM InstallPlans, Subscriptions, and marketplace Jobs.',
    category: 'cluster-health',
    defaults: {
      ...CH_DEFAULTS,
      policyName: 'operator-lifecycle-status',
      description: 'Reports failed OLM operator lifecycle resources',
      consolidateManifests: false,
      complianceType: 'mustnothave',
    },
    notes: [
      'These checks use mustnothave compliance to detect failed InstallPlans, Subscriptions, and Jobs.',
      'Scope namespaces to openshift-*, open-cluster-management, and multicluster-engine as needed.',
    ],
    manifests: [
      {
        name: 'failed-installplan',
        content: `apiVersion: operators.coreos.com/v1alpha1
kind: InstallPlan
metadata:
  generateName: install-
status:
  bundleLookups:
    - conditions:
        - reason: JobIncomplete
          status: "True"
          type: BundleLookupPending
        - message: Job was active longer than specified deadline
          reason: DeadlineExceeded
          status: "True"
          type: BundleLookupFailed
  conditions:
    - message: "bundle unpacking failed. Reason: DeadlineExceeded"
      reason: InstallCheckFailed
      status: "False"
      type: Installed
  phase: Failed`,
      },
      {
        name: 'failed-subscription',
        content: `apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
status:
  conditions:
    - status: "True"
      type: InstallPlanFailed
  state: UpgradePending`,
      },
      {
        name: 'failed-job',
        content: `apiVersion: batch/v1
kind: Job
metadata:
  namespace: openshift-marketplace
status:
  conditions:
    - type: Failed
      status: "True"
      reason: DeadlineExceeded
      message: Job was active longer than specified deadline
  failed: 1`,
      },
    ],
  },
  {
    id: 'ch-placement-tolerations',
    name: 'Placement tolerations (hub)',
    description: 'Example Placement with unreachable and unavailable tolerations for hub-side governance.',
    category: 'cluster-health',
    defaults: {
      ...CH_DEFAULTS,
      policyName: 'placement-tolerations',
      description: 'Ensures Placements include standard cluster tolerations',
      remediationAction: 'enforce',
      severity: 'low',
    },
    notes: [
      'Hub-only: applies to Placement resources on the ACM hub, not managed clusters.',
      'Replace PLACEHOLDER_PLACEMENT_NAME and PLACEHOLDER_PLACEMENT_NAMESPACE.',
      'Production policies typically loop over all Placements dynamically.',
    ],
    manifests: [
      {
        name: 'placement-tolerations',
        content: `apiVersion: cluster.open-cluster-management.io/v1beta1
kind: Placement
metadata:
  name: PLACEHOLDER_PLACEMENT_NAME
  namespace: PLACEHOLDER_PLACEMENT_NAMESPACE
spec:
  tolerations:
    - key: cluster.open-cluster-management.io/unreachable
      operator: Exists
    - key: cluster.open-cluster-management.io/unavailable
      operator: Exists`,
      },
    ],
  },
  {
    id: 'ch-dns-corefile',
    name: 'DNS Corefile integrity',
    description: 'Inform when the openshift-dns Corefile is missing required plugins.',
    category: 'cluster-health',
    defaults: {
      ...CH_DEFAULTS,
      policyName: 'dns-corefile-integrity',
      description: 'Reports DNS Corefile plugin integrity',
    },
    notes: [
      'Replace PLACEHOLDER_COREFILE with a Corefile snippet that includes forward, errors, health, and cache plugins.',
      'Production policies often use lookup templates to validate live Corefile content dynamically.',
    ],
    manifests: [
      {
        name: 'dns-corefile',
        content: `apiVersion: v1
kind: ConfigMap
metadata:
  name: dns-default
  namespace: openshift-dns
data:
  Corefile: PLACEHOLDER_COREFILE`,
      },
    ],
  },
  {
    id: 'ch-dns-replicas',
    name: 'DNS DaemonSet availability',
    description: 'Inform when the dns-default DaemonSet exists but replicas are unavailable.',
    category: 'cluster-health',
    defaults: {
      ...CH_DEFAULTS,
      policyName: 'dns-replicas',
      description: 'Reports dns-default DaemonSet existence and availability',
    },
    notes: [
      'Static musthave checks DaemonSet metadata only; desired vs ready replica counts require dynamic lookup templates.',
      'Pair with cc-dns-alerting-rule for Prometheus-based replica monitoring.',
    ],
    manifests: [
      {
        name: 'dns-daemonset',
        content: `apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: dns-default
  namespace: openshift-dns`,
      },
    ],
  },
];
