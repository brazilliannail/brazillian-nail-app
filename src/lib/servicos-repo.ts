import { prisma } from "@/lib/db";
import type { Servico, ServicoStatus } from "@/lib/servicos-mock";

type ServicoRow = {
  id: string;
  nomePt: string;
  nomeEn: string | null;
  categoria: string;
  descricaoPt: string;
  descricaoEn: string;
  precoPadrao: number;
  precoVariavel: boolean;
  precoMinimo: number | null;
  precoMaximo: number | null;
  duracaoPadraoMin: number;
  duracaoMinimaMin: number | null;
  duracaoMaximaMin: number | null;
  retornoSugeridoDias: number | null;
  status: string;
  observacoesPt: string;
  observacoesEn: string;
};

/** Mapeia uma linha de `servicos` para o tipo `Servico` da UI. `nomeEn` é opcional. */
export function mapServicoRow(row: ServicoRow): Servico {
  return {
    id: row.id,
    nome: row.nomePt,
    nomeEn: row.nomeEn,
    categoria: row.categoria,
    descricaoPt: row.descricaoPt,
    descricaoEn: row.descricaoEn,
    precoPadrao: row.precoPadrao,
    precoVariavel: row.precoVariavel,
    precoMinimo: row.precoMinimo,
    precoMaximo: row.precoMaximo,
    duracaoPadrao: row.duracaoPadraoMin,
    duracaoMinima: row.duracaoMinimaMin,
    duracaoMaxima: row.duracaoMaximaMin,
    retornoSugeridoDias: row.retornoSugeridoDias,
    status: row.status as ServicoStatus,
    observacoesPt: row.observacoesPt,
    observacoesEn: row.observacoesEn,
  };
}

/** Lê todos os serviços do banco SQLite via Prisma, na ordem do id (SRV-000001, SRV-000002, ...). */
export async function getServicos(): Promise<Servico[]> {
  const rows = await prisma.servico.findMany({ orderBy: { id: "asc" } });
  return rows.map(mapServicoRow);
}
