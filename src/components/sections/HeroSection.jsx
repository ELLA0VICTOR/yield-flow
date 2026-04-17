function HeroMetric({ item, index }) {
  return (
    <div className="metric-card anim-up" style={{ "--i": index }}>
      <p className="metric-label">{item.label}</p>
      <div className="metric-value-row">
        <strong className="metric-value">{item.value}</strong>
        <span className="metric-detail">{item.detail}</span>
      </div>
    </div>
  );
}

export default function HeroSection({ metrics, walletSnapshot }) {
  return (
    <section className="hero-grid" id="top">
      <div className="hero-copy anim-up">
        <span className="section-kicker">AUTONOMOUS PAYMENT CONTROLS</span>
        <h1 className="hero-title">Authorize the agent. Not the chaos.</h1>
        <p className="hero-body">
          Sentryx402 gives an AI agent its own Stellar wallet, x402 payment access, and a
          fail-closed policy layer for service allowlists, unit-price caps, and budget
          enforcement before any request gets signed.
        </p>

        <div className="hero-actions">
          <a className="button button-primary" href="#policies">
            Review Policies
          </a>
          <a className="button button-secondary" href="#services">
            Browse Services
          </a>
        </div>

        <div className="metric-grid">
          {metrics.map((item, index) => (
            <HeroMetric item={item} index={index} key={item.label} />
          ))}
        </div>
      </div>

      <div className="hero-console anim-up" style={{ "--i": 1 }}>
        <div className="console-header">
          <div>
            <p className="console-label">ACTIVE REQUEST ENVELOPE</p>
            <h2 className="console-title">Treasury search agent</h2>
          </div>
          <span className="console-status">FAIL CLOSED</span>
        </div>

        <div className="console-stack">
          <div className="console-row">
            <span>Agent wallet</span>
            <strong>{walletSnapshot.walletAddress}</strong>
          </div>
          <div className="console-row">
            <span>Facilitator</span>
            <strong>{walletSnapshot.facilitator}</strong>
          </div>
          <div className="console-row">
            <span>Allowed spend</span>
            <strong>{walletSnapshot.dailySpent}</strong>
          </div>
          <div className="console-row">
            <span>Policy profile</span>
            <strong>{walletSnapshot.policyProfile}</strong>
          </div>
        </div>

        <div className="console-divider" />

        <div className="signal-grid">
          {walletSnapshot.controlSignals.map((signal) => (
            <div className="signal-card" key={signal.label}>
              <span className="signal-label">{signal.label}</span>
              <strong className="signal-value">{signal.value}</strong>
              <p className="signal-copy">{signal.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
