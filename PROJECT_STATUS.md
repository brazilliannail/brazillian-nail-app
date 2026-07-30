# PROJECT_STATUS.md — Brazillian Nail

> Retrato do estado real do projeto em 2026-07-29, produzido por revisão de código (não por relato de memória). Serve como roadmap oficial das próximas etapas. Nenhum código foi alterado para produzir este documento. Substitui a versão anterior deste arquivo (de 2026-07-14), que descrevia a fase de protótipo 100% mock — o projeto já avançou para persistência real em SQLite desde então.

---

## 1. Módulos concluídos (100% implementados e testados)

| Módulo | Persistência | Testado nesta sessão/sessões anteriores |
|---|---|---|
| **Clientes** (`clientes-repo.ts`, `clientes-actions.ts`) | Real (SQLite via Prisma) | CRUD manual verificado; histórico derivado do ledger |
| **Serviços** (`servicos-repo.ts`, `servicos-actions.ts`) | Real | CRUD manual verificado |
| **Agenda** (`agenda-repo.ts`, `agenda-actions.ts`) | Real | Criar/editar/mudar status/reagendar, validação de conflito e expediente |
| **Atendimentos + Pagamentos (ledger)** (`atendimentos-actions.ts`, `pagamentos-repo.ts`) | Real | Revisão técnica completa + 24 testes funcionais (pagamento total/parcial/múltiplas formas/gorjeta/estorno/cancelamento/proteções) |
| **Financeiro/Dashboard** (`financeiro-repo.ts`, `financeiro-service.ts`) | Real | 24 testes funcionais (D1–D4, consistência entre cards, estados vazios) + verificação visual no browser |

Nestes 5 módulos, **nenhum dado fictício resta** e toda escrita passa por Server Actions que gravam de fato no SQLite.

---

## 2. Módulos implementados parcialmente

| Módulo | O que existe | O que falta |
|---|---|---|
| **Reengajamento de clientes inativas** | Colunas no schema (`reengajamento_status`, `reengajamento_adiado_ate`, etc.), tipo e leitura em `clientes-mock.ts`/`clientes-repo.ts`, exibidas na ficha da cliente | A consulta de elegibilidade descrita em `DATABASE_DESIGN.md` §4.1.1 nunca foi implementada como query real; não existe tela/ação para marcar "contatada/adiada/ignorada" |
| **Retorno sugerido → próximo agendamento** | Campo `retornoSugeridoDias` capturado e exibido no formulário/detalhes de Atendimento e Serviço | `proximoAgendamentoId` nunca é preenchido automaticamente; não há sugestão nem criação automática do próximo agendamento |
| **Mensagens (WhatsApp/SMS)** | `mensagens.ts` monta os links `whatsappHref`/`smsHref`; `ContatoAcoesMensagem` os expõe em Clientes e Lembretes | Tabela `mensagens_log` existe no schema mas **nunca é gravada** — nenhuma mensagem preparada/enviada fica registrada; não há forma de saber depois o que foi de fato mandado |
| **Financeiro — ações do painel de detalhes** | UI completa (`FinanceiroDetailsPanel`, `ValorPendenteCard`) com botões "Registrar novo pagamento", "Corrigir pagamento", "Estornar pagamento", "Abrir atendimento", "Abrir cliente", "Abrir WhatsApp" | Nenhum botão tem ação — a lógica de backend para estornar já existe (`estornarAtendimentoAction`), só não está ligada à UI |
| **Estorno** | Estorno total funciona e foi testado | Não existe estorno de um valor *parcial* do que foi recebido (só reversão total do saldo ainda não estornado) |

---

## 3. Funcionalidades ainda não iniciadas

- **Lembretes (persistência real)** — a tela roda inteiramente sobre `useState` local inicializado com `mockLembretes`; nenhuma leitura ou escrita no banco. A tabela `lembretes` existe e é populada apenas pelas migrations/seed manual, nunca pela aplicação.
- **Geração automática de lembrete** a partir de um agendamento confirmado (regra descrita no design mas nunca implementada).
- **Configurações** — página inteira roda sobre `configuracoes-mock.ts`; não existe `configuracoes-repo.ts`/`configuracoes-actions.ts`; a tabela singleton `configuracoes` no banco nunca é lida nem escrita pela aplicação. Nenhuma preferência configurada ali (formas de pagamento ativas, fuso horário, idioma padrão, horário de lembretes) influencia qualquer outro módulo — por exemplo, `ConcluirAtendimentoModal` usa uma lista de formas de pagamento **fixa no código**, não a de Configurações.
- **Home (`/`)** — usa `mockAgendaHoje`/`mockResumoHoje` de `mock-data.ts`; mesmo tratamento já dado ao Financeiro ainda não foi aplicado aqui.
- **Autenticação/sessão** — colunas `seguranca_email_principal`/`seguranca_sessao_expiracao_min` existem no schema, mas não há login, sessão ou middleware em nenhum lugar do app (decisão de design consciente para a fase single-user local, não um esquecimento — mas precisa ser revisitada antes de qualquer exposição em rede).
- **Multi-profissional** — explicitamente fora de escopo (YAGNI) por `DATABASE_DESIGN.md` §1; a dimensão "profissional" no detalhamento do Financeiro já está marcada como indisponível na UI.
- **Relatórios/exportação (PDF/CSV)** — não existe em nenhum módulo.

---

## 4. Pendências técnicas (dívida técnica)

1. **Nenhum teste automatizado persistido no repositório.** Toda verificação feita até agora (ledger, Financeiro) foi via scripts `tsx` temporários, rodados manualmente contra uma cópia do banco e apagados ao final da sessão. Não há Jest/Vitest/Playwright configurado, nem scripts de teste no `package.json`. Qualquer regressão futura não será detectada automaticamente.
2. ~~**Migration com checksum divergente.**~~ **RESOLVIDO em 2026-07-29.** A divergência de checksum de `20260728120000_pagamentos_ledger` foi corrigida e **não existe mais**. Verificação de estado feita em 2026-07-29 (somente leitura, sem reset e sem escrita no banco):
   - **Checksums conferem:** os 6 checksums gravados em `_prisma_migrations` são idênticos ao SHA-256 dos respectivos `migration.sql`. Para a migration em questão: arquivo e banco em `74ad7ad5…0946aa` (o valor antigo e divergente era `632bc6ae…b817b`).
   - **`prisma migrate status` limpo:** `6 migrations found` / `Database schema is up to date!`, sem aviso de checksum, sem migration pendente, sem `rolled_back_at`, todas com `applied_steps_count = 1`.
   - **Sem drift:** `prisma migrate diff` (equivalente somente-leitura de `migrate dev`, usado para não escrever no banco) retorna `No difference detected` nas duas direções — histórico de migrations → banco e `schema.prisma` → banco. Schema, histórico e banco estão alinhados; `migrate dev` não tem nada a relatar.
   - **Histórico validado em banco descartável:** validado por `migrate reset` em cópia descartável na sessão de 2026-07-28/29 (não repetido na verificação de 2026-07-29, por decisão de não tocar no banco).
   - **Banco principal íntegro:** preservado em todas as etapas, com backups em `prisma/backups/` (16:00, 16:07 e 16:25 de 2026-07-29).
   - **A migration não foi alterada de novo:** `migration.sql` mantém mtime de 2026-07-28 20:35. O que mudou foi a linha em `_prisma_migrations`, não o arquivo.
   - **Origem da confusão:** este documento havia sido salvo por último em 2026-07-29 05:49, **antes** da correção aplicada às 16:00 do mesmo dia (ver `prisma/backups/brazillian-nail_pre-checksum-fix_20260729_160020.db`, que ainda contém o checksum antigo). A pendência era, portanto, uma anotação desatualizada — não uma reincidência do problema.
   - **Resíduo cosmético:** em `_prisma_migrations`, `finished_at` está como epoch-ms inteiro nas 5 primeiras linhas e como texto ISO na última (`20260729090000_restore_pagamentos_atendimentos_check_constraints`), traço do insert manual via SQL feito na época. O Prisma lê ambos os formatos sem erro e o `status` está limpo.
3. **Geração de ID sequencial inconsistente entre módulos.** Em `atendimentos-actions.ts` a geração de próximo ID roda dentro da mesma transação da escrita; em `agenda-actions.ts`, `clientes-actions.ts` (contatos) e `servicos-actions.ts`, roda fora de transação — risco teórico de corrida em escrita concorrente (baixo dado app single-user local, mas inconsistente).
4. **Nenhum error boundary no App Router.** Não existem `error.tsx`/`loading.tsx`/`not-found.tsx` em nenhuma rota. Como todo dado é buscado uma única vez no `layout.tsx` raiz, uma falha de leitura do SQLite (arquivo bloqueado, disco cheio, corrupção) derruba a aplicação inteira com a tela de erro genérica do Next.js.
5. **Sem estratégia de backup do arquivo SQLite.** Todas as cópias de segurança feitas até agora foram manuais e ad-hoc durante sessões de teste; não há rotina automatizada.
6. **`i18n.ts` como arquivo único de ~1700 linhas** — funciona, mas é um ponto de atrito crescente para manutenção conforme mais telas são adicionadas.
7. **Sem CI configurado** (`.github/workflows` não existe) — lint/typecheck/testes só rodam quando alguém lembra de rodar manualmente.
8. **Diretório `prisma/` não versionado — recomendação técnica registrada em 2026-07-29.** Verificado que `prisma/` aparece como não rastreado no git (`?? prisma/`). Importante: `prisma/migrations/` e `prisma/schema.prisma` **não estão ignorados** pelo `.gitignore` — apenas nunca foram adicionados ao índice, então basta um `git add`. Recomendação:
   - **Versionar `prisma/migrations/`** — dá trilha de auditoria por `git log` para cada migration, permitindo detectar edição de migration já aplicada (a causa do episódio de checksum) sem depender de mtime ou de backups do banco.
   - **Versionar `prisma/schema.prisma`** — é a fonte da verdade do modelo de dados e precisa evoluir junto com as migrations no mesmo commit.
   - **Manter arquivos `.db` no `.gitignore`** — já coberto pelas regras existentes `/prisma/*.db` e `/prisma/*.db-journal` (`.gitignore` linhas 46–47); manter assim, pois o banco contém dados reais de clientes e não deve ir para o repositório. Backups do banco continuam em `prisma/backups/` e em `08_Backups`, fora do git.

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

## 7. Fluxos que ainda possuem etapas incompletas

1. **Agendamento confirmado → lembrete → mensagem enviada → registro em `mensagens_log`**: a etapa de geração automática de lembrete e o registro de envio nunca acontecem; a tela de Lembretes é decorativa (estado local).
2. **Ver saldo pendente no Financeiro → corrigir/estornar pagamento pelo próprio Dashboard**: o botão existe, a ação de backend existe (`estornarAtendimentoAction`), mas não estão ligados.
3. **Concluir atendimento com retorno sugerido → próximo agendamento sugerido/criado**: o dado é capturado e exibido, mas o loop não fecha — nada usa `retornoSugeridoDias` para agir.
4. **Cliente inativa há 30+ dias → alerta de reengajamento → ação da profissional**: os campos existem e são exibidos, mas a consulta de elegibilidade e a ação de marcar contatada/adiada/ignorada não foram implementadas.
5. **Configurar preferências → preferências reais no restante do app**: qualquer alteração na tela de Configurações não persiste e não afeta nenhum outro módulo.

---

## 8. Ordem recomendada para as próximas implementações

1. **Testes automatizados para a camada financeira e o ledger** — antes de adicionar mais superfície, formalizar a verificação que hoje é manual e descartada a cada sessão. É a fundação mais crítica (dinheiro) e a que mais mudou recentemente; sem isso, cada nova feature aumenta o risco de regressão silenciosa.
2. ~~**Resolver o drift de migration**~~ **CONCLUÍDO em 2026-07-29** (ver §4.2) — checksums conferem, `migrate status` limpo, sem drift, banco íntegro. `prisma migrate dev`/`migrate deploy`/`migrate reset` estão destravados. **Em seu lugar, a próxima ação de infraestrutura é versionar o diretório Prisma** (ver §4.8): hoje `prisma/` está fora do controle de versão, o que é a lacuna que resta nessa área.
3. **Ligar os botões dormentes do Financeiro** (estornar/corrigir pagamento, abrir atendimento/cliente) às actions já existentes — alto valor percebido pela usuária, baixo risco técnico (a lógica de backend já foi revisada e testada).
4. **Implementar Configurações real** (`configuracoes-repo.ts`/`configuracoes-actions.ts`) — é pré-requisito de fato para vários outros itens (formas de pagamento ativas filtrando o formulário de Concluir Atendimento, horário/canal de lembretes, idioma padrão); adiar mais isso significa retrabalho futuro em quem hoje assume valores fixos no código.
5. **Lembretes: persistência real + geração automática** — depende do item 4 (horário de aviso e canal preferido vêm de Configurações); é o módulo mais isolado que ainda está 100% mock.
6. **Home (`/`) real** — mesmo tratamento já aplicado ao Financeiro; menor valor de negócio que os itens acima, mas fecha o último resquício de dado fictício visível no dia a dia.
7. **Reengajamento de clientes** — feature nova e autocontida; melhor priorizada depois que o operacional essencial (Configurações, Lembretes) estiver sólido, já que depende de lembretes/mensagens para ser útil na prática.
8. **Estorno parcial + "Saldo em Aberto (Global)"** — melhorias sobre uma base já funcionando; sem urgência.
9. **Multi-profissional, relatórios/exportação, sincronização em nuvem** — backlog de longo prazo, fora do v1.0 por decisão de design já registrada (YAGNI).

---

## 9. Riscos arquiteturais que merecem atenção antes da v1.0

1. **Zero testes automatizados persistidos** — o maior risco isolado. Toda confiança atual na camada financeira vem de verificação manual pontual, não de uma suíte que roda a cada mudança.
2. **Ausência de error boundaries** — uma falha de leitura do SQLite no `layout.tsx` raiz (arquivo bloqueado, disco cheio) derruba o app inteiro sem mensagem amigável para a usuária.
3. **Diretório `prisma/` fora do controle de versão** — *(substitui o risco anterior de "migration com checksum divergente", resolvido em 2026-07-29 — ver §4.2)*. O histórico de migrations já é confiável como fonte da verdade do schema, mas `prisma/migrations/` e `prisma/schema.prisma` aparecem como não rastreados no git (`?? prisma/`). Sem trilha de auditoria versionada, não é possível saber por `git log` se e quando uma migration foi editada após ser aplicada — foi exatamente essa a dificuldade ao investigar o caso do checksum, que só pôde ser reconstituído por mtime e por backups do banco. Esse é hoje um risco maior do que o checksum era, e é o que pode causar surpresas ao reinstalar o app em outra máquina.
4. **Geração de ID sequencial fora de transação** em parte dos módulos — condição de corrida teoricamente possível; inconsistente com o padrão já mais seguro usado em Atendimentos/Pagamentos.
5. **Configurações sem persistência real** — qualquer decisão de produto que dependa de preferências do usuário hoje não pode confiar na tela de Configurações; quanto mais tarde isso for resolvido, mais módulos vão precisar de retrabalho para parar de usar valores fixos no código.
6. **Sem estratégia de backup do banco SQLite** — um disco corrompido ou arquivo apagado por engano perde todo o histórico financeiro e de clientes, sem cópia de segurança automatizada.
7. **Ausência de autenticação** — aceitável hoje (app single-user local), mas é uma decisão que precisa ser reafirmada explicitamente antes da v1.0, não assumida como permanente — especialmente se o app rodar em qualquer rede compartilhada ou dispositivo não exclusivo da profissional.
