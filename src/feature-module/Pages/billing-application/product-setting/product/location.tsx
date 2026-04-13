import { useState, useEffect, useRef } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import "../../billing-application.scss";


// ── Types ─────────────────────────────────────────────────────────────────────
type LocationType = "Business" | "Warehouse";
type SortKey = "name" | "defaultTxnSeries" | "type" | "address";
type SortDir = "asc" | "desc";

type SeriesModule = { module: string; prefix: string; startingNumber: string; };

type TxnSeries = {
    id: number; name: string; locations: string[]; modules: SeriesModule[];
};

type Location = {
    id: number;
    name: string;
    type: LocationType;
    parentLocation: string;
    address: string; street1: string; street2: string;
    city: string; pinCode: string; country: string; state: string;
    phone: string; fax: string; websiteUrl: string;
    primaryContact: string;
    txnSeries: string[];
    defaultTxnSeries: string;
    isDefault?: boolean;
    logo?: string;
    locationAccess: string[];
};

type OrgUser = { name: string; email: string; role: string; };

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_MODULES: SeriesModule[] = [
    { module: "Credit Note", prefix: "CN-", startingNumber: "00001" },
    { module: "Customer Payment", prefix: "", startingNumber: "1" },
    { module: "Purchase Order", prefix: "PO-", startingNumber: "00001" },
    { module: "Sales Order", prefix: "SO-", startingNumber: "00001" },
    { module: "Vendor Payment", prefix: "", startingNumber: "1" },
    { module: "Retainer Invoice", prefix: "RET-", startingNumber: "00001" },
    { module: "Bill Of Supply", prefix: "BOS-", startingNumber: "000001" },
    { module: "Invoice", prefix: "INV-", startingNumber: "000001" },
    { module: "Sales Return", prefix: "RMA-", startingNumber: "00001" },
    { module: "Delivery Challan", prefix: "DC-", startingNumber: "00001" },
];

const INIT_SERIES_CATEGORIES = ["General", "Retail", "Wholesale", "Service"];

const INIT_SERIES: TxnSeries[] = [
    { id: 1, name: "Default Transaction Series", locations: ["Head Office"], modules: DEFAULT_MODULES.map(m => ({ ...m })) },
    { id: 2, name: "1", locations: ["erode"], modules: DEFAULT_MODULES.map(m => ({ ...m })) },
];

const INIT_LOCATIONS: Location[] = [
    { id: 1, name: "Head Office", type: "Business", parentLocation: "", address: "Vijay Vijay", street1: "", street2: "", city: "", pinCode: "", country: "India", state: "Tamil Nadu", phone: "", fax: "", websiteUrl: "", primaryContact: "vijay48357@gmail.com", txnSeries: ["Default Transaction Series"], defaultTxnSeries: "Default Transaction Series", isDefault: true, locationAccess: ["vijay48357@gmail.com"] },
    { id: 2, name: "erode", type: "Business", parentLocation: "Head Office", address: "", street1: "", street2: "", city: "namakkal", pinCode: "", country: "India", state: "Tamil Nadu", phone: "", fax: "", websiteUrl: "", primaryContact: "", txnSeries: ["1"], defaultTxnSeries: "1", locationAccess: ["vijay48357@gmail.com"] },
];

const EMPTY_LOC: Omit<Location, "id"> = {
    name: "", type: "Business", parentLocation: "", address: "", street1: "", street2: "",
    city: "", pinCode: "", country: "India", state: "", phone: "", fax: "", websiteUrl: "",
    primaryContact: "", txnSeries: [], defaultTxnSeries: "", isDefault: false, logo: "", locationAccess: ["vijay48357@gmail.com"],
};

const INDIA_STATES = [
    "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
    "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa",
    "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka",
    "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
    "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const ORG_USERS: OrgUser[] = [
    { name: "Vijay Vijay", email: "vijay48357@gmail.com", role: "Admin" },
];

const pvw = (p: string, n: string) => p ? `${p}${n}` : n;
const now = () => new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// ── Mobile Responsive Hook ───────────────────────────────────────────────────
const useResponsive = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return isMobile;
};

// ── Shared Styles ─────────────────────────────────────────────────────────────
const inp: React.CSSProperties = { border: "1px solid #e3e3e3", borderRadius: 6, padding: "7px 11px", fontSize: 13, outline: "none", width: "100%", color: "#333" };
const lbl = (req = false): React.CSSProperties => ({ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block", color: req ? "#e41f07" : "#444" });
const thStyle: React.CSSProperties = { padding: "10px 16px", fontWeight: 600, color: "#000000", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", background: "transparent", borderBottom: "1px solid #e8e8e8", whiteSpace: "nowrap", userSelect: "none" };
const tdStyle: React.CSSProperties = { padding: "8px 16px", fontSize: 12, color: "#444", verticalAlign: "middle" };

// ── Sort Icon ─────────────────────────────────────────────────────────────────
const SortIcon = ({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir; }) => (
    <span style={{ marginLeft: 4, display: "inline-flex", flexDirection: "column", gap: 1, verticalAlign: "middle" }}>
        <span style={{ fontSize: 8, lineHeight: 1, color: sortKey === col && sortDir === "asc" ? "#e41f07" : "#ccc" }}>▲</span>
        <span style={{ fontSize: 8, lineHeight: 1, color: sortKey === col && sortDir === "desc" ? "#e41f07" : "#ccc" }}>▼</span>
    </span>
);

// ── Multi-tag Series Select with Reordering ──────────────────────────────────
const SeriesMultiSelect = ({ value, onChange, options, label, required }: {
    value: string[]; onChange: (v: string[]) => void; options: string[]; label: string; required?: boolean;
}) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
    }, []);

    const toggle = (opt: string) => {
        onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
        setOpen(false);
    };
    const moveUp = (idx: number) => {
        if (idx === 0) return;
        const newVal = [...value];
        [newVal[idx - 1], newVal[idx]] = [newVal[idx], newVal[idx - 1]];
        onChange(newVal);
    };
    const moveDown = (idx: number) => {
        if (idx === value.length - 1) return;
        const newVal = [...value];
        [newVal[idx], newVal[idx + 1]] = [newVal[idx + 1], newVal[idx]];
        onChange(newVal);
    };

    return (
        <div style={{ marginBottom: 14, position: "relative" }} ref={ref}>
            <label style={lbl(required)}>{label}{required && " *"}</label>
            <div onClick={() => setOpen(o => !o)} style={{ ...inp, minHeight: 38, cursor: "pointer", display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center", paddingRight: 30, position: "relative" }}>
                {value.length === 0
                    ? <span style={{ color: "#bbb" }}>Add Transaction Series</span>
                    : value.map(v => (
                        <span key={v} style={{ background: "#fff0eb", color: "#e41f07", borderRadius: 4, padding: "2px 8px", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                            {v}
                            <i className="ti ti-x" style={{ fontSize: 10, cursor: "pointer" }} onClick={e => { e.stopPropagation(); toggle(v); }} />
                        </span>
                    ))
                }
                <i className="ti ti-chevron-down" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#aaa", fontSize: 13 }} />
            </div>
            {open && (
                <div style={{ border: "1px solid #e3e3e3", borderRadius: 8, background: "#fff", position: "absolute", zIndex: 400, width: "100%", maxHeight: 200, overflowX: "hidden", overflowY: "auto", boxShadow: "0 6px 20px rgba(0,0,0,0.12)", marginTop: 3 }}>
                    {options.map(opt => (
                        <div key={opt} onClick={() => toggle(opt)} style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between", background: value.includes(opt) ? "#fff0eb" : "#fff", color: value.includes(opt) ? "#e41f07" : "#555", borderBottom: "1px solid #f5f5f5" }}>
                            <span>{opt}</span>
                            {value.includes(opt) && <i className="ti ti-check" style={{ fontSize: 13, fontWeight: 700 }} />}
                        </div>
                    ))}
                    {options.length === 0 && <div style={{ padding: "10px 14px", color: "#bbb", fontSize: 13 }}>No series available</div>}
                </div>
            )}
        </div>
    );
};

// ── Action Menu ───────────────────────────────────────────────────────────────
const ActionMenu = ({ onEdit, onDelete, onSetPrimary, isPrimary }: { onEdit: () => void; onDelete: () => void; onSetPrimary?: () => void; isPrimary?: boolean }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
    }, []);

    const menuItems = [
        { icon: "ti-pencil", label: "Edit", fn: onEdit },
        ...(onSetPrimary && !isPrimary ? [{ icon: "ti-star", label: "Mark as Primary", fn: onSetPrimary }] : []),
        { icon: "ti-trash", label: "Delete", fn: onDelete }
    ];

    return (
        <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
            <button onClick={() => setOpen(!open)} style={{ background: "#fff", border: "1px solid #e3e3e3", borderRadius: 6, color: "#697586", cursor: "pointer", padding: "4px 6px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#e41f07"; e.currentTarget.style.background = "#fff8f7"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e3e3e3"; e.currentTarget.style.background = "#fff"; }}>
                <i className="ti ti-dots-vertical" style={{ fontSize: 16 }} />
            </button>
            {open && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "#fff", border: "1px solid #e3e3e3", borderRadius: 8, width: 170, boxShadow: "0 6px 20px rgba(0,0,0,0.1)", zIndex: 300, padding: "4px 0" }}>
                    {menuItems.map(item => (
                        <button key={item.label} title={item.label} onClick={() => { item.fn(); setOpen(false); }}
                            className="dropdown-item d-flex align-items-center gap-2 px-3 py-2" style={{ fontSize: 13, color: "#555", border: "none" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#fff8f7")}
                            onMouseLeave={e => (e.currentTarget.style.background = "")}>
                            <i className={`ti ${item.icon}`} style={{ color: item.icon === "ti-star" ? "#fcc419" : "#e41f07", fontSize: 15 }} />{item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Delete Modal ──────────────────────────────────────────────────────────────
const DeleteModal = ({ show, name, onConfirm, onClose }: { show: boolean; name: string; onConfirm: () => void; onClose: () => void; }) => {
    if (!show) return null;
    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1040 }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 1050, background: "#fff", borderRadius: 12, width: "min(420px, calc(100vw - 24px))", padding: "36px 24px 28px", boxShadow: "0 16px 48px rgba(0,0,0,0.18)", textAlign: "center" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#fff0eb", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                    <i className="ti ti-trash" style={{ fontSize: 28, color: "#ff6b4a" }} />
                </div>
                <h6 style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>Delete Location</h6>
                <p style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>Are you sure you want to delete <b style={{ color: "#333" }}>{name}</b>?<br /><span style={{ fontSize: 12 }}>This action cannot be undone.</span></p>
                <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                    <button title="Cancel deletion" onClick={onClose} style={{ background: "#f4f4f4", border: "none", borderRadius: 8, padding: "9px 28px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Cancel</button>
                    <button title="Confirm delete — this cannot be undone" onClick={onConfirm} style={{ background: "#e41f07", color: "#fff", border: "none", borderRadius: 8, padding: "9px 28px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Delete</button>
                </div>
            </div>
        </>
    );
};

// ── Primary Confirmation Modal ───────────────────────────────────────────────
const PrimaryConfirmationModal = ({ show, name, onConfirm, onClose }: { show: boolean; name: string; onConfirm: () => void; onClose: () => void; }) => {
    if (!show) return null;
    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1040 }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 1050, background: "#fff", borderRadius: 12, width: "min(420px, calc(100vw - 24px))", padding: "36px 24px 28px", boxShadow: "0 16px 48px rgba(0,0,0,0.18)", textAlign: "center" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#fff8f7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                    <i className="ti ti-star-filled" style={{ fontSize: 28, color: "#fcc419" }} />
                </div>
                <h6 style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>Mark as Primary Location</h6>
                <p style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>Are you sure you want to set <b style={{ color: "#333" }}>{name}</b> as the primary location?<br /><span style={{ fontSize: 12 }}>This will replace the current primary location.</span></p>
                <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                    <button title="Cancel primary change" onClick={onClose} style={{ background: "#f4f4f4", border: "none", borderRadius: 8, padding: "9px 22px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Cancel</button>
                    <button title="Confirm mark as primary" onClick={onConfirm} style={{ background: "#e41f07", color: "#fff", border: "none", borderRadius: 8, padding: "9px 22px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Mark as Primary</button>
                </div>
            </div>
        </>
    );
};

// ── Success Toast ─────────────────────────────────────────────────────────────
const SuccessToast = ({ message, onClose }: { message: string, onClose: () => void }) => {
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div style={{ position: "fixed", right: 24, bottom: 24, zIndex: 2000, background: "#333", color: "#fff", padding: "12px 24px", borderRadius: 8, boxShadow: "0 8px 30px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: 12, fontSize: 14, animation: "slideUp 0.3s ease" }}>
            <i className="ti ti-circle-check-filled" style={{ color: "#4caf50", fontSize: 20 }} />
            {message}
            <i className="ti ti-x" style={{ cursor: "pointer", marginLeft: 8, opacity: 0.6 }} onClick={onClose} />
            <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </div>
    );
};

// ── Import Modal ──────────────────────────────────────────────────────────────
const ImportModal = ({ show, onClose, onImport }: { show: boolean; onClose: () => void; onImport: (rows: Omit<Location, "id">[]) => void; }) => {
    const [file, setFile] = useState<File | null>(null);
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (!show) { setFile(null); setError(""); } }, [show]);

    const downloadTemplate = () => {
        const csv = "Name,Type,ParentLocation,City,State,Country,Phone,PrimaryContact,TransactionSeries,DefaultTransactionSeries\nHead Office,Business,,Chennai,Tamil Nadu,India,9876543210,admin@example.com,Default Transaction Series,Default Transaction Series\n";
        saveAs(new Blob([csv], { type: "text/csv" }), "locations_template.csv");
    };

    const handleFile = (f: File) => {
        if (!f.name.endsWith(".csv")) { setError("Only CSV files are supported."); return; }
        setFile(f); setError("");
    };

    const handleImport = () => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const lines = (e.target?.result as string).split("\n").filter(l => l.trim());
                const rows: Omit<Location, "id">[] = lines.slice(1).map(line => {
                    const [name, type, parentLocation, city, state, country, phone, primaryContact, txnStr, defaultTxn] = line.split(",").map(s => s.trim());
                    return { name, type: (type === "Warehouse" ? "Warehouse" : "Business") as LocationType, parentLocation: parentLocation || "", address: "", street1: "", street2: "", city: city || "", pinCode: "", country: country || "India", state: state || "", phone: phone || "", fax: "", websiteUrl: "", primaryContact: primaryContact || "", txnSeries: txnStr ? [txnStr] : [], defaultTxnSeries: defaultTxn || "", isDefault: false, locationAccess: [] };
                }).filter(r => r.name);
                onImport(rows);
                onClose();
            } catch { setError("Failed to parse file. Please use the template."); }
        };
        reader.readAsText(file);
    };

    if (!show) return null;
    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1040 }} />
            <div className="import-modal" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 1050, background: "#fff", borderRadius: 12, width: 500, boxShadow: "0 16px 48px rgba(0,0,0,0.18)" }}>
                <div className="modal-header" style={{ padding: "18px 24px" }}>
                    <h6 className="modal-title" style={{ fontWeight: 700, fontSize: 17 }}>Import Locations</h6>
                    <button type="button" className="btn-close custom-btn-close border p-1 me-0 d-flex align-items-center justify-content-center rounded-circle" aria-label="Close" onClick={onClose}><i className="ti ti-x" /></button>
                </div>
                <div style={{ padding: "24px" }}>
                    <div style={{ background: "#fff0eb", border: "1px solid #ffc4b4", borderRadius: 8, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: "#333" }}>Download CSV Template</div>
                            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Use this template to fill in your location data</div>
                        </div>
                        <button title="Download CSV template file" onClick={downloadTemplate} style={{ background: "#e41f07", color: "#fff", border: "none", borderRadius: 7, padding: "7px 16px", fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                            <i className="ti ti-download me-1" />Download
                        </button>
                    </div>
                    <div
                        onDragOver={e => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                        onClick={() => fileRef.current?.click()}
                        style={{ border: `2px dashed ${dragging ? "#ff6b4a" : "#e3e3e3"}`, borderRadius: 10, padding: "36px 20px", textAlign: "center", cursor: "pointer", background: dragging ? "#fff0eb" : "#fafafa", transition: "all 0.15s", marginBottom: 16 }}>
                        <i className="ti ti-upload" style={{ fontSize: 36, color: dragging ? "#ff6b4a" : "#ccc", display: "block", marginBottom: 10 }} />
                        {file
                            ? <div><div style={{ fontWeight: 600, color: "#333", fontSize: 14 }}>{file.name}</div><div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{(file.size / 1024).toFixed(1)} KB</div></div>
                            : <div><div style={{ fontWeight: 600, color: "#555", fontSize: 14 }}>Drag & drop CSV file here</div><div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>or click to browse</div></div>
                        }
                        <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                    </div>
                    {error && <div style={{ color: "#ff6b4a", fontSize: 12, marginBottom: 12 }}><i className="ti ti-alert-circle me-1" />{error}</div>}
                    <p style={{ fontSize: 12, color: "#aaa", marginBottom: 0 }}>Supported format: CSV · Max 500 rows per import</p>
                </div>
                <div style={{ borderTop: "1px solid #f0f0f0", padding: "14px 24px", display: "flex", gap: 10 }}>
                    <button title={file ? "Import selected CSV file" : "Select a CSV file first"} onClick={handleImport} disabled={!file} style={{ background: file ? "#e41f07" : "#f0f0f0", color: file ? "#fff" : "#aaa", border: "none", borderRadius: 8, padding: "9px 28px", fontWeight: 600, cursor: file ? "pointer" : "not-allowed", fontSize: 13 }}>Import</button>
                    <button title="Cancel import" onClick={onClose} style={{ background: "#f4f4f4", color: "#555", border: "none", borderRadius: 8, padding: "9px 28px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Cancel</button>
                </div>
            </div>
        </>
    );
};

// ── State Searchable Dropdown ─────────────────────────────────────────────────
const StateSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ(""); } };
        document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
    }, []);
    const filtered = INDIA_STATES.filter(s => s.toLowerCase().includes(q.toLowerCase()));
    return (
        <div style={{ position: "relative" }} ref={ref}>
            <div onClick={() => setOpen(o => !o)} style={{ ...inp, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}>
                <span style={{ color: value ? "#333" : "#bbb" }}>{value || "Select State / Union Territory"}</span>
                <i className="ti ti-chevron-down" style={{ fontSize: 13, color: "#aaa", transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }} />
            </div>
            {open && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #e3e3e3", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 400, overflowX: "hidden", overflowY: "hidden" }}>
                    <div style={{ padding: "8px 10px", borderBottom: "1px solid #f0f0f0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f7f7f7", borderRadius: 6, padding: "5px 10px" }}>
                            <i className="ti ti-search" style={{ fontSize: 13, color: "#aaa" }} />
                            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" style={{ border: "none", background: "none", outline: "none", fontSize: 13, width: "100%", color: "#333" }} />
                        </div>
                    </div>
                    <div style={{ maxHeight: 200, overflowX: "hidden", overflowY: "auto" }}>
                        {filtered.length === 0
                            ? <div style={{ padding: "12px 14px", fontSize: 13, color: "#aaa" }}>No results found</div>
                            : filtered.map(s => (
                                <div key={s} onClick={() => { onChange(s); setOpen(false); setQ(""); }}
                                    style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", background: value === s ? "#e41f07" : "#fff", color: value === s ? "#fff" : "#555", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    {s}{value === s && <i className="ti ti-check" style={{ fontSize: 13 }} />}
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Transaction Series Searchable Dropdown ────────────────────────────────────
const TransactionSeriesSelect = ({ value, onChange, options, label, required, hasSearch = true, onAddSeries }: {
    value: string; onChange: (v: string) => void; options: string[]; label: string; required?: boolean; hasSearch?: boolean; onAddSeries?: () => void;
}) => {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const ref = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ(""); } };
        document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
    }, []);

    useEffect(() => {
        if (open && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
    }, [open]);

    const filtered = options.filter(opt => opt.toLowerCase().includes(q.toLowerCase()));
    return (
        <div style={{ marginBottom: 14, position: "relative" }} ref={ref}>
            <label style={lbl(required)}>{label}{required && " *"}</label>
            <div onClick={() => setOpen(o => !o)} style={{ ...inp, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none", border: "1px solid #e3e3e3" }}>
                <span style={{ color: value ? "#333" : "#bbb" }}>{value || `Select ${label.toLowerCase()}…`}</span>
                <i className="ti ti-chevron-down" style={{ fontSize: 13, color: "#aaa", transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }} />
            </div>
            {open && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #e3e3e3", borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", zIndex: 400, overflow: "hidden" }}>
                    {hasSearch && (
                        <div style={{ padding: "10px 10px", borderBottom: "1px solid #f0f0f0", background: "#fafafa" }}>
                            <input
                                ref={searchInputRef}
                                value={q}
                                onChange={e => setQ(e.target.value)}
                                placeholder="Search transaction series…"
                                style={{ width: "100%", border: "1px solid #e0e0e0", borderRadius: 6, padding: "8px 12px", fontSize: 13, outline: "none", transition: "all 0.2s", color: "#333", backgroundColor: "#fff" }}
                                onFocus={(e) => e.currentTarget.style.borderColor = "#e41f07"}
                                onBlur={(e) => e.currentTarget.style.borderColor = "#e0e0e0"}
                            />
                        </div>
                    )}
                    <div style={{ maxHeight: 240, overflowX: "hidden", overflowY: "auto" }}>
                        {filtered.length === 0
                            ? <div style={{ padding: "16px 14px", fontSize: 13, color: "#aaa", textAlign: "center" }}>
                                <i className="ti ti-search" style={{ fontSize: 20, color: "#ddd", display: "block", marginBottom: 6 }} />
                                No series found
                            </div>
                            : filtered.map(opt => (
                                <div key={opt} onClick={() => { onChange(opt); setOpen(false); setQ(""); }}
                                    style={{ padding: "11px 14px", fontSize: 13, cursor: "pointer", background: value === opt ? "#e41f07" : "#fff", color: value === opt ? "#fff" : "#555", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f5f5f5", transition: "all 0.15s" }}
                                    onMouseEnter={(e) => !value || value !== opt ? (e.currentTarget.style.background = "#fff8f7") : undefined}
                                    onMouseLeave={(e) => !value || value !== opt ? (e.currentTarget.style.background = "#fff") : undefined}>
                                    <span>{opt}</span>
                                    {value === opt && <i className="ti ti-check" style={{ fontSize: 14, fontWeight: 700 }} />}
                                </div>
                            ))}
                    </div>
                    {onAddSeries && (
                        <div style={{ borderTop: "1px solid #f0f0f0", padding: "8px" }}>
                            <button onClick={() => { onAddSeries(); setOpen(false); setQ(""); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 14px", fontSize: 13, color: "#e41f07", background: "#fff", border: "none", cursor: "pointer", fontWeight: 600, transition: "all 0.2s" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#fff8f7")}
                                onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                                <i className="ti ti-plus" style={{ fontSize: 14 }} />Add Transaction Series
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Location Modal ────────────────────────────────────────────────────────────
const LocationModal = ({ show, onClose, onSave, editData, seriesList, businessLocations, onAddSeries, showSeriesModal: propShowSeriesModal, setShowSeriesModal: propSetShowSeriesModal, onSaveNewSeries, locationNamesForSeries, renderMode = "modal" }: {
    show: boolean; onClose: () => void; onSave: (d: Omit<Location, "id">) => void;
    editData: Location | null; seriesList: TxnSeries[]; businessLocations: string[];
    onAddSeries?: () => void; showSeriesModal?: boolean; setShowSeriesModal?: (v: boolean) => void;
    onSaveNewSeries?: (d: Omit<TxnSeries, "id">) => void; locationNamesForSeries?: string[];
    renderMode?: "modal" | "page";
}) => {
    const isMobile = useResponsive();
    const [form, setForm] = useState<Omit<Location, "id">>(EMPTY_LOC);
    const [isChild, setIsChild] = useState(false);
    const [parentDropOpen, setParentDropOpen] = useState(false);
    const [logoMode, setLogoMode] = useState<"org" | "custom">("org");
    const [logoDropOpen, setLogoDropOpen] = useState(false);
    const [localShowSeriesModal, setLocalShowSeriesModal] = useState(false);
    const [editSeriesData, setEditSeriesData] = useState<TxnSeries | null>(null);
    const logoDropRef = useRef<HTMLDivElement>(null);
    const parentDropRef = useRef<HTMLDivElement>(null);

    const showSeriesModalState = propShowSeriesModal ?? localShowSeriesModal;
    const setShowSeriesModalState = propSetShowSeriesModal ?? setLocalShowSeriesModal;

    useEffect(() => {
        const loc = editData ? { ...editData } : { ...EMPTY_LOC };
        setForm(loc);
        setIsChild(!!loc.parentLocation);
        setLogoMode(editData?.logo ? "custom" : "org");
    }, [editData, show]);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (parentDropRef.current && !parentDropRef.current.contains(e.target as Node)) setParentDropOpen(false); };
        document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
    }, []);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (logoDropRef.current && !logoDropRef.current.contains(e.target as Node)) setLogoDropOpen(false); };
        document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
    }, []);

    if (!show) return null;

    const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));
    const isWarehouse = form.type === "Warehouse";
    const sNames = seriesList.map(s => s.name);
    const seriesLocationNames = locationNamesForSeries ?? [];
    const isPageMode = renderMode === "page";

    const handleTypeChange = (t: LocationType) => {
        if (t === "Warehouse") setForm(f => ({ ...f, type: "Warehouse", txnSeries: [], defaultTxnSeries: sNames[0] ?? "" }));
        else setForm(f => ({ ...f, type: "Business", parentLocation: "", txnSeries: [], defaultTxnSeries: "" }));
    };

    const handleNestedSeriesSave = (series: Omit<TxnSeries, "id">) => {
        onSaveNewSeries?.(series);
        setForm(prev => {
            const nextTxnSeries = prev.txnSeries.includes(series.name)
                ? prev.txnSeries
                : [...prev.txnSeries, series.name];
            return { ...prev, txnSeries: nextTxnSeries, defaultTxnSeries: prev.defaultTxnSeries || series.name };
        });
        setShowSeriesModalState(false);
    };

    const row2 = (a: React.ReactNode, b: React.ReactNode) => (
        <div className="loc-addr-grid" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: isMobile ? 12 : 16, marginBottom: 14 }}>
            {a}{b}
        </div>
    );
    const field = (labelText: string, node: React.ReactNode, req = false) => (
        <div>
            <label style={lbl(req)}>{labelText}{req && " *"}</label>
            {node}
        </div>
    );

    const shellStyle: React.CSSProperties = isPageMode
        ? { background: "#fff", borderRadius: 14, border: "1px solid #f0f0f0", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", width: "100%", overflow: "hidden", display: "flex", flexDirection: "column", fontFamily: "var(--crms-body-font-family, 'Golos Text', sans-serif)" }
        : { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 1050, background: "#fff", borderRadius: 12, width: isMobile ? "calc(100vw - 24px)" : 620, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.20)", display: "flex", flexDirection: "column" };
    const headerStyle: React.CSSProperties = isPageMode
        ? { padding: isMobile ? "18px 16px" : "20px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff" }
        : { position: "sticky", top: 0, background: "#fff", zIndex: isMobile ? 1000 : 2, padding: isMobile ? "14px 16px" : "16px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" };
    const bodyStyle: React.CSSProperties = isPageMode
        ? { padding: isMobile ? "16px 14px" : "24px", flex: 1 }
        : { padding: isMobile ? "14px 12px" : "22px 24px", flex: 1, overflowY: "auto" };
    const footerStyle: React.CSSProperties = isPageMode
        ? { borderTop: "1px solid #f0f0f0", padding: "16px 24px", display: "flex", gap: 10, flexDirection: "row", background: "#fff" }
        : { position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid #f0f0f0", padding: "14px 16px", display: "flex", gap: 10, flexDirection: "row" };

    return (
        <>
            {!isPageMode && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1040 }} />}
            <div className={isPageMode ? "loc-page" : "loc-modal"} style={shellStyle}>

                {/* Header */}
                <div className="modal-header" style={headerStyle}>
                    <h6 className="modal-title" style={{ fontWeight: 700, fontSize: isMobile ? 15 : 16, margin: 0, flex: 1 }}>{editData ? "Update Location" : "Add Location"}</h6>
                    {!isPageMode && <button type="button" className="btn-close custom-btn-close border p-1 me-0 d-flex align-items-center justify-content-center rounded-circle" aria-label="Close" onClick={onClose}><i className="ti ti-x" /></button>}
                </div>

                {/* Body */}
                <div style={bodyStyle}>
                    {/* Location Type */}
                    <div style={{ marginBottom: isMobile ? 18 : 24 }}>
                        <label style={{ fontSize: 13, fontWeight: 500, color: "#222", marginBottom: 14, display: "block" }}>Location Type</label>
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 360px))", gap: 26, alignItems: "stretch" }}>
                            {([
                                { t: "Business" as LocationType, label: "Business Location", icon: "ti-building-store", desc: "A Business Location represents your organization or office's operational location. It is used to record transactions, assess regional performance, and monitor stock levels for items stored at this location." },
                                { t: "Warehouse" as LocationType, label: "Warehouse Only Location", icon: "ti-building-warehouse", desc: "A Warehouse Only Location refers to where your items are stored. It helps track and monitor stock levels for items stored at this location." },
                            ]).map(({ t, label, icon, desc }) => {
                                const sel = form.type === t;
                                return (
                                    <label key={t} style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", padding: isMobile ? "14px 16px" : "14px 18px", border: `1px solid ${sel ? "#e41f07" : "#d9dce8"}`, borderRadius: 12, background: "#fff", minHeight: isMobile ? undefined : 148, transition: "all 0.15s ease", boxShadow: sel ? "0 0 0 1px rgba(228,31,7,0.08)" : "none" }}>
                                        <input type="radio" name="locationType" checked={sel} onChange={() => handleTypeChange(t)} style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#e41f07", marginTop: 1, flexShrink: 0 }} />
                                        <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                                                <i className={`ti ${icon}`} style={{ fontSize: 15, color: sel ? "#e41f07" : "#6b7280", flexShrink: 0 }} />
                                                <span style={{ fontWeight: 700, fontSize: isMobile ? 12.5 : 13, color: "#111827" }}>{label}</span>
                                            </div>
                                            <p style={{ fontSize: isMobile ? 11 : 12, color: "#667085", margin: 0, lineHeight: 1.55 }}>{desc}</p>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Logo */}
                    {!isWarehouse && <div style={{ marginBottom: isMobile ? 12 : 14 }} ref={logoDropRef}>
                        <label style={lbl()}>Logo</label>
                        <div style={{ position: "relative" }}>
                            <div onClick={() => setLogoDropOpen(o => !o)} style={{ ...inp, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}>
                                <span>{logoMode === "org" ? "Same as Organization Logo" : "Upload a New Logo"}</span>
                                <i className="ti ti-chevron-down" style={{ fontSize: 13, color: "#aaa", transition: "transform 0.15s", transform: logoDropOpen ? "rotate(180deg)" : "none" }} />
                            </div>
                            {logoDropOpen && (
                                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #e3e3e3", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 300, overflow: "hidden" }}>
                                    {[{ key: "org", label: "Same as Organization Logo" }, { key: "custom", label: "Upload a New Logo" }].map((opt, i, arr) => (
                                        <div key={opt.key} onClick={() => { setLogoMode(opt.key as "org" | "custom"); setLogoDropOpen(false); if (opt.key === "org") set("logo", ""); }}
                                            style={{ padding: "11px 14px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", background: logoMode === opt.key ? "#e41f07" : "#fff", color: logoMode === opt.key ? "#fff" : "#333", borderBottom: i < arr.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                                            {opt.label}
                                            {logoMode === opt.key && <i className="ti ti-check" style={{ fontSize: 14 }} />}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {logoMode === "custom" && (
                            <div style={{ marginTop: 10, display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", gap: isMobile ? 12 : 14 }}>
                                <div onClick={() => document.getElementById("loc-logo-input")?.click()} style={{ width: isMobile ? "100%" : 70, height: isMobile ? 120 : 70, border: "2px dashed #d0d0d0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", background: "#fafafa", flexShrink: 0 }}>
                                    {form.logo ? <img src={form.logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <div style={{ textAlign: "center" }}><i className="ti ti-camera-plus" style={{ fontSize: isMobile ? 32 : 24, color: "#ccc", display: "block", marginBottom: 4 }} /><span style={{ fontSize: 11, color: "#bbb" }}>Tap to upload</span></div>}
                                </div>
                                <div style={{ flex: isMobile ? 1 : undefined }}>
                                    <button type="button" onClick={() => document.getElementById("loc-logo-input")?.click()} style={{ border: "1px solid #d0d0d0", borderRadius: 6, padding: isMobile ? "10px 12px" : "7px 16px", fontSize: 13, background: "#fff", cursor: "pointer", color: "#555", display: "flex", alignItems: "center", gap: 6, width: isMobile ? "100%" : "auto", justifyContent: isMobile ? "center" : "flex-start" }}>
                                        <i className="ti ti-upload" style={{ fontSize: 13 }} /> {isMobile ? "Upload" : "Upload Image"}
                                    </button>
                                    {form.logo && <button type="button" onClick={() => set("logo", "")} style={{ marginTop: 6, border: "none", background: "none", color: "#e41f07", fontSize: 12, cursor: "pointer", padding: 0, width: "100%", textAlign: "left" }}>Remove Logo</button>}
                                    <p style={{ fontSize: 11, color: "#aaa", margin: isMobile ? "8px 0 0" : "6px 0 0", lineHeight: 1.4 }}>PNG, JPG, SVG, WebP — max 5 MB</p>
                                </div>
                                <input id="loc-logo-input" type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 5242880) { alert("Image must be under 5 MB"); return; } const r = new FileReader(); r.onload = ev => set("logo", ev.target?.result as string); r.readAsDataURL(f); e.target.value = ""; }} />
                            </div>
                        )}
                    </div>}

                    {row2(
                        field("Name", <input style={inp} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Location Name" />, true),
                        field("Primary Contact", <input style={inp} value={form.primaryContact} onChange={e => set("primaryContact", e.target.value)} placeholder="Email or name" />, !isWarehouse)
                    )}

                    {/* Child Location checkbox */}
                    {!isWarehouse && (
                        <div style={{ marginBottom: isMobile ? 12 : 14 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
                                <input type="checkbox" checked={isChild} onChange={e => { setIsChild(e.target.checked); if (!e.target.checked) set("parentLocation", ""); }} style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#e41f07" }} />
                                <span style={{ fontSize: 13, color: "#444" }}>This is a Child Location</span>
                            </label>
                        </div>
                    )}

                    {/* Parent Location */}
                    {(isWarehouse || isChild) && (
                        <div style={{ marginBottom: 14 }} ref={parentDropRef}>
                            <label style={lbl(true)}>Parent Location <span style={{ color: "#e41f07" }}>*</span></label>
                            <div style={{ position: "relative" }}>
                                <div style={{ ...inp, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }} onClick={() => setParentDropOpen(o => !o)}>
                                    <span style={{ color: form.parentLocation ? "#333" : "#bbb" }}>{form.parentLocation || "Select Location"}</span>
                                    <i className="ti ti-chevron-down" style={{ fontSize: 13, color: "#aaa", transition: "transform 0.15s", transform: parentDropOpen ? "rotate(180deg)" : "none" }} />
                                </div>
                                {parentDropOpen && (
                                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #e3e3e3", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 400, overflow: "hidden" }}>
                                        <div style={{ padding: "8px 10px", borderBottom: "1px solid #f0f0f0" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f7f7f7", borderRadius: 6, padding: "5px 10px" }}>
                                                <i className="ti ti-search" style={{ fontSize: 13, color: "#aaa" }} />
                                                <input autoFocus placeholder="Search" style={{ border: "none", background: "none", outline: "none", fontSize: 13, width: "100%", color: "#333" }} onChange={e => { }} id="parent-loc-search" />
                                            </div>
                                        </div>
                                        <div style={{ maxHeight: 200, overflowX: "hidden", overflowY: "auto" }}>
                                            {businessLocations.filter(l => l !== form.name).map((l, i, arr) => (
                                                <div key={l} onClick={() => { set("parentLocation", l); setParentDropOpen(false); }}
                                                    style={{ padding: "11px 14px", fontSize: 13, cursor: "pointer", background: form.parentLocation === l ? "#e41f07" : "#fff", color: form.parentLocation === l ? "#fff" : "#333", borderBottom: i < arr.length - 1 ? "1px solid #f0f0f0" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                                    {l}
                                                    {form.parentLocation === l && <i className="ti ti-check" style={{ fontSize: 14 }} />}
                                                </div>
                                            ))}
                                            {businessLocations.filter(l => l !== form.name).length === 0 && (
                                                <div style={{ padding: "12px 14px", fontSize: 13, color: "#aaa" }}>No locations available</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Address Section */}
                    <div style={{ marginBottom: 14, border: "1px solid #f0f0f0", borderRadius: 8, padding: isMobile ? "14px 12px" : "16px" }}>
                        <p style={{ fontSize: isMobile ? 11 : 12, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px" }}>Address</p>
                        {row2(
                            field("Attention", <input style={inp} value={form.address} onChange={e => set("address", e.target.value)} placeholder="Attention" />),
                            field("Street 1", <input style={inp} value={form.street1} onChange={e => set("street1", e.target.value)} placeholder="Street 1" />)
                        )}
                        {row2(
                            field("City", <input style={inp} value={form.city} onChange={e => set("city", e.target.value)} placeholder="City" />),
                            field("Pin Code", <input style={inp} value={form.pinCode} onChange={e => set("pinCode", e.target.value)} placeholder="Pin Code" />)
                        )}
                        {row2(
                            field("Country / Region", <div style={{ position: "relative" }}>
                                <select style={{ ...inp, appearance: "none", paddingRight: 32 }} value={form.country} onChange={e => set("country", e.target.value)}>
                                    {["India", "United States", "United Kingdom", "Canada", "Australia", "Singapore", "UAE", "Germany", "France", "Japan"].map(c => <option key={c}>{c}</option>)}
                                </select>
                                <i className="ti ti-chevron-down" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#aaa", pointerEvents: "none" }} />
                            </div>),
                            field("State / Union Territory", form.country === "India"
                                ? <StateSelect value={form.state} onChange={v => set("state", v)} />
                                : <input style={inp} value={form.state} onChange={e => set("state", e.target.value)} placeholder="State / Province" />)
                        )}
                        {row2(
                            field("Phone", <input style={inp} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="Phone" />),
                            field("Fax Number", <input style={inp} value={form.fax} onChange={e => set("fax", e.target.value)} placeholder="Fax Number" />)
                        )}
                        {row2(
                            field("Street 2", <input style={inp} value={form.street2} onChange={e => set("street2", e.target.value)} placeholder="Street 2" />),
                            field("Website URL", <input style={inp} value={form.websiteUrl} onChange={e => set("websiteUrl", e.target.value)} placeholder="https://example.com" />)
                        )}
                    </div>

                    {/* Transaction Series */}
                    {!isWarehouse && (
                        <>
                            <TransactionSeriesSelect
                                label="Transaction Number Series"
                                value={form.defaultTxnSeries}
                                options={sNames}
                                onChange={v => {
                                    set("defaultTxnSeries", v);
                                    if (v && !form.txnSeries.includes(v)) set("txnSeries", [...form.txnSeries, v]);
                                }}
                                required
                                onAddSeries={onAddSeries}
                            />
                            <SeriesMultiSelect
                                label="Default Transaction Number Series"
                                value={form.txnSeries}
                                options={sNames}
                                onChange={v => {
                                    set("txnSeries", v);
                                    if (form.defaultTxnSeries && !v.includes(form.defaultTxnSeries)) {
                                        set("defaultTxnSeries", v.length === 1 ? v[0] : "");
                                    }
                                }}
                                required
                            />
                            {sNames.length === 0 && (
                                <div style={{ marginTop: "-8px", marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 12px", background: "#fef3f0", borderRadius: 6, border: "1px solid #fdd9d3" }}>
                                    <i className="ti ti-info-circle" style={{ fontSize: 14, color: "#e41f07", marginTop: 1, flexShrink: 0 }} />
                                    <p style={{ fontSize: 11, color: "#c72e1e", margin: 0, lineHeight: 1.4 }}>No transaction series available. Create a series first.</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Location Access */}
                    <div style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: 13, fontWeight: 500, color: "#222", marginBottom: 10, display: "block" }}>Location Access</label>
                        <div style={{ border: "1px solid #e8e8e8", borderRadius: 8, overflow: "hidden" }}>
                            <div style={{ padding: "10px 16px", borderBottom: "1px solid #e8e8e8", background: "#fff" }}>
                                <p style={{ margin: "0 0 2px", fontSize: 13, color: "#333", display: "flex", alignItems: "center", gap: 7 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4a90e2", display: "inline-block", flexShrink: 0 }} />
                                    <strong>{form.locationAccess.length} user(s) selected</strong>
                                </p>
                                <p style={{ margin: "0 0 0 15px", fontSize: 12, color: "#888" }}>Selected users can create and access transactions for this location.</p>
                            </div>
                            <div style={{ display: "flex", background: "#f9f9f9", padding: "8px 16px", borderBottom: "1px solid #e8e8e8" }}>
                                <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>Users</span>
                                <span style={{ width: 80, fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>Role</span>
                            </div>
                            {ORG_USERS.filter(u => form.locationAccess.includes(u.email)).map((u, idx, arr) => {
                                const removeUser = () => set("locationAccess", form.locationAccess.filter(e => e !== u.email));
                                return (
                                    <div key={u.email} style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: idx < arr.length - 1 ? "1px solid #f0f0f0" : "none", background: "#fff" }}>
                                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e8edf5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 12 }}>
                                            <i className="ti ti-user" style={{ fontSize: 18, color: "#8a9bbf" }} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#222" }}>{u.name}</p>
                                            <p style={{ margin: 0, fontSize: 11, color: "#999" }}>{u.email}</p>
                                        </div>
                                        <span style={{ width: 80, fontSize: 13, color: "#444" }}>{u.role}</span>
                                        <button type="button" onClick={removeUser} style={{ marginLeft: 12, width: 24, height: 24, borderRadius: "50%", border: "1px solid #ff6b6b", background: "#fff", color: "#ff4d4f", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                                            <i className="ti ti-x" style={{ fontSize: 12 }} />
                                        </button>
                                    </div>
                                );
                            })}
                            {form.locationAccess.length === 0 && (
                                <div style={{ padding: "14px 16px", fontSize: 12, color: "#999", background: "#fff" }}>No users selected</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={footerStyle}>
                    <button onClick={onClose} style={{ background: "#f4f4f4", color: "#555", border: "none", borderRadius: 8, padding: isPageMode ? "7px 18px" : "9px 28px", fontWeight: 600, cursor: "pointer", fontSize: isPageMode ? 12 : 14, flex: isPageMode ? "0 0 auto" : 1, minWidth: isPageMode ? 88 : undefined }}>Cancel</button>
                    <button onClick={() => { if (form.name.trim()) onSave(form); }} style={{ background: "#e41f07", color: "#fff", border: "none", borderRadius: 8, padding: isPageMode ? "7px 18px" : "9px 28px", fontWeight: 600, cursor: "pointer", fontSize: isPageMode ? 12 : 14, flex: isPageMode ? "0 0 auto" : 1, minWidth: isPageMode ? 88 : undefined }}>Save</button>
                </div>
            </div>

            {/* Nested Series Modal */}
            {propShowSeriesModal && locationNamesForSeries && (
                <SeriesModal
                    show={showSeriesModalState}
                    onClose={() => setShowSeriesModalState(false)}
                    onSave={handleNestedSeriesSave}
                    editData={editSeriesData}
                    locationNames={seriesLocationNames}
                    defaultLocation={form.name.trim()}
                />
            )}
        </>
    );
};

// ── Series Generator Modal ───────────────────────────────────────────────────
interface GeneratorRule {
    id: string;
    type: "Module Name" | "Custom Text" | "Financial Year" | "Serial Number";
    show?: "First" | "Last" | "Full";
    chars?: number;
    text?: string;
    letterCase: "Upper Case" | "Lower Case";
    separator: string;
}

const SeriesGeneratorModal = ({ show, onClose, onApply, moduleName }: {
    show: boolean; onClose: () => void; onApply: (prefix: string) => void; moduleName: string;
}) => {
    const isMobile = useResponsive();
    const [rules, setRules] = useState<GeneratorRule[]>([
        { id: "1", type: "Module Name", show: "First", chars: 3, letterCase: "Upper Case", separator: "-" }
    ]);

    useEffect(() => {
        if (show) {
            setRules([{ id: Math.random().toString(), type: "Module Name", show: "First", chars: 3, letterCase: "Upper Case", separator: "-" }]);
        }
    }, [show]);

    if (!show) return null;

    const addRule = () => setRules([...rules, { id: Math.random().toString(), type: "Custom Text", text: "", letterCase: "Upper Case", separator: "none" }]);
    const removeRule = (id: string) => setRules(rules.filter(r => r.id !== id));
    const updateRule = (id: string, updates: Partial<GeneratorRule>) => setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));

    const generatePreview = () => {
        return rules.map(rule => {
            let val = "";
            if (rule.type === "Module Name") {
                const base = moduleName.replace(/\s/g, "");
                if (rule.show === "Full") val = base;
                else if (rule.show === "First") val = base.substring(0, rule.chars || 3);
                else if (rule.show === "Last") val = base.substring(Math.max(0, base.length - (rule.chars || 3)));
            } else if (rule.type === "Financial Year") {
                val = "2024-25";
            } else if (rule.type === "Serial Number") {
                val = "00001";
            } else {
                val = rule.text || "";
            }

            if (rule.letterCase === "Upper Case") val = val.toUpperCase();
            if (rule.letterCase === "Lower Case") val = val.toLowerCase();

            const sep = rule.separator === "none" ? "" : rule.separator;
            return val + sep;
        }).join("");
    };

    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1100 }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 1110, background: "#fff", borderRadius: 12, width: isMobile ? "94%" : 780, maxHeight: "85vh", overflowX: "hidden", overflowY: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
                <div className="modal-header" style={{ padding: "18px 24px" }}>
                    <h6 className="modal-title" style={{ fontWeight: 700, fontSize: 17 }}>Customize Options</h6>
                    <button type="button" className="btn-close custom-btn-close border p-1 me-0 d-flex align-items-center justify-content-center rounded-circle" aria-label="Close" onClick={onClose}><i className="ti ti-x" /></button>
                </div>
                <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto" }}>
                    <div style={{ border: "1px solid #e3e3e3", borderRadius: 8, overflowX: "auto", WebkitOverflowScrolling: "touch", marginBottom: 16 }}>
                        <table style={{ width: "100%", minWidth: isMobile ? 600 : "auto", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: "#f8f9fb" }}>
                                    <th style={{ padding: "10px 16px", fontWeight: 600, color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #e8e8e8", textAlign: "left", width: "30%" }}>Select Attribute</th>
                                    <th style={{ padding: "10px 16px", fontWeight: 600, color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #e8e8e8", textAlign: "left", width: "25%" }}>Show</th>
                                    <th style={{ padding: "10px 16px", fontWeight: 600, color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #e8e8e8", textAlign: "left", width: "20%" }}>Letter Case</th>
                                    <th style={{ padding: "10px 16px", fontWeight: 600, color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #e8e8e8", textAlign: "left", width: "15%" }}>Separator</th>
                                    <th style={{ padding: "10px 16px", fontWeight: 600, color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #e8e8e8", textAlign: "center", width: "10%" }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rules.map((rule, i) => (
                                    <tr key={rule.id} style={{ borderBottom: i < rules.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                                        <td style={{ padding: "8px 16px", verticalAlign: "middle" }}>
                                            <select style={{ ...inp, height: 36, fontSize: 13, width: "100%" }} value={rule.type} onChange={e => updateRule(rule.id, { type: e.target.value as any })}>
                                                <option>Module Name</option>
                                                <option>Financial Year</option>
                                                <option>Serial Number</option>
                                                <option>Custom Text</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: "8px 16px", verticalAlign: "middle" }}>
                                            {rule.type === "Module Name" ? (
                                                <div style={{ display: "flex", gap: 6 }}>
                                                    <select style={{ ...inp, height: 36, fontSize: 13, flex: 1 }} value={rule.show} onChange={e => updateRule(rule.id, { show: e.target.value as any })}>
                                                        <option>First</option>
                                                        <option>Last</option>
                                                        <option>Full</option>
                                                    </select>
                                                    {rule.show !== "Full" && <input type="number" style={{ ...inp, width: 45, height: 36, padding: "0 6px", fontSize: 13 }} value={rule.chars} onChange={e => updateRule(rule.id, { chars: parseInt(e.target.value) || 0 })} />}
                                                </div>
                                            ) : rule.type === "Custom Text" ? (
                                                <input style={{ ...inp, height: 36, fontSize: 13, width: "100%" }} value={rule.text} onChange={e => updateRule(rule.id, { text: e.target.value })} placeholder="Custom text" />
                                            ) : (
                                                <span style={{ color: "#aaa", fontSize: 13, paddingLeft: 6 }}>N/A</span>
                                            )}
                                        </td>
                                        <td style={{ padding: "8px 16px", verticalAlign: "middle" }}>
                                            <select style={{ ...inp, height: 36, fontSize: 13, width: "100%" }} value={rule.letterCase} onChange={e => updateRule(rule.id, { letterCase: e.target.value as any })}>
                                                <option>Upper Case</option>
                                                <option>Lower Case</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: "8px 16px", verticalAlign: "middle" }}>
                                            <select style={{ ...inp, height: 36, fontSize: 13, width: "100%" }} value={rule.separator} onChange={e => updateRule(rule.id, { separator: e.target.value })}>
                                                <option value="none">(none)</option>
                                                <option>-</option>
                                                <option>/</option>
                                                <option>.</option>
                                                <option>_</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: "8px 16px", verticalAlign: "middle", textAlign: "center" }}>
                                            <button onClick={() => rules.length > 1 && removeRule(rule.id)} style={{ border: "none", background: "none", color: rules.length > 1 ? "#e41f07" : "#ccc", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: rules.length > 1 ? "pointer" : "default", padding: 0 }}>
                                                <i className="ti ti-circle-x" style={{ fontSize: 19 }} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button onClick={addRule} style={{ border: "none", background: "none", color: "#e41f07", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: 0 }}>
                        <i className="ti ti-plus" /> Add Attribute
                    </button>

                    <div style={{ marginTop: 12 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "#ef1111ff", padding: "3px 8px", borderRadius: 4, marginBottom: 8, display: "inline-block" }}>Series Preview</label>
                        <div style={{ background: "#fffdf5", border: "1.5px dashed #f5c760", borderRadius: 4, padding: "20px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 80 }}>
                            <span style={{ fontSize: 22, fontWeight: 700, color: "#333", letterSpacing: "1.5px" }}>{generatePreview() || "----"}</span>
                        </div>
                    </div>
                </div>
                <div style={{ padding: "16px 24px", borderTop: "1px solid #f0f0f0", background: "#fff", display: "flex", gap: 12 }}>
                    <button onClick={() => onApply(generatePreview())} style={{ background: "#e41f07", color: "#fff", border: "none", borderRadius: 6, padding: "7px 24px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Apply</button>
                    <button onClick={onClose} style={{ background: "#fff", color: "#555", border: "1px solid #ddd", borderRadius: 6, padding: "7px 24px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Cancel</button>
                </div>
            </div>
        </>
    );
};

// ── Add Module Modal ──────────────────────────────────────────────────────────
const AddModuleModal = ({ show, onClose, onAdd, existingModules }: {
    show: boolean; onClose: () => void; onAdd: (m: SeriesModule) => void; existingModules: SeriesModule[];
}) => {
    const isMobile = useResponsive();
    const availableDefaults = DEFAULT_MODULES.filter(dm => !existingModules.some(m => m.module === dm.module));
    const [selectedModule, setSelectedModule] = useState(availableDefaults.length > 0 ? availableDefaults[0].module : "");
    const [startingNumber, setStartingNumber] = useState("00001");
    const [rules, setRules] = useState<GeneratorRule[]>([
        { id: Math.random().toString(), type: "Module Name", show: "First", chars: 3, letterCase: "Upper Case", separator: "-" }
    ]);

    useEffect(() => {
        if (show) {
            const avail = DEFAULT_MODULES.filter(dm => !existingModules.some(m => m.module === dm.module));
            setSelectedModule(avail.length > 0 ? avail[0].module : "");
            setStartingNumber("00001");
            setRules([{ id: Math.random().toString(), type: "Module Name", show: "First", chars: 3, letterCase: "Upper Case", separator: "-" }]);
        }
    }, [show, existingModules]);

    if (!show) return null;

    const addRule = () => setRules([...rules, { id: Math.random().toString(), type: "Custom Text", text: "", letterCase: "Upper Case", separator: "none" }]);
    const removeRule = (id: string) => setRules(rules.filter(r => r.id !== id));
    const updateRule = (id: string, updates: Partial<GeneratorRule>) => setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));

    const generatePreview = () => {
        return rules.map(rule => {
            let val = "";
            if (rule.type === "Module Name") {
                const base = selectedModule.replace(/\s/g, "");
                if (rule.show === "Full") val = base;
                else if (rule.show === "First") val = base.substring(0, rule.chars || 3);
                else if (rule.show === "Last") val = base.substring(Math.max(0, base.length - (rule.chars || 3)));
            } else if (rule.type === "Financial Year") {
                val = "2024-25";
            } else if (rule.type === "Serial Number") {
                val = "00001";
            } else {
                val = rule.text || "";
            }
            if (rule.letterCase === "Upper Case") val = val.toUpperCase();
            if (rule.letterCase === "Lower Case") val = val.toLowerCase();
            const sep = rule.separator === "none" ? "" : rule.separator;
            return val + sep;
        }).join("");
    };

    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1100 }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 1110, background: "#fff", borderRadius: 12, width: isMobile ? "94%" : 780, maxHeight: "92vh", overflowX: "hidden", overflowY: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
                <div className="modal-header" style={{ padding: "18px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h6 className="modal-title" style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>Add Transaction Series</h6>
                    <button type="button" className="btn-close custom-btn-close border p-1 me-0 d-flex align-items-center justify-content-center rounded-circle" style={{ color: "#e41f07" }} aria-label="Close" onClick={onClose}><i className="ti ti-x" /></button>
                </div>
                <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto" }}>
                    <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: isMobile ? "wrap" : "nowrap" }}>
                        <div style={{ flex: 1, minWidth: isMobile ? "100%" : 0 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: "#e41f07", display: "block", marginBottom: 6 }}>Module Name*</label>
                            <select style={{ ...inp, width: "100%" }} value={selectedModule} onChange={e => setSelectedModule(e.target.value)}>
                                {availableDefaults.length === 0 && <option value="">No more modules available</option>}
                                {availableDefaults.map(m => <option key={m.module} value={m.module}>{m.module}</option>)}
                                <option value="Custom">Custom Module...</option>
                            </select>
                            {selectedModule === "Custom" && (
                                <input
                                    style={{ ...inp, width: "100%", marginTop: 8 }}
                                    placeholder="Enter custom module name"
                                    onChange={e => setSelectedModule(e.target.value)}
                                />
                            )}
                        </div>
                        <div style={{ flex: 1, minWidth: isMobile ? "100%" : 0 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: "#444", display: "block", marginBottom: 6 }}>Starting Number*</label>
                            <input style={{ ...inp, width: "100%" }} value={startingNumber} onChange={e => setStartingNumber(e.target.value)} placeholder="00001" />
                        </div>
                    </div>

                    <div style={{ border: "1px solid #e3e3e3", borderRadius: 8, overflowX: "auto", WebkitOverflowScrolling: "touch", marginBottom: 16 }}>
                        <table style={{ width: "100%", minWidth: isMobile ? 600 : "auto", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: "#f8f9fb" }}>
                                    <th style={{ padding: "10px 16px", fontWeight: 600, color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #e8e8e8", textAlign: "left", width: "30%" }}>Select Attribute</th>
                                    <th style={{ padding: "10px 16px", fontWeight: 600, color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #e8e8e8", textAlign: "left", width: "25%" }}>Show</th>
                                    <th style={{ padding: "10px 16px", fontWeight: 600, color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #e8e8e8", textAlign: "left", width: "20%" }}>Letter Case</th>
                                    <th style={{ padding: "10px 16px", fontWeight: 600, color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #e8e8e8", textAlign: "left", width: "15%" }}>Separator</th>
                                    <th style={{ padding: "10px 16px", fontWeight: 600, color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #e8e8e8", textAlign: "center", width: "10%" }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rules.map((rule, i) => (
                                    <tr key={rule.id} style={{ borderBottom: i < rules.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                                        <td style={{ padding: "8px 16px", verticalAlign: "middle" }}>
                                            <select style={{ ...inp, height: 36, fontSize: 13, width: "100%" }} value={rule.type} onChange={e => updateRule(rule.id, { type: e.target.value as any })}>
                                                <option>Module Name</option>
                                                <option>Financial Year</option>
                                                <option>Serial Number</option>
                                                <option>Custom Text</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: "8px 16px", verticalAlign: "middle" }}>
                                            {rule.type === "Module Name" ? (
                                                <div style={{ display: "flex", gap: 6 }}>
                                                    <select style={{ ...inp, height: 36, fontSize: 13, flex: 1 }} value={rule.show} onChange={e => updateRule(rule.id, { show: e.target.value as any })}>
                                                        <option>First</option>
                                                        <option>Last</option>
                                                        <option>Full</option>
                                                    </select>
                                                    {rule.show !== "Full" && <input type="number" style={{ ...inp, width: 45, height: 36, padding: "0 6px", fontSize: 13 }} value={rule.chars} onChange={e => updateRule(rule.id, { chars: parseInt(e.target.value) || 0 })} />}
                                                </div>
                                            ) : rule.type === "Custom Text" ? (
                                                <input style={{ ...inp, height: 36, fontSize: 13, width: "100%" }} value={rule.text} onChange={e => updateRule(rule.id, { text: e.target.value })} placeholder="Custom text" />
                                            ) : (
                                                <span style={{ color: "#aaa", fontSize: 13, paddingLeft: 6 }}>N/A</span>
                                            )}
                                        </td>
                                        <td style={{ padding: "8px 16px", verticalAlign: "middle" }}>
                                            <select style={{ ...inp, height: 36, fontSize: 13, width: "100%" }} value={rule.letterCase} onChange={e => updateRule(rule.id, { letterCase: e.target.value as any })}>
                                                <option>Upper Case</option>
                                                <option>Lower Case</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: "8px 16px", verticalAlign: "middle" }}>
                                            <select style={{ ...inp, height: 36, fontSize: 13, width: "100%" }} value={rule.separator} onChange={e => updateRule(rule.id, { separator: e.target.value })}>
                                                <option value="none">(none)</option>
                                                <option>-</option>
                                                <option>/</option>
                                                <option>.</option>
                                                <option>_</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: "8px 16px", verticalAlign: "middle", textAlign: "center" }}>
                                            <button onClick={() => rules.length > 1 && removeRule(rule.id)} style={{ border: "none", background: "none", color: rules.length > 1 ? "#e41f07" : "#ccc", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: rules.length > 1 ? "pointer" : "default", padding: 0 }}>
                                                <i className="ti ti-circle-x" style={{ fontSize: 19 }} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <button onClick={addRule} style={{ background: "none", border: "none", color: "#e41f07", padding: 0, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Add Attribute</button>
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#444", borderRadius: 4, padding: "3px 8px", background: "#fcfcfa", display: "inline-block", marginBottom: 8 }}>Series Preview</label>
                        <div style={{ background: "#fffdf8", border: "1.5px dashed #f5c760", borderRadius: 6, padding: "24px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 90 }}>
                            <span style={{ fontSize: 24, fontWeight: 700, color: "#333", letterSpacing: "1px" }}>{generatePreview()}{startingNumber}</span>
                        </div>
                    </div>
                </div>
                <div style={{ padding: "16px 24px", borderTop: "1px solid #f0f0f0", background: "#fcfcfc", display: "flex", gap: 12, justifyContent: "flex-end" }}>
                    <button onClick={() => { if (selectedModule) onAdd({ module: selectedModule, prefix: generatePreview(), startingNumber }); }} style={{ background: "#e41f07", color: "#fff", border: "none", borderRadius: 6, padding: "8px 24px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Apply</button>
                    <button onClick={onClose} style={{ background: "#fff", color: "#555", border: "1px solid #ddd", borderRadius: 6, padding: "8px 24px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Cancel</button>
                </div>
            </div>
        </>
    );
};

// ── Series Modal ──────────────────────────────────────────────────────────────
const SeriesModal = ({ show, onClose, onSave, editData, locationNames, defaultLocation = "" }: {
    show: boolean; onClose: () => void; onSave: (d: Omit<TxnSeries, "id">) => void; editData: TxnSeries | null; locationNames: string[]; defaultLocation?: string;
}) => {
    const isMobile = useResponsive();
    const [name, setName] = useState(editData ? editData.name : "");
    const [selectedLocation, setSelectedLocation] = useState(editData ? editData.locations[0] ?? "" : (locationNames.includes(defaultLocation) ? defaultLocation : ""));
    const [modules, setModules] = useState<SeriesModule[]>(editData ? editData.modules.map(m => ({ ...m })) : DEFAULT_MODULES.map(m => ({ ...m })));

    const [prefixAttributes, setPrefixAttributes] = useState<any[]>([
        { attribute: "Module Name", show: "First", count: 3, letterCase: "Upper Case", separator: "-" }
    ]);
    const [openLocDrop, setOpenLocDrop] = useState(false);
    const [locQuery, setLocQuery] = useState("");
    const [genModule, setGenModule] = useState<string | null>(null);
    const locDropRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (editData) {
            setName(editData.name);
            setSelectedLocation(editData.locations[0] ?? "");
            setModules(editData.modules.map(m => ({ ...m })));
        } else {
            setName("");
            setSelectedLocation(locationNames.includes(defaultLocation) ? defaultLocation : "");
            setModules(DEFAULT_MODULES.map(m => ({ ...m })));
        }
        setLocQuery("");
        setOpenLocDrop(false);
    }, [show, editData]);

    useEffect(() => {
        if (!openLocDrop) return;
        const handler = (e: MouseEvent) => {
            if (locDropRef.current && !locDropRef.current.contains(e.target as Node)) setOpenLocDrop(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [openLocDrop]);

    if (!show) return null;

    const setMod = (i: number, key: keyof SeriesModule, v: string) =>
        setModules(prev => prev.map((m, idx) => idx === i ? { ...m, [key]: v } : m));
    const filteredLocationNames = locationNames.filter(opt => opt.toLowerCase().includes(locQuery.toLowerCase()));

    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1040 }} />
            <div className="series-modal" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 1050, background: "#fff", borderRadius: 12, width: isMobile ? "calc(100vw - 24px)" : 880, maxHeight: "90vh", overflowX: "hidden", overflowY: "auto", boxShadow: "0 16px 48px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column" }}>
                <div className="modal-header" style={{ position: "sticky", top: 0, background: "#fff", zIndex: 2, padding: "16px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h6 className="modal-title" style={{ margin: 0, fontWeight: 500, fontSize: 18, color: "#333" }}>{editData ? "Edit Series" : "New Series"}</h6>
                    <button type="button" className="btn-close custom-btn-close border p-1 me-0 d-flex align-items-center justify-content-center rounded-circle" aria-label="Close" onClick={onClose}><i className="ti ti-x" /></button>
                </div>
                <div style={{ flex: 1, padding: "20px 24px", overflowX: "hidden", overflowY: "auto" }}>
                    <div style={{ display: "flex", gap: 20, marginBottom: 22, flexWrap: isMobile ? "wrap" : "nowrap" }}>
                        <div style={{ flex: 1, minWidth: isMobile ? "100%" : 0 }}>
                            <label style={lbl(true)}>Series Name</label>
                            <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Default Transaction Series" />
                        </div>
                        <div style={{ flex: 1, minWidth: isMobile ? "100%" : 0 }}>
                            <label style={lbl(true)}>Location</label>
                            <div style={{ position: "relative" }} ref={locDropRef}>
                                <div onClick={() => setOpenLocDrop(o => !o)} style={{ ...inp, minHeight: 38, cursor: "pointer", display: "flex", alignItems: "center", paddingRight: 30, position: "relative" }}>
                                    <span style={{ color: selectedLocation ? "#333" : "#bbb" }}>{selectedLocation || "Select Location"}</span>
                                    <i className="ti ti-chevron-down" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#aaa", fontSize: 13 }} />
                                </div>
                                {openLocDrop && (
                                    <div style={{ border: "1px solid #e3e3e3", borderRadius: 8, background: "#fff", position: "absolute", zIndex: 400, width: "100%", maxHeight: 200, overflowX: "hidden", overflowY: "auto", boxShadow: "0 6px 20px rgba(0,0,0,0.12)", marginTop: 3 }}>
                                        {filteredLocationNames.map(opt => (
                                            <div key={opt} onClick={() => { setSelectedLocation(opt); setOpenLocDrop(false); }} style={{ padding: "11px 14px", cursor: "pointer", fontSize: 13, background: selectedLocation === opt ? "#e41f07" : "#fff", color: selectedLocation === opt ? "#fff" : "#555", borderBottom: "1px solid #f5f5f5" }}>
                                                {opt}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ border: "1px solid #e3e3e3", borderRadius: 8, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                        <table style={{ width: "100%", minWidth: isMobile ? 800 : "auto", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#fafafa", borderBottom: "1px solid #e8e8e8" }}>
                                    <th style={{ padding: "11px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", width: "20%" }}>Module</th>
                                    <th style={{ padding: "11px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", width: "25%" }}>Prefix</th>
                                    <th style={{ padding: "11px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", width: "20%" }}>
                                        Starting Number <i className="ti ti-info-circle" title="The number from which the transaction numbering will begin" style={{ fontSize: 12, color: "#bbb", verticalAlign: "middle", cursor: "help" }} />
                                    </th>
                                    <th style={{ padding: "11px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", width: "20%" }}>
                                        Preview <i className="ti ti-info-circle" title="Prefix + Starting Number preview" style={{ fontSize: 12, color: "#bbb", verticalAlign: "middle", cursor: "help" }} />
                                    </th>
                                    <th style={{ padding: "11px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", width: "15%" }}>Customize</th>
                                </tr>
                            </thead>
                            <tbody>
                                {modules.map((m, i) => (
                                    <tr key={m.module} style={{ borderBottom: i < modules.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                                        <td style={{ padding: "10px 16px", fontSize: 13, color: "#333", whiteSpace: "nowrap" }}>{m.module}</td>
                                        <td style={{ padding: "8px 16px" }}>
                                            <input value={m.prefix} onChange={e => setMod(i, "prefix", e.target.value)} placeholder="Prefix" style={{ ...inp, fontSize: 13, padding: "6px 10px", width: "100%" }} />
                                        </td>
                                        <td style={{ padding: "8px 16px" }}>
                                            <input value={m.startingNumber} onChange={e => setMod(i, "startingNumber", e.target.value)} placeholder="00001" style={{ ...inp, fontSize: 13, padding: "6px 10px", width: "100%" }} />
                                        </td>
                                        <td style={{ padding: "10px 16px", fontSize: 13, color: "#333", whiteSpace: "nowrap" }}>{pvw(m.prefix, m.startingNumber)}</td>
                                        <td style={{ padding: "8px 16px" }}>
                                            <button onClick={() => setGenModule(m.module)} style={{ background: "none", border: "1px dashed #e41f07", borderRadius: 4, padding: "5px 10px", color: "#e41f07", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>+ Customize</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div style={{ position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid #f0f0f0", padding: "14px 24px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={() => { if (name.trim()) onSave({ name: name.trim(), locations: selectedLocation ? [selectedLocation] : [], modules }); }} style={{ background: "#e41f07", color: "#fff", border: "none", borderRadius: 8, padding: "7px 18px", fontWeight: 600, cursor: "pointer", fontSize: 12, minWidth: 88 }}>Save Series</button>
                    <button onClick={onClose} style={{ background: "#f4f4f4", color: "#555", border: "none", borderRadius: 8, padding: "7px 18px", fontWeight: 600, cursor: "pointer", fontSize: 12, minWidth: 88 }}>Cancel</button>
                </div>

                <SeriesGeneratorModal
                    show={!!genModule}
                    moduleName={genModule || ""}
                    onClose={() => setGenModule(null)}
                    onApply={(p) => {
                        const idx = modules.findIndex(m => m.module === genModule);
                        if (idx > -1) setMod(idx, "prefix", p);
                        setGenModule(null);
                    }}
                />
            </div>
        </>
    );
};

// ── Duplicate Settings Modal ────────────────────────────────────────────────
const DuplicateSettingsModal = ({ show, onClose, onSave, initValue = "All Fiscal Years" }: { show: boolean, onClose: () => void, onSave: (val: string) => void, initValue?: string }) => {
    const isMobile = useResponsive();
    const [val, setVal] = useState(initValue);

    useEffect(() => {
        if (show) setVal(initValue);
    }, [show, initValue]);

    if (!show) return null;

    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1040 }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 1050, background: "#fff", borderRadius: 12, width: isMobile ? "94%" : 560, boxShadow: "0 16px 48px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", fontFamily: "var(--crms-body-font-family, 'Golos Text', sans-serif)" }}>
                <div className="modal-header" style={{ padding: "18px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h6 className="modal-title" style={{ margin: 0, fontWeight: 500, fontSize: 17, color: "#333" }}>Prevent Duplicate Transaction Numbers</h6>
                    <button type="button" className="btn-close custom-btn-close border p-1 me-0 d-flex align-items-center justify-content-center rounded-circle" aria-label="Close" onClick={onClose}><i className="ti ti-x" /></button>
                </div>
                <div style={{ padding: "24px", color: "#444" }}>
                    <p style={{ fontSize: 14, marginBottom: 16 }}>Prevent duplicate transaction numbers for</p>

                    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 16 }}>
                        <input type="radio" name="dupPolicy" checked={val === "This Fiscal Year"} onChange={() => setVal("This Fiscal Year")} style={{ width: 16, height: 16, accentColor: "#e41f07", marginTop: 2, flexShrink: 0 }} />
                        <div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: val === "This Fiscal Year" ? "#222" : "#555", display: "block", marginBottom: 4 }}>This Fiscal Year</span>
                            <span style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>You cannot save the transactions with duplicate transaction numbers during this fiscal year.</span>
                        </div>
                    </label>

                    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                        <input type="radio" name="dupPolicy" checked={val === "All Fiscal Years"} onChange={() => setVal("All Fiscal Years")} style={{ width: 16, height: 16, accentColor: "#e41f07", marginTop: 2, flexShrink: 0 }} />
                        <div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: val === "All Fiscal Years" ? "#222" : "#555", display: "block", marginBottom: 4 }}>All Fiscal Years</span>
                            <span style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>You cannot save the transactions with duplicate transaction numbers in the current or any future fiscal year.</span>
                        </div>
                    </label>
                </div>
                <div style={{ padding: "16px 24px", borderTop: "1px solid #f0f0f0", display: "flex" }}>
                    <button onClick={() => { onSave(val); onClose(); }} style={{ background: "#e41f07", color: "#fff", border: "none", borderRadius: 6, padding: "7px 20px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Save</button>
                </div>
            </div>
        </>
    );
};

// ── Transaction Series View ───────────────────────────────────────────────────
const TxnSeriesView = ({ seriesList, locationNames, onBack, onAdd, onUpdate, onDelete }: {
    seriesList: TxnSeries[]; locationNames: string[]; onBack: () => void;
    onAdd: (d: Omit<TxnSeries, "id">) => void; onUpdate: (id: number, d: Omit<TxnSeries, "id">) => void; onDelete: (id: number) => void;
}) => {
    const isMobile = useResponsive();
    const [subView, setSubView] = useState<"list" | "edit">("list");
    const [editData, setEditData] = useState<TxnSeries | null>(null);
    const [delTarget, setDelTarget] = useState<TxnSeries | null>(null);
    const [name, setName] = useState("");
    const [locs, setLocs] = useState<string[]>([]);
    const [modules, setModules] = useState<SeriesModule[]>(DEFAULT_MODULES.map(m => ({ ...m })));
    const [openLocDrop, setOpenLocDrop] = useState(false);
    const [openCatDrop, setOpenCatDrop] = useState(false);
    const [genModule, setGenModule] = useState<string | null>(null);
    const [showDupModal, setShowDupModal] = useState(false);
    const [dupSetting, setDupSetting] = useState("All Fiscal Years");
    const [seriesCategory, setSeriesCategory] = useState("");
    const [seriesCategories, setSeriesCategories] = useState<string[]>(INIT_SERIES_CATEGORIES);
    const [seriesCatSearch, setSeriesCatSearch] = useState("");
    const [showManageCatModal, setShowManageCatModal] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [showAddModModal, setShowAddModModal] = useState(false);
    const [insertAfterIdx, setInsertAfterIdx] = useState<number | null>(null);
    const [newSeriesCatName, setNewSeriesCatName] = useState("");
    const [editingSeriesCatIdx, setEditingSeriesCatIdx] = useState<number | null>(null);
    const locDropRef = useRef<HTMLDivElement>(null);
    const catDropRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!openLocDrop && !openCatDrop) return;
        const handler = (e: MouseEvent) => {
            if (locDropRef.current && !locDropRef.current.contains(e.target as Node)) setOpenLocDrop(false);
            if (catDropRef.current && !catDropRef.current.contains(e.target as Node)) setOpenCatDrop(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [openLocDrop, openCatDrop]);

    const handleSaveNewSeries = (d: Omit<TxnSeries, "id">) => {
        if (editData) onUpdate(editData.id, d); else onAdd(d);
        setSubView("list"); setEditData(null); setName(""); setLocs([]); setModules(DEFAULT_MODULES.map(m => ({ ...m })));
    };

    const openEditPage = (s: TxnSeries) => { setEditData(s); setName(s.name); setLocs(s.locations); setModules(s.modules.map(m => ({ ...m }))); setSubView("edit"); };
    const openNewPage = () => { setEditData(null); setName(""); setLocs([]); setModules(DEFAULT_MODULES.map(m => ({ ...m }))); setSubView("edit"); };
    const goBackToList = () => { setSubView("list"); setEditData(null); };
    const setMod = (i: number, key: keyof SeriesModule, v: string) => setModules(prev => prev.map((m, idx) => idx === i ? { ...m, [key]: v } : m));

    if (subView === "edit") {
        return (
            <div className="page-wrapper"><div className="content">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                        <button onClick={goBackToList} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", fontSize: 20, color: "#888", display: "flex", alignItems: "center" }}>
                            <i className="ti ti-arrow-left" />
                        </button>
                        <div style={{ minWidth: 0 }}>
                            <h4 style={{ margin: 0, fontWeight: 600, fontSize: isMobile ? 18 : 22 }}>{editData ? "Edit Series" : "New Series"}</h4>
                            <nav style={{ fontSize: 12, color: "#aaa", marginTop: 3 }}>
                                <span style={{ cursor: "pointer", color: "#0f0a09", fontSize: 14 }} onClick={onBack}>Locations</span>
                                <span style={{ margin: "0 5px" }}>›</span>
                                <span style={{ cursor: "pointer", color: "#060404", fontSize: 14 }} onClick={goBackToList}>Transaction Series</span>
                                <span style={{ margin: "0 5px" }}>›</span>
                                <span style={{ fontSize: 14 }}>{editData ? "Edit" : "New"}</span>
                            </nav>
                        </div>
                    </div>
                </div>
                <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflowX: "hidden", overflowY: "hidden", border: "1px solid #f0f0f0", padding: isMobile ? "16px 12px" : "28px 24px" }}>
                    <div style={{ marginBottom: 22, display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 8 : 40 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "#e41f07", width: isMobile ? "100%" : 140, flexShrink: 0 }}>Series Name *</label>
                        <input style={{ ...inp, flex: 1, maxWidth: isMobile ? "100%" : "100%", width: "100%" }} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Default Transaction Series" />
                    </div>
                    <div style={{ marginBottom: 22, display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 8 : 40 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "#444", width: isMobile ? "100%" : 140, flexShrink: 0 }}>Location</label>
                        <div style={{ position: "relative", flex: 1, maxWidth: isMobile ? "100%" : "100%", width: "100%" }} ref={locDropRef}>
                            <div onClick={() => setOpenLocDrop(o => !o)} style={{ ...inp, minHeight: 38, cursor: "pointer", display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center", paddingRight: 30, position: "relative", border: openLocDrop ? "1px solid #e41f07" : inp.border }}>
                                {locs.length === 0
                                    ? <span style={{ color: "#bbb" }}>Select Location</span>
                                    : locs.map(v => (
                                        <span key={v} style={{ background: "#fff0eb", color: "#e41f07", borderRadius: 4, padding: "2px 8px", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                                            {v}
                                            <i className="ti ti-x" style={{ fontSize: 10, cursor: "pointer" }} onClick={e => { e.stopPropagation(); setLocs(locs.filter(l => l !== v)); }} />
                                        </span>
                                    ))
                                }
                                <i className="ti ti-chevron-down" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#aaa", fontSize: 13 }} />
                            </div>
                            {openLocDrop && (
                                <div style={{ border: "1px solid #e3e3e3", borderRadius: 8, background: "#fff", position: "absolute", zIndex: 400, width: "100%", maxHeight: 200, overflowX: "hidden", overflowY: "auto", boxShadow: "0 6px 20px rgba(0,0,0,0.12)", marginTop: 3 }}>
                                    {locationNames.map(opt => (
                                        <div key={opt} onClick={() => { const newLocs = locs.includes(opt) ? locs.filter(l => l !== opt) : [...locs, opt]; setLocs(newLocs); setOpenLocDrop(false); }} style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between", background: locs.includes(opt) ? "#fff0eb" : "#fff", color: locs.includes(opt) ? "#e41f07" : "#555", borderBottom: "1px solid #f5f5f5" }}>
                                            <span>{opt}</span>
                                            {locs.includes(opt) && <i className="ti ti-check" style={{ fontSize: 13, fontWeight: 700 }} />}
                                        </div>
                                    ))}
                                    {locationNames.length === 0 && <div style={{ padding: "10px 14px", color: "#bbb", fontSize: 13 }}>No locations available</div>}
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={{ marginBottom: 22, display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 8 : 40 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "#444", width: isMobile ? "100%" : 140, flexShrink: 0 }}>Category</label>
                        <div style={{ position: "relative", flex: 1, maxWidth: isMobile ? "100%" : "100%", width: "100%" }} ref={catDropRef}>
                            <div onClick={() => setOpenCatDrop(o => !o)} style={{ ...inp, minHeight: 38, cursor: "pointer", display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center", paddingRight: 30, position: "relative", border: openCatDrop ? "1px solid #e41f07" : inp.border }}>
                                {!seriesCategory
                                    ? <span style={{ color: "#bbb" }}>Select or type to create a category</span>
                                    : (
                                        <span style={{ background: "#fff0eb", color: "#e41f07", borderRadius: 4, padding: "2px 8px", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                                            {seriesCategory}
                                            <i className="ti ti-x" style={{ fontSize: 10, cursor: "pointer" }} onClick={e => { e.stopPropagation(); setSeriesCategory(""); }} />
                                        </span>
                                    )
                                }
                                <i className="ti ti-chevron-down" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#aaa", fontSize: 13 }} />
                            </div>
                            {openCatDrop && (
                                <div style={{ border: "1px solid #e3e3e3", borderRadius: 8, background: "#fff", position: "absolute", zIndex: 400, width: "100%", maxHeight: 280, overflowX: "hidden", overflowY: "auto", boxShadow: "0 6px 20px rgba(0,0,0,0.12)", marginTop: 3 }}>
                                    <div style={{ padding: "10px 14px", borderBottom: "1px solid #f5f5f5", position: "sticky", top: 0, background: "#fff", zIndex: 2 }}>
                                        <div style={{ position: "relative" }}>
                                            <input
                                                style={{ ...inp, width: "100%", height: 36, paddingLeft: 34, paddingRight: 30, fontSize: 13, border: "1px solid #e41f07" }}
                                                placeholder="Search category..."
                                                value={seriesCatSearch}
                                                onChange={e => setSeriesCatSearch(e.target.value)}
                                                autoFocus
                                            />
                                            <i className="ti ti-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#888", fontSize: 14 }} />
                                            {seriesCatSearch && (
                                                <i className="ti ti-x" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#aaa", fontSize: 12, cursor: "pointer" }} onClick={() => setSeriesCatSearch("")} />
                                            )}
                                        </div>
                                    </div>
                                    <div onClick={() => { setSeriesCategory(""); setOpenCatDrop(false); setSeriesCatSearch(""); }} style={{ padding: "11px 14px", cursor: "pointer", fontSize: 13, color: "#bbb", borderBottom: "1px solid #f5f5f5" }}>
                                        Select or type to create a category
                                    </div>
                                    {seriesCategories.filter(c => c.toLowerCase().includes(seriesCatSearch.toLowerCase())).map(c => (
                                        <div key={c} onClick={() => { setSeriesCategory(c); setOpenCatDrop(false); setSeriesCatSearch(""); }} style={{ padding: "11px 14px", cursor: "pointer", fontSize: 13, background: seriesCategory === c ? "#fff0eb" : "#fff", color: seriesCategory === c ? "#e41f07" : "#333", fontWeight: seriesCategory === c ? 600 : 400, borderBottom: "1px solid #f5f5f5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <span>{c}</span>
                                            {seriesCategory === c && <i className="ti ti-check" style={{ fontSize: 13, fontWeight: 700 }} />}
                                        </div>
                                    ))}
                                    <div style={{ padding: "12px 14px", borderTop: "1px solid #f5f5f5", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", bottom: 0, background: "#fff", zIndex: 2 }}>
                                        <div
                                            onClick={() => {
                                                setShowManageCatModal(true);
                                                setNewSeriesCatName("");
                                                setEditingSeriesCatIdx(null);
                                                setOpenCatDrop(false);
                                                setSeriesCatSearch("");
                                            }}
                                            style={{ cursor: "pointer", fontSize: 12, color: "#e41f07", fontWeight: 600 }}
                                        >
                                            ⚙ Manage Categories
                                        </div>
                                        <button onClick={() => setOpenCatDrop(false)} style={{ background: "#f4f4f4", color: "#555", border: "none", borderRadius: 4, padding: "4px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Close</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Manage Categories Modal */}
                    {showManageCatModal && (
                        <>
                            <div onClick={() => setShowManageCatModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1200 }} />
                            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 1210, background: "#fff", borderRadius: 12, width: isMobile ? "92%" : 600, maxHeight: "85vh", overflowX: "hidden", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column" }}>
                                <div className="modal-header" style={{ padding: "18px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <h6 className="modal-title" style={{ margin: 0, fontWeight: 600, fontSize: 17, color: "#222" }}>Manage Categories</h6>
                                    <button type="button" className="btn-close custom-btn-close border p-1 me-0 d-flex align-items-center justify-content-center rounded-circle" aria-label="Close" onClick={() => setShowManageCatModal(false)}><i className="ti ti-x" /></button>
                                </div>
                                <div style={{ padding: "20px 24px" }}>
                                    {/* Add / Edit form */}
                                    <div style={{ marginBottom: 20 }}>
                                        <label style={{ fontSize: 13, fontWeight: 600, color: "#e41f07", display: "block", marginBottom: 8 }}>
                                            Category Name*
                                        </label>
                                        <input
                                            style={{ ...inp, width: "100%" }}
                                            value={newSeriesCatName}
                                            onChange={e => setNewSeriesCatName(e.target.value)}
                                            placeholder="Enter category name"
                                            onKeyDown={e => {
                                                if (e.key === "Enter" && newSeriesCatName.trim()) {
                                                    if (editingSeriesCatIdx !== null) {
                                                        const updated = [...seriesCategories];
                                                        updated[editingSeriesCatIdx] = newSeriesCatName.trim();
                                                        setSeriesCategories(updated);
                                                        if (seriesCategory === seriesCategories[editingSeriesCatIdx]) setSeriesCategory(newSeriesCatName.trim());
                                                        setEditingSeriesCatIdx(null);
                                                    } else {
                                                        if (!seriesCategories.includes(newSeriesCatName.trim())) setSeriesCategories([...seriesCategories, newSeriesCatName.trim()]);
                                                    }
                                                    setNewSeriesCatName("");
                                                }
                                            }}
                                        />
                                    </div>
                                    <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                                        <button
                                            onClick={() => {
                                                if (!newSeriesCatName.trim()) return;
                                                if (editingSeriesCatIdx !== null) {
                                                    const updated = [...seriesCategories];
                                                    updated[editingSeriesCatIdx] = newSeriesCatName.trim();
                                                    setSeriesCategories(updated);
                                                    if (seriesCategory === seriesCategories[editingSeriesCatIdx]) setSeriesCategory(newSeriesCatName.trim());
                                                    setEditingSeriesCatIdx(null);
                                                } else {
                                                    if (!seriesCategories.includes(newSeriesCatName.trim())) setSeriesCategories([...seriesCategories, newSeriesCatName.trim()]);
                                                }
                                                setNewSeriesCatName("");
                                            }}
                                            style={{ background: "#e41f07", color: "#fff", border: "none", borderRadius: 6, padding: "8px 22px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
                                        >Save</button>
                                        <button
                                            onClick={() => { setNewSeriesCatName(""); setEditingSeriesCatIdx(null); }}
                                            style={{ background: "#f4f4f4", color: "#555", border: "none", borderRadius: 6, padding: "8px 22px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
                                        >Cancel</button>
                                    </div>
                                    {/* Categories list */}
                                    <div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>Categories</span>
                                            <i className="ti ti-refresh" style={{ fontSize: 13, color: "#aaa", cursor: "pointer" }} onClick={() => { setNewSeriesCatName(""); setEditingSeriesCatIdx(null); }} />
                                        </div>
                                        <div style={{ border: "1px solid #f0f0f0", borderRadius: 8, overflow: "hidden" }}>
                                            {seriesCategories.length === 0 && (
                                                <div style={{ padding: "16px", textAlign: "center", color: "#bbb", fontSize: 13 }}>No categories yet</div>
                                            )}
                                            {seriesCategories.map((cat, idx) => (
                                                <div key={cat} style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: idx < seriesCategories.length - 1 ? "1px solid #f5f5f5" : "none", background: editingSeriesCatIdx === idx ? "#fff8f7" : "#fff" }}>
                                                    <span style={{ flex: 1, fontSize: 13, color: "#333", fontWeight: seriesCategory === cat ? 600 : 400 }}>{cat}</span>
                                                    {seriesCategory === cat && <span style={{ fontSize: 11, color: "#e41f07", marginRight: 10, fontWeight: 600 }}>Selected</span>}
                                                    <button onClick={() => { setEditingSeriesCatIdx(idx); setNewSeriesCatName(cat); }} style={{ background: "none", border: "none", color: "#e41f07", cursor: "pointer", padding: "2px 6px", fontSize: 13 }} title="Edit"><i className="ti ti-edit" /></button>
                                                    <button onClick={() => {
                                                        const updated = seriesCategories.filter((_, i) => i !== idx);
                                                        setSeriesCategories(updated);
                                                        if (seriesCategory === cat) setSeriesCategory("");
                                                        if (editingSeriesCatIdx === idx) { setEditingSeriesCatIdx(null); setNewSeriesCatName(""); }
                                                    }} style={{ background: "none", border: "none", color: "#ff4d4f", cursor: "pointer", padding: "2px 6px", fontSize: 13 }} title="Delete"><i className="ti ti-trash" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    <div style={{ marginBottom: 22 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "#444", display: "block", marginBottom: 12 }}>Modules</label>
                        {isMobile ? (
                            <div style={{ border: "1px solid #e3e3e3", borderRadius: 8, overflowX: "auto", overflowY: "hidden", WebkitOverflowScrolling: "touch" }}>
                                <table style={{ width: "100%", minWidth: 600, borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ background: "#fafafa", borderBottom: "1px solid #e8e8e8" }}>
                                            <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>Module</th>
                                            <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>Prefix</th>
                                            <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>Starting No</th>
                                            <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>Preview</th>
                                            <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>Customize</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {modules.map((m, i) => (
                                            <tr key={m.module} style={{ borderBottom: i < modules.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                                                <td style={{ padding: "8px 12px", fontSize: 12, color: "#333", whiteSpace: "nowrap", verticalAlign: "middle" }}>{m.module}</td>
                                                <td style={{ padding: "6px 12px", verticalAlign: "middle" }}>
                                                    <input value={m.prefix} onChange={e => setMod(i, "prefix", e.target.value)} placeholder="Prefix" style={{ ...inp, fontSize: 12, padding: "5px 8px", width: "100%" }} />
                                                </td>
                                                <td style={{ padding: "6px 12px", verticalAlign: "middle" }}>
                                                    <input value={m.startingNumber} onChange={e => setMod(i, "startingNumber", e.target.value)} placeholder="00001" style={{ ...inp, fontSize: 12, padding: "5px 8px", width: "100%" }} />
                                                </td>
                                                <td style={{ padding: "8px 12px", fontSize: 12, color: "#333", whiteSpace: "nowrap", verticalAlign: "middle" }}>{pvw(m.prefix, m.startingNumber)}</td>
                                                <td style={{ padding: "6px 12px", verticalAlign: "middle" }}>
                                                    <button onClick={() => setGenModule(m.module)} style={{ background: "none", border: "1px dashed #e41f07", borderRadius: 4, padding: "4px 10px", color: "#e41f07", fontSize: 10, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>+ Customize</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ border: "1px solid #e3e3e3", borderRadius: 8, overflowX: "hidden", overflowY: "hidden" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                                    <colgroup>
                                        <col style={{ width: "20%" }} />
                                        <col style={{ width: "20%" }} />
                                        <col style={{ width: "20%" }} />
                                        <col style={{ width: "20%" }} />
                                        <col style={{ width: "20%" }} />
                                    </colgroup>
                                    <thead>
                                        <tr style={{ background: "#fafafa", borderBottom: "1px solid #e8e8e8" }}>
                                            <th style={{ padding: "11px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>Module</th>
                                            <th style={{ padding: "11px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>Prefix</th>
                                            <th style={{ padding: "11px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>Starting Number</th>
                                            <th style={{ padding: "11px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>Preview</th>
                                            <th style={{ padding: "11px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>Customize</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {modules.map((m, i) => (
                                            <tr key={m.module} style={{ borderBottom: i < modules.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                                                <td style={{ padding: "10px 16px", fontSize: 13, color: "#333", verticalAlign: "middle" }}>{m.module}</td>
                                                <td style={{ padding: "8px 16px", verticalAlign: "middle" }}>
                                                    <input value={m.prefix} onChange={e => setMod(i, "prefix", e.target.value)} placeholder="Prefix" style={{ ...inp, fontSize: 13, padding: "6px 10px", width: "100%" }} />
                                                </td>
                                                <td style={{ padding: "8px 16px", verticalAlign: "middle" }}>
                                                    <input value={m.startingNumber} onChange={e => setMod(i, "startingNumber", e.target.value)} placeholder="00001" style={{ ...inp, fontSize: 13, padding: "6px 10px", width: "100%" }} />
                                                </td>
                                                <td style={{ padding: "10px 16px", fontSize: 13, color: "#333", whiteSpace: "nowrap", verticalAlign: "middle" }}>{pvw(m.prefix, m.startingNumber)}</td>
                                                <td style={{ padding: "8px 16px", verticalAlign: "middle" }}>
                                                    <button onClick={() => setGenModule(m.module)} style={{ background: "none", border: "1px dashed #e41f07", borderRadius: 4, padding: "5px 12px", color: "#e41f07", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>+ Customize</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column" : "row", marginTop: 28, justifyContent: "flex-end" }}>
                    <button onClick={() => { if (name.trim()) handleSaveNewSeries({ name: name.trim(), locations: locs, modules }); }} style={{ background: "#e41f07", color: "#fff", border: "none", borderRadius: 6, padding: "7px 20px", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>Save Series</button>
                    <button onClick={goBackToList} style={{ background: "#f4f4f4", color: "#555", border: "none", borderRadius: 6, padding: "7px 20px", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>Cancel</button>
                </div>

                <SeriesGeneratorModal
                    show={!!genModule}
                    moduleName={genModule || ""}
                    onClose={() => setGenModule(null)}
                    onApply={(p) => {
                        const idx = modules.findIndex(m => m.module === genModule);
                        if (idx > -1) setMod(idx, "prefix", p);
                        setGenModule(null);
                    }}
                />

                <AddModuleModal
                    show={showAddModModal}
                    onClose={() => { setShowAddModModal(false); setInsertAfterIdx(null); }}
                    existingModules={modules}
                    onAdd={(m) => {
                        const idx = insertAfterIdx ?? modules.length - 1;
                        const next = [...modules];
                        next.splice(idx + 1, 0, m);
                        setModules(next);
                        setShowAddModModal(false);
                        setInsertAfterIdx(null);
                    }}
                />
            </div></div>
        );
    }
    return (
        <div className="page-wrapper"><div className="content">
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", marginBottom: 28, gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, width: isMobile ? "100%" : "auto" }}>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <h4 style={{ margin: 0, fontWeight: 700, fontSize: isMobile ? 18 : 22 }}>Transaction Number Series</h4>
                        </div>
                        <nav style={{ fontSize: 12, color: "#aaa", marginTop: 3 }}>
                            <span style={{ cursor: "pointer", color: "#080707", fontSize: 14 }} onClick={onBack}>Locations</span>
                            <span style={{ margin: "0 5px" }}>›</span>
                            <span style={{ margin: "0 5px", fontSize: 14 }}>Transaction Series</span>
                        </nav>
                    </div>
                </div>
                <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 8 : 16, alignItems: isMobile ? "stretch" : "center", width: isMobile ? "100%" : "auto" }}>
                    <button onClick={() => setShowDupModal(true)} style={{ background: "none", border: "none", color: "#e41f07", fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: "8px 0", width: isMobile ? "100%" : "auto", justifyContent: isMobile ? "flex-start" : "center" }}>
                        <i className="ti ti-settings" style={{ fontSize: 18 }} /> Prevent Duplicate Transaction Numbers
                    </button>
                    <button title="Create a new transaction number series" onClick={openNewPage} style={{ background: "#e41f07", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", width: isMobile ? "100%" : "auto", justifyContent: isMobile ? "center" : "flex-start" }}>
                        <i className="ti ti-plus" />New Series
                    </button>
                </div>
            </div>
            <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflowX: "hidden", overflowY: "hidden", border: "1px solid #f0f0f0" }}>
                <div style={{ overflowX: "auto", overflowY: "hidden", WebkitOverflowScrolling: "touch" }}>
                    <table style={{ width: "100%", minWidth: isMobile ? 1500 : "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr>
                                <th style={{ ...thStyle, minWidth: 220 }}>Series Name</th>
                                {DEFAULT_MODULES.map(m => (
                                    <th key={m.module} style={{ ...thStyle, minWidth: 120 }}>{m.module.toUpperCase()}</th>
                                ))}
                                <th style={{ ...thStyle, minWidth: 180 }}>Associated Locations</th>
                                <th style={{ ...thStyle, textAlign: "center", minWidth: 80 }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {seriesList.map(s => (
                                <tr key={s.id} onClick={() => openEditPage(s)} style={{ borderBottom: "1px solid #f5f5f5", cursor: "pointer" }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "#fafcff")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "")}>
                                    <td style={{ ...tdStyle, fontWeight: 600, color: "#e41f07", minWidth: 220 }}>{s.name}</td>
                                    {DEFAULT_MODULES.map(m => {
                                        const mod = s.modules.find(sm => sm.module === m.module);
                                        return <td key={m.module} style={{ ...tdStyle, fontSize: 12, minWidth: 120 }}>{mod ? pvw(mod.prefix, mod.startingNumber) : "—"}</td>;
                                    })}
                                    <td style={{ ...tdStyle, minWidth: 180 }}>
                                        <span style={{ background: "#f0f4ff", color: "#3b5bdb", padding: "2px 8px", borderRadius: 4, fontWeight: 500 }}>{s.locations.length}</span>
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: "center" }} onClick={e => e.stopPropagation()}>
                                        <ActionMenu onEdit={() => openEditPage(s)} onDelete={() => setDelTarget(s)} />
                                    </td>
                                </tr>
                            ))}
                            {seriesList.length === 0 && (
                                <tr><td colSpan={13} style={{ ...tdStyle, textAlign: "center", padding: 48, color: "#bbb" }}>No series yet. Click "New Series" to add one.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <DeleteModal show={!!delTarget} name={delTarget?.name ?? ""} onConfirm={() => { if (delTarget) { onDelete(delTarget.id); setDelTarget(null); } }} onClose={() => setDelTarget(null)} />
            <DuplicateSettingsModal
                show={showDupModal}
                onClose={() => setShowDupModal(false)}
                initValue={dupSetting}
                onSave={(val) => { setDupSetting(val); setToast(`Duplicate prevention updated: ${val}`); }}
            />
            {toast && <SuccessToast message={toast} onClose={() => setToast(null)} />}
        </div></div>
    );
};


// ── Connector Lines Component ─────────────────────────────────────────────────
// position:absolute top:0/bottom:0 → fills the FULL td height (not just 52px).
// Line divs use top:-1/bottom:-1 → bleed 1px into adjacent rows → seamless join.
function ConnectorLines({
    loc, isCollapsed, onToggle,
}: {
    loc: { depth: number; hasChildren: boolean; isLastSibling: boolean; ancestorContinuations: boolean[] };
    isCollapsed: boolean;
    onToggle?: (e: React.MouseEvent) => void;
}) {
    const STEP = 28;
    const BASE_X = 14;
    const CIRCLE = 16;
    const LINE = "#d1d5db";
    const cx = BASE_X + loc.depth * STEP;
    const w = BASE_X + (loc.depth + 1) * STEP + 4;
    const BLEED = 20;

    const vLine = (x: number, t: number | string, b: number | string): React.CSSProperties => ({
        position: "absolute", left: x, top: t, bottom: b, width: 1, background: LINE,
    });

    return (
        // Extends BLEED px above/below the td so lines physically overlap adjacent rows.
        <div style={{ position: "absolute", left: 0, top: -BLEED, bottom: -BLEED, width: w, pointerEvents: "none" }}>

            {/* Ancestor vertical continuation lines — full height of extended container */}
            {Array.from({ length: Math.max(0, loc.depth - 1) }, (_, d) =>
                loc.ancestorContinuations[d]
                    ? <div key={`ac${d}`} style={vLine(BASE_X + d * STEP, 0, 0)} />
                    : null
            )}

            {/* Incoming vertical from parent.
                top:0   = container top = BLEED px above this td → reaches into parent row.
                bottom:"50%" = td visual centre (50% of container = td_height/2 from td top).
                bottom:0    = BLEED px below td → reaches into next row. */}
            {loc.depth > 0 && (
                <div style={vLine(
                    BASE_X + (loc.depth - 1) * STEP,
                    0,
                    loc.isLastSibling ? "50%" : 0,
                )} />
            )}

            {/* Horizontal elbow — 50% of container = visual centre of td (no extra offset needed) */}
            {loc.depth > 0 && (
                <div style={{
                    position: "absolute",
                    left: BASE_X + (loc.depth - 1) * STEP,
                    right: w - cx,
                    top: "50%",
                    height: 1, background: LINE,
                }} />
            )}

            {/* Downward line — starts just below circle (50% + half-circle), runs to container bottom */}
            {loc.hasChildren && !isCollapsed && (
                <div style={vLine(cx, `calc(50% + ${CIRCLE / 2}px)`, 0)} />
            )}

            {/* Circle — centred at 50% of container = visual centre of td */}
            <div onClick={onToggle} style={{
                position: "absolute",
                left: cx - CIRCLE / 2,
                top: `calc(50% - ${CIRCLE / 2}px)`,
                width: CIRCLE, height: CIRCLE, borderRadius: "50%",
                background: loc.hasChildren ? "#fff0eb" : "#fff",
                border: `1px solid ${loc.hasChildren ? "#f4b8ac" : LINE}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: loc.hasChildren ? "pointer" : "default",
                zIndex: 2, boxSizing: "border-box", userSelect: "none",
                pointerEvents: "all",
                transition: "background 0.15s",
            }}>
                {loc.hasChildren && (
                    <i
                        className={`ti ${isCollapsed ? "ti-chevron-right" : "ti-chevron-down"}`}
                        style={{ fontSize: 10, color: "#e41f07", lineHeight: 1, transition: "transform 0.2s" }}
                    />
                )}
            </div>
        </div>
    );
}
// ── Inline Series Cell (table) ────────────────────────────────────────────────
const InlineSeriesCell = ({ locId, value, seriesList, onChangeSeries, onAddSeries }: {
    locId: number; value: string; seriesList: TxnSeries[];
    onChangeSeries: (locId: number, series: string) => void;
    onAddSeries: () => void;
}) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
    }, []);

    return (
        <div ref={ref} style={{ position: "relative", display: "inline-block", minWidth: 160 }} onClick={e => e.stopPropagation()}>
            <div
                onClick={() => setOpen(o => !o)}
                style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "3px 8px", borderRadius: 6, border: "1px solid transparent", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#fff8f7"; e.currentTarget.style.borderColor = "#fdd5ce"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>
                {value
                    ? <span style={{ fontSize: 12, color: "#333", fontWeight: 500 }}>{value}</span>
                    : <span style={{ fontSize: 12, color: "#e41f07", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                        <i className="ti ti-plus" style={{ fontSize: 12 }} />Add Series
                    </span>
                }
                <i className="ti ti-chevron-down" style={{ fontSize: 11, color: "#aaa", marginLeft: 2 }} />
            </div>
            {open && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "#fff", border: "1px solid #e3e3e3", borderRadius: 8, minWidth: 200, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", zIndex: 500 }}>
                    <div style={{ maxHeight: 180, overflowX: "hidden", overflowY: "auto" }}>
                        {seriesList.map(s => (
                            <div key={s.id} onClick={() => { onChangeSeries(locId, s.name); setOpen(false); }}
                                style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", background: value === s.name ? "#fff0eb" : "#fff", color: value === s.name ? "#e41f07" : "#333", borderBottom: "1px solid #f5f5f5" }}
                                onMouseEnter={e => { if (value !== s.name) e.currentTarget.style.background = "#fafafa"; }}
                                onMouseLeave={e => { if (value !== s.name) e.currentTarget.style.background = "#fff"; }}>
                                <span>{s.name}</span>
                                {value === s.name && <i className="ti ti-check" style={{ fontSize: 13 }} />}
                            </div>
                        ))}
                        {seriesList.length === 0 && <div style={{ padding: "10px 14px", fontSize: 12, color: "#bbb" }}>No series available</div>}
                    </div>
                    <div style={{ borderTop: "1px solid #f0f0f0", padding: "8px" }}>
                        <button onClick={() => { onAddSeries(); setOpen(false); }}
                            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 14px", fontSize: 13, color: "#e41f07", background: "#fff", border: "none", cursor: "pointer", fontWeight: 600, borderRadius: 4 }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#fff8f7")}
                            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                            <i className="ti ti-plus" style={{ fontSize: 14 }} />Add Transaction Series
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
const LocationPage = () => {
    const [view, setView] = useState<"locations" | "series" | "locationForm">("locations");
    const [locations, setLocations] = useState<Location[]>(INIT_LOCATIONS);
    const [seriesList, setSeriesList] = useState<TxnSeries[]>(INIT_SERIES);
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("name");
    const [sortDir, setSortDir] = useState<SortDir>("asc");
    const [editLoc, setEditLoc] = useState<Location | null>(null);
    const [delTarget, setDelTarget] = useState<Location | null>(null);
    const [showImport, setShowImport] = useState(false);
    const [showSeriesModal, setShowSeriesModal] = useState(false);
    const [selected, setSelected] = useState<number[]>([]);
    const [exportOpen, setExportOpen] = useState(false);
    const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
    const [hoveredRow, setHoveredRow] = useState<number | null>(null);
    const [primaryTarget, setPrimaryTarget] = useState<Location | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
    const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const exportRef = useRef<HTMLDivElement>(null);
    const isMobile = useResponsive();

    useEffect(() => {
        const h = (e: MouseEvent) => { if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false); };
        document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
    }, []);

    useEffect(() => {
        const move = (e: MouseEvent) => { setTooltipPos({ x: e.clientX, y: e.clientY }); };
        document.addEventListener("mousemove", move);
        return () => document.removeEventListener("mousemove", move);
    }, []);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("asc"); }
    };

    const allFiltered = locations
        .filter(l =>
            l.name.toLowerCase().includes(search.toLowerCase()) ||
            l.type.toLowerCase().includes(search.toLowerCase()) ||
            l.city.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
            const av = sortKey === "name" ? a.name : sortKey === "defaultTxnSeries" ? a.defaultTxnSeries : sortKey === "type" ? a.type : [a.city, a.state].join("");
            const bv = sortKey === "name" ? b.name : sortKey === "defaultTxnSeries" ? b.defaultTxnSeries : sortKey === "type" ? b.type : [b.city, b.state].join("");
            return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
        });

    const businessLocationsList = allFiltered.filter(l => l.type === "Business");
    const warehouseLocationsList = allFiltered.filter(l => l.type === "Warehouse");
    const filtered = [...businessLocationsList, ...warehouseLocationsList];
    const pageFontFamily = "var(--crms-body-font-family, 'Golos Text', sans-serif)";

    const locationNameSet = new Set(filtered.map(l => l.name));
    const childrenByParent = new Map<string, Location[]>();
    filtered.forEach(loc => {
        const parentKey = loc.parentLocation?.trim();
        if (!parentKey) return;
        const bucket = childrenByParent.get(parentKey) ?? [];
        bucket.push(loc);
        childrenByParent.set(parentKey, bucket);
    });

    const primaryLoc = filtered.find(l => !!l.isDefault);

    // Helper to check if a location is the primary one or an ancestor of it
    const isPrimaryOrAncestor = (loc: Location): boolean => {
        if (loc.id === primaryLoc?.id) return true;
        const children = childrenByParent.get(loc.name) ?? [];
        return children.some(child => isPrimaryOrAncestor(child));
    };

    const orderedLocations: Array<Location & { depth: number; hasChildren: boolean; isLastSibling: boolean; ancestorContinuations: boolean[] }> = [];

    const pushWithChildren = (loc: Location, depth: number, isLastSibling: boolean, ancestorContinuations: boolean[]) => {
        const allChildren = childrenByParent.get(loc.name) ?? [];
        const children = [...allChildren].sort((a, b) => a.name.localeCompare(b.name));

        orderedLocations.push({ ...loc, depth, hasChildren: children.length > 0, isLastSibling, ancestorContinuations });

        if (!collapsed.has(loc.id)) {
            children.forEach((child, index) => pushWithChildren(child, depth + 1, index === children.length - 1, [...ancestorContinuations, !isLastSibling]));
        }
    };

    // 2. Build the tree, pinning the primary branch root at the top
    const rootItems = filtered
        .filter(loc => !loc.parentLocation || !locationNameSet.has(loc.parentLocation))
        .sort((a, b) => a.name.localeCompare(b.name));

    rootItems.forEach((loc, index) => pushWithChildren(loc, 0, index === rootItems.length - 1, []));

    // ── Export PDF ────────────────────────────────────────────────────────────
    const exportPDF = () => {
        const rows = selected.length > 0 ? filtered.filter(l => selected.includes(l.id)) : filtered;
        const date = now();
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Locations</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a2e}
.header{background:#1a1a2e;color:white;padding:20px 32px;display:flex;align-items:center;justify-content:space-between}
.brand{font-size:22px;font-weight:800;color:#e41f07}.bar{height:4px;background:#e41f07}
.title-strip{padding:14px 32px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between}
.title-strip h2{font-size:18px;font-weight:700}.badge{background:#e41f07;color:white;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;margin-left:10px}
.stats{display:flex;gap:12px;padding:14px 32px;background:#f8f9fa;border-bottom:1px solid #e5e7eb}
.stat{flex:1;background:white;border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center}
.stat .v{font-size:22px;font-weight:700;color:#e41f07}.stat .l{font-size:10px;color:#6b7280;text-transform:uppercase}
.wrap{padding:20px 32px}table{width:100%;border-collapse:collapse}
thead tr{background:#e41f07}thead th{color:white;font-size:11px;font-weight:700;padding:10px 12px;text-align:left;text-transform:uppercase}
tbody td{padding:9px 12px;border-bottom:1px solid #f0f0f0;font-size:12px}
.pill{padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700}
.footer{margin:0 32px;padding:12px 0;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;display:flex;justify-content:space-between}
@media print{@page{size:A4 landscape;margin:10mm}}</style></head><body>
<div class="header"><div><div class="brand">CRMS</div><div style="color:#94a3b8;font-size:12px;margin-top:4px">Locations</div></div>
<div style="font-size:11px;color:#94a3b8;text-align:right">Generated: ${date}</div></div>
<div class="bar"></div>
<div class="title-strip"><div style="display:flex;align-items:center"><h2>Locations</h2><span class="badge">${rows.length}</span></div></div>
<div class="stats">
<div class="stat"><div class="v">${rows.length}</div><div class="l">Total</div></div>
<div class="stat"><div class="v">${rows.filter(l => l.type === "Business").length}</div><div class="l">Business</div></div>
<div class="stat"><div class="v">${rows.filter(l => l.type === "Warehouse").length}</div><div class="l">Warehouse</div></div>
</div>
<div class="wrap"><table>
<thead><tr><th>#</th><th>Name</th><th>Type</th><th>Default Series</th><th>Address</th><th>Primary Contact</th></tr></thead>
<tbody>${rows.map((l, i) => `<tr style="background:${i % 2 === 0 ? "#fff" : "#fff5f4"}">
<td style="color:#9ca3af">${i + 1}</td>
<td style="font-weight:600">${l.name}${l.isDefault ? " ★" : ""}</td>
<td><span class="pill" style="background:${l.type === "Business" ? "#e8f5e9" : "#e3f2fd"};color:${l.type === "Business" ? "#2e7d32" : "#1565c0"}">${l.type}</span></td>
<td>${l.defaultTxnSeries || "—"}</td>
<td>${[l.city, l.state, l.country].filter(Boolean).join(", ") || "—"}</td>
<td>${l.primaryContact || "—"}</td>
</tr>`).join("")}</tbody></table></div>
<div class="footer"><span>CRMS · Locations</span><span>Exported on ${date}</span></div>
<script>window.onload=()=>window.print();</script></body></html>`;
        const win = window.open("", "_blank", "width=1100,height=750");
        if (win) { win.document.write(html); win.document.close(); }
        setExportOpen(false);
    };

    // ── Export Excel ──────────────────────────────────────────────────────────
    const exportExcel = async () => {
        const rows = selected.length > 0 ? filtered.filter(l => selected.includes(l.id)) : filtered;
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("Locations");
        ws.columns = [
            { header: "Name", key: "name", width: 22 },
            { header: "Type", key: "type", width: 14 },
            { header: "Parent Location", key: "parentLocation", width: 20 },
            { header: "Default Transaction Series", key: "defaultTxnSeries", width: 30 },
            { header: "City", key: "city", width: 16 },
            { header: "State", key: "state", width: 16 },
            { header: "Country", key: "country", width: 16 },
            { header: "Phone", key: "phone", width: 16 },
            { header: "Primary Contact", key: "primaryContact", width: 28 },
        ];
        const headerRow = ws.getRow(1);
        headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Arial", size: 11 };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE41F07" } };
            cell.alignment = { vertical: "middle", horizontal: "center" };
        });
        headerRow.height = 22;
        rows.forEach((l, i) => {
            const row = ws.addRow({ name: l.name, type: l.type, parentLocation: l.parentLocation || "", defaultTxnSeries: l.defaultTxnSeries || "", city: l.city, state: l.state, country: l.country, phone: l.phone, primaryContact: l.primaryContact });
            const bg = i % 2 === 0 ? "FFFFFFFF" : "FFFFF5F4";
            row.eachCell(cell => { cell.font = { name: "Arial", size: 10 }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }; cell.alignment = { vertical: "middle" }; });
            row.height = 18;
        });
        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "locations.xlsx");
        setExportOpen(false);
    };

    const openLocationForm = (loc: Location | null = null) => { setEditLoc(loc); setView("locationForm"); };
    const closeLocationForm = () => { setEditLoc(null); setView("locations"); };

    const handleConfirmPrimary = () => {
        if (primaryTarget) {
            setLocations(prev => prev.map(l => ({ ...l, isDefault: l.id === primaryTarget.id })));
            setToast({ msg: "Primary location has been successfully marked.", type: "success" });
            setPrimaryTarget(null);
        }
    };

    const handleSaveLoc = (form: Omit<Location, "id">) => {
        if (!form.name.trim()) return;
        setLocations(prev => {
            const next = prev.map(l => {
                if (editLoc && l.id === editLoc.id) return { ...form, id: editLoc.id };
                // If the new/updated location is primary, unset others
                if (form.isDefault) return { ...l, isDefault: false };
                return l;
            });
            if (!editLoc) {
                const newId = Math.max(0, ...prev.map(l => l.id)) + 1;
                const newLoc = { ...form, id: newId };
                return [...next, newLoc];
            }
            return next;
        });
        closeLocationForm();
    };

    const handleDelLoc = () => { if (delTarget) { setLocations(prev => prev.filter(l => l.id !== delTarget.id)); setDelTarget(null); } };

    const handleInlineChangeSeries = (locId: number, seriesName: string) => {
        setLocations(prev => prev.map(l => l.id === locId
            ? { ...l, defaultTxnSeries: seriesName, txnSeries: l.txnSeries.includes(seriesName) ? l.txnSeries : [...l.txnSeries, seriesName] }
            : l));
    };

    const addSeries = (d: Omit<TxnSeries, "id">) => setSeriesList(prev => [...prev, { ...d, id: Math.max(0, ...prev.map(s => s.id)) + 1 }]);
    const updateSeries = (id: number, d: Omit<TxnSeries, "id">) => setSeriesList(prev => prev.map(s => s.id === id ? { ...d, id } : s));
    const deleteSeries = (id: number) => setSeriesList(prev => prev.filter(s => s.id !== id));

    const businessLocations = locations.filter(l => l.type === "Business").map(l => l.name);

    if (view === "series") {
        return <TxnSeriesView seriesList={seriesList} locationNames={locations.map(l => l.name)} onBack={() => setView("locations")} onAdd={addSeries} onUpdate={updateSeries} onDelete={deleteSeries} />;
    }

    if (view === "locationForm") {
        return (
            <div className="page-wrapper">
                <div className="content">
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12, fontFamily: "var(--crms-body-font-family, 'Golos Text', sans-serif)" }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <button onClick={closeLocationForm} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", fontSize: 20, color: "#888", display: "flex", alignItems: "center" }}>
                                    <i className="ti ti-arrow-left" />
                                </button>
                                <h4 style={{ margin: 0, fontWeight: 700, fontSize: 18, color: "#1a1a2e" }}>{editLoc ? "Update Location" : "Add Location"}</h4>
                            </div>
                            <nav style={{ fontSize: 14, color: "#aaa", marginTop: 4 }}>
                                <span style={{ cursor: "pointer" }} onClick={() => setView("locations")}>Locations</span>
                                <span style={{ margin: "0 6px" }}>›</span>
                                <span style={{ color: "#0e0a0a", fontWeight: 500 }}>{editLoc ? "Update Location" : "Add Location"}</span>
                            </nav>
                        </div>
                    </div>
                    <LocationModal
                        show
                        renderMode="page"
                        onClose={closeLocationForm}
                        onSave={handleSaveLoc}
                        editData={editLoc}
                        seriesList={seriesList}
                        businessLocations={businessLocations}
                        onAddSeries={() => setShowSeriesModal(true)}
                        showSeriesModal={showSeriesModal}
                        setShowSeriesModal={setShowSeriesModal}
                        onSaveNewSeries={d => { addSeries(d); setShowSeriesModal(false); }}
                        locationNamesForSeries={locations.map(l => l.name)}
                    />
                </div>
            </div>
        );
    }

    const SortTh = ({ col, label }: { col: SortKey; label: string }) => (
        <th onClick={() => handleSort(col)} style={{ ...thStyle, cursor: "pointer" }}>
            {label}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
        </th>
    );

    return (
        <div className="page-wrapper">
            {/* (Gold star tooltip removed) */}
            <div className="content">

                {/* Page Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12, fontFamily: pageFontFamily }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <h4 style={{ margin: 0, fontWeight: 700, fontSize: 17, color: "#1a1a2e" }}>Locations</h4>
                        </div>
                        <nav style={{ fontSize: 14, color: "#aaa", marginTop: 4 }}>
                            <span>Home</span><span style={{ margin: "0 6px" }}>›</span>
                            <span style={{ color: "#0e0a0a", fontWeight: 500 }}>Locations</span>
                        </nav>
                    </div>

                    {/* Top-right actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div ref={exportRef} style={{ position: "relative" }}>
                            <button title="Export locations as PDF or Excel" onClick={() => setExportOpen(o => !o)}
                                style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #e6e8ec", background: "#fff", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", color: "#4b5563" }}
                                onMouseEnter={e => { e.currentTarget.style.background = "#fff4f1"; e.currentTarget.style.borderColor = "#efc7bf"; e.currentTarget.style.color = "#e41f07"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e6e8ec"; e.currentTarget.style.color = "#4b5563"; }}>
                                <i className="ti ti-package-export" style={{ fontSize: 16 }} />Export
                                <i className="ti ti-chevron-down" style={{ fontSize: 13 }} />
                            </button>
                            {exportOpen && (
                                <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "#fff", border: "1px solid #e3e3e3", borderRadius: 8, width: 190, boxShadow: "0 6px 20px rgba(0,0,0,0.1)", zIndex: 300, padding: "4px 0" }}>
                                    <button title="Export as PDF" onClick={exportPDF} className="dropdown-item d-flex align-items-center gap-2 px-3 py-2" style={{ fontSize: 13, color: "#444", width: "100%" }}
                                        onMouseEnter={e => (e.currentTarget.style.background = "#fff8f7")} onMouseLeave={e => (e.currentTarget.style.background = "")}>
                                        <i className="ti ti-file-type-pdf" style={{ color: "#e41f07", fontSize: 16 }} />Export as PDF
                                    </button>
                                    <button title="Export as Excel (.xlsx)" onClick={exportExcel} className="dropdown-item d-flex align-items-center gap-2 px-3 py-2" style={{ fontSize: 13, color: "#444", width: "100%" }}
                                        onMouseEnter={e => (e.currentTarget.style.background = "#fff8f7")} onMouseLeave={e => (e.currentTarget.style.background = "")}>
                                        <i className="ti ti-file-spreadsheet" style={{ color: "#1d6f42", fontSize: 16 }} />Export as Excel
                                    </button>
                                    {selected.length > 0 && (
                                        <div style={{ padding: "6px 12px", borderTop: "1px solid #f5f5f5", fontSize: 11, color: "#e41f07", fontWeight: 600 }}>
                                            {selected.length} selected row{selected.length > 1 ? "s" : ""} will be exported
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <button title="Refresh — reset locations to original data" onClick={() => { setSearch(""); setLocations(INIT_LOCATIONS); setSeriesList(INIT_SERIES); setSelected([]); setCollapsed(new Set()); }}
                            style={{ border: "1px solid #e6e8ec", background: "#fff", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#4b5563" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#fff4f1"; e.currentTarget.style.borderColor = "#efc7bf"; e.currentTarget.style.color = "#e41f07"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e6e8ec"; e.currentTarget.style.color = "#4b5563"; }}>
                            <i className="ti ti-refresh" style={{ fontSize: 16 }} />
                        </button>
                        <button title="Import locations from CSV file" onClick={() => setShowImport(true)}
                            style={{ border: "1px solid #e6e8ec", background: "#fff", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#4b5563" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#fff4f1"; e.currentTarget.style.borderColor = "#efc7bf"; e.currentTarget.style.color = "#e41f07"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e6e8ec"; e.currentTarget.style.color = "#4b5563"; }}>
                            <i className="ti ti-upload" style={{ fontSize: 16 }} />
                        </button>
                    </div>
                </div>

                {/* Table Card */}
                <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", border: "1px solid #d1d5db", overflow: "visible", fontFamily: pageFontFamily }}>
                    {/* Toolbar */}
                    <div className="mobile-toolbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #edf1f7", flexWrap: "wrap", gap: 12, background: "#fff", borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
                        <div className="input-icon input-icon-start position-relative" style={{ width: "min(100%, 280px)" }}>
                            <span className="input-icon-addon text-dark">
                                <i className="ti ti-search"></i>
                            </span>
                            <input type="text" className="form-control" placeholder="Search locations..." value={search || ""} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                            <button title="Manage transaction number series" onClick={() => setView("series")}
                                style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #e6e8ec", background: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", color: "#4b5563" }}
                                onMouseEnter={e => { e.currentTarget.style.background = "#fff4f1"; e.currentTarget.style.borderColor = "#efc7bf"; e.currentTarget.style.color = "#e41f07"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e6e8ec"; e.currentTarget.style.color = "#4b5563"; }}>
                                <i className="ti ti-settings" style={{ fontSize: 15 }} />
                                Transaction Series Preferences
                            </button>
                            <button title="Add a new location" className="mobile-button" onClick={() => openLocationForm()}
                                style={{ background: "#e41f07", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                                <i className="ti ti-plus" style={{ fontSize: 16 }} />Add Location
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="loc-table-wrapper" style={{ overflowX: "visible", overflowY: "visible" }}>
                        <table className="loc-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: "#f8f9fb" }}>
                                    <SortTh col="name" label="Name" />
                                    <SortTh col="defaultTxnSeries" label="Default Transaction Number Series" />
                                    <SortTh col="type" label="Type" />
                                    <SortTh col="address" label="Address Details" />
                                    <th style={{ ...thStyle, textAlign: "center", background: "#f7f8fb", color: "#697586" }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orderedLocations.length === 0 ? (
                                    <tr><td colSpan={5} style={{ ...tdStyle, textAlign: "center", padding: 56, color: "#bbb" }}>
                                        <i className="ti ti-map-pin-off" style={{ fontSize: 36, display: "block", marginBottom: 10, color: "#ddd" }} />
                                        No locations found.
                                    </td></tr>
                                ) : (
                                    orderedLocations.map((loc) => (
                                        <tr key={loc.id}
                                            onClick={() => openLocationForm(loc)}
                                            onMouseEnter={() => setHoveredRow(loc.id)}
                                            onMouseLeave={() => setHoveredRow(null)}
                                            style={{ borderBottom: "1px solid #e5e7eb", cursor: "pointer", background: (hoveredRow === loc.id || selected.includes(loc.id)) ? "#fff8f7" : (loc.depth > 0 ? "#fbfcff" : "#fff") }}>
                                            {/* ── Name column with CSS connector ── */}
                                            {/* position:relative → containing block for the absolute connector.
                                                paddingLeft = connector width + 8px gap so text never overlaps lines. */}
                                            <td style={{
                                                ...tdStyle,
                                                position: "relative",
                                                paddingLeft: (14 + (loc.depth + 1) * 28 + 4) + 8,
                                                color: "#3d4758", fontSize: 12,
                                                fontFamily: pageFontFamily,
                                                minWidth: isMobile ? 220 : 0,
                                            }}>
                                                <ConnectorLines
                                                    loc={loc}
                                                    isCollapsed={collapsed.has(loc.id)}
                                                    onToggle={loc.hasChildren ? (e) => {
                                                        e.stopPropagation();
                                                        setCollapsed(prev => {
                                                            const next = new Set(prev);
                                                            if (next.has(loc.id)) next.delete(loc.id);
                                                            else next.add(loc.id);
                                                            return next;
                                                        });
                                                    } : undefined}
                                                />
                                                <div style={{ fontWeight: 500, color: "#101828", cursor: "pointer", display: "flex", alignItems: "center", position: "relative", paddingLeft: 26, fontSize: 12, lineHeight: 1.1, fontFamily: pageFontFamily }} onClick={(e) => { e.stopPropagation(); openLocationForm(loc); }}>
                                                    {/* Star / Primary button - Always visible for both parent and child as requested */}
                                                    <div onClick={e => e.stopPropagation()} style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                        <div onClick={(e) => { if (!loc.isDefault) { e.stopPropagation(); setPrimaryTarget(loc); } }} style={{ cursor: loc.isDefault ? "default" : "pointer", padding: "2px" }}>
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill={loc.isDefault ? "#f59e0b" : "none"} stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                                            </svg>
                                                        </div>
                                                    </div>
                                                    {loc.name}
                                                </div>
                                                <div style={{ fontSize: 10, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                                                    {loc.parentLocation ? (
                                                        <span style={{ color: "#888" }}>Child of {loc.parentLocation}</span>
                                                    ) : loc.hasChildren ? (
                                                        <span style={{ color: "#e41f07", fontWeight: 500 }}>Parent Location</span>
                                                    ) : null}
                                                </div>
                                            </td>

                                            <td style={{ ...tdStyle, color: "#3d4758", fontFamily: pageFontFamily, overflow: "visible", position: "relative", whiteSpace: "nowrap", minWidth: 200 }}>
                                                <InlineSeriesCell
                                                    locId={loc.id}
                                                    value={loc.defaultTxnSeries}
                                                    seriesList={seriesList}
                                                    onChangeSeries={handleInlineChangeSeries}
                                                    onAddSeries={() => setShowSeriesModal(true)}
                                                />
                                            </td>
                                            <td style={{ ...tdStyle, color: "#3d4758", fontFamily: pageFontFamily, whiteSpace: "nowrap", minWidth: 100, overflow: "visible", position: "relative" }}>
                                                {loc.type}
                                            </td>
                                            <td style={{ ...tdStyle, color: "#3d4758", fontFamily: pageFontFamily, minWidth: 200, overflow: "visible", position: "relative" }}>
                                                {[loc.city, loc.state, loc.country].filter(Boolean).join(", ") || <span style={{ color: "#bbb" }}>-</span>}
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: "center", width: 76, minWidth: 76, paddingLeft: 12, paddingRight: 12, overflow: "visible", position: "relative" }} onClick={e => e.stopPropagation()}>
                                                <ActionMenu
                                                    onEdit={() => openLocationForm(loc)}
                                                    onDelete={() => setDelTarget(loc)}
                                                    isPrimary={loc.isDefault}
                                                    onSetPrimary={() => setPrimaryTarget(loc)}
                                                />
                                            </td>

                                        </tr>
                                    ))
                                )}

                            </tbody>
                        </table>
                    </div>
                    {/* Footer */}
                    <div style={{ padding: "12px 20px", borderTop: "1px solid #f5f5f5", fontSize: 12, color: "#aaa", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
                        <span>Showing {filtered.length} of {locations.length} locations</span>
                        {selected.length > 0 && (
                            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ color: "#e41f07", fontWeight: 600 }}>{selected.length} selected</span>
                                <button onClick={() => setSelected([])} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 12 }}>Clear</button>
                            </span>
                        )}
                    </div>
                </div>
            </div>
            {/* Modals */}
            <DeleteModal show={!!delTarget} name={delTarget?.name ?? ""} onConfirm={handleDelLoc} onClose={() => setDelTarget(null)} />
            <PrimaryConfirmationModal
                show={!!primaryTarget}
                name={primaryTarget?.name ?? ""}
                onConfirm={handleConfirmPrimary}
                onClose={() => setPrimaryTarget(null)}
            />
            {toast && <SuccessToast message={toast.msg} onClose={() => setToast(null)} />}
            <ImportModal show={showImport} onClose={() => setShowImport(false)} onImport={rows => {
                const nextId = Math.max(0, ...locations.map(l => l.id));
                setLocations(prev => [...prev, ...rows.map((r, i) => ({ ...r, id: nextId + i + 1 }))]);
            }} />
        </div>
    );
};

export default LocationPage;