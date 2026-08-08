import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell() {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="flex min-h-screen bg-canvas lg:overflow-hidden">
      <Sidebar aberto={menuAberto} onFechar={() => setMenuAberto(false)} />

      {/* Overlay só no mobile, quando o drawer está aberto */}
      {menuAberto && (
        <div
          className="fixed inset-0 z-30 bg-nave-black/60 lg:hidden"
          onClick={() => setMenuAberto(false)}
          aria-hidden="true"
        />
      )}

      <main className="min-w-0 flex-1 overflow-y-auto">
        {/* Cabeçalho mobile com botão de menu (desktop usa a sidebar fixa) */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 lg:hidden">
          <span className="font-display text-base font-semibold text-ink">NaveHub</span>
          <button
            type="button"
            aria-label="Abrir menu de navegação"
            onClick={() => setMenuAberto(true)}
            className="rounded-control border border-line p-2 text-ink transition-colors hover:bg-line/50"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
              <path d="M4 7h12M4 11.5h12M4 16h12" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <Outlet />
      </main>
    </div>
  );
}