// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../../api/axios";
import "../billing-application.scss";
import Datatable from "../../../../components/dataTable";
import PredefinedDatePicker from "../../../../components/common-dateRangePicker/PredefinedDatePicker";
import PageHeader from "../../../../components/page-header/pageHeader";
import { all_routes } from "../../../../routes/all_routes";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Invoice {
    id: number;
    invoiceNumber: string;
    date: string;
    orderNumber: string;
    customerName: string;
    status: "Draft" | "Sent" | "Overdue" | "Paid" | "Void";
    dueDate: string;
    amount: number;
    isDeleted?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const SK = "billing_invoices";

function todayStr(): string {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function padNum(n: number): string {
    return "INV-" + String(n).padStart(6, "0");
}

const SEED: Invoice[] = [
    {
        id: 1,
        invoiceNumber: "INV-000001",
        date: todayStr(),
        orderNumber: "",
        customerName: "vijay E",
        status: "Draft",
        dueDate: todayStr(),
        amount: 0,
    },
];

function loadInvoices(): Invoice[] {
    try {
        const s = localStorage.getItem(SK);
        if (s) {
            const p = JSON.parse(s) as Invoice[];
            if (Array.isArray(p) && p.length) return p.filter((i) => !i.isDeleted);
        }
    } catch { /**/ }
    try { localStorage.setItem(SK, JSON.stringify(SEED)); } catch { /**/ }
    return SEED;
}

export function saveAll(data: Invoice[]) {
    try { localStorage.setItem(SK, JSON.stringify(data)); } catch { /**/ }
}

export function getAllRaw(): Invoice[] {
    try { return JSON.parse(localStorage.getItem(SK) || "[]") as Invoice[]; } catch { return []; }
}

export function saveStorageItems<T>(id: number, items: T[]): void {
    try { localStorage.setItem(`billing_invoice_items_${id}`, JSON.stringify(items)); } catch { /**/ }
}

export function loadStorageItems<T>(id: number): T[] {
    try { return JSON.parse(localStorage.getItem(`billing_invoice_items_${id}`) || "[]") as T[]; } catch { return []; }
}

function nextId(arr: { id: number }[]): number {
    return arr.length ? Math.max(...arr.map((a) => a.id)) + 1 : 1;
}

export function nextInvoiceNumber(): string {
    const raw = getAllRaw();
    const n = nextId(raw);
    return padNum(n);
}

const fmt = (n: number) =>
    "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2 });

const STATUS_COLORS: Record<Invoice["status"], { bg: string; color: string }> = {
    Draft: { bg: "#f0f0f0", color: "#666" },
    Sent: { bg: "#e8f4fd", color: "#1a6fb5" },
    Overdue: { bg: "#fdecea", color: "#c0392b" },
    Paid: { bg: "#e8f8ef", color: "#1e8449" },
    Void: { bg: "#f5f5f5", color: "#999" },
};

const ALL_STATUSES: Invoice["status"][] = ["Draft", "Sent", "Overdue", "Paid", "Void"];
const ALL_COLS = ["Date", "Order Number", "Customer Name", "Status", "Due Date", "Amount"];

// ── Delete Confirm ────────────────────────────────────────────────────────────
const DeleteConfirm: React.FC<{
    invoiceNumber: string;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ invoiceNumber, onConfirm, onCancel }) => (
    <div
        style={{ position: "fixed", inset: 0, zIndex: 2100, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
        onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
        <div className="bg-white shadow-lg text-center" style={{ borderRadius: 12, width: "100%", maxWidth: 380, padding: "32px 28px" }}>
            <div className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle" style={{ width: 60, height: 60, background: "#fff0ef" }}>
                <i className="ti ti-trash text-danger" style={{ fontSize: 26 }} />
            </div>
            <h6 className="fw-bold fs-16 mb-1">Delete Invoice?</h6>
            <p className="text-muted fs-14 mb-4">
                "<strong>{invoiceNumber}</strong>" will be permanently removed.
            </p>
            <div className="d-flex justify-content-center gap-3">
                <button className="btn btn-light fs-14 px-4" onClick={onCancel}>Cancel</button>
                <button className="btn btn-danger fs-14 px-4" onClick={onConfirm}>
                    <i className="ti ti-trash me-1" />Delete
                </button>
            </div>
        </div>
    </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const InvoiceList: any = () => {
    const route = all_routes;
    const navigate = useNavigate();

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
    const [selectedView, setSelectedView] = useState("All Invoices");
    const [filterStatus, setFilterStatus] = useState<string[]>([]);
    const [pendingFilter, setPendingFilter] = useState<string[]>([]);
    const [showFilter, setShowFilter] = useState(false);
    const [statusFilterOpen, setStatusFilterOpen] = useState(true);
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(
        Object.fromEntries(ALL_COLS.map((c) => [c, true]))
    );
    const [del, setDel] = useState<{ invoiceNumber: string; onConfirm: () => void } | null>(null);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const localData = loadInvoices();

            try {
                const response = await api.get("/invoices");
                const rawInvoices = Array.isArray(response.data) ? response.data : (response.data?.data || []);
                const apiInvoices = rawInvoices.map((inv: any) => ({
                    id: inv.id,
                    invoiceNumber: inv.invoice_number,
                    date: inv.invoice_date,
                    orderNumber: inv.order_number || "",
                    customerName: inv.customer?.display_name || "Unknown",
                    status: inv.status,
                    dueDate: inv.due_date,
                    amount: inv.grand_total,
                }));
                // Merge: local data takes priority for same id
                const merged = [
                    ...localData.filter(l => !apiInvoices.find((a: Invoice) => a.id === l.id)),
                    ...apiInvoices,
                ];
                setInvoices(merged);
            } catch {
                setInvoices(localData);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const openAdd = () => navigate(route.billingInvoiceAdd);

    const handleDelete = (inv: Invoice) => {
        setDel({
            invoiceNumber: inv.invoiceNumber,
            onConfirm: async () => {
                try {
                    await api.delete(`/invoices/${inv.id}`);
                    fetchInvoices();
                    setDel(null);
                } catch (error) {
                    console.error("Error deleting invoice:", error);
                }
            },
        });
    };

    const tableData = React.useMemo(() => {
        let d = [...invoices];
        if (filterStatus.length > 0) {
            d = d.filter((i: Invoice) => filterStatus.includes(i.status));
        }
        if (selectedView !== "All Invoices") {
            const viewMap: any = {
                "Draft Invoices": ["Draft"],
                "Overdue Invoices": ["Overdue"],
                "Paid Invoices": ["Paid"],
                "Sent Invoices": ["Sent"],
                "Void Invoices": ["Void"],
            };
            if (viewMap[selectedView]) {
                d = d.filter((i: Invoice) => viewMap[selectedView].includes(i.status));
            }
        }
        if (searchText.trim()) {
            const q = searchText.toLowerCase();
            d = d.filter((i) =>
                i.invoiceNumber.toLowerCase().includes(q) ||
                i.customerName.toLowerCase().includes(q) ||
                i.orderNumber.toLowerCase().includes(q) ||
                i.status.toLowerCase().includes(q)
            );
        }
        d.sort((a: Invoice, b: Invoice) => (sortBy === "oldest" ? a.id - b.id : b.id - a.id));
        return d;
    }, [invoices, filterStatus, selectedView, searchText, sortBy]);

    const handleApplyFilter = () => { setFilterStatus(pendingFilter); setShowFilter(false); };
    const handleResetFilter = () => { setPendingFilter([]); setFilterStatus([]); setShowFilter(false); };

    const handleExportCSV = () => {
        const headers = ["Invoice#", "Date", "Order Number", "Customer Name", "Status", "Due Date", "Amount"];
        const rows = tableData.map((r) => [r.invoiceNumber, r.date, r.orderNumber, r.customerName, r.status, r.dueDate, r.amount]);
        const csv = [headers, ...rows]
            .map((row: any[]) => row.map((val: any) => `"${String(val ?? "").replace(/"/g, '""')}"`).join(","))
            .join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "invoices.csv";
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    };

    const handleExportPDF = () => {
        const rows = tableData.map((r) =>
            `<tr><td>${r.invoiceNumber}</td><td>${r.date}</td><td>${r.orderNumber || "—"}</td><td>${r.customerName}</td><td>${r.status}</td><td>${r.dueDate}</td><td>${fmt(r.amount)}</td></tr>`
        ).join("");
        const html = `<html><head><title>Invoices</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5;font-weight:600}h2{margin-bottom:16px}</style></head><body><h2>Invoices</h2><table><thead><tr><th>Invoice#</th><th>Date</th><th>Order#</th><th>Customer</th><th>Status</th><th>Due Date</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
        const win = window.open("", "_blank");
        if (win) { win.document.write(html); win.document.close(); win.print(); }
    };

    const columns = [
        {
            title: "Date",
            dataIndex: "date",
            key: "date",
            sorter: (a: any, b: any) => (a.date || "").localeCompare(b.date || ""),
            render: (v: string) => <span className="fs-14 text-dark">{v || ""}</span>,
        },
        {
            title: "Invoice#",
            dataIndex: "invoiceNumber",
            key: "invoiceNumber",
            sorter: (a: any, b: any) => (a.invoiceNumber || "").localeCompare(b.invoiceNumber || ""),
            render: (_: unknown, record: Invoice) => (
                <button
                    className="border-0 bg-transparent p-0 text-start fw-medium"
                    style={{ color: "#e41f07", cursor: "pointer", fontSize: "14px" }}
                    onClick={(e) => { e.stopPropagation(); navigate(route.billingInvoiceView.replace(":id", String(record.id))); }}
                >
                    {record.invoiceNumber}
                </button>
            ),
        },
        {
            title: "Order Number",
            dataIndex: "orderNumber",
            key: "orderNumber",
            render: (v: string) => <span className="fs-14 text-dark">{v || ""}</span>,
        },
        {
            title: "Customer Name",
            dataIndex: "customerName",
            key: "customerName",
            sorter: (a: any, b: any) => (a.customerName || "").localeCompare(b.customerName || ""),
            render: (v: string) => <span className="fs-14 text-dark">{v || ""}</span>,
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (v: Invoice["status"]) => {
                const c = STATUS_COLORS[v] || { bg: "#eee", color: "#555" };
                return (
                    <span style={{ background: c.bg, color: c.color, borderRadius: 4, padding: "2px 10px", fontWeight: 500, fontSize: 13, display: "inline-block", letterSpacing: 0.2 }}>
                        {v.toUpperCase()}
                    </span>
                );
            },
        },
        {
            title: "Due Date",
            dataIndex: "dueDate",
            key: "dueDate",
            sorter: (a: Invoice, b: Invoice) => a.dueDate.localeCompare(b.dueDate),
            render: (v: string) => <span className="fs-14 text-dark">{v}</span>,
        },
        {
            title: "Amount",
            dataIndex: "amount",
            key: "amount",
            sorter: (a: any, b: any) => (a.amount || 0) - (b.amount || 0),
            render: (v: number) => <span className="fs-14 text-dark">{fmt(v || 0)}</span>,
        },
        {
            title: "Action",
            key: "action",
            render: (_: unknown, record: Invoice) => (
                <div className="dropdown table-action">
                    <Link
                        to="#"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, border: "1px solid #dee2e6", background: "#fff" }}
                    >
                        <i className="ti ti-dots-vertical" style={{ fontSize: 16, color: "#6c757d" }} />
                    </Link>
                    <div className="dropdown-menu dropdown-menu-right">
                        <Link className="dropdown-item" to="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(route.billingInvoiceView.replace(":id", String(record.id))); }}>
                            <i className="ti ti-eye text-blue me-1" /> View
                        </Link>
                        <Link className="dropdown-item" to="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(route.billingInvoiceEdit.replace(":id", String(record.id))); }}>
                            <i className="ti ti-edit text-blue me-1" /> Edit
                        </Link>
                        <Link className="dropdown-item text-danger" to="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(record); }}>
                            <i className="ti ti-trash me-1" /> Delete
                        </Link>
                    </div>
                </div>
            ),
        },
    ];

    const visibleColumns = columns.filter((c: any) => {
        if (c.title === "Invoice#" || c.title === "Action") return true;
        return (visibleCols as any)[c.title] !== false;
    });

    const viewOptions = [
        "All Invoices", "Draft Invoices", "Overdue Invoices", "Paid Invoices",
        "Sent Invoices", "Void Invoices",
    ];

    const titleDropdown = (
        <div className="dropdown custom-header-dropdown">
            <div className="d-flex align-items-center gap-2 cursor-pointer" data-bs-toggle="dropdown">
                <h4 className="mb-0 fw-bold" style={{ fontSize: "18px", color: "#111" }}>{selectedView}</h4>
                <i className="ti ti-chevron-down text-primary fs-14" />
                <span className="badge badge-soft-primary ms-1">{tableData.length}</span>
            </div>
            <div className="dropdown-menu shadow-lg border-0 mt-2 py-0 overflow-hidden" style={{ minWidth: 260, borderRadius: 8 }}>
                <div style={{ maxHeight: 400, overflowY: "auto" }}>
                    {viewOptions.map((view) => (
                        <div
                            key={view}
                            className={`dropdown-item px-3 py-2 d-flex align-items-center justify-content-between cursor-pointer ${selectedView === view ? "active" : ""}`}
                            onClick={() => setSelectedView(view)}
                        >
                            <span className="fs-14 fw-medium text-dark">{view}</span>
                            <i className="ti ti-star text-muted fs-12" />
                        </div>
                    ))}
                </div>
                <div className="dropdown-divider m-0" />
                <div className="dropdown-item px-3 py-3 bg-light cursor-pointer d-flex align-items-center gap-2 text-primary" style={{ borderTop: "1px solid #f0f2f4" }}>
                    <i className="ti ti-circle-plus fs-18" />
                    <span className="fs-14 fw-bold">New Custom View</span>
                </div>
            </div>
        </div>
    );

    const moreButton = (
        <div className="dropdown">
            <button
                className="btn btn-outline-light d-flex align-items-center justify-content-center px-3 shadow-sm border"
                style={{ height: 36, borderRadius: 4, background: "#fff", color: "#666" }}
                data-bs-toggle="dropdown"
            >
                <i className="ti ti-package-export me-2" /> Export <i className="ti ti-chevron-down ms-1 fs-12" />
            </button>
            <div className="dropdown-menu dropdown-menu-end shadow-lg border-0 py-2" style={{ borderRadius: 8, minWidth: 180 }}>
                <Link className="dropdown-item py-2" to="#" onClick={(e) => { e.preventDefault(); handleExportPDF(); }}>
                    <div className="d-flex align-items-center gap-2">
                        <i className="ti ti-file-type-pdf text-danger fs-18" />
                        <span>Export as PDF</span>
                    </div>
                </Link>
                <Link className="dropdown-item py-2" to="#" onClick={(e) => { e.preventDefault(); handleExportCSV(); }}>
                    <div className="d-flex align-items-center gap-2">
                        <i className="ti ti-file-type-xls text-success fs-18" />
                        <span>Export as Excel</span>
                    </div>
                </Link>
            </div>
        </div>
    );

    return (
        <div className="page-wrapper" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <div className="content pb-0 flex-grow-1 d-flex flex-column">
                <PageHeader
                    title="Invoices"
                    titleDropdown={titleDropdown}
                    showModuleTile={false}
                    moduleLink={route.billingInvoiceList}
                    exportComponent={
                        <div className="d-flex align-items-center gap-2">
                            {moreButton}
                        </div>
                    }
                    onRefresh={() => {
                        setSearchText("");
                        setFilterStatus([]);
                        setSortBy("newest");
                        setSelectedView("All Invoices");
                        fetchInvoices();
                    }}
                    settingsLink={route.billingInvoiceSetting}
                />

                <div className="card border-0 rounded-0 flex-grow-1 mb-4 d-flex flex-column">

                    <div className="card-header d-flex align-items-center justify-content-between gap-2 flex-wrap" style={{ borderBottom: "1px solid #f0f2f4" }}>
                        <div className="d-flex align-items-center rounded bg-white" style={{ width: 220, border: searchFocused ? "1px solid #e41f07" : "1px solid #dee2e6", height: 34 }}>
                            <span className="px-2 d-flex align-items-center text-muted">
                                <i className="ti ti-search fs-14" />
                            </span>
                            <input
                                className="form-control border-0 ps-0 fs-14 bg-transparent"
                                style={{ outline: "none", boxShadow: "none", height: 36 }}
                                placeholder="Search invoices..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                            />
                        </div>
                        <button
                            className="btn text-white d-flex align-items-center fw-bold"
                            style={{ background: "#e41f07", border: "none", borderRadius: 4, padding: "0 15px", height: 36, fontSize: 13 }}
                            onClick={openAdd}
                        >
                            <i className="ti ti-plus me-2 fs-14" /> Add New Invoice
                        </button>
                    </div>

                    <div className="card-body p-0 d-flex flex-column" style={{ minHeight: 0 }}>
                        <div className="toolbar-custom py-2 px-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
                            {/* LEFT: Sort By + Date */}
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <div className="dropdown">
                                    <button className="dropdown-toggle btn btn-outline-light px-3 shadow" style={{ height: 38, fontSize: 14, borderRadius: 3, borderColor: "#ebe7e5ff" }} data-bs-toggle="dropdown">
                                        <i className="ti ti-sort-ascending-2 me-2" />Sort By
                                    </button>
                                    <div className="dropdown-menu">
                                        <ul>
                                            <li><button className={`dropdown-item ${sortBy === "newest" ? "active" : ""}`} onClick={() => setSortBy("newest")}>Newest</button></li>
                                            <li><button className={`dropdown-item ${sortBy === "oldest" ? "active" : ""}`} onClick={() => setSortBy("oldest")}>Oldest</button></li>
                                        </ul>
                                    </div>
                                </div>
                                <PredefinedDatePicker />
                            </div>

                            {/* RIGHT: Filter + Manage Columns + View Toggle */}
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <div style={{ position: "relative" }}>
                                    <button
                                        className={`btn btn-outline-light px-3 ${filterStatus.length > 0 ? "border-primary text-primary" : ""}`}
                                        style={{ height: 38, fontSize: 14, borderRadius: 3, borderColor: "#ebe7e5ff" }}
                                        onClick={() => setShowFilter(!showFilter)}
                                    >
                                        <i className="ti ti-filter me-2" />Filter
                                        {filterStatus.length > 0 && <span className="badge bg-primary ms-1">{filterStatus.length}</span>}
                                        <i className="ti ti-chevron-down ms-1" />
                                    </button>
                                    {showFilter && (
                                        <div className="filter-dropdown-menu dropdown-menu show shadow-lg border-0 p-0 mt-2" style={{ position: "absolute", right: 0, top: "100%", minWidth: 220, zIndex: 1060, borderRadius: 8 }}>
                                            <div className="filter-header d-flex align-items-center justify-content-between p-2 px-3 border-bottom">
                                                <h6 className="fs-14 fw-bold mb-0 text-dark"><i className="ti ti-filter me-2" />Filter</h6>
                                                <button type="button" onClick={() => setShowFilter(false)}
                                                    style={{ width: 28, height: 28, background: "#fff1f0", border: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                                                    <i className="ti ti-x" style={{ color: "#e41f07", fontSize: 14 }} />
                                                </button>
                                            </div>
                                            <div className="filter-set-view p-2 px-3">
                                                <div className="filter-set-content">
                                                    <div className="filter-set-content-head mb-2 mt-1">
                                                        <button
                                                            className={`btn p-0 border-0 bg-transparent fw-bold fs-14 ${statusFilterOpen ? "text-dark" : "collapsed text-dark"}`}
                                                            onClick={() => setStatusFilterOpen(!statusFilterOpen)}
                                                        >
                                                            Status
                                                        </button>
                                                    </div>
                                                    {statusFilterOpen && (
                                                        <div className="filter-content-list ps-4">
                                                            {ALL_STATUSES.map((status) => (
                                                                <div className="form-check mb-2" key={status}>
                                                                    <input
                                                                        className="form-check-input primary-checkbox"
                                                                        type="checkbox"
                                                                        id={`filter-inv-${status}`}
                                                                        checked={pendingFilter.includes(status)}
                                                                        style={{ width: 20, height: 20, cursor: "pointer" }}
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) setPendingFilter([...pendingFilter, status]);
                                                                            else setPendingFilter(pendingFilter.filter((s) => s !== status));
                                                                        }}
                                                                    />
                                                                    <label className="form-check-label fs-14 cursor-pointer text-muted fw-medium ms-1" htmlFor={`filter-inv-${status}`}>
                                                                        {status}
                                                                    </label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="d-flex align-items-center gap-2 mt-2 pt-2 border-top">
                                                    <button className="btn btn-light bg-light border-0 flex-grow-1 fs-14 fw-bold p-1 shadow-none" style={{ borderRadius: 6, height: 36, color: "#444" }} onClick={handleResetFilter}>Reset</button>
                                                    <button className="btn btn-danger flex-grow-1 fs-14 fw-bold p-1 shadow-sm" style={{ borderRadius: 6, height: 36 }} onClick={handleApplyFilter}>Filter</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {viewMode === "list" && (
                                    <div className="dropdown">
                                        <button className="btn px-3 border-0 d-flex align-items-center gap-2 shadow-none fw-bold" style={{ height: 38, fontSize: 14, borderRadius: 8, background: "#f5f7ff", color: "#6366f1" }} data-bs-toggle="dropdown" data-bs-auto-close="outside">
                                            <i className="ti ti-columns-3" />Manage Columns
                                        </button>
                                        <div className="dropdown-menu dropdown-menu-end dropdown-md p-3 shadow-lg border-0 mt-2" style={{ borderRadius: 8 }}>
                                            <ul className="mb-0">
                                                {ALL_COLS.map((col) => (
                                                    <li className="gap-1 d-flex align-items-center mb-2" key={col}>
                                                        <i className="ti ti-columns me-1 text-muted" />
                                                        <div className="form-check form-switch w-100 ps-0">
                                                            <label className="form-check-label d-flex align-items-center gap-2 w-100 cursor-pointer">
                                                                <span className="fs-14">{col}</span>
                                                                <input
                                                                    className="form-check-input switchCheckDefault ms-auto"
                                                                    type="checkbox"
                                                                    role="switch"
                                                                    checked={visibleCols[col] !== false}
                                                                    onChange={() => setVisibleCols((prev) => ({ ...prev, [col]: !prev[col] }))}
                                                                />
                                                            </label>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                <div className="d-flex align-items-center gap-1" style={{ border: "1px solid #ebe7e5ff", borderRadius: 3, background: "#fff", padding: "4px", height: 38 }}>
                                    <button onClick={() => setViewMode("list")} style={{ width: 34, height: 34, border: "none", cursor: "pointer", background: viewMode === "list" ? "#1ba59e" : "transparent", color: viewMode === "list" ? "#fff" : "#6c757d", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                                        <i className="ti ti-list fs-16" />
                                    </button>
                                    <button onClick={() => setViewMode("grid")} style={{ width: 34, height: 34, border: "none", cursor: "pointer", background: viewMode === "grid" ? "#1ba59e" : "transparent", color: viewMode === "grid" ? "#fff" : "#6c757d", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                                        <i className="ti ti-grid-dots fs-16" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-grow-1 overflow-auto" style={{ minWidth: 0 }}>
                            {viewMode === "list" ? (
                                <div className="custom-table table-nowrap px-4 flex-grow-1 border-0">
                                    <Datatable
                                        columns={visibleColumns}
                                        dataSource={tableData}
                                        Selection={true}
                                        searchText=""
                                        onRow={(record) => ({
                                            onClick: () => navigate(route.billingInvoiceView.replace(":id", String(record.id))),
                                            style: { cursor: "pointer" },
                                        })}
                                    />
                                </div>
                            ) : (
                                <div className="p-4">
                                    <div className="row g-3">
                                        {tableData.map((inv) => {
                                            const sc = STATUS_COLORS[inv.status] || { bg: "#eee", color: "#555" };
                                            return (
                                                <div className="col-xxl-3 col-xl-4 col-md-6" key={inv.id}>
                                                    <div className="card border shadow-sm h-100" style={{ borderRadius: 10 }}>
                                                        <div className="card-body p-3">
                                                            <div className="d-flex align-items-center justify-content-between flex-wrap mb-3 border-bottom pb-3">
                                                                <div>
                                                                    <button
                                                                        className="border-0 bg-transparent p-0 fw-bold fs-14"
                                                                        style={{ color: "#e41f07", cursor: "pointer" }}
                                                                        onClick={() => navigate(route.billingInvoiceView.replace(":id", String(inv.id)))}
                                                                    >
                                                                        {inv.invoiceNumber}
                                                                    </button>
                                                                    <div className="fs-12 text-muted mt-1">{inv.date}</div>
                                                                </div>
                                                                <div className="dropdown table-action">
                                                                    <button className="btn btn-icon btn-sm btn-outline-light shadow-sm bg-white" data-bs-toggle="dropdown">
                                                                        <i className="ti ti-dots-vertical text-muted" />
                                                                    </button>
                                                                    <div className="dropdown-menu dropdown-menu-right">
                                                                        <button className="dropdown-item" onClick={() => navigate(route.billingInvoiceView.replace(":id", String(inv.id)))}>
                                                                            <i className="ti ti-eye text-blue me-2" /> View
                                                                        </button>
                                                                        <button className="dropdown-item" onClick={() => navigate(route.billingInvoiceEdit.replace(":id", String(inv.id)))}>
                                                                            <i className="ti ti-edit text-blue me-2" /> Edit
                                                                        </button>
                                                                        <button className="dropdown-item text-danger" onClick={(e) => { e.stopPropagation(); handleDelete(inv); }}>
                                                                            <i className="ti ti-trash me-2" /> Delete
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="mb-3">
                                                                <p className="fs-14 text-dark mb-1 d-flex align-items-center gap-2">
                                                                    <i className="ti ti-user fs-15 text-muted" />{inv.customerName}
                                                                </p>
                                                                {inv.orderNumber && (
                                                                    <p className="fs-13 text-muted mb-0 d-flex align-items-center gap-2">
                                                                        <i className="ti ti-hash fs-13" />Order: {inv.orderNumber}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="d-flex align-items-center mb-3">
                                                                <span style={{ background: sc.bg, color: sc.color, borderRadius: 4, padding: "2px 10px", fontWeight: 500, fontSize: 12 }}>
                                                                    {inv.status.toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <div className="d-flex justify-content-between align-items-center border-top pt-3">
                                                                <div>
                                                                    <span className="fs-11 text-muted text-uppercase d-block mb-1">Due Date</span>
                                                                    <span className="fs-13 fw-medium text-dark">{inv.dueDate}</span>
                                                                </div>
                                                                <div className="text-end">
                                                                    <span className="fs-11 text-muted text-uppercase d-block mb-1">Amount</span>
                                                                    <span className="fs-14 fw-bold text-dark">{fmt(inv.amount)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {tableData.length === 0 && (
                                            <div className="col-12 text-center py-5 text-muted">
                                                <i className="ti ti-file-invoice fs-48 d-block mb-3" />
                                                No invoices found.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {del && <DeleteConfirm invoiceNumber={del.invoiceNumber} onConfirm={del.onConfirm} onCancel={() => setDel(null)} />}
            </div>
        </div>
    );
};

export default InvoiceList;
