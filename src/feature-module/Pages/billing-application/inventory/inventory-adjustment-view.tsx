// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { all_routes } from "../../../../routes/all_routes";
import "./inventory.scss";

// ── Types ─────────────────────────────────────────────────────────────────────
interface AdjItem { id: number; productName: string; sku: string; currentQty: string; qtyAdjusted: string; newQty: string; reason: string; }
interface Comment  { text: string; date: string; user: string; }
interface InventoryAdjustment {
    id: number;
    date: string;
    reason: string;
    description: string;
    status: "Adjusted" | "Draft";
    referenceNumber: string;
    type: "Quantity" | "Value";
    createdBy: string;
    createdTime: string;
    lastModifiedBy: string;
    lastModifiedTime: string;
    location: string;
    items?: AdjItem[];
    comments?: Comment[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const SK   = "billing_inventory_adjustments";
const RED  = "#e41f07";

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
    "Adjusted": { color: "#1ABE17", bg: "rgb(232,248,231)" },
    "Draft":    { color: "#f9b801", bg: "rgb(254,248,230)" },
};

function loadAll(): InventoryAdjustment[] {
    try {
        const s = localStorage.getItem(SK);
        if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length) return p; }
    } catch { /**/ }
    return [];
}
function saveAll(data: InventoryAdjustment[]) {
    localStorage.setItem(SK, JSON.stringify(data));
}
function nowDatetime() {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const h   = d.getHours() % 12 || 12;
    const ampm = d.getHours() >= 12 ? "PM" : "AM";
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(h)}:${pad(d.getMinutes())} ${ampm}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
const InventoryAdjustmentView: React.FC = () => {
    const { id }   = useParams<{ id: string }>();
    const navigate = useNavigate();
    const route    = all_routes;

    const [records,       setRecords]       = useState<InventoryAdjustment[]>([]);
    const [selected,      setSelected]      = useState<InventoryAdjustment | null>(null);
    const [listSearch,    setListSearch]    = useState("");
    const [showPdfView,   setShowPdfView]   = useState(true);
    const [showPdfMenu,   setShowPdfMenu]   = useState(false);
    const [showMoreMenu,  setShowMoreMenu]  = useState(false);
    const [showComments,  setShowComments]  = useState(false);
    const [showAttach,    setShowAttach]    = useState(false);
    const [commentText,   setCommentText]   = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const all  = loadAll();
        setRecords(all);
        const target = id ? all.find(r => String(r.id) === id) : all[0];
        if (target)       setSelected(target);
        else if (all.length) setSelected(all[0]);
    }, [id]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, [selected?.id]);

    const selectRecord = (r: InventoryAdjustment) => {
        setSelected(r);
        navigate(route.inventoryAdjustmentView.replace(":id", String(r.id)));
    };

    const deleteRecord = () => {
        if (!selected || !window.confirm("Delete this adjustment?")) return;
        const updated = records.filter(r => r.id !== selected.id);
        saveAll(updated);
        setRecords(updated);
        if (updated.length) selectRecord(updated[0]);
        else navigate(route.inventoryAdjustmentList);
    };

    const toggleStatus = () => {
        if (!selected) return;
        const newStatus = selected.status === "Adjusted" ? "Draft" : "Adjusted";
        const updated   = records.map(r => r.id === selected.id ? { ...r, status: newStatus } : r);
        saveAll(updated);
        setRecords(updated);
        setSelected(s => s ? { ...s, status: newStatus } : s);
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

    const filtered = records.filter(r =>
        r.reason.toLowerCase().includes(listSearch.toLowerCase()) ||
        r.referenceNumber.toLowerCase().includes(listSearch.toLowerCase()) ||
        r.location.toLowerCase().includes(listSearch.toLowerCase()) ||
        r.status.toLowerCase().includes(listSearch.toLowerCase())
    );

    const st = selected ? (STATUS_STYLE[selected.status] || { color: "#6b7280", bg: "#f3f4f6" }) : { color: "#6b7280", bg: "#f3f4f6" };

    return (
        <div className="page-wrapper">
            <div className="content" style={{ padding: 0, height: "calc(100vh - 60px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                    {/* ── Left Sidebar ── */}
                    <div className={`adj-sidebar ${selected ? "selected-hidden" : ""}`}>
                        {/* Sidebar header */}
                        <div style={{ padding: "12px 14px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>All Adjustments</span>
                            <button onClick={() => navigate(route.inventoryAdjustmentAdd)}
                                style={{ width: 28, height: 28, borderRadius: 5, border: "none", background: "#e41f07", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", transition: "all 0.15s" }}
                                onMouseEnter={e => { e.currentTarget.style.background = "#c01f07"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "#e41f07"; }}>
                                <i className="ti ti-plus" style={{ fontSize: 14 }} />
                            </button>
                        </div>

                        {/* Sidebar search */}
                        <div style={{ padding: "8px 12px", borderBottom: "1px solid #f3f4f6" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 5, padding: "5px 10px" }}>
                                <i className="ti ti-search" style={{ fontSize: 13, color: "#9ca3af" }} />
                                <input
                                    value={listSearch}
                                    onChange={e => setListSearch(e.target.value)}
                                    placeholder="Search..."
                                    style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, flex: 1, color: "#374151" }}
                                />
                            </div>
                        </div>

                        {/* Sidebar list */}
                        <div style={{ flex: 1, overflowY: "auto" }}>
                            {filtered.length === 0 ? (
                                <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "#9ca3af" }}>No adjustments found</div>
                            ) : filtered.map(r => {
                                const s       = STATUS_STYLE[r.status] || { color: "#6b7280", bg: "#f3f4f6" };
                                const isActive = selected?.id === r.id;
                                return (
                                    <div
                                        key={r.id}
                                        onClick={() => selectRecord(r)}
                                        className="adj-list-item"
                                        style={{ padding: "11px 14px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", borderLeft: isActive ? `3px solid ${RED}` : "3px solid transparent", background: isActive ? "#fff1f0" : "#fff", transition: "background 0.15s" }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? RED : "#111827" }}>
                                                Ref# {r.referenceNumber || r.id}
                                            </span>
                                            <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "2px 7px", background: s.bg, color: s.color, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                                                {r.status}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>{r.date}</div>
                                        <div style={{ fontSize: 12, color: "#374151" }}>{r.reason} · {r.location}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Right Panel ── */}
                    {selected ? (
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f0f2f5", overflow: "hidden" }}>

                            {/* Top bar */}
                            <div className="adj-header" style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 1 }}>{selected.date}</div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: 10 }}>
                                        Adj# {selected.referenceNumber || selected.id}
                                        <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 4, padding: "3px 10px", background: st.bg, color: st.color, textTransform: "uppercase" }}>
                                            {selected.status}
                                        </span>
                                    </div>
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
                                    <button onClick={() => navigate(route.inventoryAdjustmentList)} title="Close"
                                        style={{ width: 32, height: 32, borderRadius: 6, border: "1.5px solid #d1d5db", background: "#fff", color: "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = RED; e.currentTarget.style.color = RED; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.color = "#6b7280"; }}>
                                        <i className="ti ti-x" style={{ fontSize: 16 }} />
                                    </button>
                                </div>
                            </div>

                            {/* Action bar */}
                            <div className="adj-actionbar" style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "7px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    {/* Edit */}
                                    <button onClick={() => navigate((route.inventoryAdjustmentAdd || "#") + "?edit=" + selected.id)}
                                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", border: "1px solid #e5e7eb", borderRadius: 5, background: "#fff", fontSize: 13, color: "#374151", cursor: "pointer", fontWeight: 500 }}>
                                        <i className="ti ti-edit" style={{ fontSize: 13 }} /> Edit
                                    </button>
                                    <div style={{ height: 18, width: 1, background: "#e5e7eb", margin: "0 2px" }} />

                                    {/* PDF / Print */}
                                    <div style={{ position: "relative" }}>
                                        <button onClick={() => setShowPdfMenu(!showPdfMenu)} onBlur={() => setTimeout(() => setShowPdfMenu(false), 200)}
                                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", border: "1px solid #e5e7eb", borderRadius: 5, background: "#fff", fontSize: 13, color: "#374151", cursor: "pointer", fontWeight: 500 }}>
                                            <i className="ti ti-file-type-pdf" style={{ fontSize: 14 }} /> PDF/Print <i className="ti ti-chevron-down" style={{ fontSize: 12 }} />
                                        </button>
                                        {showPdfMenu && (
                                            <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100, minWidth: 150, padding: "4px 0" }}>
                                                <div onClick={() => window.print()} style={{ padding: "8px 16px", fontSize: 13, color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                                                    <i className="ti ti-printer" /> Print
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ height: 18, width: 1, background: "#e5e7eb", margin: "0 2px" }} />

                                    {/* Toggle Status */}
                                    <button onClick={toggleStatus}
                                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", border: "1px solid #e5e7eb", borderRadius: 5, background: "#fff", fontSize: 13, color: "#374151", cursor: "pointer", fontWeight: 500 }}>
                                        <i className="ti ti-refresh" style={{ fontSize: 13 }} />
                                        {selected.status === "Adjusted" ? "Convert to Draft" : "Mark as Adjusted"}
                                    </button>
                                    <div style={{ height: 18, width: 1, background: "#e5e7eb", margin: "0 2px" }} />

                                    {/* More */}
                                    <div style={{ position: "relative" }}>
                                        <button onClick={() => setShowMoreMenu(!showMoreMenu)} onBlur={() => setTimeout(() => setShowMoreMenu(false), 200)}
                                            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 28, border: "1px solid #e5e7eb", borderRadius: 5, background: "#fff", color: "#374151", cursor: "pointer" }}>
                                            <i className="ti ti-dots" style={{ fontSize: 16 }} />
                                        </button>
                                        {showMoreMenu && (
                                            <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100, minWidth: 120, padding: "4px 0" }}>
                                                <div onClick={deleteRecord} style={{ padding: "8px 16px", fontSize: 13, color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                                                    <i className="ti ti-trash" /> Delete
                                                </div>
                                            </div>
                                        )}
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
                            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", background: "#f0f2f5", padding: "24px", display: "flex", flexDirection: "column", alignItems: "stretch", gap: 20 }}>

                                <div className="adj-receipt" style={{ background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", position: "relative" }}>

                                    {showPdfView ? (
                                        /* Classic PDF layout */
                                        <div className="adj-pdf-content" style={{ padding: "40px", fontFamily: "Arial, sans-serif", minHeight: 500 }}>
                                            {/* Status ribbon */}
                                            <div style={{ position: "absolute", top: 0, left: 0, width: 110, height: 110, overflow: "hidden", pointerEvents: "none" }}>
                                                <div style={{ position: "absolute", top: 22, left: -42, width: 160, background: st.color, color: "#fff", textAlign: "center", transform: "rotate(-45deg)", padding: "6px 0", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                                                    {selected.status.toUpperCase()}
                                                </div>
                                            </div>

                                            <div style={{ textAlign: "right", borderBottom: "1px solid #e5e7eb", paddingBottom: 20, marginBottom: 24 }}>
                                                <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, margin: "0 0 12px 0", color: "#111827", fontWeight: "normal" }}>INVENTORY ADJUSTMENT</h1>
                                                <table style={{ marginLeft: "auto", fontSize: 12, color: "#374151" }}>
                                                    <tbody>
                                                        <tr>
                                                            <td style={{ textAlign: "right", paddingRight: 12 }}>Reference#</td>
                                                            <td style={{ fontWeight: 600, color: "#111827" }}>{selected.referenceNumber || "—"}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style={{ textAlign: "right", paddingRight: 12, paddingTop: 4 }}>Date</td>
                                                            <td style={{ paddingTop: 4, color: "#111827" }}>{selected.date}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style={{ textAlign: "right", paddingRight: 12, paddingTop: 4 }}>Type</td>
                                                            <td style={{ paddingTop: 4, color: "#111827" }}>{selected.type}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style={{ textAlign: "right", paddingRight: 12, paddingTop: 4 }}>Location</td>
                                                            <td style={{ paddingTop: 4, color: "#111827" }}>{selected.location}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Info grid */}
                                            <div style={{ display: "flex", gap: 40, marginBottom: 28, fontSize: 12, color: "#374151", lineHeight: 1.7 }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700, color: "#111827", marginBottom: 4, fontSize: 11, textTransform: "uppercase" }}>Reason</div>
                                                    <div>{selected.reason || "—"}</div>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700, color: "#111827", marginBottom: 4, fontSize: 11, textTransform: "uppercase" }}>Created By</div>
                                                    <div>{selected.createdBy}</div>
                                                    <div style={{ color: "#6b7280", fontSize: 11 }}>{selected.createdTime}</div>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700, color: "#111827", marginBottom: 4, fontSize: 11, textTransform: "uppercase" }}>Last Modified By</div>
                                                    <div>{selected.lastModifiedBy}</div>
                                                    <div style={{ color: "#6b7280", fontSize: 11 }}>{selected.lastModifiedTime}</div>
                                                </div>
                                            </div>

                                            {/* Items table */}
                                            {selected.items && selected.items.length > 0 && (
                                                <div style={{ overflowX: "auto", marginBottom: 24 }}>
                                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                                        <thead>
                                                            <tr style={{ background: "#f5f5f5", color: "#333" }}>
                                                                <th style={{ padding: "8px 12px", textAlign: "center", width: 40, fontWeight: 600 }}>#</th>
                                                                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Product</th>
                                                                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, width: 110 }}>SKU</th>
                                                                <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, width: 100 }}>Current Qty</th>
                                                                <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, width: 110 }}>Qty Adjusted</th>
                                                                <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, width: 100 }}>New Qty</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selected.items.map((item, idx) => (
                                                                <tr key={item.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                                                    <td style={{ padding: "10px 12px", textAlign: "center", color: "#374151" }}>{idx + 1}</td>
                                                                    <td style={{ padding: "10px 12px", color: "#111827" }}>{item.productName || "—"}</td>
                                                                    <td style={{ padding: "10px 12px", color: "#6b7280" }}>{item.sku || "—"}</td>
                                                                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#374151" }}>{item.currentQty}</td>
                                                                    <td style={{ padding: "10px 12px", textAlign: "right", color: parseFloat(item.qtyAdjusted) < 0 ? "#dc2626" : "#16a34a" }}>
                                                                        {parseFloat(item.qtyAdjusted) > 0 ? "+" : ""}{item.qtyAdjusted}
                                                                    </td>
                                                                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#111827", fontWeight: 600 }}>{item.newQty}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}

                                            {/* Description */}
                                            {selected.description && (
                                                <div style={{ marginTop: 20, fontSize: 12, color: "#374151" }}>
                                                    <div style={{ fontWeight: 700, marginBottom: 4, color: "#111827", fontSize: 11, textTransform: "uppercase" }}>Description</div>
                                                    <div>{selected.description}</div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* Modern layout */
                                        <div style={{ padding: "40px", fontFamily: "system-ui, sans-serif" }}>
                                            <div style={{ fontSize: 22, fontWeight: 500, color: "#111827", marginBottom: 4 }}>INVENTORY ADJUSTMENT</div>
                                            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>Reference# <strong>{selected.referenceNumber || "—"}</strong></div>

                                            <table style={{ fontSize: 13, color: "#374151", lineHeight: 2, marginBottom: 32 }}>
                                                <tbody>
                                                    {[
                                                        ["Date",             selected.date],
                                                        ["Reason",          selected.reason || "—"],
                                                        ["Type",            selected.type],
                                                        ["Location",        selected.location],
                                                        ["Status",          selected.status],
                                                        ["Created By",      selected.createdBy],
                                                        ["Created Time",    selected.createdTime],
                                                        ["Last Modified By",   selected.lastModifiedBy],
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
                                                            <tr style={{ background: "#f9fafb", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9" }}>
                                                                {["Product", "SKU", "Current Qty", "Qty Adjusted", "New Qty"].map(h => (
                                                                    <th key={h} style={{ padding: "12px 16px", textAlign: h === "Product" || h === "SKU" ? "left" : "right", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>{h}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selected.items.map(item => (
                                                                <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                                    <td style={{ padding: "16px", color: "#111827" }}>{item.productName || "—"}</td>
                                                                    <td style={{ padding: "16px", color: "#6b7280" }}>{item.sku || "—"}</td>
                                                                    <td style={{ padding: "16px", textAlign: "right", color: "#374151" }}>{item.currentQty}</td>
                                                                    <td style={{ padding: "16px", textAlign: "right", color: parseFloat(item.qtyAdjusted) < 0 ? "#dc2626" : "#16a34a", fontWeight: 600 }}>
                                                                        {parseFloat(item.qtyAdjusted) > 0 ? "+" : ""}{item.qtyAdjusted}
                                                                    </td>
                                                                    <td style={{ padding: "16px", textAlign: "right", color: "#111827", fontWeight: 600 }}>{item.newQty}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}

                                            {selected.description && (
                                                <div>
                                                    <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 8 }}>Description</div>
                                                    <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{selected.description}</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div style={{ fontSize: 13, color: "#6b7280", paddingLeft: 2 }}>
                                    PDF Template: <span style={{ color: "#374151", fontWeight: 500 }}>'Inventory Adjustment Template'</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="mobile-text-hide" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 14 }}>
                            <div style={{ textAlign: "center" }}>
                                <i className="ti ti-adjustments" style={{ fontSize: 48, display: "block", marginBottom: 12, color: RED, opacity: 0.3 }} />
                                Select an adjustment to view
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InventoryAdjustmentView;
