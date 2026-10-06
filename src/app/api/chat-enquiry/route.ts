import { NextResponse } from "next/server";
import { getResend, NOTIFICATION_FROM, NOTIFICATION_TO } from "@/lib/resend";
import { renderEmailRows } from "@/lib/email-templates";

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, phone, email, message, transcript } = body as Record<string, unknown>;

  const cleanName = clean(name, 100);
  const cleanPhone = clean(phone, 40);
  const cleanEmail = clean(email, 200);
  const cleanMessage = clean(message, 2000);

  if (!cleanName || !cleanPhone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const questions = Array.isArray(transcript)
    ? transcript
        .filter((t): t is string => typeof t === "string")
        .slice(-10)
        .map((t) => t.slice(0, 300))
        .join("\n")
    : "";

  try {
    await getResend().emails.send({
      from: NOTIFICATION_FROM,
      to: NOTIFICATION_TO,
      replyTo: cleanEmail || undefined,
      subject: `New chat enquiry from ${cleanName}`,
      html: renderEmailRows([
        ["Name", cleanName],
        ["Phone", cleanPhone],
        ["Email", cleanEmail],
        ["Message", cleanMessage],
        ["Asked in chat", questions],
      ]),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to send chat enquiry email", error);
    return NextResponse.json({ error: "Failed to send enquiry" }, { status: 502 });
  }
}
