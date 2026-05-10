// @ts-nocheck
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

// ── Storage ───────────────────────────────────────────────────────────────────
const SK = "billing_invoices";
const SK_ITEMS = (id: number) => `billing_invoice_items_${id}`;
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

const TABS = [
    { key: "details", label: "Invoice Details" },
    { key: "comments", label: "Comments & History" },
] as const;
type TabKey = typeof TABS[number]["key"];

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
const RecordPaymentModal: React.FC<{ invoice: Invoice; grandTotal: number; onClose: () => void; onSave: () => void }> =
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

        const handleSave = () => { onSave(); onClose(); };

        const lbl = (text: string, req = false) => (
            <div style={{ fontSize: 13, color: req ? "#e41f07" : "#333", fontWeight: 500, textAlign: "right", paddingRight: 16, paddingTop: 7, lineHeight: 1.4 }}>
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
            <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
                style={{ position: "fixed", inset: 0, zIndex: 4000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                <div style={{ background: "#fff", width: "100%", maxWidth: 820, maxHeight: "90vh", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>

                    {/* Header */}
                    <div style={{ padding: "16px 24px", borderBottom: "1px solid #e8e8e8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>Payment for {invoice.invoiceNumber}</h3>
                        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#999", padding: 4 }}>
                            <i className="ti ti-x" style={{ fontSize: 20 }} />
                        </button>
                    </div>

                    {/* Body */}
                    <div style={{ flex: 1, overflowY: "auto", background: "#f5f6f8", padding: "24px 32px" }}>

                        {/* Section 1 */}
                        <div style={{ background: "#fff", borderRadius: 8, padding: "24px 28px", marginBottom: 16 }}>

                            {/* Customer Name */}
                            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr auto", gap: 12, alignItems: "start", marginBottom: 20 }}>
                                {lbl("Customer\nName", true)}
                                {inp(form.customerName, v => set("customerName", v))}
                                <button onClick={() => setShowCustDetail(true)} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                                    {form.customerName}'s Details <i className="ti ti-chevron-right" style={{ fontSize: 12 }} />
                                </button>
                            </div>

                            {showCustDetail && (
                                <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 420, background: "#fff", zIndex: 10, boxShadow: "-8px 0 24px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", animation: "slideIn 0.25s ease-out" }}>
                                    <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
                                    
                                    {/* Header */}
                                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <div style={{ width: 42, height: 42, borderRadius: 8, background: "#edf2ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>
                                                {form.customerName[0]}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 10, color: "#888", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Customer</div>
                                                <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", display: "flex", alignItems: "center", gap: 6 }}>
                                                    {form.customerName} <i className="ti ti-external-link" style={{ fontSize: 14, color: "#2563eb", cursor: "pointer" }} />
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => setShowCustDetail(false)} style={{ background: "none", border: "none", color: "#ff4d4f", cursor: "pointer", fontSize: 22, padding: 4 }}>
                                            <i className="ti ti-x" />
                                        </button>
                                    </div>

                                    <div style={{ flex: 1, overflowY: "auto", padding: "20px" }} className="hide-scrollbar">
                                        {/* Contact Info */}
                                        <div style={{ fontSize: 13, color: "#666", marginBottom: 24, paddingLeft: 4 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                                <i className="ti ti-user" style={{ fontSize: 14 }} /> {form.customerName}
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <i className="ti ti-mail" style={{ fontSize: 14 }} /> anandh.femi9@gmail.com
                                            </div>
                                        </div>

                                        {/* Tabs */}
                                        <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0", marginBottom: 24 }}>
                                            <div style={{ padding: "8px 16px", fontSize: 14, fontWeight: 600, color: "#2563eb", borderBottom: "2px solid #2563eb", cursor: "pointer" }}>Details</div>
                                            <div style={{ padding: "8px 16px", fontSize: 14, fontWeight: 500, color: "#666", cursor: "pointer" }}>Activity Log</div>
                                        </div>

                                        {/* Summary Cards */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                                            <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "24px 16px", textAlign: "center" }}>
                                                <i className="ti ti-alert-triangle" style={{ color: "#faad14", fontSize: 24, marginBottom: 8, display: "block" }} />
                                                <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>Outstanding Receivables</div>
                                                <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>{fmt(grandTotal)}</div>
                                            </div>
                                            <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "24px 16px", textAlign: "center" }}>
                                                <i className="ti ti-circle-check" style={{ color: "#52c41a", fontSize: 24, marginBottom: 8, display: "block" }} />
                                                <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>Unused Credits</div>
                                                <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>{fmt(0)}</div>
                                            </div>
                                        </div>

                                        {/* Contact Details Section */}
                                        <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 8, overflow: "hidden" }}>
                                            <div style={{ background: "#f8fafc", padding: "12px 16px", borderBottom: "1px solid #f0f0f0", fontSize: 13, fontWeight: 700, color: "#334155" }}>Contact Details</div>
                                            <div style={{ padding: "16px 20px" }}>
                                                {[
                                                    ["Customer Type", "Business"],
                                                    ["Currency", "INR"],
                                                    ["Payment Terms", "Due on Receipt"],
                                                    ["Portal Status", "Disabled"],
                                                    ["Language", "English"]
                                                ].map(([l, v]) => (
                                                    <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 13 }}>
                                                        <span style={{ color: "#64748b" }}>{l}</span>
                                                        <span style={{ color: "#1e293b", fontWeight: 600 }}>{v}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Payment # */}
                            <div style={{ display: "grid", gridTemplateColumns: "160px 280px 1fr", gap: 12, alignItems: "start", marginBottom: 28 }}>
                                {lbl("Payment #", true)}
                                <div style={{ position: "relative" }}>
                                    {inp(form.paymentNumber, v => set("paymentNumber", v))}
                                    <i className="ti ti-settings" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#aaa", cursor: "pointer" }} />
                                </div>
                                <div />
                            </div>

                            {/* Amount + Bank Charges */}
                            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 180px 1fr", gap: 12, alignItems: "start", marginBottom: 6 }}>
                                {lbl("Amount\nReceived\n(INR)", true)}
                                <div>
                                    {inp(form.amount, v => set("amount", v), "number")}
                                </div>
                                <div style={{ fontSize: 13, color: "#333", fontWeight: 500, textAlign: "right", paddingRight: 16, paddingTop: 7 }}>Bank Charges<br />(if any)</div>
                                {inp(form.bankCharges, v => set("bankCharges", v), "number")}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, marginBottom: 20 }}>
                                <div />
                                <div style={{ fontSize: 12, color: "#333" }}>
                                    PAN: <span style={{ color: "#2563eb", cursor: "pointer", fontWeight: 500 }}>Add PAN</span>
                                </div>
                            </div>

                            {/* Tax deducted */}
                            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "center", marginBottom: 20 }}>
                                <div style={{ fontSize: 13, color: "#333", fontWeight: 500, textAlign: "right", paddingRight: 16 }}>Tax deducted?</div>
                                <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                                    {(["none", "tds"] as const).map((val, i) => (
                                        <label key={val} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 13, color: "#333" }}>
                                            <input type="radio" name="taxDeducted" value={val}
                                                checked={form.taxDeducted === val}
                                                onChange={() => set("taxDeducted", val)}
                                                style={{ accentColor: "#2563eb", width: 15, height: 15 }} />
                                            {val === "none" ? "No Tax deducted" : "Yes, TDS (Income Tax)"}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Invoice Details Table */}
                            <div style={{ marginTop: 32 }}>
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
                        <div style={{ background: "#fff", borderRadius: 8, padding: "24px 28px" }}>

                            {/* Payment Date + Payment Mode */}
                            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 160px 1fr", gap: 12, alignItems: "start", marginBottom: 20 }}>
                                {lbl("Payment Date", true)}
                                {inp(form.paymentDate, v => set("paymentDate", v), "text", "dd/MM/yyyy")}
                                <div style={{ fontSize: 13, color: "#333", fontWeight: 500, textAlign: "right", paddingRight: 16, paddingTop: 7 }}>Payment Mode</div>
                                {sel(form.paymentMode, v => set("paymentMode", v), ["Cash", "Bank Transfer", "Cheque", "UPI", "Credit Card", "Debit Card", "Net Banking"])}
                            </div>

                            {/* Reference Date + Deposit To */}
                            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 160px 1fr", gap: 12, alignItems: "start" }}>
                                {lbl("Payment\nReference", false)}
                                {inp(form.referenceDate, v => set("referenceDate", v), "text", "dd/MM/yyyy")}
                                <div style={{ fontSize: 13, color: "#e41f07", fontWeight: 500, textAlign: "right", paddingRight: 16, paddingTop: 7 }}>Deposit To<span style={{ color: "#e41f07" }}>*</span></div>
                                {sel(form.depositTo, v => set("depositTo", v), ["Petty Cash", "Bank Account", "HDFC Bank", "SBI Account", "ICICI Account"])}
                            </div>
                        </div>
                    </div>

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

                {/* Summary */}
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

                {/* Footer note */}
                <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid #eee", fontSize: 11, color: "#aaa", textAlign: "center" }}>
                    Thank you for your business!
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
    const [activeTab, setActiveTab] = useState<TabKey>("details");
    const [showDel, setShowDel] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [comment, setComment] = useState("");
    const [comments, setComments] = useState<{ text: string; date: string }[]>([]);
    const [sideSearch, setSideSearch] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const all = getAllRaw().filter(i => !i.isDeleted);
        setInvoices(all);
        const found = all.find(inv => inv.id === Number(id));
        setInvoice(found ?? null);
        if (found) setItems(loadItems(found.id));
    }, [id]);

    const updateStatus = (status: Invoice["status"]) => {
        const all = getAllRaw();
        const updated = all.map(x => x.id === invoice?.id ? { ...x, status } : x);
        saveAll(updated);
        setInvoice(prev => prev ? { ...prev, status } : prev);
        setInvoices(updated.filter(i => !i.isDeleted));
    };

    const handleDelete = () => {
        const all = getAllRaw();
        saveAll(all.map(x => x.id === invoice?.id ? { ...x, isDeleted: true } : x));
        navigate(route.billingInvoiceList);
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            setCopied(true); setTimeout(() => setCopied(false), 2000);
        });
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

    return (
        <div className="page-wrapper" style={{ display: "flex", flexDirection: "column", padding: "16px 20px", overflow: "hidden" }}>
            <div style={{ display: "flex", flex: 1, minHeight: 0, borderRadius: 8, boxShadow: "0 1px 6px rgba(0,0,0,0.1)", overflow: "hidden", background: "#fff" }}>

                {/* ── SIDEBAR ── */}
                <div style={{ width: 280, background: "#fff", borderRight: "1px solid #e8e8e8", display: "flex", flexDirection: "column", flexShrink: 0 }}>

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
                                        {(inv.status === "Overdue" || od > 0) ? (
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
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#fff" }}>
                    {invoice ? (
                        <>
                            {/* Top bar: title + icons */}
                            <div style={{ padding: "12px 24px", borderBottom: "1px solid #e8e8e8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>{invoice.invoiceNumber}</h2>
                                 <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <TBtn icon="ti-pencil" label="Edit" onClick={() => navigate(route.billingInvoiceEdit.replace(":id", String(invoice.id)))} />
                                    <div className="dropdown">
                                        <button data-bs-toggle="dropdown" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", border: "1px solid #e0e0e0", borderRadius: 4, width: 34, height: 34, cursor: "pointer", color: "#666" }}>
                                            <i className="ti ti-dots" style={{ fontSize: 16 }} />
                                        </button>
                                        <div className="dropdown-menu dropdown-menu-end shadow border-0 py-1" style={{ minWidth: 170 }}>
                                            <button className="dropdown-item py-2" style={{ fontSize: 13 }} onClick={() => updateStatus("Void")} disabled={invoice.status === "Void" || invoice.status === "Paid"}>Mark as Void</button>
                                            <button className="dropdown-item py-2" style={{ fontSize: 13 }}>Write Off</button>
                                            <div className="dropdown-divider" />
                                            <button className="dropdown-item py-2 text-danger fw-medium" style={{ fontSize: 13 }} onClick={() => setShowDel(true)}>Delete Invoice</button>
                                        </div>
                                    </div>
                                    <button title="Close" onClick={() => navigate(route.billingInvoiceList)} style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", border: "1px solid #e0e0e0", borderRadius: 4, width: 34, height: 34, cursor: "pointer", color: "#666" }}>
                                        <i className="ti ti-x" style={{ fontSize: 18 }} />
                                    </button>
                                </div>
                            </div>

                            {/* Toolbar */}
                             <div style={{ padding: "8px 16px", borderBottom: "1px solid #e8e8e8", display: "flex", alignItems: "center", gap: 6, flexWrap: "nowrap", overflowX: "auto", background: "#fafafa" }} className="hide-scrollbar">

                                <TBtn icon="ti-send" label="Send" onClick={() => updateStatus("Sent")} />
                                <TBtn icon="ti-share" label={copied ? "Copied!" : "Share"} onClick={handleShare} />
                                <TBtn icon="ti-bell" label="Reminders" onClick={() => {}} />

                                <TBtn icon="ti-printer" label="Print" onClick={handlePrint} />
                                <TBtn icon="ti-file-type-pdf" label="PDF" onClick={handlePrint} />

                                {/* Record Payment ▼ */}
                                 <button onClick={() => setShowPayment(true)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "1px solid #e0e0e0", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 14, color: "#333", whiteSpace: "nowrap" }}>
                                     <i className="ti ti-circle-check" style={{ fontSize: 14 }} /> Record Payment
                                 </button>
                            </div>

                            {/* Tabs */}
                            <div style={{ display: "flex", borderBottom: "1px solid #e8e8e8", padding: "0 20px", background: "#fff" }}>
                                {TABS.map(t => (
                                    <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ border: "none", background: "transparent", padding: "10px 14px", fontSize: 14, fontWeight: 500, color: activeTab === t.key ? "#e41f07" : "#666", borderBottom: `2px solid ${activeTab === t.key ? "#e41f07" : "transparent"}`, cursor: "pointer", marginBottom: -1 }}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* Tab content */}
                            {activeTab === "details" ? (
                                <div style={{ flex: 1, overflowY: "auto", padding: 24, background: "#f3f3f4" }}>

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

                                    {/* Payment gateway info bar */}
                                    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 6, padding: "10px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#555" }}>
                                        <i className="ti ti-credit-card" style={{ fontSize: 16, color: "#888" }} />
                                        Get paid faster by setting up payment gateways or display a UPI QR code.
                                        <span style={{ color: "#e41f07", cursor: "pointer", fontWeight: 500, marginLeft: 4 }}>Set up now</span>
                                    </div>

                                    {/* Invoice document */}
                                    <InvoiceDoc invoice={invoice} items={items} subtotal={subtotal} taxTotal={taxTotal} grandTotal={grandTotal} />
                                </div>
                            ) : (
                                /* Comments & History */
                                <div style={{ flex: 1, overflowY: "auto", padding: 24, background: "#f9f9f9" }}>
                                    <div style={{ maxWidth: 680, margin: "0 auto" }}>
                                        <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 6, padding: 16, marginBottom: 20 }}>
                                            <textarea rows={3} placeholder="Type a comment or note..." value={comment} onChange={e => setComment(e.target.value)}
                                                style={{ width: "100%", border: "1px solid #e8e8e8", borderRadius: 4, padding: "10px 12px", fontSize: 13, resize: "none", outline: "none", color: "#333" }} />
                                            <div style={{ marginTop: 10, textAlign: "right" }}>
                                                <button onClick={handleAddComment} style={{ background: "#e41f07", color: "#fff", border: "none", padding: "7px 18px", borderRadius: 20, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                                                    <i className="ti ti-send me-1" /> Post
                                                </button>
                                            </div>
                                        </div>
                                        {comments.length === 0 ? (
                                            <div style={{ textAlign: "center", padding: 48, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 6, color: "#bbb", fontSize: 13 }}>
                                                <i className="ti ti-messages d-block mb-2" style={{ fontSize: 32 }} />
                                                No comments yet.
                                            </div>
                                        ) : comments.map((c, i) => (
                                            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fff1f0", border: "2px solid #ffccc7", display: "flex", alignItems: "center", justifyContent: "center", color: "#e41f07", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                                                    {invoice.customerName.charAt(0).toUpperCase()}
                                                </div>
                                                <div style={{ flex: 1, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 6, padding: "10px 14px" }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                                                        <span style={{ fontWeight: 600, fontSize: 13 }}>{invoice.customerName}</span>
                                                        <span style={{ fontSize: 11, color: "#aaa" }}>{c.date}</span>
                                                    </div>
                                                    <div style={{ fontSize: 13, color: "#333", lineHeight: 1.6 }}>{c.text}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
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

            {showDel && invoice && (
                <DeleteConfirm num={invoice.invoiceNumber} onConfirm={handleDelete} onCancel={() => setShowDel(false)} />
            )}
            {showPayment && invoice && (
                <RecordPaymentModal
                    invoice={invoice}
                    grandTotal={grandTotal}
                    onClose={() => setShowPayment(false)}
                    onSave={() => updateStatus("Paid")}
                />
            )}
        </div>
    );
};

export default InvoiceView;
