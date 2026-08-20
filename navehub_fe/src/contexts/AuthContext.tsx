import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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

/** Teto máximo para o carregamento do perfil (retentativas inclusas). Sem ele,
 *  um banco lento/pausado deixaria `carregando` travado em true — e a tela
 *  branca — para sempre. Ao estourar, o perfil é assumido indisponível e o
 *  app cai no fluxo de "SemPerfil", que oferece saída da conta. */
const TEMPO_MAXIMO_CARREGAMENTO_PERFIL_MS = 8_000;

async function buscarPerfilComRetentativa(userId: string): Promise<ProfileRow | null> {
  // O perfil é criado por um trigger no banco no exato momento do cadastro
  // (mesma transação do INSERT em auth.users), então normalmente já existe
  // na primeira tentativa. As retentativas curtas abaixo são só uma rede de
  // segurança para qualquer atraso de propagação pontual.
  const atrasosMs = [0, 300, 800];

  const tentar = async (): Promise<ProfileRow | null> => {
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
  };

  // Promise.race com o teto global: se o banco pendurar a requisição, o
  // carregamento resolve com null mesmo assim (quem perde a corrida é
  // abandonado e nunca toca o estado — ver guard em carregarPerfil).
  return Promise.race([
    tentar(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), TEMPO_MAXIMO_CARREGAMENTO_PERFIL_MS)),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [carregando, setCarregando] = useState(true);
  /** Id da sessão cujo perfil está em exibição (ou sendo carregado). Dupla
   *  função de guard: (1) uma busca de perfil que termina depois de um
   *  logout/novo login não pode repovoar o estado — só aplicamos o resultado
   *  se o id ainda for o da sessão corrente; (2) deduplica buscas repetidas
   *  para o mesmo usuário (getSession e onAuthStateChange disparam o mesmo
   *  userId no boot, gerando 2 requisições idênticas). */
  const sessaoAtualRef = useRef<string | null>(null);

  const carregarPerfil = useCallback(async (userId: string) => {
    // O guard tem DUPLA função (dedup de buscas repetidas + descarte de
    // resultados de sessão antiga). Importante: o early return NÃO toca em
    // `carregando` — o `setCarregando(true)` só acontece aqui, quando uma
    // busca de verdade vai começar. Antes ele ficava no handler de
    // onAuthStateChange, que dispara também em eventos repetidos para o
    // MESMO usuário (refresh de token ao voltar a aba / a cada ~1h): o
    // loading era ligado e o guard saía cedo sem desligá-lo — "Carregando…"
    // infinito. Isso não pode voltar: só ligue o loading se for buscar.
    if (sessaoAtualRef.current === userId) {
      return;
    }
    sessaoAtualRef.current = userId;
    setCarregando(true);

    const perfil = await buscarPerfilComRetentativa(userId);

    // A sessão mudou enquanto a busca estava em voo (logout ou troca de
    // conta): descarta o resultado — aplicar aqui repopularia o perfil de
    // uma conta que já não é a atual.
    if (sessaoAtualRef.current !== userId) {
      return;
    }

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
        sessaoAtualRef.current = null;
        setCarregando(false);
      }
    });

    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSession(novaSessao);
      if (novaSessao) {
        // Não liga `carregando` aqui de propósito: eventos repetidos para o
        // MESMO usuário (refresh de token no alt-tab/foco) passam pelo guard
        // do carregarPerfil sem nova busca, e um loading ligado aqui nunca
        // seria desligado. Quem liga/desliga o loading é o carregarPerfil,
        // só quando uma requisição real acontece.
        void carregarPerfil(novaSessao.user.id);
      } else {
        // Sessão encerrada: invalida qualquer busca de perfil ainda em voo
        // (impede que ela repovoe o estado depois do logout) e limpa o perfil.
        sessaoAtualRef.current = null;
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
