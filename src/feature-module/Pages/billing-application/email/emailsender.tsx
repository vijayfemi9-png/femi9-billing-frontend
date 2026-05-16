// @ts-nocheck
import React, { useState, ChangeEvent } from "react";
import emailjs from "@emailjs/browser";
import type { CSSProperties } from "react";

const SERVICE_ID  = "service_3ar69ey";
const TEMPLATE_ID = "template_d7i6167";
const PUBLIC_KEY  = "lTKv9igvCZ5DWu7-2";
const EE_API_KEY   = "E04219DBA3A06FA826D08044B7AB3350A3DB812631FCCB618D2237DDEEA8FDE8189231B13AB151E8B06874740BDAAE0E";
const TO_EMAIL    = "[EMAIL_ADDRESS]";

type Status = "idle" | "sending" | "success" | "error";

interface FormData {
  from_name: string;
  subject: string;
  message: string;
}

interface FieldProps {
  label: string;
  name: keyof FormData;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

const styles: { [key: string]: CSSProperties } = {
  page: {
    minHeight: "100vh",
    background: "#f0f4f8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1rem",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  card: {
    background: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 4px 32px rgba(0,0,0,0.10)",
    padding: "2rem",
    width: "100%",
    maxWidth: "540px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "1.5rem",
  },
  iconWrap: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: { margin: 0, fontSize: "20px", fontWeight: 700, color: "#111827" },
  subtitle: { margin: 0, fontSize: "13px", color: "#6B7280" },
  form: { display: "flex", flexDirection: "column", gap: "16px" },
  fieldWrap: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "13px", fontWeight: 600, color: "#374151" },
  toEmailDisplay: {
    padding: "10px 14px",
    fontSize: "14px",
    border: "1.5px solid #E5E7EB",
    borderRadius: "10px",
    color: "#6B7280",
    background: "#F3F4F6",
  },
  input: {
    padding: "10px 14px",
    fontSize: "14px",
    border: "1.5px solid #E5E7EB",
    borderRadius: "10px",
    outline: "none",
    color: "#111827",
    background: "#F9FAFB",
  },
  textarea: {
    padding: "10px 14px",
    fontSize: "14px",
    border: "1.5px solid #E5E7EB",
    borderRadius: "10px",
    outline: "none",
    color: "#111827",
    background: "#F9FAFB",
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: "1.6",
  },
  btn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px",
    fontSize: "15px",
    fontWeight: 600,
    color: "#ffffff",
    background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
    border: "none",
    borderRadius: "10px",
    marginTop: "4px",
  },
  spinner: {
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTop: "2px solid #fff",
    borderRadius: "50%",
    display: "inline-block",
  },
  successBanner: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#E1F5EE",
    color: "#0F6E56",
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "14px",
    marginBottom: "16px",
    fontWeight: 500,
  },
  errorBanner: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#FAECE7",
    color: "#993C1D",
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "14px",
    marginBottom: "16px",
    fontWeight: 500,
  },
};

function Field({ label, name, type, placeholder, value, onChange }: FieldProps) {
  return (
    <div style={styles.fieldWrap}>
      <label style={styles.label}>{label}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        style={styles.input}
      />
    </div>
  );
}

export default function EmailSender() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [form, setForm] = useState<FormData>({
    from_name: "",
    subject: "",
    message: "",
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (status === "error") setStatus("idle");
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    try {
      // Use Local Mail Server Bridge (Proper Work / Direct Gmail)
      const resp = await fetch("http://localhost:5000/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:JSON.stringify({ to: TO_EMAIL, subject: form.subject, message: `From: ${form.from_name}\n\n${form.message}`, from_name: form.from_name })
      });
      const data = await resp.json();

      if (data.success) {
        setStatus("success");
        setForm({ from_name: "", subject: "", message: "" });
      } else {
        throw new Error(data.error || "Mail server error");
      }
    } catch (err: any) {
      console.error("Mail Error:", err);
      setStatus("error");
      setErrorMsg(err.message || "Failed to connect to mail server. Ensure mailserver.cjs is running.");
    }
  };

  const isLoading = status === "sending";

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconWrap}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M2 7l10 7 10-7"/>
            </svg>
          </div>
          <div>
            <h1 style={styles.title}>Send Email</h1>
            <p style={styles.subtitle}>Gmail · EmailJS</p>
          </div>
        </div>

        {status === "success" && (
          <div style={styles.successBanner}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            <span>Email sent successfully!</span>
          </div>
        )}

        {status === "error" && (
          <div style={styles.errorBanner}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="#D85A30" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <Field label="Your Name" name="from_name" type="text"
            placeholder="Enter your name" value={form.from_name} onChange={handleChange} />

          <div style={styles.fieldWrap}>
            <label style={styles.label}>To</label>
            <div style={styles.toEmailDisplay}>{TO_EMAIL}</div>
          </div>

          <Field label="Subject" name="subject" type="text"
            placeholder="Email subject" value={form.subject} onChange={handleChange} />

          <div style={styles.fieldWrap}>
            <label style={styles.label}>Message</label>
            <textarea
              name="message"
              placeholder="Write your message here..."
              value={form.message}
              onChange={handleChange}
              required
              rows={5}
              style={styles.textarea}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{ ...styles.btn, opacity: isLoading ? 0.7 : 1, cursor: isLoading ? "not-allowed" : "pointer" }}
          >
            {isLoading ? (
              <><span style={styles.spinner} />Sending...</>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                Send Email
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
