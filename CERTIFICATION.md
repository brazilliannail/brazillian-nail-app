# Certificação preventiva do aplicativo

Última revisão: 4 de agosto de 2026.

## Escopo

Login exclusivo; clientes; serviços; agenda; atendimentos; pagamentos e estornos; despesas e saldo operacional; lembretes manuais; configurações; exportações; proteção de rotas; estados de carregamento, endereço inexistente e falha inesperada.

Os testes usam PostgreSQL temporário em memória e nunca recebem a URL do Neon de produção. A validação de backup apenas lê a estrutura exportada: não existe importação automática nem exclusão.

## Backup certificado

A inspeção preventiva confirma formato, versão, coleções obrigatórias, identificadores não repetidos e vínculos essenciais entre clientes, contatos, agenda, atendimentos, pagamentos, lembretes e (a partir da versão 2 do backup) despesas/lançamentos de despesa. Backups versão 1 (anteriores ao módulo Despesas) continuam válidos sem as coleções novas. Uma restauração real continua exigindo backup adicional, ensaio em banco descartável e autorização específica.

## Despesas e saldo operacional

Módulo implementado conforme `EXPENSES_DESIGN.md`: despesas avulsas, recorrentes semanais e parceladas, sem controle de estoque. Valores armazenados em centavos inteiros; lançamentos pagos são imutáveis (correção só por novo lançamento de ajuste rastreável); nenhum registro é excluído pela interface, só marcado como cancelado. Chaves estrangeiras entre `despesas` e `lancamentos_despesa` usam `RESTRICT` (não `CASCADE`/`SET NULL`), e um CHECK no próprio banco garante que lançamentos comuns tenham valor positivo e ajustes nasçam sempre `pago`. O Financeiro mostra separadamente receitas recebidas, despesas pagas, despesas previstas e o saldo operacional resultante — nunca chamado de lucro contábil. Gorjetas continuam fora desse saldo.

## Automação

- Cada alteração: tipos, análise de código e testes.
- Diariamente: certificação noturna com tipos, análise, testes isolados e build.
- CodeQL: análise automática de vulnerabilidades.
- Dependabot: somente atualizações compatíveis; versões principais exigem revisão manual.

## Pendências deliberadas

- WhatsApp abre a mensagem para envio manual; envio automático não está ativo.
- Logo e cores definitivas ainda serão configurados.
- Neon Auth permanece beta; o risco é reduzido pelo login exclusivo e autorização no servidor.
- Restauração nunca deve ocorrer diretamente em produção sem ensaio.

Uma entrega só é aprovada quando tipos, análise, testes, build, GitHub Actions, CodeQL e Vercel terminarem com sucesso e o repositório estiver limpo.
