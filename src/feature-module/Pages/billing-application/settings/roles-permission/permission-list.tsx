// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Datatable from "../../../../../components/dataTable";
import PageHeader from "../../../../../components/page-header/pageHeader";
import PredefinedDatePicker from "../../../../../components/common-dateRangePicker/PredefinedDatePicker";
import { all_routes } from "../../../../../routes/all_routes";
import { Dropdown } from "antd";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "./permission.scss";

// ── Types ──────────────────────────────────────────────────────────────────────
interface PermissionSet { view: boolean; create: boolean; edit: boolean; delete: boolean; }
interface Role {
    id: number;
    roleName: string;
    description: string;
    status: "Active" | "Inactive";
    usersCount: number;
    permissions: Record<string, PermissionSet>;
    createdBy: string;
    createdTime: string;
    lastModifiedBy: string;
    lastModifiedTime: string;
}

// ── Storage / Seed ─────────────────────────────────────────────────────────────
const SK = "billing_roles_permissions";
const MODULES = ["Dashboard", "Customers", "Products", "Price Lists", "Composite Items", "Invoices", "Payments Received", "Credit Notes", "Transfer Orders", "Inventory Adjustments", "Reports", "Settings"];

function allPerms(): Record<string, PermissionSet> {
    return Object.fromEntries(MODULES.map(m => [m, { view: true, create: true, edit: true, delete: true }]));
}
function noPerms(): Record<string, PermissionSet> {
    return Object.fromEntries(MODULES.map(m => [m, { view: false, create: false, edit: false, delete: false }]));
}
function salesPerms(): Record<string, PermissionSet> {
    const p = noPerms();
    p["Dashboard"] = { view: true, create: false, edit: false, delete: false };
    p["Customers"] = { view: true, create: true, edit: true, delete: false };
    p["Invoices"] = { view: true, create: true, edit: true, delete: false };
    p["Products"] = { view: true, create: false, edit: false, delete: false };
    p["Payments Received"] = { view: true, create: true, edit: false, delete: false };
    p["Reports"] = { view: true, create: false, edit: false, delete: false };
    return p;
}
function accountPerms(): Record<string, PermissionSet> {
    const p = noPerms();
    p["Dashboard"] = { view: true, create: false, edit: false, delete: false };
    p["Invoices"] = { view: true, create: true, edit: true, delete: false };
    p["Payments Received"] = { view: true, create: true, edit: true, delete: false };
    p["Credit Notes"] = { view: true, create: true, edit: true, delete: false };
    p["Reports"] = { view: true, create: false, edit: false, delete: false };
    return p;
}
function viewOnlyPerms(): Record<string, PermissionSet> {
    return Object.fromEntries(MODULES.map(m => [m, { view: true, create: false, edit: false, delete: false }]));
}

const SEED: Role[] = [
    { id: 1, roleName: "Administrator", description: "Full access to all modules and features", status: "Active", usersCount: 2, permissions: allPerms(), createdBy: "vickyyfemi9", createdTime: "01/01/2026 09:00 AM", lastModifiedBy: "vickyyfemi9", lastModifiedTime: "01/01/2026 09:00 AM" },
    { id: 2, roleName: "Sales Manager", description: "Access to sales, customers and reports", status: "Active", usersCount: 3, permissions: salesPerms(), createdBy: "vickyyfemi9", createdTime: "05/01/2026 10:00 AM", lastModifiedBy: "vickyyfemi9", lastModifiedTime: "05/01/2026 10:00 AM" },
    { id: 3, roleName: "Accountant", description: "Access to billing, payments and reports only", status: "Active", usersCount: 1, permissions: accountPerms(), createdBy: "vickyyfemi9", createdTime: "10/01/2026 11:00 AM", lastModifiedBy: "vickyyfemi9", lastModifiedTime: "10/01/2026 11:00 AM" },
    { id: 4, roleName: "Viewer", description: "Read-only access to all modules", status: "Inactive", usersCount: 0, permissions: viewOnlyPerms(), createdBy: "vickyyfemi9", createdTime: "15/01/2026 02:00 PM", lastModifiedBy: "vickyyfemi9", lastModifiedTime: "15/01/2026 02:00 PM" },
];

function loadRoles(): Role[] {
    try {
        const s = localStorage.getItem(SK);
        if (s) { const p = JSON.parse(s) as Role[]; if (Array.isArray(p) && p.length) return p; }
    } catch { /**/ }
    try { localStorage.setItem(SK, JSON.stringify(SEED)); } catch { /**/ }
    return SEED;
}
function saveRoles(data: Role[]) { try { localStorage.setItem(SK, JSON.stringify(data)); } catch { /**/ } }
function updateStatus(id: number, status: Role["status"]): Role[] {
    const all = loadRoles();
    const updated = all.map(r => r.id === id ? { ...r, status } : r);
    saveRoles(updated);
    return updated;
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
    "Active": { background: "#dcfce7", color: "#15803d", border: "1px solid #86efac" },
    "Inactive": { background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db" },
};

const DeleteConfirm = ({ roleName, onConfirm, onCancel }: { roleName: string; onConfirm: () => void; onCancel: () => void }) => (
    <>
        <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} />
        <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12 }}>
                    <div className="modal-body p-4 text-center">
                        <div className="mb-3"><i className="ti ti-trash text-danger" style={{ fontSize: 48 }} /></div>
                        <h5 className="mb-2 fw-bold text-dark">Delete Role?</h5>
                        <p className="text-muted mb-4 fs-14">Are you sure you want to delete <strong>{roleName}</strong>? This action cannot be undone.</p>
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
    { id: "Active", label: "Active" },
    { id: "Inactive", label: "Inactive" },
];

// ── Component ──────────────────────────────────────────────────────────────────
const PermissionList: React.FC = () => {
    const navigate = useNavigate();
    const route = all_routes;

    const [del, setDel] = useState<{ roleName: string; onConfirm: () => void } | null>(null);
    const [views, setViews] = useState(INITIAL_VIEWS);
    const [newViewName, setNewViewName] = useState("");
    const [roles, setRoles] = useState<Role[]>(() => loadRoles());
    const [searchText, setSearchText] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [selectedView, setSelectedView] = useState("All");
    const [showFilter, setShowFilter] = useState(false);
    const [showSortBy, setShowSortBy] = useState(false);
    const [sortBy, setSortBy] = useState("date-desc");
    const [filterStatus, setFilterStatus] = useState<string[]>([]);
    const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
        "Role Name": true, "Description": true, "Users Count": true, "Status": true,
        "Created By": true, "Created Time": true, "Last Modified By": true, "Last Modified Time": true,
    });

    useEffect(() => { setRoles(loadRoles()); }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const t = e.target as HTMLElement;
            if (!t.closest("[data-sortby-dropdown]")) setShowSortBy(false);
            if (!t.closest("[data-filter-dropdown]")) setShowFilter(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const refreshData = () => setRoles(loadRoles());

    const handleDeleteClick = (roleName: string, id: number) => {
        setDel({
            roleName,
            onConfirm: () => {
                const updated = roles.filter(r => r.id !== id);
                setRoles(updated);
                saveRoles(updated);
                setDel(null);
            }
        });
    };

    const handleSaveView = () => {
        if (newViewName.trim()) {
            const v = { id: newViewName.trim(), label: newViewName.trim() };
            setViews([...views, v]);
            setSelectedView(v.id);
            setNewViewName("");
        }
    };

    // ── Filter & Sort ──────────────────────────────────────────────────────────
    const filteredData = (() => {
        let data = roles;
        const q = searchText.toLowerCase();
        if (q) data = data.filter(r =>
            r.roleName.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q) ||
            r.status.toLowerCase().includes(q) ||
            r.createdBy.toLowerCase().includes(q)
        );
        if (selectedView !== "All") data = data.filter(r => r.status === selectedView);
        if (filterStatus.length > 0) data = data.filter(r => filterStatus.includes(r.status));
        return [...data].sort((a, b) => {
            switch (sortBy) {
                case "name-asc": return a.roleName.localeCompare(b.roleName);
                case "name-desc": return b.roleName.localeCompare(a.roleName);
                case "status-asc": return a.status.localeCompare(b.status);
                case "status-desc": return b.status.localeCompare(a.status);
                case "users-asc": return a.usersCount - b.usersCount;
                case "users-desc": return b.usersCount - a.usersCount;
                case "date-asc": return a.createdTime.localeCompare(b.createdTime);
                default: return b.createdTime.localeCompare(a.createdTime);
            }
        });
    })();

    // ── Export PDF ─────────────────────────────────────────────────────────────
    const handleExportPDF = () => {
        try {
            const doc = new jsPDF({ orientation: "landscape" });
            const date = new Date().toLocaleDateString();
            doc.setFontSize(16); doc.setFont("helvetica", "bold");
            doc.text("Roles & Permissions", 14, 18);
            doc.setFontSize(10); doc.setFont("helvetica", "normal");
            doc.setTextColor(120); doc.text(`Generated: ${date}`, 14, 25); doc.setTextColor(0);
            const headers = ["Role Name", "Description", "Users", "Status", "Created By", "Created Time"];
            const colWidths = [40, 70, 18, 22, 35, 45];
            const startX = 14; let startY = 34; const rowH = 9;
            doc.setFillColor(107, 114, 128);
            doc.rect(startX, startY, colWidths.reduce((a, b) => a + b, 0), rowH, "F");
            doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
            let x = startX;
            headers.forEach((h, i) => { doc.text(h, x + 2, startY + 6); x += colWidths[i]; });
            doc.setFont("helvetica", "normal"); startY += rowH;
            filteredData.forEach((r, idx) => {
                if (idx % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(startX, startY, colWidths.reduce((s, b) => s + b, 0), rowH, "F"); }
                doc.setTextColor(50);
                const row = [r.roleName, r.description.substring(0, 35), String(r.usersCount), r.status, r.createdBy, r.createdTime];
                x = startX;
                row.forEach((cell, i) => { doc.text(String(cell).substring(0, 22), x + 2, startY + 6); x += colWidths[i]; });
                startY += rowH;
                if (startY > 190) { doc.addPage(); startY = 14; }
            });
            doc.save(`Roles_${date.replace(/\//g, "-")}.pdf`);
        } catch (err) { console.error("PDF export failed", err); }
    };

    // ── Export Excel ───────────────────────────────────────────────────────────
    const handleExportExcel = async () => {
        try {
            const wb = new ExcelJS.Workbook();
            const ws = wb.addWorksheet("Roles & Permissions");
            ws.columns = [
                { header: "Role Name", key: "roleName", width: 22 },
                { header: "Description", key: "description", width: 40 },
                { header: "Users Count", key: "usersCount", width: 14 },
                { header: "Status", key: "status", width: 12 },
                { header: "Created By", key: "createdBy", width: 18 },
                { header: "Created Time", key: "createdTime", width: 22 },
                { header: "Last Modified By", key: "lastModifiedBy", width: 18 },
                { header: "Last Modified Time", key: "lastModifiedTime", width: 22 },
            ];
            filteredData.forEach(r => ws.addRow(r));
            const buf = await wb.xlsx.writeBuffer();
            saveAs(new Blob([buf]), `Roles_${new Date().toLocaleDateString()}.xlsx`);
        } catch (err) { console.error("Excel export failed", err); }
    };

    const th = (text: string) => <span style={{ fontSize: 13, fontWeight: 600, color: "#212529" }}>{text}</span>;

    // ── Columns ────────────────────────────────────────────────────────────────
    const columns = [
        {
            title: th("Role Name"), dataIndex: "roleName", key: "Role Name", width: 180,
            render: (text: string, record: Role) => (
                <Link to={(route.settingsRoleView || "#").replace(":id", String(record.id))} className="fs-13 fw-semibold" style={{ textDecoration: "none", color: "#e41f07" }} onClick={e => e.stopPropagation()}>{text}</Link>
            ),
            sorter: (a: Role, b: Role) => a.roleName.localeCompare(b.roleName),
        },
        {
            title: th("Description"), dataIndex: "description", key: "Description", width: 280,
            render: (text: string) => <span style={{ fontSize: 13, color: "#4b5563" }}>{text || "—"}</span>,
        },
        {
            title: th("Users Count"), dataIndex: "usersCount", key: "Users Count", width: 120, align: "center" as const,
            render: (val: number) => (
                <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{val}</span>
            ),
            sorter: (a: Role, b: Role) => a.usersCount - b.usersCount,
        },
        {
            title: th("Status"), dataIndex: "status", key: "Status", width: 110,
            render: (status: string) => (
                <span style={{ ...(STATUS_STYLE[status] || {}), fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, textTransform: "uppercase" as const, letterSpacing: "0.4px", display: "inline-block" }}>{status}</span>
            ),
            sorter: (a: Role, b: Role) => a.status.localeCompare(b.status),
        },
        {
            title: th("Created By"), dataIndex: "createdBy", key: "Created By", width: 130,
            render: (text: string) => <span style={{ fontSize: 13, color: "#212529" }}>{text}</span>,
            sorter: (a: Role, b: Role) => a.createdBy.localeCompare(b.createdBy),
        },
        {
            title: th("Created Time"), dataIndex: "createdTime", key: "Created Time", width: 155,
            render: (text: string) => <span style={{ fontSize: 13, color: "#212529" }}>{text}</span>,
        },
        {
            title: th("Last Modified By"), dataIndex: "lastModifiedBy", key: "Last Modified By", width: 150,
            render: (text: string) => <span style={{ fontSize: 13, color: "#212529" }}>{text}</span>,
        },
        {
            title: th("Last Modified Time"), dataIndex: "lastModifiedTime", key: "Last Modified Time", width: 160,
            render: (text: string) => <span style={{ fontSize: 13, color: "#212529" }}>{text}</span>,
        },
        {
            title: th("Action"), key: "action", width: 80, align: "center" as const,
            render: (_: any, record: Role) => (
                <Dropdown
                    placement="bottomLeft"
                    trigger={["click"]}
                    menu={{
                        items: [
                            { key: "view", label: "View", icon: <i className="ti ti-eye text-muted fs-14" />, onClick: ({ domEvent }) => { domEvent.stopPropagation(); navigate((route.settingsRoleView || "#").replace(":id", String(record.id))); } },
                            { key: "edit", label: "Edit", icon: <i className="ti ti-edit text-muted fs-14" />, onClick: ({ domEvent }) => { domEvent.stopPropagation(); navigate((route.settingsRoleAdd || "#") + "?edit=" + record.id); } },
                            {
                                key: "mark", label: "Mark as", icon: <i className="ti ti-tag text-muted fs-14" />,
                                children: [
                                    ...(record.status !== "Active" ? [{ key: "mark-active", label: <span style={{ color: "#15803d", fontWeight: 500 }}>Active</span>, onClick: ({ domEvent }: any) => { domEvent.stopPropagation(); setRoles(updateStatus(record.id, "Active")); } }] : []),
                                    ...(record.status !== "Inactive" ? [{ key: "mark-inactive", label: <span style={{ color: "#374151", fontWeight: 500 }}>Inactive</span>, onClick: ({ domEvent }: any) => { domEvent.stopPropagation(); setRoles(updateStatus(record.id, "Inactive")); } }] : []),
                                ],
                            },
                            { type: "divider" as const },
                            { key: "delete", label: "Delete", danger: true, icon: <i className="ti ti-trash fs-14" />, onClick: ({ domEvent }) => { domEvent.stopPropagation(); handleDeleteClick(record.roleName, record.id); } },
                        ],
                        className: "shadow-lg border-0 py-2 rounded-3",
                        style: { minWidth: 160 },
                    }}
                >
                    <button onClick={e => e.stopPropagation()} className="d-inline-flex align-items-center justify-content-center" style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #dee2e6", background: "#fff", cursor: "pointer" }}>
                        <i className="ti ti-dots-vertical text-muted" style={{ fontSize: 16 }} />
                    </button>
                </Dropdown>
            ),
        },
    ];

    const visibleColumns = columns.filter(c => c.key === "action" || visibleCols[c.key as string] !== false);

    // ── Title Dropdown ─────────────────────────────────────────────────────────
    const titleDropdown = (
        <div className="d-flex align-items-center gap-2">
            <div className="dropdown custom-header-dropdown">
                <div className="d-flex align-items-center gap-1 cursor-pointer" data-bs-toggle="dropdown">
                    <h4 className="mb-0 fw-bold" style={{ fontSize: "18px", color: "#111" }}>
                        {selectedView === "All" ? "All Roles" : selectedView + " Roles"}
                    </h4>
                    <i className="ti ti-chevron-down text-dark fs-14" />
                </div>
                <div className="dropdown-menu shadow-lg border-0 mt-2 py-0 overflow-hidden" style={{ minWidth: 220, borderRadius: 8 }}>
                    <div style={{ maxHeight: 300, overflowY: "auto" }}>
                        {views.map(v => (
                            <div key={v.id} className={`dropdown-item px-3 py-2 d-flex align-items-center justify-content-between cursor-pointer ${selectedView === v.id ? "active" : ""}`} onClick={() => setSelectedView(v.id)}>
                                <span className="fs-14 fw-medium text-dark">{v.label}</span>
                                <i className="ti ti-star text-muted fs-14" />
                            </div>
                        ))}
                    </div>
                    <div className="dropdown-divider m-0" />
                    <div className="dropdown-item px-3 py-3 bg-white cursor-pointer d-flex align-items-center gap-2" style={{ borderTop: "1px solid #f0f2f4" }} data-bs-toggle="modal" data-bs-target="#role_custom_view_modal">
                        <div className="d-flex align-items-center justify-content-center text-white rounded-circle" style={{ width: 18, height: 18, background: "#1877f2" }}>
                            <i className="ti ti-plus fs-12" />
                        </div>
                        <span className="fs-14 fw-medium" style={{ color: "#1877f2" }}>New Custom View</span>
                    </div>
                </div>
            </div>
            <span style={{ fontSize: 14, minWidth: 13, height: 25, padding: "0 7px", borderRadius: 6, background: "#fff1f0", color: "#e41f07", fontWeight: 500, border: "1px solid #ffccc7", borderBottom: "2px solid #ffa39e", display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                {filteredData.length}
            </span>
        </div>
    );

    const exportMenuItems = {
        items: [
            { key: "pdf", label: <div className="d-flex align-items-center gap-2 py-1"><i className="ti ti-file-type-pdf text-danger fs-18" /><span>Export as PDF</span></div>, onClick: () => handleExportPDF() },
            { key: "excel", label: <div className="d-flex align-items-center gap-2 py-1"><i className="ti ti-file-type-xls text-success fs-18" /><span>Export as Excel</span></div>, onClick: () => handleExportExcel() },
        ],
        style: { minWidth: 190, borderRadius: 8, padding: "4px 0" },
    };

    const moreButton = (
        <Dropdown menu={exportMenuItems} trigger={["click"]} placement="bottomRight">
            <button className="dropdown-toggle btn btn-outline-light px-2 shadow d-flex align-items-center" onClick={e => e.preventDefault()}>
                <i className="ti ti-package-export me-2" /> Export
            </button>
        </Dropdown>
    );

    return (
        <div className="page-wrapper" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#f8fafc" }}>
            <div className="content pb-0 flex-grow-1 d-flex flex-column">
                <div className="custom-page-header-wrap">
                    <PageHeader title="Roles & Permissions" titleDropdown={titleDropdown} showModuleTile={false} moduleLink="#" exportComponent={moreButton} onRefresh={refreshData} />
                </div>

                <div className={`card border-0 rounded-0 flex-grow-1 mb-4 d-flex flex-column ${viewMode === "list" ? "shadow-sm bg-white" : "bg-transparent shadow-none"}`}>

                    {/* Card Header */}
                    <div className="card-header d-flex align-items-center justify-content-between gap-2 flex-wrap bg-white py-3 border-0 px-3 px-sm-4" style={{ borderRadius: "8px 8px 0 0" }}>
                        <div className="d-flex align-items-center rounded bg-white" style={{ maxWidth: 260, minWidth: 160, border: searchFocused ? "1px solid #e41f07" : "1px solid #dee2e6", height: 32, transition: "all 0.2s" }}>
                            <span className="px-2 d-flex align-items-center text-muted"><i className="ti ti-search fs-13" /></span>
                            <input className="form-control border-0 ps-0 fs-13 bg-transparent" style={{ outline: "none", boxShadow: "none", height: 30 }} placeholder="Search roles..." value={searchText} onChange={e => setSearchText(e.target.value)} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} />
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <button type="button" className="btn text-white d-flex align-items-center fw-bold" style={{ background: "#e41f07", border: "none", borderRadius: 4, padding: "0 15px", height: 32, fontSize: 13, whiteSpace: "nowrap" }} onClick={() => navigate(route.settingsRoleAdd || "/billing-application/settings/roles-permissions/new")}>
                                <i className="ti ti-plus me-2 fs-14" /> New Role
                            </button>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="toolbar-custom py-2 px-3 px-sm-4 d-flex align-items-center justify-content-between flex-wrap gap-2 bg-white">
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                            {/* Sort By */}
                            <div data-sortby-dropdown style={{ position: "relative" }}>
                                <button className={`dropdown-toggle btn btn-outline-light px-2 shadow d-flex align-items-center ${sortBy !== "date-desc" ? "border-danger text-danger" : ""}`} onClick={() => { setShowSortBy(!showSortBy); setShowFilter(false); }}>
                                    <i className="ti ti-arrows-sort me-2" /> Sort By
                                </button>
                                {showSortBy && (
                                    <div className="dropdown-menu show shadow-lg border-0 p-0 mt-2" style={{ position: "absolute", left: 0, top: "100%", minWidth: 230, zIndex: 1060, borderRadius: 8 }}>
                                        <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-white" style={{ borderRadius: "8px 8px 0 0" }}>
                                            <h6 className="fs-14 fw-bold mb-0 text-dark">Sort By</h6>
                                            <button className="btn btn-icon btn-sm border-0 shadow-none d-flex align-items-center justify-content-center" style={{ width: 22, height: 22, borderRadius: "50%", background: "#fff1f0" }} onClick={() => setShowSortBy(false)}>
                                                <i className="ti ti-x fs-12" style={{ color: "#e41f07" }} />
                                            </button>
                                        </div>
                                        <div className="p-2">
                                            {[
                                                { value: "name-asc", label: "Role Name (A → Z)", icon: "ti-sort-ascending-letters" },
                                                { value: "name-desc", label: "Role Name (Z → A)", icon: "ti-sort-descending-letters" },
                                                { value: "status-asc", label: "Status (A → Z)", icon: "ti-sort-ascending-letters" },
                                                { value: "users-desc", label: "Users (High → Low)", icon: "ti-sort-descending-numbers" },
                                                { value: "users-asc", label: "Users (Low → High)", icon: "ti-sort-ascending-numbers" },
                                                { value: "date-desc", label: "Date (Newest First)", icon: "ti-calendar-down" },
                                                { value: "date-asc", label: "Date (Oldest First)", icon: "ti-calendar-up" },
                                            ].map(opt => (
                                                <button key={opt.value} className={`dropdown-item d-flex align-items-center gap-2 px-3 py-2 rounded-2 mb-1 fs-13 ${sortBy === opt.value ? "active text-danger fw-bold" : "text-dark"}`} style={{ background: sortBy === opt.value ? "#fff1f0" : "transparent", border: "none", width: "100%", textAlign: "left" }} onClick={() => { setSortBy(opt.value); setShowSortBy(false); }}>
                                                    <i className={`ti ${opt.icon} fs-14`} style={{ color: sortBy === opt.value ? "#e41f07" : "#6c757d" }} />
                                                    {opt.label}
                                                    {sortBy === opt.value && <i className="ti ti-check ms-auto fs-13" style={{ color: "#e41f07" }} />}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="px-3 pb-3">
                                            <button className="btn btn-light btn-sm w-100 fs-13" onClick={() => { setSortBy("date-desc"); setShowSortBy(false); }}>Reset to Default</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <PredefinedDatePicker />
                        </div>

                        <div className="d-flex align-items-center gap-3 flex-wrap">
                            {/* Filter */}
                            <div data-filter-dropdown style={{ position: "relative" }}>
                                <button className={`dropdown-toggle btn btn-outline-light px-2 shadow d-flex align-items-center ${filterStatus.length > 0 ? "border-danger text-danger" : ""}`} onClick={() => setShowFilter(!showFilter)}>
                                    <i className="ti ti-filter me-2" /> Filter
                                    {filterStatus.length > 0 && <span className="premium-count-badge-v2 mx-2">{filterStatus.length}</span>}
                                </button>
                                {showFilter && (
                                    <div className="dropdown-menu show shadow-lg border-0 p-0 mt-2" style={{ position: "absolute", right: 0, top: "100%", minWidth: 200, zIndex: 1060, borderRadius: 8 }}>
                                        <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-white" style={{ borderRadius: "8px 8px 0 0" }}>
                                            <h6 className="fs-14 fw-bold mb-0 text-dark">Filter by Status</h6>
                                            <button className="btn btn-icon btn-sm border-0 shadow-none d-flex align-items-center justify-content-center" style={{ width: 22, height: 22, borderRadius: "50%", background: "#fff1f0" }} onClick={() => setShowFilter(false)}>
                                                <i className="ti ti-x fs-12" style={{ color: "#e41f07" }} />
                                            </button>
                                        </div>
                                        <div className="p-3">
                                            {["Active", "Inactive"].map(s => (
                                                <div className="form-check mb-2" key={s}>
                                                    <input className="form-check-input" type="checkbox" checked={filterStatus.includes(s)} onChange={e => { if (e.target.checked) setFilterStatus([...filterStatus, s]); else setFilterStatus(filterStatus.filter(x => x !== s)); }} />
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
                                <div className="dropdown">
                                    <button className="btn bg-soft-indigo px-2 border-0 d-flex align-items-center" data-bs-toggle="dropdown" data-bs-auto-close="outside">
                                        <i className="ti ti-columns-3 me-2" /> Manage Columns
                                    </button>
                                    <div className="dropdown-menu shadow-lg border-0 bg-white p-0" style={{ right: 0, left: "auto", zIndex: 1050, borderRadius: 12, minWidth: 240, marginTop: 4 }}>
                                        <div className="p-2" style={{ maxHeight: 350, overflowY: "auto" }}>
                                            <ul className="list-unstyled mb-0">
                                                {Object.keys(visibleCols).map(col => (
                                                    <li key={col}>
                                                        <label className="dropdown-item d-flex align-items-center justify-content-between py-2 px-3 rounded-2 cursor-pointer mb-1">
                                                            <span className="fs-13 fw-medium">{col}</span>
                                                            <div className="form-check form-switch custom-switch-red mb-0">
                                                                <input className="form-check-input cursor-pointer" type="checkbox" role="switch" checked={visibleCols[col]} onChange={() => setVisibleCols(prev => ({ ...prev, [col]: !prev[col] }))} />
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
                                <button onClick={() => setViewMode("list")} className="d-flex align-items-center justify-content-center" style={{ width: 32, height: 30, border: "none", background: viewMode === "list" ? "#26a69a" : "transparent", color: viewMode === "list" ? "#fff" : "#6c757d", borderRadius: 6 }}>
                                    <i className="ti ti-list fs-16" />
                                </button>
                                <button onClick={() => setViewMode("grid")} className="d-flex align-items-center justify-content-center" style={{ width: 32, height: 30, border: "none", background: viewMode === "grid" ? "#26a69a" : "transparent", color: viewMode === "grid" ? "#fff" : "#6c757d", borderRadius: 6 }}>
                                    <i className="ti ti-grid-dots fs-16" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-grow-1" style={{ position: "relative" }}>
                        {viewMode === "list" ? (
                            <div className="custom-table table-responsive px-2 px-sm-4 flex-grow-1 border-0 bg-white">
                                <Datatable columns={visibleColumns} dataSource={filteredData} Selection={true} searchText="" onRow={(record: Role) => ({ onClick: () => navigate((route.settingsRoleView || "#").replace(":id", String(record.id))), style: { cursor: "pointer" } })} />
                            </div>
                        ) : (
                            <div className="py-4 px-3 px-sm-4" style={{ minHeight: "100%", backgroundColor: "#f4f7fa" }}>
                                <div className="row g-3">
                                    {filteredData.map(r => (
                                        <div key={r.id} className="col-xxl-3 col-xl-4 col-lg-4 col-md-6 col-sm-12" style={{ display: "flex" }}>
                                            <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb", transition: "box-shadow 0.2s,transform 0.2s", display: "flex", flexDirection: "column", width: "100%" }} onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }} onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}>
                                                {/* Card Top */}
                                                <div style={{ padding: "14px 16px 12px" }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                        <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => navigate((route.settingsRoleView || "#").replace(":id", String(r.id)))}>
                                                            <div style={{ fontSize: 14, fontWeight: 700, color: "#e41f07", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.roleName}</div>
                                                            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{r.createdTime}</div>
                                                        </div>
                                                        <div className="dropdown" style={{ flexShrink: 0, marginLeft: 8 }}>
                                                            <button className="btn btn-icon btn-sm shadow-none" data-bs-toggle="dropdown" onClick={e => e.stopPropagation()} style={{ width: 28, height: 28, borderRadius: 6, background: "#fff", border: "1px solid #e5e7eb", color: "#9ca3af", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                                <i className="ti ti-dots-vertical" style={{ fontSize: 14, color: "#9ca3af" }} />
                                                            </button>
                                                            <ul className="dropdown-menu dropdown-menu-end shadow border-0 py-1" style={{ minWidth: 150, borderRadius: 8 }}>
                                                                <li><Link to="#" className="dropdown-item px-3 py-2 text-dark fs-14" onClick={e => { e.preventDefault(); navigate((route.settingsRoleView || "#").replace(":id", String(r.id))); }}><i className="ti ti-eye text-muted me-2" />View</Link></li>
                                                                <li><Link to="#" className="dropdown-item px-3 py-2 text-dark fs-14" onClick={e => { e.preventDefault(); navigate((route.settingsRoleAdd || "#") + "?edit=" + r.id); }}><i className="ti ti-edit text-muted me-2" />Edit</Link></li>
                                                                <li><hr className="dropdown-divider my-1" /></li>
                                                                <li><Link to="#" className="dropdown-item px-3 py-2 text-danger fs-14" onClick={e => { e.preventDefault(); handleDeleteClick(r.roleName, r.id); }}><i className="ti ti-trash me-2" />Delete</Link></li>
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Divider */}
                                                <div style={{ height: 1, background: "#f3f4f6", margin: "0 16px" }} />
                                                {/* Description */}
                                                <div style={{ padding: "10px 16px", flex: 1, minHeight: 54 }}>
                                                    <div style={{ fontSize: 13, color: "#4b5563", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{r.description || "No description"}</div>
                                                </div>
                                                {/* Card Footer */}
                                                <div style={{ padding: "10px 16px", borderTop: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                        <span style={{ fontSize: 12, color: "#6b7280" }}>{r.usersCount} user{r.usersCount !== 1 ? "s" : ""}</span>
                                                        <span style={{ ...(STATUS_STYLE[r.status] || {}), fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, textTransform: "uppercase" as const, letterSpacing: "0.4px", display: "inline-block" }}>{r.status}</span>
                                                    </div>
                                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                        <button onClick={e => { e.stopPropagation(); navigate((route.settingsRoleView || "#").replace(":id", String(r.id))); }} style={{ width: 28, height: 28, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="View"><i className="ti ti-eye" style={{ fontSize: 14, color: "#6c757d" }} /></button>
                                                        <button onClick={e => { e.stopPropagation(); navigate((route.settingsRoleAdd || "#") + "?edit=" + r.id); }} style={{ width: 28, height: 28, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Edit"><i className="ti ti-edit" style={{ fontSize: 14, color: "#6c757d" }} /></button>
                                                        <button onClick={e => { e.stopPropagation(); handleDeleteClick(r.roleName, r.id); }} style={{ width: 28, height: 28, border: "1px solid #fee2e2", borderRadius: 6, background: "#fff8f8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Delete"><i className="ti ti-trash" style={{ fontSize: 14, color: "#dc2626" }} /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredData.length === 0 && (
                                        <div className="col-12 text-center py-5">
                                            <i className="ti ti-shield-lock fs-48 text-muted opacity-25 d-block mb-2" />
                                            <p className="text-muted fs-14">No roles found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {del && <DeleteConfirm roleName={del.roleName} onConfirm={del.onConfirm} onCancel={() => setDel(null)} />}

                {/* Custom View Modal */}
                <div className="modal fade" id="role_custom_view_modal" tabIndex={-1} aria-hidden="true">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12 }}>
                            <div className="modal-header border-0 pb-0">
                                <h5 className="modal-title fw-bold" style={{ color: "#111" }}>New Custom View</h5>
                                <button type="button" className="btn-close shadow-none" data-bs-dismiss="modal" />
                            </div>
                            <div className="modal-body py-4">
                                <label className="form-label fw-medium fs-14 text-dark">View Name <span className="text-danger">*</span></label>
                                <input type="text" className="form-control shadow-none" placeholder="Enter view name" value={newViewName} onChange={e => setNewViewName(e.target.value)} />
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

export default PermissionList;
