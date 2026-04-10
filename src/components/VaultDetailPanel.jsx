import { useEffect, useMemo, useState } from 'react';
import { useDepositFlow } from '../hooks/useDepositFlow';
import { useWithdrawFlow } from '../hooks/useWithdrawFlow';
import { buildFallbackVaultPosition } from '../lib/positions';
import {
  formatCurrency,
  formatPercent,
  formatTimelock,
  truncateAddress,
} from '../lib/formatters';

function getStepStatus({ wallet, vault, quoteReady, needsApproval, isApprovalPending, isDepositPending }) {
  if (!wallet.isConnected) {
    return 'Connect wallet';
  }

  if (wallet.chainId !== Number(vault.chainId)) {
    return 'Switch network';
  }

  if (isDepositPending) {
    return 'Depositing';
  }

  if (isApprovalPending) {
    return 'Approving';
  }

  if (quoteReady && needsApproval) {
    return 'Approval required';
  }

  if (quoteReady) {
    return 'Ready to deposit';
  }

  return 'Prepare quote';
}

function getFlowSteps({ wallet, vault, quoteReady, needsApproval, successMessage }) {
  const onCorrectChain = wallet.chainId === Number(vault.chainId);
  const approvalComplete = quoteReady && !needsApproval;

  return [
    {
      label: 'Connect',
      done: wallet.isConnected,
      active: !wallet.isConnected,
    },
    {
      label: 'Route',
      done: wallet.isConnected && onCorrectChain && quoteReady,
      active: wallet.isConnected && onCorrectChain && !quoteReady,
    },
    {
      label: 'Approve',
      done: approvalComplete,
      active: quoteReady && needsApproval,
    },
    {
      label: 'Deposit',
      done: Boolean(successMessage),
      active: quoteReady && approvalComplete && !successMessage,
    },
  ];
}

export function VaultDetailPanel({
  vault,
  wallet,
  walletChains,
  onDepositSuccess,
  onPositionProofChange,
  onOpenWalletModal,
}) {
  const [isReviewConfirmed, setIsReviewConfirmed] = useState(false);
  const {
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
    quoteTimeRemaining,
    quoteTargets,
    primaryToken,
    formattedAmountOut,
    vaultShareBalance,
    prepareQuote,
    approve,
    deposit,
    refreshVaultShareBalance,
  } = useDepositFlow({ vault, wallet, onDepositSuccess });
  const {
    amount: withdrawAmount,
    setAmount: setWithdrawAmount,
    quote: withdrawQuote,
    quoteError: withdrawQuoteError,
    isQuoteLoading: isWithdrawQuoteLoading,
    needsApproval: needsWithdrawApproval,
    isApprovalPending: isWithdrawApprovalPending,
    isWithdrawPending,
    approvalHash: withdrawApprovalHash,
    withdrawHash,
    statusLabel: withdrawStatusLabel,
    error: withdrawError,
    successMessage: withdrawSuccessMessage,
    canWithdraw,
    hasSufficientBalance: hasSufficientWithdrawBalance,
    isQuoteExpired: isWithdrawQuoteExpired,
    isQuoteStale: isWithdrawQuoteStale,
    quotedAmount: quotedWithdrawAmount,
    quoteTimeRemaining: withdrawQuoteTimeRemaining,
    quoteTargets: withdrawQuoteTargets,
    walletShareBalance,
    shareToken,
    formattedAmountOut: formattedWithdrawAmountOut,
    approve: approveWithdraw,
    withdraw,
  } = useWithdrawFlow({
    vault,
    wallet,
    shareBalance: vaultShareBalance,
    refreshVaultShareBalance,
    onWithdrawSuccess: onDepositSuccess,
  });

  const targetChain = useMemo(
    () => walletChains?.find((chain) => Number(chain.id) === Number(vault?.chainId)) || null,
    [vault?.chainId, walletChains]
  );

  const riskFacts = useMemo(() => {
    if (!vault) {
      return [];
    }

    return [
      { label: 'TVL', value: formatCurrency(vault.analytics?.tvl?.usd) },
      { label: '30d APY', value: formatPercent(vault.analytics?.apy30d) },
      { label: 'Time lock', value: formatTimelock(vault.timeLock) },
      { label: 'Redeemable', value: vault.isRedeemable ? 'Yes' : 'No' },
    ];
  }, [vault]);

  useEffect(() => {
    if (!vault || !wallet.account || !onPositionProofChange) {
      return;
    }

    if (vaultShareBalance.raw > 0n) {
      onPositionProofChange(
        buildFallbackVaultPosition({
          vault,
          walletAddress: wallet.account,
          shareBalance: vaultShareBalance,
        })
      );
      return;
    }

    onPositionProofChange(null);
  }, [onPositionProofChange, vault, vaultShareBalance, wallet.account]);

  if (!vault) {
    return (
      <aside className="retro-panel p-6">
        <p className="eyebrow">Selected vault</p>
        <h2 className="mt-2 font-head text-3xl text-foreground">Pick a vault</h2>
        <p className="mt-4 text-muted-foreground">Select a vault to view details and deposit.</p>
      </aside>
    );
  }

  const stepStatus = getStepStatus({
    wallet,
    vault,
    quoteReady: Boolean(quote?.transactionRequest),
    needsApproval,
    isApprovalPending,
    isDepositPending,
  });

  const flowSteps = getFlowSteps({
    wallet,
    vault,
    quoteReady: Boolean(quote?.transactionRequest),
    needsApproval,
    successMessage,
  });

  const displayBalance = Number(balance.formatted || 0);
  const suggestedOneUnit = primaryToken ? `1 ${primaryToken.symbol}` : 'Demo amount';
  const routeType =
    quote?.action?.fromChainId === quote?.action?.toChainId ? 'Same-chain' : 'Cross-chain';
  const quoteWindowLabel = quote
    ? isQuoteExpired
      ? 'Expired'
      : `${quoteTimeRemaining}s left`
    : 'Not prepared';
  const reviewReady = Boolean(quote) && isReviewConfirmed;
  const hasVaultShareBalance = vaultShareBalance.raw > 0n;
  const withdrawRouteLabel = withdrawQuote
    ? isWithdrawQuoteExpired
      ? 'Expired'
      : `${withdrawQuoteTimeRemaining}s left`
    : 'Waiting for amount';

  async function handlePrimaryAction() {
    try {
      if (!wallet.isConnected) {
        onOpenWalletModal?.();
        return;
      }

      if (wallet.chainId !== Number(vault.chainId)) {
        if (!targetChain) {
          throw new Error('Missing chain metadata for this vault');
        }

        await wallet.switchChain(targetChain);
        return;
      }

      setIsReviewConfirmed(false);
      await prepareQuote();
    } catch {
      // State is already handled in the wallet and deposit hooks.
    }
  }

  async function handleSecondaryAction() {
    try {
      if (needsApproval) {
        await approve();
        return;
      }

      await deposit();
    } catch {
      // State is already handled in the deposit hook.
    }
  }

  function handleQuickAmount(nextAmount) {
    setAmount(nextAmount);
  }

  async function handleWithdrawAction() {
    try {
      if (needsWithdrawApproval) {
        await approveWithdraw();
        return;
      }

      await withdraw();
    } catch {
      // State is already handled in the withdraw hook.
    }
  }

  return (
    <aside className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
      <section className="retro-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="retro-badge">{vault.network}</span>
              <span className={`retro-badge ${vault.isTransactional ? 'retro-badge-success' : ''}`}>
                {vault.isTransactional ? 'Deposit Ready' : 'Index Only'}
              </span>
            </div>
            <h2 className="mt-3 font-head text-3xl text-foreground">{vault.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{vault.protocol?.name || 'Unknown protocol'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Current APY</p>
            <p className="font-head text-4xl text-foreground">
              {formatPercent(vault.analytics?.apy?.total)}
            </p>
          </div>
        </div>

        <p className="mt-5 text-sm leading-7 text-muted-foreground">
          {vault.description || 'Use this panel to prepare, approve, and execute the deposit flow.'}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {riskFacts.map((fact) => (
            <div key={fact.label} className="retro-metric">
              <span className="metric-label">{fact.label}</span>
              <span className="metric-value">{fact.value}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-none border-2 border-border bg-accent px-4 py-3 text-sm text-foreground">
          Vault address: <span className="font-mono">{truncateAddress(vault.address, 10, 6)}</span>
        </div>
      </section>

      <section className="retro-panel p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="eyebrow">Deposit Studio</p>
            <h3 className="mt-2 font-head text-2xl text-foreground">Deposit with one flow</h3>
          </div>
          <span className="retro-badge">{stepStatus}</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {flowSteps.map((item) => (
            <div
              key={item.label}
              className={`border-2 px-4 py-3 ${
                item.done
                  ? 'border-border bg-primary text-foreground shadow-retro'
                  : item.active
                    ? 'border-border bg-card text-foreground shadow-retro'
                    : 'border-border bg-white text-muted-foreground'
              }`}
            >
              <p className="text-[10px] font-head uppercase tracking-[0.2em]">Step</p>
              <p className="mt-2 font-head text-lg uppercase">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="retro-metric">
            <span className="metric-label">Wallet</span>
            <span className="metric-value">
              {wallet.isConnected ? truncateAddress(wallet.account, 6, 4) : 'Not connected'}
            </span>
          </div>
          <div className="retro-metric">
            <span className="metric-label">Network</span>
            <span className="metric-value">
              {wallet.isConnected
                ? wallet.chainId === Number(vault.chainId)
                  ? targetChain?.name || vault.network
                  : `Switch to ${targetChain?.name || vault.network}`
                : targetChain?.name || vault.network}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-none border-2 border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Deposits use real funds from the connected wallet. Start with a small same-chain amount
          for the demo.
        </div>

        <div className="mt-5 space-y-4">
          <label className="space-y-2">
            <span className="field-label">Deposit token</span>
            <div className="retro-metric">
              <span className="metric-value">
                {primaryToken ? `${primaryToken.symbol} on ${vault.network}` : 'Unavailable'}
              </span>
            </div>
          </label>

          <label className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="field-label">Amount</span>
              {wallet.isConnected && (
                <span className="text-xs text-muted-foreground">
                  Balance:{' '}
                  {isBalanceLoading
                    ? 'Checking...'
                    : primaryToken
                      ? `${Number(balance.formatted || 0).toFixed(4)} ${primaryToken.symbol}`
                      : 'N/A'}
                </span>
              )}
            </div>
            <input
              className="retro-input"
              placeholder={primaryToken ? `e.g. 1 ${primaryToken.symbol}` : 'Amount'}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="retro-link"
                onClick={() => handleQuickAmount('1')}
              >
                {suggestedOneUnit}
              </button>
              {wallet.isConnected && displayBalance > 0 && (
                <button
                  type="button"
                  className="retro-link"
                  onClick={() =>
                    handleQuickAmount(
                      displayBalance >= 1
                        ? displayBalance.toFixed(4).replace(/\.?0+$/, '')
                        : balance.formatted
                    )
                  }
                >
                  Use balance
                </button>
              )}
            </div>
          </label>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="retro-button w-full"
            onClick={handlePrimaryAction}
            disabled={
              isQuoteLoading ||
              isApprovalPending ||
              isDepositPending ||
              (Boolean(quote) && !isQuoteExpired && !isQuoteStale)
            }
          >
            {wallet.isConnected
              ? wallet.chainId === Number(vault.chainId)
                ? isQuoteLoading
                  ? 'Getting Route...'
                  : quote && !isQuoteExpired && !isQuoteStale
                    ? 'Route Ready'
                    : 'Refresh Route'
                : `Switch to ${targetChain?.name || vault.network}`
              : 'Choose Wallet'}
          </button>

          <button
            type="button"
            className="retro-button retro-button-secondary w-full"
            onClick={handleSecondaryAction}
            disabled={
              !quote ||
              isQuoteLoading ||
              isApprovalPending ||
              isDepositPending ||
              !reviewReady ||
              isQuoteExpired ||
              isQuoteStale ||
              (!needsApproval && !canDeposit)
            }
          >
            {needsApproval
              ? isApprovalPending
                ? 'Approving...'
                : 'Approve Token'
              : isDepositPending
                ? 'Depositing...'
                : 'Deposit Now'}
          </button>
        </div>

        {(error || quoteError) && (
          <div className="mt-4 border-2 border-danger bg-white px-4 py-3 text-sm text-danger">
            {error || quoteError}
          </div>
        )}

        {!quote && (
          <div className="mt-4 border-2 border-border bg-card px-4 py-3 text-sm text-foreground">
            Enter an amount and the route will prepare automatically.
          </div>
        )}

        {quote && (
          <label className="mt-4 flex items-start gap-3 rounded-none border-2 border-border bg-white px-4 py-3 text-sm text-foreground">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-black"
              checked={isReviewConfirmed}
              onChange={(event) => setIsReviewConfirmed(event.target.checked)}
            />
            <span>
              I reviewed the wallet, network, token, amount, quote window, and transaction target
              before approving or depositing.
            </span>
          </label>
        )}

        {quote && !isReviewConfirmed && (
          <div className="mt-4 border-2 border-border bg-card px-4 py-3 text-sm text-foreground">
            Review the quote details before approval or execution.
          </div>
        )}

        {quote && !hasSufficientBalance && (
          <div className="mt-4 border-2 border-danger bg-white px-4 py-3 text-sm text-danger">
            Insufficient {primaryToken?.symbol || 'token'} balance for this deposit amount.
          </div>
        )}

        {isQuoteStale && (
          <div className="mt-4 border-2 border-border bg-card px-4 py-3 text-sm text-foreground">
            Amount changed from {quotedAmount || 'the prepared quote'}. Refresh the quote before
            depositing.
          </div>
        )}

        {isQuoteExpired && (
          <div className="mt-4 border-2 border-danger bg-white px-4 py-3 text-sm text-danger">
            Quote expired. Prepare a new quote before approving or depositing.
          </div>
        )}

        {statusLabel && (
          <div className="mt-4 border-2 border-border bg-card px-4 py-3 text-sm text-foreground">
            {statusLabel}
          </div>
        )}

        {successMessage && (
          <div className="mt-4 border-2 border-success bg-white px-4 py-3 text-sm text-foreground">
            {successMessage}
          </div>
        )}

        {vault.isRedeemable && (
          <div className="mt-5 grid gap-3 border-t-2 border-border pt-5">
            <div className="rounded-none border-2 border-border bg-card px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-head uppercase tracking-[0.18em] text-muted-foreground">
                    Withdraw back to wallet
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    Redeem your vault shares back into {primaryToken?.symbol || 'the deposit token'}.
                  </p>
                </div>
                <span className="retro-badge">
                  {withdrawStatusLabel || (hasVaultShareBalance ? 'Ready to redeem' : 'No shares yet')}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="retro-metric">
                <span className="metric-label">Available shares</span>
                <span className="metric-value">
                  {walletShareBalance.formatted} {shareToken.symbol}
                </span>
              </div>
              <div className="retro-metric">
                <span className="metric-label">Redeem route</span>
                <span className="metric-value">{withdrawRouteLabel}</span>
              </div>
            </div>

            <label className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="field-label">Withdraw amount</span>
                <span className="text-xs text-muted-foreground">
                  In {shareToken.symbol} shares
                </span>
              </div>
              <input
                className="retro-input"
                placeholder={`e.g. ${walletShareBalance.formatted || '0'} ${shareToken.symbol}`}
                value={withdrawAmount}
                onChange={(event) => setWithdrawAmount(event.target.value)}
                inputMode="decimal"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="retro-link"
                  onClick={() => setWithdrawAmount(walletShareBalance.formatted)}
                  disabled={!hasVaultShareBalance}
                >
                  Use full share balance
                </button>
              </div>
            </label>

            {(withdrawError || withdrawQuoteError) && (
              <div className="border-2 border-danger bg-white px-4 py-3 text-sm text-danger">
                {withdrawError || withdrawQuoteError}
              </div>
            )}

            {withdrawSuccessMessage && (
              <div className="border-2 border-success bg-white px-4 py-3 text-sm text-foreground">
                {withdrawSuccessMessage}
              </div>
            )}

            {!hasSufficientWithdrawBalance && withdrawQuote && (
              <div className="border-2 border-danger bg-white px-4 py-3 text-sm text-danger">
                Not enough vault shares for this withdrawal amount.
              </div>
            )}

            {isWithdrawQuoteStale && (
              <div className="border-2 border-border bg-card px-4 py-3 text-sm text-foreground">
                Share amount changed from {quotedWithdrawAmount || 'the prepared route'}. The route
                is refreshing automatically.
              </div>
            )}

            {isWithdrawQuoteExpired && (
              <div className="border-2 border-danger bg-white px-4 py-3 text-sm text-danger">
                Withdrawal route expired. Enter the amount again or wait for it to refresh.
              </div>
            )}

            {withdrawQuote && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="retro-metric">
                  <span className="metric-label">Estimated return</span>
                  <span className="metric-value">
                    {formattedWithdrawAmountOut || 'Checking...'}
                  </span>
                </div>
                <div className="retro-metric">
                  <span className="metric-label">Execute on</span>
                  <span className="metric-value font-mono text-xs">
                    {truncateAddress(withdrawQuoteTargets.transactionTarget || 'Unavailable', 10, 6)}
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              className="retro-button w-full"
              onClick={handleWithdrawAction}
              disabled={
                !withdrawAmount ||
                !withdrawQuote ||
                isWithdrawQuoteLoading ||
                isWithdrawApprovalPending ||
                isWithdrawPending ||
                isWithdrawQuoteExpired ||
                isWithdrawQuoteStale ||
                (!needsWithdrawApproval && !canWithdraw)
              }
            >
              {needsWithdrawApproval
                ? isWithdrawApprovalPending
                  ? 'Approving Shares...'
                  : 'Approve Shares'
                : isWithdrawPending
                  ? 'Withdrawing...'
                  : 'Withdraw to Wallet'}
            </button>

            {(withdrawApprovalHash || withdrawHash) && (
              <div className="grid gap-3">
                {withdrawApprovalHash && (
                  <div className="rounded-none border-2 border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                    Withdraw approval tx:{' '}
                    <span className="font-mono">
                      {truncateAddress(withdrawApprovalHash, 10, 8)}
                    </span>
                  </div>
                )}
                {withdrawHash && (
                  <div className="rounded-none border-2 border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                    Withdraw tx:{' '}
                    <span className="font-mono">{truncateAddress(withdrawHash, 10, 8)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {quote && (
          <div className="mt-5 grid gap-3">
            <div className="rounded-none border-2 border-border bg-accent px-4 py-3">
              <p className="text-[11px] font-head uppercase tracking-[0.18em] text-muted-foreground">
                What happens next
              </p>
              <p className="mt-2 text-sm text-foreground">
                {primaryToken?.symbol || 'Token'} moves through Composer into {vault.name}.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="retro-metric">
                <span className="metric-label">Route type</span>
                <span className="metric-value">{routeType}</span>
              </div>
              <div className="retro-metric">
                <span className="metric-label">Estimated vault output</span>
                <span className="metric-value">
                  {formattedAmountOut || truncateAddress(quote.estimate?.toAmount || 'N/A', 8, 4)}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="retro-metric">
                <span className="metric-label">Quote window</span>
                <span className="metric-value">{quoteWindowLabel}</span>
              </div>
              <div className="retro-metric">
                <span className="metric-label">Execute on</span>
                <span className="metric-value font-mono text-xs">
                  {truncateAddress(quoteTargets.transactionTarget || 'Unavailable', 10, 6)}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="retro-metric">
                <span className="metric-label">From</span>
                <span className="metric-value">
                  {primaryToken?.symbol || 'Token'} on {targetChain?.name || vault.network}
                </span>
              </div>
              <div className="retro-metric">
                <span className="metric-label">To</span>
                <span className="metric-value">{vault.name}</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="retro-metric">
                <span className="metric-label">Approval target</span>
                <span className="metric-value font-mono text-xs">
                  {truncateAddress(quoteTargets.approvalTarget || 'Unavailable', 10, 6)}
                </span>
              </div>
              <div className="retro-metric">
                <span className="metric-label">Tx value</span>
                <span className="metric-value font-mono text-xs">
                  {quoteTargets.transactionValue || '0'}
                </span>
              </div>
            </div>
          </div>
        )}

        {(approvalHash || depositHash) && (
          <div className="mt-5 grid gap-3">
            {approvalHash && (
              <div className="rounded-none border-2 border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                Approval tx: <span className="font-mono">{truncateAddress(approvalHash, 10, 8)}</span>
              </div>
            )}
            {depositHash && (
              <div className="rounded-none border-2 border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                Deposit tx: <span className="font-mono">{truncateAddress(depositHash, 10, 8)}</span>
              </div>
            )}
          </div>
        )}
      </section>
    </aside>
  );
}
