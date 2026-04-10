import { formatUnits } from 'ethers';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  approveToken,
  getTokenAllowance,
  isWalletAddress,
} from '../lib/evm';
import { getFriendlyTransactionMessage } from '../lib/errors';
import { parseAmountToUnits } from '../lib/formatters';
import { fetchComposerStatus } from '../lib/lifi';
import { buildFallbackVaultPosition } from '../lib/positions';
import { useComposerQuote } from './useComposerQuote';

const STATUS_POLL_INTERVAL = 5000;
const MAX_STATUS_POLLS = 60;
const QUOTE_TTL_MS = 2 * 60 * 1000;

function normalizeAddress(value = '') {
  return String(value || '').toLowerCase();
}

function isHexPayload(value) {
  return typeof value === 'string' && /^0x[0-9a-fA-F]+$/.test(value) && value.length > 10;
}

function validateWithdrawQuote({
  quote,
  vault,
  primaryToken,
  walletAddress,
  expectedAmountUnits,
  quoteExpiresAt,
}) {
  if (!quote?.transactionRequest || !quote?.action) {
    throw new Error('Prepare a route before continuing.');
  }

  if (!vault?.address || !primaryToken?.address) {
    throw new Error('Vault or token data is missing.');
  }

  if (!walletAddress || !isWalletAddress(walletAddress)) {
    throw new Error('Connected wallet address is invalid.');
  }

  if (!quoteExpiresAt || Date.now() > quoteExpiresAt) {
    throw new Error('Route expired. Refresh before withdrawing.');
  }

  const action = quote.action;
  const transactionRequest = quote.transactionRequest;
  const expectedChainId = Number(vault.chainId);
  const normalizedWallet = normalizeAddress(walletAddress);
  const normalizedVault = normalizeAddress(vault.address);
  const normalizedPrimaryToken = normalizeAddress(primaryToken.address);

  if (
    Number(action.fromChainId) !== expectedChainId ||
    Number(action.toChainId) !== expectedChainId
  ) {
    throw new Error('Route network does not match the selected vault.');
  }

  if (normalizeAddress(action.fromToken?.address) !== normalizedVault) {
    throw new Error('Route source does not match the selected vault token.');
  }

  if (action.toToken?.address && normalizeAddress(action.toToken.address) !== normalizedPrimaryToken) {
    throw new Error('Route destination does not match the selected asset.');
  }

  if (action.fromAddress && normalizeAddress(action.fromAddress) !== normalizedWallet) {
    throw new Error('Route sender does not match the connected wallet.');
  }

  if (action.toAddress && normalizeAddress(action.toAddress) !== normalizedWallet) {
    throw new Error('Route receiver does not match the connected wallet.');
  }

  if (BigInt(action.fromAmount || 0) !== BigInt(expectedAmountUnits || 0)) {
    throw new Error('Route amount no longer matches the entered amount.');
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

  if (!isWalletAddress(quote.estimate?.approvalAddress)) {
    throw new Error('Approval target is invalid.');
  }

  return {
    approvalTarget: quote.estimate?.approvalAddress || '',
    transactionTarget: transactionRequest.to,
    transactionValue: transactionRequest.value || '0',
  };
}

export function useWithdrawFlow({
  vault,
  wallet,
  shareBalance,
  refreshVaultShareBalance,
  onWithdrawSuccess,
}) {
  const {
    quote,
    isLoading: isQuoteLoading,
    error: quoteError,
    requestQuote,
    resetQuote,
  } = useComposerQuote();
  const [amount, setAmount] = useState('');
  const [needsApproval, setNeedsApproval] = useState(false);
  const [isApprovalPending, setIsApprovalPending] = useState(false);
  const [isWithdrawPending, setIsWithdrawPending] = useState(false);
  const [approvalHash, setApprovalHash] = useState('');
  const [withdrawHash, setWithdrawHash] = useState('');
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

  const primaryToken = vault?.underlyingTokens?.[0];
  const shareToken = useMemo(
    () => ({
      address: vault?.address || '',
      symbol: shareBalance?.symbol || vault?.lpTokens?.[0]?.symbol || vault?.name || 'Vault share',
      decimals: shareBalance?.decimals ?? vault?.lpTokens?.[0]?.decimals ?? 18,
    }),
    [shareBalance?.decimals, shareBalance?.symbol, vault]
  );
  const availableShareBalance = useMemo(
    () => ({
      raw: shareBalance?.raw ?? 0n,
      formatted: shareBalance?.formatted || '0',
      symbol: shareToken.symbol,
      decimals: shareToken.decimals,
    }),
    [shareBalance?.formatted, shareBalance?.raw, shareToken.decimals, shareToken.symbol]
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
    setNeedsApproval(false);
    setIsApprovalPending(false);
    setIsWithdrawPending(false);
    setApprovalHash('');
    setWithdrawHash('');
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
  }, [resetQuote]);

  useEffect(() => {
    resetFlow();
  }, [resetFlow, vault?.address, wallet.account]);

  const refreshShareBalanceAndAllowance = useCallback(
    async (activeQuote, amountUnits) => {
      if (!wallet.provider || !wallet.account || !shareToken.address) {
        return;
      }

      const nextAllowance = await getTokenAllowance({
        tokenAddress: shareToken.address,
        owner: wallet.account,
        spender: activeQuote?.estimate?.approvalAddress,
        provider: wallet.provider,
      });
      setNeedsApproval(nextAllowance < BigInt(amountUnits || activeQuote.action?.fromAmount || 0));
    },
    [shareToken.address, wallet.account, wallet.provider]
  );

  const prepareQuote = useCallback(async () => {
    if (!vault?.address || !primaryToken?.address) {
      throw new Error('Select a redeemable vault first');
    }

    if (!wallet.isConnected || !wallet.account) {
      throw new Error('Connect your wallet to prepare a withdrawal');
    }

    const amountUnits = parseAmountToUnits(amount, shareToken.decimals);

    setError('');
    setSuccessMessage('');
    setStatusLabel('Preparing route...');
    setApprovalHash('');
    setWithdrawHash('');

    try {
      const nextQuote = await requestQuote({
        fromChain: String(vault.chainId),
        toChain: String(vault.chainId),
        fromToken: vault.address,
        toToken: primaryToken.address,
        fromAddress: wallet.account,
        toAddress: wallet.account,
        fromAmount: amountUnits,
      });

      const expiresAt = Date.now() + QUOTE_TTL_MS;
      const validatedTargets = validateWithdrawQuote({
        quote: nextQuote,
        vault,
        primaryToken,
        walletAddress: wallet.account,
        expectedAmountUnits: amountUnits,
        quoteExpiresAt: expiresAt,
      });

      await refreshShareBalanceAndAllowance(nextQuote, amountUnits);
      setQuoteTargets(validatedTargets);
      setQuotedAmount(amount);
      setQuoteExpiresAt(expiresAt);
      setStatusLabel('Route ready');
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
    refreshShareBalanceAndAllowance,
    requestQuote,
    shareToken.decimals,
    vault,
    wallet.account,
    wallet.isConnected,
  ]);

  useEffect(() => {
    if (!vault?.isRedeemable || !wallet.isConnected || !wallet.account || !amount) {
      return;
    }

    if (wallet.chainId !== Number(vault.chainId)) {
      return;
    }

    if (isApprovalPending || isWithdrawPending || isQuoteLoading) {
      return;
    }

    try {
      parseAmountToUnits(amount, shareToken.decimals);
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
    isQuoteExpired,
    isQuoteLoading,
    isWithdrawPending,
    prepareQuote,
    quote,
    quotedAmount,
    shareToken.decimals,
    vault?.chainId,
    vault?.isRedeemable,
    wallet.account,
    wallet.chainId,
    wallet.isConnected,
  ]);

  const approve = useCallback(async () => {
    if (!quote || !vault?.address) {
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsApprovalPending(true);
    setStatusLabel('Waiting for approval...');

    try {
      const expectedAmountUnits = parseAmountToUnits(quotedAmount || amount, shareToken.decimals);
      const validatedTargets = validateWithdrawQuote({
        quote,
        vault,
        primaryToken,
        walletAddress: wallet.account,
        expectedAmountUnits,
        quoteExpiresAt,
      });

      const signer = await wallet.getSigner();
      const approvalTx = await approveToken({
        tokenAddress: vault.address,
        spender: validatedTargets.approvalTarget,
        amount: quote.action?.fromAmount,
        signer,
      });

      setApprovalHash(approvalTx.hash);
      await approvalTx.wait();
      setNeedsApproval(false);
      setStatusLabel('Approval confirmed');
      await refreshShareBalanceAndAllowance(quote, quote.action?.fromAmount);
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
    refreshShareBalanceAndAllowance,
    shareToken.decimals,
    vault,
    wallet,
  ]);

  const withdraw = useCallback(async () => {
    if (!quote?.transactionRequest) {
      throw new Error('Prepare a route before withdrawing');
    }

    setError('');
    setSuccessMessage('');
    setIsWithdrawPending(true);
    setStatusLabel('Confirming withdrawal...');

    try {
      const expectedAmountUnits = parseAmountToUnits(quotedAmount || amount, shareToken.decimals);

      validateWithdrawQuote({
        quote,
        vault,
        primaryToken,
        walletAddress: wallet.account,
        expectedAmountUnits,
        quoteExpiresAt,
      });

      const signer = await wallet.getSigner();
      const withdrawTx = await signer.sendTransaction(quote.transactionRequest);
      setWithdrawHash(withdrawTx.hash);

      if (quote.action?.fromChainId === quote.action?.toChainId) {
        setStatusLabel('Waiting for confirmation...');
        await withdrawTx.wait();
        setStatusLabel('Withdraw complete');
        setSuccessMessage('Vault position redeemed back to your wallet.');
        const nextShareBalance = await refreshVaultShareBalance();
        onWithdrawSuccess?.(
          wallet.account,
          buildFallbackVaultPosition({
            vault,
            walletAddress: wallet.account,
            shareBalance: nextShareBalance,
          })
        );
        await refreshShareBalanceAndAllowance(quote, quote.action?.fromAmount);
        return;
      }

      setStatusLabel('Withdrawal in progress...');
      let attempts = 0;
      let status = null;

      while (attempts < MAX_STATUS_POLLS) {
        status = await fetchComposerStatus({
          txHash: withdrawTx.hash,
          fromChain: quote.action?.fromChainId,
          toChain: quote.action?.toChainId,
        });

        if (status.status === 'DONE') {
          setStatusLabel('Withdraw complete');
          setSuccessMessage('Vault position redeemed back to your wallet.');
          const nextShareBalance = await refreshVaultShareBalance();
          onWithdrawSuccess?.(
            wallet.account,
            buildFallbackVaultPosition({
              vault,
              walletAddress: wallet.account,
              shareBalance: nextShareBalance,
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
    } catch (withdrawError) {
      setError(getFriendlyTransactionMessage(withdrawError, 'deposit').message);
      setStatusLabel('');
      throw withdrawError;
    } finally {
      setIsWithdrawPending(false);
    }
  }, [
    amount,
    onWithdrawSuccess,
    primaryToken,
    quote,
    quoteExpiresAt,
    quotedAmount,
    refreshShareBalanceAndAllowance,
    refreshVaultShareBalance,
    shareToken.decimals,
    vault,
    wallet,
  ]);

  const hasSufficientBalance = availableShareBalance.raw >= BigInt(quote?.action?.fromAmount || 0);
  const isQuoteStale = Boolean(quote?.transactionRequest) && quotedAmount !== amount;
  const canWithdraw =
    Boolean(quote?.transactionRequest) &&
    quotedAmount === amount &&
    !needsApproval &&
    !isApprovalPending &&
    !isWithdrawPending &&
    !isQuoteExpired &&
    hasSufficientBalance;

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
    needsApproval,
    isApprovalPending,
    isWithdrawPending,
    approvalHash,
    withdrawHash,
    statusLabel,
    error,
    successMessage,
    canWithdraw,
    hasSufficientBalance,
    isQuoteExpired,
    isQuoteStale,
    quotedAmount,
    quoteTimeRemaining,
    quoteTargets,
    walletShareBalance: availableShareBalance,
    shareToken,
    formattedAmountOut,
    prepareQuote,
    approve,
    withdraw,
    resetFlow,
  };
}
