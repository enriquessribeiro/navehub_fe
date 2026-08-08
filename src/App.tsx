import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { RoleRoute } from "@/routes/RoleRoute";
import { useAuth } from "@/contexts/AuthContext";
import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import { DashboardPage } from "@/pages/aluno/DashboardPage";
import { QuestoesPage } from "@/pages/aluno/QuestoesPage";
import { RedacaoPage } from "@/pages/redacao/RedacaoPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

/**
 * Depois do login, cada papel cai numa home diferente: aluno vai para o
 * dashboard (com métricas), professor cai direto na fila de redações
 * pendentes — sem dashboard de questões nesta primeira versão.
 */
function HomeRedirect() {
  const { profile } = useAuth();
  if (!profile) return null;
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
