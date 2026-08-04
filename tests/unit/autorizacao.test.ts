import { describe, expect, it } from "vitest";
import { isRosangela, ROSANGELA_EMAIL } from "@/lib/auth/authorization";

describe("autorização exclusiva da Rosangela", () => {
  it("aceita o e-mail autorizado sem diferenciar maiúsculas ou espaços", () => {
    expect(isRosangela(ROSANGELA_EMAIL)).toBe(true);
    expect(isRosangela(`  ${ROSANGELA_EMAIL.toUpperCase()}  `)).toBe(true);
  });

  it("rejeita ausência, variações e outros usuários", () => {
    expect(isRosangela(null)).toBe(false);
    expect(isRosangela(undefined)).toBe(false);
    expect(isRosangela("rosangela@example.com")).toBe(false);
    expect(isRosangela(`${ROSANGELA_EMAIL}.outro`)).toBe(false);
  });
});
