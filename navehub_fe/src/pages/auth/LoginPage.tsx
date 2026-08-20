import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";

export function LoginPage() {
  const { session, carregando, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!carregando && session) {
    const destino = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";
    return <Navigate to={destino} replace />;
  }

  async function lidarComEnvio(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    const resultado = await signIn(email, senha);
    setEnviando(false);
    if (resultado.error) {
      setErro("E-mail ou senha inválidos.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-nave-black px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <svg viewBox="0 0 64 64" className="h-12 w-12">
            <circle cx="32" cy="32" r="30" fill="#0B0B0C" />
            <circle cx="32" cy="32" r="24" fill="none" stroke="#F2B705" strokeWidth={2.5} />
            <path d="M24 36 L34 26 L34 31 L40 31 L40 34 L34 34 L34 39 Z" fill="#F2B705" />
          </svg>
          <h1 className="font-display text-2xl font-semibold text-white">NaveHub</h1>
          <p className="text-sm text-white/60">Nave Cursos — sua aprovação começa aqui</p>
        </div>

        <Card>
          <form onSubmit={lidarComEnvio} className="flex flex-col gap-4">
            <Input
              label="E-mail"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            {erro && <p className="text-sm font-medium text-danger">{erro}</p>}
            <Button type="submit" disabled={enviando}>
              {enviando ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-white/60">
          Ainda não tem conta?{" "}
          <Link to="/cadastro" className="font-semibold text-nave-yellow hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
