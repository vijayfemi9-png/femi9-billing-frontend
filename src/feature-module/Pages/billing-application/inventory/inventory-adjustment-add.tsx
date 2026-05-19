// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { all_routes } from "../../../../routes/all_routes";
import "../payment/payment.scss";
import "./inventory.scss";

const SK = "billing_inventory_adjustments";
const PRODUCT_KEY = "product_list_data";
const LOCATIONS = ["Head Office", "Main Warehouse", "Branch A", "Branch B"];
const REASONS = ["Stolen goods", "Damaged", "Expired", "Stock count correction", "Returned goods", "Write-off", "Other"];
const TYPES = ["Quantity", "Value"];
const ACCOUNTS = ["Inventory Asset", "Cost of Goods Sold", "Other Expense", "Shrinkage & Loss", "Inventory Write-off"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayDisplay() {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function nowDatetime() {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const h = d.getHours() % 12 || 12;
    const ampm = d.getHours() >= 12 ? "PM" : "AM";
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(h)}:${pad(d.getMinutes())} ${ampm}`;
}

function loadProducts() {
    try {
        const raw = localStorage.getItem(PRODUCT_KEY);
        if (raw) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) return arr.filter(p => !p.isDeleted);
        }
    } catch { /**/ }
    return [];
}

interface AdjItem {
    id: number;
    productId: string | number;
    productName: string;
    sku: string;
    qtyAvailable: string;
    qtyAdjusted: string;
    newQty: string;
    valueAdjusted: string;
    newValue: string;
    currentValue: string;
    reason: string;
}

// ── SearchableDropdown ────────────────────────────────────────────────────────
const SD: React.FC<{
    value: string; placeholder: string; options: string[];
    onChange: (v: string) => void; error?: boolean;
}> = ({ value, placeholder, options, onChange, error }) => {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const filtered = options.filter(o => o.toLowerCase().includes(q.toLowerCase()));

    return (
        <div ref={ref} style={{ position: "relative", width: "100%" }}>
            <div
                onClick={() => setOpen(o => !o)}
                style={{
                    height: 36, border: `1px solid ${error ? "#e41f07" : open ? "#e41f07" : "#d1d5db"}`,
                    borderRadius: 4, background: "#fff", display: "flex", alignItems: "center",
                    justifyContent: "space-between", padding: "0 10px", cursor: "pointer",
                    fontSize: 13, color: value ? "#111827" : "#9ca3af",
                    boxShadow: open ? "0 0 0 3px rgba(228,31,7,0.1)" : "none",
                }}
            >
                <span>{value || placeholder}</span>
                <i className={`ti ${open ? "ti-chevron-up" : "ti-chevron-down"}`} style={{ fontSize: 12, color: "#6b7280" }} />
            </div>
            {open && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 1050, maxHeight: 260, display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6" }}>
                        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search"
                            style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 4, padding: "5px 9px", fontSize: 12, outline: "none", color: "#374151" }} />
                    </div>
                    <div style={{ overflowY: "auto", flex: 1 }}>
                        {filtered.map((o, idx) => (
                            <div key={idx}
                                onClick={() => { onChange(o); setOpen(false); setQ(""); }}
                                style={{ padding: "9px 12px", fontSize: 13, cursor: "pointer", background: value === o ? "#e41f07" : "transparent", color: value === o ? "#fff" : "#111827", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                                onMouseEnter={e => { if (value !== o) (e.currentTarget as HTMLDivElement).style.background = "#f3f4f6"; }}
                                onMouseLeave={e => { if (value !== o) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                            >
                                {o} {value === o && <i className="ti ti-check" style={{ fontSize: 12 }} />}
                            </div>
                        ))}
                        {!filtered.length && <div style={{ padding: "12px", fontSize: 13, color: "#9ca3af", textAlign: "center" }}>No options</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
const InventoryAdjustmentAdd: React.FC = () => {
    const navigate = useNavigate();
    const route = all_routes;
    const [searchParams] = useSearchParams();
    const editId = searchParams.get("edit");

    const [products, setProducts] = useState<any[]>([]);
    const [adjDate, setAdjDate] = useState(todayDisplay());
    const [reason, setReason] = useState("");
    const [refNum, setRefNum] = useState("");
    const [adjType, setAdjType] = useState("Quantity");
    const [location, setLocation] = useState("");
    const [account, setAccount] = useState("");
    const [desc, setDesc] = useState("");
    const [items, setItems] = useState<AdjItem[]>([emptyItem()]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [openRow, setOpenRow] = useState<number | null>(null);
    const [rowSearch, setRowSearch] = useState("");

    function emptyItem(): AdjItem {
        return { id: Date.now(), productId: "", productName: "", sku: "", qtyAvailable: "0", qtyAdjusted: "0", newQty: "0", valueAdjusted: "0", currentValue: "0", newValue: "0", reason: "" };
    }

    useEffect(() => { setProducts(loadProducts()); }, []);

    // Load for edit
    useEffect(() => {
        if (!editId) return;
        try {
            const all = JSON.parse(localStorage.getItem(SK) || "[]");
            const o = all.find((x: any) => String(x.id) === editId);
            if (!o) return;
            setAdjDate(o.date || todayDisplay());
            setReason(o.reason || "");
            setRefNum(o.referenceNumber || "");
            setAdjType(o.type || "Quantity");
            setLocation(o.location || "");
            setAccount(o.account || "");
            setDesc(o.description || "");
            if (Array.isArray(o.items) && o.items.length) setItems(o.items);
        } catch { /**/ }
    }, [editId]);

    const updateItem = (id: number, field: keyof AdjItem, val: string) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: val };
            if (field === "qtyAdjusted" || field === "qtyAvailable") {
                const avail = parseFloat(updated.qtyAvailable) || 0;
                const adj = parseFloat(updated.qtyAdjusted) || 0;
                updated.newQty = String(avail + adj);
            }
            if (field === "valueAdjusted" || field === "currentValue") {
                const cur = parseFloat(updated.currentValue) || 0;
                const adj = parseFloat(updated.valueAdjusted) || 0;
                updated.newValue = String(cur + adj);
            }
            return updated;
        }));
    };

    const selectProduct = (rowId: number, product: any) => {
        const stock = product.stockOnHand ?? product.stock ?? 0;
        const price = product.costPrice ?? product.selling_price ?? 0;
        setItems(prev => prev.map(item => {
            if (item.id !== rowId) return item;
            const adj = parseFloat(item.qtyAdjusted) || 0;
            const vadj = parseFloat(item.valueAdjusted) || 0;
            return {
                ...item,
                productId: product.id,
                productName: product.name,
                sku: product.sku || "",
                qtyAvailable: String(stock),
                newQty: String(stock + adj),
                currentValue: String(stock * price),
                newValue: String(stock * price + vadj),
            };
        }));
        setOpenRow(null);
        setRowSearch("");
    };

    const addItem = () => setItems(p => [...p, emptyItem()]);
    const removeItem = (id: number) => setItems(p => p.length > 1 ? p.filter(i => i.id !== id) : p);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!reason) e.reason = "Required";
        if (!location) e.location = "Required";
        if (adjType === "Value" && !account) e.account = "Required";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const save = (saveStatus: "Adjusted" | "Draft") => {
        if (!validate()) return;
        setSaving(true);
        let idToNav = editId;
        try {
            const existing = JSON.parse(localStorage.getItem(SK) || "[]");
            const now = nowDatetime();
            const record = {
                date: adjDate, reason, description: desc, status: saveStatus,
                referenceNumber: refNum, type: adjType, account, location, items,
                createdBy: "vickyyfemi9", createdTime: now,
                lastModifiedBy: "vickyyfemi9", lastModifiedTime: now,
            };
            let saved: any[];
            if (editId) {
                saved = existing.map((o: any) =>
                    String(o.id) === editId
                        ? { ...o, ...record, createdBy: o.createdBy, createdTime: o.createdTime }
                        : o
                );
            } else {
                const id = existing.length ? Math.max(...existing.map((o: any) => o.id)) + 1 : 1;
                idToNav = String(id);
                saved = [...existing, { id, ...record }];
            }
            localStorage.setItem(SK, JSON.stringify(saved));
        } catch (err) { console.error(err); }
        setSaving(false);
        if (idToNav && route.inventoryAdjustmentView) {
            navigate(route.inventoryAdjustmentView.replace(":id", idToNav));
        } else {
            navigate(route.inventoryAdjustmentList);
        }
    };

    const labelSt: React.CSSProperties = { minWidth: 180, fontSize: 13, fontWeight: 500, color: "#374151", flexShrink: 0 };
    const inpSt = (err?: string): React.CSSProperties => ({
        width: "100%", height: 36, padding: "0 10px", fontSize: 13,
        border: `1px solid ${err ? "#e41f07" : "#d1d5db"}`,
        borderRadius: 4, outline: "none", color: "#111827", background: "#fff",
    });

    const isValue = adjType === "Value";

    return (
        <div className="page-wrapper" style={{ background: "#f8fafc", minHeight: "100vh" }}>
            <div className="content container-fluid" style={{ padding: "24px 32px" }}>

                {/* ── Page Header ── */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                    <div>
                        <h4 style={{ fontWeight: 700, fontSize: 20, marginBottom: 4, color: "#111827" }}>
                            {editId ? "Edit Adjustment" : "New Adjustment"}
                        </h4>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "#6b7280" }}>
                            <span
                                onClick={() => navigate(route.inventoryAdjustmentList)}
                                style={{ cursor: "pointer", color: "#919295ff" }}
                            >
                                Inventory Adjustments
                            </span>
                            <span>›</span>
                            <span style={{ color: "#111827", fontWeight: 500 }}>{editId ? "Edit" : "New"}</span>
                        </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <button onClick={() => navigate(route.inventoryAdjustmentList)}
                            style={{ width: 38, height: 38, borderRadius: 4, background: "#fff", border: "1px solid #e5e9ef", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                            <i className="ti ti-x" style={{ fontSize: 16, color: "#374151" }} />
                        </button>
                    </div>
                </div>

                {/* ── Form Card ── */}
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 4, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>

                    {/* ── Fields Section ── */}
                    <div style={{ padding: "28px 32px", borderBottom: "1px solid #f1f5f9" }}>

                        {/* Date */}
                        <div className="d-flex flex-column flex-md-row align-items-md-center mb-4">
                            <label style={labelSt}>Date <span style={{ color: "#e41f07" }}>*</span></label>
                            <div style={{ flex: 1, maxWidth: 320 }}>
                                <input type="text" value={adjDate} onChange={e => setAdjDate(e.target.value)}
                                    placeholder="DD/MM/YYYY" style={inpSt()}
                                    onFocus={e => (e.target.style.borderColor = "#e41f07")}
                                    onBlur={e => (e.target.style.borderColor = "#d1d5db")} />
                            </div>
                        </div>

                        {/* Reason */}
                        <div className="d-flex flex-column flex-md-row align-items-md-center mb-4">
                            <label style={{ ...labelSt, color: errors.reason ? "#e41f07" : "#374151" }}>
                                Reason <span style={{ color: "#e41f07" }}>*</span>
                            </label>
                            <div style={{ flex: 1, maxWidth: 320 }}>
                                <SD value={reason} placeholder="Select reason..." options={REASONS}
                                    onChange={v => { setReason(v); setErrors(p => ({ ...p, reason: "" })); }}
                                    error={!!errors.reason} />
                                {errors.reason && <div style={{ fontSize: 11, color: "#e41f07", marginTop: 3 }}>{errors.reason}</div>}
                            </div>
                        </div>

                        {/* Reference Number */}
                        <div className="d-flex flex-column flex-md-row align-items-md-center mb-4">
                            <label style={labelSt}>Reference Number</label>
                            <div style={{ flex: 1, maxWidth: 320 }}>
                                <input type="text" value={refNum} onChange={e => setRefNum(e.target.value)}
                                    placeholder="Enter reference number" style={inpSt()}
                                    onFocus={e => (e.target.style.borderColor = "#e41f07")}
                                    onBlur={e => (e.target.style.borderColor = "#d1d5db")} />
                            </div>
                        </div>

                        {/* Type */}
                        <div className="d-flex flex-column flex-md-row align-items-md-center mb-4">
                            <label style={labelSt}>Type <span style={{ color: "#e41f07" }}>*</span></label>
                            <div style={{ flex: 1, maxWidth: 320 }}>
                                <div style={{ display: "flex", gap: 8 }}>
                                    {TYPES.map(t => (
                                        <button key={t} onClick={() => setAdjType(t)}
                                            style={{
                                                padding: "6px 20px", borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: "pointer",
                                                border: adjType === t ? "1px solid #e41f07" : "1px solid #d1d5db",
                                                background: adjType === t ? "#fff1f0" : "#fff",
                                                color: adjType === t ? "#e41f07" : "#374151",
                                            }}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Account (only for Value type) */}
                        {isValue && (
                            <div className="d-flex flex-column flex-md-row align-items-md-center mb-4">
                                <label style={{ ...labelSt, color: errors.account ? "#e41f07" : "#374151" }}>
                                    Account <span style={{ color: "#e41f07" }}>*</span>
                                </label>
                                <div style={{ flex: 1, maxWidth: 320 }}>
                                    <SD value={account} placeholder="Select account..." options={ACCOUNTS}
                                        onChange={v => { setAccount(v); setErrors(p => ({ ...p, account: "" })); }}
                                        error={!!errors.account} />
                                    {errors.account && <div style={{ fontSize: 11, color: "#e41f07", marginTop: 3 }}>{errors.account}</div>}
                                </div>
                            </div>
                        )}

                        {/* Location / Warehouse */}
                        <div className="d-flex flex-column flex-md-row align-items-md-center mb-4">
                            <label style={{ ...labelSt, color: errors.location ? "#e41f07" : "#374151" }}>
                                Warehouse <span style={{ color: "#e41f07" }}>*</span>
                            </label>
                            <div style={{ flex: 1, maxWidth: 320 }}>
                                <SD value={location} placeholder="Select warehouse..." options={LOCATIONS}
                                    onChange={v => { setLocation(v); setErrors(p => ({ ...p, location: "" })); }}
                                    error={!!errors.location} />
                                {errors.location && <div style={{ fontSize: 11, color: "#e41f07", marginTop: 3 }}>{errors.location}</div>}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="d-flex flex-column flex-md-row mb-4">
                            <label className="mt-1" style={labelSt}>Description</label>
                            <div style={{ flex: 1, maxWidth: 480 }}>
                                <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
                                    placeholder="Enter description..."
                                    style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4, outline: "none", resize: "vertical", color: "#374151", lineHeight: 1.6 }}
                                    onFocus={e => (e.target.style.borderColor = "#e41f07")}
                                    onBlur={e => (e.target.style.borderColor = "#d1d5db")} />
                            </div>
                        </div>
                    </div>

                    {/* ── Items Table ── */}
                    <div>
                        <div style={{ padding: "14px 32px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Items</span>
                            <span style={{ fontSize: 12, color: "#6b7280" }}>({items.length} item{items.length !== 1 ? "s" : ""})</span>
                        </div>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: isValue ? 900 : 820 }}>
                                <thead>
                                    <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                                        <th style={{ width: 36, padding: "10px 6px 10px 14px" }} />
                                        <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.4px" }}>Item Details</th>
                                        <th style={{ width: 100, padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#374151", textTransform: "uppercase" }}>SKU</th>
                                        <th style={{ width: 130, padding: "10px 12px", textAlign: "right", fontSize: 12, fontWeight: 600, color: "#374151", textTransform: "uppercase" }}>Qty Available</th>
                                        {isValue ? (
                                            <>
                                                <th style={{ width: 120, padding: "10px 12px", textAlign: "right", fontSize: 12, fontWeight: 600, color: "#374151", textTransform: "uppercase" }}>Current Value</th>
                                                <th style={{ width: 130, padding: "10px 12px", textAlign: "right", fontSize: 12, fontWeight: 600, color: "#374151", textTransform: "uppercase" }}>Value Adjusted (+/-)</th>
                                                <th style={{ width: 120, padding: "10px 12px", textAlign: "right", fontSize: 12, fontWeight: 600, color: "#374151", textTransform: "uppercase" }}>New Value</th>
                                            </>
                                        ) : (
                                            <>
                                                <th style={{ width: 130, padding: "10px 12px", textAlign: "right", fontSize: 12, fontWeight: 600, color: "#374151", textTransform: "uppercase" }}>Qty Adjusted (+/-)</th>
                                                <th style={{ width: 110, padding: "10px 12px", textAlign: "right", fontSize: 12, fontWeight: 600, color: "#374151", textTransform: "uppercase" }}>New Qty</th>
                                            </>
                                        )}
                                        <th style={{ width: 44, padding: "10px 14px 10px 6px" }} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map(item => (
                                        <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}
                                            onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#fffcfb"}
                                            onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "#fff"}>
                                            <td style={{ padding: "10px 6px 10px 14px", textAlign: "center", color: "#d1d5db" }}>
                                                <i className="ti ti-grip-vertical" style={{ fontSize: 14 }} />
                                            </td>

                                            {/* Product autocomplete */}
                                            <td style={{ padding: "6px 12px", position: "relative" }}>
                                                <div style={{ position: "relative" }}>
                                                    <input
                                                        value={item.productName}
                                                        onChange={e => {
                                                            updateItem(item.id, "productName", e.target.value);
                                                            setOpenRow(item.id);
                                                            setRowSearch(e.target.value);
                                                        }}
                                                        onFocus={() => { setOpenRow(item.id); setRowSearch(item.productName); }}
                                                        onBlur={() => setTimeout(() => { setOpenRow(null); setRowSearch(""); }, 200)}
                                                        placeholder="Type or select item..."
                                                        style={{ width: "100%", border: openRow === item.id ? "1px solid #e41f07" : "1px solid transparent", borderRadius: 4, padding: "6px 8px", outline: "none", fontSize: 14, fontWeight: 500, color: "#374151", background: "transparent", boxShadow: openRow === item.id ? "0 0 0 3px rgba(228,31,7,0.08)" : "none" }}
                                                    />
                                                    {openRow === item.id && (
                                                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #d1d5db", borderRadius: 6, marginTop: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 200, maxHeight: 220, overflowY: "auto" }}>
                                                            {products.length === 0 && (
                                                                <div style={{ padding: "14px", textAlign: "center", fontSize: 13, color: "#9ca3af" }}>No products found. Add products first.</div>
                                                            )}
                                                            {products
                                                                .filter(p => !rowSearch || p.name?.toLowerCase().includes(rowSearch.toLowerCase()) || p.sku?.toLowerCase().includes(rowSearch.toLowerCase()))
                                                                .map(p => (
                                                                    <div key={p.id}
                                                                        onMouseDown={() => selectProduct(item.id, p)}
                                                                        style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f3f4f6" }}
                                                                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "#fff1f0"; }}
                                                                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "#fff"; }}
                                                                    >
                                                                        <div>
                                                                            <div style={{ fontWeight: 500, color: "#111827" }}>{p.name}</div>
                                                                            {p.sku && <div style={{ fontSize: 11, color: "#9ca3af" }}>SKU: {p.sku}</div>}
                                                                        </div>
                                                                        <div style={{ fontSize: 12, color: "#6b7280", textAlign: "right" }}>
                                                                            <div>Stock: <strong>{p.stockOnHand ?? p.stock ?? 0}</strong></div>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* SKU */}
                                            <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 400, color: "#6b7280" }}>{item.sku || "—"}</td>

                                            {/* Qty Available */}
                                            <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 14, fontWeight: 400, color: "#374151" }}>
                                                {item.qtyAvailable}
                                            </td>

                                            {isValue ? (
                                                <>
                                                    {/* Current Value */}
                                                    <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, color: "#374151" }}>
                                                        {parseFloat(item.currentValue || "0").toFixed(2)}
                                                    </td>
                                                    {/* Value Adjusted */}
                                                    <td style={{ padding: "8px 12px", textAlign: "right" }}>
                                                        <input type="number" value={item.valueAdjusted}
                                                            onChange={e => updateItem(item.id, "valueAdjusted", e.target.value)}
                                                            style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 4, padding: "5px 8px", outline: "none", fontSize: 13, color: parseFloat(item.valueAdjusted) < 0 ? "#dc2626" : "#16a34a", background: "#fff", textAlign: "right", fontWeight: 500 }}
                                                            onFocus={e => (e.target.style.borderColor = "#e41f07")}
                                                            onBlur={e => (e.target.style.borderColor = "#e5e7eb")} />
                                                    </td>
                                                    {/* New Value */}
                                                    <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, fontWeight: 500, color: "#111827" }}>
                                                        {parseFloat(item.newValue || "0").toFixed(2)}
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    {/* Qty Adjusted */}
                                                    <td style={{ padding: "8px 12px", textAlign: "right" }}>
                                                        <input type="number" value={item.qtyAdjusted}
                                                            onChange={e => updateItem(item.id, "qtyAdjusted", e.target.value)}
                                                            style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 4, padding: "5px 8px", outline: "none", fontSize: 13, color: parseFloat(item.qtyAdjusted) < 0 ? "#dc2626" : "#16a34a", background: "#fff", textAlign: "right", fontWeight: 500 }}
                                                            onFocus={e => (e.target.style.borderColor = "#e41f07")}
                                                            onBlur={e => (e.target.style.borderColor = "#e5e7eb")} />
                                                    </td>
                                                    {/* New Qty */}
                                                    <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, fontWeight: 500, color: "#111827" }}>
                                                        {item.newQty}
                                                    </td>
                                                </>
                                            )}

                                            {/* Remove */}
                                            <td style={{ padding: "10px 14px 10px 6px", textAlign: "center" }}>
                                                <button onClick={() => removeItem(item.id)}
                                                    style={{ background: "none", border: "none", cursor: items.length > 1 ? "pointer" : "default", color: "#dc2626", fontSize: 15, padding: 2, opacity: items.length > 1 ? 1 : 0.25 }}>
                                                    <i className="ti ti-trash" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Add Item row */}
                        <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "12px 32px", borderTop: "1px solid #f1f5f9", background: "#fcfdfe" }}>
                            <button onClick={addItem}
                                style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#e41f07", fontWeight: 500 }}>
                                <i className="ti ti-circle-plus" style={{ fontSize: 15 }} /> Add Item
                            </button>
                        </div>
                    </div>

                    {/* ── Bottom Actions ── */}
                    <div style={{ padding: "20px 32px", display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid #e5e7eb" }}>
                        <button onClick={() => save("Draft")} disabled={saving}
                            className="btn premium-outline-btn"
                            style={{ height: 38, padding: "0 20px", borderRadius: 4, fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                            Save as Draft
                        </button>
                        <button onClick={() => save("Adjusted")} disabled={saving}
                            className="btn premium-primary-btn"
                            style={{ height: 38, padding: "0 24px", borderRadius: 4, fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                            {saving ? "Saving..." : "Save"}
                        </button>
                        <button onClick={() => navigate(route.inventoryAdjustmentList)}
                            className="btn premium-outline-btn"
                            style={{ height: 38, padding: "0 18px", borderRadius: 4, fontSize: 13, fontWeight: 500 }}>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventoryAdjustmentAdd;
