import { useCallback, useState } from 'react';
import { fetchComposerQuote } from '../lib/lifi';

export function useComposerQuote() {
  const [quote, setQuote] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const requestQuote = useCallback(async (params) => {
    setIsLoading(true);
    setError('');

    try {
      const nextQuote = await fetchComposerQuote(params);
      setQuote(nextQuote);
      return nextQuote;
    } catch (quoteError) {
      setError(quoteError.message || 'Unable to fetch Composer quote');
      setQuote(null);
      throw quoteError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetQuote = useCallback(() => {
    setQuote(null);
    setError('');
  }, []);

  return {
    quote,
    isLoading,
    error,
    requestQuote,
    resetQuote,
  };
}
