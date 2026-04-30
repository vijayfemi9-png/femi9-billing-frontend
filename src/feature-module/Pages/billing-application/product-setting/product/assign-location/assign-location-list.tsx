import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../../../../../../components/footer/footer";
import Datatable from "../../../../../../components/dataTable";
import SearchInput from "../../../../../../components/dataTable/dataTableSearch";
import PredefinedDatePicker from "../../../../../../components/common-dateRangePicker/PredefinedDatePicker";
import PageHeader from "../../../../../../components/page-header/pageHeader";
import { all_routes } from "../../../../../../routes/all_routes";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

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
                    <button type="button" className="table-action-btn" data-bs-toggle="dropdown" aria-expanded="false">
                        <i className="ti ti-dots-vertical" />
                    </button>
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

    // ── Export Handlers ──────────────────────────────────────────────────────
    const handleExportCSV = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Locations");
        worksheet.columns = [
            { header: "Name", key: "name", width: 30 },
            { header: "Code", key: "code", width: 15 },
            { header: "Currency", key: "currency", width: 15 },
            { header: "Parent", key: "parent", width: 25 },
        ];
        tableData.forEach(row => {
            worksheet.addRow({
                name: row.name,
                code: row.code,
                currency: row.currency,
                parent: row.parent,
            });
        });
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `locations_${new Date().getTime()}.xlsx`);
    };

    const handleExportPDF = () => {
        const rows = tableData.map(r =>
            `<tr><td>${r.name}</td><td>${r.code}</td><td>${r.currency || "—"}</td><td>${r.parent || "—"}</td></tr>`
        ).join("");
        const html = `
      <html>
        <head>
          <title>Assign Location List</title>
          <style>
            body{font-family:sans-serif;padding:20px}
            table{width:100%;border-collapse:collapse}
            th,td{border:1px solid #ddd;padding:8px;text-align:left}
            th{background:#f5f5f5;font-weight:600}
            h2{margin-bottom:16px}
          </style>
        </head>
        <body>
          <h2>Assign Location List</h2>
          <table>
            <thead>
              <tr><th>Name</th><th>Code</th><th>Currency</th><th>Parent</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>`;
        const win = window.open("", "_blank");
        if (win) { win.document.write(html); win.document.close(); win.print(); }
    };

    const handleRefresh = () => {
        setLocations(loadLS(SK_LOCATIONS, SEED_LOCATIONS));
        setSearchText("");
    };

    return (
        <div className="page-wrapper" style={{ minHeight: "100vh", background: "#f8f9fa" }}>
            <div className="content pb-0 flex-grow-1 d-flex flex-column">
                <PageHeader
                    title="Assign Location"
                    showModuleTile={false}
                    badgeCount={tableData.length}
                    exportComponent={
                        <div className="dropdown">
                            <Link to="#" className="dropdown-toggle btn btn-outline-light px-2 shadow" data-bs-toggle="dropdown">
                                <i className="ti ti-package-export me-2" />Export
                            </Link>
                            <div className="dropdown-menu dropdown-menu-end">
                                <ul className="mb-0">
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
                    onRefresh={handleRefresh}
                    settingsLink="#"
                />
                <div className="card border-0 shadow-none mb-4">
                    <div className="card-header d-flex align-items-center justify-content-between gap-2 flex-wrap">
                        <div className="d-flex align-items-center gap-3">

                            <div className="input-icon input-icon-start position-relative" style={{ width: 250 }}>
                                <span className="input-icon-addon text-dark"><i className="ti ti-search" /></span>
                                <SearchInput value={searchText} onChange={setSearchText} />
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <button
                                className="btn btn-danger d-flex align-items-center gap-2 fw-bold"
                                onClick={() => {
                                    if (currentLayerName) setShowAddModal(true);
                                    else {
                                        setNewLayerName("");
                                        setShowLayerModal(true);
                                    }
                                }}
                                style={{ background: ACCENT, border: "none", height: 38, padding: "0 15px", borderRadius: 3, fontSize: 14 }}
                            >
                                <i className="ti ti-plus fs-14" /> {currentLayerName ? `Add ${currentLayerName}` : (path.length === 1 ? "Add Country" : "Add Layer")}
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
                                                    className={`btn p-0 border-0 bg-transparent fs-14 fw-bold ${i === modalPath.length - 1 ? "text-danger" : "text-muted"}`}
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
                                    <div className="rounded bg-white">
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
                                            searchText=""
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
                                            style={{ height: 38, borderRadius: 3, fontSize: 14 }}
                                        />
                                    </div>


                                    <div className="d-flex gap-2 mt-4">
                                        <button
                                            className="btn btn-danger flex-grow-1 fw-bold"
                                            style={{ background: ACCENT, height: 38, borderRadius: 3 }}
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
                                            style={{ height: 38, borderRadius: 3 }}
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
                                            style={{ height: 38, borderRadius: 3, fontSize: 14 }}
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
                                            style={{ background: ACCENT, height: 38, borderRadius: 3 }}
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
                                        <button className="btn btn-light flex-grow-1 fw-medium border" style={{ height: 38, borderRadius: 3 }} onClick={() => setShowLayerModal(false)}>CANCEL</button>
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
                                        className={`btn p-0 border-0 bg-transparent fs-14 fw-bold ${i === path.length - 1 ? "text-danger" : "text-muted"}`}
                                        onClick={() => setPath(path.slice(0, i + 1))}
                                    >
                                        {p.name === "Home" ? <><i className="ti ti-world me-1" />Global</> : p.name}
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>

                        <div className="toolbar-custom py-2 px-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <div className="dropdown">
                                    <button className="btn btn-white btn-sm border d-flex align-items-center gap-2 text-dark fs-14 sort-by-btn" data-bs-toggle="dropdown" style={{ height: 38, borderRadius: 3, borderColor: "#ebe7e5ff", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                                        <i className="ti ti-sort-ascending-2 fs-14 " /> Sort By <i className="ti ti-chevron-down fs-10 ms-1" />
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
                                        className="btn btn-white btn-sm border d-flex align-items-center gap-2 shadow-none text-dark fs-14 fw-medium filter-btn"
                                        data-bs-toggle="dropdown"
                                        data-bs-auto-close="outside"
                                        style={{ height: 38, borderRadius: 3, borderColor: "#ebe7e5ff", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
                                    >
                                        <i className="ti ti-filter fs-14" /> Filter <i className="ti ti-chevron-down fs-10 ms-1" />
                                    </button>
                                    <div className="filter-dropdown-menu dropdown-menu dropdown-menu-lg p-0">
                                        <div className="filter-header d-flex align-items-center justify-content-between border-bottom">
                                            <h6 className="mb-0">
                                                <i className="ti ti-filter me-1" />
                                                Filter
                                            </h6>
                                            <button
                                                type="button"
                                                className="btn-close close-filter-btn"
                                                data-bs-dismiss="dropdown"
                                                aria-label="Close"
                                            />
                                        </div>
                                        <div className="filter-set-view p-3">
                                            <div className="accordion" id="filterAccordion">
                                                {/* Location Name Filter */}
                                                <div className="filter-set-content">
                                                    <div className="filter-set-content-head">
                                                        <a
                                                            href="#"
                                                            data-bs-toggle="collapse"
                                                            data-bs-target="#collapseName"
                                                            aria-expanded="true"
                                                            aria-controls="collapseName"
                                                        >
                                                            Location Name
                                                        </a>
                                                    </div>
                                                    <div
                                                        className="filter-set-contents accordion-collapse collapse show"
                                                        id="collapseName"
                                                        data-bs-parent="#filterAccordion"
                                                    >
                                                        <div className="filter-content-list bg-light rounded border p-2 shadow-none">
                                                            <div className="mb-2 position-relative">
                                                                <i className="ti ti-search position-absolute text-muted" style={{ left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, pointerEvents: "none" }} />
                                                                <input
                                                                    type="text"
                                                                    className="form-control form-control-sm"
                                                                    placeholder="Search..."
                                                                    style={{ paddingLeft: 30 }}
                                                                />
                                                            </div>
                                                            <ul className="mb-0 list-unstyled" style={{ maxHeight: 150, overflowY: "auto" }}>
                                                                {[...new Set(locations.map(l => l.name))].slice(0, 5).map((name, idx) => (
                                                                    <li key={idx} className="mb-1">
                                                                        <label className="dropdown-item px-2 d-flex align-items-center fs-14">
                                                                            <input className="form-check-input m-0 me-2" type="checkbox" />
                                                                            {name}
                                                                        </label>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Code Filter */}
                                                <div className="filter-set-content">
                                                    <div className="filter-set-content-head">
                                                        <a
                                                            href="#"
                                                            className="collapsed"
                                                            data-bs-toggle="collapse"
                                                            data-bs-target="#collapseCode"
                                                            aria-expanded="false"
                                                            aria-controls="collapseCode"
                                                        >
                                                            Location Code
                                                        </a>
                                                    </div>
                                                    <div
                                                        className="filter-set-contents accordion-collapse collapse"
                                                        id="collapseCode"
                                                        data-bs-parent="#filterAccordion"
                                                    >
                                                        <div className="filter-content-list bg-light rounded border p-2 shadow-none mt-2">
                                                            <input
                                                                type="text"
                                                                className="form-control form-control-sm"
                                                                placeholder="Enter Code"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Currency Filter */}
                                                <div className="filter-set-content">
                                                    <div className="filter-set-content-head">
                                                        <a
                                                            href="#"
                                                            className="collapsed"
                                                            data-bs-toggle="collapse"
                                                            data-bs-target="#collapseCurrency"
                                                            aria-expanded="false"
                                                            aria-controls="collapseCurrency"
                                                        >
                                                            Currency
                                                        </a>
                                                    </div>
                                                    <div
                                                        className="filter-set-contents accordion-collapse collapse"
                                                        id="collapseCurrency"
                                                        data-bs-parent="#filterAccordion"
                                                    >
                                                        <div className="filter-content-list bg-light rounded border p-2 shadow-none mt-2">
                                                            <select className="form-select form-select-sm">
                                                                <option value="">Select Currency</option>
                                                                <option value="INR">INR</option>
                                                                <option value="USD">USD</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="filter-reset-btns d-flex align-items-center gap-2 mt-4">
                                                <button type="button" className="btn btn-light w-100 fs-14">Reset</button>
                                                <button type="button" className="btn btn-danger w-100 fs-14" style={{ background: ACCENT, border: "none" }}>Apply Filter</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="dropdown">
                                    <button
                                        className="btn btn-sm d-flex align-items-center gap-2 fs-14 fw-bold"
                                        data-bs-toggle="dropdown"
                                        style={{ height: 38, borderRadius: 6, padding: "0 15px", background: "#eef2ff", color: "#4f46e5", border: "none" }}
                                    >
                                        <i className="ti ti-layout-columns fs-14" /> Manage Columns
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

                                <div className="dropdown">
                                    <button
                                        className="btn btn-white btn-sm border d-flex align-items-center justify-content-center shadow-none text-muted more-action-btn"
                                        data-bs-toggle="dropdown"
                                        aria-expanded="false"
                                        style={{ height: 36, width: 36, borderRadius: 3, borderColor: "#ebe7e5ff" }}
                                    >
                                        <i className="ti ti-dots-vertical fs-14" />
                                    </button>
                                    <div className="dropdown-menu dropdown-menu-end shadow-sm border-0 py-2 mt-1" style={{ minWidth: 140, borderRadius: 6 }}>
                                        <button
                                            className="dropdown-item py-2 px-3 d-flex align-items-center gap-2 fs-14 fw-medium"
                                            onClick={() => {
                                                setNewLayerName(currentLayerName || "");
                                                setShowLayerModal(true);
                                            }}
                                            disabled={!currentLayerName && path.length > 1}
                                        >
                                            <i className="ti ti-edit fs-15 text-muted" /> Edit Layer
                                        </button>
                                        <button
                                            className="dropdown-item py-2 px-3 d-flex align-items-center gap-2 fs-14 text-danger fw-medium"
                                            onClick={() => {
                                                if (!currentLayerName && path.length > 1) return;
                                                const updatedLocs = locations.map(l =>
                                                    l.id === currentParentId ? { ...l, childLayerName: "" } : l
                                                );
                                                setLocations(updatedLocs);
                                                localStorage.setItem(SK_LOCATIONS, JSON.stringify(updatedLocs));

                                                if (path.length === 1) {
                                                    const updatedLayers = [...layerNames];
                                                    updatedLayers[0] = "";
                                                    setLayerNames(updatedLayers);
                                                    localStorage.setItem("asl_layers_v11", JSON.stringify(updatedLayers));
                                                }
                                            }}
                                            disabled={!currentLayerName && path.length > 1}
                                        >
                                            <i className="ti ti-trash fs-15" /> Delete Layer
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 pt-0">
                            <div className="rounded bg-white shadow-none">
                                <Datatable columns={columns} dataSource={tableData} Selection={true} searchText={searchText} size="small" />
                            </div>
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
                    .footer {
                        border-top: none !important;
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
                    /* Page Header Styles */
                    .page-wrapper .content .mb-4.flex-wrap {
                        margin-bottom: 2rem !important;
                    }
                    .page-wrapper .content h4 {
                        font-size: 20px !important;
                        margin-bottom: 6px !important;
                        display: flex;
                        align-items: center;
                    }
                    .page-wrapper .content h4 .badge {
                        font-size: 13px !important;
                        padding: 2px 10px !important;
                        border-radius: 6px !important;
                        background: #fff1f0 !important;
                        color: #e41f07 !important;
                        font-weight: 700 !important;
                        border: 1px solid #ffccc7 !important;
                        border-bottom: 2px solid #ffa39e !important;
                        display: inline-flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        min-width: 20px !important;
                    }
                    .page-wrapper .content .breadcrumb {
                        font-size: 14px !important;
                        color: #64748b !important;
                    }
                    .page-wrapper .content .breadcrumb-item a {
                        color: #64748b !important;
                        text-decoration: none !important;
                    }
                    .page-wrapper .content .breadcrumb-item.active {
                        color: #000 !important;
                        font-weight: 600 !important;
                    }
                    .page-wrapper .content .breadcrumb-item + .breadcrumb-item::before {
                        content: "" !important;
                        font-family: "tabler-icons" !important;
                        font-size: 12px !important;
                        color: #94a3b8 !important;
                        vertical-align: middle !important;
                        padding-right: 8px !important;
                    }
                    /* Standardizing all header buttons to SMALL template size (38px) */
                    .page-wrapper .content .btn-outline-light {
                        height: 38px !important;
                        display: inline-flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        font-size: 14px !important;
                        padding: 0 12px !important;
                        border-color: #e5e7eb !important;
                        color: #374151 !important;
                        background: #fff !important;
                        box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
                        border-radius: 3px !important;
                    }
                    .page-wrapper .content .btn-outline-light:hover {
                        background: #fff1f0 !important;
                        border-color: #ffccc7 !important;
                        color: #e41f07 !important;
                    }
                    .page-wrapper .content .btn-outline-light i {
                        font-size: 16px !important;
                    }
                    .page-wrapper .content .btn-icon {
                        width: 38px !important;
                        height: 38px !important;
                        padding: 0 !important;
                    }
                    .page-wrapper .content .dropdown-toggle::after {
                        font-size: 12px !important;
                        margin-left: 6px !important;
                    }
                    .sort-by-btn {
                        transition: all 0.2s ease !important;
                    }
                    .sort-by-btn:hover {
                        background: #fff7f6 !important;
                        border-color: #fde0dd !important;
                        color: #e41f07 !important;
                        box-shadow: 0 2px 6px rgba(228, 31, 7, 0.07) !important;
                    }
                    .filter-btn {
                        transition: all 0.2s ease !important;
                    }
                    .filter-btn:hover {
                        background: #fff7f6 !important;
                        border-color: #fde0dd !important;
                        color: #e41f07 !important;
                        box-shadow: 0 2px 6px rgba(228, 31, 7, 0.07) !important;
                    }
                    .delete-layer-btn {
                        transition: all 0.2s ease !important;
                    }
                    .delete-layer-btn:hover {
                        background: #fff7f6 !important;
                        border-color: #fde0dd !important;
                        box-shadow: 0 2px 6px rgba(228, 31, 7, 0.07) !important;
                    }

                    /* Standard Table Action Button (Dark Hover) */
                    .page-wrapper .content .table-action-btn {
                        width: 28px !important;
                        height: 28px !important;
                        border-radius: 6px !important;
                        border: 1px solid #dee2e6 !important;
                        background: #fff !important;
                        color: #6c757d !important;
                        display: inline-flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        transition: all 0.2s ease !important;
                        cursor: pointer;
                    }
                    .page-wrapper .content .table-action-btn i {
                        font-size: 15px !important;
                    }
                    .page-wrapper .content .table-action-btn:hover {
                        background: #fff1f0 !important;
                        border-color: #ffccc7 !important;
                        color: #e41f07 !important;
                    }
                    .page-wrapper .content .table-action-btn:hover i {
                        color: #e41f07 !important;
                    }
                    .more-action-btn:hover {
                        background: #fff1f0 !important;
                        border-color: #ffccc7 !important;
                        color: #e41f07 !important;
                    }
                    /* Template Table Styles */
                    .ant-table-thead > tr > th {
                        background-color: #f8f9fa !important;
                        border-bottom: 1px solid #eef0f2 !important;
                        border-top: none !important;
                        font-weight: 600 !important;
                        color: #334155 !important;
                    }
                    .ant-table-tbody > tr > td {
                        border-bottom: 1px solid #eef0f2 !important;
                    }
                    .ant-table-wrapper .ant-table-container {
                        border: none !important;
                    }
                    /* Remove Card Border and Shadow (Corner fix) */
                    .card {
                        border: none !important;
                        box-shadow: none !important;
                        outline: none !important;
                    }
                    .card-header {
                        border-bottom: 1px solid #e2e6e8ff !important;
                    }
                `}</style>
            </div>
            <Footer />
        </div>
    );
};

export default AssignLocationList;
