// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { all_routes } from "../../../../routes/all_routes";
import jsPDF from "jspdf";

interface ReceivedPayment {
    id: number; paymentNumber: string; date: string;
    referenceNumber: string; customerName: string; invoiceNumber: string;
    mode: string; amount: number; unusedAmount: number; status: string;
}
interface Customer {
    id: number; name: string; companyName: string; email?: string;
    workPhone?: string; address?: string; city?: string; state?: string; country?: string;
}

const SK   = "billing_received_payments";
const CSK  = "billing_customers";
const route = all_routes;

function loadPayments(): ReceivedPayment[] {
    try { const s = localStorage.getItem(SK); if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length) return p; } } catch { /**/ }
    return [];
}
function loadCustomer(name: string): Customer | null {
    try { const s = localStorage.getItem(CSK); if (s) { const a = JSON.parse(s); return a.find((c: any) => c.name === name) || null; } } catch { /**/ }
    return null;
}
const fmt = (n: number) => "₹" + (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

// ── Amount to words ───────────────────────────────────────────────────────────
const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
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
    const paise  = Math.round((amount - rupees) * 100);
    let w = "Indian Rupee " + inWords(rupees);
    if (paise) w += " and " + inWords(paise) + " Paise";
    return w + " Only";
}

// ── Send Dropdown ─────────────────────────────────────────────────────────────
const SendDropdown: React.FC<{ payment: ReceivedPayment }> = ({ payment }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
    }, []);
    const items = ["Send Email", "Send SMS", "Send WhatsApp"];
    return (
        <div ref={ref} style={{ position: "relative" }}>
            <button onClick={() => setOpen(o => !o)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "1px solid #e5e7eb", borderRadius: 5, background: "#fff", fontSize: 13, color: "#374151", cursor: "pointer", fontWeight: 500 }}>
                <i className="ti ti-send" style={{ fontSize: 14 }} /> Send
                <i className="ti ti-chevron-down" style={{ fontSize: 11, color: "#9ca3af" }} />
            </button>
            {open && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 200, minWidth: 160 }}>
                    {items.map(it => (
                        <div key={it} onClick={() => { alert(`${it}: ${payment.customerName}`); setOpen(false); }}
                            style={{ padding: "9px 14px", fontSize: 13, color: "#374151", cursor: "pointer" }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#f9fafb"}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
                            {it}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── PDF/Print Dropdown ────────────────────────────────────────────────────────
const PDFDropdown: React.FC<{ payment: ReceivedPayment; cust: Customer | null }> = ({ payment, cust }) => {
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
            doc.setFillColor(228, 31, 7);
            doc.rect(0, 0, w, 12, "F");
            doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
            doc.text("PAYMENT RECEIPT", w / 2, 8, { align: "center" });
            let y = 24;
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(14); doc.setFont("helvetica", "bold");
            doc.text(cust?.companyName || payment.customerName, margin, y); y += 6;
            doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100);
            if (cust?.state)    { doc.text(cust.state, margin, y); y += 5; }
            if (cust?.country)  { doc.text(cust.country, margin, y); y += 5; }
            if (cust?.workPhone){ doc.text(cust.workPhone, margin, y); y += 5; }
            if (cust?.email)    { doc.text(cust.email, margin, y); y += 5; }
            y += 4; doc.setDrawColor(220); doc.line(margin, y, w - margin, y); y += 8;
            doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
            doc.text("PAYMENT RECEIPT", w / 2, y, { align: "center" }); y += 10;
            const rows = [
                ["Payment Date", payment.date],
                ["Reference Number", payment.referenceNumber || "—"],
                ["Payment Mode", payment.mode],
                ["Amount Received In Words", amountToWords(payment.amount)],
            ];
            doc.setFontSize(10);
            rows.forEach(([label, val]) => {
                doc.setFont("helvetica", "normal"); doc.setTextColor(120); doc.text(label, margin, y);
                doc.setFont("helvetica", "bold"); doc.setTextColor(0); doc.text(val, 90, y); y += 9;
            });
            y += 4;
            doc.setFillColor(90, 145, 70); doc.roundedRect(w - margin - 50, y - 6, 50, 22, 3, 3, "F");
            doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(255, 255, 255);
            doc.text("Amount Received", w - margin - 25, y + 2, { align: "center" });
            doc.setFontSize(13); doc.setFont("helvetica", "bold");
            doc.text(fmt(payment.amount), w - margin - 25, y + 12, { align: "center" });
            doc.save(`Payment_${payment.paymentNumber}.pdf`);
        } catch (e) { console.error(e); }
        setOpen(false);
    };

    return (
        <div ref={ref} style={{ position: "relative" }}>
            <button onClick={() => setOpen(o => !o)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "1px solid #e5e7eb", borderRadius: 5, background: "#fff", fontSize: 13, color: "#374151", cursor: "pointer", fontWeight: 500 }}>
                <i className="ti ti-file-text" style={{ fontSize: 14 }} /> PDF/Print
                <i className="ti ti-chevron-down" style={{ fontSize: 11, color: "#9ca3af" }} />
            </button>
            {open && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 200, minWidth: 160 }}>
                    {[{ label: "Download PDF", icon: "ti-download", fn: exportPDF }, { label: "Print", icon: "ti-printer", fn: printReceipt }].map(({ label, icon, fn }) => (
                        <div key={label} onClick={fn}
                            style={{ padding: "9px 14px", fontSize: 13, color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#f9fafb"}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
                            <i className={`ti ${icon}`} style={{ fontSize: 13, color: "#6b7280" }} /> {label}
                        </div>
                    ))}
                </div>
            )}
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
                style={{ display: "flex", alignItems: "center", padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 5, background: "#fff", fontSize: 13, color: "#374151", cursor: "pointer" }}>
                <i className="ti ti-dots" style={{ fontSize: 15 }} />
            </button>
            {open && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 200, minWidth: 140 }}>
                    {items.map(({ label, icon, fn, danger }) => (
                        <div key={label} onClick={() => { fn(); setOpen(false); }}
                            style={{ padding: "9px 14px", fontSize: 13, color: danger ? "#e41f07" : "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#f9fafb"}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
                            <i className={`ti ${icon}`} style={{ fontSize: 13, color: danger ? "#e41f07" : "#6b7280" }} /> {label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const PaymentView: React.FC = () => {
    const { id }    = useParams<{ id: string }>();
    const navigate  = useNavigate();

    const [payments,     setPayments]     = useState<ReceivedPayment[]>([]);
    const [selected,     setSelected]     = useState<ReceivedPayment | null>(null);
    const [cust,         setCust]         = useState<Customer | null>(null);
    const [showComments, setShowComments] = useState(false);
    const [comment,      setComment]      = useState("");
    const [comments,     setComments]     = useState<string[]>([]);
    const [listSearch,   setListSearch]   = useState("");

    useEffect(() => {
        const all = loadPayments();
        setPayments(all);
        const target = id ? all.find(p => String(p.id) === id) : all[0];
        if (target) { setSelected(target); setCust(loadCustomer(target.customerName)); }
        else if (all.length) { setSelected(all[0]); setCust(loadCustomer(all[0].customerName)); }
    }, [id]);

    const selectPayment = (p: ReceivedPayment) => {
        setSelected(p);
        setCust(loadCustomer(p.customerName));
        navigate(route.paymentReceivedView.replace(":id", String(p.id)));
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
        const updated = payments.map(p => p.id === selected.id ? { ...p, status: "Void" } : p);
        localStorage.setItem(SK, JSON.stringify(updated));
        setPayments(updated);
        setSelected(s => s ? { ...s, status: "Void" } : s);
    };

    const refundPayment = () => {
        if (!selected) return;
        const updated = payments.map(p => p.id === selected.id ? { ...p, status: "Refunded" } : p);
        localStorage.setItem(SK, JSON.stringify(updated));
        setPayments(updated);
        setSelected(s => s ? { ...s, status: "Refunded" } : s);
    };

    const statusColor = (s?: string) => {
        if (!s || s === "Received") return { bg: "#dcfce7", color: "#16a34a" };
        if (s === "Void")     return { bg: "#fee2e2", color: "#e41f07" };
        if (s === "Draft")    return { bg: "#fef9c3", color: "#ca8a04" };
        if (s === "Refunded") return { bg: "#e0f2fe", color: "#0284c7" };
        return { bg: "#f3f4f6", color: "#6b7280" };
    };

    const filtered = payments.filter(p =>
        p.customerName.toLowerCase().includes(listSearch.toLowerCase()) ||
        p.paymentNumber.includes(listSearch)
    );

    const companyName = cust?.companyName || selected?.customerName || "";

    return (
        <>
            <style>{`
                @media print {
                    .pv-sidebar, .pv-topbar, .pv-actions { display: none !important; }
                    .pv-receipt { box-shadow: none !important; border: none !important; }
                }
                .pv-list-item:hover { background: #f1f5f9; }
                .pv-list-item.active { background: #eff6ff; border-left: 3px solid #e41f07; }
                .pv-action-btn { display:flex; align-items:center; gap:5px; padding:6px 12px; border:1px solid #e5e7eb; border-radius:5px; background:#fff; font-size:13px; color:#374151; cursor:pointer; font-weight:500; white-space:nowrap; }
                .pv-action-btn:hover { background:#f9fafb; }
            `}</style>

            <div className="page-wrapper">
                <div className="content" style={{ padding: 0, height: "calc(100vh - 56px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

                    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

                        {/* ── Left Sidebar ────────────────────────────── */}
                        <div className="pv-sidebar" style={{ width: 300, borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", background: "#fff", flexShrink: 0 }}>
                            {/* Sidebar Header */}
                            <div style={{ padding: "12px 14px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>All Received Pa...</span>
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
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f3f4f6", overflow: "hidden" }}>

                                {/* Top bar */}
                                <div className="pv-topbar" style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "8px 20px 8px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                                    <div>
                                        <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, letterSpacing: 0.2 }}>Location: Head Office</div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginTop: 1 }}>{selected.paymentNumber}</div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <i className="ti ti-paperclip" style={{ fontSize: 17, color: "#9ca3af", cursor: "pointer" }} />
                                        <i className="ti ti-message-circle-2" style={{ fontSize: 17, color: showComments ? "#e41f07" : "#9ca3af", cursor: "pointer" }}
                                            onClick={() => setShowComments(o => !o)} />
                                        <button onClick={() => navigate(route.paymentReceivedList)}
                                            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", color: "#9ca3af", fontSize: 14 }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fee2e2"; (e.currentTarget as HTMLButtonElement).style.color = "#e41f07"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#fca5a5"; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; (e.currentTarget as HTMLButtonElement).style.color = "#9ca3af"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb"; }}>
                                            <i className="ti ti-x" />
                                        </button>
                                    </div>
                                </div>

                                {/* Action bar */}
                                <div className="pv-actions" style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "8px 24px", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                    <button className="pv-action-btn"
                                        onClick={() => navigate(route.paymentReceivedAdd + "?edit=" + selected.id)}>
                                        <i className="ti ti-edit" style={{ fontSize: 14 }} /> Edit
                                    </button>
                                    <SendDropdown payment={selected} />
                                    <PDFDropdown payment={selected} cust={cust} />
                                    <button className="pv-action-btn" onClick={refundPayment}>
                                        <i className="ti ti-receipt-refund" style={{ fontSize: 14 }} /> Refund
                                    </button>
                                    <MoreDropdown payment={selected} onDelete={deletePayment} onVoid={voidPayment} />
                                </div>

                                {/* Receipt scroll area */}
                                <div style={{ flex: 1, overflowY: "auto", background: "#f3f4f6", padding: "30px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                    <div className="pv-receipt" style={{ position: "relative", border: "1px solid #d0d0d0", background: "#fff", maxWidth: 900, width: "100%", padding: "60px", fontSize: 13, lineHeight: 1.5, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>

                                        {/* Status ribbon */}
                                        <div style={{ position: "absolute", top: 0, left: 0, width: 120, height: 120, overflow: "hidden", pointerEvents: "none" }}>
                                            <div style={{ position: "absolute", top: 28, left: -36, width: 180, background: selected.status === "Void" ? "#999" : "#27ae60", color: "#fff", textAlign: "center", transform: "rotate(-45deg)", padding: "7px 0", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
                                                {selected.status === "Received" ? "PAID" : selected.status.toUpperCase()}
                                            </div>
                                        </div>

                                        {/* Company Header */}
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
                                            <div>
                                                <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>FEMI9</div>
                                                <div style={{ color: "#555", fontSize: 12 }}>Tamil Nadu, India</div>
                                                <div style={{ color: "#555", fontSize: 12 }}>91-8012610945</div>
                                                <div style={{ color: "#555", fontSize: 12 }}>femi9@gmail.com</div>
                                            </div>
                                            <div style={{ fontSize: 26, fontWeight: 300, color: "#1a1a1a", letterSpacing: 2, textAlign: "right" }}>
                                                PAYMENT RECEIPT
                                            </div>
                                        </div>

                                        {/* Receipt Info + Amount Grid */}
                                        <div style={{ display: "flex", gap: 32, alignItems: "flex-start", marginBottom: 32 }}>
                                            <div style={{ flex: 1 }}>
                                                <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ccc" }}>
                                                    <tbody>
                                                        <tr>
                                                            <td style={{ padding: "8px 12px", border: "1px solid #ccc", width: "40%", color: "#888", fontSize: 12 }}>Payment Date</td>
                                                            <td style={{ padding: "8px 12px", border: "1px solid #ccc", fontWeight: 600 }}>: {selected.date}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style={{ padding: "8px 12px", border: "1px solid #ccc", color: "#888", fontSize: 12 }}>Reference Number</td>
                                                            <td style={{ padding: "8px 12px", border: "1px solid #ccc", fontWeight: 600 }}>: {selected.referenceNumber || "—"}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style={{ padding: "8px 12px", border: "1px solid #ccc", color: "#888", fontSize: 12 }}>Payment Mode</td>
                                                            <td style={{ padding: "8px 12px", border: "1px solid #ccc" }}>: {selected.mode}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style={{ padding: "8px 12px", border: "1px solid #ccc", color: "#888", fontSize: 12 }}>Amount Received In Words</td>
                                                            <td style={{ padding: "8px 12px", border: "1px solid #ccc" }}>: {amountToWords(selected.amount)}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div style={{ flexShrink: 0, width: 180, background: "#fcfdfe", border: "1px solid #e0e0e0", borderRadius: 8, padding: "20px 16px", textAlign: "center" }}>
                                                <div style={{ fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Amount Received</div>
                                                <div style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a" }}>{fmt(selected.amount)}</div>
                                            </div>
                                        </div>

                                        {/* Received From */}
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
                                            <div>
                                                <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Received From</div>
                                                <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>{selected.customerName}</div>
                                            </div>
                                            <div style={{ textAlign: "center" }}>
                                                <div style={{ borderTop: "1px solid #1a1a1a", width: 180, marginBottom: 8 }} />
                                                <div style={{ fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>Authorized Signature</div>
                                            </div>
                                        </div>

                                        {/* Payment for — Invoice table */}
                                        <div style={{ marginBottom: 32 }}>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginBottom: 12, letterSpacing: 0.5 }}>Payment for</div>
                                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                                <thead>
                                                    <tr style={{ background: "#f5f5f5" }}>
                                                        {["Invoice Number", "Invoice Date", "Invoice Amount", "Payment Amount"].map((h, i) => (
                                                            <th key={h} style={{ padding: "9px 10px", border: "1px solid #ddd", fontSize: 11, color: "#666", fontWeight: 700, textAlign: i > 1 ? "right" : "left", textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selected.invoiceNumber ? (
                                                        <tr>
                                                            <td style={{ padding: "9px 10px", border: "1px solid #ddd", fontWeight: 500, color: "#2563eb" }}>{selected.invoiceNumber}</td>
                                                            <td style={{ padding: "9px 10px", border: "1px solid #ddd", color: "#333" }}>{selected.date}</td>
                                                            <td style={{ padding: "9px 10px", border: "1px solid #ddd", color: "#333", textAlign: "right" }}>{fmt(selected.amount)}</td>
                                                            <td style={{ padding: "9px 10px", border: "1px solid #ddd", color: "#1a1a1a", textAlign: "right", fontWeight: 600 }}>{fmt(selected.amount)}</td>
                                                        </tr>
                                                    ) : (
                                                        <tr><td colSpan={4} style={{ padding: "20px", textAlign: "center", fontSize: 13, color: "#aaa", border: "1px solid #ddd" }}>No invoice applied</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                            
                                            {/* Unused amount */}
                                            {selected.unusedAmount > 0 && (
                                                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                                                    <table style={{ width: 300, borderCollapse: "collapse", border: "1px solid #e0e0e0", background: "#fcfdfe" }}>
                                                        <tbody>
                                                            <tr>
                                                                <td style={{ padding: "10px 16px", color: "#666", fontSize: 13 }}>Amount in Excess</td>
                                                                <td style={{ padding: "10px 16px", textAlign: "right", fontSize: 13, color: "#f59e0b", fontWeight: 700 }}>{fmt(selected.unusedAmount)}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
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

                                        {/* Comments section */}
                                        {showComments && (
                                            <div style={{ marginTop: 28, borderTop: "1px solid #e5e7eb", paddingTop: 20 }}>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Comments</div>
                                                {comments.map((c, i) => (
                                                    <div key={i} style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 6, padding: "10px 12px", marginBottom: 8, fontSize: 13, color: "#374151" }}>{c}</div>
                                                ))}
                                                <div style={{ display: "flex", gap: 8 }}>
                                                    <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..."
                                                        style={{ flex: 1, height: 36, border: "1px solid #d1d5db", borderRadius: 5, padding: "0 10px", fontSize: 13, outline: "none" }}
                                                        onFocus={e => (e.target.style.borderColor = "#e41f07")}
                                                        onBlur={e => (e.target.style.borderColor = "#d1d5db")}
                                                        onKeyDown={e => { if (e.key === "Enter" && comment.trim()) { setComments(p => [...p, comment.trim()]); setComment(""); } }} />
                                                    <button onClick={() => { if (comment.trim()) { setComments(p => [...p, comment.trim()]); setComment(""); } }}
                                                        style={{ padding: "0 14px", background: "#e41f07", border: "none", borderRadius: 5, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                                                        Add
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
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
