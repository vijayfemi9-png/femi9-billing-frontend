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

// ── Customer Modal ────────────────────────────────────────────────────────────
const CustomerModal: React.FC<{
    title: string;
    form: FormState;
    onChange: (f: FormState) => void;
    onSave: () => void;
    onClose: () => void;
}> = ({ title, form, onChange, onSave, onClose }) => (
    <div
        style={{
            position: "fixed", inset: 0, zIndex: 2000,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
        <div
            className="bg-white shadow-lg"
            style={{ borderRadius: 12, width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "auto" }}
        >
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between px-4 pt-4 pb-3 border-bottom">
                <h5 className="mb-0 fw-bold fs-18">{title}</h5>
                <button className="btn-close" onClick={onClose} />
            </div>

            {/* Footer */}
            <div className="d-flex justify-content-end gap-2 px-4 pb-4">
                <button className="btn btn-light fs-14 px-4" onClick={onClose}>Cancel</button>
                <button
                    className="btn btn-primary fs-14 px-4"
                    onClick={onSave}
                    disabled={!form.name.trim() || !form.email.trim()}
                >
                    Save
                </button>
            </div>
        </div>
    </div>
);

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
    const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
    const [selectedView, setSelectedView] = useState("Active Customers");
    const [filterStatus, setFilterStatus] = useState<string[]>([]);
    const [pendingFilter, setPendingFilter] = useState<string[]>([]);
    const [showFilter, setShowFilter] = useState(false);
    const [statusFilterOpen, setStatusFilterOpen] = useState(false);
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(
        Object.fromEntries(ALL_COLS.map((c) => [c, true]))
    );
    const [del, setDel] = useState<{ name: string; onConfirm: () => void } | null>(null);
    const [modal, setModal] = useState<{
        mode: "add" | "edit";
        id?: number;
        form: FormState;
    } | null>(null);


    const openAdd = () => {
        navigate(route.customerAdd);
    };

    const openEdit = (c: Customer) => {
        setModal({
            mode: "edit",
            id: c.id,
            form: {
                name: c.name, companyName: c.companyName, email: c.email,
                workPhone: c.workPhone, receivables: c.receivables,
                unusedCredits: c.unusedCredits, status: c.status,
            },
        });
    };

    const handleSave = () => {
        if (!modal) return;
        if (modal.mode === "add") {
            const raw = getAllRaw();
            const newC: Customer = { id: nextId(raw.length ? raw : customers), ...modal.form };
            const all = [...raw, newC];
            saveAll(all);
            setCustomers(all.filter((c) => !c.isDeleted));
        } else {
            const raw = getAllRaw();
            const updated = raw.map((c) => (c.id === modal.id ? { ...c, ...modal.form } : c));
            saveAll(updated);
            const active = updated.filter((c) => !c.isDeleted);
            setCustomers(active);
        }
        setModal(null);
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
                    className="border-0 bg-transparent p-0 fs-14 fw-bold text-start"
                    style={{ color: "#333", cursor: "pointer" }}
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
                    <span
                        className="fs-13 fw-semibold px-2 py-1 rounded-pill"
                        style={{
                            background: "#ede9fe", color: "#5b21b6",
                            border: "1px solid #c4b5fd", display: "inline-block",
                            whiteSpace: "nowrap",
                        }}
                    >
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
                <div className="dropup table-action">
                    <Link
                        to="#"
                        data-bs-toggle="dropdown"
                        className="btn-action d-inline-flex align-items-center justify-content-center"
                        style={{ width: 32, height: 32 }}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                    >
                        <i className="ti ti-dots-vertical fs-16" />
                    </Link>
                    <div className="dropdown-menu dropdown-menu-right shadow border-0" onClick={(e) => e.stopPropagation()}>
                        <Link
                            className="dropdown-item py-2 px-3 d-flex align-items-center gap-2"
                            to="#"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openEdit(record);
                            }}
                        >
                            <i className="ti ti-edit text-primary fs-15" /> Edit
                        </Link>
                        <Link
                            className="dropdown-item py-2 px-3 d-flex align-items-center gap-2 text-danger"
                            to="#"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(record);
                            }}
                        >
                            <i className="ti ti-trash fs-15" /> Delete
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

                <div className="card border-0 rounded-0 flex-grow-1 mb-0 d-flex flex-column">
                            <div className="card-header d-flex align-items-center justify-content-between gap-2 flex-wrap" style={{ borderBottom: "1px solid #f0f2f4" }}>
                                <div className="input-icon input-icon-start position-relative" style={{ width: 220 }}>
                                    <span className="input-icon-addon text-dark">
                                        <i className="ti ti-search" />
                                    </span>
                                    <SearchInput value={searchText} onChange={setSearchText} />
                                </div>
                                <button className="btn btn-primary" onClick={openAdd}>
                                    <i className="ti ti-square-rounded-plus-filled me-1" /> Add New Customer
                                </button>
                            </div>

                            <div className="card-body p-0 d-flex flex-column" style={{ minHeight: 0 }}>
                                <div className="toolbar-custom py-3 px-4">
                                    <div className="d-flex align-items-center gap-2 flex-wrap">
                                        <div className="dropdown">
                                            <Link to="#" className="dropdown-toggle btn-secondary-white px-3 fs-14" data-bs-toggle="dropdown">
                                                <i className="ti ti-sort-ascending-2 me-2" />Sort By
                                            </Link>
                                            <div className="dropdown-menu shadow">
                                                <ul>
                                                    <li><Link to="#" className={`dropdown-item fs-14 ${sortBy === "newest" ? "active" : ""}`} onClick={() => setSortBy("newest")}>Newest</Link></li>
                                                    <li><Link to="#" className={`dropdown-item fs-14 ${sortBy === "oldest" ? "active" : ""}`} onClick={() => setSortBy("oldest")}>Oldest</Link></li>
                                                </ul>
                                            </div>
                                        </div>
                                        <PredefinedDatePicker />
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                        <div style={{ position: "relative" }}>
                                            <button
                                                className={`btn btn-outline-light shadow px-2 ${filterStatus.length > 0 ? 'border-primary text-primary' : ''}`}
                                                style={{ height: 36, fontSize: 14 }}
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
                                                                        <h6 className="fs-14 mb-0">
                                                                            <span className="fw-bold cursor-pointer text-dark" onClick={() => navigate(route.customerView.replace(":id", String(c.id)))}>
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
                                                                        <i className="ti ti-dots-vertical" />
                                                                    </button>
                                                                    <div className="dropdown-menu dropdown-menu-right">
                                                                        <button className="dropdown-item" onClick={() => openEdit(c)}>
                                                                            <i className="ti ti-edit text-blue me-2" /> Edit
                                                                        </button>
                                                                        <button className="dropdown-item text-danger" onClick={() => handleDelete(c)}>
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
                                                                    <p className="text-default d-inline-flex align-items-center mb-2 fs-13">
                                                                        <i className="ti ti-mail text-dark me-2 fs-15" />
                                                                        {c.email || "No Email"}
                                                                    </p>
                                                                    <p className="text-default d-inline-flex align-items-center mb-0 fs-13">
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
                <Footer />
            </div>
        </div>
    );
};

export default CustomerList;
