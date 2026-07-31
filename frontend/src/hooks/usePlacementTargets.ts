import { useEffect, useState } from 'react';
import { fetchPlacementTargets, type PlacementTargets } from '../services/api';

interface PlacementTargetsState {
  targets: PlacementTargets | null;
  loading: boolean;
  error: string | null;
}

export function usePlacementTargets(namespace: string): PlacementTargetsState {
  const [targets, setTargets] = useState<PlacementTargets | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ns = namespace.trim();
    if (!ns) {
      setTargets(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const next = await fetchPlacementTargets(ns);
        if (!cancelled) {
          setTargets(next);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setTargets(null);
          setError(err instanceof Error ? err.message : String(err));
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
  }, [namespace]);

  return { targets, loading, error };
}
