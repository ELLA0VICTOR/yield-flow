import { formatUnits } from 'ethers';
import { useCallback, useState } from 'react';
import { getTokenAllowance, getTokenBalance, isNativeToken, isWalletAddress, approveToken } from '../lib/evm';
import { getFriendlyTransactionMessage } from '../lib/errors';
import { parseAmountToUnits } from '../lib/formatters';
import { fetchComposerStatus } from '../lib/lifi';
import { useComposerQuote } from './useComposerQuote';

const STATUS_POLL_INTERVAL = 5000;
const MAX_STATUS_POLLS = 60;

export function useDepositFlow({ vault, wallet, onDepositSuccess }) {
  const { quote, isLoading: isQuoteLoading, error: quoteError, requestQuote, resetQuote } = useComposerQuote();
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

  const primaryToken = vault?.underlyingTokens?.[0];

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
  }, [resetQuote]);

  const refreshBalanceAndAllowance = useCallback(async (activeQuote, amountUnits) => {
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
        !isNativeToken(primaryToken.address) && nextAllowance < BigInt(amountUnits || activeQuote.action?.fromAmount || 0)
      );
    } finally {
      setIsBalanceLoading(false);
    }
  }, [primaryToken?.address, primaryToken?.decimals, wallet.account, wallet.provider]);

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

      await refreshBalanceAndAllowance(nextQuote, amountUnits);
      setQuotedAmount(amount);
      setStatusLabel('Quote ready');
      return nextQuote;
    } catch (quoteRequestError) {
      const message = getFriendlyTransactionMessage(quoteRequestError, 'quote').message;
      setError(message);
      setStatusLabel('');
      throw new Error(message);
    }
  }, [amount, primaryToken?.address, primaryToken?.decimals, refreshBalanceAndAllowance, requestQuote, vault, wallet.account, wallet.isConnected]);

  const approve = useCallback(async () => {
    if (!quote || !primaryToken?.address || isNativeToken(primaryToken.address)) {
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsApprovalPending(true);
    setStatusLabel('Waiting for approval...');

    try {
      const signer = await wallet.getSigner();
      const approvalTx = await approveToken({
        tokenAddress: primaryToken.address,
        spender: quote.estimate?.approvalAddress,
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
  }, [primaryToken?.address, quote, refreshBalanceAndAllowance, wallet]);

  const deposit = useCallback(async () => {
    if (!quote?.transactionRequest) {
      throw new Error('Prepare a quote before depositing');
    }

    setError('');
    setSuccessMessage('');
    setIsDepositPending(true);
    setStatusLabel('Confirming transaction...');

    try {
      const signer = await wallet.getSigner();
      const depositTx = await signer.sendTransaction(quote.transactionRequest);
      setDepositHash(depositTx.hash);

      if (quote.action?.fromChainId === quote.action?.toChainId) {
        setStatusLabel('Waiting for confirmation...');
        await depositTx.wait();
        setStatusLabel('Deposit complete');
        setSuccessMessage('Deposit confirmed on-chain.');
        await refreshBalanceAndAllowance(quote, quote.action?.fromAmount);
        onDepositSuccess?.(wallet.account);
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
          onDepositSuccess?.(wallet.account);
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
  }, [onDepositSuccess, quote, refreshBalanceAndAllowance, wallet]);

  const canDeposit =
    Boolean(quote?.transactionRequest) &&
    quotedAmount === amount &&
    !needsApproval &&
    !isApprovalPending &&
    !isDepositPending &&
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
    isQuoteStale,
    quotedAmount,
    primaryToken,
    formattedAmountOut,
    prepareQuote,
    approve,
    deposit,
    resetFlow,
  };
}
