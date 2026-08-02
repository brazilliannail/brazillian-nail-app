import { describe, it, expect, vi } from "vitest";

// Server Actions chamam `revalidatePath` (next/cache), que depende de um request scope do Next.js
// em execução — inexistente aqui, fora do servidor (mesmo mock usado nas demais suítes).
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import {
  createClienteAction,
  updateClienteAction,
  toggleStatusClienteAction,
} from "@/lib/clientes-actions";
import { getClientes, getClienteById } from "@/lib/clientes-repo";

let contador = 0;
function proximoSufixo() {
  contador += 1;
  return `${Date.now()}-${contador}`;
}

describe("clientes (clientes-actions + clientes-repo)", () => {
  it("cria cliente com contato principal e secundário, e ela aparece em getClientes()", async () => {
    const sufixo = proximoSufixo();

    const criada = await createClienteAction({
      nome: `Cliente Teste ${sufixo}`,
      nomePreferencia: null,
      contatoPrincipal: {
        nomeContato: "Contato Principal",
        telefone: "5085551111",
        relacao: "propria",
        idioma: "pt",
        canalPreferido: "whatsapp",
        receberLembretes: true,
      },
      contatoSecundario: {
        nomeContato: "Mãe",
        telefone: "5085552222",
        relacao: "mae",
        idioma: "pt",
        canalPreferido: "sms",
        receberLembretes: true,
      },
      status: "ativa",
      ultimoAtendimento: "",
      proximoAgendamento: null,
      observacoesPt: "",
      observacoesEn: "",
      avisosImportantesPt: [],
      avisosImportantesEn: [],
      valorPendente: 0,
      historico: [],
    });

    expect(criada.status).toBe("ativa");
    expect(criada.contatoPrincipal?.telefone).toBe("5085551111");
    expect(criada.contatoSecundario?.telefone).toBe("5085552222");

    const clientes = await getClientes();
    expect(clientes.some((c) => c.id === criada.id)).toBe(true);

    const buscada = await getClienteById(criada.id);
    expect(buscada?.nome).toBe(`Cliente Teste ${sufixo}`);
  });

  it("rejeita nome vazio", async () => {
    await expect(
      createClienteAction({
        nome: "   ",
        nomePreferencia: null,
        contatoPrincipal: null,
        contatoSecundario: null,
        status: "ativa",
        ultimoAtendimento: "",
        proximoAgendamento: null,
        observacoesPt: "",
        observacoesEn: "",
        avisosImportantesPt: [],
        avisosImportantesEn: [],
        valorPendente: 0,
        historico: [],
      }),
    ).rejects.toThrow("Nome é obrigatório.");
  });

  it("rejeita contato com telefone vazio", async () => {
    await expect(
      createClienteAction({
        nome: `Cliente Teste ${proximoSufixo()}`,
        nomePreferencia: null,
        contatoPrincipal: {
          nomeContato: "Contato sem telefone",
          telefone: "  ",
          relacao: "propria",
          idioma: "pt",
          canalPreferido: "whatsapp",
          receberLembretes: true,
        },
        contatoSecundario: null,
        status: "ativa",
        ultimoAtendimento: "",
        proximoAgendamento: null,
        observacoesPt: "",
        observacoesEn: "",
        avisosImportantesPt: [],
        avisosImportantesEn: [],
        valorPendente: 0,
        historico: [],
      }),
    ).rejects.toThrow("Telefone do contato é obrigatório.");
  });

  it("rejeita contato com telefone com menos de 7 dígitos (mesma regra de ClienteFormModal)", async () => {
    await expect(
      createClienteAction({
        nome: `Cliente Teste ${proximoSufixo()}`,
        nomePreferencia: null,
        contatoPrincipal: {
          nomeContato: "Contato com telefone curto",
          telefone: "(555) 12",
          relacao: "propria",
          idioma: "pt",
          canalPreferido: "whatsapp",
          receberLembretes: true,
        },
        contatoSecundario: null,
        status: "ativa",
        ultimoAtendimento: "",
        proximoAgendamento: null,
        observacoesPt: "",
        observacoesEn: "",
        avisosImportantesPt: [],
        avisosImportantesEn: [],
        valorPendente: 0,
        historico: [],
      }),
    ).rejects.toThrow("Telefone do contato é inválido.");
  });

  it("aceita telefone com 7+ dígitos mesmo com formatação (parênteses, espaços, traço, +)", async () => {
    const criada = await createClienteAction({
      nome: `Cliente Teste ${proximoSufixo()}`,
      nomePreferencia: null,
      contatoPrincipal: {
        nomeContato: "Contato formatado",
        telefone: "+1 (508) 555-0100",
        relacao: "propria",
        idioma: "pt",
        canalPreferido: "whatsapp",
        receberLembretes: true,
      },
      contatoSecundario: null,
      status: "ativa",
      ultimoAtendimento: "",
      proximoAgendamento: null,
      observacoesPt: "",
      observacoesEn: "",
      avisosImportantesPt: [],
      avisosImportantesEn: [],
      valorPendente: 0,
      historico: [],
    });
    expect(criada.contatoPrincipal?.telefone).toBe("+1 (508) 555-0100");
  });

  it("atualiza dados e sincroniza contatos: remover contato secundário de fato o apaga", async () => {
    const sufixo = proximoSufixo();
    const criada = await createClienteAction({
      nome: `Cliente Teste ${sufixo}`,
      nomePreferencia: null,
      contatoPrincipal: {
        nomeContato: "Contato Principal",
        telefone: "5085553333",
        relacao: "propria",
        idioma: "pt",
        canalPreferido: "whatsapp",
        receberLembretes: true,
      },
      contatoSecundario: {
        nomeContato: "Pai",
        telefone: "5085554444",
        relacao: "pai",
        idioma: "pt",
        canalPreferido: "whatsapp",
        receberLembretes: true,
      },
      status: "ativa",
      ultimoAtendimento: "",
      proximoAgendamento: null,
      observacoesPt: "",
      observacoesEn: "",
      avisosImportantesPt: [],
      avisosImportantesEn: [],
      valorPendente: 0,
      historico: [],
    });

    const atualizada = await updateClienteAction({
      ...criada,
      nomePreferencia: "Apelido",
      observacoesPt: "Observação atualizada.",
      contatoSecundario: null,
    });

    expect(atualizada.nomePreferencia).toBe("Apelido");
    expect(atualizada.observacoesPt).toBe("Observação atualizada.");
    expect(atualizada.contatoPrincipal?.telefone).toBe("5085553333");
    expect(atualizada.contatoSecundario).toBeNull();
  });

  it("updateClienteAction rejeita cliente inexistente", async () => {
    await expect(
      updateClienteAction({
        id: "CLI-999999",
        nome: "Cliente Fantasma",
        nomePreferencia: null,
        contatoPrincipal: null,
        contatoSecundario: null,
        status: "ativa",
        ultimoAtendimento: "",
        proximoAgendamento: null,
        observacoesPt: "",
        observacoesEn: "",
        avisosImportantesPt: [],
        avisosImportantesEn: [],
        valorPendente: 0,
        historico: [],
      }),
    ).rejects.toThrow("Cliente não encontrada.");
  });

  it("alterna status ativa/inativa (toggleStatusClienteAction)", async () => {
    const criada = await createClienteAction({
      nome: `Cliente Teste ${proximoSufixo()}`,
      nomePreferencia: null,
      contatoPrincipal: null,
      contatoSecundario: null,
      status: "ativa",
      ultimoAtendimento: "",
      proximoAgendamento: null,
      observacoesPt: "",
      observacoesEn: "",
      avisosImportantesPt: [],
      avisosImportantesEn: [],
      valorPendente: 0,
      historico: [],
    });
    expect(criada.status).toBe("ativa");

    const inativada = await toggleStatusClienteAction(criada.id);
    expect(inativada.status).toBe("inativa");

    const reativada = await toggleStatusClienteAction(criada.id);
    expect(reativada.status).toBe("ativa");
  });

  it("getClienteById retorna null para id inexistente", async () => {
    const buscada = await getClienteById("CLI-999999");
    expect(buscada).toBeNull();
  });
});
