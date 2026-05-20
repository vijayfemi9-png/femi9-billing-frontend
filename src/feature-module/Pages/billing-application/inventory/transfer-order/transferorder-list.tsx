// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Datatable from "../../../../../components/dataTable";
import PageHeader from "../../../../../components/page-header/pageHeader";
import PredefinedDatePicker from "../../../../../components/common-dateRangePicker/PredefinedDatePicker";
import { all_routes } from "../../../../../routes/all_routes";
import { Dropdown } from "antd";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "./transfer.scss";

// ── Types ─────────────────────────────────────────────────────────────────────
interface TransferOrder {
    id: number;
    transferOrderNumber: string;
    date: string;
    reason: string;
    status: string;
    quantity: number;
    sourceLocation: string;
    destinationLocation: string;
    createdBy: string;
    createdTime: string;
    lastModifiedBy: string;
    lastModifiedTime: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const SK = "billing_transfer_orders";

const SEED: TransferOrder[] = [
    {
        id: 1,
        transferOrderNumber: "TO-00001",
        date: "16/05/2026",
        reason: "erghtjykul",
        status: "Draft",
        quantity: 1.00,
        sourceLocation: "Head Office",
        destinationLocation: "vijay E",
        createdBy: "vickyyfemi9",
        createdTime: "16/05/2026 10:53 AM",
        lastModifiedBy: "vickyyfemi9",
        lastModifiedTime: "16/05/2026 10:53 AM",
    },
];

function normalizeStatus(status: string): string {
    if (status === "Pending" || status === "In Transfer") return "Transferred";
    return status;
}
function loadOrders(): TransferOrder[] {
    try {
        const s = localStorage.getItem(SK);
        if (s) {
            const p = JSON.parse(s) as TransferOrder[];
            if (Array.isArray(p) && p.length) {
                const normalized = p.map(r => ({ ...r, status: normalizeStatus(r.status) }));
                localStorage.setItem(SK, JSON.stringify(normalized));
                return normalized;
            }
        }
    } catch { /**/ }
    try { localStorage.setItem(SK, JSON.stringify(SEED)); } catch { /**/ }
    return SEED;
}

function nextTONum(): string {
    try {
        const a = JSON.parse(localStorage.getItem(SK) || "[]");
        const n = (a.length || 0) + 1;
        return "TO-" + String(n).padStart(5, "0");
    } catch { return "TO-00001"; }
}

const VIEWS = [
    { id: "All", label: " Transfer Orders" },
    { id: "Transferred", label: "Transferred" },
    { id: "In Transit", label: "In Transit" },
    { id: "Draft", label: "Draft" },
    { id: "Partially Transferred", label: "Partially Transferred" },
    { id: "Pending", label: "Pending" },
    { id: "Void", label: "Void" },
];
    
const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
    "Draft": { color: "#b45309", bg: "#fef9c3" },
    "Transferred": { color: "#16a34a", bg: "#dcfce7" },
    "In Transit": { color: "#7c3aed", bg: "#f5f3ff" },
    "Partially Transferred": { color: "#ea580c", bg: "#ffedd5" },
    "Pending": { color: "#6b7280", bg: "#f3f4f6" },
    "Void": { color: "#e41f07", bg: "#fee2e2" },
};

const LOCATIONS = ["Head Office", "Main Warehouse", "Branch A", "Branch B"];

const TransferOrderList: React.FC = () => {
    const navigate = useNavigate();
    const route = all_routes;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [orders, setOrders] = useState<TransferOrder[]>(() => loadOrders());
    const [searchText, setSearchText] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
    const [selectedView, setSelectedView] = useState("All");
    const [showFilter, setShowFilter] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string[]>([]);
    const [showManageCols, setShowManageCols] = useState(false);
    const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
        "Date": true,
        "Transfer Order#": true,
        "Reason": true,
        "Status": true,
        "Quantity": true,
        "Source Location": true,
        "Destination Location": true,
        "Created By": true,
        "Created Time": true,
        "Last Modified By": true,
        "Last Modified Time": true,
    });

    const refreshData = () => setOrders(loadOrders());

    useEffect(() => { setOrders(loadOrders()); }, []);

    // ── Export PDF ───────────────────────────────────────────────────────────
    const handleExportPDF = () => {
        try {
            const doc = new jsPDF({ orientation: "landscape" });
            const date = new Date().toLocaleDateString();
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text("Transfer Order List", 14, 18);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(120);
            doc.text(`Generated: ${date}`, 14, 25);
            doc.setTextColor(0);
            const headers = ["Date", "TO#", "Reason", "Status", "Qty", "Source", "Destination", "Created By"];
            const colWidths = [25, 25, 35, 30, 18, 35, 35, 30];
            const startX = 14;
            let startY = 34;
            const rowH = 9;
            doc.setFillColor(228, 31, 7);
            doc.rect(startX, startY, colWidths.reduce((a, b) => a + b, 0), rowH, "F");
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);
            let x = startX;
            headers.forEach((h, i) => { doc.text(h, x + 2, startY + 6); x += colWidths[i]; });
            doc.setFont("helvetica", "normal");
            startY += rowH;
            filteredData.forEach((o, idx) => {
                if (idx % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(startX, startY, colWidths.reduce((a, b) => a + b, 0), rowH, "F"); }
                doc.setTextColor(50);
                const row = [o.date, o.transferOrderNumber, o.reason || "—", o.status, String(o.quantity), o.sourceLocation, o.destinationLocation, o.createdBy];
                x = startX;
                row.forEach((cell, i) => { doc.text(String(cell).substring(0, 20), x + 2, startY + 6); x += colWidths[i]; });
                startY += rowH;
                if (startY > 190) { doc.addPage(); startY = 14; }
            });
            doc.save(`TransferOrders_${date.replace(/\//g, "-")}.pdf`);
        } catch (err) {
            console.error("Failed to export PDF", err);
        }
    };

    // ── Export Excel ─────────────────────────────────────────────────────────
    const handleExportExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Transfer Orders");
            worksheet.columns = [
                { header: "Date", key: "date", width: 15 },
                { header: "Transfer Order#", key: "transferOrderNumber", width: 18 },
                { header: "Reason", key: "reason", width: 25 },
                { header: "Status", key: "status", width: 20 },
                { header: "Quantity", key: "quantity", width: 12 },
                { header: "Source Location", key: "sourceLocation", width: 20 },
                { header: "Destination Location", key: "destinationLocation", width: 20 },
                { header: "Created By", key: "createdBy", width: 18 },
                { header: "Created Time", key: "createdTime", width: 20 },
                { header: "Last Modified By", key: "lastModifiedBy", width: 18 },
                { header: "Last Modified Time", key: "lastModifiedTime", width: 20 },
            ];
            filteredData.forEach(o => worksheet.addRow(o));
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `TransferOrders_${new Date().toLocaleDateString()}.xlsx`);
        } catch (err) {
            console.error("Failed to export Excel", err);
        }
    };

    // ── Import ───────────────────────────────────────────────────────────────
    const handleImportTrigger = () => fileInputRef.current?.click();

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                let imported: TransferOrder[] = [];
                if (file.name.endsWith(".json")) {
                    imported = JSON.parse(content);
                } else if (file.name.endsWith(".csv")) {
                    const lines = content.split("\n");
                    imported = lines.slice(1).filter(l => l.trim()).map((line, i) => {
                        const v = line.split(",");
                        const now = new Date().toLocaleString();
                        return {
                            id: Date.now() + i,
                            date: v[0]?.trim() || new Date().toLocaleDateString(),
                            transferOrderNumber: v[1]?.trim() || nextTONum(),
                            reason: v[2]?.trim() || "",
                            status: v[3]?.trim() || "Draft",
                            quantity: parseFloat(v[4]) || 1,
                            sourceLocation: v[5]?.trim() || "Head Office",
                            destinationLocation: v[6]?.trim() || "",
                            createdBy: "vickyyfemi9",
                            createdTime: now,
                            lastModifiedBy: "vickyyfemi9",
                            lastModifiedTime: now,
                        };
                    });
                }
                if (imported.length) {
                    const merged = [...orders, ...imported];
                    setOrders(merged);
                    localStorage.setItem(SK, JSON.stringify(merged));
                }
            } catch (err) { console.error("Failed to import", err); }
            if (e.target) e.target.value = "";
        };
        reader.readAsText(file);
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDelete = (id: number) => {
        const updated = orders.filter(o => o.id !== id);
        setOrders(updated);
        localStorage.setItem(SK, JSON.stringify(updated));
    };

    // ── Columns ───────────────────────────────────────────────────────────────
    const columns = [
        {
            title: "Date",
            dataIndex: "date",
            key: "Date",
            width: 110,
            render: (text: string) => <span className="fs-13 text-dark">{text}</span>,
            sorter: (a, b) => a.date.localeCompare(b.date),
        },
        {
            title: "Transfer Order#",
            dataIndex: "transferOrderNumber",
            key: "Transfer Order#",
            width: 140,
            render: (text: string, record: TransferOrder) => (
                <Link to={route.transferOrderView?.replace(":id", String(record.id)) || "#"} className="text-primary fw-medium fs-13">
                    {text}
                </Link>
            ),
            sorter: (a, b) => a.transferOrderNumber.localeCompare(b.transferOrderNumber),
        },
        {
            title: "Reason",
            dataIndex: "reason",
            key: "Reason",
            render: (text: string) => <span className="fs-13 text-muted">{text || "—"}</span>,
            sorter: (a, b) => (a.reason || "").localeCompare(b.reason || ""),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "Status",
            width: 160,
            render: (status: string) => {
                const s = STATUS_STYLE[status] || { color: "#6b7280", bg: "#f3f4f6" };
                return (
                    <span className="badge rounded-pill px-2 py-1 fs-11 fw-bold" style={{ background: s.bg, color: s.color, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                        {status}
                    </span>
                );
            },
            sorter: (a, b) => a.status.localeCompare(b.status),
        },
        {
            title: "Quantity",
            dataIndex: "quantity",
            key: "Quantity",
            width: 90,
            align: "right" as const,
            render: (val: number) => <span className="fs-13 fw-medium text-dark">{val.toFixed(2)}</span>,
            sorter: (a, b) => a.quantity - b.quantity,
        },
        {
            title: "Source Location",
            dataIndex: "sourceLocation",
            key: "Source Location",
            width: 150,
            render: (text: string) => <span className="fs-13 text-dark">{text}</span>,
            sorter: (a, b) => a.sourceLocation.localeCompare(b.sourceLocation),
        },
        {
            title: "Destination Location",
            dataIndex: "destinationLocation",
            key: "Destination Location",
            width: 160,
            render: (text: string) => <span className="fs-13 text-muted">{text || "—"}</span>,
            sorter: (a, b) => (a.destinationLocation || "").localeCompare(b.destinationLocation || ""),
        },
        {
            title: "Created By",
            dataIndex: "createdBy",
            key: "Created By",
            width: 130,
            render: (text: string) => <span className="fs-13 text-dark">{text}</span>,
            sorter: (a, b) => a.createdBy.localeCompare(b.createdBy),
        },
        {
            title: "Created Time",
            dataIndex: "createdTime",
            key: "Created Time",
            width: 160,
            render: (text: string) => <span className="fs-13 text-muted">{text}</span>,
            sorter: (a, b) => a.createdTime.localeCompare(b.createdTime),
        },
        {
            title: "Last Modified By",
            dataIndex: "lastModifiedBy",
            key: "Last Modified By",
            width: 140,
            render: (text: string) => <span className="fs-13 text-dark">{text}</span>,
            sorter: (a, b) => a.lastModifiedBy.localeCompare(b.lastModifiedBy),
        },
        {
            title: "Last Modified Time",
            dataIndex: "lastModifiedTime",
            key: "Last Modified Time",
            width: 160,
            render: (text: string) => <span className="fs-13 text-muted">{text}</span>,
            sorter: (a, b) => a.lastModifiedTime.localeCompare(b.lastModifiedTime),
        },
        {
            title: "Action",
            key: "Action",
            width: 70,
            align: "center" as const,
            render: (_: any, record: TransferOrder) => (
                <Dropdown
                    placement="bottomLeft"
                    trigger={["click"]}
                    menu={{
                        items: [
                            {
                                key: "edit",
                                label: "Edit",
                                icon: <i className="ti ti-edit" />,
                                onClick: ({ domEvent }) => {
                                    domEvent.stopPropagation();
                                    navigate(route.transferOrderAdd + "?edit=" + record.id);
                                },
                            },
                            {
                                key: "delete",
                                label: "Delete",
                                danger: true,
                                icon: <i className="ti ti-trash" />,
                                onClick: ({ domEvent }) => {
                                    domEvent.stopPropagation();
                                    handleDelete(record.id);
                                },
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
                        <i className="ti ti-dots-vertical" style={{ fontSize: 16, color: "#6c757d" }} />
                    </button>
                </Dropdown>
            ),
        },
    ];

    const visibleColumns = columns.filter(c => {
        if (c.key === "Action" || c.key === "Transfer Order#") return true;
        return visibleCols[c.key] !== false;
    });

    // ── Filter Logic ──────────────────────────────────────────────────────────
    const filteredData = orders.filter(o => {
        const q = searchText.toLowerCase();
        const matchesSearch =
            o.transferOrderNumber.toLowerCase().includes(q) ||
            (o.reason || "").toLowerCase().includes(q) ||
            o.sourceLocation.toLowerCase().includes(q) ||
            o.destinationLocation.toLowerCase().includes(q);
        const matchesFilter = filterStatus.length === 0 || filterStatus.includes(o.status);
        const matchesView = selectedView === "All" || o.status === selectedView;
        return matchesSearch && matchesFilter && matchesView;
    });

    if (sortBy === "oldest") filteredData.sort((a, b) => a.id - b.id);
    else filteredData.sort((a, b) => b.id - a.id);

    // ── Title Dropdown ────────────────────────────────────────────────────────
    const titleDropdown = (
        <div className="dropdown custom-header-dropdown">
            <div className="d-flex align-items-center gap-2 cursor-pointer" data-bs-toggle="dropdown">
                <h4 className="mb-0 fw-bold" style={{ fontSize: "18px", color: "#111" }}>
                    {VIEWS.find(v => v.id === selectedView)?.label || "All Transfer Orders"}
                </h4>
                <i className="ti ti-chevron-down text-primary fs-14" />
                <span className="ms-2 d-flex align-items-center justify-content-center premium-count-badge-v2">{filteredData.length}</span>
            </div>
            <div className="dropdown-menu shadow-lg border-0 mt-2 py-0 overflow-hidden" style={{ minWidth: 260, borderRadius: 8 }}>
                <div style={{ maxHeight: 400, overflowY: "auto" }}>
                    {VIEWS.map(v => (
                        <div
                            key={v.id}
                            className={`dropdown-item px-3 py-2 d-flex align-items-center justify-content-between cursor-pointer ${selectedView === v.id ? "active" : ""}`}
                            onClick={() => setSelectedView(v.id)}
                        >
                            <span className="fs-14 fw-medium text-dark">{v.label}</span>
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

    // ── Export Menu ───────────────────────────────────────────────────────────
    const exportMenuItems = {
        items: [
            {
                key: "pdf",
                label: (
                    <div className="d-flex align-items-center gap-2 py-1">
                        <i className="ti ti-file-type-pdf text-danger fs-18" />
                        <span>Export as PDF</span>
                    </div>
                ),
                onClick: () => handleExportPDF(),
            },
            {
                key: "excel",
                label: (
                    <div className="d-flex align-items-center gap-2 py-1">
                        <i className="ti ti-file-type-xls text-success fs-18" />
                        <span>Export as Excel</span>
                    </div>
                ),
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
            <input ref={fileInputRef} type="file" accept=".json,.csv" style={{ display: "none" }} onChange={handleFileImport} />

            <div className="content pb-0 flex-grow-1 d-flex flex-column">
                <PageHeader
                    title="Transfer Orders"
                    titleDropdown={titleDropdown}
                    showModuleTile={false}
                    moduleLink="#"
                    exportComponent={moreButton}
                    onRefresh={refreshData}
                    settingsLink="#"
                />

                <div className={`card border-0 rounded-0 flex-grow-1 mb-4 d-flex flex-column ${viewMode === "list" ? "shadow-sm bg-white" : "bg-transparent shadow-none"}`}>
                    {/* Card Header */}
                    <div className="card-header d-flex align-items-center justify-content-between gap-2 flex-wrap bg-white py-3 border-0" style={{ borderRadius: "8px 8px 0 0" }}>
                        <div className="d-flex align-items-center rounded bg-white" style={{ width: 260, border: searchFocused ? "1px solid #e41f07" : "1px solid #dee2e6", height: 36, transition: "all 0.2s" }}>
                            <span className="px-2 d-flex align-items-center text-muted">
                                <i className="ti ti-search fs-14" />
                            </span>
                            <input
                                className="form-control border-0 ps-0 fs-14 bg-transparent"
                                style={{ outline: "none", boxShadow: "none", height: 34 }}
                                placeholder="Search transfer orders..."
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                            />
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <Link
                                to={route.transferOrderAdd || "#"}
                                className="btn text-white d-flex align-items-center fw-bold"
                                style={{ background: "#e41f07", border: "none", borderRadius: 4, padding: "0 15px", height: 36, fontSize: 13 }}
                            >
                                <i className="ti ti-plus me-2 fs-14" /> New Transfer
                            </Link>
                        </div>
                    </div>

                    <div className="card-body p-0 d-flex flex-column" style={{ minHeight: 0 }}>
                        {/* Toolbar */}
                        <div className="toolbar-custom py-2 px-4 d-flex align-items-center justify-content-between flex-wrap gap-2 bg-white">
                            {/* LEFT */}
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <div className="dropdown">
                                    <button
                                        className="dropdown-toggle btn btn-white px-3 border shadow-none fs-13 fw-medium premium-outline-btn"
                                        style={{ height: 38, borderRadius: 4 }}
                                        data-bs-toggle="dropdown"
                                    >
                                        <i className="ti ti-arrows-sort me-1" /> Sort By
                                    </button>
                                    <div className="dropdown-menu shadow border-0 py-0 overflow-hidden" style={{ borderRadius: 8 }}>
                                        <button className={`dropdown-item py-2 ${sortBy === "newest" ? "active" : ""}`} onClick={() => setSortBy("newest")}>Newest</button>
                                        <button className={`dropdown-item py-2 ${sortBy === "oldest" ? "active" : ""}`} onClick={() => setSortBy("oldest")}>Oldest</button>
                                    </div>
                                </div>
                                <PredefinedDatePicker />
                            </div>

                            {/* RIGHT */}
                            <div className="d-flex align-items-center gap-3 flex-wrap">
                                {/* Filter */}
                                <div style={{ position: "relative" }}>
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
                                                {Object.keys(STATUS_STYLE).map(s => (
                                                    <div className="form-check mb-2" key={s}>
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            checked={filterStatus.includes(s)}
                                                            onChange={e => {
                                                                if (e.target.checked) setFilterStatus([...filterStatus, s]);
                                                                else setFilterStatus(filterStatus.filter(x => x !== s));
                                                            }}
                                                        />
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
                                                            <label className="dropdown-item d-flex align-items-center justify-content-between py-2 px-3 rounded-2 cursor-pointer mb-1" style={{ transition: "0.2s" }}>
                                                                <span className="fs-14 fw-medium text-dark">{col}</span>
                                                                <div className="form-check form-switch custom-switch-red mb-0">
                                                                    <input
                                                                        className="form-check-input cursor-pointer"
                                                                        type="checkbox"
                                                                        role="switch"
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
                                <div className="custom-table table-responsive px-4 flex-grow-1 border-0 bg-white">
                                    <Datatable
                                        columns={visibleColumns}
                                        dataSource={filteredData}
                                        Selection={true}
                                        className="invoice-table compact-table"
                                        pagination={false}
                                        onRow={(record: TransferOrder) => ({
                                            onClick: () => navigate(route.transferOrderView?.replace(":id", String(record.id)) || "#"),
                                            style: { cursor: "pointer" },
                                        })}
                                    />
                                    {filteredData.length === 0 && (
                                        <div className="text-center py-5 bg-white">
                                            <i className="ti ti-transfer fs-48 text-muted opacity-25 d-block mb-2" />
                                            <p className="text-muted fs-14">No transfer orders found</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="py-4 px-2" style={{ minHeight: "100%", backgroundColor: "#f4f7fa" }}>
                                    <div className="row g-4">
                                        {filteredData.map(o => {
                                            const st = STATUS_STYLE[o.status] || { color: "#6b7280", bg: "#f3f4f6" };
                                            return (
                                                <div key={o.id} className="col-xxl-3 col-xl-4 col-lg-4 col-md-6 col-sm-12">
                                                    <div
                                                        onClick={() => navigate(route.transferOrderView?.replace(":id", String(o.id)) || "#")}
                                                        style={{ background: "#fff", borderRadius: 8, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.04)", border: "1px solid #e5e7eb", cursor: "pointer", display: "flex", flexDirection: "column", height: "100%", transition: "all 0.2s", position: "relative" }}
                                                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
                                                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
                                                    >
                                                        {/* Header */}
                                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                                                            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                                                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#1e293b", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                                    <i className="ti ti-transfer" style={{ fontSize: 20 }} />
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: 16, fontWeight: 500, color: "#111827", marginBottom: 2 }}>{o.transferOrderNumber}</div>
                                                                    <div style={{ fontSize: 13, color: "#6b7280" }}>{o.date}</div>
                                                                </div>
                                                            </div>
                                                            <div onClick={e => e.stopPropagation()} className="dropdown">
                                                                <button className="btn p-0 shadow-none d-flex align-items-center justify-content-center" style={{ width: 32, height: 32, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", color: "#6b7280" }} data-bs-toggle="dropdown">
                                                                    <i className="ti ti-dots-vertical" style={{ fontSize: 16 }} />
                                                                </button>
                                                                <div className="dropdown-menu dropdown-menu-end shadow-lg border-0 mt-2" style={{ borderRadius: 8, minWidth: 140 }}>
                                                                    <button className="dropdown-item fs-13 py-2" onClick={() => navigate(route.transferOrderAdd + "?edit=" + o.id)}>
                                                                        <i className="ti ti-edit me-2" /> Edit
                                                                    </button>
                                                                    <button className="dropdown-item fs-13 py-2 text-danger" onClick={() => handleDelete(o.id)}>
                                                                        <i className="ti ti-trash me-2" /> Delete
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div style={{ height: 1, background: "#f3f4f6", margin: "0 -20px 20px" }} />

                                                        {/* Middle Details */}
                                                        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20, flex: 1 }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                                <i className="ti ti-building-warehouse" style={{ fontSize: 16, color: "#6b7280", width: 16, textAlign: "center" }} />
                                                                <div style={{ fontSize: 14, color: "#4b5563" }}>{o.sourceLocation || "—"}</div>
                                                            </div>
                                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                                <i className="ti ti-map-pin" style={{ fontSize: 16, color: "#6b7280", width: 16, textAlign: "center" }} />
                                                                <div style={{ fontSize: 14, color: "#4b5563" }}>{o.destinationLocation || "—"}</div>
                                                            </div>
                                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                                <i className="ti ti-box" style={{ fontSize: 16, color: "#6b7280", width: 16, textAlign: "center" }} />
                                                                <div style={{ fontSize: 14, color: "#4b5563" }}>Qty: {o.quantity.toFixed(2)}</div>
                                                            </div>
                                                        </div>

                                                        {/* Tags */}
                                                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                                                            <span style={{ fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 6, background: st.bg, color: st.color, border: `1px solid ${st.bg}` }}>
                                                                {o.status}
                                                            </span>
                                                            {o.items && o.items.length > 0 && (
                                                                <span style={{ fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 6, background: "#fff9e6", color: "#b45309", border: "1px solid #ffedd5" }}>
                                                                    {o.items.length} Items
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Footer Icons */}
                                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                                                            <div style={{ display: "flex", gap: 16, color: "#6b7280" }} onClick={e => e.stopPropagation()}>
                                                                <i className="ti ti-mail cursor-pointer" style={{ fontSize: 18 }} title="Email" />
                                                                <i className="ti ti-phone cursor-pointer" style={{ fontSize: 18 }} title="Call" />
                                                                <i className="ti ti-refresh cursor-pointer" style={{ fontSize: 18 }} title="Sync" />
                                                                <i className="ti ti-brand-facebook cursor-pointer" style={{ fontSize: 18 }} title="Social" />
                                                            </div>
                                                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 7, fontWeight: 500, whiteSpace: "nowrap", letterSpacing: "0.2px" }}>
                                                                300x300
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {filteredData.length === 0 && (
                                            <div className="col-12 text-center py-5">
                                                <i className="ti ti-transfer fs-48 text-muted opacity-25 d-block mb-2" />
                                                <p className="text-muted fs-14">No transfer orders found</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default TransferOrderList;
