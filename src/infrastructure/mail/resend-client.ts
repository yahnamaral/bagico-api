import { Resend } from "resend";

const DEFAULT_FROM_EMAIL = 'Bagico <noreply@bagico.com.br>';

let resendClient: Resend | null = null;

export function getFromEmail(): string {
  return process.env.EMAIL_FROM?.trim() || DEFAULT_FROM_EMAIL;
}

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production";
}
