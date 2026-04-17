import StatusPill from "../ui/StatusPill";

export default function PaymentRail({ flow, snapshot }) {
  return (
    <section className="panel payment-panel">
      <div className="panel-header">
        <div>
          <span className="section-kicker">PAYMENT RAIL</span>
          <h2 className="panel-title">How one protected payment works</h2>
        </div>
        <StatusPill tone="allowed">402 to signed retry</StatusPill>
      </div>

      <div className="flow-list">
        {flow.map((step, index) => (
          <article className="flow-card anim-up" key={step.step} style={{ "--i": index }}>
            <div className="flow-index">{step.step}</div>
            <div>
              <h3 className="flow-title">{step.title}</h3>
              <p className="flow-copy">{step.copy}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="receipt-panel">
        <div className="receipt-header">
          <div>
            <p className="eyebrow">LATEST RECEIPT</p>
            <h3 className="receipt-title">Protected search request accepted</h3>
          </div>
          <StatusPill tone="allowed">SETTLED</StatusPill>
        </div>

        <div className="receipt-grid">
          <div className="receipt-row">
            <span>Service</span>
            <strong>Brave Search gateway</strong>
          </div>
          <div className="receipt-row">
            <span>Payer</span>
            <strong>{snapshot.walletAddress}</strong>
          </div>
          <div className="receipt-row">
            <span>Amount</span>
            <strong>0.03 USDC</strong>
          </div>
          <div className="receipt-row">
            <span>Facilitator</span>
            <strong>{snapshot.facilitator}</strong>
          </div>
          <div className="receipt-row">
            <span>Header path</span>
            <strong>402 response - auth entry - signed retry</strong>
          </div>
          <div className="receipt-row">
            <span>Result</span>
            <strong>Receipt written to audit ledger</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
