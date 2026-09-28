import { NextResponse } from "next/server";
import { getResend, NOTIFICATION_FROM, NOTIFICATION_TO } from "@/lib/resend";
import { renderEmailRows } from "@/lib/email-templates";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { firstName, lastName, email, phone, street, suburb, state, postcode, notes, items, estimatedTotal } =
    body as Record<string, unknown>;

  if (
    typeof firstName !== "string" || !firstName.trim() ||
    typeof lastName !== "string" || !lastName.trim() ||
    typeof email !== "string" || !email.trim() ||
    typeof phone !== "string" || !phone.trim() ||
    typeof street !== "string" || !street.trim() ||
    typeof suburb !== "string" || !suburb.trim() ||
    typeof postcode !== "string" || !postcode.trim()
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const itemsSummary = Array.isArray(items)
    ? items
        .map((item) => {
          if (item && typeof item === "object") {
            const { name, quantity } = item as Record<string, unknown>;
            return `${typeof quantity === "number" ? quantity : "?"}x ${typeof name === "string" ? name : "Unknown item"}`;
          }
          return null;
        })
        .filter(Boolean)
        .join("\n")
    : "";

  try {
    await getResend().emails.send({
      from: NOTIFICATION_FROM,
      to: NOTIFICATION_TO,
      replyTo: email,
      subject: `New EV charger quote request from ${firstName} ${lastName}`,
      html: renderEmailRows([
        ["Name", `${firstName} ${lastName}`],
        ["Phone", phone],
        ["Email", email],
        ["Installation address", `${street}, ${suburb}, ${typeof state === "string" ? state : ""} ${postcode}`],
        ["Items", itemsSummary],
        ["Estimated total", typeof estimatedTotal === "string" ? estimatedTotal : ""],
        ["Notes", typeof notes === "string" ? notes : ""],
      ]),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to send EV quote request email", error);
    return NextResponse.json({ error: "Failed to send request" }, { status: 502 });
  }
}
