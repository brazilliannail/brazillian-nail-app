-- `pagamentos.forma_pagamento` passa a aceitar NULL: o dinheiro pode ser registrado como
-- recebido antes de a forma de pagamento ser anotada (mesma tolerância que já existia no
-- campo equivalente de `atendimentos` antes desta migration).
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_pagamentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "atendimento_id" TEXT NOT NULL,
    "natureza" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "data_pagamento" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "forma_pagamento" TEXT,
    "observacoes_pt" TEXT NOT NULL DEFAULT '',
    "observacoes_en" TEXT NOT NULL DEFAULT '',
    "estorna_pagamento_id" TEXT,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pagamentos_atendimento_id_fkey" FOREIGN KEY ("atendimento_id") REFERENCES "atendimentos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pagamentos_estorna_pagamento_id_fkey" FOREIGN KEY ("estorna_pagamento_id") REFERENCES "pagamentos" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_pagamentos" ("id", "atendimento_id", "natureza", "tipo", "data_pagamento", "valor", "forma_pagamento", "observacoes_pt", "observacoes_en", "estorna_pagamento_id", "criado_em")
SELECT "id", "atendimento_id", "natureza", "tipo", "data_pagamento", "valor", "forma_pagamento", "observacoes_pt", "observacoes_en", "estorna_pagamento_id", "criado_em" FROM "pagamentos";
DROP TABLE "pagamentos";
ALTER TABLE "new_pagamentos" RENAME TO "pagamentos";
CREATE INDEX "pagamentos_atendimento_id_natureza_idx" ON "pagamentos"("atendimento_id", "natureza");
CREATE INDEX "pagamentos_data_pagamento_idx" ON "pagamentos"("data_pagamento");
CREATE INDEX "pagamentos_forma_pagamento_idx" ON "pagamentos"("forma_pagamento");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
