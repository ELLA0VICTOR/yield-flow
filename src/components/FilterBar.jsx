import { STABLE_ASSETS } from '../lib/constants';

export function FilterBar({
  filters,
  chains,
  protocols,
  isLoading,
  onChange,
  onApply,
  onReset,
}) {
  return (
    <section className="retro-panel p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Vault scanner</p>
          <h2 className="font-head text-2xl text-foreground md:text-3xl">Filter vaults</h2>
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">
          Choose a chain, asset, protocol, and sort order.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-6">
        <label className="space-y-2 lg:col-span-1">
          <span className="field-label">Chain</span>
          <select
            className="retro-input"
            value={filters.chainId}
            onChange={(event) => onChange('chainId', event.target.value)}
          >
            <option value="">All indexed chains</option>
            {chains.map((chain) => (
              <option key={chain.chainId} value={String(chain.chainId)}>
                {chain.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 lg:col-span-1">
          <span className="field-label">Asset</span>
          <select
            className="retro-input"
            value={filters.asset}
            onChange={(event) => onChange('asset', event.target.value)}
          >
            <option value="">Any asset</option>
            {STABLE_ASSETS.map((asset) => (
              <option key={asset} value={asset}>
                {asset}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 lg:col-span-1">
          <span className="field-label">Protocol</span>
          <select
            className="retro-input"
            value={filters.protocol}
            onChange={(event) => onChange('protocol', event.target.value)}
          >
            <option value="">All protocols</option>
            {protocols.map((protocol) => (
              <option key={protocol.name} value={protocol.name}>
                {protocol.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 lg:col-span-1">
          <span className="field-label">Sort by</span>
          <select
            className="retro-input"
            value={filters.sortBy}
            onChange={(event) => onChange('sortBy', event.target.value)}
          >
            <option value="apy">Highest APY</option>
            <option value="tvl">Highest TVL</option>
          </select>
        </label>

        <label className="space-y-2 lg:col-span-1">
          <span className="field-label">Min TVL (USD)</span>
          <input
            className="retro-input"
            value={filters.minTvlUsd}
            onChange={(event) => onChange('minTvlUsd', event.target.value)}
            placeholder="100000"
            inputMode="numeric"
          />
        </label>

        <label className="space-y-2 lg:col-span-1">
          <span className="field-label">Search</span>
          <input
            className="retro-input"
            value={filters.search}
            onChange={(event) => onChange('search', event.target.value)}
            placeholder="Morpho, stablecoin, lending"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          Default view: Base + USDC.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="retro-button retro-button-secondary w-full sm:w-auto"
            onClick={onReset}
          >
            Reset
          </button>
          <button
            type="button"
            className="retro-button w-full sm:w-auto"
            onClick={onApply}
            disabled={isLoading}
          >
            {isLoading ? 'Scanning...' : 'Scan vaults'}
          </button>
        </div>
      </div>
    </section>
  );
}
