# Brazillian Nail

Aplicativo privado para a Rosangela administrar clientes, serviços, agenda, atendimentos, financeiro e lembretes do Brazillian Nail.

## Produção

- Aplicativo: <https://brazillian-nail-app.vercel.app>
- Hospedagem: Vercel (plano Hobby)
- Banco de dados: Neon PostgreSQL (plano Free)
- Acesso: código enviado ao e-mail autorizado da Rosangela

Não existem cadastro público nem acesso por senha. As páginas e operações no servidor confirmam a sessão e o e-mail autorizado antes de acessar os dados.

## Desenvolvimento local

Requisitos: Node.js 24, npm e acesso autorizado às variáveis privadas do projeto.

```bash
npm ci
npm run dev
```

As credenciais ficam somente em `.env.local`, que nunca deve ser enviado ao GitHub.

## Verificações

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

O workflow em `.github/workflows/ci.yml` executa tipos, lint e testes automaticamente em pushes e pull requests para `main`, sem usar o banco de produção.

## Backup e exportação

Na tela **Configurações → Backup e dados**, a usuária autenticada pode baixar:

- backup completo em JSON;
- clientes, serviços, agenda, atendimentos e financeiro em CSV.

Os downloads nunca incluem credenciais ou tabelas internas de autenticação. Como contêm dados pessoais, devem ficar em pasta privada. O Neon também fornece sua própria recuperação do banco. Veja [BACKUP_RESTORE.md](BACKUP_RESTORE.md).

## Publicação

O repositório usa `main` e o remote `origin`. Cada push autorizado para `main` inicia um deployment na Vercel. Consulte [SETUP.md](SETUP.md) antes de fazer commit ou push.
