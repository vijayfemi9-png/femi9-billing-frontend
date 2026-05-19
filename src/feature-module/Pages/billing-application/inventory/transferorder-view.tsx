// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { all_routes } from "../../../../routes/all_routes";
import "../payment/payment.scss";
import "./transfer.scss";

interface LineItem { id: number; product: string; sourceStock: string; destStock: string; qty: string; }
interface TransferOrder {
    id: number;
    transferOrderNumber: string;
    date: string;
    reason: string;
    status: string;
    quantity: number;
    sourceLocation: string;
    destinationLocation: string;
    items?: LineItem[];
    comments?: { text: string; date: string; user: string }[];
    createdBy: string;
    createdTime: string;
    lastModifiedBy: string;
    lastModifiedTime: string;
}

const SK = "billing_transfer_orders";
const route = all_routes;
const RED = "#e41f07";

const STATUS_STYLE: Record<string, { color: string; bg: string; ribbon: string }> = {
    "Draft": { color: "#b45309", bg: "#fef9c3", ribbon: "#ca8a04" },
    "Transferred": { color: "#16a34a", bg: "#dcfce7", ribbon: "#16a34a" },
    "In Transit": { color: "#7c3aed", bg: "#f5f3ff", ribbon: "#7c3aed" },
    "Partially Transferred": { color: "#ea580c", bg: "#ffedd5", ribbon: "#ea580c" },
    "Pending":     { color: "#6b7280", bg: "#f3f4f6", ribbon: "#6b7280" },
    "In Transfer": { color: "#7c3aed", bg: "#f5f3ff", ribbon: "#7c3aed" },
    "Void": { color: "#6b7280", bg: "#f3f4f6", ribbon: "#6b7280" },
};

function normalizeStatus(status: string): string {
    if (status === "Pending" || status === "In Transfer") return "Transferred";
    return status;
}
function loadOrders(): TransferOrder[] {
    try {
        const s = localStorage.getItem(SK);
        if (s) {
            const p = JSON.parse(s);
            if (Array.isArray(p) && p.length) {
                const normalized = p.map((r: any) => ({ ...r, status: normalizeStatus(r.status) }));
                localStorage.setItem(SK, JSON.stringify(normalized));
                return normalized;
            }
        }
    } catch { /**/ }
    return [];
}
function saveOrders(orders: TransferOrder[]) {
    localStorage.setItem(SK, JSON.stringify(orders));
}

function loadCompanySettings() {
    try {
        const s = localStorage.getItem("invoice_settings");
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

const TransferOrderView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [orders, setOrders] = useState<TransferOrder[]>([]);
    const [selected, setSelected] = useState<TransferOrder | null>(null);
    const [listSearch, setListSearch] = useState("");
    const [sidebarVisible, setSidebarVisible] = useState(true);
    const [showPdfView, setShowPdfView] = useState(true);
    const [showPdfMenu, setShowPdfMenu] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showAttachments, setShowAttachments] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const company = loadCompanySettings();

    useEffect(() => {
        const all = loadOrders();
        setOrders(all);
        const target = id ? all.find(o => String(o.id) === id) : all[0];
        if (target) setSelected(target);
        else if (all.length) setSelected(all[0]);
    }, [id]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, [selected?.id]);

    const selectOrder = (o: TransferOrder) => {
        setSelected(o);
        navigate(route.transferOrderView.replace(":id", String(o.id)));
        setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, 50);
    };

    const deleteOrder = () => {
        if (!selected || !window.confirm("Delete this transfer order?")) return;
        const updated = orders.filter(o => o.id !== selected.id);
        saveOrders(updated);
        setOrders(updated);
        if (updated.length) selectOrder(updated[0]);
        else navigate(route.transferOrderList);
    };

    const voidOrder = () => {
        if (!selected) return;
        if (!window.confirm(`Void ${selected.transferOrderNumber}? This cannot be undone.`)) return;
        const updated = orders.map(o => o.id === selected.id ? { ...o, status: "Void" } : o);
        saveOrders(updated);
        setOrders(updated);
        setSelected(s => s ? { ...s, status: "Void" } : s);
    };

    const handleAddComment = () => {
        if (!selected || !commentText.trim()) return;
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours() % 12 || 12).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;
        const newComment = {
            text: commentText.trim(),
            date: dateStr,
            user: "vickyyfemi9"
        };
        const updated = orders.map(o => o.id === selected.id ? { ...o, comments: [...(o.comments || []), newComment] } : o);
        saveOrders(updated);
        setOrders(updated);
        setSelected(updated.find(o => o.id === selected.id) || null);
        setCommentText("");
    };

    const confirmSubmit = () => {
        if (!selected) return;
        const updated = orders.map(o => o.id === selected.id ? { ...o, status: "Pending" } : o);
        saveOrders(updated);
        setOrders(updated);
        setSelected(prev => prev ? { ...prev, status: "Pending" } : null);
        setShowSubmitModal(false);
    };

    const filtered = orders.filter(o =>
        o.transferOrderNumber.toLowerCase().includes(listSearch.toLowerCase()) ||
        (o.reason || "").toLowerCase().includes(listSearch.toLowerCase()) ||
        o.sourceLocation.toLowerCase().includes(listSearch.toLowerCase()) ||
        (o.destinationLocation || "").toLowerCase().includes(listSearch.toLowerCase())
    );

    const st = selected ? (STATUS_STYLE[selected.status] || { color: "#6b7280", bg: "#f3f4f6", ribbon: "#6b7280" }) : { color: "#6b7280", bg: "#f3f4f6", ribbon: "#6b7280" };
    const totalQty = selected?.items?.reduce((s, i) => s + (parseFloat(i.qty) || 0), 0) ?? selected?.quantity ?? 0;

    return (
        <>


            <div className="page-wrapper">
                <div className="content" style={{ padding: 0, height: "calc(100vh - 60px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

                        {/* ── Left Sidebar ─────────────────────────────── */}
                        <div className={`to-sidebar ${selected ? "selected-hidden" : ""}`} style={{ width: sidebarVisible ? 320 : 0, borderRight: sidebarVisible ? "1px solid #e5e7eb" : "none", display: "flex", flexDirection: "column", background: "#fff", flexShrink: 0, transition: "width 0.2s ease", overflow: "hidden" }}>

                            <div style={{ padding: "12px 14px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: "#111827", whiteSpace: "nowrap" }}>All Transfer Orders</span>
                                <button onClick={() => navigate(route.transferOrderAdd)}
                                    style={{ width: 28, height: 28, borderRadius: 5, border: "none", background: "#e41f07", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", transition: "all 0.15s" }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "#c01f07"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "#e41f07"; }}>
                                    <i className="ti ti-plus" style={{ fontSize: 14 }} />
                                </button>
                            </div>

                            <div style={{ padding: "8px 12px", borderBottom: "1px solid #f3f4f6" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 5, padding: "5px 10px" }}>
                                    <i className="ti ti-search" style={{ fontSize: 13, color: "#9ca3af" }} />
                                    <input value={listSearch} onChange={e => setListSearch(e.target.value)} placeholder="Search..."
                                        style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, flex: 1, color: "#374151" }} />
                                </div>
                            </div>

                            <div style={{ flex: 1, overflowY: "auto" }}>
                                {filtered.length === 0 ? (
                                    <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "#9ca3af" }}>No transfer orders found</div>
                                ) : filtered.map(o => {
                                    const s = STATUS_STYLE[o.status] || { color: "#6b7280", bg: "#f3f4f6" };
                                    const isActive = selected?.id === o.id;
                                    return (
                                        <div key={o.id} onClick={() => selectOrder(o)} className="to-list-item"
                                            style={{ padding: "11px 14px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", borderLeft: isActive ? `3px solid ${RED}` : "3px solid transparent", background: isActive ? "#fff8f8" : "#fff", transition: "background 0.15s" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                                                <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? RED : "#111827" }}>{o.transferOrderNumber}</span>
                                                <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "2px 7px", background: s.bg, color: s.color, textTransform: "uppercase", letterSpacing: "0.3px", whiteSpace: "nowrap" }}>
                                                    {o.status}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>{o.date}</div>
                                            <div style={{ fontSize: 12, color: "#374151" }}>{o.sourceLocation} → {o.destinationLocation || "—"}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Right Panel ──────────────────────────────── */}
                        {selected ? (
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f0f2f5", overflow: "hidden" }}>

                                {/* Header */}
                                <div className="to-header" style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 1 }}>{selected.date}</div>
                                        <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{selected.transferOrderNumber}</div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        {/* Attachments Button */}
                                        <div style={{ position: "relative" }}>
                                            <button onClick={() => { setShowAttachments(!showAttachments); setShowComments(false); }}
                                                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, border: "1.5px solid #d1d5db", borderRadius: 6, background: "#fff", color: "#6b7280", cursor: "pointer" }} title="Attachments"
                                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = RED; (e.currentTarget as HTMLButtonElement).style.color = RED; }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#d1d5db"; (e.currentTarget as HTMLButtonElement).style.color = "#6b7280"; }}>
                                                <i className="ti ti-paperclip" style={{ fontSize: 16 }} />
                                            </button>

                                            {/* Attachments Popover */}
                                            {showAttachments && (
                                                <>
                                                    <div style={{ position: "fixed", inset: 0, zIndex: 100 }} onClick={() => setShowAttachments(false)} />
                                                    <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, width: 300, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 10px 25px rgba(0,0,0,0.15)", zIndex: 101, overflow: "hidden" }}>
                                                        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                            <div style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>Attachments</div>
                                                            <i className="ti ti-x" style={{ fontSize: 14, color: "#ef4444", cursor: "pointer" }} onClick={() => setShowAttachments(false)} />
                                                        </div>
                                                        <div style={{ padding: "24px 16px", textAlign: "center", borderBottom: "1px solid #f3f4f6" }}>
                                                            <div style={{ fontSize: 14, color: "#4b5563" }}>No Files Attached</div>
                                                        </div>
                                                        <div style={{ padding: 16 }}>
                                                            <div style={{ border: "1px dashed #cbd5e1", borderRadius: 6, padding: "20px 10px", textAlign: "center", cursor: "pointer" }}
                                                                onMouseEnter={e => (e.currentTarget.style.borderColor = "#3b82f6")}
                                                                onMouseLeave={e => (e.currentTarget.style.borderColor = "#cbd5e1")}>
                                                                <div style={{ color: "#4b5563", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                                                    <i className="ti ti-upload" style={{ color: "#3b82f6", fontSize: 18 }} /> Upload your Files <i className="ti ti-chevron-down-circle" style={{ fontSize: 14, color: "#6b7280" }} />
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: "center", fontSize: 11, color: "#6b7280", marginTop: 10 }}>
                                                                You can upload a maximum of 5 files, 10MB each
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Comments Button */}
                                        <div style={{ position: "relative" }}>
                                            <button onClick={() => { setShowComments(!showComments); setShowAttachments(false); }}
                                                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, border: "1.5px solid #d1d5db", borderRadius: 6, background: "#fff", color: "#6b7280", cursor: "pointer" }} title="Comments"
                                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = RED; (e.currentTarget as HTMLButtonElement).style.color = RED; }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#d1d5db"; (e.currentTarget as HTMLButtonElement).style.color = "#6b7280"; }}>
                                                <i className="ti ti-message" style={{ fontSize: 16 }} />
                                            </button>

                                            {/* Comments Popover */}
                                            {showComments && (
                                                <>
                                                    <div style={{ position: "fixed", inset: 0, zIndex: 100 }} onClick={() => setShowComments(false)} />
                                                    <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, width: 380, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 10px 25px rgba(0,0,0,0.15)", zIndex: 101, display: "flex", flexDirection: "column" }}>
                                                        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                            <div style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>Comments & History</div>
                                                            <i className="ti ti-x" style={{ fontSize: 14, color: "#ef4444", cursor: "pointer" }} onClick={() => setShowComments(false)} />
                                                        </div>
                                                        <div style={{ padding: 16 }}>
                                                            <div style={{ border: "1px solid #d1d5db", borderRadius: 6, overflow: "hidden", marginBottom: 16 }}>
                                                                <div style={{ padding: "8px 12px", background: "#f3f4f6", borderBottom: "1px solid #d1d5db", display: "flex", gap: 16 }}>
                                                                    <i className="ti ti-bold" style={{ cursor: "pointer", fontSize: 14, color: "#111827" }} />
                                                                    <i className="ti ti-italic" style={{ cursor: "pointer", fontSize: 14, color: "#111827" }} />
                                                                    <i className="ti ti-underline" style={{ cursor: "pointer", fontSize: 14, color: "#111827" }} />
                                                                </div>
                                                                <textarea
                                                                    value={commentText}
                                                                    onChange={e => setCommentText(e.target.value)}
                                                                    style={{ width: "100%", height: 60, border: "none", outline: "none", padding: "10px 12px", fontSize: 13, resize: "none", color: "#374151" }}
                                                                />
                                                                <div style={{ padding: "8px 12px", borderTop: "1px solid #d1d5db", background: "#fff" }}>
                                                                    <button onClick={handleAddComment} style={{ padding: "4px 10px", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 4, background: "#fff", color: "#6b7280", cursor: "pointer" }}>Add Comment</button>
                                                                </div>
                                                            </div>

                                                            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 12, borderBottom: "1px solid #e5e7eb", paddingBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                                                                ALL COMMENTS <span style={{ background: "#3b82f6", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10 }}>{(selected.comments || []).length}</span>
                                                            </div>

                                                            <div style={{ maxHeight: 250, overflowY: "auto" }}>
                                                                {(selected.comments || []).map((c, idx) => (
                                                                    <div key={idx} style={{ marginBottom: 16 }}>
                                                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                                                            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#fff", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                                                <i className="ti ti-message" style={{ fontSize: 13, color: "#3b82f6" }} />
                                                                            </div>
                                                                            <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{c.user} <span style={{ color: "#9ca3af", fontWeight: 400, marginLeft: 4 }}>• {c.date}</span></div>
                                                                        </div>
                                                                        <div style={{ marginLeft: 32, padding: "10px 14px", background: "#f9fafb", borderRadius: 6, fontSize: 13, color: "#111827" }}>
                                                                            {c.text}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {!(selected.comments || []).length && <div style={{ fontSize: 13, color: "#9ca3af", paddingLeft: 32 }}>No comments yet.</div>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div style={{ height: 20, width: 1, background: "#e5e7eb", margin: "0 2px" }} />
                                        <button onClick={() => navigate(route.transferOrderList)} title="Close"
                                            style={{ width: 32, height: 32, borderRadius: 6, border: "1.5px solid #d1d5db", background: "#fff", color: "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = RED; (e.currentTarget as HTMLButtonElement).style.color = RED; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#d1d5db"; (e.currentTarget as HTMLButtonElement).style.color = "#6b7280"; }}>
                                            <i className="ti ti-x" style={{ fontSize: 16 }} />
                                        </button>
                                    </div>
                                </div>

                                {/* Action Bar */}
                                <div className="to-actionbar" style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "7px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        {/* Edit */}
                                        <button onClick={() => navigate(route.transferOrderAdd + "?edit=" + selected.id)}
                                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", border: "1px solid #e5e7eb", borderRadius: 5, background: "#fff", fontSize: 13, color: "#374151", cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap" }}>
                                            <i className="ti ti-edit" style={{ fontSize: 13 }} /> <span className="mobile-text-hide">Edit</span>
                                        </button>
                                        <div style={{ height: 18, width: 1, background: "#e5e7eb", margin: "0 4px" }} />

                                        {/* PDF/Print */}
                                        <div style={{ position: "relative" }}>
                                            <button onClick={() => setShowPdfMenu(!showPdfMenu)} onBlur={() => setTimeout(() => setShowPdfMenu(false), 200)}
                                                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", border: "1px solid #e5e7eb", borderRadius: 5, background: "#fff", fontSize: 13, color: "#374151", cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap" }}>
                                                <i className="ti ti-file-type-pdf" style={{ fontSize: 14 }} /> <span className="mobile-text-hide">PDF/Print</span> <i className="ti ti-chevron-down" style={{ fontSize: 12 }} />
                                            </button>
                                            {showPdfMenu && (
                                                <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100, minWidth: 150, padding: "4px 0" }}>
                                                    <div onClick={() => window.print()} style={{ padding: "8px 16px", fontSize: 13, color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}><i className="ti ti-printer" /> Print</div>
                                                    <div style={{ padding: "8px 16px", fontSize: 13, color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}><i className="ti ti-download" /> Download PDF</div>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ height: 18, width: 1, background: "#e5e7eb", margin: "0 4px" }} />

                                        {/* Submit for Approval */}
                                        {selected.status !== "Transferred" && (
                                            <>
                                                <button
                                                    onClick={() => setShowSubmitModal(true)}
                                                    disabled={!["Draft", "In Transfer"].includes(selected.status)}
                                                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", border: "1px solid #e5e7eb", borderRadius: 5, background: "#fff", fontSize: 13, color: ["Draft", "In Transfer"].includes(selected.status) ? "#64748b" : "#cbd5e1", cursor: ["Draft", "In Transfer"].includes(selected.status) ? "pointer" : "not-allowed", fontWeight: 500, whiteSpace: "nowrap" }}>
                                                    <i className="ti ti-arrow-forward-up" style={{ fontSize: 15 }} /> <span className="mobile-text text-dark">Submit for Approval</span>
                                                </button>
                                                <div style={{ height: 18, width: 1, background: "#e5e7eb", margin: "0 4px" }} />
                                            </>
                                        )}

                                        {/* More (...) */}
                                        <div style={{ position: "relative" }}>
                                            <button onClick={() => setShowMoreMenu(!showMoreMenu)} onBlur={() => setTimeout(() => setShowMoreMenu(false), 200)}
                                                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 28, border: "1px solid #e5e7eb", borderRadius: 5, background: "#fff", color: "#374151", cursor: "pointer" }}>
                                                <i className="ti ti-dots" style={{ fontSize: 16 }} />
                                            </button>
                                            {showMoreMenu && (
                                                <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100, minWidth: 120, padding: "4px 0" }}>
                                                    <div style={{ padding: "8px 16px", fontSize: 13, color: "#374151", cursor: "pointer" }}>Clone</div>
                                                    <div onClick={deleteOrder} style={{ padding: "8px 16px", fontSize: 13, color: "#e41f07", cursor: "pointer" }}>Delete</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Side - PDF View Toggle */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <span style={{ fontStyle: "italic", fontSize: 12, color: "#4b5563" }}>Show PDF View</span>
                                        <div onClick={() => setShowPdfView(!showPdfView)} style={{ width: 36, height: 20, borderRadius: 10, background: showPdfView ? "#e41f07" : "#d1d5db", position: "relative", cursor: "pointer", transition: "0.2s" }}>
                                            <div style={{ position: "absolute", top: 2, left: showPdfView ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "0.2s" }} />
                                        </div>
                                    </div>
                                </div>

                                {/* ── Document Scroll Area ── */}
                                <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", background: "#f0f2f5", padding: "24px", display: "flex", flexDirection: "column", alignItems: "stretch", gap: 20 }}>

                                    {/* ── THE DOCUMENT / TEMPLATE ── */}
                                    <div className="to-receipt" style={{ background: "#fff", width: "100%", fontSize: 14, lineHeight: 1.5, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", flexShrink: 0, borderRadius: 0, position: "relative" }}>

                                        {showPdfView ? (
                                            /* ── Classic PDF Template ── */
                                            <div className="to-pdf-content" style={{ padding: "40px", fontFamily: "Arial, sans-serif", minHeight: 600 }}>
                                                {/* Ribbon */}
                                                <div style={{ position: "absolute", top: 0, left: 0, width: 110, height: 110, overflow: "hidden", pointerEvents: "none" }}>
                                                    <div style={{ position: "absolute", top: 22, left: -42, width: 160, background: st.ribbon, color: "#fff", textAlign: "center", transform: "rotate(-45deg)", padding: "6px 0", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                                                        {selected.status.toUpperCase()}
                                                    </div>
                                                </div>

                                                {/* Header */}
                                                <div style={{ textAlign: "right", borderBottom: "1px solid #e5e7eb", paddingBottom: 20, marginBottom: 20 }}>
                                                    <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, margin: "0 0 16px 0", color: "#111827", fontWeight: "normal" }}>TRANSFER ORDER</h1>
                                                    <table style={{ marginLeft: "auto", fontSize: 12, color: "#374151" }}>
                                                        <tbody>
                                                            <tr>
                                                                <td style={{ textAlign: "right", paddingRight: 12 }}>TransferOrder#</td>
                                                                <td style={{ textAlign: "right", fontWeight: 600, color: "#111827" }}>{selected.transferOrderNumber}</td>
                                                            </tr>
                                                            <tr>
                                                                <td style={{ textAlign: "right", paddingRight: 12, paddingTop: 4 }}>Date</td>
                                                                <td style={{ textAlign: "right", paddingTop: 4, color: "#111827" }}>{selected.date}</td>
                                                            </tr>
                                                            <tr>
                                                                <td style={{ textAlign: "right", paddingRight: 12, paddingTop: 4 }}>Created By</td>
                                                                <td style={{ textAlign: "right", paddingTop: 4, color: "#111827" }}>{selected.createdBy}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Addresses */}
                                                <div className="to-address-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: 30, fontSize: 12, color: "#374151", lineHeight: 1.6 }}>
                                                    <div style={{ flex: 1, paddingRight: 20 }}>
                                                        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4, color: "#111827" }}>student</div>
                                                        <div>India</div>
                                                        <div>vickyyfemi9@gmail.com</div>
                                                    </div>
                                                    <div style={{ flex: 1, borderLeft: "1px solid #e5e7eb", paddingLeft: 20 }}>
                                                        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4, color: "#111827" }}>Source Location</div>
                                                        <div>{selected.sourceLocation}</div>
                                                        <div>Tamil Nadu</div>
                                                        <div>India</div>
                                                        <div>91-7010464051</div>
                                                        <div>vickyyfemi9@gmail.com</div>
                                                    </div>
                                                    <div style={{ flex: 1, borderLeft: "1px solid #e5e7eb", paddingLeft: 20 }}>
                                                        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4, color: "#111827" }}>Destination Location</div>
                                                        <div>{selected.destinationLocation}</div>
                                                        <div>India</div>
                                                        <div>vickyyfemi9@gmail.com</div>
                                                    </div>
                                                </div>

                                                {/* Table */}
                                                <div style={{ overflowX: "auto", width: "100%" }}>
                                                    <table style={{ width: "100%", minWidth: 600, borderCollapse: "collapse", fontSize: 12 }}>
                                                        <thead>
                                                            <tr style={{ background: "#f5f5f5", color: "#333" }}>
                                                                <th style={{ padding: "8px 12px", textAlign: "center", width: 40, fontWeight: 600 }}>#</th>
                                                                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Item & Description</th>
                                                                <th style={{ padding: "8px 12px", textAlign: "right", width: 100, fontWeight: 600 }}>Qty</th>
                                                                <th style={{ padding: "8px 12px", textAlign: "right", width: 100, fontWeight: 600 }}>Amount</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {((selected.items && selected.items.length) ? selected.items : [{ id: 1, product: "femi9", qty: selected.quantity || "1.00", amount: (selected.quantity || 1) * 100 }]).map((item: any, idx) => (
                                                                <tr key={item.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                                                    <td style={{ padding: "12px", textAlign: "center", color: "#374151" }}>{idx + 1}</td>
                                                                    <td style={{ padding: "12px", color: "#111827" }}>{item.product}</td>
                                                                    <td style={{ padding: "12px", textAlign: "right", color: "#111827" }}>{parseFloat(item.qty || "0").toFixed(2)}<br /><span style={{ fontSize: 10, color: "#6b7280" }}>box</span></td>
                                                                    <td style={{ padding: "12px", textAlign: "right", color: "#111827" }}>{(item.amount || parseFloat(item.qty || "0") * 100).toFixed(2)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Total */}
                                                <div style={{ textAlign: "right", marginTop: 20, fontSize: 12, color: "#111827" }}>
                                                    <div style={{ fontWeight: 700, fontSize: 13 }}>Total ₹{totalQty ? (totalQty * 100).toFixed(2) : "100.00"}</div>
                                                    <div style={{ marginTop: 15, color: "#374151" }}>Total In Words: <i style={{ fontWeight: 600, color: "#111827" }}>Indian Rupee One Hundred Only</i></div>
                                                </div>

                                                {/* Reason Footer */}
                                                {selected.reason && (
                                                    <div style={{ marginTop: 40, fontSize: 12, color: "#374151" }}>
                                                        <div style={{ marginBottom: 4 }}>Reason</div>
                                                        <div>{selected.reason}</div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* ── Modern Layout ── */
                                            <div style={{ padding: "40px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
                                                {/* Header & Meta Grid */}
                                                <div style={{ marginBottom: 40 }}>
                                                    <div style={{ fontSize: 24, fontWeight: 500, color: "#111827", marginBottom: 6, letterSpacing: "-0.5px" }}>TRANSFER ORDER</div>
                                                    <div style={{ fontSize: 13, color: "#374151", marginBottom: 20 }}>Transfer Order# <strong>{selected.transferOrderNumber}</strong></div>

                                                    <table style={{ fontSize: 13, color: "#374151", lineHeight: 2 }}>
                                                        <tbody>
                                                            <tr>
                                                                <td style={{ width: 180, color: "#111827" }}>Date</td>
                                                                <td>{selected.date}</td>
                                                            </tr>
                                                            <tr>
                                                                <td style={{ color: "#111827" }}>Created By</td>
                                                                <td>{selected.createdBy}</td>
                                                            </tr>
                                                            <tr>
                                                                <td style={{ color: "#111827" }}>Status</td>
                                                                <td>
                                                                    <span style={{ background: "#9ca3af", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 3, textTransform: "uppercase" }}>
                                                                        {selected.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td style={{ color: "#111827" }}>Created Time</td>
                                                                <td>{selected.createdTime}</td>
                                                            </tr>
                                                            {selected.lastModifiedTime && (
                                                                <tr>
                                                                    <td style={{ color: "#111827" }}>Last Modified Time</td>
                                                                    <td>{selected.lastModifiedTime}</td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Source & Destination Locations */}
                                                <div style={{ display: "flex", gap: 60, marginBottom: 40, fontSize: 13, color: "#111827" }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 12 }}>Source Location</div>
                                                        <div style={{ marginBottom: 20 }}>{selected.sourceLocation}</div>
                                                        <div style={{ color: "#374151" }}>Tamil Nadu India</div>
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 12 }}>Destination Location</div>
                                                        <div style={{ marginBottom: 20 }}>{selected.destinationLocation || "—"}</div>
                                                        <div style={{ color: "#374151" }}>India</div>
                                                    </div>
                                                </div>

                                                {/* Line Items Table */}
                                                <div style={{ overflowX: "auto", width: "100%" }}>
                                                    <table style={{ width: "100%", minWidth: 700, borderCollapse: "collapse", fontSize: 13, marginBottom: 40 }}>
                                                        <thead>
                                                            <tr style={{ background: "#f9fafb", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9" }}>
                                                                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Items & Description</th>
                                                                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Quantity Transferred</th>
                                                                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Cost Price</th>
                                                                <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Amount</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {((selected.items && selected.items.length) ? selected.items : [{ id: 1, product: "femi9", qty: selected.quantity || "1.00", amount: (selected.quantity || 1) * 100 }]).map((item: any) => (
                                                                <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                                    <td style={{ padding: "16px", color: "#3b82f6", display: "flex", alignItems: "center", gap: 12 }}>
                                                                        <div style={{ width: 32, height: 32, background: "#f3f4f6", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#d1d5db" }}>
                                                                            <i className="ti ti-photo" style={{ fontSize: 18 }} />
                                                                        </div>
                                                                        {item.product}
                                                                    </td>
                                                                    <td style={{ padding: "16px", color: "#111827" }}>{item.qty}</td>
                                                                    <td style={{ padding: "16px", color: "#111827" }}>₹100.00</td>
                                                                    <td style={{ padding: "16px", textAlign: "right", color: "#111827" }}>{(item.amount || parseFloat(item.qty || "0") * 100).toFixed(2)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Reason & Totals */}
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                                                    <div style={{ width: 300 }}>
                                                        <div style={{ fontSize: 12, color: "#111827", textTransform: "uppercase", marginBottom: 8 }}>Reason</div>
                                                        <div style={{ fontSize: 13, color: "#374151" }}>{selected.reason || "—"}</div>
                                                    </div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 60, fontSize: 16, fontWeight: 700, color: "#111827", paddingBottom: 8 }}>
                                                        <div>Total</div>
                                                        <div>₹{totalQty ? (totalQty * 100).toFixed(2) : "100.00"}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Template label */}
                                    <div style={{ fontSize: 13, color: "#6b7280", paddingLeft: 2 }}>
                                        PDF Template: <span style={{ color: "#374151", fontWeight: 500 }}>'Transfer Order Template'</span>
                                    </div>

                                </div>
                            </div>
                        ) : (
                            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 14 }}>
                                <div style={{ textAlign: "center" }}>
                                    <i className="ti ti-transfer" style={{ fontSize: 48, display: "block", marginBottom: 12, color: RED, opacity: 0.3 }} />
                                    Select a transfer order to view
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Submit Confirmation Modal */}
            {showSubmitModal && (
                <div onClick={() => setShowSubmitModal(false)} style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "15vh" }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 4, width: 500, maxWidth: "90%", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
                        <div style={{ padding: "24px 24px 16px 24px", display: "flex", gap: 16 }}>
                            <div style={{ width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 4.5L2.5 20H21.5L12 4.5Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1" strokeLinejoin="round" />
                                    <path d="M12 10V15M12 17H12.01" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div style={{ flex: 1, fontSize: 14, color: "#374151", lineHeight: 1.5, paddingTop: 4 }}>
                                Are you sure you want to submit this Transfer Order?
                            </div>
                        </div>
                        <div style={{ padding: "16px 24px", display: "flex", gap: 12, borderTop: "1px solid #e5e7eb", background: "#fff", borderRadius: "0 0 4px 4px" }}>
                            <button onClick={confirmSubmit}
                                style={{ padding: "8px 24px", borderRadius: 4, border: "none", background: "#e41f07", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                                Yes
                            </button>
                            <button onClick={() => setShowSubmitModal(false)}
                                style={{ padding: "8px 16px", borderRadius: 4, border: "1px solid #d1d5db", background: "#f9fafb", color: "#000", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default TransferOrderView;
