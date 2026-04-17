import StatusPill from "../ui/StatusPill";

export default function AuditLedger({ entries }) {
  return (
    <section className="panel" id="audit-ledger">
      <div className="panel-header">
        <div>
          <span className="section-kicker">RECEIPTS</span>
          <h2 className="panel-title">Every approved payment leaves a receipt</h2>
        </div>
        <StatusPill tone="muted">Immutable operator story</StatusPill>
      </div>

      <div className="ledger-list">
        {entries.map((entry, index) => (
          <article className="ledger-row anim-up" key={entry.id} style={{ "--i": index }}>
            <div className="ledger-time">
              <span>{entry.time}</span>
              <small>{entry.date}</small>
            </div>

            <div className="ledger-content">
              <div className="ledger-content-head">
                <h3 className="ledger-title">{entry.title}</h3>
                <StatusPill tone={entry.tone}>{entry.status}</StatusPill>
              </div>
              <p className="ledger-copy">{entry.copy}</p>
            </div>

            <div className="ledger-proof">
              <span className="eyebrow">PROOF</span>
              <strong>{entry.proof}</strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
