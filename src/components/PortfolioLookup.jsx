import { useState } from 'react';
import { usePortfolioLookup } from '../hooks/usePortfolioLookup';
import { formatCurrency, truncateAddress } from '../lib/formatters';

export function PortfolioLookup() {
  const [walletAddress, setWalletAddress] = useState('');
  const { positions, isLoading, error, lookup } = usePortfolioLookup();

  const totalBalance = positions.reduce((sum, position) => sum + Number(position.balanceUsd || 0), 0);

  async function handleSubmit(event) {
    event.preventDefault();
    await lookup(walletAddress);
  }

  return (
    <section className="retro-panel p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Portfolio view</p>
          <h2 className="font-head text-2xl text-foreground md:text-3xl">Check positions</h2>
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">
          Paste a wallet address to see Earn positions.
        </p>
      </div>

      <form className="grid gap-4 md:grid-cols-[1fr_auto]" onSubmit={handleSubmit}>
        <input
          className="retro-input"
          placeholder="Paste a wallet address"
          value={walletAddress}
          onChange={(event) => setWalletAddress(event.target.value)}
        />
        <button type="submit" className="retro-button" disabled={isLoading}>
          {isLoading ? 'Checking...' : 'Load positions'}
        </button>
      </form>

      {error && (
        <div className="mt-4 border-2 border-danger bg-white px-4 py-3 text-sm text-danger">{error}</div>
      )}

      {positions.length > 0 && (
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="retro-metric">
            <span className="metric-label">Positions</span>
            <span className="metric-value">{positions.length}</span>
          </div>
          <div className="retro-metric">
            <span className="metric-label">Tracked value</span>
            <span className="metric-value">{formatCurrency(totalBalance)}</span>
          </div>
          <div className="retro-metric">
            <span className="metric-label">Wallet</span>
            <span className="metric-value">{truncateAddress(walletAddress, 8, 6)}</span>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {positions.map((position, index) => (
          <article key={`${position.asset.address}-${index}`} className="retro-panel bg-card p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-head text-xl text-foreground">{position.asset.symbol}</h3>
                <p className="text-sm text-muted-foreground">{position.protocolName}</p>
              </div>
              <span className="retro-badge">{position.chainId}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="retro-metric">
                <span className="metric-label">Balance USD</span>
                <span className="metric-value">{formatCurrency(position.balanceUsd)}</span>
              </div>
              <div className="retro-metric">
                <span className="metric-label">Native balance</span>
                <span className="metric-value font-mono text-xs">{position.balanceNative}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
