# Certificação preventiva do aplicativo

Última revisão: 4 de agosto de 2026.

## Escopo

Login exclusivo; clientes; serviços; agenda; atendimentos; pagamentos e estornos; lembretes manuais; configurações; exportações; proteção de rotas; estados de carregamento, endereço inexistente e falha inesperada.

Os testes usam PostgreSQL temporário em memória e nunca recebem a URL do Neon de produção. A validação de backup apenas lê a estrutura exportada: não existe importação automática nem exclusão.

## Backup certificado

A inspeção preventiva confirma formato, versão, dez coleções obrigatórias, identificadores não repetidos e vínculos essenciais entre clientes, contatos, agenda, atendimentos, pagamentos e lembretes. Uma restauração real continua exigindo backup adicional, ensaio em banco descartável e autorização específica.

## Automação

- Cada alteração: tipos, análise de código e testes.
- Diariamente: certificação noturna com tipos, análise, testes isolados e build.
- CodeQL: análise automática de vulnerabilidades.
- Dependabot: somente atualizações compatíveis; versões principais exigem revisão manual.

## Pendências deliberadas

- WhatsApp abre a mensagem para envio manual; envio automático não está ativo.
- Despesas estão somente projetadas em `EXPENSES_DESIGN.md`.
- Logo e cores definitivas ainda serão configurados.
- Neon Auth permanece beta; o risco é reduzido pelo login exclusivo e autorização no servidor.
- Restauração nunca deve ocorrer diretamente em produção sem ensaio.

Uma entrega só é aprovada quando tipos, análise, testes, build, GitHub Actions, CodeQL e Vercel terminarem com sucesso e o repositório estiver limpo.
