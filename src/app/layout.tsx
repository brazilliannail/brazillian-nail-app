import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import { FinancialVisibilityProvider } from "@/components/FinancialVisibilityProvider";
import { ClientesProvider } from "@/components/ClientesProvider";
import { ServicosProvider } from "@/components/ServicosProvider";
import { AgendaProvider } from "@/components/AgendaProvider";
import { AtendimentosProvider } from "@/components/AtendimentosProvider";
import { FinanceiroProvider } from "@/components/FinanceiroProvider";
import { DespesasProvider } from "@/components/DespesasProvider";
import { ConfiguracoesProvider } from "@/components/ConfiguracoesProvider";
import { LembretesProvider } from "@/components/LembretesProvider";
import { AppShell } from "@/components/AppShell";
import { getClientes } from "@/lib/clientes-repo";
import { getServicos } from "@/lib/servicos-repo";
import { getAgendamentos } from "@/lib/agenda-repo";
import { getAtendimentos } from "@/lib/atendimentos-repo";
import { getLancamentosCaixa } from "@/lib/financeiro-repo";
import { getDespesas, getLancamentosDespesa } from "@/lib/despesas-repo";
import { getConfiguracoes } from "@/lib/configuracoes-repo";
import { getLembretesAmanha } from "@/lib/lembretes-repo";
import { AuthProvider } from "@/components/AuthProvider";
import { auth } from "@/lib/auth/server";
import { isRosangela } from "@/lib/auth/authorization";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Brazillian Nail",
  description: "Aplicativo de gestão da Brazillian Nail",
};

// getClientes() lê o SQLite a cada requisição; sem isso, `next build` congela
// a lista de clientes como HTML estático do momento do build.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    return (
      <html lang="pt" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
        <body className="min-h-full">
          <AuthProvider>{children}</AuthProvider>
        </body>
      </html>
    );
  }

  if (!isRosangela(session.user.email)) {
    return (
      <html lang="pt" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
        <body className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold">Acesso não autorizado</h1>
            <p className="mt-2 text-sm text-foreground/60">
              Este aplicativo está restrito à conta da Rosangela.
            </p>
          </div>
        </body>
      </html>
    );
  }

  // configuracoesIniciais precisa vir antes de getLembretesAmanha: a geração automática do dia
  // respeita `lembretes.ativarLembretesDiaAnterior`, então as duas consultas não podem ser
  // paralelizadas no mesmo Promise.all.
  const configuracoesIniciais = await getConfiguracoes();

  const [
    clientesIniciais,
    servicosIniciais,
    agendamentosIniciais,
    atendimentosIniciais,
    lancamentosCaixaIniciais,
    despesasIniciais,
    lancamentosDespesaIniciais,
    lembretesIniciais,
  ] = await Promise.all([
    getClientes(),
    getServicos(),
    getAgendamentos(),
    getAtendimentos(),
    getLancamentosCaixa(),
    getDespesas(),
    getLancamentosDespesa(),
    getLembretesAmanha(configuracoesIniciais.lembretes.ativarLembretesDiaAnterior),
  ]);

  return (
    <html
      lang="pt"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
        <LanguageProvider>
          <ClientesProvider clientesIniciais={clientesIniciais}>
            <ServicosProvider servicosIniciais={servicosIniciais}>
              <AgendaProvider agendamentosIniciais={agendamentosIniciais}>
                <AtendimentosProvider atendimentosIniciais={atendimentosIniciais}>
                  <FinanceiroProvider lancamentosCaixaIniciais={lancamentosCaixaIniciais}>
                    <DespesasProvider despesasIniciais={despesasIniciais} lancamentosDespesaIniciais={lancamentosDespesaIniciais}>
                      <ConfiguracoesProvider configuracoesIniciais={configuracoesIniciais}>
                        <LembretesProvider lembretesIniciais={lembretesIniciais}>
                          <FinancialVisibilityProvider>
                            <AppShell>{children}</AppShell>
                          </FinancialVisibilityProvider>
                        </LembretesProvider>
                      </ConfiguracoesProvider>
                    </DespesasProvider>
                  </FinanceiroProvider>
                </AtendimentosProvider>
              </AgendaProvider>
            </ServicosProvider>
          </ClientesProvider>
        </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
