// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import "./credit.scss";
import { useParams, useNavigate } from "react-router-dom";
import { Dropdown } from "antd";
import { all_routes } from "../../../../../routes/all_routes";

// ── Types ─────────────────────────────────────────────────────────────────────
interface LineItem { id: number; productName: string; sku: string; quantity: number; rate: number; discount: number; taxPercent: number; amount: number; }
interface Comment { text: string; date: string; user: string; }
interface CreditNote {
    id: number;
    date: string;
    location: string;
    creditNoteNumber: string;
    referenceNumber: string;
    customerName: string;
    invoiceNumber: string;
    status: "Open" | "Draft" | "Void" | "Closed";
    amount: number;
    reason: string;
    notes: string;
    terms: string;
    createdBy: string;
    createdTime: string;
    lastModifiedBy: string;
    lastModifiedTime: string;
    items?: LineItem[];
    comments?: Comment[];
    appliedAmount?: number;
    refundedAmount?: number;
}
interface Invoice {
    id: number;
    invoiceNumber: string;
    customerName: string;
    date: string;
    dueDate: string;
    amount: number;
    status: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const SK = "billing_credit_notes";
const RED = "#e41f07";

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
    "Open": { color: "#15803d", bg: "#dcfce7" },
    "Draft": { color: "#f9b801", bg: "rgb(254,248,230)" },
    "Void": { color: "#dc2626", bg: "#fee2e2" },
    "Closed": { color: "#475569", bg: "#f1f5f9" },
};

function loadAll(): CreditNote[] {
    try {
        const s = localStorage.getItem(SK);
        if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length) return p; }
    } catch { /**/ }
    return [];
}
function saveAll(data: CreditNote[]) { localStorage.setItem(SK, JSON.stringify(data)); }
function nowDatetime() {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const h = d.getHours() % 12 || 12;
    const ampm = d.getHours() >= 12 ? "PM" : "AM";
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(h)}:${pad(d.getMinutes())} ${ampm}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
const CreditNoteView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const route = all_routes;

    const [records, setRecords] = useState<CreditNote[]>([]);
    const [selected, setSelected] = useState<CreditNote | null>(null);
    const [listSearch, setListSearch] = useState("");
    const [showPdfView, setShowPdfView] = useState(true);
    const [showComments, setShowComments] = useState(false);
    const [showAttach, setShowAttach] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // ── Zoho Option Modals State ──
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);

    // Email
    const [emailTo, setEmailTo] = useState("");
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");

    // Apply to Invoices
    const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
    const [appliedValues, setAppliedValues] = useState<Record<number, number>>({});

    // Refund
    const [refundAmountVal, setRefundAmountVal] = useState("");
    const [refundModeVal, setRefundModeVal] = useState("Cash");
    const [refundDateVal, setRefundDateVal] = useState("19/05/2026");
    const [refundNotesVal, setRefundNotesVal] = useState("");

    useEffect(() => {
        const all = loadAll();
        setRecords(all);
        const target = id ? all.find(r => String(r.id) === id) : all[0];
        if (target) setSelected(target);
        else if (all.length) setSelected(all[0]);
    }, [id]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, [selected?.id]);

    const selectRecord = (r: CreditNote) => {
        setSelected(r);
        navigate(route.creditNoteView.replace(":id", String(r.id)));
    };

    const deleteRecord = () => {
        if (!selected || !window.confirm("Delete this credit note?")) return;
        const updated = records.filter(r => r.id !== selected.id);
        saveAll(updated);
        setRecords(updated);
        if (updated.length) selectRecord(updated[0]);
        else navigate(route.creditNoteList);
    };

    const voidRecord = () => {
        if (!selected || !window.confirm("Mark this credit note as Void?")) return;
        const updated = records.map(r => r.id === selected.id ? { ...r, status: "Void" as const } : r);
        saveAll(updated);
        setRecords(updated);
        setSelected(s => s ? { ...s, status: "Void" } : s);
    };

    const addComment = () => {
        if (!selected || !commentText.trim()) return;
        const c: Comment = { text: commentText.trim(), date: nowDatetime(), user: "vickyyfemi9" };
        const updated = records.map(r => r.id === selected.id ? { ...r, comments: [...(r.comments || []), c] } : r);
        saveAll(updated);
        setRecords(updated);
        setSelected(updated.find(r => r.id === selected.id) || null);
        setCommentText("");
    };

    // ── Zoho Actions Logic ──
    const openApplyModal = () => {
        if (!selected) return;
        try {
            const raw = localStorage.getItem("billing_invoices");
            let list: Invoice[] = [];
            if (raw) list = JSON.parse(raw);
            const customerInvs = list.filter(inv =>
                inv.customerName === selected.customerName &&
                inv.status !== "Paid" &&
                inv.status !== "Void"
            );
            if (customerInvs.length === 0) {
                // Mock invoices if none exist
                customerInvs.push({
                    id: 99991,
                    invoiceNumber: "INV-00045",
                    customerName: selected.customerName,
                    date: "12/05/2026",
                    dueDate: "26/05/2026",
                    amount: selected.amount + 200,
                    status: "Partially Paid"
                });
                customerInvs.push({
                    id: 99992,
                    invoiceNumber: "INV-00048",
                    customerName: selected.customerName,
                    date: "18/05/2026",
                    dueDate: "02/06/2026",
                    amount: 500,
                    status: "Sent"
                });
            }
            setCustomerInvoices(customerInvs);
            const initialApplied: Record<number, number> = {};
            let remainingCredit = selected.amount - (selected.appliedAmount || 0) - (selected.refundedAmount || 0);
            customerInvs.forEach(inv => {
                if (remainingCredit > 0) {
                    const apply = Math.min(remainingCredit, inv.amount);
                    initialApplied[inv.id] = apply;
                    remainingCredit -= apply;
                } else {
                    initialApplied[inv.id] = 0;
                }
            });
            setAppliedValues(initialApplied);
            setShowApplyModal(true);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSaveApply = () => {
        if (!selected) return;
        let totalApplied = 0;
        Object.values(appliedValues).forEach(val => { totalApplied += Number(val) || 0; });
        const remainingCredit = selected.amount - (selected.appliedAmount || 0) - (selected.refundedAmount || 0);
        if (totalApplied > remainingCredit) {
            alert(`Total applied amount (₹${totalApplied.toFixed(2)}) cannot exceed remaining credit note balance (₹${remainingCredit.toFixed(2)}).`);
            return;
        }
        const newApplied = (selected.appliedAmount || 0) + totalApplied;
        const remaining = selected.amount - newApplied - (selected.refundedAmount || 0);
        const newStatus = remaining <= 0 ? "Closed" : selected.status;

        const updatedRecords = records.map(r => {
            if (r.id === selected.id) {
                const updatedComments = r.comments || [];
                Object.entries(appliedValues).forEach(([invId, val]) => {
                    const amt = Number(val) || 0;
                    if (amt > 0) {
                        const inv = customerInvoices.find(i => String(i.id) === invId);
                        updatedComments.push({
                            text: `Applied ₹${amt.toFixed(2)} to Invoice ${inv?.invoiceNumber || `#${invId}`}`,
                            date: nowDatetime(),
                            user: "vickyyfemi9"
                        });
                    }
                });
                return {
                    ...r,
                    appliedAmount: newApplied,
                    status: newStatus as any,
                    comments: updatedComments
                };
            }
            return r;
        });

        saveAll(updatedRecords);
        setRecords(updatedRecords);
        setSelected(updatedRecords.find(r => r.id === selected.id) || null);
        setShowApplyModal(false);
        alert(`Successfully applied ₹${totalApplied.toFixed(2)} to Invoices!`);
    };

    const openRefundModal = () => {
        if (!selected) return;
        const remainingCredit = selected.amount - (selected.appliedAmount || 0) - (selected.refundedAmount || 0);
        setRefundAmountVal(String(remainingCredit));
        setRefundModeVal("Cash");
        setRefundDateVal("19/05/2026");
        setRefundNotesVal("");
        setShowRefundModal(true);
    };

    const handleSaveRefund = () => {
        if (!selected) return;
        const amt = Number(refundAmountVal) || 0;
        if (amt <= 0) {
            alert("Please enter a valid refund amount.");
            return;
        }
        const remainingCredit = selected.amount - (selected.appliedAmount || 0) - (selected.refundedAmount || 0);
        if (amt > remainingCredit) {
            alert(`Refund amount (₹${amt.toFixed(2)}) cannot exceed remaining credit note balance (₹${remainingCredit.toFixed(2)}).`);
            return;
        }
        const newRefunded = (selected.refundedAmount || 0) + amt;
        const remaining = selected.amount - (selected.appliedAmount || 0) - newRefunded;
        const newStatus = remaining <= 0 ? "Closed" : selected.status;

        const updatedRecords = records.map(r => {
            if (r.id === selected.id) {
                const updatedComments = r.comments || [];
                updatedComments.push({
                    text: `Refunded ₹${amt.toFixed(2)} via ${refundModeVal}. Notes: ${refundNotesVal || "None"}`,
                    date: nowDatetime(),
                    user: "vickyyfemi9"
                });
                return {
                    ...r,
                    refundedAmount: newRefunded,
                    status: newStatus as any,
                    comments: updatedComments
                };
            }
            return r;
        });

        saveAll(updatedRecords);
        setRecords(updatedRecords);
        setSelected(updatedRecords.find(r => r.id === selected.id) || null);
        setShowRefundModal(false);
        alert(`Successfully refunded ₹${amt.toFixed(2)} via ${refundModeVal}!`);
    };

    const openEmailModal = () => {
        if (!selected) return;
        setEmailTo("customer@example.com");
        setEmailSubject(`Credit Note ${selected.creditNoteNumber} from Vicky Femi9`);
        setEmailBody(`Dear ${selected.customerName},\n\nPlease find attached Credit Note ${selected.creditNoteNumber} for your reference.\n\nThank you!\nBest regards,\nVicky Femi9`);
        setShowEmailModal(true);
    };

    const handleSendEmail = () => {
        if (!selected) return;
        const updatedRecords = records.map(r => {
            if (r.id === selected.id) {
                const updatedComments = r.comments || [];
                updatedComments.push({
                    text: `Email sent to ${emailTo} with subject "${emailSubject}"`,
                    date: nowDatetime(),
                    user: "vickyyfemi9"
                });
                return { ...r, comments: updatedComments };
            }
            return r;
        });
        saveAll(updatedRecords);
        setRecords(updatedRecords);
        setSelected(updatedRecords.find(r => r.id === selected.id) || null);
        setShowEmailModal(false);
        alert(`Email successfully sent to ${emailTo}!`);
    };

    const buildDocHtml = () => {
        if (!selected) return '';
        const st = STATUS_STYLE[selected.status] || { color: "#6b7280", bg: "#f3f4f6" };
        const itemsHtml = (selected.items || []).map((item, idx) => `
            <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:9px 12px;text-align:center;color:#6b7280;">${idx + 1}</td>
                <td style="padding:9px 12px;color:#111827;">${item.productName || '—'}</td>
                <td style="padding:9px 12px;color:#6b7280;">${item.sku || '—'}</td>
                <td style="padding:9px 12px;text-align:right;color:#374151;">${item.quantity}</td>
                <td style="padding:9px 12px;text-align:right;color:#374151;">₹${Number(item.rate).toFixed(2)}</td>
                <td style="padding:9px 12px;text-align:right;color:#374151;">${item.discount}%</td>
                <td style="padding:9px 12px;text-align:right;color:#374151;">${item.taxPercent}%</td>
                <td style="padding:9px 12px;text-align:right;font-weight:600;color:#111827;">₹${Number(item.amount).toFixed(2)}</td>
            </tr>`).join('');
        return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Credit Note - ${selected.creditNoteNumber}</title></head><body style="font-family:Arial,sans-serif;padding:40px;">
<h1 style="margin:0 0 4px;font-size:28px;font-weight:normal;font-family:Georgia,serif;">CREDIT NOTE</h1>
<div style="margin-bottom:24px;font-size:13px;color:#6b7280;">
  ${selected.creditNoteNumber} &nbsp;
  <span style="background:${st.bg};color:${st.color};padding:2px 10px;border-radius:4px;font-weight:700;font-size:11px;text-transform:uppercase;">${selected.status}</span>
</div>
<table style="font-size:13px;margin-bottom:24px;"><tbody>
  <tr><td style="padding-right:16px;color:#6b7280;">Date</td><td><strong>${selected.date}</strong></td></tr>
  <tr><td style="padding-right:16px;color:#6b7280;">Customer</td><td>${selected.customerName}</td></tr>
  <tr><td style="padding-right:16px;color:#6b7280;">Invoice#</td><td>${selected.invoiceNumber || '—'}</td></tr>
  <tr><td style="padding-right:16px;color:#6b7280;">Reference#</td><td>${selected.referenceNumber || '—'}</td></tr>
  <tr><td style="padding-right:16px;color:#6b7280;">Location</td><td>${selected.location}</td></tr>
  <tr><td style="padding-right:16px;color:#6b7280;">Reason</td><td>${selected.reason || '—'}</td></tr>
</tbody></table>
${selected.items && selected.items.length > 0 ? `
<table style="width:100%;border-collapse:collapse;font-size:12px;">
  <thead><tr style="background:#f5f5f5;">
    <th style="padding:8px 12px;width:40px;">#</th>
    <th style="padding:8px 12px;text-align:left;">Item</th>
    <th style="padding:8px 12px;text-align:left;width:90px;">SKU</th>
    <th style="padding:8px 12px;text-align:right;width:60px;">Qty</th>
    <th style="padding:8px 12px;text-align:right;width:90px;">Rate</th>
    <th style="padding:8px 12px;text-align:right;width:80px;">Disc%</th>
    <th style="padding:8px 12px;text-align:right;width:80px;">Tax%</th>
    <th style="padding:8px 12px;text-align:right;width:100px;">Amount</th>
  </tr></thead><tbody>${itemsHtml}</tbody>
  <tfoot>
    <tr><td colspan="7" style="padding:10px 12px;text-align:right;font-weight:700;">Total</td>
    <td style="padding:10px 12px;text-align:right;font-weight:700;">₹${Number(selected.amount).toFixed(2)}</td></tr>
  </tfoot>
</table>` : ''}
${selected.notes ? `<div style="margin-top:20px;font-size:12px;"><strong>Notes:</strong><br/>${selected.notes}</div>` : ''}
${selected.terms ? `<div style="margin-top:12px;font-size:12px;"><strong>Terms & Conditions:</strong><br/>${selected.terms}</div>` : ''}
<div style="margin-top:32px;font-size:11px;color:#9ca3af;">Generated on ${new Date().toLocaleString()}</div>
</body></html>`;
    };

    const handleDownloadPdf = () => {
        if (!selected) return;
        setIsPdfLoading(true);
        try {
            const html = buildDocHtml();
            const blob = new Blob([html], { type: "text/html" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `CreditNote-${selected.creditNoteNumber}.html`; a.click();
            const win = window.open(url, "_blank");
            if (win) win.addEventListener("load", () => setTimeout(() => win.print(), 400));
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        } catch (e) { console.error(e); }
        finally { setTimeout(() => setIsPdfLoading(false), 800); }
    };

    const handlePrint = () => {
        const html = buildDocHtml();
        const iframe = document.createElement("iframe");
        iframe.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:none;";
        document.body.appendChild(iframe);
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;
        doc.open(); doc.write(html); doc.close();
        iframe.contentWindow?.focus();
        setTimeout(() => { iframe.contentWindow?.print(); setTimeout(() => document.body.removeChild(iframe), 1000); }, 500);
    };

    const filtered = records.filter(r =>
        r.creditNoteNumber.toLowerCase().includes(listSearch.toLowerCase()) ||
        r.customerName.toLowerCase().includes(listSearch.toLowerCase()) ||
        r.referenceNumber.toLowerCase().includes(listSearch.toLowerCase()) ||
        r.status.toLowerCase().includes(listSearch.toLowerCase())
    );

    const st = selected ? (STATUS_STYLE[selected.status] || { color: "#6b7280", bg: "#f3f4f6" }) : { color: "#6b7280", bg: "#f3f4f6" };

    return (
        <div className="page-wrapper">
            <div className="content" style={{ padding: 0, height: "calc(100vh - 60px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

                    {/* ── Left Sidebar ── */}
                    <div style={{ width: 280, borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", background: "#fff", flexShrink: 0 }}>
                        {/* Header */}
                        <div style={{ padding: "12px 14px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>All Credit Notes</span>
                            <button onClick={() => navigate(route.creditNoteAdd)}
                                style={{ width: 28, height: 28, borderRadius: 5, border: "none", background: RED, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
                                onMouseEnter={e => { e.currentTarget.style.background = "#c01f07"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = RED; }}>
                                <i className="ti ti-plus" style={{ fontSize: 14 }} />
                            </button>
                        </div>

                        {/* Search */}
                        <div style={{ padding: "8px 12px", borderBottom: "1px solid #f3f4f6" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f9fafb", border: `1px solid ${searchFocused ? RED : "#e5e7eb"}`, borderRadius: 5, padding: "5px 10px", transition: "border-color 0.2s", boxShadow: searchFocused ? "0 0 0 3px rgba(228,31,7,0.08)" : "none" }}>
                                <i className="ti ti-search" style={{ fontSize: 13, color: searchFocused ? RED : "#9ca3af" }} />
                                <input
                                    value={listSearch}
                                    onChange={e => setListSearch(e.target.value)}
                                    onFocus={() => setSearchFocused(true)}
                                    onBlur={() => setSearchFocused(false)}
                                    placeholder="Search..."
                                    style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, flex: 1, color: "#374151" }}
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div style={{ flex: 1, overflowY: "auto" }}>
                            {filtered.length === 0 ? (
                                <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "#9ca3af" }}>No credit notes found</div>
                            ) : filtered.map(r => {
                                const s = STATUS_STYLE[r.status] || { color: "#6b7280", bg: "#f3f4f6" };
                                const isActive = selected?.id === r.id;
                                return (
                                    <div
                                        key={r.id}
                                        onClick={() => selectRecord(r)}
                                        style={{ padding: "11px 14px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", borderLeft: isActive ? `3px solid ${RED}` : "3px solid transparent", background: isActive ? "#fff1f0" : "#fff", transition: "background 0.15s" }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? RED : "#111827" }}>{r.creditNoteNumber}</span>
                                            <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "2px 7px", background: s.bg, color: s.color, textTransform: "uppercase" }}>{r.status}</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>{r.date}</div>
                                        <div style={{ fontSize: 12, color: "#374151" }}>{r.customerName}</div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginTop: 3 }}>₹{Number(r.amount).toFixed(2)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Right Panel ── */}
                    {selected ? (
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f0f2f5", overflow: "hidden" }}>

                            {/* Top bar */}
                            <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 1 }}>{selected.date} · {selected.location}</div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: 10 }}>
                                        {selected.creditNoteNumber}
                                        <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 4, padding: "3px 10px", background: st.bg, color: st.color, textTransform: "uppercase" }}>
                                            {selected.status}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{selected.customerName}</div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    {/* Attachments */}
                                    <div style={{ position: "relative" }}>
                                        <button onClick={() => { setShowAttach(!showAttach); setShowComments(false); }}
                                            style={{ width: 32, height: 32, border: "1.5px solid #d1d5db", borderRadius: 6, background: "#fff", color: "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = RED; e.currentTarget.style.color = RED; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.color = "#6b7280"; }}>
                                            <i className="ti ti-paperclip" style={{ fontSize: 16 }} />
                                        </button>
                                        {showAttach && (
                                            <>
                                                <div style={{ position: "fixed", inset: 0, zIndex: 100 }} onClick={() => setShowAttach(false)} />
                                                <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, width: 280, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 10px 25px rgba(0,0,0,0.15)", zIndex: 101 }}>
                                                    <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                        <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>Attachments</span>
                                                        <i className="ti ti-x" style={{ fontSize: 14, color: "#ef4444", cursor: "pointer" }} onClick={() => setShowAttach(false)} />
                                                    </div>
                                                    <div style={{ padding: "20px 16px", textAlign: "center", color: "#4b5563", fontSize: 13 }}>No Files Attached</div>
                                                    <div style={{ padding: "12px 16px" }}>
                                                        <div style={{ border: "1px dashed #cbd5e1", borderRadius: 6, padding: "16px 10px", textAlign: "center", cursor: "pointer", fontSize: 13, color: "#4b5563" }}>
                                                            <i className="ti ti-upload" style={{ color: RED, fontSize: 16, marginRight: 6 }} /> Upload Files
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Comments */}
                                    <div style={{ position: "relative" }}>
                                        <button onClick={() => { setShowComments(!showComments); setShowAttach(false); }}
                                            style={{ width: 32, height: 32, border: "1.5px solid #d1d5db", borderRadius: 6, background: "#fff", color: "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = RED; e.currentTarget.style.color = RED; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.color = "#6b7280"; }}>
                                            <i className="ti ti-message" style={{ fontSize: 16 }} />
                                        </button>
                                        {showComments && (
                                            <>
                                                <div style={{ position: "fixed", inset: 0, zIndex: 100 }} onClick={() => setShowComments(false)} />
                                                <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, width: 360, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 10px 25px rgba(0,0,0,0.15)", zIndex: 101 }}>
                                                    <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                        <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>Comments</span>
                                                        <i className="ti ti-x" style={{ fontSize: 14, color: "#ef4444", cursor: "pointer" }} onClick={() => setShowComments(false)} />
                                                    </div>
                                                    <div style={{ padding: 14 }}>
                                                        <div style={{ border: "1px solid #d1d5db", borderRadius: 6, overflow: "hidden", marginBottom: 14 }}>
                                                            <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                                                                placeholder="Add a comment..."
                                                                style={{ width: "100%", height: 70, border: "none", outline: "none", padding: "8px 12px", fontSize: 13, resize: "none", color: "#374151" }} />
                                                            <div style={{ padding: "7px 12px", borderTop: "1px solid #e5e7eb", background: "#f9fafb" }}>
                                                                <button onClick={addComment} style={{ padding: "4px 12px", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 4, background: "#fff", color: "#374151", cursor: "pointer" }}>Add Comment</button>
                                                            </div>
                                                        </div>
                                                        <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                                                            COMMENTS
                                                            <span style={{ background: RED, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10 }}>{(selected.comments || []).length}</span>
                                                        </div>
                                                        <div style={{ maxHeight: 220, overflowY: "auto" }}>
                                                            {(selected.comments || []).map((c, idx) => (
                                                                <div key={idx} style={{ marginBottom: 14 }}>
                                                                    <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 4 }}>
                                                                        {c.user} <span style={{ color: "#9ca3af", fontWeight: 400 }}>· {c.date}</span>
                                                                    </div>
                                                                    <div style={{ padding: "8px 12px", background: "#f9fafb", borderRadius: 6, fontSize: 13, color: "#111827" }}>{c.text}</div>
                                                                </div>
                                                            ))}
                                                            {!(selected.comments || []).length && <div style={{ fontSize: 13, color: "#9ca3af" }}>No comments yet.</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div style={{ height: 20, width: 1, background: "#e5e7eb" }} />
                                    <button onClick={() => navigate(route.creditNoteList)} title="Close"
                                        style={{ width: 32, height: 32, borderRadius: 6, border: "1.5px solid #d1d5db", background: "#fff", color: "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = RED; e.currentTarget.style.color = RED; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.color = "#6b7280"; }}>
                                        <i className="ti ti-x" style={{ fontSize: 16 }} />
                                    </button>
                                </div>
                            </div>

                            {/* Action bar */}
                            <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 10, flexWrap: "wrap" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                                    
                                    {/* Sidebar Back/Collapse Button */}
                                    <button onClick={() => navigate(route.creditNoteList)}
                                        style={{ border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff", color: "#475569", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "0.15s", flexShrink: 0 }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#94a3b8"; e.currentTarget.style.background = "#f8fafc"; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.background = "#fff"; }}
                                    >
                                        <i className="ti ti-layout-sidebar-left-collapse" style={{ fontSize: 16 }} />
                                    </button>

                                    {/* Vertical separator */}
                                    <div style={{ height: 18, width: 1, background: "#cbd5e1", flexShrink: 0 }} />

                                    <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", whiteSpace: "nowrap", flex: 1, minWidth: 0, WebkitOverflowScrolling: "touch", paddingBottom: "2px" }}>
                                        {/* Edit Button */}
                                        <button onClick={() => navigate((route.creditNoteAdd || "#") + "?edit=" + selected.id)}
                                            style={{ border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff", color: "#334155", padding: "0 14px", height: 32, fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "0.15s", flexShrink: 0 }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = "#94a3b8"; e.currentTarget.style.background = "#f8fafc"; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.background = "#fff"; }}
                                        >
                                            <i className="ti ti-pencil" style={{ fontSize: 14, color: "#64748b" }} /> Edit
                                        </button>

                                        {/* Email Button */}
                                        <button onClick={openEmailModal}
                                            style={{ border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff", color: "#334155", padding: "0 14px", height: 32, fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "0.15s", flexShrink: 0 }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = "#94a3b8"; e.currentTarget.style.background = "#f8fafc"; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.background = "#fff"; }}
                                        >
                                            <i className="ti ti-mail" style={{ fontSize: 14, color: "#64748b" }} /> Email
                                        </button>

                                        {/* PDF/Print Dropdown */}
                                        <Dropdown
                                            placement="bottomLeft"
                                            trigger={["click"]}
                                            menu={{
                                                items: [
                                                    {
                                                        key: "pdf",
                                                        label: <div className="d-flex align-items-center gap-2"><i className="ti ti-file-type-pdf fs-14" /><span>Download PDF</span></div>,
                                                        onClick: handleDownloadPdf,
                                                    },
                                                    {
                                                        key: "print",
                                                        label: <div className="d-flex align-items-center gap-2"><i className="ti ti-printer fs-14" /><span>Print</span></div>,
                                                        onClick: handlePrint,
                                                    }
                                                ],
                                                className: "shadow border-0 py-1 rounded-3",
                                                style: { minWidth: 140 }
                                            }}
                                        >
                                            <button
                                                style={{ border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff", color: "#334155", padding: "0 14px", height: 32, fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "0.15s", flexShrink: 0 }}
                                                onMouseEnter={e => { e.currentTarget.style.borderColor = "#94a3b8"; e.currentTarget.style.background = "#f8fafc"; }}
                                                onMouseLeave={e => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.background = "#fff"; }}
                                            >
                                                <i className="ti ti-file-text" style={{ fontSize: 14, color: "#64748b" }} /> PDF/Print <i className="ti ti-chevron-down" style={{ fontSize: 10, color: "#64748b" }} />
                                            </button>
                                        </Dropdown>

                                        {/* Apply to Invoices Button */}
                                        <button onClick={openApplyModal}
                                            style={{ border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff", color: "#334155", padding: "0 14px", height: 32, fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "0.15s", flexShrink: 0 }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = "#94a3b8"; e.currentTarget.style.background = "#f8fafc"; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.background = "#fff"; }}
                                        >
                                            <i className="ti ti-file-invoice" style={{ fontSize: 14, color: "#64748b" }} /> Apply to Invoices
                                        </button>

                                        {/* Refund Button */}
                                        <button onClick={openRefundModal}
                                            style={{ border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff", color: "#dc2626", padding: "0 14px", height: 32, fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "0.15s", flexShrink: 0 }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = "#fca5a5"; e.currentTarget.style.background = "#fef2f2"; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.background = "#fff"; }}
                                        >
                                            <i className="ti ti-receipt-refund" style={{ fontSize: 14, color: "#dc2626" }} /> Refund
                                        </button>

                                        {/* More (3-dot) Dropdown */}
                                        <Dropdown
                                            placement="bottomLeft"
                                            trigger={["click"]}
                                            menu={{
                                                items: [
                                                    ...(selected.status !== "Void" ? [{
                                                        key: "void",
                                                        label: <div className="d-flex align-items-center gap-2"><i className="ti ti-ban fs-14" /><span>Mark as Void</span></div>,
                                                        onClick: voidRecord,
                                                    }] : []),
                                                    {
                                                        key: "delete",
                                                        label: <div className="d-flex align-items-center gap-2 text-danger"><i className="ti ti-trash fs-14" /><span>Delete Credit Note</span></div>,
                                                        onClick: deleteRecord,
                                                    },
                                                ],
                                                className: "shadow border-0 py-1 rounded-3",
                                                style: { minWidth: 140 },
                                            }}
                                        >
                                            <button
                                                style={{ border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff", color: "#334155", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "0.15s", flexShrink: 0 }}
                                                onMouseEnter={e => { e.currentTarget.style.borderColor = "#94a3b8"; e.currentTarget.style.background = "#f8fafc"; }}
                                                onMouseLeave={e => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.background = "#fff"; }}
                                            >
                                                <i className="ti ti-dots" style={{ fontSize: 16 }} />
                                            </button>
                                        </Dropdown>
                                    </div>
                                </div>

                                {/* PDF view toggle */}
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <span style={{ fontStyle: "italic", fontSize: 12, color: "#4b5563" }}>Show PDF View</span>
                                    <div onClick={() => setShowPdfView(!showPdfView)} style={{ width: 36, height: 20, borderRadius: 10, background: showPdfView ? RED : "#d1d5db", position: "relative", cursor: "pointer", transition: "0.2s" }}>
                                        <div style={{ position: "absolute", top: 2, left: showPdfView ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "0.2s" }} />
                                    </div>
                                </div>
                            </div>

                            {/* Document area */}
                            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", background: "#f0f2f5", padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>

                                <div style={{ background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", position: "relative" }}>
                                    {showPdfView ? (
                                        /* PDF Layout */
                                        <div style={{ padding: "40px", fontFamily: "Arial, sans-serif", minHeight: 500 }}>
                                            {/* Status ribbon */}
                                            <div style={{ position: "absolute", top: 0, left: 0, width: 110, height: 110, overflow: "hidden", pointerEvents: "none" }}>
                                                <div style={{ position: "absolute", top: 22, left: -42, width: 160, background: st.color, color: "#fff", textAlign: "center", transform: "rotate(-45deg)", padding: "6px 0", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                                                    {selected.status.toUpperCase()}
                                                </div>
                                            </div>

                                            <div style={{ textAlign: "right", borderBottom: "1px solid #e5e7eb", paddingBottom: 20, marginBottom: 24 }}>
                                                <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, margin: "0 0 12px 0", color: "#111827", fontWeight: "normal" }}>CREDIT NOTE</h1>
                                                <table style={{ marginLeft: "auto", fontSize: 12, color: "#374151" }}>
                                                    <tbody>
                                                        {[
                                                            ["Credit Note#", selected.creditNoteNumber],
                                                            ["Date", selected.date],
                                                            ["Customer", selected.customerName],
                                                            ["Invoice#", selected.invoiceNumber || "—"],
                                                            ["Reference#", selected.referenceNumber || "—"],
                                                            ["Location", selected.location],
                                                        ].map(([label, val]) => (
                                                            <tr key={label}>
                                                                <td style={{ textAlign: "right", paddingRight: 12, paddingTop: 4, color: "#6b7280" }}>{label}</td>
                                                                <td style={{ paddingTop: 4, color: "#111827", fontWeight: label === "Credit Note#" ? 600 : 400 }}>{val}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Reason */}
                                            {selected.reason && (
                                                <div style={{ marginBottom: 20, fontSize: 12 }}>
                                                    <div style={{ fontWeight: 700, color: "#111827", marginBottom: 4, fontSize: 11, textTransform: "uppercase" }}>Reason for Credit</div>
                                                    <div style={{ color: "#374151" }}>{selected.reason}</div>
                                                </div>
                                            )}

                                            {/* Items */}
                                            {selected.items && selected.items.length > 0 && (
                                                <div style={{ overflowX: "auto", marginBottom: 24 }}>
                                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                                        <thead>
                                                            <tr style={{ background: "#f5f5f5" }}>
                                                                {["#", "Item", "SKU", "Qty", "Rate", "Disc%", "Tax%", "Amount"].map((h, i) => (
                                                                    <th key={h} style={{ padding: "8px 12px", textAlign: i <= 2 ? (i === 0 ? "center" : "left") : "right", fontWeight: 600 }}>{h}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selected.items.map((item, idx) => (
                                                                <tr key={item.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                                                    <td style={{ padding: "10px 12px", textAlign: "center", color: "#374151" }}>{idx + 1}</td>
                                                                    <td style={{ padding: "10px 12px", color: "#111827" }}>{item.productName || "—"}</td>
                                                                    <td style={{ padding: "10px 12px", color: "#6b7280" }}>{item.sku || "—"}</td>
                                                                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#374151" }}>{item.quantity}</td>
                                                                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#374151" }}>₹{Number(item.rate).toFixed(2)}</td>
                                                                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#374151" }}>{item.discount}%</td>
                                                                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#374151" }}>{item.taxPercent}%</td>
                                                                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#111827", fontWeight: 600 }}>₹{Number(item.amount).toFixed(2)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                        <tfoot>
                                                            <tr style={{ borderTop: "2px solid #e5e7eb" }}>
                                                                <td colSpan={7} style={{ padding: "8px 12px", textAlign: "right", color: "#6b7280", fontSize: 12 }}>Total Amount</td>
                                                                <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, fontSize: 14, color: "#111827" }}>₹{Number(selected.amount).toFixed(2)}</td>
                                                            </tr>
                                                            {selected.appliedAmount > 0 && (
                                                                <tr>
                                                                    <td colSpan={7} style={{ padding: "6px 12px", textAlign: "right", color: "#6b7280", fontSize: 12 }}>Credits Applied</td>
                                                                    <td style={{ padding: "6px 12px", textAlign: "right", color: "#dc2626", fontSize: 13 }}>- ₹{Number(selected.appliedAmount).toFixed(2)}</td>
                                                                </tr>
                                                            )}
                                                            {selected.refundedAmount > 0 && (
                                                                <tr>
                                                                    <td colSpan={7} style={{ padding: "6px 12px", textAlign: "right", color: "#6b7280", fontSize: 12 }}>Amount Refunded</td>
                                                                    <td style={{ padding: "6px 12px", textAlign: "right", color: "#dc2626", fontSize: 13 }}>- ₹{Number(selected.refundedAmount).toFixed(2)}</td>
                                                                </tr>
                                                            )}
                                                            {(selected.appliedAmount > 0 || selected.refundedAmount > 0) && (
                                                                <tr style={{ borderTop: "1px solid #e5e7eb" }}>
                                                                    <td colSpan={7} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 13, color: "#111827" }}>Remaining Balance</td>
                                                                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 15, color: "#dc2626" }}>₹{Number(selected.amount - (selected.appliedAmount || 0) - (selected.refundedAmount || 0)).toFixed(2)}</td>
                                                                </tr>
                                                            )}
                                                        </tfoot>
                                                    </table>
                                                </div>
                                            )}

                                            {/* Notes & Terms */}
                                            <div style={{ display: "flex", gap: 40, marginTop: 20, fontSize: 12, color: "#374151" }}>
                                                {selected.notes && (
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 700, color: "#111827", marginBottom: 6, fontSize: 11, textTransform: "uppercase" }}>Customer Notes</div>
                                                        <div style={{ lineHeight: 1.6 }}>{selected.notes}</div>
                                                    </div>
                                                )}
                                                {selected.terms && (
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 700, color: "#111827", marginBottom: 6, fontSize: 11, textTransform: "uppercase" }}>Terms & Conditions</div>
                                                        <div style={{ lineHeight: 1.6 }}>{selected.terms}</div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Meta */}
                                            <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid #f3f4f6", display: "flex", gap: 40, fontSize: 11, color: "#9ca3af" }}>
                                                <div><span style={{ fontWeight: 600, color: "#6b7280" }}>Created by</span> {selected.createdBy} · {selected.createdTime}</div>
                                                <div><span style={{ fontWeight: 600, color: "#6b7280" }}>Modified by</span> {selected.lastModifiedBy} · {selected.lastModifiedTime}</div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Modern Layout */
                                        <div style={{ padding: "40px", fontFamily: "system-ui, sans-serif" }}>
                                            <div style={{ fontSize: 22, fontWeight: 500, color: "#111827", marginBottom: 4 }}>CREDIT NOTE</div>
                                            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>{selected.creditNoteNumber}</div>

                                            <table style={{ fontSize: 13, color: "#374151", lineHeight: 2, marginBottom: 32 }}>
                                                <tbody>
                                                    {[
                                                        ["Date", selected.date],
                                                        ["Customer", selected.customerName],
                                                        ["Invoice#", selected.invoiceNumber || "—"],
                                                        ["Reference#", selected.referenceNumber || "—"],
                                                        ["Location", selected.location],
                                                        ["Reason", selected.reason || "—"],
                                                        ["Status", selected.status],
                                                        ["Amount", `₹${Number(selected.amount).toFixed(2)}`],
                                                        ["Created By", selected.createdBy],
                                                        ["Created Time", selected.createdTime],
                                                        ["Last Modified By", selected.lastModifiedBy],
                                                        ["Last Modified Time", selected.lastModifiedTime],
                                                    ].map(([label, val]) => (
                                                        <tr key={label}>
                                                            <td style={{ width: 200, color: "#111827", fontWeight: 500 }}>{label}</td>
                                                            <td style={{ color: "#374151" }}>
                                                                {label === "Status" ? (
                                                                    <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 4, textTransform: "uppercase" }}>{val}</span>
                                                                ) : val}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>

                                            {selected.items && selected.items.length > 0 && (
                                                <div style={{ overflowX: "auto", marginBottom: 32 }}>
                                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                                        <thead>
                                                            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #f1f5f9" }}>
                                                                {["Item", "SKU", "Qty", "Rate", "Disc%", "Tax%", "Amount"].map((h, i) => (
                                                                    <th key={h} style={{ padding: "12px 16px", textAlign: i < 2 ? "left" : "right", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>{h}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selected.items.map(item => (
                                                                <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                                    <td style={{ padding: "14px 16px", color: "#111827" }}>{item.productName || "—"}</td>
                                                                    <td style={{ padding: "14px 16px", color: "#6b7280" }}>{item.sku || "—"}</td>
                                                                    <td style={{ padding: "14px 16px", textAlign: "right" }}>{item.quantity}</td>
                                                                    <td style={{ padding: "14px 16px", textAlign: "right" }}>₹{Number(item.rate).toFixed(2)}</td>
                                                                    <td style={{ padding: "14px 16px", textAlign: "right" }}>{item.discount}%</td>
                                                                    <td style={{ padding: "14px 16px", textAlign: "right" }}>{item.taxPercent}%</td>
                                                                    <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 600, color: "#111827" }}>₹{Number(item.amount).toFixed(2)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                        <tfoot>
                                                            <tr style={{ borderTop: "2px solid #e5e7eb" }}>
                                                                <td colSpan={6} style={{ padding: "8px 16px", textAlign: "right", color: "#6b7280", fontSize: 12 }}>Total Amount</td>
                                                                <td style={{ padding: "8px 16px", textAlign: "right", fontWeight: 600, fontSize: 14, color: "#111827" }}>₹{Number(selected.amount).toFixed(2)}</td>
                                                            </tr>
                                                            {selected.appliedAmount > 0 && (
                                                                <tr>
                                                                    <td colSpan={6} style={{ padding: "6px 16px", textAlign: "right", color: "#6b7280", fontSize: 12 }}>Credits Applied</td>
                                                                    <td style={{ padding: "6px 16px", textAlign: "right", color: "#dc2626", fontSize: 13 }}>- ₹{Number(selected.appliedAmount).toFixed(2)}</td>
                                                                </tr>
                                                            )}
                                                            {selected.refundedAmount > 0 && (
                                                                <tr>
                                                                    <td colSpan={6} style={{ padding: "6px 16px", textAlign: "right", color: "#6b7280", fontSize: 12 }}>Amount Refunded</td>
                                                                    <td style={{ padding: "6px 16px", textAlign: "right", color: "#dc2626", fontSize: 13 }}>- ₹{Number(selected.refundedAmount).toFixed(2)}</td>
                                                                </tr>
                                                            )}
                                                            {(selected.appliedAmount > 0 || selected.refundedAmount > 0) && (
                                                                <tr style={{ borderTop: "1px solid #cbd5e1" }}>
                                                                    <td colSpan={6} style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, fontSize: 13, color: "#111827" }}>Remaining Balance</td>
                                                                    <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, fontSize: 15, color: "#dc2626" }}>₹{Number(selected.amount - (selected.appliedAmount || 0) - (selected.refundedAmount || 0)).toFixed(2)}</td>
                                                                </tr>
                                                            )}
                                                        </tfoot>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div style={{ fontSize: 13, color: "#6b7280", paddingLeft: 2 }}>
                                    PDF Template: <span style={{ color: "#374151", fontWeight: 500 }}>'Credit Note Template'</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 14 }}>
                            <div style={{ textAlign: "center" }}>
                                <i className="ti ti-receipt-refund" style={{ fontSize: 48, display: "block", marginBottom: 12, color: RED, opacity: 0.3 }} />
                                Select a credit note to view
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Zoho Email Modal ── */}
            {showEmailModal && selected && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
                    <div style={{ background: "#fff", borderRadius: 8, width: "90%", maxWidth: 550, boxShadow: "0 10px 25px rgba(0,0,0,0.2)", overflow: "hidden" }}>
                        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontWeight: 600, fontSize: 16, color: "#111827" }}>Send Credit Note via Email</span>
                            <i className="ti ti-x" style={{ fontSize: 16, color: "#9ca3af", cursor: "pointer" }} onClick={() => setShowEmailModal(false)} />
                        </div>
                        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 15 }}>
                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>To</label>
                                <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} style={{ width: "100%", height: 38, border: "1px solid #d1d5db", borderRadius: 4, padding: "0 12px", fontSize: 13, outline: "none" }} />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Subject</label>
                                <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} style={{ width: "100%", height: 38, border: "1px solid #d1d5db", borderRadius: 4, padding: "0 12px", fontSize: 13, outline: "none" }} />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Body</label>
                                <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} style={{ width: "100%", height: 120, border: "1px solid #d1d5db", borderRadius: 4, padding: "10px 12px", fontSize: 13, outline: "none", resize: "none" }} />
                            </div>
                        </div>
                        <div style={{ padding: "14px 20px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end", gap: 10, background: "#f9fafb" }}>
                            <button onClick={() => setShowEmailModal(false)} style={{ padding: "6px 14px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4, background: "#fff", color: "#374151", cursor: "pointer" }}>Cancel</button>
                            <button onClick={handleSendEmail} style={{ padding: "6px 14px", fontSize: 13, border: "none", borderRadius: 4, background: RED, color: "#fff", cursor: "pointer", fontWeight: 500 }}>Send Email</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Zoho Apply Credits to Invoices Modal ── */}
            {showApplyModal && selected && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
                    <div style={{ background: "#fff", borderRadius: 8, width: "90%", maxWidth: 650, boxShadow: "0 10px 25px rgba(0,0,0,0.2)", overflow: "hidden" }}>
                        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontWeight: 600, fontSize: 16, color: "#111827" }}>Apply Credits to Invoices</span>
                            <i className="ti ti-x" style={{ fontSize: 16, color: "#9ca3af", cursor: "pointer" }} onClick={() => setShowApplyModal(false)} />
                        </div>
                        <div style={{ padding: 20 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", background: "#f8f9fa", padding: "10px 14px", borderRadius: 6, marginBottom: 15, fontSize: 13 }}>
                                <div>Customer: <strong style={{ color: "#111827" }}>{selected.customerName}</strong></div>
                                <div>Credit Balance: <strong style={{ color: "#dc2626" }}>₹{(selected.amount - (selected.appliedAmount || 0) - (selected.refundedAmount || 0)).toFixed(2)}</strong></div>
                            </div>
                            <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 6 }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                                            <th style={{ padding: "10px 12px", textAlign: "left", color: "#4b5563", fontWeight: 600 }}>Invoice#</th>
                                            <th style={{ padding: "10px 12px", textAlign: "left", color: "#4b5563", fontWeight: 600 }}>Date</th>
                                            <th style={{ padding: "10px 12px", textAlign: "right", color: "#4b5563", fontWeight: 600 }}>Invoice Amount</th>
                                            <th style={{ padding: "10px 12px", textAlign: "right", color: "#4b5563", fontWeight: 600 }}>Amount to Credit</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customerInvoices.map(inv => (
                                            <tr key={inv.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                                <td style={{ padding: "12px", color: "#111827", fontWeight: 500 }}>{inv.invoiceNumber}</td>
                                                <td style={{ padding: "12px", color: "#6b7280" }}>{inv.date}</td>
                                                <td style={{ padding: "12px", textAlign: "right", color: "#374151" }}>₹{Number(inv.amount).toFixed(2)}</td>
                                                <td style={{ padding: "12px", textAlign: "right" }}>
                                                    <input
                                                        type="number"
                                                        value={appliedValues[inv.id] ?? 0}
                                                        onChange={e => {
                                                            const val = Math.max(0, Number(e.target.value) || 0);
                                                            setAppliedValues(prev => ({ ...prev, [inv.id]: val }));
                                                        }}
                                                        style={{ width: 100, height: 30, border: "1px solid #d1d5db", borderRadius: 4, padding: "0 8px", textAlign: "right", fontSize: 13, outline: "none" }}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                        {customerInvoices.length === 0 && (
                                            <tr>
                                                <td colSpan={4} style={{ padding: "24px", textAlign: "center", color: "#9ca3af" }}>No unpaid invoices found for this customer.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div style={{ padding: "14px 20px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end", gap: 10, background: "#f9fafb" }}>
                            <button onClick={() => setShowApplyModal(false)} style={{ padding: "6px 14px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4, background: "#fff", color: "#374151", cursor: "pointer" }}>Cancel</button>
                            <button onClick={handleSaveApply} style={{ padding: "6px 14px", fontSize: 13, border: "none", borderRadius: 4, background: "#dc2626", color: "#fff", cursor: "pointer", fontWeight: 500 }} disabled={customerInvoices.length === 0}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Zoho Record Refund Modal ── */}
            {showRefundModal && selected && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
                    <div style={{ background: "#fff", borderRadius: 8, width: "90%", maxWidth: 500, boxShadow: "0 10px 25px rgba(0,0,0,0.2)", overflow: "hidden" }}>
                        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontWeight: 600, fontSize: 16, color: "#111827" }}>Record Refund</span>
                            <i className="ti ti-x" style={{ fontSize: 16, color: "#9ca3af", cursor: "pointer" }} onClick={() => setShowRefundModal(false)} />
                        </div>
                        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 15 }}>
                            <div style={{ background: "#f8f9fa", padding: "10px 14px", borderRadius: 6, fontSize: 13 }}>
                                Credit Balance: <strong style={{ color: "#dc2626" }}>₹{(selected.amount - (selected.appliedAmount || 0) - (selected.refundedAmount || 0)).toFixed(2)}</strong>
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Refund Date</label>
                                <input type="text" value={refundDateVal} onChange={e => setRefundDateVal(e.target.value)} style={{ width: "100%", height: 38, border: "1px solid #d1d5db", borderRadius: 4, padding: "0 12px", fontSize: 13, outline: "none" }} />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Refund Amount</label>
                                <input type="number" value={refundAmountVal} onChange={e => setRefundAmountVal(e.target.value)} style={{ width: "100%", height: 38, border: "1px solid #d1d5db", borderRadius: 4, padding: "0 12px", fontSize: 13, outline: "none" }} />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Refund Mode</label>
                                <select value={refundModeVal} onChange={e => setRefundModeVal(e.target.value)} style={{ width: "100%", height: 38, border: "1px solid #d1d5db", borderRadius: 4, padding: "0 10px", fontSize: 13, outline: "none", background: "#fff" }}>
                                    <option value="Cash">Cash</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Credit Card">Credit Card</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Description / Notes</label>
                                <textarea value={refundNotesVal} onChange={e => setRefundNotesVal(e.target.value)} placeholder="Refund notes..." style={{ width: "100%", height: 70, border: "1px solid #d1d5db", borderRadius: 4, padding: "10px 12px", fontSize: 13, outline: "none", resize: "none" }} />
                            </div>
                        </div>
                        <div style={{ padding: "14px 20px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end", gap: 10, background: "#f9fafb" }}>
                            <button onClick={() => setShowRefundModal(false)} style={{ padding: "6px 14px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4, background: "#fff", color: "#374151", cursor: "pointer" }}>Cancel</button>
                            <button onClick={handleSaveRefund} style={{ padding: "6px 14px", fontSize: 13, border: "none", borderRadius: 4, background: "#dc2626", color: "#fff", cursor: "pointer", fontWeight: 500 }}>Refund</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreditNoteView;
