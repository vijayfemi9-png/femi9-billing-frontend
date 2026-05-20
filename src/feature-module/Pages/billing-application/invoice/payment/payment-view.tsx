// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { all_routes } from "../../../../../routes/all_routes";
import "./payment.scss";
import jsPDF from "jspdf";
import emailjs from "@emailjs/browser";

interface ReceivedPayment {
    id: number; paymentNumber: string; date: string;
    referenceNumber: string; customerName: string; invoiceNumber: string;
    mode: string; amount: number; unusedAmount: number; status: string;
}
interface Customer {
    id: number; name: string; companyName: string; email?: string;
    workPhone?: string; address?: string; city?: string; state?: string; country?: string; zipCode?: string;
    billingAddress?: string; shippingAddress?: string;
}
interface Refund {
    id: number;
    paymentId: number;
    date: string;
    mode: string;
    amount: number;
    notes?: string;
}

const SK = "billing_received_payments";
const CSK = "billing_customers";
const RSK = "billing_refunds";
const SETTINGS_KEY = "invoice_settings";
const route = all_routes;

function loadPayments(): ReceivedPayment[] {
    try { const s = localStorage.getItem(SK); if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length) return p; } } catch { /**/ }
    return [];
}
function loadCustomer(name: string): Customer | null {
    try { const s = localStorage.getItem(CSK); if (s) { const a = JSON.parse(s); return a.find((c: any) => c.name === name) || null; } } catch { /**/ }
    return null;
}
function loadRefunds(paymentId: number): Refund[] {
    try {
        const s = localStorage.getItem(RSK);
        if (s) {
            const all = JSON.parse(s);
            if (Array.isArray(all)) return all.filter((r: Refund) => r.paymentId === paymentId);
        }
    } catch { /**/ }
    return [];
}
function saveAllRefunds(refunds: Refund[]) {
    localStorage.setItem(RSK, JSON.stringify(refunds));
}
function loadCompanySettings() {
    try {
        const s = localStorage.getItem(SETTINGS_KEY);
        if (s) {
            const p = JSON.parse(s);
            return {
                name: p.organizationName || p.companyName || "FEMI9",
                address: p.address || "Tamil Nadu, India",
                phone: p.phone || "91-8012610945",
                email: p.email || "femi9@gmail.com",
            };
        }
    } catch { /**/ }
    return { name: "FEMI9", address: "Tamil Nadu, India", phone: "91-8012610945", email: "femi9@gmail.com" };
}
const fmtNum = (n: number): string => {
    const fixed = (n || 0).toFixed(2);
    const [int, dec] = fixed.split(".");
    const lastThree = int.slice(-3);
    const rest = int.slice(0, -3);
    const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree : lastThree;
    return grouped + "." + dec;
};
const fmt = (n: number) => (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
        <span style={{ fontSize: "0.9em", marginRight: 2, fontWeight: 400, fontFamily: "sans-serif" }}>₹</span>
        {fmtNum(n)}
    </span>
);
const fmtStr = (n: number) => "₹" + fmtNum(n);

// ── Amount to words ───────────────────────────────────────────────────────────
const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function inWords(n: number): string {
    if (n === 0) return "Zero";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + inWords(n % 100) : "");
    if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + inWords(n % 1000) : "");
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + inWords(n % 100000) : "");
    return inWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + inWords(n % 10000000) : "");
}
function amountToWords(amount: number): string {
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);
    let w = "Indian Rupee " + inWords(rupees);
    if (paise) w += " and " + inWords(paise) + " Paise";
    return w + " Only";
}

const EJS_SERVICE = "service_3ar69ey";
const EJS_TEMPLATE = "template_d7i6167";
const EJS_KEY = "lTKv9igvCZ5DWu7-2";
const EE_API_KEY = "E04219DBA3A06FA826D08044B7AB3350A3DB812631FCCB618D2237DDEEA8FDE8189231B13AB151E8B06874740BDAAE0E";

// ── Send Dropdown ─────────────────────────────────────────────────────────────
const SendDropdown: React.FC<{ payment: ReceivedPayment; cust: Customer | null }> = ({ payment, cust }) => {
    const [open, setOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
    }, []);

    const showToast = (msg: string, ok: boolean) => {
        setToast({ msg, ok });
        // auto close only on success; errors stay until dismissed
        if (ok) setTimeout(() => setToast(null), 6000);
    };

    const cleanPhone = (p?: string) => (p || "").replace(/[^0-9]/g, "");

    const sendEmail = async () => {
        const customerEmail = cust?.email || "";
        if (!customerEmail) {
            showToast("Customer has no email address saved.", false);
            setOpen(false);
            return;
        }
        setOpen(false);
        setSending(true);
        try {
            const subject = `Payment Receipt ${payment.paymentNumber}`;
            const message = `Dear ${payment.customerName},\n\nPayment Receipt: ${payment.paymentNumber}\nDate: ${payment.date}\nAmount: ${fmtStr(payment.amount)}\nMode: ${payment.mode}\n\nThank you for your payment.\n\nFEMI9 Team`;

            // Use Local Mail Server Bridge (Proper Work / Direct Gmail)
            const resp = await fetch("http://localhost:5000/api/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to: customerEmail, subject, message, from_name: "FEMI9" })
            });
            const data = await resp.json();

            if (data.success) {
                showToast(`✅ Receipt sent to ${customerEmail}`, true);
            } else {
                throw new Error(data.error || "Mail server error");
            }
        } catch (err: any) {
            console.error("Mail Error:", err);
            showToast(`❌ ${err.message || "Failed to connect to mail server. Ensure mailserver.cjs is running."}`, false);
        } finally {
            setSending(false);
        }
    };

    const sendSMS = () => {
        const phone = cleanPhone(cust?.workPhone);
        const body = encodeURIComponent(
            `Payment Receipt ${payment.paymentNumber}: ${fmtStr(payment.amount)} received on ${payment.date}. Thank you, ${payment.customerName}.`
        );
        window.open(`sms:${phone}?body=${body}`);
        setOpen(false);
    };

    const sendWhatsApp = () => {
        let phone = cleanPhone(cust?.workPhone);
        if (phone.length === 10) phone = "91" + phone;
        const text = encodeURIComponent(
            `Dear ${payment.customerName}, your payment receipt ${payment.paymentNumber} for ${fmtStr(payment.amount)} has been received on ${payment.date}. Thank you.`
        );
        window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
        setOpen(false);
    };

    const items = [
        { label: "Send Email", icon: "ti-mail", fn: sendEmail },
        { label: "Send SMS", icon: "ti-message", fn: sendSMS },
        { label: "Send WhatsApp", icon: "ti-brand-whatsapp", fn: sendWhatsApp },
    ];

    return (
        <>
            {/* Toast notification */}
            {toast && (
                <div style={{
                    position: "fixed", top: 24, right: 24, zIndex: 99999,
                    background: toast.ok ? "#16a34a" : "#dc2626",
                    color: "#fff", borderRadius: 10, padding: "16px 20px",
                    fontSize: 14, fontWeight: 500,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
                    display: "flex", alignItems: "flex-start", gap: 12,
                    maxWidth: 380, minWidth: 260,
                }}>
                    <i className={toast.ok ? "ti ti-circle-check" : "ti ti-alert-circle"}
                        style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }} />
                    <span style={{ flex: 1, lineHeight: 1.5 }}>{toast.msg}</span>
                    <button onClick={() => setToast(null)} style={{
                        background: "rgba(255,255,255,0.25)", border: "none",
                        color: "#fff", borderRadius: 4, width: 22, height: 22,
                        cursor: "pointer", fontSize: 14, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>×</button>
                </div>
            )}

            <div ref={ref} style={{ position: "relative" }}>
                <button
                    onClick={() => setOpen(o => !o)}
                    disabled={sending}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "1px solid #e5e7eb", borderRadius: 5, background: "#fff", fontSize: 14, color: sending ? "#9ca3af" : "#374151", cursor: sending ? "not-allowed" : "pointer", fontWeight: 500 }}>
                    {sending
                        ? <><i className="ti ti-loader-2" style={{ fontSize: 14, animation: "spin 1s linear infinite" }} /> Sending...</>
                        : <><i className="ti ti-send" style={{ fontSize: 14 }} /> Send <i className="ti ti-chevron-down" style={{ fontSize: 11, color: "#9ca3af" }} /></>
                    }
                </button>
                {open && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 200, minWidth: 170 }}>
                        {items.map(({ label, icon, fn }) => (
                            <div key={label} onClick={fn}
                                style={{ padding: "9px 14px", fontSize: 14, color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#f9fafb"}
                                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
                                <i className={`ti ${icon}`} style={{ fontSize: 14, color: "#6b7280" }} /> {label}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

// ── Refund Modal ──────────────────────────────────────────────────────────────
const RefundModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<Refund>) => void;
    payment: ReceivedPayment;
    refundToEdit: Refund | null;
}> = ({ isOpen, onClose, onSave, payment, refundToEdit }) => {
    const [date, setDate] = useState("");
    const [mode, setMode] = useState(payment.mode);
    const [amount, setAmount] = useState(String(payment.amount));
    const [notes, setNotes] = useState("");
    const [reference, setReference] = useState("");
    const [fromAccount, setFromAccount] = useState("Petty Cash");
    const [winWidth, setWinWidth] = useState(window.innerWidth);

    useEffect(() => {
        const h = () => setWinWidth(window.innerWidth);
        window.addEventListener("resize", h); return () => window.removeEventListener("resize", h);
    }, []);
    const isMob = winWidth < 768;

    useEffect(() => {
        if (refundToEdit) {
            setDate(refundToEdit.date);
            setMode(refundToEdit.mode);
            setAmount(String(refundToEdit.amount));
            setNotes(refundToEdit.notes || "");
        } else if (isOpen) {
            setDate(new Date().toLocaleDateString("en-GB"));
            setMode(payment.mode);
            setAmount(String(payment.amount));
            setNotes("");
            setReference("");
        }
    }, [refundToEdit, payment, isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt <= 0) return alert("Enter a valid amount");
        onSave({ id: refundToEdit?.id, date, mode, amount: amt, notes, paymentId: payment.id });
        onClose();
    };

    const inp: React.CSSProperties = { width: "100%", height: 38, border: "1px solid #d1d5db", borderRadius: 4, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" };
    const lbl: React.CSSProperties = { display: "block", fontSize: 13, color: "#374151", fontWeight: 500, marginBottom: 6 };

    return (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: isMob ? 12 : 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 6, width: isMob ? "100%" : 600, maxWidth: "100%", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", maxHeight: "95vh" }}>

                {/* Header */}
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                    <span style={{ fontSize: 17, fontWeight: 600, color: "#111827" }}>{refundToEdit ? "Edit Refund" : "Refund"}</span>
                    <i className="ti ti-x" style={{ fontSize: 20, color: "#9ca3af", cursor: "pointer" }} onClick={onClose} />
                </div>

                {/* Body */}
                <div style={{ padding: "20px", overflowY: "auto" }}>

                    {/* Customer */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <i className="ti ti-user" style={{ fontSize: 18, color: "#9ca3af" }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>Customer Name</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{payment.customerName}</div>
                        </div>
                    </div>

                    {/* Amount box */}
                    <div style={{ background: "#f9fafb", borderRadius: 8, padding: "16px", marginBottom: 20 }}>
                        <div style={{ ...lbl, marginBottom: 8 }}>Total Refund Amount</div>
                        <div style={{ display: "flex", alignItems: "center", background: "#fff", border: "1px solid #d1d5db", borderRadius: 4 }}>
                            <span style={{ padding: "0 12px", fontSize: 13, color: "#6b7280", borderRight: "1px solid #d1d5db", background: "#f9fafb", height: 38, display: "flex", alignItems: "center", flexShrink: 0 }}>INR</span>
                            <input value={amount} onChange={e => setAmount(e.target.value)} type="number"
                                style={{ flex: 1, height: 38, border: "none", padding: "0 12px", fontSize: 14, outline: "none", background: "transparent", minWidth: 0 }} />
                        </div>
                    </div>

                    {/* Fields - 2 cols on desktop, 1 col on mobile */}
                    <div style={{ display: "grid", gridTemplateColumns: isMob ? "1fr" : "1fr 1fr", gap: "16px 20px" }}>
                        <div>
                            <label style={lbl}>Refunded On<span style={{ color: "#ef4444" }}>*</span></label>
                            <input value={date} onChange={e => setDate(e.target.value)} placeholder="dd/mm/yyyy" style={inp} />
                        </div>
                        <div>
                            <label style={lbl}>Payment Mode</label>
                            <select value={mode} onChange={e => setMode(e.target.value)} style={{ ...inp, background: "#fff" }}>
                                {["Cash", "Bank Transfer", "Cheque", "UPI", "Credit Card", "Bank Remittance"].map(m => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={lbl}>Reference#</label>
                            <input value={reference} onChange={e => setReference(e.target.value)} style={inp} />
                        </div>
                        <div>
                            <label style={lbl}>From Account<span style={{ color: "#ef4444" }}>*</span></label>
                            <select value={fromAccount} onChange={e => setFromAccount(e.target.value)} style={{ ...inp, background: "#fff" }}>
                                {["Petty Cash", "Cash", "Undeposited Funds", "Standard Chartered Bank"].map(m => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                        <div style={{ gridColumn: isMob ? "1" : "1 / -1" }}>
                            <label style={lbl}>Description</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                                style={{ ...inp, height: "auto", padding: "8px 12px", resize: "none" as "none" }} />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: "14px 20px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 10, background: "#fff", flexShrink: 0 }}>
                    <button onClick={handleSave} style={{ flex: isMob ? 1 : "none", padding: "10px 24px", border: "none", borderRadius: 4, background: "#e41f07", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save</button>
                    <button onClick={onClose} style={{ flex: isMob ? 1 : "none", padding: "10px 24px", border: "1px solid #d1d5db", borderRadius: 4, background: "#fff", fontSize: 14, cursor: "pointer", color: "#374151" }}>Cancel</button>
                </div>
            </div>
        </div>
    );
};

// ── PDF/Print Dropdown ────────────────────────────────────────────────────────
const PDFDropdown: React.FC<{ payment: ReceivedPayment; cust: Customer | null; company: any }> = ({ payment, cust, company }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
    }, []);

    const printReceipt = () => {
        window.print();
        setOpen(false);
    };

    const exportPDF = () => {
        try {
            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const w = 210, margin = 20;
            let y = 20;

            // Header Section: Company on Left, Title on Right
            doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.setTextColor(26, 26, 26);
            doc.text(company.name, margin, y);

            doc.setFontSize(20); doc.setFont("helvetica", "bold"); doc.setTextColor(228, 31, 7);
            doc.text("PAYMENT RECEIPT", w - margin, y, { align: "right" });
            y += 8;

            doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(75, 85, 99);
            const addrLines = company.address.split(", ");
            addrLines.forEach((l: string) => { doc.text(l, margin, y); y += 4.5; });
            doc.setFont("helvetica", "bold"); doc.text(`Phone: ${company.phone}`, margin, y); y += 4.5;
            doc.text(`Email: ${company.email}`, margin, y);

            // Receipt Meta on Right
            let metaY = 28;
            doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(55, 65, 81);
            doc.text(`Receipt # ${payment.paymentNumber}`, w - margin, metaY, { align: "right" }); metaY += 6;
            doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(107, 114, 128);
            doc.text(`Date: ${payment.date}`, w - margin, metaY, { align: "right" });

            y = Math.max(y, metaY) + 12;
            doc.setDrawColor(228, 31, 7); doc.setLineWidth(0.5); doc.line(margin, y, w - margin, y);
            doc.setLineWidth(0.2); y += 12;

            // Payment Details and Amount Box
            const detailRows = [
                ["Payment Date", payment.date],
                ["Reference Number", payment.referenceNumber || "—"],
                ["Payment Mode", payment.mode],
                ["Amount In Words", amountToWords(payment.amount)],
            ];

            const pdfFmt = (n: number) => "Rs. " + fmtNum(n);

            const boxW = 55, boxH = 22;
            doc.setFillColor(74, 124, 89); doc.roundedRect(w - margin - boxW, y, boxW, boxH, 1, 1, "F");
            doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
            doc.text("AMOUNT RECEIVED", w - margin - boxW / 2, y + 7, { align: "center" });
            doc.setFontSize(14); doc.text(pdfFmt(payment.amount), w - margin - boxW / 2, y + 15, { align: "center" });

            doc.setFontSize(9);
            detailRows.forEach(([label, val]) => {
                doc.setFont("helvetica", "normal"); doc.setTextColor(107, 114, 128); doc.text(label, margin, y + 4);
                doc.setFont("helvetica", "bold"); doc.setTextColor(17, 24, 39); doc.text(val, margin + 45, y + 4);
                y += 8;
            });

            y = Math.max(y, y + boxH - 32) + 15;
            doc.setDrawColor(229, 231, 235); doc.line(margin, y, w - margin, y); y += 10;

            // Payment For Table
            doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(17, 24, 39);
            doc.text("Payment for", margin, y); y += 8;

            doc.setFillColor(249, 250, 251); doc.rect(margin, y, w - 2 * margin, 10, "F");
            doc.setDrawColor(229, 231, 235); doc.rect(margin, y, w - 2 * margin, 10); // Full border for header

            doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(107, 114, 128);
            doc.text("Invoice Number", margin + 5, y + 6.5);
            doc.text("Invoice Date", margin + 45, y + 6.5);
            doc.text("Invoice Amount", margin + 125, y + 6.5, { align: "right" });
            doc.text("Payment Amount", w - margin - 5, y + 6.5, { align: "right" });

            // Vertical lines for header
            doc.line(margin + 40, y, margin + 40, y + 10);
            doc.line(margin + 85, y, margin + 85, y + 10);
            doc.line(margin + 135, y, margin + 135, y + 10);
            y += 10;

            if (payment.invoiceNumber) {
                const rowH = 10;
                doc.setDrawColor(229, 231, 235); doc.rect(margin, y, w - 2 * margin, rowH);
                doc.setFont("helvetica", "normal"); doc.setTextColor(228, 31, 7);
                doc.text(payment.invoiceNumber, margin + 5, y + 7);
                doc.setTextColor(55, 65, 81);
                doc.text(payment.date, margin + 45, y + 7);
                doc.text(pdfFmt(payment.amount), margin + 125, y + 7, { align: "right" });
                doc.setFont("helvetica", "bold"); doc.setTextColor(17, 24, 39);
                doc.text(pdfFmt(payment.amount), w - margin - 5, y + 7, { align: "right" });

                // Vertical lines for row
                doc.line(margin + 40, y, margin + 40, y + rowH);
                doc.line(margin + 85, y, margin + 85, y + rowH);
                doc.line(margin + 135, y, margin + 135, y + rowH);
                y += rowH;
            }

            y += 15;
            doc.setDrawColor(229, 231, 235); doc.line(margin, y, w - margin, y); y += 10;

            // Received From Section
            doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(156, 163, 175);
            doc.text("RECEIVED FROM", margin, y); y += 6;
            doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(228, 31, 7);
            doc.text(payment.customerName, margin, y); y += 6;

            doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(75, 85, 99);
            if (cust?.companyName) { doc.setFont("helvetica", "bold"); doc.text(cust.companyName, margin, y); y += 4.5; }
            doc.setFont("helvetica", "normal");
            if (cust?.address) { doc.text(cust.address, margin, y); y += 4.5; }
            doc.text(`${cust?.city || ""} ${cust?.state || ""} ${cust?.zipCode || ""}`, margin, y); y += 4.5;
            doc.text(cust?.country || "", margin, y);

            // Authorized Signature on Right
            const sigY = y - 5;
            doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.5);
            doc.line(w - margin - 60, sigY, w - margin, sigY);
            doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(156, 163, 175);
            doc.text("AUTHORIZED SIGNATURE", w - margin - 30, sigY + 5, { align: "center" });

            doc.save(`Payment_Receipt_${payment.paymentNumber}.pdf`);
        } catch (e) { console.error(e); }
        setOpen(false);
    };

    return (
        <div ref={ref} style={{ position: "relative" }}>
            <button onClick={() => setOpen(o => !o)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "1px solid #e5e7eb", borderRadius: 5, background: "#fff", fontSize: 14, color: "#374151", cursor: "pointer", fontWeight: 500 }}>
                <i className="ti ti-file-text" style={{ fontSize: 14 }} /> PDF/Print
                <i className="ti ti-chevron-down" style={{ fontSize: 11, color: "#9ca3af" }} />
            </button>
            {open && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 200, minWidth: 160 }}>
                    {[{ label: "Download PDF", icon: "ti-download", fn: exportPDF }, { label: "Print", icon: "ti-printer", fn: printReceipt }].map(({ label, icon, fn }) => (
                        <div key={label} onClick={fn}
                            style={{ padding: "9px 14px", fontSize: 14, color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#f9fafb"}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
                            <i className={`ti ${icon}`} style={{ fontSize: 14, color: "#6b7280" }} /> {label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Template Modal ────────────────────────────────────────────────────────────
const TemplateModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: 480, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
                <div style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>Choose Template</div>
                    <i className="ti ti-x" style={{ fontSize: 20, color: "#9ca3af", cursor: "pointer" }} onClick={onClose} />
                </div>
                <div style={{ padding: "16px 24px", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ position: "relative" }}>
                        <i className="ti ti-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                        <input placeholder="Search Template" style={{ width: "100%", padding: "10px 12px 10px 36px", border: "1px solid #3b82f6", borderRadius: 6, fontSize: 14, outline: "none" }} />
                    </div>
                </div>
                <div style={{ padding: "24px", flex: 1, overflowY: "auto" }}>
                    <div style={{ width: 200, border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", cursor: "pointer" }}>
                        <div style={{ height: 200, background: "#f9fafb", padding: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div style={{ width: "100%", height: "100%", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", padding: 8, fontSize: 4 }}>
                                <div style={{ width: 15, height: 15, background: "#27ae60", borderRadius: "50%", marginBottom: 4 }} />
                                <div style={{ height: 2, background: "#eee", width: "40%", marginBottom: 2 }} />
                                <div style={{ height: 2, background: "#eee", width: "30%", marginBottom: 10 }} />
                                <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 6, marginBottom: 8 }}>PAYMENT RECEIPT</div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                                    <div style={{ width: "40%" }}>
                                        {[1, 2, 3].map(i => <div key={i} style={{ height: 2, background: "#f5f5f5", width: "100%", marginBottom: 2 }} />)}
                                    </div>
                                    <div style={{ width: 40, height: 25, background: "#4a7c59", borderRadius: 2 }} />
                                </div>
                                <div style={{ height: 30, border: "1px solid #eee", borderRadius: 1 }} />
                            </div>
                        </div>
                        <div style={{ background: "#eff6ff", color: "#3b82f6", padding: "6px", textAlign: "center", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                            <i className="ti ti-star-filled" style={{ fontSize: 13 }} /> SELECTED
                        </div>
                        <div style={{ padding: "12px", fontSize: 14, fontWeight: 600, color: "#374151" }}>Elite Template</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── More Dropdown ─────────────────────────────────────────────────────────────
const MoreDropdown: React.FC<{ payment: ReceivedPayment; onDelete: () => void; onVoid: () => void }> = ({ payment, onDelete, onVoid }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
    }, []);
    const items = [
        { label: "Void", icon: "ti-ban", fn: onVoid },
        { label: "Delete", icon: "ti-trash", fn: onDelete, danger: true },
    ];
    return (
        <div ref={ref} style={{ position: "relative" }}>
            <button onClick={() => setOpen(o => !o)}
                style={{ display: "flex", alignItems: "center", padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 5, background: "#fff", fontSize: 14, color: "#374151", cursor: "pointer" }}>
                <i className="ti ti-dots" style={{ fontSize: 15 }} />
            </button>
            {open && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 200, minWidth: 140 }}>
                    {items.map(({ label, icon, fn, danger }) => (
                        <div key={label} onClick={() => { fn(); setOpen(false); }}
                            style={{ padding: "9px 14px", fontSize: 14, color: danger ? "#e41f07" : "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#f9fafb"}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
                            <i className={`ti ${icon}`} style={{ fontSize: 14, color: danger ? "#e41f07" : "#6b7280" }} /> {label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const PaymentView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [payments, setPayments] = useState<ReceivedPayment[]>([]);
    const [selected, setSelected] = useState<ReceivedPayment | null>(null);
    const [cust, setCust] = useState<Customer | null>(null);
    const [refunds, setRefunds] = useState<Refund[]>([]);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [editingRefund, setEditingRefund] = useState<Refund | null>(null);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [showRefundTable, setShowRefundTable] = useState(true);
    const [listSearch, setListSearch] = useState("");
    const [sidebarVisible, setSidebarVisible] = useState(true);
    const [showAttachments, setShowAttachments] = useState(false);
    const [attachments, setAttachments] = useState<{ name: string; size: string; url: string }[]>([]);
    const company = loadCompanySettings();
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const newAttachments = files.map(f => ({
            name: f.name,
            size: f.size > 1024 * 1024
                ? (f.size / (1024 * 1024)).toFixed(1) + " MB"
                : (f.size / 1024).toFixed(1) + " KB",
            url: URL.createObjectURL(f),
        }));
        setAttachments(prev => [...prev, ...newAttachments]);
        setShowAttachments(true);
        e.target.value = "";
    };

    useEffect(() => {
        const all = loadPayments();
        setPayments(all);
        const target = id ? all.find(p => String(p.id) === id) : all[0];
        if (target) {
            setSelected(target);
            setCust(loadCustomer(target.customerName));
            setRefunds(loadRefunds(target.id));
        }
        else if (all.length) {
            setSelected(all[0]);
            setCust(loadCustomer(all[0].customerName));
            setRefunds(loadRefunds(all[0].id));
        }
    }, [id]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, [selected?.id]);

    const selectPayment = (p: ReceivedPayment) => {
        setSelected(p);
        setCust(loadCustomer(p.customerName));
        setRefunds(loadRefunds(p.id));
        navigate(route.paymentReceivedView.replace(":id", String(p.id)));
        setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, 50);
    };

    const deletePayment = () => {
        if (!selected || !window.confirm("Delete this payment?")) return;
        const updated = payments.filter(p => p.id !== selected.id);
        localStorage.setItem(SK, JSON.stringify(updated));
        setPayments(updated);
        if (updated.length) selectPayment(updated[0]);
        else navigate(route.paymentReceivedList);
    };

    const voidPayment = () => {
        if (!selected) return;
        if (!window.confirm(`Void payment ${selected.paymentNumber}? This cannot be undone.`)) return;
        const updated = payments.map(p => p.id === selected.id ? { ...p, status: "Void" } : p);
        localStorage.setItem(SK, JSON.stringify(updated));
        setPayments(updated);
        setSelected(s => s ? { ...s, status: "Void" } : s);
    };

    const handleSaveRefund = (refundData: Partial<Refund>) => {
        if (!selected) return;
        try {
            const allSStr = localStorage.getItem(RSK);
            let all: Refund[] = allSStr ? JSON.parse(allSStr) : [];
            if (!Array.isArray(all)) all = [];

            if (refundData.id) {
                // Edit
                all = all.map(r => r.id === refundData.id ? { ...r, ...refundData } : r);
            } else {
                // New
                const newRefund: Refund = {
                    id: Date.now(),
                    paymentId: selected.id,
                    date: refundData.date || new Date().toLocaleDateString("en-GB"),
                    mode: refundData.mode || selected.mode,
                    amount: refundData.amount || 0,
                    notes: refundData.notes || ""
                };
                all.push(newRefund);
            }
            saveAllRefunds(all);
            const currentRefunds = all.filter(r => r.paymentId === selected.id);
            setRefunds(currentRefunds);

            // Update payment status if needed
            const totalRefunded = currentRefunds.reduce((s, r) => s + r.amount, 0);
            if (totalRefunded >= selected.amount) {
                const updatedPayments = payments.map(p => p.id === selected.id ? { ...p, status: "Refunded" } : p);
                localStorage.setItem(SK, JSON.stringify(updatedPayments));
                setPayments(updatedPayments);
                setSelected(prev => prev ? { ...prev, status: "Refunded" } : prev);
            }
        } catch (e) { console.error("Refund save error", e); }
    };

    const handleDeleteRefund = (refundId: number) => {
        if (!window.confirm("Delete this refund record?")) return;
        try {
            const allSStr = localStorage.getItem(RSK);
            let all: Refund[] = allSStr ? JSON.parse(allSStr) : [];
            all = all.filter(r => r.id !== refundId);
            saveAllRefunds(all);
            const currentRefunds = all.filter(r => r.paymentId === selected?.id);
            setRefunds(currentRefunds);

            // If no more refunds, maybe revert status? (Optional)
            if (currentRefunds.length === 0 && selected?.status === "Refunded") {
                const updatedPayments = payments.map(p => p.id === selected.id ? { ...p, status: "Received" } : p);
                localStorage.setItem(SK, JSON.stringify(updatedPayments));
                setPayments(updatedPayments);
                setSelected(prev => prev ? { ...prev, status: "Received" } : prev);
            }
        } catch (e) { console.error("Refund delete error", e); }
    };

    const statusColor = (s?: string) => {
        if (!s || s === "Received") return { bg: "#dcfce7", color: "#16a34a" };
        if (s === "Void") return { bg: "#fee2e2", color: "#e41f07" };
        if (s === "Draft") return { bg: "#fef9c3", color: "#ca8a04" };
        if (s === "Refunded") return { bg: "#e0f2fe", color: "#0284c7" };
        return { bg: "#f3f4f6", color: "#6b7280" };
    };

    const filtered = payments.filter(p =>
        p.customerName.toLowerCase().includes(listSearch.toLowerCase()) ||
        p.paymentNumber.includes(listSearch)
    );



    return (
        <>
            <style>{`@media (max-width:992px){.pv-sidebar{display:${selected ? "none" : "flex"} !important;}}`}</style>

            <div className="page-wrapper">
                <div className="content" style={{ padding: 0, height: "calc(100vh - 60px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

                    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

                        {/* ── Left Sidebar ────────────────────────────── */}
                        <div className="pv-sidebar" style={{ width: sidebarVisible ? 350 : 0, borderRight: sidebarVisible ? "1px solid #e5e7eb" : "none", display: "flex", flexDirection: "column", background: "#fff", flexShrink: 0, transition: "width 0.2s ease", overflow: "hidden" }}>
                            {/* Sidebar Header */}
                            <div style={{ padding: "12px 14px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: "#111827", whiteSpace: "nowrap" }}>All Received Payments</span>
                                    <i className="ti ti-chevron-down" style={{ fontSize: 12, color: "#6b7280" }} />
                                </div>
                                <div style={{ display: "flex", gap: 6 }}>
                                    <button onClick={() => navigate(route.paymentReceivedAdd)}
                                        style={{ width: 28, height: 28, borderRadius: 5, border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#374151" }}>
                                        <i className="ti ti-plus" style={{ fontSize: 14 }} />
                                    </button>
                                    <button style={{ width: 28, height: 28, borderRadius: 5, border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#374151" }}>
                                        <i className="ti ti-dots" style={{ fontSize: 14 }} />
                                    </button>
                                </div>
                            </div>
                            {/* Search */}
                            <div style={{ padding: "8px 12px", borderBottom: "1px solid #f3f4f6" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 5, padding: "5px 10px" }}>
                                    <i className="ti ti-search" style={{ fontSize: 13, color: "#9ca3af" }} />
                                    <input value={listSearch} onChange={e => setListSearch(e.target.value)} placeholder="Search payments..."
                                        style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, flex: 1, color: "#374151" }} />
                                </div>
                            </div>
                            {/* Payment List */}
                            <div style={{ flex: 1, overflowY: "auto" }}>
                                {filtered.length === 0 ? (
                                    <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "#9ca3af" }}>No payments found</div>
                                ) : filtered.map(p => {
                                    const sc = statusColor(p.status);
                                    const isActive = selected?.id === p.id;
                                    return (
                                        <div key={p.id} onClick={() => selectPayment(p)}
                                            className={`pv-list-item${isActive ? " active" : ""}`}
                                            style={{ padding: "11px 14px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", borderLeft: isActive ? "3px solid #e41f07" : "3px solid transparent" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                    <input type="checkbox" style={{ width: 13, height: 13, accentColor: "#e41f07" }} onClick={e => e.stopPropagation()} />
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{p.customerName}</span>
                                                </div>
                                                <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{fmt(p.amount)}</span>
                                            </div>
                                            <div style={{ fontSize: 12, color: "#6b7280", paddingLeft: 19, marginBottom: 4 }}>
                                                {p.paymentNumber} &bull; {p.date}
                                            </div>
                                            <div style={{ paddingLeft: 19, display: "flex", alignItems: "center", gap: 6 }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 3, padding: "1px 6px", background: sc.bg, color: sc.color }}>
                                                    {p.status === "Received" ? "PAID" : (p.status || "PAID").toUpperCase()}
                                                </span>
                                                <span style={{ fontSize: 12, color: "#374151" }}>{p.mode}</span>
                                                <i className="ti ti-copy" style={{ fontSize: 12, color: "#9ca3af", cursor: "pointer" }}
                                                    onClick={e => { e.stopPropagation(); navigator.clipboard?.writeText(p.paymentNumber); }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Right Panel ─────────────────────────────── */}
                        {selected ? (
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f0f2f5", overflow: "hidden" }}>

                                {/* Header matched to screenshot */}
                                <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>Location: {selected.location || "Head Office"}</div>
                                        <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{selected.paymentNumber}</div>
                                    </div>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                        {/* Hidden file input */}
                                        <input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={handleFileAttach} />

                                        {/* Paperclip — Attachments (outline button) */}
                                        <div style={{ position: "relative" }}>
                                            <button
                                                onClick={() => { fileInputRef.current?.click(); setShowAttachments(true); }}
                                                title="Attach files"
                                                style={{ width: 34, height: 34, borderRadius: 6, border: `1.5px solid ${showAttachments ? "#e41f07" : "#d1d5db"}`, background: showAttachments ? "#fff1f0" : "#fff", color: showAttachments ? "#e41f07" : "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <i className="ti ti-paperclip" style={{ fontSize: 17 }} />
                                            </button>
                                            {attachments.length > 0 && (
                                                <span style={{ position: "absolute", top: -5, right: -5, background: "#e41f07", color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: "50%", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                                                    {attachments.length}
                                                </span>
                                            )}
                                        </div>

                                        {/* Close (outline button) */}
                                        <button
                                            onClick={() => navigate(route.paymentReceivedList)}
                                            title="Close"
                                            style={{ width: 34, height: 34, borderRadius: 6, border: "1.5px solid #d1d5db", background: "#fff", color: "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e41f07"; (e.currentTarget as HTMLButtonElement).style.color = "#e41f07"; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#d1d5db"; (e.currentTarget as HTMLButtonElement).style.color = "#6b7280"; }}>
                                            <i className="ti ti-x" style={{ fontSize: 17 }} />
                                        </button>
                                    </div>
                                </div>

                                {/* Action bar */}
                                <div className="pv-actions" style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "8px 24px", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                    <button className="pv-action-btn" onClick={() => setSidebarVisible(!sidebarVisible)} title={sidebarVisible ? "Hide List" : "Show List"}>
                                        <i className={`ti ${sidebarVisible ? "ti-layout-sidebar-left-collapse" : "ti-layout-sidebar-right-collapse"}`} style={{ fontSize: 16 }} />
                                    </button>
                                    <div style={{ height: 20, width: 1, background: "#e5e7eb", margin: "0 4px" }} />
                                    <button className="pv-action-btn" onClick={() => navigate(route.paymentReceivedAdd + "?edit=" + selected.id)}>
                                        <i className="ti ti-edit" style={{ fontSize: 14 }} /> Edit
                                    </button>
                                    <SendDropdown payment={selected} cust={cust} />
                                    <PDFDropdown payment={selected} cust={cust} company={company} />
                                    {selected.status !== "Refunded" && selected.status !== "Void" && (
                                        <button className="pv-action-btn" onClick={() => { setEditingRefund(null); setShowRefundModal(true); }} style={{ color: "#e41f07" }}>
                                            <i className="ti ti-receipt-refund" style={{ fontSize: 14 }} /> Refund
                                        </button>
                                    )}
                                    <button className="pv-action-btn" onClick={deletePayment} style={{ color: "#374151" }}>
                                        <i className="ti ti-trash" style={{ fontSize: 14 }} /> Delete
                                    </button>
                                    <MoreDropdown payment={selected} onDelete={deletePayment} onVoid={voidPayment} />
                                </div>

                                {/* Refund History section (Pinned to Top) */}
                                <div style={{ padding: "24px 24px 0 24px", flexShrink: 0 }}>
                                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 0, background: "#fff", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                        <div onClick={() => setShowRefundTable(!showRefundTable)}
                                            style={{ padding: "0 24px", borderBottom: showRefundTable ? "1px solid #f3f4f6" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", cursor: "pointer", height: 54 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10, height: "100%" }}>
                                                <div style={{ position: "relative", height: "100%", display: "flex", alignItems: "center", padding: "0 2px" }}>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: "#111827", letterSpacing: "-0.2px" }}>Refund History</span>
                                                    <span style={{ marginLeft: 8, background: "#fff1f0", color: "#e41f07", fontSize: 12, fontWeight: 700, borderRadius: 12, padding: "2px 8px", minWidth: 20, textAlign: "center" }}>{refunds.length}</span>
                                                    {showRefundTable && <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 3, background: "#e41f07", borderRadius: "3px 3px 0 0" }} />}
                                                </div>
                                            </div>
                                            <i className={showRefundTable ? "ti ti-chevron-down" : "ti ti-chevron-right"} style={{ fontSize: 16, color: "#64748b" }} />
                                        </div>
                                        {showRefundTable && (
                                            <div style={{ padding: "0 0 8px 0" }}>
                                                <table className="pv-refund-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                            <th style={{ padding: "14px 24px", textAlign: "left", fontSize: 13, color: "#64748b", fontWeight: 600 }}>Date</th>
                                                            <th style={{ padding: "14px 24px", textAlign: "left", fontSize: 13, color: "#64748b", fontWeight: 600 }}>Payment Mode</th>
                                                            <th style={{ padding: "14px 24px", textAlign: "left", fontSize: 13, color: "#64748b", fontWeight: 600 }}>Amount Refunded</th>
                                                            <th style={{ padding: "14px 24px", textAlign: "right" }}></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {refunds.length > 0 ? (
                                                            refunds.map(r => (
                                                                <tr key={r.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                                                                    <td style={{ padding: "16px 24px", fontSize: 14, color: "#1f2937" }}>{r.date}</td>
                                                                    <td style={{ padding: "16px 24px", fontSize: 14, color: "#1f2937" }}>{r.mode}</td>
                                                                    <td style={{ padding: "16px 24px", fontSize: 14, fontWeight: 500, color: "#111827" }}>{fmt(r.amount)}</td>
                                                                    <td style={{ padding: "16px 24px", textAlign: "right", color: "#64748b" }}>
                                                                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 16 }}>
                                                                            <i className="ti ti-pencil" onClick={(e) => { e.stopPropagation(); setEditingRefund(r); setShowRefundModal(true); }} style={{ fontSize: 18, cursor: "pointer" }} />
                                                                            <i className="ti ti-trash" onClick={(e) => { e.stopPropagation(); handleDeleteRefund(r.id); }} style={{ fontSize: 18, cursor: "pointer" }} />
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={4} style={{ padding: "32px 24px", textAlign: "center", fontSize: 14, color: "#94a3b8" }}>
                                                                    No refunds have been initiated for this payment.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Receipt scroll area */}
                                <div ref={scrollRef} className="pv-receipt-area" style={{ flex: 1, overflowY: "auto", background: "#f0f2f5", padding: "24px", display: "flex", flexDirection: "column", alignItems: "stretch", gap: 24, scrollBehavior: "smooth" }}>


                                    <div className="pv-receipt" style={{ position: "relative", background: "#fff", width: "100%", minHeight: 1100, fontSize: 14, lineHeight: 1.5, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", flexShrink: 0, borderRadius: 0 }}>

                                        {/* Print-only header bar */}
                                        <div className="pv-print-header" style={{ display: "none", background: "#e41f07", color: "#fff", textAlign: "center", padding: "10px", fontWeight: 700, fontSize: 14, letterSpacing: 2 }}>
                                            PAYMENT RECEIPT
                                        </div>
                                        <style>{`@media print { .pv-print-header { display: block !important; } }`}</style>

                                        {/* Status ribbon */}
                                        <div style={{ position: "absolute", top: 0, left: 0, width: 110, height: 110, overflow: "hidden", pointerEvents: "none", zIndex: 10 }}>
                                            <div style={{
                                                position: "absolute", top: 22, left: -42, width: 160,
                                                background: selected.status === "Void" ? "#6b7280" :
                                                    selected.status === "Refunded" ? "#0284c7" :
                                                        selected.status === "Draft" ? "#ca8a04" : "#27ae60",
                                                color: "#fff", textAlign: "center", transform: "rotate(-45deg)", padding: "6px 0", fontSize: 10, fontWeight: 700, letterSpacing: 1
                                            }}>
                                                {selected.status === "Received" ? "PAID" : selected.status.toUpperCase()}
                                            </div>
                                        </div>

                                        <div className="pv-receipt-header-row" style={{ padding: "40px 48px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: "#fff" }}>
                                            <div style={{ flex: 1, paddingLeft: 60 }}>
                                                <div style={{ fontSize: 24, fontWeight: 800, color: "#1a1a1a", marginBottom: 8, letterSpacing: -0.5 }}>{company.name}</div>
                                                <div style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.6, maxWidth: 300 }}>
                                                    {company.address}<br />
                                                    <strong>Phone:</strong> {company.phone}<br />
                                                    <strong>Email:</strong> {company.email}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: "right", flex: 1 }}>
                                                <div style={{ fontSize: 24, fontWeight: 700, color: "#e41f07", letterSpacing: 1, marginBottom: 8 }}>PAYMENT RECEIPT</div>
                                                <div style={{ fontSize: 15, fontWeight: 600, color: "#374151" }}>Receipt # {selected.paymentNumber}</div>
                                                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>Date: <strong>{selected.date}</strong></div>
                                            </div>
                                        </div>

                                        <div style={{ margin: "0 48px", borderBottom: "1px solid #e5e7eb" }} />

                                        {/* Section 2: Payment Info + Amount Box */}
                                        <div className="pv-receipt-header-row" style={{ padding: "32px 48px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 40 }}>
                                            <div style={{ flex: 1 }}>
                                                <div className="pv-receipt-row" style={{ display: "flex", padding: "10px 0", borderBottom: "1px solid #f9fafb" }}>
                                                    <div className="pv-label-col" style={{ width: 160, flexShrink: 0, fontSize: 13, color: "#6b7280" }}>Payment Date</div>
                                                    <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{selected.date}</div>
                                                </div>
                                                <div className="pv-receipt-row" style={{ display: "flex", padding: "10px 0", borderBottom: "1px solid #f9fafb" }}>
                                                    <div className="pv-label-col" style={{ width: 160, flexShrink: 0, fontSize: 13, color: "#6b7280" }}>Reference Number</div>
                                                    <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{selected.referenceNumber || "—"}</div>
                                                </div>
                                                <div className="pv-receipt-row" style={{ display: "flex", padding: "10px 0", borderBottom: "1px solid #f9fafb" }}>
                                                    <div className="pv-label-col" style={{ width: 160, flexShrink: 0, fontSize: 13, color: "#6b7280" }}>Payment Mode</div>
                                                    <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{selected.mode}</div>
                                                </div>
                                                <div className="pv-receipt-row" style={{ display: "flex", padding: "12px 0 0" }}>
                                                    <div className="pv-label-col" style={{ width: 160, flexShrink: 0, fontSize: 13, color: "#6b7280" }}>Amount In Words</div>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", fontStyle: "italic", flex: 1 }}>{amountToWords(selected.amount)}</div>
                                                </div>
                                            </div>
                                            <div className="pv-amount-box" style={{ flexShrink: 0, width: 210, background: "#4a7c59", borderRadius: 0, padding: "24px 16px", textAlign: "center", color: "#fff", alignSelf: "center" }}>
                                                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12, opacity: 0.9 }}>Amount Received</div>
                                                <div className="pv-amount-val" style={{ fontSize: 24, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                                                    <span style={{ fontSize: 18, fontWeight: 400, color: "rgba(255,255,255,0.8)" }}>₹</span>
                                                    <span>{fmtNum(selected.amount)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section 3: Payment For */}
                                        <div style={{ padding: "24px 48px 24px", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
                                            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 14 }}>Payment for</div>
                                            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e5e7eb" }}>
                                                <thead>
                                                    <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                                                        {["Invoice Number", "Invoice Date", "Invoice Amount", "Payment Amount"].map((h, i) => (
                                                            <th key={h} style={{
                                                                padding: "10px 14px",
                                                                fontSize: 13,
                                                                color: "#6b7280",
                                                                fontWeight: 600,
                                                                textAlign: i > 1 ? "right" : "left",
                                                                borderRight: i < 3 ? "1px solid #e5e7eb" : "none"
                                                            }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selected.invoiceNumber ? (
                                                        <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                                                            <td style={{ padding: "12px 14px", fontSize: 14, color: "#e41f07", fontWeight: 500, borderRight: "1px solid #e5e7eb" }}>{selected.invoiceNumber}</td>
                                                            <td style={{ padding: "12px 14px", fontSize: 14, color: "#374151", borderRight: "1px solid #e5e7eb" }}>{selected.date}</td>
                                                            <td style={{ padding: "12px 14px", fontSize: 14, color: "#374151", textAlign: "right", borderRight: "1px solid #e5e7eb" }}>{fmt(selected.amount)}</td>
                                                            <td style={{ padding: "12px 14px", fontSize: 14, color: "#111827", textAlign: "right", fontWeight: 600 }}>{fmt(selected.amount)}</td>
                                                        </tr>
                                                    ) : (
                                                        <tr><td colSpan={4} style={{ padding: "24px", textAlign: "center", fontSize: 14, color: "#9ca3af" }}>No invoice applied</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                            {selected.unusedAmount > 0 && (
                                                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                                                    <div style={{ padding: "10px 16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 4, display: "flex", gap: 40 }}>
                                                        <span style={{ fontSize: 14, color: "#92400e" }}>Amount in Excess</span>
                                                        <span style={{ fontSize: 14, fontWeight: 700, color: "#d97706" }}>{fmt(selected.unusedAmount)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Section 4: Received From + Signature */}
                                        <div className="pv-receipt-header-row" style={{ padding: "40px 48px 60px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: "#fff", flex: 1 }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 12, color: "#9ca3af", textTransform: "uppercase", fontWeight: 600, letterSpacing: 1.2, marginBottom: 12 }}>Received From</div>
                                                <div style={{ fontSize: 18, fontWeight: 700, color: "#e41f07", marginBottom: 8 }}>{selected.customerName || "Customer"}</div>
                                                <div style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.7 }}>
                                                    {cust?.companyName && <div style={{ fontWeight: 600 }}>{cust.companyName}</div>}
                                                    {cust?.address && <div>{cust.address}</div>}
                                                    <div>{cust?.city || ""} {cust?.state || ""} {cust?.zipCode || ""}</div>
                                                    <div>{cust?.country || ""}</div>
                                                    {(cust?.workPhone || cust?.email) && (
                                                        <div style={{ marginTop: 8, padding: "8px 12px", background: "#f9fafb", borderRadius: 4, display: "inline-block", fontSize: 12 }}>
                                                            {cust?.workPhone} {cust?.email && <>&bull; {cust.email}</>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: "right", marginTop: 80, minWidth: 220 }}>
                                                <div style={{ borderBottom: "2px solid #e5e7eb", marginBottom: 10, width: "100%" }} />
                                                <div style={{ fontSize: 12, color: "#9ca3af", textTransform: "uppercase", fontWeight: 600, letterSpacing: 1 }}>Authorized Signature</div>
                                            </div>
                                        </div>

                                        {/* Attachments section */}
                                        {showAttachments && (
                                            <div style={{ borderTop: "1px solid #e5e7eb", padding: "20px 48px 28px" }}>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
                                                        Attachments
                                                        <span style={{ marginLeft: 8, background: "#eff6ff", color: "#3b82f6", fontSize: 12, fontWeight: 700, borderRadius: 12, padding: "2px 8px" }}>{attachments.length}</span>
                                                    </div>
                                                    <button onClick={() => fileInputRef.current?.click()}
                                                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 5, fontSize: 13, color: "#374151", cursor: "pointer", fontWeight: 500 }}>
                                                        <i className="ti ti-plus" style={{ fontSize: 13 }} /> Add File
                                                    </button>
                                                </div>
                                                {attachments.length === 0 ? (
                                                    <div style={{ textAlign: "center", padding: "20px 0", color: "#9ca3af", fontSize: 13 }}>No attachments yet</div>
                                                ) : (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                                        {attachments.map((a, i) => (
                                                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 6, padding: "10px 14px" }}>
                                                                <i className="ti ti-file" style={{ fontSize: 20, color: "#6b7280", flexShrink: 0 }} />
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ fontSize: 13, fontWeight: 500, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                                                                    <div style={{ fontSize: 12, color: "#9ca3af" }}>{a.size}</div>
                                                                </div>
                                                                <a href={a.url} download={a.name} style={{ color: "#3b82f6", fontSize: 13, cursor: "pointer", textDecoration: "none", flexShrink: 0 }} title="Download">
                                                                    <i className="ti ti-download" style={{ fontSize: 16 }} />
                                                                </a>
                                                                <i className="ti ti-trash" onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                                                                    style={{ fontSize: 16, color: "#e41f07", cursor: "pointer", flexShrink: 0 }} title="Remove" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                    </div>

                                    {/* PDF Template footer */}
                                    <div style={{ marginTop: 10, fontSize: 13, color: "#6b7280", paddingLeft: 2 }}>
                                        PDF Template : <span style={{ color: "#374151", fontWeight: 500 }}>'Elite Template'</span>{" "}
                                        <span style={{ color: "#e41f07", cursor: "pointer" }}
                                            onClick={() => setShowTemplateModal(true)}
                                            onMouseEnter={e => (e.currentTarget as HTMLSpanElement).style.textDecoration = "underline"}
                                            onMouseLeave={e => (e.currentTarget as HTMLSpanElement).style.textDecoration = "none"}>
                                            Change
                                        </span>
                                    </div>


                                    <TemplateModal isOpen={showTemplateModal} onClose={() => setShowTemplateModal(false)} />
                                    <RefundModal
                                        isOpen={showRefundModal}
                                        onClose={() => { setShowRefundModal(false); setEditingRefund(null); }}
                                        onSave={handleSaveRefund}
                                        payment={selected}
                                        refundToEdit={editingRefund}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 14 }}>
                                Select a payment to view
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default PaymentView;