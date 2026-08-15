/**
 * Tipos das tabelas do banco, escritos à mão para bater exatamente com o
 * schema definido em `backend/prisma/schema.prisma` (que é a fonte de
 * verdade das tabelas).
 *
 * Atenção: aqui usamos os nomes REAIS das colunas no Postgres (snake_case,
 * por causa dos `@map(...)` no Prisma) — não os nomes camelCase que o
 * Prisma usa do lado do backend. O client do Supabase fala diretamente com
 * o Postgres, então é este o formato que importa no frontend.
 *
 * Se o schema do Prisma mudar, este arquivo precisa ser atualizado junto.
 * (Alternativa para projetos maiores: gerar isso automaticamente com
 * `supabase gen types typescript`.)
 */

export type Papel = "aluno" | "professor" | "admin";

export type AreaEnem = "matematica" | "linguagens" | "ciencias_humanas" | "ciencias_natureza";

export type StatusRedacao = "pendente" | "corrigida";

/**
 * As tabelas são `type` (e não `interface`) de propósito: interfaces não têm
 * index signature implícita, então `Table["Row"] extends Record<string, unknown>`
 * falha e o SDK (`GenericSchema`) resolve o schema para `any`.
 */
export type ProfileRow = {
  id: string;
  nome: string;
  papel: Papel;
  meta_questoes: number;
  created_at: string;
};

export interface AlternativaJson {
  letra: "A" | "B" | "C" | "D" | "E";
  texto: string | null;
  arquivo: string | null;
  correta: boolean;
}

export type QuestionRow = {
  id: string;
  /** Chave natural `"{ano}-{index}-{idioma}"` (idioma em português/espanhol/
   *  inglês) — ver migração 0005 e o `enemSync.service` no backend. */
  enem_id: string;
  ano: number;
  area: AreaEnem | null;
  disciplina: string | null;
  idioma: string | null;
  titulo: string;
  enunciado: string | null;
  introducao_alternativas: string | null;
  arquivos: string[];
  alternativas: AlternativaJson[];
  gabarito: "A" | "B" | "C" | "D" | "E";
  dados_originais: unknown;
  criado_em: string;
  atualizado_em: string;
}

export type EssayRow = {
  id: string;
  aluno_id: string;
  professor_id: string | null;
  tema: string;
  texto: string;
  status: StatusRedacao;
  nota: number | null;
  feedback: string | null;
  enviada_em: string;
  corrigida_em: string | null;
}

export type QuestionAttemptRow = {
  id: string;
  aluno_id: string;
  question_id: string;
  resposta_dada: "A" | "B" | "C" | "D" | "E";
  correta: boolean;
  respondida_em: string;
}

/**
 * Formato mínimo esperado pelo `@supabase/supabase-js` (postgrest-js) para
 * tipar o client. As chaves `Views`/`Functions` e a propriedade
 * `Relationships` em cada tabela são obrigatórias nesta versão do SDK —
 * sem elas o `GenericSchema` não é satisfeito e `supabase.from(...)`
 * resolve para `never`, quebrando `insert`/`update`.
 */
/** Formato mínimo esperado pelo `@supabase/supabase-js` para tipar o client. */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, "id" | "nome">;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      questions: {
        Row: QuestionRow;
        Insert: Partial<QuestionRow>;
        Update: Partial<QuestionRow>;
        Relationships: [];
      };
      essays: {
        Row: EssayRow;
        Insert: Partial<EssayRow> & Pick<EssayRow, "aluno_id" | "tema" | "texto">;
        Update: Partial<EssayRow>;
        Relationships: [];
      };
      question_attempts: {
        Row: QuestionAttemptRow;
        Insert: Partial<QuestionAttemptRow> &
          Pick<QuestionAttemptRow, "aluno_id" | "question_id" | "resposta_dada" | "correta">;
        Update: Partial<QuestionAttemptRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      /** Ver supabase/sql/0006_anos_distintos.sql: devolve os ANOS distintos
       *  de prova. RPC evita o teto de 1.000 linhas/requisição do PostgREST
       *  (o select de anos por `select ano` truncava em 2018). */
      listar_anos_distintos: {
        Args: Record<string, never>;
        Returns: { ano: number }[];
      };
      /** Ver supabase/sql/0007_meta_questoes.sql: atualiza a meta semanal do
       *  próprio usuário (security definer, valida 1–200). Não recebe id por
       *  parâmetro — opera sobre `auth.uid()`. */
      atualizar_meta_questoes: {
        Args: { p_meta: number };
        Returns: undefined;
      };
    };
  };
}
