// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { all_routes } from "../../../../../routes/all_routes";
import "./credit.scss";

const SK = "billing_credit_notes";
const CUSTOMER_KEY = "billing_customers";
const INVOICE_KEY = "billing_invoices";
const PRODUCT_KEY = "product_list_data";
const LOCATIONS = ["Head Office", "Main Warehouse", "Branch A", "Branch B"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayDisplay() {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function todayISO() {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function isoToDisplay(s: string) {
    if (!s) return "";
    const parts = s.split("-");
    if (parts.length !== 3) return s;
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
}
function displayToIso(s: string) {
    if (!s) return "";
    const parts = s.split("/");
    if (parts.length !== 3) return s;
    const [d, m, y] = parts;
    return `${y}-${m}-${d}`;
}
function nowDatetime() {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const h = d.getHours() % 12 || 12;
    const ampm = d.getHours() >= 12 ? "PM" : "AM";
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(h)}:${pad(d.getMinutes())} ${ampm}`;
}
function generateCNNumber(existing: any[]): string {
    const num = existing.length ? Math.max(...existing.map((o: any) => {
        const n = parseInt((o.creditNoteNumber || "CN-00000").replace("CN-", ""));
        return isNaN(n) ? 0 : n;
    })) + 1 : 1;
    return `CN-${String(num).padStart(5, "0")}`;
}
function loadJSON(key: string) {
    try { const s = localStorage.getItem(key); if (s) return JSON.parse(s); } catch { /**/ }
    return [];
}

interface LineItem {
    id: number;
    productId: string | number;
    productName: string;
    sku: string;
    account: string;
    quantity: number;
    rate: number;
    discount: number;
    discountType: "%" | "flat";
    taxPercent: number;
    amount: number;
    reportingTag: string;
}

function emptyLine(): LineItem {
    return { id: Date.now() + Math.random(), productId: "", productName: "", sku: "", account: "", quantity: 1, rate: 0, discount: 0, discountType: "%", taxPercent: 0, amount: 0, reportingTag: "" };
}
function calcAmount(item: LineItem): number {
    const subtotal = item.quantity * item.rate;
    const discAmt = item.discountType === "%" ? (subtotal * item.discount / 100) : item.discount;
    const afterDisc = subtotal - discAmt;
    return afterDisc + (afterDisc * item.taxPercent / 100);
}

// ── SearchableDropdown ────────────────────────────────────────────────────────
const SD: React.FC<{
    value: string; placeholder: string; options: string[];
    onChange: (v: string) => void; error?: boolean; borderRadius?: string;
}> = ({ value, placeholder, options, onChange, error, borderRadius = "4px" }) => {
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
                    borderRadius, background: "#fff", display: "flex", alignItems: "center",
                    justifyContent: "space-between", padding: "0 10px", cursor: "pointer",
                    fontSize: 14, color: value ? "#111827" : "#9ca3af",
                    boxShadow: "none",
                }}
            >
                <span>{value || placeholder}</span>
                <i className={`ti ${open ? "ti-chevron-up" : "ti-chevron-down"}`} style={{ fontSize: 12, color: "#6b7280" }} />
            </div>
            {open && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 1050, maxHeight: 240, display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6" }}>
                        <div style={{ position: "relative" }}>
                            <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#9ca3af" }} />
                            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search..."
                                style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 3, padding: "5px 9px 5px 28px", fontSize: 14, outline: "none" }}
                                onFocus={e => { e.target.style.borderColor = "#e41f07"; e.target.style.boxShadow = "none"; }}
                                onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }} />
                        </div>
                    </div>
                    <div style={{ overflowY: "auto", flex: 1 }}>
                        {filtered.map((o, idx) => (
                            <div key={idx}
                                onClick={() => { onChange(o); setOpen(false); setQ(""); }}
                                style={{ padding: "9px 12px", fontSize: 14, cursor: "pointer", background: value === o ? "#e41f07" : "transparent", color: value === o ? "#fff" : "#111827" }}
                                onMouseEnter={e => { if (value !== o) (e.currentTarget as HTMLDivElement).style.background = "#f3f4f6"; }}
                                onMouseLeave={e => { if (value !== o) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                            >
                                {o}
                            </div>
                        ))}
                        {!filtered.length && <div style={{ padding: "12px", fontSize: 14, color: "#9ca3af", textAlign: "center" }}>No options</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

interface Salesperson {
    name: string;
    email: string;
}

const SalespersonDropdown: React.FC<{
    value: Salesperson | null;
    onChange: (v: Salesperson | null) => void;
}> = ({ value, onChange }) => {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
    const [showManageModal, setShowManageModal] = useState(false);
    const [newName, setNewName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadSalespersons = () => {
            try {
                const s = localStorage.getItem("billing_salespersons_objects");
                if (s) {
                    setSalespersons(JSON.parse(s));
                } else {
                    const fallback = [
                        { name: "vijay", email: "vijayfemi9@gmail.com" },
                        { name: "Ravi M", email: "ravi@gmail.com" },
                        { name: "Priya K", email: "priya@gmail.com" }
                    ];
                    localStorage.setItem("billing_salespersons_objects", JSON.stringify(fallback));
                    setSalespersons(fallback);
                }
            } catch {
                // fallback
            }
        };
        loadSalespersons();
    }, []);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const filtered = salespersons.filter(s =>
        s.name.toLowerCase().includes(q.toLowerCase()) ||
        s.email.toLowerCase().includes(q.toLowerCase())
    );

    const handleAddSalesperson = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || !newEmail.trim()) return;
        const newSP = { name: newName.trim(), email: newEmail.trim() };
        const updated = [...salespersons, newSP];
        setSalespersons(updated);
        localStorage.setItem("billing_salespersons_objects", JSON.stringify(updated));
        onChange(newSP);
        setNewName("");
        setNewEmail("");
        setShowManageModal(false);
        setOpen(false);
    };

    const handleDeleteSalesperson = (emailToDelete: string) => {
        const updated = salespersons.filter(s => s.email !== emailToDelete);
        setSalespersons(updated);
        localStorage.setItem("billing_salespersons_objects", JSON.stringify(updated));
        if (value && value.email === emailToDelete) {
            onChange(null);
        }
    };

    return (
        <div ref={ref} style={{ position: "relative", width: "100%" }}>
            <div
                onClick={() => setOpen(o => !o)}
                style={{
                    height: 38,
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    background: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 12px",
                    cursor: "pointer",
                    fontSize: 14,
                    color: value ? "#111827" : "#9ca3af",
                    boxShadow: "none",
                    transition: "all 0.15s ease-in-out",
                }}
            >
                <span>{value ? `${value.name}` : "Select or Add Salesperson"}</span>
                <i className={`ti ${open ? "ti-chevron-up" : "ti-chevron-down"}`} style={{ fontSize: 13, color: "#6b7280" }} />
            </div>

            {open && (
                <div style={{
                    position: "absolute",
                    top: "calc(100% + 5px)",
                    left: 0,
                    right: 0,
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)",
                    zIndex: 1050,
                    display: "flex",
                    flexDirection: "column",
                    padding: "6px 0",
                }}>
                    <div style={{ padding: "6px 12px" }}>
                        <div style={{ position: "relative" }}>
                            <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#9ca3af" }} />
                            <input
                                autoFocus
                                value={q}
                                onChange={e => setQ(e.target.value)}
                                placeholder="Search"
                                style={{
                                    width: "100%",
                                    height: 34,
                                    border: "1px solid #d1d5db",
                                    borderRadius: 6,
                                    padding: "0 10px 0 30px",
                                    fontSize: 13,
                                    outline: "none",
                                    transition: "border-color 0.15s",
                                }}
                                onFocus={e => e.target.style.borderColor = "#e41f07"}
                                onBlur={e => e.target.style.borderColor = "#d1d5db"}
                            />
                        </div>
                    </div>

                    <div style={{ overflowY: "auto", maxHeight: 180, padding: "0 6px" }}>
                        {filtered.map((s, idx) => {
                            const isSelected = value && value.email === s.email;
                            return (
                                <div
                                    key={idx}
                                    onClick={() => { onChange(s); setOpen(false); setQ(""); }}
                                    style={{
                                        padding: "8px 12px",
                                        borderRadius: 6,
                                        cursor: "pointer",
                                        background: isSelected ? "#e41f07" : "transparent",
                                        color: isSelected ? "#fff" : "#1f2937",
                                        marginBottom: 2,
                                    }}
                                >
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                                    <div style={{ fontSize: 11, color: isSelected ? "rgba(255,255,255,0.85)" : "#6b7280", marginTop: 1 }}>{s.email}</div>
                                </div>
                            );
                        })}
                        {!filtered.length && (
                            <div style={{ padding: "16px", fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
                                No salesperson found
                            </div>
                        )}
                    </div>

                    <div style={{
                        borderTop: "1px solid #f3f4f6",
                        padding: "6px 12px 2px",
                        marginTop: 4,
                    }}>
                        <button
                            type="button"
                            onClick={() => { setShowManageModal(true); setOpen(false); }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                background: "none",
                                border: "none",
                                color: "#e41f07",
                                fontSize: 13,
                                fontWeight: 500,
                                padding: "4px 0",
                                cursor: "pointer",
                                width: "100%",
                                textAlign: "left",
                            }}
                        >
                            <i className="ti ti-settings" style={{ fontSize: 14 }} />
                            Manage Salespersons
                        </button>
                    </div>
                </div>
            )}

            {showManageModal && (
                <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.45)", zIndex: 1100 }}>
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 460 }}>
                        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12, overflow: "hidden" }}>
                            <div className="modal-header border-bottom px-4 py-3 d-flex align-items-center justify-content-between">
                                <h5 className="modal-title fw-bold fs-16 mb-0">Manage Salespersons</h5>
                                <button
                                    type="button"
                                    className="btn d-flex align-items-center justify-content-center p-0 rounded-circle border-0"
                                    onClick={() => setShowManageModal(false)}
                                    style={{ width: 28, height: 28, backgroundColor: "#fff5f4", color: "#e41f07" }}
                                >
                                    <i className="ti ti-x fs-14" />
                                </button>
                            </div>
                            <div className="modal-body px-4 py-4">
                                <form onSubmit={handleAddSalesperson} className="mb-3">
                                    <h6 className="fw-bold fs-15 mb-3">Add New Salesperson</h6>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold fs-13">Name</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            style={{ borderRadius: 3 }}
                                            value={newName}
                                            onChange={e => setNewName(e.target.value)}
                                            placeholder="Enter name"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold fs-13">Email</label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            style={{ borderRadius: 3 }}
                                            value={newEmail}
                                            onChange={e => setNewEmail(e.target.value)}
                                            placeholder="Enter email"
                                        />
                                    </div>
                                    <button type="submit" className="btn btn-danger w-100 fw-bold fs-14" style={{ borderRadius: 3 }}>
                                        Add Salesperson
                                    </button>
                                </form>
                                <hr className="my-3" />
                                <h6 className="fw-bold fs-15 mb-3">Current Salespersons</h6>
                                <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                                    {salespersons.map((s, idx) => (
                                        <div key={idx} className="d-flex align-items-center justify-content-between px-3 py-2 rounded border bg-light">
                                            <div>
                                                <div className="fw-bold fs-14 text-dark">{s.name}</div>
                                                <div className="fs-12 text-muted">{s.email}</div>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn p-1 text-danger border-0"
                                                style={{ textDecoration: "none", background: "none" }}
                                                onClick={() => handleDeleteSalesperson(s.email)}
                                                title="Delete"
                                            >
                                                <i className="ti ti-trash fs-16" />
                                            </button>
                                        </div>
                                    ))}
                                    {!salespersons.length && (
                                        <div className="text-center text-muted fs-13 py-3">No salesperson added yet.</div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer border-top px-4 py-3 d-flex justify-content-start">
                                <button
                                    type="button"
                                    className="btn fw-bold fs-14 px-4"
                                    style={{ background: "#6b7280", color: "#fff", borderRadius: 3, border: "none" }}
                                    onClick={() => setShowManageModal(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
const CreditNoteAdd: React.FC = () => {
    const navigate = useNavigate();
    const route = all_routes;
    const [searchParams] = useSearchParams();
    const editId = searchParams.get("edit");
    const fromInvoiceNumber = searchParams.get("invoiceNumber") || "";
    const fromCustomer = searchParams.get("customer") || "";
    const fromInvoiceId = searchParams.get("invoiceId") || "";

    const [customers, setCustomers] = useState<string[]>([]);
    const [invoices, setInvoices] = useState<string[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    const [cnDate, setCnDate] = useState(todayISO());
    const [cnNumber, setCnNumber] = useState("");
    const [customer, setCustomer] = useState("");
    const [invoiceRef, setInvoiceRef] = useState("");
    const [refNumber, setRefNumber] = useState("");
    const [location, setLocation] = useState("");
    const [reason, setReason] = useState("");
    const [notes, setNotes] = useState("");
    const [terms, setTerms] = useState("");
    const [items, setItems] = useState<LineItem[]>([emptyLine()]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [existingStatus, setExistingStatus] = useState<string | null>(null);
    const [salesperson, setSalesperson] = useState<Salesperson | null>(null);

    // Preferences Modal States
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [autoGenerate, setAutoGenerate] = useState(true);
    const [cnPrefix, setCnPrefix] = useState("CN-");
    const [nextCnNum, setNextCnNum] = useState("00001");
    const [restartNumbering, setRestartNumbering] = useState(false);

    // Bulk Add states
    const [showBulkAdd, setShowBulkAdd] = useState(false);
    const [bulkSearch, setBulkSearch] = useState("");
    const [bulkSelected, setBulkSelected] = useState<number[]>([]);
    const [bulkQtys, setBulkQtys] = useState<Record<number, string>>({});

    // Discount dropdown
    const [showDiscountDropdown, setShowDiscountDropdown] = useState(false);
    const [discountSearch, setDiscountSearch] = useState("");
    const [selectedDiscountAccount, setSelectedDiscountAccount] = useState("Discount");
    const discountBtnRef = useRef<HTMLDivElement>(null);
    const [discountPos, setDiscountPos] = useState<{ top: number; left: number } | null>(null);
    const [focusedDiscountId, setFocusedDiscountId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

    // Reporting Tags panel
    const [showReportingTagsPanel, setShowReportingTagsPanel] = useState(false);
    const reportingTagsBtnRef = useRef<HTMLButtonElement>(null);
    const [reportingTagsPos, setReportingTagsPos] = useState<{ top: number; left: number } | null>(null);

    // Totals
    const [taxType, setTaxType] = useState<"TDS" | "TCS">("TDS");
    const [selectedTax, setSelectedTax] = useState("");
    const [charges, setCharges] = useState<{ id: number; label: string; amount: string }[]>([
        { id: 1, label: "Courier Charges", amount: "" }
    ]);
    const addCharge = () => setCharges(p => [...p, { id: Date.now(), label: "Shipping Charges", amount: "" }]);
    const removeCharge = (id: number) => setCharges(p => p.filter(c => c.id !== id));
    const updateCharge = (id: number, field: "label" | "amount", val: string) => setCharges(p => p.map(c => c.id === id ? { ...c, [field]: val } : c));

    const [openDiscountType, setOpenDiscountType] = useState<number | null>(null);

    // Advanced search states
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
    const [advSearchField, setAdvSearchField] = useState("Display Name");
    const [advSearchQuery, setAdvSearchQuery] = useState("");
    const [advSearchPage, setAdvSearchPage] = useState(1);
    const ADV_SEARCH_PAGE_SIZE = 5;

    // Full customer objects for Advanced Customer Search
    const [customerObjects, setCustomerObjects] = useState<any[]>([]);

    const [openRow, setOpenRow] = useState<number | null>(null);
    const [rowSearch, setRowSearch] = useState("");
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
    const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

    const inpSt = (err?: boolean): React.CSSProperties => ({
        width: "100%", height: 36, padding: "0 10px", fontSize: 14,
        border: `1px solid ${err ? "#dc2626" : "#d1d5db"}`,
        borderRadius: 4, outline: "none", color: "#111827", background: "#fff",
        transition: "border-color 0.15s",
    });
    const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        e.target.style.borderColor = "#e41f07";
        e.target.style.boxShadow = "none";
    };
    const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        e.target.style.borderColor = "#d1d5db";
        e.target.style.boxShadow = "none";
    };

    useEffect(() => {
        const prods = loadJSON(PRODUCT_KEY).filter((p: any) => !p.isDeleted);
        setProducts(prods);

        const custs = loadJSON(CUSTOMER_KEY);
        setCustomerObjects(custs);
        const custNames = custs.map((c: any) => `${c.salutation || "Mr."} ${c.firstName || ""} ${c.lastName || ""}`.trim()).filter(Boolean);
        setCustomers(custNames.length ? custNames : ["Mr. vijay E", "Ms. Priya K", "Mr. Ravi M"]);

        const invs = loadJSON(INVOICE_KEY);
        const invNums = invs.map((i: any) => i.invoiceNumber || i.number || "").filter(Boolean);
        setInvoices(invNums);

        const existing = loadJSON(SK);

        // Load preferences
        const savedPrefs = (() => {
            try {
                return JSON.parse(localStorage.getItem("credit_note_preferences") || "{}");
            } catch { return {}; }
        })();
        const auto = savedPrefs.autoGenerate !== false;
        const prefix = savedPrefs.prefix || "CN-";

        setAutoGenerate(auto);
        setCnPrefix(prefix);
        setRestartNumbering(!!savedPrefs.restartNumbering);

        if (!editId) {
            if (auto) {
                const nextNum = existing.length ? Math.max(...existing.map((o: any) => {
                    const cleaned = (o.creditNoteNumber || "").replace(prefix, "");
                    const n = parseInt(cleaned);
                    return isNaN(n) ? 0 : n;
                })) + 1 : 1;
                const padded = String(nextNum).padStart(5, "0");
                setCnNumber(`${prefix}${padded}`);
                setNextCnNum(padded);
            } else {
                setCnNumber("");
            }
            if (fromInvoiceNumber) setInvoiceRef(fromInvoiceNumber);
            if (fromCustomer) setCustomer(fromCustomer);
            if (fromInvoiceId) {
                try {
                    const invItems = JSON.parse(localStorage.getItem(`billing_invoice_items_${fromInvoiceId}`) || "[]");
                    if (Array.isArray(invItems) && invItems.length > 0) {
                        const mapped: LineItem[] = invItems.map((it: any) => {
                            const rate = it.rate ?? it.price ?? 0;
                            const qty = it.qty ?? it.quantity ?? 1;
                            const taxPercent = it.tax ?? it.taxPercent ?? 0;
                            const nl: LineItem = {
                                id: Date.now() + Math.random(),
                                productId: it.id ?? "",
                                productName: it.itemName ?? it.productName ?? it.name ?? "",
                                sku: it.sku ?? "",
                                account: it.account ?? "",
                                quantity: qty,
                                rate,
                                discount: it.discount ?? 0,
                                discountType: it.discountType ?? "%",
                                taxPercent,
                                amount: 0,
                                reportingTag: "",
                            };
                            nl.amount = calcAmount(nl);
                            return nl;
                        });
                        setItems(mapped.length > 0 ? mapped : [emptyLine()]);
                    }
                } catch { /* ignore */ }
            }
        }
    }, [editId]);

    useEffect(() => {
        if (!editId) return;
        const all = loadJSON(SK);
        const o = all.find((x: any) => String(x.id) === editId);
        if (!o) return;
        setCnDate(o.date ? displayToIso(o.date) : todayISO());
        setCnNumber(o.creditNoteNumber || "");
        setCustomer(o.customerName || "");
        setInvoiceRef(o.invoiceNumber || "");
        setRefNumber(o.referenceNumber || "");
        setLocation(o.location || "");
        setReason(o.reason || "");
        setNotes(o.notes || "");
        setTerms(o.terms || "");
        setExistingStatus(o.status || null);
        setSalesperson(o.salesperson || null);
        if (Array.isArray(o.items) && o.items.length) setItems(o.items);
    }, [editId]);

    const computeDropdownPos = (id: number) => {
        const td = inputRefs.current[id]?.closest("td");
        if (!td) return;
        const r = td.getBoundingClientRect();
        setDropdownPos({ top: r.bottom + 4, left: r.left, width: r.width });
    };

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

    const updateLine = (id: number, field: keyof LineItem, val: any) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: val };
            updated.amount = calcAmount(updated);
            return updated;
        }));
    };

    const selectProduct = (rowId: number, product: any) => {
        setItems(prev => {
            const rate = product.selling_price ?? product.costPrice ?? product.price ?? product.mrp ?? product.unit_price ?? 0;
            const mapped = prev.map(item => {
                if (item.id !== rowId) return item;
                const updated = { ...item, productId: product.id, productName: product.name, sku: product.sku || "", rate };
                updated.amount = calcAmount(updated);
                return updated;
            });
            // Auto-add a new empty row if selecting from the last row
            const isLast = prev[prev.length - 1]?.id === rowId;
            return isLast ? [...mapped, emptyLine()] : mapped;
        });
        setOpenRow(null);
        setRowSearch("");
        setDropdownPos(null);
    };

    const addLine = () => setItems(p => [...p, emptyLine()]);
    const removeLine = (id: number) => setItems(p => {
        const next = p.filter(i => i.id !== id);
        return next.length > 0 ? next : [emptyLine()];
    });

    const subTotal = items.reduce((s, i) => {
        const gross = i.quantity * i.rate;
        const disc = i.discountType === "%" ? (gross * i.discount / 100) : i.discount;
        return s + (gross - disc);
    }, 0);
    const taxTotal = items.reduce((s, i) => {
        const gross = i.quantity * i.rate;
        const disc = i.discountType === "%" ? (gross * i.discount / 100) : i.discount;
        return s + (gross - disc) * i.taxPercent / 100;
    }, 0);
    const grandTotal = subTotal + taxTotal;

    const handleSavePreferences = () => {
        localStorage.setItem("credit_note_preferences", JSON.stringify({
            autoGenerate,
            prefix: cnPrefix,
            nextNumber: nextCnNum,
            restartNumbering
        }));

        if (autoGenerate) {
            setCnNumber(`${cnPrefix}${nextCnNum}`);
        } else {
            setCnNumber("");
        }
        setShowConfigModal(false);
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!customer) e.customer = "Customer is required";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const save = (saveStatus: "Open" | "Draft") => {
        if (!validate()) return;
        setSaving(true);
        let idToNav: string | null = editId;
        try {
            const existing = loadJSON(SK);
            const now = nowDatetime();
            const totalAmount = items.reduce((s, i) => s + calcAmount(i), 0);
            const chargesTotal = charges.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
            const record = {
                date: isoToDisplay(cnDate),
                creditNoteNumber: cnNumber || `CN-${Date.now()}`,
                customerName: customer,
                invoiceNumber: invoiceRef,
                referenceNumber: refNumber,
                location, reason, notes, terms,
                status: saveStatus,
                salesperson,
                taxType, selectedTax,
                charges,
                amount: totalAmount + chargesTotal,
                items,
                lastModifiedBy: "vickyyfemi9",
                lastModifiedTime: now,
            };
            let saved: any[];
            if (editId) {
                saved = existing.map((o: any) =>
                    String(o.id) === editId
                        ? { ...o, ...record, createdBy: o.createdBy, createdTime: o.createdTime }
                        : o
                );
            } else {
                const id = existing.length ? Math.max(...existing.map((o: any) => Number(o.id) || 0)) + 1 : 1;
                idToNav = String(id);
                saved = [...existing, { id, ...record, createdBy: "vickyyfemi9", createdTime: now }];
                if (autoGenerate) {
                    const nextNum = parseInt(nextCnNum) + 1;
                    const padded = String(nextNum).padStart(5, "0");
                    localStorage.setItem("credit_note_preferences", JSON.stringify({
                        autoGenerate, prefix: cnPrefix, nextNumber: padded, restartNumbering
                    }));
                }
            }
            localStorage.setItem(SK, JSON.stringify(saved));
        } catch (err) {
            console.error(err);
            setSaving(false);
            return;
        }
        setSaving(false);
        if (idToNav && route.creditNoteView) {
            navigate(route.creditNoteView.replace(":id", String(idToNav)));
        } else {
            navigate(route.creditNoteList);
        }
    };

    return (
        <>
        <div className="page-wrapper" style={{ background: "#f5f6fa", minHeight: "100vh" }}>
            <style>{`
                .invoice-table-scroll {
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .invoice-table-scroll::-webkit-scrollbar {
                    display: none;
                }
                @media (min-width: 768px) {
                    .invoice-table-scroll {
                        overflow: visible !important;
                    }
                }
                .credit-totals-box {
                    width: 460px;
                }
                @media (max-width: 600px) {
                    .credit-totals-box {
                        width: 100%;
                        margin-left: 0 !important;
                    }
                    .credit-totals-box input,
                    .credit-totals-box select {
                        font-size: 12px !important;
                    }
                }
            `}</style>
            <div className="content container-fluid" style={{ padding: "24px 28px" }}>

                {/* ── Page Header ── */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <div>
                        <h4 style={{ fontWeight: 700, fontSize: 19, marginBottom: 3, color: "#111827" }}>
                            {editId ? "Edit Credit Note" : "New Credit Note"}
                        </h4>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "#6b7280" }}>
                            <span onClick={() => navigate(route.creditNoteList)} style={{ cursor: "pointer", color: "#9ca3af" }}>Credit Notes</span>
                            <span>›</span>
                            <span style={{ color: "#374151", fontWeight: 500 }}>{editId ? "Edit" : "New"}</span>
                        </div>
                    </div>
                    <button onClick={() => navigate(route.creditNoteList)}
                        style={{ width: 34, height: 34, borderRadius: 4, background: "#fff", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        <i className="ti ti-x" style={{ fontSize: 15, color: "#6b7280" }} />
                    </button>
                </div>

                {/* ── Main Card ── */}
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>

                    {/* ── Form Fields ── */}
                    <div style={{ padding: "24px 32px 16px", borderBottom: "1px solid #e5e7eb" }}>

                        {/* Customer Name */}
                        <div className="d-flex flex-column flex-md-row align-items-md-center mb-3">
                            <label style={{ minWidth: 200, fontSize: 14, fontWeight: 500, color: "#e41f07", flexShrink: 0 }}>
                                Customer Name <span style={{ color: "#dc2626" }}>*</span>
                            </label>
                            <div style={{ flex: 1, maxWidth: 380 }}>
                                <div style={{ display: "flex", gap: 0, alignItems: "center", width: "100%" }}>
                                    <div style={{ flex: 1 }}>
                                        <SD value={customer} placeholder="Select a customer" options={customers}
                                            onChange={v => { setCustomer(v); setErrors(p => ({ ...p, customer: "" })); }}
                                            error={!!errors.customer}
                                            borderRadius="4px 0 0 4px" />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setAdvSearchQuery(""); setAdvSearchPage(1); setShowAdvancedSearch(true); }}
                                        style={{
                                            width: 38,
                                            height: 36,
                                            background: "#e41f07",
                                            border: "1px solid #e41f07",
                                            borderRadius: "0 4px 4px 0",
                                            color: "#fff",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            cursor: "pointer",
                                            flexShrink: 0
                                        }}
                                    >
                                        <i className="ti ti-search" style={{ fontSize: 15 }} />
                                    </button>
                                </div>
                                {errors.customer && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 3 }}>{errors.customer}</div>}
                            </div>
                        </div>

                        {/* Credit Note# and Date in a row */}
                        <div className="d-flex flex-column flex-md-row gap-md-4 mb-3">
                            <div className="d-flex flex-column flex-md-row align-items-md-center flex-grow-1">
                                <label style={{ minWidth: 200, fontSize: 14, fontWeight: 500, color: "#374151", flexShrink: 0 }}>Credit Note#</label>
                                <div style={{ flex: 1, maxWidth: 220, position: "relative" }}>
                                    <input type="text" value={cnNumber} onChange={e => setCnNumber(e.target.value)}
                                        placeholder="CN-00001" style={{ ...inpSt(), paddingRight: 36 }}
                                        onFocus={onFocus} onBlur={onBlur} disabled={autoGenerate} />
                                    <button type="button" onClick={() => setShowConfigModal(true)}
                                        style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 0, color: "#e41f07", cursor: "pointer", display: "flex", alignItems: "center" }}>
                                        <i className="ti ti-settings" style={{ fontSize: 16 }} />
                                    </button>
                                </div>
                            </div>
                            <div className="d-flex flex-column flex-md-row align-items-md-center flex-grow-1">
                                <label style={{ minWidth: 120, fontSize: 14, fontWeight: 500, color: "#374151", flexShrink: 0 }}>Date</label>
                                <div style={{ flex: 1, maxWidth: 220 }}>
                                    <input type="date" value={cnDate} onChange={e => setCnDate(e.target.value)}
                                        style={inpSt()}
                                        onFocus={onFocus} onBlur={onBlur} />
                                </div>
                            </div>
                        </div>

                        {/* Invoice# */}
                        <div className="d-flex flex-column flex-md-row align-items-md-center mb-3">
                            <label style={{ minWidth: 200, fontSize: 14, fontWeight: 500, color: "#374151", flexShrink: 0 }}>Invoice#</label>
                            <div style={{ flex: 1, maxWidth: 380 }}>
                                <SD value={invoiceRef} placeholder="Select invoice (optional)" options={invoices}
                                    onChange={setInvoiceRef} />
                            </div>
                        </div>

                        {/* Reference Number */}
                        <div className="d-flex flex-column flex-md-row align-items-md-center mb-3">
                            <label style={{ minWidth: 200, fontSize: 14, fontWeight: 500, color: "#374151", flexShrink: 0 }}>Reference Number</label>
                            <div style={{ flex: 1, maxWidth: 380 }}>
                                <input type="text" value={refNumber} onChange={e => setRefNumber(e.target.value)}
                                    placeholder="Enter reference number" style={inpSt()}
                                    onFocus={onFocus} onBlur={onBlur} />
                            </div>
                        </div>

                        {/* Location */}
                        <div className="d-flex flex-column flex-md-row align-items-md-center mb-3">
                            <label style={{ minWidth: 200, fontSize: 14, fontWeight: 500, color: "#374151", flexShrink: 0 }}>
                                Location
                            </label>
                            <div style={{ flex: 1, maxWidth: 380 }}>
                                <SD value={location} placeholder="Select location" options={LOCATIONS}
                                    onChange={v => setLocation(v)} />
                            </div>
                        </div>

                        {/* Salesperson */}
                        <div className="d-flex flex-column flex-md-row align-items-md-center mb-3">
                            <label style={{ minWidth: 200, fontSize: 14, fontWeight: 500, color: "#374151", flexShrink: 0 }}>Salesperson</label>
                            <div style={{ flex: 1, maxWidth: 380 }}>
                                <SalespersonDropdown value={salesperson} onChange={setSalesperson} />
                            </div>
                        </div>

                        {/* Reason */}
                        <div className="d-flex flex-column flex-md-row align-items-md-center mb-3">
                            <label style={{ minWidth: 200, fontSize: 14, fontWeight: 500, color: "#374151", flexShrink: 0 }}>Reason</label>
                            <div style={{ flex: 1, maxWidth: 380 }}>
                                <SD value={reason} placeholder="Select reason" options={["Goods Returned", "Service Cancelled", "Billing Error", "Price Adjustment", "Duplicate Invoice", "Other"]}
                                    onChange={setReason} />
                            </div>
                        </div>
                    </div>

                    {/* ── Line Items ── */}
                    <div>
                        {/* Header */}
                        <div style={{ padding: "13px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center" }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Item Table</span>
                        </div>

                        <div style={{ padding: "16px 24px 0" }}>
                        <div style={{ border: "1px solid #e5e7eb", borderRadius: 6, overflow: "hidden" }}>
                            <div className="invoice-table-scroll">
                                <table className="table mb-0" style={{ fontSize: 14, minWidth: 900 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: 40, borderBottom: "1px solid #e5e7eb", background: "#f9fafb", borderTop: "none" }}></th>
                                            <th style={{ borderBottom: "1px solid #e5e7eb", background: "#f9fafb", borderTop: "none", fontSize: 13, fontWeight: 700, color: "#6b7280" }}>ITEM DETAILS</th>
                                            <th style={{ width: 160, borderBottom: "1px solid #e5e7eb", background: "#f9fafb", borderTop: "none", fontSize: 13, fontWeight: 700, color: "#6b7280" }}>ACCOUNT</th>
                                            <th style={{ width: 100, borderBottom: "1px solid #e5e7eb", background: "#f9fafb", borderTop: "none", fontSize: 13, fontWeight: 700, color: "#6b7280" }} className="text-end">QUANTITY</th>
                                            <th style={{ width: 110, borderBottom: "1px solid #e5e7eb", background: "#f9fafb", borderTop: "none", fontSize: 13, fontWeight: 700, color: "#6b7280" }} className="text-end">
                                                RATE <i className="ti ti-layout-grid fs-12 text-muted" />
                                            </th>
                                            <th style={{ width: 130, borderBottom: "1px solid #e5e7eb", background: "#f9fafb", borderTop: "none", fontSize: 13, fontWeight: 700, color: "#6b7280" }} className="text-end">DISCOUNT</th>
                                            <th style={{ width: 120, borderBottom: "1px solid #e5e7eb", background: "#f9fafb", borderTop: "none", fontSize: 13, fontWeight: 700, color: "#6b7280" }} className="text-end">AMOUNT</th>
                                            <th style={{ width: 60, borderBottom: "1px solid #e5e7eb", background: "#f9fafb", borderTop: "none" }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map(item => (
                                            <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                                {/* Drag */}
                                                <td className="text-center align-middle py-3">
                                                    <i className="ti ti-grip-vertical text-muted fs-14" />
                                                </td>

                                                {/* Product */}
                                                <td className="align-middle py-3" style={{ minWidth: 220 }}>
                                                    <div className="d-flex align-items-start gap-2">
                                                        <div style={{ width: 32, height: 32, borderRadius: 4, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid #e5e7eb" }}>
                                                            <i className="ti ti-photo text-muted" style={{ fontSize: 14 }} />
                                                        </div>
                                                        <div className="item-search-container" style={{ position: "relative", flex: 1 }}>
                                                            <input
                                                                className="form-control shadow-none fw-medium px-3 py-2"
                                                                ref={el => { inputRefs.current[item.id] = el; }}
                                                                value={item.productName}
                                                                onChange={e => {
                                                                    updateLine(item.id, "productName", e.target.value);
                                                                    setOpenRow(item.id);
                                                                    setRowSearch(e.target.value);
                                                                    computeDropdownPos(item.id);
                                                                }}
                                                                onFocus={() => { setOpenRow(item.id); setRowSearch(item.productName); computeDropdownPos(item.id); }}
                                                                onBlur={() => setTimeout(() => { setOpenRow(null); setRowSearch(""); setDropdownPos(null); }, 200)}
                                                                placeholder="Type or click to select an item."
                                                                style={{ fontSize: 14, color: "#111827", border: "1px solid #e5e7eb", borderRadius: 4, backgroundColor: "#fff" }}
                                                            />
                                                            {item.sku && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>SKU: {item.sku}</div>}
                                                            {openRow === item.id && dropdownPos && (
                                                                <div style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, background: "#fff", border: "1px solid #d1d5db", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 9999, maxHeight: 220, overflowY: "auto" }}>
                                                                    {products.length === 0 && (
                                                                        <div style={{ padding: 14, textAlign: "center", fontSize: 13, color: "#9ca3af" }}>No products found. Add products first.</div>
                                                                    )}
                                                                    {products
                                                                        .filter(p => !rowSearch || p.name?.toLowerCase().includes(rowSearch.toLowerCase()) || p.sku?.toLowerCase().includes(rowSearch.toLowerCase()))
                                                                        .map(p => (
                                                                            <div key={p.id}
                                                                                onMouseDown={() => selectProduct(item.id, p)}
                                                                                style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f3f4f6" }}
                                                                                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "#f3f4f6"; }}
                                                                                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "#fff"; }}>
                                                                                <div>
                                                                                    <div style={{ fontWeight: 500, color: "#111827" }}>{p.name}</div>
                                                                                    {p.sku && <div style={{ fontSize: 11, color: "#9ca3af" }}>SKU: {p.sku}</div>}
                                                                                </div>
                                                                                <div style={{ fontSize: 12, color: "#6b7280" }}>₹{p.selling_price ?? p.costPrice ?? 0}</div>
                                                                            </div>
                                                                        ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Account */}
                                                <td className="align-middle py-3">
                                                    <select
                                                        className="form-select shadow-none"
                                                        value={item.account}
                                                        onChange={e => updateLine(item.id, "account", e.target.value)}
                                                        style={{ fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 4, color: item.account ? "#111827" : "#9ca3af" }}
                                                    >
                                                        <option value="">Select an account</option>
                                                        <option value="Sales">Sales</option>
                                                        <option value="Discount">Discount</option>
                                                        <option value="Revenue">Revenue</option>
                                                        <option value="Other Income">Other Income</option>
                                                    </select>
                                                </td>

                                                {/* Qty */}
                                                <td className="align-middle text-end py-3">
                                                    <input
                                                        className="form-control text-end shadow-none px-2 py-2"
                                                        type="number" min={1}
                                                        value={item.quantity === 0 ? "" : item.quantity}
                                                        onChange={e => updateLine(item.id, "quantity", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                                                        style={{ fontSize: 14, border: "1px solid #e5e7eb", borderRadius: 4, backgroundColor: "#fff" }}
                                                        onFocus={onFocus} onBlur={onBlur} />
                                                </td>

                                                {/* Rate */}
                                                <td className="align-middle text-end py-3">
                                                    <input
                                                        className="form-control text-end shadow-none px-2 py-2"
                                                        type="number" min={0}
                                                        value={item.rate === 0 ? "" : item.rate}
                                                        onChange={e => updateLine(item.id, "rate", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                                                        style={{ fontSize: 14, border: "1px solid #e5e7eb", borderRadius: 4, backgroundColor: "#fff" }}
                                                        onFocus={onFocus} onBlur={onBlur} />
                                                </td>

                                                {/* Discount */}
                                                <td className="align-middle text-end py-3">
                                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", position: "relative" }}>
                                                        <div style={{ display: "flex", border: `1px solid ${focusedDiscountId === item.id ? "#e41f07" : "#e5e7eb"}`, borderRadius: 4, overflow: "visible", background: "#fff", transition: "border-color 0.15s" }}>
                                                            <input
                                                                className="shadow-none"
                                                                type="number" min={0}
                                                                value={item.discount === 0 ? "" : item.discount}
                                                                onChange={e => updateLine(item.id, "discount", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                                                                style={{ fontSize: 14, border: "none", outline: "none", width: 48, padding: "4px 6px", textAlign: "center", background: "transparent" }}
                                                                onFocus={() => setFocusedDiscountId(item.id)}
                                                                onBlur={() => setFocusedDiscountId(null)}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setOpenDiscountType(openDiscountType === item.id ? null : item.id)}
                                                                style={{ display: "flex", alignItems: "center", gap: 2, padding: "0 7px", background: "#e41f07", border: "none", borderLeft: "1px solid #e5e7eb", cursor: "pointer", color: "#fff", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}
                                                            >
                                                                {item.discountType === "%" ? "%" : "₹"}
                                                                <i className="ti ti-chevron-down" style={{ fontSize: 10 }} />
                                                            </button>
                                                        </div>
                                                        {openDiscountType === item.id && (
                                                            <div style={{ position: "absolute", top: "calc(100% + 2px)", right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 999, minWidth: 80 }}>
                                                                {(["%", "flat"] as const).map(type => (
                                                                    <div key={type}
                                                                        onClick={() => { updateLine(item.id, "discountType", type); setOpenDiscountType(null); }}
                                                                        style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer", color: item.discountType === type ? "#e41f07" : "#374151", fontWeight: item.discountType === type ? 600 : 400, background: item.discountType === type ? "#fff5f5" : "#fff" }}
                                                                        onMouseEnter={e => { if (item.discountType !== type) (e.currentTarget as HTMLDivElement).style.background = "#f9fafb"; }}
                                                                        onMouseLeave={e => { if (item.discountType !== type) (e.currentTarget as HTMLDivElement).style.background = "#fff"; }}
                                                                    >
                                                                        {type === "%" ? "% Percentage" : "₹ Flat Amount"}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Amount + Actions */}
                                                <td className="align-middle text-end py-3">
                                                    <input
                                                        className="form-control text-end shadow-none px-2"
                                                        type="text"
                                                        readOnly
                                                        value={item.amount.toFixed(2)}
                                                        style={{ fontSize: 14, fontWeight: 700, color: "#111827", minWidth: 80, backgroundColor: "#fff", border: "1px solid #dee2e6", borderRadius: 4 }}
                                                    />
                                                </td>

                                                {/* Actions */}
                                                <td className="align-middle text-center py-3">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm p-0 border-0 shadow-none"
                                                        style={{ color: "#ef4444", cursor: "pointer" }}
                                                        onClick={() => removeLine(item.id)}
                                                        title="Delete row"
                                                    >
                                                        <i className="ti ti-trash fs-16" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Discount & Reporting Tags */}
                            <div style={{ padding: "10px 16px", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
                                {/* Discount button + dropdown */}
                                <div ref={discountBtnRef} style={{ position: "relative" }}>
                                    <button
                                        type="button"
                                        className="btn btn-sm border shadow-none d-flex align-items-center gap-1"
                                        onClick={() => {
                                            setShowReportingTagsPanel(false);
                                            setDiscountSearch("");
                                            if (!showDiscountDropdown && discountBtnRef.current) {
                                                const r = discountBtnRef.current.getBoundingClientRect();
                                                setDiscountPos({ top: r.bottom + 4, left: r.left });
                                            }
                                            setShowDiscountDropdown(v => !v);
                                        }}
                                        style={{ fontSize: 13, borderRadius: 4, padding: "4px 10px", color: "#374151", background: "#fff", borderColor: "#dee2e6" }}
                                    >
                                        <i className="ti ti-square-check fs-13" style={{ color: "#374151" }} />
                                        Discount
                                        <i className={`ti ${showDiscountDropdown ? "ti-chevron-up" : "ti-chevron-down"} fs-11 text-muted`} />
                                    </button>
                                    {showDiscountDropdown && discountPos && (
                                        <div style={{ position: "fixed", top: discountPos.top, left: discountPos.left, width: 240, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 9999 }}>
                                            <div style={{ padding: "8px 10px", borderBottom: "1px solid #f3f4f6" }}>
                                                <div style={{ position: "relative" }}>
                                                    <i className="ti ti-search" style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#9ca3af" }} />
                                                    <input autoFocus value={discountSearch} onChange={e => setDiscountSearch(e.target.value)} placeholder="Search"
                                                        style={{ width: "100%", border: "1px solid #e41f07", borderRadius: 4, padding: "5px 8px 5px 26px", fontSize: 13, outline: "none" }} />
                                                </div>
                                            </div>
                                            <div style={{ maxHeight: 240, overflowY: "auto" }}>
                                                {[
                                                    { group: "Equity", items: ["Dividends Paid", "Drawings", "Investments", "Opening Balance Offset", "Owner's Equity"] },
                                                    { group: "Income", items: ["Discount", "Revenue", "Other Income"] },
                                                ].map(({ group, items }) => {
                                                    const filtered = items.filter(i => !discountSearch || i.toLowerCase().includes(discountSearch.toLowerCase()));
                                                    if (!filtered.length) return null;
                                                    return (
                                                        <div key={group}>
                                                            <div style={{ padding: "6px 12px 2px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>{group}</div>
                                                            {filtered.map(acct => (
                                                                <div key={acct}
                                                                    onMouseDown={() => { setSelectedDiscountAccount(acct); setShowDiscountDropdown(false); }}
                                                                    style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: selectedDiscountAccount === acct ? "#e41f07" : "transparent", color: selectedDiscountAccount === acct ? "#fff" : "#111827" }}
                                                                    onMouseEnter={e => { if (selectedDiscountAccount !== acct) (e.currentTarget as HTMLDivElement).style.background = "#f3f4f6"; }}
                                                                    onMouseLeave={e => { if (selectedDiscountAccount !== acct) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                                                                >
                                                                    {acct}
                                                                    {selectedDiscountAccount === acct && <i className="ti ti-check fs-13" />}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {selectedDiscountAccount && (
                                                <div style={{ padding: "6px 12px", borderTop: "1px solid #f3f4f6", fontSize: 12, color: "#6b7280", textAlign: "center" }}>{selectedDiscountAccount}</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Reporting Tags button + panel */}
                                <div style={{ position: "relative" }}>
                                    <button
                                        ref={reportingTagsBtnRef}
                                        type="button"
                                        className="btn btn-sm border shadow-none d-flex align-items-center gap-1"
                                        onClick={() => {
                                            setShowDiscountDropdown(false);
                                            if (!showReportingTagsPanel && reportingTagsBtnRef.current) {
                                                const r = reportingTagsBtnRef.current.getBoundingClientRect();
                                                setReportingTagsPos({ top: r.bottom + 4, left: r.left });
                                            }
                                            setShowReportingTagsPanel(v => !v);
                                        }}
                                        style={{ fontSize: 13, borderRadius: 4, padding: "4px 10px", color: "#374151", background: "#fff", borderColor: "#dee2e6" }}
                                    >
                                        <i className="ti ti-tag fs-13" style={{ color: "#6b7280" }} />
                                        Reporting Tags
                                        <i className={`ti ${showReportingTagsPanel ? "ti-chevron-up" : "ti-chevron-down"} fs-11 text-muted`} />
                                    </button>
                                </div>
                            </div>

                            {/* Add New Row + Add Items in Bulk */}
                            <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "12px 16px", background: "#fcfdfe" }}>
                                <button onClick={addLine} type="button"
                                    style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#e41f07", fontWeight: 500, padding: 0 }}>
                                    <i className="ti ti-circle-plus" style={{ fontSize: 15 }} /> Add New Row
                                </button>
                                <button type="button" onClick={() => { setBulkSearch(""); setBulkSelected([]); setBulkQtys({}); setShowBulkAdd(true); }}
                                    style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#e41f07", fontWeight: 500, padding: 0 }}>
                                    <i className="ti ti-circle-plus" style={{ fontSize: 15 }} /> Add Items in Bulk
                                </button>
                            </div>
                        </div>
                        </div>

                        {/* Totals */}
                        <div style={{ padding: "8px 24px 20px" }}>
                            <div className="credit-totals-box" style={{ marginLeft: "auto", border: "1px solid #e5e7eb", borderRadius: 6, overflow: "hidden", background: "#fff" }}>
                                {/* Sub Total */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #e5e7eb" }}>
                                    <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Sub Total</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: "#111827", width: 80, textAlign: "right" }}>{subTotal.toFixed(2)}</span>
                                        <span style={{ width: 24 }} />
                                    </div>
                                </div>

                                {/* TDS / TCS */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid #e5e7eb", gap: 12, overflow: "visible" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#374151", cursor: "pointer", margin: 0 }}>
                                            <input type="radio" name="taxType" checked={taxType === "TDS"} onChange={() => { setTaxType("TDS"); setSelectedTax(""); }}
                                                style={{ accentColor: "#e41f07", cursor: "pointer" }} />
                                            TDS
                                        </label>
                                        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#374151", cursor: "pointer", margin: 0 }}>
                                            <input type="radio" name="taxType" checked={taxType === "TCS"} onChange={() => { setTaxType("TCS"); setSelectedTax(""); }}
                                                style={{ accentColor: "#e41f07", cursor: "pointer" }} />
                                            TCS
                                        </label>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <select
                                            value={selectedTax}
                                            onChange={e => setSelectedTax(e.target.value)}
                                            className="form-select shadow-none"
                                            style={{ fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4, padding: "4px 24px 4px 10px", height: 32, color: selectedTax ? "#111827" : "#9ca3af", minWidth: 130 }}
                                        >
                                            <option value="">Select a Tax</option>
                                            <option value="5">5%</option>
                                            <option value="10">10%</option>
                                            <option value="18">18%</option>
                                            <option value="28">28%</option>
                                        </select>
                                        <span style={{ fontSize: 14, color: "#374151", width: 80, textAlign: "right" }}>
                                            {selectedTax ? (subTotal * parseFloat(selectedTax) / 100).toFixed(2) : "0.00"}
                                        </span>
                                        <span style={{ width: 24 }} />
                                    </div>
                                </div>

                                {/* Charges rows */}
                                {charges.map(charge => (
                                    <div key={charge.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid #e5e7eb", gap: 12 }}>
                                        <input
                                            type="text"
                                            value={charge.label}
                                            onChange={e => updateCharge(charge.id, "label", e.target.value)}
                                            style={{ fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4, padding: "4px 10px", height: 32, width: 150, color: "#374151", background: "#fff", outline: "none" }}
                                            onFocus={e => { e.target.style.borderColor = "#e41f07"; }}
                                            onBlur={e => { e.target.style.borderColor = "#d1d5db"; }}
                                        />
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                            <input
                                                type="number"
                                                value={charge.amount}
                                                onChange={e => updateCharge(charge.id, "amount", e.target.value)}
                                                placeholder="0"
                                                style={{ fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4, padding: "4px 8px", height: 32, width: 80, color: "#374151", background: "#fff", outline: "none", textAlign: "right" }}
                                                onFocus={e => { e.target.style.borderColor = "#e41f07"; }}
                                                onBlur={e => { e.target.style.borderColor = "#d1d5db"; }}
                                            />
                                            <button type="button" onClick={() => removeCharge(charge.id)}
                                                style={{ background: "none", border: "none", cursor: "pointer", color: "#e41f07", fontSize: 18, lineHeight: 1, padding: 0, display: "flex", alignItems: "center", width: 24, flexShrink: 0 }}>
                                                <i className="ti ti-circle-x" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* Add Charge */}
                                <div style={{ padding: "8px 16px", borderBottom: "1px solid #e5e7eb" }}>
                                    <button type="button" onClick={addCharge}
                                        style={{ background: "none", border: "none", cursor: "pointer", color: "#e41f07", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, padding: 0 }}>
                                        <i className="ti ti-circle-plus fs-15" /> Add Charge
                                    </button>
                                </div>

                                {/* Total */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Total (₹)</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: "#111827", width: 80, textAlign: "right" }}>
                                            {(grandTotal
                                                - (selectedTax ? subTotal * parseFloat(selectedTax) / 100 : 0)
                                                + charges.reduce((s, c) => s + (c.amount ? parseFloat(c.amount) : 0), 0)
                                            ).toFixed(2)}
                                        </span>
                                        <span style={{ width: 24 }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notes & Terms */}
                        <div style={{ padding: "0 24px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, borderTop: "1px solid #e5e7eb", paddingTop: 20 }}>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6, display: "block" }}>Customer Notes</label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value.slice(0, 500))} rows={4}
                                    placeholder="Notes visible to customer..."
                                    style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4, outline: "none", resize: "vertical", color: "#374151", lineHeight: 1.6 }}
                                    onFocus={onFocus} onBlur={onBlur} />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6, display: "block" }}>Terms & Conditions</label>
                                <textarea value={terms} onChange={e => setTerms(e.target.value.slice(0, 500))} rows={4}
                                    placeholder="Terms and conditions..."
                                    style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4, outline: "none", resize: "vertical", color: "#374151", lineHeight: 1.6 }}
                                    onFocus={onFocus} onBlur={onBlur} />
                            </div>
                        </div>

                        {/* Attach File */}
                        <div style={{ padding: "0 24px 22px" }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 10 }}>Attach File(s) to credit note</div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="*/*"
                                style={{ display: "none" }}
                                onChange={e => {
                                    const files = Array.from(e.target.files || []);
                                    setAttachedFiles(prev => {
                                        const combined = [...prev, ...files];
                                        return combined.slice(0, 5);
                                    });
                                    e.target.value = "";
                                }}
                            />
                            <div style={{ display: "flex", alignItems: "center" }}>
                                <button type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", border: "1px solid #d1d5db", borderRight: "none", borderRadius: "4px 0 0 4px", padding: "6px 14px", cursor: "pointer", fontSize: 13, color: "#374151", fontWeight: 500 }}>
                                    <i className="ti ti-upload" style={{ fontSize: 14 }} /> Upload File
                                </button>
                                <button type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{ height: 34, width: 32, background: "#fff", border: "1px solid #d1d5db", borderRadius: "0 4px 4px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <i className="ti ti-chevron-down" style={{ fontSize: 12, color: "#6b7280" }} />
                                </button>
                            </div>
                            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>You can upload a maximum of 5 files, 10MB each</div>
                            {attachedFiles.length > 0 && (
                                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                                    {attachedFiles.map((f, i) => (
                                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 4, fontSize: 13 }}>
                                            <i className="ti ti-paperclip" style={{ color: "#6b7280", fontSize: 13 }} />
                                            <span style={{ flex: 1, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                                            <span style={{ color: "#9ca3af", fontSize: 11 }}>{(f.size / 1024).toFixed(0)} KB</span>
                                            <button type="button" onClick={() => setAttachedFiles(p => p.filter((_, idx) => idx !== i))}
                                                style={{ background: "none", border: "none", cursor: "pointer", color: "#e41f07", padding: 0, fontSize: 14, lineHeight: 1 }}>
                                                <i className="ti ti-x" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Bottom Actions ── */}
                    <div style={{ padding: "16px 24px", display: "flex", flexWrap: "nowrap", alignItems: "center", gap: 10, borderTop: "1px solid #e5e7eb", background: "#fff", borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }}>
                        {/* 1st: Save / Convert to Open (Red) */}
                        {!editId && (
                            <button
                                type="button"
                                className="btn fw-bold fs-14 text-white px-4"
                                style={{ background: "#e41f07", border: "1px solid #e41f07", borderRadius: 4, height: 38, opacity: saving ? 0.7 : 1 }}
                                onClick={() => save("Open")}
                                disabled={saving}
                            >
                                {saving ? "Saving..." : "Save"}
                            </button>
                        )}
                        {editId && existingStatus === "Draft" && (
                            <button
                                type="button"
                                className="btn fw-bold fs-14 text-white px-4"
                                style={{ background: "#e41f07", border: "1px solid #e41f07", borderRadius: 4, height: 38, opacity: saving ? 0.7 : 1 }}
                                onClick={() => save("Open")}
                                disabled={saving}
                            >
                                {saving ? "Saving..." : "Convert to Open"}
                            </button>
                        )}
                        {editId && existingStatus === "Open" && (
                            <button
                                type="button"
                                className="btn fw-bold fs-14 text-white px-4"
                                style={{ background: "#e41f07", border: "1px solid #e41f07", borderRadius: 4, height: 38, opacity: saving ? 0.7 : 1 }}
                                onClick={() => save("Open")}
                                disabled={saving}
                            >
                                {saving ? "Saving..." : "Save"}
                            </button>
                        )}

                        {/* 2nd: Save as Draft (Orange) */}
                        {(!editId || existingStatus === "Draft") && (
                            <button
                                type="button"
                                className="btn fw-bold fs-14 text-white px-4"
                                style={{ background: "#e79111ff", border: "1px solid #e79111ff", borderRadius: 4, height: 38, opacity: saving ? 0.7 : 1 }}
                                onClick={() => save("Draft")}
                                disabled={saving}
                            >
                                {saving ? "Saving..." : "Save as Draft"}
                            </button>
                        )}

                        {/* 3rd: Cancel (White/Outline) */}
                        <button
                            type="button"
                            className="btn fw-bold fs-14 px-4"
                            style={{ background: "#fff", border: "1px solid #d0d5dd", borderRadius: 4, height: 38, color: "#344054" }}
                            onClick={() => navigate(route.creditNoteList)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>

                {/* Configure Credit Note Number Preferences Modal */}
                {showConfigModal && (
                    <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.45)", zIndex: 1050 }}>
                        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 480 }}>
                            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12, overflow: "hidden" }}>
                                {/* Header */}
                                <div className="modal-header border-bottom px-4 py-3 d-flex align-items-center justify-content-between">
                                    <h5 className="modal-title fw-bold mb-0" style={{ fontSize: 16 }}>Configure Credit Note Number Preferences</h5>
                                    <button type="button"
                                        className="btn d-flex align-items-center justify-content-center p-0 rounded-circle border-0"
                                        onClick={() => setShowConfigModal(false)}
                                        style={{ width: 28, height: 28, backgroundColor: "#fff5f4", color: "#e41f07" }}>
                                        <i className="ti ti-x fs-14" />
                                    </button>
                                </div>
                                {/* Body */}
                                <div className="modal-body px-4 py-3" style={{ fontSize: 14 }}>
                                    <div className="d-flex gap-4 mb-3">
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 4 }}>Location</div>
                                            <div style={{ fontSize: 14, color: "#374151" }}>Head Office</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 4 }}>Associated Series</div>
                                            <div style={{ fontSize: 14, color: "#374151" }}>Default Transaction Series</div>
                                        </div>
                                    </div>

                                    <hr style={{ borderTop: "1px solid #e5e7eb", margin: "16px 0" }} />

                                    <div className="mb-3">
                                        <p style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.5, margin: 0 }}>
                                            Your credit note numbers are set on auto-generate mode to save your time. Are you sure about changing this setting?
                                        </p>
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: 14, color: "#1f2937" }}>
                                            <input type="radio" checked={autoGenerate} onChange={() => setAutoGenerate(true)} style={{ marginTop: 3, accentColor: "#e41f07" }} />
                                            <span>
                                                Continue auto-generating credit note numbers
                                                <i className="ti ti-info-circle" style={{ marginLeft: 4, color: "#9ca3af", fontSize: 14 }} />
                                            </span>
                                        </label>

                                        {autoGenerate && (
                                            <div style={{ paddingLeft: 22, display: "flex", flexDirection: "column", gap: 12 }}>
                                                <div style={{ display: "flex", gap: 12 }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ fontSize: 14, color: "#4b5563", marginBottom: 4, display: "block" }}>Prefix</label>
                                                        <div style={{ position: "relative" }}>
                                                            <input type="text" value={cnPrefix} onChange={e => setCnPrefix(e.target.value)}
                                                                style={{ width: "100%", height: 38, border: "1px solid #d1d5db", borderRadius: 3, padding: "0 28px 0 10px", fontSize: 14 }} />
                                                            <i className="ti ti-circle-plus" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#e41f07", fontSize: 14 }} />
                                                        </div>
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ fontSize: 14, color: "#4b5563", marginBottom: 4, display: "block" }}>Next Number</label>
                                                        <input type="text" value={nextCnNum} onChange={e => setNextCnNum(e.target.value)}
                                                            style={{ width: "100%", height: 38, border: "1px solid #d1d5db", borderRadius: 3, padding: "0 10px", fontSize: 14 }} />
                                                    </div>
                                                </div>

                                                <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", color: "#4b5563", fontSize: 14 }}>
                                                    <input type="checkbox" checked={restartNumbering} onChange={e => setRestartNumbering(e.target.checked)} style={{ marginTop: 2, accentColor: "#e41f07" }} />
                                                    <span>Restart numbering for credit notes at the start of each fiscal year.</span>
                                                </label>
                                            </div>
                                        )}

                                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: 14, color: "#1f2937" }}>
                                            <input type="radio" checked={!autoGenerate} onChange={() => setAutoGenerate(false)} style={{ accentColor: "#e41f07" }} />
                                            <span>Enter credit note numbers manually</span>
                                        </label>
                                    </div>
                                </div>
                                {/* Footer */}
                                <div className="modal-footer border-top px-4 py-3 d-flex justify-content-start gap-2">
                                    <button type="button" onClick={handleSavePreferences}
                                        className="btn btn-danger fw-semibold px-4"
                                        style={{ fontSize: 14, borderRadius: 3 }}>
                                        Save
                                    </button>
                                    <button type="button" onClick={() => setShowConfigModal(false)}
                                        className="btn fw-semibold px-4"
                                        style={{ background: "#6b7280", color: "#fff", fontSize: 14, borderRadius: 3, border: "none" }}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Advanced Customer Search Modal */}
                {showAdvancedSearch && (() => {
                    const q = advSearchQuery.trim().toLowerCase();
                    const filtered = customerObjects.filter((c: any) => {
                        const fullName = `${c.salutation || "Mr."} ${c.firstName || ""} ${c.lastName || ""}`.trim().toLowerCase();
                        if (!q) return true;
                        if (advSearchField === "Display Name") return fullName.includes(q) || (c.displayName || "").toLowerCase().includes(q);
                        if (advSearchField === "Email") return (c.email || "").toLowerCase().includes(q);
                        if (advSearchField === "Company Name") return (c.companyName || "").toLowerCase().includes(q);
                        if (advSearchField === "Phone") return (c.workPhone || c.mobile || "").toLowerCase().includes(q);
                        return true;
                    });
                    const totalPages = Math.ceil(filtered.length / ADV_SEARCH_PAGE_SIZE) || 1;
                    const page = Math.min(advSearchPage, totalPages);
                    const pageRows = filtered.slice((page - 1) * ADV_SEARCH_PAGE_SIZE, page * ADV_SEARCH_PAGE_SIZE);
                    return (
                        <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.45)", zIndex: 1060 }}>
                            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 760 }}>
                                <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12, overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
                                    {/* Header */}
                                    <div className="modal-header border-bottom px-4 py-3 d-flex align-items-center justify-content-between">
                                        <h5 className="modal-title fw-bold mb-0" style={{ fontSize: 16 }}>Advanced Customer Search</h5>
                                        <button
                                            type="button"
                                            className="btn d-flex align-items-center justify-content-center p-0 rounded-circle border-0"
                                            onClick={() => setShowAdvancedSearch(false)}
                                            style={{ width: 28, height: 28, backgroundColor: "#fff5f4", color: "#e41f07", flexShrink: 0 }}
                                        >
                                            <i className="ti ti-x fs-14" />
                                        </button>
                                    </div>
                                    {/* Search Bar */}
                                    <div className="px-4 py-3 bg-white">
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="dropdown">
                                                <button
                                                    type="button"
                                                    className="btn btn-light border d-flex align-items-center gap-2 fw-medium"
                                                    style={{ fontSize: 14, height: 38, borderRadius: 3 }}
                                                    data-bs-toggle="dropdown"
                                                >
                                                    {advSearchField} <i className="ti ti-chevron-down fs-13" style={{ color: "#9ca3af" }} />
                                                </button>
                                                <ul className="dropdown-menu shadow-sm border-0" style={{ fontSize: 14 }}>
                                                    {["Display Name", "Email", "Company Name", "Phone"].map(f => (
                                                        <li key={f}>
                                                            <button className="dropdown-item py-2" type="button"
                                                                onClick={() => { setAdvSearchField(f); setAdvSearchQuery(""); setAdvSearchPage(1); }}
                                                            >{f}</button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <input
                                                type="text"
                                                className="form-control shadow-none"
                                                placeholder={`Search by ${advSearchField}...`}
                                                style={{ flex: 1, height: 38, fontSize: 14, borderRadius: 3 }}
                                                value={advSearchQuery}
                                                autoFocus
                                                onChange={e => { setAdvSearchQuery(e.target.value); setAdvSearchPage(1); }}
                                                onKeyDown={e => e.key === "Enter" && setAdvSearchPage(1)}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-danger fw-bold text-white"
                                                style={{ height: 38, borderRadius: 3, paddingInline: 24, fontSize: 14 }}
                                                onClick={() => setAdvSearchPage(1)}
                                            >
                                                Search
                                            </button>
                                        </div>
                                    </div>
                                    {/* Table */}
                                    <div style={{ overflowY: "auto", flex: 1, padding: "0 16px" }}>
                                        <table className="table align-middle mb-0" style={{ fontSize: 14, borderCollapse: "collapse" }}>
                                            <thead className="table-light">
                                                <tr>
                                                    <th className="fw-bold text-muted px-4 py-2" style={{ whiteSpace: "nowrap", fontSize: 13, borderBottom: "1px solid #dee2e6", borderTop: "none" }}>CUSTOMER NAME</th>
                                                    <th className="fw-bold text-muted py-2" style={{ fontSize: 13, borderBottom: "1px solid #dee2e6", borderTop: "none" }}>EMAIL</th>
                                                    <th className="fw-bold text-muted py-2" style={{ whiteSpace: "nowrap", fontSize: 13, borderBottom: "1px solid #dee2e6", borderTop: "none" }}>COMPANY NAME</th>
                                                    <th className="fw-bold text-muted py-2" style={{ whiteSpace: "nowrap", fontSize: 13, borderBottom: "1px solid #dee2e6", borderTop: "none" }}>PHONE</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pageRows.length === 0 ? (
                                                    <tr><td colSpan={4} className="text-center text-muted py-5" style={{ fontSize: 14, border: "none" }}>No customers found</td></tr>
                                                ) : pageRows.map((c: any, idx: number) => {
                                                    const isLast = idx === pageRows.length - 1;
                                                    const fullName = `${c.salutation || "Mr."} ${c.firstName || ""} ${c.lastName || ""}`.trim();
                                                    return (
                                                        <tr
                                                            key={c.id}
                                                            style={{ cursor: "pointer", borderBottom: isLast ? "none" : "1px solid #dee2e6" }}
                                                            onMouseEnter={e => (e.currentTarget.style.background = "#fff5f5")}
                                                            onMouseLeave={e => (e.currentTarget.style.background = "")}
                                                            onClick={() => {
                                                                setCustomer(fullName);
                                                                setErrors(p => ({ ...p, customer: "" }));
                                                                setShowAdvancedSearch(false);
                                                            }}
                                                        >
                                                            <td className="px-4 py-2 fw-bold" style={{ color: "#e41f07", whiteSpace: "nowrap", fontSize: 14, border: "none" }}>{fullName}</td>
                                                            <td className="py-2 text-muted" style={{ fontSize: 14, border: "none" }}>{c.email || "—"}</td>
                                                            <td className="py-2 text-muted" style={{ whiteSpace: "nowrap", fontSize: 14, border: "none" }}>{c.companyName || "—"}</td>
                                                            <td className="py-2 text-muted" style={{ whiteSpace: "nowrap", fontSize: 14, border: "none" }}>{c.workPhone || c.mobile || "—"}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* Pagination */}
                                    {filtered.length > 0 && (
                                        <div className="d-flex justify-content-end align-items-center px-4 py-3 bg-white" style={{ gap: 8 }}>
                                            <button type="button" className="btn btn-light border btn-sm" style={{ borderRadius: 3, width: 32, height: 32 }} disabled={page === 1} onClick={() => setAdvSearchPage(p => p - 1)}>
                                                <i className="ti ti-chevron-left fs-14" />
                                            </button>
                                            <span className="fw-medium" style={{ fontSize: 14, minWidth: 60, textAlign: "center" }}>
                                                {(page - 1) * ADV_SEARCH_PAGE_SIZE + 1} - {Math.min(page * ADV_SEARCH_PAGE_SIZE, filtered.length)}
                                            </span>
                                            <button type="button" className="btn btn-light border btn-sm" style={{ borderRadius: 3, width: 32, height: 32 }} disabled={page * ADV_SEARCH_PAGE_SIZE >= filtered.length} onClick={() => setAdvSearchPage(p => p + 1)}>
                                                <i className="ti ti-chevron-right fs-14" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()}

            </div>
        </div>


        {/* ── Reporting Tags Fixed Panel ── */}
        {showReportingTagsPanel && reportingTagsPos && (
            <>
                <div onClick={() => setShowReportingTagsPanel(false)} style={{ position: "fixed", inset: 0, zIndex: 1999 }} />
                <div style={{ position: "fixed", top: reportingTagsPos.top, left: reportingTagsPos.left, width: 300, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 2000, padding: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 10 }}>Reporting Tags</div>
                    <div style={{ borderBottom: "2px solid #f59e0b", marginBottom: 12 }} />
                    <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, marginBottom: 14 }}>
                        There are no active reporting tags, or no tags have been created for association at the item level. Kindly create or edit reporting tags from{" "}
                        <span style={{ color: "#e41f07", cursor: "pointer", textDecoration: "underline" }}>Settings</span>.
                    </div>
                    <button type="button" onClick={() => setShowReportingTagsPanel(false)}
                        style={{ fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4, padding: "5px 18px", color: "#374151", background: "#fff", cursor: "pointer" }}>
                        OK
                    </button>
                </div>
            </>
        )}

        {/* ── Bulk Add Modal ── */}
        {showBulkAdd && (
            <div onClick={() => setShowBulkAdd(false)} style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 8, width: 620, maxWidth: "100%", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", maxHeight: "85vh" }}>
                    {/* Header */}
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>Add Items in Bulk</span>
                        <i className="ti ti-x" style={{ fontSize: 20, color: "#9ca3af", cursor: "pointer" }} onClick={() => setShowBulkAdd(false)} />
                    </div>
                    {/* Search */}
                    <div style={{ padding: "14px 20px 10px", background: "#fff" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", background: "#fff" }}>
                            <i className="ti ti-search" style={{ fontSize: 13, color: "#9ca3af", flexShrink: 0 }} />
                            <input value={bulkSearch} onChange={e => setBulkSearch(e.target.value)} placeholder="Search items..."
                                autoFocus
                                style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#111827", background: "transparent", padding: 0 }} />
                        </div>
                    </div>
                    {/* Table */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 4px" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #d1d5db", borderRadius: 6 }}>
                            <thead>
                                <tr style={{ background: "#f3f4f6" }}>
                                    <th style={{ width: 44, padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #d1d5db" }}></th>
                                    <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #d1d5db" }}>Item Details</th>
                                    <th style={{ width: 110, padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #d1d5db" }}>Rate</th>
                                    <th style={{ width: 110, padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #d1d5db" }}>Quantity</th>
                                    <th style={{ width: 110, padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #d1d5db" }}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.filter(p => !p.isDeleted && p.name?.toLowerCase().includes(bulkSearch.toLowerCase())).map((p, idx) => {
                                    const isChecked = bulkSelected.includes(p.id);
                                    const qty = parseFloat(bulkQtys[p.id] || "1") || 1;
                                    const rate = p.selling_price ?? p.costPrice ?? 0;
                                    const amount = qty * rate;
                                    const rowBg = isChecked ? "#fff5f5" : idx % 2 === 0 ? "#fff" : "#fafafa";
                                    return (
                                        <tr key={p.id} style={{ background: rowBg, cursor: "pointer", borderBottom: "1px solid #f3f4f6" }}
                                            onClick={() => {
                                                const next = !isChecked;
                                                setBulkSelected(prev => next ? [...prev, p.id] : prev.filter(x => x !== p.id));
                                                if (next && !bulkQtys[p.id]) setBulkQtys(prev => ({ ...prev, [p.id]: "1" }));
                                            }}
                                            onMouseEnter={e => { if (!isChecked) (e.currentTarget as HTMLTableRowElement).style.background = "#f9fafb"; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = rowBg; }}>
                                            <td style={{ padding: "10px 12px", textAlign: "center" }}>
                                                <input type="checkbox" checked={isChecked}
                                                    onChange={e => {
                                                        e.stopPropagation();
                                                        setBulkSelected(prev => e.target.checked ? [...prev, p.id] : prev.filter(x => x !== p.id));
                                                        if (e.target.checked && !bulkQtys[p.id]) setBulkQtys(prev => ({ ...prev, [p.id]: "1" }));
                                                    }}
                                                    style={{ width: 15, height: 15, accentColor: "#e41f07", cursor: "pointer" }} />
                                            </td>
                                            <td style={{ padding: "10px 14px" }}>
                                                <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{p.name}</div>
                                                {p.sku && <div style={{ fontSize: 11, color: "#9ca3af" }}>SKU: {p.sku}</div>}
                                            </td>
                                            <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 13, color: "#6b7280" }}>₹{rate}</td>
                                            <td style={{ padding: "7px 10px", textAlign: "right" }} onClick={e => e.stopPropagation()}>
                                                <input type="number" min="0" step="1"
                                                    value={bulkQtys[p.id] ?? ""}
                                                    placeholder="0"
                                                    onChange={e => {
                                                        setBulkQtys(prev => ({ ...prev, [p.id]: e.target.value }));
                                                        if (!isChecked) setBulkSelected(prev => [...prev, p.id]);
                                                    }}
                                                    style={{ width: "100%", padding: "4px 6px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4, outline: "none", textAlign: "right", color: "#374151", background: "#fff" }}
                                                    onFocus={e => e.target.style.borderColor = "#e41f07"}
                                                    onBlur={e => e.target.style.borderColor = "#d1d5db"}
                                                />
                                            </td>
                                            <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "#111827" }}>₹{amount.toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                                {products.filter(p => !p.isDeleted && p.name?.toLowerCase().includes(bulkSearch.toLowerCase())).length === 0 && (
                                    <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No products found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Footer */}
                    <div style={{ padding: "14px 20px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 10, background: "#fff", borderRadius: "0 0 8px 8px" }}>
                        <button onClick={() => setShowBulkAdd(false)}
                            style={{ padding: "8px 16px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                            Cancel
                        </button>
                        <button onClick={() => {
                            const newRows = bulkSelected.map(id => {
                                const p = products.find((x: any) => x.id === id)!;
                                const qty = parseFloat(bulkQtys[id] || "1") || 1;
                                const rate = p.selling_price ?? p.costPrice ?? 0;
                                const newItem = emptyLine();
                                newItem.productId = p.id;
                                newItem.productName = p.name;
                                newItem.sku = p.sku || "";
                                newItem.quantity = qty;
                                newItem.rate = rate;
                                newItem.amount = qty * rate;
                                return newItem;
                            });
                            setItems(prev => {
                                const isEmpty = prev.length === 1 && !prev[0].productName;
                                return isEmpty ? newRows : [...prev, ...newRows];
                            });
                            setBulkSelected([]);
                            setBulkQtys({});
                            setShowBulkAdd(false);
                        }}
                            style={{ padding: "8px 20px", borderRadius: 4, border: "none", background: "#e41f07", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                            Add Selected ({bulkSelected.length})
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default CreditNoteAdd;
