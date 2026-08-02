import { prisma } from "@/lib/db";
import { getConfiguracoes } from "@/lib/configuracoes-repo";

// Garante que os testes nunca dependam do dia da semana em que a suíte é executada: sem isso,
// "amanhã" (usado por tests/helpers/lembretes-fixtures.ts, testando getLembretesAmanha) cairia
// num domingo em ~1 a cada 7 execuções e seria rejeitado por agenda-actions.ts (dias de
// funcionamento fora do expediente — PROJECT_STATUS.md §13 item 3), um teste intermitente sem
// relação alguma com o que está sendo testado. Habilita os 7 dias só no banco de teste; o padrão
// de produção (`createConfiguracoesIniciais`, seg–sáb) não é alterado.
await getConfiguracoes(); // garante que a linha singleton (id 1) existe antes do update abaixo
await prisma.configuracao.update({
  where: { id: 1 },
  data: { agendaDiasFuncionamento: JSON.stringify(["dom", "seg", "ter", "qua", "qui", "sex", "sab"]) },
});
