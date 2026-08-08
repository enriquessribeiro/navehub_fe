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

export interface ProfileRow {
  id: string;
  nome: string;
  papel: Papel;
  meta_questoes: number;
  created_at: string;
}

export interface AlternativaJson {
  letra: "A" | "B" | "C" | "D" | "E";
  texto: string | null;
  arquivo: string | null;
  correta: boolean;
}

export interface QuestionRow {
  id: string;
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

export interface EssayRow {
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

export interface QuestionAttemptRow {
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
      };
      questions: {
        Row: QuestionRow;
        Insert: Partial<QuestionRow>;
        Update: Partial<QuestionRow>;
      };
      essays: {
        Row: EssayRow;
        Insert: Partial<EssayRow> & Pick<EssayRow, "aluno_id" | "tema" | "texto">;
        Update: Partial<EssayRow>;
      };
      question_attempts: {
        Row: QuestionAttemptRow;
        Insert: Partial<QuestionAttemptRow> &
          Pick<QuestionAttemptRow, "aluno_id" | "question_id" | "resposta_dada" | "correta">;
        Update: Partial<QuestionAttemptRow>;
      };
    };
  };
}
