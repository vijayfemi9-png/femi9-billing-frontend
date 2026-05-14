// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { all_routes } from "../../../../routes/all_routes";

interface Customer {
    id: number; name: string; companyName: string; email?: string;
    workPhone?: string; receivables?: number; unusedCredits?: number; status?: string;
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
                    {showAddress && (
                        <div style={{ padding: "14px 16px", background: "#fafafa", borderTop: "1px solid #f3f4f6" }}>
                            {/* Billing Address */}
                            <div style={{ marginBottom: 16 }}>
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <i className="ti ti-file-description" style={{ fontSize: 14, color: "#6b7280" }} />
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Billing Address</span>
                                </div>
                                <div style={{ paddingLeft: 22, borderLeft: "2px solid #e5e7eb" }}>
                                    <span style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic" }}>No Billing Address</span>
                                </div>
                            </div>
                            {/* Shipping Address */}
                            <div>
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <i className="ti ti-truck" style={{ fontSize: 14, color: "#6b7280" }} />
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Shipping Address</span>
                                </div>
                                <div style={{ paddingLeft: 22, borderLeft: "2px solid #e5e7eb" }}>
                                    <span style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic" }}>No Shipping Address</span>
                                </div>
                            </div>
                        </div>
                    )}

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
    const navigate = useNavigate();
    const route    = all_routes;
    const fileRef  = useRef<HTMLInputElement>(null);

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
        if (!validate()) return;
        setSaving(true);
        try {
            const existing = JSON.parse(localStorage.getItem("billing_received_payments") || "[]");
            const id = existing.length ? Math.max(...existing.map((p: any) => p.id)) + 1 : 1;
            const inv = rows.find(r => parseFloat(r.paymentReceived) > 0);
            localStorage.setItem("billing_received_payments", JSON.stringify([
                ...existing,
                { id, paymentNumber: payNum, date: isoToDisplay(payDate), referenceNumber: reference,
                  customerName: custName, invoiceNumber: inv?.invoice.invoiceNumber || "",
                  mode: payMode || "Cash", amount: parseFloat(amount), unusedAmount: excess, status },
            ]));
        } catch { /**/ }
        setSaving(false);
        navigate(route.paymentReceivedList);
    };

    return (
        <>
            <style>{`
                .pay-ctrl:focus { border-color:#e41f07 !important; box-shadow:0 0 0 3px rgba(228,31,7,.08) !important; }
                .pay-reveal { animation:paySlide .22s ease; }
                @keyframes paySlide { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
                .pay-row { display:flex; align-items:flex-start; margin-bottom:16px; }
                .pay-lbl { min-width:200px; max-width:200px; padding-top:9px; font-size:13px; font-weight:500; flex-shrink:0; }
                .pay-lbl-req { color:#e41f07; }
                .pay-lbl-opt { color:#374151; }
                .pay-field { flex:1; max-width:540px; }
                .pay-err { color:#e41f07; font-size:11px; margin-top:4px; }
                .pay-tbl th { font-size:11px; font-weight:600; color:#6b7280; letter-spacing:.5px; text-transform:uppercase; white-space:nowrap; padding:10px 14px; background:#f8fafc; border-bottom:2px solid #e5e7eb; }
                .pay-tbl td { padding:10px 14px; font-size:13px; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
                .pay-tbl tr:last-child td { border-bottom:none; }
                .pay-tbl tbody tr:hover td { background:#fafbfc; }
                .pay-sum-row { display:flex; justify-content:space-between; align-items:center; padding:5px 0; font-size:13px; }
                .pay-divider { height:1px; background:#e5e7eb; margin:20px 0; }
                .pay-check { display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px; color:#374151; margin:0; }
                .pay-detail-btn { display:inline-flex; align-items:center; gap:5px; background:#1e293b; color:#fff; border:none; border-radius:4px; padding:5px 10px; font-size:12px; font-weight:500; cursor:pointer; white-space:nowrap; }
                .pay-detail-btn:hover { background:#0f172a; }
                .form-check-input:checked { background-color:#e41f07 !important; border-color:#e41f07 !important; }
                .input-group-text { background:#f9fafb; border-color:#d1d5db; color:#6b7280; font-size:13px; font-weight:500; }
            `}</style>

            {/* Payment Mode Config Modal */}
            {showModeModal && (
                <PaymentModeModal
                    modes={customModes} defaultMode={defaultMode}
                    onClose={() => setShowModeModal(false)}
                    onSave={(m, d) => { setCustomModes(m); setDefaultMode(d); setShowModeModal(false); }}
                />
            )}

            {/* PAN Modal */}
            {showPanModal && <PANModal onClose={() => setShowPanModal(false)} onSave={v => { setPanValue(v); setShowPanModal(false); }} />}

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

            {/* Customer Detail Side Panel */}
            {showPanel && cust && <CustomerPanel cust={cust} onClose={() => setShowPanel(false)} />}

            <div className="page-wrapper">
                <div className="content">

                    {/* Page Header */}
                    <div className="d-flex align-items-center justify-content-between mb-4">
                        <div>
                            <h4 className="fw-bold mb-1 fs-20">Record Payment</h4>
                            <nav aria-label="breadcrumb">
                                <ol className="breadcrumb mb-0 fs-13">
                                    <li className="breadcrumb-item"><Link to="/" className="text-muted">Home</Link></li>
                                    <li className="breadcrumb-item"><Link to={route.paymentReceivedList} className="text-muted">Payments Received</Link></li>
                                    <li className="breadcrumb-item active text-dark fw-medium">New</li>
                                </ol>
                            </nav>
                        </div>
                        <button onClick={() => navigate(route.paymentReceivedList)}
                            className="btn btn-white border shadow-none d-flex align-items-center justify-content-center"
                            style={{ width: 34, height: 34, borderRadius: 6 }}>
                            <i className="ti ti-x fs-16 text-muted" />
                        </button>
                    </div>

                    {/* Form Card */}
                    <div className="card border-0 shadow-sm" style={{ borderRadius: 0 }}>
                        <div className="card-body" style={{ padding: "32px 40px" }}>

                            {/* Customer Name */}
                            <div className="pay-row">
                                <label className="pay-lbl pay-lbl-req">Customer Name*</label>
                                <div className="pay-field">
                                    <div className="d-flex align-items-center gap-2">
                                        <select className="form-select pay-ctrl fs-13"
                                            style={{ height: 38, flex: 1, borderColor: errors.custName ? "#e41f07" : "#d1d5db" }}
                                            value={custName}
                                            onChange={e => { setCustName(e.target.value); setErrors({}); setShowPanel(false); }}>
                                            <option value="">Select Customer</option>
                                            {customers.map(c => (
                                                <option key={c.id} value={c.name}>
                                                    {c.name}{c.companyName && c.companyName !== c.name ? ` (${c.companyName})` : ""}
                                                </option>
                                            ))}
                                        </select>
                                        {custName && (
                                            <button type="button" className="pay-detail-btn" onClick={() => setShowPanel(s => !s)}>
                                                {custName}'s Details <i className="ti ti-chevron-right fs-12" />
                                            </button>
                                        )}
                                    </div>
                                    {errors.custName && <div className="pay-err">{errors.custName}</div>}
                                    {custName && (
                                        <div className="mt-1" style={{ fontSize: 12, color: "#374151" }}>
                                            PAN:{" "}
                                            <span onClick={() => setShowPanModal(true)} style={{ color: "#e41f07", cursor: "pointer", fontWeight: 500 }}>
                                                {panValue || "Add PAN"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Revealed after customer selected */}
                            {shown && (
                                <div className="pay-reveal">
                                    <div className="pay-divider" style={{ margin: "4px 0 20px" }} />

                                    {/* Location */}
                                    <div className="pay-row">
                                        <label className="pay-lbl pay-lbl-opt">Location</label>
                                        <div className="pay-field">
                                            <select className="form-select pay-ctrl fs-13" style={{ height: 38 }}
                                                value={location} onChange={e => setLocation(e.target.value)}>
                                                <option value="">Location</option>
                                                {LOCS.map(l => <option key={l}>{l}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Amount Received — INR prefix */}
                                    <div className="pay-row">
                                        <label className="pay-lbl pay-lbl-req">Amount Received*</label>
                                        <div className="pay-field">
                                            <div className="input-group" style={{ maxWidth: 540 }}>
                                                <span className="input-group-text fw-semibold">INR</span>
                                                <input type="number" min="0" step="0.01" placeholder="0.00"
                                                    className="form-control pay-ctrl fs-13"
                                                    style={{ height: 38, borderColor: errors.amount ? "#e41f07" : "#d1d5db" }}
                                                    value={amount} onChange={e => setAmount(e.target.value)} />
                                            </div>
                                            {errors.amount && <div className="pay-err">{errors.amount}</div>}
                                        </div>
                                    </div>

                                    {/* Bank Charges */}
                                    <div className="pay-row">
                                        <label className="pay-lbl pay-lbl-opt">Bank Charges (if any)</label>
                                        <div className="pay-field">
                                            <input type="number" min="0" step="0.01" placeholder="0.00"
                                                className="form-control pay-ctrl fs-13" style={{ height: 38 }}
                                                value={bankCharge} onChange={e => setBankCharge(e.target.value)} />
                                        </div>
                                    </div>

                                    {/* Payment Date */}
                                    <div className="pay-row">
                                        <label className="pay-lbl pay-lbl-req">Payment Date*</label>
                                        <div className="pay-field">
                                            <input type="date"
                                                className="form-control pay-ctrl fs-13"
                                                style={{ height: 38, borderColor: errors.payDate ? "#e41f07" : "#d1d5db" }}
                                                value={payDate} onChange={e => setPayDate(e.target.value)} />
                                            {errors.payDate && <div className="pay-err">{errors.payDate}</div>}
                                        </div>
                                    </div>

                                    {/* Payment # — gear icon */}
                                    <div className="pay-row">
                                        <label className="pay-lbl pay-lbl-req">Payment #*</label>
                                        <div className="pay-field">
                                            <input type="text"
                                                className="form-control pay-ctrl fs-13"
                                                style={{ height: 38, borderColor: errors.payNum ? "#e41f07" : "#d1d5db" }}
                                                value={payNum} onChange={e => setPayNum(e.target.value)} />
                                            {errors.payNum && <div className="pay-err">{errors.payNum}</div>}
                                        </div>
                                    </div>

                                    {/* Payment Mode */}
                                    <div className="pay-row">
                                        <label className="pay-lbl pay-lbl-opt">Payment Mode</label>
                                        <div className="pay-field">
                                            <SearchableDropdown
                                                value={payMode}
                                                placeholder="Choose the payment term or type to add"
                                                options={customModes}
                                                onChange={setPayMode}
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
                                    <div className="pay-row">
                                        <label className="pay-lbl pay-lbl-req">Deposit To*</label>
                                        <div className="pay-field">
                                            <SearchableDropdown
                                                value={depositTo}
                                                placeholder="Select an account"
                                                groups={DEPOSIT_GROUPS}
                                                onChange={setDepositTo}
                                                error={!!errors.depositTo}
                                            />
                                            {errors.depositTo && <div className="pay-err">{errors.depositTo}</div>}
                                        </div>
                                    </div>

                                    {/* Reference # */}
                                    <div className="pay-row">
                                        <label className="pay-lbl pay-lbl-opt">Reference#</label>
                                        <div className="pay-field">
                                            <input type="text" className="form-control pay-ctrl fs-13" style={{ height: 38 }}
                                                value={reference} onChange={e => setReference(e.target.value)} />
                                        </div>
                                    </div>

                                    {/* Tax Deducted */}
                                    <div className="pay-row">
                                        <label className="pay-lbl pay-lbl-opt">Tax deducted?</label>
                                        <div className="pay-field d-flex align-items-center gap-4 pt-2">
                                            <label className="pay-check">
                                                <input type="radio" className="form-check-input mt-0" name="taxDed"
                                                    checked={taxDed === "no"} onChange={() => setTaxDed("no")}
                                                    style={{ accentColor: "#e41f07", width: 15, height: 15 }} />
                                                No Tax deducted
                                            </label>
                                            <label className="pay-check">
                                                <input type="radio" className="form-check-input mt-0" name="taxDed"
                                                    checked={taxDed === "yes"} onChange={() => setTaxDed("yes")}
                                                    style={{ accentColor: "#e41f07", width: 15, height: 15 }} />
                                                Yes, TDS (Income Tax)
                                            </label>
                                        </div>
                                    </div>

                                    {/* ── Unpaid Invoices ────────────────────────── */}
                                    <div className="mt-4">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="fw-bold fs-14 text-dark">Unpaid Invoices</span>
                                                <button type="button" onClick={() => setShowDateFilter(true)}
                                                    className="btn btn-white border shadow-none d-flex align-items-center gap-1 fs-12 px-2 py-1"
                                                    style={{ borderRadius: 4, color: (filterFrom || filterTo) ? "#e41f07" : "#6b7280", borderColor: (filterFrom || filterTo) ? "#e41f07" : "#dee2e6" }}>
                                                    <i className="ti ti-calendar fs-12" /> Filter by Date Range <i className={`ti ti-chevron-${showDateFilter ? "up" : "down"} fs-10`} />
                                                </button>
                                            </div>
                                            {rows.some(r => parseFloat(r.paymentReceived) > 0) && (
                                                <button type="button" onClick={clearApplied}
                                                    className="btn btn-link p-0 shadow-none fs-12 fw-medium"
                                                    style={{ color: "#e41f07", textDecoration: "none" }}>
                                                    Clear Applied Amount
                                                </button>
                                            )}
                                        </div>
                                        <div className="table-responsive rounded-2" style={{ border: "1px solid #e5e7eb" }}>
                                            <table className="pay-tbl w-100" style={{ borderCollapse: "collapse" }}>
                                                <thead>
                                                    <tr>
                                                        {["Date", "Invoice Number", "Location", "Invoice Amount", "Amount Due", "Payment Received On", "Payment"].map(h => (
                                                            <th key={h} style={{ textAlign: ["Invoice Amount", "Amount Due", "Payment"].includes(h) ? "right" : "left" }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rows.length === 0 ? (
                                                        <tr><td colSpan={7} className="text-center text-muted py-5 fs-13">No unpaid invoices for this customer</td></tr>
                                                    ) : rows.map((r, i) => (
                                                        <tr key={r.invoice.id}>
                                                            <td className="text-dark">{r.invoice.date}</td>
                                                            <td><span className="text-primary fw-medium">{r.invoice.invoiceNumber}</span></td>
                                                            <td className="text-muted">{location || "—"}</td>
                                                            <td className="text-end text-dark">{fmt(r.invoice.amount)}</td>
                                                            <td className="text-end text-dark">{fmt(r.amountDue)}</td>
                                                            <td className="text-muted">—</td>
                                                            <td className="text-end">
                                                                <input type="number" min="0" step="0.01" placeholder="0.00"
                                                                    className="form-control pay-ctrl fs-12 text-end"
                                                                    style={{ width: 110, height: 32, display: "inline-block" }}
                                                                    value={r.paymentReceived}
                                                                    onChange={e => applyRow(i, e.target.value)} />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                {rows.length > 0 && (
                                                    <tfoot>
                                                        <tr style={{ background: "#f8fafc", borderTop: "2px solid #e5e7eb" }}>
                                                            <td colSpan={6} className="text-end fw-semibold fs-12 text-dark" style={{ padding: "10px 14px" }}>Amount applied to invoices</td>
                                                            <td className="text-end fw-bold fs-13 text-dark" style={{ padding: "10px 14px" }}>{fmt(totalApplied)}</td>
                                                        </tr>
                                                        <tr style={{ background: "#f8fafc" }}>
                                                            <td colSpan={6} className="text-end fw-semibold fs-12 text-dark" style={{ padding: "6px 14px" }}>Amount in excess</td>
                                                            <td className="text-end fw-bold fs-13" style={{ padding: "6px 14px", color: excess > 0 ? "#059669" : "#111827" }}>{fmt(excess)}</td>
                                                        </tr>
                                                    </tfoot>
                                                )}
                                            </table>
                                        </div>
                                    </div>

                                    {/* ── Amount Summary ─────────────────────────── */}
                                    <div className="d-flex justify-content-end mt-4">
                                        <div style={{ minWidth: 340, background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8, padding: "16px 20px" }}>
                                            {[
                                                { label: "Amount Received",          val: amtNum },
                                                { label: "Amount used for Payments", val: totalApplied },
                                                { label: "Amount Refunded",          val: 0 },
                                            ].map(({ label, val }) => (
                                                <div key={label} className="pay-sum-row">
                                                    <span style={{ color: "#6b7280", fontSize: 13 }}>{label} :</span>
                                                    <span style={{ color: "#374151", fontWeight: 500, fontSize: 13 }}>{val.toFixed(2)}</span>
                                                </div>
                                            ))}
                                            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 10, marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6b7280" }}>
                                                    <i className="ti ti-alert-triangle" style={{ color: excess > 0 ? "#f59e0b" : "#9ca3af", fontSize: 15 }} />
                                                    Amount in Excess:
                                                </span>
                                                <span style={{ fontWeight: 700, fontSize: 14, color: excess > 0 ? "#f59e0b" : "#374151" }}>
                                                    ₹ {excess.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Notes ──────────────────────────────────── */}
                                    <div className="mt-4">
                                        <label className="fs-13 fw-medium text-dark mb-2 d-block">
                                            Notes <span className="text-muted fst-italic fw-normal">(Internal use. Not visible to customer)</span>
                                        </label>
                                        <textarea className="form-control pay-ctrl fs-13" rows={3} style={{ resize: "vertical" }}
                                            value={notes} onChange={e => setNotes(e.target.value)} />
                                    </div>

                                    {/* ── Attachments ────────────────────────────── */}
                                    <div className="mt-4">
                                        <label className="fs-13 fw-medium text-dark mb-2 d-block">Attachments</label>
                                        <div className="d-inline-flex align-items-center border rounded" style={{ borderColor: "#d1d5db", overflow: "hidden" }}>
                                            <button type="button" onClick={() => fileRef.current?.click()}
                                                className="btn btn-white border-0 d-flex align-items-center gap-2 fs-13 fw-medium shadow-none"
                                                style={{ borderRadius: 0, padding: "7px 14px" }}>
                                                <i className="ti ti-upload fs-14" /> Upload File
                                            </button>
                                            <button type="button" className="btn btn-white border-0 border-start shadow-none"
                                                style={{ borderRadius: 0, padding: "7px 10px", borderColor: "#d1d5db" }}>
                                                <i className="ti ti-chevron-down fs-12 text-muted" />
                                            </button>
                                        </div>
                                        <input ref={fileRef} type="file" multiple style={{ display: "none" }}
                                            onChange={e => {
                                                const f = Array.from(e.target.files || []);
                                                if (files.length + f.length <= 5) setFiles(p => [...p, ...f]);
                                                e.target.value = "";
                                            }} />
                                        <p className="text-muted fs-12 mt-1 mb-0">You can upload a maximum of 5 files, 5MB each</p>
                                        {files.length > 0 && (
                                            <div className="d-flex flex-wrap gap-2 mt-2">
                                                {files.map((f, i) => (
                                                    <div key={i} className="d-flex align-items-center gap-2 px-3 py-1 rounded border fs-12 bg-light" style={{ borderColor: "#e5e7eb" }}>
                                                        <i className="ti ti-file fs-13 text-muted" />
                                                        <span className="text-dark">{f.name}</span>
                                                        <button type="button" onClick={() => setFiles(p => p.filter((_, j) => j !== i))}
                                                            className="btn btn-link p-0 shadow-none text-muted" style={{ lineHeight: 1 }}>
                                                            <i className="ti ti-x fs-11" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="pay-divider" />

                                    {/* ── Thank You Note ─────────────────────────── */}
                                    <div className="mb-3">
                                        <label className="pay-check">
                                            <input type="checkbox" className="form-check-input mt-0" checked={thankYou}
                                                onChange={e => setThankYou(e.target.checked)}
                                                style={{ width: 15, height: 15, accentColor: "#2563eb" }} />
                                            <span className="fs-13 text-dark">Send a "Thank you" note for this payment</span>
                                        </label>
                                        {thankYou && email && (
                                            <div className="mt-2 ms-4">
                                                <label className="pay-check">
                                                    <input type="checkbox" className="form-check-input mt-0" defaultChecked
                                                        style={{ width: 14, height: 14, accentColor: "#2563eb" }} />
                                                    <span className="fs-13 text-dark">{custName} &lt;{email}&gt;</span>
                                                </label>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pay-divider" />

                                    {/* ── Additional Fields ──────────────────────── */}
                                    <p className="fs-13 text-muted mb-0">
                                        <strong className="text-dark">Additional Fields:</strong>{" "}
                                        Start adding custom fields for your payments received by going to{" "}
                                        <em>Settings → Sales → Payments Received.</em>
                                    </p>
                                </div>
                            )}

                            {/* Footer Buttons — inside card */}
                            {shown && (
                                <div className="pay-reveal" style={{ borderTop: "1px solid #e5e7eb", marginTop: 8, paddingTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
                                    <button type="button" disabled={saving} onClick={() => save("Received")}
                                        className="btn fw-semibold shadow-none fs-13"
                                        style={{ padding: "9px 22px", borderRadius: 4, border: "none", background: "#e41f07", color: "#fff" }}>
                                        {saving ? "Saving..." : "Save and Send"}
                                    </button>
                                    <button type="button" disabled={saving} onClick={() => save("Draft")}
                                        className="btn fw-semibold shadow-none fs-13"
                                        style={{ padding: "9px 22px", borderRadius: 4, border: "none", background: "#f59e0b", color: "#fff" }}>
                                        Save as Draft
                                    </button>
                                    <button type="button" onClick={() => navigate(route.paymentReceivedList)}
                                        className="btn fw-medium shadow-none fs-13"
                                        style={{ padding: "9px 22px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", color: "#374151" }}>
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AddPayment;