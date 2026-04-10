import { useMemo, useState } from 'react';
import { useComposerQuote } from '../hooks/useComposerQuote';
import {
  formatCurrency,
  formatPercent,
  formatTimelock,
  parseAmountToUnits,
  truncateAddress,
} from '../lib/formatters';

const DEFAULT_FORM_STATE = {
  walletAddress: '',
  amount: '',
};

export function VaultDetailPanel({ vault }) {
  const { quote, isLoading, error, requestQuote } = useComposerQuote();
  const [formState, setFormState] = useState(DEFAULT_FORM_STATE);
  const [quoteMessage, setQuoteMessage] = useState('');

  const primaryToken = vault?.underlyingTokens?.[0];

  const riskFacts = useMemo(() => {
    if (!vault) {
      return [];
    }

    return [
      { label: 'Deposit caps', value: vault.caps?.maxCap ? 'Present' : 'Not surfaced' },
      { label: 'Time lock', value: formatTimelock(vault.timeLock) },
      { label: 'KYC', value: vault.kyc ? 'Required' : 'Not indicated' },
      { label: 'Redeemable', value: vault.isRedeemable ? 'Yes' : 'No' },
    ];
  }, [vault]);

  if (!vault) {
    return (
      <aside className="retro-panel p-6 lg:sticky lg:top-6">
        <p className="eyebrow">Selected vault</p>
        <h2 className="mt-2 font-head text-3xl text-foreground">Pick a vault</h2>
        <p className="mt-4 text-muted-foreground">Select a vault to view details and quote.</p>
      </aside>
    );
  }

  async function handleQuoteRequest(event) {
    event.preventDefault();
    setQuoteMessage('');

    if (!primaryToken?.address) {
      setQuoteMessage('This vault does not expose a primary underlying token for the preview flow.');
      return;
    }

    try {
      const amount = parseAmountToUnits(formState.amount, primaryToken.decimals || 18);

      await requestQuote({
        fromChain: String(vault.chainId),
        toChain: String(vault.chainId),
        fromToken: primaryToken.address,
        toToken: vault.address,
        fromAddress: formState.walletAddress,
        toAddress: formState.walletAddress,
        fromAmount: amount,
      });
    } catch (requestError) {
      setQuoteMessage(requestError.message || 'Could not prepare quote');
    }
  }

  return (
    <aside className="space-y-5 lg:sticky lg:top-6">
      <section className="retro-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Selected vault</p>
            <h2 className="mt-2 font-head text-3xl text-foreground">{vault.name}</h2>
            <p className="mt-2 text-muted-foreground">{vault.protocol?.name || 'Unknown protocol'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Current APY</p>
            <p className="font-head text-4xl text-foreground">
              {formatPercent(vault.analytics?.apy?.total)}
            </p>
          </div>
        </div>

        <p className="mt-5 text-sm leading-7 text-muted-foreground">
          {vault.description ||
            'No long-form vault description was indexed. Use the analytics, protocol metadata, and risk flags below to judge fit.'}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="retro-metric">
            <span className="metric-label">TVL</span>
            <span className="metric-value">{formatCurrency(vault.analytics?.tvl?.usd)}</span>
          </div>
          <div className="retro-metric">
            <span className="metric-label">30d APY</span>
            <span className="metric-value">{formatPercent(vault.analytics?.apy30d)}</span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {vault.tags?.map((tag) => (
            <span key={tag} className="retro-chip">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-6 grid gap-3">
          {riskFacts.map((fact) => (
            <div
              key={fact.label}
              className="flex items-center justify-between border-b-2 border-dashed border-border pb-3 text-sm"
            >
              <span className="text-muted-foreground">{fact.label}</span>
              <span className="font-medium text-foreground">{fact.value}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-none border-2 border-border bg-accent px-4 py-3 text-sm text-foreground">
          Vault address: <span className="font-mono">{truncateAddress(vault.address, 10, 6)}</span>
        </div>
      </section>

      <section className="retro-panel p-6">
        <p className="eyebrow">Composer preview</p>
        <h3 className="mt-2 font-head text-2xl text-foreground">Quote preview</h3>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Enter a wallet and amount to preview a same-chain deposit quote.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleQuoteRequest}>
          <label className="space-y-2">
            <span className="field-label">Wallet address</span>
            <input
              className="retro-input"
              placeholder="0x..."
              value={formState.walletAddress}
              onChange={(event) =>
                setFormState((current) => ({ ...current, walletAddress: event.target.value }))
              }
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="field-label">Deposit amount</span>
              <input
                className="retro-input"
                placeholder={primaryToken ? `Amount in ${primaryToken.symbol}` : 'Amount'}
                value={formState.amount}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, amount: event.target.value }))
                }
                inputMode="decimal"
              />
            </label>

            <div className="space-y-2">
              <span className="field-label">Source token</span>
              <div className="retro-metric h-full justify-center">
                <span className="metric-value">
                  {primaryToken ? `${primaryToken.symbol} on ${vault.network}` : 'Unavailable'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="retro-button w-full"
            disabled={!vault.isTransactional || isLoading}
          >
            {isLoading
              ? 'Preparing quote...'
              : vault.isTransactional
                ? 'Get Composer quote'
                : 'Deposits unavailable'}
          </button>
        </form>

        {(quoteMessage || error) && (
          <div className="mt-4 border-2 border-danger bg-white px-4 py-3 text-sm text-danger">
            {quoteMessage || error}
          </div>
        )}

        {quote && (
          <div className="mt-5 space-y-3">
            <div className="retro-metric">
              <span className="metric-label">Route type</span>
              <span className="metric-value">
                {quote.action?.fromChainId === quote.action?.toChainId ? 'Same-chain' : 'Cross-chain'}
              </span>
            </div>
            <div className="retro-metric">
              <span className="metric-label">Approval target</span>
              <span className="metric-value font-mono text-xs">
                {truncateAddress(quote.estimate?.approvalAddress || 'Unavailable', 10, 6)}
              </span>
            </div>
            <div className="retro-metric">
              <span className="metric-label">Prepared tx</span>
              <span className="metric-value">
                {quote.transactionRequest ? 'Ready to sign' : 'Missing transactionRequest'}
              </span>
            </div>
            <div className="rounded-none border-2 border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              Next step: connect wallet, approve if needed, and send the transaction request.
            </div>
          </div>
        )}
      </section>
    </aside>
  );
}
