# DATABASE_DESIGN.md — Brazillian Nail

> Documento técnico de design do banco de dados. **Nenhum código foi alterado, nenhuma dependência foi instalada e nenhum banco foi criado.** Este documento é a base de discussão para a fase de persistência.

---

## 1. Objetivos da arquitetura

1. **Single-user local-first**: o app roda para uma única profissional (Rosângela), sem necessidade de servidor remoto ou multiusuário nesta fase.
2. **Fidelidade bilíngue**: toda informação voltada ao cliente (serviço, observação, mensagem) precisa existir em PT e EN, pois a app atende clientes lusófonos e anglófonos.
3. **Histórico auditável**: nenhum atendimento ou pagamento deve ser apagado — cancelamentos e estornos são estados, não exclusões.
4. **Identificadores estáveis e legíveis**: clientes precisam de um ID permanente e amigável (`CLI-000001`) que sobrevive a edições de nome/telefone.
5. **Consistência financeira**: valores de serviço, desconto, gorjeta e valor recebido devem ser rastreáveis por atendimento, permitindo somas confiáveis nos relatórios financeiros.
6. **Baixo atrito operacional**: a dona do salão não deve gerenciar infraestrutura de banco de dados — o mecanismo de persistência deve ser transparente (arquivo único, sem servidor).
7. **Compatibilidade com o modelo mock atual**: a estrutura de tabelas deve mapear 1:1 (ou quase) com os tipos TypeScript já usados em `src/lib/*-mock.ts`, minimizando reescrita de UI na próxima fase.
8. **Espaço para crescimento controlado**: multi-profissional, multi-unidade e sincronização em nuvem são cenários futuros possíveis — o design não deve impedi-los, mas também não deve resolvê-los agora (YAGNI).

---

## 2. Visão geral das entidades

| Tabela | Descrição | Baseado em |
|---|---|---|
| `clientes` | Cadastro principal da cliente | `clientes-mock.ts` → `Cliente` |
| `contatos` | Telefones/canais de contato (principal e secundário) | `clientes-mock.ts` → `Contato` |
| `servicos` | Catálogo de serviços oferecidos | `servicos-mock.ts` → `Servico` |
| `agendamentos` | Compromissos futuros/do dia (agenda) | `agenda-mock.ts` → `AgendaAppointment` |
| `atendimentos` | Execução real de um serviço (pode vir de um agendamento) | `atendimentos-mock.ts` → `Atendimento` |
| `atendimento_servicos` | Itens de serviço dentro de um atendimento (N:N resolvido) | `atendimentos-mock.ts` → `ServicoRealizado` |
| `lembretes` | Lembretes de agendamento (WhatsApp/SMS) | `lembretes-mock.ts` → `Lembrete` |
| `pagamentos` | Registro financeiro de cada atendimento | `financeiro-mock.ts` → `Pagamento` |
| `configuracoes` | Configurações gerais do negócio (linha única) | `configuracoes-mock.ts` → `ConfiguracoesState` |
| `mensagens_log` | Registro de toda mensagem preparada e/ou confirmada como enviada | `mensagens.ts` (tabela nova, oficial nesta fase — ver §4.10) |

Observação: no mock atual, `HistoricoAtendimento` (dentro de `Cliente.historico`) e `Atendimento`/`Pagamento` representam a mesma realidade de negócio (um atendimento concluído, com seu pagamento) descrita de três formas diferentes por três telas diferentes. No banco real, essas três visões colapsam em **uma única fonte de verdade**: a tabela `atendimentos` (+ `pagamentos` para o registro financeiro). As telas de Clientes e Financeiro passam a ser *consultas* (queries/views) sobre essa fonte única, não cópias de dados. Isso elimina divergência entre "histórico da cliente" e "relatório financeiro".

---

## 3. Diagrama de relacionamento (conceitual)

```
clientes (1) ──< contatos (0..2: principal/secundário)
clientes (1) ──< agendamentos (0..N)
clientes (1) ──< atendimentos (0..N)
clientes (1) ──< lembretes (0..N)

servicos (1) ──< atendimento_servicos (0..N) >── atendimentos (1)
agendamentos (0..1) ──── atendimentos (0..1)      [um agendamento gera no máx. 1 atendimento]
atendimentos (1) ──── pagamentos (0..1)           [1:1 — pagamento é o "lado financeiro" do atendimento]
agendamentos (1) ──── lembretes (0..1)            [lembrete é derivado do agendamento do dia]
clientes (1) ──< mensagens_log (0..N)
contatos (1) ──< mensagens_log (0..N)             [contato específico para o qual a mensagem foi preparada]
configuracoes (linha única, sem FK)
```

---

## 4. Especificação das tabelas

Convenções de tipo: tipos em notação SQLite (`TEXT`, `INTEGER`, `REAL`, `BOOLEAN` armazenado como `INTEGER 0/1`). Datas armazenadas em **ISO-8601** (`YYYY-MM-DD`) e horários em **24h `HH:MM`** no banco — a formatação `MM/DD/YYYY` / `9:00 AM` vista no mock é responsabilidade da camada de apresentação (`date.ts`), não do armazenamento. Isso evita bugs de ordenação/comparação de string em datas americanas.

### 4.1 `clientes`

| Campo | Tipo | Obrigatório | Padrão | Observações |
|---|---|---|---|---|
| `id` | TEXT | Sim (PK) | — | Formato `CLI-000001`. Ver §8. |
| `numero_sequencial` | INTEGER | Sim | — | Inteiro puro (1, 2, 3...) usado para gerar `id`. `UNIQUE`. |
| `nome` | TEXT | Sim | — | Nome legal/completo da cliente. |
| `nome_preferencia` | TEXT | Não | `NULL` | Apelido a ser usado em mensagens (ex.: "Ju"). |
| `status` | TEXT (`ativa`\|`inativa`) | Sim | `ativa` | Corresponde a `ClienteStatus`. |
| `observacoes_pt` | TEXT | Não | `''` | Observações gerais em português. |
| `observacoes_en` | TEXT | Não | `''` | Observações gerais em inglês. |
| `avisos_importantes_pt` | TEXT (JSON array) | Não | `'[]'` | Ex.: alergias. Ver §9.4 sobre por que JSON aqui. |
| `avisos_importantes_en` | TEXT (JSON array) | Não | `'[]'` | Espelho em inglês. |
| `reengajamento_status` | TEXT (`nenhum`\|`contatado`\|`adiado`\|`ignorado`) | Sim | `nenhum` | Estado da ação da profissional sobre o alerta de "cliente inativa há +30 dias sem próximo agendamento" (ver §4.1.1). `nenhum` = nenhuma ação registrada ainda. |
| `reengajamento_atualizado_em` | TEXT (datetime ISO) | Não | `NULL` | Quando `reengajamento_status` foi definido pela última vez. |
| `reengajamento_adiado_ate` | TEXT (data ISO) | Não | `NULL` | Só relevante quando `reengajamento_status = 'adiado'` — data a partir da qual a cliente volta a aparecer na lista de reengajamento. |
| `reengajamento_observacao` | TEXT | Não | `NULL` | Nota livre opcional da profissional sobre a decisão (ex.: "disse que volta em agosto"). |
| `criado_em` | TEXT (datetime ISO) | Sim | `CURRENT_TIMESTAMP` | Auditoria. |
| `atualizado_em` | TEXT (datetime ISO) | Sim | `CURRENT_TIMESTAMP` | Auditoria — atualizado via trigger `AFTER UPDATE`. |

**Decisão final — `valor_pendente` e `ultimo_atendimento` NÃO são colunas desta tabela.** Não existe coluna gravada para nenhum dos dois: ambos são **sempre calculados por consulta** (query/view), nunca armazenados manualmente, para eliminar qualquer risco de divergência entre o que a UI mostra e a soma real de `atendimentos`/`pagamentos`. Da mesma forma, `proximo_agendamento_id` não é armazenado em `clientes` — é obtido por consulta (`SELECT` do próximo `agendamentos` com `data >= hoje` e `status` ativo para o `cliente_id`), evitando duplicar um dado que já existe em `agendamentos`. Consultas de referência (a implementar como views na fase de construção do banco):

```sql
-- valor_pendente por cliente
SELECT a.cliente_id, SUM(p.saldo_pendente) AS valor_pendente
FROM atendimentos a
JOIN pagamentos p ON p.atendimento_id = a.id
WHERE p.status NOT IN ('cortesia')
GROUP BY a.cliente_id;

-- ultimo_atendimento por cliente
SELECT cliente_id, MAX(data) AS ultimo_atendimento
FROM atendimentos
WHERE status NOT IN ('cancelado', 'estornado')
GROUP BY cliente_id;
```

**PK**: `id`.
**Índices recomendados**: `UNIQUE(numero_sequencial)`, `INDEX(status)`, `INDEX(nome)` (para busca/autocomplete), `INDEX(reengajamento_status)`.

#### 4.1.1 Reengajamento de clientes inativas (requisito futuro)

Requisito de negócio: a app deve, no futuro, conseguir identificar clientes **ativas** sem atendimento concluído há mais de 30 dias **e** sem agendamento futuro, e permitir que a profissional marque cada uma dessas clientes como **contatada**, **adie o contato** (volta a aparecer depois de uma data escolhida) ou **ignore** o alerta.

Como nos demais valores derivados desta tabela (§4.1), a **identificação** de quem entra na lista é sempre calculada por consulta — nunca armazenada —, mas a **ação da profissional sobre cada cliente** (contatada/adiada/ignorada) precisa ser persistida, pois é uma decisão humana que não pode ser recalculada. Por isso as 4 colunas `reengajamento_*` (acima) ficam em `clientes`, não em tabela separada: é sempre **um estado atual único por cliente** (não um histórico com múltiplas linhas), o mesmo padrão de singleton-por-entidade já usado em `configuracoes` (§4.9), evitando uma tabela extra para um caso de uso que não precisa de múltiplas linhas por cliente.

```sql
-- clientes elegíveis para reengajamento
SELECT c.id, c.nome, c.reengajamento_status, c.reengajamento_adiado_ate
FROM clientes c
WHERE c.status = 'ativa'
  -- sem atendimento concluído nos últimos 30 dias (ou nunca atendida)
  AND NOT EXISTS (
    SELECT 1 FROM atendimentos a
    WHERE a.cliente_id = c.id
      AND a.status NOT IN ('cancelado', 'estornado')
      AND a.data >= date('now', '-30 days')
  )
  -- sem agendamento futuro ativo
  AND NOT EXISTS (
    SELECT 1 FROM agendamentos ag
    WHERE ag.cliente_id = c.id
      AND ag.data >= date('now')
      AND ag.status NOT IN ('cancelado', 'naoCompareceu')
  )
  -- exclui quem já foi tratada, exceto adiamento vencido
  AND (
    c.reengajamento_status = 'nenhum'
    OR (c.reengajamento_status = 'adiado' AND c.reengajamento_adiado_ate <= date('now'))
  );
```

**Regra de negócio** (não é constraint SQL, validar em código): sempre que um novo `atendimento` for registrado para a cliente (com status diferente de `cancelado`/`estornado`), a camada de aplicação deve resetar `reengajamento_status` para `'nenhum'` e limpar `reengajamento_adiado_ate`/`reengajamento_observacao` — o alerta antigo perde sentido assim que a cliente volta a ser atendida. `ignorado` não expira automaticamente (fica assim até o próximo atendimento resetar); `adiado` expira sozinho na data `reengajamento_adiado_ate`.

### 4.2 `contatos`

| Campo | Tipo | Obrigatório | Padrão | Observações |
|---|---|---|---|---|
| `id` | TEXT | Sim (PK) | — | UUID ou `CTT-<n>`. |
| `cliente_id` | TEXT | Sim (FK) | — | → `clientes.id`. |
| `papel` | TEXT (`principal`\|`secundario`) | Sim | — | Substitui os dois campos separados `contatoPrincipal`/`contatoSecundario` do mock — ver §9.1. |
| `nome_contato` | TEXT | Sim | — | Nome de quem atende o telefone (pode ser a própria cliente ou responsável). |
| `telefone` | TEXT | Sim | — | Formato armazenado: apenas dígitos (E.164 sem `+`), formatação de exibição feita na UI. Evita bugs como os de `mensagens.ts:apenasDigitos`. |
| `relacao` | TEXT (`propria`\|`mae`\|`pai`\|`conjuge`\|`responsavel`\|`outro`) | Sim | `propria` | |
| `idioma` | TEXT (`pt`\|`en`\|`bilingue`) | Sim | `pt` | Idioma das mensagens para este contato. |
| `canal_preferido` | TEXT (`whatsapp`\|`sms`\|`ambos`) | Sim | `whatsapp` | |
| `receber_lembretes` | BOOLEAN | Sim | `1` | Consentimento de recebimento — relacionado a `consentimentoRegistrado` em `lembretes`. |
| `criado_em` | TEXT | Sim | `CURRENT_TIMESTAMP` | |

**PK**: `id`.
**FK**: `cliente_id` → `clientes.id` (`ON DELETE CASCADE`).
**Índices**: `INDEX(cliente_id)`, `UNIQUE(cliente_id, papel)` (garante no máximo 1 principal + 1 secundário por cliente).

### 4.3 `servicos`

| Campo | Tipo | Obrigatório | Padrão | Observações |
|---|---|---|---|---|
| `id` | TEXT | Sim (PK) | — | Formato permanente `SRV-000001`. Ver §8. |
| `nome_pt` | TEXT | Sim | — | Nome do serviço em português. Ex.: "Manutenção". |
| `nome_en` | TEXT | Não | `NULL` | Nome do serviço em inglês. **Opcional inicialmente** — o catálogo pode ser cadastrado só em PT no começo e receber a tradução depois; enquanto `NULL`, a UI usa `nome_pt` como fallback em telas em inglês. |
| `categoria` | TEXT | Sim | — | Ex.: "Manutenção", "Esmaltação". |
| `descricao_pt` | TEXT | Não | `''` | |
| `descricao_en` | TEXT | Não | `''` | |
| `preco_padrao` | REAL | Sim | — | |
| `preco_variavel` | BOOLEAN | Sim | `0` | |
| `preco_minimo` | REAL | Não | `NULL` | Só relevante se `preco_variavel = 1`. |
| `preco_maximo` | REAL | Não | `NULL` | Idem. |
| `duracao_padrao_min` | INTEGER | Sim | — | Em minutos. |
| `duracao_minima_min` | INTEGER | Não | `NULL` | |
| `duracao_maxima_min` | INTEGER | Não | `NULL` | |
| `retorno_sugerido_dias` | INTEGER | Não | `NULL` | Usado para sugerir próximo agendamento. |
| `status` | TEXT (`ativo`\|`inativo`) | Sim | `ativo` | Serviços inativos não aparecem em novos agendamentos, mas permanecem para atendimentos históricos (nunca apagar). |
| `observacoes_pt` | TEXT | Não | `''` | |
| `observacoes_en` | TEXT | Não | `''` | |

**PK**: `id`.
**Índices**: `INDEX(status)`, `INDEX(categoria)`.

### 4.4 `agendamentos`

| Campo | Tipo | Obrigatório | Padrão | Observações |
|---|---|---|---|---|
| `id` | TEXT | Sim (PK) | — | Formato permanente `AGD-000001`. Ver §8. |
| `cliente_id` | TEXT | Sim (FK) | — | → `clientes.id`. |
| `servico_id` | TEXT | Não | `NULL` | → `servicos.id`. `NULL` permitido para "serviço a definir" (visto no mock: "Serviço a definir"). |
| `data` | TEXT (data ISO) | Sim | — | |
| `inicio_min` | INTEGER | Sim | — | Minutos desde meia-noite (mesmo padrão do mock `inicioMin`/`fimMin`), evita problemas de fuso/parse de string de hora. |
| `fim_min` | INTEGER | Sim | — | |
| `status` | TEXT (enum `StatusKey`) | Sim | `aguardando` | Valores: `aguardando`, `confirmado`, `emAtendimento`, `concluido`, `cancelado`, `naoCompareceu`. |
| `valor_estimado` | REAL | Não | `NULL` | Estimativa antes do atendimento real (pode divergir do valor final). |
| `observacoes_pt` | TEXT | Não | `''` | |
| `observacoes_en` | TEXT | Não | `''` | |
| `criado_em` | TEXT | Sim | `CURRENT_TIMESTAMP` | |

**PK**: `id`.
**FK**: `cliente_id` → `clientes.id` (`ON DELETE RESTRICT` — não apagar cliente com agenda futura sem tratar antes); `servico_id` → `servicos.id` (`ON DELETE SET NULL`).
**Índices**: `INDEX(data, inicio_min)` (consulta principal da agenda do dia), `INDEX(cliente_id)`, `INDEX(status)`.
**Regra de negócio** (não é constraint SQL simples, validar em código): impedir sobreposição de horário quando `bloqueioConflitoHorario = true` nas configurações.

### 4.5 `atendimentos`

| Campo | Tipo | Obrigatório | Padrão | Observações |
|---|---|---|---|---|
| `id` | TEXT | Sim (PK) | — | Formato permanente `ATD-000001`. Ver §8. |
| `cliente_id` | TEXT | Sim (FK) | — | → `clientes.id`. |
| `agendamento_id` | TEXT | Não | `NULL` | → `agendamentos.id`. `NULL` para encaixes sem agendamento prévio ("Encaixe de última hora" no mock). |
| `profissional` | TEXT | Sim | — | Hoje sempre "Rosângela"; mantido como coluna (não enum) para permitir multi-profissional futuramente sem migração de schema. |
| `data` | TEXT (data ISO) | Sim | — | |
| `horario_inicio` | TEXT (`HH:MM`) | Sim | — | |
| `horario_fim` | TEXT (`HH:MM`) | Não | `NULL` | `NULL` enquanto `status = emAndamento`. |
| `duracao_min` | INTEGER | Não | `NULL` | **Derivado** de início/fim — pode ser calculado, mas mock já guarda; manter para paridade e performance de relatório. |
| `desconto` | REAL | Sim | `0` | |
| `gorjeta` | REAL | Sim | `0` | |
| `valor_recebido` | REAL | Sim | `0` | |
| `forma_pagamento` | TEXT (enum `FormaPagamento`) | Não | `NULL` | `dinheiro`, `cartaoCredito`, `cartaoDebito`, `zelle`, `venmo`, `cashApp`, `cheque`, `outra`. |
| `status` | TEXT (enum `AtendimentoStatus`) | Sim | `emAndamento` | `emAndamento`, `finalizadoPago`, `finalizadoPendente`, `finalizadoParcial`, `finalizadoCortesia`, `cancelado`, `estornado`. |
| `observacoes_pt` | TEXT | Não | `''` | |
| `observacoes_en` | TEXT | Não | `''` | |
| `retorno_sugerido_dias` | INTEGER | Não | `NULL` | |
| `proximo_agendamento_id` | TEXT | Não | `NULL` | FK → `agendamentos.id` (o próximo compromisso criado a partir deste atendimento). |
| `criado_em` | TEXT | Sim | `CURRENT_TIMESTAMP` | |
| `atualizado_em` | TEXT | Sim | `CURRENT_TIMESTAMP` | |

**PK**: `id`.
**FK**: `cliente_id` → `clientes.id` (`ON DELETE RESTRICT`); `agendamento_id` → `agendamentos.id` (`ON DELETE SET NULL`); `proximo_agendamento_id` → `agendamentos.id` (`ON DELETE SET NULL`).
**Índices**: `INDEX(cliente_id, data)` (histórico da cliente ordenado), `INDEX(data)` (relatórios por período), `INDEX(status)`.
**Justificativa de "nunca apagar"**: `cancelado`/`estornado` são estados, não deleções — preserva histórico para auditoria financeira e para a cliente ver seu próprio histórico completo.

### 4.6 `atendimento_servicos`

Resolve o array `servicos: ServicoRealizado[]` do mock (um atendimento pode ter múltiplos serviços, ex. "alongamento + esmaltação").

| Campo | Tipo | Obrigatório | Padrão | Observações |
|---|---|---|---|---|
| `id` | INTEGER | Sim (PK autoincrement) | — | |
| `atendimento_id` | TEXT | Sim (FK) | — | → `atendimentos.id`. |
| `servico_id` | TEXT | Não | `NULL` | → `servicos.id`. `NULL` permitido para serviços avulsos/legados (ex.: "Serviço a definir" no mock, que não existe no catálogo). |
| `nome_pt` | TEXT | Sim | — | Snapshot do nome no momento do atendimento — **não** um lookup ao vivo em `servicos.nome_pt`, pois nomes/preços de serviço podem mudar depois e o histórico deve preservar o que foi cobrado na época. |
| `nome_en` | TEXT | Sim | — | Idem. |
| `valor` | REAL | Sim | — | Valor efetivamente cobrado por este item (pode diferir do `preco_padrao` do catálogo). |

**PK**: `id`.
**FK**: `atendimento_id` → `atendimentos.id` (`ON DELETE CASCADE`); `servico_id` → `servicos.id` (`ON DELETE SET NULL`).
**Índices**: `INDEX(atendimento_id)`.

### 4.7 `lembretes`

| Campo | Tipo | Obrigatório | Padrão | Observações |
|---|---|---|---|---|
| `id` | TEXT | Sim (PK) | — | Formato permanente `LEM-000001`. Ver §8. |
| `agendamento_id` | TEXT | Sim (FK) | — | → `agendamentos.id`. Substitui a duplicação de `clienteId`/`horario`/`servicoPt`/`servicoEn` do mock — esses dados já existem em `agendamentos` e podem ser obtidos via join, evitando desnormalização e divergência entre os dois. |
| `status_lembrete` | TEXT (enum) | Sim | `pendente` | `pendente`, `preparado`, `enviado`, `tratadoPessoalmente`, `ignorado`, `indisponivel`. `preparado` significa apenas que o texto foi montado (ver `mensagens_log`, §4.10) — não que foi enviado; só `enviado` confirma o envio. |
| `consentimento_registrado` | BOOLEAN | Sim | `0` | Espelha `Contato.receberLembretes` no momento do envio — mantido aqui como snapshot para auditoria de consentimento (LGPD/TCPA), mesmo que o consentimento do contato mude depois. |
| `mensagem_personalizada` | TEXT | Não | `NULL` | Override de texto para o contato principal. |
| `mensagem_personalizada_secundario` | TEXT | Não | `NULL` | Override para contato secundário. |
| `enviado_em` | TEXT (datetime ISO) | Não | `NULL` | Preenchido quando `status_lembrete = enviado`. Espelha `confirmado_em` do registro correspondente em `mensagens_log`. |

**PK**: `id`.
**FK**: `agendamento_id` → `agendamentos.id` (`ON DELETE CASCADE`).
**Índices**: `UNIQUE(agendamento_id)` (1 lembrete por agendamento), `INDEX(status_lembrete)`.

### 4.8 `pagamentos`

Representa o "lado financeiro" de um atendimento. No mock, `Pagamento` duplica campos de `Atendimento` (cliente, serviço, valores) — no banco real isso é uma relação 1:1 com FK, eliminando a duplicação.

| Campo | Tipo | Obrigatório | Padrão | Observações |
|---|---|---|---|---|
| `id` | TEXT | Sim (PK) | — | Formato permanente `PAG-000001`. Ver §8. |
| `atendimento_id` | TEXT | Sim (FK, único) | — | → `atendimentos.id`. Relação 1:1. |
| `data_pagamento` | TEXT (data ISO) | Não | `NULL` | `NULL` enquanto pendente. |
| `valor_servicos` | REAL | Sim | — | Snapshot — soma de `atendimento_servicos.valor` no momento do fechamento (pode ser recalculado, mas snapshot facilita relatórios históricos estáveis mesmo se itens forem editados depois). |
| `desconto` | REAL | Sim | `0` | |
| `gorjeta` | REAL | Sim | `0` | |
| `valor_recebido` | REAL | Sim | `0` | |
| `forma_pagamento` | TEXT (enum `FormaPagamento`) | Não | `NULL` | |
| `status` | TEXT (`recebido`\|`pendente`\|`parcial`\|`cortesia`) | Sim | `pendente` | |
| `observacoes_pt` | TEXT | Não | `''` | |
| `observacoes_en` | TEXT | Não | `''` | |

**Decisão final — `saldo_pendente` NÃO é uma coluna desta tabela.** É **sempre calculado por consulta**, nunca armazenado:

```sql
-- saldo_pendente por pagamento (nunca negativo)
SELECT id,
       MAX(valor_servicos - desconto - valor_recebido, 0) AS saldo_pendente
FROM pagamentos;
```

Isso reaproveita exatamente a fórmula já usada em `saldoPendente()` (`atendimentos-mock.ts:54-56`), mas movida para uma view/consulta em vez de um campo gravado — elimina o risco de a coluna ficar desatualizada depois de um pagamento parcial adicional.

**PK**: `id`.
**FK**: `atendimento_id` → `atendimentos.id` (`ON DELETE CASCADE`), `UNIQUE`.
**Índices**: `INDEX(data_pagamento)`, `INDEX(status)`, `INDEX(forma_pagamento)` (usado no gráfico "Formas de pagamento").

### 4.9 `configuracoes`

Tabela de **linha única** (singleton) — sem FK, sem múltiplas linhas. Alternativa considerada: `chave/valor` (EAV), rejeitada porque o schema de configurações já é bem definido e fixo (ver §11).

| Campo | Tipo | Obrigatório | Padrão | Observações |
|---|---|---|---|---|
| `id` | INTEGER | Sim (PK, sempre `1`) | `1` | `CHECK (id = 1)` garante linha única. |
| `negocio_nome` | TEXT | Sim | `'Brazillian Nail'` | |
| `negocio_nome_curto` | TEXT | Sim | `'Brazillian Nail'` | |
| `negocio_telefone` | TEXT | Sim | — | |
| `negocio_email` | TEXT | Sim | — | |
| `negocio_endereco` | TEXT | Sim | — | |
| `negocio_cidade` | TEXT | Sim | — | |
| `negocio_estado` | TEXT | Sim | — | |
| `negocio_zip` | TEXT | Sim | — | |
| `fuso_horario` | TEXT | Sim | `'America/New_York'` | |
| `moeda` | TEXT | Sim | `'USD ($)'` | |
| `formato_data` | TEXT | Sim | `'MM/DD/YYYY'` | Apenas exibição — armazenamento interno permanece ISO (ver nota de convenções no início da §4). |
| `formato_hora` | TEXT | Sim | `'12h (AM/PM)'` | |
| `idioma_padrao_mensagens` | TEXT (`pt`\|`en`) | Sim | `'pt'` | |
| `permitir_alterar_idioma_por_cliente` | BOOLEAN | Sim | `1` | |
| `agenda_horario_abertura` | TEXT | Sim | `'9:00 AM'` | |
| `agenda_horario_fechamento` | TEXT | Sim | `'7:00 PM'` | |
| `agenda_duracao_padrao_min` | INTEGER | Sim | `60` | |
| `agenda_dias_funcionamento` | TEXT (JSON array) | Sim | `'["seg","ter","qua","qui","sex","sab"]'` | |
| `agenda_bloqueio_conflito` | BOOLEAN | Sim | `1` | |
| `agenda_permitir_encaixe` | BOOLEAN | Sim | `1` | |
| `lembretes_ativar_dia_anterior` | BOOLEAN | Sim | `1` | |
| `lembretes_horario_padrao_aviso` | TEXT | Sim | `'6:00 PM'` | |
| `lembretes_canal_preferido` | TEXT (`whatsapp`\|`sms`) | Sim | `'whatsapp'` | |
| `lembretes_exigir_confirmacao_manual` | BOOLEAN | Sim | `1` | |
| `lembretes_texto_padrao_pt` | TEXT | Sim | — | Template com placeholders `{nome}`, `{data}`, etc. |
| `lembretes_texto_padrao_en` | TEXT | Sim | — | |
| `financeiro_formas_pagamento_ativas` | TEXT (JSON object) | Sim | `'{...}'` | Mapa `FormaPagamento → boolean`. |
| `financeiro_mostrar_gorjeta_separada` | BOOLEAN | Sim | `1` | |
| `financeiro_permitir_pagamento_parcial` | BOOLEAN | Sim | `1` | |
| `financeiro_mostrar_valores_pendentes` | BOOLEAN | Sim | `1` | |
| `seguranca_email_principal` | TEXT | Sim | — | |
| `seguranca_sessao_expiracao_min` | INTEGER | Sim | `30` | |
| `atualizado_em` | TEXT | Sim | `CURRENT_TIMESTAMP` | |

**PK**: `id` (fixo em `1`).

### 4.10 `mensagens_log`

Tabela oficial (não mais opcional) para registrar toda mensagem preparada para uma cliente, seja ela efetivamente enviada ou não. Resolve o requisito de auditoria de comunicação: quem recebeu o quê, em que idioma, por qual canal, e — crucialmente — **diferenciar "texto preparado" de "confirmado como enviado"**, já que o app hoje só gera o link `wa.me`/`sms:` (`mensagens.ts:45-51`) e não sabe se a usuária realmente apertou "enviar" no WhatsApp/SMS do celular.

| Campo | Tipo | Obrigatório | Padrão | Observações |
|---|---|---|---|---|
| `id` | TEXT | Sim (PK) | — | Formato permanente `MSG-000001`. |
| `cliente_id` | TEXT | Sim (FK) | — | → `clientes.id`. |
| `contato_id` | TEXT | Sim (FK) | — | → `contatos.id`. Identifica exatamente qual contato (principal/secundário) recebeu a mensagem. |
| `lembrete_id` | TEXT | Não | `NULL` | → `lembretes.id`. `NULL` quando a mensagem não se origina de um lembrete de agendamento (ex.: mensagem avulsa). |
| `canal` | TEXT (`whatsapp`\|`sms`) | Sim | — | Canal efetivamente usado para esta mensagem. |
| `idioma` | TEXT (`pt`\|`en`\|`bilingue`) | Sim | — | Idioma em que o texto foi montado — snapshot de `contatos.idioma` no momento da preparação. |
| `texto_preparado` | TEXT | Sim | — | Conteúdo exato gerado por `buildMensagemContato`/`buildMensagemLembrete` (ou editado manualmente antes do envio). |
| `status_mensagem` | TEXT (`preparada`\|`enviada`\|`cancelada`) | Sim | `preparada` | **`preparada`**: o texto foi gerado/copiado, mas não há confirmação de envio. **`enviada`**: a usuária confirmou explicitamente que a mensagem foi enviada (ação manual na UI, já que o app não tem integração direta com WhatsApp/SMS para confirmar entrega). **`cancelada`**: preparada mas descartada sem envio. |
| `preparado_em` | TEXT (datetime ISO) | Sim | `CURRENT_TIMESTAMP` | Quando o texto foi gerado. |
| `confirmado_em` | TEXT (datetime ISO) | Não | `NULL` | Preenchido **somente** quando `status_mensagem = enviada` — é o campo que efetivamente diferencia "preparada" de "confirmada como enviada". |

**PK**: `id`.
**FK**: `cliente_id` → `clientes.id` (`ON DELETE RESTRICT`); `contato_id` → `contatos.id` (`ON DELETE RESTRICT`); `lembrete_id` → `lembretes.id` (`ON DELETE SET NULL`).
**Índices**: `INDEX(cliente_id)`, `INDEX(status_mensagem)`, `INDEX(preparado_em)`.

---

## 5. Chaves primárias — resumo

| Tabela | PK |
|---|---|
| `clientes` | `id` (TEXT, `CLI-000001`) |
| `contatos` | `id` (TEXT/UUID) |
| `servicos` | `id` (TEXT, `SRV-000001`) |
| `agendamentos` | `id` (TEXT, `AGD-000001`) |
| `atendimentos` | `id` (TEXT, `ATD-000001`) |
| `atendimento_servicos` | `id` (INTEGER autoincrement) |
| `lembretes` | `id` (TEXT, `LEM-000001`) |
| `pagamentos` | `id` (TEXT, `PAG-000001`) |
| `configuracoes` | `id` (INTEGER, sempre `1`) |
| `mensagens_log` | `id` (TEXT, `MSG-000001`) |

## 6. Chaves estrangeiras — resumo

| FK | Tabela origem | Tabela destino | On Delete |
|---|---|---|---|
| `contatos.cliente_id` | contatos | clientes | CASCADE |
| `clientes.proximo_agendamento_id` | clientes | agendamentos | SET NULL |
| `agendamentos.cliente_id` | agendamentos | clientes | RESTRICT |
| `agendamentos.servico_id` | agendamentos | servicos | SET NULL |
| `atendimentos.cliente_id` | atendimentos | clientes | RESTRICT |
| `atendimentos.agendamento_id` | atendimentos | agendamentos | SET NULL |
| `atendimentos.proximo_agendamento_id` | atendimentos | agendamentos | SET NULL |
| `atendimento_servicos.atendimento_id` | atendimento_servicos | atendimentos | CASCADE |
| `atendimento_servicos.servico_id` | atendimento_servicos | servicos | SET NULL |
| `lembretes.agendamento_id` | lembretes | agendamentos | CASCADE |
| `pagamentos.atendimento_id` | pagamentos | atendimentos | CASCADE |
| `mensagens_log.cliente_id` | mensagens_log | clientes | RESTRICT |
| `mensagens_log.contato_id` | mensagens_log | contatos | RESTRICT |
| `mensagens_log.lembrete_id` | mensagens_log | lembretes | SET NULL |

`RESTRICT` em `cliente_id` (agendamentos/atendimentos) é proposital: impede apagar uma cliente que tenha histórico, forçando a profissional a inativar (`status = inativa`) em vez de excluir — alinhado à regra do `CLAUDE.md` da pasta-mãe de "nunca apagar sem autorização".

## 7. Índices recomendados (consolidado)

- `clientes`: `UNIQUE(numero_sequencial)`, `INDEX(status)`, `INDEX(nome)`, `INDEX(reengajamento_status)`
- `contatos`: `INDEX(cliente_id)`, `UNIQUE(cliente_id, papel)`
- `servicos`: `INDEX(status)`, `INDEX(categoria)`
- `agendamentos`: `INDEX(data, inicio_min)`, `INDEX(cliente_id)`, `INDEX(status)`
- `atendimentos`: `INDEX(cliente_id, data)`, `INDEX(data)`, `INDEX(status)`
- `atendimento_servicos`: `INDEX(atendimento_id)`
- `lembretes`: `UNIQUE(agendamento_id)`, `INDEX(status_lembrete)`
- `pagamentos`: `UNIQUE(atendimento_id)`, `INDEX(data_pagamento)`, `INDEX(status)`, `INDEX(forma_pagamento)`
- `mensagens_log`: `INDEX(cliente_id)`, `INDEX(status_mensagem)`, `INDEX(preparado_em)`

---

## 8. Estratégia de identificadores permanentes

**Problema**: nome, telefone e detalhes de agendamento/atendimento podem mudar ou ser reagendados; os IDs precisam ser estáveis e legíveis para a profissional (que trabalha manualmente, sem UUID na cabeça), e servem de chave para todas as FKs do banco.

**Decisão final**: o padrão `PREFIXO-000001` (prefixo de 3 letras + número sequencial com 6 dígitos, zero-padded) é adotado para **todas** as entidades principais, não só clientes:

| Entidade | Prefixo | Exemplo |
|---|---|---|
| Clientes | `CLI` | `CLI-000001` |
| Serviços | `SRV` | `SRV-000001` |
| Agendamentos | `AGD` | `AGD-000001` |
| Atendimentos | `ATD` | `ATD-000001` |
| Pagamentos | `PAG` | `PAG-000001` |
| Lembretes | `LEM` | `LEM-000001` |
| Mensagens (log) | `MSG` | `MSG-000001` |

**Mecanismo de geração (igual para todas as entidades acima)**:
1. Cada tabela tem uma coluna real de ordenação `numero_sequencial INTEGER UNIQUE NOT NULL`, gerada por `AUTOINCREMENT` (SQLite) ou sequência equivalente — **uma sequência independente por tabela** (o contador de `CLI` não interfere no de `ATD`, por exemplo).
2. A coluna `id TEXT` é **gerada e congelada no momento do INSERT**, a partir do sequencial: `'CLI-' || printf('%06d', numero_sequencial)` (trocando o prefixo conforme a tabela).
   - Em SQLite, isso pode ser feito com um **trigger `AFTER INSERT`** por tabela, ou calculado na camada de acesso a dados antes do insert — a segunda opção é mais simples e recomendada para um app local pequeno, e é a abordagem que o Prisma facilita (gerar o `id` na camada de aplicação antes de persistir).
3. Uma vez gerado, o `id` **nunca é regenerado**, mesmo que o registro seja editado — ele é a chave usada em todas as FKs entre tabelas, então qualquer mudança quebraria o histórico e as referências cruzadas (ex.: `atendimentos.cliente_id`, `pagamentos.atendimento_id`).
4. Sem reaproveitamento de números: se um registro for removido (o que só deve acontecer com autorização explícita — ver `CLAUDE.md`), seu número não é reciclado, para não colidir com referências antigas em backups/exports.
5. Funções puras já existentes no mock para clientes (`formatClienteId`, `numeroClienteId` em `clientes-mock.ts:46-54`) seguem o mesmo formato adotado aqui e podem ser generalizadas (mesma lógica, prefixo parametrizado) para as demais entidades na camada de acesso a dados.

Os IDs "curtos" hoje usados no mock (`srv-1`, `apt-1`, `at-1`, `lem-1`, `pag-1`) **não são o formato final** — são identificadores de conveniência de desenvolvimento e serão convertidos para o padrão `PREFIXO-000001` durante a migração (§12), preservando a ordem original de criação como base do `numero_sequencial`.

---

## 9. Estratégias específicas de armazenamento

### 9.1 Dois contatos (principal e secundário)

Rejeitada a abordagem do mock (`contatoPrincipal`/`contatoSecundario` como duas colunas JSON dentro de `clientes`). Adotada tabela `contatos` separada com coluna `papel` (`principal`/`secundario`) e `UNIQUE(cliente_id, papel)`:
- Permite consultas relacionais normais (`JOIN`) em vez de parsear JSON.
- Escala naturalmente se no futuro for necessário um 3º contato (ex.: emergência) — basta permitir um novo valor de `papel`, sem migração de schema.
- Mantém compatibilidade de leitura com a UI: a query `SELECT * FROM contatos WHERE cliente_id = ? ORDER BY papel` já reconstrói exatamente as duas colunas do tipo `Cliente` do mock.

### 9.2 Idioma

Campo `idioma` (`pt`/`en`/`bilingue`) vive em `contatos`, não em `clientes` — porque o idioma é por **canal de contato**, não por cliente (ex.: mãe fala inglês, cliente fala português, mesma pessoa). Reaproveita o tipo `IdiomaContato` do mock sem alteração.

### 9.3 Canais (WhatsApp/SMS)

Campo `canal_preferido` (`whatsapp`/`sms`/`ambos`) em `contatos`. As funções `whatsappHref`/`smsHref` (`mensagens.ts:45-51`) continuam operando sobre `telefone` sem alteração — a única mudança é que `telefone` passa a ser armazenado só com dígitos (E.164-like), e a formatação de exibição (`(508) 555-0148`) fica a cargo da UI.

### 9.4 Observações PT/EN

Todo texto livre voltado à cliente (observações gerais, observações de atendimento, avisos importantes) é armazenado em **par de colunas** `..._pt` / `..._en`, replicando o padrão já usado consistentemente no mock (`observacoesPt`/`observacoesEn`). Alternativa rejeitada: tabela de traduções genérica (`traducoes(entidade, campo, idioma, texto)`) — descartada por complexidade desnecessária dado que o conjunto de campos traduzíveis é pequeno e estável (YAGNI).

Listas (`avisosImportantesPt: string[]`) são armazenadas como **JSON array em coluna TEXT** (`avisos_importantes_pt`), não como tabela filha, porque:
- É uma lista curta, sem necessidade de busca/filtro individual por item.
- SQLite tem suporte nativo a funções JSON (`json_each`, `json_extract`) se algum dia for preciso consultar dentro do array.
- Uma tabela filha (`cliente_avisos(cliente_id, idioma, texto, ordem)`) seria mais "correta" relacionalmente, mas adiciona joins para um caso de uso puramente de exibição em lista — reavaliar se a lista crescer ou precisar de busca full-text.

### 9.5 Nome de preferência

Campo simples `clientes.nome_preferencia TEXT NULL` — usado nas mensagens (`buildMensagemLembrete` já faz `cliente?.nomePreferencia ?? cliente?.nome`), lógica preservada na camada de aplicação.

### 9.6 Status

Cada entidade tem seu próprio enum de status, armazenado como `TEXT` com `CHECK` constraint (não `INTEGER` codificado), para manter os arquivos de banco legíveis por humanos (ex.: em backups/exports) e evitar bugs de mapeamento número↔significado:
- `clientes.status`: `ativa`/`inativa`
- `agendamentos.status`: `aguardando`/`confirmado`/`emAtendimento`/`concluido`/`cancelado`/`naoCompareceu`
- `atendimentos.status`: `emAndamento`/`finalizadoPago`/`finalizadoPendente`/`finalizadoParcial`/`finalizadoCortesia`/`cancelado`/`estornado`
- `pagamentos.status`: `recebido`/`pendente`/`parcial`/`cortesia`
- `lembretes.status_lembrete`: `pendente`/`preparado`/`enviado`/`tratadoPessoalmente`/`ignorado`/`indisponivel`
- `servicos.status`: `ativo`/`inativo`

### 9.7 Mensagens

Três decisões distintas, todas finais:
1. **Templates de mensagem** (`lembretes_texto_padrao_pt/en` com placeholders `{nome}`, `{data}`, `{horario}`, `{servico}`, `{negocio}`, `{endereco}`) ficam em `configuracoes`, como hoje.
2. **Overrides pontuais** (`mensagemPersonalizada`/`mensagemPersonalizadaSecundario`) ficam em `lembretes`, por lembrete.
3. **Log de mensagens** — `mensagens_log` (§4.10) é uma tabela **oficial** desta fase (não mais uma ideia futura). Ela existe para resolver um problema concreto: `mensagens.ts` hoje só gera texto e um link `wa.me:`/`sms:`, sem qualquer registro de que a mensagem foi de fato enviada — a usuária clica no link e sai do app para o WhatsApp/SMS do celular, onde o app não tem visibilidade. Por isso a tabela **diferencia explicitamente dois momentos**:
   - `status_mensagem = 'preparada'` + `preparado_em` preenchido, `confirmado_em` nulo: o texto foi gerado (e o link aberto), mas não há confirmação de envio.
   - `status_mensagem = 'enviada'` + `confirmado_em` preenchido: a usuária confirmou manualmente na UI (ex.: botão "Marcar como enviada") que a mensagem foi enviada. Essa confirmação **precisa ser uma ação explícita do usuário na interface** — o sistema não pode inferir envio automaticamente, pois não há integração real com WhatsApp/SMS que confirme entrega.

---

## 10. Estratégia de backup (decisão final)

Dado o contexto (app local, usuária não-técnica, regra do `CLAUDE.md` da pasta-mãe exigindo cópia em `08_Backups` antes de alterar arquivos):

1. **Formato**: SQLite é um único arquivo (`brazillian-nail.db`) — trivial de copiar. O backup usa `sqlite3` `VACUUM INTO` (ou cópia de arquivo com checkpoint do WAL feito antes), nunca uma cópia do arquivo com o banco aberto/em escrita.
2. **Backup automático diário**: disparado uma vez por dia, na primeira abertura do app naquele dia (comparando a data do último backup registrado com a data atual) — sem exigir que a usuária faça nada.
3. **Backup manual**: a UI deve oferecer um botão explícito ("Fazer backup agora") que gera um snapshot sob demanda, a qualquer momento, além do automático diário — útil antes de uma edição grande ou antes de fechar o negócio por um período.
4. **Nomenclatura**: `brazillian-nail-YYYY-MM-DD.db` para o backup diário automático; `brazillian-nail-YYYY-MM-DD-HHmm-manual.db` para backups manuais, seguindo a convenção de data do `CLAUDE.md`.
5. **Política de retenção definitiva**:
   - **7 backups diários** mais recentes são sempre mantidos (cobre a última semana completa).
   - **4 backups semanais** adicionais são mantidos (um snapshot por semana, além dos 7 diários), cobrindo o último mês.
   - Backups manuais **não entram na rotação automática de limpeza** — só são removidos por ação explícita da usuária, nunca automaticamente.
   - A limpeza dos backups diários/semanais excedentes é feita pelo próprio mecanismo de backup automático (ao criar um novo, remove o mais antigo que exceder a política acima) — isso não é uma exclusão "silenciosa" de dados de negócio, é rotação de um artefato de backup já superado por versões mais recentes, mas ainda assim deve ser logado (não silencioso) para transparência.
6. **Local de armazenamento (definitivo)**: pasta `08_Backups/` dentro de `Brazillian Nail/` (a pasta-mãe do projeto, fora de `brazillian-nail-app/`, que é código-fonte) — consistente com a organização de pastas já definida no `CLAUDE.md` raiz. Estrutura sugerida:
   ```
   Brazillian Nail/08_Backups/
   ├── diarios/
   │   ├── brazillian-nail-2026-07-18.db
   │   ├── brazillian-nail-2026-07-19.db
   │   └── ... (até 7 arquivos)
   ├── semanais/
   │   ├── brazillian-nail-2026-06-27.db
   │   └── ... (até 4 arquivos)
   └── manuais/
       └── brazillian-nail-2026-07-20-1430-manual.db
   ```
7. **Restauração**: documentar (não implementar ainda) um passo simples de "fechar app → substituir arquivo `.db` pelo backup escolhido → reabrir", sem necessidade de ferramentas externas.
8. **Export legível**: complementarmente, considerar export periódico em CSV/JSON dos dados financeiros (para a usuária conseguir abrir numa planilha mesmo sem o app), mas isso é um recurso de produto a decidir depois, não parte do mecanismo de backup em si.

---

## 11. Justificativas consolidadas das principais decisões

| Decisão | Justificativa |
|---|---|
| **SQLite + Prisma como arquitetura oficial** (não recomendação, decisão adotada) | App local, single-user, sem servidor; Prisma gera tipos TS que substituem os tipos manuais dos mocks e traz migrations versionadas — ver §13. |
| `id` textual tipo `PREFIXO-000001` (não só clientes — todas as entidades principais) em vez de UUID puro | Legibilidade para a profissional, que pode citar o ID manualmente (ex.: numa conversa por WhatsApp); mock já implementa essa convenção para clientes, agora estendida a todas as entidades — ver §8. |
| Contatos em tabela separada, não JSON embutido em `clientes` | Permite JOIN relacional em vez de parse de JSON; abre espaço para mais contatos no futuro sem migração. |
| Observações sempre em par PT/EN; `servicos.nome_pt`/`nome_en` com `nome_en` opcional | Requisito de negócio explícito (app bilíngue); `nome_en` fica opcional porque o catálogo pode ser cadastrado primeiro só em português e traduzido depois, sem bloquear o cadastro. |
| `atendimentos` e `pagamentos` como tabelas separadas (1:1) mas não fundidas | Separa "o que foi feito" (atendimento) de "o que foi cobrado/recebido" (pagamento) — permite, por exemplo, reabrir um atendimento sem tocar no registro financeiro já fechado, e mantém os relatórios financeiros isolados de mudanças operacionais. |
| Nenhuma exclusão física de cliente/atendimento/pagamento | Regra explícita do `CLAUDE.md`: "Nunca apague arquivos sem autorização expressa"; aplicada por analogia a registros de negócio. Cancelamento é sempre um estado (`cancelado`/`estornado`/`inativa`), nunca um `DELETE`. |
| Valores derivados (`valor_pendente`, `saldo_pendente`, `ultimo_atendimento`) **nunca** são colunas gravadas — sempre calculados por consulta/view | Decisão final: elimina "drift" entre o valor exibido e a soma real dos atendimentos/pagamentos — bug comum em apps financeiros quando um campo é atualizado em dois lugares. Ver §4.1 e §4.8 para as queries de referência. |
| Reengajamento de clientes inativas: **elegibilidade é calculada por consulta**, mas a **ação da profissional** (`reengajamento_status`/`adiado_ate`/`observacao`) é armazenada em `clientes` | A lista de "quem entrar em contato" muda todo dia e não deve ser armazenada; mas "o que a profissional decidiu fazer sobre a Fulana" é uma decisão humana que precisa persistir e não pode ser recalculada. Colunas ficam em `clientes` (não tabela separada) por ser sempre 1 estado atual por cliente, não um histórico — ver §4.1.1. |
| `mensagens_log` como tabela oficial desta fase, com `status_mensagem` distinguindo `preparada` de `enviada` | O app não tem integração real com WhatsApp/SMS para confirmar entrega — a distinção exige uma confirmação manual explícita da usuária (`confirmado_em`), nunca inferida automaticamente. |
| Minutos-desde-meia-noite (`inicio_min`/`fim_min`) para horários de agenda | Já usado no mock (`AgendaAppointment.inicioMin/fimMin`) e evita bugs de comparação de string tipo "9:00 AM" vs "11:00 AM". |
| Datas armazenadas em ISO, não `MM/DD/YYYY` | `MM/DD/YYYY` não ordena nem compara corretamente como string; formatação US fica só na camada de exibição (`date.ts`). |
| `configuracoes` como tabela singleton em vez de key-value genérico | O conjunto de configurações é pequeno, fixo e já tipado (`ConfiguracoesState`); EAV adicionaria complexidade sem benefício real hoje. |

---

## 12. Fluxo de migração dos dados mock para o banco

Este fluxo é **apenas descritivo** nesta fase (nenhum script será criado agora). A decisão final divide as tabelas em dois grupos com tratamento diferente:

### 12.1 Grupo A — migração automática (após validação)

`clientes`, `contatos`, `servicos`, `agendamentos` (agenda) e `lembretes`, além de `configuracoes`, **podem ser migrados automaticamente** depois de uma etapa de validação de schema/formato (não de reconciliação de negócio, que só se aplica ao Grupo B) — porque cada um destes tem exatamente **uma fonte mock** por entidade, sem visões concorrentes a conciliar:

1. **Preparação**: criar schema (tabelas + índices) num banco SQLite vazio, sem tocar nos arquivos mock.
2. **Migrar catálogo** (sem dependências): `servicos-mock.ts` → `servicos`. Como o mock só tem `Servico.nome` (sem PT/EN), a migração automática grava esse valor em `nome_pt` e deixa `nome_en = NULL` — a tradução é preenchida depois, manualmente, já que `nome_en` é opcional (§4.3). Gerar `id` novo no formato `SRV-000001`, preservando a ordem original do array como `numero_sequencial`.
3. **Migrar clientes**: `clientes-mock.ts` → `clientes` + `contatos`.
   - Para cada `Cliente`, gerar `numero_sequencial` a partir de `numeroClienteId(cliente.id)` (função já existe) e preservar o mesmo `id` (`CLI-000001` etc.) — este já está no formato final, não precisa ser convertido.
   - `contatoPrincipal`/`contatoSecundario` (quando não `null`) viram linhas em `contatos` com `papel = 'principal'`/`'secundario'`.
4. **Migrar agenda do dia**: `agenda-mock.ts` (`mockAgendaDoDia`) → `agendamentos`, com novo `id` no formato `AGD-000001`. Observação: `mock-data.ts` (`mockAgendaHoje`) é uma visão redundante e mais antiga da mesma agenda (usa `cliente: string` em vez de `clienteId`) — **não deve ser migrada como fonte separada**, é candidata a remoção/consolidação de código na próxima fase.
5. **Migrar lembretes**: `lembretes-mock.ts` → `lembretes`, com novo `id` no formato `LEM-000001`, associando `lembrete.clienteId` + `lembrete.horario` ao `agendamento_id` correspondente em `agendamentos` (join por cliente+data+horário, já que o mock não tem essa FK explícita ainda). Se algum lembrete não encontrar um agendamento correspondente por esse join, ele **não é inventado** — entra no relatório de não reconciliados (§12.3), mesmo estando no Grupo A.
6. **Migrar configurações**: `configuracoes-mock.ts` (`createConfiguracoesIniciais()`) → única linha em `configuracoes`.

### 12.2 Grupo B — reconciliação manual obrigatória

`atendimentos` e `pagamentos` **não são migrados automaticamente**. Motivo: **três mocks descrevem o mesmo evento de negócio de formas diferentes**, sem um identificador comum entre eles:
- `Cliente.historico[]` (`HistoricoAtendimento`) — visão "por cliente", IDs `hist-N-M`.
- `mockAtendimentos` (`Atendimento`) — visão "operacional", IDs `at-N`.
- `mockPagamentos` (`Pagamento`) — visão "financeira", IDs `pag-N`.

Esses três conjuntos hoje **não batem em contagem nem em identidade** (ex.: a cliente Ana Silva tem 4 itens em `historico[]`, mas `mockAtendimentos` só tem 4 registros no total, para 4 clientes diferentes). Regra explícita: **o processo de migração nunca deve inventar um relacionamento entre registros de fontes diferentes só porque cliente/data/valor parecem coincidir** — um "parecido" não é um "igual", e uma correspondência errada corromperia o histórico financeiro real de forma silenciosa.

Processo:
1. Rodar uma rotina de **matching determinístico** (mesma cliente + mesma data + mesmo horário + mesmo valor) entre os três conjuntos.
2. Todo registro que **casar com certeza** (match exato nos quatro campos) é migrado automaticamente para `atendimentos` (+ `atendimento_servicos`) e `pagamentos`, com novos IDs `ATD-000001`/`PAG-000001`.
3. Todo registro que **não casar** (sem correspondência, ou mais de uma correspondência possível) **não é migrado automaticamente** — é registrado no **relatório de não reconciliados**.
4. **Relatório de não reconciliados**: arquivo (ex.: `migracao-nao-reconciliados-YYYY-MM-DD.md` ou `.csv`) listando, por registro órfão: fonte de origem (`historico`/`mockAtendimentos`/`mockPagamentos`), ID original no mock, cliente, data, valores, e o motivo (sem correspondência / correspondência ambígua). Esse relatório é entregue à usuária/dev para decisão manual — cada linha é resolvida à mão antes de ser inserida no banco.
5. Só depois que todos os itens do relatório forem resolvidos manualmente (migrados manualmente ou descartados com justificativa) o Grupo B é considerado migrado.

### 12.3 Segurança do processo de migração (decisão final)

Independentemente do grupo, a migração real (quando for implementada) deve seguir esta sequência de segurança, sem exceção:

1. **Backup obrigatório antes de migrar**: gerar um backup completo (mesmo mecanismo do §10, rotulado como `pre-migracao`) antes de tocar no banco de destino. Sem esse backup, a migração não deve prosseguir.
2. **Modo de teste (dry-run) primeiro**: a migração deve rodar primeiro em modo simulado, escrevendo em um banco SQLite temporário/descartável (ou em transação revertida ao final — `ROLLBACK` explícito), **sem gravar no banco real**. Só após revisar o resultado do dry-run é que a migração real (gravando de fato) é executada.
3. **Contagem obrigatória em cada execução (dry-run e real)**: ao final, exibir um resumo por tabela com:
   - **Lidos**: total de registros encontrados na fonte mock.
   - **Migrados**: quantos foram efetivamente inseridos (Grupo A automaticamente, Grupo B só os casos com match exato).
   - **Ignorados**: registros propositalmente não migrados (ex.: serviço `inativo` de teste, cliente de teste marcada como tal) — sempre com o motivo explícito, nunca "ignorado" silenciosamente.
   - **Com conflito**: registros do Grupo B que caíram no relatório de não reconciliados, por não terem correspondência clara entre as fontes.
4. Somente depois da validação pós-migração (ver abaixo) o dry-run é promovido a execução real seguindo os mesmos passos 1–3.

### 12.4 Validação pós-migração e congelamento dos mocks

8. **Validação pós-migração**: conferir, para cada cliente, que a consulta de `valor_pendente` (§4.1) bate com o `valorPendente` do mock, e que a contagem de atendimentos por cliente é consistente entre as três fontes antes de considerar o mock "aposentado".
9. **Congelamento dos mocks**: somente depois da validação, os arquivos `*-mock.ts` podem ser marcados como legado/seed de desenvolvimento (não apagados sem autorização, conforme `CLAUDE.md`).

---

## 13. Tecnologia — decisão final

**Decisão adotada (não mais uma recomendação em aberto): SQLite + Prisma é a arquitetura oficial da versão local do Brazillian Nail.** Prisma usa o provider `sqlite` sobre o arquivo único do banco.

Comparação (mantida como justificativa da escolha):

| Critério | SQLite (arquivo único) | Postgres/MySQL (servidor) | IndexedDB/localStorage (browser) |
|---|---|---|---|
| Requer instalar/rodar servidor | Não | Sim | Não |
| Adequado a app local single-user | Sim | Excessivo | Sim, mas... |
| Suporta SQL relacional completo (JOIN, FK, transações) | Sim | Sim | Não (ou muito limitado) |
| Fácil de fazer backup (regra do `CLAUDE.md`) | Sim — copiar 1 arquivo | Precisa `pg_dump`/ferramentas | Complicado, preso ao browser/perfil |
| Portável entre ambientes (Next.js local, futura versão desktop) | Sim | Depende de infra externa | Não sobrevive a troca de navegador/dispositivo |

**Por que Prisma (e não SQL cru/`better-sqlite3` puro)**, para este projeto especificamente:
- Gera tipos TypeScript a partir do schema, que podem substituir quase diretamente os tipos já escritos à mão em `*-mock.ts` (`Cliente`, `Atendimento`, `Servico`, etc.), reduzindo retrabalho na próxima fase.
- Migrations versionadas (`prisma migrate`) dão um histórico de mudanças de schema, importante à medida que o app evolui — inclusive para acompanhar as tabelas novas decididas neste documento (`mensagens_log`).
- Enums do Prisma mapeiam bem para os `status`/`FormaPagamento`/etc. já definidos como union types no TypeScript atual.

**Descartado neste caso**: Postgres/MySQL (infraestrutura desnecessária para single-user local), IndexedDB (sem suporte real a relacionamento/FK e mais difícil de fazer backup como arquivo simples), `better-sqlite3` puro sem ORM (exigiria manter os tipos TS manualmente em paralelo ao schema, com risco de divergência).

---

## 14. Resumo final (para leitura rápida)

### Decisões consolidadas nesta revisão
1. `valor_pendente` e `saldo_pendente` (e `ultimo_atendimento`) **nunca são colunas gravadas** — sempre calculados por consulta/view (§4.1, §4.8).
2. `servicos` ganhou `nome_pt` (obrigatório) e `nome_en` (opcional inicialmente) (§4.3).
3. `mensagens_log` é tabela oficial desta fase, com `status_mensagem` (`preparada`/`enviada`/`cancelada`) e `confirmado_em` distinguindo texto preparado de envio confirmado manualmente pela usuária (§4.10).
4. SQLite + Prisma é a arquitetura oficial (não mais recomendação em aberto) (§13).
5. Backup automático diário, retenção de 7 diários + 4 semanais, backup manual sob demanda, local definido em `Brazillian Nail/08_Backups/` (§10).
6. Migração dividida em Grupo A (`clientes`, `contatos`, `servicos`, `agendamentos`, `lembretes`, `configuracoes` — automática após validação) e Grupo B (`atendimentos`, `pagamentos` — reconciliação manual obrigatória, sem inventar relacionamentos, com relatório de não reconciliados) (§12.1–12.2).
7. Todos os prefixos de ID permanentes definidos: `CLI`, `SRV`, `AGD`, `ATD`, `PAG`, `LEM`, `MSG` (§8).
8. Segurança da migração: backup obrigatório antes, execução em modo dry-run primeiro, contagem de lidos/migrados/ignorados/com conflito em toda execução (§12.3).
9. Reengajamento de clientes inativas (requisito futuro): 4 colunas novas em `clientes` (`reengajamento_status`, `reengajamento_atualizado_em`, `reengajamento_adiado_ate`, `reengajamento_observacao`) guardam a decisão da profissional (contatada/adiada/ignorada); a lista de elegíveis (ativa, sem atendimento há +30 dias, sem próximo agendamento) continua sendo sempre calculada por consulta, nunca armazenada (§4.1.1).

### Estrutura final das tabelas
10 tabelas relacionais em SQLite: `clientes`, `contatos`, `servicos`, `agendamentos`, `atendimentos`, `atendimento_servicos`, `lembretes`, `pagamentos`, `configuracoes` (singleton), `mensagens_log`. `atendimentos` + `pagamentos` substituem a tripla duplicada hoje existente no mock (`Cliente.historico`, `mockAtendimentos`, `mockPagamentos`) por uma única fonte de verdade. Nenhum valor financeiro pendente é armazenado diretamente — tudo é derivado por consulta.

### Estratégia de migração (resumo)
Grupo A migra automaticamente após validação de schema/formato. Grupo B (`atendimentos`/`pagamentos`) exige matching determinístico entre as três fontes mock e gera um relatório de não reconciliados para decisão humana — nenhuma correspondência ambígua é assumida automaticamente. Toda execução (dry-run ou real) passa por: backup prévio → dry-run → contagem de lidos/migrados/ignorados/com conflito → só então execução real.

### Riscos que ainda permanecem
1. **Volume de reconciliação manual do Grupo B é desconhecido até a execução do dry-run** — só ao rodar o matching determinístico sobre os dados mock reais (ou futuros dados de produção) será possível saber quantos registros cairão no relatório de não reconciliados; pode ser um trabalho manual não-trivial.
2. **Concorrência de escrita em SQLite**: single-user hoje, mas se o app crescer para acesso simultâneo (ex.: tablet + celular), SQLite sozinho não lida bem com múltiplos escritores — reavaliar tecnologia nesse cenário (fora do escopo desta fase).
3. **Falha silenciosa do backup automático diário**: se o mecanismo de backup falhar (disco cheio, permissão, app não aberto num dia) sem alertar a usuária, a política de retenção não protege contra a ausência do próprio backup — a implementação deve incluir alguma indicação visível de "último backup: X dias atrás".
4. **Confirmação manual de envio em `mensagens_log` depende de disciplina da usuária**: como o app não confirma entrega automaticamente, se a usuária esquecer de marcar "enviada", o log ficará com registros presos em `preparada` indefinidamente — não é um erro de dados, mas afeta a utilidade do relatório de auditoria.
5. **`nome_en` opcional em `servicos`** cria uma janela em que a UI em inglês exibe apenas o fallback em português até a tradução ser cadastrada — aceitável como decisão de produto, mas deve ficar visualmente claro (não silencioso) que a tradução está pendente.

### Pronto para aprovação final?
Sim — todas as 8 decisões solicitadas foram incorporadas de forma definitiva (não há mais itens em aberto do tipo "a decidir depois" relacionados a elas). O documento pode ser aprovado como base de design; os riscos remanescentes listados acima são inerentes à execução futura (dry-run, backup em produção, disciplina de uso), não lacunas de design pendentes de decisão.
