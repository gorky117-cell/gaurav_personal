import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { Resend } from "resend";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 8080);

const resendApiKey = process.env.RESEND_API_KEY || "";
const requestDemoTo = process.env.REQUEST_DEMO_TO || "gaurav@aiforall.ltd";
const requestDemoFrom = process.env.REQUEST_DEMO_FROM || `AI for ALL <${requestDemoTo}>`;
const requestDemoConfirmationFrom = process.env.REQUEST_DEMO_CONFIRMATION_FROM || requestDemoFrom;
const requestDemoReplyTo = process.env.REQUEST_DEMO_REPLY_TO || requestDemoTo;
const fallbackRedirect = process.env.REQUEST_DEMO_REDIRECT || "/request-demo-thanks.html";

const resend = resendApiKey ? new Resend(resendApiKey) : null;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(__dirname));

function normalizeRedirect(value) {
  if (!value || typeof value !== "string") return fallbackRedirect;
  if (value.startsWith("/")) return value;
  return fallbackRedirect;
}

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildDemoConfirmationHtml(name) {
  const safeName = esc(name);
  return `
    <div style="margin:0;padding:0;background:#f4f7f8;font-family:Arial,Helvetica,sans-serif;color:#102027;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f4f7f8;">
        <tr>
          <td align="center" style="padding:28px 14px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border-collapse:collapse;background:#ffffff;border:1px solid #dce5e8;border-radius:18px;overflow:hidden;">
              <tr>
                <td align="center" style="background:#020607;padding:34px 28px 30px;border-bottom:1px solid #102126;">
                  <img src="https://www.aiforall.ltd/assets/ai-for-all-orb-final.png" width="128" height="128" alt="AI for ALL" style="display:block;width:128px;height:128px;margin:0 auto 18px;border:0;">
                  <div style="font-size:12px;line-height:1.4;letter-spacing:3px;text-transform:uppercase;color:#13e6c2;font-weight:700;margin-bottom:12px;">Edge-first AI infrastructure</div>
                  <h1 style="margin:0;color:#f7fbfc;font-size:28px;line-height:1.18;font-weight:800;">AI for ALL Demo Request</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:34px 34px 30px;">
                  <p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#102027;">Hi ${safeName},</p>
                  <p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#31434c;">Thank you for requesting a demo of AI for ALL. We have received your message and will review it carefully.</p>
                  <p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:#31434c;">We will come back soon with demo access details, a recorded walkthrough, or the next step for your use case.</p>
                  <div style="margin:26px 0;padding:18px 20px;border-left:4px solid #13e6c2;background:#f0fbf8;border-radius:10px;">
                    <p style="margin:0;font-size:15px;line-height:1.7;color:#20333b;">You can reply directly to this email if you want to add more context or share a specific requirement.</p>
                  </div>
                  <p style="margin:28px 0 0;font-size:16px;line-height:1.7;color:#102027;">Warm regards,<br><strong>Gaurav Kumar Singh</strong><br><span style="color:#60727b;">Founder, AI for ALL</span></p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:18px 28px 26px;background:#f8fbfc;border-top:1px solid #e3ecef;">
                  <p style="margin:0;color:#72848d;font-size:12px;line-height:1.6;">AI for ALL | Edge-first AI infrastructure for cost-efficient intelligence</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

app.post("/api/request-demo", async (req, res) => {
  const body = req.body || {};
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const company = String(body.company || "").trim();
  const message = String(body.message || "").trim();
  const honey = String(body._honey || "").trim();
  const redirectTo = normalizeRedirect(body.next_url);

  if (honey) {
    return res.redirect(303, redirectTo);
  }

  if (!name || !email) {
    return res.status(400).send("Missing required fields: name and email.");
  }

  if (!resend) {
    return res.status(500).send("Server is missing RESEND_API_KEY.");
  }

  const subject = "New demo request from AI for ALL website";
  const html = `
    <h2>New Demo Request</h2>
    <p><strong>Name:</strong> ${esc(name)}</p>
    <p><strong>Email:</strong> ${esc(email)}</p>
    <p><strong>Company / Role:</strong> ${esc(company || "-")}</p>
    <p><strong>Message:</strong><br/>${esc(message || "-").replaceAll("\n", "<br/>")}</p>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: requestDemoFrom,
      to: [requestDemoTo],
      replyTo: email,
      subject,
      html
    });
    if (error) {
      console.error("Resend API error:", error);
      return res.status(502).send(`Unable to send email: ${error.message || "unknown error"}`);
    }

    const autoReply = await resend.emails.send({
      from: requestDemoConfirmationFrom,
      to: [email],
      replyTo: requestDemoReplyTo,
      subject: "We received your AI for ALL demo request",
      html: buildDemoConfirmationHtml(name)
    });
    if (autoReply.error) {
      console.error("Resend auto-reply error:", autoReply.error);
    }

    console.log("Resend sent email id:", data?.id || "no-id");
    return res.redirect(303, redirectTo);
  } catch (error) {
    console.error("Resend send failed:", error);
    return res.status(502).send("Unable to send email right now.");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
