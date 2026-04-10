import { BrowserProvider, Contract, formatUnits, isAddress, ZeroAddress } from 'ethers';

const ERC20_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
];

const ERC4626_ABI = [
  'function previewRedeem(uint256 shares) view returns (uint256)',
  'function redeem(uint256 shares, address receiver, address owner) returns (uint256)',
];

const WALLET_BRANDS = {
  metamask: { name: 'MetaMask', shortLabel: 'MM' },
  rabby: { name: 'Rabby', shortLabel: 'RB' },
  okx: { name: 'OKX Wallet', shortLabel: 'OKX' },
  coinbase: { name: 'Coinbase Wallet', shortLabel: 'CB' },
  phantom: { name: 'Phantom', shortLabel: 'PH' },
  browser: { name: 'Browser Wallet', shortLabel: 'BW' },
};

function getWalletBrand(provider, info = {}) {
  const name = String(info.name || '').toLowerCase();
  const rdns = String(info.rdns || '').toLowerCase();

  if (provider?.isRabby || name.includes('rabby') || rdns.includes('rabby')) {
    return 'rabby';
  }

  if (provider?.isOkxWallet || provider?.isOKExWallet || name.includes('okx') || rdns.includes('okx')) {
    return 'okx';
  }

  if (
    provider?.isCoinbaseWallet ||
    name.includes('coinbase') ||
    rdns.includes('coinbase')
  ) {
    return 'coinbase';
  }

  if (provider?.isPhantom || name.includes('phantom') || rdns.includes('phantom')) {
    return 'phantom';
  }

  if (provider?.isMetaMask || name.includes('metamask') || rdns.includes('metamask')) {
    return 'metamask';
  }

  return 'browser';
}

function normalizeWalletDescriptor(provider, info = {}) {
  const brandKey = getWalletBrand(provider, info);
  const brand = WALLET_BRANDS[brandKey];

  return {
    id: info.rdns || info.uuid || `${brandKey}-${info.name || 'wallet'}`,
    brandKey,
    name: info.name || brand.name,
    shortLabel: brand.shortLabel,
    icon: info.icon || '',
    provider,
  };
}

function getCandidateProviders() {
  if (typeof window === 'undefined') {
    return [];
  }

  const rawProviders = [];
  const injected = window.ethereum;

  if (Array.isArray(injected?.providers)) {
    rawProviders.push(...injected.providers);
  }

  if (injected) {
    rawProviders.push(injected);
  }

  return rawProviders.filter(Boolean);
}

export function hasWalletProvider() {
  return getCandidateProviders().length > 0;
}

export function getBrowserProvider(rawProvider) {
  if (!rawProvider) {
    return null;
  }

  return new BrowserProvider(rawProvider, 'any');
}

export function getInjectedWallets() {
  const wallets = [];
  const seenProviders = new Set();

  getCandidateProviders().forEach((provider) => {
    if (seenProviders.has(provider)) {
      return;
    }

    seenProviders.add(provider);
    wallets.push(normalizeWalletDescriptor(provider));
  });

  return wallets.sort((left, right) => left.name.localeCompare(right.name));
}

export function listenForWalletAnnouncements(onAnnounce) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleAnnounce = (event) => {
    const detail = event.detail || {};
    if (!detail.provider) {
      return;
    }

    onAnnounce(normalizeWalletDescriptor(detail.provider, detail.info));
  };

  window.addEventListener('eip6963:announceProvider', handleAnnounce);
  window.dispatchEvent(new Event('eip6963:requestProvider'));

  return () => {
    window.removeEventListener('eip6963:announceProvider', handleAnnounce);
  };
}

export function isNativeToken(address) {
  return !address || address.toLowerCase() === ZeroAddress.toLowerCase();
}

export function isWalletAddress(value) {
  return isAddress(value);
}

export function toHexChainId(chainId) {
  return `0x${Number(chainId).toString(16)}`;
}

export async function switchOrAddChain(chainConfig, rawProvider) {
  if (!rawProvider) {
    throw new Error('No wallet provider found');
  }

  const chainId = chainConfig?.id ?? chainConfig?.chainId;
  if (!chainId) {
    throw new Error('Missing chain metadata');
  }

  const targetHex = toHexChainId(chainId);

  try {
    await rawProvider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: targetHex }],
    });
  } catch (error) {
    if (error?.code !== 4902 || !chainConfig?.metamask) {
      throw error;
    }

    await rawProvider.request({
      method: 'wallet_addEthereumChain',
      params: [chainConfig.metamask],
    });
  }
}

export async function getTokenBalance({ tokenAddress, account, provider, decimals = 18 }) {
  if (!provider || !account || !tokenAddress || isNativeToken(tokenAddress)) {
    return {
      raw: 0n,
      formatted: '0',
    };
  }

  const contract = new Contract(tokenAddress, ERC20_ABI, provider);
  const balance = await contract.balanceOf(account);

  return {
    raw: balance,
    formatted: formatUnits(balance, decimals),
  };
}

export async function getTokenAllowance({ tokenAddress, owner, spender, provider }) {
  if (!provider || !owner || !spender || !tokenAddress || isNativeToken(tokenAddress)) {
    return 0n;
  }

  const contract = new Contract(tokenAddress, ERC20_ABI, provider);
  return contract.allowance(owner, spender);
}

export async function approveToken({ tokenAddress, spender, amount, signer }) {
  const contract = new Contract(tokenAddress, ERC20_ABI, signer);
  return contract.approve(spender, amount);
}

export async function previewVaultRedeem({ vaultAddress, shares, provider }) {
  if (!provider || !vaultAddress || !shares) {
    return 0n;
  }

  const contract = new Contract(vaultAddress, ERC4626_ABI, provider);
  return contract.previewRedeem(shares);
}

export async function redeemVaultShares({ vaultAddress, shares, receiver, owner, signer }) {
  const contract = new Contract(vaultAddress, ERC4626_ABI, signer);
  return contract.redeem(shares, receiver, owner);
}
