import { NextResponse } from "next/server";
import { getResend, NOTIFICATION_FROM, NOTIFICATION_TO } from "@/lib/resend";
import { renderEmailRows } from "@/lib/email-templates";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, phone, email, subject, message } = body as Record<string, unknown>;

  if (
    typeof name !== "string" || !name.trim() ||
    typeof email !== "string" || !email.trim() ||
    typeof message !== "string" || !message.trim()
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    await getResend().emails.send({
      from: NOTIFICATION_FROM,
      to: NOTIFICATION_TO,
      replyTo: email,
      subject: `New contact form enquiry: ${typeof subject === "string" && subject ? subject : "General Enquiry"}`,
      html: renderEmailRows([
        ["Name", name],
        ["Phone", typeof phone === "string" ? phone : ""],
        ["Email", email],
        ["Subject", typeof subject === "string" ? subject : ""],
        ["Message", message],
      ]),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to send contact email", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 502 });
  }
}
