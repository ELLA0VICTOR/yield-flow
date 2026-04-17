import StatusPill from "../ui/StatusPill";

export default function WalletCommandCenter({ snapshot }) {
  const progress = Math.min((snapshot.budgetUsed / snapshot.budgetLimit) * 100, 100);

  return (
    <section className="panel wallet-panel">
      <div className="panel-header">
        <div>
          <span className="section-kicker">CONTROL CENTER</span>
          <h2 className="panel-title">Agent wallet command surface</h2>
        </div>
        <StatusPill tone="allowed">{snapshot.networkLabel}</StatusPill>
      </div>

      <div className="wallet-meta-card">
        <div>
          <p className="eyebrow">AGENT</p>
          <strong className="wallet-agent">{snapshot.agentName}</strong>
          <p className="wallet-caption">{snapshot.walletAddress}</p>
        </div>
        <div className="wallet-badges">
          <StatusPill tone="allowed">Sponsored account ready</StatusPill>
          <StatusPill tone="review">Soroban auth entry signing</StatusPill>
        </div>
      </div>

      <div className="wallet-balance-grid">
        {snapshot.balances.map((balance) => (
          <div className="mini-panel" key={balance.asset}>
            <p className="eyebrow">{balance.asset}</p>
            <strong className="mini-panel-value">{balance.value}</strong>
            <p className="mini-panel-copy">{balance.copy}</p>
          </div>
        ))}
      </div>

      <div className="budget-panel">
        <div className="budget-row">
          <span>Daily policy budget</span>
          <strong>
            {snapshot.budgetUsed.toFixed(2)} / {snapshot.budgetLimit.toFixed(2)} USDC
          </strong>
        </div>
        <div className="budget-track">
          <div className="budget-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="budget-foot">
          <span>Per-request cap: {snapshot.perRequestCap}</span>
          <span>Last receipt: {snapshot.lastReceipt}</span>
        </div>
      </div>

      <div className="checklist">
        {snapshot.sessionChecks.map((item) => (
          <div className="check-row" key={item.label}>
            <div>
              <p className="check-label">{item.label}</p>
              <p className="check-copy">{item.copy}</p>
            </div>
            <StatusPill tone={item.tone}>{item.value}</StatusPill>
          </div>
        ))}
      </div>
    </section>
  );
}
