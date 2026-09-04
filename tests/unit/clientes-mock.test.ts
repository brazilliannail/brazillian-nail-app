import { describe, expect, it } from "vitest";
import { aniversarioDiaMesValido, primeiroNome } from "@/lib/clientes-mock";

describe("primeiroNome", () => {
  it("extrai o primeiro nome de um nome completo simples", () => {
    expect(primeiroNome("Maria Costa")).toBe("Maria");
  });

  it("colapsa espaços extras entre e ao redor das palavras", () => {
    expect(primeiroNome("  Maria    Costa  ")).toBe("Maria");
  });

  it("retorna o próprio valor quando há só um nome", () => {
    expect(primeiroNome("Maria")).toBe("Maria");
  });

  it("retorna string vazia quando o nome completo está vazio", () => {
    expect(primeiroNome("")).toBe("");
    expect(primeiroNome("   ")).toBe("");
  });
});

describe("aniversarioDiaMesValido", () => {
  it("aceita quando nada foi informado", () => {
    expect(aniversarioDiaMesValido(null, null)).toBe(true);
  });

  it("aceita uma data válida com dia e mês", () => {
    expect(aniversarioDiaMesValido(15, 6)).toBe(true);
  });

  it("aceita 29 de fevereiro (ano é independente/pode não existir)", () => {
    expect(aniversarioDiaMesValido(29, 2)).toBe(true);
  });

  it("rejeita dia sem mês", () => {
    expect(aniversarioDiaMesValido(15, null)).toBe(false);
  });

  it("rejeita mês sem dia", () => {
    expect(aniversarioDiaMesValido(null, 6)).toBe(false);
  });

  it("rejeita mês fora do intervalo 1-12", () => {
    expect(aniversarioDiaMesValido(10, 13)).toBe(false);
    expect(aniversarioDiaMesValido(10, 0)).toBe(false);
  });

  it("rejeita dia inválido para o mês (ex.: 30 de fevereiro, 31 de abril)", () => {
    expect(aniversarioDiaMesValido(30, 2)).toBe(false);
    expect(aniversarioDiaMesValido(31, 4)).toBe(false);
  });
});
