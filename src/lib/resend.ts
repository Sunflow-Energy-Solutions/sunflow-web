import { Resend } from "resend";

// Sending as our own domain to our own Microsoft 365 mailbox gets filtered as spoofing
// (DMARC p=quarantine), so notifications go out from Resend's address until the tenant
// has an allow rule for it.
export const NOTIFICATION_FROM = "Sunflow Website <onboarding@resend.dev>";
export const NOTIFICATION_TO = "admin@sunflowenergysolutions.com.au";

let client: Resend | null = null;

function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

type Notification = {
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: { filename: string; content: string }[];
};

// The Resend SDK resolves with { error } instead of throwing when the API rejects a send.
export async function sendNotification(notification: Notification): Promise<void> {
  const { error } = await getResend().emails.send({
    from: NOTIFICATION_FROM,
    to: NOTIFICATION_TO,
    ...notification,
  });

  if (error) {
    throw new Error(`Resend rejected the email (${error.name}): ${error.message}`);
  }
}
