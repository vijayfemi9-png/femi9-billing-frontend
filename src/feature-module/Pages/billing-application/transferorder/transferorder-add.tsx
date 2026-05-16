// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { all_routes } from "../../../../routes/all_routes";
import "../payment/payment.scss";

const SK = "billing_transfer_orders";
const LOCATIONS = ["Head Office", "Main Warehouse", "Branch A", "Branch B"];

function todayDisplay() {
    const d = new Date();
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}
function nextTONum(): string {
    try {
        const a = JSON.parse(localStorage.getItem(SK) || "[]");
        const n = (a.length || 0) + 1;
        return "TO-" + String(n).padStart(5, "0");
    } catch { return "TO-00001"; }
}
function nowStr() {
    return new Date().toLocaleString("en-IN", { hour12: true, day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

interface LineItem { id: number; product: string; sourceStock: string; destStock: string; qty: string; }

const AddTransferOrder: React.FC = () => {
    const navigate        = useNavigate();
    const route           = all_routes;
    const [searchParams]  = useSearchParams();
    const editId          = searchParams.get("edit");
    const fileRef         = useRef<HTMLInputElement>(null);

    const [toNum,      setToNum]      = useState(nextTONum());
    const [toDate,     setToDate]     = useState(todayDisplay());
    const [reason,     setReason]     = useState("");
    const [sourceLoc,  setSourceLoc]  = useState("");
    const [destLoc,    setDestLoc]    = useState("");
    const [items,      setItems]      = useState<LineItem[]>([{ id: 1, product: "", sourceStock: "-", destStock: "-", qty: "0.00" }]);
    const [files,      setFiles]      = useState<File[]>([]);
    const [errors,     setErrors]     = useState<Record<string,string>>({});
    const [saving,     setSaving]     = useState(false);

    // Load existing record for edit
    useEffect(() => {
        if (!editId) return;
        try {
            const all = JSON.parse(localStorage.getItem(SK) || "[]");
            const o   = all.find((x: any) => String(x.id) === editId);
            if (!o) return;
            setToNum(o.transferOrderNumber || "");
            setToDate(o.date || todayDisplay());
            setReason(o.reason || "");
            setSourceLoc(o.sourceLocation || "");
            setDestLoc(o.destinationLocation || "");
            if (o.items?.length) setItems(o.items);
        } catch { /**/ }
    }, [editId]);

    const swapLocations = () => { setSourceLoc(destLoc); setDestLoc(sourceLoc); };

    const addItem = () =>
        setItems(p => [...p, { id: Date.now(), product: "", sourceStock: "-", destStock: "-", qty: "0.00" }]);

    const removeItem = (id: number) =>
        setItems(p => p.filter(i => i.id !== id));

    const updateItem = (id: number, field: keyof LineItem, val: string) =>
        setItems(p => p.map(i => i.id === id ? { ...i, [field]: val } : i));

    const totalQty = items.reduce((s, i) => s + (parseFloat(i.qty) || 0), 0);

    const validate = () => {
        const e: Record<string,string> = {};
        if (!sourceLoc) e.sourceLoc = "Required";
        if (!destLoc)   e.destLoc   = "Required";
        if (sourceLoc && destLoc && sourceLoc === destLoc) e.destLoc = "Must differ from source";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const save = (saveStatus: string) => {
        if (!validate()) return;
        setSaving(true);
        try {
            const existing = JSON.parse(localStorage.getItem(SK) || "[]");
            const record = {
                transferOrderNumber: toNum,
                date: toDate,
                reason,
                status: saveStatus,
                quantity: totalQty || items.length,
                sourceLocation: sourceLoc,
                destinationLocation: destLoc,
                items,
                createdBy: "vickyyfemi9",
                createdTime: nowStr(),
                lastModifiedBy: "vickyyfemi9",
                lastModifiedTime: nowStr(),
            };
            let saved;
            if (editId) {
                saved = existing.map((o: any) =>
                    String(o.id) === editId ? { ...o, ...record, lastModifiedTime: nowStr() } : o
                );
            } else {
                const id = existing.length ? Math.max(...existing.map((o: any) => o.id)) + 1 : 1;
                saved = [...existing, { id, ...record }];
            }
            localStorage.setItem(SK, JSON.stringify(saved));
        } catch (err) { console.error(err); }
        setSaving(false);
        navigate(route.transferOrderList);
    };

    // ── Styles ──────────────────────────────────────────────────────────────
    const inp = (err?: string): React.CSSProperties => ({
        width: "100%", padding: "7px 11px", fontSize: 13,
        border: `1px solid ${err ? "#e41f07" : "#d1d5db"}`,
        borderRadius: 4, outline: "none", color: "#111827", background: "#fff",
    });
    const sel = (err?: string): React.CSSProperties => ({
        ...inp(err), cursor: "pointer", appearance: "auto",
    });

    return (
        <>
        <div className="page-wrapper" style={{ background: "#f8fafc", minHeight: "100vh" }}>
            <div className="content container-fluid" style={{ padding: "24px 32px", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

                {/* ── Page Header ── */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                    <div>
                        <h4 style={{ fontWeight: 700, fontSize: 20, marginBottom: 4, color: "#111827" }}>
                            {editId ? "Edit Transfer Order" : "Transfer Orders"}
                        </h4>
                        <ol style={{ display: "flex", gap: 6, alignItems: "center", listStyle: "none", margin: 0, padding: 0, fontSize: 13, color: "#6b7280" }}>
                            <li>Home</li><li>›</li><li>Transfer Orders</li><li>›</li>
                            <li style={{ color: "#111827", fontWeight: 500 }}>{editId ? "Edit" : "New"}</li>
                        </ol>
                    </div>
                    <button onClick={() => navigate(route.transferOrderList)}
                        style={{ width: 36, height: 36, borderRadius: 4, background: "#fff", border: "1px solid #e5e9ef", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        <i className="ti ti-x" style={{ fontSize: 16, color: "#374151" }} />
                    </button>
                </div>

                {/* ── Document Paper ── */}
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 0, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>

                    {/* ── Document Header: Company (left) + Title (right) ── */}
                    <div style={{ padding: "24px 32px 20px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderBottom: "1px solid #e5e7eb" }}>
                        {/* Left: Company */}
                        <div>
                            <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", letterSpacing: -0.5 }}>Femi9 Pvt Ltd</div>
                            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>Head Office, Chennai</div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>Tamil Nadu, India</div>
                        </div>
                        {/* Right: Title + editable TO# + Date */}
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 20, fontWeight: 900, color: "#111827", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Transfer Order</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500, whiteSpace: "nowrap" }}>Order #</span>
                                    <div style={{ position: "relative" }}>
                                        <input value={toNum} onChange={e => setToNum(e.target.value)}
                                            style={{ width: 140, padding: "5px 28px 5px 10px", fontSize: 13, fontWeight: 600, color: "#111827", border: "1px solid #d1d5db", borderRadius: 4, textAlign: "right", background: "#fff", outline: "none" }} />
                                        <i className="ti ti-settings" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#9ca3af", cursor: "pointer" }} />
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>Date</span>
                                    <input value={toDate} onChange={e => setToDate(e.target.value)} placeholder="DD/MM/YYYY"
                                        style={{ width: 140, padding: "5px 10px", fontSize: 13, color: "#374151", border: "1px solid #e5e7eb", borderRadius: 4, textAlign: "right", outline: "none" }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Source → Destination ── */}
                    <div style={{ padding: "24px 32px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 20 }}>
                        {/* Source box */}
                        <div style={{ flex: 1, background: "#fff", border: `1px solid ${errors.sourceLoc ? "#c0392b" : "#e5e7eb"}`, borderRadius: 8, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Source Location *</div>
                            <select value={sourceLoc} onChange={e => setSourceLoc(e.target.value)}
                                style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: `1px solid ${errors.sourceLoc ? "#c0392b" : "#d1d5db"}`, borderRadius: 4, background: "#fff", color: sourceLoc ? "#111827" : "#9ca3af", outline: "none", cursor: "pointer" }}>
                                <option value="">Select source location...</option>
                                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                            {errors.sourceLoc && <div style={{ fontSize: 11, color: "#c0392b", marginTop: 4 }}>{errors.sourceLoc}</div>}
                            {sourceLoc && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>Tamil Nadu, India</div>}
                        </div>
                        {/* Arrow — click to swap */}
                        <div style={{ width: 44, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <button onClick={swapLocations} title="Swap locations"
                                style={{ width: 44, height: 44, borderRadius: "50%", background: "#fff", border: "1px solid #d1d5db", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.06)" }}>
                                <i className="ti ti-exchange" style={{ fontSize: 20, color: "#6b7280" }} />
                            </button>
                        </div>
                        {/* Destination box */}
                        <div style={{ flex: 1, background: "#fff", border: `1px solid ${errors.destLoc ? "#c0392b" : "#e5e7eb"}`, borderRadius: 8, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Destination Location *</div>
                            <select value={destLoc} onChange={e => setDestLoc(e.target.value)}
                                style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: `1px solid ${errors.destLoc ? "#c0392b" : "#d1d5db"}`, borderRadius: 4, background: "#fff", color: destLoc ? "#111827" : "#9ca3af", outline: "none", cursor: "pointer" }}>
                                <option value="">Select destination location...</option>
                                {LOCATIONS.filter(l => l !== sourceLoc).map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                            {errors.destLoc && <div style={{ fontSize: 11, color: "#c0392b", marginTop: 4 }}>{errors.destLoc}</div>}
                            {destLoc && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>Tamil Nadu, India</div>}
                        </div>
                    </div>

                    {/* ── Reason ── */}
                    <div style={{ padding: "16px 32px", borderBottom: "1px solid #f1f5f9" }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Reason</label>
                        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                            style={{ width: "100%", padding: "8px 12px", fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 4, outline: "none", resize: "vertical", fontFamily: "inherit", color: "#374151", lineHeight: 1.6 }}
                            onFocus={e => (e.target.style.borderColor = "#2563eb")}
                            onBlur={e => (e.target.style.borderColor = "#e5e7eb")} />
                    </div>

                    {/* ── Item Table ── */}
                    <div>
                        {/* Table toolbar */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 32px", background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Item Table</span>
                            <div style={{ display: "flex", gap: 16 }}>
                                <button style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
                                    <i className="ti ti-qrcode" style={{ fontSize: 14 }} /> Scan Item
                                </button>
                                <button style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
                                    <i className="ti ti-list-check" style={{ fontSize: 14 }} /> Bulk Actions
                                </button>
                            </div>
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#f9fafb", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb" }}>
                                    <th style={{ width: 30, padding: "9px 6px" }}></th>
                                    <th style={{ width: 38, padding: "9px 6px" }}></th>
                                    <th style={{ padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#374151", letterSpacing: "0.5px", textTransform: "uppercase" }}>Item Details</th>
                                    <th style={{ width: 120, padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#374151", letterSpacing: "0.5px", textTransform: "uppercase" }}>Source Stock</th>
                                    <th style={{ width: 140, padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#374151", letterSpacing: "0.5px", textTransform: "uppercase" }}>Dest. Stock</th>
                                    <th style={{ width: 130, padding: "9px 12px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#374151", letterSpacing: "0.5px", textTransform: "uppercase" }}>Transfer Qty</th>
                                    <th style={{ width: 36, padding: "9px 6px" }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                        <td style={{ padding: "10px 6px", textAlign: "center", color: "#d1d5db" }}>
                                            <i className="ti ti-grip-vertical" style={{ fontSize: 15 }} />
                                        </td>
                                        <td style={{ padding: "10px 6px" }}>
                                            <div style={{ width: 30, height: 30, border: "1px solid #e5e7eb", borderRadius: 4, background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <i className="ti ti-photo" style={{ fontSize: 15, color: "#d1d5db" }} />
                                            </div>
                                        </td>
                                        <td style={{ padding: "10px 12px" }}>
                                            <input value={item.product} onChange={e => updateItem(item.id, "product", e.target.value)}
                                                placeholder="Type or click to select an item."
                                                style={{ width: "100%", border: "none", outline: "none", fontSize: 13, color: "#374151", background: "transparent" }} />
                                        </td>
                                        <td style={{ padding: "10px 12px" }}>
                                            <div style={{ fontSize: 13, color: "#374151" }}>{item.sourceStock || "—"}</div>
                                        </td>
                                        <td style={{ padding: "10px 12px" }}>
                                            <div style={{ fontSize: 13, color: "#374151" }}>{item.destStock || "—"}</div>
                                        </td>
                                        <td style={{ padding: "10px 12px", textAlign: "right" }}>
                                            <input type="number" value={item.qty} onChange={e => updateItem(item.id, "qty", e.target.value)}
                                                min="0" step="0.01"
                                                style={{ width: 80, border: "none", outline: "none", fontSize: 13, color: "#111827", background: "transparent", textAlign: "right", fontWeight: 600 }} />
                                        </td>
                                        <td style={{ padding: "10px 6px", textAlign: "center" }}>
                                            {items.length > 1 && (
                                                <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e41f07", fontSize: 15, padding: 2 }}>
                                                    <i className="ti ti-trash" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {/* Add row footer */}
                        <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "10px 16px", borderTop: "1px solid #f1f5f9", background: "#fafafa" }}>
                            <button onClick={addItem} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#2563eb", fontWeight: 500 }}>
                                <i className="ti ti-circle-plus" style={{ fontSize: 15 }} /> Add New Row
                            </button>
                            <button style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#2563eb", fontWeight: 500 }}>
                                <i className="ti ti-circle-plus" style={{ fontSize: 15 }} /> Add Items in Bulk
                            </button>
                        </div>
                    </div>

                    {/* ── Attachments ── */}
                    <div style={{ padding: "20px 32px 24px", borderTop: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: 13, color: "#374151", fontWeight: 600, marginBottom: 10 }}>Attach File(s) to Transfer Order</div>
                        <input ref={fileRef} type="file" multiple accept="*/*" style={{ display: "none" }}
                            onChange={e => { if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files)].slice(0, 5)); }} />
                        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                            <button onClick={() => fileRef.current?.click()}
                                style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", border: "1px solid #d1d5db", borderRight: "none", borderRadius: "4px 0 0 4px", background: "#fff", cursor: "pointer", fontSize: 13, color: "#374151", fontWeight: 500 }}>
                                <i className="ti ti-upload" style={{ fontSize: 14 }} /> Upload File
                            </button>
                            <button style={{ padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: "0 4px 4px 0", background: "#fff", cursor: "pointer", fontSize: 13, color: "#374151" }}>
                                <i className="ti ti-chevron-down" style={{ fontSize: 13 }} />
                            </button>
                        </div>
                        {files.length > 0 && (
                            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {files.map((f, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "#f3f4f6", borderRadius: 4, fontSize: 12, color: "#374151", border: "1px solid #e5e7eb" }}>
                                        <i className="ti ti-file" style={{ fontSize: 13 }} />
                                        {f.name}
                                        <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 12, padding: 0, marginLeft: 2 }}>
                                            <i className="ti ti-x" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>You can upload a maximum of 5 files, 10MB each</div>
                    </div>

                    {/* ── Form Actions ── */}
                    <div style={{ padding: "20px 32px 32px", display: "flex", alignItems: "center", gap: 10, background: "#fff" }}>
                        <button onClick={() => save("Draft")} disabled={saving}
                            style={{ padding: "8px 20px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                            Save as Draft
                        </button>
                        <div style={{ display: "flex", alignItems: "center" }}>
                            <button onClick={() => save("Transferred")} disabled={saving}
                                style={{ padding: "8px 18px", borderRadius: "4px 0 0 4px", border: "none", background: "#e41f07", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                                {saving ? "Saving..." : "Initiate Transfer"}
                            </button>
                            <button style={{ padding: "8px 10px", borderRadius: "0 4px 4px 0", border: "none", borderLeft: "1px solid rgba(255,255,255,0.2)", background: "#e41f07", color: "#fff", fontSize: 13, cursor: "pointer" }}>
                                <i className="ti ti-chevron-down" style={{ fontSize: 13 }} />
                            </button>
                        </div>
                        <button onClick={() => navigate(route.transferOrderList)}
                            style={{ padding: "8px 18px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                            Cancel
                        </button>
                    </div>

                </div>
            </div>
        </div>
        </>
    );
};

export default AddTransferOrder;
