import { AuthView } from "@neondatabase/auth-ui";
import { authViewPaths, type AuthViewPath } from "@neondatabase/auth-ui/server";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;

  if (!Object.values(authViewPaths).includes(path as AuthViewPath)) {
    notFound();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-lg font-bold text-white">
            BN
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Brazillian Nail</h1>
          <p className="mt-1 text-sm text-foreground/60">Acesso exclusivo da Rosangela</p>
        </div>
        <AuthView path={path as AuthViewPath} />
      </section>
    </main>
  );
}
