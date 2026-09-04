import { describe, it, expect, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import {
  registrarMensagemClientePreparadaAction,
  registrarMensagemPreparadaAction,
  updateStatusLembreteAction,
} from "@/lib/lembretes-actions";
import { getLembretesAmanha } from "@/lib/lembretes-repo";
import { buildMensagemContato, whatsappHref, smsHref } from "@/lib/mensagens";
import { criarClienteComContatoTeste, criarAgendamentoAmanhaTeste } from "../helpers/lembretes-fixtures";

const textoDe = (idioma: "pt" | "en" | "bilingue", nome: string) =>
  buildMensagemContato(idioma, { nome, data: "06/20/2027", horario: "2:00 PM", servicoPt: null, servicoEn: null });

describe("mensagem avulsa pela ficha da cliente (registrarMensagemClientePreparadaAction)", () => {
  it("WhatsApp avulso: registra 'preparada' em mensagens_log, sem lembrete, sem confirmação", async () => {
    const cliente = await criarClienteComContatoTeste({ contatoPrincipal: { telefone: "5085551111", idioma: "pt" } });
    const texto = textoDe("pt", cliente.nomePreferencia ?? cliente.nome);

    // o app só prepara o link — não transmite nada.
    expect(whatsappHref(cliente.contatoPrincipal!.telefone, texto)).toBe(
      `https://wa.me/15085551111?text=${encodeURIComponent(texto)}`,
    );

    await registrarMensagemClientePreparadaAction({
      clienteId: cliente.id,
      papel: "principal",
      canal: "whatsapp",
      idioma: "pt",
      texto,
    });

    const registro = await prisma.mensagemLog.findFirst({ where: { clienteId: cliente.id } });
    expect(registro?.statusMensagem).toBe("preparada");
    expect(registro?.canal).toBe("whatsapp");
    expect(registro?.lembreteId).toBeNull();
    expect(registro?.confirmadoEm).toBeNull();
    expect(registro?.contatoId).toBe(
      (await prisma.contato.findFirstOrThrow({ where: { clienteId: cliente.id, papel: "principal" } })).id,
    );
  });

  it("SMS avulso: registra 'preparada' com canal sms", async () => {
    const cliente = await criarClienteComContatoTeste({ contatoPrincipal: { telefone: "5085552222", idioma: "pt", canalPreferido: "ambos" } });
    const texto = textoDe("pt", cliente.nome);
    expect(smsHref(cliente.contatoPrincipal!.telefone, texto)).toContain("sms:");

    await registrarMensagemClientePreparadaAction({ clienteId: cliente.id, papel: "principal", canal: "sms", idioma: "pt", texto });

    const registro = await prisma.mensagemLog.findFirstOrThrow({ where: { clienteId: cliente.id } });
    expect(registro.canal).toBe("sms");
    expect(registro.statusMensagem).toBe("preparada");
    expect(registro.confirmadoEm).toBeNull();
    expect(registro.lembreteId).toBeNull();
  });

  it("preserva idioma e texto exatamente como preparados (en)", async () => {
    const cliente = await criarClienteComContatoTeste({ contatoPrincipal: { telefone: "5085553333", idioma: "en" } });
    const texto = textoDe("en", cliente.nome);
    expect(texto).toMatch(/^Hi /);

    await registrarMensagemClientePreparadaAction({ clienteId: cliente.id, papel: "principal", canal: "whatsapp", idioma: "en", texto });

    const registro = await prisma.mensagemLog.findFirstOrThrow({ where: { clienteId: cliente.id } });
    expect(registro.idioma).toBe("en");
    expect(registro.textoPreparado).toBe(texto);
  });

  it("resolve o contato secundário pelo papel", async () => {
    const cliente = await criarClienteComContatoTeste({
      contatoPrincipal: { telefone: "5085554444", idioma: "pt" },
      contatoSecundario: { telefone: "5085555555", idioma: "en", nomeContato: "Filha" },
    });
    const secundario = await prisma.contato.findFirstOrThrow({ where: { clienteId: cliente.id, papel: "secundario" } });

    await registrarMensagemClientePreparadaAction({
      clienteId: cliente.id,
      papel: "secundario",
      canal: "whatsapp",
      idioma: "en",
      texto: textoDe("en", cliente.nome),
    });

    const registro = await prisma.mensagemLog.findFirstOrThrow({ where: { clienteId: cliente.id } });
    expect(registro.contatoId).toBe(secundario.id);
    expect(registro.idioma).toBe("en");
  });

  it("nunca marca como enviada automaticamente, mesmo abrindo o link várias vezes", async () => {
    const cliente = await criarClienteComContatoTeste({ contatoPrincipal: { telefone: "5085556666", idioma: "pt" } });

    for (let i = 0; i < 3; i += 1) {
      await registrarMensagemClientePreparadaAction({
        clienteId: cliente.id,
        papel: "principal",
        canal: "whatsapp",
        idioma: "pt",
        texto: `mensagem ${i}`,
      });
    }

    const registros = await prisma.mensagemLog.findMany({ where: { clienteId: cliente.id }, orderBy: { numeroSequencial: "asc" } });
    // clique repetido = tentativas distintas legítimas: um registro por interação, todos "preparada".
    expect(registros).toHaveLength(3);
    expect(registros.every((r) => r.statusMensagem === "preparada")).toBe(true);
    expect(registros.every((r) => r.confirmadoEm === null)).toBe(true);
    expect(registros.map((r) => r.textoPreparado)).toEqual(["mensagem 0", "mensagem 1", "mensagem 2"]);
  });

  it("repete a gravação quando outra aba ocupa o mesmo número sequencial", async () => {
    const cliente = await criarClienteComContatoTeste({ contatoPrincipal: { telefone: "5085556767", idioma: "pt" } });
    const erroP2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "test",
    });
    const spy = vi.spyOn(prisma, "$transaction").mockImplementationOnce(() => Promise.reject(erroP2002));

    try {
      await registrarMensagemClientePreparadaAction({
        clienteId: cliente.id,
        papel: "principal",
        canal: "whatsapp",
        idioma: "pt",
        texto: "mensagem concorrente",
      });
      expect(await prisma.mensagemLog.count({ where: { clienteId: cliente.id } })).toBe(1);
      expect(spy).toHaveBeenCalledTimes(2);
    } finally {
      spy.mockRestore();
    }
  });

  it("não repete nem oculta erros que não sejam colisão de unicidade", async () => {
    const cliente = await criarClienteComContatoTeste({ contatoPrincipal: { telefone: "5085556868", idioma: "pt" } });
    const erro = new Error("falha de conexão");
    const spy = vi.spyOn(prisma, "$transaction").mockImplementationOnce(() => Promise.reject(erro));

    try {
      await expect(
        registrarMensagemClientePreparadaAction({
          clienteId: cliente.id,
          papel: "principal",
          canal: "whatsapp",
          idioma: "pt",
          texto: "não deve gravar",
        }),
      ).rejects.toBe(erro);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(await prisma.mensagemLog.count({ where: { clienteId: cliente.id } })).toBe(0);
    } finally {
      spy.mockRestore();
    }
  });

  it("cliente inexistente: nenhum registro é gravado (coerente com o modelo da Agenda)", async () => {
    await registrarMensagemClientePreparadaAction({
      clienteId: "CLI-inexistente",
      papel: "principal",
      canal: "whatsapp",
      idioma: "pt",
      texto: "não deveria gravar",
    });
    expect(await prisma.mensagemLog.count({ where: { clienteId: "CLI-inexistente" } })).toBe(0);
  });

  it("contato inexistente (cliente sem contato principal): nenhum registro é gravado", async () => {
    const cliente = await criarClienteComContatoTeste({ comContatoPrincipal: false });
    await registrarMensagemClientePreparadaAction({
      clienteId: cliente.id,
      papel: "principal",
      canal: "whatsapp",
      idioma: "pt",
      texto: "não deveria gravar",
    });
    expect(await prisma.mensagemLog.count({ where: { clienteId: cliente.id } })).toBe(0);
  });

  it("não cria Lembrete nem exige lembreteId", async () => {
    const cliente = await criarClienteComContatoTeste({ contatoPrincipal: { telefone: "5085557777", idioma: "pt" } });
    await registrarMensagemClientePreparadaAction({ clienteId: cliente.id, papel: "principal", canal: "whatsapp", idioma: "pt", texto: textoDe("pt", cliente.nome) });

    expect(await prisma.lembrete.count({ where: { agendamento: { clienteId: cliente.id } } })).toBe(0);
    const registro = await prisma.mensagemLog.findFirstOrThrow({ where: { clienteId: cliente.id } });
    expect(registro.lembreteId).toBeNull();
  });

  it("preserva o fluxo de Lembretes: 'enviado' confirma só as mensagens do lembrete, não a avulsa da ficha", async () => {
    const cliente = await criarClienteComContatoTeste({ contatoPrincipal: { telefone: "5085558888", idioma: "pt" } });
    const agendamento = await criarAgendamentoAmanhaTeste({ clienteId: cliente.id, status: "confirmado" });
    await getLembretesAmanha(true);
    const lembrete = await prisma.lembrete.findUniqueOrThrow({ where: { agendamentoId: agendamento.id } });

    // mensagem do fluxo de lembrete (com lembreteId)
    await registrarMensagemPreparadaAction({ lembreteId: lembrete.id, papel: "principal", canal: "whatsapp", idioma: "pt", texto: "lembrete de amanhã" });
    // mensagem avulsa pela ficha (sem lembreteId), MESMA cliente
    await registrarMensagemClientePreparadaAction({ clienteId: cliente.id, papel: "principal", canal: "whatsapp", idioma: "pt", texto: "mensagem avulsa" });

    await updateStatusLembreteAction(lembrete.id, "enviado");

    const doLembrete = await prisma.mensagemLog.findFirstOrThrow({ where: { clienteId: cliente.id, lembreteId: lembrete.id } });
    const avulsa = await prisma.mensagemLog.findFirstOrThrow({ where: { clienteId: cliente.id, lembreteId: null } });

    expect(doLembrete.statusMensagem).toBe("enviada");
    expect(doLembrete.confirmadoEm).not.toBeNull();
    // a avulsa da ficha NÃO foi tocada
    expect(avulsa.statusMensagem).toBe("preparada");
    expect(avulsa.confirmadoEm).toBeNull();

    const lembreteFinal = await prisma.lembrete.findUniqueOrThrow({ where: { id: lembrete.id } });
    expect(lembreteFinal.statusLembrete).toBe("enviado");
    expect(lembreteFinal.enviadoEm).not.toBeNull();
  });
});
