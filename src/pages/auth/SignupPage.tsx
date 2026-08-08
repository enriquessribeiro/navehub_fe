import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";

export function SignupPage() {
  const { signUp } = useAuth();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  async function lidarComEnvio(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setEnviando(true);
    // O papel é SEMPRE "aluno" no cadastro público (o trigger do banco
    // também força isso). Professores são criados pela equipe/admin direto
    // no banco — nunca por auto-cadastro.
    const resultado = await signUp({ nome: nome.trim(), email: email.trim(), senha, papel: "aluno" });
    setEnviando(false);

    if (resultado.error) {
      setErro(resultado.error);
      return;
    }
    setSucesso(true);
  }

  if (sucesso) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nave-black px-4">
        <Card className="w-full max-w-sm text-center">
          <h1 className="font-display text-lg font-semibold text-ink">Cadastro realizado!</h1>
          <p className="mt-2 text-sm text-muted">
            Confirme seu e-mail (se essa opção estiver ativa no projeto) e entre com sua senha.
          </p>
          <Link to="/login">
            <Button className="mt-4 w-full">Ir para o login</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-nave-black px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <svg viewBox="0 0 64 64" className="h-12 w-12">
            <circle cx="32" cy="32" r="30" fill="#0B0B0C" />
            <circle cx="32" cy="32" r="24" fill="none" stroke="#F2B705" strokeWidth={2.5} />
            <path d="M24 36 L34 26 L34 31 L40 31 L40 34 L34 34 L34 39 Z" fill="#F2B705" />
          </svg>
          <h1 className="font-display text-2xl font-semibold text-white">Criar conta no NaveHub</h1>
        </div>

        <Card>
          <form onSubmit={lidarComEnvio} className="flex flex-col gap-4">
            <Input label="Nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
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
              autoComplete="new-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />

            {erro && <p className="text-sm font-medium text-danger">{erro}</p>}

            <Button type="submit" disabled={enviando}>
              {enviando ? "Criando conta…" : "Criar conta"}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-white/60">
          Já tem conta?{" "}
          <Link to="/login" className="font-semibold text-nave-yellow hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
