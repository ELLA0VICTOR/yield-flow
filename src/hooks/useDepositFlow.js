import { formatUnits } from 'ethers';
import { useCallback, useEffect, useState } from 'react';
import {
  getTokenAllowance,
  getTokenBalance,
  getTokenMetadata,
  isNativeToken,
  isWalletAddress,
  approveToken,
} from '../lib/evm';
import { getFriendlyTransactionMessage } from '../lib/errors';
import { parseAmountToUnits } from '../lib/formatters';
import { fetchComposerStatus } from '../lib/lifi';
import { buildFallbackVaultPosition } from '../lib/positions';
import { useComposerQuote } from './useComposerQuote';

const STATUS_POLL_INTERVAL = 5000;
const MAX_STATUS_POLLS = 60;
const QUOTE_TTL_MS = 2 * 60 * 1000;
const SHARE_BALANCE_RETRY_DELAY_MS = 1500;
const SHARE_BALANCE_MAX_RETRIES = 6;

function normalizeAddress(value = '') {
  return String(value || '').toLowerCase();
}

function isHexPayload(value) {
  return typeof value === 'string' && /^0x[0-9a-fA-F]+$/.test(value) && value.length > 10;
}

function validatePreparedQuote({
  quote,
  vault,
  primaryToken,
  walletAddress,
  expectedAmountUnits,
  quoteExpiresAt,
}) {
  if (!quote?.transactionRequest || !quote?.action) {
    throw new Error('Prepare a quote before continuing.');
  }

  if (!vault?.address || !primaryToken?.address) {
    throw new Error('Vault or token data is missing.');
  }

  if (!walletAddress || !isWalletAddress(walletAddress)) {
    throw new Error('Connected wallet address is invalid.');
  }

  if (!quoteExpiresAt || Date.now() > quoteExpiresAt) {
    throw new Error('Quote expired. Prepare a new quote.');
  }

  const action = quote.action;
  const transactionRequest = quote.transactionRequest;
  const expectedChainId = Number(vault.chainId);
  const normalizedWallet = normalizeAddress(walletAddress);
  const normalizedToken = normalizeAddress(primaryToken.address);
  const normalizedVault = normalizeAddress(vault.address);

  if (
    Number(action.fromChainId) !== expectedChainId ||
    Number(action.toChainId) !== expectedChainId
  ) {
    throw new Error('Quote network does not match the selected vault.');
  }

  if (normalizeAddress(action.fromToken?.address) !== normalizedToken) {
    throw new Error('Quote token does not match the selected deposit token.');
  }

  if (action.toToken?.address && normalizeAddress(action.toToken.address) !== normalizedVault) {
    throw new Error('Quote destination does not match the selected vault.');
  }

  if (action.fromAddress && normalizeAddress(action.fromAddress) !== normalizedWallet) {
    throw new Error('Quote sender does not match the connected wallet.');
  }

  if (action.toAddress && normalizeAddress(action.toAddress) !== normalizedWallet) {
    throw new Error('Quote receiver does not match the connected wallet.');
  }

  if (BigInt(action.fromAmount || 0) !== BigInt(expectedAmountUnits || 0)) {
    throw new Error('Quote amount no longer matches the entered amount.');
  }

  if (transactionRequest.from && normalizeAddress(transactionRequest.from) !== normalizedWallet) {
    throw new Error('Transaction sender does not match the connected wallet.');
  }

  if (!isWalletAddress(transactionRequest.to)) {
    throw new Error('Transaction target is invalid.');
  }

  if (!isHexPayload(transactionRequest.data)) {
    throw new Error('Transaction data is invalid.');
  }

  if (!isNativeToken(primaryToken.address) && !isWalletAddress(quote.estimate?.approvalAddress)) {
    throw new Error('Approval target is invalid.');
  }

  return {
    approvalTarget: quote.estimate?.approvalAddress || '',
    transactionTarget: transactionRequest.to,
    transactionValue: transactionRequest.value || '0',
  };
}

export function useDepositFlow({ vault, wallet, onDepositSuccess }) {
  const {
    quote,
    isLoading: isQuoteLoading,
    error: quoteError,
    requestQuote,
    resetQuote,
  } = useComposerQuote();
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState({ raw: 0n, formatted: '0' });
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [isApprovalPending, setIsApprovalPending] = useState(false);
  const [isDepositPending, setIsDepositPending] = useState(false);
  const [approvalHash, setApprovalHash] = useState('');
  const [depositHash, setDepositHash] = useState('');
  const [statusLabel, setStatusLabel] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [quotedAmount, setQuotedAmount] = useState('');
  const [quoteExpiresAt, setQuoteExpiresAt] = useState(0);
  const [quoteTimeRemaining, setQuoteTimeRemaining] = useState(0);
  const [quoteTargets, setQuoteTargets] = useState({
    approvalTarget: '',
    transactionTarget: '',
    transactionValue: '0',
  });
  const [vaultShareBalance, setVaultShareBalance] = useState({
    raw: 0n,
    formatted: '0',
    symbol: '',
    decimals: 18,
  });
  const [isVaultShareLoading, setIsVaultShareLoading] = useState(false);
  const [vaultShareError, setVaultShareError] = useState('');

  const primaryToken = vault?.underlyingTokens?.[0];

  const estimateDepositUsd = useCallback(
    (activeQuote = quote) => {
      if (!activeQuote?.action?.fromAmount || !primaryToken?.decimals) {
        return '';
      }

      try {
        return formatUnits(activeQuote.action.fromAmount, primaryToken.decimals);
      } catch {
        return '';
      }
    },
    [primaryToken?.decimals, quote]
  );

  useEffect(() => {
    if (!quoteExpiresAt) {
      setQuoteTimeRemaining(0);
      return undefined;
    }

    function updateRemainingTime() {
      const nextRemaining = Math.max(0, Math.ceil((quoteExpiresAt - Date.now()) / 1000));
      setQuoteTimeRemaining(nextRemaining);
    }

    updateRemainingTime();
    const intervalId = window.setInterval(updateRemainingTime, 1000);

    return () => window.clearInterval(intervalId);
  }, [quoteExpiresAt]);

  const isQuoteExpired = Boolean(quote?.transactionRequest) && quoteTimeRemaining === 0;

  const resetFlow = useCallback(() => {
    resetQuote();
    setAmount('');
    setBalance({ raw: 0n, formatted: '0' });
    setNeedsApproval(false);
    setIsApprovalPending(false);
    setIsDepositPending(false);
    setApprovalHash('');
    setDepositHash('');
    setStatusLabel('');
    setError('');
    setSuccessMessage('');
    setQuotedAmount('');
    setQuoteExpiresAt(0);
    setQuoteTimeRemaining(0);
    setQuoteTargets({
      approvalTarget: '',
      transactionTarget: '',
      transactionValue: '0',
    });
    setVaultShareBalance({
      raw: 0n,
      formatted: '0',
      symbol: '',
      decimals: 18,
    });
    setIsVaultShareLoading(false);
    setVaultShareError('');
  }, [resetQuote]);

  useEffect(() => {
    resetFlow();
  }, [primaryToken?.address, resetFlow, vault?.address, wallet.account]);

  const refreshVaultShareBalance = useCallback(
    async (activeQuote = quote, options = {}) => {
      if (!wallet.provider || !wallet.account || !vault?.address) {
        setVaultShareBalance({
          raw: 0n,
          formatted: '0',
          symbol: '',
          decimals: 18,
        });
        setVaultShareError('');
        return;
      }

      const {
        retries = 0,
        stopWhen = null,
      } = options;
      const fallbackDecimals =
        activeQuote?.estimate?.toToken?.decimals ?? vault.lpTokens?.[0]?.decimals ?? 18;
      const fallbackSymbol =
        activeQuote?.estimate?.toToken?.symbol ?? vault.lpTokens?.[0]?.symbol ?? vault.name;

      setIsVaultShareLoading(true);
      setVaultShareError('');

      try {
        for (let attempt = 0; attempt <= retries; attempt += 1) {
          const metadata = await getTokenMetadata({
            tokenAddress: vault.address,
            provider: wallet.provider,
            fallbackDecimals,
            fallbackSymbol,
          });
          const nextBalance = await getTokenBalance({
            tokenAddress: vault.address,
            account: wallet.account,
            provider: wallet.provider,
            decimals: metadata.decimals,
          });
          const normalizedBalance = {
            ...nextBalance,
            symbol: metadata.symbol || fallbackSymbol,
            decimals: metadata.decimals,
          };

          setVaultShareBalance(normalizedBalance);

          if (!stopWhen || stopWhen(normalizedBalance)) {
            return normalizedBalance;
          }

          if (attempt < retries) {
            await new Promise((resolve) => window.setTimeout(resolve, SHARE_BALANCE_RETRY_DELAY_MS));
          }
        }

        return {
          raw: 0n,
          formatted: '0',
          symbol: fallbackSymbol,
          decimals: fallbackDecimals,
        };
      } catch (shareBalanceError) {
        setVaultShareError(shareBalanceError.message || 'Unable to verify vault receipt balance');
        return null;
      } finally {
        setIsVaultShareLoading(false);
      }
    },
    [quote, vault, wallet.account, wallet.provider]
  );

  useEffect(() => {
    if (!wallet.isConnected || !wallet.account || !vault?.address) {
      return;
    }

    void refreshVaultShareBalance();
  }, [refreshVaultShareBalance, vault?.address, wallet.account, wallet.isConnected]);

  const refreshBalanceAndAllowance = useCallback(
    async (activeQuote, amountUnits) => {
      if (!wallet.provider || !wallet.account || !primaryToken?.address) {
        return;
      }

      setIsBalanceLoading(true);

      try {
        const [nextBalance, nextAllowance] = await Promise.all([
          getTokenBalance({
            tokenAddress: primaryToken.address,
            account: wallet.account,
            provider: wallet.provider,
            decimals: primaryToken.decimals || 18,
          }),
          getTokenAllowance({
            tokenAddress: primaryToken.address,
            owner: wallet.account,
            spender: activeQuote?.estimate?.approvalAddress,
            provider: wallet.provider,
          }),
        ]);

        setBalance(nextBalance);
        setNeedsApproval(
          !isNativeToken(primaryToken.address) &&
            nextAllowance < BigInt(amountUnits || activeQuote.action?.fromAmount || 0)
        );
      } finally {
        setIsBalanceLoading(false);
      }
    },
    [primaryToken?.address, primaryToken?.decimals, wallet.account, wallet.provider]
  );

  const prepareQuote = useCallback(async () => {
    if (!vault || !primaryToken?.address) {
      throw new Error('Select a vault with a deposit token first');
    }

    if (!wallet.isConnected || !wallet.account) {
      throw new Error('Connect your wallet to prepare a deposit');
    }

    if (!isWalletAddress(wallet.account)) {
      throw new Error('Connected wallet address is invalid');
    }

    setError('');
    setSuccessMessage('');
    setStatusLabel('Preparing quote...');
    setApprovalHash('');
    setDepositHash('');

    const amountUnits = parseAmountToUnits(amount, primaryToken.decimals || 18);

    try {
      const nextQuote = await requestQuote({
        fromChain: String(vault.chainId),
        toChain: String(vault.chainId),
        fromToken: primaryToken.address,
        toToken: vault.address,
        fromAddress: wallet.account,
        toAddress: wallet.account,
        fromAmount: amountUnits,
      });

      const expiresAt = Date.now() + QUOTE_TTL_MS;
      const validatedTargets = validatePreparedQuote({
        quote: nextQuote,
        vault,
        primaryToken,
        walletAddress: wallet.account,
        expectedAmountUnits: amountUnits,
        quoteExpiresAt: expiresAt,
      });

      await refreshBalanceAndAllowance(nextQuote, amountUnits);
      setQuoteTargets(validatedTargets);
      setQuotedAmount(amount);
      setQuoteExpiresAt(expiresAt);
      setStatusLabel('Quote ready');
      return nextQuote;
    } catch (quoteRequestError) {
      const message = getFriendlyTransactionMessage(quoteRequestError, 'quote').message;
      setError(message);
      setStatusLabel('');
      throw new Error(message);
    }
  }, [
    amount,
    primaryToken,
    refreshBalanceAndAllowance,
    requestQuote,
    vault,
    wallet.account,
    wallet.isConnected,
  ]);

  useEffect(() => {
    if (!wallet.isConnected || !wallet.account || !vault?.address || !primaryToken?.address) {
      return;
    }

    if (wallet.chainId !== Number(vault.chainId)) {
      return;
    }

    if (!amount || isApprovalPending || isDepositPending || isQuoteLoading) {
      return;
    }

    try {
      parseAmountToUnits(amount, primaryToken.decimals || 18);
    } catch {
      return;
    }

    if (quote?.transactionRequest && quotedAmount === amount && !isQuoteExpired) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void prepareQuote().catch(() => {});
    }, 600);

    return () => window.clearTimeout(timeoutId);
  }, [
    amount,
    isApprovalPending,
    isDepositPending,
    isQuoteExpired,
    isQuoteLoading,
    prepareQuote,
    primaryToken?.address,
    primaryToken?.decimals,
    quote,
    quotedAmount,
    vault?.address,
    vault?.chainId,
    wallet.account,
    wallet.chainId,
    wallet.isConnected,
  ]);

  const approve = useCallback(async () => {
    if (!quote || !primaryToken?.address || isNativeToken(primaryToken.address)) {
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsApprovalPending(true);
    setStatusLabel('Waiting for approval...');

    try {
      const expectedAmountUnits = parseAmountToUnits(
        quotedAmount || amount,
        primaryToken.decimals || 18
      );

      const validatedTargets = validatePreparedQuote({
        quote,
        vault,
        primaryToken,
        walletAddress: wallet.account,
        expectedAmountUnits,
        quoteExpiresAt,
      });

      const signer = await wallet.getSigner();
      const approvalTx = await approveToken({
        tokenAddress: primaryToken.address,
        spender: validatedTargets.approvalTarget,
        amount: quote.action?.fromAmount,
        signer,
      });

      setApprovalHash(approvalTx.hash);
      await approvalTx.wait();
      setNeedsApproval(false);
      setStatusLabel('Approval confirmed');
      await refreshBalanceAndAllowance(quote, quote.action?.fromAmount);
    } catch (approvalError) {
      setError(getFriendlyTransactionMessage(approvalError, 'approve').message);
      setStatusLabel('');
      throw approvalError;
    } finally {
      setIsApprovalPending(false);
    }
  }, [
    amount,
    primaryToken,
    quote,
    quoteExpiresAt,
    quotedAmount,
    refreshBalanceAndAllowance,
    vault,
    wallet,
  ]);

  const deposit = useCallback(async () => {
    if (!quote?.transactionRequest) {
      throw new Error('Prepare a quote before depositing');
    }

    setError('');
    setSuccessMessage('');
    setIsDepositPending(true);
    setStatusLabel('Confirming transaction...');

    try {
      const expectedAmountUnits = parseAmountToUnits(
        quotedAmount || amount,
        primaryToken?.decimals || 18
      );

      validatePreparedQuote({
        quote,
        vault,
        primaryToken,
        walletAddress: wallet.account,
        expectedAmountUnits,
        quoteExpiresAt,
      });

      const signer = await wallet.getSigner();
      const depositTx = await signer.sendTransaction(quote.transactionRequest);
      setDepositHash(depositTx.hash);

      if (quote.action?.fromChainId === quote.action?.toChainId) {
        setStatusLabel('Waiting for confirmation...');
        await depositTx.wait();
        setStatusLabel('Deposit complete');
        setSuccessMessage('Deposit confirmed on-chain.');
        await refreshBalanceAndAllowance(quote, quote.action?.fromAmount);
        const nextShareBalance = await refreshVaultShareBalance(quote, {
          retries: SHARE_BALANCE_MAX_RETRIES,
          stopWhen: (nextBalance) => BigInt(nextBalance?.raw || 0) > 0n,
        });
        onDepositSuccess?.(
          wallet.account,
          buildFallbackVaultPosition({
            vault,
            walletAddress: wallet.account,
            shareBalance: nextShareBalance,
            balanceUsd: estimateDepositUsd(quote),
          })
        );
        return;
      }

      setStatusLabel('Bridging in progress...');
      let attempts = 0;
      let status = null;

      while (attempts < MAX_STATUS_POLLS) {
        status = await fetchComposerStatus({
          txHash: depositTx.hash,
          fromChain: quote.action?.fromChainId,
          toChain: quote.action?.toChainId,
        });

        if (status.status === 'DONE') {
          setStatusLabel('Deposit complete');
          setSuccessMessage('Cross-chain deposit completed successfully.');
          const nextShareBalance = await refreshVaultShareBalance(quote, {
            retries: SHARE_BALANCE_MAX_RETRIES,
            stopWhen: (nextBalance) => BigInt(nextBalance?.raw || 0) > 0n,
          });
          onDepositSuccess?.(
            wallet.account,
            buildFallbackVaultPosition({
              vault,
              walletAddress: wallet.account,
              shareBalance: nextShareBalance,
              balanceUsd: estimateDepositUsd(quote),
            })
          );
          break;
        }

        if (status.status === 'FAILED' || status.status === 'INVALID') {
          throw new Error(`Composer status: ${status.status}`);
        }

        attempts += 1;
        await new Promise((resolve) => window.setTimeout(resolve, STATUS_POLL_INTERVAL));
      }

      if (status?.status !== 'DONE') {
        setStatusLabel('Deposit sent. Final confirmation is still pending.');
        setSuccessMessage('Transaction submitted. Cross-chain completion may take a few minutes.');
      }
    } catch (depositError) {
      setError(getFriendlyTransactionMessage(depositError, 'deposit').message);
      setStatusLabel('');
      throw depositError;
    } finally {
      setIsDepositPending(false);
    }
  }, [
    amount,
    estimateDepositUsd,
    onDepositSuccess,
    primaryToken,
    quote,
    quoteExpiresAt,
    quotedAmount,
    refreshBalanceAndAllowance,
    refreshVaultShareBalance,
    vault,
    wallet,
  ]);

  const canDeposit =
    Boolean(quote?.transactionRequest) &&
    quotedAmount === amount &&
    !needsApproval &&
    !isApprovalPending &&
    !isDepositPending &&
    !isQuoteExpired &&
    balance.raw >= BigInt(quote?.action?.fromAmount || 0);

  const hasSufficientBalance = balance.raw >= BigInt(quote?.action?.fromAmount || 0);
  const isQuoteStale = Boolean(quote?.transactionRequest) && quotedAmount !== amount;

  const formattedAmountOut =
    quote?.estimate?.toAmount && quote?.estimate?.toToken?.decimals !== undefined
      ? formatUnits(quote.estimate.toAmount, quote.estimate.toToken.decimals)
      : null;

  return {
    amount,
    setAmount,
    quote,
    quoteError,
    isQuoteLoading,
    balance,
    isBalanceLoading,
    needsApproval,
    isApprovalPending,
    isDepositPending,
    approvalHash,
    depositHash,
    statusLabel,
    error,
    successMessage,
    canDeposit,
    hasSufficientBalance,
    isQuoteExpired,
    isQuoteStale,
    quotedAmount,
    quoteExpiresAt,
    quoteTimeRemaining,
    quoteTargets,
    primaryToken,
    formattedAmountOut,
    vaultShareBalance,
    isVaultShareLoading,
    vaultShareError,
    prepareQuote,
    approve,
    deposit,
    resetFlow,
    refreshVaultShareBalance,
  };
}
