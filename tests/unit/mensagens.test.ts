import { describe, expect, it } from "vitest";
import { buildMensagemContato, smsHref, whatsappHref } from "@/lib/mensagens";

describe("buildMensagemContato", () => {
  const dadosComAgendamento = {
    nome: "Maria",
    data: "06/15/2027",
    horario: "10:00 AM",
    servicoPt: null,
    servicoEn: null,
  };

  it("usa o nome preferido, data e horário recebidos, em português quando idioma = pt", () => {
    const texto = buildMensagemContato("pt", dadosComAgendamento);
    expect(texto).toContain("Maria");
    expect(texto).toContain("06/15/2027");
    expect(texto).toContain("10:00 AM");
    expect(texto).toMatch(/^Olá Maria!/);
  });

  it("monta em inglês quando idioma = en", () => {
    const texto = buildMensagemContato("en", dadosComAgendamento);
    expect(texto).toContain("Maria");
    expect(texto).toContain("06/15/2027");
    expect(texto).toContain("10:00 AM");
    expect(texto).toMatch(/^Hi Maria!/);
    expect(texto).not.toContain("Olá");
  });

  it("monta os dois idiomas, um abaixo do outro, quando idioma = bilingue", () => {
    const texto = buildMensagemContato("bilingue", dadosComAgendamento);
    expect(texto).toMatch(/^Olá Maria!/);
    expect(texto).toContain("Hi Maria!");
    expect(texto.split("\n\n")).toHaveLength(2);
  });

  it("sem data/horário, usa a saudação genérica (sem inventar data)", () => {
    const texto = buildMensagemContato("pt", { ...dadosComAgendamento, data: null, horario: null });
    expect(texto).not.toContain("06/15/2027");
    expect(texto).toContain("Olá Maria!");
  });
});

describe("whatsappHref: normalização do telefone para o link (nunca reescreve o telefone armazenado)", () => {
  it("número local dos EUA com 10 dígitos ganha o prefixo '1'", () => {
    expect(whatsappHref("5085550100", "oi")).toBe("https://wa.me/15085550100?text=oi");
  });

  it("parênteses, espaços e hífen são removidos ao montar o link (número local, 10 dígitos)", () => {
    expect(whatsappHref("(508) 555-0100", "oi")).toBe("https://wa.me/15085550100?text=oi");
  });

  it("número escrito como '+1 (...)' produz exatamente os 11 dígitos esperados, sem duplicar o '1'", () => {
    expect(whatsappHref("+1 (508) 555-0100", "oi")).toBe("https://wa.me/15085550100?text=oi");
  });

  it("número já com '1' + 10 dígitos (sem '+', só espaços) não ganha outro '1' — regressão do bug corrigido nesta fase", () => {
    expect(whatsappHref("1 508 555 0100", "oi")).toBe("https://wa.me/15085550100?text=oi");
    expect(whatsappHref("1-508-555-0100", "oi")).toBe("https://wa.me/15085550100?text=oi");
  });

  it("todos os formatos equivalentes (10 dígitos, +1 formatado, 1 já prefixado) geram o MESMO link", () => {
    const esperado = "https://wa.me/15085550100?text=oi";
    expect(whatsappHref("5085550100", "oi")).toBe(esperado);
    expect(whatsappHref("(508) 555-0100", "oi")).toBe(esperado);
    expect(whatsappHref("+1 (508) 555-0100", "oi")).toBe(esperado);
    expect(whatsappHref("1 508 555 0100", "oi")).toBe(esperado);
  });

  it("entrada vazia ou sem nenhum dígito não gera link funcional (string vazia)", () => {
    expect(whatsappHref("", "oi")).toBe("");
    expect(whatsappHref("   ", "oi")).toBe("");
    expect(whatsappHref("abc", "oi")).toBe("");
  });

  it("não modifica a string de telefone original recebida (só lê, nunca reatribui/retorna telefone)", () => {
    const telefoneOriginal = "+1 (508) 555-0100";
    const referenciaAntes = telefoneOriginal;
    whatsappHref(telefoneOriginal, "oi");
    expect(telefoneOriginal).toBe(referenciaAntes);
  });

  it("mensagem é URL-encoded no link", () => {
    expect(whatsappHref("5085550100", "Olá! Tudo bem?")).toBe(
      "https://wa.me/15085550100?text=Ol%C3%A1!%20Tudo%20bem%3F",
    );
  });
});

describe("smsHref", () => {
  it("preserva a formatação original do telefone (não normaliza dígitos)", () => {
    expect(smsHref("(508) 555-0100", "oi")).toBe("sms:(508) 555-0100?&body=oi");
  });
});
