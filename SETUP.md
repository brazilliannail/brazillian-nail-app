# Configuração do projeto Brazillian Nail

Este documento reúne as informações básicas para trabalhar com segurança no repositório do aplicativo Brazillian Nail e para configurar outro Mac quando necessário.

## Informações do repositório

- **Conta do GitHub:** `brazilliannail`
- **Repositório:** `brazillian-nail-app`
- **Remote principal:** `origin`
- **Branch principal:** `main`
- **GitHub CLI (`gh`):** configurado e autenticado
- **Homebrew:** instalado

## Verificações importantes

Execute estes comandos dentro da pasta do projeto:

```bash
git status
gh auth status
git remote -v
```

Eles servem para:

- `git status`: mostrar a branch atual e os arquivos alterados, novos ou preparados para commit.
- `gh auth status`: confirmar qual conta do GitHub está autenticada. A conta esperada é `brazilliannail`.
- `git remote -v`: confirmar o endereço usado para baixar e enviar alterações. O `origin` esperado é `https://github.com/brazilliannail/brazillian-nail-app.git`.

## Fluxo seguro de commit e push

Antes de preparar qualquer alteração, confira o estado do projeto:

```bash
git status
```

Revise os arquivos alterados e adicione somente os que devem entrar no commit. Para adicionar arquivos específicos:

```bash
git add caminho/do/arquivo
```

Confira novamente o que será incluído:

```bash
git status
git diff --staged
```

Crie o commit com uma mensagem clara:

```bash
git commit -m "Descreva claramente a alteração"
```

Antes de enviar, confirme a autenticação, o remote e a branch:

```bash
gh auth status
git remote -v
git branch --show-current
```

O envio para o GitHub, quando autorizado, é feito com:

```bash
git push origin main
```

> **Atenção:** nunca execute `git push` sem autorização expressa do usuário. O push altera o repositório remoto e deve acontecer somente depois que o usuário revisar e aprovar o envio.

## Configuração básica em outro Mac

1. Instale as ferramentas de linha de comando do macOS:

   ```bash
   xcode-select --install
   ```

2. Instale o Homebrew seguindo as instruções oficiais em <https://brew.sh/>.

3. Instale o GitHub CLI:

   ```bash
   brew install gh
   ```

4. Autentique a conta correta do GitHub:

   ```bash
   gh auth login
   ```

   Selecione `GitHub.com`, use HTTPS e confirme ao final que a conta autenticada é `brazilliannail`:

   ```bash
   gh auth status
   ```

5. Configure a identidade do Git caso ela ainda não esteja definida:

   ```bash
   git config --global user.name "Seu nome"
   git config --global user.email "seu-email-do-github@exemplo.com"
   ```

6. Clone o repositório e entre na pasta:

   ```bash
   git clone https://github.com/brazilliannail/brazillian-nail-app.git
   cd brazillian-nail-app
   ```

7. Confirme que tudo está correto:

   ```bash
   git status
   gh auth status
   git remote -v
   git branch --show-current
   ```

O resultado esperado é a conta `brazilliannail`, o remote `origin` apontando para `brazillian-nail-app` e a branch `main`.

## Serviços atuais

- **Vercel:** hospeda o aplicativo em produção no plano Hobby.
- **Neon PostgreSQL:** armazena os dados no plano Free e fornece a autenticação por código de e-mail.
- **GitHub Actions:** executa tipos, lint e testes a cada push para `main`; uma certificação noturna também confirma o build.

As variáveis privadas de Vercel, Neon e autenticação não devem ser copiadas para documentação, commits, mensagens ou screenshots. Em outro Mac, solicite acesso autorizado e crie um `.env.local`; nunca reutilize valores publicados ou salve esse arquivo no Git.

## Backup

A exportação manual fica em **Configurações → Backup e dados**. Os arquivos baixados contêm dados pessoais e devem ser guardados em pasta privada. Para a rotina e recuperação, consulte `BACKUP_RESTORE.md`.
