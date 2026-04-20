import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import { all_routes } from "../../../../../routes/all_routes";
import { Popover, OverlayTrigger, Tooltip } from 'react-bootstrap';

import PageHeader from "../../../../../components/page-header/pageHeader";
import Footer from "../../../../../components/footer/footer";
import Datatable from "../../../../../components/dataTable";
import SearchInput from "../../../../../components/dataTable/dataTableSearch";
import PredefinedDatePicker from "../../../../../components/common-dateRangePicker/PredefinedDatePicker";

const route = all_routes;

// ── Types ─────────────────────────────────────────────────────────────────────
type TransactionType = "Sales" | "Purchase" | "Both";
type PriceListType = "All Items" | "Individual Items";
type MarkupType = "Markup" | "Markdown";
type PricingScheme = "Unit Pricing" | "Volume Pricing";

interface ItemRow {
    id: number;
    itemName: string;
    salesRate: string;
    customRate: string;
    discountPct: string;
    selected: boolean;
}

interface PriceListForm {
    name: string;
    description: string;
    transactionType: TransactionType;
    priceListType: PriceListType;
    markupType: MarkupType;
    percentage: string;
    roundOffTo: string;
    decimalPlaces: string;
    pricingScheme: PricingScheme;
    currency: string;
    includeDiscount: boolean;
    items: ItemRow[];
    category: string;
}

interface PriceListEntry extends PriceListForm {
    id: number;
    isDeleted?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const ROUND_OFF_OPTIONS = [
    "Never mind",
    "Nearest whole number",
    "0.99",
    "0.50",
    "0.49",
    "Nearest 0.10",
    "Nearest 1.00",
    "Nearest 5.00",
    "Nearest 10.00",
    "Nearest 50.00",
    "Nearest 100.00",
    "Decimal Places",
];

const CURRENCIES = [
    "INR - Indian Rupee",
    "USD - US Dollar",
    "EUR - Euro",
    "GBP - British Pound",
    "AED - UAE Dirham",
    "SGD - Singapore Dollar",
    "AUD - Australian Dollar",
];

const ROUNDING_EXAMPLES = [
    { roundTo: "Never mind", input: "1000.678", rounded: "1000.678" },
    { roundTo: "Nearest whole number", input: "1000.678", rounded: "1001" },
    { roundTo: "0.99", input: "1000.678", rounded: "1000.99" },
    { roundTo: "0.50", input: "1000.678", rounded: "1000.50" },
    { roundTo: "0.49", input: "1000.678", rounded: "1000.49" },
];

const EMPTY_FORM = (): PriceListForm => ({
    name: "",
    description: "",
    transactionType: "Sales",
    priceListType: "All Items",
    markupType: "Markup",
    percentage: "",
    roundOffTo: "Never mind",
    decimalPlaces: "2",
    pricingScheme: "Unit Pricing",
    currency: "INR - Indian Rupee",
    includeDiscount: false,
    items: [],
    category: "General",
});

const SEED_DATA: PriceListEntry[] = [

];

// ── Persistence Helpers ───────────────────────────────────────────────────────
function loadData(): PriceListEntry[] {
    try {
        const stored = localStorage.getItem("priceListData");
        if (stored) return JSON.parse(stored) as PriceListEntry[];
    } catch { /* ignore */ }
    localStorage.setItem("priceListData", JSON.stringify(SEED_DATA));
    return SEED_DATA;
}

function saveData(data: PriceListEntry[]) {
    try {
        localStorage.setItem("priceListData", JSON.stringify(data));
    } catch { /* ignore */ }
}

// ── Shared UI Styles & Components ─────────────────────────────────────────────
const Toast = ({ message, onClose, type = "success" }: { message: string, onClose: () => void, type?: "success" | "error" }) => {
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
    const isErr = type === "error";
    return (
        <div style={{ position: "fixed", right: isErr ? "auto" : 24, bottom: isErr ? "auto" : 24, top: isErr ? 24 : "auto", left: isErr ? "50%" : "auto", transform: isErr ? "translateX(-50%)" : "none", zIndex: 3000, background: isErr ? "#e5484d" : "#0d8a56", color: "#fff", padding: "10px 16px", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: 10, fontSize: 14, animation: isErr ? "slideDown 0.3s ease" : "slideUp 0.3s ease", maxWidth: 400 }}>
            <i className={`ti ${isErr ? "ti-alert-triangle-filled" : "ti-circle-check-filled"}`} style={{ fontSize: 18, color: "#fff", flexShrink: 0 }} />{message}
            <i className="ti ti-x" style={{ cursor: "pointer", marginLeft: 8, opacity: 0.7, flexShrink: 0 }} onClick={onClose} />
            <style>{`@keyframes slideDown { from { transform: translateY(-20px) translateX(-50%); opacity: 0; } to { transform: translateY(0) translateX(-50%); opacity: 1; } } @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </div>
    );
};

// ── Main Controller Component ─────────────────────────────────────────────────
const PriceList = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const location = useLocation();

    // Determine view based on URL
    const isAdd = location.pathname.endsWith("/new");
    const isEdit = !!id && !isAdd;
    const isList = !isAdd && !isEdit;

    // List State
    const [data, setData] = useState<PriceListEntry[]>(loadData);
    const [searchText, setSearchText] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<PriceListEntry | null>(null);
    const [toast, setToast] = useState<{ message: string, type: "success" | "error" } | null>(null);

    // Category Management
    const [categories, setCategories] = useState<string[]>(["General", "Discounted", "Seasonal"]);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [categorySearch, setCategorySearch] = useState("");

    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
        "Name": true,
        "Transaction Type": true,
        "Type": true,
        "Customer Category": true,
        "Details": true,
        "Status": true,
    });

    const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
    const [filterTypes, setFilterTypes] = useState<string[]>([]);
    const [pendingFilterTypes, setPendingFilterTypes] = useState<string[]>([]);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const filterDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
                setShowFilterDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearch = (value: string) => {
        setSearchText(value);
    };

    const togglePendingFilter = (t: string) => {
        setPendingFilterTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
    };

    const applyFilter = () => {
        setFilterTypes([...pendingFilterTypes]);
    };

    const resetFilter = () => {
        setPendingFilterTypes([]);
        setFilterTypes([]);
    };

    const displayData = [...data]
        .filter(d => filterTypes.length === 0 || filterTypes.includes(d.transactionType))
        .sort((a, b) => sortBy === "newest" ? b.id - a.id : a.id - b.id);

    const handleExportCSV = () => {
        const headers = ["Name", "Transaction Type", "Type", "Pricing Scheme", "Markup Type", "Percentage", "Round Off To", "Currency", "Description"];
        const rows = data.map(r => [
            r.name, r.transactionType, r.priceListType, r.pricingScheme,
            r.markupType, r.percentage ? r.percentage + "%" : "", r.roundOffTo, r.currency, r.description
        ]);
        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
            .join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "price-lists.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setToast({ message: "Exported as CSV successfully.", type: "success" });
    };

    const handleExportPDF = () => {
        const rows = data.map(r =>
            `<tr><td>${r.name}</td><td>${r.transactionType}</td><td>${r.priceListType}</td><td>${r.pricingScheme || "Unit Pricing"}</td><td>${r.markupType} ${r.percentage}%</td><td>${r.roundOffTo}</td></tr>`
        ).join("");
        const html = `<html><head><title>Price Lists</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5;font-weight:600}h2{margin-bottom:16px}</style></head><body><h2>Price Lists</h2><table><thead><tr><th>Name</th><th>Transaction Type</th><th>Type</th><th>Scheme</th><th>Details</th><th>Round Off</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
        const win = window.open("", "_blank");
        if (win) { win.document.write(html); win.document.close(); win.print(); }
    };

    const columns = [
        {
            title: "Name",
            dataIndex: "name",
            render: (text: string, record: PriceListEntry) => (
                <span
                    className="text-dark fw-medium"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(route.priceListEdit.replace(":id", String(record.id)))}
                >
                    {text}
                </span>
            ),
            sorter: (a: PriceListEntry, b: PriceListEntry) => a.name.localeCompare(b.name),
        },
        {
            title: "Transaction Type",
            dataIndex: "transactionType",
            render: (text: string) => (
                <span className={`badge badge-pill badge-status ${text === "Sales" ? "bg-soft-success text-success" :
                    text === "Purchase" ? "bg-soft-info text-info" :
                        "bg-soft-purple text-purple"
                    }`} style={{
                        border: `1px solid ${text === "Sales" ? "#b7eb8f" :
                            text === "Purchase" ? "#91d5ff" :
                                "#d3adf7"
                            }`
                    }}>
                    {text}
                </span>
            ),
            sorter: (a: PriceListEntry, b: PriceListEntry) => a.transactionType.localeCompare(b.transactionType),
        },
        {
            title: "Type",
            dataIndex: "priceListType",
            render: (text: string) => (
                <span className="text-muted fs-13">
                    <i className={text === "All Items" ? "ti ti-list-check me-1" : "ti ti-clipboard-list me-1"} />
                    {text}
                </span>
            ),
            sorter: (a: PriceListEntry, b: PriceListEntry) => a.priceListType.localeCompare(b.priceListType),
        },
        {
            title: "Customer Category",
            dataIndex: "category",
            render: (text: string) => (
                text
                    ? <span className="badge badge-pill bg-soft-primary text-primary" style={{ border: "1px solid #ffd0cc" }}>{text}</span>
                    : <span className="text-muted fs-13">—</span>
            ),
            sorter: (a: PriceListEntry, b: PriceListEntry) => (a.category || "").localeCompare(b.category || ""),
        },
        {
            title: "Details",
            dataIndex: "percentage",
            render: (_: string, record: PriceListEntry) => (
                <div className="d-flex flex-column">
                    <span className="fw-medium text-dark">{record.markupType} {record.percentage}%</span>
                    <small className="text-muted">Round off: {record.roundOffTo}</small>
                </div>
            ),
        },
        {
            title: "Status",
            dataIndex: "status",
            render: () => (
                <span className="badge badge-pill bg-soft-success text-success border-success-light">
                    <i className="ti ti-point-filled me-1" />Active
                </span>
            ),
        },
        {
            title: "Action",
            dataIndex: "action",
            render: (_: any, record: PriceListEntry) => (
                <div className="dropdown table-action">
                    <Link
                        to="#"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: '1px solid #dee2e6',
                            background: '#fff',
                            boxShadow: 'none',
                        }}
                    >
                        <i className="ti ti-dots-vertical" style={{ fontSize: 16, color: '#6c757d' }} />
                    </Link>
                    <div className="dropdown-menu dropdown-menu-right">
                        <Link
                            className="dropdown-item"
                            to="#"
                            onClick={(e) => { e.preventDefault(); navigate(route.priceListEdit.replace(":id", String(record.id))); }}
                        >
                            <i className="ti ti-edit text-blue" /> Edit
                        </Link>
                        <Link
                            className="dropdown-item"
                            to="#"
                            onClick={(e) => { e.preventDefault(); setDeleteTarget(record); }}
                        >
                            <i className="ti ti-trash text-danger" /> Delete
                        </Link>
                    </div>
                </div>
            ),
        },
    ];

    // Form State
    const [form, setForm] = useState<PriceListForm>(EMPTY_FORM());
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [importEnabled, setImportEnabled] = useState(false);
    const [showRoundingEx, setShowRoundingEx] = useState(false);
    const [nextItemId, setNextItemId] = useState(1);

    useEffect(() => {
        if (isList) setData(loadData().filter(d => !d.isDeleted));
    }, [isList]);

    useEffect(() => {
        if (isEdit && id) {
            const found = loadData().find(d => d.id === Number(id));
            if (found) {
                setForm({ ...found });
                if (found.items && found.items.length > 0) {
                    setNextItemId(Math.max(...found.items.map(it => it.id)) + 1);
                }
            }
        } else if (isAdd) {
            setForm({ ...EMPTY_FORM(), category: categories[0] ?? "" });
        }
    }, [isEdit, isAdd, id]);

    const setF = <K extends keyof PriceListForm>(key: K, value: PriceListForm[K]) => setForm(f => ({ ...f, [key]: value }));

    const updateItem = (itemId: number, field: keyof ItemRow, value: string | boolean) => {
        setForm(f => ({ ...f, items: f.items.map(it => it.id === itemId ? { ...it, [field]: value } : it) }));
    };

    const handleSave = () => {
        if (!form.name.trim()) { setErrors({ name: "Name is required." }); return; }
        setSaving(true);
        const all = loadData();
        if (isEdit && id) {
            const idx = all.findIndex(a => a.id === Number(id));
            if (idx !== -1) all[idx] = { ...form, id: Number(id) };
        } else {
            const newId = all.length > 0 ? Math.max(...all.map(a => a.id)) + 1 : 1;
            all.push({ ...form, id: newId });
        }
        saveData(all);
        setTimeout(() => {
            setSaving(false);
            navigate(route.priceList);
        }, 300);
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        const all = loadData();
        const updated = all.map(d => d.id === deleteTarget.id ? { ...d, isDeleted: true } : d);
        saveData(updated);
        setData(updated.filter(d => !d.isDeleted));
        setToast({ message: `"${deleteTarget.name}" has been deleted.`, type: "success" });
        setDeleteTarget(null);
    };

    // ── Form-level refs & effects (kept at PriceList level to avoid remount) ──
    const categoryRef = useRef<HTMLDivElement>(null);
    const importFileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
                setIsCategoryOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const exportItemsCSV = (items: ItemRow[], filename: string) => {
        if (items.length === 0) { setToast({ message: "No items to export.", type: "error" }); return; }
        const headers = ["Item Name", "Sales Rate", "PriceList Rate", "Discount (%)"];
        const rows = items.map(it => [it.itemName, it.salesRate || "1200.00", it.customRate || "", it.discountPct || ""]);
        const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setToast({ message: `Exported ${items.length} item(s) successfully.`, type: "success" });
    };

    const handleExportAllItems = () => exportItemsCSV(form.items, "items-all.csv");

    const handleExportFilteredItems = () => {
        const selected = form.items.filter(it => it.selected);
        if (selected.length === 0) { setToast({ message: "Select items first to export filtered.", type: "error" }); return; }
        exportItemsCSV(selected, "items-filtered.csv");
    };

    const handleImportItems = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
            if (lines.length < 2) { setToast({ message: "File is empty or has no data rows.", type: "error" }); return; }
            const parseCell = (c: string) => c.replace(/^["']|["']$/g, "").trim();
            const headers = lines[0].split(",").map(parseCell).map(h => h.toLowerCase());
            const nameIdx = headers.findIndex(h => h.includes("item name") || h === "name");
            const rateIdx = headers.findIndex(h => h.includes("pricelist") || h.includes("custom rate") || h.includes("custom"));
            const salesIdx = headers.findIndex(h => h.includes("sales rate") || h.includes("sales"));
            const discIdx = headers.findIndex(h => h.includes("discount"));
            if (nameIdx === -1) { setToast({ message: "Column 'Item Name' not found. Check the file format.", type: "error" }); return; }
            let idCounter = nextItemId;
            const imported: ItemRow[] = lines.slice(1).map(line => {
                const cells = line.split(",").map(parseCell);
                return { id: idCounter++, itemName: cells[nameIdx] || "", salesRate: salesIdx !== -1 ? cells[salesIdx] : "", customRate: rateIdx !== -1 ? cells[rateIdx] : "", discountPct: discIdx !== -1 ? cells[discIdx] : "", selected: false };
            }).filter(it => it.itemName);
            if (imported.length === 0) { setToast({ message: "No valid items found in file.", type: "error" }); return; }
            setF("items", imported);
            setNextItemId(idCounter);
            setToast({ message: `${imported.length} item(s) imported successfully.`, type: "success" });
            if (importFileRef.current) importFileRef.current.value = "";
        };
        reader.readAsText(file);
    };

    // ── Sub-Views ─────────────────────────────────────────────────────────────
    const ListView = () => (
        <div className="page-wrapper">
            <div className="content pb-0">
                <PageHeader
                    title="Price Lists"
                    badgeCount={data.length}
                    moduleTitle="CRM"
                    showModuleTile={true}
                    moduleLink={route.dealsDashboard}
                    showExport={false}
                    exportComponent={
                        <div className="dropdown">
                            <Link to="#" className="dropdown-toggle btn btn-outline-light px-2 shadow" data-bs-toggle="dropdown">
                                <i className="ti ti-package-export me-2" />Export
                            </Link>
                            <div className="dropdown-menu dropdown-menu-end">
                                <ul>
                                    <li>
                                        <Link to="#" className="dropdown-item" onClick={(e) => { e.preventDefault(); handleExportPDF(); }}>
                                            <i className="ti ti-file-type-pdf me-1" />Export as PDF
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="#" className="dropdown-item" onClick={(e) => { e.preventDefault(); handleExportCSV(); }}>
                                            <i className="ti ti-file-type-xls me-1" />Export as Excel
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    }
                />
                <div className="card border-0 rounded-0">
                    <div className="card-header d-flex align-items-center justify-content-between gap-2 flex-wrap">
                        <div className="input-icon input-icon-start position-relative" style={{ width: 220 }}>
                            <span className="input-icon-addon text-dark">
                                <i className="ti ti-search" />
                            </span>
                            <SearchInput value={searchText} onChange={handleSearch} />
                        </div>
                        <Link to={route.priceListAdd} className="btn btn-primary">
                            <i className="ti ti-square-rounded-plus-filled me-1" />
                            Add Price List
                        </Link>
                    </div>

                    <div className="card-body">
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <div className="dropdown">
                                    <Link to="#" className="dropdown-toggle btn btn-outline-light px-2 shadow" data-bs-toggle="dropdown">
                                        <i className="ti ti-sort-ascending-2 me-2" /> Sort By
                                    </Link>
                                    <div className="dropdown-menu">
                                        <ul>
                                            <li><Link to="#" className={`dropdown-item${sortBy === "newest" ? " active" : ""}`} onClick={(e) => { e.preventDefault(); setSortBy("newest"); }}>Newest</Link></li>
                                            <li><Link to="#" className={`dropdown-item${sortBy === "oldest" ? " active" : ""}`} onClick={(e) => { e.preventDefault(); setSortBy("oldest"); }}>Oldest</Link></li>
                                        </ul>
                                    </div>
                                </div>
                                <PredefinedDatePicker />
                            </div>

                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <div className="dropdown" ref={filterDropdownRef}>
                                    <Link to="#" className="btn btn-outline-light shadow px-2" onClick={(e) => { e.preventDefault(); setShowFilterDropdown(v => !v); }}>
                                        <i className="ti ti-filter me-2" /> Filter <i className="ti ti-chevron-down ms-2" />
                                    </Link>
                                    <div className={`filter-dropdown-menu dropdown-menu dropdown-menu-lg p-0${showFilterDropdown ? " show" : ""}`} style={showFilterDropdown ? { display: 'block' } : {}}>
                                        <div className="filter-header d-flex align-items-center justify-content-between border-bottom">
                                            <h6 className="mb-0"><i className="ti ti-filter me-1" /> Filter </h6>
                                            <button type="button" className="btn-close custom-btn-close border p-1 me-0 d-flex align-items-center justify-content-center rounded-circle" onClick={() => setShowFilterDropdown(false)} aria-label="Close">
                                                <i className="ti ti-x" />
                                            </button>
                                        </div>
                                        <div className="filter-set-view p-3">
                                            <div className="accordion" id="filterAccordion">
                                                <div className="filter-set-content">
                                                    <div className="filter-set-content-head">
                                                        <Link to="#" className="collapsed" data-bs-toggle="collapse" data-bs-target="#collapseType">Transaction Type</Link>
                                                    </div>
                                                    <div className="filter-set-contents accordion-collapse collapse" id="collapseType" data-bs-parent="#filterAccordion">
                                                        <div className="filter-content-list bg-light rounded border p-2 shadow mt-2">
                                                            <ul>
                                                                {["Sales", "Purchase", "Both"].map(t => (
                                                                    <li key={t}>
                                                                        <label className="dropdown-item px-2 d-flex align-items-center" style={{ cursor: 'pointer' }}>
                                                                            <input
                                                                                className="form-check-input m-0 me-1"
                                                                                type="checkbox"
                                                                                checked={pendingFilterTypes.includes(t)}
                                                                                onChange={() => togglePendingFilter(t)}
                                                                            /> {t}
                                                                        </label>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="d-flex align-items-center gap-2 mt-3">
                                                <Link to="#" className="btn btn-outline-light w-100" onClick={(e) => { e.preventDefault(); resetFilter(); setShowFilterDropdown(false); }}>Reset</Link>
                                                <Link to="#" className="btn btn-primary w-100" onClick={(e) => { e.preventDefault(); applyFilter(); setShowFilterDropdown(false); }}>Filter</Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="dropdown">
                                    <Link to="#" className="btn bg-soft-indigo px-2 border-0" data-bs-toggle="dropdown" data-bs-auto-close="outside">
                                        <i className="ti ti-columns-3 me-2" /> Manage Columns
                                    </Link>
                                    <div className="dropdown-menu dropdown-menu-md dropdown-md p-3">
                                        <ul>
                                            {(Object.keys(visibleColumns) as string[]).map(col => (
                                                <li className="gap-1 d-flex align-items-center mb-2" key={col}>
                                                    <i className="ti ti-columns me-1" />
                                                    <div className="form-check form-switch w-100 ps-0">
                                                        <label className="form-check-label d-flex align-items-center gap-2 w-100">
                                                            <span>{col}</span>
                                                            <input
                                                                className="form-check-input switchCheckDefault ms-auto"
                                                                type="checkbox"
                                                                role="switch"
                                                                checked={visibleColumns[col]}
                                                                onChange={() => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))}
                                                            />
                                                        </label>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="custom-table table-nowrap">
                            <Datatable
                                columns={columns.filter(c => c.title === "Action" || visibleColumns[c.title as string])}
                                dataSource={displayData}
                                Selection={true}
                                searchText={searchText}
                            />
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
        </div>
    );

    const FormView = () => (
        <div className="page-wrapper">
            <div className="content">
                <PageHeader
                    title={isEdit ? "Edit Price List" : "New Price List"}
                    badgeCount={false}
                    moduleTitle="Price Lists"
                    showModuleTile={true}
                    moduleLink={route.priceList}
                    showExport={false}
                />

                <div className="card">
                    <div className="card-body">
                        <div className="border-bottom mb-3 pb-3 d-flex align-items-center justify-content-between">
                            <h5 className="mb-0 fs-17">{isEdit ? 'Edit Price List' : 'New Price List'}</h5>
                        </div>

                        <form onSubmit={(e) => e.preventDefault()}>
                            <div className="row align-items-center mb-3">
                                <div className="col-md-3"><label className="form-label mb-0 text-danger">Name*</label></div>
                                <div className="col-md-9">
                                    <input type="text" className={`form-control ${errors.name ? 'is-invalid' : ''}`} value={form.name} onChange={(e) => setF("name", e.target.value)} placeholder="Enter price list name" />
                                    {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                                </div>
                            </div>

                            <div className="row align-items-center mb-3">
                                <div className="col-md-3"><label className="form-label mb-0">Transaction Type</label></div>
                                <div className="col-md-9">
                                    <div className="d-flex align-items-center gap-3">
                                        {(["Sales", "Purchase", "Both"] as TransactionType[]).map(t => (
                                            <div className="form-check m-0" key={t}>
                                                <input className="form-check-input primary-radio" type="radio" name="transactionType" id={`type_${t}`} checked={form.transactionType === t} onChange={() => setF("transactionType", t)} />
                                                <label className="form-check-label" htmlFor={`type_${t}`}>{t}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="row align-items-center mb-3">
                                <div className="col-md-3"><label className="form-label mb-0"> Customer Category</label></div>
                                <div className="col-md-9">
                                    <div ref={categoryRef} style={{ position: 'relative', maxWidth: '400px' }}>
                                        <button
                                            type="button"
                                            className="form-select text-start bg-white d-flex align-items-center justify-content-between"
                                            style={{ cursor: 'pointer', backgroundImage: 'none' }}
                                            onClick={() => { setIsCategoryOpen(o => !o); setCategorySearch(""); }}
                                        >
                                            <span className={form.category ? "text-dark fw-medium" : "text-muted"}>
                                                {form.category || "Select Category"}
                                            </span>
                                            <i className={`ti ${isCategoryOpen ? "ti-chevron-up" : "ti-chevron-down"} text-muted fs-13`} />
                                        </button>

                                        {isCategoryOpen && (
                                            <div className="border rounded bg-white shadow" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000, marginTop: 2 }}>
                                                <div className="p-2 border-bottom">
                                                    <div className="position-relative">
                                                        <i className="ti ti-search text-muted fs-14" style={{ position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            style={{ paddingLeft: 30 }}
                                                            placeholder="Search category..."
                                                            value={categorySearch}
                                                            onChange={e => setCategorySearch(e.target.value)}
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>
                                                <ul className="list-unstyled mb-0" style={{ maxHeight: 200, overflowY: 'auto' }}>
                                                    {categories
                                                        .filter(c => c.toLowerCase().includes(categorySearch.toLowerCase()))
                                                        .map(c => (
                                                            <li
                                                                key={c}
                                                                className="d-flex align-items-center justify-content-between px-3 py-2"
                                                                style={{ cursor: 'pointer', backgroundColor: form.category === c ? 'rgba(228,31,7,0.05)' : '' }}
                                                                onMouseEnter={e => { if (form.category !== c) (e.currentTarget as HTMLElement).style.backgroundColor = '#f8f9fa'; }}
                                                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = form.category === c ? 'rgba(228,31,7,0.05)' : ''; }}
                                                                onClick={() => { setF("category", c); setIsCategoryOpen(false); setCategorySearch(""); }}
                                                            >
                                                                <span className="fs-14" style={{ color: form.category === c ? '#e41f07' : 'inherit', fontWeight: form.category === c ? 600 : 400 }}>{c}</span>
                                                                {form.category === c && <i className="ti ti-check fs-15" style={{ color: '#e41f07' }} />}
                                                            </li>
                                                        ))}
                                                    {categories.filter(c => c.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                                                        <li className="px-3 py-2 text-muted fs-13">No categories found.</li>
                                                    )}
                                                </ul>
                                                <div className="border-top p-2">
                                                    <button
                                                        type="button"
                                                        className="btn btn-link btn-sm text-danger text-decoration-none d-flex align-items-center gap-1 fw-semibold ps-1 w-100"
                                                        onClick={() => { setIsCategoryOpen(false); setShowCategoryModal(true); }}
                                                    >
                                                        <i className="ti ti-settings fs-13" /> Manage Categories
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="row align-items-center mb-3">
                                <div className="col-md-3"><label className="form-label mb-0">Price List Type</label></div>
                                <div className="col-md-9">
                                    <div className="row g-2">
                                        <div className="col-md-6">
                                            <div className={`card h-100 mb-0 shadow-none border ${form.priceListType === "All Items" ? "border-primary bg-soft-primary" : "bg-light border-transparent"}`} onClick={() => setF("priceListType", "All Items")} style={{ cursor: 'pointer', transition: 'all 0.2s' }}>
                                                <div className="card-body p-3">
                                                    <div className="d-flex align-items-center gap-2">
                                                        {form.priceListType === "All Items" ? <i className="ti ti-circle-check-filled text-primary fs-18" /> : <div className="rounded-circle border border-secondary" style={{ width: 14, height: 14, marginLeft: 2 }} />}
                                                        <label className="mb-0 fw-semibold fs-14">All Items</label>
                                                    </div>
                                                    <small className="text-muted d-block mt-1 ps-4" style={{ marginLeft: 6 }}>Mark up or mark down the rates of all items</small>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className={`card h-100 mb-0 shadow-none border ${form.priceListType === "Individual Items" ? "border-primary bg-soft-primary" : "bg-light border-transparent"}`} onClick={() => setF("priceListType", "Individual Items")} style={{ cursor: 'pointer', transition: 'all 0.2s' }}>
                                                <div className="card-body p-3">
                                                    <div className="d-flex align-items-center gap-2">
                                                        {form.priceListType === "Individual Items" ? <i className="ti ti-circle-check-filled text-primary fs-18" /> : <div className="rounded-circle border border-secondary" style={{ width: 14, height: 14, marginLeft: 2 }} />}
                                                        <label className="mb-0 fw-semibold fs-14">Individual Items</label>
                                                    </div>
                                                    <small className="text-muted d-block mt-1 ps-4" style={{ marginLeft: 6 }}>Customize the rate of each item</small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="row mb-3">
                                <div className="col-md-3"><label className="form-label mt-2">Description</label></div>
                                <div className="col-md-9">
                                    <textarea className="form-control" rows={3} value={form.description} onChange={(e) => setF("description", e.target.value)} placeholder="Enter description" />
                                </div>
                            </div>

                            {form.priceListType === "All Items" && (
                                <>
                                    <div className="row align-items-center mb-3">
                                        <div className="col-md-3"><label className="form-label mb-0 text-danger">Percentage*</label></div>
                                        <div className="col-md-9">
                                            <div className="input-group" style={{ maxWidth: '400px' }}>
                                                <select className="form-select w-auto flex-none bg-light" value={form.markupType} onChange={(e) => setF("markupType", e.target.value as MarkupType)}>
                                                    <option value="Markup">Markup</option>
                                                    <option value="Markdown">Markdown</option>
                                                </select>
                                                <input type="number" className="form-control" value={form.percentage} onChange={(e) => setF("percentage", e.target.value)} placeholder="0.00" />
                                                <span className="input-group-text bg-white border-start-0">%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row align-items-center mb-3">
                                        <div className="col-md-3"><label className="form-label mb-0 text-danger">Round Off To*</label></div>
                                        <div className="col-md-9">
                                            <div className="d-flex align-items-center gap-2" style={{ maxWidth: '400px' }}>
                                                <select className="form-select bg-light" style={{ flex: 1 }} value={form.roundOffTo} onChange={(e) => setF("roundOffTo", e.target.value)}>
                                                    {ROUND_OFF_OPTIONS.map(o => <option key={o}>{o}</option>)}
                                                </select>
                                                <OverlayTrigger
                                                    trigger="click"
                                                    placement="top"
                                                    show={showRoundingEx}
                                                    onToggle={(next) => setShowRoundingEx(next)}
                                                    rootClose={true}
                                                    overlay={
                                                        <Popover id="popover-rounding-ex" style={{ maxWidth: '460px', borderRadius: '10px', border: '1px solid #e8e8e8', boxShadow: '0 6px 20px rgba(0,0,0,0.1)' }}>
                                                            <Popover.Header className="d-flex align-items-center justify-content-between border-0 pb-0 pt-3 px-3">
                                                                <span className="fw-semibold text-dark fs-14">Rounding Examples</span>
                                                                <i className="ti ti-x text-danger fs-14 cursor-pointer" style={{ cursor: 'pointer' }} onClick={() => setShowRoundingEx(false)} />
                                                            </Popover.Header>
                                                            <Popover.Body className="p-0 pb-2">
                                                                <div>
                                                                    <table className="table table-sm mb-0" style={{ fontSize: 12 }}>
                                                                        <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                                                                            <tr className="border-bottom">
                                                                                <th className="fw-semibold text-uppercase ps-3 py-2 border-0" style={{ fontSize: 11, color: '#6c757d', letterSpacing: '0.5px', width: '45%' }}>Round Off To</th>
                                                                                <th className="fw-semibold text-uppercase text-center py-2 border-0" style={{ fontSize: 11, color: '#6c757d', letterSpacing: '0.5px', width: '27.5%' }}>Input Value</th>
                                                                                <th className="fw-semibold text-uppercase text-end pe-3 py-2 border-0" style={{ fontSize: 11, color: '#6c757d', letterSpacing: '0.5px', width: '27.5%' }}>Rounded Value</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {ROUNDING_EXAMPLES.map((ex) => {
                                                                                const isActive = form.roundOffTo === ex.roundTo;
                                                                                return (
                                                                                    <tr key={ex.roundTo} style={{ backgroundColor: isActive ? 'rgba(228,31,7,0.04)' : '', cursor: 'pointer' }}
                                                                                        onClick={() => { setF('roundOffTo', ex.roundTo); setShowRoundingEx(false); }}>
                                                                                        <td className="ps-3 py-2 border-0">
                                                                                            <span className={`${isActive ? 'fw-semibold' : 'fw-medium'} text-primary`}>
                                                                                                {isActive && <i className="ti ti-chevron-right me-1 fs-11" />}
                                                                                                {ex.roundTo}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="text-center text-muted py-2 border-0">{ex.input}</td>
                                                                                        <td className="text-end pe-3 py-2 border-0 fw-semibold text-dark">{ex.rounded}</td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                            {(() => {
                                                                                const isActive = form.roundOffTo === "Decimal Places";
                                                                                return (
                                                                                    <tr style={{ backgroundColor: isActive ? 'rgba(228,31,7,0.04)' : '', cursor: 'pointer' }}
                                                                                        onClick={() => { setF('roundOffTo', 'Decimal Places'); setShowRoundingEx(false); }}>
                                                                                        <td className="ps-3 py-2 border-0" colSpan={3}>
                                                                                            <span className={`${isActive ? 'fw-semibold' : 'fw-medium'} text-primary`}>
                                                                                                {isActive && <i className="ti ti-chevron-right me-1 fs-11" />}
                                                                                                Decimal Places
                                                                                            </span>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })()}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </Popover.Body>
                                                        </Popover>
                                                    }
                                                >
                                                    <span className="text-primary fs-12 text-decoration-none cursor-pointer fw-medium text-nowrap" style={{ cursor: 'pointer' }}>View Examples</span>
                                                </OverlayTrigger>
                                            </div>
                                        </div>
                                    </div>
                                    {form.roundOffTo === "Decimal Places" && (
                                        <div className="row align-items-center mb-3">
                                            <div className="col-md-3"><label className="form-label mb-0 text-danger">Decimal Places*</label></div>
                                            <div className="col-md-9">
                                                <input
                                                    type="number"
                                                    className="form-control bg-light"
                                                    style={{ maxWidth: '120px' }}
                                                    value={form.decimalPlaces || "2"}
                                                    onChange={(e) => setF("decimalPlaces", e.target.value)}
                                                    min={0}
                                                    max={10}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {form.priceListType === "Individual Items" && (
                                <>
                                    <div className="row align-items-center mb-3">
                                        <div className="col-md-3"><label className="form-label mb-0">Pricing Scheme</label></div>
                                        <div className="col-md-9">
                                            <div className="d-flex align-items-center gap-4">
                                                <div className="form-check m-0">
                                                    <input className="form-check-input primary-radio" type="radio" id="scheme_unit" checked={form.pricingScheme === "Unit Pricing"} onChange={() => setF("pricingScheme", "Unit Pricing")} />
                                                    <label className="form-check-label" htmlFor="scheme_unit">Unit Pricing</label>
                                                </div>
                                                <div className="form-check m-0 d-flex align-items-center">
                                                    <input className="form-check-input primary-radio" type="radio" id="scheme_volume" checked={form.pricingScheme === "Volume Pricing"} onChange={() => setF("pricingScheme", "Volume Pricing")} />
                                                    <label className="form-check-label ms-1 me-2" htmlFor="scheme_volume">Volume Pricing</label>
                                                    <OverlayTrigger
                                                        trigger={['hover', 'focus']}
                                                        placement="right"
                                                        rootClose={true}
                                                        overlay={
                                                            <Popover id="popover-volume-pricing" style={{ maxWidth: '400px', borderRadius: '8px', border: '1px solid #ebecf0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                                                <Popover.Header className="bg-white border-0 pb-0 pt-3 pe-3 d-flex justify-content-between align-items-center">
                                                                    <span className="fw-semibold text-dark fs-14">Volume Pricing</span>
                                                                    <i className="ti ti-x text-danger cursor-pointer" onClick={() => document.body.click()} />
                                                                </Popover.Header>
                                                                <Popover.Body className="text-primary fs-13 lh-base pt-2">
                                                                    Use Volume Pricing to configure the unit price of the item to be based on the quantity of items sold or purchased.
                                                                    <br /><br />
                                                                    <strong className="text-dark">For Example,</strong> <span className="text-primary">when less than 10 items are sold or purchased, you can set each item's price at ₹10 and when more than 10 items are sold or purchased, you can set each item's price at ₹5. So, for 5 items, the total price will be ₹50, while for 15 items, the total price will be ₹75.</span>
                                                                    <br /><br />
                                                                    <span className="text-dark fw-semibold">Note:</span>
                                                                    <ul className="mb-0 ps-3 mt-1 text-primary" style={{ listStyleType: 'disc' }}>
                                                                        <li className="mb-1">If you don't enter the End Quantity for the last range and the item quantity is greater than the start quantity of the last range, then the custom rate of the last range will be applied.</li>
                                                                        <li>If you don't enter a custom range, then the default item rate will be applied for that quantity range.</li>
                                                                    </ul>
                                                                </Popover.Body>
                                                            </Popover>
                                                        }
                                                    >
                                                        <i className="ti ti-help-circle text-muted cursor-pointer fs-15 hover-text-primary mt-1" />
                                                    </OverlayTrigger>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row align-items-center mb-3">
                                        <div className="col-md-3"><label className="form-label mb-0">Currency</label></div>
                                        <div className="col-md-9">
                                            <select className="form-select bg-light" style={{ maxWidth: '400px' }} value={form.currency} onChange={(e) => setF("currency", e.target.value)}>
                                                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="row align-items-start mb-4">
                                        <div className="col-md-3"><label className="form-label mt-1">Discount</label></div>
                                        <div className="col-md-9">
                                            <div className="form-check m-0">
                                                <input
                                                    className="form-check-input primary-checkbox"
                                                    type="checkbox"
                                                    id="includeDiscount"
                                                    checked={form.includeDiscount}
                                                    onChange={(e) => setF("includeDiscount", e.target.checked)}
                                                />
                                                <label className="form-check-label fw-medium text-dark" htmlFor="includeDiscount">
                                                    I want to include discount percentage for the items
                                                </label>
                                            </div>
                                            {form.includeDiscount && (
                                                <div className="mt-2 text-muted fs-13 d-flex align-items-start gap-1" style={{ paddingLeft: '1.5rem', color: '#6b778c' }}>
                                                    <i className="ti ti-info-circle fs-16 mt-1 flex-shrink-0" />
                                                    <span style={{ maxWidth: '600px', lineHeight: '1.5' }}>
                                                        When a price list is applied, the discount percentage will be applied only if discount is enabled at the line-item level.
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-top">
                                        {/* Section Header */}
                                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
                                            <div>
                                                <h5 className="mb-1 fw-semibold text-dark fs-16">Customise Rates in Bulk</h5>
                                                <p className="mb-0 text-muted fs-13">Set custom rates for items in this price list</p>
                                            </div>
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="fs-13 text-dark fw-medium">Import Price List for Items</span>
                                                <div className="form-check form-switch m-0 ps-0">
                                                    <input
                                                        className="form-check-input switchCheckPrimary ms-0"
                                                        type="checkbox"
                                                        role="switch"
                                                        checked={importEnabled}
                                                        onChange={(e) => setImportEnabled(e.target.checked)}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {importEnabled ? (
                                            <div className="mt-3">
                                                {/* Hidden file input */}
                                                <input
                                                    ref={importFileRef}
                                                    type="file"
                                                    accept=".csv,.xls,.xlsx"
                                                    style={{ display: "none" }}
                                                    onChange={handleImportItems}
                                                />

                                                {/* Step 1 */}
                                                <div className="mb-4 pb-3 border-bottom">
                                                    <div className="d-flex align-items-center gap-2 mb-2">
                                                        <span className="badge bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-semibold" style={{ width: 22, height: 22, fontSize: 11 }}>1</span>
                                                        <h6 className="mb-0 fw-semibold text-dark fs-14">Export items as XLS file</h6>
                                                    </div>
                                                    <p className="text-primary fs-13 mb-3 ps-4">Export all items or filter specific items, export them to an XLS file, update the rates, and import the file back to update the price list.</p>
                                                    <div className="d-flex gap-2 ps-4">
                                                        <button type="button" className="btn btn-outline-light border shadow-sm fs-13 fw-medium" onClick={handleExportAllItems}>
                                                            <i className="ti ti-upload text-primary me-1" /> Export All Items
                                                        </button>
                                                        <button type="button" className="btn btn-outline-light border shadow-sm fs-13 fw-medium" onClick={handleExportFilteredItems}>
                                                            <i className="ti ti-upload text-primary me-1" /> Export Filtered Items
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Step 2 */}
                                                <div>
                                                    <div className="d-flex align-items-center gap-2 mb-2">
                                                        <span className="badge bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-semibold" style={{ width: 22, height: 22, fontSize: 11 }}>2</span>
                                                        <h6 className="mb-0 fw-semibold text-dark fs-14">Import items as XLS file</h6>
                                                    </div>
                                                    <p className="text-primary fs-13 mb-3 ps-4">Import the CSV or XLS file that you've exported and updated with the customised rates to update the price list.</p>
                                                    <div className="bg-light rounded border p-3 mb-3 ms-4">
                                                        <p className="fs-12 fw-semibold text-dark text-uppercase mb-2" style={{ letterSpacing: '0.5px' }}>
                                                            <i className="ti ti-info-circle text-primary me-1" /> Note
                                                        </p>
                                                        <p className="text-dark fs-13 mb-1">1. Before you import, ensure that the following column names are in English as given below:</p>
                                                        <ul className="text-muted fs-13 mb-2 ps-3">
                                                            <li>Item Name</li>
                                                            <li>SKU</li>
                                                            <li>PriceList Rate</li>
                                                        </ul>
                                                        <p className="text-dark fs-13 mb-0">2. Once you import the file, the existing items and its rates in this price list will be replaced with the data in the import file.</p>
                                                    </div>
                                                    <div className="ps-4">
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary fs-13 fw-medium shadow-sm"
                                                            onClick={() => importFileRef.current?.click()}
                                                        >
                                                            <i className="ti ti-file-import me-1" /> Import Items
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                {/* Update in Bulk link */}
                                                <div className="mb-3">
                                                    <Link
                                                        to="#"
                                                        className="text-danger text-decoration-none d-inline-flex align-items-center gap-1 fs-13 fw-semibold"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            if (!form.items.some(i => i.selected)) {
                                                                setToast({ message: "Select the items you want to update in bulk.", type: "error" });
                                                            }
                                                        }}
                                                    >
                                                        <i className="ti ti-adjustments-horizontal" /> Update Rates in Bulk
                                                    </Link>
                                                </div>

                                                {/* Items Table */}
                                                <div className="table-responsive border rounded">
                                                    <table className="table table-hover mb-0">
                                                        <thead className="bg-light">
                                                            <tr>
                                                                <th className="py-2 px-3 fw-semibold fs-12 text-uppercase text-muted border-0" style={{ width: '40%', letterSpacing: '0.5px' }}>
                                                                    <div className="form-check m-0 d-inline-block align-middle me-2">
                                                                        <input
                                                                            className="form-check-input shadow-none"
                                                                            type="checkbox"
                                                                            checked={form.items.length > 0 && form.items.every(i => i.selected)}
                                                                            onChange={e => {
                                                                                const val = e.target.checked;
                                                                                setF("items", form.items.map(it => ({ ...it, selected: val })));
                                                                            }}
                                                                            style={{ width: 14, height: 14 }}
                                                                        />
                                                                    </div>
                                                                    Item Details
                                                                </th>
                                                                <th className="py-2 fw-semibold fs-12 text-uppercase text-muted text-end border-0" style={{ width: '25%', letterSpacing: '0.5px' }}>Sales Rate</th>
                                                                <th className="py-2 fw-semibold fs-12 text-uppercase text-muted text-end border-0" style={{ width: '25%', letterSpacing: '0.5px' }}>Custom Rate</th>
                                                                {form.includeDiscount && (
                                                                    <th className="py-2 fw-semibold fs-12 text-uppercase text-muted text-end border-0" style={{ width: '10%', letterSpacing: '0.5px' }}>
                                                                        Discount (%)
                                                                        <OverlayTrigger placement="top" overlay={<Tooltip id="tooltip-discount">This discount percentage will be applied to the item only if line item level discount is available.</Tooltip>}>
                                                                            <i className="ti ti-info-circle ms-1 text-muted cursor-pointer fs-13" />
                                                                        </OverlayTrigger>
                                                                    </th>
                                                                )}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {form.items.length > 0 ? form.items.map(it => {
                                                                const base = parseFloat(it.salesRate) || 1200;
                                                                return (
                                                                    <tr key={it.id} className="align-middle">
                                                                        <td className="px-3 py-2 fw-medium text-dark fs-14">
                                                                            <div className="form-check m-0 d-inline-block align-middle me-2">
                                                                                <input
                                                                                    className="form-check-input shadow-none"
                                                                                    type="checkbox"
                                                                                    checked={it.selected}
                                                                                    onChange={e => updateItem(it.id, "selected", e.target.checked)}
                                                                                    style={{ width: 14, height: 14 }}
                                                                                />
                                                                            </div>
                                                                            {it.itemName}
                                                                        </td>
                                                                        <td className="text-end py-2 text-muted fs-14">{base.toFixed(2)}</td>
                                                                        <td className="py-2 text-end">
                                                                            <input
                                                                                type="number"
                                                                                className="form-control form-control-sm text-end ms-auto"
                                                                                style={{ maxWidth: '160px' }}
                                                                                value={it.customRate}
                                                                                onChange={e => updateItem(it.id, "customRate", e.target.value)}
                                                                                placeholder="0.00"
                                                                            />
                                                                        </td>
                                                                        {form.includeDiscount && (
                                                                            <td className="py-2 text-end">
                                                                                <input
                                                                                    type="number"
                                                                                    className="form-control form-control-sm text-end ms-auto"
                                                                                    style={{ maxWidth: '80px' }}
                                                                                    value={it.discountPct || ""}
                                                                                    onChange={e => updateItem(it.id, "discountPct", e.target.value)}
                                                                                />
                                                                            </td>
                                                                        )}
                                                                    </tr>
                                                                );
                                                            }) : (
                                                                <tr>
                                                                    <td colSpan={form.includeDiscount ? 4 : 3} className="text-center py-5 text-muted border-0">
                                                                        <i className="ti ti-mood-empty fs-24 d-block mb-1" />
                                                                        <span className="fs-13">No items added yet.</span>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            <div className="d-flex align-items-center gap-3 pt-5 border-top mt-5 mb-3">
                                <button onClick={handleSave} disabled={saving} className="btn btn-primary px-5 py-2 fw-bold shadow-sm">
                                    {saving ? <><span className="spinner-border spinner-border-sm me-2" /> Saving...</> : (isEdit ? 'Save Price List' : 'Save')}
                                </button>
                                <button onClick={() => navigate(route.priceList)} className="btn btn-light px-4 py-2 border fw-medium shadow-none">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {isList ? ListView() : FormView()}
            {deleteTarget && <DeleteModal name={deleteTarget.name} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />}
            {showCategoryModal && (
                <CategoryModal
                    categories={categories}
                    setCategories={setCategories}
                    value={newCategoryName}
                    onChange={setNewCategoryName}
                    onConfirm={() => {
                        if (newCategoryName.trim()) {
                            if (!categories.includes(newCategoryName.trim())) {
                                setCategories(prev => [...prev, newCategoryName.trim()]);
                            }
                            setF("category", newCategoryName.trim());
                            setNewCategoryName("");
                        }
                    }}
                    onClose={() => { setShowCategoryModal(false); setNewCategoryName(""); }}
                    onDelete={(cat) => {
                        setCategories(prev => prev.filter(c => c !== cat));
                        if (form.category === cat) setF("category", "");
                    }}
                />
            )}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
};

const CategoryModal = ({ categories, setCategories, value, onChange, onConfirm, onClose, onDelete }: { categories: string[]; setCategories: React.Dispatch<React.SetStateAction<string[]>>; value: string; onChange: (v: string) => void; onConfirm: () => void; onClose: () => void; onDelete: (v: string) => void; }) => {
    const [editingCat, setEditingCat] = useState<{ old: string, new: string } | null>(null);

    return (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3100 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content rounded-3 border-0 shadow-lg overflow-hidden">
                    <div className="modal-header border-0 pb-0 pe-4">
                        <h5 className="modal-title fs-18 fw-bold text-dark">Manage Categories</h5>
                        <button type="button" className="btn-close custom-btn-close border p-1 me-0 d-flex align-items-center justify-content-center rounded-circle" onClick={onClose}>
                            <i className="ti ti-x" />
                        </button>
                    </div>
                    <div className="modal-body p-4 pt-4">
                        <div className="row align-items-center mb-4">
                            <div className="col-md-4">
                                <label className="form-label fs-14 fw-semibold mb-0 text-danger ps-1">Category Name*</label>
                            </div>
                            <div className="col-md-8">
                                <input
                                    type="text"
                                    className="form-control border shadow-none fs-14 bg-white"
                                    placeholder="Enter category name"
                                    value={value}
                                    onChange={(e) => onChange(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="row mb-4">
                            <div className="col-md-4"></div>
                            <div className="col-md-8">
                                <div className="d-flex gap-2">
                                    <button onClick={onConfirm} className="btn btn-danger px-4 fw-bold shadow-sm">Save</button>
                                    <button onClick={onClose} className="btn btn-light px-4 fw-medium border shadow-none bg-white">Cancel</button>
                                </div>
                            </div>
                        </div>

                        <div className="border-top pt-4">
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <h6 className="mb-0 fs-12 fw-bold text-muted text-uppercase d-flex align-items-center gap-2" style={{ letterSpacing: '0.5px' }}>
                                    CATEGORIES <i className="ti ti-rotate fs-14 cursor-pointer opacity-50" />
                                </h6>
                            </div>
                            <div className="rounded-3 border overflow-hidden" style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: '#fcfcfc' }}>
                                {categories.map((c, idx) => (
                                    <div key={idx} className="d-flex align-items-center justify-content-between py-2 px-3 border-bottom last-border-0 bg-white">
                                        {editingCat?.old === c ? (
                                            <input
                                                className="form-control form-control-sm border-0 shadow-none p-0 fs-14 fw-medium"
                                                value={editingCat.new}
                                                onChange={(e) => setEditingCat({ ...editingCat, new: e.target.value })}
                                                onBlur={() => {
                                                    if (editingCat.new.trim() && editingCat.new !== editingCat.old) {
                                                        setCategories(prev => prev.map(item => item === editingCat.old ? editingCat.new.trim() : item));
                                                    }
                                                    setEditingCat(null);
                                                }}
                                                autoFocus
                                            />
                                        ) : (
                                            <span className="fs-14 fw-medium text-dark">{c}</span>
                                        )}
                                        <div className="d-flex gap-3 text-muted">
                                            <i className="ti ti-edit fs-17 cursor-pointer hover-text-primary" onClick={() => setEditingCat({ old: c, new: c })} />
                                            <i className="ti ti-trash fs-17 cursor-pointer hover-text-danger" onClick={() => onDelete(c)} />
                                        </div>
                                    </div>
                                ))}
                                {categories.length === 0 && (
                                    <div className="p-4 text-center text-muted fs-13 italic">No categories found.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DeleteModal = ({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void; }) => (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content rounded-0">
                <div className="modal-body p-4 text-center position-relative">
                    <div className="mb-3 position-relative z-1">
                        <span className="avatar avatar-xl badge-soft-danger border-0 text-danger rounded-circle">
                            <i className="ti ti-trash fs-24" />
                        </span>
                    </div>
                    <h5 className="mb-1">Delete Confirmation</h5>
                    <p className="mb-3">Are you sure you want to remove <b className="text-dark">{name}</b>?</p>
                    <div className="d-flex justify-content-center">
                        <button onClick={onClose} className="btn btn-light me-2 w-100">Cancel</button>
                        <button onClick={onConfirm} className="btn btn-primary w-100">Yes, Delete</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export default PriceList;