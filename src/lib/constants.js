export const EARN_API_BASE = 'https://earn.li.fi';
export const COMPOSER_API_BASE = 'https://li.quest';

export const DEFAULT_VAULT_FILTERS = {
  chainId: '8453',
  asset: 'USDC',
  minTvlUsd: '100000',
  sortBy: 'apy',
  limit: '18',
  search: '',
  protocol: '',
};

export const FEATURE_POINTS = [
  '20+ protocols through one normalized vault schema',
  'One-click Composer deposits using vault address as toToken',
  'Portfolio tracking across supported LI.FI Earn protocols',
];

export const HERO_METRICS = [
  { label: 'Primary Track', value: 'Yield Builder' },
  { label: 'Happy Path', value: 'Base + USDC' },
  { label: 'Execution Layer', value: 'Composer' },
];

export const STABLE_ASSETS = ['USDC', 'USDT', 'DAI', 'USDS', 'EURC'];

export const NAV_ITEMS = [
  { label: 'Why YieldFlow', href: '#why' },
  { label: 'Explorer', href: '#explore' },
  { label: 'Portfolio', href: '#portfolio' },
];

export const LANDING_CARDS = [
  {
    eyebrow: 'Compare',
    title: 'Scan faster.',
    description: 'APY, 30-day average, TVL, and deposit readiness are easy to compare.',
  },
  {
    eyebrow: 'Deposit',
    title: 'Preview the route.',
    description: 'Get a Composer quote before you approve or deposit.',
  },
  {
    eyebrow: 'Verify',
    title: 'Confirm the result.',
    description: 'Check positions after deposit instead of stopping at a success state.',
  },
];

export const FOOTER_LINK_GROUPS = [
  {
    title: 'Product',
    links: [
      { label: 'Explorer', href: '#explore' },
      { label: 'Portfolio', href: '#portfolio' },
      { label: 'GitHub', href: 'https://github.com/ELLA0VICTOR/yield-flow', external: true },
    ],
  },
  {
    title: 'Protocols',
    links: [
      { label: 'LI.FI Earn', href: 'https://docs.li.fi/earn/overview', external: true },
      { label: 'Morpho', href: 'https://morpho.org/', external: true },
      { label: 'Euler', href: 'https://www.euler.finance/', external: true },
    ],
  },
];

export const EXPERIENCE_PILLARS = [
  {
    title: 'Clear first screen',
    body: 'The landing page needs to explain the product in seconds, not after a tutorial.',
  },
  {
    title: 'Retro, not chaotic',
    body: 'We keep the neo-brutalist edges, but the information layout stays finance-grade and easy to scan.',
  },
  {
    title: 'Hackathon sharp',
    body: 'Every section is designed to support the demo video, the X post, and the judging rubric.',
  },
];
