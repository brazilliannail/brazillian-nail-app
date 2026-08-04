# Rotina de manutenção

## Toda semana

- Conferir se GitHub Actions e CodeQL estão verdes.
- Revisar propostas do Dependabot; nunca mesclar atualização que falhe nos testes.
- Baixar **Configurações → Backup e dados → Backup completo (JSON)** e guardar em pasta privada.
- Conferir se o último deployment da Vercel está `Ready`.

## Todo mês

- Testar login, logout, clientes, serviços, agenda, atendimento, pagamento, lembrete e exportação.
- Conferir usuários e sessões no Neon Auth.
- Conferir **Backup & Restore** no Neon.
- Executar `npm audit`, tipos, lint, testes e build.
- Verificar o aplicativo no iPad em orientação horizontal e vertical.

## Regras permanentes

- Não guardar credenciais, exportações ou dados de clientes no GitHub.
- Não forçar atualização de autenticação sem testar todo o login.
- Não restaurar banco, excluir dados ou alterar regra financeira sem autorização específica.
- Dependabot apenas propõe atualizações patch/minor compatíveis; mudanças maiores são ignoradas. A publicação continua exigindo testes aprovados.
