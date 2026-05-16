require("dotenv").config({ path: ".env.mail" });

const express    = require("express");
const nodemailer = require("nodemailer");
const cors       = require("cors");
const axios      = require("axios");

const app = express();
app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type"] }));
app.options(/.*/, cors());
app.use(express.json());

const GMAIL_USER = process.env.GMAIL_USER || "";
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD || "";
const EE_KEY     = process.env.ELASTIC_EMAIL_KEY || "";

const GMAIL_READY = GMAIL_USER && GMAIL_PASS && GMAIL_PASS.length > 10 && GMAIL_PASS !== "your_app_password_here";
const EE_READY    = EE_KEY && EE_KEY.length > 20;

const transporter = GMAIL_READY
  ? nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    })
  : null;

app.get("/api/health", (_req, res) => {
  res.json({ 
    status: (GMAIL_READY || EE_READY) ? "ok" : "no-credentials", 
    gmail: GMAIL_READY ? "active" : "inactive",
    elastic: EE_READY ? "active" : "inactive",
    keys_loaded: { ee: EE_KEY ? "yes" : "no", gmail_pass: GMAIL_PASS ? "yes" : "no" }
  });
});

app.post("/api/send", async (req, res) => {
  const { to, subject, message, from_name } = req.body;
  if (!to || !subject || !message) {
    return res.status(400).json({ success: false, error: "to, subject, message are required" });
  }

  let errors = [];

  // 1. Try Elastic Email First (Proper Work)
  if (EE_READY) {
    try {
      // Use POST for Elastic Email for better reliability
      const response = await axios.post("https://api.elasticemail.com/v2/email/send", null, {
        params: {
          apikey: EE_KEY,
          subject: subject,
          from: "anandh.femi9@gmail.com",
          fromName: from_name || "FEMI9",
          to: to,
          bodyText: message,
          isTransactional: true
        }
      });
      
      if (response.data.success) {
        console.log(`✅  Sent (Elastic) → ${to} | ${subject}`);
        return res.json({ success: true, method: "elastic" });
      } else {
        const err = response.data.error || "Unknown Elastic Error";
        console.error("❌  Elastic Error:", err);
        errors.push(`Elastic Email: ${err}`);
      }
    } catch (err) {
      console.error("❌  Elastic API Error:", err.message);
      errors.push(`Elastic API: ${err.message}`);
    }
  }

  // 2. Fallback to Gmail Nodemailer
  if (GMAIL_READY && transporter) {
    try {
      await transporter.sendMail({
        from: `"${from_name || "FEMI9"}" <${GMAIL_USER}>`,
        to,
        subject,
        text: message,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
          <h2 style="color:#e41f07;margin-bottom:16px;">${subject}</h2>
          <pre style="white-space:pre-wrap;font-family:inherit;font-size:14px;color:#374151;line-height:1.6;">${message}</pre>
          <hr style="margin-top:24px;border:none;border-top:1px solid #e5e7eb;"/>
          <p style="font-size:12px;color:#9ca3af;margin-top:12px;">FEMI9 · Tamil Nadu, India</p>
        </div>`,
      });
      console.log(`✅  Sent (Gmail) → ${to} | ${subject}`);
      return res.json({ success: true, method: "gmail" });
    } catch (err) {
      console.error("❌  Gmail error:", err.message);
      errors.push(`Gmail (SMTP): ${err.message}`);
    }
  }

  // If we reach here, both failed or weren't configured
  const finalError = errors.length > 0 
    ? errors.join(" | ") 
    : "No mail service configured. Please check your API keys or Gmail App Password.";
    
  res.status(500).json({ success: false, error: finalError });
});

const PORT = 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n📧  Mail server running on port ${PORT}`);
  console.log(`    Elastic Email → ${EE_READY ? "READY" : "NOT SET"}`);
  console.log(`    Gmail (SMTP)  → ${GMAIL_READY ? "READY" : "NOT SET"}`);
  console.log(`    API Endpoint  → http://localhost:${PORT}/api/send\n`);
});
