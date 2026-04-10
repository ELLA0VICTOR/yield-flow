import { useCallback, useEffect, useState } from 'react';
import { fetchChains, fetchProtocols, fetchVaults, fetchWalletChains } from '../lib/lifi';

export function useVaultExplorer(filters) {
  const [chains, setChains] = useState([]);
  const [walletChains, setWalletChains] = useState([]);
  const [protocols, setProtocols] = useState([]);
  const [vaults, setVaults] = useState([]);
  const [total, setTotal] = useState(0);
  const [isReferenceLoading, setIsReferenceLoading] = useState(true);
  const [isVaultLoading, setIsVaultLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReferenceData = useCallback(async () => {
    setIsReferenceLoading(true);

    try {
      const [chainsResult, protocolsResult, walletChainsResult] = await Promise.all([
        fetchChains(),
        fetchProtocols(),
        fetchWalletChains(),
      ]);

      setChains(chainsResult);
      setProtocols(protocolsResult);
      setWalletChains(walletChainsResult);
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
      const mergedVaults = [];
      const seenKeys = new Set();
      let cursor = '';
      let resolvedTotal = 0;

      do {
        const result = await fetchVaults({
          ...filters,
          cursor,
        });

        const incomingVaults = result?.data || [];
        resolvedTotal = result?.total || resolvedTotal;

        incomingVaults.forEach((vault) => {
          const key = `${vault.chainId}-${vault.address.toLowerCase()}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            mergedVaults.push(vault);
          }
        });

        cursor = result?.nextCursor || '';
      } while (cursor);

      setVaults(mergedVaults);
      setTotal(resolvedTotal || mergedVaults.length);
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
    walletChains,
    protocols,
    vaults,
    total,
    isReferenceLoading,
    isVaultLoading,
    error,
    reloadVaults: loadVaults,
  };
}
