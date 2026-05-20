// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { all_routes } from "../../../../routes/all_routes";
import "../invoice/payment/payment.scss";
import "./inventory.scss";
import { Bold } from "react-feather";

const SK = "billing_inventory_adjustments";
const PRODUCT_KEY = "product_list_data";
const LOCATIONS = ["Head Office", "Main Warehouse", "Branch A", "Branch B"];


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
    footerAction?: { label: string; onClick: () => void };
}> = ({ value, placeholder, options, onChange, error, footerAction }) => {
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
                    height: 36, border: `1px solid ${error ? "#dc2626" : open ? "#e41f07" : "#d1d5db"}`,
                    borderRadius: 4, background: "#fff", display: "flex", alignItems: "center",
                    justifyContent: "space-between", padding: "0 10px", cursor: "pointer",
                    fontSize: 14, color: value ? "#111827" : "#9ca3af",
                    boxShadow: open ? "0 0 0 3px rgba(228,31,7,0.08)" : "none",
                }}
            >
                <span>{value || placeholder}</span>
                <i className={`ti ${open ? "ti-chevron-up" : "ti-chevron-down"}`} style={{ fontSize: 12, color: "#6b7280" }} />
            </div>
            {open && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 1050, maxHeight: 260, display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6" }}>
                        <div style={{ position: "relative" }}>
                            <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#9ca3af" }} />
                            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search..."
                                style={{
                                    width: "100%", border: "1px solid #e5e7eb", borderRadius: 6,
                                    padding: "5px 9px 5px 28px", fontSize: 14, outline: "none", color: "#374151",
                                    transition: "border-color 0.15s, box-shadow 0.15s"
                                }}
                                onFocus={e => {
                                    e.target.style.borderColor = "#e41f07";
                                    e.target.style.boxShadow = "0 0 0 3px rgba(228,31,7,0.10)";
                                }}
                                onBlur={e => {
                                    e.target.style.borderColor = "#e5e7eb";
                                    e.target.style.boxShadow = "none";
                                }} />
                        </div>
                    </div>
                    <div style={{ overflowY: "auto", flex: 1 }}>
                        {filtered.map((o, idx) => (
                            <div key={idx}
                                onClick={() => { onChange(o); setOpen(false); setQ(""); }}
                                style={{ padding: "9px 12px", fontSize: 14, cursor: "pointer", background: value === o ? "#e41f07" : "transparent", color: value === o ? "#fff" : "#111827", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                                onMouseEnter={e => { if (value !== o) (e.currentTarget as HTMLDivElement).style.background = "#f3f4f6"; }}
                                onMouseLeave={e => { if (value !== o) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                            >
                                {o} {value === o && <i className="ti ti-check" style={{ fontSize: 12 }} />}
                            </div>
                        ))}
                        {!filtered.length && <div style={{ padding: "12px", fontSize: 14, color: "#9ca3af", textAlign: "center" }}>No options</div>}
                    </div>
                    {footerAction && (
                        <div style={{ borderTop: "1px solid #e5e7eb", padding: "8px 12px", background: "#f9fafb", display: "flex", justifyContent: "flex-start" }}>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); footerAction.onClick(); setOpen(false); }}
                                style={{ border: "none", background: "none", color: "#e41f07", fontSize: 14, fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: 0 }}>
                                <i className="ti ti-settings" style={{ fontSize: 14 }} /> {footerAction.label}
                            </button>
                        </div>
                    )}
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
    const [existingStatus, setExistingStatus] = useState<string | null>(null);
    const [openRow, setOpenRow] = useState<number | null>(null);
    const [rowSearch, setRowSearch] = useState("");
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
    const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
    const [bulkModal, setBulkModal] = useState(false);
    const [bulkSearch, setBulkSearch] = useState("");
    const [bulkSelected, setBulkSelected] = useState<Set<string | number>>(new Set());
    const [bulkQtys, setBulkQtys] = useState<Record<string | number, number>>({});

    // Dynamic reasons & accounts state
    const [reasons, setReasons] = useState<string[]>([]);
    const [accounts, setAccounts] = useState<string[]>([]);
    const [showManageReasons, setShowManageReasons] = useState(false);
    const [showManageAccounts, setShowManageAccounts] = useState(false);
    const [newReason, setNewReason] = useState("");
    const [newAccount, setNewAccount] = useState("");

    const loadAccountsList = (prodList: any[]) => {
        try {
            const stored = localStorage.getItem("billing_inventory_accounts");
            let list: string[] = [];
            if (stored) {
                list = JSON.parse(stored);
            } else {
                list = ["Inventory Asset", "Cost of Goods Sold", "Other Expense", "Shrinkage & Loss", "Inventory Write-off"];
                localStorage.setItem("billing_inventory_accounts", JSON.stringify(list));
            }
            // Fetch dynamic accounts from product records
            const prodAccounts = new Set<string>();
            prodList.forEach((p: any) => {
                if (p.inventoryAccount) prodAccounts.add(p.inventoryAccount);
                if (p.purchaseAccount) prodAccounts.add(p.purchaseAccount);
                if (p.salesAccount) prodAccounts.add(p.salesAccount);
            });
            const merged = Array.from(new Set([...list, ...Array.from(prodAccounts)]));
            setAccounts(merged);
        } catch {
            setAccounts(["Inventory Asset", "Cost of Goods Sold", "Other Expense", "Shrinkage & Loss", "Inventory Write-off"]);
        }
    };

    const loadReasonsList = () => {
        try {
            const stored = localStorage.getItem("billing_inventory_reasons");
            if (stored) {
                setReasons(JSON.parse(stored));
            } else {
                const list = ["Stolen goods", "Damaged", "Expired", "Stock count correction", "Returned goods", "Write-off", "Other"];
                localStorage.setItem("billing_inventory_reasons", JSON.stringify(list));
                setReasons(list);
            }
        } catch {
            setReasons(["Stolen goods", "Damaged", "Expired", "Stock count correction", "Returned goods", "Write-off", "Other"]);
        }
    };

    const handleAddReason = () => {
        const trimmed = newReason.trim();
        if (!trimmed) return;
        if (reasons.includes(trimmed)) return;
        const updated = [...reasons, trimmed];
        setReasons(updated);
        localStorage.setItem("billing_inventory_reasons", JSON.stringify(updated));
        setNewReason("");
    };

    const handleDeleteReason = (itemToDelete: string) => {
        const updated = reasons.filter(r => r !== itemToDelete);
        setReasons(updated);
        localStorage.setItem("billing_inventory_reasons", JSON.stringify(updated));
    };

    const handleAddAccount = () => {
        const trimmed = newAccount.trim();
        if (!trimmed) return;
        if (accounts.includes(trimmed)) return;
        const updated = [...accounts, trimmed];
        setAccounts(updated);
        localStorage.setItem("billing_inventory_accounts", JSON.stringify(updated));
        setNewAccount("");
    };

    const handleDeleteAccount = (itemToDelete: string) => {
        const updated = accounts.filter(a => a !== itemToDelete);
        setAccounts(updated);
        localStorage.setItem("billing_inventory_accounts", JSON.stringify(updated));
    };

    const computeDropdownPos = (id: number) => {
        const td = inputRefs.current[id]?.closest("td");
        if (!td) return;
        const r = td.getBoundingClientRect();
        setDropdownPos({ top: r.bottom + 4, left: r.left, width: r.width });
    };

    function emptyItem(): AdjItem {
        return { id: Date.now(), productId: "", productName: "", sku: "", qtyAvailable: "0", qtyAdjusted: "0", newQty: "0", valueAdjusted: "0", currentValue: "0", newValue: "0", reason: "" };
    }

    useEffect(() => {
        const prodList = loadProducts();
        setProducts(prodList);
        loadAccountsList(prodList);
        loadReasonsList();
    }, []);

    useEffect(() => {
        if (openRow === null) return;
        const update = () => computeDropdownPos(openRow);
        window.addEventListener("scroll", update, true);
        window.addEventListener("resize", update);
        return () => {
            window.removeEventListener("scroll", update, true);
            window.removeEventListener("resize", update);
        };
    }, [openRow]);

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
            setExistingStatus(o.status || null);
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

    const inpSt = (err?: boolean): React.CSSProperties => ({
        width: "100%", height: 36, padding: "0 10px", fontSize: 14,
        border: `1px solid ${err ? "#dc2626" : "#d1d5db"}`,
        borderRadius: 4, outline: "none", color: "#111827", background: "#fff",
        transition: "border-color 0.15s, box-shadow 0.15s",
    });

    const onFocusInp = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        e.target.style.borderColor = "#e41f07";
        e.target.style.boxShadow = "0 0 0 3px rgba(228,31,7,0.10)";
    };
    const onBlurInp = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        e.target.style.borderColor = "#d1d5db";
        e.target.style.boxShadow = "none";
    };

    const isValue = adjType === "Value";

    return (
        <>
            <div className="page-wrapper" style={{ background: "#f5f6fa", minHeight: "100vh" }}>
                <div className="content container-fluid" style={{ padding: "24px 28px" }}>

                    {/* ── Page Header ── */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                        <div>
                            <h4 style={{ fontWeight: 700, fontSize: 19, marginBottom: 3, color: "#111827" }}>
                                {editId ? "Edit Inventory Adjustment" : "New Inventory Adjustment"}
                            </h4>
                            <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "#6b7280" }}>
                                <span onClick={() => navigate(route.inventoryAdjustmentList)} style={{ cursor: "pointer", color: "#9ca3af" }}>
                                    Inventory Adjustments
                                </span>
                                <span>›</span>
                                <span style={{ color: "#374151", fontWeight: 500 }}>{editId ? "Edit" : "New"}</span>
                            </div>
                        </div>
                        <button onClick={() => navigate(route.inventoryAdjustmentList)}
                            style={{ width: 34, height: 34, borderRadius: 4, background: "#fff", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                            <i className="ti ti-x" style={{ fontSize: 15, color: "#6b7280" }} />
                        </button>
                    </div>

                    {/* ── Main Card ── */}
                    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>

                        {/* ── Form Fields ── */}
                        <div style={{ padding: "20px 32px 8px", borderBottom: "1px solid #e5e7eb" }}>
                            <div>

                                {/* Mode of adjustment */}
                                <div className="d-flex flex-column flex-md-row align-items-md-start mb-3">
                                    <label className="mt-1" style={{ minWidth: 200, fontSize: 14, fontWeight: 500, color: "#374151", flexShrink: 0 }}>Mode of adjustment</label>
                                    <div style={{ flex: 1, maxWidth: 320, display: "flex", flexDirection: "column", gap: 9 }}>
                                        {[{ val: "Quantity", label: "Quantity Adjustment" }, { val: "Value", label: "Value Adjustment" }].map(opt => (
                                            <label key={opt.val} onClick={() => setAdjType(opt.val)}
                                                style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", fontSize: 14, color: "#374151", userSelect: "none", marginBottom: 0 }}>
                                                <div style={{
                                                    width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                                                    border: adjType === opt.val ? "5px solid #e41f07" : "2px solid #c4c9d4",
                                                    background: "#fff", transition: "border 0.15s",
                                                }} />
                                                {opt.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Reference Number */}
                                <div className="d-flex flex-column flex-md-row align-items-md-center mb-3">
                                    <label style={{ minWidth: 200, fontSize: 14, fontWeight: 500, color: "#374151", flexShrink: 0 }}>Reference Number</label>
                                    <div style={{ flex: 1, maxWidth: 320 }}>
                                        <input type="text" value={refNum} onChange={e => setRefNum(e.target.value)}
                                            placeholder="Enter reference number" style={inpSt()}
                                            onFocus={onFocusInp} onBlur={onBlurInp} />
                                    </div>
                                </div>

                                {/* Date */}
                                <div className="d-flex flex-column flex-md-row align-items-md-center mb-3">
                                    <label style={{ minWidth: 200, fontSize: 14, fontWeight: 500, color: "#e41f07", flexShrink: 0 }}>
                                        Date <span style={{ color: "#dc2626" }}>*</span>
                                    </label>
                                    <div style={{ flex: 1, maxWidth: 320 }}>
                                        <input type="text" value={adjDate} onChange={e => setAdjDate(e.target.value)}
                                            placeholder="DD/MM/YYYY" style={inpSt()}
                                            onFocus={onFocusInp} onBlur={onBlurInp} />
                                    </div>
                                </div>

                                {/* Account */}
                                <div className="d-flex flex-column flex-md-row align-items-md-center mb-3">
                                    <label style={{ minWidth: 200, fontSize: 14, fontWeight: 500, color: "#e41f07", flexShrink: 0 }}>
                                        Account <span style={{ color: "#dc2626" }}>*</span>
                                    </label>
                                    <div style={{ flex: 1, maxWidth: 320 }}>
                                        <SD value={account} placeholder="Select account..." options={accounts}
                                            onChange={v => { setAccount(v); setErrors(p => ({ ...p, account: "" })); }}
                                            error={!!errors.account}
                                            footerAction={{ label: "Manage Accounts", onClick: () => setShowManageAccounts(true) }} />
                                        {errors.account && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 3 }}>{errors.account}</div>}
                                    </div>
                                </div>

                                {/* Reason */}
                                <div className="d-flex flex-column flex-md-row align-items-md-center mb-3">
                                    <label style={{ minWidth: 200, fontSize: 14, fontWeight: 500, color: "#e41f07", flexShrink: 0 }}>
                                        Reason <span style={{ color: "#dc2626" }}>*</span>
                                    </label>
                                    <div style={{ flex: 1, maxWidth: 320 }}>
                                        <SD value={reason} placeholder="Select a reason" options={reasons}
                                            onChange={v => { setReason(v); setErrors(p => ({ ...p, reason: "" })); }}
                                            error={!!errors.reason}
                                            footerAction={{ label: "Manage Reasons", onClick: () => setShowManageReasons(true) }} />
                                        {errors.reason && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 3 }}>{errors.reason}</div>}
                                    </div>
                                </div>

                                {/* Location */}
                                <div className="d-flex flex-column flex-md-row align-items-md-center mb-3">
                                    <label style={{ minWidth: 200, fontSize: 14, fontWeight: 500, color: "#e41f07", flexShrink: 0 }}>
                                        Location <span style={{ color: "#dc2626" }}>*</span>
                                    </label>
                                    <div style={{ flex: 1, maxWidth: 320 }}>
                                        <SD value={location} placeholder="Location" options={LOCATIONS}
                                            onChange={v => { setLocation(v); setErrors(p => ({ ...p, location: "" })); }}
                                            error={!!errors.location} />
                                        {errors.location && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 3 }}>{errors.location}</div>}
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="d-flex flex-column flex-md-row align-items-md-start mb-3">
                                    <label className="mt-1" style={{ minWidth: 200, fontSize: 14, fontWeight: 500, color: "#374151", flexShrink: 0 }}>Description</label>
                                    <div style={{ flex: 1, maxWidth: 320 }}>
                                        <textarea value={desc} onChange={e => setDesc(e.target.value.slice(0, 500))} rows={3}
                                            placeholder="Max. 500 characters"
                                            style={{ width: "100%", padding: "8px 10px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 4, outline: "none", resize: "vertical", color: "#374151", lineHeight: 1.6, transition: "border-color 0.15s, box-shadow 0.15s" }}
                                            onFocus={onFocusInp} onBlur={onBlurInp} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Item Table ── */}
                        <div>
                            {/* Table header bar */}
                            <div style={{ padding: "13px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Item Table</span>
                            </div>

                            <div style={{ padding: "16px 24px 0" }}>
                                <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 6 }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
                                        <thead>
                                            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                                                <th style={{ width: 32, padding: "10px 6px 10px 16px", borderRight: "1px solid #e2e8f0" }} />
                                                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", borderRight: "1px solid #e2e8f0" }}>Item Details</th>
                                                <th style={{ width: 180, padding: "10px 16px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", borderRight: "1px solid #e2e8f0" }}>
                                                    {isValue ? "Current Value" : "Quantity Available"}
                                                </th>
                                                <th style={{ width: 200, padding: "10px 16px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", borderRight: "1px solid #e2e8f0" }}>
                                                    {isValue ? "Changed Value" : "New Quantity on Hand"}
                                                </th>
                                                <th style={{ width: 190, padding: "10px 16px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", borderRight: "1px solid #e2e8f0" }}>
                                                    {isValue ? "Adjusted Value" : "Quantity Adjusted"}
                                                </th>
                                                <th style={{ width: 44, padding: "10px 8px" }} />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map(item => (
                                                <React.Fragment key={item.id}>
                                                    <tr style={{ borderBottom: "1px solid #f1f5f9" }}
                                                        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#f8fafc"}
                                                        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "#fff"}>

                                                        {/* Drag handle */}
                                                        <td style={{ padding: "12px 6px 12px 16px", textAlign: "center", color: "#c4c9d4", verticalAlign: "middle", borderRight: "1px solid #e2e8f0" }}>
                                                            <i className="ti ti-grip-vertical" style={{ fontSize: 14 }} />
                                                        </td>

                                                        {/* Item Details — image placeholder + autocomplete */}
                                                        <td style={{ padding: "8px 12px", verticalAlign: "middle", position: "relative", borderRight: "1px solid #e2e8f0" }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                                <div style={{ width: 38, height: 38, border: "1px solid #e5e7eb", borderRadius: 4, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                                    {item.productName
                                                                        ? <span style={{ fontSize: 13, fontWeight: 700, color: "#e41f07" }}>{item.productName.charAt(0).toUpperCase()}</span>
                                                                        : <i className="ti ti-photo" style={{ fontSize: 16, color: "#c4c9d4" }} />}
                                                                </div>
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <input
                                                                        ref={el => { inputRefs.current[item.id] = el; }}
                                                                        value={item.productName}
                                                                        onChange={e => {
                                                                            updateItem(item.id, "productName", e.target.value);
                                                                            setOpenRow(item.id);
                                                                            setRowSearch(e.target.value);
                                                                            computeDropdownPos(item.id);
                                                                        }}
                                                                        onFocus={() => {
                                                                            setOpenRow(item.id);
                                                                            setRowSearch(item.productName);
                                                                            computeDropdownPos(item.id);
                                                                        }}
                                                                        onBlur={() => setTimeout(() => { setOpenRow(null); setRowSearch(""); setDropdownPos(null); }, 200)}
                                                                        placeholder="Type or click to select an item."
                                                                        style={{ width: "100%", border: "none", outline: "none", fontSize: 14, color: "#374151", background: "transparent", padding: "2px 0" }}
                                                                    />
                                                                    {item.sku && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>SKU: {item.sku}</div>}
                                                                    {openRow === item.id && dropdownPos && (
                                                                        <div style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, background: "#fff", border: "1px solid #d1d5db", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 9999, maxHeight: 220, overflowY: "auto" }}>
                                                                            {products.length === 0 && (
                                                                                <div style={{ padding: "14px", textAlign: "center", fontSize: 13, color: "#9ca3af" }}>No products found. Add products first.</div>
                                                                            )}
                                                                            {products
                                                                                .filter(p => !rowSearch || p.name?.toLowerCase().includes(rowSearch.toLowerCase()) || p.sku?.toLowerCase().includes(rowSearch.toLowerCase()))
                                                                                .map(p => (
                                                                                    <div key={p.id}
                                                                                        onMouseDown={() => selectProduct(item.id, p)}
                                                                                        style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f3f4f6" }}
                                                                                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "#f3f4f6"; }}
                                                                                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "#fff"; }}>
                                                                                        <div>
                                                                                            <div style={{ fontWeight: 500, color: "#111827" }}>{p.name}</div>
                                                                                            {p.sku && <div style={{ fontSize: 11, color: "#9ca3af" }}>SKU: {p.sku}</div>}
                                                                                        </div>
                                                                                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                                                                                            Stock: <strong>{p.stockOnHand ?? p.stock ?? 0}</strong>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Current Value */}
                                                        <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 14, color: "#374151", verticalAlign: "middle", borderRight: "1px solid #e2e8f0" }}>
                                                            {isValue
                                                                ? parseFloat(item.currentValue || "0").toFixed(2)
                                                                : item.qtyAvailable}
                                                        </td>

                                                        {/* Changed Value (calculated result) */}
                                                        <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 14, fontWeight: 500, color: "#111827", verticalAlign: "middle", borderRight: "1px solid #e2e8f0" }}>
                                                            {isValue
                                                                ? parseFloat(item.newValue || "0").toFixed(2)
                                                                : item.newQty}
                                                        </td>

                                                        {/* Adjusted Value — input */}
                                                        <td style={{ padding: "6px 12px", verticalAlign: "middle", borderRight: "1px solid #e2e8f0" }}>
                                                            <input
                                                                type="number"
                                                                value={isValue ? item.valueAdjusted : item.qtyAdjusted}
                                                                onChange={e => updateItem(item.id, isValue ? "valueAdjusted" : "qtyAdjusted", e.target.value)}
                                                                placeholder="Eg. +10, -10"
                                                                style={{
                                                                    width: "100%", border: "1px solid #e5e7eb", borderRadius: 4,
                                                                    padding: "6px 10px", outline: "none", fontSize: 14, background: "#fff",
                                                                    textAlign: "right", fontWeight: 500,
                                                                    color: parseFloat(isValue ? item.valueAdjusted : item.qtyAdjusted) < 0 ? "#dc2626" : "#374151",
                                                                }}
                                                                onFocus={e => (e.target.style.borderColor = "#6b7280")}
                                                                onBlur={e => (e.target.style.borderColor = "#e5e7eb")} />
                                                        </td>

                                                        {/* Delete */}
                                                        <td style={{ padding: "12px 8px", textAlign: "center", verticalAlign: "middle" }}>
                                                            <button onClick={() => removeItem(item.id)}
                                                                title="Remove item"
                                                                style={{ background: "none", border: "none", cursor: items.length > 1 ? "pointer" : "default", opacity: items.length > 1 ? 1 : 0.3, color: "#9ca3af", fontSize: 16, padding: "2px 4px", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}
                                                                onMouseEnter={e => { if (items.length > 1) (e.currentTarget as HTMLButtonElement).style.color = "#dc2626"; }}
                                                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#9ca3af"; }}>
                                                                <i className="ti ti-trash" style={{ fontSize: 16 }} />
                                                            </button>
                                                        </td>
                                                    </tr>

                                                    {/* Reporting Tags sub-row */}
                                                    <tr style={{ borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                                                        <td />
                                                        <td colSpan={5} style={{ padding: "5px 12px 7px 66px" }}>
                                                            <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#6b7280", display: "flex", alignItems: "center", gap: 5, padding: 0 }}>
                                                                <i className="ti ti-tag" style={{ fontSize: 13 }} />
                                                                Reporting Tags
                                                                <i className="ti ti-chevron-down" style={{ fontSize: 11 }} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Add New Row + Add Items in Bulk */}
                            <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 24 }}>
                                <button onClick={addItem}
                                    style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#e41f07", fontWeight: 500, padding: 0, outline: "none" }}>
                                    <i className="ti ti-circle-plus" style={{ fontSize: 16, color: "#e41f07" }} /> Add New Row
                                </button>
                                <button onClick={() => { setBulkModal(true); setBulkSearch(""); setBulkSelected(new Set()); setBulkQtys({}); }}
                                    style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#e41f07", fontWeight: 500, padding: 0, outline: "none" }}>
                                    <i className="ti ti-circle-plus" style={{ fontSize: 16, color: "#e41f07" }} /> Add Items in Bulk
                                </button>
                            </div>

                            {/* Attach File section */}
                            <div style={{ padding: "18px 24px 22px", borderTop: "none" }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 10 }}>
                                    Attach File(s) to inventory adjustment
                                </div>
                                <div style={{ display: "flex", alignItems: "center" }}>
                                    <button style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", border: "1px solid #d1d5db", borderRight: "none", borderRadius: "4px 0 0 4px", padding: "6px 14px", cursor: "pointer", fontSize: 13, color: "#374151", fontWeight: 500 }}>
                                        <i className="ti ti-upload" style={{ fontSize: 14 }} /> Upload File
                                    </button>
                                    <button style={{ height: 34, width: 32, background: "#fff", border: "1px solid #d1d5db", borderRadius: "0 4px 4px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <i className="ti ti-chevron-down" style={{ fontSize: 12, color: "#6b7280" }} />
                                    </button>
                                </div>
                                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
                                    You can upload a maximum of 5 files, 10MB each
                                </div>
                            </div>
                        </div>

                        {/* ── Bottom Actions ── */}
                        <div style={{ padding: "18px 24px", display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid #e5e7eb" }}>

                            {/* Save as Draft — always visible for new or draft records */}
                            {(!editId || existingStatus === "Draft") && (
                                <button onClick={() => save("Draft")} disabled={saving}
                                    className="btn premium-outline-btn"
                                    style={{ height: 36, padding: "0 20px", borderRadius: 4, fontSize: 14, fontWeight: 500, opacity: saving ? 0.7 : 1 }}>
                                    {saving ? "Saving..." : "Save as Draft"}
                                </button>
                            )}

                            {/* Primary CTA — context aware */}
                            {!editId && (
                                // New record: primary Save button → saves as Adjusted
                                <button onClick={() => save("Adjusted")} disabled={saving}
                                    className="btn premium-primary-btn"
                                    style={{ height: 36, padding: "0 24px", borderRadius: 4, fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                                    {saving ? "Saving..." : "Save"}
                                </button>
                            )}

                            {editId && existingStatus === "Draft" && (
                                // Editing a Draft: convert to Adjusted
                                <button onClick={() => save("Adjusted")} disabled={saving}
                                    className="btn premium-primary-btn"
                                    style={{ height: 36, padding: "0 24px", borderRadius: 4, fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                                    {saving ? "Saving..." : "Convert to Adjusted"}
                                </button>
                            )}

                            {editId && existingStatus === "Adjusted" && (
                                // Editing a finalised record: just Save
                                <button onClick={() => save("Adjusted")} disabled={saving}
                                    className="btn premium-primary-btn"
                                    style={{ height: 36, padding: "0 24px", borderRadius: 4, fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                                    {saving ? "Saving..." : "Save"}
                                </button>
                            )}

                            <button onClick={() => navigate(route.inventoryAdjustmentList)}
                                className="btn premium-outline-btn"
                                style={{ height: 36, padding: "0 18px", borderRadius: 4, fontSize: 14, fontWeight: 500 }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Bulk Add Modal ── */}
            {bulkModal && (() => {
            const filtered = products.filter(p =>
                !bulkSearch ||
                p.name?.toLowerCase().includes(bulkSearch.toLowerCase()) ||
                p.sku?.toLowerCase().includes(bulkSearch.toLowerCase())
            );

            const toggleSelect = (id: string | number) => {
                setBulkSelected(prev => {
                    const next = new Set(prev);
                    if (next.has(id)) {
                        next.delete(id);
                    } else {
                        next.add(id);
                        setBulkQtys(q => ({ ...q, [id]: q[id] ?? 0 }));
                    }
                    return next;
                });
            };

            const setQtyDirect = (id: string | number, val: string) => {
                const n = parseFloat(val);
                setBulkQtys(prev => ({ ...prev, [id]: isNaN(n) ? 0 : n }));
            };

            const handleAddSelected = () => {
                const toAdd = products.filter(p => bulkSelected.has(p.id));
                if (!toAdd.length) return;
                setItems(prev => {
                    const existingIds = new Set(prev.map(i => i.productId));
                    const newItems = toAdd
                        .filter(p => !existingIds.has(p.id))
                        .map(p => {
                            const stock = p.stockOnHand ?? p.stock ?? 0;
                            const price = p.costPrice ?? p.selling_price ?? 0;
                            const adj = bulkQtys[p.id] ?? 0;
                            return {
                                id: Date.now() + Math.random(),
                                productId: p.id,
                                productName: p.name,
                                sku: p.sku || "",
                                qtyAvailable: String(stock),
                                qtyAdjusted: String(adj),
                                newQty: String(stock + adj),
                                valueAdjusted: String(adj * price),
                                currentValue: String(stock * price),
                                newValue: String((stock + adj) * price),
                                reason: "",
                            };
                        });
                    const base = prev.filter(i => i.productId !== "");
                    return [...base, ...newItems, ...(base.length === 0 && newItems.length === 0 ? [emptyItem()] : [])];
                });
                setBulkModal(false);
            };

            return (
                <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {/* Backdrop */}
                    <div onClick={() => setBulkModal(false)}
                        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />

                    {/* Modal Box */}
                    <div style={{ position: "relative", background: "#fff", borderRadius: 8, boxShadow: "0 8px 40px rgba(0,0,0,0.18)", width: "100%", maxWidth: 700, maxHeight: "85vh", display: "flex", flexDirection: "column", margin: "0 16px" }}>
                        
                        {/* Header */}
                        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>Add Items in Bulk</span>
                            <button onClick={() => setBulkModal(false)}
                                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#9ca3af", fontSize: 20, lineHeight: 1 }}>
                                <i className="ti ti-x" />
                            </button>
                        </div>

                        {/* Search Input Box */}
                        <div style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb" }}>
                            <div style={{ position: "relative" }}>
                                <i className="ti ti-search" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#9ca3af" }} />
                                <input autoFocus value={bulkSearch} onChange={e => setBulkSearch(e.target.value)}
                                    placeholder="Search..."
                                    style={{
                                        width: "100%", height: 40, border: "1px solid #d1d5db", borderRadius: 6,
                                        padding: "0 12px 0 40px", fontSize: 15, outline: "none", color: "#374151",
                                        transition: "border-color 0.15s, box-shadow 0.15s"
                                    }}
                                    onFocus={e => {
                                        e.target.style.borderColor = "#e41f07";
                                        e.target.style.boxShadow = "0 0 0 3px rgba(228,31,7,0.10)";
                                    }}
                                    onBlur={e => {
                                        e.target.style.borderColor = "#d1d5db";
                                        e.target.style.boxShadow = "none";
                                    }} />
                            </div>
                        </div>

                        {/* Table Area */}
                        <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 20px" }}>
                            <div style={{ border: "1px solid #e5e7eb", borderRadius: 4, overflow: "hidden", marginTop: 16 }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
                                            <th style={{ width: 44, padding: "12px 10px 12px 20px", textAlign: "left" }}>
                                                <input type="checkbox"
                                                    checked={filtered.length > 0 && filtered.every(p => bulkSelected.has(p.id))}
                                                    onChange={e => {
                                                        if (e.target.checked) {
                                                            setBulkSelected(new Set(filtered.map(p => p.id)));
                                                            setBulkQtys(prev => {
                                                                const next = { ...prev };
                                                                filtered.forEach(p => { if (next[p.id] === undefined) next[p.id] = 0; });
                                                                return next;
                                                            });
                                                        } else {
                                                            setBulkSelected(new Set());
                                                        }
                                                    }}
                                                    style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#e41f07" }} />
                                            </th>
                                            <th style={{ padding: "12px 12px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>ITEM DETAILS</th>
                                            <th style={{ width: 200, padding: "12px 16px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>STOCK ON HAND</th>
                                            <th style={{ width: 140, padding: "12px 20px 12px 12px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>QUANTITY</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} style={{ padding: "32px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
                                                    No products found. Add products first.
                                                </td>
                                            </tr>
                                        ) : filtered.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} style={{ padding: "32px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
                                                    No products match your search.
                                                </td>
                                            </tr>
                                        ) : filtered.map(p => {
                                            const selected = bulkSelected.has(p.id);
                                            const stock = p.stockOnHand ?? p.stock ?? 0;
                                            const qty = bulkQtys[p.id] ?? 0;
                                            return (
                                                <tr key={p.id}
                                                    onClick={() => toggleSelect(p.id)}
                                                    style={{ borderBottom: "1px solid #f1f5f9", background: selected ? "#fff" : "#fff", cursor: "pointer" }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                                                    onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                                                    
                                                    <td style={{ padding: "14px 10px 14px 20px" }}>
                                                        <input type="checkbox" checked={selected}
                                                            onChange={() => toggleSelect(p.id)}
                                                            onClick={e => e.stopPropagation()}
                                                            style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#e41f07" }} />
                                                    </td>

                                                    <td style={{ padding: "14px 12px" }}>
                                                        <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{p.name}</div>
                                                        {p.sku && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>SKU: {p.sku}</div>}
                                                    </td>

                                                    <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 14, color: "#64748b" }}>
                                                        {parseFloat(String(stock)).toFixed(2)} box
                                                    </td>

                                                    <td style={{ padding: "8px 20px 8px 12px", textAlign: "right" }}
                                                        onClick={e => e.stopPropagation()}>
                                                        <input type="number" value={qty === 0 ? "" : qty}
                                                            placeholder="0"
                                                            onChange={e => {
                                                                setBulkSelected(prev => {
                                                                    const s = new Set(prev);
                                                                    s.add(p.id);
                                                                    return s;
                                                                });
                                                                setQtyDirect(p.id, e.target.value);
                                                            }}
                                                            style={{ width: 90, height: 32, textAlign: "right", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: 14, outline: "none", padding: "0 8px", color: "#1e293b" }}
                                                            onFocus={e => (e.target.style.borderColor = "#94a3b8")}
                                                            onBlur={e => (e.target.style.borderColor = "#cbd5e1")} />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ padding: "16px 24px", borderTop: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
                            <button onClick={() => setBulkModal(false)}
                                style={{ height: 38, padding: "0 20px", borderRadius: 4, fontSize: 14, fontWeight: 500, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", color: "#374151" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                                onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                                Cancel
                            </button>
                            <button onClick={handleAddSelected}
                                style={{ height: 38, padding: "0 22px", borderRadius: 4, fontSize: 14, fontWeight: 600, border: "none", background: "#e41f07", color: "#fff", cursor: "pointer" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#cb1a06")}
                                onMouseLeave={e => (e.currentTarget.style.background = "#e41f07")}>
                                Add Selected ({bulkSelected.size})
                            </button>
                        </div>
                    </div>
                </div>
            );
        })()}

        {/* Manage Reasons Modal */}
        {showManageReasons && (
            <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.5)", zIndex: 1055 }} onClick={(e) => { if (e.target === e.currentTarget) setShowManageReasons(false); }}>
                <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "520px" }}>
                    <div className="modal-content" style={{ borderRadius: 6, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", border: "1px solid #d0d0d0", overflow: "hidden" }}>
                        
                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Manage Reasons</span>
                            <button type="button" onClick={() => setShowManageReasons(false)}
                                style={{ background: "none", border: "none", fontSize: 20, color: "#6b7280", cursor: "pointer", lineHeight: 1, padding: 0 }}>
                                ×
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: "20px", background: "#fff" }}>
                            {/* Add Input */}
                            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                                <input
                                    type="text"
                                    placeholder="Enter new reason..."
                                    value={newReason}
                                    onChange={e => setNewReason(e.target.value)}
                                    style={{ flex: 1, height: 36, padding: "0 12px", border: "1px solid #d1d5db", borderRadius: 4, outline: "none", fontSize: 14 }}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddReason}
                                    style={{ height: 36, padding: "0 16px", background: "#e41f07", color: "#fff", border: "none", borderRadius: 4, fontWeight: "bold", fontSize: 13, cursor: "pointer" }}
                                >
                                    Add
                                </button>
                            </div>

                            {/* List */}
                            <div style={{ maxHeight: "240px", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 4 }}>
                                {reasons.length === 0 ? (
                                    <div style={{ padding: "20px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No reasons available. Add one.</div>
                                ) : (
                                    reasons.map((r, idx) => (
                                        <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: idx < reasons.length - 1 ? "1px solid #f3f4f6" : "none", fontSize: 14, color: "#374151" }}>
                                            <span>{r}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteReason(r)}
                                                style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", padding: "4px" }}
                                            >
                                                <i className="ti ti-trash" style={{ fontSize: 14 }} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ padding: "12px 20px", background: "#f9fafb", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end" }}>
                            <button type="button" className="btn btn-light border btn-sm px-4 fw-medium" onClick={() => setShowManageReasons(false)}>Close</button>
                        </div>

                    </div>
                </div>
            </div>
        )}

        {/* Manage Accounts Modal */}
        {showManageAccounts && (
            <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.5)", zIndex: 1055 }} onClick={(e) => { if (e.target === e.currentTarget) setShowManageAccounts(false); }}>
                <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "520px" }}>
                    <div className="modal-content" style={{ borderRadius: 6, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", border: "1px solid #d0d0d0", overflow: "hidden" }}>
                        
                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Manage Accounts</span>
                            <button type="button" onClick={() => setShowManageAccounts(false)}
                                style={{ background: "none", border: "none", fontSize: 20, color: "#6b7280", cursor: "pointer", lineHeight: 1, padding: 0 }}>
                                ×
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: "20px", background: "#fff" }}>
                            {/* Add Input */}
                            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                                <input
                                    type="text"
                                    placeholder="Enter new account..."
                                    value={newAccount}
                                    onChange={e => setNewAccount(e.target.value)}
                                    style={{ flex: 1, height: 36, padding: "0 12px", border: "1px solid #d1d5db", borderRadius: 4, outline: "none", fontSize: 14 }}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddAccount}
                                    style={{ height: 36, padding: "0 16px", background: "#e41f07", color: "#fff", border: "none", borderRadius: 4, fontWeight: "bold", fontSize: 13, cursor: "pointer" }}
                                >
                                    Add
                                </button>
                            </div>

                            {/* List */}
                            <div style={{ maxHeight: "240px", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 4 }}>
                                {accounts.length === 0 ? (
                                    <div style={{ padding: "20px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No accounts available. Add one.</div>
                                ) : (
                                    accounts.map((a, idx) => (
                                        <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: idx < accounts.length - 1 ? "1px solid #f3f4f6" : "none", fontSize: 14, color: "#374151" }}>
                                            <span>{a}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteAccount(a)}
                                                style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", padding: "4px" }}
                                            >
                                                <i className="ti ti-trash" style={{ fontSize: 14 }} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ padding: "12px 20px", background: "#f9fafb", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end" }}>
                            <button type="button" className="btn btn-light border btn-sm px-4 fw-medium" onClick={() => setShowManageAccounts(false)}>Close</button>
                        </div>

                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default InventoryAdjustmentAdd;
