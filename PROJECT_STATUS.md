# PROJECT_STATUS.md — Brazillian Nail

> Retrato do estado real do projeto em 2026-07-29, produzido por revisão de código (não por relato de memória). Serve como roadmap oficial das próximas etapas. Nenhum código foi alterado para produzir este documento. Substitui a versão anterior deste arquivo (de 2026-07-14), que descrevia a fase de protótipo 100% mock — o projeto já avançou para persistência real em SQLite desde então.

---

## 1. Módulos concluídos (100% implementados e testados)

| Módulo | Persistência | Testado nesta sessão/sessões anteriores |
|---|---|---|
| **Clientes** (`clientes-repo.ts`, `clientes-actions.ts`) | Real (SQLite via Prisma) | CRUD manual verificado; histórico derivado do ledger; **desde 2026-08-02**, 7 testes de integração (criação com contatos, validações de nome/telefone, sincronização de contato no update, toggle de status, busca por id) |
| **Serviços** (`servicos-repo.ts`, `servicos-actions.ts`) | Real | CRUD manual verificado; **desde 2026-08-02**, 9 testes de integração (validações de nome/categoria/preço/faixa variável/duração, update, toggle de status) |
| **Agenda** (`agenda-repo.ts`, `agenda-actions.ts`) | Real | Criar/editar/mudar status/reagendar, validação de conflito e expediente; **desde 2026-08-02**, 11 testes de integração (expediente, conflito, cancelado não conflita, update/reagendar com sucesso e com erro) |
| **Atendimentos + Pagamentos (ledger)** (`atendimentos-actions.ts`, `pagamentos-repo.ts`) | Real | Revisão técnica completa + 24 testes funcionais (pagamento total/parcial/múltiplas formas/gorjeta/estorno/cancelamento/proteções) |
| **Financeiro/Dashboard** (`financeiro-repo.ts`, `financeiro-service.ts`) | Real | 24 testes funcionais (D1–D4, consistência entre cards, estados vazios) + verificação visual no browser |
| **Configurações** (`configuracoes-repo.ts`, `configuracoes-actions.ts`) | Real | CRUD manual verificado; formas de pagamento ativas ligadas ao Financeiro |
| **Lembretes** (`lembretes-repo.ts`, `lembretes-actions.ts`) | Real | 9 testes de integração (geração automática idempotente, exclusão de cancelados, sem-telefone, marcar enviado + confirmação em `mensagens_log`, mensagens personalizadas, horário de aviso via Configurações) — concluído em 2026-07-30, ver §8 item 5 |
| **Home (`/`)** | Real (sem repo/action próprios — só composição, em `src/app/page.tsx`, dos providers e serviços já existentes) | Verificação manual: build/typecheck/lint/testes limpos + conferência cruzada dos valores renderidos contra o SQLite via `sqlite3` direto no banco de desenvolvimento (ex.: "Total recebido hoje" bateu com a soma real de `pagamentos.data_pagamento = hoje`) — concluído em 2026-07-30, ver §8 item 6 |

Nestes 8 módulos, **nenhum dado fictício resta** e toda escrita passa por Server Actions que gravam de fato no SQLite.

---

## 2. Módulos implementados parcialmente

| Módulo | O que existe | O que falta |
|---|---|---|
| **Reengajamento de clientes inativas** | Colunas no schema (`reengajamento_status`, `reengajamento_adiado_ate`, etc.), tipo e leitura em `clientes-mock.ts`/`clientes-repo.ts`, exibidas na ficha da cliente | A consulta de elegibilidade descrita em `DATABASE_DESIGN.md` §4.1.1 nunca foi implementada como query real; não existe tela/ação para marcar "contatada/adiada/ignorada" |
| **Retorno sugerido → próximo agendamento** | Campo `retornoSugeridoDias` capturado e exibido no formulário/detalhes de Atendimento e Serviço | `proximoAgendamentoId` nunca é preenchido automaticamente; não há sugestão nem criação automática do próximo agendamento |
| **Mensagens (WhatsApp/SMS)** | `mensagens.ts` monta os links `whatsappHref`/`smsHref`; `ContatoAcoesMensagem` os expõe em Clientes e Lembretes. **Desde 2026-07-30, dentro do fluxo de Lembretes**, `mensagens_log` é gravado de fato: clicar no link grava `status = preparada` (`registrarMensagemPreparadaAction`), e marcar o lembrete como enviado confirma para `enviada` (`confirmadoEm` preenchido) via `updateStatusLembreteAction`. | A mensagem avulsa disparada pela ficha da cliente (`ClienteDetailsPanel`, fora do contexto de um lembrete) **continua sem registrar** em `mensagens_log` — `ContatoAcoesMensagem` aceita um `onAbrirCanal` opcional para isso, mas só é passado a partir de Lembretes. |
| **Financeiro — ações do painel de detalhes** | `FinanceiroDetailsPanel` (o painel lateral que abre ao selecionar um pagamento) tem todos os botões ligados às actions reais desde `b486ea7` (2026-07-30): registrar pagamento, corrigir, estornar, abrir atendimento, abrir cliente. **Corrige a versão anterior deste documento**, que descrevia esses botões como sem ação — a descrição estava desatualizada. | Os botões de ação rápida dentro de cada card de `ValorPendenteCard` (na lista de "Valores pendentes", não no painel de detalhes) continuam sem `onClick` — clique não faz nada; usar o card para selecionar e abrir o painel de detalhes é o caminho funcional hoje. |
| **Estorno** | Estorno total funciona e foi testado | Não existe estorno de um valor *parcial* do que foi recebido (só reversão total do saldo ainda não estornado) |

---

## 3. Funcionalidades ainda não iniciadas

- ~~**Lembretes (persistência real)**~~ **CONCLUÍDO em 2026-07-30.** `lembretes-repo.ts`/`lembretes-actions.ts` implementados; `mockLembretes`/`useState` local removidos, a tela lê e escreve de fato no SQLite via `LembretesProvider`. Único ajuste de schema necessário: `numero_sequencial` adicionado a `lembretes` e `mensagens_log` (migration `20260730223000_lembretes_numero_sequencial`, tabelas vazias em produção — sem risco), seguindo o mesmo padrão já usado nas demais tabelas.
- ~~**Geração automática de lembrete**~~ **CONCLUÍDO em 2026-07-30.** Como o app não tem cron/fila em nenhum outro módulo, a geração roda sob demanda: toda vez que o `layout.tsx` raiz é carregado, `getLembretesAmanha()` cria (idempotente, `UNIQUE(agendamento_id)`) uma linha de `lembretes` para cada agendamento de amanhã com status `aguardando`/`confirmado` que ainda não tem uma — respeitando `configuracoes.lembretes.ativarLembretesDiaAnterior`. Cliente sem contato principal gera lembrete com status `indisponivel` em vez de `pendente`.
- ~~**Configurações**~~ **CONCLUÍDO em 2026-07-30.** `configuracoes-repo.ts`/`configuracoes-actions.ts` implementados; a tabela singleton `configuracoes` (id fixo 1, criada com valores padrão na primeira leitura se ainda não existir) agora é lida no `layout.tsx` raiz e escrita via `updateConfiguracoesAction` a partir da tela de Configurações, seguindo o mesmo padrão de `ServicosProvider`/`servicos-actions.ts`. Único consumo cruzado ligado nesta etapa: **formas de pagamento ativas** agora filtram o seletor de forma de pagamento em `ConcluirAtendimentoModal`, `AdicionarPagamentoModal` e `CorrigirPagamentoModal` (mantendo visível uma forma já usada mesmo se depois desativada, mesmo padrão já usado para serviços inativos em `AgendaFormModal`). Desde a conclusão de Lembretes (mesmo dia, ver abaixo): `lembretes.horarioPadraoAviso` é lido/escrito de fato pela tela de Lembretes (`ConfigurarHorarioModal` agora chama `salvarConfiguracoes`, não mais `useState` local); `lembretes.textoPadraoPt/En` viraram o template real de `buildMensagemLembrete` (placeholders `{nome} {data} {horario} {servico} {negocio} {endereco}`), substituindo o texto fixo que existia antes em `mensagens.ts`; `lembretes.ativarLembretesDiaAnterior` liga/desliga a geração automática. **Ainda sem consumidor**: `lembretes.canalPreferido` (cada contato já tem seu próprio canal preferido, e não ficou claro que este campo deva sobrepor essa escolha — não implementado para não inventar uma regra de negócio) e `lembretes.exigirConfirmacaoManual` (o app já não tem nenhum modo de envio automático em lugar nenhum, então a flag não tem o que alternar hoje). Identidade visual (logo/cores) e Backup/exportação continuam intencionalmente fora do escopo, como já indicado nos avisos da própria tela.
- ~~**Home (`/`)**~~ **CONCLUÍDO em 2026-07-30.** `mockAgendaHoje`/`mockResumoHoje` removidos de `mock-data.ts` (nenhum outro arquivo os usava). Os 6 StatCards agora vêm de composição direta dos providers já existentes: "Próximo atendimento"/"Agendamentos de hoje" filtram `useAgenda()` pela data de hoje; "Total recebido hoje" reaproveita `calcularAgregadoFinanceiro` (mesma função do Financeiro, período "hoje" via `getMainRange`); "Total estimado do dia" reaproveita `computeResumoDia` (mesma função da Agenda); "Valores pendentes" reaproveita `calcularSaldoAbertoGlobal` (existia em `financeiro-service.ts` desde a sessão do Financeiro, mas não tinha consumidor até agora — o comentário da função que dizia "hoje não alimenta nenhum card" ficou desatualizado); "Lembretes de amanhã" lê `useLembretes().lembretes.length`, já filtrado para amanhã por `LembretesProvider`. A lista "Agenda de hoje" mostra os agendamentos reais do dia (cliente via `useClientes()`, serviço via `useServicos()`, com estado vazio reaproveitando `t.agenda.grade.semAgendamento`). Os atalhos "Novo agendamento"/"Nova cliente"/"Atendimento de encaixe" (antes desabilitados com tooltip "Em construção") agora abrem os mesmos modais já usados em Agenda/Clientes/Atendimentos (`AgendaFormModal`/`ClienteFormModal`/`AtendimentoFormModal` em modo "criar"), sem nenhum componente ou Server Action novo.
- **Autenticação/sessão** — colunas `seguranca_email_principal`/`seguranca_sessao_expiracao_min` existem no schema, mas não há login, sessão ou middleware em nenhum lugar do app (decisão de design consciente para a fase single-user local, não um esquecimento — mas precisa ser revisitada antes de qualquer exposição em rede).
- **Multi-profissional** — explicitamente fora de escopo (YAGNI) por `DATABASE_DESIGN.md` §1; a dimensão "profissional" no detalhamento do Financeiro já está marcada como indisponível na UI.
- **Relatórios/exportação (PDF/CSV)** — não existe em nenhum módulo.

---

## 4. Pendências técnicas (dívida técnica)

1. ~~**Nenhum teste automatizado persistido no repositório.**~~ **PARCIALMENTE RESOLVIDO em 2026-07-30, AMPLIADO em 2026-08-02.** Vitest configurado (`vitest.config.ts`, `npm test`), com banco SQLite de teste isolado recriado do zero a cada run (`tests/setup/global-setup.ts`, migrations aplicadas de verdade — não uma cópia). Cobertura hoje: `tests/integration/pagamentos-ledger.test.ts` (6 cenários do livro-razão), `tests/integration/lembretes.test.ts` (9 cenários), `tests/integration/agenda.test.ts` (11 cenários), `tests/integration/clientes.test.ts` (7 cenários) e `tests/integration/servicos.test.ts` (9 cenários) — **42 testes no total, todos passando**. Novo helper `tests/helpers/agenda-fixtures.ts` gera datas únicas por teste para os cenários de conflito de horário não colidirem entre si nem com as datas fixas usadas por Ledger/Lembretes (banco de teste é compartilhado entre todas as suítes). **Ainda falta**: Financeiro/Dashboard e Configurações continuam sem teste automatizado (só verificação manual); nenhuma suíte de componente/UI existe; sem CI (ver item 7), a suíte só roda quando alguém lembra de rodar `npm test` manualmente.
2. ~~**Migration com checksum divergente.**~~ **RESOLVIDO em 2026-07-29.** A divergência de checksum de `20260728120000_pagamentos_ledger` foi corrigida e **não existe mais**. Verificação de estado feita em 2026-07-29 (somente leitura, sem reset e sem escrita no banco):
   - **Checksums conferem:** os 6 checksums gravados em `_prisma_migrations` são idênticos ao SHA-256 dos respectivos `migration.sql`. Para a migration em questão: arquivo e banco em `74ad7ad5…0946aa` (o valor antigo e divergente era `632bc6ae…b817b`).
   - **`prisma migrate status` limpo:** `6 migrations found` / `Database schema is up to date!`, sem aviso de checksum, sem migration pendente, sem `rolled_back_at`, todas com `applied_steps_count = 1`.
   - **Sem drift:** `prisma migrate diff` (equivalente somente-leitura de `migrate dev`, usado para não escrever no banco) retorna `No difference detected` nas duas direções — histórico de migrations → banco e `schema.prisma` → banco. Schema, histórico e banco estão alinhados; `migrate dev` não tem nada a relatar.
   - **Histórico validado em banco descartável:** validado por `migrate reset` em cópia descartável na sessão de 2026-07-28/29 (não repetido na verificação de 2026-07-29, por decisão de não tocar no banco).
   - **Banco principal íntegro:** preservado em todas as etapas, com backups em `prisma/backups/` (16:00, 16:07 e 16:25 de 2026-07-29).
   - **A migration não foi alterada de novo:** `migration.sql` mantém mtime de 2026-07-28 20:35. O que mudou foi a linha em `_prisma_migrations`, não o arquivo.
   - **Origem da confusão:** este documento havia sido salvo por último em 2026-07-29 05:49, **antes** da correção aplicada às 16:00 do mesmo dia (ver `prisma/backups/brazillian-nail_pre-checksum-fix_20260729_160020.db`, que ainda contém o checksum antigo). A pendência era, portanto, uma anotação desatualizada — não uma reincidência do problema.
   - **Resíduo cosmético:** em `_prisma_migrations`, `finished_at` está como epoch-ms inteiro nas 5 primeiras linhas e como texto ISO na última (`20260729090000_restore_pagamentos_atendimentos_check_constraints`), traço do insert manual via SQL feito na época. O Prisma lê ambos os formatos sem erro e o `status` está limpo.
3. **Geração de ID sequencial inconsistente entre módulos.** Em `atendimentos-actions.ts` a geração de próximo ID roda dentro da mesma transação da escrita; em `agenda-actions.ts`, `clientes-actions.ts` (contatos) e `servicos-actions.ts`, roda fora de transação — risco teórico de corrida em escrita concorrente (baixo dado app single-user local, mas inconsistente). `lembretes-repo.ts`/`lembretes-actions.ts` e `mensagens_log` (novos em 2026-07-30) já seguem o padrão mais correto (dentro da transação, mesmo de `atendimentos-actions.ts`) — não reduzem a lista de módulos pendentes, só não a aumentam.
4. ~~**Nenhum error boundary no App Router.**~~ **RESOLVIDO em 2026-08-02** (parcial desde 2026-07-30). `error.tsx`, `global-error.tsx`, `loading.tsx` e, desde esta sessão, `not-found.tsx` existem em `src/app/`, todos com o mesmo padrão visual (tela amigável, sem i18n). `not-found.tsx` cobre URLs sem rota correspondente e qualquer `notFound()` chamado dentro de um segmento sem boundary próprio.
5. **Sem estratégia de backup do arquivo SQLite.** Todas as cópias de segurança feitas até agora foram manuais e ad-hoc durante sessões de teste; não há rotina automatizada.
6. **`i18n.ts` como arquivo único de ~1700 linhas** — funciona, mas é um ponto de atrito crescente para manutenção conforme mais telas são adicionadas.
7. **Sem CI configurado** (`.github/workflows` não existe) — lint/typecheck/testes só rodam quando alguém lembra de rodar manualmente.
8. ~~**Diretório `prisma/` não versionado.**~~ **RESOLVIDO em 2026-07-30** (commit `b486ea7`) — esta pendência já estava desatualizada quando este documento a registrou. `prisma/migrations/` e `prisma/schema.prisma` estão rastreados no `git log` normalmente; cada migration nova (como `20260730223000_lembretes_numero_sequencial`, desta sessão) entra em commit junto com o código que depende dela. Arquivos `.db` continuam fora do git (`.gitignore`), backups em `prisma/backups/`.

---

## 5. Melhorias futuras (backlog)

- "Saldo em Aberto (Global)" como indicador separado no Financeiro (já registrado como decisão pendente em `DASHBOARD_DESIGN.md` §9).
- Estorno de valor parcial (não só reversão total).
- Exportação de relatórios (PDF/CSV) do Financeiro.
- Sincronização em nuvem / múltiplos dispositivos (explicitamente adiado por design).
- Multi-profissional e multi-unidade (explicitamente adiado por design).
- Notificações/lembretes automáticos por e-mail, além de WhatsApp/SMS.

---

## 6. Fluxos completos já funcionando do início ao fim

1. **Cliente**: cadastrar → editar → inativar/reativar — tudo persistido, refletido em toda a UI que consome `useClientes()`.
2. **Serviço**: cadastrar → editar → inativar/reativar — persistido.
3. **Agendamento**: criar → confirmar/mudar status → reagendar → validações de conflito e expediente aplicadas — persistido.
4. **Atendimento completo**: criar (a partir de agendamento ou encaixe) → editar campos não financeiros → concluir (grava lançamento no ledger, recalcula status no servidor) → **ou** cancelar (só antes de qualquer pagamento) → **ou** estornar (reversão total, já finalizado) — persistido e testado exaustivamente.
5. **Financeiro por período**: qualquer atendimento/pagamento/agendamento acima é refletido automaticamente em todos os cards do Dashboard (StatCards, detalhamento, listas de pagamentos e pendências) sem nenhuma ação extra — persistido, read-only, testado.
6. **Lembretes**: agendamento de amanhã (`aguardando`/`confirmado`) → lembrete gerado automaticamente ao abrir a tela → preparar/editar mensagem (template de Configurações) → abrir WhatsApp/SMS (grava `mensagens_log` como `preparada`) → marcar como enviado (confirma `mensagens_log` como `enviada`, grava `enviadoEm`) — **ou** marcar tratado pessoalmente/ignorar quando não há telefone — persistido e testado (9 testes de integração).

## 7. Fluxos que ainda possuem etapas incompletas

1. ~~**Agendamento confirmado → lembrete → mensagem enviada → registro em `mensagens_log`**~~ **Fechado em 2026-07-30** (ver §6 item 6) — geração automática, edição de mensagem, envio e registro em `mensagens_log` funcionam de ponta a ponta dentro do fluxo de Lembretes. O que resta fora desse fluxo específico: mensagem avulsa disparada pela ficha da cliente (`ClienteDetailsPanel`) ainda não grava em `mensagens_log` (ver §2).
2. ~~**Ver saldo pendente no Financeiro → corrigir/estornar pagamento pelo próprio Dashboard**~~ **Fechado no painel de detalhes** (ver §2) — resta só o atalho dentro do card de "Valores pendentes", que ainda não tem ação própria.
3. **Concluir atendimento com retorno sugerido → próximo agendamento sugerido/criado**: o dado é capturado e exibido, mas o loop não fecha — nada usa `retornoSugeridoDias` para agir.
4. **Cliente inativa há 30+ dias → alerta de reengajamento → ação da profissional**: os campos existem e são exibidos, mas a consulta de elegibilidade e a ação de marcar contatada/adiada/ignorada não foram implementadas.
5. ~~**Configurar preferências → preferências reais no restante do app**~~ **Fechado em 2026-07-30** (ver §3/§8 item 4) — Financeiro (formas de pagamento ativas) e, desde esta sessão, Lembretes (horário de aviso, template de mensagem, liga/desliga geração automática) consomem Configurações de verdade. Só `canalPreferido` e `exigirConfirmacaoManual` ficam sem consumidor (ver §3, motivo explicado ali).

---

## 8. Ordem recomendada para as próximas implementações

1. ~~**Testes automatizados para a camada financeira e o ledger**~~ **CONCLUÍDO para os 5 módulos de dados centrais** — ver §4 item 1. Ledger, Lembretes, Agenda, Clientes e Serviços têm suíte (42 testes). Financeiro/Configurações/UI ainda não.
2. ~~**Resolver o drift de migration**~~ **CONCLUÍDO em 2026-07-29** (ver §4.2) — checksums conferem, `migrate status` limpo, sem drift, banco íntegro. `prisma migrate dev`/`migrate deploy`/`migrate reset` estão destravados.
3. ~~**Ligar os botões dormentes do Financeiro**~~ **CONCLUÍDO** (painel de detalhes já estava ligado desde `b486ea7`, 2026-07-30 — a versão anterior deste documento estava desatualizada nesse ponto; ver §2). Resta apenas um resíduo cosmético: os botões de atalho dentro dos cards de `ValorPendenteCard` (lista de "Valores pendentes") continuam sem ação — baixo valor, não bloqueia nada, pode ficar no backlog.
4. ~~**Implementar Configurações real**~~ **CONCLUÍDO em 2026-07-30.**
5. ~~**Lembretes: persistência real + geração automática**~~ **CONCLUÍDO em 2026-07-30.** Ver §1, §3, §6 item 6, §7 item 1.
6. ~~**Home (`/`) real**~~ **CONCLUÍDO em 2026-07-30.** Ver §1 e §3 — fecha o último resquício de dado fictício visível no dia a dia.
7. **Reengajamento de clientes** — feature nova e autocontida; agora que Configurações e Lembretes estão sólidos (inclusive `mensagens_log` de verdade), é o próximo módulo com maior valor de negócio depois de Home. **Próxima etapa recomendada.**
8. **Estorno parcial + "Saldo em Aberto (Global)"** — melhorias sobre uma base já funcionando; sem urgência.
9. **Multi-profissional, relatórios/exportação, sincronização em nuvem** — backlog de longo prazo, fora do v1.0 por decisão de design já registrada (YAGNI).

---

## 9. Riscos arquiteturais que merecem atenção antes da v1.0

1. ~~**Zero testes automatizados persistidos**~~ **MUITO REDUZIDO em 2026-08-02** — ver §4 item 1. Os 5 módulos de dados centrais (Ledger, Lembretes, Agenda, Clientes, Serviços) já têm suíte real (42 testes). Financeiro/Configurações e toda a camada de UI continuam sem cobertura automatizada, e não há CI — regressão silenciosa ainda é possível ali.
2. ~~**Ausência de error boundaries**~~ **RESOLVIDO em 2026-08-02** — ver §4 item 4. `error.tsx`/`global-error.tsx`/`loading.tsx`/`not-found.tsx` existem, cobrindo os quatro casos previstos pelo App Router.
3. ~~**Diretório `prisma/` fora do controle de versão**~~ **RESOLVIDO** — ver §4 item 8. Já estava versionado desde `b486ea7` (2026-07-30); a entrada anterior deste documento estava desatualizada nesse ponto.
4. **Geração de ID sequencial fora de transação** em parte dos módulos (`agenda-actions.ts`, `clientes-actions.ts`, `servicos-actions.ts`) — condição de corrida teoricamente possível; inconsistente com o padrão já mais seguro usado em Atendimentos/Pagamentos/Lembretes/Mensagens.
5. ~~**Configurações sem persistência real**~~ **RESOLVIDO em 2026-07-30** — ver §3 e §8 item 4.
6. **Sem estratégia de backup do banco SQLite** — um disco corrompido ou arquivo apagado por engano perde todo o histórico financeiro e de clientes, sem cópia de segurança automatizada.
7. **Ausência de autenticação** — aceitável hoje (app single-user local), mas é uma decisão que precisa ser reafirmada explicitamente antes da v1.0, não assumida como permanente — especialmente se o app rodar em qualquer rede compartilhada ou dispositivo não exclusivo da profissional.

---

## 10. Auditoria completa de fluxos existentes (2026-08-02)

Auditoria somente leitura de todos os fluxos (Clientes, Serviços, Agenda, Atendimentos/Pagamentos, Financeiro, Lembretes/Home, Configurações), feita antes de qualquer alteração — suíte completa (42 testes) rodada e código dos fluxos sem teste (Financeiro, Configurações, Home) revisado manualmente. Resultado completo revisado com o usuário; duas correções técnicas (sem decisão de negócio envolvida) foram autorizadas e aplicadas nesta sessão:

- **CORRIGIDO — comparação "Ontem" no Financeiro** (`src/lib/financeiro-comparacao.ts`, case `"ontem"`): calculava `-7` dias (código copiado do case `"mesmoDiaSemanaPassada"`) em vez de `-1` dia. Como "Ontem" é a comparação padrão do período "Hoje" (`COMPARACAO_PADRAO_POR_PERIODO.hoje`), todo StatCard do Dashboard Financeiro exibia, ao abrir a tela, um valor de uma semana atrás rotulado como "Ontem". Agora `case "ontem"` usa `addDays(..., -1)`, separado de `case "semanaPassada"` (que continua em `-7`, correto).
- **CORRIGIDO — validação de transições de status na Agenda** (`src/lib/agenda-actions.ts`, `updateStatusAgendamentoAction`): antes aceitava qualquer `StatusKey` para qualquer agendamento existente, sem checar o status atual (permitia, por exemplo, forçar `cancelado → aguardando` ou pular direto para `concluido` sem nunca ter passado por um Atendimento). Agora usa um mapa explícito de transições permitidas (`TRANSICOES_STATUS_AGENDAMENTO`), espelhando exatamente o que a UI (`AgendaDetailsPanel`) já expõe — `aguardando → confirmado/cancelado/naoCompareceu`, `confirmado → cancelado/naoCompareceu` — no mesmo padrão defensivo (checar status de origem antes de mutar) já usado em `atendimentos-actions.ts` (`concluirAtendimentoAction`, `cancelarAtendimentoAction`, `estornarAtendimentoAction`). `emAtendimento`/`concluido` continuam fora do alcance desta action, pois nascem só da sincronização feita pelo fluxo de Atendimentos.

Suíte completa (`npm test`) rodada após as duas correções: **42/42 testes passando**, nenhum quebrado (os dois usos de `updateStatusAgendamentoAction` nos testes — `aguardando→cancelado` e `aguardando→confirmado` — já eram transições válidas no novo mapa). `tsc --noEmit` limpo.

**Itens levantados na auditoria que ficaram de fora desta etapa por dependerem de decisão de negócio (aguardando definição do usuário antes de codar):**
- ~~Edição de serviços/desconto em atendimento `finalizadoCortesia`/`finalizadoPendente` sem pagamento registrado (valor pode "sumir" sem virar pendência visível).~~ **RESOLVIDO em 2026-08-02** — ver §12.
- ~~`reagendarAgendamentoAction` permite reagendar agendamento em qualquer status, incluindo `cancelado`/`concluido`/`naoCompareceu` — hoje a UI expõe o botão "Reagendar" nesses estados de propósito; precisa decisão se isso é regra válida ou bug.~~ **DECIDIDO em 2026-08-02, implementação pendente** — ver §13 item 1.
- ~~Atendimentos `estornado` contando (ou não) em Valor de Serviços/Qtd. Atendimentos/Ticket Médio do Financeiro — código diverge do que `DASHBOARD_DESIGN.md` (decisão D3) documenta.~~ **DECIDIDO em 2026-08-02, implementação pendente** — ver §13 item 2.
- ~~Horário de expediente configurado em Configurações não é lido pela validação real da Agenda (que usa constantes fixas 8h–18h).~~ **DECIDIDO em 2026-08-02, implementação pendente** — ver §13 item 3.
- ~~"Ocultar valores" (olho no Header) só afeta 3 cards da Home, não o Dashboard Financeiro inteiro.~~ **DECIDIDO em 2026-08-02, implementação pendente** — ver §13 item 4.
- Validação server-side de telefone, faixa de `precoPadrao`/`duracaoPadrao` de Serviço fora do mínimo/máximo, ausência de CHECK constraints em `servicos`, entre outros itens de menor prioridade — ver relatório completo entregue ao usuário nesta sessão.

Nenhum desses itens foi alterado. Nenhuma configuração de Git foi tocada; `git push` continua pendente por decisão do usuário (autenticação do GitHub a ser resolvida depois).

---

## 11. Correções técnicas de baixo risco (2026-08-02, sessão seguinte à auditoria do §10)

Itens de menor prioridade listados no fim do §10 foram corrigidos nesta sessão — todos técnicos, sem alterar nenhuma regra de negócio (estorno, edição após pagamento/cortesia, horário de expediente, reengajamento, botão "ocultar valores" permaneceram intocados):

1. **CORRIGIDO — bug do painel mobile em Clientes** (`src/app/clientes/page.tsx`): o painel de detalhes mobile (`lg:hidden`) chamava `toggleStatus(...)` diretamente em vez do wrapper `handleToggleStatus(...)` — diferente do painel desktop (mesmo arquivo) e diferente de Serviços (`src/app/servicos/page.tsx`), que já usavam o wrapper nos dois painéis. Na prática isso pulava o `try/catch` que grava `erroOperacao`: uma falha ao alternar o status de uma cliente pelo painel mobile ficava silenciosa. Agora os dois painéis chamam `handleToggleStatus`, igual ao padrão de Serviços. Verificado manualmente no browser (viewport mobile 375×812): alternar "Marcar como inativa/ativa" no painel mobile funciona e reverte corretamente.
2. **ADICIONADO — validação server-side de telefone em Clientes** (`src/lib/clientes-actions.ts`, `validarContato`): a action só verificava telefone não-vazio; a regra real (mínimo 7 dígitos após remover formatação) só existia no cliente, em `ClienteFormModal.tsx` (`telefoneValido`). Copiada a mesma função para `clientes-actions.ts` — mesmos formatos aceitos hoje pela UI (parênteses, espaços, traços, "+") continuam válidos, só o número de dígitos é checado. Testado em `tests/integration/clientes.test.ts` (telefone curto rejeitado, telefone formatado com 7+ dígitos aceito).
3. **ADICIONADO — CHECK constraints na tabela `servicos`** (migration `20260802120000_servicos_check_constraints`): `servicos` era a única tabela de dados centrais sem nenhum CHECK (Prisma não os expressa a partir do `schema.prisma` para o provider sqlite; o mesmo já tinha sido corrigido para `clientes` em `20260727094500` e para `atendimentos`/`pagamentos` em `20260729090000`). Adicionados: `preco_padrao >= 0`, `preco_minimo`/`preco_maximo >= 0` (quando não nulos), `duracao_padrao_min > 0`, `duracao_minima_min`/`duracao_maxima_min > 0` (quando não nulos) — mesmas regras já aplicadas em `servicos-actions.ts`, agora também como rede de segurança no banco. **Verificado antes de migrar**: os 5 serviços existentes no banco de produção já respeitavam todas essas regras (`SELECT count(*) FROM servicos WHERE preco_padrao < 0 OR duracao_padrao_min <= 0 OR ...` retornou 0), então a migration não teve nenhum dado para rejeitar. Backup tirado antes (`prisma/backups/brazillian-nail_pre-servicos-check-constraints_20260802_173242.db`). Testado em `tests/integration/servicos.test.ts` (insert direto via Prisma, contornando `servicos-actions.ts`, para provar que o CHECK do banco — não só a validação da action — rejeita preço negativo e duração zero/negativa).
4. **CORRIGIDO — atomicidade da correção de lançamento com serviço + gorjeta** (`src/lib/atendimentos-actions.ts`, `financeiro/page.tsx`): `CorrigirPagamentoModal` permite corrigir o lançamento de serviço e o de gorjeta do mesmo atendimento numa única confirmação, mas `handleConfirmarCorrecao` (em `financeiro/page.tsx`) chamava `corrigirLancamento` duas vezes, em duas transações separadas — se a primeira gravasse e a segunda falhasse (ex.: valor de serviço corrigido excede o saldo devido), o atendimento ficava parcialmente corrigido, sem chance de rollback. Núcleo de `corrigirLancamentoAction` extraído para `executarCorrecaoLancamento(tx, ...)` (recebe a transação já aberta); nova action `corrigirLancamentosAction(correcoes[])` aplica 1+ correções dentro de uma única `prisma.$transaction` (mesmo padrão já usado no resto de `atendimentos-actions.ts`). `AtendimentosProvider` expõe `corrigirLancamentos`; `financeiro/page.tsx` agora agrupa serviço+gorjeta numa chamada só. `corrigirLancamentoAction` (correção única) continua existindo e funcionando, agora como wrapper de uma única correção sobre o novo núcleo. Testado em `tests/integration/pagamentos-ledger.test.ts`: correção conjunta bem-sucedida, correção conjunta onde uma falha (nada é gravado, nem a que teria sucesso isoladamente) e a correção única isolada.

Suíte completa rodada após as 4 correções: **51/51 testes passando** (42 anteriores + 9 novos: 2 de telefone em Clientes, 4 de CHECK em Serviços, 3 de correção de lançamento no Ledger). `tsc --noEmit` limpo. `npm run lint`: 0 erros, mesmos 8 warnings pré-existentes (variáveis `_idPlaceholder`/`f` não usadas em outros arquivos, não tocados nesta sessão).

---

## 12. Regra de negócio: edição de atendimento após pagamento (2026-08-02)

Item de decisão de negócio flagrado no §10/§11 (item 1 da lista de itens pendentes) foi definido e implementado nesta sessão, com autorização explícita do usuário após análise de impacto apresentada e duas decisões de desenho confirmadas.

**Regra aprovada:**
1. Ao sair de `emAndamento`, o atendimento passa a ter os campos financeiros travados — **mesmo sem nenhum pagamento real registrado ainda** (cobre também `finalizadoPendente` e `finalizadoCortesia`, que nascem sem nenhuma linha em `pagamentos` quando `valorRecebido`/`gorjeta` são zero em `concluirAtendimentoAction`). Essa foi a decisão que fechou a lacuna real encontrada na análise: o gatilho da trava deixou de ser `pagamentos.length > 0` (o que a auditoria já tinha flagrado como permitindo o valor devido "sumir" silenciosamente após a conclusão, sem deixar rastro) e passou a ser `status !== "emAndamento"`.
2. Uma vez travado, o total devido (`Σ dos valores dos serviços − desconto`) não pode mudar. Dentro da trava, a composição da lista de serviços é livre — nome, referência de catálogo, ordem, quantidade de linhas — **desde que a soma final seja idêntica** (decisão de desenho confirmada pelo usuário: travar o total, não a "assinatura" exata de cada linha, como o código fazia antes). Gorjeta nunca foi editável por aqui (é sempre derivada do ledger); pagamentos existentes nunca são editados/apagados diretamente em lugar nenhum do código (confirmado por revisão: só `createMany`, nunca `update`/`delete` em `pagamento`) — os dois já estavam garantidos pela arquitetura antes desta sessão, sem precisar de mudança.
3. Campos não financeiros (profissional, data, horário, observações em pt/en, retorno sugerido, vínculo com agendamento) continuam sempre editáveis, em qualquer status não encerrado.
4. `cancelado`/`estornado` continuam totalmente bloqueados (nenhuma mudança aqui — já era assim).
5. Qualquer correção financeira depois da trava só pode passar por `corrigirLancamentoAction`/`corrigirLancamentosAction` (novo lançamento no ledger, nunca edição/exclusão do original) — já implementado e testado desde o §11 item 4.

**Implementação:**
- `src/lib/atendimentos-mock.ts`: nova função pura `financasTravadas(status)` — `status !== "emAndamento"` — compartilhada entre servidor e cliente para a regra nunca divergir entre as duas camadas.
- `src/lib/atendimentos-actions.ts` (`updateAtendimentoAction`): a checagem antiga (`pagamentos.length > 0` + comparação campo-a-campo via `assinaturaServicos`, removida) foi substituída por `financasTravadas(existente.status)` + comparação do total devido (`round2(Σvalor − desconto)` antes vs. depois, com arredondamento a centavos para não sofrer ruído de ponto flutuante, mesmo padrão de `round2` já usado em `financeiro-service.ts`).
- `src/components/AtendimentoFormModal.tsx`: nova trava na UI (antes o formulário não tinha nenhuma noção de pagamento/status e só descobria o bloqueio pelo erro do servidor após "Salvar"). Quando `financasTravadas(atendimento.status)`, um banner explica a trava (`f.financasTravadas`, pt/en) e os campos de serviço (seletor de catálogo, nome avulso, valor, adicionar/remover linha) e desconto ficam `disabled`; campos não financeiros continuam ativos. A trava da UI é deliberadamente **mais conservadora** que a do servidor — desabilita a seção inteira em vez de permitir recomposição sum-neutra pela interface — para deixar o bloqueio óbvio antes do clique em salvar (item 5 da regra aprovada); o servidor continua sendo a fonte da verdade e é quem de fato permite a recomposição sum-neutra caso algum caminho futuro a exponha. Reforço defensivo em `validarESalvar`: quando travado, o payload enviado ao servidor usa sempre `atendimento.desconto`/`atendimento.servicos` originais, nunca o estado dos inputs — não depende só do atributo `disabled` do DOM.
- `src/lib/i18n.ts`: nova chave `atendimentos.formulario.financasTravadas`, pt e en.
- Nenhuma migration criada, nenhuma mudança na estrutura do ledger — a regra é inteiramente comportamental (não precisa de coluna nova).

**Testado** em `tests/integration/atendimentos-edicao.test.ts` (6 cenários novos): edição livre em `emAndamento`; `finalizadoPendente` sem nenhum pagamento real já travado (a lacuna fechada); `finalizadoCortesia` sem pagamento real também travado; `finalizadoPago` com pagamento real — total travado, mas recomposição da lista de serviços com soma idêntica é aceita; desconto — qualquer mudança que altere o total é rejeitada, mesmo valor é aceito; `cancelado` continua bloqueado até para campos não financeiros. Verificado também manualmente no browser (atendimento `finalizadoPago` de Maria Costa): banner aparece, campos de serviço/valor/desconto ficam `disabled` (confirmado via inspeção do DOM), edição de observações salva normalmente sem alterar o valor total devido/saldo pendente.

Suíte completa rodada após a mudança: **57/57 testes passando** (51 anteriores + 6 novos). `tsc --noEmit` limpo. `npm run lint`: 0 erros, mesmos 8 warnings pré-existentes.

---

## 13. Decisões de negócio aprovadas (2026-08-02) — pendências do §10

As quatro decisões de negócio deixadas em aberto no §10 foram apresentadas ao usuário (regra atual, opções, vantagens/riscos e recomendação técnica para cada uma) e **aprovadas nesta data**. Nenhum código foi alterado ainda — só este documento, para registrar a regra combinada antes da implementação. Plano de implementação (arquivos, testes, riscos, ordem) apresentado ao usuário separadamente, aguardando autorização para codar.

1. **Reagendamento de agendamento** (`reagendarAgendamentoAction`, `src/lib/agenda-actions.ts`) — regra aprovada:
   - `aguardando` → pode reagendar (mantém status).
   - `confirmado` → pode reagendar (mantém status).
   - `cancelado` → pode "reativar e reagendar": ação passa a alterar também o `status` para `aguardando`, além de `data`/`inicioMin`/`fimMin`.
   - `emAtendimento` → não pode reagendar.
   - `concluido` → não pode reagendar.
   - `naoCompareceu` → não pode reagendar o mesmo registro; a UI deve direcionar para criar um **novo** agendamento (preserva o histórico da falta em vez de reescrevê-lo).
   - **Implementação pendente.**

2. **Atendimentos estornados no Financeiro** (`STATUS_ATENDIMENTO_REALIZADO`, `financeiro-service.ts`) — regra aprovada:
   - Atendimento `estornado` continua existindo no histórico operacional (não é ocultado/excluído de listagens).
   - O valor estornado **não** compõe `Valor de Serviços`, nem `Quantidade de Atendimentos`/`Ticket Médio` líquidos — alinha o código a `DASHBOARD_DESIGN.md` (D3), que já documentava essa exclusão.
   - Novo indicador **"Estornos do período"**, com quantidade e valor, para não perder visibilidade do que foi revertido.
   - `Total Recebido` (caixa) continua líquido de estorno, via `pagamentos` (comportamento já correto hoje, sem mudança).
   - **Implementação pendente.**

3. **Horário de expediente em Configurações** (`agendaHorarioAbertura`/`agendaHorarioFechamento`/`agendaDiasFuncionamento`/`agendaBloqueioConflito`/`agendaPermitirEncaixe`, hoje persistidos mas não lidos pela Agenda) — regra aprovada:
   - A Agenda passa a validar horário e dia de funcionamento a partir dos valores gravados em Configurações, não mais das constantes fixas `DAY_START_MIN`/`DAY_END_MIN` (8h–18h) de `agenda-mock.ts`.
   - A mesma fonte de dados alimenta tanto a validação de servidor (`validarHorario`) quanto a geração visual dos slots da grade — nunca duas fontes divergentes.
   - `agendaBloqueioConflito` e `agendaPermitirEncaixe` (campos já existentes na tabela `configuracoes`, sem consumidor hoje) passam a ser efetivamente respeitados pela Agenda.
   - **Implementação pendente.**

4. **Alcance de "Ocultar valores"** (`FinancialVisibilityProvider`, hoje só usado em `src/app/page.tsx`) — regra aprovada:
   - Passa a ocultar informação financeira sensível também em todo o Dashboard Financeiro (`/financeiro`), não só nos 3 cards da Home.
   - Abrange StatCards, `FormaPagamentoBars`, listas de recebimentos/pendências e o detalhamento financeiro — inclusive dentro do `FinanceiroDetailsPanel` enquanto aberto.
   - **Não** se estende a preços de catálogo em Serviços, valores operacionais da Agenda, Clientes ou qualquer outra tela não financeira — escopo continua sendo Home + Dashboard Financeiro.
   - **Implementação pendente.**
