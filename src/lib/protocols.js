function normalizeProtocolName(value = '') {
  return String(value || '').trim().toLowerCase();
}

export function hasProtocolNativeExit(vault) {
  const protocolName = normalizeProtocolName(vault?.protocol?.name);
  return !vault?.isRedeemable && (protocolName === 'yo-protocol' || protocolName === 'yo protocol' || protocolName.startsWith('yo'));
}

export function getVaultExitLabel(vault) {
  if (vault?.isRedeemable) {
    return 'LI.FI exit';
  }

  if (hasProtocolNativeExit(vault)) {
    return 'Protocol exit';
  }

  return 'Deposit only';
}
