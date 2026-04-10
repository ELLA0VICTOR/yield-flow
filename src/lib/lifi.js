import { COMPOSER_API_BASE, EARN_API_BASE } from './constants';

function getHeaders() {
  const headers = {};
  const apiKey = import.meta.env.VITE_LIFI_API_KEY;

  if (apiKey) {
    headers['x-lifi-api-key'] = apiKey;
  }

  return headers;
}

async function requestJson(url) {
  const response = await fetch(url, {
    headers: getHeaders(),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

export async function fetchVaults(filters) {
  const params = new URLSearchParams();

  if (filters.chainId) {
    params.set('chainId', filters.chainId);
  }
  if (filters.asset) {
    params.set('asset', filters.asset);
  }
  if (filters.minTvlUsd) {
    params.set('minTvlUsd', filters.minTvlUsd);
  }
  if (filters.sortBy) {
    params.set('sortBy', filters.sortBy);
  }
  if (filters.limit) {
    params.set('limit', filters.limit);
  }
  if (filters.cursor) {
    params.set('cursor', filters.cursor);
  }

  return requestJson(`${EARN_API_BASE}/v1/earn/vaults?${params.toString()}`);
}

export async function fetchChains() {
  return requestJson(`${EARN_API_BASE}/v1/earn/chains`);
}

export async function fetchProtocols() {
  return requestJson(`${EARN_API_BASE}/v1/earn/protocols`);
}

export async function fetchPortfolioPositions(address) {
  return requestJson(`${EARN_API_BASE}/v1/earn/portfolio/${address}/positions`);
}

export async function fetchComposerQuote(params) {
  const query = new URLSearchParams(params);
  return requestJson(`${COMPOSER_API_BASE}/v1/quote?${query.toString()}`);
}
