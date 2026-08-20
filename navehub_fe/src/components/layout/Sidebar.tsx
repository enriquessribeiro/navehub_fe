import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  to: string;
  label: string;
  icon: JSX.Element;
}

function IconInicio() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path d="M3 9.5 10 4l7 5.5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 8.5V16h10V8.5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconQuestoes() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <rect x="4" y="3" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth={1.6} />
      <path d="M7 7h6M7 10h6M7 13h3.5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

function IconRedacao() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path
        d="M12.5 3.5 16 7 7 16H3.5v-3.5L12.5 3.5Z"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCaderno() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path
        d="M6 3.5h8a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 15V5A1.5 1.5 0 0 1 6 3.5Z"
        stroke="currentColor"
        strokeWidth={1.6}
      />
      <path d="M7.5 7h5M7.5 10h5M7.5 13h3" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

const ITENS_ALUNO: NavItem[] = [
  { to: "/dashboard", label: "Início", icon: <IconInicio /> },
  { to: "/questoes", label: "Questões", icon: <IconQuestoes /> },
  { to: "/redacao", label: "Redação", icon: <IconRedacao /> },
  { to: "/caderno", label: "Caderno", icon: <IconCaderno /> },
];

const ITENS_PROFESSOR: NavItem[] = [
  { to: "/redacao", label: "Redação", icon: <IconRedacao /> },
  { to: "/caderno", label: "Caderno", icon: <IconCaderno /> },
];

interface SidebarProps {
  /** Mobile: mostra o drawer quando true. Desktop ignora e sempre mostra. */
  aberto?: boolean;
  onFechar?: () => void;
}

export function Sidebar({ aberto = false, onFechar }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const itens = profile?.papel === "professor" ? ITENS_PROFESSOR : ITENS_ALUNO;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-nave-black text-white transition-transform duration-200",
        "lg:static lg:translate-x-0",
        aberto ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex items-center gap-2.5 px-6 py-6">
        <svg viewBox="0 0 64 64" className="h-8 w-8">
          <circle cx="32" cy="32" r="30" fill="#0B0B0C" />
          <circle cx="32" cy="32" r="24" fill="none" stroke="#F2B705" strokeWidth={2.5} />
          <path d="M24 36 L34 26 L34 31 L40 31 L40 34 L34 34 L34 39 Z" fill="#F2B705" />
        </svg>
        <span className="font-display text-lg font-semibold tracking-tight">NaveHub</span>
        {onFechar && (
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar menu"
            className="ml-auto rounded-control p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
              <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {itens.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "bg-nave-yellow text-nave-black" : "text-white/80 hover:bg-white/10 hover:text-white"
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nave-yellow font-display text-sm font-semibold text-nave-black">
            {(profile?.nome ?? "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{profile?.nome ?? "Carregando…"}</p>
            <p className="text-xs capitalize text-white/60">{profile?.papel ?? ""}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-1 w-full rounded-control px-2 py-2 text-left text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
