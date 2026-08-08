import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { Papel } from "@/types/database.types";

interface RoleRouteProps {
  allow: Papel[];
}

/**
 * Restringe um grupo de rotas a determinados papéis. Quem não tem o papel
 * permitido é mandado para a própria home (que já é escolhida por papel —
 * ver HomeRedirect), então nunca sobra numa tela em branco.
 */
export function RoleRoute({ allow }: RoleRouteProps) {
  const { profile, carregando } = useAuth();

  if (carregando) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="font-mono text-sm text-muted">Carregando…</p>
      </div>
    );
  }

  if (!profile || !allow.includes(profile.papel)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
