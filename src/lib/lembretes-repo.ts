import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { Lembrete, LembreteStatus, LembreteStatusAgendamento } from "@/lib/lembretes-mock";
import { formatMinutesAsTime, formatDateISO, addDays } from "@/lib/date";

type Tx = Prisma.TransactionClient;

const STATUS_AGENDAMENTO_COM_LEMBRETE = ["aguardando", "confirmado"] as const;

const SERVICO_A_DEFINIR_PT = "Serviço a definir";
const SERVICO_A_DEFINIR_EN = "Service to be defined";

type LembreteRow = {
  id: string;
  statusLembrete: string;
  consentimentoRegistrado: boolean;
  mensagemPersonalizada: string | null;
  mensagemPersonalizadaSecundario: string | null;
  agendamento: {
    clienteId: string;
    inicioMin: number;
    status: string;
    servico: { nomePt: string; nomeEn: string | null } | null;
  };
};

function mapLembreteRow(row: LembreteRow): Lembrete {
  return {
    id: row.id,
    clienteId: row.agendamento.clienteId,
    horario: formatMinutesAsTime(row.agendamento.inicioMin),
    servicoPt: row.agendamento.servico?.nomePt ?? SERVICO_A_DEFINIR_PT,
    servicoEn: row.agendamento.servico?.nomeEn ?? SERVICO_A_DEFINIR_EN,
    statusAgendamento: (row.agendamento.status === "confirmado" ? "confirmado" : "aguardando") as LembreteStatusAgendamento,
    statusLembrete: row.statusLembrete as LembreteStatus,
    consentimentoRegistrado: row.consentimentoRegistrado,
    mensagemPersonalizada: row.mensagemPersonalizada,
    mensagemPersonalizadaSecundario: row.mensagemPersonalizadaSecundario,
  };
}

/** Próximo id de lembrete, a partir de `numero_sequencial` (mesmo padrão de `atendimentos`/`agendamentos`). */
async function nextLembreteId(tx: Tx): Promise<{ id: string; numeroSequencial: number }> {
  const agregado = await tx.lembrete.aggregate({ _max: { numeroSequencial: true } });
  const numeroSequencial = (agregado._max.numeroSequencial ?? 0) + 1;
  return { id: `LEM-${String(numeroSequencial).padStart(6, "0")}`, numeroSequencial };
}

/**
 * Garante que todo agendamento de amanhã (status `aguardando`/`confirmado`, não cancelado) tenha
 * uma linha em `lembretes` — esta é a "geração automática" descrita no design: como o app não tem
 * cron/fila em nenhum outro módulo, ela roda sob demanda, sempre que a tela de Lembretes é
 * carregada, criando apenas o que ainda não existe (idempotente — nunca duplica, por causa do
 * `UNIQUE(agendamento_id)`). `consentimentoRegistrado` é um snapshot do `receberLembretes` do
 * contato principal no momento da criação (ver DATABASE_DESIGN.md §4.7).
 */
async function garantirLembretesDoDia(dataIso: string, ativarLembretesDiaAnterior: boolean): Promise<void> {
  if (!ativarLembretesDiaAnterior) return;

  const agendamentosSemLembrete = await prisma.agendamento.findMany({
    where: {
      data: dataIso,
      status: { in: [...STATUS_AGENDAMENTO_COM_LEMBRETE] },
      lembrete: null,
    },
    include: { cliente: { include: { contatos: true } } },
  });

  if (agendamentosSemLembrete.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const agendamento of agendamentosSemLembrete) {
      const contatoPrincipal = agendamento.cliente.contatos.find((c) => c.papel === "principal");
      const { id, numeroSequencial } = await nextLembreteId(tx);
      await tx.lembrete.create({
        data: {
          id,
          numeroSequencial,
          agendamentoId: agendamento.id,
          statusLembrete: contatoPrincipal ? "pendente" : "indisponivel",
          consentimentoRegistrado: contatoPrincipal?.receberLembretes ?? false,
        },
      });
    }
  });
}

const includeLembrete = {
  agendamento: { include: { servico: { select: { nomePt: true, nomeEn: true } } } },
} as const;

/**
 * Lê os lembretes dos agendamentos de amanhã, criando primeiro os que ainda não existem
 * (ver `garantirLembretesDoDia`). Respeita `configuracoes.lembretes.ativarLembretesDiaAnterior`.
 */
export async function getLembretesAmanha(ativarLembretesDiaAnterior: boolean): Promise<Lembrete[]> {
  const amanhaIso = formatDateISO(addDays(new Date(), 1));

  await garantirLembretesDoDia(amanhaIso, ativarLembretesDiaAnterior);

  const rows = await prisma.lembrete.findMany({
    where: { agendamento: { data: amanhaIso } },
    include: includeLembrete,
    orderBy: { agendamento: { inicioMin: "asc" } },
  });

  return rows.map(mapLembreteRow);
}
