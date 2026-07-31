import type { PolicyTemplate } from '../types';

const CC_DEFAULTS = {
  remediationAction: 'enforce' as const,
  severity: 'medium' as const,
  complianceType: 'musthave' as const,
  consolidateManifests: true,
  standards: ['NIST SP 800-53'],
  categories: ['CM Configuration Management'],
  controls: ['CM-2 Baseline Configuration'],
};

const CHRONY_PLACEHOLDER_B64 =
  'c2VydmVyIFBMQUNFSE9MREVSX05UUF9TRVJWRVJfMSBpYnVyc3QKc2VydmVyIFBMQUNFSE9MREVSX05UUF9TRVJWRVJfMiBpYnVyc3QKZHJpZnRmaWxlIC92YXIvbGliL2Nocm9ueS9kcmlmdAptYWtlc3RlcCAxLjAgMwpydGNzeW5jCmtleWZpbGUgL2V0Yy9jaHJvbnkua2V5cwpsZWFwc2VjdHogcmlnaHQvVVRDCmxvZ2RpciAvdmFyL2xvZy9jaHJvbnkK';

export const additionalClusterConfigTemplates: PolicyTemplate[] = [
  {
    id: 'cc-catalogsource-custom',
    name: 'Custom CatalogSource',
    description: 'Deploy a custom gRPC CatalogSource in openshift-marketplace.',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'catalogsource-custom',
      description: 'Deploys a custom operator catalog source',
    },
    notes: [
      'Replace PLACEHOLDER_CATALOG_NAME, PLACEHOLDER_DISPLAY_NAME, PLACEHOLDER_CATALOG_IMAGE, and PLACEHOLDER_PUBLISHER.',
    ],
    manifests: [
      {
        name: 'catalogsource',
        content: `apiVersion: operators.coreos.com/v1alpha1
kind: CatalogSource
metadata:
  name: PLACEHOLDER_CATALOG_NAME
  namespace: openshift-marketplace
spec:
  displayName: PLACEHOLDER_DISPLAY_NAME
  image: PLACEHOLDER_CATALOG_IMAGE
  publisher: PLACEHOLDER_PUBLISHER
  sourceType: grpc
  updateStrategy:
    registryPoll:
      interval: 30m`,
      },
    ],
  },
  {
    id: 'cc-idms',
    name: 'ImageDigestMirrorSet (IDMS)',
    description:
      'Configure digest-based registry mirrors with ImageDigestMirrorSet (preferred for OCP release and operator images).',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'idms',
      description: 'Ensures ImageDigestMirrorSet registry mirrors exist',
      severity: 'high',
    },
    notes: [
      'Replace PLACEHOLDER_IDMS_NAME, PLACEHOLDER_SOURCE_REGISTRY, and PLACEHOLDER_MIRROR_REGISTRY.',
      'Add more imageDigestMirrors entries for additional source/mirror pairs.',
      'Use NeverContactSource instead of AllowContactingSource for fully disconnected clusters.',
      'Add multiple IDMS manifests in one ConfigurationPolicy when they share the same compliance settings.',
    ],
    manifests: [
      {
        name: 'imagedigestmirrorset',
        content: `apiVersion: config.openshift.io/v1
kind: ImageDigestMirrorSet
metadata:
  name: PLACEHOLDER_IDMS_NAME
spec:
  imageDigestMirrors:
    - source: PLACEHOLDER_SOURCE_REGISTRY
      mirrors:
        - PLACEHOLDER_MIRROR_REGISTRY
      mirrorSourcePolicy: AllowContactingSource`,
      },
    ],
  },
  {
    id: 'cc-itms',
    name: 'ImageTagMirrorSet (ITMS)',
    description:
      'Configure tag-based registry mirrors with ImageTagMirrorSet (for images pulled by tag).',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'itms',
      description: 'Ensures ImageTagMirrorSet registry mirrors exist',
      severity: 'high',
    },
    notes: [
      'Replace PLACEHOLDER_ITMS_NAME, PLACEHOLDER_SOURCE_REGISTRY, and PLACEHOLDER_MIRROR_REGISTRY.',
      'Add more imageTagMirrors entries for additional source/mirror pairs.',
      'Prefer IDMS for digest pulls; use ITMS when workloads pull by tag.',
      'Add multiple ITMS manifests in one ConfigurationPolicy when they share the same compliance settings.',
    ],
    manifests: [
      {
        name: 'imagetagmirrorset',
        content: `apiVersion: config.openshift.io/v1
kind: ImageTagMirrorSet
metadata:
  name: PLACEHOLDER_ITMS_NAME
spec:
  imageTagMirrors:
    - source: PLACEHOLDER_SOURCE_REGISTRY
      mirrors:
        - PLACEHOLDER_MIRROR_REGISTRY
      mirrorSourcePolicy: AllowContactingSource`,
      },
    ],
  },
  {
    id: 'cc-console-link',
    name: 'ConsoleLink',
    description:
      'Add a custom link to the OpenShift web console (Help menu by default).',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'console-link',
      description: 'Ensures a ConsoleLink exists in the OpenShift console',
      severity: 'low',
    },
    notes: [
      'Replace PLACEHOLDER_LINK_NAME, PLACEHOLDER_HREF, and PLACEHOLDER_TEXT.',
      'Default location is HelpMenu; other values are ApplicationMenu, UserMenu, and NamespaceDashboard.',
      'For ApplicationMenu, add applicationMenu.section and optionally applicationMenu.imageURL.',
      'For NamespaceDashboard, add namespaceDashboard.namespace.',
    ],
    manifests: [
      {
        name: 'consolelink',
        content: `apiVersion: console.openshift.io/v1
kind: ConsoleLink
metadata:
  name: PLACEHOLDER_LINK_NAME
spec:
  href: PLACEHOLDER_HREF
  location: HelpMenu
  text: PLACEHOLDER_TEXT`,
      },
    ],
  },
  {
    id: 'cc-proxy-custom-ca',
    name: 'Proxy custom CA bundle',
    description: 'Install a custom CA bundle ConfigMap and reference it from the cluster Proxy.',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'proxy-custom-ca',
      description: 'Configures cluster proxy trusted CA from a custom bundle',
      severity: 'high',
      consolidateManifests: false,
      categories: ['CM Configuration Management', 'SC System and Communications Protection'],
      controls: ['CM-2 Baseline Configuration', 'SC-12 Cryptographic Key Establishment'],
    },
    notes: [
      'Replace PLACEHOLDER_CA_CERT_PEM with your PEM-encoded CA certificate (include BEGIN/END lines).',
    ],
    manifests: [
      {
        name: 'custom-ca-configmap',
        content: `apiVersion: v1
kind: ConfigMap
metadata:
  name: custom-ca
  namespace: openshift-config
data:
  ca-bundle.crt: |
    PLACEHOLDER_CA_CERT_PEM`,
      },
      {
        name: 'proxy-trusted-ca',
        content: `apiVersion: config.openshift.io/v1
kind: Proxy
metadata:
  name: cluster
spec:
  trustedCA:
    name: custom-ca`,
      },
    ],
  },
  {
    id: 'cc-console-custom-logo',
    name: 'Console custom logo',
    description: 'Deploy a custom console logo ConfigMap and configure the Console operator to use it.',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'console-custom-logo',
      description: 'Sets a custom logo in the OpenShift console',
      consolidateManifests: false,
    },
    notes: [
      'Replace PLACEHOLDER_BASE64_PNG with a base64-encoded PNG image.',
    ],
    manifests: [
      {
        name: 'console-logo-configmap',
        content: `apiVersion: v1
kind: ConfigMap
metadata:
  name: console-custom-logo
  namespace: openshift-config
binaryData:
  console-custom-logo.png: PLACEHOLDER_BASE64_PNG`,
      },
      {
        name: 'console-logo-config',
        content: `apiVersion: operator.openshift.io/v1
kind: Console
metadata:
  name: cluster
spec:
  customization:
    customLogoFile:
      key: console-custom-logo.png
      name: console-custom-logo`,
      },
    ],
  },
  {
    id: 'cc-kubeletconfig-master',
    name: 'KubeletConfig (master)',
    description: 'Configure kubelet eviction and image GC settings for master nodes.',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'kubeletconfig-master',
      description: 'Configures KubeletConfig for master nodes',
      severity: 'low',
    },
    manifests: [
      {
        name: 'master-kubelet-config',
        content: `apiVersion: machineconfiguration.openshift.io/v1
kind: KubeletConfig
metadata:
  name: master-kubelet-config
spec:
  machineConfigPoolSelector:
    matchLabels:
      pools.operator.machineconfiguration.openshift.io/master: ""
  kubeletConfig:
    evictionSoft:
      memory.available: "500Mi"
      nodefs.available: "10%"
      nodefs.inodesFree: "5%"
      imagefs.available: "15%"
      imagefs.inodesFree: "10%"
    evictionSoftGracePeriod:
      memory.available: "1m30s"
      nodefs.available: "1m30s"
      nodefs.inodesFree: "1m30s"
      imagefs.available: "1m30s"
      imagefs.inodesFree: "1m30s"
    evictionHard:
      memory.available: "200Mi"
      nodefs.available: "5%"
      nodefs.inodesFree: "4%"
      imagefs.available: "10%"
      imagefs.inodesFree: "5%"
    evictionPressureTransitionPeriod: "3m"
    imageMinimumGCAge: "5m"
    imageGCHighThresholdPercent: 80
    imageGCLowThresholdPercent: 75`,
      },
    ],
  },
  {
    id: 'cc-kubeletconfig-worker',
    name: 'KubeletConfig (worker)',
    description: 'Configure kubelet eviction and image GC settings for worker nodes.',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'kubeletconfig-worker',
      description: 'Configures KubeletConfig for worker nodes',
      severity: 'low',
    },
    manifests: [
      {
        name: 'worker-kubelet-config',
        content: `apiVersion: machineconfiguration.openshift.io/v1
kind: KubeletConfig
metadata:
  name: worker-kubelet-config
spec:
  machineConfigPoolSelector:
    matchLabels:
      pools.operator.machineconfiguration.openshift.io/worker: ""
  kubeletConfig:
    evictionSoft:
      memory.available: "500Mi"
      nodefs.available: "10%"
      nodefs.inodesFree: "5%"
      imagefs.available: "15%"
      imagefs.inodesFree: "10%"
    evictionSoftGracePeriod:
      memory.available: "1m30s"
      nodefs.available: "1m30s"
      nodefs.inodesFree: "1m30s"
      imagefs.available: "1m30s"
      imagefs.inodesFree: "1m30s"
    evictionHard:
      memory.available: "200Mi"
      nodefs.available: "5%"
      nodefs.inodesFree: "4%"
      imagefs.available: "10%"
      imagefs.inodesFree: "5%"
    evictionPressureTransitionPeriod: "3m"
    imageMinimumGCAge: "5m"
    imageGCHighThresholdPercent: 80
    imageGCLowThresholdPercent: 75`,
      },
    ],
  },
  {
    id: 'cc-chrony-ntp-nohub',
    name: 'Chrony NTP (custom servers)',
    description: 'Configure chrony on master and worker nodes using site-specific NTP servers.',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'chrony-ntp-custom',
      description: 'Configures chrony NTP with custom servers via MachineConfig',
      severity: 'low',
      consolidateManifests: false,
    },
    notes: [
      'Applies MachineConfigs and triggers a rolling node reboot.',
      'Replace PLACEHOLDER_NTP_SERVER_1 and PLACEHOLDER_NTP_SERVER_2 in the embedded chrony.conf before enforcing.',
      'The base64 chrony.conf decodes to: server PLACEHOLDER_NTP_SERVER_1 iburst, server PLACEHOLDER_NTP_SERVER_2 iburst, plus standard driftfile/makestep/rtcsync settings.',
    ],
    manifests: [
      {
        name: 'worker-chrony',
        content: `apiVersion: machineconfiguration.openshift.io/v1
kind: MachineConfig
metadata:
  labels:
    machineconfiguration.openshift.io/role: worker
  name: 99-worker-chrony
spec:
  config:
    ignition:
      version: 3.2.0
    storage:
      files:
        - contents:
            source: 'data:text/plain;charset=utf-8;base64,${CHRONY_PLACEHOLDER_B64}'
          mode: 0644
          overwrite: true
          path: /etc/chrony.conf`,
      },
      {
        name: 'master-chrony',
        content: `apiVersion: machineconfiguration.openshift.io/v1
kind: MachineConfig
metadata:
  labels:
    machineconfiguration.openshift.io/role: master
  name: 99-master-chrony
spec:
  config:
    ignition:
      version: 3.2.0
    storage:
      files:
        - contents:
            source: 'data:text/plain;charset=utf-8;base64,${CHRONY_PLACEHOLDER_B64}'
          mode: 0644
          overwrite: true
          path: /etc/chrony.conf`,
      },
    ],
  },
  {
    id: 'cc-oauth-openid',
    name: 'OAuth OpenID provider',
    description: 'Configure OpenID identity provider, client secret, and admin group binding.',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'oauth-openid',
      description: 'Configures OAuth OpenID identity provider and admin RBAC',
      severity: 'high',
      consolidateManifests: false,
      categories: ['CM Configuration Management', 'AC Access Control'],
      controls: ['AC-3 Access Enforcement'],
    },
    notes: [
      'Replace PLACEHOLDER_BASE64_CLIENT_SECRET with the base64-encoded OAuth client secret.',
      'Replace PLACEHOLDER_CLIENT_ID, PLACEHOLDER_ISSUER_URL, and PLACEHOLDER_ADMIN_GROUP.',
    ],
    manifests: [
      {
        name: 'oauth-client-secret',
        content: `apiVersion: v1
kind: Secret
metadata:
  name: oauth-openid-client-secret
  namespace: openshift-config
type: Opaque
data:
  clientSecret: PLACEHOLDER_BASE64_CLIENT_SECRET`,
      },
      {
        name: 'oauth-config',
        content: `apiVersion: config.openshift.io/v1
kind: OAuth
metadata:
  name: cluster
spec:
  identityProviders:
    - name: openid
      type: OpenID
      mappingMethod: claim
      openID:
        clientID: PLACEHOLDER_CLIENT_ID
        clientSecret:
          name: oauth-openid-client-secret
        issuer: PLACEHOLDER_ISSUER_URL
        claims:
          preferredUsername:
            - preferred_username
            - email
          name:
            - name
            - given_name
          email:
            - email
          groups:
            - groups
        extraScopes:
          - profile
          - email
          - groups`,
      },
      {
        name: 'admin-group-binding',
        content: `apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: oauth-openid-admin-group
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - apiGroup: rbac.authorization.k8s.io
    kind: Group
    name: PLACEHOLDER_ADMIN_GROUP`,
      },
    ],
  },
  {
    id: 'cc-dns-alerting-rule',
    name: 'DNS alerting rules',
    description: 'Deploy DNS governance AlertingRules for operator degradation and pod availability.',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'dns-alerting-rule',
      description: 'Deploys DNS operator and CoreDNS availability alerts',
      severity: 'medium',
    },
    manifests: [
      {
        name: 'dns-alerting-rules',
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
            description: "The DNS ClusterOperator has been Degraded for more than 10 minutes. CoreDNS may be failing to serve requests."
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
    id: 'cc-dns-operator-health',
    name: 'DNS operator health',
    description: 'Inform when the DNS ClusterOperator is degraded or unavailable.',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'dns-operator-health',
      description: 'Reports DNS ClusterOperator health status',
      remediationAction: 'inform',
      severity: 'critical',
    },
    manifests: [
      {
        name: 'dns-clusteroperator',
        content: `apiVersion: config.openshift.io/v1
kind: ClusterOperator
metadata:
  name: dns
status:
  conditions:
    - type: Degraded
      status: "False"
    - type: Available
      status: "True"`,
      },
    ],
  },
  {
    id: 'cc-cert-expiry-inform',
    name: 'Certificate expiry',
    description: 'Report when OpenShift platform certificates are nearing expiry.',
    category: 'cluster-config',
    defaults: {
      remediationAction: 'inform' as const,
      severity: 'low' as const,
      complianceType: 'musthave' as const,
      consolidateManifests: false,
      standards: ['NIST SP 800-53'],
      categories: ['SC System and Communications Protection'],
      controls: ['SC-12 Cryptographic Key Establishment and Management'],
      policyName: 'cert-expiry-inform',
      description: 'Monitors OpenShift certificate expiry across platform namespaces',
    },
    notes: [
      'These manifests are CertificatePolicy resources, not standard Kubernetes objects.',
      'CertificatePolicy only supports remediationAction: inform (no enforce).',
      'Verify your ACM version supports CertificatePolicy in policy-templates.',
      'After generation you may need to keep CertificatePolicy entries as native policy-templates rather than ConfigurationPolicy wrappers.',
    ],
    manifests: [
      {
        name: 'openshift-cert-policy',
        content: `apiVersion: policy.open-cluster-management.io/v1
kind: CertificatePolicy
metadata:
  name: openshift-cert-policy
spec:
  namespaceSelector:
    include:
      - openshift-service-ca-operator
      - openshift-service-ca
      - openshift-apiserver
      - openshift-apiserver-operator
      - openshift-authentication
      - openshift-authentication-operator
      - openshift-cluster-machine-approver
      - openshift-cluster-samples-operator
      - openshift-cluster-storage-operator
      - openshift-cluster-version
      - openshift-config
      - openshift-config-operator
      - openshift-console
      - openshift-console-operator
      - openshift-controller-manager
      - openshift-controller-manager-operator
      - openshift-dns
      - openshift-dns-operator
      - openshift-etcd
      - openshift-etcd-operator
      - openshift-image-registry
      - openshift-ingress-operator
      - openshift-insights
      - openshift-kube-scheduler-operator
      - openshift-kube-storage-version-migrator-operator
      - openshift-machine-api
      - openshift-machine-config-operator
      - openshift-marketplace
      - openshift-monitoring
      - openshift-multus
  remediationAction: inform
  minimumDuration: 400h
  severity: low`,
      },
      {
        name: 'openshift-cert-policy-ingress',
        content: `apiVersion: policy.open-cluster-management.io/v1
kind: CertificatePolicy
metadata:
  name: openshift-cert-policy-ingress
spec:
  namespaceSelector:
    include:
      - openshift-ingress
  remediationAction: inform
  minimumDuration: 24h
  minimumCADuration: 400h
  severity: low`,
      },
      {
        name: 'openshift-cert-policy-csr',
        content: `apiVersion: policy.open-cluster-management.io/v1
kind: CertificatePolicy
metadata:
  name: openshift-cert-policy-csr
spec:
  namespaceSelector:
    include:
      - openshift-kube-apiserver-operator
      - openshift-kube-controller-manager-operator
  remediationAction: inform
  minimumDuration: 400h
  minimumCADuration: 24h
  severity: low`,
      },
      {
        name: 'openshift-cert-policy-mgr',
        content: `apiVersion: policy.open-cluster-management.io/v1
kind: CertificatePolicy
metadata:
  name: openshift-cert-policy-mgr
spec:
  namespaceSelector:
    include:
      - openshift-config-managed
      - openshift-kube-apiserver
      - openshift-kube-scheduler
      - openshift-kube-controller-manager
  remediationAction: inform
  minimumDuration: 24h
  severity: low`,
      },
    ],
  },
  {
    id: 'cc-ingress-node-allocation',
    name: 'Ingress node allocation',
    description: 'Configure IngressController to run on infra nodes when available, otherwise workers.',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'ingress-default',
      description: 'Configures IngressController to run on infrastructure nodes when available',
      severity: 'low',
    },
    manifests: [
      {
        name: 'ingress-node-allocation-raw',
        content: `object-templates-raw: |
  {{- $nodeSelector := "node-role.kubernetes.io/worker" }}
  {{- $nodeTolerations := mustFromJson "[]" }}
  {{- if (hasNodesWithExactRoles "infra") }}
    {{- $nodeSelector = "node-role.kubernetes.io/infra" }}
    {{- $nodeTolerations = mustFromJson "[{\\"operator\\":\\"Exists\\",\\"key\\":\\"node-role.kubernetes.io/infra\\"}]" }}
  {{- end }}
  - complianceType: musthave
    objectDefinition:
      apiVersion: operator.openshift.io/v1
      kind: IngressController
      metadata:
        name: default
        namespace: openshift-ingress-operator
      spec:
        httpEmptyRequestsPolicy: Respond
        nodePlacement:
          nodeSelector:
            matchLabels:
              {{ $nodeSelector }}: ""
          tolerations: '{{ $nodeTolerations | toRawJson | toLiteral }}'
        replicas: {{ (ge (len (getNodesWithExactRoles "infra").items) 3 | ternary 3 (len (getNodesWithExactRoles "infra").items) | default 3) | toInt }}`,
      },
    ],
  },
  {
    id: 'cc-cluster-monitoring-config',
    name: 'Cluster monitoring config',
    description: 'Configure cluster monitoring with infra node placement, storage, and ACM observability integration.',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'cluster-monitoring-config',
      description: 'Configures cluster monitoring with infra node placement and persistent storage',
      severity: 'low',
    },
    manifests: [
      {
        name: 'cluster-monitoring-config-raw',
        content: `object-templates-raw: |
  {{- $defaultSC := "" }}
  {{- range $sc := (lookup "storage.k8s.io/v1" "StorageClass" "" "").items }}
    {{- if eq (dig "annotations" "storageclass.kubernetes.io/is-default-class" "false" $sc.metadata) "true" }}
      {{- $defaultSC = $sc.metadata.name }}
      {{- break }}
    {{- end }}
  {{- end }}
  {{- $obsNS := (eq (fromClusterClaim "name") "local-cluster" | ternary "open-cluster-management-observability" "open-cluster-management-addon-observability") }}
  {{- $obsHubInfoSecret := (lookup "v1" "Secret" $obsNS "hub-info-secret") }}
  {{- $amURL := "" }}
  {{- $hubClusterID := "" }}
  {{- $clusterID := "" }}
  {{- $clusterIDClaim := (lookup "cluster.open-cluster-management.io/v1alpha1" "ClusterClaim" "" "id.openshift.io") }}
  {{- if not (empty $obsHubInfoSecret) }}
    {{- $hubInfo := (index $obsHubInfoSecret.data "hub-info.yaml") | base64dec }}
    {{- range $v := (split "\\n" $hubInfo) }}
      {{- if (contains "alertmanager-endpoint" $v) }}
        {{- $amURL = (split " " $v)._1 }}
      {{- end }}
      {{- if (contains "hub-cluster-id" $v) }}
        {{- $hubClusterID = (split " " $v)._1 }}
      {{- end }}
    {{- end }}
  {{- end }}
  {{- if not (empty $clusterIDClaim) }}
    {{- $clusterID = $clusterIDClaim.spec.value }}
  {{- end }}
  - complianceType: musthave
    recordDiff: InStatus
    objectDefinition:
      apiVersion: v1
      kind: ConfigMap
      metadata:
        name: cluster-monitoring-config
        namespace: openshift-monitoring
      data:
        config.yaml: |
          alertmanagerMain:
            nodeSelector:
              node-role.kubernetes.io/{{ hasNodesWithExactRoles "infra" | ternary "infra" "worker" }}: ""
            tolerations:
            - key: node-role.kubernetes.io/infra
              operator: Exists
            volumeClaimTemplate:
              spec:
                resources:
                  requests:
                    storage: 10Gi
                storageClassName: {{ $defaultSC }}
          enableUserWorkload: true
          kubeStateMetrics:
            nodeSelector:
              node-role.kubernetes.io/{{ hasNodesWithExactRoles "infra" | ternary "infra" "worker" }}: ""
            tolerations:
            - key: node-role.kubernetes.io/infra
              operator: Exists
          metricsServer:
            nodeSelector:
              node-role.kubernetes.io/{{ hasNodesWithExactRoles "infra" | ternary "infra" "worker" }}: ""
            tolerations:
            - key: node-role.kubernetes.io/infra
              operator: Exists
          monitoringPlugin:
            nodeSelector:
              node-role.kubernetes.io/{{ hasNodesWithExactRoles "infra" | ternary "infra" "worker" }}: ""
            tolerations:
            - key: node-role.kubernetes.io/infra
              operator: Exists
          nodeExporter:
            collectors:
              buddyinfo: {}
              cpufreq: {}
              ksmd: {}
              mountstats: {}
              netclass: {}
              netdev: {}
              processes: {}
              systemd: {}
              tcpstat: {}
          openshiftStateMetrics:
            nodeSelector:
              node-role.kubernetes.io/{{ hasNodesWithExactRoles "infra" | ternary "infra" "worker" }}: ""
            tolerations:
            - key: node-role.kubernetes.io/infra
              operator: Exists
          prometheusK8s:
  {{- if not (empty $clusterID) }}
            externalLabels:
              managed_cluster: {{ $clusterID }}
  {{- end }}
  {{- if and (not (empty $amURL)) (not (empty $hubClusterID)) }}
            additionalAlertmanagerConfigs:
            - apiVersion: v2
              bearerToken:
                key: token
                name: observability-alertmanager-accessor-{{ $hubClusterID }}
              scheme: https
              staticConfigs:
              - {{ trimAll "https://" $amURL }}
              tlsConfig:
                ca:
                  key: service-ca.crt
                  name: hub-alertmanager-router-ca-{{ $hubClusterID }}
                insecureSkipVerify: false
  {{- end }}
            nodeSelector:
              node-role.kubernetes.io/{{ hasNodesWithExactRoles "infra" | ternary "infra" "worker" }}: ""
            tolerations:
            - key: node-role.kubernetes.io/infra
              operator: Exists
            retention: 7d
            retentionSize: 90GB
            volumeClaimTemplate:
              spec:
                resources:
                  requests:
                    storage: 100Gi
                storageClassName: {{ $defaultSC }}
          prometheusOperator:
            nodeSelector:
              node-role.kubernetes.io/{{ hasNodesWithExactRoles "infra" | ternary "infra" "worker" }}: ""
            tolerations:
            - key: node-role.kubernetes.io/infra
              operator: Exists
          telemeterClient:
            nodeSelector:
              node-role.kubernetes.io/{{ hasNodesWithExactRoles "infra" | ternary "infra" "worker" }}: ""
            tolerations:
            - key: node-role.kubernetes.io/infra
              operator: Exists
          thanosQuerier:
            nodeSelector:
              node-role.kubernetes.io/{{ hasNodesWithExactRoles "infra" | ternary "infra" "worker" }}: ""
            tolerations:
            - key: node-role.kubernetes.io/infra
              operator: Exists`,
      },
    ],
  },
  {
    id: 'cc-user-workload-monitoring-config',
    name: 'User workload monitoring config',
    description: 'Configure user workload monitoring with infra node placement, retention, remote write, and ACM observability.',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'user-workload-monitoring-config',
      description: 'Configures user workload monitoring with persistent storage and telemetry remote write',
      severity: 'low',
    },
    manifests: [
      {
        name: 'user-workload-monitoring-config-raw',
        content: `object-templates-raw: |
  {{- $defaultSC := "" }}
  {{- range $sc := (lookup "storage.k8s.io/v1" "StorageClass" "" "").items }}
    {{- if eq (dig "annotations" "storageclass.kubernetes.io/is-default-class" "false" $sc.metadata) "true" }}
      {{- $defaultSC = $sc.metadata.name }}
      {{- break }}
    {{- end }}
  {{- end }}
  {{- $clusterName := "" }}
  {{- $clusterID := "" }}
  {{- $product := "" }}
  {{- $clusterNameClaim := (lookup "cluster.open-cluster-management.io/v1alpha1" "ClusterClaim" "" "name") }}
  {{- $clusterIDClaim := (lookup "cluster.open-cluster-management.io/v1alpha1" "ClusterClaim" "" "id.openshift.io") }}
  {{- $productClaim := (lookup "cluster.open-cluster-management.io/v1alpha1" "ClusterClaim" "" "product.open-cluster-management.io") }}
  {{- if not (empty $clusterNameClaim) }}
    {{- $clusterName = $clusterNameClaim.spec.value }}
  {{- end }}
  {{- if not (empty $clusterIDClaim) }}
    {{- $clusterID = $clusterIDClaim.spec.value }}
  {{- end }}
  {{- if not (empty $productClaim) }}
    {{- $product = $productClaim.spec.value }}
  {{- end }}
  {{- $obsNS := (eq $clusterName "local-cluster" | ternary "open-cluster-management-observability" "open-cluster-management-addon-observability") }}
  {{- $obsHubInfoSecret := (lookup "v1" "Secret" $obsNS "hub-info-secret") }}
  {{- $amURL := "" }}
  {{- $hubClusterID := "" }}
  {{- $amTokenSecretName := "" }}
  {{- $amCASecretName := "" }}
  {{- if not (empty $obsHubInfoSecret) }}
    {{- $hubInfo := (index $obsHubInfoSecret.data "hub-info.yaml") | base64dec }}
    {{- range $v := (split "\\n" $hubInfo) }}
      {{- if (contains "alertmanager-endpoint" $v) }}
        {{- $amURL = (split " " $v)._1 }}
      {{- end }}
      {{- if (contains "hub-cluster-id" $v) }}
        {{- $hubClusterID = (split " " $v)._1 }}
      {{- end }}
    {{- end }}
  {{- end }}
  {{- if not (empty $hubClusterID) }}
    {{- $amTokenSecretName = printf "observability-alertmanager-accessor-%s" $hubClusterID }}
    {{- $amCASecretName = printf "hub-alertmanager-router-ca-%s" $hubClusterID }}
  {{- end }}
  - complianceType: musthave
    recordDiff: InStatus
    objectDefinition:
      apiVersion: v1
      kind: ConfigMap
      metadata:
        name: user-workload-monitoring-config
        namespace: openshift-user-workload-monitoring
      data:
        config.yaml: |
          prometheus:
            externalLabels:
              instance_name: {{ $n := split "." (lookup "config.openshift.io/v1" "Infrastructure" "" "cluster").status.apiServerURL }}{{ $n._1 }}
  {{- if not (empty $clusterID) }}
              managed_cluster: {{ $clusterID }}
  {{- end }}
  {{- if not (empty $product) }}
              product: {{ $product }}
  {{- end }}
            nodeSelector:
              node-role.kubernetes.io/{{ hasNodesWithExactRoles "infra" | ternary "infra" "worker" }}: ""
  {{- if and (not (empty $amURL)) (not (empty $hubClusterID)) }}
            additionalAlertmanagerConfigs:
            - apiVersion: v2
              bearerToken:
                key: token
                name: {{ $amTokenSecretName }}
              pathPrefix: /
              scheme: https
              staticConfigs:
              - {{ trimAll "https://" $amURL }}
              tlsConfig:
                ca:
                  key: service-ca.crt
                  name: {{ $amCASecretName }}
                insecureSkipVerify: false
  {{- end }}
            remoteWrite:
            - authorization:
                credentials:
                  key: token
                  name: telemetry-remote-write
                type: Bearer
              metadataConfig:
                send: false
              queueConfig:
                batchSendDeadline: 1m
                capacity: 30000
                maxBackoff: 256s
                maxSamplesPerSend: 10000
                minBackoff: 1s
              url: https://infogw.api.openshift.com/metrics/v1/receive
              writeRelabelConfigs:
              - action: keep
                regex: .+
                sourceLabels:
                - _id
              - action: keep
                regex: (count:up0|count:up1|cluster_version|cluster_version_available_updates|cluster_version_capability|cluster_operator_up|cluster_operator_conditions|cluster_version_payload|cluster_installer|cluster_infrastructure_provider|cluster_feature_set|instance:etcd_object_counts:sum|ALERTS|code:apiserver_request_total:rate:sum|cluster:capacity_cpu_cores:sum|cluster:capacity_memory_bytes:sum|cluster:cpu_usage_cores:sum|cluster:memory_usage_bytes:sum|openshift:cpu_usage_cores:sum|openshift:memory_usage_bytes:sum|workload:cpu_usage_cores:sum|workload:memory_usage_bytes:sum|cluster:virt_platform_nodes:sum|cluster:node_instance_type_count:sum|cnv:vmi_status_running:count|cnv_abnormal|cluster:vmi_request_cpu_cores:sum|node_role_os_version_machine:cpu_capacity_cores:sum|node_role_os_version_machine:cpu_capacity_sockets:sum|subscription_sync_total|olm_resolution_duration_seconds|csv_succeeded|csv_abnormal|cluster:kube_persistentvolumeclaim_resource_requests_storage_bytes:provisioner:sum|cluster:kubelet_volume_stats_used_bytes:provisioner:sum|ceph_cluster_total_bytes|ceph_cluster_total_used_raw_bytes|ceph_health_status|odf_system_raw_capacity_total_bytes|odf_system_raw_capacity_used_bytes|odf_system_health_status|job:ceph_osd_metadata:count|job:kube_pv:count|job:odf_system_pvs:count|job:ceph_pools_iops:total|job:ceph_pools_iops_bytes:total|job:ceph_versions_running:count|job:noobaa_total_unhealthy_buckets:sum|job:noobaa_bucket_count:sum|job:noobaa_total_object_count:sum|odf_system_bucket_count|odf_system_objects_total|noobaa_accounts_num|noobaa_total_usage|console_url|cluster:console_auth_login_requests_total:sum|cluster:console_auth_login_successes_total:sum|cluster:console_auth_login_failures_total:sum|cluster:console_auth_logout_requests_total:sum|cluster:console_usage_users:max|cluster:console_plugins_info:max|cluster:console_customization_perspectives_info:max|cluster:ovnkube_controller_egress_routing_via_host:max|cluster:ovnkube_controller_admin_network_policies_db_objects:max|cluster:ovnkube_controller_baseline_admin_network_policies_db_objects:max|cluster:ovnkube_controller_admin_network_policies_rules:max|cluster:ovnkube_controller_baseline_admin_network_policies_rules:max|cluster:network_attachment_definition_instances:max|cluster:network_attachment_definition_enabled_instance_up:max|cluster:ingress_controller_aws_nlb_active:sum|cluster:route_metrics_controller_routes_per_shard:min|cluster:route_metrics_controller_routes_per_shard:max|cluster:route_metrics_controller_routes_per_shard:avg|cluster:route_metrics_controller_routes_per_shard:median|cluster:openshift_route_info:tls_termination:sum|openshift:gateway_api_usage:count|insightsclient_request_send_total|cam_app_workload_migrations|cluster:apiserver_current_inflight_requests:sum:max_over_time:2m|cluster:alertmanager_integrations:max|cluster:telemetry_selected_series:count|openshift:prometheus_tsdb_head_series:sum|openshift:prometheus_tsdb_head_samples_appended_total:sum|monitoring:container_memory_working_set_bytes:sum|namespace_job:scrape_series_added:topk3_sum1h|namespace_job:scrape_samples_post_metric_relabeling:topk3|monitoring:haproxy_server_http_responses_total:sum|profile:cluster_monitoring_operator_collection_profile:max|vendor_model:node_accelerator_cards:sum|rhmi_status|status:upgrading:version:rhoam_state:max|state:rhoam_critical_alerts:max|state:rhoam_warning_alerts:max|rhoam_7d_slo_percentile:max|rhoam_7d_slo_remaining_error_budget:max|cluster_legacy_scheduler_policy|cluster_master_schedulable|che_workspace_status|che_workspace_started_total|che_workspace_failure_total|che_workspace_start_time_seconds_sum|che_workspace_start_time_seconds_count|cco_credentials_mode|cluster:kube_persistentvolume_plugin_type_counts:sum|acm_managed_cluster_info|acm_managed_cluster_worker_cores:max|acm_console_page_count:sum|cluster:vsphere_vcenter_info:sum|cluster:vsphere_esxi_version_total:sum|cluster:vsphere_node_hw_version_total:sum|openshift:build_by_strategy:sum|rhods_aggregate_availability|rhods_total_users|instance:etcd_disk_wal_fsync_duration_seconds:histogram_quantile|instance:etcd_mvcc_db_total_size_in_bytes:sum|instance:etcd_network_peer_round_trip_time_seconds:histogram_quantile|instance:etcd_mvcc_db_total_size_in_use_in_bytes:sum|instance:etcd_disk_backend_commit_duration_seconds:histogram_quantile|jaeger_operator_instances_storage_types|jaeger_operator_instances_strategies|jaeger_operator_instances_agent_strategies|type:tempo_operator_tempostack_storage_backend:sum|state:tempo_operator_tempostack_managed:sum|type:tempo_operator_tempostack_multi_tenancy:sum|enabled:tempo_operator_tempostack_jaeger_ui:sum|type:opentelemetry_collector_receivers:sum|type:opentelemetry_collector_exporters:sum|type:opentelemetry_collector_processors:sum|type:opentelemetry_collector_extensions:sum|type:opentelemetry_collector_connectors:sum|type:opentelemetry_collector_info:sum|appsvcs:cores_by_product:sum|nto_custom_profiles:count|openshift_csi_share_configmap|openshift_csi_share_secret|openshift_csi_share_mount_failures_total|openshift_csi_share_mount_requests_total|eo_es_storage_info|eo_es_redundancy_policy_info|eo_es_defined_delete_namespaces_total|eo_es_misconfigured_memory_resources_info|cluster:eo_es_data_nodes_total:max|cluster:eo_es_documents_created_total:sum|cluster:eo_es_documents_deleted_total:sum|pod:eo_es_shards_total:max|eo_es_cluster_management_state_info|imageregistry:imagestreamtags_count:sum|imageregistry:operations_count:sum|log_logging_info|log_collector_error_count_total|log_forwarder_pipeline_info|log_forwarder_input_info|log_forwarder_output_info|cluster:log_collected_bytes_total:sum|cluster:log_logged_bytes_total:sum|openshift_logging:log_forwarder_pipelines:sum|openshift_logging:log_forwarders:sum|openshift_logging:log_forwarder_input_type:sum|openshift_logging:log_forwarder_output_type:sum|openshift_logging:vector_component_received_bytes_total:rate5m|cluster:kata_monitor_running_shim_count:sum|platform:hypershift_hostedclusters:max|platform:hypershift_nodepools:max|cluster_name:hypershift_nodepools_size:sum|cluster_name:hypershift_nodepools_available_replicas:sum|namespace:noobaa_unhealthy_bucket_claims:max|namespace:noobaa_buckets_claims:max|namespace:noobaa_unhealthy_namespace_resources:max|namespace:noobaa_namespace_resources:max|namespace:noobaa_unhealthy_namespace_buckets:max|namespace:noobaa_namespace_buckets:max|namespace:noobaa_accounts:max|namespace:noobaa_usage:max|namespace:noobaa_system_health_status:max|ocs_advanced_feature_usage|os_image_url_override:sum|cluster:mcd_nodes_with_unsupported_packages:count|cluster:mcd_total_unsupported_packages:sum|cluster:vsphere_topology_tags:max|cluster:vsphere_infrastructure_failure_domains:max|apiserver_list_watch_request_success_total:rate:sum|rhacs:telemetry:rox_central_info|rhacs:telemetry:rox_central_secured_clusters|rhacs:telemetry:rox_central_secured_nodes|rhacs:telemetry:rox_central_secured_vcpus|rhacs:telemetry:rox_sensor_info|cluster:volume_manager_selinux_pod_context_mismatch_total|cluster:volume_manager_selinux_volume_context_mismatch_warnings_total|cluster:volume_manager_selinux_volume_context_mismatch_errors_total|cluster:volume_manager_selinux_volumes_admitted_total|ols:provider_model_configuration|ols:rest_api_query_calls_total:2xx|ols:rest_api_query_calls_total:4xx|ols:rest_api_query_calls_total:5xx|openshift:openshift_network_operator_ipsec_state:info|cluster:health:group_severity:count|cluster:controlplane_topology:info|cluster:infrastructure_topology:info|cluster:selinux_warning_controller_selinux_volume_conflict:count|cluster:mtv_migrations_status_total:sum)
                sourceLabels:
                - __name__
            retention: 7d
            retentionSize: 90GB
            tolerations:
            - key: node-role.kubernetes.io/infra
              operator: Exists
            volumeClaimTemplate:
              spec:
                resources:
                  requests:
                    storage: 100Gi
                storageClassName: {{ $defaultSC }}
          prometheusOperator:
            nodeSelector:
              node-role.kubernetes.io/{{ hasNodesWithExactRoles "infra" | ternary "infra" "worker" }}: ""
            tolerations:
            - key: node-role.kubernetes.io/infra
              operator: Exists
          thanosRuler:
            nodeSelector:
              node-role.kubernetes.io/{{ hasNodesWithExactRoles "infra" | ternary "infra" "worker" }}: ""
            retention: 7d
            tolerations:
            - key: node-role.kubernetes.io/infra
              operator: Exists
            volumeClaimTemplate:
              spec:
                resources:
                  requests:
                    storage: 50Gi
                storageClassName: {{ $defaultSC }}
  {{- if and (not (empty $amTokenSecretName)) (not (empty $amCASecretName)) }}
  - complianceType: mustonlyhave
    objectDefinition:
      apiVersion: v1
      kind: Secret
      metadata:
        name: {{ $amCASecretName }}
        namespace: openshift-user-workload-monitoring
      data: '{{ copySecretData "openshift-monitoring" $amCASecretName }}'
  - complianceType: mustonlyhave
    objectDefinition:
      apiVersion: v1
      kind: Secret
      metadata:
        name: {{ $amTokenSecretName }}
        namespace: openshift-user-workload-monitoring
      data: '{{ copySecretData "openshift-monitoring" $amTokenSecretName }}'
  {{- end }}`,
      },
    ],
  },
];
