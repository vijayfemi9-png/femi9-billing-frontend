import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Datatable from "../../../../../../components/dataTable";
import SearchInput from "../../../../../../components/dataTable/dataTableSearch";
import PredefinedDatePicker from "../../../../../../components/common-dateRangePicker/PredefinedDatePicker";
import PageHeader from "../../../../../../components/page-header/pageHeader";
import { all_routes } from "../../../../../../routes/all_routes";
import { Select } from "antd";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import "./assign-loction.scss";

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
    const [showAddModal, setShowAddModal] = useState(false);
    const [showLayerModal, setShowLayerModal] = useState(false);
    const [newLayerName, setNewLayerName] = useState("");
    const [newLocName, setNewLocName] = useState("");
    const [newLocNames, setNewLocNames] = useState<string[]>([]);
    const [newLocCode, setNewLocCode] = useState("");
    const [newLocCurrency, setNewLocCurrency] = useState("");
    const [path, setPath] = useState<{ id: number | null; name: string }[]>([{ id: null, name: "Home" }]);
    const [layerNames, setLayerNames] = useState<string[]>(() => {
        const raw = localStorage.getItem("asl_layers_v11");
        if (raw) { try { return JSON.parse(raw); } catch { } }
        return ["Country"];
    });
    const [editingLoc, setEditingLoc] = useState<LocationNode | null>(null);
    const [visibleColumns, setVisibleColumns] = useState(["name", "code", "currency", "action"]);
    const [applyLayerToAll, setApplyLayerToAll] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [showExport, setShowExport] = useState(false);

    useEffect(() => {
        const yraw = localStorage.getItem("asl_layers_v11");
        if (yraw) { try { setLayerNames(JSON.parse(yraw)); } catch { /* ignore */ } }
    }, []);

    const allRows = useMemo(() => buildRows(locations), [locations]);
    const currentParentId = path[path.length - 1].id;
    const currentParentNode = locations.find(l => l.id === currentParentId);
    const currentLayerName = currentParentNode?.childLayerName || (path.length === 1 ? layerNames[0] : "");

    const drillDown = (item: LocationNode) => {
        setPath([...path, { id: item.id, name: item.name }]);
    };

    const tableData = useMemo(() => {
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

    const columns = useMemo(() => {
        const base = [
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
                title: "Country Code",
                dataIndex: "code",
                key: "code",
                render: (v: string) => <span className="fs-14 text-dark">{v || "—"}</span>,
            },
            {
                title: "Currency Code",
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
                        <div className="dropdown-menu dropdown-menu-right shadow-lg border-0">
                            <Link to="#" className="dropdown-item py-2" onClick={() => {
                                const node = locations.find(l => String(l.id) === r.itemId);
                                if (node) {
                                    setEditingLoc(node);
                                    setNewLocName(node.name);
                                    setNewLocCode(node.code);
                                    setNewLocCurrency(node.currency || "");
                                    setShowAddModal(true);
                                }
                            }}>
                                <i className="ti ti-edit me-2" /> Edit
                            </Link>
                            <Link to="#" className="dropdown-item py-2 text-danger" onClick={() => {
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
        ];

        return base.filter(col => {
            if (!visibleColumns.includes(col.key || "")) return false;
            if (window.innerWidth < 768) {
                if (col.key === "currency") return false;
                if (path.length > 1 && col.key === "code") return false;
            }
            if (path.length > 1) {
                return col.key === "name" || col.key === "action";
            }
            return true;
        });
    }, [locations, path, currentLayerName, visibleColumns]);

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
        const html = `<html><head><title>Assign Location List</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5;font-weight:600}h2{margin-bottom:16px}</style></head><body><h2>Assign Location List</h2><table><thead><tr><th>Name</th><th>Code</th><th>Currency</th><th>Parent</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
        const win = window.open("", "_blank");
        if (win) { win.document.write(html); win.document.close(); win.print(); }
    };

    const handleRefresh = () => {
        setLocations(loadLS(SK_LOCATIONS, SEED_LOCATIONS));
        setSearchText("");
    };

    return (
        <div className="page-wrapper" style={{ minHeight: "100vh", background: "#f8f9fa" }}>
            <style>{`
                .page-wrapper .content .ant-table-wrapper .ant-table-container,
                .page-wrapper .content .ant-table-wrapper .ant-table,
                .page-wrapper .content .ant-table-wrapper .ant-table-thead,
                .page-wrapper .content .ant-table-wrapper .ant-table-thead > tr > th {
                    border-radius: 0 !important;
                    border: none !important;
                }
                .page-wrapper .content .ant-table-thead > tr > th {
                    background-color: #f8f9fa !important;
                    border-bottom: 1px solid #eef0f2 !important;
                    border-right: none !important;
                    font-weight: 700 !important;
                    color: #1e293b !important;
                    padding: 12px 16px !important;
                    border-radius: 0 !important;
                }

                /* Refined Checkbox Styles: Neutral when unchecked, red only when checked */
                .ant-checkbox .ant-checkbox-inner {
                    border-color: #d9d9d9 !important;
                }
                .ant-checkbox-checked .ant-checkbox-inner {
                    background-color: ${ACCENT} !important;
                    border-color: ${ACCENT} !important;
                }
                .ant-checkbox-wrapper:hover .ant-checkbox-inner, 
                .ant-checkbox:hover .ant-checkbox-inner {
                    border-color: #d9d9d9 !important;
                }
                
                /* Remove any blue/red focus rings from unchecked state */
                .ant-checkbox-input:focus + .ant-checkbox-inner {
                    border-color: #d9d9d9 !important;
                    box-shadow: none !important;
                }
                
                /* Subtle red focus ring only when checked */
                .ant-checkbox-checked .ant-checkbox-input:focus + .ant-checkbox-inner {
                    box-shadow: 0 0 0 2px rgba(228, 31, 7, 0.1) !important;
                }
                
                /* Remove any other blue focus rings */
                *:focus {
                    outline: none !important;
                    box-shadow: none !important;
                }
                .btn:focus, .form-control:focus, .form-select:focus {
                    border-color: ${ACCENT} !important;
                    box-shadow: 0 0 0 2px rgba(228, 31, 7, 0.1) !important;
                }

                /* Manage Columns Active State */
                .manage-columns-btn.show {
                    background-color: #4f46e5 !important;
                    color: #ffffff !important;
                }

                /* Manage Columns - remove red focus outline */
                .manage-columns-btn:focus {
                    border: none !important;
                    box-shadow: none !important;
                    outline: none !important;
                }

                /* Export icon - muted in normal state */
                .export-btn i {
                    color: #6c757d !important;
                }

                /* Toolbar Buttons Hover (Light Red) */
                .filter-btn:hover,
                .sort-by-btn:hover,
                .export-btn:hover {
                    background-color: #fff0ee !important;
                    color: #e41f07 !important;
                    border-color: #fde0dd !important;
                }

                /* Export hover - icon turns red */
                .export-btn:hover i {
                    color: #e41f07 !important;
                }

                /* Filter & Sort & Export - Click/Active (Full Red) */
                .filter-btn.active,
                .sort-by-btn.show,
                .export-btn.active {
                    background-color: #e41f07 !important;
                    color: #ffffff !important;
                    border-color: #e41f07 !important;
                }

                /* Icons white in active/click state */
                .filter-btn.active i,
                .sort-by-btn.show i,
                .export-btn.active i {
                    color: #ffffff !important;
                }
            `}</style>
            <div className="content pb-0 flex-grow-1 d-flex flex-column">
                <PageHeader
                    title="Assign Location"
                    showModuleTile={false}
                    badgeCount={tableData.length}
                    exportComponent={
                        <div className="dropdown" style={{ position: "relative" }}>
                            <button
                                className={`btn btn-outline-light px-2 shadow-none d-flex align-items-center export-btn ${showExport ? 'active' : ''}`}
                                onClick={() => setShowExport(!showExport)}
                                style={{ height: 38, borderRadius: 3, borderColor: "#ebe7e5ff" }}
                            >
                                <i className="ti ti-package-export me-2" />Export <i className="ti ti-chevron-down fs-10 ms-1" />
                            </button>
                            {showExport && (
                                <div className="dropdown-menu dropdown-menu-end show shadow-sm border-0 py-2" style={{ position: "absolute", top: "100%", right: 0, zIndex: 1060, borderRadius: 6, minWidth: 160 }}>
                                    <ul className="mb-0">
                                        <li><Link to="#" className="dropdown-item py-2 px-3 fs-14" onClick={(e) => { e.preventDefault(); handleExportPDF(); setShowExport(false); }}><i className="ti ti-file-type-pdf me-1" />Export as PDF</Link></li>
                                        <li><Link to="#" className="dropdown-item py-2 px-3 fs-14" onClick={(e) => { e.preventDefault(); handleExportCSV(); setShowExport(false); }}><i className="ti ti-file-type-xls me-1" />Export as Excel</Link></li>
                                    </ul>
                                </div>
                            )}
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
                                onClick={() => { if (currentLayerName) setShowAddModal(true); else { setNewLayerName(""); setShowLayerModal(true); } }}
                                style={{ background: ACCENT, border: "none", height: 38, padding: "0 15px", borderRadius: 3, fontSize: 14 }}
                            >
                                <i className="ti ti-plus fs-14" /> {currentLayerName ? `Add ${currentLayerName}` : (path.length === 1 ? "Add Country" : "Add Layer")}
                            </button>
                        </div>
                    </div>

                    <div className="card-body p-0">
                        <div className="px-4 pt-3 d-flex align-items-center gap-2 flex-wrap">
                            {path.map((p, i) => (
                                <React.Fragment key={i}>
                                    {i > 0 && <i className="ti ti-chevron-right text-muted fs-10" />}
                                    <button
                                        className={`p-0 border-0 bg-transparent fs-14 fw-bold ${i === path.length - 1 ? "text-danger" : "text-muted"}`}
                                        onClick={() => setPath(path.slice(0, i + 1))}
                                    >
                                        {p.name === "Home" ? <><i className="ti ti-world me-1" />Global</> : p.name}
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>

                        <div className="toolbar-custom py-3 px-4 d-flex align-items-center justify-content-between flex-wrap gap-3 bg-white">
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <div className="dropdown">
                                    <button className="btn btn-white btn-sm border d-flex align-items-center gap-2 shadow-none text-dark fs-14 fw-medium sort-by-btn" data-bs-toggle="dropdown" style={{ height: 38, borderRadius: 3, borderColor: "#ebe7e5ff" }}>
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
                                <div className="dropdown" style={{ position: "relative" }}>
                                    <button
                                        className={`btn btn-white btn-sm border d-flex align-items-center gap-2 shadow-none text-dark fs-14 fw-medium filter-btn ${showFilter ? 'active' : ''}`}
                                        onClick={() => setShowFilter(!showFilter)}
                                        style={{ height: 38, borderRadius: 3, borderColor: "#ebe7e5ff" }}
                                    >
                                        <i className="ti ti-filter fs-14" /> Filter <i className="ti ti-chevron-down fs-10 ms-1" />
                                    </button>
                                    {showFilter && (
                                        <div className="filter-dropdown-menu dropdown-menu show dropdown-menu-lg p-0 shadow-lg border-0"
                                            style={{ borderRadius: 8, position: "absolute", top: "100%", left: 0, zIndex: 1060, display: "block", minWidth: 300 }}>
                                            <div className="filter-header d-flex align-items-center justify-content-between border-bottom p-3 bg-white" style={{ borderRadius: "8px 8px 0 0" }}>
                                                <h6 className="mb-0 fw-bold"><i className="ti ti-filter me-1" />Filter</h6>
                                                <button type="button" className="btn-close-custom"
                                                    onClick={(e) => { e.stopPropagation(); setShowFilter(false); }}
                                                    style={{ width: 28, height: 28, background: "#fff1f0", border: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                    <i className="ti ti-x" style={{ color: "#e41f07", fontSize: 14 }} />
                                                </button>
                                            </div>
                                            <div className="p-3 bg-white" style={{ borderRadius: "0 0 8px 8px" }}>
                                                <div className="mb-3">
                                                    <label className="form-label fs-14 fw-bold">Location Name</label>
                                                    <input type="text" className="form-control" placeholder="Search..." />
                                                </div>
                                                <div className="d-flex align-items-center gap-2 mt-4">
                                                    <button type="button" className="btn btn-light w-100 fs-14 fw-medium" onClick={() => setShowFilter(false)}>Reset</button>
                                                    <button type="button" className="btn btn-danger w-100 fs-14 fw-bold" style={{ background: ACCENT, border: "none" }} onClick={() => setShowFilter(false)}>Apply</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="dropdown">
                                    <button
                                        className="btn btn-sm d-flex align-items-center gap-2 fs-14 fw-bold manage-columns-btn"
                                        data-bs-toggle="dropdown"
                                        style={{ height: 38, borderRadius: 3, padding: "0 15px", background: "#eef2ff", color: "#4f46e5", border: "none" }}
                                    >
                                        <i className="ti ti-layout-columns fs-14" /> Manage Columns
                                    </button>
                                    <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 p-3" style={{ minWidth: 220, borderRadius: 12 }}>
                                        {["name", "code", "currency", "action"].map((col, idx) => (
                                            <li key={col} className={idx === 3 ? "mb-0" : "mb-3"}>
                                                <div className="d-flex align-items-center justify-content-between">
                                                    <span className="fs-14 fw-medium text-dark text-capitalize">{col}</span>
                                                    <div className="form-check form-switch mb-0">
                                                        <input className="form-check-input shadow-none" type="checkbox" checked={visibleColumns.includes(col)} onChange={() => {
                                                            if (visibleColumns.includes(col)) setVisibleColumns(visibleColumns.filter(c => c !== col));
                                                            else setVisibleColumns([...visibleColumns, col]);
                                                        }} />
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="dropdown">
                                    <button className="btn btn-white btn-sm border d-flex align-items-center justify-content-center shadow-none text-muted more-action-btn" data-bs-toggle="dropdown" style={{ height: 38, width: 38, borderRadius: 3, borderColor: "#ebe7e5ff" }}>
                                        <i className="ti ti-dots fs-14" />
                                    </button>
                                    <div className="dropdown-menu dropdown-menu-end shadow-sm border-0 py-2 mt-1" style={{ minWidth: 140, borderRadius: 6 }}>
                                        <button className="dropdown-item py-2 px-3 d-flex align-items-center gap-2 fs-14 fw-medium" onClick={() => { setNewLayerName(currentLayerName || ""); setShowLayerModal(true); }}>
                                            <i className="ti ti-edit fs-15 text-muted" /> Edit Layer
                                        </button>
                                        <button className="dropdown-item py-2 px-3 d-flex align-items-center gap-2 fs-14 text-danger fw-medium" onClick={() => {
                                            const updatedLocs = locations.map(l => l.id === currentParentId ? { ...l, childLayerName: "" } : l);
                                            setLocations(updatedLocs);
                                            localStorage.setItem(SK_LOCATIONS, JSON.stringify(updatedLocs));
                                        }}>
                                            <i className="ti ti-trash fs-15" /> Delete Layer
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-0 p-4">
                            <div className="bg-white overflow-hidden">
                                <Datatable
                                    columns={columns}
                                    dataSource={tableData}
                                    Selection={true}
                                    key={`${currentParentId}-${locations.length}`}
                                    searchText={searchText}
                                    onRow={(record: LocationRow) => ({
                                        onClick: (event: any) => {
                                            if (event.target.closest('.table-action') || event.target.closest('.ant-checkbox-wrapper')) return;
                                            const original = locations.find(l => String(l.id) === record.itemId);
                                            if (original) drillDown(original);
                                        },
                                        style: { cursor: 'pointer' }
                                    })}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Add Location Modal ── */}
            {showAddModal && (
                <div className="gst-modal-overlay" style={{ zIndex: 1100 }} onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
                    <div className="gst-modal-content" style={{ maxWidth: 500 }}>
                        <div className="gst-modal-header">
                            <h5 className="fw-bold"><i className="ti ti-map-pin me-2 text-danger" />{editingLoc ? 'Edit' : 'Add New'} {(currentLayerName || (path.length === 1 ? 'Country' : 'Layer')).charAt(0).toUpperCase() + (currentLayerName || (path.length === 1 ? 'Country' : 'Layer')).slice(1)}</h5>
                            <button className="btn-close-custom" onClick={() => setShowAddModal(false)}><i className="ti ti-x" /></button>
                        </div>
                        <div className="gst-modal-body p-4">
                            <div className="mb-3">
                                <label className="form-label fs-14 fw-bold">Name <span className="text-danger">*</span></label>
                                {editingLoc ? (
                                    <input type="text" className="form-control" value={newLocName} onChange={e => setNewLocName(e.target.value)} style={{ height: 38, borderRadius: 3 }} />
                                ) : (
                                    <Select mode="tags" style={{ width: '100%' }} className="antd-tags-input" placeholder="Type names and press Space" value={newLocNames} onChange={setNewLocNames} tokenSeparators={[',', ' ']} />
                                )}
                            </div>
                            {path.length === 1 && (
                                <div className="row">
                                    <div className="col-6 mb-3">
                                        <label className="form-label fs-14 fw-bold">Country Code</label>
                                        <input type="text" className="form-control" value={newLocCode} onChange={e => setNewLocCode(e.target.value)} style={{ height: 38, borderRadius: 3 }} />
                                    </div>
                                    <div className="col-6 mb-3">
                                        <label className="form-label fs-14 fw-bold">Currency</label>
                                        <input type="text" className="form-control" value={newLocCurrency} onChange={e => setNewLocCurrency(e.target.value)} style={{ height: 38, borderRadius: 3 }} />
                                    </div>
                                </div>
                            )}
                            <div className="d-flex gap-2 mt-4">
                                <button className="btn btn-danger flex-grow-1 fw-bold" style={{ background: ACCENT, height: 38, borderRadius: 3 }} onClick={() => {
                                    const pId = path[path.length - 1].id;
                                    let updated;
                                    if (editingLoc) {
                                        updated = locations.map(l => l.id === editingLoc.id ? { ...l, name: newLocName.trim(), code: newLocCode.trim(), currency: newLocCurrency.trim() } : l);
                                    } else {
                                        const maxId = locations.length > 0 ? Math.max(...locations.map(l => l.id)) : 0;
                                        const newEntries = newLocNames.map((name, idx) => ({
                                            id: maxId + idx + 1,
                                            parentId: pId,
                                            name: name.trim(),
                                            code: path.length === 1 ? newLocCode.trim() : name.trim().substring(0, 3).toUpperCase(),
                                            currency: path.length === 1 ? newLocCurrency.trim() : ""
                                        }));
                                        updated = [...locations, ...newEntries];
                                    }
                                    setLocations(updated);
                                    localStorage.setItem(SK_LOCATIONS, JSON.stringify(updated));
                                    setShowAddModal(false);
                                    setNewLocNames([]);
                                }}>SAVE</button>
                                <button className="btn btn-light flex-grow-1 fw-medium border" style={{ height: 38, borderRadius: 3 }} onClick={() => setShowAddModal(false)}>CANCEL</button>
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
                            <button className="btn-close-custom" onClick={() => setShowLayerModal(false)}><i className="ti ti-x" /></button>
                        </div>
                        <div className="gst-modal-body p-4">
                            <div className="mb-3">
                                <label className="form-label fs-14 fw-bold">Layer Name <span className="text-danger">*</span></label>
                                <input type="text" className="form-control" value={newLayerName} onChange={e => setNewLayerName(e.target.value)} style={{ height: 38, borderRadius: 3 }} />
                            </div>
                            <div className="mb-3 d-flex align-items-center gap-2">
                                <input type="checkbox" id="applyAll" checked={applyLayerToAll} onChange={e => setApplyLayerToAll(e.target.checked)} className="form-check-input" />
                                <label htmlFor="applyAll" className="form-label fs-14 fw-medium mb-0">Apply for all layer</label>
                            </div>
                            <div className="d-flex gap-2 mt-4">
                                <button className="btn btn-danger flex-grow-1 fw-bold" style={{ background: ACCENT, height: 38, borderRadius: 3 }} onClick={() => {
                                    if (!newLayerName.trim()) return;
                                    const layerName = newLayerName.trim();
                                    let updatedLocs = [...locations];
                                    if (applyLayerToAll) {
                                        const parentIdOfSiblings = path.length > 1 ? path[path.length - 2].id : null;
                                        updatedLocs = updatedLocs.map(l => l.parentId === parentIdOfSiblings ? { ...l, childLayerName: layerName } : l);
                                        if (path.length === 1) {
                                            const layers = [...layerNames]; layers[0] = layerName;
                                            setLayerNames(layers); localStorage.setItem("asl_layers_v11", JSON.stringify(layers));
                                        }
                                    } else {
                                        if (currentParentId === null) {
                                            const layers = [...layerNames]; layers[0] = layerName;
                                            setLayerNames(layers); localStorage.setItem("asl_layers_v11", JSON.stringify(layers));
                                        } else {
                                            updatedLocs = updatedLocs.map(l => l.id === currentParentId ? { ...l, childLayerName: layerName } : l);
                                        }
                                    }
                                    setLocations(updatedLocs);
                                    localStorage.setItem(SK_LOCATIONS, JSON.stringify(updatedLocs));
                                    setShowLayerModal(false);
                                    setShowAddModal(true);
                                }}>DEFINE LAYER</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssignLocationList;
