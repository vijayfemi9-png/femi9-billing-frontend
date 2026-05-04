import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../billing-application.scss";
import Datatable from "../../../../components/dataTable";
import PredefinedDatePicker from "../../../../components/common-dateRangePicker/PredefinedDatePicker";
import PageHeader from "../../../../components/page-header/pageHeader";
import { all_routes } from "../../../../routes/all_routes";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Invoice {
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

function saveAll(data: Invoice[]) {
    try { localStorage.setItem(SK, JSON.stringify(data)); } catch { /**/ }
}

function getAllRaw(): Invoice[] {
    try { return JSON.parse(localStorage.getItem(SK) || "[]") as Invoice[]; } catch { return []; }
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
    Draft: { bg: "#fff8e1", color: "#f57c00" },
    Sent: { bg: "#e3f2fd", color: "#1976d2" },
    Overdue: { bg: "#ffebee", color: "#d32f2f" },
    Paid: { bg: "#e8f5e9", color: "#2e7d32" },
    Void: { bg: "#f5f5f5", color: "#757575" },
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
const InvoiceList: React.FC = () => {
    const route = all_routes;
    const navigate = useNavigate();

    const [invoices, setInvoices] = useState<Invoice[]>(() => loadInvoices());
    const [searchText, setSearchText] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
    const [selectedView, setSelectedView] = useState("All Invoices");
    const [filterStatus, setFilterStatus] = useState<Invoice["status"][]>([]);
    const [pendingFilter, setPendingFilter] = useState<Invoice["status"][]>([]);
    const [showFilter, setShowFilter] = useState(false);
    const [statusFilterOpen, setStatusFilterOpen] = useState(true);
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(
        Object.fromEntries(ALL_COLS.map((c) => [c, true]))
    );
    const [del, setDel] = useState<{ invoiceNumber: string; onConfirm: () => void } | null>(null);

    const openAdd = () => {
        // navigate(route.billingInvoiceAdd); // Temporarily disabled navigation as requested
    };

    const handleDelete = (inv: Invoice) => {
        setDel({
            invoiceNumber: inv.invoiceNumber,
            onConfirm: () => {
                const raw = getAllRaw();
                const updated = raw.map((x) => (x.id === inv.id ? { ...x, isDeleted: true } : x));
                saveAll(updated);
                setInvoices(updated.filter((x) => !x.isDeleted));
                setDel(null);
            },
        });
    };

    const handleApplyFilter = () => { setFilterStatus(pendingFilter); setShowFilter(false); };
    const handleResetFilter = () => { setPendingFilter([]); setFilterStatus([]); setShowFilter(false); };

    const handleExportCSV = () => {
        const headers = ["Invoice#", "Date", "Order Number", "Customer Name", "Status", "Due Date", "Amount"];
        const rows = tableData.map((r) => [r.invoiceNumber, r.date, r.orderNumber, r.customerName, r.status, r.dueDate, r.amount]);
        const csv = [headers, ...rows]
            .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
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

    const tableData = React.useMemo(() => {
        let d = [...invoices];
        if (filterStatus.length) d = d.filter((i) => filterStatus.includes(i.status));
        if (selectedView !== "All Invoices") {
            const map: Record<string, Invoice["status"][]> = {
                "Draft Invoices": ["Draft"],
                "Overdue Invoices": ["Overdue"],
                "Paid Invoices": ["Paid"],
                "Sent Invoices": ["Sent"],
                "Void Invoices": ["Void"],
            };
            if (map[selectedView]) d = d.filter((i) => map[selectedView].includes(i.status));
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
        d.sort((a, b) => (sortBy === "oldest" ? a.id - b.id : b.id - a.id));
        return d;
    }, [invoices, filterStatus, selectedView, searchText, sortBy]);

    const columns = [
        {
            title: "Date",
            dataIndex: "date",
            key: "date",
            sorter: (a: Invoice, b: Invoice) => a.date.localeCompare(b.date),
            render: (v: string) => <span className="fs-14 text-dark">{v}</span>,
        },
        {
            title: "Invoice#",
            dataIndex: "invoiceNumber",
            key: "invoiceNumber",
            sorter: (a: Invoice, b: Invoice) => a.invoiceNumber.localeCompare(b.invoiceNumber),
            render: (_: any, record: Invoice) => (
                <span className="fw-medium text-dark fs-14">
                    {record.invoiceNumber}
                </span>
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
            sorter: (a: Invoice, b: Invoice) => a.customerName.localeCompare(b.customerName),
            render: (v: string) => <span className="fs-14 text-dark">{v}</span>,
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
            sorter: (a: Invoice, b: Invoice) => a.amount - b.amount,
            render: (v: number) => <span className="fs-14 text-dark">{fmt(v)}</span>,
        },
        {
            title: "Action",
            key: "action",
            render: (_: any, record: Invoice) => (
                <div className="dropdown table-action">
                    <Link
                        to="#"
                        className="action-icon"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                        data-bs-boundary="viewport"
                        data-bs-popper="static"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, border: "1px solid #dee2e6", background: "#fff" }}
                    >
                        <i className="ti ti-dots-vertical" style={{ fontSize: 16, color: "#6c757d" }} />
                    </Link>
                    <div className="dropdown-menu dropdown-menu-end shadow-sm border" style={{ zIndex: 10000 }}>
                        <Link className="dropdown-item py-2 d-flex align-items-center gap-2" to="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); /* navigate disabled */ }}>
                            <i className="ti ti-eye text-danger fs-16" /> <span className="text-danger fw-medium">View</span>
                        </Link>
                        <Link className="dropdown-item py-2 d-flex align-items-center gap-2" to="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); /* navigate disabled */ }}>
                            <i className="ti ti-edit text-primary fs-16" /> <span className="text-primary fw-medium">Edit</span>
                        </Link>
                        <Link className="dropdown-item py-2 d-flex align-items-center gap-2" to="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(record); }}>
                            <i className="ti ti-trash text-danger fs-16" /> <span className="text-danger fw-medium">Delete</span>
                        </Link>
                    </div>
                </div>
            ),
        },
    ];

    const visibleColumns = columns.filter((c) => {
        if (c.title === "Invoice#" || c.title === "Action") return true;
        return visibleCols[c.title] !== false;
    });

    const viewOptions = [
        "All Invoices", "Draft Invoices", "Overdue Invoices", "Paid Invoices",
        "Sent Invoices", "Void Invoices",
    ];

    const titleDropdown = (
        <div className="d-flex flex-column py-1">
            {/* Title & View Switcher Section (Top) */}
            <div className="dropdown">
                <h4 className="mb-0 d-flex align-items-center gap-2 cursor-pointer fw-bold"
                    style={{ fontSize: "24px", color: "#1a1a1a", letterSpacing: "-0.5px" }}
                    data-bs-toggle="dropdown">
                    {selectedView}
                    <i className="ti ti-chevron-down fs-18" style={{ color: "#e41f07" }} />
                    <span style={{
                        fontSize: 13,
                        width: 20,
                        height: 24,
                        borderRadius: 6,
                        background: '#fff1f0',
                        color: '#e41f07',
                        fontWeight: 500,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #ffccc7',
                        borderBottom: '2px solid #ffa39e',
                        marginLeft: 8,
                        lineHeight: 1
                    }}>{tableData.length}</span>
                </h4>
                <div className="dropdown-menu dropdown-menu-start shadow-lg border-0 py-2 mt-2" style={{ minWidth: 220, borderRadius: 10 }}>
                    {viewOptions.map((v) => (
                        <button key={v} className={`dropdown-item py-2 px-3 d-flex align-items-center justify-content-between ${selectedView === v ? "active" : ""}`}
                            onClick={() => setSelectedView(v)} style={{ fontSize: 14 }}>
                            {v}
                            {selectedView === v && <i className="ti ti-check text-primary" />}
                        </button>
                    ))}
                </div>
            </div>

        </div>
    );

    return (
        <div className="page-wrapper" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <div className="content pb-5 flex-grow-1 d-flex flex-column">
                {/* ── Page Header ── */}
                <PageHeader
                    title="Invoices"
                    titleDropdown={titleDropdown}
                    showModuleTile={false}
                    moduleLink={route.billingInvoiceList}
                    exportComponent={
                        <div className="dropdown">
                            <Link to="#" className="dropdown-toggle btn btn-outline-light px-3 shadow-sm bg-white d-flex align-items-center gap-2"
                                style={{ height: 38, borderRadius: 4, border: "1px solid #dee2e6", fontSize: 13, fontWeight: 500, color: "#475569" }}
                                data-bs-toggle="dropdown">
                                <i className="ti ti-package-export fs-18" style={{ color: "#64748b" }} />Export
                            </Link>
                            <div className="dropdown-menu dropdown-menu-end shadow-lg border-0 py-2 mt-2" style={{ minWidth: 200, borderRadius: 8 }}>
                                <Link to="#" className="dropdown-item py-2 px-3 d-flex align-items-center gap-2" onClick={(e) => { e.preventDefault(); handleExportPDF(); }}>
                                    <i className="ti ti-file-type-pdf fs-18" style={{ color: "#e41f07" }} />
                                    <span style={{ fontSize: 13 }}>Export as PDF</span>
                                </Link>
                                <Link to="#" className="dropdown-item py-2 px-3 d-flex align-items-center gap-2" onClick={(e) => { e.preventDefault(); handleExportCSV(); }}>
                                    <i className="ti ti-file-type-xls fs-18" style={{ color: "#1d6f42" }} />
                                    <span style={{ fontSize: 13 }}>Export as Excel</span>
                                </Link>
                            </div>
                        </div>
                    }
                    onRefresh={() => {
                        setSearchText("");
                        setFilterStatus([]);
                        setSortBy("newest");
                        setSelectedView("All Invoices");
                        setInvoices(loadInvoices());
                    }}
                    settingsLink={route.billingInvoiceSetting}
                />

                {/* ── Table Card ── */}
                <div className="card border-0 rounded-0 flex-grow-1 mb-4 d-flex flex-column">


                    {/* ── Card Header: Search ── */}
                    <div className="card-header d-flex align-items-center justify-content-between gap-2 flex-wrap" style={{ borderBottom: "1px solid #f0f2f4" }}>
                        <div className="d-flex align-items-center rounded bg-white" style={{ width: 240, border: searchFocused ? "1px solid #e41f07" : "1px solid #dee2e6" }}>
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
                            className="btn text-white d-flex align-items-center"
                            style={{ background: "#e41f07", border: "1px solid #e41f07", borderRadius: 3, height: 36, padding: "0 16px", fontWeight: 600, fontSize: 13 }}
                            onClick={openAdd}
                        >
                            <i className="ti ti-plus me-2" style={{ fontSize: 18 }} /> Add New Invoice
                        </button>
                    </div>

                    {/* ── Toolbar ── */}
                    <div className="card-body p-0 d-flex flex-column" style={{ minHeight: 0 }}>
                        <style>{`
                            /* Dropdown Item Hover & Active States */
                            .dropdown-menu .dropdown-item:hover,
                            .dropdown-menu .dropdown-item.active {
                                background-color: #fff1f0 !important;
                                color: #e41f07 !important;
                            }
                            .dropdown-menu .dropdown-item:hover i,
                            .dropdown-menu .dropdown-item.active i {
                                color: #e41f07 !important;
                            }

                            .toolbar-btn-custom {
                                height: 38px;
                                border-radius: 3px !important;
                                border: 1px solid #dee2e6 !important;
                                font-size: 13px;
                                font-weight: 500;
                                color: #1a1a1a !important;
                                background: #ffffff !important;
                                transition: all 0.2s ease;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.05) !important;
                            }
                            .toolbar-btn-custom:hover, 
                            .dropdown-toggle.btn-outline-light:hover {
                                border-color: #dee2e6 !important;
                                color: #e41f07 !important;
                                background: #fff1f0 !important;
                            }
                            
                            /* Clicked / Active / Dropdown Open States (Template Red) */
                            .toolbar-btn-custom:active,
                            .toolbar-btn-custom.active,
                            .dropdown-toggle.btn-outline-light.show,
                            .dropdown-toggle.btn-outline-light:active {
                                border-color: #e41f07 !important;
                                color: #ffffff !important;
                                background: #e41f07 !important;
                            }

                            .toolbar-btn-custom i, .dropdown-toggle.btn-outline-light i {
                                transition: all 0.2s ease;
                            }

                            /* Specific styling for Manage Columns to match template */
                            .btn-manage-columns {
                                background: #f0f4ff !important;
                                color: #3d5afe !important;
                                border: 1px solid #dbe4ff !important;
                                height: 38px;
                                border-radius: 4px !important;
                                font-size: 13px;
                                font-weight: 500;
                                transition: all 0.2s ease;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                padding: 0 12px;
                            }
                            .btn-manage-columns:hover {
                                background: #e0e7ff !important;
                                border-color: #c7d2fe !important;
                                color: #312e81 !important;
                            }
                            .btn-manage-columns.show, .btn-manage-columns:active {
                                border-color: #3d5afe !important;
                                color: #ffffff !important;
                                background: #3d5afe !important;
                            }
                            .btn-manage-columns i {
                                color: inherit !important;
                            }
                            
                            .toolbar-btn-custom:hover i, .dropdown-toggle.btn-outline-light:hover i {
                                color: #e41f07 !important;
                            }

                            .toolbar-btn-custom:active i,
                            .toolbar-btn-custom.active i,
                            .dropdown-toggle.btn-outline-light.show i,
                            .dropdown-toggle.btn-outline-light:active i {
                                color: #ffffff !important;
                            }
                            /* Fix for table action dropdown clipping */
                            .custom-table .dropdown-menu {
                                z-index: 10000 !important;
                                position: fixed !important;
                            }
                            .custom-table .dropdown-menu.show {
                                display: block !important;
                            }
                            /* Fix for table action dropdown clipping */
                            .custom-table .dropdown-menu {
                                z-index: 10000 !important;
                                position: fixed !important;
                            }
                            .custom-table .dropdown-menu.show {
                                display: block !important;
                            }
                            /* Remove extra table lines except header dividers */
                            .custom-table .ant-table-tbody > tr > td {
                                border-inline-end: none !important;
                            }
                            .custom-table .ant-table-thead > tr > th {
                                border-inline-end: none !important;
                                background: #ffffff !important;
                                color: #00204a !important;
                                font-weight: 600 !important;
                                font-size: 14px !important;
                                border-bottom: 1px solid #f0f0f0 !important;
                            }
                            .custom-table .ant-table-thead > tr > th:last-child {
                                border-inline-end: none !important;
                            }
                            .custom-table .ant-table {
                                border: none !important;
                            }
                            /* Allow dropdown to show outside the table */
                            .custom-table .ant-table-cell {
                                overflow: visible !important;
                            }
                            /* Hide table sorting icons for a cleaner look */
                            .ant-table-column-sorter {
                                display: none !important;
                            }
                            /* High-fidelity Pagination styling */
                            .custom-table .ant-pagination {
                                display: flex !important;
                                align-items: center !important;
                                justify-content: space-between !important;
                                width: 100% !important;
                                padding: 20px 0 !important;
                            }
                            /* Active Page Button - VIBRANT RED */
                            .custom-table li.ant-pagination-item.ant-pagination-item-active {
                                background-color: #e41f07 !important;
                                border-color: #e41f07 !important;
                            }
                            .custom-table li.ant-pagination-item.ant-pagination-item-active a {
                                color: #fff !important;
                                font-weight: bold !important;
                            }
                            /* All Buttons - WHITE with BORDER */
                            .custom-table .ant-pagination-item, 
                            .custom-table .ant-pagination-prev, 
                            .custom-table .ant-pagination-next {
                                border-radius: 4px !important;
                                display: inline-flex !important;
                                align-items: center !important;
                                justify-content: center !important;
                                border: 1px solid #dee2e6 !important;
                                background: #fff !important;
                                box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
                                min-width: 38px !important;
                                width: 38px !important;
                                height: 38px !important;
                                line-height: 1 !important;
                                margin: 0 3px !important;
                            }
                            .custom-table .ant-pagination-total-text {
                                order: -1;
                                font-size: 14px;
                                color: #333;
                                font-weight: 400;
                            }
                             .custom-table .ant-table-wrapper,
                             .custom-table .ant-table,
                             .custom-table .ant-table-container,
                             .custom-table .ant-table-content,
                             .custom-table .ant-table-body,
                             .custom-table .ant-table-thead,
                             .custom-table .ant-table-tbody,
                             .custom-table .ant-table-cell {
                                 overflow: visible !important;
                             }
                         `}</style>
                        <div className="toolbar-custom py-2 px-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
                            {/* Left Group: Sort & Date */}
                            <div className="d-flex align-items-center gap-2">
                                <div className="dropdown">
                                    <button className="btn btn-sm toolbar-btn-custom" data-bs-toggle="dropdown">
                                        <i className="ti ti-sort-ascending-2 fs-15" /> Sort By
                                    </button>
                                    <div className="dropdown-menu shadow-sm border-0 mt-1">
                                        <button className={`dropdown-item py-2 ${sortBy === "newest" ? "active" : ""}`} onClick={() => setSortBy("newest")}>Newest</button>
                                        <button className={`dropdown-item py-2 ${sortBy === "oldest" ? "active" : ""}`} onClick={() => setSortBy("oldest")}>Oldest</button>
                                    </div>
                                </div>
                                <PredefinedDatePicker />
                            </div>

                            {/* Right Group: Filter, Manage Columns, View Toggles */}
                            <div className="d-flex align-items-center gap-2">
                                <div style={{ position: "relative" }}>
                                    <button
                                        className={`btn btn-sm toolbar-btn-custom ${showFilter ? "active" : ""}`}
                                        style={{
                                            background: showFilter ? "#1a1a1a !important" : "#ffffff !important",
                                            color: showFilter ? "#ffffff !important" : "#475569 !important",
                                            borderColor: showFilter ? "#1a1a1a !important" : "#dee2e6 !important"
                                        }}
                                        onClick={() => setShowFilter(!showFilter)}
                                    >
                                        <i className="ti ti-filter fs-15" style={{ color: showFilter ? "#ffffff" : "inherit" }} /> Filter
                                        {filterStatus.length > 0 && <span className="badge bg-primary ms-1">{filterStatus.length}</span>}
                                    </button>
                                    {showFilter && (
                                        <div className="filter-dropdown-menu dropdown-menu show shadow-lg border-0 p-0 mt-2" style={{ position: "absolute", right: 0, top: "100%", minWidth: 260, zIndex: 1060, borderRadius: 12, overflow: "hidden" }}>
                                            <div className="filter-header d-flex align-items-center justify-content-between p-3 border-bottom bg-white">
                                                <div className="d-flex align-items-center gap-2 text-dark">
                                                    <i className="ti ti-filter fs-18" />
                                                    <h6 className="fs-16 fw-bold mb-0">Filter</h6>
                                                </div>
                                                <button type="button" className="btn btn-light rounded-circle p-0 d-flex align-items-center justify-content-center"
                                                    style={{ width: 28, height: 28, background: "#fff1f0", border: "none" }}
                                                    onClick={() => setShowFilter(false)}>
                                                    <i className="ti ti-x fs-14" style={{ color: "#e41f07" }} />
                                                </button>
                                            </div>
                                            <div className="filter-body p-3">
                                                <div className="filter-section mb-3">
                                                    <div className="d-flex align-items-center justify-content-between cursor-pointer mb-2" onClick={() => setStatusFilterOpen(!statusFilterOpen)}>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <i className={`ti ti-chevron-${statusFilterOpen ? "down" : "right"} fs-14`} />
                                                            <span className="fs-15 fw-bold text-dark">Status</span>
                                                        </div>
                                                    </div>
                                                    {statusFilterOpen && (
                                                        <div className="ps-4 mt-2">
                                                            {ALL_STATUSES.map((status) => (
                                                                <div className="form-check mb-2" key={status}>
                                                                    <input
                                                                        className="form-check-input shadow-none border-secondary"
                                                                        type="checkbox"
                                                                        id={`filter-inv-${status}`}
                                                                        checked={pendingFilter.includes(status)}
                                                                        style={{ width: 18, height: 18, cursor: "pointer", borderRadius: 4 }}
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) setPendingFilter([...pendingFilter, status]);
                                                                            else setPendingFilter(pendingFilter.filter((s) => s !== status));
                                                                        }}
                                                                    />
                                                                    <label className="form-check-label fs-14 cursor-pointer text-dark fw-medium ms-2" htmlFor={`filter-inv-${status}`}>
                                                                        {status}
                                                                    </label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="d-flex align-items-center gap-2 pt-3 border-top mt-3">
                                                    <button className="btn btn-light flex-grow-1 fs-14 fw-bold shadow-none"
                                                        style={{ borderRadius: 8, height: 42, background: "#f8f9fa", color: "#1a1a1a", border: "1px solid #f1f5f9" }}
                                                        onClick={handleResetFilter}>Reset</button>
                                                    <button className="btn btn-danger flex-grow-1 fs-14 fw-bold shadow-none"
                                                        style={{ borderRadius: 8, height: 42, background: "#e41f07", border: "none" }}
                                                        onClick={handleApplyFilter}>Filter</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="dropdown">
                                    <button className="btn btn-sm btn-manage-columns" data-bs-toggle="dropdown" data-bs-auto-close="outside">
                                        <i className="ti ti-layout-column fs-16" /> Manage Columns
                                    </button>
                                    <div className="dropdown-menu dropdown-md p-3 shadow-lg border-0 mt-2" style={{ borderRadius: 8 }}>
                                        <h6 className="fs-14 fw-bold mb-3">Visible Columns</h6>
                                        <ul className="list-unstyled mb-0">
                                            {ALL_COLS.map((col) => (
                                                <li className="d-flex align-items-center justify-content-between mb-2" key={col}>
                                                    <span className="fs-13 text-dark">{col}</span>
                                                    <div className="form-check form-switch ps-0">
                                                        <input
                                                            className="form-check-input switchCheckDefault ms-auto"
                                                            type="checkbox"
                                                            role="switch"
                                                            checked={visibleCols[col] !== false}
                                                            style={{ cursor: "pointer", backgroundColor: visibleCols[col] !== false ? "#26a69a" : "", borderColor: visibleCols[col] !== false ? "#26a69a" : "" }}
                                                            onChange={() => setVisibleCols((prev) => ({ ...prev, [col]: !prev[col] }))}
                                                        />
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* View Toggle */}
                                <div className="d-flex align-items-center bg-white border rounded" style={{ padding: "2px", borderColor: "#dee2e6" }}>
                                    <button
                                        onClick={() => setViewMode("list")}
                                        className={`btn btn-sm d-flex align-items-center justify-content-center border-0 p-0 ${viewMode === "list" ? "shadow-sm" : ""}`}
                                        style={{ width: 32, height: 28, borderRadius: 4, background: viewMode === "list" ? "#26a69a" : "transparent", color: viewMode === "list" ? "#ffffff" : "#64748b" }}
                                    >
                                        <i className="ti ti-list" style={{ fontSize: 18 }} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode("grid")}
                                        className={`btn btn-sm d-flex align-items-center justify-content-center border-0 p-0 ${viewMode === "grid" ? "shadow-sm" : ""}`}
                                        style={{ width: 32, height: 28, borderRadius: 4, background: viewMode === "grid" ? "#26a69a" : "transparent", color: viewMode === "grid" ? "#ffffff" : "#64748b" }}
                                    >
                                        <i className="ti ti-layout-grid" style={{ fontSize: 18 }} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── Table / Grid ── */}
                        <div className="flex-grow-1 overflow-auto" style={{ minWidth: 0 }}>
                            {viewMode === "list" ? (
                                <div className="custom-table table-nowrap px-4 flex-grow-1 border-0">
                                    <Datatable
                                        columns={visibleColumns}
                                        dataSource={tableData}
                                        Selection={true}
                                        searchText=""
                                        onRow={(record) => ({
                                            onClick: (e) => { e.stopPropagation(); /* navigate disabled */ },
                                            style: { cursor: "default" },
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
                                                    <div className="card border shadow-sm h-100" style={{ borderRadius: 12, border: "1px solid #e5e7eb" }}>
                                                        <div className="card-body p-4">
                                                            <div className="d-flex align-items-center justify-content-between mb-3">
                                                                <div>
                                                                    <div className="fw-bold fs-16 mb-1 text-dark">
                                                                        {inv.invoiceNumber}
                                                                    </div>
                                                                    <div className="fs-14 text-muted">{inv.date}</div>
                                                                </div>
                                                                <div className="dropdown table-action">
                                                                    <button className="btn btn-icon btn-sm btn-outline-light d-flex align-items-center justify-content-center"
                                                                        style={{ width: 32, height: 32, border: "1px solid #f1f5f9", background: "#fff", borderRadius: 6 }}
                                                                        data-bs-toggle="dropdown">
                                                                        <i className="ti ti-dots-vertical text-muted fs-16" />
                                                                    </button>
                                                                    <div className="dropdown-menu dropdown-menu-right shadow-sm border-0 mt-2">
                                                                        <button className="dropdown-item py-2" onClick={() => { /* navigate disabled */ }}>
                                                                            <i className="ti ti-eye text-blue me-2" /> View
                                                                        </button>
                                                                        <button className="dropdown-item py-2" onClick={() => { /* navigate disabled */ }}>
                                                                            <i className="ti ti-edit text-blue me-2" /> Edit
                                                                        </button>
                                                                        <button className="dropdown-item py-2 text-danger" onClick={(e) => { e.stopPropagation(); handleDelete(inv); }}>
                                                                            <i className="ti ti-trash me-2" /> Delete
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="border-top mb-3 pt-3">
                                                                <p className="fs-15 text-dark mb-3 d-flex align-items-center gap-2">
                                                                    <i className="ti ti-user-circle fs-18 text-muted" /> {inv.customerName}
                                                                </p>
                                                                <div className="mb-2">
                                                                    <span style={{
                                                                        background: "#fff9eb",
                                                                        color: "#ffa000",
                                                                        borderRadius: 4,
                                                                        padding: "4px 12px",
                                                                        fontWeight: 600,
                                                                        fontSize: 11,
                                                                        letterSpacing: "0.5px"
                                                                    }}>
                                                                        {inv.status.toUpperCase()}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="d-flex justify-content-between align-items-center border-top pt-3 mt-3">
                                                                <div>
                                                                    <span className="fs-12 text-muted text-uppercase d-block mb-1" style={{ letterSpacing: "0.5px" }}>Due Date</span>
                                                                    <span className="fs-14 fw-bold text-dark">{inv.dueDate}</span>
                                                                </div>
                                                                <div className="text-end">
                                                                    <span className="fs-12 text-muted text-uppercase d-block mb-1" style={{ letterSpacing: "0.5px" }}>Amount</span>
                                                                    <span className="fs-16 fw-black text-dark">{fmt(inv.amount)}</span>
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
