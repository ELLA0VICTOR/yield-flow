export function formatPercent(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'N/A';
  }

  return `${(Number(value) * 100).toFixed(digits)}%`;
}

export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  const number = Number(value);
  if (Number.isNaN(number)) {
    return 'N/A';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: number >= 1000 ? 0 : 2,
  }).format(number);
}

export function formatRelativeTime(value) {
  if (!value) {
    return 'Unknown';
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return 'Unknown';
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return 'Just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function truncateAddress(value, head = 6, tail = 4) {
  if (!value || value.length <= head + tail) {
    return value || '';
  }

  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

export function formatTimelock(seconds) {
  if (seconds === null || seconds === undefined) {
    return 'N/A';
  }

  if (seconds === 0) {
    return 'None';
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  const minutes = Math.floor(seconds / 60);
  return `${minutes}m`;
}

export function parseAmountToUnits(amount, decimals) {
  const trimmed = String(amount ?? '').trim();

  if (!trimmed || !/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error('Enter a valid deposit amount');
  }

  const [wholePart, fractionalPart = ''] = trimmed.split('.');
  const paddedFraction = fractionalPart.padEnd(decimals, '0').slice(0, decimals);
  const normalized = `${wholePart}${paddedFraction}`.replace(/^0+(?=\d)/, '');

  return normalized || '0';
}

export function describeApyTrend(currentApy, averageApy) {
  if (currentApy === null || averageApy === null || averageApy === undefined) {
    return 'Limited history';
  }

  const delta = Number(currentApy) - Number(averageApy);

  if (delta > 0.015) {
    return 'Running hot';
  }

  if (delta < -0.01) {
    return 'Below average';
  }

  return 'Fairly steady';
}
