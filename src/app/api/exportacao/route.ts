import { NextRequest, NextResponse } from "next/server";
import { isExportDataset, obterBackupCompleto, obterCsv } from "@/lib/exportacao";
import { requireRosangela } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

function dataArquivo() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    await requireRosangela();
    const formato = request.nextUrl.searchParams.get("formato") ?? "json";

    if (formato === "json") {
      const backup = await obterBackupCompleto();
      return new NextResponse(JSON.stringify(backup, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="brazillian-nail-backup-${dataArquivo()}.json"`,
          "Cache-Control": "private, no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const dataset = request.nextUrl.searchParams.get("dados");
    if (formato !== "csv" || !isExportDataset(dataset)) {
      return NextResponse.json({ erro: "Formato de exportação inválido." }, { status: 400 });
    }

    const csv = await obterCsv(dataset);
    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="brazillian-nail-${dataset}-${dataArquivo()}.csv"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ erro: "Acesso não autorizado." }, { status: 401 });
  }
}
