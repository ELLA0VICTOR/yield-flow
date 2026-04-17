const EARN_PROXY_BASE = '/api/earn';
const QUEST_PROXY_BASE = '/api/quest';

function getApiErrorMessage({ status, payload, context }) {
  const message = String(payload?.message || '').toLowerCase();

  if (message.includes('invalid ethereum address')) {
    return 'Enter a valid wallet address to load positions.';
  }

  if (status === 429) {
    return 'LI.FI is rate limiting requests right now. Please try again shortly.';
  }

  if (status === 401) {
    return 'YieldFlow is missing a valid LI.FI API key for this request.';
  }

  if (status === 500 && message.includes('api key')) {
    return 'YieldFlow server configuration is missing the LI.FI API key.';
  }

  if (status === 404 || status === 403 || message.includes('path not allowed')) {
    const byContext = {
      reference: 'YieldFlow could not load LI.FI reference data right now.',
      vaults: 'YieldFlow could not load vaults right now.',
      portfolio: 'YieldFlow could not load portfolio positions right now.',
      quote: 'YieldFlow could not prepare a route right now.',
      status: 'YieldFlow could not check the transaction status right now.',
    };

    return byContext[context] || 'YieldFlow could not reach LI.FI right now.';
  }

  return payload?.message || 'YieldFlow could not complete this request right now.';
}

async function requestJson(url, context = 'reference') {
  const response = await fetch(url);
  const contentType = response.headers.get('content-type') || '';
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getApiErrorMessage({ status: response.status, payload, context }));
  }

  if (payload === null || (!contentType.includes('application/json') && typeof payload !== 'object')) {
    throw new Error('Unexpected response from LI.FI.');
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

  return requestJson(`${EARN_PROXY_BASE}/v1/vaults?${params.toString()}`, 'vaults');
}

export async function fetchChains() {
  return requestJson(`${EARN_PROXY_BASE}/v1/chains`, 'reference');
}

export async function fetchWalletChains() {
  const result = await requestJson(`${QUEST_PROXY_BASE}/v1/chains?chainTypes=EVM`, 'reference');
  return result.chains || [];
}

export async function fetchProtocols() {
  return requestJson(`${EARN_PROXY_BASE}/v1/protocols`, 'reference');
}

export async function fetchPortfolioPositions(address) {
  return requestJson(`${EARN_PROXY_BASE}/v1/portfolio/${address}/positions`, 'portfolio');
}

export async function fetchComposerQuote(params) {
  const query = new URLSearchParams(params);
  return requestJson(`${QUEST_PROXY_BASE}/v1/quote?${query.toString()}`, 'quote');
}

export async function fetchComposerStatus({ txHash, fromChain, toChain }) {
  const query = new URLSearchParams({
    txHash,
    fromChain: String(fromChain),
    toChain: String(toChain),
  });

  return requestJson(`${QUEST_PROXY_BASE}/v1/status?${query.toString()}`, 'status');
}
