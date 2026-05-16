// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { all_routes } from "../../../../routes/all_routes";
import "../payment/payment.scss";

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
    createdBy: string;
    createdTime: string;
    lastModifiedBy: string;
    lastModifiedTime: string;
}

const SK    = "billing_transfer_orders";
const route = all_routes;
const RED   = "#e41f07";

const STATUS_STYLE: Record<string, { color: string; bg: string; ribbon: string }> = {
    "Draft":                 { color: "#b45309", bg: "#fef9c3", ribbon: "#ca8a04" },
    "Transferred":           { color: "#16a34a", bg: "#dcfce7", ribbon: "#16a34a" },
    "In Transit":            { color: "#7c3aed", bg: "#f5f3ff", ribbon: "#7c3aed" },
    "Partially Transferred": { color: "#ea580c", bg: "#ffedd5", ribbon: "#ea580c" },
    "Pending":               { color: "#6b7280", bg: "#f3f4f6", ribbon: "#6b7280" },
    "Void":                  { color: "#6b7280", bg: "#f3f4f6", ribbon: "#6b7280" },
};

function loadOrders(): TransferOrder[] {
    try {
        const s = localStorage.getItem(SK);
        if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length) return p; }
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
                name:    p.organizationName || p.companyName || "FEMI9",
                address: p.address || "Tamil Nadu, India",
                phone:   p.phone  || "91-8012610945",
                email:   p.email  || "femi9@gmail.com",
            };
        }
    } catch { /**/ }
    return { name: "FEMI9", address: "Tamil Nadu, India", phone: "91-8012610945", email: "femi9@gmail.com" };
}

const TransferOrderView: React.FC = () => {
    const { id }    = useParams<{ id: string }>();
    const navigate  = useNavigate();

    const [orders,         setOrders]         = useState<TransferOrder[]>([]);
    const [selected,       setSelected]       = useState<TransferOrder | null>(null);
    const [listSearch,     setListSearch]     = useState("");
    const [sidebarVisible, setSidebarVisible] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const company   = loadCompanySettings();

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

    const filtered = orders.filter(o =>
        o.transferOrderNumber.toLowerCase().includes(listSearch.toLowerCase()) ||
        (o.reason || "").toLowerCase().includes(listSearch.toLowerCase()) ||
        o.sourceLocation.toLowerCase().includes(listSearch.toLowerCase()) ||
        (o.destinationLocation || "").toLowerCase().includes(listSearch.toLowerCase())
    );

    const st       = selected ? (STATUS_STYLE[selected.status] || { color: "#6b7280", bg: "#f3f4f6", ribbon: "#6b7280" }) : { color: "#6b7280", bg: "#f3f4f6", ribbon: "#6b7280" };
    const totalQty = selected?.items?.reduce((s, i) => s + (parseFloat(i.qty) || 0), 0) ?? selected?.quantity ?? 0;

    return (
        <>
            <style>{`
                @media (max-width:992px){.to-sidebar{display:${selected ? "none" : "flex"} !important;}}
                @media print{
                    .to-sidebar, .to-header, .to-actionbar { display: none !important; }
                    .to-receipt { box-shadow: none !important; }
                }
                .to-list-item:hover { background: #f9fafb; }
            `}</style>

            <div className="page-wrapper">
                <div className="content" style={{ padding: 0, height: "calc(100vh - 60px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

                        {/* ── Left Sidebar ─────────────────────────────── */}
                        <div className="to-sidebar" style={{ width: sidebarVisible ? 320 : 0, borderRight: sidebarVisible ? "1px solid #e5e7eb" : "none", display: "flex", flexDirection: "column", background: "#fff", flexShrink: 0, transition: "width 0.2s ease", overflow: "hidden" }}>

                            <div style={{ padding: "12px 14px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: "#111827", whiteSpace: "nowrap" }}>All Transfer Orders</span>
                                <button onClick={() => navigate(route.transferOrderAdd)}
                                    style={{ width: 28, height: 28, borderRadius: 5, border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#374151" }}>
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
                                    <button onClick={() => navigate(route.transferOrderList)} title="Close"
                                        style={{ width: 32, height: 32, borderRadius: 6, border: "1.5px solid #d1d5db", background: "#fff", color: "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = RED; (e.currentTarget as HTMLButtonElement).style.color = RED; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#d1d5db"; (e.currentTarget as HTMLButtonElement).style.color = "#6b7280"; }}>
                                        <i className="ti ti-x" style={{ fontSize: 16 }} />
                                    </button>
                                </div>

                                {/* Action Bar */}
                                <div className="to-actionbar" style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "7px 24px", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                    <button onClick={() => setSidebarVisible(!sidebarVisible)} title={sidebarVisible ? "Hide List" : "Show List"}
                                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", border: "1px solid #e5e7eb", borderRadius: 5, background: "#fff", fontSize: 13, color: "#374151", cursor: "pointer" }}>
                                        <i className={`ti ${sidebarVisible ? "ti-layout-sidebar-left-collapse" : "ti-layout-sidebar-right-collapse"}`} style={{ fontSize: 15 }} />
                                    </button>
                                    <div style={{ height: 18, width: 1, background: "#e5e7eb", margin: "0 4px" }} />
                                    <button onClick={() => navigate(route.transferOrderAdd + "?edit=" + selected.id)}
                                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", border: "1px solid #e5e7eb", borderRadius: 5, background: "#fff", fontSize: 13, color: "#374151", cursor: "pointer", fontWeight: 500 }}>
                                        <i className="ti ti-edit" style={{ fontSize: 13 }} /> Edit
                                    </button>
                                    <button onClick={() => window.print()}
                                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", border: "1px solid #e5e7eb", borderRadius: 5, background: "#fff", fontSize: 13, color: "#374151", cursor: "pointer", fontWeight: 500 }}>
                                        <i className="ti ti-printer" style={{ fontSize: 13 }} /> Print
                                    </button>
                                    {selected.status !== "Void" && (
                                        <button onClick={voidOrder}
                                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", border: "1px solid #e5e7eb", borderRadius: 5, background: "#fff", fontSize: 13, color: "#374151", cursor: "pointer", fontWeight: 500 }}>
                                            <i className="ti ti-ban" style={{ fontSize: 13 }} /> Void
                                        </button>
                                    )}
                                    <button onClick={deleteOrder}
                                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", border: "1px solid #fee2e2", borderRadius: 5, background: "#fff", fontSize: 13, color: RED, cursor: "pointer", fontWeight: 500 }}>
                                        <i className="ti ti-trash" style={{ fontSize: 13 }} /> Delete
                                    </button>
                                </div>

                                {/* ── Document Scroll Area ── */}
                                <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", background: "#f0f2f5", padding: "24px", display: "flex", flexDirection: "column", alignItems: "stretch", gap: 20 }}>

                                    {/* ── THE DOCUMENT / TEMPLATE ── */}
                                    <div className="to-receipt" style={{ background: "#fff", width: "100%", fontSize: 14, lineHeight: 1.5, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", flexShrink: 0, borderRadius: 0, position: "relative" }}>

                                        {/* Status Ribbon (top-left corner) */}
                                        <div style={{ position: "absolute", top: 0, left: 0, width: 110, height: 110, overflow: "hidden", pointerEvents: "none", zIndex: 10 }}>
                                            <div style={{
                                                position: "absolute", top: 22, left: -42, width: 160,
                                                background: st.ribbon,
                                                color: "#fff", textAlign: "center", transform: "rotate(-45deg)",
                                                padding: "6px 0", fontSize: 10, fontWeight: 700, letterSpacing: 1,
                                            }}>
                                                {selected.status.toUpperCase()}
                                            </div>
                                        </div>

                                        {/* ── Section 1: Header ── */}
                                        <div style={{ padding: "40px 48px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                            {/* Company Info */}
                                            <div style={{ flex: 1, paddingLeft: 60 }}>
                                                <div style={{ fontSize: 24, fontWeight: 800, color: "#1a1a1a", marginBottom: 8, letterSpacing: -0.5 }}>{company.name}</div>
                                                <div style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.7, maxWidth: 280 }}>
                                                    {company.address}<br />
                                                    <strong>Phone:</strong> {company.phone}<br />
                                                    <strong>Email:</strong> {company.email}
                                                </div>
                                            </div>
                                            {/* Title + meta */}
                                            <div style={{ textAlign: "right", flex: 1 }}>
                                                <div style={{ fontSize: 26, fontWeight: 700, color: RED, letterSpacing: 1, marginBottom: 8 }}>TRANSFER ORDER</div>
                                                <div style={{ fontSize: 15, fontWeight: 600, color: "#374151" }}>{selected.transferOrderNumber}</div>
                                                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>Date: <strong>{selected.date}</strong></div>
                                                <div style={{ marginTop: 8, display: "inline-block", padding: "3px 12px", borderRadius: 4, background: st.bg }}>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: st.color, textTransform: "uppercase", letterSpacing: "0.5px" }}>{selected.status}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <div style={{ margin: "0 48px", borderBottom: `2px solid ${RED}`, opacity: 0.15 }} />

                                        {/* ── Section 2: Transfer Route ── */}
                                        <div style={{ padding: "28px 48px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "stretch", gap: 0 }}>
                                            {/* Source */}
                                            <div style={{ flex: 1, background: "#fff8f8", border: `1px solid #fee2e2`, borderRadius: "8px 0 0 8px", padding: "20px 24px" }}>
                                                <div style={{ fontSize: 11, color: RED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>
                                                    <i className="ti ti-map-pin me-1" /> Source Location
                                                </div>
                                                <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{selected.sourceLocation || "—"}</div>
                                                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>Transfer From</div>
                                            </div>

                                            {/* Arrow center */}
                                            <div style={{ width: 60, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fff", border: "1px solid #f1f5f9", borderLeft: "none", borderRight: "none", flexShrink: 0 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: "50%", background: RED, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                    <i className="ti ti-arrow-right" style={{ fontSize: 18, color: "#fff" }} />
                                                </div>
                                            </div>

                                            {/* Destination */}
                                            <div style={{ flex: 1, background: "#fff8f8", border: `1px solid #fee2e2`, borderRadius: "0 8px 8px 0", padding: "20px 24px" }}>
                                                <div style={{ fontSize: 11, color: RED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>
                                                    <i className="ti ti-map-pin-filled me-1" /> Destination Location
                                                </div>
                                                <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{selected.destinationLocation || "—"}</div>
                                                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>Transfer To</div>
                                            </div>
                                        </div>

                                        {/* ── Section 3: Info Row ── */}
                                        <div style={{ padding: "20px 48px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 40, flexWrap: "wrap" }}>
                                            <div>
                                                <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Transfer Order #</div>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: RED }}>{selected.transferOrderNumber}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Date</div>
                                                <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>{selected.date}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Total Quantity</div>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{totalQty.toFixed(2)}</div>
                                            </div>
                                            {selected.reason && (
                                                <div style={{ flexBasis: "100%" }}>
                                                    <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Reason</div>
                                                    <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>{selected.reason}</div>
                                                </div>
                                            )}
                                        </div>

                                        {/* ── Section 4: Item Table ── */}
                                        <div style={{ padding: "24px 48px", borderBottom: "1px solid #e5e7eb" }}>
                                            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 14 }}>Item Details</div>
                                            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e5e7eb" }}>
                                                <thead>
                                                    <tr style={{ background: RED }}>
                                                        {["#", "Item Details", "Source Stock", "Destination Stock", "Transfer Qty"].map((h, i) => (
                                                            <th key={h} style={{
                                                                padding: "10px 14px",
                                                                fontSize: 12, fontWeight: 700, color: "#fff",
                                                                textAlign: i === 0 ? "center" : i >= 2 ? "center" : "left",
                                                                textTransform: "uppercase", letterSpacing: "0.4px",
                                                                borderRight: i < 4 ? "1px solid rgba(255,255,255,0.2)" : "none",
                                                            }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(selected.items && selected.items.length > 0) ? selected.items.map((item, idx) => (
                                                        <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                                                            <td style={{ padding: "12px 14px", fontSize: 13, color: "#9ca3af", textAlign: "center", borderRight: "1px solid #f1f5f9" }}>{idx + 1}</td>
                                                            <td style={{ padding: "12px 14px", fontSize: 14, color: "#111827", fontWeight: 600, borderRight: "1px solid #f1f5f9" }}>
                                                                {item.product || <span style={{ color: "#9ca3af", fontStyle: "italic", fontWeight: 400 }}>—</span>}
                                                            </td>
                                                            <td style={{ padding: "12px 14px", fontSize: 13, color: "#374151", textAlign: "center", borderRight: "1px solid #f1f5f9" }}>{item.sourceStock || "—"}</td>
                                                            <td style={{ padding: "12px 14px", fontSize: 13, color: "#374151", textAlign: "center", borderRight: "1px solid #f1f5f9" }}>{item.destStock || "—"}</td>
                                                            <td style={{ padding: "12px 14px", fontSize: 14, color: "#111827", fontWeight: 700, textAlign: "right" }}>{parseFloat(item.qty || "0").toFixed(2)}</td>
                                                        </tr>
                                                    )) : (
                                                        <tr>
                                                            <td colSpan={5} style={{ padding: "28px 14px", textAlign: "center", fontSize: 13, color: "#9ca3af" }}>No items recorded</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                                {selected.items && selected.items.length > 0 && (
                                                    <tfoot>
                                                        <tr style={{ background: "#fff8f8", borderTop: `2px solid ${RED}` }}>
                                                            <td colSpan={4} style={{ padding: "11px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#374151" }}>Total Transfer Quantity</td>
                                                            <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 15, fontWeight: 800, color: RED }}>{totalQty.toFixed(2)}</td>
                                                        </tr>
                                                    </tfoot>
                                                )}
                                            </table>
                                        </div>

                                        {/* ── Section 5: Footer — Created By + Signature ── */}
                                        <div style={{ padding: "32px 48px 48px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 24 }}>
                                            {/* Audit info */}
                                            <div>
                                                <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>Created By</div>
                                                <div style={{ fontSize: 16, fontWeight: 700, color: RED, marginBottom: 4 }}>{selected.createdBy}</div>
                                                <div style={{ fontSize: 12, color: "#6b7280" }}>{selected.createdTime}</div>
                                                {selected.lastModifiedBy !== selected.createdBy && (
                                                    <div style={{ marginTop: 10 }}>
                                                        <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 4 }}>Last Modified</div>
                                                        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{selected.lastModifiedBy}</div>
                                                        <div style={{ fontSize: 12, color: "#6b7280" }}>{selected.lastModifiedTime}</div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Authorized Signature */}
                                            <div style={{ textAlign: "right", minWidth: 200, marginTop: 40 }}>
                                                <div style={{ borderBottom: `2px solid #e5e7eb`, marginBottom: 10, width: "100%" }} />
                                                <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Authorized Signature</div>
                                            </div>
                                        </div>

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
        </>
    );
};

export default TransferOrderView;
