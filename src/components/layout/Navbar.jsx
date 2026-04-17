function ShieldIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path
        d="M7.5 1.4 12 3v3.52c0 2.67-1.65 5.13-4.5 6.68C4.65 11.65 3 9.19 3 6.52V3l4.5-1.6Z"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <path
        d="M5.55 7.48 6.88 8.8l2.57-2.83"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Navbar() {
  return (
    <nav className="topbar anim-down">
      <div className="nav-inner">
        <a className="brand-mark" href="#top">
          <span className="brand-icon">
            <ShieldIcon />
          </span>
          <span className="brand-title">Sentryx402</span>
        </a>

        <div className="nav-links">
          <a href="#top">Overview</a>
          <a href="#policies">Policies</a>
          <a href="#services">Services</a>
          <a href="#audit-ledger">Receipts</a>
        </div>

        <div className="nav-actions">
          <a className="button button-secondary nav-button" href="#top">
            Connect Wallet
          </a>
        </div>
      </div>
    </nav>
  );
}
