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
    id: 'cc-cluster-monitoring-config',
    name: 'Cluster monitoring config',
    description: 'Deploy a simplified cluster-monitoring-config ConfigMap with infra node placement.',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'cluster-monitoring-config',
      description: 'Configures cluster monitoring stack placement and storage',
      severity: 'low',
    },
    notes: [
      'Replace PLACEHOLDER_STORAGE_CLASS with your StorageClass name.',
      'Set PLACEHOLDER_NODE_ROLE to infra or worker depending on where monitoring pods should run.',
    ],
    manifests: [
      {
        name: 'cluster-monitoring-config',
        content: `apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-monitoring-config
  namespace: openshift-monitoring
data:
  config.yaml: |
    enableUserWorkload: true
    prometheusK8s:
      retention: 7d
      retentionSize: 90GB
      nodeSelector:
        node-role.kubernetes.io/PLACEHOLDER_NODE_ROLE: ""
      tolerations:
        - key: node-role.kubernetes.io/infra
          operator: Exists
      volumeClaimTemplate:
        spec:
          storageClassName: PLACEHOLDER_STORAGE_CLASS
          resources:
            requests:
              storage: 100Gi
    alertmanagerMain:
      nodeSelector:
        node-role.kubernetes.io/PLACEHOLDER_NODE_ROLE: ""
      tolerations:
        - key: node-role.kubernetes.io/infra
          operator: Exists
      volumeClaimTemplate:
        spec:
          storageClassName: PLACEHOLDER_STORAGE_CLASS
          resources:
            requests:
              storage: 10Gi`,
      },
    ],
  },
  {
    id: 'cc-user-workload-monitoring-config',
    name: 'User workload monitoring config',
    description: 'Deploy a simplified user-workload-monitoring-config ConfigMap.',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'user-workload-monitoring-config',
      description: 'Configures user workload monitoring stack placement and storage',
      severity: 'low',
    },
    notes: [
      'Replace PLACEHOLDER_STORAGE_CLASS with your StorageClass name.',
      'Set PLACEHOLDER_NODE_ROLE to infra or worker depending on where monitoring pods should run.',
    ],
    manifests: [
      {
        name: 'user-workload-monitoring-config',
        content: `apiVersion: v1
kind: ConfigMap
metadata:
  name: user-workload-monitoring-config
  namespace: openshift-user-workload-monitoring
data:
  config.yaml: |
    prometheus:
      retention: 7d
      retentionSize: 90GB
      nodeSelector:
        node-role.kubernetes.io/PLACEHOLDER_NODE_ROLE: ""
      tolerations:
        - key: node-role.kubernetes.io/infra
          operator: Exists
      volumeClaimTemplate:
        spec:
          storageClassName: PLACEHOLDER_STORAGE_CLASS
          resources:
            requests:
              storage: 100Gi
    prometheusOperator:
      nodeSelector:
        node-role.kubernetes.io/PLACEHOLDER_NODE_ROLE: ""
      tolerations:
        - key: node-role.kubernetes.io/infra
          operator: Exists
    thanosRuler:
      retention: 7d
      nodeSelector:
        node-role.kubernetes.io/PLACEHOLDER_NODE_ROLE: ""
      tolerations:
        - key: node-role.kubernetes.io/infra
          operator: Exists
      volumeClaimTemplate:
        spec:
          storageClassName: PLACEHOLDER_STORAGE_CLASS
          resources:
            requests:
              storage: 50Gi`,
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
    id: 'cc-ingress-default',
    name: 'IngressController default placement',
    description: 'Configure the default IngressController to run on infra or worker nodes.',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'ingress-default',
      description: 'Configures default IngressController node placement',
      severity: 'low',
    },
    notes: [
      'Set PLACEHOLDER_NODE_SELECTOR_ROLE to infra or worker.',
      'Adjust replicas if your cluster has fewer than three infra nodes.',
    ],
    manifests: [
      {
        name: 'ingress-default',
        content: `apiVersion: operator.openshift.io/v1
kind: IngressController
metadata:
  name: default
  namespace: openshift-ingress-operator
spec:
  httpEmptyRequestsPolicy: Respond
  nodePlacement:
    nodeSelector:
      matchLabels:
        node-role.kubernetes.io/PLACEHOLDER_NODE_SELECTOR_ROLE: ""
    tolerations:
      - key: node-role.kubernetes.io/infra
        operator: Exists
  replicas: 3`,
      },
    ],
  },
  {
    id: 'cc-cert-expiry-inform',
    name: 'Certificate expiry (inform)',
    description: 'Inform when OpenShift platform certificates are nearing expiry.',
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
];
