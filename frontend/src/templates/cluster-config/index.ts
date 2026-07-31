import type { PolicyTemplate } from '../types';
import { additionalClusterConfigTemplates } from './additional';
import { etcdBackupManifests } from '../manifests/etcd-backup.content';

const CC_DEFAULTS = {
  remediationAction: 'enforce' as const,
  severity: 'medium' as const,
  complianceType: 'musthave' as const,
  consolidateManifests: true,
  standards: ['NIST SP 800-53'],
  categories: ['CM Configuration Management'],
  controls: ['CM-2 Baseline Configuration'],
};

export const clusterConfigTemplates: PolicyTemplate[] = [
  {
    id: 'cc-remove-kubeadmin',
    name: 'Remove kubeadmin',
    description: 'Ensure the kubeadmin secret is removed after an identity provider is configured.',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'remove-kubeadmin',
      description: 'Removes the kube-system/kubeadmin secret',
      complianceType: 'mustnothave',
      severity: 'high',
    },
    notes: ['Ensure a working identity provider before enforcing, or you may lock yourself out.'],
    manifests: [
      {
        name: 'kubeadmin',
        content: `apiVersion: v1
kind: Secret
metadata:
  name: kubeadmin
  namespace: kube-system`,
      },
    ],
  },
  {
    id: 'cc-disable-self-provisioner',
    name: 'Disable self-provisioner',
    description: 'Prevent authenticated users from creating projects by emptying self-provisioners subjects.',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'disable-self-provisioner',
      description: 'Disables the self-provisioner ClusterRoleBinding',
      complianceType: 'mustonlyhave',
      severity: 'high',
      categories: ['AC Access Control'],
      controls: ['AC-6 Least Privilege'],
    },
    manifests: [
      {
        name: 'self-provisioner',
        content: `apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: self-provisioners
  annotations:
    rbac.authorization.kubernetes.io/autoupdate: "false"
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: self-provisioner
subjects: []`,
      },
    ],
  },
  {
    id: 'cc-etcd-encryption',
    name: 'etcd encryption',
    description: 'Enable aescbc encryption on the cluster APIServer.',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'etcd-encryption',
      description: 'Enables etcd encryption (aescbc)',
      severity: 'high',
      categories: ['SC System and Communications Protection'],
      controls: ['SC-28 Protection of Information at Rest'],
    },
    notes: ['Encryption rollout can take a long time while secrets are re-encrypted.'],
    manifests: [
      {
        name: 'apiserver',
        content: `apiVersion: config.openshift.io/v1
kind: APIServer
metadata:
  name: cluster
spec:
  encryption:
    type: aescbc`,
      },
    ],
  },
  {
    id: 'cc-etcd-backup',
    name: 'etcd backup CronJob',
    description:
      'Deploy a daily etcd backup CronJob, PVC, RBAC, and Prometheus alerts on OpenShift clusters.',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'config-etcd-backup',
      description: 'Distributes etcd backup CronJob and monitoring to managed OpenShift clusters',
      severity: 'low',
      categories: ['CM Configuration Management'],
      controls: ['CM-2 Baseline Configuration'],
    },
    notes: [
      'Intended for quorum recovery and forensics, not full platform disaster recovery.',
      'Requires a StorageClass that can bind ReadWriteOnce PVCs on control-plane nodes.',
      'Review schedule, PVC size, retention, and the backup image before enforcing.',
    ],
    manifests: [{ name: 'etcd-backup', content: etcdBackupManifests }],
  },
  {
    id: 'cc-masters-not-schedulable',
    name: 'Masters not schedulable',
    description: 'Set Scheduler mastersSchedulable to false so workloads stay off control-plane nodes.',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'masters-not-schedulable',
      description: 'Keeps control-plane nodes unschedulable for regular workloads',
      severity: 'low',
      remediationAction: 'inform',
    },
    manifests: [
      {
        name: 'scheduler',
        content: `apiVersion: config.openshift.io/v1
kind: Scheduler
metadata:
  name: cluster
spec:
  mastersSchedulable: false`,
      },
    ],
  },
  {
    id: 'cc-cluster-banner',
    name: 'Console cluster banner',
    description: 'Show a top console banner with the managed cluster name.',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'cluster-banner',
      description: 'Displays cluster name in the OpenShift console banner',
      severity: 'low',
    },
    manifests: [
      {
        name: 'cluster-banner',
        content: `apiVersion: console.openshift.io/v1
kind: ConsoleNotification
metadata:
  name: cluster-banner
spec:
  backgroundColor: '#ffcc00'
  color: '#fff'
  location: BannerTop
  text: '{{ fromClusterClaim "name" }}'`,
      },
    ],
  },
  {
    id: 'cc-namespaces-terminating',
    name: 'No terminating namespaces',
    description: 'Inform when any Namespace is stuck in Terminating phase.',
    category: 'cluster-config',
    defaults: {
      ...CC_DEFAULTS,
      policyName: 'namespaces-terminating',
      description: 'Reports namespaces stuck in Terminating',
      complianceType: 'mustnothave',
      remediationAction: 'inform',
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
  ...additionalClusterConfigTemplates,
];
