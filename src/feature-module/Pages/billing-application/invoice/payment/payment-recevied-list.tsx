// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./payment.scss";
import Datatable from "../../../../../components/dataTable";
import PageHeader from "../../../../../components/page-header/pageHeader";
import PredefinedDatePicker from "../../../../../components/common-dateRangePicker/PredefinedDatePicker";
import { all_routes } from "../../../../../routes/all_routes";
import { Dropdown, Menu } from "antd";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ReceivedPayment {
    id: number;
    paymentNumber: string;
    date: string;
    referenceNumber: string;
    customerName: string;
    invoiceNumber: string;
    mode: string;
    amount: number;
    unusedAmount: number;
    status: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const SK = "billing_received_payments";

const SEED: ReceivedPayment[] = [
    {
        id: 1,
        paymentNumber: "1",
        date: "12/05/2026",
        referenceNumber: "Raghul",
        customerName: "Mr. vijay E",
        invoiceNumber: "INV-000001",
        mode: "Cash",
        amount: 465.00,
        unusedAmount: 0.00,
        status: "Received"
    },
];

function loadPayments(): ReceivedPayment[] {
    try {
        const s = localStorage.getItem(SK);
        if (s) {
            const p = JSON.parse(s) as ReceivedPayment[];
            if (Array.isArray(p) && p.length) return p;
        }
    } catch { /**/ }
    try { localStorage.setItem(SK, JSON.stringify(SEED)); } catch { /**/ }
    return SEED;
}

const fmt = (n: number) =>
    "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2 });

const ReceivedPaymentsList: React.FC = () => {
    const navigate = useNavigate();
    const route = all_routes;

    // ── State ─────────────────────────────────────────────────────────────────
    const [payments, setPayments] = useState<ReceivedPayment[]>(() => loadPayments());
    const [searchText, setSearchText] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [loading, setLoading] = useState(false);
    const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
    const [selectedView, setSelectedView] = useState("All");
    const [showFilter, setShowFilter] = useState(false);
    const [filterModes, setFilterModes] = useState<string[]>([]);
    const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
        "Date": true,
        "Payment#": true,
        "Reference Number": true,
        "Customer Name": true,
        "Invoice#": true,
        "Mode": true,
        "Amount": true,
        "Unused Amount": true,
        "Status": true
    });
    const [showManageCols, setShowManageCols] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);

    const refreshData = () => {
        setPayments(loadPayments());
    };

    useEffect(() => {
        setPayments(loadPayments());
    }, []);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleExportPDF = () => {
        try {
            const doc = new jsPDF({ orientation: "landscape" });
            const date = new Date().toLocaleDateString();
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text("Payment Received List", 14, 18);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(120);
            doc.text(`Generated: ${date}`, 14, 25);
            doc.setTextColor(0);
            const headers = ["Date", "Payment#", "Reference", "Customer", "Invoice#", "Mode", "Amount", "Status"];
            const colWidths = [25, 28, 35, 45, 28, 22, 28, 22];
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
            filteredData.forEach((p, idx) => {
                if (idx % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(startX, startY, colWidths.reduce((a, b) => a + b, 0), rowH, "F"); }
                doc.setTextColor(50);
                const row = [p.date, p.paymentNumber, p.referenceNumber || "—", p.customerName, p.invoiceNumber, p.mode, fmt(p.amount), p.status];
                x = startX;
                row.forEach((cell, i) => { doc.text(String(cell).substring(0, 18), x + 2, startY + 6); x += colWidths[i]; });
                startY += rowH;
                if (startY > 190) { doc.addPage(); startY = 14; }
            });
            doc.save(`Payments_${date.replace(/\//g, "-")}.pdf`);
        } catch (err) {
            console.error("Failed to export PDF", err);
        }
    };

    const handleExportExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Payments");

            worksheet.columns = [
                { header: "Date", key: "date", width: 15 },
                { header: "Payment#", key: "paymentNumber", width: 15 },
                { header: "Reference", key: "referenceNumber", width: 20 },
                { header: "Customer", key: "customerName", width: 25 },
                { header: "Invoice#", key: "invoiceNumber", width: 15 },
                { header: "Mode", key: "mode", width: 15 },
                { header: "Amount", key: "amount", width: 15 },
                { header: "Status", key: "status", width: 15 },
            ];

            filteredData.forEach(p => worksheet.addRow(p));

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Payments_Export_${new Date().toLocaleDateString()}.xlsx`);
        } catch (err) {
            console.error("Failed to export Excel", err);
        }
    };

    const handleImportTrigger = () => fileInputRef.current?.click();

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                let imported = [];

                if (file.name.endsWith(".json")) {
                    imported = JSON.parse(content);
                } else if (file.name.endsWith(".csv")) {
                    const lines = content.split("\n");
                    const headers = lines[0].split(",");
                    imported = lines.slice(1).filter(l => l.trim()).map((line, i) => {
                        const values = line.split(",");
                        return {
                            id: Date.now() + i,
                            date: values[0]?.trim() || new Date().toLocaleDateString(),
                            paymentNumber: values[1]?.trim() || `PAY-${Date.now()}`,
                            referenceNumber: values[2]?.trim() || "",
                            customerName: values[3]?.trim() || "Unknown",
                            invoiceNumber: values[4]?.trim() || "",
                            mode: values[5]?.trim() || "Cash",
                            amount: parseFloat(values[6]) || 0,
                            unusedAmount: 0,
                            status: "Received"
                        };
                    });
                }

                if (imported.length) {
                    const merged = [...payments, ...imported];
                    setPayments(merged);
                    localStorage.setItem(SK, JSON.stringify(merged));
                }
            } catch (err) {
                console.error("Failed to import data", err);
            }
            // Reset input
            if (e.target) e.target.value = "";
        };
        reader.readAsText(file);
    };

    const handleResetFilter = () => {
        setFilterModes([]);
        setShowFilter(false);
    };

    const MODES = ["Cash", "Cheque", "Bank Transfer", "UPI"];

    // ── Table Columns ─────────────────────────────────────────────────────────
    const columns = [
        {
            title: "Date",
            dataIndex: "date",
            key: "Date",
            width: 100,
            render: (text: string) => <span className="fs-13 text-dark">{text}</span>,
            sorter: (a, b) => a.date.localeCompare(b.date),
        },
        {
            title: "Payment#",
            dataIndex: "paymentNumber",
            key: "Payment#",
            width: 90,
            render: (text: string, record: ReceivedPayment) => (
                <Link to={route.paymentReceivedView.replace(":id", String(record.id))} className="text-primary fw-medium fs-13">
                    {text}
                </Link>
            ),
            sorter: (a, b) => a.paymentNumber.localeCompare(b.paymentNumber),
        },
        {
            title: "Reference Number",
            dataIndex: "referenceNumber",
            key: "Reference Number",
            width: 130,
            render: (text: string) => <span className="fs-13 text-muted">{text || "—"}</span>,
            sorter: (a, b) => (a.referenceNumber || "").localeCompare(b.referenceNumber || ""),
        },
        {
            title: "Customer Name",
            dataIndex: "customerName",
            key: "Customer Name",
            render: (text: string) => <span className="fs-13 fw-medium text-dark">{text}</span>,
            sorter: (a, b) => a.customerName.localeCompare(b.customerName),
        },
        {
            title: "Invoice#",
            dataIndex: "invoiceNumber",
            key: "Invoice#",
            width: 110,
            render: (text: string) => <span className="fs-13 text-primary">{text}</span>,
            sorter: (a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber),
        },
        {
            title: "Mode",
            dataIndex: "mode",
            key: "Mode",
            width: 100,
            render: (text: string) => <span className="fs-13">{text}</span>,
            sorter: (a, b) => a.mode.localeCompare(b.mode),
        },
        {
            title: "Amount",
            dataIndex: "amount",
            key: "Amount",
            width: 110,
            align: "right" as const,
            render: (val: number) => <span className="fw-bold fs-13 text-dark">{fmt(val)}</span>,
            sorter: (a, b) => a.amount - b.amount,
        },
        {
            title: "Unused Amount",
            dataIndex: "unusedAmount",
            key: "Unused Amount",
            width: 120,
            align: "right" as const,
            render: (val: number) => <span className="fw-bold fs-13 text-dark">{fmt(val)}</span>,
            sorter: (a, b) => a.unusedAmount - b.unusedAmount,
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "Status",
            width: 100,
            render: (status: string) => {
                let color = "#16a34a";
                let bg = "#dcfce7";
                const s = status || "Received";
                if (s === "Draft") { color = "#ca8a04"; bg = "#fef9c3"; }
                if (s === "Void") { color = "#e41f07"; bg = "#fee2e2"; }
                if (s === "Refunded") { color = "#0284c7"; bg = "#e0f2fe"; }
                return (
                    <span className="badge rounded-pill px-2 py-1 fs-11 fw-bold" style={{ background: bg, color: color, textTransform: 'uppercase' }}>
                        {s === "Received" ? "PAID" : s}
                    </span>
                );
            },
            sorter: (a, b) => (a.status || "").localeCompare(b.status || ""),
        },
        {
            title: "Action",
            key: "Action",
            width: 70,
            align: "center" as const,
            render: () => (
                <Dropdown
                    placement="topLeft"
                    trigger={['click']}
                    menu={{
                        items: [
                            {
                                key: 'edit',
                                label: 'Edit',
                                icon: <i className="ti ti-edit" />,
                            },
                            {
                                key: 'delete',
                                label: 'Delete',
                                danger: true,
                                icon: <i className="ti ti-trash" />,
                            },
                        ],
                        className: "shadow-lg border-0 py-2 rounded-3",
                        style: { minWidth: 120 }
                    }}
                >
                    <Link
                        to="#"
                        onClick={e => e.preventDefault()}
                        className="d-inline-flex align-items-center justify-content-center"
                        style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #dee2e6", background: "#fff" }}
                    >
                        <i className="ti ti-dots-vertical" style={{ fontSize: 16, color: "#6c757d" }} />
                    </Link>
                </Dropdown>
            )
        }
    ];

    const visibleColumns = columns.filter(c => {
        if (c.key === "Action" || c.key === "Payment#") return true;
        return visibleCols[c.key] !== false;
    });

    // ── Logic ────────────────────────────────────────────────────────────────────
    const filteredData = payments.filter(p => {
        const matchesSearch = p.customerName.toLowerCase().includes(searchText.toLowerCase()) ||
            p.paymentNumber.toLowerCase().includes(searchText.toLowerCase()) ||
            p.invoiceNumber.toLowerCase().includes(searchText.toLowerCase());
        const matchesFilter = filterModes.length === 0 || filterModes.includes(p.mode);

        let matchesView = true;
        if (selectedView === "Received") matchesView = (p.status === "Received" || !p.status);
        else if (selectedView === "Draft") matchesView = (p.status === "Draft");
        else if (selectedView === "Unused") matchesView = (p.unusedAmount > 0);
        // "All" → matchesView stays true

        return matchesSearch && matchesFilter && matchesView;
    });

    if (sortBy === "oldest") {
        filteredData.sort((a, b) => a.id - b.id);
    } else {
        filteredData.sort((a, b) => b.id - a.id);
    }

    // ── UI Components ─────────────────────────────────────────────────────────
    const titleDropdown = (
        <div className="dropdown custom-header-dropdown">
            <div className="d-flex align-items-center gap-2 cursor-pointer" data-bs-toggle="dropdown">
                <h4 className="mb-0 fw-bold" style={{ fontSize: "18px", color: "#111" }}>
                    {selectedView === "All" ? "Payment Received" : selectedView === "Received" ? "Payment Received" : selectedView === "Draft" ? "Draft Payments" : "Unused Credits"}
                </h4>
                <i className="ti ti-chevron-down text-primary fs-14" />
                <span className="ms-2 d-flex align-items-center justify-content-center premium-count-badge-v2">{filteredData.length}</span>
            </div>
            <div className="dropdown-menu shadow-lg border-0 mt-2 py-0 overflow-hidden" style={{ minWidth: 260, borderRadius: 8 }}>
                <div style={{ maxHeight: 400, overflowY: "auto" }}>
                    {[
                        { id: "All", label: "All Payments" },
                        { id: "Received", label: "Payment Received" },
                        { id: "Draft", label: "Draft Payments" },
                        { id: "Unused", label: "Unused Credits" }
                    ].map((v) => (
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
            <div className="content pb-0 flex-grow-1 d-flex flex-column">
                <PageHeader
                    title="Payments"
                    titleDropdown={titleDropdown}
                    showModuleTile={false}
                    moduleLink="#"
                    exportComponent={moreButton}
                    onRefresh={refreshData}
                    settingsLink="#"
                />

                <div className={`card border-0 rounded-0 flex-grow-1 mb-4 d-flex flex-column ${viewMode === 'list' ? 'shadow-sm bg-white' : 'bg-transparent shadow-none'}`} style={{ borderRadius: '8px' }}>
                    {/* Card Header with Search & Add */}
                    <div className="card-header d-flex align-items-center justify-content-between gap-2 flex-wrap bg-white py-3 border-0" style={{ borderRadius: '8px 8px 0 0' }}>
                        <div className="d-flex align-items-center rounded bg-white" style={{ width: 260, border: searchFocused ? "1px solid #e41f07" : "1px solid #dee2e6", height: 36, transition: 'all 0.2s' }}>
                            <span className="px-2 d-flex align-items-center text-muted">
                                <i className="ti ti-search fs-14" />
                            </span>
                            <input
                                className="form-control border-0 ps-0 fs-14 bg-transparent"
                                style={{ outline: "none", boxShadow: "none", height: 34 }}
                                placeholder="Search payments..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                            />
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <Link
                                to={route.paymentReceivedAdd}
                                className="btn text-white d-flex align-items-center fw-bold"
                                style={{ background: "#e41f07", border: "none", borderRadius: 4, padding: "0 15px", height: 36, fontSize: 13 }}
                            >
                                <i className="ti ti-plus me-2 fs-14" /> Add New Payment
                            </Link>
                        </div>
                    </div>

                    <div className="card-body p-0 d-flex flex-column" style={{ minHeight: 0 }}>
                        {/* Toolbar */}
                        <div className="toolbar-custom py-2 px-4 d-flex align-items-center justify-content-between flex-wrap gap-2 bg-white">
                            {/* LEFT: Sort By + Date */}
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <div className="dropdown">
                                    <button className="dropdown-toggle btn btn-white px-3 border shadow-none fs-13 fw-medium premium-outline-btn" style={{ height: 38, borderRadius: 4 }} data-bs-toggle="dropdown">
                                        <i className="ti ti-arrows-sort me-1" /> Sort By
                                    </button>
                                    <div className="dropdown-menu shadow border-0 py-0 overflow-hidden" style={{ borderRadius: 8 }}>
                                        <button className={`dropdown-item py-2 ${sortBy === "newest" ? "active" : ""}`} onClick={() => setSortBy("newest")}>Newest</button>
                                        <button className={`dropdown-item py-2 ${sortBy === "oldest" ? "active" : ""}`} onClick={() => setSortBy("oldest")}>Oldest</button>
                                    </div>
                                </div>
                                <PredefinedDatePicker />
                            </div>

                            {/* RIGHT: Filter + Manage Columns + View Toggle */}
                            <div className="d-flex align-items-center gap-3 flex-wrap">
                                <div style={{ position: "relative" }}>
                                    <button
                                        className={`btn btn-white px-3 border shadow-none fs-13 d-flex align-items-center gap-2 rounded-1 premium-outline-btn ${filterModes.length > 0 ? "border-danger text-danger" : ""}`}
                                        style={{ height: 38 }}
                                        onClick={() => setShowFilter(!showFilter)}
                                    >
                                        <i className="ti ti-filter" /> Filter
                                        {filterModes.length > 0 && (
                                            <span className="premium-count-badge-v2 ms-2">{filterModes.length}</span>
                                        )}
                                        <i className="ti ti-chevron-down fs-13 ms-1" />
                                    </button>
                                    {showFilter && (
                                        <div className="dropdown-menu show shadow-lg border-0 p-0 mt-2" style={{ position: "absolute", right: 0, top: "100%", minWidth: 220, zIndex: 1060, borderRadius: 8 }}>
                                            <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-white" style={{ borderRadius: '8px 8px 0 0' }}>
                                                <h6 className="fs-14 fw-bold mb-0 text-dark">Filter by Mode</h6>
                                                <button
                                                    className="btn btn-icon btn-sm border-0 shadow-none d-flex align-items-center justify-content-center transition-all"
                                                    style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff1f0' }}
                                                    onClick={() => setShowFilter(false)}
                                                >
                                                    <i className="ti ti-x fs-12" style={{ color: '#e41f07' }} />
                                                </button>
                                            </div>
                                            <div className="p-3">
                                                {MODES.map(mode => (
                                                    <div className="form-check mb-2" key={mode}>
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            checked={filterModes.includes(mode)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setFilterModes([...filterModes, mode]);
                                                                else setFilterModes(filterModes.filter(m => m !== mode));
                                                            }}
                                                        />
                                                        <label className="form-check-label fs-13">{mode}</label>
                                                    </div>
                                                ))}
                                                <div className="d-flex gap-2 mt-3 pt-3 border-top">
                                                    <button className="btn btn-light btn-sm flex-grow-1" onClick={handleResetFilter}>Reset</button>
                                                    <button className="btn btn-danger btn-sm flex-grow-1" onClick={() => setShowFilter(false)}>Apply</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {viewMode === "list" && (
                                    <div
                                        style={{ position: "relative" }}
                                        onMouseEnter={() => setShowManageCols(true)}
                                        onMouseLeave={() => setShowManageCols(false)}
                                    >
                                        <button
                                            className="btn px-3 d-flex align-items-center gap-2 shadow-none fw-semibold transition-all"
                                            style={{ height: 38, fontSize: 13, borderRadius: 6, background: "#f0f4ff", color: "#6366f1", border: "1px solid #e0e7ff" }}
                                        >
                                            <i className="ti ti-columns-3 fs-14" /> Manage Columns
                                        </button>
                                        {showManageCols && (
                                            <div
                                                className="shadow-lg border-0 bg-white"
                                                style={{
                                                    position: "absolute",
                                                    right: 0,
                                                    top: "100%",
                                                    zIndex: 1050,
                                                    borderRadius: 12,
                                                    minWidth: 240,
                                                    overflow: 'hidden',
                                                    marginTop: 4
                                                }}
                                            >
                                                <div className="p-3">
                                                    <ul className="list-unstyled mb-0">
                                                        {Object.keys(visibleCols).map((col) => (
                                                            <li className="mb-3 d-flex align-items-center justify-content-between" key={col}>
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <i className="ti ti-grip-vertical text-muted fs-12" />
                                                                    <span className="fs-14 fw-medium text-dark">{col}</span>
                                                                </div>
                                                                <div className="form-check form-switch custom-switch-red">
                                                                    <input
                                                                        className="form-check-input"
                                                                        type="checkbox"
                                                                        role="switch"
                                                                        checked={visibleCols[col]}
                                                                        onChange={() => setVisibleCols(prev => ({ ...prev, [col]: !prev[col] }))}
                                                                    />
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="d-flex align-items-center border rounded-3 p-1 bg-white shadow-sm" style={{ height: 38, borderColor: '#e2e8f0' }}>
                                    <button
                                        onClick={() => setViewMode("list")}
                                        className="d-flex align-items-center justify-content-center transition-all"
                                        style={{
                                            width: 32,
                                            height: 30,
                                            border: "none",
                                            background: viewMode === "list" ? "#26a69a" : "transparent",
                                            color: viewMode === "list" ? "#fff" : "#6c757d",
                                            borderRadius: 6
                                        }}
                                    >
                                        <i className="ti ti-list fs-16" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode("grid")}
                                        className="d-flex align-items-center justify-content-center transition-all"
                                        style={{
                                            width: 32,
                                            height: 30,
                                            border: "none",
                                            background: viewMode === "grid" ? "#26a69a" : "transparent",
                                            color: viewMode === "grid" ? "#fff" : "#6c757d",
                                            borderRadius: 6
                                        }}
                                    >
                                        <i className="ti ti-grid-dots fs-16" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-grow-1" style={{ position: "relative" }}>
                            {viewMode === "list" ? (
                                <div className="custom-table table-responsive px-4 flex-grow-1 border-0 bg-white">
                                    <Datatable
                                        columns={visibleColumns}
                                        dataSource={filteredData}
                                        Selection={true}
                                        className="invoice-table compact-table"
                                        pagination={false}
                                        onRow={(record: ReceivedPayment) => ({
                                            onClick: () => navigate(route.paymentReceivedView.replace(":id", String(record.id))),
                                            style: { cursor: "pointer" },
                                        })}
                                    />
                                    {filteredData.length === 0 && (
                                        <div className="text-center py-5 bg-white">
                                            <i className="ti ti-package fs-48 text-muted opacity-25 d-block mb-2" />
                                            <p className="text-muted fs-14">No data found</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="py-4" style={{ minHeight: '100%', backgroundColor: '#f4f7fa' }}>
                                    <div className="row g-4">
                                        {filteredData.map(p => (
                                            <div key={p.id} className="col-xxl-3 col-lg-4 col-md-6 col-sm-12">
                                                <div className="card border-0 shadow-sm rounded-3 h-100 bg-white hover-shadow transition-all overflow-hidden mx-auto" style={{ maxWidth: '380px' }}>
                                                    <div className="card-body p-3 d-flex flex-column">
                                                        {/* Header: Avatar + Title + Menu */}
                                                        <div className="d-flex align-items-center mb-4">
                                                            <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold fs-14 me-3 shadow-sm border" style={{ width: 42, height: 42, background: '#f3f4f6', color: '#475569', borderColor: '#e2e8f0' }}>
                                                                {p.customerName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                                                            </div>
                                                            <div className="flex-grow-1 overflow-hidden">
                                                                <h6 className="mb-0 fw-bold fs-15 text-dark text-truncate" title={p.customerName}>{p.customerName}</h6>
                                                                <div className="text-muted fs-12 mt-1 fw-medium">{p.paymentNumber}</div>
                                                            </div>
                                                            <div className="dropdown">
                                                                <button className="btn btn-white border-0 d-flex align-items-center justify-content-center p-0 shadow-none" style={{ width: 24, height: 24, borderRadius: 4 }} data-bs-toggle="dropdown">
                                                                    <i className="ti ti-dots-vertical text-muted fs-16" />
                                                                </button>
                                                                <div className="dropdown-menu dropdown-menu-end shadow-lg border-0 mt-2" style={{ borderRadius: 8 }}>
                                                                    <Link className="dropdown-item fs-13 py-2" to="#"><i className="ti ti-edit me-2" /> Edit</Link>
                                                                    <Link className="dropdown-item fs-13 py-2 text-danger" to="#"><i className="ti ti-trash me-2" /> Delete</Link>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Body: Details */}
                                                        <div className="mb-4 flex-grow-1">
                                                            <div className="d-flex align-items-center gap-2 mb-2 text-muted fs-13">
                                                                <i className="ti ti-mail fs-14 opacity-75" /> <span className="text-truncate">payment-{p.paymentNumber}@example.com</span>
                                                            </div>
                                                            <div className="d-flex align-items-center gap-2 mb-2 text-muted fs-13">
                                                                <i className="ti ti-phone fs-14 opacity-75" /> <span>1234567890</span>
                                                            </div>
                                                            <div className="d-flex align-items-center gap-2 text-muted fs-13">
                                                                <i className="ti ti-map-pin fs-14 opacity-75" /> <span className="text-truncate">India, {p.mode}</span>
                                                            </div>
                                                        </div>

                                                        {/* Status Tags */}
                                                        <div className="d-flex gap-2 mb-4">
                                                            <span className="badge rounded-pill px-3 py-1 fs-10 fw-bold shadow-none" style={{ background: '#ecfdf5', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Received</span>
                                                            <span className="badge rounded-pill px-3 py-1 fs-10 fw-bold shadow-none" style={{ background: '#fffbeb', color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Paid</span>
                                                        </div>

                                                        {/* Footer: Social & Financials */}
                                                        <div className="pt-3 border-top d-flex justify-content-between align-items-center mt-auto">
                                                            <div className="d-flex gap-3 text-muted">
                                                                <i className="ti ti-mail fs-15 hover-text-primary cursor-pointer transition-all" title="Email" />
                                                                <i className="ti ti-phone-call fs-15 hover-text-primary cursor-pointer transition-all" title="Call" />
                                                                <i className="ti ti-message-2 fs-15 hover-text-primary cursor-pointer transition-all" title="Message" />
                                                                <i className="ti ti-brand-facebook fs-15 hover-text-primary cursor-pointer transition-all" title="Facebook" />
                                                            </div>
                                                            <div className="fs-16 fw-bold" style={{ color: "#e41f07" }}>{fmt(p.amount)}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
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

export default ReceivedPaymentsList;
