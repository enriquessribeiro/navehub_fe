import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Papel, ProfileRow } from "@/types/database.types";

export type PapelCadastro = Extract<Papel, "aluno" | "professor">;

interface SignUpParams {
  nome: string;
  email: string;
  senha: string;
  papel: PapelCadastro;
}

interface AuthContextValue {
  session: Session | null;
  profile: ProfileRow | null;
  /** true enquanto a sessão inicial (ou o perfil) ainda está carregando. */
  carregando: boolean;
  signIn: (email: string, senha: string) => Promise<{ error: string | null }>;
  signUp: (params: SignUpParams) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function buscarPerfilComRetentativa(userId: string): Promise<ProfileRow | null> {
  // O perfil é criado por um trigger no banco no exato momento do cadastro
  // (mesma transação do INSERT em auth.users), então normalmente já existe
  // na primeira tentativa. As retentativas curtas abaixo são só uma rede de
  // segurança para qualquer atraso de propagação pontual.
  const atrasosMs = [0, 300, 800];

  for (const atraso of atrasosMs) {
    if (atraso > 0) {
      await new Promise((resolve) => setTimeout(resolve, atraso));
    }

    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

    if (error) {
      console.error("[navehub] erro ao buscar perfil:", error.message);
      return null;
    }
    if (data) {
      return data;
    }
  }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregarPerfil = useCallback(async (userId: string) => {
    const perfil = await buscarPerfilComRetentativa(userId);
    setProfile(perfil);
    setCarregando(false);
  }, []);

  useEffect(() => {
    let ativo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      setSession(data.session);
      if (data.session) {
        void carregarPerfil(data.session.user.id);
      } else {
        setCarregando(false);
      }
    });

    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSession(novaSessao);
      if (novaSessao) {
        setCarregando(true);
        void carregarPerfil(novaSessao.user.id);
      } else {
        setProfile(null);
        setCarregando(false);
      }
    });

    return () => {
      ativo = false;
      assinatura.subscription.unsubscribe();
    };
  }, [carregarPerfil]);

  const signIn = useCallback(async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async ({ nome, email, senha, papel }: SignUpParams) => {
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome, papel } },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, profile, carregando, signIn, signUp, signOut }),
    [session, profile, carregando, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth precisa ser usado dentro de um <AuthProvider>.");
  }
  return context;
}
