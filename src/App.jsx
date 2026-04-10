import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FilterBar } from './components/FilterBar';
import { PortfolioLookup } from './components/PortfolioLookup';
import { ToastNotice } from './components/ToastNotice';
import { VaultCard } from './components/VaultCard';
import { VaultDetailPanel } from './components/VaultDetailPanel';
import { WalletModal } from './components/WalletModal';
import { useVaultExplorer } from './hooks/useVaultExplorer';
import { useWallet } from './hooks/useWallet';
import { DEFAULT_VAULT_FILTERS, LANDING_CARDS, NAV_ITEMS } from './lib/constants';
import { formatCurrency, formatPercent, truncateAddress } from './lib/formatters';
import {
  removeStoredFallbackPosition,
  upsertStoredFallbackPosition,
} from './lib/positions';

function App() {
  const pageSize = 18;
  const [draftFilters, setDraftFilters] = useState(DEFAULT_VAULT_FILTERS);
  const [activeFilters, setActiveFilters] = useState(DEFAULT_VAULT_FILTERS);
  const [selectedVaultKey, setSelectedVaultKey] = useState('');
  const [portfolioAutoAddress, setPortfolioAutoAddress] = useState('');
  const [portfolioRefreshToken, setPortfolioRefreshToken] = useState(0);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [currentVaultPage, setCurrentVaultPage] = useState(1);
  const depositStudioRef = useRef(null);
  const portfolioSectionRef = useRef(null);
  const pendingScrollKeyRef = useRef('');
  const wallet = useWallet();

  const {
    chains,
    walletChains,
    protocols,
    vaults,
    isReferenceLoading,
    isVaultLoading,
    error,
  } = useVaultExplorer(activeFilters);

  const visibleVaults = useMemo(() => {
    const searchQuery = draftFilters.search.trim().toLowerCase();
    const protocolQuery = draftFilters.protocol;

    return vaults.filter((vault) => {
      const matchesProtocol = !protocolQuery || vault.protocol?.name === protocolQuery;

      if (!searchQuery) {
        return matchesProtocol;
      }

      const haystack = [
        vault.name,
        vault.protocol?.name,
        vault.network,
        ...(vault.tags || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesProtocol && haystack.includes(searchQuery);
    });
  }, [draftFilters.protocol, draftFilters.search, vaults]);

  const totalVaultPages = Math.max(1, Math.ceil(visibleVaults.length / pageSize));
  const visibleVaultPage = Math.min(currentVaultPage, totalVaultPages);

  const paginatedVaults = useMemo(() => {
    const startIndex = (visibleVaultPage - 1) * pageSize;
    return visibleVaults.slice(startIndex, startIndex + pageSize);
  }, [pageSize, visibleVaultPage, visibleVaults]);

  const stats = useMemo(() => {
    if (visibleVaults.length === 0) {
      return {
        depositableShare: '0',
        averageApy: '0%',
      };
    }

    const depositableCount = visibleVaults.filter((vault) => vault.isTransactional).length;
    const totalApy = visibleVaults.reduce(
      (sum, vault) => sum + Number(vault.analytics?.apy?.total || 0),
      0
    );

    return {
      depositableShare: `${Math.round((depositableCount / visibleVaults.length) * 100)}%`,
      averageApy: formatPercent(totalApy / visibleVaults.length),
    };
  }, [visibleVaults]);

  const selectedVault = useMemo(() => {
    const matchingVault = visibleVaults.find(
      (vault) => `${vault.chainId}-${vault.address.toLowerCase()}` === selectedVaultKey
    );

    return matchingVault || null;
  }, [selectedVaultKey, visibleVaults]);

  const featuredVault = selectedVault || paginatedVaults[0] || visibleVaults[0] || null;

  const connectedWalletChain = useMemo(
    () => walletChains.find((chain) => Number(chain.id) === Number(wallet.chainId)) || null,
    [wallet.chainId, walletChains]
  );

  useEffect(() => {
    if (!selectedVault) {
      return;
    }

    if (
      `${selectedVault.chainId}-${selectedVault.address.toLowerCase()}` !==
      pendingScrollKeyRef.current
    ) {
      return;
    }

    requestAnimationFrame(() => {
      depositStudioRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    pendingScrollKeyRef.current = '';
  }, [selectedVault]);

  function updateDraftFilter(key, value) {
    setDraftFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function applyFilters() {
    setCurrentVaultPage(1);
    setActiveFilters((current) => ({
      ...current,
      chainId: draftFilters.chainId,
      asset: draftFilters.asset,
      minTvlUsd: draftFilters.minTvlUsd,
      sortBy: draftFilters.sortBy,
      limit: draftFilters.limit,
    }));
  }

  function clearSelectedVault() {
    setSelectedVaultKey('');
    pendingScrollKeyRef.current = '';
  }

  function resetFilters() {
    setCurrentVaultPage(1);
    clearSelectedVault();
    setDraftFilters(DEFAULT_VAULT_FILTERS);
    setActiveFilters(DEFAULT_VAULT_FILTERS);
  }

  function openDepositStudio(nextVault) {
    if (!nextVault) {
      return;
    }

    const nextKey = `${nextVault.chainId}-${nextVault.address.toLowerCase()}`;
    const selectedIndex = visibleVaults.findIndex(
      (vault) => `${vault.chainId}-${vault.address.toLowerCase()}` === nextKey
    );

    setSelectedVaultKey(nextKey);
    pendingScrollKeyRef.current = nextKey;

    if (selectedIndex >= 0) {
      setCurrentVaultPage(Math.floor(selectedIndex / pageSize) + 1);
    }
  }

  function handleVaultSelection(nextVault) {
    const nextKey = `${nextVault.chainId}-${nextVault.address.toLowerCase()}`;

    if (selectedVaultKey === nextKey) {
      clearSelectedVault();
      return;
    }

    openDepositStudio(nextVault);
  }

  const handleDepositSuccess = useCallback((address, fallbackPosition = null) => {
    if (!address) {
      return;
    }

    setPortfolioAutoAddress(address);
    if (fallbackPosition) {
      upsertStoredFallbackPosition(fallbackPosition);
    } else if (selectedVault) {
      removeStoredFallbackPosition({
        walletAddress: address,
        chainId: selectedVault.chainId,
        assetAddress: selectedVault.address,
      });
    }
    setPortfolioRefreshToken((current) => current + 1);

    requestAnimationFrame(() => {
      portfolioSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, [selectedVault]);

  const handlePositionProofChange = useCallback((nextPosition) => {
    if (!wallet.account || !selectedVault) {
      return;
    }

    if (nextPosition) {
      upsertStoredFallbackPosition(nextPosition);
    } else {
      removeStoredFallbackPosition({
        walletAddress: wallet.account,
        chainId: selectedVault.chainId,
        assetAddress: selectedVault.address,
      });
    }

    setPortfolioRefreshToken((current) => current + 1);
  }, [selectedVault, wallet.account]);

  async function handleWalletSelection(option) {
    try {
      await wallet.connectWallet(option.id);
      setIsWalletModalOpen(false);
    } catch {
      setIsWalletModalOpen(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="site-nav">
        <div className="section-inner flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center border-2 border-border bg-primary font-head text-base shadow-retro">
              YF
            </div>
            <div>
              <p className="font-head text-xl uppercase tracking-[0.14em] text-foreground">
                YieldFlow
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {NAV_ITEMS.map((item) => (
              <a key={item.href} href={item.href} className="retro-link">
                {item.label}
              </a>
            ))}
          </div>

          {wallet.isConnected ? (
            <div className="flex items-center gap-3">
              <div className="hidden border-2 border-border bg-card px-3 py-2 shadow-retro sm:block">
                <p className="text-[11px] font-head uppercase tracking-[0.16em] text-muted-foreground">
                  {wallet.activeWallet?.name || connectedWalletChain?.name || 'Connected'}
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {truncateAddress(wallet.account, 6, 4)}
                </p>
              </div>
              <button type="button" className="retro-button" onClick={wallet.refreshWallet}>
                Connected
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="retro-button"
              onClick={() => setIsWalletModalOpen(true)}
              disabled={wallet.isConnecting}
            >
              {wallet.isConnecting
                ? 'Connecting...'
                : wallet.hasProvider
                  ? 'Connect Wallet'
                  : 'Select Wallet'}
            </button>
          )}
        </div>
      </nav>

      <header className="section-band">
        <div className="section-inner py-14 md:py-18">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 border-2 border-border bg-card px-4 py-2 shadow-retro">
              <span className="font-head text-xs uppercase tracking-[0.16em] text-foreground">
                LI.FI Earn
              </span>
              <span className="text-xs text-muted-foreground">Yield Builder</span>
            </div>

            <h1 className="hero-title motion-rise">
              Discover the best stablecoin yield.
              <br />
              Deposit in one click.
            </h1>

            <p className="hero-copy motion-rise-delay">
              Compare live vaults, preview the deposit route, and confirm the resulting position in
              one place.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href="#explore" className="retro-button">
                Browse Vaults
              </a>
              <a href="#portfolio" className="retro-button retro-button-secondary">
                View Portfolio
              </a>
            </div>

            <div className="mx-auto mt-8 grid max-w-3xl gap-4 text-left md:grid-cols-3">
              <div className="retro-metric">
                <span className="metric-label">Vaults loaded</span>
                <span className="metric-value">{visibleVaults.length}</span>
              </div>
              <div className="retro-metric">
                <span className="metric-label">Deposit ready</span>
                <span className="metric-value">{stats.depositableShare}</span>
              </div>
              <div className="retro-metric">
                <span className="metric-label">Average APY</span>
                <span className="metric-value">{stats.averageApy}</span>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-5xl motion-rise-delay">
            <div className="retro-panel p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="text-left">
                  <p className="eyebrow">Featured vault</p>
                  <h2 className="mt-2 font-head text-2xl text-foreground">Top pick right now</h2>
                </div>
                {featuredVault?.isTransactional && (
                  <span className="retro-badge retro-badge-success self-start">Deposit ready</span>
                )}
              </div>

              {featuredVault ? (
                <>
                  <div className="mt-5 flex flex-col gap-4 text-left md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="font-head text-3xl text-foreground">{featuredVault.name}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {featuredVault.protocol?.name || 'Unknown protocol'} on {featuredVault.network}
                      </p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">APY</p>
                      <p className="font-head text-4xl text-foreground">
                        {formatPercent(featuredVault.analytics?.apy?.total)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="retro-metric">
                      <span className="metric-label">30d avg</span>
                      <span className="metric-value">
                        {formatPercent(featuredVault.analytics?.apy30d)}
                      </span>
                    </div>
                    <div className="retro-metric">
                      <span className="metric-label">TVL</span>
                      <span className="metric-value">
                        {formatCurrency(featuredVault.analytics?.tvl?.usd)}
                      </span>
                    </div>
                    <div className="retro-metric">
                      <span className="metric-label">Deposit token</span>
                      <span className="metric-value">
                        {featuredVault.underlyingTokens?.[0]?.symbol || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 text-left sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Same-chain demo path: {featuredVault.network} +{' '}
                      {featuredVault.underlyingTokens?.[0]?.symbol || 'stablecoin'}
                    </p>
                    <button
                      type="button"
                      className="retro-button"
                      onClick={() => openDepositStudio(featuredVault)}
                    >
                      Open Deposit Studio
                    </button>
                  </div>
                </>
              ) : (
                <p className="mt-5 text-left text-sm text-muted-foreground">
                  Loading a featured vault from LI.FI Earn.
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <section id="why" className="section-band">
        <div className="section-inner py-12">
          <div className="section-heading">
            <p className="eyebrow">Why YieldFlow</p>
            <h2 className="section-title">Simple, clear, and ready to use.</h2>
            <p className="section-copy">
              The flow stays focused: scan, compare, quote, and deposit without bouncing between
              protocol pages.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {LANDING_CARDS.map((card) => (
              <article key={card.title} className="retro-panel p-6">
                <p className="eyebrow">{card.eyebrow}</p>
                <h3 className="mt-3 font-head text-2xl text-foreground">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="explore" className="section-band">
        <div className="section-inner py-12">
          <div className="section-heading">
            <p className="eyebrow">Explorer</p>
            <h2 className="section-title">Choose a vault with confidence.</h2>
            <p className="section-copy">
              Filter the live feed, compare vaults clearly, and open the deposit studio below.
            </p>
          </div>

          <div className="mt-8">
            <FilterBar
              filters={draftFilters}
              chains={chains}
              protocols={protocols}
              isLoading={isVaultLoading || isReferenceLoading}
              onChange={updateDraftFilter}
              onApply={applyFilters}
              onReset={resetFilters}
            />
          </div>

          <div className="mt-8 space-y-8">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="font-head text-3xl text-foreground">Live Vaults</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Pick any card to jump straight into the deposit flow below.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="retro-metric">
                  <span className="metric-label">Page</span>
                  <span className="metric-value">
                    {visibleVaultPage} of {totalVaultPages}
                  </span>
                </div>
                <div className="retro-metric">
                  <span className="metric-label">Selected</span>
                  <span className="metric-value">{selectedVault?.name || 'None'}</span>
                </div>
                <div className="retro-metric">
                  <span className="metric-label">Exit path</span>
                  <span className="metric-value">
                    {selectedVault
                      ? selectedVault.isRedeemable
                        ? 'Redeemable: Yes'
                        : 'Redeemable: No'
                      : 'Select a vault'}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="border-2 border-danger bg-white px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            {isVaultLoading ? (
              <div className="retro-panel p-10 text-center text-muted-foreground">
                Loading vaults...
              </div>
            ) : visibleVaults.length === 0 ? (
              <div className="retro-panel p-10 text-center">
                <h3 className="font-head text-2xl text-foreground">No vaults found.</h3>
                <p className="mt-3 text-muted-foreground">
                  Try a wider chain, asset, or TVL range.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                  {paginatedVaults.map((vault) => (
                    <VaultCard
                      key={`${vault.chainId}-${vault.address}`}
                      vault={vault}
                      isSelected={
                        selectedVaultKey === `${vault.chainId}-${vault.address.toLowerCase()}`
                      }
                      onSelect={handleVaultSelection}
                    />
                  ))}
                </div>

                {visibleVaults.length > pageSize && (
                  <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                    <button
                      type="button"
                      className="retro-button retro-button-secondary"
                      onClick={() => setCurrentVaultPage((current) => Math.max(1, current - 1))}
                      disabled={visibleVaultPage === 1}
                    >
                      Previous
                    </button>
                    <div className="text-sm text-muted-foreground">
                      Showing {(visibleVaultPage - 1) * pageSize + 1}-
                      {Math.min(visibleVaultPage * pageSize, visibleVaults.length)} of{' '}
                      {visibleVaults.length}
                    </div>
                    <button
                      type="button"
                      className="retro-button"
                      onClick={() =>
                        setCurrentVaultPage((current) => Math.min(totalVaultPages, current + 1))
                      }
                      disabled={visibleVaultPage === totalVaultPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}

            <div id="selected-vault" ref={depositStudioRef} className="space-y-4">
              <div className="section-heading max-w-none">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="eyebrow">Selected vault</p>
                    <h3 className="section-title">Review and deposit.</h3>
                    <p className="section-copy">
                      Picking a vault jumps you here. Click the same card again to clear it.
                    </p>
                  </div>
                  {selectedVault && (
                    <button
                      type="button"
                      className="retro-button retro-button-secondary"
                      onClick={clearSelectedVault}
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
              </div>

              <VaultDetailPanel
                key={
                  selectedVault
                    ? `${selectedVault.chainId}-${selectedVault.address.toLowerCase()}`
                    : 'empty'
                }
                vault={selectedVault}
                wallet={wallet}
                walletChains={walletChains}
                onDepositSuccess={handleDepositSuccess}
                onPositionProofChange={handlePositionProofChange}
                onOpenWalletModal={() => setIsWalletModalOpen(true)}
              />
            </div>
          </div>
        </div>
      </section>

      <section id="portfolio" ref={portfolioSectionRef} className="section-band">
        <div className="section-inner py-12">
          <div className="section-heading">
            <p className="eyebrow">Portfolio</p>
            <h2 className="section-title">Check positions after deposit.</h2>
            <p className="section-copy">
              Use the same wallet or any address to confirm what the Earn portfolio endpoint sees.
            </p>
          </div>

          <div className="mt-8">
            <PortfolioLookup
              connectedAccount={wallet.account}
              autoAddress={portfolioAutoAddress}
              refreshToken={portfolioRefreshToken}
            />
          </div>
        </div>
      </section>

      <WalletModal
        open={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        walletOptions={wallet.walletOptions}
        isConnecting={wallet.isConnecting}
        onSelect={handleWalletSelection}
      />

      <ToastNotice notice={wallet.notice} onClose={wallet.dismissNotice} />
    </div>
  );
}

export default App;
