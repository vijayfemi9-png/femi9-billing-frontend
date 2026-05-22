// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { all_routes } from "../../../../../routes/all_routes";
import { Bold } from "react-feather";
import "./permission.scss";

const SK = "billing_roles_permissions";
const MODULES = [
    "Dashboard", "Customers", "Products", "Price Lists", "Composite Items",
    "Invoices", "Payments Received", "Credit Notes", "Transfer Orders",
    "Inventory Adjustments", "Reports", "Settings",
];

type PermValue = "no" | "own" | "team" | "yes" | "all";

interface PermissionSet {
    view: PermValue;
    create: PermValue;
    edit: PermValue;
    delete: PermValue;
}

const PERM_STYLE: Record<PermValue, { color: string; bg: string; border: string }> = {
    no:   { color: "#EF1E1E", bg: "#fde9e9", border: "#f5c6c6" },
    own:  { color: "#2F80ED", bg: "#eaf2fd", border: "#b3d4f8" },
    team: { color: "#0E9384", bg: "#EBF2F1", border: "#9dd1cc" },
    yes:  { color: "#1ABE17", bg: "#e8f9e8", border: "#a3e4a1" },
    all:  { color: "#6941C6", bg: "#f4f0fd", border: "#d6bbfb" },
};

const PERM_OPTIONS: { value: PermValue; label: string }[] = [
    { value: "no",   label: "No" },
    { value: "own",  label: "Own" },
    { value: "team", label: "Team" },
    { value: "yes",  label: "Yes" },
];

function normPerm(v: any): PermValue {
    if (typeof v === "boolean") return v ? "yes" : "no";
    if (["no", "own", "team", "yes"].includes(v)) return v as PermValue;
    return "no";
}

function emptyPerms(): Record<string, PermissionSet> {
    return Object.fromEntries(MODULES.map(m => [m, { view: "no", create: "no", edit: "no", delete: "no" }]));
}

function nowDatetime() {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const h = d.getHours() % 12 || 12;
    const ampm = d.getHours() >= 12 ? "PM" : "AM";
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(h)}:${pad(d.getMinutes())} ${ampm}`;
}

function loadJSON(key: string) {
    try { const s = localStorage.getItem(key); if (s) return JSON.parse(s); } catch { /**/ }
    return [];
}
function saveJSON(key: string, data: any) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch { /**/ }
}

const ACTIONS: { key: string; label: string; color: string }[] = [
    { key: "view",   label: "View",   color: "#0891b2" },
    { key: "create", label: "Create", color: "#16a34a" },
    { key: "edit",   label: "Edit",   color: "#d97706" },
    { key: "delete", label: "Delete", color: "#dc2626" },
];

// ── Per-cell permission select ──────────────────────────────────────────────────
const PermSelect = ({ value, onChange, action }: { value: PermValue; onChange: (v: PermValue) => void; action?: string }) => {
    const options = action === "create"
        ? PERM_OPTIONS.filter(o => o.value === "no" || o.value === "yes")
        : PERM_OPTIONS;
    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value as PermValue)}
            style={{
                fontSize: 13,
                height: 34,
                width: 95,
                padding: "0 26px 0 8px",
                border: "1px solid #d1d5db",
                borderRadius: 5,
                color: "#212529",
                background: `#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239ca3af' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 8px center`,
                fontWeight: 400,
                cursor: "pointer",
                outline: "none",
                boxShadow: "none",
                display: "block",
                margin: "0 auto",
                appearance: "none",
                WebkitAppearance: "none",
            }}
        >
            {options.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
            ))}
        </select>
    );
};

// ── Bulk trigger select (resets to "" after selection) ─────────────────────────
const BulkSelect = ({ placeholder, onSelect, header }: { placeholder: string; onSelect: (v: PermValue) => void; small?: boolean; header?: boolean }) => (
    <select
        defaultValue=""
        onChange={e => {
            const v = e.target.value as PermValue;
            if (v) { onSelect(v); e.target.value = ""; }
        }}
        style={header ? {
            fontSize: 12,
            height: 26,
            padding: "0 20px 0 6px",
            border: "none",
            borderBottom: "1px solid #d1d5db",
            borderRadius: 0,
            color: "#111827",
            background: `transparent url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239ca3af' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 4px center`,
            fontWeight: 400,
            cursor: "pointer",
            outline: "none",
            width: "auto",
            minWidth: 52,
            appearance: "none",
            WebkitAppearance: "none",
        } : {
            fontSize: 13,
            height: 34,
            width: 95,
            padding: "0 26px 0 8px",
            border: "1px solid #d1d5db",
            borderRadius: 5,
            color: "#212529",
            background: `#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239ca3af' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 8px center`,
            fontWeight: 400,
            cursor: "pointer",
            outline: "none",
            display: "block",
            margin: "0 auto",
            appearance: "none",
            WebkitAppearance: "none",
        }}
    >
        <option value="">{placeholder}</option>
        {PERM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
);

// ── Component ──────────────────────────────────────────────────────────────────
const PermissionAdd: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get("edit");
    const route = all_routes;

    const [roleName, setRoleName] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState<"Active" | "Inactive">("Active");
    const [permissions, setPermissions] = useState<Record<string, PermissionSet>>(emptyPerms());
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (editId) {
            const all = loadJSON(SK);
            const existing = all.find((r: any) => String(r.id) === editId);
            if (existing) {
                setRoleName(existing.roleName || "");
                setDescription(existing.description || "");
                setStatus(existing.status || "Active");
                const migrated: Record<string, PermissionSet> = {};
                MODULES.forEach(m => {
                    const old = existing.permissions?.[m];
                    migrated[m] = old
                        ? { view: normPerm(old.view), create: normPerm(old.create), edit: normPerm(old.edit), delete: normPerm(old.delete) }
                        : { view: "no", create: "no", edit: "no", delete: "no" };
                });
                setPermissions(migrated);
            }
        }
    }, [editId]);

    const setPermValue = (module: string, action: string, value: PermValue) =>
        setPermissions(prev => ({ ...prev, [module]: { ...prev[module], [action]: value } }));

    const setAllForModule = (module: string, value: PermValue) =>
        setPermissions(prev => ({ ...prev, [module]: { view: value, create: value, edit: value, delete: value } }));

    const setAllForAction = (action: string, value: PermValue) =>
        setPermissions(prev => {
            const next = { ...prev };
            MODULES.forEach(m => { next[m] = { ...next[m], [action]: value }; });
            return next;
        });

    const setAll = (value: PermValue) =>
        setPermissions(Object.fromEntries(MODULES.map(m => [m, { view: value, create: value, edit: value, delete: value }])));

    const validate = () => {
        const e: Record<string, string> = {};
        if (!roleName.trim()) e.roleName = "Role name is required";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        setSaving(true);
        setTimeout(() => {
            const all = loadJSON(SK);
            const now = nowDatetime();
            if (editId) {
                const updated = all.map((r: any) => String(r.id) === editId
                    ? { ...r, roleName: roleName.trim(), description: description.trim(), status, permissions, lastModifiedBy: "vickyyfemi9", lastModifiedTime: now }
                    : r);
                saveJSON(SK, updated);
            } else {
                const ids = all.map((r: any) => r.id || 0);
                const newId = ids.length ? Math.max(...ids) + 1 : 1;
                saveJSON(SK, [...all, {
                    id: newId,
                    roleName: roleName.trim(),
                    description: description.trim(),
                    status,
                    usersCount: 0,
                    permissions,
                    createdBy: "vickyyfemi9",
                    createdTime: now,
                    lastModifiedBy: "vickyyfemi9",
                    lastModifiedTime: now,
                }]);
            }
            setSaving(false);
            navigate(route.settingsRoleList || "/billing-application/settings/roles-permissions");
        }, 600);
    };

    return (
        <div className="page-wrapper" style={{ minHeight: "100vh", backgroundColor: "#f5f6fa" }}>
            <div className="content container-fluid" style={{ padding: "24px 28px" }}>

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <div>
                        <h4 style={{ fontWeight: 700, fontSize: 19, marginBottom: 3, color: "#111827" }}>
                            {editId ? "Edit Role" : "New Role"}
                        </h4>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "#6b7280" }}>
                            <span onClick={() => navigate(route.settingsRoleList || "#")} style={{ cursor: "pointer", color: "#9ca3af" }}>Roles & Permissions</span>
                            <span>›</span>
                            <span style={{ color: "#000000", fontWeight: 500 }}>{editId ? "Edit" : "New"}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate(route.settingsRoleList || "#")}
                        style={{ width: 34, height: 34, borderRadius: 4, background: "#fff", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                    >
                        <i className="ti ti-x" style={{ fontSize: 15, color: "#6b7280" }} />
                    </button>
                </div>

                {/* Role Info Card */}
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 1px 8px rgba(0,0,0,0.05)", marginBottom: 20 }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 8 }}>
                        <i className="ti ti-shield-lock" style={{ color: "#e41f07", fontSize: 15 }} />
                        <span style={{ fontWeight: 600, fontSize: 13, color: "#111" }} className="fw-bold">Role Information</span>
                    </div>
                    <div style={{ padding: "20px 24px" }}>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label fw-medium fs-14 text-danger">
                                    Role Name <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className={`form-control shadow-none fs-14 ${errors.roleName ? "is-invalid" : ""}`}
                                    style={{ height: 38, border: errors.roleName ? "1px solid #dc2626" : "1px solid #d1d5db", borderRadius: 6 }}
                                    placeholder="e.g. Sales Manager"
                                    value={roleName}
                                    onChange={e => { setRoleName(e.target.value); if (errors.roleName) setErrors(p => ({ ...p, roleName: "" })); }}
                                    onFocus={e => { e.target.style.borderColor = "#e41f07"; e.target.style.boxShadow = "none"; }}
                                    onBlur={e => { e.target.style.borderColor = errors.roleName ? "#dc2626" : "#d1d5db"; e.target.style.boxShadow = "none"; }}
                                />
                                {errors.roleName && <div className="invalid-feedback d-block">{errors.roleName}</div>}
                            </div>
                            <div className="col-md-3">
                                <label className="form-label fw-medium fs-14" style={{ color: "#000000" }}>Status</label>
                                <div className="d-flex align-items-center gap-3 mt-2">
                                    {(["Active", "Inactive"] as const).map(s => (
                                        <label key={s} className="d-flex align-items-center gap-2 mb-0" style={{ fontSize: 13, cursor: "pointer" }}>
                                            <input type="radio" name="status" checked={status === s} onChange={() => setStatus(s)} style={{ accentColor: "#e41f07", width: 16, height: 16 }} />
                                            <span style={{ color: "#000000" }}>{s}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="col-12">
                                <label className="form-label fw-medium fs-14" style={{ color: "#000000" }}>Description</label>
                                <textarea
                                    className="form-control shadow-none fs-14"
                                    rows={2}
                                    style={{ border: "1px solid #d1d5db", borderRadius: 6, resize: "vertical" }}
                                    placeholder="Describe this role's purpose and scope..."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    onFocus={e => { e.target.style.borderColor = "#e41f07"; e.target.style.boxShadow = "none"; }}
                                    onBlur={e => { e.target.style.borderColor = "#d1d5db"; e.target.style.boxShadow = "none"; }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Permission Matrix Card */}
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 1px 8px rgba(0,0,0,0.05)", marginBottom: 20 }}>
                    {/* Card Header */}
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <i className="ti ti-lock-access" style={{ color: "#e41f07", fontSize: 15 }} />
                            <span style={{ fontWeight: 600, fontSize: 13, color: "#111" }}>Module Permissions</span>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="table-responsive">
                        <table className="table mb-0" style={{ fontSize: 13, tableLayout: "fixed" }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: "12px 20px", fontWeight: 600, color: "#000000", width: "28%", background: "#f2f2f2", borderBottom: "1px solid #dee2e6", borderTop: "none", fontSize: 14 }}>Module</th>
                                    {ACTIONS.map(a => (
                                        <th key={a.key} style={{ padding: "12px 16px", fontWeight: 600, color: "#000000", textAlign: "center", width: "14%", background: "#f2f2f2", borderBottom: "1px solid #dee2e6", borderTop: "none", fontSize: 14 }}>
                                            {a.label}
                                        </th>
                                    ))}
                                    <th style={{ padding: "12px 16px", fontWeight: 600, color: "#000000", textAlign: "center", width: "14%", background: "#f2f2f2", borderBottom: "1px solid #dee2e6", borderTop: "none", fontSize: 14 }}>
                                        Set Row
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {MODULES.map((module, idx) => {
                                    const p = permissions[module];
                                    return (
                                        <tr key={module} style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f0f2f5" }}>
                                            <td style={{ padding: "10px 20px", fontWeight: 500, color: "#212529", fontSize: 14 }}>
                                                <div className="d-flex align-items-center gap-2">
                                                    <i className="ti ti-layout-grid" style={{ color: "#9ca3af", fontSize: 14 }} />
                                                    {module}
                                                </div>
                                            </td>
                                            {ACTIONS.map(a => (
                                                <td key={a.key} style={{ padding: "10px 16px", textAlign: "center" }}>
                                                    <PermSelect
                                                        value={p[a.key]}
                                                        onChange={v => setPermValue(module, a.key, v)}
                                                        action={a.key}
                                                    />
                                                </td>
                                            ))}
                                            <td style={{ padding: "10px 16px", textAlign: "center" }}>
                                                <BulkSelect placeholder="Set all" onSelect={v => setAllForModule(module, v)} small />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Buttons */}
                    <div style={{ padding: "16px 20px", borderTop: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 10 }}>
                        <button
                            className="btn fw-bold fs-14 text-white px-4"
                            style={{ background: "#e41f07", border: "1px solid #e41f07", borderRadius: 4, height: 38, opacity: saving ? 0.7 : 1 }}
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <><span className="spinner-border spinner-border-sm me-2" />{editId ? "Updating..." : "Saving..."}</>
                            ) : (
                                <>{editId ? "Update Role" : "Save Role"}</>
                            )}
                        </button>
                        <button
                            className="btn fw-bold fs-14 px-4"
                            style={{ background: "#fff", border: "1px solid #d0d5dd", borderRadius: 4, height: 38, color: "#344054" }}
                            onClick={() => navigate(route.settingsRoleList || "#")}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PermissionAdd;
