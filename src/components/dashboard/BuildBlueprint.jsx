import StatusPill from "../ui/StatusPill";

export default function BuildBlueprint({ items }) {
  return (
    <section className="panel blueprint-panel">
      <div className="panel-header">
        <div>
          <span className="section-kicker">BUILD BLUEPRINT</span>
          <h2 className="panel-title">The exact modules Sentryx402 needs next</h2>
        </div>
        <StatusPill tone="review">MVP path locked</StatusPill>
      </div>

      <div className="blueprint-grid">
        {items.map((item, index) => (
          <article className="blueprint-card anim-up" key={item.title} style={{ "--i": index }}>
            <div className="blueprint-head">
              <div>
                <p className="eyebrow">{item.stage}</p>
                <h3 className="blueprint-title">{item.title}</h3>
              </div>
              <StatusPill tone={item.tone}>{item.status}</StatusPill>
            </div>

            <p className="blueprint-copy">{item.copy}</p>
            <strong className="blueprint-stack">{item.stack}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
