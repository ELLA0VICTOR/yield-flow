import StatusPill from "../ui/StatusPill";

export default function PolicyMatrix({ rules }) {
  return (
    <section className="panel" id="policy-grid">
      <div className="panel-header">
        <div>
          <span className="section-kicker">POLICY ENGINE</span>
          <h2 className="panel-title">What gets checked before signing</h2>
        </div>
        <StatusPill tone="review">App-layer guardrails first</StatusPill>
      </div>

      <div className="policy-list">
        {rules.map((rule, index) => (
          <article className="policy-card anim-up" key={rule.title} style={{ "--i": index }}>
            <div className="policy-header">
              <div>
                <p className="eyebrow">{rule.scope}</p>
                <h3 className="policy-title">{rule.title}</h3>
              </div>
              <StatusPill tone={rule.tone}>{rule.status}</StatusPill>
            </div>

            <p className="policy-copy">{rule.description}</p>

            <div className="policy-meta">
              <div>
                <span className="policy-meta-label">Enforced by</span>
                <strong>{rule.enforcedBy}</strong>
              </div>
              <div>
                <span className="policy-meta-label">Outcome</span>
                <strong>{rule.outcome}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
