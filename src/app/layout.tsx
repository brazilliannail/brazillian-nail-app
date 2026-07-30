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
import { AppShell } from "@/components/AppShell";
import { getClientes } from "@/lib/clientes-repo";
import { getServicos } from "@/lib/servicos-repo";
import { getAgendamentos } from "@/lib/agenda-repo";
import { getAtendimentos } from "@/lib/atendimentos-repo";
import { getLancamentosCaixa } from "@/lib/financeiro-repo";

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
  const [clientesIniciais, servicosIniciais, agendamentosIniciais, atendimentosIniciais, lancamentosCaixaIniciais] = await Promise.all([
    getClientes(),
    getServicos(),
    getAgendamentos(),
    getAtendimentos(),
    getLancamentosCaixa(),
  ]);

  return (
    <html
      lang="pt"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <ClientesProvider clientesIniciais={clientesIniciais}>
            <ServicosProvider servicosIniciais={servicosIniciais}>
              <AgendaProvider agendamentosIniciais={agendamentosIniciais}>
                <AtendimentosProvider atendimentosIniciais={atendimentosIniciais}>
                  <FinanceiroProvider lancamentosCaixaIniciais={lancamentosCaixaIniciais}>
                    <FinancialVisibilityProvider>
                      <AppShell>{children}</AppShell>
                    </FinancialVisibilityProvider>
                  </FinanceiroProvider>
                </AtendimentosProvider>
              </AgendaProvider>
            </ServicosProvider>
          </ClientesProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
