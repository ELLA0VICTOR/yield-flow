import { useEffect, useMemo, useState } from 'react';
import { usePortfolioLookup } from '../hooks/usePortfolioLookup';
import { formatCurrency, truncateAddress } from '../lib/formatters';
import { getStoredFallbackPositions } from '../lib/positions';

const AUTO_RETRY_DELAY_MS = 4000;
const AUTO_RETRY_ATTEMPTS = 6;

export function PortfolioLookup({
  connectedAccount = '',
  autoAddress = '',
  refreshToken = 0,
}) {
  const [walletAddress, setWalletAddress] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const { positions, isLoading, error, lookup } = usePortfolioLookup();
  const activeAddress = useMemo(
    () => walletAddress || autoAddress || connectedAccount,
    [autoAddress, connectedAccount, walletAddress]
  );
  const storedFallbackPositions = useMemo(() => {
    void refreshToken;
    return getStoredFallbackPositions(activeAddress);
  }, [activeAddress, refreshToken]);

  const displayPositions = useMemo(() => {
    if (storedFallbackPositions.length === 0) {
      return positions;
    }

    const knownKeys = new Set(
      positions.map(
        (position) =>
          `${Number(position.chainId)}-${position.asset?.address?.toLowerCase?.() || ''}`
      )
    );

    const nextPositions = [...positions];

    storedFallbackPositions.forEach((position) => {
      const nextKey = `${Number(position.chainId)}-${position.asset?.address?.toLowerCase?.() || ''}`;
      if (!knownKeys.has(nextKey)) {
        nextPositions.push(position);
      }
    });

    return nextPositions;
  }, [positions, storedFallbackPositions]);

  const totalBalance = displayPositions.reduce(
    (sum, position) => sum + Number(position.balanceUsd || 0),
    0
  );

  useEffect(() => {
    if (!autoAddress || !refreshToken) {
      return;
    }

    let cancelled = false;

    async function lookupFreshPosition() {
      setWalletAddress(autoAddress);
      setStatusMessage('Checking for your latest vault position...');

      for (let attempt = 0; attempt < AUTO_RETRY_ATTEMPTS; attempt += 1) {
        const nextPositions = await lookup(autoAddress);

        if (cancelled) {
          return;
        }

        if (nextPositions.length > 0) {
          setStatusMessage('Portfolio updated.');
          return;
        }

        if (getStoredFallbackPositions(autoAddress).length > 0) {
          setStatusMessage('Showing your on-chain fallback position while LI.FI indexing catches up.');
          return;
        }

        if (attempt < AUTO_RETRY_ATTEMPTS - 1) {
          await new Promise((resolve) => window.setTimeout(resolve, AUTO_RETRY_DELAY_MS));
        }
      }

      if (!cancelled) {
        setStatusMessage(
          'Deposit is confirmed, but the LI.FI portfolio view may still be indexing. Try again shortly.'
        );
      }
    }

    void lookupFreshPosition();

    return () => {
      cancelled = true;
    };
  }, [autoAddress, lookup, refreshToken]);

  async function handleSubmit(event) {
    event.preventDefault();
    const nextPositions = await lookup(activeAddress);
    setStatusMessage(
      nextPositions.length > 0
        ? 'Portfolio updated.'
        : getStoredFallbackPositions(activeAddress).length > 0
          ? 'Showing your on-chain fallback position while LI.FI indexing catches up.'
          : 'No positions found yet. If you just deposited, indexing may still be catching up.'
    );
  }

  async function handleUseConnectedWallet() {
    if (!connectedAccount) {
      return;
    }

    setWalletAddress(connectedAccount);
    const nextPositions = await lookup(connectedAccount);
    setStatusMessage(
      nextPositions.length > 0
        ? 'Portfolio updated.'
        : getStoredFallbackPositions(connectedAccount).length > 0
          ? 'Showing your on-chain fallback position while LI.FI indexing catches up.'
          : 'No positions found yet. If you just deposited, indexing may still be catching up.'
    );
  }

  return (
    <section className="retro-panel p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Portfolio view</p>
          <h2 className="font-head text-2xl text-foreground md:text-3xl">Check positions</h2>
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">
          Use the connected wallet or paste any address to see Earn positions.
        </p>
      </div>

      <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]" onSubmit={handleSubmit}>
        <input
          className="retro-input"
          placeholder="Paste a wallet address"
          value={walletAddress}
          onChange={(event) => setWalletAddress(event.target.value)}
        />
        <div className="flex flex-col gap-3 md:min-w-[300px] sm:flex-row">
          {connectedAccount && (
            <button
              type="button"
              className="retro-button retro-button-secondary w-full sm:w-auto"
              onClick={() => void handleUseConnectedWallet()}
            >
              Use Connected Wallet
            </button>
          )}
          <button type="submit" className="retro-button w-full sm:w-auto" disabled={isLoading}>
            {isLoading ? 'Checking...' : 'Load positions'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 border-2 border-danger bg-white px-4 py-3 text-sm text-danger">{error}</div>
      )}

      {statusMessage && !error && (
        <div className="mt-4 border-2 border-border bg-card px-4 py-3 text-sm text-foreground">
          {statusMessage}
        </div>
      )}

      {displayPositions.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="retro-metric">
            <span className="metric-label">Positions</span>
            <span className="metric-value">{displayPositions.length}</span>
          </div>
          <div className="retro-metric">
            <span className="metric-label">Tracked value</span>
            <span className="metric-value">{formatCurrency(totalBalance)}</span>
          </div>
          <div className="retro-metric">
            <span className="metric-label">Wallet</span>
            <span className="metric-value">
              {truncateAddress(activeAddress, 8, 6)}
            </span>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {displayPositions.map((position, index) => (
          <article key={`${position.asset.address}-${index}`} className="retro-panel bg-card p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-head text-xl text-foreground">{position.asset.symbol}</h3>
                <p className="text-sm text-muted-foreground">{position.protocolName}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {position.source === 'onchain' && <span className="retro-badge">Synced locally</span>}
                <span className="retro-badge">{position.chainId}</span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="retro-metric">
                <span className="metric-label">
                  {position.source === 'onchain' ? 'Vault shares' : 'Balance USD'}
                </span>
                <span className="metric-value">
                  {position.source === 'onchain'
                    ? `${position.balanceFormatted} ${position.asset.symbol}`
                    : formatCurrency(position.balanceUsd)}
                </span>
              </div>
              <div className="retro-metric">
                <span className="metric-label">
                  {position.source === 'onchain' ? 'Receipt token' : 'Native balance'}
                </span>
                <span className="metric-value font-mono text-xs">
                  {position.source === 'onchain'
                    ? truncateAddress(position.asset.address, 8, 6)
                    : position.balanceNative}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>

      {!isLoading && !error && displayPositions.length === 0 && activeAddress && !statusMessage && (
        <div className="mt-5 border-2 border-border bg-white px-4 py-3 text-sm text-muted-foreground">
          No positions are visible yet for this address. If you just deposited, give LI.FI a little
          time to index the vault position and try again.
        </div>
      )}
    </section>
  );
}
