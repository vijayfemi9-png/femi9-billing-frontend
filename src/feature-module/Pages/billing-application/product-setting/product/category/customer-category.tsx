import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { all_routes } from "../../../../../../routes/all_routes";
import PageHeader from "../../../../../../components/page-header/pageHeader";
import Datatable from "../../../../../../components/dataTable";
import SearchInput from "../../../../../../components/dataTable/dataTableSearch";
import PredefinedDatePicker from "../../../../../../components/common-dateRangePicker/PredefinedDatePicker";
import Footer from "../../../../../../components/footer/footer";
import "./category.scss";
import { OverlayTrigger, Tooltip } from "react-bootstrap";

/* ═══════════════════════════════════════
   TYPES
   ═══════════════════════════════════════ */
interface UserCategory {
  id: number;
  name: string;
  code: string;
  level: number;
  parent: string | null;
  description: string;
  portalAccess: boolean;
  visibleInMap: boolean;
  linkToLocation: string | null;
  status: "Enabled" | "Disabled";
  isChild?: boolean; // Added for form management
}

/* ═══════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════ */
const TooltipIcon = ({ text }: { text: string }) => (
  <OverlayTrigger placement="top" overlay={<Tooltip id={`tooltip-${text}`}>{text}</Tooltip>}>
    <i className="ti ti-info-circle text-muted ms-1 cursor-help" style={{ fontSize: "14px" }} />
  </OverlayTrigger>
);

// ── Delete Confirm Component ──────────────────────────────────────────────────
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
      style={{ borderRadius: 3, width: "100%", maxWidth: 380, padding: "32px 28px" }}
    >
      <div
        className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
        style={{ width: 60, height: 60, background: "#fff0ef" }}
      >
        <i className="ti ti-trash text-danger" style={{ fontSize: 26 }} />
      </div>
      <h6 className="fw-bold fs-16 mb-1">Delete Category?</h6>
      <p className="text-muted fs-14 mb-4">
        "<strong>{name}</strong>" will be permanently removed.
      </p>
      <div className="d-flex justify-content-center gap-3">
        <button className="btn btn-light fs-14 px-4" onClick={onCancel} style={{ borderRadius: 3 }}>Cancel</button>
        <button className="btn btn-danger fs-14 px-4" onClick={onConfirm} style={{ borderRadius: 3, background: '#E41F07' }}>
          <i className="ti ti-trash me-1" />Delete
        </button>
      </div>
    </div>
  </div>
);

const route = all_routes;

const defaultCategories: UserCategory[] = [
  { id: 1, name: "Super_stockist", code: "SS001", level: 1, parent: null, description: "Top level stockist", portalAccess: true, visibleInMap: true, linkToLocation: null, status: "Enabled" },
  { id: 2, name: "mvbfy", code: "MV0001", level: 1, parent: null, description: "Marketing division", portalAccess: true, visibleInMap: true, linkToLocation: null, status: "Enabled" },
  { id: 3, name: "cfvgbhj", code: "CF0001", level: 1, parent: null, description: "Finance division", portalAccess: true, visibleInMap: true, linkToLocation: null, status: "Enabled" },
  { id: 4, name: "New SS", code: "SS01", level: 1, parent: null, description: "New Stockist", portalAccess: true, visibleInMap: true, linkToLocation: null, status: "Enabled" },
  { id: 5, name: "drtr", code: "DR001", level: 2, parent: null, description: "District Retailer", portalAccess: true, visibleInMap: true, linkToLocation: null, status: "Enabled" },
  { id: 6, name: "New S", code: "S001", level: 2, parent: "New SS", description: "Sub Stockist", portalAccess: true, visibleInMap: true, linkToLocation: null, status: "Enabled" },
  { id: 7, name: "Super_distributor", code: "SD001", level: 2, parent: "Super_stockist", description: "Main distributor", portalAccess: true, visibleInMap: true, linkToLocation: null, status: "Enabled" },
];

const UserCategoryPage: React.FC = () => {
  const navigate = useNavigate();
  // ── State ──────────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<UserCategory[]>(() => {
    const saved = JSON.parse(localStorage.getItem("categories") || "[]");
    const savedIds = new Set(saved.map((c: UserCategory) => c.id));
    const merged = [...defaultCategories.filter(c => !savedIds.has(c.id)), ...saved];
    return merged;
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [del, setDel] = useState<{ name: string; onConfirm: () => void } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [formData, setFormData] = useState<Partial<UserCategory>>({
    name: "", code: "", description: "", level: 1, portalAccess: true, visibleInMap: true, parent: null, isChild: false, linkToLocation: ""
  });

  // ── Toolbar State ────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [showFilter, setShowFilter] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [pendingFilter, setPendingFilter] = useState<string[]>([]);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    "Name": true, "Code": true, "Level": true, "Parent": true, "Portal Access": true, "Status": true
  });
  const ALL_COLS = ["Name", "Code", "Level", "Parent", "Portal Access", "Status"];

  // ── Toolbar Handlers ──────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = ["Name", "Code", "Level", "Parent", "Status"];
    const rows = categories.map(c => [c.name, c.code, c.level, c.parent || "None", c.status]);
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "user_categories.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const rows = categories.map(c =>
      `<tr><td>${c.name}</td><td>${c.code}</td><td>Level ${c.level}</td><td>${c.parent || "—"}</td><td>${c.status}</td></tr>`
    ).join("");
    const html = `
      <html>
        <head>
          <title>Customer Category</title>
          <style>
            body{font-family:sans-serif;padding:20px}
            table{width:100%;border-collapse:collapse}
            th,td{border:1px solid #ddd;padding:8px;text-align:left}
            th{background:#f5f5f5;font-weight:600}
            h2{margin-bottom:16px}
          </style>
        </head>
        <body>
          <h2>Customer Category</h2>
          <table>
            <thead>
              <tr><th>Name</th><th>Code</th><th>Level</th><th>Parent</th><th>Status</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  const handleRefresh = () => {
    setSearchTerm("");
    setFilterStatus([]);
    setPendingFilter([]);
    setSortBy("newest");
  };

  const handleApplyFilter = () => {
    setFilterStatus(pendingFilter);
    setShowFilter(false);
  };

  const handleResetFilter = () => {
    setPendingFilter([]);
    setFilterStatus([]);
    setShowFilter(false);
  };

  // ── Handlers ───────────────────────────────────────────────────────────────


  const handleEdit = (cat: UserCategory) => {
    navigate(route.addCategory, { state: { editData: cat } });
  };

  const handleDelete = (id: number) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;

    setDel({
      name: cat.name,
      onConfirm: () => {
        const updated = categories.filter(c => c.id !== id);
        setCategories(updated);
        localStorage.setItem("categories", JSON.stringify(updated.filter(c => !defaultCategories.find(d => d.id === c.id))));
        setDel(null);
      }
    });
  };

  const handleSave = () => {
    if (!formData.name) return;

    if (isEditing) {
      setCategories(categories.map(c => c.id === formData.id ? { ...formData } as UserCategory : c));
    } else {
      const newCat: UserCategory = {
        ...formData,
        id: categories.length + 1,
        status: "Enabled",
      } as UserCategory;
      setCategories([...categories, newCat]);
    }
    setShowAddModal(false);
  };

  const filteredCategories = categories.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus.length === 0 || filterStatus.includes(c.status);
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    return sortBy === "newest" ? b.id - a.id : a.id - b.id;
  });

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a: UserCategory, b: UserCategory) => a.name.localeCompare(b.name),
      render: (text: string, record: UserCategory) => (
        <span className="text-dark">{text}</span>
      )
    },
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
      render: (code: string) => <span className="purple-badge-lock">{code}</span>
    },
    {
      title: "Level",
      dataIndex: "level",
      key: "level",
      render: (level: number) => (
        <span className="text-muted">
          <i className="ti ti-layers-intersect me-1 fs-13" />
          Level {level}
        </span>
      )
    },
    {
      title: "Parent",
      dataIndex: "parent",
      key: "parent",
      render: (parent: string) => parent ? <span className="text-muted">{parent}</span> : <span className="text-muted opacity-50">—</span>
    },
    {
      title: "Portal Access",
      dataIndex: "portalAccess",
      key: "portalAccess",
      render: (access: boolean) => (
        <span className={`badge ${access ? "bg-soft-success text-success" : "bg-soft-danger text-danger"} border-0`}>
          {access ? "Enabled" : "Disabled"}
        </span>
      )
    },
    {
      title: "Action",
      key: "actions",
      className: "text-center",
      render: (_: any, record: UserCategory) => (
        <div className="dropdown d-flex justify-content-center">
          <button type="button" className="table-action-btn" data-bs-toggle="dropdown" aria-expanded="false">
            <i className="ti ti-dots-vertical" />
          </button>
          <div className="dropdown-menu dropdown-menu-end shadow border-0 py-2 mt-1" style={{ minWidth: 140, borderRadius: 3 }}>
            <Link
              className="dropdown-item py-2 px-3 d-flex align-items-center gap-2 fs-14 text-danger"
              to="#"
              onClick={(e) => { e.preventDefault(); handleEdit(record); }}
            >
              <i className="ti ti-edit fs-15" /> Edit
            </Link>
            <Link
              className="dropdown-item py-2 px-3 d-flex align-items-center gap-2 fs-14 text-danger"
              to="#"
              onClick={(e) => { e.preventDefault(); handleDelete(record.id); }}
            >
              <i className="ti ti-trash fs-15" /> Delete
            </Link>
          </div>
        </div>
      )
    }
  ];

  const visibleColumns = columns.filter(c => {
    if (c.title === "Action") return true; // Always show action
    return visibleCols[c.title as string] !== false;
  });

  const levelGroups = categories.filter(c => c.visibleInMap).reduce((acc, c) => {
    if (!acc[c.level]) acc[c.level] = [];
    acc[c.level].push(c);
    return acc;
  }, {} as Record<number, UserCategory[]>);
  const sortedLevels = Object.keys(levelGroups).map(Number).sort((a, b) => a - b);
  const hfColors = ["purple", "blue", "teal", "green", "orange", "rose", "indigo"];
  const hfIcons = [
    "ti-user-star", "ti-briefcase", "ti-building-store",
    "ti-truck", "ti-chart-bar", "ti-users-group", "ti-certificate",
  ];
  const allVisibleNodes = categories.filter(c => c.visibleInMap).sort((a, b) => a.id - b.id);
  const nodeStyleMap: Record<number, { color: string; icon: string }> = {};
  allVisibleNodes.forEach((cat, idx) => {
    nodeStyleMap[cat.id] = {
      color: hfColors[idx % hfColors.length],
      icon: hfIcons[idx % hfIcons.length],
    };
  });

  return (
    <div className="page-wrapper">
      <div className="content">
        <PageHeader
          title="Customer Category"
          badgeCount={categories.length}
          showModuleTile={false}
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
          settingsLink="/settings/product-preferences"
        />


        <div className="card border-0 rounded-0 flex-grow-1 mb-0 d-flex flex-column shadow-sm">
          <div className="card-header d-flex align-items-center justify-content-between gap-2 flex-wrap" style={{ borderBottom: "1px solid #f0f2f4" }}>
            <div className="input-icon input-icon-start position-relative" style={{ width: 250 }}>
              <span className="input-icon-addon text-dark">
                <i className="ti ti-search" />
              </span>
              <SearchInput value={searchTerm} onChange={setSearchTerm} />
            </div>
            <button className="btn btn-danger d-flex align-items-center" onClick={() => navigate(route.addCategory)} style={{ background: '#E41F07', borderColor: '#E41F07' }}>
              <i className="ti ti-plus me-2" /> Add New Category
            </button>
          </div>

          <div className="card-body p-0 d-flex flex-column" style={{ minHeight: 0 }}>
            <div className="toolbar-custom py-3 px-4">
              <div className="d-flex align-items-center gap-2 flex-wrap flex-grow-1">
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
                    className={`btn btn-outline-light shadow-sm px-3 bg-white ${filterStatus.length > 0 ? 'border-primary text-primary' : ''}`}
                    style={{ height: 38, fontSize: 14, borderRadius: 6 }}
                    onClick={() => setShowFilter(!showFilter)}
                  >
                    <i className="ti ti-filter me-2" />Filter {filterStatus.length > 0 && <span className="badge bg-primary ms-1">{filterStatus.length}</span>} <i className="ti ti-chevron-down ms-1" />
                  </button>
                  {showFilter && (
                    <div className="filter-dropdown-menu dropdown-menu show shadow-lg border-0 p-0 mt-2" style={{ position: 'absolute', right: 0, top: '100%', minWidth: 220, zIndex: 1060, borderRadius: 3 }}>
                      <div className="filter-header d-flex align-items-center justify-content-between p-2 px-3 border-bottom">
                        <h6 className="fs-14 fw-bold mb-0 text-dark"><i className="ti ti-filter me-2" />Filter</h6>
                        <button
                          type="button"
                          className="custom-btn-close border me-0 d-flex align-items-center justify-content-center rounded-circle"
                          onClick={() => setShowFilter(false)}
                        >
                          <i className="ti ti-x" />
                        </button>
                      </div>
                      <div className="filter-set-view p-2 px-3">
                        <div className="filter-set-content">
                          <div className="filter-set-content-head mb-2 mt-1">
                            <Link
                              to="#"
                              className={statusFilterOpen ? "text-dark fw-bold fs-14" : "collapsed text-dark fw-bold fs-14"}
                              onClick={(e) => { e.preventDefault(); setStatusFilterOpen(!statusFilterOpen); }}
                            >
                              Status
                            </Link>
                          </div>
                          {statusFilterOpen && (
                            <div className="filter-set-contents">
                              <div className="filter-content-list ps-3">
                                {["Enabled", "Disabled"].map(status => (
                                  <div className="form-check mb-2" key={status}>
                                    <input
                                      className="form-check-input primary-checkbox"
                                      type="checkbox"
                                      id={`filter-${status}`}
                                      checked={pendingFilter.includes(status)}
                                      onChange={(e) => {
                                        if (e.target.checked) setPendingFilter([...pendingFilter, status]);
                                        else setPendingFilter(pendingFilter.filter(s => s !== status));
                                      }}
                                    />
                                    <label className="form-check-label fs-14 cursor-pointer text-muted ms-1" htmlFor={`filter-${status}`}>
                                      {status}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="d-flex align-items-center gap-2 mt-2 pt-2 border-top">
                          <button className="btn btn-light bg-light border-0 flex-grow-1 fs-14 fw-bold p-1 shadow-none" style={{ borderRadius: 6, height: 36, color: "#444" }} onClick={handleResetFilter}>Reset</button>
                          <button className="btn btn-danger flex-grow-1 fs-14 fw-bold p-1 shadow-sm" style={{ borderRadius: 3, height: 36, background: '#E41F07' }} onClick={handleApplyFilter}>Filter</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {viewMode === "list" && (
                  <div className="dropdown">
                    <Link to="#" className="btn bg-soft-indigo px-3 border-0 shadow-sm" style={{ height: 38, fontSize: 13, display: "inline-flex", alignItems: "center", color: '#5b21b6', borderRadius: 6 }} data-bs-toggle="dropdown" data-bs-auto-close="outside">
                      <i className="ti ti-columns-3 me-2" />Manage Columns
                    </Link>
                    <div className="dropdown-menu dropdown-md p-3 shadow border-0 mt-2">
                      <ul className="mb-0 list-unstyled p-0">
                        {ALL_COLS.map(col => (
                          <li className="gap-1 d-flex align-items-center mb-2" key={col}>
                            <div className="form-check form-switch w-100 ps-0">
                              <label className="form-check-label d-flex align-items-center gap-2 w-100 cursor-pointer">
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

                <div className="d-flex align-items-center gap-1 border rounded p-1 bg-white shadow-sm" style={{ height: 38, borderRadius: 6 }}>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`btn btn-sm d-flex align-items-center justify-content-center`}
                    style={{ width: 28, height: 26, background: viewMode === "list" ? "#1ba59e" : "transparent", color: viewMode === "list" ? "#fff" : "#6c757d", border: 'none', borderRadius: 4 }}
                  >
                    <i className="ti ti-list fs-14" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`btn btn-sm d-flex align-items-center justify-content-center`}
                    style={{ width: 28, height: 26, background: viewMode === "grid" ? "#1ba59e" : "transparent", color: viewMode === "grid" ? "#fff" : "#6c757d", border: 'none', borderRadius: 4 }}
                  >
                    <i className="ti ti-grid-dots fs-14" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-grow-1 overflow-auto px-4 pb-4">
              {viewMode === "list" ? (
                <div className="custom-table list-view-table table-nowrap border-0">
                  <Datatable
                    columns={visibleColumns}
                    dataSource={filteredCategories}
                    Selection={true}
                    searchText={searchTerm}
                  />
                </div>
              ) : (
                <div className="row g-3 px-3 mt-3">
                  {filteredCategories.map(cat => {
                    const priority = cat.level === 1 ? "High" : cat.level === 2 ? "Medium" : "Low";
                    const priorityStyle = priority === "High"
                      ? { bg: "#fff0f0", color: "#e41f07" }
                      : priority === "Medium"
                        ? { bg: "#fff8e1", color: "#f59e0b" }
                        : { bg: "#f0fdf4", color: "#16a34a" };
                    const avatarColors = ["#6366f1", "#0891b2", "#059669", "#d97706", "#db2777"];
                    const avatarColor = avatarColors[cat.id % avatarColors.length];
                    return (
                      <div className="col-xxl-3 col-xl-4 col-md-6" key={cat.id}>
                        <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: 3 }}>
                          <div className="card-body p-3 d-flex flex-column">

                            {/* Top badges */}
                            <div className="d-flex align-items-center gap-2 mb-3">
                              <span className="px-2 py-1 fs-12 fw-semibold rounded" style={{ background: priorityStyle.bg, color: priorityStyle.color }}>{priority}</span>
                              <span className="px-2 py-1 fs-12 fw-semibold rounded text-white" style={{ background: cat.status === "Enabled" ? "#22c55e" : "#ef4444" }}>
                                {cat.status}
                              </span>
                            </div>

                            {/* Header: avatar + name + menu */}
                            <div className="d-flex align-items-center justify-content-between mb-3 p-2 rounded" style={{ background: "#f8fafc" }}>
                              <div className="d-flex align-items-center gap-2">
                                <div className="flex-shrink-0 d-flex align-items-center justify-content-center fw-bold text-white fs-16" style={{ width: 40, height: 40, borderRadius: 10, background: avatarColor }}>
                                  {cat.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="fw-bold fs-14 text-dark">{cat.name}</div>
                                  <div className="fs-12 text-muted">Level {cat.level}</div>
                                </div>
                              </div>
                              <div className="dropdown">
                                <button className="btn btn-sm bg-white border shadow-sm d-flex align-items-center justify-content-center" data-bs-toggle="dropdown" style={{ width: 30, height: 30, borderRadius: 6, padding: 0 }}>
                                  <i className="ti ti-dots-vertical fs-14" />
                                </button>
                                <div className="dropdown-menu dropdown-menu-end shadow border-0 py-2 mt-1" style={{ minWidth: 140, borderRadius: 3 }}>
                                  <button className="dropdown-item py-2 px-3 d-flex align-items-center gap-2 fs-14 text-danger" onClick={() => handleEdit(cat)}>
                                    <i className="ti ti-edit fs-15" /> Edit
                                  </button>
                                  <button className="dropdown-item py-2 px-3 d-flex align-items-center gap-2 fs-14 text-danger" onClick={() => handleDelete(cat.id)}>
                                    <i className="ti ti-trash fs-15" /> Delete
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Description */}
                            <p className="text-muted fs-14 mb-3" style={{ lineHeight: 1.6, flexGrow: 1, minHeight: 60 }}>
                              {cat.description || "No description available for this category."}
                            </p>

                            {/* Info rows */}
                            <div className="d-flex flex-column gap-2 mb-3">
                              <div className="d-flex align-items-center gap-2 fs-14 text-dark">
                                <i className="ti ti-circle-check text-muted fs-15" />
                                <span>Category ID : <span className="text-muted">#{cat.id}</span></span>
                              </div>
                              <div className="d-flex align-items-center gap-2 fs-14 text-dark">
                                <i className="ti ti-tag text-muted fs-15" />
                                <span>Code : <span className="text-muted">{cat.code}</span></span>
                              </div>
                              <div className="d-flex align-items-center gap-2 fs-14 text-dark">
                                <i className="ti ti-sitemap text-muted fs-15" />
                                <span>Parent : <span className="text-muted">{cat.parent || "None"}</span></span>
                              </div>
                            </div>

                            {/* Bottom: avatars + icon */}
                            <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                              <div className="d-flex align-items-center">
                                {["A", "B", "C"].map((l, i) => (
                                  <div key={l} className="d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: 26, height: 26, borderRadius: "50%", background: avatarColors[i], border: "2px solid #fff", marginLeft: i > 0 ? -8 : 0, fontSize: 10 }}>{l}</div>
                                ))}
                                <div className="d-flex align-items-center justify-content-center fw-bold" style={{ width: 26, height: 26, borderRadius: "50%", background: "#e2e8f0", border: "2px solid #fff", marginLeft: -8, fontSize: 10, color: "#64748b" }}>+2</div>
                              </div>
                              <div className="d-flex align-items-center justify-content-center text-white fw-bold fs-16" style={{ width: 36, height: 36, borderRadius: "50%", background: avatarColor }}>
                                {cat.name.charAt(0).toUpperCase()}
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {del && <DeleteConfirm name={del.name} onConfirm={del.onConfirm} onCancel={() => setDel(null)} />}
      <Footer />
      {/* ── Page Styles ── */}
      <style>{`
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
            content:!important;
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
      `}</style>
    </div>
  );
};

export default UserCategoryPage;
