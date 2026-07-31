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
    description: 'Loop over all ClusterOperators and report any that are Degraded or not Available.',
    category: 'cluster-health',
    defaults: {
      ...CH_DEFAULTS,
      policyName: 'clusteroperator-health',
      description: 'Reports ClusterOperator availability across all operators',
    },
    manifests: [
      {
        name: 'clusteroperator-loop',
        content: `object-templates-raw: |
  {{- $cVer := (lookup "config.openshift.io/v1" "ClusterVersion" "" "version") }}
  {{- $desiredVersion := (dig "desiredUpdate" "version" ($cVer.status.desired.version) $cVer.spec) }}
  {{- $excludedClusterOperators := list "aro" "cert-manager" }}
  {{- range $cOp := (lookup "config.openshift.io/v1" "ClusterOperator" "" "").items }}
    {{- if not (has $cOp.metadata.name $excludedClusterOperators) }}
  - complianceType: musthave
    objectDefinition:
      apiVersion: config.openshift.io/v1
      kind: ClusterOperator
      metadata:
        name: {{ $cOp.metadata.name }}
      status:
        conditions:
          - status: 'False'
            type: Progressing
          - status: 'False'
            type: Degraded
          - status: 'True'
            type: Available
        versions:
          - name: operator
            version: {{ $desiredVersion }}
    {{- end }}
  {{- end }}`,
      },
    ],
  },
  {
    id: 'ch-clusterversion-health',
    name: 'ClusterVersion health',
    description: 'Verify ClusterVersion upgrade completed and conditions are healthy.',
    category: 'cluster-health',
    defaults: {
      ...CH_DEFAULTS,
      policyName: 'clusterversion-health',
      description: 'Reports ClusterVersion availability and upgrade status',
    },
    manifests: [
      {
        name: 'clusterversion-raw',
        content: `object-templates-raw: |
  {{- $cVer := (lookup "config.openshift.io/v1" "ClusterVersion" "" "version") }}
  {{- $desiredVersion := (dig "desiredUpdate" "version" ($cVer.status.desired.version) $cVer.spec) }}
  - complianceType: musthave
    objectDefinition:
      apiVersion: config.openshift.io/v1
      kind: ClusterVersion
      metadata:
        name: version
      status:
        history:
          - version: {{ $desiredVersion }}
            state: "Completed"
        conditions:
          - status: 'True'
            type: Available
          - status: 'False'
            type: Failing
          - status: 'False'
            type: Progressing`,
      },
    ],
  },
  {
    id: 'ch-machineconfigpool-health',
    name: 'MachineConfigPool health',
    description: 'Loop over all MachineConfigPools and verify update/degradation status with EUS awareness.',
    category: 'cluster-health',
    defaults: {
      ...CH_DEFAULTS,
      policyName: 'machineconfigpool-health',
      description: 'Reports MachineConfigPool update and degradation status',
    },
    manifests: [
      {
        name: 'machineconfigpool-loop',
        content: `object-templates-raw: |
  {{- $cVer := (lookup "config.openshift.io/v1" "ClusterVersion" "" "version") }}
  {{- $desiredVersion := semver (dig "desiredUpdate" "version" ($cVer.status.desired.version) $cVer.spec) }}
  {{- $isEvenRelease := (eq (div $desiredVersion.Minor 2 | toInt) (div (add $desiredVersion.Minor 1) 2 | toInt)) }}
  {{- $mcpList := (lookup "machineconfiguration.openshift.io/v1" "MachineConfigPool" "" "").items }}
  {{- range $mcp := $mcpList }}
    {{- $eusMcpPaused := true }}
    {{- if or (eq $mcp.metadata.name "master")
              (not (hasPrefix "eus" $cVer.spec.channel))
              (and (hasPrefix "eus" $cVer.spec.channel)
                (or $isEvenRelease (and (not $isEvenRelease) (not $mcp.spec.paused)))
              ) }}
      {{- $eusMcpPaused = false }}
    {{- end }}
  - complianceType: musthave
    objectDefinition:
      apiVersion: machineconfiguration.openshift.io/v1
      kind: MachineConfigPool
      metadata:
        name: {{ $mcp.metadata.name }}
    {{- if not $eusMcpPaused }}
      spec:
        paused: false
    {{- end }}
      status:
        conditions:
          - status: 'False'
            type: RenderDegraded
          - status: 'False'
            type: NodeDegraded
          - status: 'False'
            type: Degraded
          - status: '{{ $eusMcpPaused | ternary "False" "True" }}'
            type: Updated
          - status: 'False'
            type: Updating
        degradedMachineCount: 0
        unavailableMachineCount: 0
        observedGeneration: '{{ $mcp.metadata.generation | toInt }}'
    {{- if not $eusMcpPaused }}
        readyMachineCount: '{{ $mcp.status.machineCount | toInt }}'
        updatedMachineCount: '{{ $mcp.status.machineCount | toInt }}'
    {{- end }}
  {{- end }}`,
      },
    ],
  },
  {
    id: 'ch-node-health',
    name: 'Node health',
    description: 'Loop over all nodes, match to MachineConfigPools, and verify Ready status and config alignment.',
    category: 'cluster-health',
    defaults: {
      ...CH_DEFAULTS,
      policyName: 'node-health',
      description: 'Reports node Ready status and MachineConfig alignment for all nodes',
    },
    manifests: [
      {
        name: 'node-loop',
        content: `object-templates-raw: |
  {{- $cVer := (lookup "config.openshift.io/v1" "ClusterVersion" "" "version") }}
  {{- $desiredVersion := semver (dig "desiredUpdate" "version" ($cVer.status.desired.version) $cVer.spec) }}
  {{- $isEvenRelease := (eq (div $desiredVersion.Minor 2 | toInt) (div (add $desiredVersion.Minor 1) 2 | toInt)) }}
  {{- $mcpList := (lookup "machineconfiguration.openshift.io/v1" "MachineConfigPool" "" "").items }}
  {{- $nodeList := (lookup "v1" "Node" "" "").items }}
  {{- $evaluatedNodes := list "" }}
  {{- $workerRenderedConfig := "" }}

  {{- range $mcp := $mcpList }}
    {{- $currentRenderedConfig := $mcp.status.configuration.name }}
    {{- if or (eq $mcp.metadata.name "master")
              (not (hasPrefix "eus" $cVer.spec.channel))
              (and (hasPrefix "eus" $cVer.spec.channel)
                (or $isEvenRelease (and (not $isEvenRelease) (not $mcp.spec.paused)))
              ) }}
      {{- $currentRenderedConfig = $mcp.spec.configuration.name }}
    {{- end }}
    {{- if eq $mcp.metadata.name "worker" }}
      {{- $workerRenderedConfig = $currentRenderedConfig }}
      {{- continue }}
    {{- end }}
    {{- range $node := $nodeList }}
      {{- $nodeMatches := true }}
      {{- if not (empty $mcp.spec.nodeSelector.matchLabels) }}
        {{- range $k,$v := $mcp.spec.nodeSelector.matchLabels }}
          {{- if ne (dig "labels" $k "NOTFOUND" $node.metadata) $v }}
            {{- $nodeMatches = false }}
            {{- break }}
          {{- end }}
        {{- end }}
      {{- else }}
        {{- range $e := $mcp.spec.nodeSelector.matchExpressions }}
          {{- if and (eq $e.operator "Exists") (eq (dig "labels" $e.key "NOTFOUND" $node.metadata) "NOTFOUND") }}
            {{- $nodeMatches = false }}
            {{- break }}
          {{- else if and (eq $e.operator "DoesNotExist") (ne (dig "labels" $e.key "NOTFOUND" $node.metadata) "NOTFOUND") }}
            {{- $nodeMatches = false }}
            {{- break }}
          {{- else if ne $e.operator "Exists" }}
            {{- $labelFound := false }}
            {{- range $val := $e.values }}
              {{- if eq (dig "labels" $e.key "NOTFOUND" $node.metadata) $val }}
                {{- $labelFound = true }}
              {{- end }}
            {{- end }}
            {{- if or (and (eq $e.operator "In") (not $labelFound)) (and (eq $e.operator "NotIn") ($labelFound)) }}
              {{- $nodeMatches = false }}
            {{- end }}
          {{- end }}
        {{- end }}
      {{- end }}
      {{- if not $nodeMatches }}
        {{- continue }}
      {{- end }}
      {{- $evaluatedNodes = append $evaluatedNodes $node.metadata.name }}
  - complianceType: musthave
    objectDefinition:
      kind: Node
      apiVersion: v1
      metadata:
        name: {{ $node.metadata.name }}
        annotations:
          machineconfiguration.openshift.io/currentConfig: {{ $currentRenderedConfig }}
          machineconfiguration.openshift.io/desiredConfig: {{ $currentRenderedConfig }}
          machineconfiguration.openshift.io/state: Done
      status:
        conditions:
          - type: MemoryPressure
            status: 'False'
          - type: DiskPressure
            status: 'False'
          - type: PIDPressure
            status: 'False'
          - type: Ready
            status: 'True'
    {{- end }}
  {{- end }}
  {{- range $node := $nodeList }}
    {{- if (has $node.metadata.name $evaluatedNodes) }}
      {{- continue }}
    {{- end }}
  - complianceType: musthave
    objectDefinition:
      kind: Node
      apiVersion: v1
      metadata:
        name: {{ $node.metadata.name }}
        annotations:
          machineconfiguration.openshift.io/currentConfig: {{ $workerRenderedConfig }}
          machineconfiguration.openshift.io/desiredConfig: {{ $workerRenderedConfig }}
          machineconfiguration.openshift.io/state: Done
      status:
        conditions:
          - type: MemoryPressure
            status: 'False'
          - type: DiskPressure
            status: 'False'
          - type: PIDPressure
            status: 'False'
          - type: Ready
            status: 'True'
  {{- end }}`,
      },
    ],
  },
  {
    id: 'ch-operator-lifecycle',
    name: 'Operator lifecycle failures',
    description: 'Detect failed OLM InstallPlans, Subscriptions, and marketplace Jobs.',
    category: 'cluster-health',
    defaults: {
      ...CH_DEFAULTS,
      policyName: 'operator-lifecycle-status',
      description: 'Monitors OLM operator lifecycle for failed InstallPlans, Subscriptions, and Jobs',
      consolidateManifests: false,
      complianceType: 'mustnothave',
    },
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
    description: 'Loop over all Placements and ensure unreachable/unavailable tolerations are present.',
    category: 'cluster-health',
    defaults: {
      ...CH_DEFAULTS,
      policyName: 'placement-tolerations',
      description: 'Ensures all Placements include standard cluster tolerations',
      remediationAction: 'enforce',
      severity: 'low',
    },
    manifests: [
      {
        name: 'placement-tolerations-loop',
        content: `object-templates-raw: |
  {{- $unreachableToleration := "cluster.open-cluster-management.io/unreachable" }}
  {{- $unavailableToleration := "cluster.open-cluster-management.io/unavailable" }}
  {{- range $pt := (lookup "cluster.open-cluster-management.io/v1beta1" "Placement" "" "").items }}
    {{- $hasUnreachable := false }}
    {{- $hasUnavailable := false }}
  - complianceType: musthave
    objectDefinition:
      apiVersion: cluster.open-cluster-management.io/v1beta1
      kind: Placement
      metadata:
        name: {{ $pt.metadata.name }}
        namespace: {{ $pt.metadata.namespace }}
      spec:
        tolerations:
    {{- range $t := $pt.spec.tolerations }}
      {{- if eq $t.key $unreachableToleration }}
        {{- $hasUnreachable = true }}
      {{- else if eq $t.key $unavailableToleration }}
        {{- $hasUnavailable = true }}
      {{- end }}
          - key: {{ $t.key }}
            operator: {{ $t.operator }}
      {{- if not (empty $t.value) }}
            value: {{ $t.value }}
      {{- end }}
      {{- if not (empty $t.tolerationSeconds) }}
            tolerationSeconds: {{ $t.tolerationSeconds }}
      {{- end }}
    {{- end }}
    {{- if not $hasUnreachable }}
          - key: {{ $unreachableToleration }}
            operator: Exists
    {{- end }}
    {{- if not $hasUnavailable }}
          - key: {{ $unavailableToleration }}
            operator: Exists
    {{- end }}
  {{- end }}`,
      },
    ],
  },
  {
    id: 'ch-dns-corefile-integrity',
    name: 'DNS Corefile integrity',
    description: 'Dynamically validate that the openshift-dns Corefile contains required plugins.',
    category: 'cluster-health',
    defaults: {
      ...CH_DEFAULTS,
      policyName: 'dns-corefile-integrity',
      description: 'Reports DNS Corefile plugin integrity',
    },
    manifests: [
      {
        name: 'dns-corefile-raw',
        content: `object-templates-raw: |
  {{- $cm := (lookup "v1" "ConfigMap" "openshift-dns" "dns-default") }}
  {{- if $cm }}
  {{- $corefile := $cm.data.Corefile }}
  {{- if and (contains "forward" $corefile) (contains "errors" $corefile) (contains "health" $corefile) (contains "cache" $corefile) }}
  - complianceType: musthave
    objectDefinition:
      apiVersion: v1
      kind: ConfigMap
      metadata:
        name: dns-default
        namespace: openshift-dns
  {{- else }}
  - complianceType: mustnothave
    objectDefinition:
      apiVersion: v1
      kind: ConfigMap
      metadata:
        name: dns-corefile-missing-required-plugins
        namespace: openshift-dns
  {{- end }}
  {{- end }}`,
      },
    ],
  },
  {
    id: 'ch-dns-resource-exhaustion',
    name: 'DNS DaemonSet replicas',
    description: 'Dynamically verify all dns-default DaemonSet replicas are available.',
    category: 'cluster-health',
    defaults: {
      ...CH_DEFAULTS,
      policyName: 'dns-resource-exhaustion',
      description: 'Reports DNS DaemonSet replica availability',
    },
    manifests: [
      {
        name: 'dns-replicas-raw',
        content: `object-templates-raw: |
  {{- $ds := (lookup "apps/v1" "DaemonSet" "openshift-dns" "dns-default") }}
  {{- if $ds }}
  {{- if eq ($ds.status.desiredNumberScheduled | toInt) ($ds.status.numberAvailable | toInt) }}
  - complianceType: musthave
    objectDefinition:
      apiVersion: apps/v1
      kind: DaemonSet
      metadata:
        name: dns-default
        namespace: openshift-dns
  {{- else }}
  - complianceType: mustnothave
    objectDefinition:
      apiVersion: v1
      kind: ConfigMap
      metadata:
        name: dns-daemonset-replicas-mismatch
        namespace: openshift-dns
  {{- end }}
  {{- end }}`,
      },
    ],
  },
  {
    id: 'ch-dns-alerting-rule',
    name: 'DNS alerting rules',
    description: 'Deploy Prometheus AlertingRules for DNS operator degradation and pod unavailability.',
    category: 'cluster-health',
    defaults: {
      ...CH_DEFAULTS,
      policyName: 'dns-alerting-rule',
      description: 'Deploys DNS governance alerting rules to openshift-monitoring',
      remediationAction: 'enforce',
      severity: 'medium',
    },
    manifests: [
      {
        name: 'dns-alerting-rule',
        content: `apiVersion: monitoring.openshift.io/v1
kind: AlertingRule
metadata:
  name: dns-governance-alerts
  namespace: openshift-monitoring
spec:
  groups:
  - name: dns-governance
    rules:
    - alert: DNSOperatorDegraded
      expr: |
        cluster_operator_conditions{name="dns",condition="Degraded",status="true"} == 1
      for: 10m
      labels:
        severity: critical
        namespace: openshift-dns-operator
      annotations:
        summary: "DNS Operator is in Degraded state"
        description: "The DNS ClusterOperator has been Degraded for more than 10 minutes."
    - alert: DNSPodsUnavailable
      expr: |
        kube_daemonset_status_number_available{namespace="openshift-dns",daemonset="dns-default"}
        < kube_daemonset_status_desired_number_scheduled{namespace="openshift-dns",daemonset="dns-default"}
      for: 5m
      labels:
        severity: warning
        namespace: openshift-dns
      annotations:
        summary: "CoreDNS pods not available on all nodes"
        description: "The dns-default DaemonSet has fewer available replicas than desired for more than 5 minutes."`,
      },
    ],
  },
  {
    id: 'ch-namespaces-terminating',
    name: 'No terminating namespaces',
    description: 'Inform when any Namespace is stuck in Terminating phase.',
    category: 'cluster-health',
    defaults: {
      ...CH_DEFAULTS,
      policyName: 'namespaces-terminating',
      description: 'Reports namespaces stuck in Terminating',
      complianceType: 'mustnothave',
      severity: 'low',
    },
    manifests: [
      {
        name: 'terminating-namespace',
        content: `apiVersion: v1
kind: Namespace
status:
  phase: Terminating`,
      },
    ],
  },
];
