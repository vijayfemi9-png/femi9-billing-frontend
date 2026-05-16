// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { all_routes } from "../../../../routes/all_routes";
import "./payment.scss";

interface AddressBlock {
    attention?: string; country?: string; street1?: string; street2?: string;
    city?: string; state?: string; zipCode?: string; phone?: string; fax?: string;
}
interface Customer {
    id: number; name: string; companyName: string; email?: string;
    workPhone?: string; receivables?: number; unusedCredits?: number; status?: string;
    billingAddress?: AddressBlock; shippingAddress?: AddressBlock;
}
interface Invoice  { id: number; invoiceNumber: string; date: string; customerName: string; amount: number; status: string; }
interface UnpaidRow { invoice: Invoice; amountDue: number; paymentReceived: string; }

// ── helpers ───────────────────────────────────────────────────────────────────
function loadCustomers(): Customer[] {
    try { const s = localStorage.getItem("billing_customers"); if (s) { const p = JSON.parse(s); if (Array.isArray(p)) return p.filter((c: any) => !c.isDeleted); } } catch { /**/ }
    return [];
}
function loadInvoicesByCustomer(name: string): Invoice[] {
    try { const s = localStorage.getItem("billing_invoices"); if (s) return (JSON.parse(s) as Invoice[]).filter(i => i.customerName === name && !i.isDeleted && i.status !== "Paid" && i.status !== "Void"); } catch { /**/ }
    return [];
}
function nextPayNum(): string {
    try { const a = JSON.parse(localStorage.getItem("billing_received_payments") || "[]"); return String((a.length || 0) + 1); } catch { return "1"; }
}
function todayISO(): string { return new Date().toISOString().slice(0, 10); }
function isoToDisplay(s: string) { if (!s) return ""; const [y, m, d] = s.split("-"); return `${d}/${m}/${y}`; }
const fmt = (n: number) => "₹" + (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const MODES    = ["Bank Remittance", "Bank Transfer", "Cash", "Cheque", "Credit Card", "UPI"];
const DEPOSIT_GROUPS = [
    { group: "Cash",                    options: ["Petty Cash", "Undeposited Funds"] },
    { group: "Other Current Liability", options: ["Employee Reimbursements", "Opening Balance Adjustments", "TDS Payable"] },
];
const LOCS = ["Head Office", "Main Warehouse", "Branch A", "Branch B"];

// ── SearchableDropdown ────────────────────────────────────────────────────────
interface SDOption { label: string; group?: string; }
const SearchableDropdown: React.FC<{
    value: string; placeholder: string; options?: string[];
    groups?: { group: string; options: string[] }[];
    onChange: (v: string) => void; error?: boolean;
    footer?: React.ReactNode;
}> = ({ value, placeholder, options, groups, onChange, error, footer }) => {
    const [open, setOpen]     = useState(false);
    const [q,    setQ]        = useState("");
    const ref                 = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const allOptions: SDOption[] = groups
        ? groups.flatMap(g => g.options.map(o => ({ label: o, group: g.group })))
        : (options || []).map(o => ({ label: o }));

    const filtered = allOptions.filter(o => o.label.toLowerCase().includes(q.toLowerCase()));

    const renderOptions = () => {
        if (groups) {
            return groups.map(g => {
                const opts = g.options.filter(o => o.toLowerCase().includes(q.toLowerCase()));
                if (!opts.length) return null;
                return (
                    <div key={g.group}>
                        <div style={{ padding: "6px 12px 4px", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>{g.group}</div>
                        {opts.map(o => (
                            <div key={o} onClick={() => { onChange(o); setOpen(false); setQ(""); }}
                                style={{ padding: "9px 14px 9px 20px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", background: value === o ? "#2563eb" : "transparent", color: value === o ? "#fff" : "#111827" }}
                                onMouseEnter={e => { if (value !== o) (e.currentTarget as HTMLDivElement).style.background = "#f3f4f6"; }}
                                onMouseLeave={e => { if (value !== o) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}>
                                {o} {value === o && <i className="ti ti-check" style={{ fontSize: 13 }} />}
                            </div>
                        ))}
                    </div>
                );
            });
        }
        return filtered.map(o => (
            <div key={o.label} onClick={() => { onChange(o.label); setOpen(false); setQ(""); }}
                style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", background: value === o.label ? "#2563eb" : "transparent", color: value === o.label ? "#fff" : "#111827" }}
                onMouseEnter={e => { if (value !== o.label) (e.currentTarget as HTMLDivElement).style.background = "#f3f4f6"; }}
                onMouseLeave={e => { if (value !== o.label) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}>
                {o.label} {value === o.label && <i className="ti ti-check" style={{ fontSize: 13 }} />}
            </div>
        ));
    };

    return (
        <div ref={ref} style={{ position: "relative", width: "100%" }}>
            <div onClick={() => setOpen(o => !o)}
                style={{ height: 38, border: `1px solid ${error || open ? "#e41f07" : "#d1d5db"}`, borderRadius: 6, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", cursor: "pointer", fontSize: 13, color: value ? "#111827" : "#9ca3af", boxShadow: open ? "0 0 0 3px rgba(228,31,7,.08)" : "none", userSelect: "none" }}>
                <span>{value || placeholder}</span>
                <i className={`ti ${open ? "ti-chevron-up" : "ti-chevron-down"}`} style={{ fontSize: 12, color: "#6b7280" }} />
            </div>
            {open && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 1040, maxHeight: 280, display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "8px 10px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 4, padding: "5px 10px" }}>
                            <i className="ti ti-search" style={{ fontSize: 13, color: "#9ca3af" }} />
                            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search"
                                style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, flex: 1, color: "#374151" }} />
                        </div>
                    </div>
                    <div style={{ overflowY: "auto", flex: 1 }}>{renderOptions()}</div>
                    {footer && <div style={{ borderTop: "1px solid #f3f4f6", flexShrink: 0 }}>{footer}</div>}
                </div>
            )}
        </div>
    );
};

// ── Payment Mode Modal ────────────────────────────────────────────────────────
const PaymentModeModal: React.FC<{
    modes: string[]; defaultMode: string;
    onClose: () => void; onSave: (modes: string[], def: string) => void;
}> = ({ modes, defaultMode, onClose, onSave }) => {
    const [list, setList]     = useState<string[]>([...modes]);
    const [defMode, setDef]   = useState(defaultMode);

    const update = (i: number, v: string) => setList(p => p.map((m, j) => j === i ? v : m));
    const remove = (i: number) => setList(p => { const n = p.filter((_, j) => j !== i); if (defMode === p[i]) setDef(n[0] || ""); return n; });
    const addNew = () => setList(p => [...p, ""]);

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 2100, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#fff", borderRadius: 8, width: 460, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 12px 40px rgba(0,0,0,0.18)" }}>
                {/* Header */}
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f9fafb", borderRadius: "8px 8px 0 0" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Payment Mode</span>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18, lineHeight: 1 }}>
                        <i className="ti ti-x" />
                    </button>
                </div>
                {/* List */}
                <div style={{ flex: 1, overflowY: "auto" }}>
                    {list.map((mode, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: "1px solid #f3f4f6" }}>
                            <input
                                value={mode}
                                onChange={e => update(i, e.target.value)}
                                style={{ flex: 1, height: 36, border: "1px solid #d1d5db", borderRadius: 5, padding: "0 10px", fontSize: 13, color: "#111827", outline: "none" }}
                                onFocus={e => (e.target.style.borderColor = "#e41f07")}
                                onBlur={e => (e.target.style.borderColor = "#d1d5db")}
                            />
                            {mode === defMode && (
                                <span style={{ background: "#16a34a", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap" }}>Default</span>
                            )}
                            {mode !== defMode && mode && (
                                <button type="button" onClick={() => setDef(mode)}
                                    style={{ background: "none", border: "1px solid #d1d5db", borderRadius: 4, padding: "2px 8px", fontSize: 11, color: "#6b7280", cursor: "pointer", whiteSpace: "nowrap" }}>
                                    Set Default
                                </button>
                            )}
                            <button type="button" onClick={() => remove(i)}
                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, lineHeight: 1, padding: "4px 6px", flexShrink: 0, borderRadius: 4, color: "#e41f07" }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff0ee"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}>
                                <i className="ti ti-trash" style={{ color: "#e41f07", fontSize: 15 }} />
                            </button>
                        </div>
                    ))}
                    {/* Add New */}
                    <div style={{ padding: "12px 20px" }}>
                        <button type="button" onClick={addNew}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#e41f07", fontSize: 13, fontWeight: 500, padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                            <i className="ti ti-plus" style={{ fontSize: 14 }} /> Add New
                        </button>
                    </div>
                </div>
                {/* Footer */}
                <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 10 }}>
                    <button onClick={() => onSave(list.filter(m => m.trim()), defMode)}
                        style={{ padding: "8px 20px", borderRadius: 4, border: "none", background: "#e41f07", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        Save
                    </button>
                    <button onClick={onClose}
                        style={{ padding: "8px 18px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", fontSize: 13, cursor: "pointer", color: "#374151" }}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── PAN Modal ─────────────────────────────────────────────────────────────────
const PANModal: React.FC<{ onClose: () => void; onSave: (v: string) => void }> = ({ onClose, onSave }) => {
    const [pan, setPan] = useState("");
    const [err, setErr] = useState("");
    const isValid = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase());
    const handleSave = () => {
        if (!pan) { setErr("PAN is required"); return; }
        if (!isValid) { setErr("Invalid PAN format (e.g. ABCDE1234F)"); return; }
        onSave(pan.toUpperCase()); onClose();
    };
    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#fff", borderRadius: 8, width: 400, boxShadow: "0 12px 40px rgba(0,0,0,0.18)", overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Add PAN</span>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18, lineHeight: 1 }}><i className="ti ti-x" /></button>
                </div>
                <div style={{ padding: 20 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6, display: "block" }}>PAN Number</label>
                    <input type="text" maxLength={10} placeholder="e.g. ABCDE1234F"
                        style={{ width: "100%", height: 38, border: `1px solid ${err ? "#e41f07" : "#d1d5db"}`, borderRadius: 5, padding: "0 12px", fontSize: 13, outline: "none", textTransform: "uppercase" }}
                        value={pan} onChange={e => { setPan(e.target.value.toUpperCase()); setErr(""); }} />
                    {err && <div style={{ color: "#e41f07", fontSize: 11, marginTop: 4 }}>{err}</div>}
                    <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8, marginBottom: 0 }}>Enter the 10-character PAN as issued by the Income Tax Department.</p>
                </div>
                <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", fontSize: 13, cursor: "pointer", color: "#374151" }}>Cancel</button>
                    <button onClick={handleSave} style={{ padding: "8px 18px", borderRadius: 4, border: "none", background: "#e41f07", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save PAN</button>
                </div>
            </div>
        </div>
    );
};

// ── Customer Detail Panel ─────────────────────────────────────────────────────
interface ActivityItem {
    id: string;
    type: "payment" | "invoice_created" | "invoice_sent" | "contact" | "contact_person";
    message: React.ReactNode;
    date: string;
    time: string;
}

function buildActivityLog(custName: string): ActivityItem[] {
    const items: ActivityItem[] = [];
    const user = "vickyyfemi9";

    const fmtDate = (d: string) => {
        if (!d) return "";
        // d may be dd/MM/yyyy or yyyy-MM-dd
        let parts = d.includes("/") ? d.split("/") : d.split("-").reverse();
        return parts.join("/");
    };
    const now = new Date();
    const todayStr = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;

    const blue   = "#2563eb";
    const orange = "#d97706";

    // Customer created
    items.push({ id: "c0", type: "contact",
        message: <span style={{ color: orange }}>Contact created</span>,
        date: todayStr, time: "10:46 AM" });

    // Contact person
    const custData = JSON.parse(localStorage.getItem("billing_customers") || "[]").find((c: any) => c.name === custName);
    if (custData) {
        const contactName = (custData.companyName && custData.companyName !== custData.name)
            ? custData.companyName
            : (custData.name || "").split(" ").filter((w: string) => !w.startsWith("(")).join(" ");
        items.push({ id: "cp0", type: "contact_person",
            message: <span style={{ color: orange }}>Contact person <strong style={{ color: orange }}>{contactName}</strong> has been created</span>,
            date: todayStr, time: "10:46 AM" });
    }

    // Invoices
    try {
        const invs = JSON.parse(localStorage.getItem("billing_invoices") || "[]") as any[];
        invs.filter(i => i.customerName === custName && !i.isDeleted).forEach(inv => {
            items.push({ id: `inv_c_${inv.id}`, type: "invoice_created",
                message: <span>Invoice <strong style={{ color: blue }}>{inv.invoiceNumber}</strong> of amount <strong style={{ color: blue }}>₹{(inv.amount||0).toFixed(2)}</strong> created</span>,
                date: fmtDate(inv.date) || todayStr, time: "05:16 PM" });
            if (inv.status === "Sent" || inv.status === "Paid") {
                items.push({ id: `inv_s_${inv.id}`, type: "invoice_sent",
                    message: <span>Invoice <strong style={{ color: blue }}>{inv.invoiceNumber}</strong> marked as sent</span>,
                    date: fmtDate(inv.date) || todayStr, time: "05:17 PM" });
            }
        });
    } catch { /**/ }

    // Payments
    try {
        const pays = JSON.parse(localStorage.getItem("billing_received_payments") || "[]") as any[];
        pays.filter(p => p.customerName === custName).forEach(pay => {
            items.push({ id: `pay_${pay.id}`, type: "payment",
                message: <span>Payment of amount <strong style={{ color: blue }}>₹{(pay.amount||0).toFixed(2)}</strong> received and applied for <strong style={{ color: blue }}>{pay.invoiceNumber || "—"}</strong></span>,
                date: fmtDate(pay.date) || todayStr, time: "05:35 PM" });
        });
    } catch { /**/ }

    // newest first — keep insert order (payments > invoices > contact)
    return items.reverse();
}

const activityIcon = (type: ActivityItem["type"]) => {
    if (type === "payment")         return { icon: "ti-message-circle-2", bg: "#eff6ff", color: "#3b82f6",  border: "#bfdbfe" };
    if (type === "invoice_sent")    return { icon: "ti-edit",             bg: "#fffbeb", color: "#d97706",  border: "#fde68a" };
    if (type === "invoice_created") return { icon: "ti-file-description", bg: "#fffbeb", color: "#d97706",  border: "#fde68a" };
    if (type === "contact_person")  return { icon: "ti-message-circle-2", bg: "#eff6ff", color: "#3b82f6",  border: "#bfdbfe" };
    return                                 { icon: "ti-message-circle-2", bg: "#eff6ff", color: "#3b82f6",  border: "#bfdbfe" };
};

const CustomerPanel: React.FC<{ cust: Customer; onClose: () => void }> = ({ cust, onClose }) => {
    const [tab,          setTab]          = useState<"details"|"activity">("details");
    const [showContacts, setShowContacts] = useState(false);
    const [showAddress,  setShowAddress]  = useState(false);
    const [activityLog,  setActivityLog]  = useState<ActivityItem[]>([]);
    const initials = (cust.name || "?")
        .split(" ")
        .filter(w => w && !w.startsWith("(") && !w.startsWith("["))
        .map(w => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "?";

    useEffect(() => {
        if (tab === "activity") setActivityLog(buildActivityLog(cust.name));
    }, [tab, cust.name]);

    const sectionHdr = (label: string, badge: number | null, open: boolean, toggle: () => void) => (
        <button type="button" onClick={toggle}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", padding: "13px 16px", cursor: "pointer", borderTop: "1px solid #e5e7eb" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{label}</span>
                {badge !== null && (
                    <span style={{ background: "#e5e7eb", color: "#374151", borderRadius: 4, fontSize: 11, fontWeight: 600, padding: "1px 6px" }}>{badge}</span>
                )}
            </div>
            <i className={`ti ${open ? "ti-chevron-down" : "ti-chevron-right"}`} style={{ fontSize: 13, color: "#6b7280" }} />
        </button>
    );

    return (
        <div style={{
            position: "fixed", top: 0, right: 0, width: 340, height: "100vh",
            background: "#fff", borderLeft: "1px solid #e5e7eb",
            boxShadow: "-4px 0 20px rgba(0,0,0,0.1)", zIndex: 1050,
            overflowY: "auto", display: "flex", flexDirection: "column",
        }}>
            {/* Header */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff", flexShrink: 0 }}>
                <div className="d-flex align-items-center gap-2 mb-1">
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#374151", flexShrink: 0 }}>
                        {initials}
                    </div>
                    <div className="flex-grow-1">
                        <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.4px" }}>Customer</div>
                        <div className="d-flex align-items-center gap-1">
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{cust.name}</span>
                            <i className="ti ti-external-link" style={{ fontSize: 13, color: "#6b7280", cursor: "pointer" }} />
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#9ca3af", fontSize: 16, lineHeight: 1 }}>
                        <i className="ti ti-x" />
                    </button>
                </div>
                {cust.companyName && cust.companyName !== cust.name && (
                    <div className="d-flex align-items-center gap-2 mt-1" style={{ fontSize: 13, color: "#374151" }}>
                        <i className="ti ti-building fs-13 text-muted" /> {cust.companyName}
                    </div>
                )}
                {cust.email && (
                    <div className="d-flex align-items-center gap-2 mt-1" style={{ fontSize: 13, color: "#374151" }}>
                        <i className="ti ti-mail fs-13 text-muted" /> {cust.email}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div style={{ borderBottom: "1px solid #e5e7eb", display: "flex", flexShrink: 0 }}>
                {(["details", "activity"] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        style={{ flex: 1, padding: "10px 0", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === t ? 600 : 400, color: tab === t ? "#e41f07" : "#6b7280", borderBottom: tab === t ? "2px solid #e41f07" : "2px solid transparent" }}>
                        {t === "details" ? "Details" : "Activity Log"}
                    </button>
                ))}
            </div>

            {tab === "details" && (
                <div style={{ flex: 1 }}>

                    {/* Receivables + Credits */}
                    <div style={{ margin: 16, border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                        <div className="text-center py-3 px-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
                            <i className="ti ti-alert-triangle" style={{ fontSize: 22, color: "#f59e0b", display: "block", marginBottom: 4 }} />
                            <div style={{ fontSize: 12, color: "#6b7280" }}>Outstanding Receivables</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{fmt(cust.receivables || 0)}</div>
                        </div>
                        <div className="text-center py-3 px-2">
                            <i className="ti ti-circle-check" style={{ fontSize: 22, color: "#10b981", display: "block", marginBottom: 4 }} />
                            <div style={{ fontSize: 12, color: "#6b7280" }}>Unused Credits</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{fmt(cust.unusedCredits || 0)}</div>
                        </div>
                    </div>

                    {/* Contact Details */}
                    <div style={{ padding: "0 16px 16px" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Contact Details</div>
                        {[
                            { label: "Customer Type",     value: "Individual" },
                            { label: "Currency",          value: "INR" },
                            { label: "Payment Terms",     value: "Due on Receipt" },
                            { label: "Portal Status",     value: cust.status === "Active" ? "Enabled" : "Disabled" },
                            { label: "Customer Language", value: "English" },
                        ].map(({ label, value }) => (
                            <div key={label} style={{ marginBottom: 10 }}>
                                <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 1 }}>{label}</div>
                                <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{value}</div>
                            </div>
                        ))}
                        {cust.workPhone && (
                            <div style={{ marginBottom: 10 }}>
                                <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 1 }}>Phone</div>
                                <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{cust.workPhone}</div>
                            </div>
                        )}
                    </div>

                    {/* ── Contact Persons (collapsible) ─────────────── */}
                    {sectionHdr("Contact Persons", 1, showContacts, () => setShowContacts(o => !o))}
                    {showContacts && (
                        <div style={{ padding: "12px 16px", background: "#fafafa", borderTop: "1px solid #f3f4f6" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                {/* Avatar with star */}
                                <div style={{ position: "relative", flexShrink: 0 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#fff" }}>
                                        {initials}
                                    </div>
                                    <div style={{ position: "absolute", bottom: -2, left: -2, width: 16, height: 16, borderRadius: "50%", background: "#10b981", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <i className="ti ti-star-filled" style={{ fontSize: 8, color: "#fff" }} />
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{cust.name}</div>
                                    {cust.email && (
                                        <div className="d-flex align-items-center gap-1 mt-1" style={{ fontSize: 12, color: "#6b7280" }}>
                                            <i className="ti ti-mail" style={{ fontSize: 12 }} /> {cust.email}
                                        </div>
                                    )}
                                    {cust.workPhone && (
                                        <div className="d-flex align-items-center gap-1 mt-1" style={{ fontSize: 12, color: "#6b7280" }}>
                                            <i className="ti ti-phone" style={{ fontSize: 12 }} /> {cust.workPhone}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Address (collapsible) ─────────────────────── */}
                    {sectionHdr("Address", null, showAddress, () => setShowAddress(o => !o))}
                    {showAddress && (() => {
                        const ba = cust?.billingAddress;
                        const sa = cust?.shippingAddress;
                        const hasBilling = ba && (ba.street1 || ba.street2 || ba.city || ba.state || ba.country || ba.zipCode || ba.attention);
                        const hasShipping = sa && (sa.street1 || sa.street2 || sa.city || sa.state || sa.country || sa.zipCode || sa.attention);
                        const renderAddr = (addr: AddressBlock) => {
                            const lines: string[] = [];
                            if (addr.attention) lines.push(addr.attention);
                            if (addr.street1)   lines.push(addr.street1);
                            if (addr.street2)   lines.push(addr.street2);
                            const cityLine = [addr.city, addr.state, addr.zipCode].filter(Boolean).join(", ");
                            if (cityLine)       lines.push(cityLine);
                            if (addr.country)   lines.push(addr.country);
                            if (addr.phone)     lines.push("Ph: " + addr.phone);
                            if (addr.fax)       lines.push("Fax: " + addr.fax);
                            return lines;
                        };
                        return (
                            <div style={{ padding: "14px 16px", background: "#fafafa", borderTop: "1px solid #f3f4f6" }}>
                                {/* Billing Address */}
                                <div style={{ marginBottom: 16 }}>
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <i className="ti ti-file-description" style={{ fontSize: 14, color: "#6b7280" }} />
                                        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Billing Address</span>
                                    </div>
                                    <div style={{ paddingLeft: 22, borderLeft: "2px solid #e5e7eb" }}>
                                        {hasBilling ? renderAddr(ba!).map((line, i) => (
                                            <div key={i} style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{line}</div>
                                        )) : (
                                            <span style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic" }}>No Billing Address</span>
                                        )}
                                    </div>
                                </div>
                                {/* Shipping Address */}
                                <div>
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <i className="ti ti-truck" style={{ fontSize: 14, color: "#6b7280" }} />
                                        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Shipping Address</span>
                                    </div>
                                    <div style={{ paddingLeft: 22, borderLeft: "2px solid #e5e7eb" }}>
                                        {hasShipping ? renderAddr(sa!).map((line, i) => (
                                            <div key={i} style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{line}</div>
                                        )) : (
                                            <span style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic" }}>No Shipping Address</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                </div>
            )}

            {tab === "activity" && (
                <div style={{ flex: 1, overflowY: "auto" }}>
                    {activityLog.length === 0 ? (
                        <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No activity yet</div>
                    ) : activityLog.map(item => {
                        const ic = activityIcon(item.type);
                        return (
                            <div key={item.id} style={{ display: "flex", gap: 12, padding: "14px 16px", borderBottom: "1px solid #f3f4f6" }}>
                                {/* Icon */}
                                <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 7, background: ic.bg, border: `1px solid ${ic.border}`, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                                    <i className={`ti ${ic.icon}`} style={{ fontSize: 16, color: ic.color }} />
                                </div>
                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                                        <strong style={{ color: "#374151" }}>vickyyfemi9</strong>
                                        <span style={{ margin: "0 4px" }}>·</span>
                                        {item.date} {item.time}
                                    </div>
                                    <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5, background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 6, padding: "8px 10px" }}>
                                        {item.message}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const AddPayment: React.FC = () => {
    const navigate     = useNavigate();
    const route        = all_routes;
    const fileRef      = useRef<HTMLInputElement>(null);
    const [searchParams] = useSearchParams();
    const editId       = searchParams.get("edit");

    const [customers,   setCustomers]   = useState<Customer[]>([]);
    const [custName,    setCustName]    = useState("");
    const [location,    setLocation]    = useState("");
    const [amount,      setAmount]      = useState("");
    const [bankCharge,  setBankCharge]  = useState("");
    const [payDate,     setPayDate]     = useState(todayISO());
    const [payNum,      setPayNum]      = useState(nextPayNum());
    const [payMode,     setPayMode]     = useState("");
    const [depositTo,   setDepositTo]   = useState("");
    const [reference,   setReference]   = useState("");
    const [taxDed,      setTaxDed]      = useState<"no"|"yes">("no");
    const [rows,        setRows]        = useState<UnpaidRow[]>([]);
    const [notes,       setNotes]       = useState("");
    const [thankYou,    setThankYou]    = useState(true);
    const [draftError,  setDraftError]  = useState("");
    const [files,       setFiles]       = useState<File[]>([]);
    const [errors,      setErrors]      = useState<Record<string,string>>({});
    const [saving,      setSaving]      = useState(false);
    const [showPanel,   setShowPanel]   = useState(false);
    const [showPanModal,setShowPanModal]= useState(false);
    const [panValue,    setPanValue]    = useState("");
    const [showModeModal,setShowModeModal] = useState(false);
    const [customModes,  setCustomModes]   = useState<string[]>(MODES);
    const [defaultMode,  setDefaultMode]   = useState("Cash");
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [filterFrom,  setFilterFrom]  = useState("");
    const [filterTo,    setFilterTo]    = useState("");

    const shown     = custName !== "";
    const cust      = customers.find(c => c.name === custName);
    const email     = cust?.email || "";
    const totalApplied = rows.reduce((s, r) => s + (parseFloat(r.paymentReceived) || 0), 0);
    const amtNum    = parseFloat(amount) || 0;
    const excess    = Math.max(0, amtNum - totalApplied);

    useEffect(() => { setCustomers(loadCustomers()); }, []);

    useEffect(() => {
        if (!editId) return;
        try {
            const all = JSON.parse(localStorage.getItem("billing_received_payments") || "[]");
            const p   = all.find((x: any) => String(x.id) === editId);
            if (!p) return;
            setCustName(p.customerName || "");
            setAmount(String(p.amount || ""));
            setPayMode(p.mode || "");
            setReference(p.referenceNumber || "");
            setPayNum(p.paymentNumber || "");
            // Convert dd/MM/yyyy → yyyy-MM-dd for the date input
            const parts = (p.date || "").split("/");
            if (parts.length === 3) setPayDate(`${parts[2]}-${parts[1]}-${parts[0]}`);
            setLocation(p.location || "");
            setBankCharge(p.bankCharge || "");
            setDepositTo(p.depositTo || "");
            setTaxDed(p.taxDed || "no");
            setNotes(p.notes || "");
            if (p.pan) setPanValue(p.pan);
            setThankYou(p.sendThankYou !== false);
        } catch { /**/ }
    }, [editId]);

    useEffect(() => {
        if (!custName) { setRows([]); setShowPanel(false); return; }
        setRows(loadInvoicesByCustomer(custName).map(inv => ({ invoice: inv, amountDue: inv.amount || 0, paymentReceived: "" })));
    }, [custName]);

    const applyRow  = (i: number, v: string) => setRows(prev => prev.map((r, j) => j === i ? { ...r, paymentReceived: v } : r));
    const clearApplied = () => setRows(prev => prev.map(r => ({ ...r, paymentReceived: "" })));

    const validate = () => {
        const e: Record<string,string> = {};
        if (!custName)                           e.custName  = "Customer is required";
        if (!amount || parseFloat(amount) <= 0)  e.amount    = "Amount is required";
        if (!payDate)                            e.payDate   = "Payment date is required";
        if (!payNum)                             e.payNum    = "Payment # is required";
        if (!depositTo)                          e.depositTo = "Deposit To is required";
        setErrors(e); return Object.keys(e).length === 0;
    };

    const save = (status: "Draft" | "Received") => {
        setDraftError("");
        if (status === "Draft" && thankYou) {
            setDraftError("You can only send a thank-you email for payments marked as Paid. Kindly uncheck the email option to proceed.");
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        if (!validate()) {
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        setSaving(true);
        let targetId = editId;
        try {
            const existing = JSON.parse(localStorage.getItem("billing_received_payments") || "[]");
            const inv = rows.find(r => parseFloat(r.paymentReceived) > 0);
            if (editId) {
                const updated = existing.map((p: any) =>
                    String(p.id) === editId
                        ? { ...p, 
                            paymentNumber: payNum, 
                            date: isoToDisplay(payDate), 
                            referenceNumber: reference,
                            customerName: custName, 
                            invoiceNumber: inv?.invoice.invoiceNumber || p.invoiceNumber,
                            mode: payMode || "Cash", 
                            amount: parseFloat(amount), 
                            unusedAmount: excess, 
                            status,
                            location,
                            bankCharge: parseFloat(bankCharge) || 0,
                            depositTo,
                            taxDed,
                            notes,
                            pan: panValue,
                            email,
                            sendThankYou: thankYou
                          }
                        : p
                );
                localStorage.setItem("billing_received_payments", JSON.stringify(updated));
            } else {
                const id = existing.length ? Math.max(...existing.map((p: any) => p.id)) + 1 : 1;
                targetId = String(id);
                localStorage.setItem("billing_received_payments", JSON.stringify([
                    ...existing,
                    { 
                        id, 
                        paymentNumber: payNum, 
                        date: isoToDisplay(payDate), 
                        referenceNumber: reference,
                        customerName: custName, 
                        invoiceNumber: inv?.invoice.invoiceNumber || "",
                        mode: payMode || "Cash", 
                        amount: parseFloat(amount), 
                        unusedAmount: excess, 
                        status,
                        location,
                        bankCharge: parseFloat(bankCharge) || 0,
                        depositTo,
                        taxDed,
                        notes,
                        pan: panValue,
                        email,
                        sendThankYou: thankYou
                    },
                ]));
            }

            // Automatic Send Logic
            if (status === "Received" && thankYou && email) {
                const subject = encodeURIComponent(`Payment Receipt ${payNum}`);
                const body = encodeURIComponent(
                    `Dear ${custName},\n\nWe have received your payment of ${fmt(parseFloat(amount) || 0)} on ${isoToDisplay(payDate)}.\n\nReceipt Number: ${payNum}\nMode: ${payMode || "Cash"}\n\nThank you for your business!`
                );
                window.open(`mailto:${email}?subject=${subject}&body=${body}`);
            }
        } catch (err) {
            console.error("Save failed:", err);
            setSaving(false);
            return;
        }
        setSaving(false);
        // Ensure we navigate after state updates
        setTimeout(() => {
            if (targetId) {
                navigate(route.paymentReceivedView.replace(":id", targetId));
            } else {
                navigate(route.paymentReceivedList);
            }
        }, 100);
    };

    return (
        <>
            {/* ── Modals ── */}
            {showModeModal && (
                <PaymentModeModal
                    modes={customModes} defaultMode={defaultMode}
                    onClose={() => setShowModeModal(false)}
                    onSave={(m, d) => { setCustomModes(m); setDefaultMode(d); setShowModeModal(false); }}
                />
            )}
            {showPanModal && <PANModal onClose={() => setShowPanModal(false)} onSave={v => { setPanValue(v); setShowPanModal(false); }} />}
            {showPanel && cust && <CustomerPanel cust={cust} onClose={() => setShowPanel(false)} />}

            {/* Date Range Filter Modal */}
            {showDateFilter && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ background: "#fff", borderRadius: 8, width: 420, boxShadow: "0 12px 40px rgba(0,0,0,0.18)", overflow: "hidden" }}>
                        {/* Header */}
                        <div style={{ padding: "14px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Date Range</span>
                            <button onClick={() => setShowDateFilter(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e41f07", fontSize: 18, lineHeight: 1 }}>
                                <i className="ti ti-x" />
                            </button>
                        </div>
                        {/* Body */}
                        <div style={{ padding: "20px 20px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                                <div style={{ flex: 1 }}>
                                    <input type="date" placeholder="dd/MM/yyyy"
                                        style={{ width: "100%", height: 38, border: "1px solid #d1d5db", borderRadius: 5, padding: "0 12px", fontSize: 13, outline: "none", color: filterFrom ? "#111827" : "#9ca3af" }}
                                        value={filterFrom}
                                        onChange={e => setFilterFrom(e.target.value)}
                                        onFocus={e => (e.target.style.borderColor = "#e41f07")}
                                        onBlur={e => (e.target.style.borderColor = "#d1d5db")} />
                                </div>
                                <span style={{ color: "#6b7280", fontSize: 15, fontWeight: 500 }}>-</span>
                                <div style={{ flex: 1 }}>
                                    <input type="date" placeholder="dd/MM/yyyy"
                                        style={{ width: "100%", height: 38, border: "1px solid #d1d5db", borderRadius: 5, padding: "0 12px", fontSize: 13, outline: "none", color: filterTo ? "#111827" : "#9ca3af" }}
                                        value={filterTo}
                                        onChange={e => setFilterTo(e.target.value)}
                                        onFocus={e => (e.target.style.borderColor = "#e41f07")}
                                        onBlur={e => (e.target.style.borderColor = "#d1d5db")} />
                                </div>
                            </div>
                            <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6, margin: 0, background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 5, padding: "10px 12px" }}>
                                <strong style={{ color: "#374151" }}>Note:</strong> If you've entered a Payment amount for any unpaid invoices, those invoices will continue to be shown at the top of the list, irrespective of the Date Range filter that you apply.
                            </p>
                        </div>
                        {/* Footer */}
                        <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 10 }}>
                            <button onClick={() => setShowDateFilter(false)}
                                style={{ padding: "8px 20px", borderRadius: 4, border: "none", background: "#e41f07", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                                Apply Filter
                            </button>
                            <button onClick={() => setShowDateFilter(false)}
                                style={{ padding: "8px 18px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", fontSize: 13, cursor: "pointer", color: "#374151" }}>
                                Cancel
                            </button>
                            <span onClick={() => { setFilterFrom(""); setFilterTo(""); }}
                                style={{ marginLeft: "auto", fontSize: 13, color: "#2563eb", cursor: "pointer", fontWeight: 500 }}>
                                Clear Selection
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className="page-wrapper">
            <div className="content">

                {/* Page Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                    <div>
                        <h4 style={{ fontWeight: 700, fontSize: 20, marginBottom: 4, color: "#111827" }}>
                            {editId ? "Edit Payment" : "Received Payments"}
                        </h4>
                        <ol style={{ display: "flex", gap: 6, alignItems: "center", listStyle: "none", margin: 0, padding: 0, fontSize: 13, color: "#6b7280" }}>
                            <li>Home</li><li>›</li><li>Payments Received</li><li>›</li>
                            <li style={{ color: "#111827", fontWeight: 500 }}>{editId ? "Edit" : "New"}</li>
                        </ol>
                    </div>
                    <button onClick={() => navigate(route.paymentReceivedList)}
                        style={{ width: 36, height: 36, borderRadius: 4, background: "#fff", border: "1px solid #e5e9ef", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        <i className="ti ti-x" style={{ fontSize: 16, color: "#374151" }} />
                    </button>
                </div>

                {/* Page body */}
                <div style={{ background: "#f8fafc" }}>

                    {/* Document Paper */}
                    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>

                        {/* Draft Error Banner */}
                        {draftError && (
                            <div style={{ background: "#fff1f0", borderBottom: "1px solid #ffa39e", color: "#434343", fontSize: 13, padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <i className="ti ti-alert-circle" style={{ color: "#e41f07", fontSize: 14 }} />
                                    {draftError}
                                </div>
                                <button onClick={() => setDraftError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14 }}>×</button>
                            </div>
                        )}

                        {/* Top Form Fields (Customer, Payment #, Date) */}
                        <div style={{ padding: "20px 32px", borderBottom: "1px solid #e5e7eb" }}>
                            <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
                                <label style={{ minWidth: 200, fontSize: 13, fontWeight: 500, color: "#e41f07", flexShrink: 0 }}>Customer Name*</label>
                                <div style={{ flex: 1, maxWidth: 520, display: "flex", alignItems: "center", gap: 10 }}>
                                    <select value={custName} onChange={e => { setCustName(e.target.value); setErrors({}); setShowPanel(false); }}
                                        style={{ flex: 1, height: 36, padding: "0 10px", fontSize: 13, border: `1px solid ${errors.custName ? "#e41f07" : "#d0d5dd"}`, borderRadius: 4, background: "#fff", outline: "none" }}>
                                        <option value="">Select or add a customer</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.name}>{c.name}{c.companyName && c.companyName !== c.name ? ` (${c.companyName})` : ""}</option>
                                        ))}
                                    </select>
                                    {custName && (
                                        <button type="button" className="pay-detail-btn" onClick={() => setShowPanel(s => !s)}>
                                            {custName}'s Details <i className="ti ti-chevron-right fs-12" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            {errors.custName && <div style={{ color: "#e41f07", fontSize: 11, marginTop: 4, marginLeft: 200 }}>{errors.custName}</div>}
                            {custName && cust && (
                                <div style={{ marginTop: 12, marginLeft: 200, display: "flex", gap: 40, fontSize: 12, color: "#374151", lineHeight: 1.5 }}>
                                    <div>
                                        <div style={{ fontWeight: 600, marginBottom: 4, color: "#111827" }}>Billing Address</div>
                                        {cust.billingAddress && (cust.billingAddress.street1 || cust.billingAddress.city) ? (
                                            <>
                                                {cust.billingAddress.attention && <div>{cust.billingAddress.attention}</div>}
                                                {cust.billingAddress.street1 && <div>{cust.billingAddress.street1}</div>}
                                                {cust.billingAddress.street2 && <div>{cust.billingAddress.street2}</div>}
                                                <div>
                                                    {cust.billingAddress.city}
                                                    {cust.billingAddress.state ? `, ${cust.billingAddress.state}` : ""}
                                                    {cust.billingAddress.zipCode ? ` ${cust.billingAddress.zipCode}` : ""}
                                                </div>
                                                {cust.billingAddress.country && <div>{cust.billingAddress.country}</div>}
                                            </>
                                        ) : (
                                            <div style={{ color: "#9ca3af" }}>No billing address</div>
                                        )}
                                        <div style={{ marginTop: 6 }}>
                                            PAN: <span onClick={() => setShowPanModal(true)} style={{ color: "#e41f07", cursor: "pointer", fontWeight: 500 }}>{panValue || "Add PAN"}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, marginBottom: 4, color: "#111827" }}>Shipping Address</div>
                                        {cust.shippingAddress && (cust.shippingAddress.street1 || cust.shippingAddress.city) ? (
                                            <>
                                                {cust.shippingAddress.attention && <div>{cust.shippingAddress.attention}</div>}
                                                {cust.shippingAddress.street1 && <div>{cust.shippingAddress.street1}</div>}
                                                {cust.shippingAddress.street2 && <div>{cust.shippingAddress.street2}</div>}
                                                <div>
                                                    {cust.shippingAddress.city}
                                                    {cust.shippingAddress.state ? `, ${cust.shippingAddress.state}` : ""}
                                                    {cust.shippingAddress.zipCode ? ` ${cust.shippingAddress.zipCode}` : ""}
                                                </div>
                                                {cust.shippingAddress.country && <div>{cust.shippingAddress.country}</div>}
                                            </>
                                        ) : (
                                            <div style={{ color: "#9ca3af" }}>No shipping address</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Conditional fields (shown after customer selected) ── */}
                        {shown && (
                            <>
                                {/* Payment Details — invoice-style label-left rows */}
                                <div style={{ padding: "20px 32px 8px", borderBottom: "1px solid #f1f5f9" }}>

                                    {/* Payment # */}
                                    <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
                                        <label style={{ minWidth: 200, fontSize: 13, fontWeight: 500, color: "#e41f07", flexShrink: 0 }}>Payment #*</label>
                                        <div style={{ flex: 1, maxWidth: 200 }}>
                                            <input value={payNum} onChange={e => setPayNum(e.target.value)}
                                                style={{ width: "100%", height: 36, padding: "0 10px", fontSize: 13, color: "#111827", border: `1px solid ${errors.payNum ? "#c0392b" : "#d0d5dd"}`, borderRadius: 4, background: "#fff", outline: "none", transition: "border-color 0.15s" }}
                                                onFocus={e => e.target.style.borderColor = "#e41f07"}
                                                onBlur={e => e.target.style.borderColor = errors.payNum ? "#c0392b" : "#d0d5dd"} />
                                        </div>
                                    </div>

                                    {/* Payment Date */}
                                    <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
                                        <label style={{ minWidth: 200, fontSize: 13, fontWeight: 500, color: "#e41f07", flexShrink: 0 }}>Payment Date*</label>
                                        <div style={{ flex: 1, maxWidth: 200 }}>
                                            <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                                                style={{ width: "100%", height: 36, padding: "0 10px", fontSize: 13, color: "#111827", border: `1px solid ${errors.payDate ? "#c0392b" : "#d0d5dd"}`, borderRadius: 4, background: "#fff", outline: "none", transition: "border-color 0.15s" }}
                                                onFocus={e => e.target.style.borderColor = "#e41f07"}
                                                onBlur={e => e.target.style.borderColor = errors.payDate ? "#c0392b" : "#d0d5dd"} />
                                        </div>
                                    </div>

                                    {/* Location */}
                                    <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
                                        <label style={{ minWidth: 200, fontSize: 13, fontWeight: 500, color: "#374151", flexShrink: 0 }}>Location</label>
                                        <div style={{ flex: 1, maxWidth: 420 }}>
                                            <select value={location} onChange={e => setLocation(e.target.value)}
                                                style={{ width: "100%", height: 36, padding: "0 10px", fontSize: 13, border: "1px solid #d0d5dd", borderRadius: 4, background: "#fff", outline: "none" }}>
                                                <option value="">Location</option>
                                                {LOCS.map(l => <option key={l}>{l}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Amount Received */}
                                    <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
                                        <label style={{ minWidth: 200, fontSize: 13, fontWeight: 500, color: "#e41f07", flexShrink: 0 }}>Amount Received*</label>
                                        <div style={{ flex: 1, maxWidth: 420 }}>
                                            <div style={{ display: "flex", height: 36, border: `1px solid ${errors.amount ? "#e41f07" : "#d0d5dd"}`, borderRadius: 4, overflow: "hidden" }}>
                                                <span style={{ padding: "0 12px", background: "#f9fafb", borderRight: "1px solid #d0d5dd", display: "flex", alignItems: "center", fontSize: 13, fontWeight: 600, color: "#374151" }}>INR</span>
                                                <input type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
                                                    style={{ flex: 1, border: "none", padding: "0 12px", fontSize: 13, outline: "none" }} />
                                            </div>
                                            {errors.amount && <div style={{ color: "#e41f07", fontSize: 11, marginTop: 3 }}>{errors.amount}</div>}
                                        </div>
                                    </div>

                                    {/* Bank Charges */}
                                    <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
                                        <label style={{ minWidth: 200, fontSize: 13, fontWeight: 500, color: "#374151", flexShrink: 0 }}>Bank Charges (if any)</label>
                                        <div style={{ flex: 1, maxWidth: 420 }}>
                                            <input type="number" min="0" step="0.01" placeholder="0.00" value={bankCharge} onChange={e => setBankCharge(e.target.value)}
                                                style={{ width: "100%", height: 36, padding: "0 12px", fontSize: 13, border: "1px solid #d0d5dd", borderRadius: 4, outline: "none" }} />
                                        </div>
                                    </div>

                                    {/* Payment Mode */}
                                    <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
                                        <label style={{ minWidth: 200, fontSize: 13, fontWeight: 500, color: "#374151", flexShrink: 0 }}>Payment Mode</label>
                                        <div style={{ flex: 1, maxWidth: 420 }}>
                                            <SearchableDropdown value={payMode} placeholder="Choose payment mode" options={customModes} onChange={setPayMode}
                                                footer={
                                                    <div onClick={() => setShowModeModal(true)}
                                                        style={{ padding: "10px 14px", cursor: "pointer", color: "#e41f07", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}
                                                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#fff5f5"}
                                                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
                                                        <i className="ti ti-circle-plus" style={{ fontSize: 14 }} /> Configure Payment Mode
                                                    </div>
                                                }
                                            />
                                        </div>
                                    </div>

                                    {/* Deposit To */}
                                    <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
                                        <label style={{ minWidth: 200, fontSize: 13, fontWeight: 500, color: "#e41f07", flexShrink: 0 }}>Deposit To*</label>
                                        <div style={{ flex: 1, maxWidth: 420 }}>
                                            <SearchableDropdown value={depositTo} placeholder="Select an account" groups={DEPOSIT_GROUPS} onChange={setDepositTo} error={!!errors.depositTo} />
                                            {errors.depositTo && <div style={{ color: "#e41f07", fontSize: 11, marginTop: 3 }}>{errors.depositTo}</div>}
                                        </div>
                                    </div>

                                    {/* Reference # */}
                                    <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
                                        <label style={{ minWidth: 200, fontSize: 13, fontWeight: 500, color: "#374151", flexShrink: 0 }}>Reference #</label>
                                        <div style={{ flex: 1, maxWidth: 420 }}>
                                            <input type="text" value={reference} onChange={e => setReference(e.target.value)}
                                                style={{ width: "100%", height: 36, padding: "0 12px", fontSize: 13, border: "1px solid #d0d5dd", borderRadius: 4, outline: "none" }} />
                                        </div>
                                    </div>

                                    {/* Tax Deducted */}
                                    <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
                                        <label style={{ minWidth: 200, fontSize: 13, fontWeight: 500, color: "#374151", flexShrink: 0 }}>Tax Deducted?</label>
                                        <div style={{ flex: 1, display: "flex", gap: 24, paddingTop: 4 }}>
                                            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                                                <input type="radio" name="taxDed" checked={taxDed === "no"} onChange={() => setTaxDed("no")} style={{ accentColor: "#e41f07", width: 15, height: 15 }} />
                                                No Tax deducted
                                            </label>
                                            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                                                <input type="radio" name="taxDed" checked={taxDed === "yes"} onChange={() => setTaxDed("yes")} style={{ accentColor: "#e41f07", width: 15, height: 15 }} />
                                                Yes, TDS (Income Tax)
                                            </label>
                                        </div>
                                    </div>

                                </div>

                                {/* Unpaid Invoices */}
                                <div style={{ padding: "20px 32px", borderBottom: "1px solid #f1f5f9" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <span style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>Unpaid Invoices</span>
                                            <button type="button" onClick={() => setShowDateFilter(true)}
                                                style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", border: `1px solid ${(filterFrom || filterTo) ? "#e41f07" : "#dee2e6"}`, borderRadius: 4, background: "#fff", fontSize: 12, color: (filterFrom || filterTo) ? "#e41f07" : "#6b7280", cursor: "pointer" }}>
                                                <i className="ti ti-calendar" style={{ fontSize: 12 }} /> Filter by Date Range
                                            </button>
                                        </div>
                                        {rows.some(r => parseFloat(r.paymentReceived) > 0) && (
                                            <button type="button" onClick={clearApplied} style={{ background: "none", border: "none", cursor: "pointer", color: "#e41f07", fontSize: 12, fontWeight: 500 }}>Clear Applied Amount</button>
                                        )}
                                    </div>
                                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 6, overflow: "hidden" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                            <thead>
                                                <tr style={{ background: "#f9fafb", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb" }}>
                                                    {["Date", "Invoice #", "Location", "Invoice Amount", "Amount Due", "Received On", "Payment"].map(h => (
                                                        <th key={h} style={{ padding: "9px 12px", fontSize: 11, fontWeight: 700, color: "#374151", textAlign: ["Invoice Amount", "Amount Due", "Payment"].includes(h) ? "right" : "left", letterSpacing: "0.3px", textTransform: "uppercase" }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rows.length === 0 ? (
                                                    <tr><td colSpan={7} style={{ textAlign: "center", color: "#9ca3af", padding: "28px 14px", fontSize: 13 }}>No unpaid invoices for this customer</td></tr>
                                                ) : rows.map((r, i) => (
                                                    <tr key={r.invoice.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                        <td style={{ padding: "10px 12px", fontSize: 13, color: "#374151" }}>{r.invoice.date}</td>
                                                        <td style={{ padding: "10px 12px" }}><span style={{ color: "#e41f07", fontWeight: 500, fontSize: 13 }}>{r.invoice.invoiceNumber}</span></td>
                                                        <td style={{ padding: "10px 12px", fontSize: 13, color: "#6b7280" }}>{location || "—"}</td>
                                                        <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, color: "#374151" }}>{fmt(r.invoice.amount)}</td>
                                                        <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, color: "#374151" }}>{fmt(r.amountDue)}</td>
                                                        <td style={{ padding: "10px 12px", fontSize: 13, color: "#6b7280" }}>—</td>
                                                        <td style={{ padding: "10px 12px", textAlign: "right" }}>
                                                            <input type="number" min="0" step="0.01" placeholder="0.00"
                                                                style={{ width: 100, height: 30, border: "1px solid #e5e7eb", borderRadius: 4, padding: "0 8px", fontSize: 12, textAlign: "right", outline: "none" }}
                                                                value={r.paymentReceived} onChange={e => applyRow(i, e.target.value)}
                                                                onFocus={e => (e.target.style.borderColor = "#e41f07")}
                                                                onBlur={e => (e.target.style.borderColor = "#e5e7eb")} />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            {rows.length > 0 && (
                                                <tfoot>
                                                    <tr style={{ background: "#fafafa", borderTop: "2px solid #e5e7eb" }}>
                                                        <td colSpan={6} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, fontSize: 12, color: "#374151" }}>Amount applied to invoices</td>
                                                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 13, color: "#374151" }}>{fmt(totalApplied)}</td>
                                                    </tr>
                                                    <tr style={{ background: "#fafafa" }}>
                                                        <td colSpan={6} style={{ padding: "6px 12px", textAlign: "right", fontWeight: 600, fontSize: 12, color: "#374151" }}>Amount in excess</td>
                                                        <td style={{ padding: "6px 12px", textAlign: "right", fontWeight: 700, fontSize: 13, color: excess > 0 ? "#059669" : "#374151" }}>{fmt(excess)}</td>
                                                    </tr>
                                                </tfoot>
                                            )}
                                        </table>
                                    </div>
                                </div>

                                {/* Amount Summary */}
                                <div style={{ padding: "16px 32px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end" }}>
                                    <div style={{ minWidth: 320, background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8, padding: "16px 20px" }}>
                                        {[{ label: "Amount Received", val: amtNum }, { label: "Amount used for Payments", val: totalApplied }, { label: "Amount Refunded", val: 0 }].map(({ label, val }) => (
                                            <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                                <span style={{ color: "#6b7280", fontSize: 13 }}>{label} :</span>
                                                <span style={{ color: "#374151", fontWeight: 500, fontSize: 13 }}>{val.toFixed(2)}</span>
                                            </div>
                                        ))}
                                        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 10, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6b7280" }}>
                                                <i className="ti ti-alert-triangle" style={{ color: excess > 0 ? "#f59e0b" : "#9ca3af", fontSize: 15 }} /> Amount in Excess:
                                            </span>
                                            <span style={{ fontWeight: 700, fontSize: 14, color: excess > 0 ? "#f59e0b" : "#374151" }}>₹ {excess.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div style={{ padding: "16px 32px", borderBottom: "1px solid #f1f5f9" }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6, display: "block" }}>
                                        Notes <span style={{ color: "#9ca3af", fontStyle: "italic", fontWeight: 400 }}>(Internal use. Not visible to customer)</span>
                                    </label>
                                    <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                                        style={{ width: "100%", padding: "8px 12px", fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 4, outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
                                        onFocus={e => (e.target.style.borderColor = "#e41f07")}
                                        onBlur={e => (e.target.style.borderColor = "#e5e7eb")} />
                                </div>

                                {/* Attachments */}
                                <div style={{ padding: "16px 32px", borderBottom: "1px solid #f1f5f9" }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, display: "block" }}>Attachments</label>
                                    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                                        <button type="button" onClick={() => fileRef.current?.click()}
                                            style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", border: "1px solid #d1d5db", borderRight: "none", borderRadius: "4px 0 0 4px", background: "#fff", cursor: "pointer", fontSize: 13, color: "#374151", fontWeight: 500 }}>
                                            <i className="ti ti-upload" style={{ fontSize: 14 }} /> Upload File
                                        </button>
                                        <button type="button" style={{ padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: "0 4px 4px 0", background: "#fff", cursor: "pointer", fontSize: 13, color: "#374151" }}>
                                            <i className="ti ti-chevron-down" style={{ fontSize: 13 }} />
                                        </button>
                                    </div>
                                    <input ref={fileRef} type="file" multiple style={{ display: "none" }}
                                        onChange={e => { const f = Array.from(e.target.files || []); if (files.length + f.length <= 5) setFiles(p => [...p, ...f]); e.target.value = ""; }} />
                                    <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 6, marginBottom: 0 }}>You can upload a maximum of 5 files, 5MB each</p>
                                    {files.length > 0 && (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                                            {files.map((f, i) => (
                                                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "#f3f4f6", borderRadius: 4, fontSize: 12, color: "#374151", border: "1px solid #e5e7eb" }}>
                                                    <i className="ti ti-file" style={{ fontSize: 13 }} />{f.name}
                                                    <button type="button" onClick={() => setFiles(p => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 12, padding: 0, marginLeft: 2 }}>
                                                        <i className="ti ti-x" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Thank You Note */}
                                <div style={{ padding: "16px 32px 24px" }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                        <input type="checkbox" checked={thankYou} onChange={e => setThankYou(e.target.checked)} style={{ width: 15, height: 15, accentColor: "#e41f07" }} />
                                        <span style={{ fontSize: 13, color: "#374151" }}>Send a "Thank you" note for this payment</span>
                                    </label>
                                    {thankYou && email && (
                                        <div style={{ marginTop: 8, marginLeft: 23 }}>
                                            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                                <input type="checkbox" defaultChecked style={{ width: 14, height: 14, accentColor: "#e41f07" }} />
                                                <span style={{ fontSize: 13, color: "#374151" }}>{custName} &lt;{email}&gt;</span>
                                            </label>
                                        </div>
                                    )}
                                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                                        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 0 }}>
                                            <strong style={{ color: "#374151" }}>Additional Fields:</strong>{" "}
                                            Start adding custom fields for your payments received by going to <em>Settings → Sales → Payments Received.</em>
                                        </p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 24, paddingTop: 20, borderTop: "1px solid #f1f5f9" }}>
                                        <button type="button" disabled={saving} onClick={() => save("Draft")}
                                            style={{ padding: "8px 20px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                                            Save as Draft
                                        </button>
                                        <button type="button" disabled={saving} onClick={() => save("Received")}
                                            style={{ padding: "8px 20px", borderRadius: 4, border: "none", background: "#e41f07", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                                            {saving ? "Saving..." : editId ? "Update Payment" : "Save and Send"}
                                        </button>
                                        <button type="button" onClick={() => navigate(editId ? route.paymentReceivedView.replace(":id", editId) : route.paymentReceivedList)}
                                            style={{ padding: "8px 20px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                                            Cancel
                                        </button>
                                    </div>

                                </div>
                            </>
                        )}
                    </div>
                </div>


            </div>{/* content */}
            </div>{/* page-wrapper */}
        </>
    );
};

export default AddPayment;