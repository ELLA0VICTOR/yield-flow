import { startTransition, useDeferredValue, useState } from "react";
import "./App.css";
import Navbar from "./components/layout/Navbar";
import AuditLedger from "./components/dashboard/AuditLedger";
import PaymentRail from "./components/dashboard/PaymentRail";
import PolicyMatrix from "./components/dashboard/PolicyMatrix";
import ServiceRegistry from "./components/dashboard/ServiceRegistry";
import HeroSection from "./components/sections/HeroSection";
import {
  auditEntries,
  heroMetrics,
  paymentFlow,
  policyRules,
  serviceRegistry,
  walletSnapshot,
} from "./lib/dashboardData";

function filterServices(services, query, statusFilter) {
  return services.filter((service) => {
    const matchesStatus = statusFilter === "all" || service.status === statusFilter;
    const haystack = [
      service.name,
      service.category,
      service.description,
      service.riskLabel,
      service.priceLabel,
    ]
      .join(" ")
      .toLowerCase();
    const matchesQuery = !query || haystack.includes(query.toLowerCase());

    return matchesStatus && matchesQuery;
  });
}

export default function App() {
  const [serviceQuery, setServiceQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeServiceId, setActiveServiceId] = useState(serviceRegistry[0]?.id ?? null);
  const deferredQuery = useDeferredValue(serviceQuery);
  const visibleServices = filterServices(serviceRegistry, deferredQuery, statusFilter);
  const activeService =
    visibleServices.find((service) => service.id === activeServiceId) ??
    visibleServices[0] ??
    serviceRegistry[0] ??
    null;

  const handleStatusFilterChange = (nextFilter) => {
    startTransition(() => {
      setStatusFilter(nextFilter);
    });
  };

  return (
    <div className="grid-bg app-shell">
      <Navbar />
      <main className="app-main">
        <HeroSection metrics={heroMetrics} walletSnapshot={walletSnapshot} />

        <section className="section-grid" id="policies">
          <PolicyMatrix rules={policyRules} />
        </section>

        <section className="section-grid section-grid-two" id="services">
          <ServiceRegistry
            activeService={activeService}
            activeServiceId={activeService?.id ?? null}
            onQueryChange={setServiceQuery}
            onSelectService={setActiveServiceId}
            onStatusFilterChange={handleStatusFilterChange}
            query={serviceQuery}
            services={visibleServices}
            statusFilter={statusFilter}
          />
          <PaymentRail flow={paymentFlow} snapshot={walletSnapshot} />
        </section>

        <AuditLedger entries={auditEntries} />
      </main>
    </div>
  );
}
