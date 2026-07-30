# TESTING_PLAN.md — Suíte de testes automatizados

> Plano objetivo para transformar os testes funcionais descartáveis (scripts `tsx` manuais contra cópias do banco, usados nas revisões de Pagamentos e Financeiro) em uma suíte permanente. Apenas planejamento — nenhum código foi escrito.

## 1. Framework

**Vitest.** Motivos: nativo TypeScript/ESM (sem config de transform como o Jest exige em projetos Next 16/Turbopack), rápido, roda os mesmos arquivos `.ts` que já importamos com `tsx` nos testes descartáveis sem reescrever nada, e não exige DOM/testing-library agora (nenhum teste hoje é de componente React — todos são sobre `lib/*.ts`). Se testes de componente forem necessários depois, `@vitest/browser` ou `@testing-library/react` se encaixam no mesmo runner sem trocar de ferramenta.

## 2. Estrutura de pastas

```
tests/
  unit/
    financeiro-service.test.ts
    pagamentos-repo.test.ts
    atendimentos-mock.test.ts
    financeiro-comparacao.test.ts
  integration/
    atendimentos-actions.test.ts      # concluir/cancelar/estornar + recálculo de status
    pagamentos-ledger.test.ts         # CHECK constraints (natureza/tipo/valor/status)
    financeiro-repo.test.ts           # getLancamentosCaixa contra banco migrado
    clientes-repo.test.ts             # valorPendente/histórico
    agenda-actions.test.ts            # conflito de horário/expediente
  helpers/
    test-db.ts                       # cria/migra/apaga banco de teste isolado
```
Unit = sem banco (funções puras). Integration = com SQLite real migrado. Separar em pastas permite rodar cada grupo isoladamente (item 8).

## 3. Banco SQLite isolado por execução

Helper `tests/helpers/test-db.ts` expõe `createTestDatabase()`:
- Gera um caminho único por arquivo de teste: `os.tmpdir()/brazillian-nail-test-<randomUUID>.db` (nunca dentro de `prisma/`, nunca o arquivo real).
- Retorna esse caminho para setar `process.env.DATABASE_URL` antes de importar `@/lib/db`.
- Nunca reaproveita o arquivo real (`prisma/brazillian-nail.db`) nem sua cópia manual — elimina o risco que exigia aviso prévio ao usuário nas sessões anteriores.

## 4. Aplicar schema/migrations no banco de teste

`createTestDatabase()` roda, via `child_process.execFileSync`, o comando real de migração:
```
npx prisma migrate deploy --schema=prisma/schema.prisma
```
com `DATABASE_URL` apontando para o arquivo temporário. Usar `migrate deploy` (não `db push`) é deliberado: é o mesmo caminho usado em produção, então o teste também valida que **as migrations aplicam limpas do zero** — pega justamente o tipo de problema já encontrado (CHECK constraint perdida em `atendimentos.status`, drift de checksum). Rodar isso uma vez por arquivo de teste de integração, em `beforeAll`/`globalSetup` do Vitest.

## 5. Limpeza e independência entre testes

- **Isolamento por arquivo, não por teste individual**: cada arquivo `tests/integration/*.test.ts` cria seu próprio banco migrado em `beforeAll` e apaga o arquivo em `afterAll` (`fs.rmSync`). Evita "vazamento" de estado entre arquivos sem pagar o custo de recriar o banco a cada `it()`.
- **Dentro do mesmo arquivo**: cada `it()` cria seus próprios registros com IDs próprios (ex.: cliente/atendimento dedicados ao teste) em vez de depender de dados semeados globalmente — mesmo padrão já usado nos scripts descartáveis (`novoAtendimento(...)` por cenário). Sem factory de dados compartilhados mutáveis entre testes.
- **Configurar Vitest com `fileParallelism: false`** para os testes de integração (ou `poolOptions.threads.singleThread`) — evita dois arquivos de teste tentando usar o mesmo `DATABASE_URL` global por engano; cada arquivo seta o seu próprio antes de importar `db.ts`.
- **Nunca tocar `prisma/brazillian-nail.db`** — nenhum teste deve importar `@/lib/db` antes de `DATABASE_URL` estar redirecionado para o arquivo temporário do teste.

## 6. Ordem de prioridade dos primeiros testes

1. **`financeiro-service.ts` (unit)** — D1–D4, `calcularAgregadoFinanceiro`, `listarPendencias`, `buscarAtendimentoFinanceiro`, estados vazios. Já tem 24 casos manuais prontos para converter; zero dependência de banco (mais rápido de portar e mais valor imediato).
2. **`atendimentos-actions.ts` (integration)** — concluir/cancelar/estornar + recálculo de status no servidor (o bug de segurança já corrigido nesta revisão). É a lógica que move dinheiro; maior risco se regredir silenciosamente.
3. **CHECK constraints do ledger (integration)** — inserir `natureza`/`tipo`/`status`/`valor` inválidos direto via SQL e confirmar rejeição. Guarda a correção já aplicada na migration `20260729090000`.
4. **`pagamentos-repo.ts` (unit)** — `calcularValorRecebidoServico/Gorjeta`, `calcularFormaPagamentoPrincipal`. Pequeno, mas é a fonte única reaproveitada por Atendimentos, Clientes e Financeiro — regressão aqui quebra os três módulos de uma vez.
5. **`clientes-repo.ts` (integration)** — `valorPendente`/histórico, já que depende da mesma regra do item 4 aplicada em outra camada.
6. **`agenda-actions.ts` (integration)** — validação de conflito/expediente.

## 7. Unitário vs. integração por módulo

| Sem banco (unit) | Com banco real migrado (integration) |
|---|---|
| `financeiro-service.ts` | `atendimentos-actions.ts` |
| `pagamentos-repo.ts` | `clientes-actions.ts` / `clientes-repo.ts` |
| `atendimentos-mock.ts` (`saldoPendente`, `valorTotalDevido`) | `agenda-actions.ts` |
| `financeiro-comparacao.ts` (matemática de datas) | `servicos-actions.ts` |
| `date.ts` | `financeiro-repo.ts` |
| | Migrations/CHECK constraints (smoke test de schema) |

Regra prática: se o módulo importa `@/lib/db`, é integração; se não importa, é unitário.

## 8. Executar tudo com um único comando

```bash
npm test
```
roda `vitest run` (todas as pastas). Local, sem watch, sai com código de saída não-zero em falha — apto para uso manual e para CI.

## 9. Scripts a adicionar no `package.json`

```json
"test": "vitest run",
"test:watch": "vitest",
"test:unit": "vitest run tests/unit",
"test:integration": "vitest run tests/integration"
```
Dependência de desenvolvimento a instalar: `vitest` (só isso — sem `@testing-library/react` por enquanto, já que não há teste de componente planejado nesta primeira leva).

## 10. Critério objetivo de conclusão desta etapa

A suíte inicial está pronta quando, **todas** as condições abaixo forem verdadeiras:
- `npm test` roda do zero (checkout limpo, sem banco pré-existente) e passa, sem tocar `prisma/brazillian-nail.db`.
- Os 24 casos já validados manualmente para Pagamentos e os 24 para Financeiro estão portados 1:1 como `it()`s (nenhuma cobertura perdida na migração de script descartável → suíte).
- Toda CHECK constraint da migration `20260729090000` tem um teste que tenta violá-la e espera rejeição.
- O bug de recálculo de status (server nunca confia no status enviado pelo cliente) tem teste explícito que falharia se a validação fosse removida.
- Suíte inteira roda em menos de ~30s localmente (sinal de que está usando bancos por arquivo, não recriando por teste).
- Nenhum teste depende de ordem de execução entre arquivos (rodar um arquivo isolado com `vitest run tests/integration/atendimentos-actions.test.ts` também passa).
