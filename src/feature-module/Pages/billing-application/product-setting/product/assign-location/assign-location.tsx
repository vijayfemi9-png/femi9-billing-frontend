import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../../../../../../routes/all_routes";
import Footer from "../../../../../../components/footer/footer";

export type LocationNode = {
    id: number;
    parentId: number | null;
    name: string;
    code: string;
    isDeleted?: boolean;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const SK_LOCATIONS = "asl_locations_v3";
const DEFAULT_LAYER_NAMES = ["Country", "State", "District", "Taluk", "Pincode"];
const SEED_LOCATIONS: LocationNode[] = [];
const ACCENT = "#e41f07";

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadData<T>(key: string, seed: T[]): T[] {
    try {
        const s = localStorage.getItem(key);
        if (s) { const p = JSON.parse(s) as T[]; if (Array.isArray(p) && p.length) return p; }
    } catch { /**/ }
    try { localStorage.setItem(key, JSON.stringify(seed)); } catch { /**/ }
    return seed;
}
function saveLS<T>(key: string, data: T[]) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch { /**/ }
}
const nextId = (arr: { id: number }[]) => arr.length ? Math.max(...arr.map(a => a.id)) + 1 : 1;
const live = <T extends { isDeleted?: boolean }>(arr: T[]) => arr.filter(x => !x.isDeleted);
const autoCode = (name: string) => name.trim().slice(0, 3).toUpperCase() || "---";

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
const DeleteConfirm = ({ label, onConfirm, onCancel }: { label: string; onConfirm: () => void; onCancel: () => void }) => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card border-0 shadow-lg" style={{ borderRadius: 14, width: 360, padding: "28px 28px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#fff0ef", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="ti ti-trash" style={{ color: ACCENT, fontSize: 22 }} />
                </div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#222" }}>Delete "{label}"?</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>This entry will be removed.</div>
                </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={onCancel} style={{ border: "1px solid #ddd", background: "#fff", color: "#555", borderRadius: 8, padding: "8px 22px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button onClick={onConfirm} style={{ border: "none", background: ACCENT, color: "#fff", borderRadius: 8, padding: "8px 24px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                    <i className="ti ti-trash me-1" />Delete
                </button>
            </div>
        </div>
    </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const AssignLocation: React.FC = () => {
    const route = all_routes;

    const [locations, setLocations] = useState<LocationNode[]>(() => loadData(SK_LOCATIONS, SEED_LOCATIONS));
    const [layerNames, setLayerNames] = useState<string[]>(DEFAULT_LAYER_NAMES);
    const [showLayerModal, setShowLayerModal] = useState(false);
    const [newLayerName, setNewLayerName] = useState("");

    useEffect(() => { saveLS(SK_LOCATIONS, locations); }, [locations]);

    // ── Path navigation ───────────────────────────────────────────────────────
    type PathNode = { id: number | null; name: string };
    const [path, setPath] = useState<PathNode[]>([{ id: null, name: layerNames[0] ?? "Country" }]);
    const currentParentId = path[path.length - 1].id;
    const currentDepth = path.length - 1;

    // ── Form state ────────────────────────────────────────────────────────────
    const [name, setName] = useState("");
    const [search, setSearch] = useState("");
    const [del, setDel] = useState<{ label: string; onConfirm: () => void } | null>(null);

    useEffect(() => { setName(""); setSearch(""); }, [currentParentId]);

    // ── Derived data ──────────────────────────────────────────────────────────
    const allItems = live(locations).filter(x => x.parentId === currentParentId);
    const items = !search.trim() ? allItems : allItems.filter(x => x.name.toLowerCase().includes(search.toLowerCase()));
    const currentLayerName = layerNames[currentDepth] ?? `Layer ${currentDepth + 1}`;
    const nextLayerName = layerNames[currentDepth + 1] ?? `Layer ${currentDepth + 2}`;
    const canAdd = name.trim() !== "";
    const childCount = (itemId: number) => live(locations).filter(x => x.parentId === itemId).length;

    // ── Handlers ──────────────────────────────────────────────────────────────
    const drillDown = (item: LocationNode) => setPath(p => [...p, { id: item.id, name: item.name }]);
    const goToDepth = (depth: number) => setPath(p => p.slice(0, depth + 1));
    const handleSidebarClick = (depth: number) => { if (depth < path.length) goToDepth(depth); };

    const handleAdd = () => {
        const n = name.trim(); if (!n) return;
        setLocations(p => [...p, { id: nextId(p), parentId: currentParentId, name: n, code: autoCode(n) }]);
        setName("");
    };

    const handleDelete = (item: LocationNode) => {
        setDel({
            label: item.name,
            onConfirm: () => { setLocations(p => p.map(x => x.id === item.id ? { ...x, isDeleted: true } : x)); setDel(null); }
        });
    };

    const handleAddLayerType = () => {
        const n = newLayerName.trim(); if (!n) return;
        setLayerNames(p => [...p, n]);
        setNewLayerName("");
        setShowLayerModal(false);
    };

    const handleDeleteLastLayer = () => {
        if (layerNames.length <= 1) return;
        setLayerNames(p => p.slice(0, -1));
        setPath([{ id: null, name: layerNames[0] ?? "Country" }]);
    };

    return (
        <div className="page-wrapper">
            <div className="content">

                {/* ── Page Header ───────────────────────────────────────── */}
                <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                    <div>
                        <h4 className="fw-bold fs-20 mb-1">Assign Location</h4>
                        <nav aria-label="breadcrumb">
                            <ol className="breadcrumb mb-0 fs-13">
                                <li className="breadcrumb-item">
                                    <Link to="/" className="text-muted">Home</Link>
                                </li>
                                <li className="breadcrumb-item active text-dark fw-medium">
                                    Assign Location
                                </li>
                            </ol>
                        </nav>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <button
                            onClick={() => setShowLayerModal(true)}
                            className="btn d-flex align-items-center gap-2"
                            style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, height: 36, padding: "0 16px", boxShadow: "0 4px 12px rgba(228,31,7,0.22)" }}
                        >
                            <i className="ti ti-plus fs-15" /> Add Layer
                        </button>
                        <button
                            onClick={handleDeleteLastLayer}
                            disabled={layerNames.length <= 1}
                            className="btn d-flex align-items-center gap-2"
                            style={{ border: "1px solid #e0e0e0", background: "#fff", color: layerNames.length > 1 ? "#555" : "#ccc", borderRadius: 6, fontSize: 14, fontWeight: 500, height: 36, padding: "0 16px", cursor: layerNames.length > 1 ? "pointer" : "not-allowed" }}
                            onMouseEnter={e => { if (layerNames.length > 1) { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT; e.currentTarget.style.background = "#fff0ef"; } }}
                            onMouseLeave={e => { if (layerNames.length > 1) { e.currentTarget.style.borderColor = "#e0e0e0"; e.currentTarget.style.color = "#555"; e.currentTarget.style.background = "#fff"; } }}
                        >
                            <i className="ti ti-trash fs-15" /> Delete Layer
                        </button>
                    </div>
                </div>

                {/* ── Main Layout: Sidebar + Content ───────────────────── */}
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

                    {/* LEFT SIDEBAR */}
                    <div className="card border-0 shadow-sm" style={{ borderRadius: 12, width: 220, flexShrink: 0, overflow: "hidden" }}>
                        <div style={{ padding: "14px 16px", borderBottom: "1px solid #f0f0f0", background: "#fafafa" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>Layers</div>
                        </div>
                        {layerNames.map((ln, idx) => {
                            const isActive = idx === currentDepth;
                            const isReachable = idx < path.length;
                            return (
                                <button key={idx}
                                    onClick={() => isReachable ? handleSidebarClick(idx) : undefined}
                                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", border: "none", textAlign: "left", padding: "13px 16px", background: isActive ? `${ACCENT}10` : "transparent", borderLeft: isActive ? `3px solid ${ACCENT}` : "3px solid transparent", cursor: isReachable ? "pointer" : "default", borderBottom: "1px solid #f5f5f5", transition: "all 0.15s" }}
                                    onMouseEnter={e => { if (isReachable && !isActive) e.currentTarget.style.background = "#f9f9f9"; }}
                                    onMouseLeave={e => { if (isReachable && !isActive) e.currentTarget.style.background = "transparent"; }}
                                >
                                    <div style={{ width: 30, height: 30, borderRadius: 8, background: isActive ? ACCENT : isReachable ? `${ACCENT}12` : "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <i className="ti ti-layers-intersect" style={{ fontSize: 14, color: isActive ? "#fff" : isReachable ? ACCENT : "#bbb" }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? ACCENT : isReachable ? "#333" : "#bbb", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ln}</div>
                                        {isActive && <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>{allItems.length} item{allItems.length !== 1 ? "s" : ""}</div>}
                                    </div>
                                    {isActive && <i className="ti ti-chevron-right" style={{ fontSize: 12, color: ACCENT }} />}
                                </button>
                            );
                        })}
                    </div>

                    {/* RIGHT CONTENT */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="card border-0 shadow-sm" style={{ borderRadius: 12, overflow: "hidden" }}>

                            {/* Breadcrumb */}
                            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f0f0", background: "#fefefe", display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                                {path.map((crumb, i) => {
                                    const isLast = i === path.length - 1;
                                    const ln = layerNames[i] ?? `Layer ${i + 1}`;
                                    return (
                                        <span key={`${crumb.id}-${i}`} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                            {i > 0 && <i className="ti ti-chevron-right" style={{ fontSize: 10, color: "#ccc" }} />}
                                            <span onClick={() => !isLast && handleSidebarClick(i)} style={{ fontSize: 13, fontWeight: isLast ? 700 : 400, color: isLast ? "#222" : ACCENT, cursor: isLast ? "default" : "pointer" }}>
                                                {i === 0 ? ln : crumb.name}
                                            </span>
                                        </span>
                                    );
                                })}
                                <span style={{ marginLeft: "auto", fontSize: 12, color: "#aaa", background: "#f5f5f5", borderRadius: 20, padding: "2px 10px" }}>
                                    {allItems.length} {currentLayerName}{allItems.length !== 1 ? "s" : ""}
                                </span>
                            </div>

                            {/* Search + Add */}
                            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", gap: 10, background: "#fff", alignItems: "center" }}>
                                <div style={{ flex: 1, display: "flex", alignItems: "center", border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 12px", height: 40, background: "#fafafa", gap: 8 }}>
                                    <i className="ti ti-search" style={{ color: "#aaa", fontSize: 14 }} />
                                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${currentLayerName}...`} style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#333" }} />
                                    {search && <button onClick={() => setSearch("")} style={{ border: "none", background: "none", cursor: "pointer", color: "#aaa", fontSize: 16, padding: 0 }}>×</button>}
                                </div>
                                <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && canAdd) handleAdd(); }} placeholder={`Add new ${currentLayerName}...`} style={{ width: 200, border: "1px solid #e0e0e0", borderRadius: 8, padding: "10px 14px", fontSize: 13, outline: "none", height: 40 }} />
                                <button onClick={handleAdd} disabled={!canAdd} style={{ border: "none", background: canAdd ? ACCENT : "#e0e0e0", color: "#fff", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: canAdd ? "pointer" : "not-allowed", height: 40, boxShadow: canAdd ? "0 4px 12px rgba(228,31,7,0.2)" : "none", transition: "all 0.2s", whiteSpace: "nowrap" }}>Submit</button>
                            </div>

                            {/* Items table */}
                            <div style={{ background: "#fff" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 130px", padding: "10px 20px", background: "#f8f8f8", borderBottom: "1px solid #f0f0f0", fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 0.5 }}>
                                    <span>{currentLayerName} Name</span>
                                    <span>Code</span>
                                    <span style={{ textAlign: "center" }}>Children</span>
                                    <span style={{ textAlign: "center" }}>Action</span>
                                </div>
                                {items.length === 0 ? (
                                    <div style={{ padding: "50px 20px", textAlign: "center" }}>
                                        <i className="ti ti-map-pin-off" style={{ fontSize: 36, color: "#ddd", display: "block", marginBottom: 10 }} />
                                        <div style={{ fontSize: 14, color: "#bbb" }}>No {currentLayerName.toLowerCase()}s added yet.</div>
                                        {search && <div style={{ fontSize: 12, color: "#ccc", marginTop: 4 }}>Try a different search term.</div>}
                                    </div>
                                ) : items.map(item => {
                                    const cc = childCount(item.id);
                                    return (
                                        <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 130px", padding: "12px 20px", alignItems: "center", borderBottom: "1px solid #f5f5f5", background: "#fff", transition: "background 0.15s" }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fdf8f8"; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${ACCENT}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                    <span style={{ fontSize: 15, fontWeight: 700, color: ACCENT }}>{item.name.charAt(0).toUpperCase()}</span>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 14, fontWeight: 600, color: "#222" }}>{item.name}</div>
                                                    {cc > 0 && <div style={{ fontSize: 11, color: "#aaa" }}>{cc} {nextLayerName}{cc > 1 ? "s" : ""}</div>}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 13, color: "#777" }}>{item.code}</div>
                                            <div style={{ textAlign: "center" }}>
                                                {cc > 0
                                                    ? <span style={{ background: `${ACCENT}12`, color: ACCENT, borderRadius: 20, fontSize: 12, padding: "3px 12px", fontWeight: 600 }}>{cc}</span>
                                                    : <span style={{ color: "#ccc", fontSize: 12 }}>—</span>}
                                            </div>
                                            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                                                <button onClick={() => drillDown(item)} style={{ border: `1px solid ${ACCENT}30`, background: `${ACCENT}08`, color: ACCENT, borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, transition: "all 0.15s" }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = ACCENT; e.currentTarget.style.color = "#fff"; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = `${ACCENT}08`; e.currentTarget.style.color = ACCENT; }}
                                                >
                                                    <i className="ti ti-chevron-right" style={{ fontSize: 12 }} /> Open
                                                </button>
                                                <button onClick={() => handleDelete(item)} style={{ border: "1px solid #eee", background: "#fff", color: "#ccc", borderRadius: 6, width: 30, height: 30, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                                                    onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT; e.currentTarget.style.background = "#fff0ef"; }}
                                                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#eee"; e.currentTarget.style.color = "#ccc"; e.currentTarget.style.background = "#fff"; }}
                                                >
                                                    <i className="ti ti-trash" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Layer Modal */}
            {showLayerModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="card border-0 shadow-lg" style={{ borderRadius: 14, width: 380, padding: "28px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                            <div style={{ fontWeight: 700, fontSize: 16, color: "#222" }}>Add New Layer</div>
                            <button onClick={() => setShowLayerModal(false)} style={{ border: "none", background: "none", cursor: "pointer", color: "#aaa", fontSize: 20, lineHeight: 1 }}>×</button>
                        </div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "#555", display: "block", marginBottom: 8 }}>Layer Name <span style={{ color: ACCENT }}>*</span></label>
                        <input autoFocus value={newLayerName} onChange={e => setNewLayerName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleAddLayerType(); }} placeholder="e.g. Village, Zone, Ward..." style={{ width: "100%", border: "1px solid #e0e0e0", borderRadius: 8, padding: "11px 14px", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16 }} />
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                            <button onClick={() => setShowLayerModal(false)} style={{ border: "1px solid #ddd", background: "#fff", color: "#555", borderRadius: 8, padding: "9px 22px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                            <button onClick={handleAddLayerType} disabled={!newLayerName.trim()} style={{ border: "none", background: newLayerName.trim() ? ACCENT : "#e0e0e0", color: "#fff", borderRadius: 8, padding: "9px 24px", fontSize: 13, fontWeight: 700, cursor: newLayerName.trim() ? "pointer" : "not-allowed" }}>Add Layer</button>
                        </div>
                    </div>
                </div>
            )}

            {del && <DeleteConfirm label={del.label} onConfirm={del.onConfirm} onCancel={() => setDel(null)} />}
            <Footer />
        </div>
    );
};

export default AssignLocation;
