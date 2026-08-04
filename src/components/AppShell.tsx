import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <a
        href="#conteudo-principal"
        className="sr-only z-[100] rounded-lg bg-brand px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Pular para o conteúdo
      </a>
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header />
        <main id="conteudo-principal" className="flex-1 px-3 pb-24 pt-3 sm:px-6 sm:pt-6 lg:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
