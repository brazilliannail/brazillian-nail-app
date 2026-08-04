# Backup e recuperação

> O formato do arquivo é verificado automaticamente pelos testes. Essa inspeção não grava dados e não autoriza uma restauração direta em produção.

## Proteções disponíveis

O aplicativo utiliza duas camadas gratuitas:

1. **Recuperação nativa do Neon:** o provedor registra o histórico do banco e oferece recuperação conforme os limites atuais do plano Free. A conta também pode manter um snapshot manual no painel **Backup & Restore**.
2. **Exportação manual do aplicativo:** em **Configurações → Backup e dados**, a Rosangela pode baixar uma cópia completa em JSON e relatórios CSV.

Essa combinação não depende de arquivos públicos no GitHub. Backups com informações de clientes nunca devem ser anexados a commits, issues ou execuções do GitHub Actions.

## Rotina recomendada

- Uma vez por semana, baixar **Backup completo (JSON)** no iPad ou Mac.
- Salvar o arquivo em uma pasta privada do iCloud Drive ou Google Drive da Rosangela.
- Manter pelo menos o arquivo mais recente e um arquivo do mês anterior.
- Não enviar o arquivo por mensagem ou e-mail, pois ele pode conter dados pessoais.

Os CSVs são destinados à consulta em planilhas. O JSON é a cópia técnica completa dos dados operacionais e das configurações, mas não contém senha, código de acesso, sessão ou credencial do banco.

## Recuperação

Se ocorrer uma exclusão ou alteração acidental:

1. parar de inserir ou alterar dados;
2. registrar aproximadamente quando o problema aconteceu;
3. abrir **Backup & Restore** no Neon para visualizar um ponto anterior;
4. não confirmar uma restauração sem conferir a prévia;
5. se for necessário usar o arquivo JSON, pedir suporte técnico para uma importação controlada.

Uma restauração altera o banco de produção e pode substituir informações mais recentes. Por isso ela nunca deve ser executada automaticamente nem sem autorização específica.
