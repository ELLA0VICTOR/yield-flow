import { useMemo, useState } from 'react';
import { FilterBar } from './components/FilterBar';
import { PortfolioLookup } from './components/PortfolioLookup';
import { VaultCard } from './components/VaultCard';
import { VaultDetailPanel } from './components/VaultDetailPanel';
import { useVaultExplorer } from './hooks/useVaultExplorer';
import { DEFAULT_VAULT_FILTERS, LANDING_CARDS, NAV_ITEMS } from './lib/constants';
import { formatPercent } from './lib/formatters';

function App() {
  const [draftFilters, setDraftFilters] = useState(DEFAULT_VAULT_FILTERS);
  const [activeFilters, setActiveFilters] = useState(DEFAULT_VAULT_FILTERS);
  const [selectedVaultKey, setSelectedVaultKey] = useState('');

  const {
    chains,
    protocols,
    vaults,
    total,
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
    if (visibleVaults.length === 0) {
      return null;
    }

    const matchingVault = visibleVaults.find(
      (vault) => `${vault.chainId}-${vault.address.toLowerCase()}` === selectedVaultKey
    );

    return matchingVault || visibleVaults[0];
  }, [selectedVaultKey, visibleVaults]);

  function updateDraftFilter(key, value) {
    setDraftFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function applyFilters() {
    setActiveFilters((current) => ({
      ...current,
      chainId: draftFilters.chainId,
      asset: draftFilters.asset,
      minTvlUsd: draftFilters.minTvlUsd,
      sortBy: draftFilters.sortBy,
      limit: draftFilters.limit,
    }));
  }

  function resetFilters() {
    setDraftFilters(DEFAULT_VAULT_FILTERS);
    setActiveFilters(DEFAULT_VAULT_FILTERS);
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

          <a href="#explore" className="retro-button">
            Explore Vaults
          </a>
        </div>
      </nav>

      <header className="section-band">
        <div className="section-inner py-16 text-center md:py-20">
          <div className="mx-auto inline-flex items-center gap-2 border-2 border-border bg-card px-4 py-2 shadow-retro">
            <span className="font-head text-xs uppercase tracking-[0.16em] text-foreground">
              LI.FI Earn
            </span>
            <span className="text-xs text-muted-foreground">Yield Builder</span>
          </div>

          <h1 className="hero-title">
            Discover the best stablecoin yield.
            <br />
            Deposit in one click.
          </h1>

          <p className="hero-copy">
            Compare vaults, preview Composer deposits, and check positions without jumping across
            protocols or chains.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#explore" className="retro-button">
              Browse Vaults
            </a>
            <a href="#portfolio" className="retro-button retro-button-secondary">
              View Portfolio
            </a>
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-3">
            <div className="retro-metric text-left">
              <span className="metric-label">Vaults loaded</span>
              <span className="metric-value">{visibleVaults.length}</span>
            </div>
            <div className="retro-metric text-left">
              <span className="metric-label">Deposit ready</span>
              <span className="metric-value">{stats.depositableShare}</span>
            </div>
            <div className="retro-metric text-left">
              <span className="metric-label">Average APY</span>
              <span className="metric-value">{stats.averageApy}</span>
            </div>
          </div>
        </div>
      </header>

      <section id="why" className="section-band">
        <div className="section-inner py-12">
          <div className="section-heading">
            <p className="eyebrow">Why YieldFlow</p>
            <h2 className="section-title">Simple, clear, and useful.</h2>
            <p className="section-copy">
              The product should feel obvious: scan vaults, compare quickly, and move into deposit
              only when the user is ready.
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
              Filter the live feed, compare vaults side by side, and open a quote preview for the
              one you want.
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

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
            <div className="space-y-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h2 className="font-head text-3xl text-foreground">Live Vaults</h2>
                <p className="text-sm text-muted-foreground">
                  Showing {visibleVaults.length} of {total}
                </p>
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
                <div className="grid gap-4 lg:grid-cols-2">
                  {visibleVaults.map((vault) => (
                    <VaultCard
                      key={`${vault.chainId}-${vault.address}`}
                      vault={vault}
                      isSelected={
                        selectedVaultKey === `${vault.chainId}-${vault.address.toLowerCase()}`
                      }
                      onSelect={(nextVault) =>
                        setSelectedVaultKey(
                          `${nextVault.chainId}-${nextVault.address.toLowerCase()}`
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            <VaultDetailPanel
              key={
                selectedVault
                  ? `${selectedVault.chainId}-${selectedVault.address.toLowerCase()}`
                  : 'empty'
              }
              vault={selectedVault}
            />
          </div>
        </div>
      </section>

      <section id="portfolio" className="section-band">
        <div className="section-inner py-12">
          <div className="section-heading">
            <p className="eyebrow">Portfolio</p>
            <h2 className="section-title">Check positions after deposit.</h2>
            <p className="section-copy">
              Paste a wallet address and confirm what the Earn portfolio endpoint sees.
            </p>
          </div>

          <div className="mt-8">
            <PortfolioLookup />
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
