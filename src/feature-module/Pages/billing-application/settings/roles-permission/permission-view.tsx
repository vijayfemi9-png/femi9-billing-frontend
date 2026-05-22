// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Dropdown } from "antd";
import { all_routes } from "../../../../../routes/all_routes";
import "./permission.scss";

const SK = "billing_roles_permissions";
const RED = "#e41f07";
const MODULES = [
    "Dashboard", "Customers", "Products", "Price Lists", "Composite Items",
    "Invoices", "Payments Received", "Credit Notes", "Transfer Orders",
    "Inventory Adjustments", "Reports", "Settings",
];

interface PermissionSet { view: boolean; create: boolean; edit: boolean; delete: boolean; }
interface Role {
    id: number; roleName: string; description: string;
    status: "Active" | "Inactive"; usersCount: number;
    permissions: Record<string, PermissionSet>;
    createdBy: string; createdTime: string;
    lastModifiedBy: string; lastModifiedTime: string;
}

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
    "Active":   { color: "#15803d", bg: "#dcfce7" },
    "Inactive": { color: "#374151", bg: "#f3f4f6" },
};

function loadAll(): Role[] {
    try { const s = localStorage.getItem(SK); if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length) return p; } } catch { /**/ }
    return [];
}
function saveAll(data: Role[]) { try { localStorage.setItem(SK, JSON.stringify(data)); } catch { /**/ } }
function nowDatetime() {
    const d = new Date(); const pad = (n: number) => String(n).padStart(2, "0");
    const h = d.getHours() % 12 || 12; const ampm = d.getHours() >= 12 ? "PM" : "AM";
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(h)}:${pad(d.getMinutes())} ${ampm}`;
}
function normPerm(v: any): string {
    if (typeof v === "boolean") return v ? "yes" : "no";
    return ["no", "own", "team", "yes"].includes(v) ? v : "no";
}
function hasAccess(v: any): boolean { return normPerm(v) !== "no"; }
function countGranted(perms: Record<string, any> | undefined) {
    if (!perms) return 0;
    return Object.values(perms).reduce((s, p) => s + (hasAccess(p.view) ? 1 : 0) + (hasAccess(p.create) ? 1 : 0) + (hasAccess(p.edit) ? 1 : 0) + (hasAccess(p.delete) ? 1 : 0), 0);
}
function countModulesWithAccess(perms: Record<string, any> | undefined) {
    if (!perms) return 0;
    return Object.values(perms).filter(p => hasAccess(p.view) || hasAccess(p.create) || hasAccess(p.edit) || hasAccess(p.delete)).length;
}

const PERM_BADGE: Record<string, { color: string; bg: string; border: string }> = {
    no:   { color: "#EF1E1E", bg: "#fde9e9", border: "#f5c6c6" },
    own:  { color: "#2F80ED", bg: "#eaf2fd", border: "#b3d4f8" },
    team: { color: "#0E9384", bg: "#EBF2F1", border: "#9dd1cc" },
    yes:  { color: "#1ABE17", bg: "#e8f9e8", border: "#a3e4a1" },
};

const PERM_TEXT: Record<string, string> = {
    no:   "#ef4444",
    own:  "#d97706",
    team: "#0e9384",
    yes:  "#16a34a",
};

const PermBadge = ({ value }: { value: any }) => {
    const norm = normPerm(value);
    const color = PERM_TEXT[norm] || "#9ca3af";
    return (
        <span style={{ fontSize: 13, fontWeight: 500, color, textTransform: "capitalize" as const }}>
            {norm}
        </span>
    );
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

// ── Component ──────────────────────────────────────────────────────────────────
const PermissionView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const route = all_routes;

    const [editHover, setEditHover] = useState(false);
    const [moreHover, setMoreHover] = useState(false);
    const [closeHover, setCloseHover] = useState(false);
    const [activeTab, setActiveTab] = useState<"details" | "activity">("details");
    const [records, setRecords] = useState<Role[]>([]);
    const [selected, setSelected] = useState<Role | null>(null);
    const [listSearch, setListSearch] = useState("");
    const [listSearchFocused, setListSearchFocused] = useState(false);
    const [del, setDel] = useState<{ roleName: string; onConfirm: () => void } | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [mobileShowDetail, setMobileShowDetail] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => {
        const all = loadAll();
        setRecords(all);
        const target = id ? all.find(r => String(r.id) === id) : all[0];
        if (target) setSelected(target);
        else if (all.length) setSelected(all[0]);
    }, [id]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, [selected?.id]);

    const selectRecord = (r: Role) => {
        setSelected(r);
        navigate((route.settingsRoleView || "#").replace(":id", String(r.id)), { replace: true });
        if (isMobile) setMobileShowDetail(true);
    };

    const handleDelete = () => {
        if (!selected) return;
        setDel({
            roleName: selected.roleName,
            onConfirm: () => {
                const updated = records.filter(r => r.id !== selected.id);
                saveAll(updated);
                setRecords(updated);
                setDel(null);
                if (updated.length) setSelected(updated[0]);
                else navigate(route.settingsRoleList || "#");
            }
        });
    };

    const handleStatusToggle = () => {
        if (!selected) return;
        const newStatus = selected.status === "Active" ? "Inactive" : "Active";
        const updated = records.map(r => r.id === selected.id
            ? { ...r, status: newStatus as "Active" | "Inactive", lastModifiedBy: "vickyyfemi9", lastModifiedTime: nowDatetime() }
            : r);
        saveAll(updated);
        setRecords(updated);
        setSelected(updated.find(r => r.id === selected.id) || null);
    };

    const filteredList = records.filter(r =>
        r.roleName.toLowerCase().includes(listSearch.toLowerCase()) ||
        (r.description || "").toLowerCase().includes(listSearch.toLowerCase())
    );

    const st = selected ? (STATUS_STYLE[selected.status] || {}) : { color: "#374151", bg: "#f3f4f6" };
    const perms = selected?.permissions || {};
    const totalGranted = countGranted(perms);
    const totalModules = countModulesWithAccess(perms);

    const ACTIONS = [
        { key: "view", label: "View", color: "#0891b2" },
        { key: "create", label: "Create", color: "#16a34a" },
        { key: "edit", label: "Edit", color: "#d97706" },
        { key: "delete", label: "Delete", color: "#dc2626" },
    ];

    return (
        <div className="page-wrapper" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#f4f7fa" }}>
            <div className="content pb-0 flex-grow-1 d-flex flex-column" style={{ padding: 0 }}>
                <div style={{ display: "flex", flex: 1, height: isMobile ? "auto" : "calc(100vh - 70px)", overflow: "hidden", flexDirection: isMobile ? "column" : "row" }}>

                    {/* ── Left Sidebar ── */}
                    <div style={{ width: isMobile ? "100%" : 280, minWidth: isMobile ? "unset" : 260, background: "#fff", borderRight: isMobile ? "none" : "1px solid #e5e7eb", borderBottom: isMobile ? "1px solid #e5e7eb" : "none", display: isMobile && mobileShowDetail ? "none" : "flex", flexDirection: "column", flexShrink: 0 }}>
                        <div style={{ padding: "14px 16px", borderBottom: "1px solid #f0f2f5" }}>
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>Roles</span>
                                <div className="d-flex align-items-center gap-2">
                                    <button
                                        onClick={() => navigate(route.settingsRoleAdd || "#")}
                                        style={{ width: 30, height: 30, borderRadius: 6, background: RED, border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                                    >
                                        <i className="ti ti-plus" style={{ fontSize: 16 }} />
                                    </button>
                                </div>
                            </div>
                            <div className="d-flex align-items-center rounded bg-white" style={{ border: listSearchFocused ? `1px solid ${RED}` : "1px solid #dee2e6", height: 30 }}>
                                <span className="px-2 d-flex align-items-center text-muted"><i className="ti ti-search fs-12" /></span>
                                <input className="form-control border-0 ps-0 fs-12 bg-transparent" style={{ outline: "none", boxShadow: "none", height: 28 }} placeholder="Search roles..." value={listSearch} onChange={e => setListSearch(e.target.value)} onFocus={() => setListSearchFocused(true)} onBlur={() => setListSearchFocused(false)} />
                            </div>
                        </div>

                        <div style={{ overflowY: "auto", flex: 1 }}>
                            {filteredList.map(r => {
                                const isActive = selected?.id === r.id;
                                const stl = STATUS_STYLE[r.status] || { color: "#374151", bg: "#f3f4f6" };
                                return (
                                    <div key={r.id} onClick={() => selectRecord(r)} style={{ padding: "12px 16px", borderBottom: "1px solid #f5f5f5", cursor: "pointer", background: isActive ? "#fff8f7" : "#fff", borderLeft: `3px solid ${isActive ? RED : "transparent"}`, transition: "all 0.15s" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? RED : "#1f2937", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {r.roleName}
                                            </div>
                                            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 12, background: stl.bg, color: stl.color, marginLeft: 8, flexShrink: 0, textTransform: "uppercase" as const }}>
                                                {r.status}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {r.description || "No description"}
                                        </div>
                                        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                                            {r.usersCount || 0} user{r.usersCount !== 1 ? "s" : ""} · {countModulesWithAccess(r.permissions)} modules
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredList.length === 0 && (
                                <div style={{ textAlign: "center", padding: "32px 16px", color: "#9ca3af", fontSize: 13 }}>
                                    <i className="ti ti-shield-lock d-block mb-2" style={{ fontSize: 32, opacity: 0.3 }} />
                                    No roles found
                                </div>
                            )}
                        </div>

                    </div>

                    {/* ── Main Content ── */}
                    <div style={{ flex: 1, overflowY: "auto", display: isMobile && !mobileShowDetail ? "none" : "flex", flexDirection: "column" }} ref={scrollRef}>
                        {selected ? (
                            <>
                                {/* Header Bar */}
                                <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, flexShrink: 0 }}>
                                    {isMobile && (
                                        <button onClick={() => setMobileShowDetail(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#374151", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 4, width: "100%" }}>
                                            <i className="ti ti-arrow-left" style={{ fontSize: 16 }} /> Back to Roles
                                        </button>
                                    )}
                                    <div>
                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                            <h5 style={{ fontSize: 18, fontWeight: 700, color: "#111", margin: 0 }}>{selected.roleName}</h5>
                                            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: st.bg, color: st.color, textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>
                                                {selected.status}
                                            </span>
                                        </div>
                                        {selected.description && <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>{selected.description}</p>}
                                    </div>
                                    <div className="d-flex align-items-center gap-2 flex-wrap">
                                        <button
                                            className="btn shadow-none"
                                            style={{ borderRadius: 6, fontSize: 13, height: 36, fontWeight: 500, border: `1px solid ${editHover ? "#fca5a5" : "#d1d5db"}`, background: editHover ? "#fff5f5" : "#fff", color: editHover ? "#b91c1c" : "#374151", transition: "all 0.15s" }}
                                            onMouseEnter={() => setEditHover(true)}
                                            onMouseLeave={() => setEditHover(false)}
                                            onClick={() => navigate((route.settingsRoleAdd || "#") + "?edit=" + selected.id)}
                                        >
                                            Edit
                                        </button>
                                        <Dropdown
                                            trigger={["click"]}
                                            placement="bottomRight"
                                            menu={{
                                                items: [
                                                    {
                                                        key: "details",
                                                        label: "Details",
                                                        icon: <i className="ti ti-info-circle" />,
                                                        onClick: ({ domEvent }) => { domEvent.stopPropagation(); setShowDetails(true); },
                                                    },
                                                    { type: "divider" as const },
                                                    {
                                                        key: "toggle",
                                                        label: selected.status === "Active" ? "Mark as Inactive" : "Mark as Active",
                                                        icon: <i className={`ti ${selected.status === "Active" ? "ti-toggle-left" : "ti-toggle-right"}`} />,
                                                        onClick: ({ domEvent }) => { domEvent.stopPropagation(); handleStatusToggle(); },
                                                    },
                                                    { type: "divider" as const },
                                                    {
                                                        key: "delete", label: "Delete", danger: true, icon: <i className="ti ti-trash" />,
                                                        onClick: ({ domEvent }) => { domEvent.stopPropagation(); handleDelete(); },
                                                    },
                                                ],
                                                style: { boxShadow: "none", border: "none" },
                                            }}
                                        >
                                            <button
                                                className="btn d-flex align-items-center justify-content-center shadow-none"
                                                style={{ borderRadius: 6, fontSize: 13, height: 36, width: 36, background: moreHover ? "#fff5f5" : "#fff", color: moreHover ? RED : "#374151", border: `1px solid ${moreHover ? "#fca5a5" : "#d1d5db"}`, padding: 0, transition: "all 0.15s" }}
                                                onMouseEnter={() => setMoreHover(true)}
                                                onMouseLeave={() => setMoreHover(false)}
                                            >
                                                <i className="ti ti-dots-vertical fs-14" />
                                            </button>
                                        </Dropdown>
                                        <button
                                            onClick={() => isMobile ? setMobileShowDetail(false) : navigate(route.settingsRoleList || "#")}
                                            className="btn d-flex align-items-center justify-content-center shadow-none"
                                            style={{ borderRadius: 6, height: 36, width: 36, background: closeHover ? "#fff5f5" : "#fff", color: closeHover ? RED : "#374151", border: `1px solid ${closeHover ? "#fca5a5" : "#d1d5db"}`, padding: 0, transition: "all 0.15s" }}
                                            onMouseEnter={() => setCloseHover(true)}
                                            onMouseLeave={() => setCloseHover(false)}
                                        >
                                            <i className="ti ti-x" style={{ fontSize: 16 }} />
                                        </button>
                                    </div>
                                </div>

                                {/* Stats Row */}
                                <div style={{ padding: isMobile ? "12px 16px" : "16px 24px", display: "flex", gap: 12, flexWrap: "wrap" }}>
                                    {[
                                        { icon: "ti-users",       label: "Users Assigned",      value: selected.usersCount || 0, color: RED },
                                        { icon: "ti-layout-grid", label: "Modules with Access", value: totalModules,             color: RED },
                                        { icon: "ti-lock-open",   label: "Total Permissions",   value: totalGranted,             color: RED },
                                    ].map(stat => (
                                        <div key={stat.label} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 160 }}>
                                            <div style={{ width: 42, height: 42, borderRadius: 10, background: `${stat.color}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <i className={`ti ${stat.icon}`} style={{ fontSize: 20, color: stat.color }} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 24, fontWeight: 700, color: "#111", lineHeight: 1 }}>{stat.value}</div>
                                                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>{stat.label}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Permission Matrix */}
                                <div style={{ padding: isMobile ? "0 16px 16px" : "0 24px 24px" }}>
                                    <div style={{ background: "#fff", border: "1px solid #e5e7eb", overflow: "hidden" }}>
                                        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f2f5", display: "flex", alignItems: "center", gap: 8 }}>
                                            <i className="ti ti-lock-access" style={{ color: RED, fontSize: 16 }} />
                                            <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>Module Permissions</span>
                                        </div>
                                        <div className="table-responsive">
                                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                                <thead>
                                                    <tr style={{ background: "#f3f4f6" }}>
                                                        <th style={{ padding: "11px 20px", fontWeight: 600, color: "#111827", fontSize: 13, borderBottom: "1px solid #e5e7eb", textAlign: "left", width: "34%" }}>Module</th>
                                                        {ACTIONS.map(a => (
                                                            <th key={a.key} style={{ padding: "11px 20px", fontWeight: 600, color: "#111827", fontSize: 13, borderBottom: "1px solid #e5e7eb", textAlign: "left", width: "16.5%" }}>{a.label}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {MODULES.map((module, idx) => {
                                                        const p = perms[module] || { view: false, create: false, edit: false, delete: false };
                                                        const hasAny = hasAccess(p.view) || hasAccess(p.create) || hasAccess(p.edit) || hasAccess(p.delete);
                                                        const isLast = idx === MODULES.length - 1;
                                                        return (
                                                            <tr key={module} style={{ borderBottom: isLast ? "none" : "1px solid #f3f4f6" }}>
                                                                <td style={{ padding: "11px 20px", fontWeight: 400, color: hasAny ? "#111827" : "#374151", fontSize: 13 }}>
                                                                    {module}
                                                                </td>
                                                                {ACTIONS.map(a => (
                                                                    <td key={a.key} style={{ padding: "11px 20px" }}>
                                                                        <PermBadge value={p[a.key]} />
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                            </>
                        ) : (
                            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#9ca3af" }}>
                                <i className="ti ti-shield-lock" style={{ fontSize: 48, opacity: 0.3 }} />
                                <p style={{ fontSize: 14 }}>Select a role to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {del && <DeleteConfirm roleName={del.roleName} onConfirm={del.onConfirm} onCancel={() => setDel(null)} />}

            {showDetails && selected && (
                <>
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 1040 }} onClick={() => setShowDetails(false)} />
                    <div style={{ position: "fixed", top: 0, right: 0, height: "100vh", width: 360, background: "#fff", zIndex: 1050, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}>
                        <div style={{ borderRadius: 0 }}>
                                {/* Panel Header */}
                                <div style={{ padding: "16px 16px 0", borderBottom: "1px solid #f0f2f5" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                                        <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#f3f4f6", color: "#374151", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, flexShrink: 0, border: "1px solid #e5e7eb" }}>
                                            {selected.roleName.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 11, color: "#9ca3af" }}>Role</div>
                                            <div style={{ fontSize: 15, fontWeight: 700, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.roleName}</div>
                                        </div>
                                        <button onClick={() => setShowDetails(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4, display: "flex", alignItems: "center" }}>
                                            <i className="ti ti-x" style={{ fontSize: 16 }} />
                                        </button>
                                    </div>

                                    {/* Meta row */}
                                    <div style={{ display: "flex", gap: 16, paddingBottom: 12 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" }}>
                                            <i className="ti ti-users" style={{ fontSize: 13 }} /> {selected.usersCount || 0} users
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" }}>
                                            <i className="ti ti-layout-grid" style={{ fontSize: 13 }} /> {countModulesWithAccess(selected.permissions)} modules
                                        </div>
                                    </div>

                                    {/* Tabs */}
                                    <div style={{ display: "flex", gap: 0 }}>
                                        {(["details", "activity"] as const).map(tab => (
                                            <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: "none", border: "none", padding: "8px 16px 10px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: activeTab === tab ? RED : "#6b7280", borderBottom: `2px solid ${activeTab === tab ? RED : "transparent"}`, textTransform: "capitalize" as const }}>
                                                {tab === "details" ? "Details" : "History"}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Panel Body */}
                                <div style={{ flex: 1, overflowY: "auto" }}>
                                    {activeTab === "details" ? (
                                        <div>
                                            {selected.description && (
                                                <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", fontSize: 13, color: "#374151" }}>{selected.description}</div>
                                            )}
                                            {[
                                                { label: "Status",       value: <span style={{ ...st, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, textTransform: "uppercase" as const }}>{selected.status}</span> },
                                                { label: "Users",        value: selected.usersCount || 0 },
                                                { label: "Modules",      value: countModulesWithAccess(selected.permissions) },
                                                { label: "Permissions",  value: countGranted(selected.permissions) },
                                            ].map((row, i) => (
                                                <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderBottom: "1px solid #f3f4f6" }}>
                                                    <span style={{ fontSize: 13, color: "#9ca3af" }}>{row.label}</span>
                                                    <span style={{ fontSize: 13, color: "#111827", fontWeight: 600 }}>{row.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ padding: "16px" }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 14 }}>History</div>
                                            {[
                                                {
                                                    action: "Created",
                                                    by: selected.createdBy,
                                                    time: selected.createdTime,
                                                    icon: "ti-circle-plus",
                                                    color: "#16a34a",
                                                    bg: "#dcfce7",
                                                },
                                                {
                                                    action: "Last Modified",
                                                    by: selected.lastModifiedBy,
                                                    time: selected.lastModifiedTime,
                                                    icon: "ti-edit",
                                                    color: "#d97706",
                                                    bg: "#fef9c3",
                                                },
                                            ].map((log, i) => (
                                                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: log.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                            <i className={`ti ${log.icon}`} style={{ fontSize: 16, color: log.color }} />
                                                        </div>
                                                        {i === 0 && <div style={{ width: 1, flex: 1, background: "#e5e7eb", marginTop: 4 }} />}
                                                    </div>
                                                    <div style={{ paddingTop: 4 }}>
                                                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{log.action}</div>
                                                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                                                            by <span style={{ fontWeight: 600, color: "#374151" }}>{log.by || "—"}</span>
                                                        </div>
                                                        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{log.time || "—"}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default PermissionView;
