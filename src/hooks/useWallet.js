import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getBrowserProvider,
  getInjectedWallets,
  hasWalletProvider,
  listenForWalletAnnouncements,
  switchOrAddChain,
} from '../lib/evm';
import { getFriendlyWalletMessage } from '../lib/errors';

function sortWallets(wallets) {
  return [...wallets].sort((left, right) => left.name.localeCompare(right.name));
}

export function useWallet() {
  const walletMapRef = useRef(new Map());
  const [walletOptions, setWalletOptions] = useState([]);
  const [activeWalletId, setActiveWalletId] = useState('');
  const [rawProvider, setRawProvider] = useState(null);
  const provider = useMemo(() => getBrowserProvider(rawProvider), [rawProvider]);
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);

  const pushNotice = useCallback((nextNotice) => {
    setNotice({
      id: Date.now(),
      tone: nextNotice.tone || 'info',
      message: nextNotice.message,
    });
  }, []);

  const dismissNotice = useCallback(() => {
    setNotice(null);
  }, []);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setNotice(null);
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const upsertWallet = useCallback((wallet) => {
    if (!wallet?.provider) {
      return;
    }

    walletMapRef.current.set(wallet.id, wallet);
    setWalletOptions(sortWallets(Array.from(walletMapRef.current.values())));
  }, []);

  useEffect(() => {
    getInjectedWallets().forEach(upsertWallet);
    const stopListening = listenForWalletAnnouncements(upsertWallet);

    return stopListening;
  }, [upsertWallet]);

  const syncWalletState = useCallback(
    async (targetProvider = provider) => {
      if (!targetProvider) {
        setAccount('');
        setChainId(null);
        return;
      }

      try {
        const accounts = await targetProvider.send('eth_accounts', []);
        const network = await targetProvider.getNetwork();

        setAccount(accounts?.[0] || '');
        setChainId(Number(network.chainId));
      } catch {
        setAccount('');
        setChainId(null);
      }
    },
    [provider]
  );

  useEffect(() => {
    if (provider) {
      void syncWalletState(provider);
      return;
    }

    async function restoreExistingSession() {
      for (const option of walletOptions) {
        const nextProvider = getBrowserProvider(option.provider);
        if (!nextProvider) {
          continue;
        }

        try {
          const accounts = await nextProvider.send('eth_accounts', []);
          if (accounts?.[0]) {
            setRawProvider(option.provider);
            setActiveWalletId(option.id);
            return;
          }
        } catch {
          // Ignore silent discovery failures.
        }
      }
    }

    if (walletOptions.length > 0) {
      void restoreExistingSession();
    }
  }, [provider, syncWalletState, walletOptions]);

  useEffect(() => {
    if (!rawProvider?.on) {
      return undefined;
    }

    const handleAccountsChanged = (accounts) => {
      setAccount(accounts?.[0] || '');
    };

    const handleChainChanged = (nextChainId) => {
      setChainId(Number.parseInt(nextChainId, 16));
    };

    rawProvider.on('accountsChanged', handleAccountsChanged);
    rawProvider.on('chainChanged', handleChainChanged);

    return () => {
      rawProvider.removeListener?.('accountsChanged', handleAccountsChanged);
      rawProvider.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [rawProvider]);

  const connectWallet = useCallback(
    async (walletId) => {
      const targetWallet =
        walletMapRef.current.get(walletId) ||
        walletOptions.find((wallet) => wallet.id === walletId) ||
        walletOptions[0];

      if (!targetWallet?.provider) {
        const feedback = getFriendlyWalletMessage(new Error('No compatible wallet'), 'connect');
        setError(feedback.inline ? feedback.message : '');
        pushNotice(feedback);
        throw new Error(feedback.message);
      }

      const nextProvider = getBrowserProvider(targetWallet.provider);

      setIsConnecting(true);
      setError('');

      try {
        await nextProvider.send('eth_requestAccounts', []);
        setRawProvider(targetWallet.provider);
        setActiveWalletId(targetWallet.id);
        await syncWalletState(nextProvider);
        pushNotice({
          tone: 'success',
          message: `${targetWallet.name} connected.`,
        });
      } catch (connectError) {
        const feedback = getFriendlyWalletMessage(connectError, 'connect');
        setError(feedback.inline ? feedback.message : '');
        pushNotice(feedback);
        throw new Error(feedback.message);
      } finally {
        setIsConnecting(false);
      }
    },
    [pushNotice, syncWalletState, walletOptions]
  );

  const switchChain = useCallback(
    async (chainConfig) => {
      setError('');

      try {
        await switchOrAddChain(chainConfig, rawProvider);
        await syncWalletState();
      } catch (switchError) {
        const feedback = getFriendlyWalletMessage(switchError, 'switch');
        setError(feedback.inline ? feedback.message : '');
        pushNotice(feedback);
        throw new Error(feedback.message);
      }
    },
    [pushNotice, rawProvider, syncWalletState]
  );

  const getSigner = useCallback(async () => {
    if (!provider) {
      throw new Error('No wallet provider found');
    }

    return provider.getSigner();
  }, [provider]);

  const activeWallet = useMemo(
    () => walletOptions.find((wallet) => wallet.id === activeWalletId) || null,
    [activeWalletId, walletOptions]
  );

  return {
    provider,
    rawProvider,
    walletOptions,
    activeWallet,
    account,
    chainId,
    error,
    notice,
    isConnecting,
    isConnected: Boolean(account),
    hasProvider: hasWalletProvider(),
    connectWallet,
    switchChain,
    getSigner,
    refreshWallet: syncWalletState,
    dismissNotice,
  };
}
