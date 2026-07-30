# DASHBOARD_DESIGN.md — Financeiro/Dashboard

> Documento técnico de arquitetura. **Nenhum código foi alterado nesta etapa.** Este documento mapeia cada card/indicador da tela `/financeiro` (hoje 100% mock) para a camada de persistência real, valida a fonte única da verdade estabelecida em [DATABASE_DESIGN.md](DATABASE_DESIGN.md) e na revisão da camada de pagamentos, e lista decisões de negócio que precisam de validação antes da implementação.

---

## 1. Visão geral da tela atual

`src/app/financeiro/page.tsx` compõe, nesta ordem:

1. Seletor de período (hoje/semana/mês/ano/personalizado) + seletor de comparação — não é um indicador, é contexto para todos os outros.
2. 7 `StatCard`s de topo (totalRecebido, valorServicos, gorjetas, descontos, totalPendente, quantidadeAtendimentos, ticketMedio), cada um com comparação vs. período anterior.
3. `FormaPagamentoBars` — total recebido por forma de pagamento.
4. `RelatorioAtendimentos` — 13 `StatCard`s adicionais + `DetalhamentoBars` (detalhamento por cliente/serviço/forma/status).
5. Lista de `PagamentoCard` — um card por atendimento com resumo financeiro.
6. `ValorPendenteCard` — lista de saldos em aberto que precisam de cobrança.
7. `FinanceiroDetailsPanel` — drill-down de um item selecionado (das listas 5 ou 6).

Tudo hoje vem de `financeiro-mock.ts` (dados estáticos) e `financeiro-comparacao.ts` (`generateDiaFinanceiro`/`aggregateRange`, que **geram números pseudoaleatórios determinísticos por dia** — não é um cálculo real, é um gerador de dado fictício). A parte de `financeiro-comparacao.ts` que **não** é mock (`getMainRange`, `getCompareRange`, `calcularVariacao`, funções de data) é reaproveitável tal como está.

---

## 2. Fonte única da verdade já estabelecida (não duplicar)

A revisão da camada de pagamentos confirmou que o livro-razão `pagamentos` (natureza `servico`/`gorjeta` × tipo `entrada`/`estorno`) é a única fonte financeira. Os seguintes helpers já existem e **devem ser reaproveitados**, nunca reimplementados:

| Helper | Onde | O que faz |
|---|---|---|
| `calcularValorRecebidoServico(pagamentos)` | [pagamentos-repo.ts](src/lib/pagamentos-repo.ts) | líquido (entrada − estorno) de natureza `servico` |
| `calcularValorRecebidoGorjeta(pagamentos)` | [pagamentos-repo.ts](src/lib/pagamentos-repo.ts) | líquido de natureza `gorjeta` |
| `calcularFormaPagamentoPrincipal(pagamentos)` | [pagamentos-repo.ts](src/lib/pagamentos-repo.ts) | forma do lançamento de entrada de serviço mais recente |
| `STATUS_ATENDIMENTO_COM_SALDO_ABERTO` | [pagamentos-repo.ts](src/lib/pagamentos-repo.ts) | quais status de atendimento contam para saldo pendente |
| `mapAtendimentoRow` | [atendimentos-repo.ts](src/lib/atendimentos-repo.ts) | atendimento + serviços + pagamentos → `Atendimento` da UI |
| `calcularValorPendenteCliente` | [clientes-repo.ts](src/lib/clientes-repo.ts) (privada hoje) | saldo pendente somando atendimentos com saldo aberto |

**Ação de centralização nº 1**: `calcularValorPendenteCliente` está hoje presa e privada em `clientes-repo.ts`, mas o Dashboard precisa exatamente da mesma regra (para o card "Total Pendente" e para a lista "Valores Pendentes"). Deve ser promovida para `pagamentos-repo.ts` (ao lado das outras funções de derivação do ledger) e exportada, para que `clientes-repo.ts` e o novo módulo do financeiro chamem a mesma função — hoje ela já está correta e testada, só precisa parar de ser código morto para o resto do app.

---

## 3. Camadas propostas

```
financeiro-repo.ts     → só Prisma: busca atendimentos/agendamentos/pagamentos no intervalo de datas.
                          Não calcula nada de negócio, só filtra e inclui relações.
financeiro-service.ts  → puro (sem I/O): recebe o dataset bruto do repo e devolve exatamente os
                          formatos que a UI consome hoje (AgregadoFinanceiro, RelatorioAtendimentosData,
                          ItemDetalhamento[], PagamentoResumo[], PendenciaResumo[]). Substitui o corpo
                          fictício de generateDiaFinanceiro/aggregateRange por reduções reais sobre o
                          mesmo dataset.
financeiro-comparacao.ts → mantém como está (getMainRange/getCompareRange/calcularVariacao/funções de
                          data): não tem nada de mock, é matemática de intervalo de datas.
```

Regra geral de custo: o app é single-user, local, volume baixo (dezenas/centenas de atendimentos). A estratégia recomendada é **buscar uma vez por período o dataset bruto (atendimentos + serviços + pagamentos do intervalo) e derivar todos os cards a partir dele em memória no Service** — nunca uma query agregada separada por card. Isso evita tanto N+1 (o mock atual, ironicamently, já faz isso "por dia" dentro de `aggregateRange` — não repetir esse padrão com banco real) quanto divergência entre cards que deveriam bater (ex.: soma das barras "por forma de pagamento" deve ser idêntica ao card "Total Recebido").

---

## 4. Decisões de negócio a validar antes de implementar

Estas quatro decisões mudam qual tabela/coluna ancora cada consulta — não são detalhes de implementação, são regras de negócio que só a dona do salão pode confirmar.

### D1 — "Total Pendente" do topo: pendente do período ou pendente em aberto agora? ✅ **Decidido**
O mock atual gera "pendente" como parte do mesmo dia (accrual). Mas um saldo pendente de uma atendimento de março continua pendente em julho — ele não "pertence" só ao mês em que nasceu.
- **Decisão do usuário (2026-07-29)**: o card de topo "Total Pendente" representa o saldo pendente **gerado pelos atendimentos do período selecionado** (atendimentos com `data` dentro do intervalo, mesma base que `valorServicos`/`totalRecebido`) — consistente com os demais cards do mesmo período. Confirma a recomendação original.
- A seção separada "Valores Pendentes" (lista de cobrança) continua usando a métrica **global** (todo saldo em aberto hoje, independente de quando o atendimento ocorreu) via `calcularValorPendenteCliente`/equivalente por atendimento — isso significa que o número do card de topo e a soma da lista "Valores Pendentes" **não vão bater** quando o período for menor que "sempre"; é esperado e deve ficar textualmente claro na UI (ex.: subtítulo "no período" vs. "em aberto hoje").
- **Item de backlog (fora de escopo desta fase)**: o usuário quer, no futuro, um indicador **separado** "Saldo em Aberto (Global)" — soma de todo saldo pendente existente, independente do período selecionado, representando a situação financeira geral da empresa. Esse indicador **não substitui** o "Total Pendente" por período; é um card adicional a ser desenhado depois. Ele reaproveitaria a mesma função global já usada pela lista "Valores Pendentes" (ver §2, ação de centralização nº 1) — não é lógica nova, só um novo card na UI. Não implementar agora.

### D2 — "Cancelamentos" / "Ausências": de `agendamentos` ou de `atendimentos`? ✅ **Decidido**
`atendimentos.status` tem `cancelado`, mas só existe atendimento quando o serviço já começou a ser registrado — a maioria dos cancelamentos e todo "não compareceu" acontece antes disso, só em `agendamentos.status` (`cancelado`, `naoCompareceu`).
- **Decisão do usuário (2026-07-29)**: contar a partir de `agendamentos` (filtrado por `data` no período). Justificativa do usuário: cancelamento e ausência são eventos **da agenda**, não financeiros — um cliente pode cancelar/faltar antes de existir qualquer atendimento; o indicador mede eficiência operacional da agenda, não movimentação financeira.

### D3 — Qual data ancora cada métrica: data do atendimento (competência) ou data do pagamento (caixa)? ✅ **Decidido**
Serviço realizado em 28/07 pode ser pago em 30/07 — os dois podem cair em períodos diferentes.
- **Decisão do usuário (2026-07-29)**:
  - Ancoradas em `atendimentos.data` (**competência**): `valorServicos`, `descontos`, `quantidadeAtendimentos`, `servicosRealizados`, `ticketMedio`, `totalPendente` (ver D1), detalhamento por cliente/serviço.
  - Ancoradas em `pagamentos.data_pagamento` (**caixa**): `totalRecebido`, `gorjetas`, detalhamento por forma de pagamento.
  - Justificativa do usuário: esses indicadores de caixa representam fluxo de caixa real (regime de caixa), não competência — deve ser possível conciliar futuramente o Dashboard com extratos/caixa real.
- Consequência arquitetural: a query de "recebido no período" **não é** "atendimentos cuja `data` cai no período" — é "lançamentos de `pagamentos` cuja `data_pagamento` cai no período", que pode referenciar atendimentos de fora do período (pagamento atrasado). São duas queries com bases diferentes, não uma só.

### D4 — "Serviços realizados" conta atendimentos ou itens de serviço? ✅ **Decidido**
Um atendimento pode ter vários serviços na mesma sessão (`atendimento_servicos` é 1:N).
- **Decisão do usuário (2026-07-29)**: contar linhas de `atendimento_servicos` (itens) — mede **produção** (ex.: manicure + pedicure + sobrancelha no mesmo atendimento = 3 serviços realizados). "Quantidade de Atendimentos"/"Atendimentos realizados" segue existindo como indicador operacional separado, contando sessões.

### Princípio geral estabelecido pelo usuário (vale para todo o projeto, não só este Dashboard)
> Separação clara entre: indicadores **operacionais** (agenda e atendimentos) · indicadores de **produção** (serviços realizados) · indicadores **financeiros por competência** (serviços prestados) · indicadores **financeiros por caixa** (recebimentos, gorjetas, formas de pagamento). Nunca misturar esses conceitos num mesmo indicador.

Esse princípio deve orientar qualquer novo indicador adicionado no futuro (aqui ou em outras telas): antes de decidir a fonte/data de um novo card, classificar primeiro em qual das quatro categorias ele cai.

---

## 5. Card a card

### 5.1 StatCards de topo (`FinanceiroPage`)

| Card | Representa | Fonte (tabelas/consulta) | Regra de cálculo | Camada | Depende de |
|---|---|---|---|---|---|
| Total Recebido | Dinheiro efetivamente recebido no período (caixa) | `pagamentos` WHERE `data_pagamento` no período, natureza `servico` | Σ entrada − Σ estorno (natureza=servico) — reusa `calcularValorRecebidoServico` sobre o subconjunto do período | Service (reduz dataset do Repository) | — |
| Valor de Serviços | Valor bruto dos serviços realizados (competência) | `atendimentos` + `atendimento_servicos` WHERE `atendimentos.data` no período, status ≠ cancelado/estornado | Σ `atendimento_servicos.valor` | Service | — |
| Gorjetas | Gorjeta recebida no período (caixa) | `pagamentos` WHERE `data_pagamento` no período, natureza `gorjeta` | Σ entrada − Σ estorno (natureza=gorjeta) — `calcularValorRecebidoGorjeta` | Service | — |
| Descontos | Desconto concedido nos atendimentos do período | `atendimentos.desconto` WHERE `data` no período | Σ `desconto` | Service ou SQL (`_sum` do Prisma já resolve) | — |
| Total Pendente | Saldo ainda não recebido dos atendimentos do período (ver D1) | `atendimentos` + `atendimento_servicos` + `pagamentos`, `data` no período, status ∈ `STATUS_ATENDIMENTO_COM_SALDO_ABERTO` | `MAX(Σservicos − desconto − recebidoLíquido, 0)` por atendimento, somado | Service | mesma base de dados que "Valor de Serviços" — não recalcular devido de forma diferente |
| Quantidade de Atendimentos | Nº de sessões realizadas no período | `atendimentos` WHERE `data` no período, status ≠ cancelado/estornado | `COUNT(*)` | SQL (`prisma.atendimento.count`) ou Service | usado por Ticket Médio |
| Ticket Médio | Valor médio por atendimento | derivado dos dois cards acima | `valorServicos / quantidadeAtendimentos` (0 se divisor 0) | Service (client-side reduce simples) | **depende de** Valor de Serviços e Quantidade de Atendimentos — nunca reconsultar sozinho |

Cada card também exibe comparação vs. período anterior: a **mesma** função de agregação do Service deve rodar duas vezes (range principal e range de comparação, como já ocorre hoje em `mainAgg`/`compareAgg`) — nunca duas implementações.

### 5.2 `FormaPagamentoBars`

- **Representa**: total recebido no período, quebrado por forma de pagamento.
- **Fonte**: `pagamentos` WHERE `data_pagamento` no período, natureza `servico` (gorjeta normalmente não entra nessa quebra, a menos que o negócio decida somar as duas — hoje o mock só usa valor "recebido").
- **Regra**: agrupar por `forma_pagamento`, somar entrada − estorno por grupo.
- **Camada**: pode ser feito com `prisma.pagamento.groupBy({ by: ["formaPagamento"], _sum: { valor: true } })` só se estorno/entrada forem tratados via `where` separado (Prisma `groupBy` não faz `CASE WHEN` nativamente) — mais simples e mais seguro reaproveitar o dataset já carregado no Service e reduzir em memória, mantendo a mesma lógica de `calcularValorRecebidoServico` adaptada para agrupar por forma.
- **Dependência**: soma de todas as barras deve bater com o card "Total Recebido" do mesmo período — se não bater, é sinal de bug (dataset diferente sendo usado).

### 5.3 `RelatorioAtendimentos` — 13 StatCards

| Indicador | Fonte | Regra | Camada |
|---|---|---|---|
| Quantidade de Atendimentos | igual a 5.1 | igual a 5.1 | reaproveitar valor já calculado, não reconsultar |
| Clientes Atendidas | `atendimentos` no período | `COUNT(DISTINCT cliente_id)` | SQL/Service |
| Clientes Novas | `atendimentos` no período + histórico completo por cliente | cliente cujo **primeiro** atendimento realizado (de todo o histórico, não só do período) cai dentro do período | Service — precisa de `MIN(data)` por `cliente_id` sobre **todos** os atendimentos realizados (não filtrado por período), calculado uma vez e comparado contra o range |
| Clientes Recorrentes | igual acima | `Clientes Atendidas − Clientes Novas` | Service (derivado, não reconsultar) |
| Serviços Realizados | `atendimento_servicos` no período (ver D4) | `COUNT(*)` de itens | SQL/Service |
| Valor de Serviços | igual a 5.1 | igual a 5.1 | reaproveitar |
| Total Recebido | igual a 5.1 | igual a 5.1 | reaproveitar |
| Total Pendente | igual a 5.1 | igual a 5.1 | reaproveitar |
| Gorjetas | igual a 5.1 | igual a 5.1 | reaproveitar |
| Descontos | igual a 5.1 | igual a 5.1 | reaproveitar |
| Ticket Médio | igual a 5.1 | igual a 5.1 | reaproveitar |
| Cancelamentos | `agendamentos` no período (ver D2) | `COUNT(*)` WHERE `status = 'cancelado'` | SQL |
| Ausências | `agendamentos` no período (ver D2) | `COUNT(*)` WHERE `status = 'naoCompareceu'` | SQL |

`DetalhamentoBars` (dimensões cliente/serviço/formaPagamento/statusPagamento): agrupamento do mesmo dataset de atendimentos+pagamentos do período por cada dimensão, somando o valor recebido líquido de cada grupo — Service, sobre o dataset já carregado (não uma query nova por dimensão). Dimensão "profissional" já está marcada como indisponível na UI (`profissionalIndisponivel`) — condiz com o app ser single-professional hoje; não precisa de dado real.

### 5.4 Lista de `PagamentoCard`

- **Representa**: um resumo financeiro por atendimento do período (não é uma linha do ledger — é o atendimento visto pela lente financeira: valor de serviços, desconto, gorjeta, recebido, saldo, forma, status).
- **Fonte**: `atendimentos` (com `servicos` + `pagamentos` incluídos) WHERE `data` no período — **mesma consulta-base** de `getAtendimentos()` em `atendimentos-repo.ts`, só filtrada por intervalo.
- **Regra**: reaproveitar `mapAtendimentoRow` (já deriva `valorRecebido`/`gorjeta`/`formaPagamento` do ledger) + calcular `saldoPendente` com a função já existente `saldoPendente()` de `atendimentos-mock.ts`.
- **Camada**: Repository (query) + reaproveitamento direto do mapper existente — **zero lógica financeira nova aqui**.
- **Nota de nomenclatura**: o tipo `Pagamento` em `financeiro-mock.ts` (que representa um atendimento, com `valorServicos`/`saldoPendente`/etc.) colide de nome com o tipo `Pagamento` real do ledger em `pagamentos-mock.ts` (uma linha do livro-razão). Recomendo renomear o tipo da UI para algo como `AtendimentoFinanceiro` antes de conectar dados reais, para não confundir os dois conceitos no código.

### 5.5 `ValorPendenteCard` (lista "Valores Pendentes")

- **Representa**: saldos em aberto que precisam de cobrança **agora** — não é escopo do período selecionado (ver D1).
- **Fonte**: `atendimentos` (+ `servicos` + `pagamentos` + `cliente.contatos`) WHERE `status ∈ STATUS_ATENDIMENTO_COM_SALDO_ABERTO` AND saldo calculado > 0, **sem** filtro de `data`.
- **Regra**: mesma fórmula de saldo pendente por atendimento usada em `calcularValorPendenteCliente` (promover para `pagamentos-repo.ts`, ver §2) — mas retornando a lista de atendimentos, não só a soma.
- **Camada**: Repository (query) + Service (calcular `diasEmAberto` = hoje − data do atendimento).
- **Dependência de contato**: os botões "Abrir WhatsApp"/"Abrir ficha" (ainda sem ação real, fora de escopo) vão precisar do `clienteId` e do contato principal — já disponíveis via `include` de cliente.

### 5.6 `FinanceiroDetailsPanel`

- **Representa**: drill-down de um `PagamentoCard`/`ValorPendenteCard` selecionado — não busca dado novo, reaproveita o objeto já carregado na lista (mesmo padrão que `AtendimentoDetailsPanel`/`ClienteDetailsPanel` já usam hoje).
- **Ações do painel** (`registrarNovoPagamento`, `corrigirPagamento`, `estornarPagamento`, `abrirAtendimento`, `abrirCliente`) hoje são botões sem `onClick` — ligá-los a `atendimentos-actions.ts` (`concluirAtendimentoAction`/`estornarAtendimentoAction` já existentes) é uma tarefa de escopo separado da leitura do Dashboard e não está coberta por este documento.

---

## 6. Impacto de desempenho

- Volume de dados é pequeno (single-user, local) — não há necessidade de materialização/cache para o volume atual. Evitar é mais importante que otimizar: **não repetir o padrão do mock de "uma consulta por dia do intervalo"** (`aggregateRange` hoje itera dia a dia) — trocar por **uma única query por período**, com os índices já existentes (`atendimentos_data_idx`, `pagamentos_data_pagamento_idx`, `atendimentos_cliente_id_data_idx`) cobrindo o filtro de intervalo.
- Único ponto que exige uma segunda consulta "fora do período": D1 (saldo pendente global) e "Clientes Novas" (primeiro atendimento de todo o histórico) — ambos são buscas O(total de atendimentos), aceitável no volume atual, mas **não** devem rodar dentro do loop de outro cálculo; buscar uma vez, reaproveitar.
- Período "ano" com "personalizado" arbitrariamente longo é o pior caso, mas ainda é um único `SELECT ... WHERE data BETWEEN` — sem paginação necessária neste estágio.

## 7. Resumo das ações de centralização

1. Promover `calcularValorPendenteCliente` de `clientes-repo.ts` para `pagamentos-repo.ts`, exportada — elimina a duplicação certa que o Dashboard introduziria.
2. Novo `financeiro-repo.ts`: só Prisma, sem regra de negócio.
3. Novo `financeiro-service.ts`: substitui o corpo fictício de `aggregateRange`/`generateDiaFinanceiro`, mas reaproveita a matemática de intervalo de `financeiro-comparacao.ts` como está.
4. Renomear o tipo `Pagamento` de `financeiro-mock.ts` para evitar colisão de nome com o `Pagamento` real do ledger.
5. Um único dataset por período (atendimentos+servicos+pagamentos) alimenta todos os cards da tela — nenhum card faz sua própria query agregada isolada.

---

## 8. Pendências que dependem de decisão do usuário

Todas as quatro decisões (D1–D4, §4) foram confirmadas pelo usuário em 2026-07-29, todas seguindo a recomendação original deste documento. Nenhuma pendência de arquitetura resta antes de iniciar a implementação — próximo passo é escrever `financeiro-repo.ts`/`financeiro-service.ts` conforme §3, §6 e §7.

## 9. Backlog (fora de escopo desta fase)

- **"Saldo em Aberto (Global)"**: novo indicador, separado do "Total Pendente" por período, mostrando todo saldo pendente da empresa independentemente de data — pedido explícito do usuário em 2026-07-29, a desenhar (posição na tela, se é StatCard ou seção própria) numa fase futura. Reaproveita a mesma função global da lista "Valores Pendentes" (§2/§5.5) — sem lógica de cálculo nova.
