import StatusPill from "../ui/StatusPill";

const FILTERS = [
  { id: "all", label: "All services" },
  { id: "allowed", label: "Allowed" },
  { id: "review", label: "Review" },
  { id: "blocked", label: "Blocked" },
];

function ServiceCard({ active, onSelect, service }) {
  return (
    <button
      className={`service-card ${active ? "service-card-active" : ""}`}
      onClick={() => onSelect(service.id)}
      type="button"
    >
      <div className="service-card-header">
        <div>
          <p className="eyebrow">{service.category}</p>
          <h3 className="service-card-title">{service.name}</h3>
        </div>
        <StatusPill tone={service.status}>{service.statusLabel}</StatusPill>
      </div>

      <p className="service-copy">{service.description}</p>

      <div className="service-meta-row">
        <span>{service.priceLabel}</span>
        <span>{service.riskLabel}</span>
      </div>
    </button>
  );
}

export default function ServiceRegistry({
  activeService,
  activeServiceId,
  onQueryChange,
  onSelectService,
  onStatusFilterChange,
  query,
  services,
  statusFilter,
}) {
  return (
    <section className="panel registry-panel" id="service-registry">
      <div className="panel-header">
        <div>
          <span className="section-kicker">SERVICE REGISTRY</span>
          <h2 className="panel-title">Approved services the agent can pay</h2>
        </div>
        <StatusPill tone="muted">{services.length} visible</StatusPill>
      </div>

      <div className="registry-toolbar">
        <label className="search-shell">
          <span className="eyebrow">SEARCH SERVICES</span>
          <input
            className="search-input"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search by service, category, or risk label"
            type="text"
            value={query}
          />
        </label>

        <div className="filter-group">
          {FILTERS.map((filter) => (
            <button
              className={`filter-chip ${statusFilter === filter.id ? "filter-chip-active" : ""}`}
              key={filter.id}
              onClick={() => onStatusFilterChange(filter.id)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="registry-layout">
        <div className="service-list">
          {services.length > 0 ? (
            services.map((service) => (
              <ServiceCard
                active={service.id === activeServiceId}
                key={service.id}
                onSelect={onSelectService}
                service={service}
              />
            ))
          ) : (
            <div className="empty-panel">
              <p className="eyebrow">NO MATCHES</p>
              <h3 className="empty-title">No services satisfy the current query and status filter.</h3>
              <p className="empty-copy">
                Reset the filter or broaden the search to inspect the rest of the protected
                registry.
              </p>
            </div>
          )}
        </div>

        <aside className="service-detail">
          {activeService ? (
            <>
              <div className="service-detail-header">
                <div>
                  <p className="eyebrow">SELECTED SERVICE</p>
                  <h3 className="service-detail-title">{activeService.name}</h3>
                </div>
                <StatusPill tone={activeService.status}>{activeService.statusLabel}</StatusPill>
              </div>

              <p className="service-detail-copy">{activeService.longDescription}</p>

              <div className="detail-grid">
                <div className="mini-panel">
                  <p className="eyebrow">Unit price</p>
                  <strong className="mini-panel-value">{activeService.priceLabel}</strong>
                </div>
                <div className="mini-panel">
                  <p className="eyebrow">Payment mode</p>
                  <strong className="mini-panel-value">{activeService.paymentMode}</strong>
                </div>
                <div className="mini-panel">
                  <p className="eyebrow">Risk stance</p>
                  <strong className="mini-panel-value">{activeService.riskLabel}</strong>
                </div>
                <div className="mini-panel">
                  <p className="eyebrow">Policy path</p>
                  <strong className="mini-panel-value">{activeService.policyPath}</strong>
                </div>
              </div>

              <div className="detail-rules">
                {activeService.ruleSet.map((rule) => (
                  <div className="detail-rule-row" key={rule}>
                    <span className="detail-rule-dot" />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-panel">
              <p className="eyebrow">SELECT A SERVICE</p>
              <h3 className="empty-title">No service selected.</h3>
              <p className="empty-copy">Choose any service card to inspect its payment policy.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
