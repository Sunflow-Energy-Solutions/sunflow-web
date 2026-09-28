import { NextResponse } from "next/server";
import { getResend, NOTIFICATION_FROM, NOTIFICATION_TO } from "@/lib/resend";
import { renderEmailRows } from "@/lib/email-templates";

const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024; // stay under Vercel's serverless request body limit

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, phone, email, address, services, notes, attachment } = body as Record<string, unknown>;

  if (
    typeof name !== "string" || !name.trim() ||
    typeof email !== "string" || !email.trim() ||
    typeof phone !== "string" || !phone.trim() ||
    typeof address !== "string" || !address.trim()
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const serviceList = Array.isArray(services) ? services.filter((s) => typeof s === "string").join(", ") : "";

  const attachments: { filename: string; content: string }[] = [];
  let attachmentNote = "";

  if (attachment && typeof attachment === "object") {
    const { filename, base64 } = attachment as Record<string, unknown>;
    if (typeof filename === "string" && typeof base64 === "string") {
      const approxBytes = (base64.length * 3) / 4;
      if (approxBytes <= MAX_ATTACHMENT_BYTES) {
        attachments.push({ filename, content: base64 });
      } else {
        attachmentNote = `Customer attempted to upload "${filename}" but it was too large to email — follow up to request it directly.`;
      }
    }
  }

  try {
    await getResend().emails.send({
      from: NOTIFICATION_FROM,
      to: NOTIFICATION_TO,
      replyTo: email,
      subject: `New quote request from ${name}`,
      html: renderEmailRows([
        ["Name", name],
        ["Phone", phone],
        ["Email", email],
        ["Address", address],
        ["Interested in", serviceList],
        ["Notes", typeof notes === "string" ? notes : ""],
        ["Attachment", attachmentNote],
      ]),
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to send quote email", error);
    return NextResponse.json({ error: "Failed to send request" }, { status: 502 });
  }
}
