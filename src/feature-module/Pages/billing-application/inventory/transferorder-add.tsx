// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { all_routes } from "../../../../routes/all_routes";
import "../payment/payment.scss";
import "./transfer.scss";

const SK = "billing_transfer_orders";
const LOCATIONS = ["Head Office", "Main Warehouse", "Branch A", "Branch B"];

// ── SearchableDropdown ────────────────────────────────────────────────────────
interface SDOption { label: string; group?: string; value: string; }
const SearchableDropdown: React.FC<{
    value: string; placeholder: string; options?: (string | { value: string; label: string })[];
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
        ? groups.flatMap(g => g.options.map(o => ({ label: o, group: g.group, value: o })))
        : (options || []).map(o => typeof o === "string" ? { label: o, value: o } : { label: o.label, value: o.value });

    const filtered = allOptions.filter(o => o.label.toLowerCase().includes(q.toLowerCase()));

    const renderOptions = () => {
        if (groups) {
            return groups.map(g => {
                const opts = g.options.filter(o => o.toLowerCase().includes(q.toLowerCase()));
                if (!opts.length) return null;
                return (
                    <div key={g.group}>
                        <div style={{ padding: "6px 12px 4px", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>{g.group}</div>
                        {opts.map((o, idx) => (
                            <div key={`${o}-${idx}`} onClick={() => { onChange(o); setOpen(false); setQ(""); }}
                                style={{ padding: "9px 14px 9px 20px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", background: value === o ? "#e41f07" : "transparent", color: value === o ? "#fff" : "#111827" }}
                                onMouseEnter={e => { if (value !== o) (e.currentTarget as HTMLDivElement).style.background = "#f3f4f6"; }}
                                onMouseLeave={e => { if (value !== o) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}>
                                {o} {value === o && <i className="ti ti-check" style={{ fontSize: 13 }} />}
                            </div>
                        ))}
                    </div>
                );
            });
        }
        return filtered.map((o, idx) => (
            <div key={`${o.value}-${idx}`} onClick={() => { onChange(o.value); setOpen(false); setQ(""); }}
                style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", background: value === o.value ? "#e41f07" : "transparent", color: value === o.value ? "#fff" : "#111827" }}
                onMouseEnter={e => { if (value !== o.value) (e.currentTarget as HTMLDivElement).style.background = "#f3f4f6"; }}
                onMouseLeave={e => { if (value !== o.value) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}>
                {o.label} {value === o.value && <i className="ti ti-check" style={{ fontSize: 13 }} />}
            </div>
        ));
    };

    return (
        <div ref={ref} style={{ position: "relative", width: "100%" }}>
            <div onClick={() => setOpen(o => !o)}
                style={{ height: 38, border: `1px solid ${error || open ? "#e41f07" : "#d1d5db"}`, borderRadius: 6, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", cursor: "pointer", fontSize: 13, color: value ? "#111827" : "#9ca3af", boxShadow: open ? "0 0 0 3px rgba(228,31,7,.08)" : "none", userSelect: "none" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {value ? (allOptions.find(o => o.value === value)?.label || value) : placeholder}
                </span>
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

function todayDisplay() {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function nextTONum(): string {
    try {
        const a = JSON.parse(localStorage.getItem(SK) || "[]");
        const n = (a.length || 0) + 1;
        return "TO-" + String(n).padStart(5, "0");
    } catch { return "TO-00001"; }
}
function nowStr() {
    return new Date().toLocaleString("en-IN", { hour12: true, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const INVENTORY_ITEMS = [
    { id: "ITM-001", name: "femi9", stock: 1000, unit: "box" },
    { id: "ITM-002", name: "femi9 Premium", stock: 500, unit: "box" },
    { id: "ITM-003", name: "femi9 Standard", stock: 250, unit: "box" },
];

interface LineItem { id: number; product: string; sourceStock: string; destStock: string; qty: string; }

const AddTransferOrder: React.FC = () => {
    const navigate = useNavigate();
    const route = all_routes;
    const [searchParams] = useSearchParams();
    const editId = searchParams.get("edit");
    const fileRef = useRef<HTMLInputElement>(null);

    const [toNum, setToNum] = useState(nextTONum());
    const [toDate, setToDate] = useState(todayDisplay());
    const [reason, setReason] = useState("");
    const [sourceLoc, setSourceLoc] = useState("");
    const [destLoc, setDestLoc] = useState("");
    const [items, setItems] = useState<LineItem[]>([{ id: 1, product: "", sourceStock: "-", destStock: "-", qty: "0.00" }]);
    const [files, setFiles] = useState<File[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const [focusedRow, setFocusedRow] = useState<number | null>(null);
    const [dropdownAnchor, setDropdownAnchor] = useState<{ top: number; left: number; width: number } | null>(null);
    const [showBulkAdd, setShowBulkAdd] = useState(false);
    const [bulkSearch, setBulkSearch] = useState("");
    const [bulkSelected, setBulkSelected] = useState<string[]>([]);
    const [bulkQtys, setBulkQtys] = useState<Record<string, string>>({});

    // Preferences Modal State
    const [showPrefModal, setShowPrefModal] = useState(false);
    const [prefMode, setPrefMode] = useState<"auto" | "manual">("auto");
    const [prefPrefix, setPrefPrefix] = useState("TO-");
    const [prefNextNum, setPrefNextNum] = useState("00002");
    
    // Approval Modal State
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [pendingSaveStatus, setPendingSaveStatus] = useState("");

    // Load existing record for edit
    useEffect(() => {
        if (!editId) return;
        try {
            const all = JSON.parse(localStorage.getItem(SK) || "[]");
            const o = all.find((x: any) => String(x.id) === editId);
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
        const e: Record<string, string> = {};
        if (!sourceLoc) e.sourceLoc = "Required";
        if (!destLoc) e.destLoc = "Required";
        if (sourceLoc && destLoc && sourceLoc === destLoc) e.destLoc = "Must differ from source";
        
        if (Object.keys(e).length > 0) {
            setErrors(e);
            window.scrollTo({ top: 0, behavior: "smooth" });
            return false;
        }

        const validItems = items.filter(i => i.product && i.product.trim() !== "");
        if (validItems.length === 0) {
            alert("Please select at least one item to proceed.");
            return false;
        }
        
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleInitiateTransfer = (status: string) => {
        if (!validate()) return;
        setPendingSaveStatus(status);
        setShowApproveModal(true);
    };

    const save = (saveStatus: string) => {
        if (!validate()) return;
        setSaving(true);
        let idToNav = editId;
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
                idToNav = String(id);
                saved = [...existing, { id, ...record }];
            }
            localStorage.setItem(SK, JSON.stringify(saved));
        } catch (err) { console.error(err); }
        setSaving(false);
        if (idToNav && route.transferOrderView) {
            navigate(route.transferOrderView.replace(":id", idToNav));
        } else {
            navigate(route.transferOrderList);
        }
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
                    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 0, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", position: "relative" }}>

                        {/* ── Top Form Fields ── */}
                        <div style={{ padding: "20px 32px 8px", borderBottom: "1px solid #e5e7eb" }}>
                            {/* Transfer Order # */}
                            <div className="d-flex flex-column flex-md-row align-items-md-center mb-3">
                                <label className="mb-1 mb-md-0" style={{ minWidth: 200, fontSize: 13, fontWeight: 500, color: "#e41f07", flexShrink: 0 }}>Transfer Order#*</label>
                                <div style={{ flex: 1, maxWidth: 320 }}>
                                    <div style={{ display: "flex", alignItems: "center", border: `1px solid ${errors.toNum ? "#c0392b" : "#d1d5db"}`, borderRadius: 4, height: 36, overflow: "hidden", boxShadow: "none", transition: "all 0.15s" }}>
                                        <input value={toNum} onChange={e => setToNum(e.target.value)}
                                            style={{ flex: 1, height: "100%", padding: "0 10px", fontSize: 13, color: "#111827", border: "none", outline: "none", background: "#fff" }}
                                            onFocus={e => {
                                                if (!errors.toNum && e.target.parentElement) {
                                                    e.target.parentElement.style.borderColor = "#e41f07";
                                                    e.target.parentElement.style.boxShadow = "0 0 0 1px rgba(228,31,7,0.15)";
                                                }
                                            }}
                                            onBlur={e => {
                                                if (!errors.toNum && e.target.parentElement) {
                                                    e.target.parentElement.style.borderColor = "#d1d5db";
                                                    e.target.parentElement.style.boxShadow = "none";
                                                }
                                            }} />
                                        <div onClick={() => setShowPrefModal(true)} style={{ width: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "#f9fafb", borderLeft: "1px solid #d1d5db" }}>
                                            <i className="ti ti-settings" style={{ color: "#6b7280", fontSize: 15 }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Date */}
                            <div className="d-flex flex-column flex-md-row align-items-md-center mb-3">
                                <label className="mb-1 mb-md-0" style={{ minWidth: 200, fontSize: 13, fontWeight: 500, color: "#374151", flexShrink: 0 }}>Date</label>
                                <div style={{ flex: 1, maxWidth: 320 }}>
                                    <input value={toDate} onChange={e => setToDate(e.target.value)} placeholder="DD/MM/YYYY"
                                        style={{ width: "100%", height: 36, padding: "0 10px", fontSize: 13, color: "#111827", border: "1px solid #d0d5dd", borderRadius: 4, background: "#fff", outline: "none", transition: "border-color 0.15s" }}
                                        onFocus={e => e.target.style.borderColor = "#e41f07"}
                                        onBlur={e => e.target.style.borderColor = "#d0d5dd"} />
                                </div>
                            </div>

                            {/* Reason */}
                            <div className="d-flex flex-column flex-md-row mb-3">
                                <label className="mb-1 mb-md-0 mt-2" style={{ minWidth: 200, fontSize: 13, fontWeight: 500, color: "#374151", flexShrink: 0 }}>Reason</label>
                                <div style={{ flex: 1, maxWidth: 320 }}>
                                    <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                                        style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #d0d5dd", borderRadius: 4, outline: "none", resize: "vertical", color: "#374151", lineHeight: 1.6 }}
                                        onFocus={e => (e.target.style.borderColor = "#e41f07")}
                                        onBlur={e => (e.target.style.borderColor = "#d0d5dd")} />
                                </div>
                            </div>
                        </div>

                        {/* ── Source → Destination ── */}
                        <div style={{ padding: "20px 32px 32px", borderBottom: "1px solid #f1f5f9" }}>
                            <div className="row g-3 align-items-start">
                                {/* Source box */}
                                <div className="col-12 col-md-5">
                                    <div style={{ fontSize: 13, fontWeight: 500, color: "#e41f07", marginBottom: 8, whiteSpace: "nowrap" }}>Source Location*</div>
                                    <SearchableDropdown
                                        value={sourceLoc}
                                        placeholder="Select source location..."
                                        options={LOCATIONS}
                                        onChange={v => { setSourceLoc(v); setErrors({}); }}
                                        error={!!errors.sourceLoc}
                                    />
                                    {errors.sourceLoc && <div style={{ fontSize: 11, color: "#c0392b", marginTop: 4 }}>{errors.sourceLoc}</div>}
                                    {sourceLoc && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6, fontWeight: 500 }}>Tamil Nadu</div>}
                                </div>

                                {/* Arrow — click to swap */}
                                <div className="col-12 col-md-2 d-flex justify-content-center" style={{ marginTop: "36px" }}>
                                    <button onClick={swapLocations} title="Swap locations" type="button"
                                        style={{ width: 32, height: 32, borderRadius: "50%", background: "#fff", border: "1px solid #d1d5db", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 5px rgba(0,0,0,0.05)", transition: "all 0.15s" }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#e41f07"; e.currentTarget.style.color = "#e41f07"; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.color = "#111827"; }}>
                                        <i className="ti ti-arrows-left-right fs-15 d-none d-md-block" />
                                        <i className="ti ti-arrows-up-down fs-15 d-block d-md-none" />
                                    </button>
                                </div>

                                {/* Destination box */}
                                <div className="col-12 col-md-5">
                                    <div style={{ fontSize: 13, fontWeight: 500, color: "#e41f07", marginBottom: 8, whiteSpace: "nowrap" }}>Destination Location*</div>
                                    <SearchableDropdown
                                        value={destLoc}
                                        placeholder="Select destination location..."
                                        options={LOCATIONS.filter(l => l !== sourceLoc)}
                                        onChange={v => { setDestLoc(v); setErrors({}); }}
                                        error={!!errors.destLoc}
                                    />
                                    {errors.destLoc && <div style={{ fontSize: 11, color: "#c0392b", marginTop: 4 }}>{errors.destLoc}</div>}
                                    {destLoc && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6, fontWeight: 500 }}>Tamil Nadu</div>}
                                </div>
                            </div>
                        </div>

                        {sourceLoc && (
                            <>
                                {/* ── Item Table ── */}
                                <div style={{ borderTop: "1px solid #e5e7eb", background: "#fff", marginTop: 24 }}>
                                    {/* Table toolbar */}
                                    <div style={{ padding: "12px 32px", background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Item Table</span>
                                    </div>
                                    <div style={{ width: "100%", overflowX: "auto" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800, tableLayout: "fixed" }}>
                                            <thead>
                                                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                                                    <th style={{ width: 46, padding: "9px 6px 9px 16px" }}></th>
                                                    <th style={{ width: 38, padding: "9px 6px" }}></th>
                                                    <th style={{ padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#374151", letterSpacing: "0.5px", textTransform: "uppercase" }}>Item Details</th>
                                                    <th style={{ width: 120, padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#374151", letterSpacing: "0.5px", textTransform: "uppercase" }}>Source Stock</th>
                                                    <th style={{ width: 140, padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#374151", letterSpacing: "0.5px", textTransform: "uppercase" }}>Dest. Stock</th>
                                                    <th style={{ width: 130, padding: "9px 12px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#374151", letterSpacing: "0.5px", textTransform: "uppercase" }}>Transfer Qty</th>
                                                    <th style={{ width: 46, padding: "9px 16px 9px 6px" }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map((item) => (
                                                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                        <td style={{ padding: "10px 6px 10px 16px", textAlign: "center", color: "#d1d5db" }}>
                                                            <i className="ti ti-grip-vertical" style={{ fontSize: 15 }} />
                                                        </td>
                                                        <td style={{ padding: "10px 6px" }}>
                                                            <div style={{ width: 30, height: 30, border: "1px solid #e5e7eb", borderRadius: 4, background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                                <i className="ti ti-photo" style={{ fontSize: 15, color: "#d1d5db" }} />
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: "6px 12px" }}>
                                                            <input value={item.product} onChange={e => updateItem(item.id, "product", e.target.value)}
                                                                onFocus={e => {
                                                                    setFocusedRow(item.id);
                                                                    const r = e.currentTarget.getBoundingClientRect();
                                                                    setDropdownAnchor({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 260) });
                                                                }}
                                                                onBlur={() => setTimeout(() => { setFocusedRow(null); setDropdownAnchor(null); }, 200)}
                                                                placeholder="Type or click to select an item."
                                                                style={{ width: "100%", border: focusedRow === item.id ? "1px solid #e41f07" : "1px solid transparent", borderRadius: 4, padding: "6px 8px", outline: "none", fontSize: 13, color: "#374151", background: "transparent", transition: "border 0.2s" }} />
                                                            {focusedRow === item.id && dropdownAnchor && (
                                                                <div style={{ position: "fixed", top: dropdownAnchor.top, left: dropdownAnchor.left, width: dropdownAnchor.width, background: "#fff", border: "1px solid #d1d5db", borderRadius: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.14)", zIndex: 9999, maxHeight: 220, overflowY: "auto" }}>
                                                                    {INVENTORY_ITEMS.filter(it => it.name.toLowerCase().includes(item.product.toLowerCase())).map((it) => (
                                                                        <div key={it.id}
                                                                            onMouseDown={e => e.preventDefault()}
                                                                            onClick={() => { updateItem(item.id, "product", it.name); updateItem(item.id, "sourceStock", String(it.stock)); setFocusedRow(null); setDropdownAnchor(null); }}
                                                                            onMouseEnter={e => { e.currentTarget.style.background = "#e41f07"; e.currentTarget.style.color = "#fff"; }}
                                                                            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#374151"; }}
                                                                            style={{ padding: "8px 12px", display: "flex", justifyContent: "space-between", cursor: "pointer", background: "#fff", color: "#374151", borderBottom: "1px solid #f3f4f6", transition: "all 0.15s" }}>
                                                                            <div style={{ fontSize: 13, fontWeight: 500 }}>{it.name}</div>
                                                                            <div style={{ textAlign: "right" }}>
                                                                                <div style={{ fontSize: 11, opacity: 0.9 }}>Stock on Hand</div>
                                                                                <div style={{ fontSize: 12 }}>{it.stock.toFixed(2)} {it.unit}</div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: "10px 12px" }}>
                                                            <div style={{ fontSize: 13, color: "#374151" }}>{item.sourceStock || "-"}</div>
                                                        </td>
                                                        <td style={{ padding: "10px 12px" }}>
                                                            <div style={{ fontSize: 13, color: "#374151" }}>{item.destStock || "-"}</div>
                                                        </td>
                                                        <td style={{ padding: "10px 12px", textAlign: "right" }}>
                                                            <input type="number" value={item.qty} onChange={e => updateItem(item.id, "qty", e.target.value)}
                                                                min="0" step="0.01"
                                                                style={{ width: "100%", border: "none", outline: "none", fontSize: 13, color: "#111827", background: "transparent", textAlign: "right", fontWeight: 600 }} />
                                                        </td>
                                                        <td style={{ padding: "10px 16px 10px 6px", textAlign: "center" }}>
                                                            <button onClick={() => items.length > 1 && removeItem(item.id)}
                                                                style={{ background: "none", border: "none", cursor: items.length > 1 ? "pointer" : "default", color: "#e41f07", fontSize: 15, padding: 2, opacity: items.length > 1 ? 1 : 0.3 }}>
                                                                <i className="ti ti-trash" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* Add row footer */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "12px 32px", borderTop: "1px solid #e5e7eb", background: "#fcfdfe" }}>
                                        <button onClick={addItem} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#e41f07", fontWeight: 500 }}>
                                            <i className="ti ti-circle-plus" style={{ fontSize: 15 }} /> Add New Row
                                        </button>
                                        <button onClick={() => setShowBulkAdd(true)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#e41f07", fontWeight: 500 }}>
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
                                <div style={{ padding: "20px 32px 32px", display: "flex", alignItems: "center", gap: 10, background: "#fff", borderTop: "1px solid #e5e7eb" }}>
                                    <button onClick={() => save("Draft")} disabled={saving}
                                        style={{ padding: "8px 20px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                                        Save as Draft
                                    </button>
                                    <div className="btn-group dropup">
                                        <button onClick={() => handleInitiateTransfer("Transferred")} disabled={saving}
                                            style={{ padding: "8px 18px", borderRadius: "4px 0 0 4px", border: "none", background: "#e41f07", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                                            {saving ? "Saving..." : "Initiate Transfer"}
                                        </button>
                                        <button type="button" className="dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false"
                                            style={{ padding: "8px 10px", borderRadius: "0 4px 4px 0", border: "none", borderLeft: "1px solid rgba(255,255,255,0.2)", background: "#e41f07", color: "#fff", fontSize: 13, cursor: "pointer" }}>
                                            <span className="visually-hidden">Toggle Dropdown</span>
                                        </button>
                                        <ul className="dropdown-menu shadow-lg border-0 mb-1 p-1" style={{ borderRadius: 8, minWidth: 180 }}>
                                            <li>
                                                <button className="dropdown-item fs-13 py-2 rounded-2 mb-1" onMouseDown={(e) => { e.preventDefault(); save("In Transit"); }} style={{ color: "#4b5563" }}>
                                                    Submit for Approval
                                                </button>
                                            </li>
                                            <li>
                                                <button className="dropdown-item fs-13 py-2 rounded-2" onMouseDown={(e) => { e.preventDefault(); save("Transferred"); }} style={{ color: "#dc2626", background: "#fef2f2", fontWeight: 500 }}>
                                                    Mark as Transferred
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                    <button onClick={() => navigate(route.transferOrderList)}
                                        style={{ padding: "8px 18px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                                        Cancel
                                    </button>
                                </div>
                            </>
                        )}

                    </div>
                </div>
            </div>
            {/* ── Approve Transfer Modal ── */}
            {showApproveModal && (
                <div onClick={() => setShowApproveModal(false)} style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "15vh" }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 4, width: 500, maxWidth: "90%", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
                        <div style={{ padding: "24px 24px 16px 24px", display: "flex", gap: 16 }}>
                            <div style={{ width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 4.5L2.5 20H21.5L12 4.5Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1" strokeLinejoin="round"/>
                                    <path d="M12 10V15M12 17H12.01" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <div style={{ flex: 1, fontSize: 14, color: "#374151", lineHeight: 1.5, paddingTop: 4 }}>
                                The action (Initiate transfer) will automatically approve this Transfer Order.
                            </div>
                        </div>
                        <div style={{ padding: "16px 24px", display: "flex", gap: 12, borderTop: "1px solid #e5e7eb", background: "#fff", borderRadius: "0 0 4px 4px" }}>
                            <button onClick={() => { setShowApproveModal(false); save(pendingSaveStatus); }}
                                style={{ padding: "8px 24px", borderRadius: 4, border: "none", background: "#3b82f6", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                                OK
                            </button>
                            <button onClick={() => setShowApproveModal(false)}
                                style={{ padding: "8px 16px", borderRadius: 4, border: "1px solid #d1d5db", background: "#f9fafb", color: "#374151", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Bulk Add Modal ── */}
            {showBulkAdd && (
                <div onClick={() => setShowBulkAdd(false)} style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 8, width: 600, maxWidth: "100%", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", maxHeight: "85vh" }}>
                        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>Add Items in Bulk</span>
                            <i className="ti ti-x" style={{ fontSize: 20, color: "#9ca3af", cursor: "pointer" }} onClick={() => setShowBulkAdd(false)} />
                        </div>
                        <div style={{ padding: "16px 20px 12px", background: "#fff" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", background: "#fff" }}>
                                <i className="ti ti-search" style={{ fontSize: 13, color: "#9ca3af", flexShrink: 0 }} />
                                <input value={bulkSearch} onChange={e => setBulkSearch(e.target.value)} placeholder="Search items..."
                                    style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#111827", background: "transparent", padding: 0 }} />
                            </div>
                        </div>
                        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 4px" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", border: "1px solid #d1d5db", borderRadius: 6 }}>
                                <thead>
                                    <tr style={{ background: "#f3f4f6" }}>
                                        <th style={{ width: 44, padding: "10px 12px", textAlign: "center" }}></th>
                                        <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px" }}>Item Details</th>
                                        <th style={{ width: 140, padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px" }}>Stock on Hand</th>
                                        <th style={{ width: 120, padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px" }}>Quantity</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {INVENTORY_ITEMS.filter(it => it.name.toLowerCase().includes(bulkSearch.toLowerCase())).map((it, idx) => {
                                        const isChecked = bulkSelected.includes(it.id);
                                        const rowBg = isChecked ? "#fff5f5" : idx % 2 === 0 ? "#fff" : "#fafafa";
                                        return (
                                            <tr key={it.id} style={{ background: rowBg, transition: "background 0.15s", cursor: "pointer" }}
                                                onClick={() => {
                                                    const next = !isChecked;
                                                    setBulkSelected(p => next ? [...p, it.id] : p.filter(x => x !== it.id));
                                                    if (next && !bulkQtys[it.id]) setBulkQtys(p => ({ ...p, [it.id]: "1" }));
                                                }}
                                                onMouseEnter={e => { if (!isChecked) (e.currentTarget as HTMLTableRowElement).style.background = "#f9fafb"; }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = rowBg; }}>
                                                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                                                    <input type="checkbox" checked={isChecked}
                                                        onChange={e => {
                                                            e.stopPropagation();
                                                            setBulkSelected(p => e.target.checked ? [...p, it.id] : p.filter(x => x !== it.id));
                                                            if (e.target.checked && !bulkQtys[it.id]) setBulkQtys(p => ({ ...p, [it.id]: "1" }));
                                                        }}
                                                        style={{ width: 15, height: 15, accentColor: "#e41f07", cursor: "pointer" }} />
                                                </td>
                                                <td style={{ padding: "10px 14px" }}>
                                                    <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{it.name}</div>
                                                </td>
                                                <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 13, color: "#6b7280" }}>
                                                    {it.stock.toFixed(2)} {it.unit}
                                                </td>
                                                <td style={{ padding: "7px 10px", textAlign: "right" }} onClick={e => e.stopPropagation()}>
                                                    <input type="number" min="0" step="0.01"
                                                        value={bulkQtys[it.id] ?? ""}
                                                        placeholder="0"
                                                        onChange={e => {
                                                            setBulkQtys(p => ({ ...p, [it.id]: e.target.value }));
                                                            if (!isChecked) setBulkSelected(p => [...p, it.id]);
                                                        }}
                                                        style={{ width: "100%", padding: "4px 6px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4, outline: "none", textAlign: "right", color: "#374151", fontWeight: 400, background: "#fff" }}
                                                        onFocus={e => e.target.style.borderColor = "#e41f07"}
                                                        onBlur={e => e.target.style.borderColor = "#d1d5db"}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ padding: "14px 20px", marginTop: 4, borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 10, background: "#fff", borderRadius: "0 0 8px 8px" }}>
                            <button onClick={() => setShowBulkAdd(false)} style={{ padding: "8px 16px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Cancel</button>
                            <button onClick={() => {
                                const newItems = bulkSelected.map(id => {
                                    const it = INVENTORY_ITEMS.find(x => x.id === id)!;
                                    const qty = parseFloat(bulkQtys[id] || "1") || 1;
                                    return { id: Date.now() + Math.random(), product: it.name, sourceStock: String(it.stock), destStock: "-", qty: qty.toFixed(2) };
                                });
                                setItems(p => p.length === 1 && !p[0].product ? newItems : [...p, ...newItems]);
                                setBulkSelected([]);
                                setBulkQtys({});
                                setShowBulkAdd(false);
                            }} style={{ padding: "8px 20px", borderRadius: 4, border: "none", background: "#e41f07", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                                Add Selected ({bulkSelected.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Configure Preferences Modal ── */}
            {showPrefModal && (
                <div onClick={() => setShowPrefModal(false)} style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 8, width: 600, maxWidth: "100%", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
                        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 16, fontWeight: 500, color: "#111827" }}>Configure Transfer Order# Preferences</span>
                            <i className="ti ti-x" style={{ fontSize: 18, color: "#e41f07", cursor: "pointer" }} onClick={() => setShowPrefModal(false)} />
                        </div>
                        <div style={{ padding: "20px" }}>
                            <p style={{ fontSize: 13, color: "#4b5563", marginBottom: 20, lineHeight: 1.5 }}>
                                Your transfer orders numbers are set on auto-generate mode to save your time. Are you sure about changing this setting?
                            </p>

                            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", marginBottom: 16 }}>
                                <input type="radio" name="prefMode" checked={prefMode === "auto"} onChange={() => setPrefMode("auto")} style={{ marginTop: 3, accentColor: "#e41f07" }} />
                                <div>
                                    <div style={{ fontSize: 13, color: "#111827", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
                                        Continue auto-generating transfer orders numbers <i className="ti ti-info-circle" style={{ color: "#9ca3af", fontSize: 14 }} />
                                    </div>
                                    {prefMode === "auto" && (
                                        <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                                            <div>
                                                <div style={{ fontSize: 12, color: "#4b5563", marginBottom: 4 }}>Prefix</div>
                                                <input value={prefPrefix} onChange={e => setPrefPrefix(e.target.value)} style={{ width: 120, padding: "8px 10px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4, outline: "none", color: "#111827" }} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 12, color: "#4b5563", marginBottom: 4 }}>Next Number</div>
                                                <input value={prefNextNum} onChange={e => setPrefNextNum(e.target.value)} style={{ width: 240, padding: "8px 10px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4, outline: "none", color: "#111827" }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </label>

                            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                <input type="radio" name="prefMode" checked={prefMode === "manual"} onChange={() => setPrefMode("manual")} style={{ accentColor: "#e41f07" }} />
                                <span style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>Enter transfer orders numbers manually</span>
                            </label>
                        </div>
                        <div style={{ padding: "16px 20px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 10, background: "#fff", borderRadius: "0 0 8px 8px" }}>
                            <button onClick={() => setShowPrefModal(false)} style={{ padding: "8px 20px", borderRadius: 4, border: "none", background: "#e41f07", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Save</button>
                            <button onClick={() => setShowPrefModal(false)} style={{ padding: "8px 16px", borderRadius: 4, border: "1px solid #d1d5db", background: "#f9fafb", color: "#374151", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AddTransferOrder;
