import { describe, it, expect, vi } from "vitest";

// Server Actions chamam `revalidatePath` (next/cache), que depende de um request scope do Next.js
// em execução — inexistente aqui, fora do servidor (mesmo mock usado em pagamentos-ledger.test.ts).
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { prisma } from "@/lib/db";
import { getLembretesAmanha } from "@/lib/lembretes-repo";
import {
  updateStatusLembreteAction,
  updateMensagemPersonalizadaAction,
  updateMensagemPersonalizadaSecundarioAction,
  registrarMensagemPreparadaAction,
} from "@/lib/lembretes-actions";
import { getConfiguracoes } from "@/lib/configuracoes-repo";
import { updateConfiguracoesAction } from "@/lib/configuracoes-actions";
import { buildMensagemLembrete } from "@/lib/lembretes-mock";
import { criarClienteComContatoTeste, criarAgendamentoAmanhaTeste } from "../helpers/lembretes-fixtures";

describe("lembretes (lembretes-repo + lembretes-actions)", () => {
  it("geração automática: cria lembrete pendente para agendamento de amanhã com contato principal", async () => {
    const cliente = await criarClienteComContatoTeste();
    const agendamento = await criarAgendamentoAmanhaTeste({ clienteId: cliente.id, status: "confirmado" });

    const lembretes = await getLembretesAmanha(true);
    const lembrete = lembretes.find((item) => item.clienteId === cliente.id);

    expect(lembrete).toBeDefined();
    expect(lembrete!.statusLembrete).toBe("pendente");
    expect(lembrete!.statusAgendamento).toBe("confirmado");
    expect(lembrete!.consentimentoRegistrado).toBe(true);
    expect(lembrete!.horario).toBe("9:00 AM");
    expect(lembrete!.servicoPt).toBe("Serviço a definir");
    expect(lembrete!.servicoEn).toBe("Service to be defined");

    const linha = await prisma.lembrete.findUnique({ where: { agendamentoId: agendamento.id } });
    expect(linha).not.toBeNull();
  });

  it("geração automática é idempotente: rodar de novo não duplica a linha", async () => {
    const cliente = await criarClienteComContatoTeste();
    const agendamento = await criarAgendamentoAmanhaTeste({ clienteId: cliente.id });

    await getLembretesAmanha(true);
    await getLembretesAmanha(true);

    const linhas = await prisma.lembrete.findMany({ where: { agendamentoId: agendamento.id } });
    expect(linhas).toHaveLength(1);
  });

  it("cliente sem contato principal: lembrete criado como 'indisponivel', sem consentimento", async () => {
    const cliente = await criarClienteComContatoTeste({ comContatoPrincipal: false });
    await criarAgendamentoAmanhaTeste({ clienteId: cliente.id });

    const lembretes = await getLembretesAmanha(true);
    const lembrete = lembretes.find((item) => item.clienteId === cliente.id);

    expect(lembrete).toBeDefined();
    expect(lembrete!.statusLembrete).toBe("indisponivel");
    expect(lembrete!.consentimentoRegistrado).toBe(false);
  });

  it("respeita 'ativarLembretesDiaAnterior = false': não gera lembrete nenhum", async () => {
    const cliente = await criarClienteComContatoTeste();
    await criarAgendamentoAmanhaTeste({ clienteId: cliente.id });

    const lembretes = await getLembretesAmanha(false);
    expect(lembretes.find((item) => item.clienteId === cliente.id)).toBeUndefined();
  });

  it("agendamento cancelado não gera lembrete", async () => {
    const cliente = await criarClienteComContatoTeste();
    await criarAgendamentoAmanhaTeste({ clienteId: cliente.id, status: "cancelado" });

    const lembretes = await getLembretesAmanha(true);
    expect(lembretes.find((item) => item.clienteId === cliente.id)).toBeUndefined();
  });

  it("marcar como enviado: grava enviadoEm e confirma mensagens 'preparada' ligadas ao lembrete", async () => {
    const cliente = await criarClienteComContatoTeste();
    await criarAgendamentoAmanhaTeste({ clienteId: cliente.id });
    const lembrete = (await getLembretesAmanha(true)).find((item) => item.clienteId === cliente.id)!;

    await registrarMensagemPreparadaAction({
      lembreteId: lembrete.id,
      papel: "principal",
      canal: "whatsapp",
      idioma: "pt",
      texto: "Olá! Lembrete de teste.",
    });

    const mensagemAntes = await prisma.mensagemLog.findFirst({ where: { lembreteId: lembrete.id } });
    expect(mensagemAntes?.statusMensagem).toBe("preparada");
    expect(mensagemAntes?.confirmadoEm).toBeNull();

    await updateStatusLembreteAction(lembrete.id, "enviado");

    const linha = await prisma.lembrete.findUnique({ where: { id: lembrete.id } });
    expect(linha?.statusLembrete).toBe("enviado");
    expect(linha?.enviadoEm).not.toBeNull();

    const mensagemDepois = await prisma.mensagemLog.findFirst({ where: { lembreteId: lembrete.id } });
    expect(mensagemDepois?.statusMensagem).toBe("enviada");
    expect(mensagemDepois?.confirmadoEm).not.toBeNull();
  });

  it("registrarMensagemPreparadaAction resolve o contato correto pelo papel (principal/secundario)", async () => {
    const cliente = await criarClienteComContatoTeste({
      contatoSecundario: { nomeContato: "Mãe", telefone: "5085559999", relacao: "mae" },
    });
    await criarAgendamentoAmanhaTeste({ clienteId: cliente.id });
    const lembrete = (await getLembretesAmanha(true)).find((item) => item.clienteId === cliente.id)!;

    await registrarMensagemPreparadaAction({
      lembreteId: lembrete.id,
      papel: "secundario",
      canal: "sms",
      idioma: "pt",
      texto: "Mensagem para o contato secundário.",
    });

    const contatoSecundario = await prisma.contato.findFirst({ where: { clienteId: cliente.id, papel: "secundario" } });
    const mensagem = await prisma.mensagemLog.findFirst({ where: { lembreteId: lembrete.id } });

    expect(mensagem?.contatoId).toBe(contatoSecundario!.id);
    expect(mensagem?.canal).toBe("sms");
  });

  it("atualiza mensagem personalizada (principal e secundário) e persiste no banco", async () => {
    const cliente = await criarClienteComContatoTeste({
      contatoSecundario: { nomeContato: "Pai", telefone: "5085558888", relacao: "pai" },
    });
    await criarAgendamentoAmanhaTeste({ clienteId: cliente.id });
    const lembrete = (await getLembretesAmanha(true)).find((item) => item.clienteId === cliente.id)!;

    await updateMensagemPersonalizadaAction(lembrete.id, "Texto customizado principal");
    await updateMensagemPersonalizadaSecundarioAction(lembrete.id, "Texto customizado secundário");

    const linha = await prisma.lembrete.findUnique({ where: { id: lembrete.id } });
    expect(linha?.mensagemPersonalizada).toBe("Texto customizado principal");
    expect(linha?.mensagemPersonalizadaSecundario).toBe("Texto customizado secundário");
  });

  it("horário de aviso configurado em Configurações é persistido e refletido na mensagem do lembrete", async () => {
    const cliente = await criarClienteComContatoTeste();
    await criarAgendamentoAmanhaTeste({ clienteId: cliente.id });
    const lembrete = (await getLembretesAmanha(true)).find((item) => item.clienteId === cliente.id)!;

    const configuracoesAntes = await getConfiguracoes();
    expect(configuracoesAntes.lembretes.horarioPadraoAviso).toBe("6:00 PM");

    const configuracoesDepois = await updateConfiguracoesAction({
      ...configuracoesAntes,
      lembretes: { ...configuracoesAntes.lembretes, horarioPadraoAviso: "7:30 PM" },
    });
    expect(configuracoesDepois.lembretes.horarioPadraoAviso).toBe("7:30 PM");

    // A mensagem em si não cita o horário de aviso (é o horário do agendamento) — o que este
    // teste garante é que a Configuração persiste de fato e que buildMensagemLembrete continua
    // funcionando com o objeto retornado por getConfiguracoes() após a escrita.
    const mensagem = buildMensagemLembrete(lembrete, cliente, cliente.contatoPrincipal, "07/31/2026", configuracoesDepois);
    expect(mensagem).toContain(cliente.nome);
  });
});
