// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import "./credit.scss";
import { Link, useNavigate } from "react-router-dom";
import Datatable from "../../../../../components/dataTable";
import PageHeader from "../../../../../components/page-header/pageHeader";
import PredefinedDatePicker from "../../../../../components/common-dateRangePicker/PredefinedDatePicker";
import { all_routes } from "../../../../../routes/all_routes";
import { Dropdown } from "antd";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";

// ── Types ─────────────────────────────────────────────────────────────────────
interface CreditNote {
    id: number;
    date: string;
    location: string;
    creditNoteNumber: string;
    referenceNumber: string;
    customerName: string;
    invoiceNumber: string;
    status: "Open" | "Draft" | "Void" | "Closed";
    amount: number;
    createdBy: string;
    createdTime: string;
    lastModifiedBy: string;
    lastModifiedTime: string;
}

// ── Storage / Seed ────────────────────────────────────────────────────────────
const SK = "billing_credit_notes";

const SEED: CreditNote[] = [
    {
        id: 1,
        date: "19/05/2026",
        location: "Head Office",
        creditNoteNumber: "CN-00001",
        referenceNumber: "sdfvb",
        customerName: "Mr. vijay E",
        invoiceNumber: "",
        status: "Open",
        amount: 465.00,
        createdBy: "vickyyfemi9",
        createdTime: "19/05/2026 10:00 AM",
        lastModifiedBy: "vickyyfemi9",
        lastModifiedTime: "19/05/2026 10:00 AM",
    },
];

function loadCreditNotes(): CreditNote[] {
    try {
        const s = localStorage.getItem(SK);
        if (s) {
            const p = JSON.parse(s) as CreditNote[];
            if (Array.isArray(p) && p.length) return p;
        }
    } catch { /**/ }
    try { localStorage.setItem(SK, JSON.stringify(SEED)); } catch { /**/ }
    return SEED;
}

const STATUS_CLASS: Record<string, string> = {
    "Open": "badge-soft-danger",
    "Draft": "badge-soft-warning",
    "Void": "badge-soft-danger",
    "Closed": "badge-soft-secondary",
};

const DeleteConfirm = ({ creditNoteNumber, onConfirm, onCancel }: { creditNoteNumber: string, onConfirm: () => void, onCancel: () => void }) => (
    <>
        <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
        <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12 }}>
                    <div className="modal-body p-4 text-center">
                        <div className="mb-3">
                            <i className="ti ti-trash text-danger" style={{ fontSize: 48 }} />
                        </div>
                        <h5 className="mb-2 fw-bold text-dark">Delete Credit Note?</h5>
                        <p className="text-muted mb-4 fs-14">Are you sure you want to delete <strong>{creditNoteNumber}</strong>? This action cannot be undone.</p>
                        <div className="d-flex justify-content-center gap-2">
                            <button className="btn btn-light fw-medium shadow-none" onClick={onCancel}>Cancel</button>
                            <button className="btn btn-danger fw-bold shadow-none" onClick={onConfirm}>Yes, Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </>
);

const INITIAL_VIEWS = [
    { id: "All", label: "All" },
    { id: "Draft", label: "Draft" },
    { id: "Locked", label: "Locked" },
    { id: "Pending Approval", label: "Pending Approval" },
    { id: "Approved", label: "Approved" },
    { id: "Open", label: "Open" },
    { id: "Closed", label: "Closed" },
    { id: "Void", label: "Void" },
];

function filterByPeriod(items: CreditNote[], period: string): CreditNote[] {
    if (period === "All") return items;
    const now = new Date();
    return items.filter(item => {
        const parts = item.date.split("/");
        if (parts.length < 3) return true;
        const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        if (period === "Today") return d.toDateString() === now.toDateString();
        if (period === "This Week") {
            const ws = new Date(now); ws.setDate(now.getDate() - now.getDay());
            const we = new Date(ws); we.setDate(ws.getDate() + 6);
            return d >= ws && d <= we;
        }
        if (period === "This Month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (period === "This Quarter") return Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3) && d.getFullYear() === now.getFullYear();
        if (period === "This Year") return d.getFullYear() === now.getFullYear();
        return true;
    });
}

// ── Component ─────────────────────────────────────────────────────────────────
const CreditNoteList: React.FC = () => {
    const navigate = useNavigate();
    const route = all_routes;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [del, setDel] = useState<{ creditNoteNumber: string; onConfirm: () => void } | null>(null);
    const [views, setViews] = useState<{ id: string, label: string }[]>(INITIAL_VIEWS);
    const [newViewName, setNewViewName] = useState("");
    const [creditNotes, setCreditNotes] = useState<CreditNote[]>(() => loadCreditNotes());
    const [searchText, setSearchText] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [selectedView, setSelectedView] = useState("All");
    const [filterPeriod, setFilterPeriod] = useState("All");
    const [showFilter, setShowFilter] = useState(false);
    const [showSortBy, setShowSortBy] = useState(false);
    const [sortBy, setSortBy] = useState("date-desc");
    const [filterStatus, setFilterStatus] = useState<string[]>([]);
    const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
        "Date": true, "Location": true, "Credit Note#": true, "Reference Number": true,
        "Customer Name": true, "Invoice#": true, "Status": true, "Amount": true,
        "Created By": true, "Created Time": true, "Last Modified By": true, "Last Modified Time": true,
    });

    useEffect(() => { setCreditNotes(loadCreditNotes()); }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const t = e.target as HTMLElement;
            if (!t.closest("[data-sortby-dropdown]")) setShowSortBy(false);
            if (!t.closest("[data-filter-dropdown]")) setShowFilter(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);
    const refreshData = () => setCreditNotes(loadCreditNotes());

    const handleDeleteClick = (creditNoteNumber: string, id: number) => {
        setDel({
            creditNoteNumber,
            onConfirm: () => {
                const updated = creditNotes.filter(c => c.id !== id);
                setCreditNotes(updated);
                localStorage.setItem(SK, JSON.stringify(updated));
                setDel(null);
            }
        });
    };

    const handleSaveView = () => {
        if (newViewName.trim()) {
            const newView = { id: newViewName.trim(), label: newViewName.trim() };
            setViews([...views, newView]);
            setSelectedView(newView.id);
            setNewViewName("");
        }
    };

    // ── Filter ─────────────────────────────────────────────────────────────────
    const filteredData = (() => {
        let data = creditNotes;
        const q = searchText.toLowerCase();
        if (q) data = data.filter(c =>
            c.creditNoteNumber.toLowerCase().includes(q) ||
            c.referenceNumber.toLowerCase().includes(q) ||
            c.customerName.toLowerCase().includes(q) ||
            c.invoiceNumber.toLowerCase().includes(q) ||
            c.location.toLowerCase().includes(q) ||
            c.status.toLowerCase().includes(q)
        );
        if (selectedView !== "All") data = data.filter(c => c.status === selectedView);
        if (filterStatus.length > 0) data = data.filter(c => filterStatus.includes(c.status));
        data = filterByPeriod(data, filterPeriod);
        return [...data].sort((a, b) => {
            switch (sortBy) {
                case "date-asc": return a.date.localeCompare(b.date);
                case "date-desc": return b.date.localeCompare(a.date);
                case "cn-asc": return a.creditNoteNumber.localeCompare(b.creditNoteNumber);
                case "cn-desc": return b.creditNoteNumber.localeCompare(a.creditNoteNumber);
                case "name-asc": return a.customerName.localeCompare(b.customerName);
                case "name-desc": return b.customerName.localeCompare(a.customerName);
                case "amount-asc": return a.amount - b.amount;
                case "amount-desc": return b.amount - a.amount;
                case "status-asc": return a.status.localeCompare(b.status);
                case "status-desc": return b.status.localeCompare(a.status);
                default: return b.id - a.id;
            }
        });
    })();

    // ── Export PDF ─────────────────────────────────────────────────────────────
    const handleExportPDF = () => {
        try {
            const doc = new jsPDF({ orientation: "landscape" });
            const date = new Date().toLocaleDateString();
            doc.setFontSize(16); doc.setFont("helvetica", "bold");
            doc.text("Credit Notes", 14, 18);
            doc.setFontSize(10); doc.setFont("helvetica", "normal");
            doc.setTextColor(120); doc.text(`Generated: ${date}`, 14, 25); doc.setTextColor(0);
            const headers = ["Date", "Location", "Credit Note#", "Reference#", "Customer", "Invoice#", "Status", "Amount"];
            const colWidths = [25, 30, 28, 28, 42, 28, 22, 30];
            const startX = 14; let startY = 34; const rowH = 9;
            doc.setFillColor(37, 99, 235);
            doc.rect(startX, startY, colWidths.reduce((a, b) => a + b, 0), rowH, "F");
            doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
            let x = startX;
            headers.forEach((h, i) => { doc.text(h, x + 2, startY + 6); x += colWidths[i]; });
            doc.setFont("helvetica", "normal"); startY += rowH;
            filteredData.forEach((c, idx) => {
                if (idx % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(startX, startY, colWidths.reduce((s, b) => s + b, 0), rowH, "F"); }
                doc.setTextColor(50);
                const row = [c.date, c.location, c.creditNoteNumber, c.referenceNumber, c.customerName, c.invoiceNumber || "—", c.status, `₹${c.amount.toFixed(2)}`];
                x = startX;
                row.forEach((cell, i) => { doc.text(String(cell).substring(0, 20), x + 2, startY + 6); x += colWidths[i]; });
                startY += rowH;
                if (startY > 190) { doc.addPage(); startY = 14; }
            });
            doc.save(`CreditNotes_${date.replace(/\//g, "-")}.pdf`);
        } catch (err) { console.error("Failed to export PDF", err); }
    };

    // ── Export Excel ───────────────────────────────────────────────────────────
    const handleExportExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Credit Notes");
            worksheet.columns = [
                { header: "Date", key: "date", width: 15 },
                { header: "Location", key: "location", width: 18 },
                { header: "Credit Note#", key: "creditNoteNumber", width: 18 },
                { header: "Reference Number", key: "referenceNumber", width: 20 },
                { header: "Customer Name", key: "customerName", width: 25 },
                { header: "Invoice#", key: "invoiceNumber", width: 18 },
                { header: "Status", key: "status", width: 12 },
                { header: "Amount", key: "amount", width: 15 },
                { header: "Created By", key: "createdBy", width: 18 },
                { header: "Created Time", key: "createdTime", width: 22 },
                { header: "Last Modified By", key: "lastModifiedBy", width: 18 },
                { header: "Last Modified Time", key: "lastModifiedTime", width: 22 },
            ];
            filteredData.forEach(c => worksheet.addRow(c));
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `CreditNotes_${new Date().toLocaleDateString()}.xlsx`);
        } catch (err) { console.error("Failed to export Excel", err); }
    };

    // ── Table header helper ────────────────────────────────────────────────────
    const th = (text: string) => (
        <span style={{ fontSize: 13, fontWeight: 600, color: "#212529" }}>{text}</span>
    );

    // ── Table Columns ──────────────────────────────────────────────────────────
    const columns = [
        {
            title: th("Date"),
            dataIndex: "date", key: "Date", width: 115,
            render: (text: string) => <span style={{ fontSize: 13, fontWeight: 500, color: "#212529" }}>{text}</span>,
            sorter: (a, b) => a.date.localeCompare(b.date),
        },
        {
            title: th("Location"),
            dataIndex: "location", key: "Location", width: 130,
            render: (text: string) => <span style={{ fontSize: 13, fontWeight: 500, color: "#212529" }}>{text}</span>,
            sorter: (a, b) => a.location.localeCompare(b.location),
        },
        {
            title: th("Credit Note#"),
            dataIndex: "creditNoteNumber", key: "Credit Note#", width: 140,
            render: (text: string, record: CreditNote) => (
                <Link
                    to={route.creditNoteView?.replace(":id", String(record.id)) || "#"}
                    className="fs-13 fw-semibold"
                    style={{ textDecoration: "none", color: "#e41f07" }}
                    onClick={e => e.stopPropagation()}
                >
                    {text}
                </Link>
            ),
            sorter: (a, b) => a.creditNoteNumber.localeCompare(b.creditNoteNumber),
        },
        {
            title: th("Reference Number"),
            dataIndex: "referenceNumber", key: "Reference Number", width: 160,
            render: (text: string) => <span className="fs-13 fw-medium">{text || "—"}</span>,
            sorter: (a, b) => (a.referenceNumber || "").localeCompare(b.referenceNumber || ""),
        },
        {
            title: th("Customer Name"),
            dataIndex: "customerName", key: "Customer Name", width: 160,
            render: (text: string) => <span style={{ fontSize: 13, fontWeight: 500, color: "#212529" }}>{text}</span>,
            sorter: (a, b) => a.customerName.localeCompare(b.customerName),
        },
        {
            title: th("Invoice#"),
            dataIndex: "invoiceNumber", key: "Invoice#", width: 120,
            render: (text: string) => <span className="fs-13 fw-medium">{text || "—"}</span>,
            sorter: (a, b) => (a.invoiceNumber || "").localeCompare(b.invoiceNumber || ""),
        },
        {
            title: th("Status"),
            dataIndex: "status", key: "Status", width: 120,
            render: (status: string, record: CreditNote) => (
                <Link
                    to={route.creditNoteView?.replace(":id", String(record.id)) || "#"}
                    style={{ textDecoration: "none" }}
                    onClick={e => e.stopPropagation()}
                >
                    <span className={`badge fs-11 fw-semibold text-uppercase ${STATUS_CLASS[status] || "badge-soft-secondary"}`}>
                        {status}
                    </span>
                </Link>
            ),
            sorter: (a, b) => a.status.localeCompare(b.status),
        },
        {
            title: th("Amount"),
            dataIndex: "amount", key: "Amount", width: 120, align: "right" as const,
            render: (amount: number) => <span style={{ fontSize: 13, fontWeight: 500, color: "#212529" }}>₹{amount.toFixed(2)}</span>,
            sorter: (a, b) => a.amount - b.amount,
        },
        {
            title: th("Created By"),
            dataIndex: "createdBy", key: "Created By", width: 130,
            render: (text: string) => <span style={{ fontSize: 13, fontWeight: 500, color: "#212529" }}>{text}</span>,
            sorter: (a, b) => a.createdBy.localeCompare(b.createdBy),
        },
        {
            title: th("Created Time"),
            dataIndex: "createdTime", key: "Created Time", width: 155,
            render: (text: string) => <span style={{ fontSize: 13, fontWeight: 500, color: "#212529" }}>{text}</span>,
            sorter: (a, b) => a.createdTime.localeCompare(b.createdTime),
        },
        {
            title: th("Last Modified By"),
            dataIndex: "lastModifiedBy", key: "Last Modified By", width: 150,
            render: (text: string) => <span style={{ fontSize: 13, fontWeight: 500, color: "#212529" }}>{text}</span>,
            sorter: (a, b) => a.lastModifiedBy.localeCompare(b.lastModifiedBy),
        },
        {
            title: th("Last Modified Time"),
            dataIndex: "lastModifiedTime", key: "Last Modified Time", width: 160,
            render: (text: string) => <span style={{ fontSize: 13, fontWeight: 500, color: "#212529" }}>{text}</span>,
            sorter: (a, b) => a.lastModifiedTime.localeCompare(b.lastModifiedTime),
        },
        {
            title: th("Action"),
            key: "action", width: 80, align: "center" as const,
            render: (_: any, record: CreditNote) => (
                <Dropdown
                    placement="bottomLeft"
                    trigger={["click"]}
                    menu={{
                        items: [
                            {
                                key: "view", label: "View", icon: <i className="ti ti-eye" />,
                                onClick: ({ domEvent }) => { domEvent.stopPropagation(); navigate(route.creditNoteView?.replace(":id", String(record.id)) || "#"); },
                            },
                            {
                                key: "edit", label: "Edit", icon: <i className="ti ti-edit" />,
                                onClick: ({ domEvent }) => { domEvent.stopPropagation(); navigate((route.creditNoteAdd || "#") + "?edit=" + record.id); },
                            },
                            {
                                key: "delete", label: "Delete", danger: true, icon: <i className="ti ti-trash" />,
                                onClick: ({ domEvent }) => { domEvent.stopPropagation(); handleDelete(record.id); },
                            },
                        ],
                        className: "shadow-lg border-0 py-2 rounded-3",
                        style: { minWidth: 140 },
                    }}
                >
                    <button
                        onClick={e => e.stopPropagation()}
                        className="d-inline-flex align-items-center justify-content-center"
                        style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #dee2e6", background: "#fff", cursor: "pointer" }}
                    >
                        <i className="ti ti-dots-vertical" style={{ fontSize: 16, color: "#212529" }} />
                    </button>
                </Dropdown>
            ),
        },
    ];

    const visibleColumns = columns.filter(c => {
        if (c.key === "action") return true;
        return visibleCols[c.key as string] !== false;
    });

    // ── Title Dropdown ─────────────────────────────────────────────────────────
    const titleDropdown = (
        <div className="d-flex align-items-center gap-2">
            <div className="dropdown custom-header-dropdown">
                <div className="d-flex align-items-center gap-1 cursor-pointer" data-bs-toggle="dropdown">
                    <h4 className="mb-0 fw-bold" style={{ fontSize: "18px", color: "#111" }}>
                        {selectedView === "All" ? "All Credit Notes" : selectedView}
                    </h4>
                    <i className="ti ti-chevron-down text-dark fs-14" />
                </div>
                <div className="dropdown-menu shadow-lg border-0 mt-2 py-0 overflow-hidden" style={{ minWidth: 240, borderRadius: 8 }}>
                    <div style={{ maxHeight: 300, overflowY: "auto" }}>
                        {views.map(v => (
                            <div
                                key={v.id}
                                className={`dropdown-item px-3 py-2 d-flex align-items-center justify-content-between cursor-pointer ${selectedView === v.id ? "active" : ""}`}
                                onClick={() => setSelectedView(v.id)}
                            >
                                <span className="fs-14 fw-medium text-dark">{v.label}</span>
                                <i className="ti ti-star text-muted fs-14" />
                            </div>
                        ))}
                    </div>
                    <div className="dropdown-divider m-0" />
                    <div
                        className="dropdown-item px-3 py-3 bg-white cursor-pointer d-flex align-items-center gap-2"
                        style={{ borderTop: "1px solid #f0f2f4" }}
                        data-bs-toggle="modal"
                        data-bs-target="#custom_view_modal"
                    >
                        <div className="d-flex align-items-center justify-content-center text-white rounded-circle" style={{ width: 18, height: 18, background: '#1877f2' }}>
                            <i className="ti ti-plus fs-12" />
                        </div>
                        <span className="fs-14 fw-medium" style={{ color: '#1877f2' }}>New Custom View</span>
                    </div>
                </div>
            </div>
            {/* Count badge next to title */}
            <span style={{
                fontSize: 14,
                minWidth: 13,
                height: 25,
                padding: '0 7px',
                borderRadius: 6,
                background: '#fff1f0',
                color: '#e41f07',
                fontWeight: 500,
                border: '1px solid #ffccc7',
                borderBottom: '2px solid #ffa39e',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1
            }}>{filteredData.length}</span>
        </div>
    );

    // ── Export Menu ────────────────────────────────────────────────────────────
    const exportMenuItems = {
        items: [
            {
                key: "pdf",
                label: <div className="d-flex align-items-center gap-2 py-1"><i className="ti ti-file-type-pdf text-danger fs-18" /><span>Export as PDF</span></div>,
                onClick: () => handleExportPDF(),
            },
            {
                key: "excel",
                label: <div className="d-flex align-items-center gap-2 py-1"><i className="ti ti-file-type-xls text-success fs-18" /><span>Export as Excel</span></div>,
                onClick: () => handleExportExcel(),
            },
        ],
        style: { minWidth: 190, borderRadius: 8, padding: "4px 0" },
    };

    const moreButton = (
        <Dropdown menu={exportMenuItems} trigger={["click"]} placement="bottomRight">
            <button
                className="btn btn-white d-flex align-items-center justify-content-center px-3 shadow-none border export-btn premium-outline-btn"
                style={{ height: 38, borderRadius: 4, background: "#fff", color: "#333", fontSize: 13, fontWeight: 500 }}
                onClick={e => e.preventDefault()}
            >
                <i className="ti ti-package-export me-2" /> Export <i className="ti ti-chevron-down ms-1 fs-12" />
            </button>
        </Dropdown>
    );

    return (
        <div className="page-wrapper" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#f8fafc" }}>
            <input ref={fileInputRef} type="file" accept=".json,.csv" style={{ display: "none" }} />

            <div className="content pb-0 flex-grow-1 d-flex flex-column">
                <PageHeader
                    title="Credit Notes"
                    titleDropdown={titleDropdown}
                    showModuleTile={false}
                    moduleLink="#"
                    exportComponent={moreButton}
                    onRefresh={refreshData}
                    settingsLink={route.creditNoteSetting || "#"}
                />

                <div className={`card border-0 rounded-0 flex-grow-1 mb-4 d-flex flex-column ${viewMode === "list" ? "shadow-sm bg-white" : "bg-transparent shadow-none"}`}>

                    {/* Card Header */}
                    <div className="card-header d-flex align-items-center justify-content-between gap-2 flex-wrap bg-white py-3 border-0 px-3 px-sm-4" style={{ borderRadius: "8px 8px 0 0" }}>
                        {/* Left: Search */}
                        <div
                            className="d-flex align-items-center rounded bg-white"
                            style={{ maxWidth: 240, minWidth: 140, border: searchFocused ? "1px solid #e41f07" : "1px solid #dee2e6", height: 32, transition: "all 0.2s" }}
                        >
                            <span className="px-2 d-flex align-items-center text-muted"><i className="ti ti-search fs-13" /></span>
                            <input
                                className="form-control border-0 ps-0 fs-13 bg-transparent"
                                style={{ outline: "none", boxShadow: "none", height: 30 }}
                                placeholder="Search credit notes..."
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                            />
                        </div>
                        {/* Right: New */}
                        <div className="d-flex align-items-center gap-2">
                            <Link
                                to={route.creditNoteAdd || "#"}
                                className="btn text-white d-flex align-items-center fw-bold"
                                style={{ background: "#e41f07", border: "none", borderRadius: 4, padding: "0 15px", height: 32, fontSize: 13, whiteSpace: "nowrap" }}
                            >
                                <i className="ti ti-plus me-2 fs-14" /> New Credit Note
                            </Link>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="toolbar-custom py-2 px-3 px-sm-4 d-flex align-items-center justify-content-between flex-wrap gap-2 bg-white">

                        {/* Left: Sort By + Date Picker */}
                        <div className="d-flex align-items-center gap-2 flex-wrap">

                            {/* Sort By */}
                            <div data-sortby-dropdown style={{ position: "relative" }}>
                                <button
                                    className={`btn btn-white px-3 border shadow-none fs-13 d-flex align-items-center gap-2 rounded-1 premium-outline-btn ${sortBy !== "date-desc" ? "border-danger text-danger" : ""}`}
                                    style={{ height: 36 }}
                                    onClick={() => { setShowSortBy(!showSortBy); setShowFilter(false); }}
                                >
                                    <i className="ti ti-arrows-sort" /> Sort By
                                    <i className="ti ti-chevron-down fs-13 ms-1" />
                                </button>
                                {showSortBy && (
                                    <div className="dropdown-menu show shadow-lg border-0 p-0 mt-2" style={{ position: "absolute", left: 0, top: "100%", minWidth: 230, zIndex: 1060, borderRadius: 8 }}>
                                        <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-white" style={{ borderRadius: "8px 8px 0 0" }}>
                                            <h6 className="fs-14 fw-bold mb-0 text-dark">Sort By</h6>
                                            <button
                                                className="btn btn-icon btn-sm border-0 shadow-none d-flex align-items-center justify-content-center"
                                                style={{ width: 22, height: 22, borderRadius: "50%", background: "#fff1f0" }}
                                                onClick={() => setShowSortBy(false)}
                                            >
                                                <i className="ti ti-x fs-12" style={{ color: "#e41f07" }} />
                                            </button>
                                        </div>
                                        <div className="p-2">
                                            {[
                                                { value: "date-desc", label: "Date (Newest First)", icon: "ti-calendar-down" },
                                                { value: "date-asc", label: "Date (Oldest First)", icon: "ti-calendar-up" },
                                                { value: "cn-asc", label: "Credit Note# (A → Z)", icon: "ti-sort-ascending-letters" },
                                                { value: "cn-desc", label: "Credit Note# (Z → A)", icon: "ti-sort-descending-letters" },
                                                { value: "name-asc", label: "Customer Name (A → Z)", icon: "ti-sort-ascending-letters" },
                                                { value: "name-desc", label: "Customer Name (Z → A)", icon: "ti-sort-descending-letters" },
                                                { value: "amount-desc", label: "Amount (High → Low)", icon: "ti-sort-descending-numbers" },
                                                { value: "amount-asc", label: "Amount (Low → High)", icon: "ti-sort-ascending-numbers" },
                                                { value: "status-asc", label: "Status (A → Z)", icon: "ti-sort-ascending-letters" },
                                            ].map(opt => (
                                                <button
                                                    key={opt.value}
                                                    className={`dropdown-item d-flex align-items-center gap-2 px-3 py-2 rounded-2 mb-1 fs-13 ${sortBy === opt.value ? "active text-danger fw-bold" : "text-dark"}`}
                                                    style={{ background: sortBy === opt.value ? "#fff1f0" : "transparent", border: "none", width: "100%", textAlign: "left" }}
                                                    onClick={() => { setSortBy(opt.value); setShowSortBy(false); }}
                                                >
                                                    <i className={`ti ${opt.icon} fs-14`} style={{ color: sortBy === opt.value ? "#e41f07" : "#6c757d" }} />
                                                    {opt.label}
                                                    {sortBy === opt.value && <i className="ti ti-check ms-auto fs-13" style={{ color: "#e41f07" }} />}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="px-3 pb-3">
                                            <button className="btn btn-light btn-sm w-100 fs-13" onClick={() => { setSortBy("date-desc"); setShowSortBy(false); }}>
                                                Reset to Default
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Date Picker */}
                            <PredefinedDatePicker />
                        </div>

                        {/* Right: Filter + Manage Columns + View Toggle */}
                        <div className="d-flex align-items-center gap-3 flex-wrap">
                            {/* Filter */}
                            <div data-filter-dropdown style={{ position: "relative" }}>

                                <button
                                    className={`btn btn-white px-3 border shadow-none fs-13 d-flex align-items-center gap-2 rounded-1 premium-outline-btn ${filterStatus.length > 0 ? "border-danger text-danger" : ""}`}
                                    style={{ height: 38 }}
                                    onClick={() => setShowFilter(!showFilter)}
                                >
                                    <i className="ti ti-filter" /> Filter
                                    {filterStatus.length > 0 && <span className="premium-count-badge-v2 ms-2">{filterStatus.length}</span>}
                                    <i className="ti ti-chevron-down fs-13 ms-1" />
                                </button>
                                {showFilter && (
                                    <div className="dropdown-menu show shadow-lg border-0 p-0 mt-2" style={{ position: "absolute", right: 0, top: "100%", minWidth: 220, zIndex: 1060, borderRadius: 8 }}>
                                        <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-white" style={{ borderRadius: "8px 8px 0 0" }}>
                                            <h6 className="fs-14 fw-bold mb-0 text-dark">Filter by Status</h6>
                                            <button
                                                className="btn btn-icon btn-sm border-0 shadow-none d-flex align-items-center justify-content-center"
                                                style={{ width: 22, height: 22, borderRadius: "50%", background: "#fff1f0" }}
                                                onClick={() => setShowFilter(false)}
                                            >
                                                <i className="ti ti-x fs-12" style={{ color: "#e41f07" }} />
                                            </button>
                                        </div>
                                        <div className="p-3">
                                            {["Open", "Draft", "Void"].map(s => (
                                                <div className="form-check mb-2" key={s}>
                                                    <input className="form-check-input" type="checkbox"
                                                        checked={filterStatus.includes(s)}
                                                        onChange={e => {
                                                            if (e.target.checked) setFilterStatus([...filterStatus, s]);
                                                            else setFilterStatus(filterStatus.filter(x => x !== s));
                                                        }} />
                                                    <label className="form-check-label fs-13">{s}</label>
                                                </div>
                                            ))}
                                            <div className="d-flex gap-2 mt-3 pt-3 border-top">
                                                <button className="btn btn-light btn-sm flex-grow-1" onClick={() => { setFilterStatus([]); setShowFilter(false); }}>Reset</button>
                                                <button className="btn btn-danger btn-sm flex-grow-1" onClick={() => setShowFilter(false)}>Apply</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Manage Columns */}
                            {viewMode === "list" && (
                                <div className="dropdown" style={{ position: "relative" }}>
                                    <button
                                        className="btn px-3 d-flex align-items-center gap-2 shadow-none fw-semibold"
                                        style={{ height: 38, fontSize: 13, borderRadius: 6, background: "#eef2ff", color: "#4f46e5", border: "1px solid #e0e7ff" }}
                                        data-bs-toggle="dropdown"
                                        data-bs-auto-close="outside"
                                    >
                                        <i className="ti ti-columns-3 fs-14" /> Manage Columns
                                    </button>
                                    <div className="dropdown-menu shadow-lg border-0 bg-white p-0" style={{ right: 0, left: "auto", top: "100%", zIndex: 1050, borderRadius: 12, minWidth: 240, marginTop: 4 }}>
                                        <div className="p-2" style={{ maxHeight: 350, overflowY: "auto" }}>
                                            <ul className="list-unstyled mb-0">
                                                {Object.keys(visibleCols).map(col => (
                                                    <li key={col}>
                                                        <label className="dropdown-item d-flex align-items-center justify-content-between py-2 px-3 rounded-2 cursor-pointer mb-1">
                                                            <span className="fs-13 fw-medium">{col}</span>
                                                            <div className="form-check form-switch custom-switch-red mb-0">
                                                                <input
                                                                    className="form-check-input cursor-pointer" type="checkbox" role="switch"
                                                                    checked={visibleCols[col]}
                                                                    onChange={() => setVisibleCols(prev => ({ ...prev, [col]: !prev[col] }))}
                                                                />
                                                            </div>
                                                        </label>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* View Toggle */}
                            <div className="d-flex align-items-center border rounded-3 p-1 bg-white shadow-sm" style={{ height: 38, borderColor: "#e2e8f0" }}>
                                <button
                                    onClick={() => setViewMode("list")}
                                    className="d-flex align-items-center justify-content-center"
                                    style={{ width: 32, height: 30, border: "none", background: viewMode === "list" ? "#26a69a" : "transparent", color: viewMode === "list" ? "#fff" : "#6c757d", borderRadius: 6 }}
                                >
                                    <i className="ti ti-list fs-16" />
                                </button>
                                <button
                                    onClick={() => setViewMode("grid")}
                                    className="d-flex align-items-center justify-content-center"
                                    style={{ width: 32, height: 30, border: "none", background: viewMode === "grid" ? "#26a69a" : "transparent", color: viewMode === "grid" ? "#fff" : "#6c757d", borderRadius: 6 }}
                                >
                                    <i className="ti ti-grid-dots fs-16" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-grow-1" style={{ position: "relative" }}>
                        {viewMode === "list" ? (
                            <div className="custom-table table-responsive px-2 px-sm-4 flex-grow-1 border-0 bg-white">
                                <Datatable
                                    columns={visibleColumns}
                                    dataSource={filteredData}
                                    Selection={true}
                                    searchText=""
                                    onRow={(record: CreditNote) => ({
                                        onClick: () => navigate(route.creditNoteView?.replace(":id", String(record.id)) || "#"),
                                        style: { cursor: "pointer" },
                                    })}
                                />
                            </div>
                        ) : (
                            <div className="py-4 px-3 px-sm-4" style={{ minHeight: "100%", backgroundColor: "#f4f7fa" }}>
                                <div className="row g-3">
                                    {filteredData.map(c => {
                                        const stCls = STATUS_CLASS[c.status] || "badge-soft-secondary";
                                        return (
                                            <div key={c.id} className="col-xxl-3 col-xl-4 col-lg-4 col-md-6 col-sm-12">
                                                <div
                                                    style={{ background: "#fff", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb", transition: "box-shadow 0.2s, transform 0.2s" }}
                                                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
                                                >
                                                    {/* Card Top */}
                                                    <div style={{ padding: "14px 16px 0" }}>
                                                        {/* Row 1: CN Number + 3-dot menu */}
                                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                            <div style={{ cursor: "pointer" }} onClick={() => navigate(route.creditNoteView?.replace(":id", String(c.id)) || "#")}>
                                                                <div style={{ fontSize: 14, fontWeight: 700, color: "#e41f07", lineHeight: 1.3 }}>{c.creditNoteNumber}</div>
                                                                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>{c.date}</div>
                                                            </div>
                                                            {/* 3-dot menu */}
                                                            <div className="dropdown">
                                                                <button
                                                                    className="btn btn-icon btn-sm border-0 shadow-none"
                                                                    data-bs-toggle="dropdown"
                                                                    onClick={e => e.stopPropagation()}
                                                                    style={{ width: 30, height: 30, borderRadius: 6, background: "#f8f9fa", color: "#6c757d" }}
                                                                >
                                                                    <i className="ti ti-dots-vertical fs-15" />
                                                                </button>
                                                                <ul className="dropdown-menu dropdown-menu-end shadow border-0 py-1" style={{ minWidth: 150, borderRadius: 8 }}>
                                                                    <li><Link to="#" className="dropdown-item px-3 py-2 text-dark fs-14" onClick={e => { e.preventDefault(); navigate(route.creditNoteView?.replace(":id", String(c.id)) || "#"); }}><i className="ti ti-eye text-muted me-2" />View</Link></li>
                                                                    <li><Link to="#" className="dropdown-item px-3 py-2 text-dark fs-14" onClick={e => { e.preventDefault(); navigate((route.creditNoteAdd || "#") + "?edit=" + c.id); }}><i className="ti ti-edit text-muted me-2" />Edit</Link></li>
                                                                    <li><hr className="dropdown-divider my-1" /></li>
                                                                    <li><Link to="#" className="dropdown-item px-3 py-2 text-danger fs-14" onClick={e => { e.preventDefault(); handleDeleteClick(c.creditNoteNumber, c.id); }}><i className="ti ti-trash me-2" />Delete</Link></li>
                                                                </ul>
                                                            </div>
                                                        </div>
                                                        {/* Divider */}
                                                        <div style={{ height: 1, background: "#f3f4f6", margin: "12px 0" }} />
                                                        {/* Customer info */}
                                                        <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 13, color: "#4b5563", paddingBottom: 10 }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                                <i className="ti ti-user" style={{ fontSize: 13, color: "#9ca3af", width: 14 }} />
                                                                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.customerName}</span>
                                                            </div>
                                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                                <i className="ti ti-building" style={{ fontSize: 13, color: "#9ca3af", width: 14 }} />
                                                                <span>{c.location}</span>
                                                            </div>
                                                            {c.invoiceNumber && (
                                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                                    <i className="ti ti-file-invoice" style={{ fontSize: 13, color: "#9ca3af", width: 14 }} />
                                                                    <span>{c.invoiceNumber}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Card Footer */}
                                                    <div style={{ padding: "10px 16px", borderTop: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                                        <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>₹{c.amount.toFixed(2)}</span>
                                                        <div style={{ display: "flex", gap: 6 }}>
                                                            <button
                                                                onClick={e => { e.stopPropagation(); navigate(route.creditNoteView?.replace(":id", String(c.id)) || "#"); }}
                                                                style={{ width: 28, height: 28, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                                                title="View"
                                                            >
                                                                <i className="ti ti-eye" style={{ fontSize: 14, color: "#6c757d" }} />
                                                            </button>
                                                            <button
                                                                onClick={e => { e.stopPropagation(); navigate((route.creditNoteAdd || "#") + "?edit=" + c.id); }}
                                                                style={{ width: 28, height: 28, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                                                title="Edit"
                                                            >
                                                                <i className="ti ti-edit" style={{ fontSize: 14, color: "#6c757d" }} />
                                                            </button>
                                                            <button
                                                                onClick={e => { e.stopPropagation(); handleDeleteClick(c.creditNoteNumber, c.id); }}
                                                                style={{ width: 28, height: 28, border: "1px solid #fee2e2", borderRadius: 6, background: "#fff8f8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                                                title="Delete"
                                                            >
                                                                <i className="ti ti-trash" style={{ fontSize: 14, color: "#dc2626" }} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {filteredData.length === 0 && (
                                        <div className="col-12 text-center py-5">
                                            <i className="ti ti-receipt-refund fs-48 text-muted opacity-25 d-block mb-2" />
                                            <p className="text-muted fs-14">No credit notes found</p>
                                            <Link to={route.creditNoteAdd || "#"} className="btn btn-danger mt-2">
                                                <i className="ti ti-plus me-2" /> New Credit Note
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Delete Confirmation Modal */}
                {del && <DeleteConfirm creditNoteNumber={del.creditNoteNumber} onConfirm={del.onConfirm} onCancel={() => setDel(null)} />}

                {/* New Custom View Modal */}
                <div className="modal fade" id="custom_view_modal" tabIndex={-1} aria-hidden="true">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12 }}>
                            <div className="modal-header border-0 pb-0">
                                <h5 className="modal-title fw-bold" style={{ color: "#111" }}>New Custom View</h5>
                                <button type="button" className="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div className="modal-body py-4">
                                <div className="mb-3">
                                    <label className="form-label fw-medium fs-14 text-dark">View Name <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        className="form-control shadow-none"
                                        placeholder="Enter view name"
                                        value={newViewName}
                                        onChange={(e) => setNewViewName(e.target.value)}
                                    />
                                </div>
                                <div className="mb-0">
                                    <label className="form-label fw-medium fs-14 text-dark">Criteria</label>
                                    <div className="p-3 bg-light rounded text-center text-muted" style={{ border: "1px dashed #ced4da" }}>
                                        <i className="ti ti-filter d-block mb-2 fs-20 opacity-50" />
                                        Criteria selection will be available here.
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer border-0 pt-0">
                                <button type="button" className="btn btn-light fw-medium shadow-none" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" className="btn text-white fw-bold shadow-none" style={{ background: "#e41f07" }} data-bs-dismiss="modal" onClick={handleSaveView}>Save View</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreditNoteList;
