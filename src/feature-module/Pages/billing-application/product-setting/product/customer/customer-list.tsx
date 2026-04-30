import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./customer.scss";
import Footer from "../../../../../../components/footer/footer";
import Datatable from "../../../../../../components/dataTable";
import SearchInput from "../../../../../../components/dataTable/dataTableSearch";
import PredefinedDatePicker from "../../../../../../components/common-dateRangePicker/PredefinedDatePicker";
import PageHeader from "../../../../../../components/page-header/pageHeader";
import { all_routes } from "../../../../../../routes/all_routes";
// ── Types ─────────────────────────────────────────────────────────────────────
interface Customer {
    id: number;
    name: string;
    companyName: string;
    email: string;
    workPhone: string;
    receivables: number;
    unusedCredits: number;
    status: "Active" | "Inactive";
    isDeleted?: boolean;
}

type FormState = Omit<Customer, "id" | "isDeleted">;

// ── Seed Data ─────────────────────────────────────────────────────────────────
const SEED: Customer[] = [
    {
        id: 1,
        name: "femi9",
        companyName: "femi9",
        email: "vijay48357@gmail.com",
        workPhone: "+91-6381816658",
        receivables: 0,
        unusedCredits: 0,
        status: "Active",
    },
];

const SK = "billing_customers";
const EMPTY: FormState = {
    name: "", companyName: "", email: "", workPhone: "",
    receivables: 0, unusedCredits: 0, status: "Active",
};

const ALL_COLS = [
    "Company Name", "Email", "Work Phone", "Receivables (BCY)", "Unused Credits (BCY)", "Status",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadCustomers(): Customer[] {
    try {
        const s = localStorage.getItem(SK);
        if (s) {
            const p = JSON.parse(s) as Customer[];
            if (Array.isArray(p) && p.length) return p.filter((c) => !c.isDeleted);
        }
    } catch { /**/ }
    try { localStorage.setItem(SK, JSON.stringify(SEED)); } catch { /**/ }
    return SEED;
}

function saveAll(data: Customer[]) {
    try { localStorage.setItem(SK, JSON.stringify(data)); } catch { /**/ }
}

function getAllRaw(): Customer[] {
    try { return JSON.parse(localStorage.getItem(SK) || "[]") as Customer[]; } catch { return []; }
}

const nextId = (arr: { id: number }[]) =>
    arr.length ? Math.max(...arr.map((a) => a.id)) + 1 : 1;

const fmt = (n: number) =>
    "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2 });


// ── Delete Confirm ────────────────────────────────────────────────────────────
const DeleteConfirm: React.FC<{
    name: string;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ name, onConfirm, onCancel }) => (
    <div
        style={{
            position: "fixed", inset: 0, zIndex: 2100,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
        <div
            className="bg-white shadow-lg text-center"
            style={{ borderRadius: 12, width: "100%", maxWidth: 380, padding: "32px 28px" }}
        >
            <div
                className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
                style={{ width: 60, height: 60, background: "#fff0ef" }}
            >
                <i className="ti ti-trash text-danger" style={{ fontSize: 26 }} />
            </div>
            <h6 className="fw-bold fs-16 mb-1">Delete Customer?</h6>
            <p className="text-muted fs-14 mb-4">
                "<strong>{name}</strong>" will be permanently removed.
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
const CustomerList: React.FC = () => {
    const route = all_routes;
    const navigate = useNavigate();
    const [customers, setCustomers] = useState<Customer[]>(() => loadCustomers());
    const [searchText, setSearchText] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
    const [selectedView, setSelectedView] = useState(" Customers");
    const [filterStatus, setFilterStatus] = useState<string[]>([]);
    const [pendingFilter, setPendingFilter] = useState<string[]>([]);
    const [showFilter, setShowFilter] = useState(false);
    const [statusFilterOpen, setStatusFilterOpen] = useState(false);
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(
        Object.fromEntries(ALL_COLS.map((c) => [c, true]))
    );
    const [del, setDel] = useState<{ name: string; onConfirm: () => void } | null>(null);


    const openAdd = () => {
        navigate(route.customerAdd);
    };

    const openEdit = (c: Customer) => {
        navigate(all_routes.customerEdit.replace(":id", String(c.id)));
    };


    const handleDelete = (c: Customer) => {
        setDel({
            name: c.name,
            onConfirm: () => {
                const raw = getAllRaw();
                const updated = raw.map((x) => (x.id === c.id ? { ...x, isDeleted: true } : x));
                saveAll(updated);
                setCustomers(updated.filter((x) => !x.isDeleted));
                setDel(null);
            },
        });
    };

    const handleApplyFilter = () => {
        setFilterStatus(pendingFilter);
        setShowFilter(false);
    };

    const handleResetFilter = () => {
        setPendingFilter([]);
        setFilterStatus([]);
        setShowFilter(false);
    };

    const handleExportCSV = () => {
        const headers = ["Name", "Company Name", "Email", "Work Phone", "Receivables", "Unused Credits", "Status"];
        const rows = tableData.map(r => [
            r.name, r.companyName, r.email, r.workPhone, r.receivables, r.unusedCredits, r.status
        ]);
        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
            .join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "customers.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportPDF = () => {
        const rows = tableData.map(r =>
            `<tr><td>${r.name}</td><td>${r.companyName}</td><td>${r.email}</td><td>${r.workPhone}</td><td>${r.receivables}</td><td>${r.status}</td></tr>`
        ).join("");
        const html = `<html><head><title>Customers</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5;font-weight:600}h2{margin-bottom:16px}</style></head><body><h2>Customers</h2><table><thead><tr><th>Name</th><th>Company</th><th>Email</th><th>Phone</th><th>Receivables</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
        const win = window.open("", "_blank");
        if (win) { win.document.write(html); win.document.close(); win.print(); }
    };

    const tableData = React.useMemo(() => {
        let d = [...customers];
        if (filterStatus.length) d = d.filter((c) => filterStatus.includes(c.status));
        d.sort((a, b) => (sortBy === "oldest" ? a.id - b.id : b.id - a.id));
        return d;
    }, [customers, filterStatus, sortBy]);

    const columns = [
        {
            title: "Name",
            dataIndex: "name",
            key: "name",
            sorter: (a: Customer, b: Customer) => a.name.localeCompare(b.name),
            render: (_: any, record: Customer) => (
                <button
                    className="border-0 bg-transparent p-0 text-start"
                    style={{ color: "#333", cursor: "pointer", fontSize: "15px" }}
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(route.customerView.replace(":id", String(record.id)));
                    }}
                >
                    {record.name}
                </button>
            ),
        },
        {
            title: "Company Name",
            dataIndex: "companyName",
            key: "companyName",
            sorter: (a: Customer, b: Customer) => a.companyName.localeCompare(b.companyName),
            render: (v: string) =>
                v ? (
                    <span className="fs-14 text-dark">
                        {v}
                    </span>
                ) : (
                    <span className="fs-14 text-muted">—</span>
                ),
        },
        {
            title: "Email",
            dataIndex: "email",
            key: "email",
            sorter: (a: Customer, b: Customer) => a.email.localeCompare(b.email),
            render: (v: string) => (
                <span className="d-flex align-items-center gap-2 fs-14 text-dark">
                    <i className="ti ti-mail fs-15 text-muted flex-shrink-0" />
                    <span style={{ whiteSpace: "nowrap" }}>{v || "—"}</span>
                </span>
            ),
        },
        {
            title: "Work Phone",
            dataIndex: "workPhone",
            key: "workPhone",
            render: (v: string) => (
                <span className="d-flex align-items-center gap-2 fs-14 text-dark">
                    <i className="ti ti-phone fs-15 text-muted flex-shrink-0" />
                    <span style={{ whiteSpace: "nowrap" }}>{v || "—"}</span>
                </span>
            ),
        },
        {
            title: "Receivables (BCY)",
            dataIndex: "receivables",
            key: "receivables",
            sorter: (a: Customer, b: Customer) => a.receivables - b.receivables,
            render: (v: number) => <span className="fs-14 text-dark">{fmt(v)}</span>,
        },
        {
            title: "Unused Credits (BCY)",
            dataIndex: "unusedCredits",
            key: "unusedCredits",
            sorter: (a: Customer, b: Customer) => a.unusedCredits - b.unusedCredits,
            render: (v: number) => <span className="fs-14 text-dark">{fmt(v)}</span>,
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (v: string) => (
                <span className={`badge-custom ${v === "Active" ? "active" : "inactive"}`}>
                    {v}
                </span>
            ),
        },
        {
            title: "Action",
            key: "action",
            render: (_: any, record: Customer) => (
                <div className="dropdown table-action">
                    <Link
                        to="#"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
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
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openEdit(record);
                            }}
                        >
                            <i className="ti ti-edit text-blue" /> Edit
                        </Link>
                        <Link
                            className="dropdown-item text-danger"
                            to="#"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(record);
                            }}
                        >
                            <i className="ti ti-trash" /> Delete
                        </Link>
                    </div>
                </div>
            ),
        },
    ];

    const visibleColumns = columns.filter((c) => {
        if (c.title === "Name" || c.title === "Action") return true;
        return visibleCols[c.title as string] !== false;
    });

    const viewOptions = [
        "All Customers", "Active Customers", "CRM Customers", "Duplicate Customers",
        "Inactive Customers", "Overdue Customers", "Unpaid Customers"
    ];

    const titleDropdown = (
        <div className="dropdown custom-header-dropdown">
            <div className="dropdown-toggle d-flex align-items-center gap-2 cursor-pointer" data-bs-toggle="dropdown">
                <h4 className="mb-0 fw-bold" style={{ fontSize: '18px', color: '#111' }}>{selectedView}</h4>
                <i className="ti ti-chevron-down text-primary fs-14" />
                <span className="badge badge-soft-primary ms-1">{tableData.length}</span>
            </div>
            <div className="dropdown-menu shadow-lg border-0 mt-2 py-0 overflow-hidden" style={{ minWidth: 280, borderRadius: 8 }}>
                <div className="view-list-container" style={{ maxHeight: "400px", overflowY: 'auto' }}>
                    {viewOptions.map(view => (
                        <div key={view} className={`dropdown-item px-3 py-2 d-flex align-items-center justify-content-between cursor-pointer ${selectedView === view ? 'active' : ''}`} onClick={() => setSelectedView(view)}>
                            <span className="fs-14 fw-medium text-dark">{view}</span>
                            <i className="ti ti-star text-muted fs-12 hover-text-warning" />
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

    return (
        <div className="page-wrapper" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <div className="content pb-0 flex-grow-1 d-flex flex-column">
                <PageHeader
                    title="Customers"
                    titleDropdown={titleDropdown}
                    showModuleTile={false}
                    moduleLink="/customer-list"
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
                    onRefresh={() => {
                        setSearchText("");
                        setFilterStatus([]);
                        setSortBy("newest");
                        setCustomers(loadCustomers());
                    }}
                    settingsLink={route.customerPreference}
                />

                <div className="card border-0 rounded-0 flex-grow-1 mb-4 d-flex flex-column">
                    <div className="card-header d-flex align-items-center justify-content-between gap-2 flex-wrap" style={{ borderBottom: "1px solid #f0f2f4" }}>
                        <div className="d-flex align-items-center rounded bg-white" style={{
                            width: 220,
                            border: searchFocused ? '1px solid #e41f07' : '1px solid #dee2e6',
                        }}>
                            <span className="px-2 d-flex align-items-center text-muted">
                                <i className="ti ti-search fs-14" />
                            </span>
                            <input className="form-control border-0 ps-0 fs-14 bg-transparent"
                                style={{ outline: 'none', boxShadow: 'none', height: '36px' }}
                                placeholder="Search..."
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)} />
                        </div>
                        <button className="btn text-white d-flex align-items-center" style={{ background: '#e41f07', border: 'none', borderRadius: '4px', padding: '6px 14px' }} onClick={openAdd}>
                            <i className="ti ti-plus me-2 fs-16" /> Add New Customer
                        </button>
                    </div>

                    <div className="card-body p-0 d-flex flex-column" style={{ minHeight: 0 }}>
                        <div className="toolbar-custom py-3 px-4">
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <div className="dropdown">
                                    <Link to="#" className="dropdown-toggle btn btn-outline-light px-2 shadow" data-bs-toggle="dropdown">
                                        <i className="ti ti-sort-ascending-2 me-2" />Sort By
                                    </Link>
                                    <div className="dropdown-menu">
                                        <ul>
                                            <li><Link to="#" className={`dropdown-item ${sortBy === "newest" ? "active" : ""}`} onClick={() => setSortBy("newest")}>Newest</Link></li>
                                            <li><Link to="#" className={`dropdown-item ${sortBy === "oldest" ? "active" : ""}`} onClick={() => setSortBy("oldest")}>Oldest</Link></li>
                                        </ul>
                                    </div>
                                </div>
                                <PredefinedDatePicker />
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <div style={{ position: "relative" }}>
                                    <button
                                        className={`btn btn-outline-light shadow px-2 ${filterStatus.length > 0 ? 'border-primary text-primary' : ''}`}
                                        style={{ height: 38, fontSize: 14, borderRadius: 3 }}
                                        onClick={() => setShowFilter(!showFilter)}
                                    >
                                        <i className="ti ti-filter me-2" />Filter {filterStatus.length > 0 && <span className="badge bg-primary ms-1">{filterStatus.length}</span>} <i className="ti ti-chevron-down ms-1" />
                                    </button>
                                    {showFilter && (
                                        <div className="filter-dropdown-menu dropdown-menu show shadow-lg border-0 p-0 mt-2" style={{ position: 'absolute', right: 0, top: '100%', minWidth: 220, zIndex: 1060, borderRadius: 8 }}>
                                            <div className="filter-header d-flex align-items-center justify-content-between p-2 px-3 border-bottom">
                                                <h6 className="fs-14 fw-bold mb-0 text-dark"><i className="ti ti-filter me-2" />Filter</h6>
                                                <button
                                                    type="button"
                                                    className="custom-btn-close border me-0 d-flex align-items-center justify-content-center rounded-circle"
                                                    onClick={() => setShowFilter(false)}
                                                    aria-label="Close"
                                                >
                                                    <i className="ti ti-x" />
                                                </button>
                                            </div>
                                            <div className="filter-set-view p-2 px-3">
                                                <div className="accordion" id="filterAccordion">
                                                    <div className="filter-set-content">
                                                        <div className="filter-set-content-head mb-2 mt-1">
                                                            <Link
                                                                to="#"
                                                                className={statusFilterOpen ? "text-dark fw-bold fs-14" : "collapsed text-dark fw-bold fs-14"}
                                                                onClick={(e) => { e.preventDefault(); setStatusFilterOpen(!statusFilterOpen); }}
                                                            >
                                                                Status
                                                            </Link>
                                                        </div>
                                                        {statusFilterOpen && (
                                                            <div className="filter-set-contents">
                                                                <div className="filter-content-list ps-4">
                                                                    {["Active", "Inactive"].map(status => (
                                                                        <div className="form-check mb-2" key={status}>
                                                                            <input
                                                                                className="form-check-input primary-checkbox"
                                                                                type="checkbox"
                                                                                id={`filter-${status}`}
                                                                                checked={pendingFilter.includes(status)}
                                                                                style={{ width: 20, height: 20, cursor: "pointer" }}
                                                                                onChange={(e) => {
                                                                                    if (e.target.checked) setPendingFilter([...pendingFilter, status]);
                                                                                    else setPendingFilter(pendingFilter.filter(s => s !== status));
                                                                                }}
                                                                            />
                                                                            <label className="form-check-label fs-14 cursor-pointer text-muted fw-medium ms-1" htmlFor={`filter-${status}`}>
                                                                                {status}
                                                                            </label>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
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
                                        <Link to="#" className="btn bg-soft-indigo px-2 border-0" style={{ height: 36, fontSize: 14, display: "inline-flex", alignItems: "center" }} data-bs-toggle="dropdown" data-bs-auto-close="outside">
                                            <i className="ti ti-columns-3 me-2" />Manage Columns
                                        </Link>
                                        <div className="dropdown-menu dropdown-md p-3">
                                            <ul>
                                                {ALL_COLS.map(col => (
                                                    <li className="gap-1 d-flex align-items-center mb-2" key={col}>
                                                        <i className="ti ti-columns me-1" />
                                                        <div className="form-check form-switch w-100 ps-0">
                                                            <label className="form-check-label d-flex align-items-center gap-2 w-100">
                                                                <span>{col}</span>
                                                                <input
                                                                    className="form-check-input switchCheckDefault ms-auto"
                                                                    type="checkbox"
                                                                    role="switch"
                                                                    checked={visibleCols[col] !== false}
                                                                    onChange={() => setVisibleCols(prev => ({ ...prev, [col]: !prev[col] }))}
                                                                />
                                                            </label>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                                <div className="d-flex align-items-center gap-1" style={{ border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", padding: "2px" }}>
                                    <button onClick={() => setViewMode("list")} style={{ width: 26, height: 24, border: "none", cursor: "pointer", background: viewMode === "list" ? "#1ba59e" : "transparent", color: viewMode === "list" ? "#fff" : "#6c757d", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                                        <i className="ti ti-list fs-14" />
                                    </button>
                                    <button onClick={() => setViewMode("grid")} style={{ width: 26, height: 24, border: "none", cursor: "pointer", background: viewMode === "grid" ? "#1ba59e" : "transparent", color: viewMode === "grid" ? "#fff" : "#222", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                                        <i className="ti ti-grid-dots fs-14" />
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
                                        searchText={searchText}
                                        onRow={(record) => ({
                                            onClick: () => navigate(route.customerView.replace(":id", String(record.id))),
                                            style: { cursor: "pointer" }
                                        })}
                                    />
                                </div>
                            ) : (
                                <div className="p-4"><div className="row g-3">
                                    {tableData.map(c => (
                                        <div className="col-xxl-3 col-xl-4 col-md-6" key={c.id}>
                                            <div className="card border shadow-sm h-100 hover-shadow transition-all" style={{ borderRadius: 10 }}>
                                                <div className="card-body p-3">
                                                    <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2 mb-3 border-bottom pb-3">
                                                        <div className="d-flex align-items-center">
                                                            <div className="avatar avatar-md border rounded-circle flex-shrink-0 me-2 d-flex align-items-center justify-content-center bg-soft-primary" onClick={() => navigate(route.customerView.replace(":id", String(c.id)))} style={{ cursor: "pointer", width: 42, height: 42 }}>
                                                                <span className="fs-16 fw-bold text-primary">{c.name.charAt(0).toUpperCase()}</span>
                                                            </div>
                                                            <div>
                                                                <h6 className="mb-0">
                                                                    <span className="cursor-pointer text-dark fs-14" style={{ fontSize: '14px' }} onClick={() => navigate(route.customerView.replace(":id", String(c.id)))}>
                                                                        {c.name}
                                                                    </span>
                                                                </h6>
                                                                <div className="fs-12 text-muted mt-1">
                                                                    {c.companyName || "No Company"}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="dropdown table-action">
                                                            <button className="btn btn-icon btn-sm btn-outline-light shadow-sm bg-white" data-bs-toggle="dropdown">
                                                                <i className="ti ti-dots-vertical text-muted" />
                                                            </button>
                                                            <div className="dropdown-menu dropdown-menu-right">
                                                                <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); openEdit(c); }}>
                                                                    <i className="ti ti-edit text-blue me-2" /> Edit
                                                                </button>
                                                                <button className="dropdown-item text-danger" onClick={(e) => { e.stopPropagation(); handleDelete(c); }}>
                                                                    <i className="ti ti-trash me-2" /> Delete
                                                                </button>
                                                                <button className="dropdown-item" onClick={() => navigate(route.customerView.replace(":id", String(c.id)))}>
                                                                    <i className="ti ti-eye text-blue-light me-2" /> Preview
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="d-block pt-1">
                                                        <div className="d-flex flex-column mb-3">
                                                            <p className="text-default d-inline-flex align-items-center mb-2 fs-14" style={{ fontSize: '14px' }}>
                                                                <i className="ti ti-mail text-dark me-2 fs-15" />
                                                                {c.email || "No Email"}
                                                            </p>
                                                            <p className="text-default d-inline-flex align-items-center mb-0 fs-14" style={{ fontSize: '14px' }}>
                                                                <i className="ti ti-phone text-dark me-2 fs-15" />
                                                                {c.workPhone || "No Phone"}
                                                            </p>
                                                        </div>
                                                        <div className="d-flex align-items-center">
                                                            <span className={`badge badge-tag ${c.status === "Active" ? "bg-soft-success text-success" : "bg-soft-danger text-danger"} border-0`} style={{ padding: "4px 8px" }}>
                                                                <i className="ti ti-point-filled me-1" />{c.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="d-flex justify-content-between align-items-center flex-wrap row-gap-2 border-top pt-3 mt-3">
                                                        <div>
                                                            <span className="fs-11 text-muted text-uppercase d-block mb-1">Receivables</span>
                                                            <span className="fs-14 fw-bold text-dark">{fmt(c.receivables)}</span>
                                                        </div>
                                                        <div className="text-end">
                                                            <span className="fs-11 text-muted text-uppercase d-block mb-1">Unused Credits</span>
                                                            <span className="fs-14 fw-bold text-dark">{fmt(c.unusedCredits)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div></div>
                            )}
                        </div>
                    </div>
                </div>

                {del && <DeleteConfirm name={del.name} onConfirm={del.onConfirm} onCancel={() => setDel(null)} />}
            </div>
            <Footer />
        </div>
    );
};

export default CustomerList;
