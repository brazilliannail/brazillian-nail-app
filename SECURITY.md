# Segurança e manutenção

## Controles ativos

- acesso somente por código enviado ao e-mail autorizado da Rosangela;
- cadastro público, senha, OAuth, organizações e passkeys desativados;
- confirmação do e-mail autorizado no layout e em todas as operações do servidor;
- páginas privadas protegidas pelo middleware de autenticação;
- exportações autenticadas, sem cache e sem credenciais;
- proteção contra fórmulas maliciosas nos CSVs;
- cabeçalhos contra incorporação em iframe, detecção incorreta de conteúdo e acesso desnecessário a câmera, microfone e localização;
- testes automáticos no GitHub sem acesso ao banco de produção.

## Dependências

Em 2026-08-04, Next.js, Prisma, Tailwind, PGlite e pacotes de tipos foram atualizados para versões compatíveis corrigidas. O `npm audit` caiu de 13 alertas para 4.

Os alertas restantes são transitivos de `@neondatabase/auth` e `@neondatabase/auth-ui`, ainda publicados como beta. O npm sugere uma correção forçada sem versão de destino válida, que poderia remover ou quebrar a autenticação. Ela não deve ser aplicada automaticamente.

As funções citadas nos alertas — OAuth/OIDC, organizações, passkeys, cadastro público e exclusão administrativa de usuários — não são habilitadas neste aplicativo. O único fluxo utilizado é código por e-mail para uma conta previamente criada, seguido de uma segunda verificação do e-mail permitido pelo próprio aplicativo.

Revisar novamente quando o Neon publicar uma nova versão de Auth/Auth UI. Antes de atualizar, testar login, envio e confirmação do código, logout, acesso negado a outro e-mail e todas as ações protegidas.

## Comunicação de incidente

Se houver acesso desconhecido, perda do dispositivo ou comportamento inesperado:

1. interromper o uso do aplicativo;
2. proteger primeiro o Gmail da Rosangela e encerrar sessões desconhecidas;
3. verificar sessões e usuários no Neon Auth;
4. verificar logs e deployments na Vercel;
5. não restaurar ou apagar dados sem uma autorização específica e uma cópia de segurança.
