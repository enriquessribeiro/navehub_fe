import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { RoleRoute } from "@/routes/RoleRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import { DashboardPage } from "@/pages/aluno/DashboardPage";
import { QuestoesPage } from "@/pages/aluno/QuestoesPage";
import { RedacaoPage } from "@/pages/redacao/RedacaoPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

/**
 * Usuário logado cujo profile não existe (trigger falhou, conta criada
 * manualmente etc.) não pode ficar numa tela em branco — mostramos um
 * aviso com saída da conta.
 */
function SemPerfil() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas p-6 text-center">
      <div>
        <h1 className="font-display text-lg font-semibold text-ink">Não conseguimos carregar o seu perfil</h1>
        <p className="mt-2 max-w-md text-sm text-muted">
          Algo deu errado ao buscar a sua conta no NaveHub. Saia e entre novamente; se o problema persistir, fale com a
          equipe do Nave Cursos.
        </p>
      </div>
      <Button onClick={() => void signOut()}>Sair da conta</Button>
    </div>
  );
}

/**
 * Depois do login, cada papel cai numa home diferente: aluno vai para o
 * dashboard (com métricas), professor cai direto na fila de redações
 * pendentes — sem dashboard de questões nesta primeira versão.
 */
function HomeRedirect() {
  const { profile, carregando } = useAuth();

  // Enquanto o perfil não resolve, renderiza "Carregando…" (mesma postura do
  // ProtectedRoute) — renderizar `null` aqui deixava a tela em branco caso o
  // carregamento pendurasse (rede, banco pausado etc.).
  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="font-mono text-sm text-muted">Carregando…</p>
      </div>
    );
  }

  if (!profile) {
    return <SemPerfil />;
  }

  return <Navigate to={profile.papel === "professor" ? "/redacao" : "/dashboard"} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<SignupPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomeRedirect />} />

          <Route element={<RoleRoute allow={["aluno"]} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/questoes" element={<QuestoesPage />} />
          </Route>

          <Route element={<RoleRoute allow={["aluno", "professor"]} />}>
            <Route path="/redacao" element={<RedacaoPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
