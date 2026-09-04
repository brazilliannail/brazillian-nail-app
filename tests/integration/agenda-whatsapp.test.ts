import { describe, it, expect, vi } from "vitest";

// Server Actions chamam `revalidatePath` (next/cache), que depende de um request scope do Next.js
// em execução — inexistente aqui, fora do servidor (mesmo mock usado nas demais suítes).
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { registrarMensagemAgendamentoPreparadaAction } from "@/lib/lembretes-actions";
import { createAgendamentoAction } from "@/lib/agenda-actions";
import { buildMensagemContato, whatsappHref } from "@/lib/mensagens";
import { prisma } from "@/lib/db";
import { criarClienteComContatoTeste, dataAmanhaMMDDYYYY } from "../helpers/lembretes-fixtures";

describe("WhatsApp na Agenda: preparo da mensagem (registrarMensagemAgendamentoPreparadaAction)", () => {
  it("cliente com telefone: monta o link do WhatsApp e registra 'preparada' em mensagens_log (nunca 'enviada')", async () => {
    const cliente = await criarClienteComContatoTeste({
      contatoPrincipal: { nomeContato: "Maria", telefone: "5085551234", idioma: "pt" },
    });
    const agendamento = await createAgendamentoAction({
      clienteId: cliente.id,
      servicoId: null,
      status: "confirmado",
      data: dataAmanhaMMDDYYYY(),
      inicioMin: 9 * 60,
      fimMin: 10 * 60,
      valorEstimado: null,
      observacoesPt: "",
      observacoesEn: "",
    });

    const nomePreferido = cliente.nomePreferencia ?? cliente.nome;
    const texto = buildMensagemContato(cliente.contatoPrincipal!.idioma, {
      nome: nomePreferido,
      data: agendamento.data,
      horario: "9:00 AM",
      servicoPt: null,
      servicoEn: null,
    });
    const href = whatsappHref(cliente.contatoPrincipal!.telefone, texto);
    expect(href).toBe(`https://wa.me/15085551234?text=${encodeURIComponent(texto)}`);

    await registrarMensagemAgendamentoPreparadaAction({
      clienteId: cliente.id,
      papel: "principal",
      canal: "whatsapp",
      idioma: cliente.contatoPrincipal!.idioma,
      texto,
    });

    const registro = await prisma.mensagemLog.findFirst({ where: { clienteId: cliente.id } });
    expect(registro).not.toBeNull();
    expect(registro?.statusMensagem).toBe("preparada");
    expect(registro?.confirmadoEm).toBeNull();
    expect(registro?.lembreteId).toBeNull();
    expect(registro?.canal).toBe("whatsapp");
    expect(registro?.idioma).toBe("pt");
    expect(registro?.textoPreparado).toBe(texto);
    expect(registro?.textoPreparado).toContain(agendamento.data);
    expect(registro?.textoPreparado).toContain("9:00 AM");
    expect(registro?.textoPreparado).toContain(nomePreferido);
  });

  it("usa o nome preferido da cliente na mensagem, não o nome completo", async () => {
    const cliente = await criarClienteComContatoTeste({
      contatoPrincipal: { telefone: "5085559999", idioma: "pt" },
    });
    // `criarClienteComContatoTeste` não define nomePreferencia; simula uma cliente que tem um
    // apelido diferente do nome completo persistindo diretamente (o que a Agenda leria de volta).
    await prisma.cliente.update({ where: { id: cliente.id }, data: { nomePreferencia: "Nena" } });
    const clienteAtualizado = await prisma.cliente.findUniqueOrThrow({ where: { id: cliente.id } });

    const texto = buildMensagemContato("pt", {
      nome: clienteAtualizado.nomePreferencia ?? clienteAtualizado.nome,
      data: "06/20/2027",
      horario: "2:00 PM",
      servicoPt: null,
      servicoEn: null,
    });

    expect(texto).toContain("Nena");
    expect(texto).not.toContain(clienteAtualizado.nome);
  });

  it("respeita o idioma cadastrado do contato principal (en)", async () => {
    const cliente = await criarClienteComContatoTeste({
      contatoPrincipal: { telefone: "5085557777", idioma: "en" },
    });

    const texto = buildMensagemContato(cliente.contatoPrincipal!.idioma, {
      nome: cliente.nomePreferencia ?? cliente.nome,
      data: "06/20/2027",
      horario: "2:00 PM",
      servicoPt: null,
      servicoEn: null,
    });

    expect(texto).toMatch(/^Hi /);
    expect(texto).not.toContain("Olá");

    await registrarMensagemAgendamentoPreparadaAction({
      clienteId: cliente.id,
      papel: "principal",
      canal: "whatsapp",
      idioma: cliente.contatoPrincipal!.idioma,
      texto,
    });
    const registro = await prisma.mensagemLog.findFirst({ where: { clienteId: cliente.id } });
    expect(registro?.idioma).toBe("en");
  });

  it("cliente sem contato principal: não registra nada (sem telefone, não há o que preparar)", async () => {
    const cliente = await criarClienteComContatoTeste({ comContatoPrincipal: false });

    await registrarMensagemAgendamentoPreparadaAction({
      clienteId: cliente.id,
      papel: "principal",
      canal: "whatsapp",
      idioma: "pt",
      texto: "não deveria ser gravado",
    });

    const registros = await prisma.mensagemLog.findMany({ where: { clienteId: cliente.id } });
    expect(registros).toHaveLength(0);
  });

  it("nunca marca a mensagem como enviada automaticamente, mesmo preparando várias vezes seguidas", async () => {
    const cliente = await criarClienteComContatoTeste({
      contatoPrincipal: { telefone: "5085552222", idioma: "pt" },
    });

    for (let i = 0; i < 3; i += 1) {
      await registrarMensagemAgendamentoPreparadaAction({
        clienteId: cliente.id,
        papel: "principal",
        canal: "whatsapp",
        idioma: "pt",
        texto: `mensagem ${i}`,
      });
    }

    const registros = await prisma.mensagemLog.findMany({ where: { clienteId: cliente.id } });
    expect(registros).toHaveLength(3);
    expect(registros.every((r) => r.statusMensagem === "preparada")).toBe(true);
    expect(registros.every((r) => r.confirmadoEm === null)).toBe(true);
  });
});
