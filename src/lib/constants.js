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
  { label: 'How It Works', href: '#flow' },
  { label: 'Explorer', href: '#explore' },
  { label: 'Portfolio', href: '#portfolio' },
];

export const LANDING_CARDS = [
  {
    eyebrow: 'Compare',
    title: 'See the important numbers fast.',
    description:
      'Current APY, 30-day average, TVL, and deposit readiness are visible without digging through protocol pages.',
  },
  {
    eyebrow: 'Deposit',
    title: 'Preview the route before action.',
    description:
      'Composer turns the selected vault address into an executable quote so the deposit flow stays simple for the user.',
  },
  {
    eyebrow: 'Verify',
    title: 'Check positions after the move.',
    description:
      'Portfolio lookup makes it easy to confirm what happened after deposit instead of stopping at a success toast.',
  },
];

export const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Scan indexed vaults',
    description:
      'Pull normalized vault data from LI.FI Earn across chains, protocols, APY, TVL, caps, and metadata.',
  },
  {
    step: '02',
    title: 'Compare responsibly',
    description:
      'Stack current APY against 30d average, transactional readiness, tags, KYC, and timelock before acting.',
  },
  {
    step: '03',
    title: 'Trigger Composer',
    description:
      'Use the selected vault contract as toToken, let Composer produce the executable route, then prepare approval and deposit.',
  },
  {
    step: '04',
    title: 'Verify the position',
    description:
      'Refresh the portfolio endpoint and show the user the resulting vault balance and tracked USD value.',
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
