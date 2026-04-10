import { useCallback, useEffect, useState } from 'react';
import { fetchChains, fetchProtocols, fetchVaults } from '../lib/lifi';

export function useVaultExplorer(filters) {
  const [chains, setChains] = useState([]);
  const [protocols, setProtocols] = useState([]);
  const [vaults, setVaults] = useState([]);
  const [total, setTotal] = useState(0);
  const [isReferenceLoading, setIsReferenceLoading] = useState(true);
  const [isVaultLoading, setIsVaultLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReferenceData = useCallback(async () => {
    setIsReferenceLoading(true);

    try {
      const [chainsResult, protocolsResult] = await Promise.all([
        fetchChains(),
        fetchProtocols(),
      ]);

      setChains(chainsResult);
      setProtocols(protocolsResult);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load LI.FI reference data');
    } finally {
      setIsReferenceLoading(false);
    }
  }, []);

  const loadVaults = useCallback(async () => {
    setIsVaultLoading(true);
    setError('');

    try {
      const result = await fetchVaults(filters);
      setVaults(result.data || []);
      setTotal(result.total || 0);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load vaults');
      setVaults([]);
      setTotal(0);
    } finally {
      setIsVaultLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    loadVaults();
  }, [loadVaults]);

  return {
    chains,
    protocols,
    vaults,
    total,
    isReferenceLoading,
    isVaultLoading,
    error,
    reloadVaults: loadVaults,
  };
}
