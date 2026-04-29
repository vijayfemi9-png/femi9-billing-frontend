import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../../../../../../components/footer/footer";
import Datatable from "../../../../../../components/dataTable";
import PredefinedDatePicker from "../../../../../../components/common-dateRangePicker/PredefinedDatePicker";
import PageHeader from "../../../../../../components/page-header/pageHeader";
import { all_routes } from "../../../../../../routes/all_routes";

interface LocationNode {
    id: number;
    parentId: number | null;
    name: string;
    code: string;
    currency?: string;
    isDeleted?: boolean;
    childLayerName?: string;
}

interface LocationRow {
    id: string;
    rowKey: string;
    itemId: string;
    levelNum: string;
    name: string;
    code: string;
    currency: string;
    parent: string;
    status: "Active";
}

const SK_LOCATIONS = "asl_locations_v11";
const SEED_LOCATIONS: LocationNode[] = [];
const ACCENT = "#e41f07";

function loadLS<T>(key: string, seed: T[]): T[] {
    try {
        const s = localStorage.getItem(key);
        if (s) {
            const p = JSON.parse(s) as T[];
            if (Array.isArray(p) && p.length) return p;
        }
    } catch { /**/ }
    return seed;
}

function saveLS(key: string, data: any) {
    localStorage.setItem(key, JSON.stringify(data));
}

function buildRows(nodes: LocationNode[]): LocationRow[] {
    const rows: LocationRow[] = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const liveNodes = nodes.filter(x => !x.isDeleted);

    liveNodes.forEach(n => {
        let depth = 1;
        let pId = n.parentId;
        let pName = "—";
        if (pId !== null) {
            const p = nodeMap.get(pId);
            if (p) pName = p.name;
        }
        while (pId !== null) {
            const parent = nodeMap.get(pId);
            if (!parent) break;
            depth++;
            pId = parent.parentId;
        }
        rows.push({
            id: String(rows.length + 1),
            rowKey: `n-${n.id}`,
            itemId: String(n.id || 0),
            levelNum: String(depth || 0),
            name: String(n.name || ""),
            code: String(n.code || ""),
            currency: String(n.currency || ""),
            parent: String(pName || ""),
            status: "Active",
        });
    });
    return rows;
}

const AssignLocationList: React.FC = () => {
    const navigate = useNavigate();
    const route = all_routes;

    const [locations, setLocations] = useState<LocationNode[]>(() => loadLS(SK_LOCATIONS, SEED_LOCATIONS));
    const [searchText, setSearchText] = useState("");
    const [sortBy, setSortBy] = useState("newest");
    const [showFilter, setShowFilter] = useState(false);
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showLayerModal, setShowLayerModal] = useState(false);
    const [newLayerName, setNewLayerName] = useState("");
    const [newLocName, setNewLocName] = useState("");
    const [newLocCode, setNewLocCode] = useState("");
    const [newLocCurrency, setNewLocCurrency] = useState("");
    const [path, setPath] = useState<{ id: number | null; name: string }[]>([{ id: null, name: "Home" }]);
    const [layerNames, setLayerNames] = useState<string[]>(() => {
        const raw = localStorage.getItem("asl_layers_v11");
        if (raw) { try { return JSON.parse(raw); } catch { } }
        return ["Country"];
    });
    const [showSubModal, setShowSubModal] = useState(false);
    const [modalPath, setModalPath] = useState<{ id: number | null; name: string }[]>([]);

    const [visibleColumns, setVisibleColumns] = useState(["name", "currency", "action"]);
    const [applyLayerToAll, setApplyLayerToAll] = useState(false);

    useEffect(() => {
        const yraw = localStorage.getItem("asl_layers_v11");
        if (yraw) { try { setLayerNames(JSON.parse(yraw)); } catch { /* ignore */ } }
    }, []);

    const allRows = useMemo(() => buildRows(locations), [locations]);

    const currentParentId = path[path.length - 1].id;
    const currentParentNode = locations.find(l => l.id === currentParentId);
    // Use node-specific layer name if available. Fall back to global only at root level (depth 0)
    const currentLayerName = currentParentNode?.childLayerName || (path.length === 1 ? layerNames[0] : "");

    const drillDown = (item: LocationNode) => {
        setPath([...path, { id: item.id, name: item.name }]);
    };

    const tableData = useMemo(() => {
        // Filter by current parent for drill-down
        let data = allRows.filter(r => {
            const node = locations.find(l => String(l.id) === r.itemId);
            return node ? node.parentId === currentParentId : false;
        });

        if (searchText) {
            data = data.filter(r =>
                (r.name?.toLowerCase() || "").includes(searchText.toLowerCase()) ||
                (r.code?.toLowerCase() || "").includes(searchText.toLowerCase())
            );
        }
        if (sortBy === "newest") data.sort((a, b) => Number(b.itemId) - Number(a.itemId));
        else data.sort((a, b) => Number(a.itemId) - Number(b.itemId));
        return data;
    }, [allRows, searchText, sortBy, currentParentId, locations]);

    const columns = [
        {
            title: currentLayerName || "Location",
            dataIndex: "name",
            key: "name",
            sorter: (a: LocationRow, b: LocationRow) => a.name.localeCompare(b.name),
            render: (v: string, r: LocationRow) => (
                <button
                    className="btn p-0 border-0 bg-transparent fw-bold text-dark fs-14"
                    onClick={() => {
                        const original = locations.find(l => String(l.id) === r.itemId);
                        if (original) drillDown(original);
                    }}
                >{v}</button>
            ),
        },

        {
            title: "Currency",
            dataIndex: "currency",
            key: "currency",
            render: (v: string) => <span className="fs-14 text-dark">{v || "—"}</span>,
        },
        {
            title: "Action",
            key: "action",
            render: (_: any, r: LocationRow) => (
                <div className="dropdown table-action">
                    <Link to="#" data-bs-toggle="dropdown" className="btn btn-icon btn-sm btn-outline-light">
                        <i className="ti ti-dots-vertical" />
                    </Link>
                    <div className="dropdown-menu dropdown-menu-right">
                        <Link to="#" className="dropdown-item text-danger" onClick={() => {
                            const updated = locations.map(l => String(l.id) === r.itemId ? { ...l, isDeleted: true } : l);
                            setLocations(updated);
                            localStorage.setItem(SK_LOCATIONS, JSON.stringify(updated));
                        }}>
                            <i className="ti ti-trash me-2" /> Delete
                        </Link>
                    </div>
                </div>
            ),
        },
    ].filter(col => {
        if (!visibleColumns.includes(col.key || "")) return false;
        if (path.length > 1) {
            return col.key === "name" || col.key === "action";
        }
        return true;
    });

    return (
        <div className="page-wrapper" style={{ minHeight: "100vh", background: "#f8f9fa" }}>
            <div className="content pb-0 flex-grow-1 d-flex flex-column">
                {/* ── Page Header ── */}
                <div className="d-flex align-items-center justify-content-between mb-4 mt-2">
                    <div>
                        <h4 className="fw-bold mb-1">
                            Assign Location <span className="badge bg-soft-danger text-danger fs-12 ms-2 px-2 py-1" style={{ borderRadius: "50%" }}>{tableData.length}</span>
                        </h4>
                        <div className="d-flex align-items-center gap-2 fs-13 text-muted">
                            <span>Home</span> <i className="ti ti-chevron-right fs-10" /> <span className="text-dark fw-medium">Assign Location</span>
                        </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <div className="dropdown">
                            <button className="btn btn-white border d-flex align-items-center gap-2 fs-13 fw-bold shadow-none h-40" data-bs-toggle="dropdown">
                                <i className="ti ti-package-export fs-16" /> Export <i className="ti ti-chevron-down fs-12 ms-1" />
                            </button>
                        </div>
                        <button className="btn btn-white border h-40 w-40 d-flex align-items-center justify-content-center shadow-none" onClick={() => setLocations(loadLS(SK_LOCATIONS, SEED_LOCATIONS))}>
                            <i className="ti ti-refresh fs-16" />
                        </button>
                        <button className="btn btn-white border h-40 w-40 d-flex align-items-center justify-content-center shadow-none">
                            <i className="ti ti-settings fs-16" />
                        </button>
                    </div>
                </div>

                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-header d-flex align-items-center justify-content-between gap-2 flex-wrap border-0 pt-4 px-4 pb-0">
                        <div className="d-flex align-items-center gap-3">
                            {path.length > 1 && (
                                <h4 className="fw-bold mb-0 text-dark">
                                    {path[path.length - 1].name}
                                </h4>
                            )}
                            <div
                                className="d-flex align-items-center border rounded px-3 bg-white shadow-none"
                                style={{
                                    width: 250,
                                    borderColor: isSearchFocused ? ACCENT : "#e5e7eb",
                                    borderRadius: 8,
                                    transition: "all 0.2s ease"
                                }}
                            >
                                <i className="ti ti-search text-muted fs-15" />
                                <input
                                    className="form-control border-0 fs-14 ps-2"
                                    placeholder="Search..."
                                    value={searchText}
                                    onChange={e => setSearchText(e.target.value)}
                                    onFocus={() => setIsSearchFocused(true)}
                                    onBlur={() => setIsSearchFocused(false)}
                                    style={{ height: 44, boxShadow: "none" }}
                                />
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            {currentLayerName && (
                                <button
                                    className="btn btn-white border d-flex align-items-center gap-2 fw-bold text-danger"
                                    onClick={() => {
                                        // Clear node-specific layer name
                                        const updatedLocs = locations.map(l => 
                                            l.id === currentParentId ? { ...l, childLayerName: "" } : l
                                        );
                                        setLocations(updatedLocs);
                                        localStorage.setItem(SK_LOCATIONS, JSON.stringify(updatedLocs));

                                        // Clear global fallback if at root
                                        if (path.length === 1) {
                                            const updatedLayers = [...layerNames];
                                            updatedLayers[0] = "";
                                            setLayerNames(updatedLayers);
                                            localStorage.setItem("asl_layers_v11", JSON.stringify(updatedLayers));
                                        }
                                    }}
                                    style={{ height: 44, padding: "0 20px", borderRadius: 8, fontSize: 14 }}
                                >
                                    <i className="ti ti-trash fs-16" /> Delete Layer
                                </button>
                            )}
                            <button
                                className="btn btn-danger d-flex align-items-center gap-2 fw-bold"
                                onClick={() => {
                                    if (currentLayerName) setShowAddModal(true);
                                    else setShowLayerModal(true);
                                }}
                                style={{ background: ACCENT, border: "none", height: 44, padding: "0 25px", borderRadius: 8, fontSize: 14 }}
                            >
                                <i className="ti ti-plus fs-16" /> {currentLayerName ? `Add ${currentLayerName}` : (path.length === 1 ? "Add Country" : "Add Layer")}
                            </button>
                        </div>
                    </div>

                    {/* ── Sub-Location Management Modal ── */}
                    {showSubModal && (
                        <div className="gst-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowSubModal(false); }}>
                            <div className="gst-modal-content" style={{ maxWidth: 800 }}>
                                <div className="gst-modal-header">
                                    <div className="d-flex align-items-center gap-2">
                                        <h5 className="fw-bold mb-0"><i className="ti ti-stack-2 me-2 text-danger" />Manage Layer</h5>
                                    </div>
                                    <button className="btn-close-custom" onClick={() => setShowSubModal(false)}>
                                        <i className="ti ti-x" />
                                    </button>
                                </div>
                                <div className="gst-modal-body p-4" style={{ minHeight: 400 }}>
                                    {/* Modal Breadcrumbs */}
                                    <div className="mb-3 d-flex align-items-center gap-2 flex-wrap">
                                        <i className="ti ti-world text-muted fs-14" />
                                        {modalPath.map((p, i) => (
                                            <React.Fragment key={i}>
                                                {i > 0 && <i className="ti ti-chevron-right text-muted fs-10" />}
                                                <button
                                                    className={`btn p-0 border-0 bg-transparent fs-13 fw-bold ${i === modalPath.length - 1 ? "text-danger" : "text-muted"}`}
                                                    onClick={() => setModalPath(modalPath.slice(0, i + 1))}
                                                >
                                                    {p.name}
                                                </button>
                                            </React.Fragment>
                                        ))}
                                    </div>

                                    {/* Modal Toolbar */}
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <div className="fs-15 fw-bold text-dark">
                                            Layer list for <span className="text-danger">{modalPath[modalPath.length - 1]?.name}</span>
                                        </div>
                                        <button
                                            className="btn btn-danger btn-sm d-flex align-items-center gap-2 fw-bold"
                                            onClick={() => setShowAddModal(true)}
                                            style={{ background: ACCENT, borderRadius: 6, padding: "8px 16px" }}
                                        >
                                            <i className="ti ti-plus fs-14" /> Add Value
                                        </button>
                                    </div>

                                    {/* Modal Table */}
                                    <div className="border rounded">
                                        <Datatable
                                            columns={[
                                                {
                                                    title: layerNames[modalPath.length] || "Layer",
                                                    dataIndex: "name",
                                                    render: (v: string, r: any) => (
                                                        <button
                                                            className="btn p-0 border-0 bg-transparent fw-bold text-dark fs-14"
                                                            onClick={() => {
                                                                const original = locations.find(l => String(l.id) === r.itemId);
                                                                if (original) setModalPath(prev => [...prev, { id: original.id, name: original.name }]);
                                                            }}
                                                        >{v}</button>
                                                    )
                                                },
                                                { title: "Code", dataIndex: "code" },
                                                {
                                                    title: "Action",
                                                    dataIndex: "action",
                                                    render: (_: any, r: any) => (
                                                        <button
                                                            className="btn text-danger p-0 border-0 bg-transparent"
                                                            onClick={() => {
                                                                const updated = locations.map(l => String(l.id) === r.itemId ? { ...l, isDeleted: true } : l);
                                                                setLocations(updated);
                                                                localStorage.setItem(SK_LOCATIONS, JSON.stringify(updated));
                                                            }}
                                                        ><i className="ti ti-trash" /></button>
                                                    )
                                                }
                                            ]}
                                            dataSource={allRows.filter(r => {
                                                const node = locations.find(l => String(l.id) === r.itemId);
                                                return node?.parentId === modalPath[modalPath.length - 1]?.id && !node?.isDeleted;
                                            })}
                                            Selection={true}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Add Location Modal ── */}
                    {showAddModal && (
                        <div className="gst-modal-overlay" style={{ zIndex: 1100 }} onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
                            <div className="gst-modal-content" style={{ maxWidth: 500 }}>
                                <div className="gst-modal-header">
                                    <h5 className="fw-bold"><i className="ti ti-map-pin me-2 text-danger" />Add New {currentLayerName || (path.length === 1 ? 'Country' : 'Layer')}</h5>
                                    <button className="btn-close-custom" onClick={() => { setShowAddModal(false); setNewLocName(""); setNewLocCode(""); setNewLocCurrency(""); }}>
                                        <i className="ti ti-x" />
                                    </button>
                                </div>
                                <div className="gst-modal-body p-4">
                                    <div className="mb-3">
                                        <label className="form-label fs-14 fw-bold">{currentLayerName || (path.length === 1 ? 'Country' : 'Layer')} Name <span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder={`e.g. ${path.length === 1 ? 'India' : 'New Layer'}`}
                                            value={newLocName}
                                            onChange={e => setNewLocName(e.target.value)}
                                            style={{ height: 44, borderRadius: 8, fontSize: 14 }}
                                        />
                                    </div>


                                    <div className="d-flex gap-2 mt-4">
                                        <button
                                            className="btn btn-danger flex-grow-1 fw-bold"
                                            style={{ background: ACCENT, height: 44, borderRadius: 8 }}
                                            onClick={() => {
                                                if (!newLocName.trim()) return;
                                                const pId = path[path.length - 1].id;
                                                const newEntry = {
                                                    id: Date.now(),
                                                    parentId: pId,
                                                    name: newLocName.trim(),
                                                    code: newLocName.trim().substring(0, 3).toUpperCase(),
                                                    currency: ""
                                                };
                                                const updated = [...locations, newEntry];
                                                setLocations(updated);
                                                localStorage.setItem(SK_LOCATIONS, JSON.stringify(updated));
                                                setNewLocName("");
                                                setShowAddModal(false);
                                            }}
                                        >
                                            SAVE
                                        </button>
                                        <button
                                            className="btn btn-light flex-grow-1 fw-medium border"
                                            style={{ height: 44, borderRadius: 8 }}
                                            onClick={() => {
                                                setNewLocName("");
                                                setNewLocCode("");
                                                setNewLocCurrency("");
                                                setShowAddModal(false);
                                            }}
                                        >
                                            CANCEL
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Add Layer Modal ── */}
                    {showLayerModal && (
                        <div className="gst-modal-overlay" style={{ zIndex: 1100 }} onClick={(e) => { if (e.target === e.currentTarget) setShowLayerModal(false); }}>
                            <div className="gst-modal-content" style={{ maxWidth: 450 }}>
                                <div className="gst-modal-header">
                                    <h5 className="fw-bold"><i className="ti ti-layers-intersect me-2 text-danger" />Add New Layer</h5>
                                    <button className="btn-close-custom" onClick={() => setShowLayerModal(false)}>
                                        <i className="ti ti-x" />
                                    </button>
                                </div>
                                <div className="gst-modal-body p-4">
                                    <div className="mb-3">
                                        <label className="form-label fs-14 fw-bold">Layer Name <span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="e.g. Zone, Region, City"
                                            value={newLayerName}
                                            onChange={e => setNewLayerName(e.target.value)}
                                            style={{ height: 44, borderRadius: 8, fontSize: 14 }}
                                        />
                                        <div className="fs-12 text-muted mt-2">
                                            Define the type of sub-locations for <strong>{path[path.length - 1].name}</strong>.
                                        </div>
                                    </div>
                                    <div className="mb-3 d-flex align-items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="applyLayerToAll"
                                            checked={applyLayerToAll}
                                            onChange={e => setApplyLayerToAll(e.target.checked)}
                                            className="form-check-input mt-0"
                                            style={{ width: 18, height: 18, cursor: "pointer" }}
                                        />
                                        <label htmlFor="applyLayerToAll" className="form-label fs-14 fw-medium mb-0" style={{ cursor: "pointer" }}>
                                            Apply for all layer
                                        </label>
                                    </div>
                                    <div className="d-flex gap-2 mt-4">
                                        <button
                                            className="btn btn-danger flex-grow-1 fw-bold"
                                            style={{ background: ACCENT, height: 44, borderRadius: 8 }}
                                            onClick={() => {
                                                if (!newLayerName.trim()) return;
                                                const layerName = newLayerName.trim();
                                                let updatedLocs = [...locations];

                                                if (applyLayerToAll) {
                                                    const parentIdOfSiblings = path.length > 1 ? path[path.length - 2].id : null;
                                                    
                                                    updatedLocs = updatedLocs.map(l => {
                                                        if (l.parentId === parentIdOfSiblings) {
                                                            return { ...l, childLayerName: layerName };
                                                        }
                                                        return l;
                                                    });

                                                    if (path.length === 1) {
                                                        const updatedLayers = [...layerNames];
                                                        updatedLayers[0] = layerName;
                                                        setLayerNames(updatedLayers);
                                                        localStorage.setItem("asl_layers_v11", JSON.stringify(updatedLayers));
                                                    }
                                                } else {
                                                    if (currentParentId === null) {
                                                        const updatedLayers = [...layerNames];
                                                        updatedLayers[0] = layerName;
                                                        setLayerNames(updatedLayers);
                                                        localStorage.setItem("asl_layers_v11", JSON.stringify(updatedLayers));
                                                    } else {
                                                        updatedLocs = updatedLocs.map(l => 
                                                            l.id === currentParentId ? { ...l, childLayerName: layerName } : l
                                                        );
                                                    }
                                                }

                                                setLocations(updatedLocs);
                                                localStorage.setItem(SK_LOCATIONS, JSON.stringify(updatedLocs));

                                                setNewLayerName("");
                                                setApplyLayerToAll(false);
                                                setShowLayerModal(false);
                                                setShowAddModal(true);
                                            }}
                                        >
                                            DEFINE LAYER
                                        </button>
                                        <button className="btn btn-light flex-grow-1 fw-medium border" style={{ height: 44, borderRadius: 8 }} onClick={() => setShowLayerModal(false)}>CANCEL</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="card-body p-0">
                        {/* Breadcrumbs */}
                        <div className="px-4 pt-3 d-flex align-items-center gap-2 flex-wrap">
                            {path.map((p, i) => (
                                <React.Fragment key={i}>
                                    {i > 0 && <i className="ti ti-chevron-right text-muted fs-10" />}
                                    <button
                                        className={`btn p-0 border-0 bg-transparent fs-13 fw-bold ${i === path.length - 1 ? "text-danger" : "text-muted"}`}
                                        onClick={() => setPath(path.slice(0, i + 1))}
                                    >
                                        {p.name === "Home" ? <><i className="ti ti-world me-1" />Global</> : p.name}
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>

                        <div className="toolbar-custom py-3 px-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <div className="dropdown">
                                    <button className="btn btn-white border d-flex align-items-center gap-2 shadow-none text-dark fs-14 fw-medium" data-bs-toggle="dropdown" style={{ height: 40, borderRadius: 6, borderColor: "#e5e7eb" }}>
                                        <i className="ti ti-sort-ascending-2 fs-16" /> Sort By <i className="ti ti-chevron-down fs-12 ms-1" />
                                    </button>
                                    <ul className="dropdown-menu shadow-sm border-0">
                                        <li><button className="dropdown-item" onClick={() => setSortBy("newest")}>Newest</button></li>
                                        <li><button className="dropdown-item" onClick={() => setSortBy("oldest")}>Oldest</button></li>
                                    </ul>
                                </div>
                                <PredefinedDatePicker />
                            </div>

                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <div className="dropdown">
                                    <button
                                        className="btn btn-white border d-flex align-items-center gap-2 shadow-none text-dark fs-14 fw-medium"
                                        onClick={() => setShowFilter(!showFilter)}
                                        style={{ height: 40, borderRadius: 6, borderColor: "#e5e7eb" }}
                                    >
                                        <i className="ti ti-filter fs-16" /> Filter <i className="ti ti-chevron-down fs-12 ms-1" />
                                    </button>
                                </div>

                                <div className="dropdown">
                                    <button
                                        className="btn d-flex align-items-center gap-2 fs-14 fw-bold"
                                        data-bs-toggle="dropdown"
                                        style={{ height: 40, borderRadius: 6, padding: "0 15px", background: "#eef2ff", color: "#4f46e5", border: "none" }}
                                    >
                                        <i className="ti ti-layout-columns fs-16" /> Manage Columns
                                    </button>
                                    <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 p-3" style={{ minWidth: 220, borderRadius: 12 }}>
                                        {["name", "currency", "action"].map((col, index, arr) => (
                                            <li key={col} className={index === arr.length - 1 ? "mb-0" : "mb-3"}>
                                                <div className="d-flex align-items-center justify-content-between">
                                                    <span className="fs-14 fw-medium text-dark text-capitalize">
                                                        {col === "name" ? (currentLayerName || "Name") : col === "action" ? "Action" : col}
                                                    </span>
                                                    <div className="form-check form-switch p-0 m-0">
                                                        <input
                                                            className="form-check-input ms-0"
                                                            type="checkbox"
                                                            role="switch"
                                                            checked={visibleColumns.includes(col)}
                                                            onChange={() => {
                                                                if (visibleColumns.includes(col)) setVisibleColumns(visibleColumns.filter(c => c !== col));
                                                                else setVisibleColumns([...visibleColumns, col]);
                                                            }}
                                                            style={{
                                                                width: 35,
                                                                height: 20,
                                                                cursor: "pointer",
                                                                backgroundColor: visibleColumns.includes(col) ? "#e41f07" : "#dee2e6",
                                                                borderColor: visibleColumns.includes(col) ? "#e41f07" : "#dee2e6",
                                                                boxShadow: "none"
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="d-flex align-items-center gap-1 p-1 border rounded bg-white shadow-none" style={{ borderColor: "#e5e7eb" }}>
                                    <button onClick={() => setViewMode("list")} className="btn btn-sm d-flex align-items-center justify-content-center rounded" style={{ width: 34, height: 30, background: viewMode === "list" ? "#1ba59e" : "transparent", color: viewMode === "list" ? "#fff" : "#6c757d", border: "none" }}>
                                        <i className="ti ti-list fs-16" />
                                    </button>
                                    <button onClick={() => setViewMode("grid")} className="btn btn-sm d-flex align-items-center justify-content-center rounded" style={{ width: 34, height: 30, background: viewMode === "grid" ? "#1ba59e" : "transparent", color: viewMode === "grid" ? "#fff" : "#6c757d", border: "none" }}>
                                        <i className="ti ti-layout-grid fs-16" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 pt-0">
                            {viewMode === "list" ? (
                                <div className="border rounded bg-white overflow-hidden shadow-none">
                                    <Datatable columns={columns} dataSource={tableData} Selection={true} searchText={searchText} />
                                </div>
                            ) : (
                                <div className="row g-3">
                                    {tableData.map(r => (
                                        <div className="col-md-4" key={r.rowKey}>
                                            <div className="card border shadow-none h-100 mb-0" style={{ borderRadius: 8 }}>
                                                <div className="card-body p-3">
                                                    <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                                                        <h6 className="fw-bold mb-0 text-dark fs-14">{r.name}</h6>
                                                        <span className="badge bg-soft-secondary text-secondary fs-11">{r.code}</span>
                                                    </div>
                                                    <div className="fs-13 text-muted mb-1"><span className="fw-medium text-dark">Currency:</span> {r.currency || "—"}</div>
                                                    <div className="fs-13 text-muted"><span className="fw-medium text-dark">Parent:</span> {r.parent}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {tableData.length === 0 && <div className="text-center py-5 text-muted border rounded bg-white w-100">No {currentLayerName || 'locations'} found.</div>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <style>{`
                    .gst-modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0,0,0,0.5);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 1050;
                        backdrop-filter: blur(2px);
                    }
                    .gst-modal-content {
                        background: #fff;
                        border-radius: 12px;
                        width: 100%;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                        animation: modalFadeIn 0.3s ease;
                    }
                    .gst-modal-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 20px 24px;
                        border-bottom: 1px solid #f0f0f0;
                    }
                    .btn-close-custom {
                        border: none;
                        background: #f8f9fa;
                        width: 32px;
                        height: 32px;
                        border-radius: 6px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #666;
                        transition: 0.2s;
                    }
                    .btn-close-custom:hover {
                        background: #fee2e2;
                        color: #dc2626;
                    }
                    @keyframes modalFadeIn {
                        from { opacity: 0; transform: translateY(-20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
            </div>
            <Footer />
        </div>
    );
};

export default AssignLocationList;
