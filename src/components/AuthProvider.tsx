"use client";

import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import { authClient } from "@/lib/auth/client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <NeonAuthUIProvider
      authClient={authClient}
      redirectTo="/"
      emailOTP
      credentials={false}
      signUp={false}
      defaultTheme="light"
      localization={{
        SIGN_IN: "Entrar",
        SIGN_IN_ACTION: "Entrar",
        SIGN_IN_DESCRIPTION: "Digite seu e-mail para receber o código de acesso",
        EMAIL: "E-mail",
        EMAIL_PLACEHOLDER: "seu-email@exemplo.com",
        EMAIL_REQUIRED: "Informe o endereço de e-mail",
        EMAIL_INSTRUCTIONS: "Informe um endereço de e-mail válido",
        EMAIL_OTP: "Código por e-mail",
        EMAIL_OTP_SEND_ACTION: "Enviar código",
        EMAIL_OTP_VERIFY_ACTION: "Confirmar código",
        EMAIL_OTP_DESCRIPTION: "Digite seu e-mail para receber um código",
        EMAIL_OTP_VERIFICATION_SENT: "Enviamos o código para o seu e-mail.",
        ONE_TIME_PASSWORD: "Código de acesso",
        RESEND_CODE: "Reenviar código",
        REQUEST_FAILED: "Não foi possível concluir. Tente novamente.",
        SIGN_OUT: "Sair",
        GO_BACK: "Voltar",
      }}
    >
      {children}
    </NeonAuthUIProvider>
  );
}
