export const heroMetrics = [
  {
    label: "POLICIES ENFORCED",
    value: "07",
    detail: "price caps, allowlists, daily spend ceilings",
  },
  {
    label: "SERVICES METERED",
    value: "12",
    detail: "search, news, monitoring, and threat intel endpoints",
  },
  {
    label: "TODAY'S RECEIPTS",
    value: "34",
    detail: "every paid request stored with proof metadata",
  },
];

export const walletSnapshot = {
  agentName: "Treasury Ops Agent",
  walletAddress: "GCZP...A5QW",
  networkLabel: "stellar:testnet",
  facilitator: "OpenZeppelin Channels",
  policyProfile: "SEARCH-ONLY TREASURY",
  dailySpent: "1.74 / 5.00 USDC",
  budgetUsed: 1.74,
  budgetLimit: 5,
  perRequestCap: "0.10 USDC",
  lastReceipt: "8CC4-29FA",
  balances: [
    { asset: "USDC", value: "24.88", copy: "Agent spend balance for x402 services" },
    { asset: "XLM", value: "4.12", copy: "Network reserve and gas fallback" },
    { asset: "AUTH", value: "Ready", copy: "Soroban auth-entry signing available" },
  ],
  controlSignals: [
    {
      label: "Allowed wallets",
      value: "Freighter, Hana, Albedo",
      copy: "Only x402-compatible browser wallets should be surfaced.",
    },
    {
      label: "Spend stance",
      value: "Fail closed",
      copy: "If budget, service, or unit price does not match policy, the request dies.",
    },
    {
      label: "Onboarding path",
      value: "Sponsored account",
      copy: "Agent receives a funded USDC-ready Stellar account without preloading XLM.",
    },
  ],
  sessionChecks: [
    {
      label: "Allowlist hash",
      copy: "Services must be approved before the agent can sign a retry.",
      value: "MATCH",
      tone: "allowed",
    },
    {
      label: "Unit price cap",
      copy: "The request price is compared against the active service ceiling.",
      value: "<= 0.10 USDC",
      tone: "allowed",
    },
    {
      label: "Daily budget window",
      copy: "The wallet is inside its rolling 24 hour spend ceiling.",
      value: "35% used",
      tone: "review",
    },
    {
      label: "Destination policy",
      copy: "Unknown service domains fall back to manual review or block.",
      value: "BLOCK",
      tone: "blocked",
    },
  ],
};

export const policyRules = [
  {
    scope: "SERVICE ALLOWLIST",
    title: "Permit only approved agent marketplaces and data APIs",
    description:
      "The agent can only call services that live in the signed registry. Unknown hosts are denied before payment retry headers are produced.",
    enforcedBy: "App policy engine",
    outcome: "No silent spend on new endpoints",
    status: "ACTIVE",
    tone: "allowed",
  },
  {
    scope: "PRICE CAP",
    title: "Reject any response whose required amount exceeds the service ceiling",
    description:
      "Every x402 challenge is inspected for the requested amount and asset before the wallet signs the Soroban auth entry.",
    enforcedBy: "Request inspector",
    outcome: "No budget spikes from changed pricing",
    status: "ACTIVE",
    tone: "allowed",
  },
  {
    scope: "DAILY BUDGET",
    title: "Throttle the agent after the configured daily USDC budget is reached",
    description:
      "Receipts roll into an audit window, and the next request is rejected until the budget resets or the operator increases the allowance.",
    enforcedBy: "Receipt ledger",
    outcome: "Predictable treasury usage",
    status: "WATCHING",
    tone: "review",
  },
  {
    scope: "STRETCH PATH",
    title: "Move the same guardrails into Stellar contract-account policy enforcement",
    description:
      "After the app-level MVP lands, the same policies can move onchain with contract accounts, session keys, and policy signers.",
    enforcedBy: "Contract account",
    outcome: "Harder guarantees for autonomous agents",
    status: "NEXT",
    tone: "muted",
  },
];

export const serviceRegistry = [
  {
    id: "brave-search",
    name: "Brave Search Gateway",
    category: "SEARCH",
    description: "Pay-per-query web retrieval for agent workflows instead of monthly subscriptions.",
    longDescription:
      "This service is the cleanest demo path for Sentryx402. The agent pays only when it truly needs fresh search results, and the policy layer can cap the unit cost tightly.",
    priceLabel: "0.03 USDC / query",
    riskLabel: "Low variance",
    status: "allowed",
    statusLabel: "ALLOWED",
    paymentMode: "x402 request challenge",
    wallets: ["Freighter", "Hana", "Albedo"],
    policyPath: "allowlist + max price + daily cap",
    ruleSet: [
      "Permit only the production host pinned in the registry.",
      "Refuse any charge over 0.03 USDC per query.",
      "Write every settled query into the daily spend ledger.",
    ],
  },
  {
    id: "stellar-observatory",
    name: "Stellar Observatory Feed",
    category: "MONITORING",
    description: "Space-weather data protected by x402 on Stellar testnet and mainnet.",
    longDescription:
      "A good canonical Stellar-native service for the demo. It proves that the wallet can pay real x402 endpoints and that the guardrail layer understands the service before signing.",
    priceLabel: "0.02 USDC / request",
    riskLabel: "Known provider",
    status: "allowed",
    statusLabel: "ALLOWED",
    paymentMode: "x402 request challenge",
    wallets: ["Freighter", "Hana", "OneKey"],
    policyPath: "allowlist + asset restriction",
    ruleSet: [
      "Require payment in USDC on Stellar only.",
      "Reject alternate settlement assets or networks.",
      "Keep the service in the low-risk allowlist bucket.",
    ],
  },
  {
    id: "threat-scan",
    name: "ThreatScan API",
    category: "SECURITY",
    description: "Security intelligence scanning for autonomous agents and bots.",
    longDescription:
      "This service is powerful, but the cost is less predictable. In Sentryx402 it sits behind a review tier until the operator approves a tighter unit-price ceiling.",
    priceLabel: "0.08 USDC / scan",
    riskLabel: "Needs review",
    status: "review",
    statusLabel: "REVIEW",
    paymentMode: "x402 request challenge",
    wallets: ["Freighter", "Klever", "Hana"],
    policyPath: "manual approval required",
    ruleSet: [
      "Operator must approve the first three purchases.",
      "Reject scans above the review-tier unit ceiling.",
      "Escalate any host mismatch into manual review.",
    ],
  },
  {
    id: "newswire-pulse",
    name: "Newswire Pulse",
    category: "NEWS",
    description: "Real-time article access for event-driven agent research.",
    longDescription:
      "Useful for future expansion, but currently constrained because article-by-article spend can pile up fast without summarization controls. Sentryx402 keeps it in review until usage shaping is added.",
    priceLabel: "0.05 USDC / article",
    riskLabel: "Burst risk",
    status: "review",
    statusLabel: "REVIEW",
    paymentMode: "x402 request challenge",
    wallets: ["Freighter", "HOT", "Albedo"],
    policyPath: "review queue + burst control",
    ruleSet: [
      "Allow only under operator-approved workflows.",
      "Cap article reads per hour.",
      "Add summarization guardrails before production approval.",
    ],
  },
  {
    id: "unknown-scraper",
    name: "Unverified Scraper Cluster",
    category: "DATA",
    description: "Open scraping endpoint discovered by the agent but not approved by policy.",
    longDescription:
      "This is the exact class of destination Sentryx402 should stop. The agent found a potentially useful service, but there is no registry entry, no pricing history, and no operator approval.",
    priceLabel: "Dynamic price",
    riskLabel: "Unknown host",
    status: "blocked",
    statusLabel: "BLOCKED",
    paymentMode: "No payment attempt",
    wallets: ["None"],
    policyPath: "hard fail",
    ruleSet: [
      "No allowlist entry exists for the host.",
      "Price cannot be evaluated against a known ceiling.",
      "The agent may not create new destinations by itself.",
    ],
  },
];

export const paymentFlow = [
  {
    step: "01",
    title: "Agent hits a protected endpoint",
    copy: "The service returns an HTTP 402 challenge with the exact payment requirements for the request.",
  },
  {
    step: "02",
    title: "Sentryx402 inspects the challenge",
    copy: "Service identity, asset, amount, and destination are checked against the local policy engine before any signature is attempted.",
  },
  {
    step: "03",
    title: "Wallet signs the auth entry",
    copy: "Only after policy passes does the wallet sign the Soroban authorization payload needed for Stellar x402 settlement.",
  },
  {
    step: "04",
    title: "Facilitator verifies and settles",
    copy: "The signed retry is routed through the Stellar-compatible facilitator and the service returns the protected payload.",
  },
  {
    step: "05",
    title: "Receipt lands in the operator ledger",
    copy: "The spend is recorded with the service, amount, policy profile, and proof reference for auditing.",
  },
];

export const auditEntries = [
  {
    id: "entry-1",
    date: "APR 10 2026",
    time: "16:42 UTC",
    title: "Brave Search gateway approved and settled",
    copy: "A 0.03 USDC payment passed the allowlist and unit-price ceiling, then completed through the configured facilitator.",
    proof: "RCPT-8CC4-29FA",
    status: "SETTLED",
    tone: "allowed",
  },
  {
    id: "entry-2",
    date: "APR 10 2026",
    time: "15:58 UTC",
    title: "ThreatScan API pushed into manual review",
    copy: "The service was known, but the requested charge exceeded the current review tier price ceiling and was held for operator approval.",
    proof: "POL-REVIEW-14",
    status: "REVIEW",
    tone: "review",
  },
  {
    id: "entry-3",
    date: "APR 10 2026",
    time: "15:11 UTC",
    title: "Unknown scraper host blocked before payment",
    copy: "The service was not present in the registry, so the request failed closed and no auth entry was signed by the wallet.",
    proof: "DENY-ALLOWLIST-02",
    status: "BLOCKED",
    tone: "blocked",
  },
];

export const buildBlueprint = [
  {
    stage: "NOW",
    title: "Wallet and account surface",
    copy: "Connect x402-compatible Stellar wallets and wire in sponsored agent-account onboarding so the agent can hold USDC from day one.",
    stack: "Stellar Wallets Kit + sponsored agent account flow",
    status: "CORE",
    tone: "allowed",
  },
  {
    stage: "NOW",
    title: "Protected service gateway",
    copy: "Expose one or two x402-protected endpoints and a client that can inspect the challenge, sign it, and retry safely.",
    stack: "@x402/core + @x402/express + @x402/fetch + @x402/stellar",
    status: "CORE",
    tone: "allowed",
  },
  {
    stage: "NEXT",
    title: "Operator policy persistence",
    copy: "Store policy profiles, approved services, and receipt history so the dashboard reflects real state instead of mocked snapshots.",
    stack: "App storage + policy service + receipt index",
    status: "NEXT",
    tone: "review",
  },
  {
    stage: "STRETCH",
    title: "Onchain policy enforcement",
    copy: "Mirror the same guardrails inside a contract-account pattern for stronger autonomous spend guarantees on Stellar.",
    stack: "Stellar contract accounts + policy signers + session keys",
    status: "STRETCH",
    tone: "muted",
  },
];
