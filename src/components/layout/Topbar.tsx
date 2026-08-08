interface TopbarProps {
  titulo: string;
  subtitulo?: string;
}

export function Topbar({ titulo, subtitulo }: TopbarProps) {
  return (
    <header className="border-b border-line bg-surface px-8 py-5">
      <h1 className="font-display text-xl font-semibold text-ink">{titulo}</h1>
      {subtitulo && <p className="mt-0.5 text-sm text-muted">{subtitulo}</p>}
    </header>
  );
}
