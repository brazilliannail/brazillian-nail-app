import { describe, expect, it } from "vitest";
import { compararIgnorandoAcentosEMaiusculas, ordenarPorTexto } from "@/lib/ordenacao";

describe("compararIgnorandoAcentosEMaiusculas", () => {
  it("trata acentos como equivalentes à letra base", () => {
    expect(compararIgnorandoAcentosEMaiusculas("Álvaro", "Alvaro")).toBe(0);
  });

  it("trata maiúsculas e minúsculas como equivalentes", () => {
    expect(compararIgnorandoAcentosEMaiusculas("ana", "ANA")).toBe(0);
  });

  it("ordena letras diferentes normalmente", () => {
    expect(compararIgnorandoAcentosEMaiusculas("ana", "beatriz")).toBeLessThan(0);
    expect(compararIgnorandoAcentosEMaiusculas("beatriz", "ana")).toBeGreaterThan(0);
  });
});

describe("ordenarPorTexto", () => {
  it("ordena alfabeticamente ignorando acentos e caixa", () => {
    const itens = ["Zilda", "ana", "Álvaro", "beatriz", "É preciso"];
    const ordenado = ordenarPorTexto(itens, (item) => item);
    expect(ordenado).toEqual(["Álvaro", "ana", "beatriz", "É preciso", "Zilda"]);
  });

  it("não muta a lista original (só apresentação, ordem de armazenamento preservada)", () => {
    const original = ["Zilda", "Ana", "Beatriz"];
    const copia = [...original];
    ordenarPorTexto(original, (item) => item);
    expect(original).toEqual(copia);
  });

  it("ordena objetos por um campo de texto extraído", () => {
    const clientes = [
      { id: "3", nome: "Carla" },
      { id: "1", nome: "ana" },
      { id: "2", nome: "Ângela" },
    ];
    const ordenado = ordenarPorTexto(clientes, (c) => c.nome);
    expect(ordenado.map((c) => c.id)).toEqual(["1", "2", "3"]);
  });
});
