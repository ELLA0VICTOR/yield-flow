export default function StatusPill({ children, tone = "muted" }) {
  return (
    <span className="pill" data-tone={tone}>
      {children}
    </span>
  );
}
