export type ServicoStatus = "ativo" | "inativo";

export type Servico = {
  id: string;
  nome: string;
  nomeEn: string | null;
  categoria: string;
  descricaoPt: string;
  descricaoEn: string;
  precoPadrao: number;
  precoVariavel: boolean;
  precoMinimo: number | null;
  precoMaximo: number | null;
  duracaoPadrao: number;
  duracaoMinima: number | null;
  duracaoMaxima: number | null;
  retornoSugeridoDias: number | null;
  status: ServicoStatus;
  observacoesPt: string;
  observacoesEn: string;
};
