import { useCallback, useState } from 'react';
import { fetchPortfolioPositions } from '../lib/lifi';

export function usePortfolioLookup() {
  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const lookup = useCallback(async (address) => {
    setIsLoading(true);
    setError('');

    try {
      const result = await fetchPortfolioPositions(address);
      setPositions(result.positions || []);
    } catch (lookupError) {
      setError(lookupError.message || 'Unable to fetch portfolio positions');
      setPositions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    positions,
    isLoading,
    error,
    lookup,
  };
}
