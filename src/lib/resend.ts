import { Resend } from "resend";

export const NOTIFICATION_FROM = "Sunflow Website <onboarding@resend.dev>";
export const NOTIFICATION_TO = "admin@sunflowenergysolutions.com.au";

let client: Resend | null = null;

export function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}
