import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../../../../../../components/footer/footer";
import Datatable from "../../../../../../components/dataTable";
import PredefinedDatePicker from "../../../../../../components/common-dateRangePicker/PredefinedDatePicker";
import PageHeader from "../../../../../../components/page-header/pageHeader";
import { all_routes } from "../../../../../../routes/all_routes";
import type { LocationNode } from "./assign-location";

interface LocationRow {
    id: number;
    rowKey: string;
    itemId: number;
    levelNum: number;
    name: string;
    code: string;
    parent: string;
    status: "Active";
}

// ── Storage Keys ──────────────────────────────────────────────────────────────
const SK_LOCATIONS = "asl_locations";

// ── Seed Data ─────────────────────────────────────────────────────────────────
const SEED_LOCATIONS: LocationNode[] = [
    { id: 1, parentId: null, name: "India", code: "IN" },
    { id: 2, parentId: null, name: "USA", code: "US" },
    { id: 3, parentId: 1, name: "Tamil Nadu", code: "TN" },
    { id: 4, parentId: 3, name: "Erode", code: "ERD" },
    { id: 5, parentId: 4, name: "Erode Taluk", code: "ERD" },
    { id: 6, parentId: 5, name: "638001", code: "638" },
];

const ALL_COLS = ["Code", "Level", "Parent", "Portal Access"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadLS<T>(key: string, seed: T[]): T[] {
    try {
        const s = localStorage.getItem(key);
        if (s) {
            const p = JSON.parse(s) as T[];
            if (Array.isArray(p) && p.length) return p;
        }
    } catch { /**/ }
    try { localStorage.setItem(key, JSON.stringify(seed)); } catch { /**/ }
    return seed;
}

function saveLS<T>(key: string, data: T[]) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch { /**/ }
}

const live = <T extends { isDeleted?: boolean }>(arr: T[]) => arr.filter(x => !x.isDeleted);

function buildRows(nodes: LocationNode[]): LocationRow[] {
    const rows: LocationRow[] = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    const getDepthAndParentName = (node: LocationNode) => {
        let depth = 1;
        let pId = node.parentId;
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
        return { depth, parentName: pName };
    };

    let seq = 0;
    live(nodes).forEach(n => {
        const { depth, parentName } = getDepthAndParentName(n);
        rows.push({
            id: ++seq, rowKey: `n-${n.id}`, itemId: n.id,
            levelNum: depth,
            name: n.name, code: n.code, parent: parentName, status: "Active",
        });
    });

    return rows;
}

// ── Delete Confirm ────────────────────────────────────────────────────────────
const DeleteConfirm: React.FC<{
    name: string;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ name, onConfirm, onCancel }) => (
    <div
        style={{
            position: "fixed", inset: 0, zIndex: 2100,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
        <div
            className="bg-white shadow-lg text-center"
            style={{ borderRadius: 12, width: "100%", maxWidth: 380, padding: "32px 28px" }}
        >
            <div
                className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
                style={{ width: 60, height: 60, background: "#fff0ef" }}
            >
                <i className="ti ti-trash text-danger" style={{ fontSize: 26 }} />
            </div>
            <h6 className="fw-bold fs-16 mb-1">Delete Location?</h6>
            <p className="text-muted fs-14 mb-4">
                "<strong>{name}</strong>" will be permanently removed.
            </p>
            <div className="d-flex justify-content-center gap-3">
                <button className="btn bg-transparent fs-14 px-4" style={{ color: "#555" }} onClick={onCancel}>Cancel</button>
                <button className="btn bg-transparent fs-14 px-4" style={{ border: "1px solid #e41f07", color: "#e41f07" }} onClick={onConfirm}>
                    <i className="ti ti-trash me-1" />Delete
                </button>
            </div>
        </div>
    </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const AssignLocationList: React.FC = () => {
    const route = all_routes;
    const navigate = useNavigate();

    const [locations, setLocations] = useState<LocationNode[]>(() => loadLS(SK_LOCATIONS, SEED_LOCATIONS));

    const [searchText, setSearchText] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
    const [filterLevel, setFilterLevel] = useState<number[]>([]);
    const [pendingLevel, setPendingLevel] = useState<number[]>([]);
    const [showFilter, setShowFilter] = useState(false);
    const [levelFilterOpen, setLevelFilterOpen] = useState(false);
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(
        Object.fromEntries(ALL_COLS.map((c) => [c, true]))
    );
    const [del, setDel] = useState<{ name: string; onConfirm: () => void } | null>(null);

    const allRows = useMemo(
        () => buildRows(locations),
        [locations]
    );

    const tableData = useMemo(() => {
        let d = [...allRows];
        if (filterLevel.length) d = d.filter((r) => filterLevel.includes(r.levelNum));
        d.sort((a, b) => (sortBy === "oldest" ? a.itemId - b.itemId : b.itemId - a.itemId));
        return d;
    }, [allRows, filterLevel, sortBy]);

    const gridData = useMemo(() => {
        if (!searchText.trim()) return tableData;
        const q = searchText.toLowerCase();
        return tableData.filter(r =>
            r.name.toLowerCase().includes(q) ||
            r.code.toLowerCase().includes(q) ||
            r.parent.toLowerCase().includes(q)
        );
    }, [tableData, searchText]);

    const handleDelete = (row: LocationRow) => {
        setDel({
            name: row.name,
            onConfirm: () => {
                const u = locations.map(x => x.id === row.itemId ? { ...x, isDeleted: true } : x);
                setLocations(u);
                saveLS(SK_LOCATIONS, u);
                setDel(null);
            },
        });
    };

    const handleApplyFilter = () => {
        setFilterLevel(pendingLevel);
        setShowFilter(false);
    };

    const handleResetFilter = () => {
        setPendingLevel([]);
        setFilterLevel([]);
        setShowFilter(false);
    };

    const handleExportCSV = () => {
        const headers = ["Name", "Code", "Level", "Parent", "Status"];
        const rows = tableData.map(r => [r.name, r.code, `Level ${r.levelNum}`, r.parent, r.status]);
        const csv = [headers, ...rows]
            .map(row => row.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
            .join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "assign-location.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportPDF = () => {
        const rows = tableData.map(r =>
            `<tr><td>${r.name}</td><td>${r.code}</td><td>Level ${r.levelNum}</td><td>${r.parent}</td><td>${r.status}</td></tr>`
        ).join("");
        const html = `<html><head><title>Assign Location</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5;font-weight:600}</style></head><body><h2>Assign Location</h2><table><thead><tr><th>Name</th><th>Code</th><th>Level</th><th>Parent</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
        const win = window.open("", "_blank");
        if (win) { win.document.write(html); win.document.close(); win.print(); }
    };

    const columns = [
        {
            title: "Name",
            dataIndex: "name",
            key: "name",
            sorter: (a: LocationRow, b: LocationRow) => a.name.localeCompare(b.name),
            render: (_: any, r: LocationRow) => (
                <span className="fw-semibold fs-14" style={{ color: "#333" }}>{r.name}</span>
            ),
        },
        {
            title: "Code",
            dataIndex: "code",
            key: "code",
            render: (v: string) => <span className="fs-14 text-dark">{v}</span>,
        },
        {
            title: "Level",
            dataIndex: "levelNum",
            key: "level",
            render: (_: any, r: LocationRow) => (
                <span className="d-flex align-items-center gap-2 fs-14 text-dark">
                    <i className="ti ti-layers-intersect fs-14 text-muted flex-shrink-0" />
                    Level {r.levelNum}
                </span>
            ),
        },
        {
            title: "Parent",
            dataIndex: "parent",
            key: "parent",
            render: (v: string) => (
                <span className="fs-14" style={{ color: v === "—" ? "#bbb" : "#555" }}>{v}</span>
            ),
        },
        {
            title: "Portal Access",
            dataIndex: "status",
            key: "status",
            render: () => (
                <span style={{
                    background: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7",
                    borderRadius: 20, fontSize: 12, padding: "3px 12px", fontWeight: 600,
                }}>Enabled</span>
            ),
        },
        {
            title: "Action",
            key: "action",
            render: (_: any, r: LocationRow) => (
                <div className="dropdown table-action">
                    <Link
                        to="#"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            width: 28, height: 28, borderRadius: 6,
                            border: "1px solid #dee2e6", background: "#fff", boxShadow: "none",
                        }}
                    >
                        <i className="ti ti-dots-vertical" style={{ fontSize: 16, color: "#6c757d" }} />
                    </Link>
                    <div className="dropdown-menu dropdown-menu-right">
                        <Link
                            className="dropdown-item text-danger"
                            to="#"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(r); }}
                        >
                            <i className="ti ti-trash" /> Delete
                        </Link>
                    </div>
                </div>
            ),
        },
    ];

    const visibleColumns = columns.filter((c) => {
        if (c.title === "Name" || c.title === "Action") return true;
        return visibleCols[c.title as string] !== false;
    });

    const titleDropdown = (
        <div className="d-flex align-items-center gap-2">
            <h4 className="mb-0 fw-bold" style={{ fontSize: "18px", color: "#111" }}>Assign Location</h4>
            <span className="badge badge-soft-primary ms-1">{tableData.length}</span>
        </div>
    );

    const maxDepth = Math.max(1, ...allRows.map(r => r.levelNum));
    const depthOptions = Array.from({ length: maxDepth }, (_, i) => i + 1);

    return (
        <div className="page-wrapper" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <div className="content pb-0 flex-grow-1 d-flex flex-column mb-4">
                <PageHeader
                    title="Assign Location"
                    titleDropdown={titleDropdown}
                    showModuleTile={false}
                    moduleLink={route.assignLocationList}
                    exportComponent={
                        <div className="dropdown">
                            <Link to="#" className="dropdown-toggle btn btn-outline-light px-2 shadow" data-bs-toggle="dropdown">
                                <i className="ti ti-package-export me-2" />Export
                            </Link>
                            <div className="dropdown-menu dropdown-menu-end">
                                <ul>
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
                    onRefresh={() => {
                        setSearchText("");
                        setFilterLevel([]);
                        setSortBy("newest");
                        setLocations(loadLS(SK_LOCATIONS, SEED_LOCATIONS));
                    }}
                />

                <div className="card border-0 rounded-0 flex-grow-1 mb-0 d-flex flex-column">
                    <div className="card-header d-flex align-items-center justify-content-between gap-2 flex-wrap" style={{ borderBottom: "1px solid #f0f2f4" }}>
                        <div className="d-flex align-items-center rounded bg-white" style={{
                            width: 220,
                            border: searchFocused ? "1px solid #e41f07" : "1px solid #dee2e6", transition: "border-color 0.15s, box-shadow 0.15s",
                        }}>
                            <span className="px-2 d-flex align-items-center text-muted">
                                <i className="ti ti-search fs-14" />
                            </span>
                            <input
                                className="form-control border-0 ps-0 fs-14 bg-transparent"
                                style={{ outline: "none", boxShadow: "none", height: "36px" }}
                                placeholder="Search..."
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                            />
                        </div>
                        <button
                            className="btn text-white d-flex align-items-center btn-primary-custom"
                            style={{ background: "#e41f07", border: "none", borderRadius: "4px", height: "36px", padding: "0 14px" }}
                            onClick={() => navigate(route.assignLocation)}
                            onMouseEnter={(e) => e.currentTarget.style.background = "#cc1b06"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "#e41f07"}
                        >
                            <i className="ti ti-plus me-2 fs-16" /> Add New Location
                        </button>
                    </div>

                    <div className="card-body p-0 d-flex flex-column" style={{ minHeight: 0 }}>
                        <div className="toolbar-custom py-3 px-4">
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <div className="dropdown">
                                    <Link to="#" className="dropdown-toggle btn btn-outline-light px-2 shadow" data-bs-toggle="dropdown">
                                        <i className="ti ti-sort-ascending-2 me-2" />Sort By
                                    </Link>
                                    <div className="dropdown-menu">
                                        <ul>
                                            <li><Link to="#" className={`dropdown-item ${sortBy === "newest" ? "active" : ""}`} onClick={() => setSortBy("newest")}>Newest</Link></li>
                                            <li><Link to="#" className={`dropdown-item ${sortBy === "oldest" ? "active" : ""}`} onClick={() => setSortBy("oldest")}>Oldest</Link></li>
                                        </ul>
                                    </div>
                                </div>
                                <PredefinedDatePicker />
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <div style={{ position: "relative" }}>
                                    <button
                                        className={`btn btn-outline-light shadow px-2 ${filterLevel.length > 0 ? "border-primary text-primary" : ""}`}
                                        style={{ height: 36, fontSize: 14 }}
                                        onClick={() => setShowFilter(!showFilter)}
                                    >
                                        <i className="ti ti-filter me-2" />Filter {filterLevel.length > 0 && <span className="badge bg-primary ms-1">{filterLevel.length}</span>} <i className="ti ti-chevron-down ms-1" />
                                    </button>
                                    {showFilter && (
                                        <div className="filter-dropdown-menu dropdown-menu show shadow-lg border-0 p-0 mt-2" style={{ position: "absolute", right: 0, top: "100%", minWidth: 220, zIndex: 1060, borderRadius: 8 }}>
                                            <div className="filter-header d-flex align-items-center justify-content-between p-2 px-3 border-bottom">
                                                <h6 className="fs-14 fw-bold mb-0 text-dark"><i className="ti ti-filter me-2" />Filter</h6>
                                                <button
                                                    type="button"
                                                    className="custom-btn-close border me-0 d-flex align-items-center justify-content-center rounded-circle"
                                                    onClick={() => setShowFilter(false)}
                                                    aria-label="Close"
                                                >
                                                    <i className="ti ti-x" />
                                                </button>
                                            </div>
                                            <div className="filter-set-view p-2 px-3">
                                                <div className="accordion" id="filterAccordion">
                                                    <div className="filter-set-content">
                                                        <div className="filter-set-content-head mb-2 mt-1">
                                                            <Link
                                                                to="#"
                                                                className={levelFilterOpen ? "text-dark fw-bold fs-14" : "collapsed text-dark fw-bold fs-14"}
                                                                onClick={(e) => { e.preventDefault(); setLevelFilterOpen(!levelFilterOpen); }}
                                                            >
                                                                Level
                                                            </Link>
                                                        </div>
                                                        {levelFilterOpen && (
                                                            <div className="filter-set-contents">
                                                                <div className="filter-content-list ps-4">
                                                                    {depthOptions.map(lvl => (
                                                                        <div className="form-check mb-2" key={lvl}>
                                                                            <input
                                                                                className="form-check-input primary-checkbox"
                                                                                type="checkbox"
                                                                                id={`filter-${lvl}`}
                                                                                checked={pendingLevel.includes(lvl)}
                                                                                style={{ width: 20, height: 20, cursor: "pointer" }}
                                                                                onChange={(e) => {
                                                                                    if (e.target.checked) setPendingLevel([...pendingLevel, lvl]);
                                                                                    else setPendingLevel(pendingLevel.filter(x => x !== lvl));
                                                                                }}
                                                                            />
                                                                            <label className="form-check-label fs-14 cursor-pointer text-muted fw-medium ms-1" htmlFor={`filter-${lvl}`}>
                                                                                {lvl === 1 ? "Level 1 (Countries)" : `Level ${lvl}`}
                                                                            </label>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="d-flex align-items-center gap-2 mt-2 pt-2 border-top">
                                                    <button className="btn btn-light bg-light border-0 flex-grow-1 fs-14 fw-bold p-1 shadow-none" style={{ borderRadius: 6, height: 36, color: "#444" }} onClick={handleResetFilter}>Reset</button>
                                                    <button className="btn btn-danger flex-grow-1 fs-14 fw-bold p-1 shadow-sm" style={{ borderRadius: 6, height: 36 }} onClick={handleApplyFilter}>Filter</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {viewMode === "list" && (
                                    <div className="dropdown">
                                        <Link to="#" className="btn bg-soft-indigo px-2 border-0" style={{ height: 36, fontSize: 14, display: "inline-flex", alignItems: "center" }} data-bs-toggle="dropdown" data-bs-auto-close="outside">
                                            <i className="ti ti-columns-3 me-2" />Manage Columns
                                        </Link>
                                        <div className="dropdown-menu dropdown-md p-3">
                                            <ul>
                                                {ALL_COLS.map(col => (
                                                    <li className="gap-1 d-flex align-items-center mb-2" key={col}>
                                                        <i className="ti ti-columns me-1" />
                                                        <div className="form-check form-switch w-100 ps-0">
                                                            <label className="form-check-label d-flex align-items-center gap-2 w-100">
                                                                <span>{col}</span>
                                                                <input
                                                                    className="form-check-input switchCheckDefault ms-auto"
                                                                    type="checkbox"
                                                                    role="switch"
                                                                    checked={visibleCols[col] !== false}
                                                                    onChange={() => setVisibleCols(prev => ({ ...prev, [col]: !prev[col] }))}
                                                                />
                                                            </label>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                                <div className="d-flex align-items-center gap-1" style={{ border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", padding: "2px" }}>
                                    <button onClick={() => setViewMode("list")} style={{ width: 26, height: 24, border: "none", cursor: "pointer", background: viewMode === "list" ? "#1ba59e" : "transparent", color: viewMode === "list" ? "#fff" : "#6c757d", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                                        <i className="ti ti-list fs-14" />
                                    </button>
                                    <button onClick={() => setViewMode("grid")} style={{ width: 26, height: 24, border: "none", cursor: "pointer", background: viewMode === "grid" ? "#1ba59e" : "transparent", color: viewMode === "grid" ? "#fff" : "#222", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                                        <i className="ti ti-grid-dots fs-14" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex-grow-1 overflow-auto" style={{ minWidth: 0 }}>
                            {viewMode === "list" ? (
                                <div className="custom-table table-nowrap px-4 flex-grow-1 border-0">
                                    <Datatable
                                        columns={visibleColumns}
                                        dataSource={tableData}
                                        Selection={true}
                                        searchText={searchText}
                                    />
                                </div>
                            ) : (
                                <div className="p-4"><div className="row g-3">
                                    {gridData.map(r => (
                                        <div className="col-xxl-3 col-xl-4 col-md-6" key={r.rowKey}>
                                            <div className="card border shadow-sm h-100 hover-shadow transition-all" style={{ borderRadius: 10 }}>
                                                <div className="card-body p-3">
                                                    <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2 mb-3 border-bottom pb-3">
                                                        <div className="d-flex align-items-center">
                                                            <div className="avatar avatar-md border rounded-circle flex-shrink-0 me-2 d-flex align-items-center justify-content-center bg-soft-primary" style={{ width: 42, height: 42 }}>
                                                                <span className="fs-16 fw-bold text-primary">{r.name.charAt(0).toUpperCase()}</span>
                                                            </div>
                                                            <div>
                                                                <h6 className="mb-0 fs-14 text-dark">{r.name}</h6>
                                                                <div className="fs-12 text-muted mt-1">{r.code !== "—" ? r.code : "No Code"}</div>
                                                            </div>
                                                        </div>
                                                        <div className="dropdown table-action">
                                                            <button className="btn btn-icon btn-sm btn-outline-light shadow-sm bg-white" data-bs-toggle="dropdown">
                                                                <i className="ti ti-dots-vertical text-muted" />
                                                            </button>
                                                            <div className="dropdown-menu dropdown-menu-right">
                                                                <button className="dropdown-item text-danger" onClick={(e) => { e.stopPropagation(); handleDelete(r); }}>
                                                                    <i className="ti ti-trash me-2" /> Delete
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="d-block pt-1">
                                                        <div className="d-flex flex-column mb-3">
                                                            <p className="text-default d-inline-flex align-items-center mb-2 fs-14">
                                                                <i className="ti ti-layers-intersect text-dark me-2 fs-15" />
                                                                Level {r.levelNum}
                                                            </p>
                                                            <p className="text-default d-inline-flex align-items-center mb-0 fs-14">
                                                                <i className="ti ti-sitemap text-dark me-2 fs-15" />
                                                                {r.parent !== "—" ? r.parent : "No Parent"}
                                                            </p>
                                                        </div>
                                                        <div className="d-flex align-items-center">
                                                            <span style={{ background: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7", borderRadius: 20, fontSize: 11, padding: "3px 10px", fontWeight: 600 }}>
                                                                Enabled
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {tableData.length === 0 && (
                                        <div className="col-12 text-center text-muted py-5 fs-14">No locations found.</div>
                                    )}
                                </div></div>
                            )}
                        </div>
                    </div>
                </div>

                {del && <DeleteConfirm name={del.name} onConfirm={del.onConfirm} onCancel={() => setDel(null)} />}
            </div>
            <Footer />
        </div>
    );
};

export default AssignLocationList;
