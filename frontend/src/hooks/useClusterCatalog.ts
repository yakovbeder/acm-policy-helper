import { useEffect, useState } from 'react';
import {
  fetchClusterLabels,
  fetchClusterSets,
  type ClusterLabelCatalog,
} from '../services/api';

interface ClusterCatalog {
  clusterSets: string[];
  labels: ClusterLabelCatalog;
  loading: boolean;
  error: string | null;
}

const emptyLabels: ClusterLabelCatalog = { keys: [], valuesByKey: {} };

export function useClusterCatalog(): ClusterCatalog {
  const [clusterSets, setClusterSets] = useState<string[]>([]);
  const [labels, setLabels] = useState<ClusterLabelCatalog>(emptyLabels);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sets, labelCatalog] = await Promise.all([
          fetchClusterSets(),
          fetchClusterLabels(),
        ]);
        if (!cancelled) {
          setClusterSets(sets);
          setLabels(labelCatalog);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setClusterSets([]);
          setLabels(emptyLabels);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { clusterSets, labels, loading, error };
}
