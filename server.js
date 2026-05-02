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
const requestDemoFrom = process.env.REQUEST_DEMO_FROM || "AI for ALL <noreply@aiforall.ltd>";
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
      from: requestDemoFrom,
      to: [email],
      subject: "We received your AI for ALL demo request",
      html: `
        <p>Hi ${esc(name)},</p>
        <p>Thank you for requesting a demo of AI for ALL.</p>
        <p>We have received your message and will come back soon with demo details or the next step.</p>
      `
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
