const FALLBACK_STORAGE_KEY = 'yieldflow:fallback-positions';

export function buildFallbackVaultPosition({ vault, walletAddress, shareBalance }) {
  if (
    !vault?.address ||
    !walletAddress ||
    !shareBalance ||
    BigInt(shareBalance.raw || 0) <= 0n
  ) {
    return null;
  }

  return {
    walletAddress,
    source: 'onchain',
    chainId: Number(vault.chainId),
    protocolName: vault.protocol?.name || 'Unknown protocol',
    asset: {
      address: vault.address,
      name: vault.name,
      symbol: shareBalance.symbol || vault.lpTokens?.[0]?.symbol || vault.name,
      decimals: shareBalance.decimals ?? vault.lpTokens?.[0]?.decimals ?? 18,
    },
    balanceUsd: '',
    balanceNative: shareBalance.raw?.toString?.() || '0',
    balanceFormatted: shareBalance.formatted || '0',
  };
}

function readStoredFallbackPositions() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(FALLBACK_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredFallbackPositions(positions) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(positions));
}

export function getStoredFallbackPositions(walletAddress = '') {
  const normalizedWallet = String(walletAddress || '').toLowerCase();

  if (!normalizedWallet) {
    return [];
  }

  return readStoredFallbackPositions().filter(
    (position) => position.walletAddress?.toLowerCase?.() === normalizedWallet
  );
}

export function upsertStoredFallbackPosition(position) {
  if (!position?.walletAddress || !position?.asset?.address) {
    return;
  }

  const positions = readStoredFallbackPositions();
  const nextKey = `${position.walletAddress.toLowerCase()}-${position.chainId}-${position.asset.address.toLowerCase()}`;
  const nextPositions = positions.filter((entry) => {
    const entryKey = `${entry.walletAddress?.toLowerCase?.() || ''}-${entry.chainId}-${entry.asset?.address?.toLowerCase?.() || ''}`;
    return entryKey !== nextKey;
  });

  nextPositions.push(position);
  writeStoredFallbackPositions(nextPositions);
}

export function removeStoredFallbackPosition({ walletAddress, chainId, assetAddress }) {
  if (!walletAddress || !assetAddress) {
    return;
  }

  const nextKey = `${walletAddress.toLowerCase()}-${chainId}-${assetAddress.toLowerCase()}`;
  const nextPositions = readStoredFallbackPositions().filter((entry) => {
    const entryKey = `${entry.walletAddress?.toLowerCase?.() || ''}-${entry.chainId}-${entry.asset?.address?.toLowerCase?.() || ''}`;
    return entryKey !== nextKey;
  });

  writeStoredFallbackPositions(nextPositions);
}
