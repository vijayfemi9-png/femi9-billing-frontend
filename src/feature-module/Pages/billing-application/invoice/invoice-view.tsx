// @ts-nocheck
// Invoice View Component - Fixed Dropdown Clipping
// Force reload invoice-view.tsx
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import "./invoice.scss";
import { all_routes } from "../../../../routes/all_routes";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Invoice {
    id: number; invoiceNumber: string; date: string; orderNumber: string;
    customerName: string; status: "Draft" | "Sent" | "Overdue" | "Paid" | "Void";
    dueDate: string; amount: number; isDeleted?: boolean;
}
interface LineItem {
    id?: number; itemName?: string; description?: string;
    qty: number; rate: number; tax: number; amount: number;
}
interface ActivityEntry {
    id: number;
    icon: "invoice_created" | "invoice_updated" | "contact_created" | "status_changed" | "payment" | "void";
    user: string;
    datetime: string;
    message: string;
    highlights: string[];
}

// ── Storage ───────────────────────────────────────────────────────────────────
const SK = "billing_invoices";
const SK_ITEMS = (id: number) => `billing_invoice_items_${id}`;
const SK_ACTIVITY = (id: number) => `billing_invoice_activity_${id}`;
const SK_PAYMENTS = (id: number) => `billing_invoice_payments_${id}`;

interface PaymentRecord {
    id: number;
    date: string;
    paymentNumber: string;
    reference: string;
    status: string;
    paymentMode: string;
    amount: number;
}

function loadPayments(id: number): PaymentRecord[] {
    try { return JSON.parse(localStorage.getItem(SK_PAYMENTS(id)) || "[]"); } catch { return []; }
}
function savePayments(id: number, data: PaymentRecord[]) {
    try { localStorage.setItem(SK_PAYMENTS(id), JSON.stringify(data)); } catch { }
}
function loadActivity(id: number): ActivityEntry[] {
    try { return JSON.parse(localStorage.getItem(SK_ACTIVITY(id)) || "[]"); } catch { return []; }
}
function saveActivity(id: number, data: ActivityEntry[]) {
    try { localStorage.setItem(SK_ACTIVITY(id), JSON.stringify(data)); } catch { }
}
function nowDatetime(): string {
    const d = new Date();
    const date = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    const h = d.getHours(); const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${date} ${String(h12).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} ${ampm}`;
}
function todayStr() {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
const SEED: Invoice[] = [
    { id: 1, invoiceNumber: "INV-000001", date: todayStr(), orderNumber: "ORD-999", customerName: "vijay E", status: "Draft", dueDate: todayStr(), amount: 1500 },
    { id: 2, invoiceNumber: "INV-000002", date: todayStr(), orderNumber: "ORD-1000", customerName: "John Doe", status: "Sent", dueDate: todayStr(), amount: 2500 },
];
function getAllRaw(): Invoice[] {
    try {
        const s = localStorage.getItem(SK);
        if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length) return p; }
        localStorage.setItem(SK, JSON.stringify(SEED)); return SEED;
    } catch { return SEED; }
}
function loadItems(id: number): LineItem[] {
    try { return JSON.parse(localStorage.getItem(SK_ITEMS(id)) || "[]"); } catch { return []; }
}
function saveAll(data: Invoice[]) { try { localStorage.setItem(SK, JSON.stringify(data)); } catch { } }

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2 });

const SC = {
    Draft: { bg: "#f5f5f5", color: "#666", border: "#ddd" },
    Sent: { bg: "#e8f4fd", color: "#1a6fb5", border: "#b3d7f5" },
    Overdue: { bg: "#fdecea", color: "#c0392b", border: "#f5b7b1" },
    Paid: { bg: "#e8f8ef", color: "#1e8449", border: "#a9dfbf" },
    Void: { bg: "#f5f5f5", color: "#999", border: "#ddd" },
} as const;

// Days overdue (negative = not overdue)
function daysOverdue(dueDateStr: string): number {
    try {
        const [dd, mm, yyyy] = dueDateStr.split("/");
        const due = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        const today = new Date(); today.setHours(0, 0, 0, 0); due.setHours(0, 0, 0, 0);
        return Math.floor((today.getTime() - due.getTime()) / 86400000);
    } catch { return 0; }
}



const ACTIVITY_ICON: Record<ActivityEntry["icon"], { bg: string; color: string; icon: string }> = {
    invoice_created: { bg: "#fef9c3", color: "#ca8a04", icon: "ti-file-invoice" },
    invoice_updated: { bg: "#fff3cd", color: "#f59e0b", icon: "ti-edit" },
    contact_created: { bg: "#dbeafe", color: "#3b82f6", icon: "ti-message-circle" },
    status_changed: { bg: "#fff3cd", color: "#f59e0b", icon: "ti-edit" },
    payment: { bg: "#dcfce7", color: "#16a34a", icon: "ti-circle-check" },
    void: { bg: "#fee2e2", color: "#dc2626", icon: "ti-ban" },
};


// ── Delete Modal ──────────────────────────────────────────────────────────────
const DeleteConfirm: React.FC<{ num: string; onConfirm: () => void; onCancel: () => void }> = ({ num, onConfirm, onCancel }) => (
    <div onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
        style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#fff", borderRadius: 12, width: 380, padding: "32px 28px", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fff0ef", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <i className="ti ti-trash" style={{ fontSize: 24, color: "#e41f07" }} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete Invoice?</div>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 24 }}>"<strong>{num}</strong>" will be permanently removed.</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
                <button onClick={onCancel} style={{ padding: "8px 22px", border: "1px solid #ddd", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 13 }}>Cancel</button>
                <button onClick={onConfirm} style={{ padding: "8px 22px", border: "none", borderRadius: 4, background: "#e41f07", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Delete</button>
            </div>
        </div>
    </div>
);

// ── Record Payment Modal ──────────────────────────────────────────────────────
const RecordPaymentModal: React.FC<{ invoice: Invoice; grandTotal: number; onClose: () => void; onSave: (payment: PaymentRecord) => void }> =
    ({ invoice, grandTotal, onClose, onSave }) => {

        const today = todayStr();
        const [form, setForm] = useState({
            customerName: invoice.customerName,
            paymentNumber: "1",
            amount: grandTotal > 0 ? String(Math.round(grandTotal)) : "",
            bankCharges: "",
            taxDeducted: "none" as "none" | "tds",
            paymentDate: today,
            paymentMode: "Cash",
            referenceDate: "",
            depositTo: "Petty Cash",
        });
        const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

        const [showCustDetail, setShowCustDetail] = useState(false);

        const [showPan, setShowPan] = useState(false);
        const [panValue, setPanValue] = useState("");
        const [panPos, setPanPos] = useState({ top: 0, left: 0 });
        const panBtnRef = useRef<HTMLButtonElement>(null);

        const handleSave = () => {
            const existing = loadPayments(invoice.id);
            const newPayment: PaymentRecord = {
                id: Date.now(),
                date: form.paymentDate || todayStr(),
                paymentNumber: form.paymentNumber || String(existing.length + 1),
                reference: "",
                status: "Paid",
                paymentMode: form.paymentMode,
                amount: parseFloat(form.amount) || 0,
            };
            savePayments(invoice.id, [...existing, newPayment]);
            onSave(newPayment);
            onClose();
        };

        const lbl = (text: string, req = false) => (
            <div className="rp-lbl" style={{ fontSize: 13, color: req ? "#e41f07" : "#333", fontWeight: 500, textAlign: "right", paddingRight: 16, paddingTop: 7, lineHeight: 1.4 }}>
                {text}{req && <span style={{ color: "#e41f07" }}>*</span>}
            </div>
        );

        const inp = (value: string, onChange: (v: string) => void, type = "text", placeholder = "") => (
            <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
                style={{ width: "100%", border: "1px solid #d0d0d0", borderRadius: 6, padding: "7px 12px", fontSize: 13, outline: "none", background: "#fff", color: "#333" }}
                onFocus={e => e.target.style.borderColor = "#e41f07"}
                onBlur={e => e.target.style.borderColor = "#d0d0d0"} />
        );

        const sel = (value: string, onChange: (v: string) => void, options: string[]) => (
            <select value={value} onChange={e => onChange(e.target.value)}
                style={{ width: "100%", border: "1px solid #d0d0d0", borderRadius: 6, padding: "7px 12px", fontSize: 13, outline: "none", background: "#fff", color: "#333", appearance: "auto" }}>
                {options.map(o => <option key={o}>{o}</option>)}
            </select>
        );

        return (
            <div className="rp-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}
                style={{ position: "fixed", inset: 0, zIndex: 4000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                <div className="rp-modal-box" style={{ background: "#fff", width: "100%", maxWidth: 820, maxHeight: "90vh", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", position: "relative" }}>

                    {/* Header */}
                    <div style={{ padding: "16px 24px", borderBottom: "1px solid #e8e8e8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>Payment for {invoice.invoiceNumber}</h3>
                        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#999", padding: 4 }}>
                            <i className="ti ti-x" style={{ fontSize: 20 }} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="rp-body" style={{ flex: 1, overflowY: "auto", background: "#f5f6f8", padding: "24px 32px" }}>

                        {/* Section 1 */}
                        <div className="rp-section" style={{ background: "#fff", borderRadius: 8, padding: "24px 28px", marginBottom: 16 }}>

                            {/* Customer Name */}
                            <div className="rp-row rp-row-3col" style={{ display: "grid", gridTemplateColumns: "160px 1fr auto", gap: 12, alignItems: "start", marginBottom: 20 }}>
                                {lbl("Customer\nName", true)}
                                {inp(form.customerName, v => set("customerName", v))}
                                <button onClick={() => setShowCustDetail(true)} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                                    {form.customerName}'s Details <i className="ti ti-chevron-right" style={{ fontSize: 12 }} />
                                </button>
                            </div>

                            {/* Payment # */}
                            <div className="rp-row rp-row-3col" style={{ display: "grid", gridTemplateColumns: "160px 280px 1fr", gap: 12, alignItems: "start", marginBottom: 28 }}>
                                {lbl("Payment #", true)}
                                <div style={{ position: "relative" }}>
                                    {inp(form.paymentNumber, v => set("paymentNumber", v))}
                                    <i className="ti ti-settings" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#aaa", cursor: "pointer" }} />
                                </div>
                                <div />
                            </div>

                            {/* Amount + Bank Charges */}
                            <div className="rp-row rp-row-4col" style={{ display: "grid", gridTemplateColumns: "160px 1fr 180px 1fr", gap: 12, alignItems: "start", marginBottom: 6 }}>
                                {lbl("Amount\nReceived\n(INR)", true)}
                                <div>
                                    {inp(form.amount, v => set("amount", v), "number")}
                                </div>
                                <div className="rp-lbl" style={{ fontSize: 13, color: "#333", fontWeight: 500, textAlign: "right", paddingRight: 16, paddingTop: 7 }}>Bank Charges<br />(if any)</div>
                                {inp(form.bankCharges, v => set("bankCharges", v), "number")}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, marginBottom: 20 }}>
                                <div />
                                <div style={{ fontSize: 12, color: "#333" }}>
                                    PAN:{" "}
                                    <button ref={panBtnRef} onClick={() => {
                                        if (panBtnRef.current) {
                                            const r = panBtnRef.current.getBoundingClientRect();
                                            setPanPos({ top: r.top - 8, left: r.left });
                                        }
                                        setShowPan(p => !p);
                                    }} style={{ background: "none", border: "none", padding: 0, color: "#e41f07", cursor: "pointer", fontWeight: 500, fontSize: 12 }}>
                                        Add PAN
                                    </button>
                                </div>
                            </div>

                            {/* Tax deducted */}
                            <div className="rp-row rp-row-2col" style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "center", marginBottom: 20 }}>
                                <div style={{ fontSize: 13, color: "#333", fontWeight: 500, textAlign: "right", paddingRight: 16 }}>Tax deducted?</div>
                                <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                                    {(["none", "tds"] as const).map((val, i) => (
                                        <label key={val} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 13, color: "#333" }}>
                                            <input type="radio" name="taxDeducted" value={val}
                                                checked={form.taxDeducted === val}
                                                onChange={() => set("taxDeducted", val)}
                                                style={{ accentColor: "#e41f07", width: 15, height: 15 }} />
                                            {val === "none" ? "No Tax deducted" : "Yes, TDS (Income Tax)"}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Invoice Details Table */}
                            <div className="rp-table-wrap" style={{ marginTop: 32 }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginBottom: 16 }}>Payment for</div>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ borderBottom: "1px solid #e8e8e8", background: "#fcfdfe" }}>
                                            <th style={{ textAlign: "left", padding: "10px 16px", color: "#666", fontWeight: 600 }}>Date</th>
                                            <th style={{ textAlign: "left", padding: "10px 16px", color: "#666", fontWeight: 600 }}>Invoice Number</th>
                                            <th style={{ textAlign: "right", padding: "10px 16px", color: "#666", fontWeight: 600 }}>Invoice Amount</th>
                                            <th style={{ textAlign: "right", padding: "10px 16px", color: "#666", fontWeight: 600 }}>Amount Due</th>
                                            <th style={{ textAlign: "right", padding: "10px 16px", color: "#666", fontWeight: 600 }}>Payment</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style={{ padding: "14px 16px", color: "#333" }}>{invoice.date}</td>
                                            <td style={{ padding: "14px 16px", color: "#2563eb", fontWeight: 500 }}>{invoice.invoiceNumber}</td>
                                            <td style={{ padding: "14px 16px", textAlign: "right", color: "#333" }}>{fmt(grandTotal)}</td>
                                            <td style={{ padding: "14px 16px", textAlign: "right", color: "#333" }}>{fmt(grandTotal)}</td>
                                            <td style={{ padding: "14px 16px", textAlign: "right" }}>
                                                <input type="text" readOnly value={form.amount} style={{ width: 100, border: "1px solid #d0d0d0", borderRadius: 4, padding: "5px 10px", textAlign: "right", fontSize: 13, background: "#f9f9f9" }} />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={{ height: 1, background: "#e0e0e0", margin: "0 0 16px" }} />

                        {/* Section 2 */}
                        <div className="rp-section" style={{ background: "#fff", borderRadius: 8, padding: "24px 28px" }}>

                            {/* Payment Date + Payment Mode */}
                            <div className="rp-row rp-row-4col" style={{ display: "grid", gridTemplateColumns: "160px 1fr 160px 1fr", gap: 12, alignItems: "start", marginBottom: 20 }}>
                                {lbl("Payment Date", true)}
                                {inp(form.paymentDate, v => set("paymentDate", v), "text", "dd/MM/yyyy")}
                                <div className="rp-lbl" style={{ fontSize: 13, color: "#333", fontWeight: 500, textAlign: "right", paddingRight: 16, paddingTop: 7 }}>Payment Mode</div>
                                {sel(form.paymentMode, v => set("paymentMode", v), ["Cash", "Bank Transfer", "Cheque", "UPI", "Credit Card", "Debit Card", "Net Banking", "Advance Payment"])}
                            </div>

                            {/* Reference Date + Deposit To */}
                            <div className="rp-row rp-row-4col" style={{ display: "grid", gridTemplateColumns: "160px 1fr 160px 1fr", gap: 12, alignItems: "start" }}>
                                {lbl("Payment\nReference", false)}
                                {inp(form.referenceDate, v => set("referenceDate", v), "text", "dd/MM/yyyy")}
                                <div className="rp-lbl" style={{ fontSize: 13, color: "#e41f07", fontWeight: 500, textAlign: "right", paddingRight: 16, paddingTop: 7 }}>Deposit To<span style={{ color: "#e41f07" }}>*</span></div>
                                {sel(form.depositTo, v => set("depositTo", v), ["Petty Cash", "Bank Account", "HDFC Bank", "SBI Account", "ICICI Account"])}
                            </div>
                        </div>
                    </div>

                    {/* Add PAN Popover */}
                    {showPan && (
                        <>
                            <div style={{ position: "fixed", inset: 0, zIndex: 5000 }} onClick={() => setShowPan(false)} />
                            <div style={{ position: "fixed", top: panPos.top - 170, left: panPos.left, zIndex: 5001, background: "#fff", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", width: 300, overflow: "hidden" }}>
                                {/* Popover header */}
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
                                    <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Add PAN</span>
                                    <button onClick={() => setShowPan(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 2, display: "flex", alignItems: "center" }}>
                                        <i className="ti ti-x" style={{ fontSize: 18 }} />
                                    </button>
                                </div>
                                {/* Popover body */}
                                <div style={{ padding: "14px 16px" }}>
                                    <input
                                        type="text"
                                        value={panValue}
                                        onChange={e => setPanValue(e.target.value.toUpperCase())}
                                        placeholder="Enter PAN number"
                                        style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 12px", fontSize: 13, outline: "none", color: "#111827", letterSpacing: 1 }}
                                        onFocus={e => e.target.style.borderColor = "#e41f07"}
                                        onBlur={e => e.target.style.borderColor = "#d1d5db"}
                                    />
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginTop: 10, fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
                                        <i className="ti ti-info-circle" style={{ fontSize: 14, color: "#6b7280", flexShrink: 0, marginTop: 1 }} />
                                        This PAN will be updated in contact and further transactions.
                                    </div>
                                </div>
                                {/* Popover footer */}
                                <div style={{ padding: "10px 16px 14px" }}>
                                    <button onClick={() => setShowPan(false)} style={{ background: "#e41f07", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                                        Save
                                    </button>
                                </div>
                                {/* Arrow */}
                                <div style={{ position: "absolute", bottom: -8, left: 24, width: 16, height: 16, background: "#fff", borderRight: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb", transform: "rotate(45deg)" }} />
                            </div>
                        </>
                    )}

                    {/* Customer Details Side Panel */}
                    {showCustDetail && (
                        <div className="rp-details-panel" style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 420, background: "#fff", zIndex: 20, boxShadow: "-8px 0 32px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column" }}>
                            <style>{`@keyframes slideInCust { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
                            <div style={{ animation: "slideInCust 0.22s ease-out", display: "flex", flexDirection: "column", height: "100%" }}>

                                {/* Panel Header */}
                                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                        <div style={{ width: 48, height: 48, borderRadius: 10, background: "#eef2ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
                                            {form.customerName[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>Customer</div>
                                            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: 7 }}>
                                                {form.customerName}
                                                <i className="ti ti-external-link" style={{ fontSize: 13, color: "#e41f07", cursor: "pointer" }} onClick={() => window.open(all_routes.customerList, "_blank")} />
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowCustDetail(false)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <i className="ti ti-x" style={{ fontSize: 20 }} />
                                    </button>
                                </div>

                                {/* Contact info */}
                                <div style={{ padding: "16px 20px 0", borderBottom: "1px solid #f3f4f6" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
                                        <i className="ti ti-user" style={{ fontSize: 15, color: "#9ca3af" }} /> {form.customerName}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
                                        <i className="ti ti-mail" style={{ fontSize: 15, color: "#9ca3af" }} /> anandh.femi9@gmail.com
                                    </div>
                                </div>



                                {/* Scrollable content */}
                                <div style={{ flex: 1, overflowY: "auto", padding: "20px" }} className="hide-scrollbar">

                                    {/* Summary Cards */}
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                                        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "22px 14px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                                            <i className="ti ti-alert-triangle" style={{ color: "#f59e0b", fontSize: 26, marginBottom: 8, display: "block" }} />
                                            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6, lineHeight: 1.4 }}>Outstanding<br />Receivables</div>
                                            <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{fmt(grandTotal)}</div>
                                        </div>
                                        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "22px 14px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                                            <i className="ti ti-circle-check" style={{ color: "#22c55e", fontSize: 26, marginBottom: 8, display: "block" }} />
                                            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Unused Credits</div>
                                            <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{fmt(0)}</div>
                                        </div>
                                    </div>

                                    {/* Contact Details */}
                                    <div style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                                        <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e7eb", fontSize: 13, fontWeight: 700, color: "#374151" }}>Contact Details</div>
                                        <div style={{ padding: "8px 16px" }}>
                                            {[
                                                ["Customer Type", "Business"],
                                                ["Currency", "INR"],
                                                ["Payment Terms", "Due on Receipt"],
                                                ["Portal Status", "Disabled"],
                                                ["Language", "English"],
                                            ].map(([l, v]) => (
                                                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6", fontSize: 13 }}>
                                                    <span style={{ color: "#6b7280" }}>{l}</span>
                                                    <span style={{ color: "#111827", fontWeight: 600 }}>{v}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div style={{ padding: "14px 24px", borderTop: "1px solid #e8e8e8", display: "flex", gap: 10, background: "#fff" }}>
                        <button onClick={handleSave}
                            style={{ background: "#e41f07", color: "#fff", border: "none", padding: "9px 28px", borderRadius: 4, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                            Save
                        </button>
                        <button onClick={onClose}
                            style={{ background: "#fff", color: "#333", border: "1px solid #ddd", padding: "9px 24px", borderRadius: 4, fontWeight: 500, fontSize: 14, cursor: "pointer" }}>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    };

// ── Toolbar Button ────────────────────────────────────────────────────────────
const TBtn: React.FC<{ icon: string; label: string; caret?: boolean; onClick?: () => void; danger?: boolean }> =
    ({ icon, label, caret, onClick, danger }) => (
        <button onClick={onClick}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "1px solid #e0e0e0", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 14, color: danger ? "#e41f07" : "#333", whiteSpace: "nowrap" }}>
            <i className={`ti ${icon}`} style={{ fontSize: 14 }} />
            {label}
            {caret && <i className="ti ti-chevron-down" style={{ fontSize: 10, marginLeft: 2 }} />}
        </button>
    );

// ── Invoice Document Preview ──────────────────────────────────────────────────
const InvoiceDoc: React.FC<{ invoice: Invoice; items: LineItem[]; subtotal: number; taxTotal: number; grandTotal: number }> =
    ({ invoice, items, subtotal, taxTotal, grandTotal }) => {
        const overdueDays = daysOverdue(invoice.dueDate);
        const sc = SC[invoice.status];
        return (
            <div style={{ position: "relative", border: "1px solid #d0d0d0", background: "#fff", maxWidth: 860, width: "100%", margin: "0 auto", padding: "48px 56px 56px", fontSize: 13, lineHeight: 1.5, overflow: "hidden" }}>

                {/* Status ribbon */}
                {invoice.status === "Paid" && (
                    <div style={{ position: "absolute", top: 0, left: 0, width: 120, height: 120, overflow: "hidden", pointerEvents: "none" }}>
                        <div style={{ position: "absolute", top: 28, left: -36, width: 180, background: "#27ae60", color: "#fff", textAlign: "center", transform: "rotate(-45deg)", padding: "7px 0", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>PAID</div>
                    </div>
                )}
                {invoice.status === "Overdue" && (
                    <div style={{ position: "absolute", top: 0, left: 0, width: 130, height: 130, overflow: "hidden", pointerEvents: "none" }}>
                        <div style={{ position: "absolute", top: 32, left: -38, width: 190, background: "#e67e22", color: "#fff", textAlign: "center", transform: "rotate(-45deg)", padding: "8px 0", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>Overdue</div>
                    </div>
                )}
                {invoice.status === "Void" && (
                    <div style={{ position: "absolute", top: 0, left: 0, width: 120, height: 120, overflow: "hidden", pointerEvents: "none" }}>
                        <div style={{ position: "absolute", top: 28, left: -36, width: 180, background: "#999", color: "#fff", textAlign: "center", transform: "rotate(-45deg)", padding: "7px 0", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>VOID</div>
                    </div>
                )}

                {/* Company Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>FEMI9</div>
                        <div style={{ color: "#555", fontSize: 12 }}>Tamil Nadu, India</div>
                        <div style={{ color: "#555", fontSize: 12 }}>91-8012610945</div>
                        <div style={{ color: "#555", fontSize: 12 }}>femi9@gmail.com</div>
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 300, color: "#1a1a1a", letterSpacing: 2, textAlign: "right" }}>
                        TAX INVOICE
                    </div>
                </div>

                {/* Invoice Info Grid */}
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24, border: "1px solid #ccc" }}>
                    <tbody>
                        <tr>
                            <td style={{ padding: "8px 12px", border: "1px solid #ccc", width: "30%", color: "#888", fontSize: 12 }}>#</td>
                            <td style={{ padding: "8px 12px", border: "1px solid #ccc", fontWeight: 600 }}>: {invoice.invoiceNumber}</td>
                        </tr>
                        <tr>
                            <td style={{ padding: "8px 12px", border: "1px solid #ccc", color: "#888", fontSize: 12 }}>Invoice Date</td>
                            <td style={{ padding: "8px 12px", border: "1px solid #ccc", fontWeight: 600 }}>: {invoice.date}</td>
                        </tr>
                        <tr>
                            <td style={{ padding: "8px 12px", border: "1px solid #ccc", color: "#888", fontSize: 12 }}>Terms</td>
                            <td style={{ padding: "8px 12px", border: "1px solid #ccc" }}>: Due on Receipt</td>
                        </tr>
                        <tr>
                            <td style={{ padding: "8px 12px", border: "1px solid #ccc", color: "#888", fontSize: 12 }}>Due Date</td>
                            <td style={{ padding: "8px 12px", border: "1px solid #ccc" }}>: {invoice.dueDate}</td>
                        </tr>
                        {invoice.orderNumber && (
                            <tr>
                                <td style={{ padding: "8px 12px", border: "1px solid #ccc", color: "#888", fontSize: 12 }}>P.O.#</td>
                                <td style={{ padding: "8px 12px", border: "1px solid #ccc" }}>: {invoice.orderNumber}</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Bill To */}
                <div style={{ marginBottom: 28 }}>
                    <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Bill To</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>{invoice.customerName}</div>
                </div>

                {/* Line Items Table */}
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
                    <thead>
                        <tr style={{ background: "#f5f5f5" }}>
                            {["#", "Item & Description", "Qty", "Rate", "Tax %", "Amount"].map((h, i) => (
                                <th key={h} style={{ padding: "9px 10px", border: "1px solid #ddd", fontSize: 11, color: "#666", fontWeight: 700, textAlign: i > 1 ? "right" : "left", textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#aaa", fontSize: 12, border: "1px solid #ddd" }}>No items added.</td></tr>
                        ) : items.map((item, idx) => (
                            <tr key={idx}>
                                <td style={{ padding: "9px 10px", border: "1px solid #ddd", color: "#999", fontSize: 12 }}>{idx + 1}</td>
                                <td style={{ padding: "9px 10px", border: "1px solid #ddd", fontWeight: 500 }}>{item.itemName || item.description || "—"}</td>
                                <td style={{ padding: "9px 10px", border: "1px solid #ddd", textAlign: "right" }}>{item.qty}</td>
                                <td style={{ padding: "9px 10px", border: "1px solid #ddd", textAlign: "right" }}>{fmt(item.rate ?? 0)}</td>
                                <td style={{ padding: "9px 10px", border: "1px solid #ddd", textAlign: "right" }}>{item.tax ?? 0}%</td>
                                <td style={{ padding: "9px 10px", border: "1px solid #ddd", textAlign: "right", fontWeight: 600 }}>{fmt(item.amount ?? 0)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                    <div style={{ width: 300, border: "1px solid #e0e0e0", borderRadius: 8, background: "#fcfdfe", overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <tbody>
                                {[["Subtotal", fmt(subtotal)], ["Total Tax", fmt(taxTotal)]].map(([l, v]) => (
                                    <tr key={l}>
                                        <td style={{ padding: "10px 16px", color: "#666", fontSize: 13 }}>{l}</td>
                                        <td style={{ padding: "10px 16px", textAlign: "right", fontSize: 13, color: "#333", fontWeight: 500 }}>{v}</td>
                                    </tr>
                                ))}
                                <tr style={{ borderTop: "1px solid #eee" }}>
                                    <td style={{ padding: "12px 16px", fontWeight: 700, fontSize: 14, color: "#1a1a1a" }}>Total</td>
                                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, fontSize: 14, color: "#1a1a1a" }}>{fmt(grandTotal)}</td>
                                </tr>
                                <tr style={{ background: "#fff1f0", borderTop: "1px solid #ffccc7" }}>
                                    <td style={{ padding: "14px 16px", fontWeight: 700, color: "#e41f07", fontSize: 15 }}>Balance Due</td>
                                    <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 800, color: "#e41f07", fontSize: 15 }}>
                                        {fmt(invoice.status === "Paid" ? 0 : grandTotal)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Thank you note — centered, unique */}
                <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, #e41f07)" }} />
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        <i className="ti ti-heart-filled" style={{ fontSize: 20, color: "#e41f07" }} />
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", margin: 0, whiteSpace: "nowrap" }}>
                            Thank you for your business!
                        </p>
                    </div>
                    <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, #e41f07)" }} />
                </div>

            </div>
        );
    };

// ── Main ──────────────────────────────────────────────────────────────────────
const InvoiceView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const route = all_routes;
    const printRef = useRef<HTMLDivElement>(null);
    const importRef = useRef<HTMLInputElement>(null);

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [items, setItems] = useState<LineItem[]>([]);

    const [showDel, setShowDel] = useState(false);
    const [showDelPayment, setShowDelPayment] = useState(false);
    const [showEditPayment, setShowEditPayment] = useState(false);
    const [showRefundPayment, setShowRefundPayment] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [showPayment, setShowPayment] = useState(false);
    const [showPaymentMenu, setShowPaymentMenu] = useState(false);
    const [showRowMenu, setShowRowMenu] = useState(false);
    const [rowMenuPos, setRowMenuPos] = useState({ top: 0, left: 0 });
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
    const paymentBtnRef = useRef<HTMLButtonElement>(null);
    const [activities, setActivities] = useState<ActivityEntry[]>([]);
    const [comment, setComment] = useState("");
    const [comments, setComments] = useState<{ text: string; date: string }[]>([]);
    const [sideSearch, setSideSearch] = useState("");
    const [copied, setCopied] = useState(false);
    const [showDetail, setShowDetail] = useState(!!id);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [paymentsCollapsed, setPaymentsCollapsed] = useState(false);
    useEffect(() => { if (id) setShowDetail(true); }, [id]);

    useEffect(() => {
        const all = getAllRaw().filter(i => !i.isDeleted);
        setInvoices(all);
        const found = all.find(inv => inv.id === Number(id));
        setInvoice(found ?? null);
        if (found) {
            setItems(loadItems(found.id));
            let acts = loadActivity(found.id);
            if (acts.length === 0) {
                const firstName = found.customerName.split(" ")[0];
                acts = [
                    { id: 1, icon: "invoice_created", user: "femi9kiruthika", datetime: found.date + " 12:24 PM", message: `Invoice ${found.invoiceNumber} of amount ${fmt(found.amount)} created`, highlights: [] },
                    { id: 2, icon: "contact_created", user: "femi9kiruthika", datetime: found.date + " 12:26 PM", message: `Contact person ${firstName} has been created`, highlights: [firstName] },
                ];
                saveActivity(found.id, acts);
            }
            setActivities(acts);
            setPayments(loadPayments(found.id));
        }
    }, [id]);

    const addActivity = (entry: Omit<ActivityEntry, "id">) => {
        if (!invoice) return;
        const existing = loadActivity(invoice.id);
        const newEntry = { ...entry, id: Date.now() };
        const updated = [newEntry, ...existing];
        saveActivity(invoice.id, updated);
        setActivities(updated);
    };

    const updateStatus = (status: Invoice["status"]) => {
        const all = getAllRaw();
        const updated = all.map(x => x.id === invoice?.id ? { ...x, status } : x);
        saveAll(updated);
        setInvoice(prev => prev ? { ...prev, status } : prev);
        setInvoices(updated.filter(i => !i.isDeleted));
        if (invoice) {
            const msgMap: Record<string, { icon: ActivityEntry["icon"]; msg: string }> = {
                Sent: { icon: "status_changed", msg: `Invoice ${invoice.invoiceNumber} marked as sent` },
                Paid: { icon: "payment", msg: `Payment recorded for ${invoice.invoiceNumber}` },
                Void: { icon: "void", msg: `Invoice ${invoice.invoiceNumber} written off` },
                Overdue: { icon: "status_changed", msg: `Invoice ${invoice.invoiceNumber} marked as overdue` },
                Draft: { icon: "invoice_updated", msg: `Invoice ${invoice.invoiceNumber} reverted to draft` },
            };
            const m = msgMap[status];
            if (m) addActivity({ icon: m.icon, user: "femi9kiruthika", datetime: nowDatetime(), message: m.msg, highlights: [] });
        }
    };

    const handleDelete = () => {
        const all = getAllRaw();
        saveAll(all.map(x => x.id === invoice?.id ? { ...x, isDeleted: true } : x));
        navigate(route.billingInvoiceList);
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: `Invoice ${invoice?.invoiceNumber}`,
                text: `View invoice for ${invoice?.customerName}`,
                url: window.location.href,
            }).catch(() => {
                // Fallback if user cancels or error
                navigator.clipboard.writeText(window.location.href);
            });
        } else {
            navigator.clipboard.writeText(window.location.href).then(() => {
                setCopied(true); setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    const handlePrint = () => window.print();

    const handleExport = () => {
        const headers = ["invoiceNumber", "date", "orderNumber", "customerName", "status", "dueDate", "amount"];
        const rows = invoices.map(inv => headers.map(h => `"${String((inv as any)[h] ?? "")}"`).join(","));
        const csv = [headers.join(","), ...rows].join("\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        const a = document.createElement("a"); a.href = url; a.download = "invoices.csv"; a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const lines = (ev.target?.result as string).trim().split("\n");
            const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
            const all = getAllRaw();
            const maxId = all.reduce((m, x) => Math.max(m, x.id), 0);
            const imported: Invoice[] = lines.slice(1).map((line, idx) => {
                const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
                const obj: any = {}; headers.forEach((h, i) => obj[h] = vals[i] || "");
                return {
                    id: maxId + idx + 1,
                    invoiceNumber: obj.invoicenumber || `INV-${String(maxId + idx + 1).padStart(6, "0")}`,
                    date: obj.date || todayStr(), orderNumber: obj.ordernumber || "",
                    customerName: obj.customername || "Unknown",
                    status: (obj.status as Invoice["status"]) || "Draft",
                    dueDate: obj.duedate || todayStr(), amount: parseFloat(obj.amount) || 0,
                };
            });
            if (imported.length) { const updated = [...all, ...imported]; saveAll(updated); setInvoices(updated.filter(i => !i.isDeleted)); }
        };
        reader.readAsText(file); e.target.value = "";
    };

    const handleAddComment = () => {
        if (!comment.trim()) return;
        const now = new Date();
        const dt = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        setComments(prev => [...prev, { text: comment.trim(), date: dt }]);
        setComment("");
    };

    const filtered = invoices.filter(inv => {
        const q = sideSearch.toLowerCase();
        return inv.invoiceNumber.toLowerCase().includes(q) || inv.customerName.toLowerCase().includes(q);
    });

    const sc = invoice ? SC[invoice.status] : null;
    const subtotal = items.reduce((s, i) => s + (i.amount ?? 0), 0);
    const taxTotal = items.reduce((s, i) => s + ((i.amount ?? 0) * (i.tax ?? 0)) / 100, 0);
    const grandTotal = subtotal + taxTotal;

    // What's Next message
    const whatsNext = invoice ? (() => {
        const overdue = daysOverdue(invoice.dueDate);
        if (invoice.status === "Paid") return null;
        if (invoice.status === "Void") return null;
        if (invoice.status === "Draft")
            return { msg: "Invoice is in draft. Send it to your customer to receive payment.", action: "Send Invoice", onAction: () => updateStatus("Sent") };
        if (invoice.status === "Overdue" || overdue > 0)
            return { msg: `Payment is overdue${overdue > 0 ? ` by ${overdue} day${overdue > 1 ? "s" : ""}` : ""}. Send a payment reminder or record payment.`, action: "Record Payment", onAction: () => setShowPayment(true) };
        return { msg: "Invoice has been sent. Record payment when received.", action: "Record Payment", onAction: () => setShowPayment(true) };
    })() : null;

    const handleDeletePayment = () => {
        if (!selectedPayment || !invoice) return;
        const newPayments = payments.filter(p => p.id !== selectedPayment.id);
        setPayments(newPayments);
        localStorage.setItem(`billing_invoice_payments_${invoice.id}`, JSON.stringify(newPayments));
        addActivity("payment", `Payment ${selectedPayment.paymentNumber} deleted`);
        setShowDelPayment(false);
        setSelectedPayment(null);
    };

    const handleUpdatePayment = (updated: Payment) => {
        if (!invoice) return;
        const newPayments = payments.map(p => p.id === updated.id ? updated : p);
        setPayments(newPayments);
        localStorage.setItem(`billing_invoice_payments_${invoice.id}`, JSON.stringify(newPayments));
        addActivity("payment", `Payment ${updated.paymentNumber} updated`);
        setShowEditPayment(false);
        setSelectedPayment(null);
    };

    const handleRecordRefund = (refundAmount: number, reason: string) => {
        if (!selectedPayment || !invoice) return;
        addActivity("payment", `Refund of ${fmt(refundAmount)} recorded for ${selectedPayment.paymentNumber}. Reason: ${reason}`);
        setShowRefundPayment(false);
        setSelectedPayment(null);
    };

    const handleWhatsApp = () => {
        if (!invoice) return;
        const msg = `Invoice ${invoice.invoiceNumber} from ${invoice.customerName}. Amount: ${fmt(grandTotal)}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    };

    const handleSMS = () => {
        if (!invoice) return;
        const msg = `Invoice ${invoice.invoiceNumber} amount ${fmt(grandTotal)}`;
        window.location.href = `sms:?body=${encodeURIComponent(msg)}`;
    };

    return (
        <div className="page-wrapper" style={{ display: "flex", flexDirection: "column", padding: "8px 10px", overflow: "hidden" }}>
            <style>{`
                @media (max-width: 767px) {
                    .inv-view-sidebar { width: 100% !important; border-right: none !important; flex-shrink: 0; }
                    .inv-view-detail { width: 100% !important; }
                    .inv-view-back-btn { display: flex !important; }
                    .inv-view-topbar-title { font-size: 15px !important; }
                    .inv-view-toolbar { flex-wrap: wrap !important; gap: 4px !important; }
                    .inv-view-toolbar button { font-size: 12px !important; padding: 5px 8px !important; }
                    .inv-doc-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
                    .inv-doc-scroll > div { min-width: 580px; }
                }
                @media (min-width: 768px) {
                    .inv-view-sidebar { display: flex !important; }
                    .inv-view-detail { display: flex !important; }
                    .inv-view-back-btn { display: none !important; }
                }
                .page-wrapper { min-height: calc(100vh - 60px); }
                .zinv-more-dropdown {
                    border-radius: 12px !important;
                    padding: 8px !important;
                    border: none !important;
                    box-shadow: 0 8px 30px rgba(0,0,0,0.15) !important;
                    min-width: 180px !important;
                }
                .zinv-more-item {
                    display: flex !important;
                    align-items: center !important;
                    gap: 12px !important;
                    padding: 8px 16px !important;
                    font-size: 14px !important;
                    font-weight: 500 !important;
                    color: #374151 !important;
                    border-radius: 8px !important;
                    transition: all 0.2s ease !important;
                    border: none !important;
                    background: transparent !important;
                    width: 100% !important;
                    text-align: left !important;
                    text-decoration: none !important;
                }
                .zinv-more-item:hover {
                    background-color: #e41f07 !important;
                    color: #fff !important;
                }
                .zinv-more-item:hover i {
                    color: #fff !important;
                }
                .zinv-more-item i {
                    font-size: 18px !important;
                    color: #6b7280;
                }
                .zinv-more-item.red-icon i {
                    color: #e41f07;
                }
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                @media print {
                    @page { margin: 0; size: auto; }
                    body { visibility: hidden; background: #fff !important; }
                    .page-wrapper, .page-wrapper * { visibility: hidden; border: none !important; box-shadow: none !important; }
                    .inv-doc-print-area, .inv-doc-print-area * { visibility: visible; }
                    .inv-doc-print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 20px !important;
                        border: none !important;
                        box-shadow: none !important;
                    }
                    .inv-view-sidebar, .inv-view-toolbar, .inv-view-topbar-title, .inv-view-back-btn, .dropdown, button, .ti-pencil, .inv-view-topbar {
                        display: none !important;
                    }
                }
            `}</style>
            <div style={{ display: "flex", flex: 1, minHeight: 0, borderRadius: 8, boxShadow: "0 1px 6px rgba(0,0,0,0.1)", overflow: "hidden", background: "#fff" }}>

                {/* ── SIDEBAR ── */}
                <div
                    className="inv-view-sidebar"
                    style={{
                        width: 280, background: "#fff", borderRight: "1px solid #e8e8e8",
                        display: showDetail ? "none" : "flex",
                        flexDirection: "column", flexShrink: 0,
                    }}
                >

                    {/* Sidebar header */}
                    <div style={{ padding: "10px 14px", borderBottom: "1px solid #e8e8e8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        {/* All Invoices dropdown */}
                        <div className="dropdown">
                            <div data-bs-toggle="dropdown" style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                                <span style={{ fontWeight: 600, fontSize: 14, color: "#1a1a1a" }}>All Invoices</span>
                                <i className="ti ti-chevron-down" style={{ fontSize: 11, color: "#888" }} />
                            </div>
                            <div className="dropdown-menu shadow border-0 py-1" style={{ minWidth: 180 }}>
                                <button className="dropdown-item py-2" style={{ fontSize: 13 }}>All Invoices</button>
                                <button className="dropdown-item py-2" style={{ fontSize: 13 }}>Draft</button>
                                <button className="dropdown-item py-2" style={{ fontSize: 13 }}>Sent</button>
                                <button className="dropdown-item py-2" style={{ fontSize: 13 }}>Overdue</button>
                                <button className="dropdown-item py-2" style={{ fontSize: 13 }}>Paid</button>
                                <button className="dropdown-item py-2" style={{ fontSize: 13 }}>Void</button>
                            </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {/* Split [+][▼] button */}
                            <div style={{ display: "flex", height: 32 }}>
                                <button onClick={() => navigate(route.billingInvoiceAdd)}
                                    style={{ background: "#e41f07", color: "#fff", border: "none", padding: "0 12px", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", height: "100%", borderRadius: "4px 0 0 4px" }}>
                                    <i className="ti ti-plus" />
                                </button>
                                <div className="dropdown" style={{ position: "relative" }}>
                                    <button data-bs-toggle="dropdown" data-bs-flip="false" style={{ background: "#e41f07", color: "#fff", border: "none", borderLeft: "1px solid rgba(255,255,255,0.3)", padding: "0 9px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", height: 32, borderRadius: "0 4px 4px 0", lineHeight: 1 }}>
                                        <i className="ti ti-chevron-down" style={{ fontSize: 12, display: "block" }} />
                                    </button>
                                    <div className="dropdown-menu dropdown-menu-end shadow border-0 py-1" style={{ minWidth: 190, top: "100%", bottom: "auto", right: 0, left: "auto" }}>
                                        <button className="dropdown-item active py-2" style={{ fontSize: 14, background: "#e41f07", color: "#fff", borderRadius: 4 }} onClick={() => navigate(route.billingInvoiceAdd)}>New Invoice</button>
                                        <button className="dropdown-item py-2" style={{ fontSize: 14 }}>New Credit Note</button>
                                        <button className="dropdown-item py-2" style={{ fontSize: 14 }}>Create Retail Invoice</button>
                                    </div>
                                </div>
                            </div>

                            {/* ... more options */}
                            <div className="dropdown">
                                <button data-bs-toggle="dropdown" data-bs-flip="false" style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 4, width: 32, height: 32, cursor: "pointer", color: "#666", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <i className="ti ti-dots" style={{ fontSize: 16 }} />
                                </button>
                                <div className="dropdown-menu dropdown-menu-end shadow border-0 py-1" style={{ minWidth: 180, top: "100%", bottom: "auto" }}>
                                    <button className="dropdown-item py-2" style={{ fontSize: 13 }} onClick={() => importRef.current?.click()}>
                                        <i className="ti ti-upload me-2" style={{ fontSize: 13 }} />Import Invoices
                                    </button>
                                    <button className="dropdown-item py-2" style={{ fontSize: 13 }} onClick={handleExport}>
                                        <i className="ti ti-download me-2" style={{ fontSize: 13 }} />Export Invoices
                                    </button>
                                    <div className="dropdown-divider" />
                                    <button className="dropdown-item py-2" style={{ fontSize: 13 }} onClick={() => navigate(route.billingInvoiceSetting)}>
                                        <i className="ti ti-settings me-2" style={{ fontSize: 13 }} />Invoice Settings
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <input ref={importRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImportFile} />

                    {/* Search */}
                    <div style={{ padding: "8px 12px", borderBottom: "1px solid #e8e8e8" }}>
                        <div className="search-box-wrapper" style={{ display: "flex", alignItems: "center", gap: 6, background: "#f7f7f7", borderRadius: 4, padding: "5px 10px" }}>
                            <i className="ti ti-search" style={{ fontSize: 12, color: "#aaa", flexShrink: 0 }} />
                            <input type="text" placeholder="Search invoices..." value={sideSearch} onChange={e => setSideSearch(e.target.value)}
                                style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#333", width: "100%" }} />
                        </div>
                    </div>

                    {/* Invoice list */}
                    <div style={{ flex: 1, overflowY: "auto" }}>
                        {filtered.map(inv => {
                            const active = Number(id) === inv.id;
                            const cfg = SC[inv.status];
                            const od = daysOverdue(inv.dueDate);
                            return (
                                <Link key={inv.id} to={route.billingInvoiceView.replace(":id", String(inv.id))}
                                    onClick={() => setShowDetail(true)}
                                    style={{ display: "block", textDecoration: "none", padding: "10px 14px", borderBottom: "1px solid #f5f5f5", background: active ? "#fff5f5" : "transparent", borderLeft: `3px solid ${active ? "#e41f07" : "transparent"}`, paddingLeft: active ? 11 : 14 }}>
                                    {/* Row 1: checkbox + name + amount */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                        <input type="checkbox" className="form-check-input primary-checkbox" onClick={e => e.preventDefault()} style={{ width: 14, height: 14, marginTop: 0, flexShrink: 0, cursor: "pointer" }} />
                                        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: active ? "#e41f07" : "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {inv.customerName}
                                        </span>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", flexShrink: 0 }}>{fmt(inv.amount)}</span>
                                    </div>
                                    {/* Row 2: invoice# · date · order */}
                                    <div style={{ fontSize: 11, color: "#888", marginBottom: 3, paddingLeft: 22, display: "flex", gap: 4, flexWrap: "wrap" }}>
                                        <span>{inv.invoiceNumber}</span>
                                        <span>·</span>
                                        <span>{inv.date}</span>
                                        {inv.orderNumber && <><span>·</span><span>{inv.orderNumber}</span></>}
                                    </div>
                                    {/* Row 3: status */}
                                    <div style={{ paddingLeft: 22 }}>
                                        {(inv.status === "Overdue" || (od > 0 && inv.status !== "Paid" && inv.status !== "Void")) ? (
                                            <span style={{ fontSize: 10, fontWeight: 700, color: "#e41f07", textTransform: "uppercase" }}>
                                                OVERDUE{od > 0 ? ` BY ${od} DAY${od > 1 ? "S" : ""}` : ""}
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: "1px 7px", borderRadius: 10 }}>
                                                {inv.status.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                        {filtered.length === 0 && (
                            <div style={{ padding: 40, textAlign: "center", color: "#bbb", fontSize: 13 }}>No invoices found</div>
                        )}
                    </div>
                </div>

                {/* ── DETAIL ── */}
                <div
                    className="inv-view-detail"
                    style={{
                        flex: 1, flexDirection: "column", overflow: "hidden", background: "#fff",
                        display: showDetail ? "flex" : "none",
                    }}
                >
                    {invoice ? (
                        <>
                            {/* Top bar: title + icons */}
                            <div style={{ padding: "12px 16px", borderBottom: "1px solid #e8e8e8", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    {/* Back button — mobile only */}
                                    <button
                                        className="inv-view-back-btn"
                                        onClick={() => setShowDetail(false)}
                                        style={{ display: "none", alignItems: "center", justifyContent: "center", background: "#fff", border: "1px solid #e0e0e0", borderRadius: 4, width: 34, height: 34, cursor: "pointer", color: "#333", flexShrink: 0 }}
                                    >
                                        <i className="ti ti-arrow-left" style={{ fontSize: 16 }} />
                                    </button>
                                    <h2 className="inv-view-topbar-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>{invoice.invoiceNumber}</h2>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <TBtn icon="ti-pencil" label="Edit" onClick={() => navigate(route.billingInvoiceEdit.replace(":id", String(invoice.id)))} />
                                    <div className="dropdown">
                                        <button data-bs-toggle="dropdown" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", border: "1px solid #e0e0e0", borderRadius: 4, width: 34, height: 34, cursor: "pointer", color: "#666" }}>
                                            <i className="ti ti-dots" style={{ fontSize: 16 }} />
                                        </button>
                                        <div className="dropdown-menu dropdown-menu-end shadow border-0 zinv-more-dropdown">
                                            <button className="zinv-more-item" onClick={() => updateStatus("Void")} disabled={invoice.status === "Void" || invoice.status === "Paid"}>
                                                <i className="ti ti-ban" /> Mark as Void
                                            </button>
                                            <button className="zinv-more-item" onClick={() => updateStatus("Void")} disabled={invoice.status === "Void" || invoice.status === "Paid"}>
                                                <i className="ti ti-file-off" /> Write Off
                                            </button>
                                            <div className="dropdown-divider" style={{ margin: '8px 0' }} />
                                            <button className="zinv-more-item text-danger" onClick={() => setShowDel(true)}>
                                                <i className="ti ti-trash" style={{ color: '#e41f07' }} /> Delete Invoice
                                            </button>
                                        </div>
                                    </div>
                                    <button title="Close" onClick={() => navigate(route.billingInvoiceList)} style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", border: "1px solid #e0e0e0", borderRadius: 4, width: 34, height: 34, cursor: "pointer", color: "#666" }}>
                                        <i className="ti ti-x" style={{ fontSize: 18 }} />
                                    </button>
                                </div>
                            </div>

                            {/* Toolbar */}
                            <div style={{ padding: "8px 16px", borderBottom: "1px solid #e8e8e8", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", background: "#fafafa" }} className="inv-view-toolbar">

                                <div className="dropdown">
                                    <button data-bs-toggle="dropdown" style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "1px solid #e0e0e0", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 14, color: "#333", whiteSpace: "nowrap" }}>
                                        <i className="ti ti-share" style={{ fontSize: 14 }} />
                                        {copied ? "Copied!" : "Share"}
                                        <i className="ti ti-chevron-down" style={{ fontSize: 10, marginLeft: 2 }} />
                                    </button>
                                    <div className="dropdown-menu shadow border-0 zinv-more-dropdown" style={{ minWidth: 200 }}>
                                        <button className="zinv-more-item" onClick={handleShare}>
                                            <i className="ti ti-copy" /> Copy Link
                                        </button>
                                        <button className="zinv-more-item" onClick={handleWhatsApp}>
                                            <i className="ti ti-brand-whatsapp" style={{ color: "#25D366" }} /> WhatsApp
                                        </button>
                                        <button className="zinv-more-item" onClick={handleSMS}>
                                            <i className="ti ti-message" style={{ color: "#3b82f6" }} /> SMS
                                        </button>
                                    </div>
                                </div>
                                <TBtn icon="ti-bell" label="Reminders" onClick={() => { }} />

                                <TBtn icon="ti-printer" label="Print" onClick={handlePrint} />
                                <TBtn icon="ti-file-type-pdf" label="PDF" onClick={handlePrint} />

                                {/* Record Payment ▼ custom dropdown */}
                                {invoice.status !== "Paid" && (
                                <button ref={paymentBtnRef}
                                    onClick={() => {
                                        if (paymentBtnRef.current) {
                                            const r = paymentBtnRef.current.getBoundingClientRect();
                                            setMenuPos({ top: r.bottom + 4, left: r.left });
                                        }
                                        setShowPaymentMenu(p => !p);
                                    }}
                                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "1px solid #e0e0e0", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 14, color: "#333", whiteSpace: "nowrap" }}>
                                    <i className="ti ti-circle-check" style={{ fontSize: 14 }} />
                                    Record Payment
                                    <i className="ti ti-chevron-down" style={{ fontSize: 10, marginLeft: 2 }} />
                                </button>
                                )}
                            </div>



                            <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 40px", background: "#f3f3f4" }}>

                                {/* What's Next card */}
                                {whatsNext && (
                                    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 6, padding: "14px 20px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
                                        <i className="ti ti-sparkles" style={{ fontSize: 20, color: "#6c63ff", flexShrink: 0 }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: "#6c63ff", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>What's Next?</div>
                                            <div style={{ fontSize: 13, color: "#555" }}>{whatsNext.msg}</div>
                                        </div>
                                        <button onClick={whatsNext.onAction}
                                            style={{ background: "#e41f07", color: "#fff", border: "none", padding: "7px 16px", borderRadius: 4, fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                                            {whatsNext.action}
                                        </button>
                                    </div>
                                )}

                                {/* Payments Received */}
                                <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 6, marginBottom: 16, overflow: "visible" }}>
                                    <div style={{ padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: payments.length > 0 && !paymentsCollapsed ? "1px solid #e8e8e8" : "none" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", borderBottom: "2px solid #e41f07", paddingBottom: 2 }}>Payments Received</span>
                                            {payments.length > 0 && (
                                                <span style={{ background: "#fff0ef", color: "#e41f07", fontWeight: 700, fontSize: 12, borderRadius: 10, padding: "1px 8px" }}>{payments.length}</span>
                                            )}
                                        </div>
                                        <button onClick={() => setPaymentsCollapsed(p => !p)} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", padding: 4 }}>
                                            <i className={`ti ${paymentsCollapsed ? "ti-chevron-down" : "ti-chevron-up"}`} style={{ fontSize: 14 }} />
                                        </button>
                                    </div>
                                    {!paymentsCollapsed && (
                                        payments.length === 0 ? (
                                            <div style={{ padding: "20px", textAlign: "center", fontSize: 13, color: "#bbb" }}>No payments recorded yet.</div>
                                        ) : (
                                            <div className="hide-scrollbar" style={{ overflowX: "auto" }}>
                                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                                    <thead>
                                                        <tr style={{ background: "#f9fafb" }}>
                                                            {["DATE", "PAYMENT #", "REFERENCE#", "STATUS", "PAYMENT MODE", "AMOUNT", "ACTION"].map((h, i) => (
                                                                <th key={i} style={{ padding: "8px 12px", color: "#6b7280", fontWeight: 700, fontSize: 11, letterSpacing: "0.05em", textAlign: i >= 5 ? "right" : "left", whiteSpace: "nowrap", borderBottom: "1px solid #e8e8e8" }}>{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {payments.map((p, i) => (
                                                            <tr key={p.id} style={{ borderBottom: i < payments.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                                                                <td style={{ padding: "8px 12px", color: "#374151" }}>{p.date}</td>
                                                                <td style={{ padding: "8px 12px", color: "#e41f07", fontWeight: 600, cursor: "pointer" }}>{p.paymentNumber}</td>
                                                                <td style={{ padding: "8px 12px", color: "#374151" }}>{p.reference || "—"}</td>
                                                                <td style={{ padding: "8px 12px" }}>
                                                                    <span style={{ color: "#16a34a", fontWeight: 600 }}>{p.status}</span>
                                                                </td>
                                                                <td style={{ padding: "8px 12px", color: "#374151", whiteSpace: "nowrap" }}>{p.paymentMode}</td>
                                                                <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "#1a1a1a" }}>{fmt(p.amount)}</td>
                                                                <td style={{ padding: "8px 12px", textAlign: "right" }}>
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            const r = e.currentTarget.getBoundingClientRect();
                                                                            setRowMenuPos({ top: r.bottom + 4, left: r.left - 150 });
                                                                            setSelectedPayment(p);
                                                                            setShowRowMenu(true);
                                                                        }}
                                                                        style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", border: "1px solid #e0e0e0", borderRadius: 4, width: 28, height: 28, cursor: "pointer", color: "#666", marginLeft: 'auto' }}>
                                                                        <i className="ti ti-dots-vertical" style={{ fontSize: 16 }} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )
                                    )}
                                </div>

                                {/* Invoice document */}
                                <div className="inv-doc-scroll">
                                    <InvoiceDoc invoice={invoice} items={items} subtotal={subtotal} taxTotal={taxTotal} grandTotal={grandTotal} />
                                </div>

                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f9f9f9", color: "#bbb" }}>
                            <i className="ti ti-file-invoice" style={{ fontSize: 52, marginBottom: 10, opacity: 0.2 }} />
                            <div style={{ fontWeight: 600, fontSize: 14, color: "#888" }}>Select an Invoice</div>
                            <div style={{ fontSize: 13, color: "#bbb", marginTop: 4 }}>Choose from the sidebar to view details</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Record Payment floating menu */}
            {showPaymentMenu && (
                <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 8000 }} onClick={() => setShowPaymentMenu(false)} />
                    <div style={{ position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 8001, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", minWidth: 190, overflow: "hidden" }}>
                        <button onClick={() => { setShowPaymentMenu(false); setShowPayment(true); }}
                            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 16px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#1a1a1a", textAlign: "left" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#f5f5f5")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <i className="ti ti-circle-check" style={{ fontSize: 15, color: "#1a6fb5" }} /> Record Payment
                        </button>
                        <button onClick={() => { setShowPaymentMenu(false); updateStatus("Void"); }}
                            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 16px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#1a1a1a", textAlign: "left" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#f5f5f5")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <i className="ti ti-x" style={{ fontSize: 15, color: "#e41f07" }} /> Write Off
                        </button>
                    </div>
                </>
            )}

            {/* Row Action floating menu */}
            {showRowMenu && selectedPayment && (
                <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 8000 }} onClick={() => setShowRowMenu(false)} />
                    <div style={{ position: "fixed", top: rowMenuPos.top, left: rowMenuPos.left, zIndex: 8001, background: "#fff", border: "none", borderRadius: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.15)", minWidth: 180, padding: 8 }}>
                        <button className="zinv-more-item" onClick={() => { setShowRowMenu(false); setShowEditPayment(true); }}>
                            <i className="ti ti-pencil" /> Edit
                        </button>
                        <button className="zinv-more-item red-icon" onClick={() => { setShowRowMenu(false); setShowRefundPayment(true); }}>
                            <i className="ti ti-receipt-refund" /> Refund
                        </button>
                        <div style={{ height: 1, background: "#f0f0f0", margin: "4px 8px" }} />
                        <button className="zinv-more-item text-danger" onClick={() => { setShowRowMenu(false); setShowDelPayment(true); }}>
                            <i className="ti ti-trash" style={{ color: "#e41f07" }} /> Delete
                        </button>
                    </div>
                </>
            )}

            {showDel && invoice && (
                <DeleteConfirm num={invoice.invoiceNumber} onConfirm={handleDelete} onCancel={() => setShowDel(false)} />
            )}
            {showPayment && invoice && (
                <RecordPaymentModal
                    invoice={invoice}
                    grandTotal={grandTotal}
                    onClose={() => setShowPayment(false)}
                    onSave={(payment) => { updateStatus("Paid"); setPayments(prev => [...prev, payment]); }}
                />
            )}
            {showDelPayment && selectedPayment && (
                <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
                    <div style={{ background: "#fff", borderRadius: 8, width: 400, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <i className="ti ti-trash" style={{ fontSize: 20, color: "#dc2626" }} />
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>Delete Payment Record</div>
                        </div>
                        <div style={{ fontSize: 14, color: "#555", marginBottom: 24 }}>Are you sure you want to delete payment <b>{selectedPayment.paymentNumber}</b>? This action cannot be undone.</div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                            <button onClick={() => setShowDelPayment(false)} style={{ padding: "8px 16px", border: "1px solid #e0e0e0", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 14 }}>Cancel</button>
                            <button onClick={handleDeletePayment} style={{ padding: "8px 16px", border: "none", borderRadius: 4, background: "#e41f07", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
            {showEditPayment && selectedPayment && (
                <EditPaymentModal
                    payment={selectedPayment}
                    activities={activities}
                    onCancel={() => setShowEditPayment(false)}
                    onSave={handleUpdatePayment}
                />
            )}
            {showRefundPayment && selectedPayment && (
                <RefundPaymentModal
                    payment={selectedPayment}
                    onCancel={() => setShowRefundPayment(false)}
                    onSave={handleRecordRefund}
                />
            )}
        </div>
    );
};

// ── Edit Payment Modal ────────────────────────────────────────────────────────
const EditPaymentModal: React.FC<{ payment: Payment; activities: ActivityEntry[]; onCancel: () => void; onSave: (p: Payment) => void }> = ({ payment, activities, onCancel, onSave }) => {
    const [form, setForm] = useState(payment);
    const [showDetails, setShowDetails] = useState(false);
    const [activeSubTab, setActiveSubTab] = useState("Details");
    const [allocAmt, setAllocAmt] = useState(payment.amount);

    const amountUsed = allocAmt;
    const amountToCredit = form.amount - amountUsed;

    return (
        <div className="ep-overlay" style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
            <div className="ep-modal-box" style={{ background: "#fff", borderRadius: 4, width: 900, maxWidth: "95%", height: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 10px 40px rgba(0,0,0,0.2)", position: "relative", overflow: "hidden" }}>
                {/* Header */}
                <div style={{ padding: "16px 24px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>Edit Payment</div>
                    <i className="ti ti-x" style={{ cursor: "pointer", color: "#888", fontSize: 20 }} onClick={onCancel} />
                </div>

                {/* Body */}
                <div className="hide-scrollbar ep-body" style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
                    <div className="ep-two-col" style={{ display: "flex", gap: 60 }}>
                        <div className="ep-form-area" style={{ flex: 1 }}>
                            <div className="ep-form-row" style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
                                <label className="ep-label" style={{ width: 160, fontSize: 13, color: "#e41f07", fontWeight: 500 }}>Customer Name*</label>
                                <div style={{ flex: 1 }}>
                                    <input type="text" readOnly value="vijay" style={{ width: "100%", padding: "7px 12px", border: "1px solid #e0e0e0", borderRadius: 4, fontSize: 13, background: "#f9fafb" }} />
                                    <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>PAN: <span style={{ color: "#3b82f6", cursor: "pointer" }}>Add PAN</span></div>
                                </div>
                            </div>

                            <div className="ep-form-row" style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
                                <label className="ep-label" style={{ width: 160, fontSize: 13, color: "#333" }}>Location</label>
                                <select style={{ flex: 1, padding: "7px 12px", border: "1px solid #e0e0e0", borderRadius: 4, fontSize: 13 }}>
                                    <option>Head Office</option>
                                </select>
                            </div>

                            <div className="ep-form-row" style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
                                <label className="ep-label" style={{ width: 160, fontSize: 13, color: "#e41f07", fontWeight: 500 }}>Amount Received*</label>
                                <div style={{ flex: 1, display: "flex" }}>
                                    <div style={{ padding: "7px 12px", border: "1px solid #e0e0e0", borderRight: "none", borderRadius: "4px 0 0 4px", background: "#f9fafb", fontSize: 13, color: "#666" }}>INR</div>
                                    <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} style={{ flex: 1, padding: "7px 12px", border: "1px solid #e0e0e0", borderRadius: "0 4px 4px 0", fontSize: 13 }} />
                                </div>
                            </div>

                            <div className="ep-form-row" style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
                                <label className="ep-label" style={{ width: 160, fontSize: 13, color: "#333" }}>Bank Charges (if any)</label>
                                <input type="number" defaultValue={0} style={{ flex: 1, padding: "7px 12px", border: "1px solid #e0e0e0", borderRadius: 4, fontSize: 13 }} />
                            </div>

                            <div className="ep-form-row" style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
                                <label className="ep-label" style={{ width: 160, fontSize: 13, color: "#e41f07", fontWeight: 500 }}>Payment Date*</label>
                                <input type="text" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ flex: 1, padding: "7px 12px", border: "1px solid #e0e0e0", borderRadius: 4, fontSize: 13 }} />
                            </div>

                            <div className="ep-form-row" style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
                                <label className="ep-label" style={{ width: 160, fontSize: 13, color: "#e41f07", fontWeight: 500 }}>Payment #*</label>
                                <div style={{ flex: 1, position: "relative" }}>
                                    <input type="text" value={form.paymentNumber} readOnly style={{ width: "100%", padding: "7px 12px", border: "1px solid #e0e0e0", borderRadius: 4, fontSize: 13, background: "#f9fafb" }} />
                                    <i className="ti ti-settings" style={{ position: "absolute", right: 10, top: 10, color: "#3b82f6", cursor: "pointer" }} />
                                </div>
                            </div>

                            <div className="ep-form-row" style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
                                <label className="ep-label" style={{ width: 160, fontSize: 13, color: "#333" }}>Payment Mode</label>
                                <select value={form.paymentMode} onChange={e => setForm({ ...form, paymentMode: e.target.value })} style={{ flex: 1, padding: "7px 12px", border: "1px solid #e0e0e0", borderRadius: 4, fontSize: 13 }}>
                                    <option>Cash</option><option>Bank Transfer</option><option>Cheque</option><option>Credit Card</option>
                                </select>
                            </div>

                            <div className="ep-form-row" style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
                                <label className="ep-label" style={{ width: 160, fontSize: 13, color: "#e41f07", fontWeight: 500 }}>Deposit To*</label>
                                <select style={{ flex: 1, padding: "7px 12px", border: "1px solid #e0e0e0", borderRadius: 4, fontSize: 13 }}>
                                    <option>Petty Cash</option>
                                </select>
                            </div>

                            <div className="ep-form-row" style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
                                <label className="ep-label" style={{ width: 160, fontSize: 13, color: "#333" }}>Reference#</label>
                                <input type="text" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} style={{ flex: 1, padding: "7px 12px", border: "1px solid #e0e0e0", borderRadius: 4, fontSize: 13 }} />
                            </div>

                            <div className="ep-form-row" style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
                                <label className="ep-label" style={{ width: 160, fontSize: 13, color: "#333" }}>Tax deducted?</label>
                                <div style={{ flex: 1, display: "flex", gap: 20, fontSize: 13 }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                        <input type="radio" name="tax" defaultChecked /> No Tax deducted
                                    </label>
                                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                        <input type="radio" name="tax" /> Yes, TDS (Income Tax)
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="ep-side-panel" style={{ width: 220 }}>
                            <div onClick={() => setShowDetails(true)} style={{ background: "#4c5267", color: "#fff", padding: "10px 16px", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontSize: 13 }}>
                                <span>vijay's Details</span>
                                <i className="ti ti-chevron-right" />
                            </div>
                        </div>
                    </div>

                    {/* Unpaid Invoices Section */}
                    <div style={{ marginTop: 40 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>Unpaid Invoices</div>
                                <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", border: "1px solid #e0e0e0", borderRadius: 4, background: "#fff", fontSize: 12, color: "#666" }}>
                                    <i className="ti ti-calendar" /> Filter by Date Range <i className="ti ti-chevron-down" />
                                </button>
                            </div>
                            <span style={{ fontSize: 12, color: "#3b82f6", cursor: "pointer" }}>Clear Applied Amount</span>
                        </div>

                        <div className="ep-table-wrap" style={{ border: "1px solid #eee", borderRadius: 4, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                            <table style={{ width: "100%", minWidth: 820, borderCollapse: "collapse", fontSize: 11 }}>
                                <thead>
                                    <tr style={{ background: "#f9fafb", color: "#888", textAlign: "left", textTransform: "uppercase", borderBottom: "1px solid #eee" }}>
                                        <th style={{ padding: "10px 16px", fontWeight: 600 }}>Date</th>
                                        <th style={{ padding: "10px 16px", fontWeight: 600 }}>Invoice Number</th>
                                        <th style={{ padding: "10px 16px", fontWeight: 600 }}>Location</th>
                                        <th style={{ padding: "10px 16px", fontWeight: 600, textAlign: "right" }}>Invoice Amount</th>
                                        <th style={{ padding: "10px 16px", fontWeight: 600, textAlign: "right" }}>Amount Due</th>
                                        <th style={{ padding: "10px 16px", fontWeight: 600 }}>Payment Received On <i className="ti ti-info-circle" style={{ fontSize: 12 }} /></th>
                                        <th style={{ padding: "10px 16px", fontWeight: 600, textAlign: "right" }}>Payment</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: "1px solid #eee" }}>
                                        <td style={{ padding: "12px 16px" }}>
                                            <div style={{ color: "#333" }}>06/05/2026</div>
                                            <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>Due Date: 06/05/2026</div>
                                        </td>
                                        <td style={{ padding: "12px 16px", color: "#3b82f6" }}>INV-000001</td>
                                        <td style={{ padding: "12px 16px", color: "#333" }}>Head Office</td>
                                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#333" }}>230</td>
                                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#333" }}>230</td>
                                        <td style={{ padding: "12px 16px", minWidth: 160 }}>
                                            <input type="text" defaultValue="11/05/2026" style={{ width: "100%", padding: "5px 10px", border: "1px solid #e0e0e0", borderRadius: 4, fontSize: 12 }} />
                                        </td>
                                        <td style={{ padding: "12px 16px", textAlign: "right", minWidth: 140 }}>
                                            <input
                                                type="number"
                                                value={allocAmt}
                                                onChange={e => setAllocAmt(Number(e.target.value))}
                                                style={{ width: "100%", padding: "5px 10px", border: "1px solid #e0e0e0", borderRadius: 4, fontSize: 12, textAlign: "right" }}
                                            />
                                        </td>
                                    </tr>
                                    <tr style={{ background: "#fff" }}>
                                        <td colSpan={7} style={{ padding: "10px 16px", fontSize: 10, color: "#888" }}>**List contains only SENT invoices</td>
                                    </tr>
                                    <tr style={{ background: "#fff" }}>
                                        <td colSpan={6} style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "#333" }}>Total</td>
                                        <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "#333" }}>{allocAmt.toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary Box */}
                    <div style={{ marginTop: 40, display: "flex", justifyContent: "flex-end" }}>
                        <div style={{ background: "#f9fafb", padding: "20px 40px", borderRadius: 4, width: 420 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13 }}>
                                <span style={{ color: "#333" }}>Amount Received :</span>
                                <span style={{ fontWeight: 600 }}>{form.amount.toFixed(2)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13 }}>
                                <span style={{ color: "#333" }}>Amount used for Payments :</span>
                                <span style={{ fontWeight: 600 }}>{amountUsed.toFixed(2)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13 }}>
                                <span style={{ color: "#333" }}>Amount Refunded :</span>
                                <span style={{ fontWeight: 600 }}>0.00</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderTop: "1px solid #eee", paddingTop: 12, marginTop: 4 }}>
                                <span style={{ color: "#333", display: "flex", alignItems: "center", gap: 6 }}>
                                    <i className="ti ti-alert-triangle" style={{ color: "#e41f07", fontSize: 16 }} /> Amount in Excess:
                                </span>
                                <span style={{ fontWeight: 600 }}>₹ {amountToCredit.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes Section */}
                    <div style={{ marginTop: 30 }}>
                        <label style={{ display: "block", fontSize: 13, color: "#333", marginBottom: 8 }}>Notes (Internal use. Not visible to customer)</label>
                        <textarea rows={3} style={{ width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: 4, fontSize: 13, resize: "none" }} />
                    </div>

                    {/* Attachments Section */}
                    <div style={{ marginTop: 30 }}>
                        <label style={{ display: "block", fontSize: 13, color: "#333", marginBottom: 8, fontWeight: 500 }}>Attachments</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", border: "1px solid #e0e0e0", borderRadius: 4, background: "#fff", fontSize: 13, color: "#333" }}>
                                <i className="ti ti-upload" /> Upload File <i className="ti ti-chevron-down" style={{ fontSize: 10, marginLeft: 4 }} />
                            </button>
                        </div>
                        <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>You can upload a maximum of 5 files, 5MB each</div>
                    </div>

                    {/* Additional Fields Section */}
                    <div style={{ marginTop: 40, borderTop: "1px solid #f3f4f6", paddingTop: 20, marginBottom: 20 }}>
                        <div style={{ fontSize: 12, color: "#666" }}>
                            <span style={{ fontWeight: 700, color: "#333" }}>Additional Fields:</span> Start adding custom fields for your payments received by going to
                            <span style={{ color: "#3b82f6", cursor: "pointer", fontStyle: "italic" }}> Settings</span> →
                            <span style={{ color: "#3b82f6", cursor: "pointer", fontStyle: "italic" }}> Sales</span> →
                            <span style={{ color: "#3b82f6", cursor: "pointer", fontStyle: "italic" }}> Payments Received</span>.
                        </div>
                    </div>
                </div>

                {/* Side Panel Overlay */}
                {showDetails && (
                    <div className="hide-scrollbar ep-details-panel" style={{ position: "absolute", top: 0, right: 0, width: 500, height: "100%", background: "#fff", boxShadow: "-5px 0 30px rgba(0,0,0,0.1)", zIndex: 10, display: "flex", flexDirection: "column", borderLeft: "1px solid #eee" }}>
                        {/* Panel Header */}
                        <div style={{ padding: "24px", borderBottom: "1px solid #eee" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                                    <div style={{ width: 50, height: 50, background: "#e5e7eb", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#6b7280", fontWeight: 600 }}>V</div>
                                    <div>
                                        <div style={{ fontSize: 12, color: "#888" }}>Customer</div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", display: "flex", alignItems: "center", gap: 8 }}>
                                            vijay <i className="ti ti-external-link" style={{ fontSize: 14, color: "#3b82f6", cursor: "pointer" }} />
                                        </div>
                                    </div>
                                </div>
                                <i className="ti ti-x" style={{ cursor: "pointer", color: "#e41f07", fontSize: 20 }} onClick={() => setShowDetails(false)} />
                            </div>
                            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#666", fontSize: 13 }}>
                                    <i className="ti ti-file-description" /> vijay
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#666", fontSize: 13 }}>
                                    <i className="ti ti-mail" /> anandh.femi9@gmail.com
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: "flex", borderBottom: "1px solid #eee", padding: "0 24px" }}>
                            {["Details", "Activity Log"].map(t => (
                                <div
                                    key={t}
                                    onClick={() => setActiveSubTab(t)}
                                    style={{
                                        padding: "12px 0",
                                        marginRight: 30,
                                        fontSize: 14,
                                        fontWeight: 600,
                                        color: activeSubTab === t ? "#1a1a1a" : "#888",
                                        cursor: "pointer",
                                        borderBottom: activeSubTab === t ? "3px solid #3b82f6" : "none"
                                    }}
                                >
                                    {t}
                                </div>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="hide-scrollbar" style={{ flex: 1, overflowY: "auto", padding: 24, background: "#fff" }}>
                            {activeSubTab === "Details" ? (
                                <div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                                        <div style={{ background: "#fff", padding: "16px", borderRadius: 8, border: "1px solid #eee", textAlign: "center" }}>
                                            <i className="ti ti-alert-triangle" style={{ color: "#f59e0b", fontSize: 20, marginBottom: 8 }} />
                                            <div style={{ fontSize: 12, color: "#888" }}>Outstanding Receivables</div>
                                            <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>₹230.00</div>
                                        </div>
                                        <div style={{ background: "#fff", padding: "16px", borderRadius: 8, border: "1px solid #eee", textAlign: "center" }}>
                                            <i className="ti ti-circle-check" style={{ color: "#10b981", fontSize: 20, marginBottom: 8 }} />
                                            <div style={{ fontSize: 12, color: "#888" }}>Unused Credits</div>
                                            <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>₹0.00</div>
                                        </div>
                                    </div>

                                    <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #eee", overflow: "hidden" }}>
                                        <div style={{ padding: "12px 16px", fontWeight: 700, fontSize: 14, background: "#fff", borderBottom: "1px solid #eee" }}>Contact Details</div>
                                        <div style={{ padding: 16 }}>
                                            {[
                                                { l: "Customer Type", v: "Business" },
                                                { l: "Currency", v: "INR" },
                                                { l: "Payment Terms", v: "Due on Receipt" },
                                                { l: "Portal Status", v: "Disabled" },
                                                { l: "Customer Language", v: "English" }
                                            ].map((row, i) => (
                                                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13 }}>
                                                    <span style={{ color: "#888" }}>{row.l}</span>
                                                    <span style={{ fontWeight: 500, color: "#1a1a1a" }}>{row.v}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                                    {activities.length > 0 ? activities.slice(0, 5).map((a, i) => (
                                        <div key={i} style={{ display: "flex", gap: 16 }}>
                                            <div style={{ width: 10, height: 10, background: "#3b82f6", borderRadius: "50%", marginTop: 6, flexShrink: 0 }} />
                                            <div>
                                                <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{a.description}</div>
                                                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{a.date}</div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", marginTop: 40 }}>No activity records found.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div style={{ padding: "16px 32px", borderTop: "1px solid #eee", display: "flex", gap: 10 }}>
                    <button onClick={() => onSave(form)} style={{ padding: "8px 24px", border: "none", borderRadius: 4, background: "#e41f07", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Save</button>
                    <button onClick={onCancel} style={{ padding: "8px 24px", border: "1px solid #e0e0e0", borderRadius: 4, background: "#f9fafb", cursor: "pointer", fontSize: 13, color: "#333" }}>Cancel</button>
                </div>
            </div>
        </div>
    );
};

// ── Refund Payment Modal ──────────────────────────────────────────────────────
const RefundPaymentModal: React.FC<{ payment: Payment; onCancel: () => void; onSave: (amt: number, reason: string) => void }> = ({ payment, onCancel, onSave }) => {
    const [amt, setAmt] = useState(payment.amount);
    const [reason, setReason] = useState("");
    const [refundDate, setRefundDate] = useState("11/05/2026");

    return (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
            <div style={{ background: "#fff", borderRadius: 4, width: 950, maxWidth: "95%", boxShadow: "0 10px 40px rgba(0,0,0,0.2)", overflow: "hidden" }}>
                {/* Header */}
                <div style={{ padding: "16px 24px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 500, color: "#333" }}>Payment Refund</div>
                    <i className="ti ti-x" style={{ cursor: "pointer", color: "#e41f07", fontSize: 20 }} onClick={onCancel} />
                </div>

                {/* Body */}
                <div style={{ padding: "32px 40px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px 80px", marginBottom: 30 }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                            <label style={{ width: 140, fontSize: 13, color: "#666" }}>Payment Amount</label>
                            <input type="text" readOnly value={`₹${payment.amount.toFixed(2)}`} style={{ flex: 1, padding: "8px 12px", border: "1px solid #e0e0e0", borderRadius: 4, fontSize: 13, background: "#f9fafb" }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center" }}>
                            <label style={{ width: 140, fontSize: 13, color: "#e41f07" }}>Refunded On*</label>
                            <input type="text" value={refundDate} onChange={e => setRefundDate(e.target.value)} style={{ flex: 1, padding: "8px 12px", border: "1px solid #e0e0e0", borderRadius: 4, fontSize: 13 }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center" }}>
                            <label style={{ width: 140, fontSize: 13, color: "#666" }}>Payment Mode</label>
                            <select style={{ flex: 1, padding: "8px 12px", border: "1px solid #e0e0e0", borderRadius: 4, fontSize: 13 }}>
                                <option>{payment.paymentMode}</option>
                            </select>
                        </div>
                        <div style={{ display: "flex", alignItems: "center" }}>
                            <label style={{ width: 140, fontSize: 13, color: "#666" }}>Reference#</label>
                            <input type="text" placeholder="Reference#" style={{ flex: 1, padding: "8px 12px", border: "1px solid #e0e0e0", borderRadius: 4, fontSize: 13 }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center" }}>
                            <label style={{ width: 140, fontSize: 13, color: "#e41f07" }}>From Account*</label>
                            <select style={{ flex: 1, padding: "8px 12px", border: "1px solid #e0e0e0", borderRadius: 4, fontSize: 13 }}>
                                <option>Petty Cash</option>
                            </select>
                        </div>
                        <div style={{ display: "flex", alignItems: "start" }}>
                            <label style={{ width: 140, fontSize: 13, color: "#666", marginTop: 8 }}>Description</label>
                            <textarea rows={2} style={{ flex: 1, padding: "8px 12px", border: "1px solid #e0e0e0", borderRadius: 4, fontSize: 13, resize: "none" }} />
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ border: "1px solid #eee", borderRadius: 4, overflow: "hidden", marginBottom: 16 }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                                <tr style={{ background: "#f9fafb", color: "#888", textAlign: "left", textTransform: "uppercase" }}>
                                    <th style={{ padding: "10px 16px", fontWeight: 600 }}>Invoice#</th>
                                    <th style={{ padding: "10px 16px", fontWeight: 600 }}>Invoice Date</th>
                                    <th style={{ padding: "10px 16px", fontWeight: 600, textAlign: "right" }}>Refund Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style={{ borderTop: "1px solid #eee" }}>
                                    <td style={{ padding: "12px 16px", color: "#333" }}>INV-000001</td>
                                    <td style={{ padding: "12px 16px", color: "#333" }}>2026-05-11</td>
                                    <td style={{ padding: "12px 16px", color: "#333", textAlign: "right" }}>₹{amt.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style={{ fontSize: 13, color: "#888", marginBottom: 30, lineHeight: 1.5 }}>
                        Note: Once you save this refund, the payment received will be dissociated from the related invoice(s), changing the invoice status to Unpaid.
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: "16px 24px", borderTop: "1px solid #eee", display: "flex", gap: 10 }}>
                    <button onClick={() => onSave(amt, reason)} style={{ padding: "8px 24px", border: "none", borderRadius: 4, background: "#e41f07", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Save</button>
                    <button onClick={onCancel} style={{ padding: "8px 24px", border: "1px solid #e0e0e0", borderRadius: 4, background: "#f9fafb", cursor: "pointer", fontSize: 13, color: "#333" }}>Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default InvoiceView;
