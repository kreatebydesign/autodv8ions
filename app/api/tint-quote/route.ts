import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

function buildEmailHtml(body: Record<string, any>) {
  const rows = Object.entries(body)
    .map(([key, value]) => {
      const cleanValue = Array.isArray(value)
        ? value.join(", ")
        : value || "Not provided";

      return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #222;color:#888;text-transform:uppercase;font-size:11px;letter-spacing:1px;">${key}</td>
          <td style="padding:10px;border-bottom:1px solid #222;color:#fff;">${cleanValue}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="background:#050505;color:#fff;font-family:Arial,sans-serif;padding:32px;">
      <h1 style="margin:0 0 12px;font-size:26px;">New AutoDV8ions Tint Quote Request</h1>
      <p style="color:#aaa;margin:0 0 28px;">A new tint quote was submitted from the website.</p>
      <table style="width:100%;border-collapse:collapse;background:#0b0b0b;border:1px solid #222;">
        ${rows}
      </table>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("[tint-quote] Submission:", body);

    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Email service is not configured." },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: "AutoDV8ions <onboarding@resend.dev>",
      to: "matt@kreatebydesign.com",
      subject: "New AutoDV8ions Tint Quote Request",
      html: buildEmailHtml(body),
      replyTo: body.email || undefined,
    });

    if (error) {
      console.error("[tint-quote] Resend error:", error);

      return NextResponse.json(
        { success: false, error: "Email failed to send." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[tint-quote] API error:", error);

    return NextResponse.json(
      { success: false, error: "Something went wrong." },
      { status: 500 }
    );
  }
}