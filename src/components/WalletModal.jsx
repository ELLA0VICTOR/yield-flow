const SUGGESTED_WALLETS = [
  { brandKey: 'metamask', name: 'MetaMask', shortLabel: 'MM' },
  { brandKey: 'rabby', name: 'Rabby', shortLabel: 'RB' },
  { brandKey: 'okx', name: 'OKX Wallet', shortLabel: 'OKX' },
  { brandKey: 'coinbase', name: 'Coinbase Wallet', shortLabel: 'CB' },
];

function mergeWalletOptions(walletOptions) {
  const seenBrands = new Set(walletOptions.map((wallet) => wallet.brandKey));
  const merged = [...walletOptions];

  SUGGESTED_WALLETS.forEach((wallet) => {
    if (!seenBrands.has(wallet.brandKey)) {
      merged.push({
        ...wallet,
        id: wallet.brandKey,
        installed: false,
      });
    }
  });

  return merged.map((wallet) => ({
    ...wallet,
    installed: wallet.installed ?? Boolean(wallet.provider),
  }));
}

export function WalletModal({ open, onClose, walletOptions, isConnecting, onSelect }) {
  if (!open) {
    return null;
  }

  const options = mergeWalletOptions(walletOptions);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
      <div className="retro-panel w-full max-w-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Wallet setup</p>
            <h2 className="mt-2 font-head text-3xl text-foreground">Choose a wallet</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
              Pick an installed wallet to connect. For real funds, always double-check the wallet,
              network, token, and vault before approving.
            </p>
          </div>
          <button type="button" className="retro-button retro-button-secondary" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {options.map((wallet) => (
            <button
              key={wallet.id}
              type="button"
              className={`retro-panel flex items-center gap-4 p-4 text-left transition-transform ${
                wallet.installed ? 'hover:-translate-y-1' : 'opacity-70'
              }`}
              onClick={() => wallet.installed && onSelect(wallet)}
              disabled={!wallet.installed || isConnecting}
            >
              <div className="flex h-14 w-14 items-center justify-center border-2 border-border bg-primary font-head text-sm shadow-retro">
                {wallet.shortLabel}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-head text-xl text-foreground">{wallet.name}</h3>
                  <span
                    className={`retro-badge ${wallet.installed ? 'retro-badge-success' : ''}`}
                  >
                    {wallet.installed ? 'Detected' : 'Not installed'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {wallet.installed
                    ? isConnecting
                      ? 'Waiting for wallet confirmation...'
                      : 'Connect this wallet to continue.'
                    : 'Install this wallet in your browser to use it here.'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
