"use client";

import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import { authClient } from "@/lib/auth/client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <NeonAuthUIProvider
      authClient={authClient}
      redirectTo="/"
      emailOTP
      credentials={{ forgotPassword: true }}
      defaultTheme="light"
    >
      {children}
    </NeonAuthUIProvider>
  );
}
