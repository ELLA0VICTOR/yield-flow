const EARN_PROXY_BASE = '/api/earn';
const QUEST_PROXY_BASE = '/api/quest';

async function requestJson(url) {
  const response = await fetch(url);

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

  return requestJson(`${EARN_PROXY_BASE}/v1/earn/vaults?${params.toString()}`);
}

export async function fetchChains() {
  return requestJson(`${EARN_PROXY_BASE}/v1/earn/chains`);
}

export async function fetchWalletChains() {
  const result = await requestJson(`${QUEST_PROXY_BASE}/v1/chains?chainTypes=EVM`);
  return result.chains || [];
}

export async function fetchProtocols() {
  return requestJson(`${EARN_PROXY_BASE}/v1/earn/protocols`);
}

export async function fetchPortfolioPositions(address) {
  return requestJson(`${EARN_PROXY_BASE}/v1/earn/portfolio/${address}/positions`);
}

export async function fetchComposerQuote(params) {
  const query = new URLSearchParams(params);
  return requestJson(`${QUEST_PROXY_BASE}/v1/quote?${query.toString()}`);
}

export async function fetchComposerStatus({ txHash, fromChain, toChain }) {
  const query = new URLSearchParams({
    txHash,
    fromChain: String(fromChain),
    toChain: String(toChain),
  });

  return requestJson(`${QUEST_PROXY_BASE}/v1/status?${query.toString()}`);
}
