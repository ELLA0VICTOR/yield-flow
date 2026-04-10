export function ToastNotice({ notice, onClose }) {
  if (!notice) {
    return null;
  }

  const toneClass =
    notice.tone === 'error'
      ? 'border-danger bg-white'
      : notice.tone === 'success'
        ? 'border-success bg-card'
        : 'border-border bg-card';

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm">
      <div className={`border-2 px-4 py-3 shadow-retro ${toneClass}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-head uppercase tracking-[0.2em] text-muted-foreground">
              Wallet
            </p>
            <p className="mt-2 text-sm text-foreground">{notice.message}</p>
          </div>
          <button type="button" className="retro-link" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
