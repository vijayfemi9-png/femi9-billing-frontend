// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Datatable from "../../../../components/dataTable";
import PageHeader from "../../../../components/page-header/pageHeader";
import PredefinedDatePicker from "../../../../components/common-dateRangePicker/PredefinedDatePicker";
import { all_routes } from "../../../../routes/all_routes";
import { Dropdown } from "antd";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "./inventory.scss";

// ── Types ─────────────────────────────────────────────────────────────────────
interface InventoryAdjustment {
    id: number;
    date: string;
    reason: string;
    description: string;
    status: "Adjusted" | "Draft";
    referenceNumber: string;
    type: "Quantity" | "Value";
    createdBy: string;
    createdTime: string;
    lastModifiedBy: string;
    lastModifiedTime: string;
    location: string;
}

// ── Storage / Seed ────────────────────────────────────────────────────────────
const SK = "billing_inventory_adjustments";

const SEED: InventoryAdjustment[] = [
    {
        id: 1,
        date: "18/05/2026",
        reason: "Stolen goods",
        description: "Items stolen from warehouse",
        status: "Adjusted",
        referenceNumber: "12",
        type: "Quantity",
        createdBy: "vickyyfemi9",
        createdTime: "18/05/2026 11:29 AM",
        lastModifiedBy: "vickyyfemi9",
        lastModifiedTime: "18/05/2026 11:29 AM",
        location: "Head Office",
    },
];

function loadAdjustments(): InventoryAdjustment[] {
    try {
        const s = localStorage.getItem(SK);
        if (s) {
            const p = JSON.parse(s) as InventoryAdjustment[];
            if (Array.isArray(p) && p.length) return p;
        }
    } catch { /**/ }
    try { localStorage.setItem(SK, JSON.stringify(SEED)); } catch { /**/ }
    return SEED;
}

const STATUS_CLASS: Record<string, string> = {
    "Adjusted": "badge-soft-success",
    "Draft":    "badge-soft-warning",
};

const PERIOD_OPTIONS = ["All", "Today", "This Week", "This Month", "This Quarter", "This Year"];

const VIEWS = [
    { id: "All",      label: "All Adjustments" },
    { id: "Adjusted", label: "Adjusted" },
    { id: "Draft",    label: "Draft" },
];

function filterByPeriod(items: InventoryAdjustment[], period: string): InventoryAdjustment[] {
    if (period === "All") return items;
    const now = new Date();
    return items.filter(item => {
        const parts = item.date.split("/");
        if (parts.length < 3) return true;
        const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        if (period === "Today")        return d.toDateString() === now.toDateString();
        if (period === "This Week") {
            const ws = new Date(now); ws.setDate(now.getDate() - now.getDay());
            const we = new Date(ws); we.setDate(ws.getDate() + 6);
            return d >= ws && d <= we;
        }
        if (period === "This Month")   return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (period === "This Quarter") return Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3) && d.getFullYear() === now.getFullYear();
        if (period === "This Year")    return d.getFullYear() === now.getFullYear();
        return true;
    });
}

// ── Component ─────────────────────────────────────────────────────────────────
const InventoryAdjustmentList: React.FC = () => {
    const navigate = useNavigate();
    const route    = all_routes;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [adjustments,   setAdjustments]   = useState<InventoryAdjustment[]>(() => loadAdjustments());
    const [searchText,    setSearchText]    = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    const [viewMode,      setViewMode]      = useState<"list" | "grid">("list");
    const [selectedView,  setSelectedView]  = useState("All");
    const [filterType,    setFilterType]    = useState("All");
    const [filterPeriod,  setFilterPeriod]  = useState("All");
    const [showFilter,    setShowFilter]    = useState(false);
    const [filterStatus,  setFilterStatus]  = useState<string[]>([]);
    const [visibleCols,   setVisibleCols]   = useState<Record<string, boolean>>({
        "Date": true, "Reason": true, "Description": true, "Status": true,
        "Reference N...": true, "Type": true, "Created By": true,
        "Created Time": true, "Last Modified By": true, "Last Modified Time": true, "Location": true,
    });

    useEffect(() => { setAdjustments(loadAdjustments()); }, []);
    const refreshData = () => setAdjustments(loadAdjustments());

    const handleDelete = (id: number) => {
        if (!window.confirm("Delete this adjustment?")) return;
        const updated = adjustments.filter(a => a.id !== id);
        setAdjustments(updated);
        localStorage.setItem(SK, JSON.stringify(updated));
    };

    // ── Filter ─────────────────────────────────────────────────────────────────
    const filteredData = (() => {
        let data = adjustments;
        const q  = searchText.toLowerCase();
        if (q) data = data.filter(a =>
            a.reason.toLowerCase().includes(q) ||
            a.referenceNumber.toLowerCase().includes(q) ||
            a.createdBy.toLowerCase().includes(q) ||
            a.location.toLowerCase().includes(q) ||
            a.status.toLowerCase().includes(q)
        );
        if (selectedView !== "All")  data = data.filter(a => a.status === selectedView);
        if (filterType   !== "All")  data = data.filter(a => a.type   === filterType);
        if (filterStatus.length > 0) data = data.filter(a => filterStatus.includes(a.status));
        data = filterByPeriod(data, filterPeriod);
        return [...data].sort((a, b) => b.id - a.id);
    })();

    // ── Export PDF ─────────────────────────────────────────────────────────────
    const handleExportPDF = () => {
        try {
            const doc  = new jsPDF({ orientation: "landscape" });
            const date = new Date().toLocaleDateString();
            doc.setFontSize(16); doc.setFont("helvetica", "bold");
            doc.text("Inventory Adjustments", 14, 18);
            doc.setFontSize(10); doc.setFont("helvetica", "normal");
            doc.setTextColor(120); doc.text(`Generated: ${date}`, 14, 25); doc.setTextColor(0);
            const headers   = ["Date", "Reason", "Status", "Ref#", "Type", "Created By", "Location"];
            const colWidths = [28, 46, 28, 20, 22, 34, 34];
            const startX = 14; let startY = 34; const rowH = 9;
            doc.setFillColor(37, 99, 235);
            doc.rect(startX, startY, colWidths.reduce((a, b) => a + b, 0), rowH, "F");
            doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
            let x = startX;
            headers.forEach((h, i) => { doc.text(h, x + 2, startY + 6); x += colWidths[i]; });
            doc.setFont("helvetica", "normal"); startY += rowH;
            filteredData.forEach((a, idx) => {
                if (idx % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(startX, startY, colWidths.reduce((s, b) => s + b, 0), rowH, "F"); }
                doc.setTextColor(50);
                const row = [a.date, a.reason || "—", a.status, a.referenceNumber, a.type, a.createdBy, a.location];
                x = startX;
                row.forEach((cell, i) => { doc.text(String(cell).substring(0, 22), x + 2, startY + 6); x += colWidths[i]; });
                startY += rowH;
                if (startY > 190) { doc.addPage(); startY = 14; }
            });
            doc.save(`InventoryAdjustments_${date.replace(/\//g, "-")}.pdf`);
        } catch (err) { console.error("Failed to export PDF", err); }
    };

    // ── Export Excel ───────────────────────────────────────────────────────────
    const handleExportExcel = async () => {
        try {
            const workbook  = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Inventory Adjustments");
            worksheet.columns = [
                { header: "Date",               key: "date",             width: 15 },
                { header: "Reason",             key: "reason",           width: 25 },
                { header: "Description",        key: "description",      width: 30 },
                { header: "Status",             key: "status",           width: 15 },
                { header: "Reference Number",   key: "referenceNumber",  width: 18 },
                { header: "Type",               key: "type",             width: 12 },
                { header: "Created By",         key: "createdBy",        width: 18 },
                { header: "Created Time",       key: "createdTime",      width: 22 },
                { header: "Last Modified By",   key: "lastModifiedBy",   width: 18 },
                { header: "Last Modified Time", key: "lastModifiedTime", width: 22 },
                { header: "Location",           key: "location",         width: 18 },
            ];
            filteredData.forEach(a => worksheet.addRow(a));
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `InventoryAdjustments_${new Date().toLocaleDateString()}.xlsx`);
        } catch (err) { console.error("Failed to export Excel", err); }
    };

    // ── Table Columns ──────────────────────────────────────────────────────────
    const columns = [
        {
            title: "DATE",
            dataIndex: "date", key: "Date", width: 110,
            render: (text: string) => <span className="fs-14 fw-medium text-dark">{text}</span>,
            sorter: (a, b) => a.date.localeCompare(b.date),
        },
        {
            title: "REASON",
            dataIndex: "reason", key: "Reason",
            render: (text: string) => <span className="fs-14 fw-medium text-dark">{text || "—"}</span>,
            sorter: (a, b) => (a.reason || "").localeCompare(b.reason || ""),
        },
        {
            title: "DESCRIPTION",
            dataIndex: "description", key: "Description", width: 120, align: "center" as const,
            render: (text: string) => text
                ? <i className="ti ti-notes fs-16 text-muted" style={{ cursor: "default" }} title={text} />
                : null,
        },
        {
            title: "STATUS",
            dataIndex: "status", key: "Status", width: 140,
            render: (status: string, record: InventoryAdjustment) => (
                <Link
                    to={route.inventoryAdjustmentView?.replace(":id", String(record.id)) || "#"}
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
            title: "REFERENCE N...",
            dataIndex: "referenceNumber", key: "Reference N...", width: 140,
            render: (text: string, record: InventoryAdjustment) => (
                <Link
                    to={route.inventoryAdjustmentView?.replace(":id", String(record.id)) || "#"}
                    className="fs-14 fw-medium text-danger"
                    style={{ textDecoration: "none", color: "#e41f07" }}
                    onClick={e => e.stopPropagation()}
                >
                    {text || "—"}
                </Link>
            ),
            sorter: (a, b) => (a.referenceNumber || "").localeCompare(b.referenceNumber || ""),
        },
        {
            title: "TYPE",
            dataIndex: "type", key: "Type", width: 100,
            render: (text: string) => <span className="fs-14 fw-medium text-dark">{text}</span>,
            sorter: (a, b) => a.type.localeCompare(b.type),
        },
        {
            title: "CREATED BY",
            dataIndex: "createdBy", key: "Created By", width: 130,
            render: (text: string) => <span className="fs-14 fw-medium text-dark">{text}</span>,
            sorter: (a, b) => a.createdBy.localeCompare(b.createdBy),
        },
        {
            title: "CREATED TI...",
            dataIndex: "createdTime", key: "Created Time", width: 155,
            render: (text: string) => <span className="fs-14 fw-medium text-muted">{text}</span>,
            sorter: (a, b) => a.createdTime.localeCompare(b.createdTime),
        },
        {
            title: "LAST MODIFI...",
            dataIndex: "lastModifiedBy", key: "Last Modified By", width: 140,
            render: (text: string) => <span className="fs-14 fw-medium text-dark">{text}</span>,
            sorter: (a, b) => a.lastModifiedBy.localeCompare(b.lastModifiedBy),
        },
        {
            title: "LAST MODIFI...",
            dataIndex: "lastModifiedTime", key: "Last Modified Time", width: 155,
            render: (text: string) => <span className="fs-14 fw-medium text-muted">{text}</span>,
            sorter: (a, b) => a.lastModifiedTime.localeCompare(b.lastModifiedTime),
        },
        {
            title: "LOCATION",
            dataIndex: "location", key: "Location", width: 130,
            render: (text: string) => <span className="fs-14 fw-medium text-dark">{text}</span>,
            sorter: (a, b) => a.location.localeCompare(b.location),
        },
        {
            title: <i className="ti ti-search fs-14 text-muted" />,
            key: "action", width: 56, align: "center" as const,
            render: (_: any, record: InventoryAdjustment) => (
                <Dropdown
                    placement="bottomLeft"
                    trigger={["click"]}
                    menu={{
                        items: [
                            {
                                key: "view", label: "View", icon: <i className="ti ti-eye" />,
                                onClick: ({ domEvent }) => { domEvent.stopPropagation(); navigate(route.inventoryAdjustmentView?.replace(":id", String(record.id)) || "#"); },
                            },
                            {
                                key: "edit", label: "Edit", icon: <i className="ti ti-edit" />,
                                onClick: ({ domEvent }) => { domEvent.stopPropagation(); navigate((route.inventoryAdjustmentAdd || "#") + "?edit=" + record.id); },
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
                        <i className="ti ti-dots-vertical" style={{ fontSize: 16, color: "#6c757d" }} />
                    </button>
                </Dropdown>
            ),
        },
    ];

    const visibleColumns = columns.filter(c => {
        if (c.key === "action") return true;
        return visibleCols[c.key as string] !== false;
    });

    // ── Title Dropdown (Zoho-style view selector + count badge) ────────────────
    const titleDropdown = (
        <div className="dropdown custom-header-dropdown">
            <div className="d-flex align-items-center gap-2 cursor-pointer" data-bs-toggle="dropdown">
                <h4 className="mb-0 fw-bold" style={{ fontSize: "18px", color: "#111" }}>
                    {VIEWS.find(v => v.id === selectedView)?.label || "All Adjustments"}
                </h4>
                <i className="ti ti-chevron-down text-primary fs-14" />
                <span className="ms-2 d-flex align-items-center justify-content-center premium-count-badge-v2">
                    {filteredData.length}
                </span>
            </div>
            <div className="dropdown-menu shadow-lg border-0 mt-2 py-0 overflow-hidden" style={{ minWidth: 240, borderRadius: 8 }}>
                <div style={{ maxHeight: 300, overflowY: "auto" }}>
                    {VIEWS.map(v => (
                        <div
                            key={v.id}
                            className={`dropdown-item px-3 py-2 d-flex align-items-center justify-content-between cursor-pointer ${selectedView === v.id ? "active" : ""}`}
                            onClick={() => setSelectedView(v.id)}
                        >
                            <span className="fs-14 fw-medium text-dark">{v.label}</span>
                            <span className="badge rounded-pill fs-11" style={{
                                background: v.id === "Adjusted" ? "rgb(232,248,231)" : v.id === "Draft" ? "rgb(254,248,230)" : "#f3f4f6",
                                color:      v.id === "Adjusted" ? "#1ABE17"           : v.id === "Draft" ? "#f9b801"           : "#6b7280",
                            }}>
                                {adjustments.filter(a => v.id === "All" || a.status === v.id).length}
                            </span>
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
                    title="Inventory Adjustments"
                    titleDropdown={titleDropdown}
                    showModuleTile={false}
                    moduleLink="#"
                    exportComponent={moreButton}
                    onRefresh={refreshData}
                    settingsLink="#"
                />


                <div className={`card border-0 rounded-0 flex-grow-1 mb-4 d-flex flex-column ${viewMode === "list" ? "shadow-sm bg-white" : "bg-transparent shadow-none"}`}>

                    {/* Card Header: search + New button */}
                    <div className="card-header d-flex align-items-center justify-content-between gap-2 flex-wrap bg-white py-3 border-0 px-3 px-sm-4" style={{ borderRadius: "8px 8px 0 0" }}>
                        <div
                            className="d-flex align-items-center rounded bg-white flex-grow-1"
                            style={{ maxWidth: 320, minWidth: 160, border: searchFocused ? "1px solid #e41f07" : "1px solid #dee2e6", height: 36, transition: "all 0.2s" }}
                        >
                            <span className="px-2 d-flex align-items-center text-muted"><i className="ti ti-search fs-14" /></span>
                            <input
                                className="form-control border-0 ps-0 fs-14 bg-transparent"
                                style={{ outline: "none", boxShadow: "none", height: 34 }}
                                placeholder="Search adjustments..."
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                            />
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <Link
                                to={route.inventoryAdjustmentAdd || "#"}
                                className="btn text-white d-flex align-items-center fw-bold"
                                style={{ background: "#e41f07", border: "none", borderRadius: 4, padding: "0 15px", height: 36, fontSize: 13, whiteSpace: "nowrap" }}
                            >
                                <i className="ti ti-plus me-2 fs-14" /> New
                            </Link>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="toolbar-custom py-2 px-3 px-sm-4 d-flex align-items-center justify-content-between flex-wrap gap-2 bg-white">
                        {/* LEFT */}
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                            <div className="dropdown">
                                <button
                                    className="dropdown-toggle btn btn-white px-3 border shadow-none fs-13 fw-medium premium-outline-btn"
                                    style={{ height: 38, borderRadius: 4, whiteSpace: "nowrap" }}
                                    data-bs-toggle="dropdown"
                                >
                                    Type: {filterType}
                                </button>
                                <div className="dropdown-menu shadow border-0 py-0 overflow-hidden" style={{ borderRadius: 8, minWidth: 140 }}>
                                    {["All", ...Array.from(new Set(adjustments.map(a => a.type).filter(Boolean)))].map(opt => (
                                        <button key={opt} className={`dropdown-item py-2 fs-13 ${filterType === opt ? "active" : ""}`} onClick={() => setFilterType(opt)}>
                                            {opt}
                                        </button>
                                    ))}
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
                                            {["Adjusted", "Draft"].map(s => (
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
                                                            <span className="fs-14 fw-medium text-dark">{col}</span>
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
                                    className="invoice-table compact-table"
                                    pagination={false}
                                    onRow={(record: InventoryAdjustment) => ({
                                        onClick: () => navigate(route.inventoryAdjustmentView?.replace(":id", String(record.id)) || "#"),
                                        style: { cursor: "pointer" },
                                    })}
                                />
                                {filteredData.length === 0 && (
                                    <div className="text-center py-5 bg-white">
                                        <i className="ti ti-adjustments fs-48 text-muted opacity-25 d-block mb-2" />
                                        <p className="text-muted fs-14">No inventory adjustments found</p>
                                        <Link to={route.inventoryAdjustmentAdd || "#"} className="btn btn-primary mt-2">
                                            <i className="ti ti-plus me-2" /> New Adjustment
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="py-4 px-2" style={{ minHeight: "100%", backgroundColor: "#f4f7fa" }}>
                                <div className="row g-4">
                                    {filteredData.map(a => {
                                        const stCls = STATUS_CLASS[a.status] || "badge-soft-secondary";
                                        return (
                                            <div key={a.id} className="col-xxl-3 col-xl-4 col-lg-4 col-md-6 col-sm-12">
                                                <div
                                                    onClick={() => navigate(route.inventoryAdjustmentView?.replace(":id", String(a.id)) || "#")}
                                                    style={{ background: "#fff", borderRadius: 8, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.04)", border: "1px solid #e5e7eb", cursor: "pointer", transition: "all 0.2s" }}
                                                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
                                                >
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                                                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                                            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1e293b", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                                <i className="ti ti-adjustments" style={{ fontSize: 18 }} />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>Ref# {a.referenceNumber || a.id}</div>
                                                                <div style={{ fontSize: 12, color: "#6b7280" }}>{a.date}</div>
                                                            </div>
                                                        </div>
                                                        <span className={`badge fs-10 fw-bold text-uppercase ${stCls}`}>{a.status}</span>
                                                    </div>
                                                    <div style={{ height: 1, background: "#f3f4f6", margin: "0 -20px 14px" }} />
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "#4b5563" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                            <i className="ti ti-tag" style={{ fontSize: 14, color: "#9ca3af" }} />
                                                            {a.reason || "—"}
                                                        </div>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                            <i className="ti ti-building-warehouse" style={{ fontSize: 14, color: "#9ca3af" }} />
                                                            {a.location}
                                                        </div>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                            <i className="ti ti-box" style={{ fontSize: 14, color: "#9ca3af" }} />
                                                            {a.type}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {filteredData.length === 0 && (
                                        <div className="col-12 text-center py-5">
                                            <i className="ti ti-adjustments fs-48 text-muted opacity-25 d-block mb-2" />
                                            <p className="text-muted fs-14">No inventory adjustments found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventoryAdjustmentList;
