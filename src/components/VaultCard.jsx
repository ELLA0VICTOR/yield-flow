import {
  describeApyTrend,
  formatCurrency,
  formatPercent,
  formatRelativeTime,
} from '../lib/formatters';

export function VaultCard({ vault, isSelected, onSelect }) {
  const totalApy = vault.analytics?.apy?.total;
  const averageApy = vault.analytics?.apy30d;

  return (
    <button
      type="button"
      className={`retro-panel group relative flex h-full flex-col overflow-hidden p-5 text-left transition-transform ${
        isSelected ? 'translate-x-1 translate-y-1 bg-accent shadow-none' : 'hover:-translate-y-1'
      }`}
      onClick={() => onSelect(vault)}
    >
      <div className="absolute inset-x-0 top-0 h-3 border-b-2 border-border bg-primary" />
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 mt-2 flex flex-wrap gap-2">
            <span className="retro-badge">{vault.network}</span>
            <span className={`retro-badge ${vault.isTransactional ? 'retro-badge-success' : ''}`}>
              {vault.isTransactional ? 'Deposit ready' : 'Data only'}
            </span>
            {isSelected && <span className="retro-badge">Pinned</span>}
          </div>
          <h3 className="font-head text-xl text-foreground">{vault.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {vault.protocol?.name || 'Unknown protocol'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total APY</p>
          <p className="font-head text-3xl text-foreground">{formatPercent(totalApy)}</p>
        </div>
      </div>

      <p className="min-h-[4.25rem] text-sm leading-7 text-muted-foreground">
        {vault.description ||
          'Normalized vault metadata from LI.FI Earn, ready to compare against APY stability and transactional support.'}
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="retro-metric">
          <span className="metric-label">30d avg</span>
          <span className="metric-value">{formatPercent(averageApy)}</span>
        </div>
        <div className="retro-metric">
          <span className="metric-label">TVL</span>
          <span className="metric-value">{formatCurrency(vault.analytics?.tvl?.usd)}</span>
        </div>
        <div className="retro-metric">
          <span className="metric-label">Yield tone</span>
          <span className="metric-value">{describeApyTrend(totalApy, averageApy)}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {vault.tags?.slice(0, 3).map((tag) => (
          <span key={tag} className="retro-chip">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t-2 border-border pt-4 text-sm text-muted-foreground">
        <span>
          {vault.underlyingTokens?.map((token) => token.symbol).join(', ') || 'Unknown assets'}
        </span>
        <span>Updated {formatRelativeTime(vault.analytics?.updatedAt || vault.syncedAt)}</span>
      </div>
    </button>
  );
}
