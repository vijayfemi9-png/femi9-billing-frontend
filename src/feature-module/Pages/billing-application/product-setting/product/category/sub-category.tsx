import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { all_routes } from "../../../../../../routes/all_routes";
import Datatable from "../../../../../../components/dataTable";
import SearchInput from "../../../../../../components/dataTable/dataTableSearch";
import PredefinedDatePicker from "../../../../../../components/common-dateRangePicker/PredefinedDatePicker";
import PageHeader from "../../../../../../components/page-header/pageHeader";
import Footer from "../../../../../../components/footer/footer";
import "./category.scss";
import { Category } from "../../../../../../core/json/selectOption";

interface SubCategory {
  id: number;
  name: string;
  description: string;
  targetAmount: number;
  reference: string;
  coupon: string;
  parentCategory: string;
  status: "active" | "inactive";
}

const parentCategories = [
  "Super_stockist", "mvbfy", "cfvgbhj", "New SS",
  "drtr", "New S", "Super_distributor",
];

const initialData: SubCategory[] = [
  { id: 1, name: "just", description: "just", targetAmount: 100000, reference: "2", coupon: "2", parentCategory: "Super_stockist", status: "active" },
  { id: 2, name: "SS_urban_rural", description: "grui", targetAmount: 40000, reference: "2", coupon: "2", parentCategory: "New SS", status: "active" },
  { id: 3, name: "cfvg", description: "gfh", targetAmount: 20000, reference: "2", coupon: "1", parentCategory: "Super_distributor", status: "active" },
];

const emptyForm: { name: string; description: string; targetAmount: number; reference: string; coupon: string; parentCategory: string; status: "active" | "inactive" } = {
  name: "", description: "", targetAmount: 0, reference: "", coupon: "", parentCategory: "", status: "active",
};

const ALL_COLS = ["Sub-Category Name", "Description", "Target Amount", "Reference", "Coupon", "Parent Category", "Status"];

const SubCategoryPage: React.FC = () => {
  const navigate = useNavigate();
  const route = all_routes;
  const [subCategories, setSubCategories] = useState<SubCategory[]>(() => {
    const saved = localStorage.getItem("sub_categories_data");
    return saved ? JSON.parse(saved) : initialData;
  });

  useEffect(() => {
    localStorage.setItem("sub_categories_data", JSON.stringify(subCategories));
  }, [subCategories]);

  const handleRefresh = () => setSubCategories([...subCategories]);

  const handleExportCSV = () => {
    const headers = ["ID", "Name", "Description", "Target Amount", "Reference", "Coupon", "Parent Category", "Status"];
    const rows = subCategories.map(s => [s.id, s.name, s.description, s.targetAmount, s.reference, s.coupon, s.parentCategory, s.status]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "sub-categories.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    window.print();
  };
  const [formData, setFormData] = useState({ ...emptyForm });
  const [editId, setEditId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [showFilter, setShowFilter] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [pendingFilter, setPendingFilter] = useState<string[]>([]);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(
    Object.fromEntries(ALL_COLS.map(c => [c, true]))
  );

  const handleSave = () => {
    if (!formData.name || !formData.parentCategory) return;
    if (editId !== null) {
      setSubCategories(subCategories.map(s => s.id === editId ? { ...formData, id: editId } : s));
      setEditId(null);
    } else {
      setSubCategories([...subCategories, { ...formData, id: Date.now() }]);
    }
    setFormData({ ...emptyForm });
  };

  const handleDelete = (id: number) => {
    setSubCategories(subCategories.filter(s => s.id !== id));
  };

  const filtered = subCategories
    .filter(s => {
      const matchStatus = filterStatus.length === 0 || filterStatus.includes(s.status);
      return matchStatus;
    })
    .sort((a, b) => sortBy === "newest" ? b.id - a.id : a.id - b.id);

  const allColumns = [
    {
      title: "Sub-Category Name",
      dataIndex: "name",
      key: "name",
      width: "20%",
      sorter: (a: SubCategory, b: SubCategory) => a.name.localeCompare(b.name),
      render: (text: string) => <span className="text-dark fs-14">{text}</span>,
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      width: "15%",
      render: (text: string) => <span className="text-muted">{text}</span>,
    },
    {
      title: "Target Amount",
      dataIndex: "targetAmount",
      key: "targetAmount",
      width: "15%",
      render: (val: number) => <span className="text-muted">{val.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>,
    },
    {
      title: "Reference",
      dataIndex: "reference",
      key: "reference",
      width: "10%",
      render: (val: string) => <span className="text-muted">{val}</span>,
    },
    {
      title: "Coupon",
      dataIndex: "coupon",
      key: "coupon",
      width: "10%",
      render: (val: string) => <span className="text-muted">{val}</span>,
    },
    {
      title: "Parent Category",
      dataIndex: "parentCategory",
      key: "parentCategory",
      width: "15%",
      render: (val: string) => <span className="text-muted">{val || <span className="opacity-50">—</span>}</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: "10%",
      render: (val: string) => (
        <span className={`badge ${val === "active" ? "bg-soft-success text-success" : "bg-soft-danger text-danger"} border-0`}>
          <i className="ti ti-point-filled me-1" />{val}
        </span>
      ),
    },
    {
      title: "Action",
      key: "actions",
      align: "center" as any, // Center the header and content
      render: (_: any, record: SubCategory) => (
        <div className="d-flex align-items-center justify-content-center">
          <div className="dropdown">
            <button type="button" className="table-action-btn" data-bs-toggle="dropdown" aria-expanded="false">
              <i className="ti ti-dots-vertical" />
            </button>
            <div className="dropdown-menu dropdown-menu-end shadow border-0 py-2 mt-1" style={{ minWidth: 140, borderRadius: 8 }}>
              <Link
                className="dropdown-item py-2 px-3 d-flex align-items-center gap-2 fs-14 text-danger"
                to={route.newSubCategory}
                state={{ record }}
              >
                <i className="ti ti-edit fs-15" /> Edit
              </Link>
              <Link className="dropdown-item py-2 px-3 d-flex align-items-center gap-2 fs-14 text-danger" to="#" onClick={(e) => { e.preventDefault(); handleDelete(record.id); }}>
                <i className="ti ti-trash fs-15" /> Delete
              </Link>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const visibleColumns = allColumns.filter(c => c.title === "Action" || visibleCols[c.title as string] !== false);

  return (
    <div className="page-wrapper">
      <div className="content">
        <PageHeader
          title="Sub Category"
          showModuleTile={false}
          badgeCount={Category.length}
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

        {/* Stat Boxes */}
        <div className="row g-3 mb-3">
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100 premium-stat-card">
              <div className="card-body d-flex align-items-center gap-3 p-3">
                <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 bg-soft-danger icon-wrapper"
                  style={{ width: 46, height: 46 }}>
                  <i className="ti ti-tag fs-20 text-danger" />
                </div>
                <div>
                  <p className="mb-0 text-premium-label">Sub-Category Name</p>
                  <h5 className="mb-0 fw-bold text-dark fs-14">{subCategories.length}</h5>
                  <span className="text-muted fs-14">{subCategories.filter(s => s.status === "active").length} Active</span>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100 premium-stat-card">
              <div className="card-body d-flex align-items-center gap-3 p-3">
                <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 bg-soft-success icon-wrapper"
                  style={{ width: 46, height: 46 }}>
                  <i className="ti ti-currency-rupee fs-20 text-success" />
                </div>
                <div>
                  <p className="mb-0 text-premium-label">Target Amount</p>
                  <h5 className="mb-0 fw-bold text-dark fs-14">
                    ₹{subCategories.reduce((sum, s) => sum + s.targetAmount, 0).toLocaleString("en-IN")}
                  </h5>
                  <span className="text-muted fs-14">Total across all sub-categories</span>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100 premium-stat-card">
              <div className="card-body d-flex align-items-center gap-3 p-3">
                <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 bg-soft-warning icon-wrapper"
                  style={{ width: 46, height: 46 }}>
                  <i className="ti ti-folder fs-20 text-warning" />
                </div>
                <div>
                  <p className="mb-0 text-premium-label">Parent Category</p>
                  <h5 className="mb-0 fw-bold text-dark fs-14">
                    {new Set(subCategories.map(s => s.parentCategory).filter(Boolean)).size}
                  </h5>
                  <span className="text-muted fs-14">Unique parent categories</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card border-0 rounded-0 flex-grow-1 mb-0 d-flex flex-column">

          {/* Search + Add */}
          <div className="card-header d-flex align-items-center justify-content-between gap-2 flex-wrap" style={{ borderBottom: "1px solid #f0f2f4" }}>
            <div className="input-icon input-icon-start position-relative" style={{ width: 250 }}>
              <span className="input-icon-addon text-dark"><i className="ti ti-search" /></span>
              <SearchInput value={searchTerm} onChange={setSearchTerm} />
            </div>
            <button
              className="btn btn-danger fs-14 d-flex align-items-center"
              onClick={() => navigate(route.newSubCategory)}
            >
              <i className="ti ti-plus me-2" />New Category
            </button>
          </div>

          <div className="card-body p-0 d-flex flex-column" style={{ minHeight: 0 }}>

            {/* Toolbar */}
            <div className="toolbar-custom py-3 px-4">
              <div className="d-flex align-items-center gap-2 flex-wrap flex-grow-1">
                <div className="dropdown">
                  <Link to="#" className="dropdown-toggle btn btn-outline-light shadow-sm px-3 fs-14 bg-white text-dark" data-bs-toggle="dropdown" style={{ borderRadius: 6 }}>
                    <i className="ti ti-sort-ascending-2 me-2" />Sort By
                  </Link>
                  <div className="dropdown-menu shadow border-0">
                    <ul className="mb-0 p-0 list-unstyled">
                      <li><Link to="#" className="dropdown-item fs-14 py-2 text-dark" onClick={() => setSortBy("newest")}>Newest</Link></li>
                      <li><Link to="#" className="dropdown-item fs-14 py-2 text-dark" onClick={() => setSortBy("oldest")}>Oldest</Link></li>
                    </ul>
                  </div>
                </div>
                <PredefinedDatePicker />
              </div>

              <div className="d-flex align-items-center gap-2">
                {/* Filter */}
                <div style={{ position: "relative" }}>
                  <button
                    className={`btn btn-outline-light shadow-sm px-3 bg-white ${filterStatus.length > 0 ? "border-primary text-primary" : ""}`}
                    style={{ height: 38, fontSize: 14, borderRadius: 6 }}
                    onClick={() => setShowFilter(!showFilter)}
                  >
                    <i className="ti ti-filter me-2" />Filter
                    {filterStatus.length > 0 && <span className="badge bg-primary ms-1">{filterStatus.length}</span>}
                    <i className="ti ti-chevron-down ms-1" />
                  </button>
                  {showFilter && (
                    <div className="filter-dropdown-menu dropdown-menu show shadow-lg border-0 p-0 mt-2" style={{ position: "absolute", right: 0, top: "100%", minWidth: 220, zIndex: 1060, borderRadius: 8 }}>
                      <div className="filter-header d-flex align-items-center justify-content-between p-2 px-3 border-bottom">
                        <h6 className="fs-14 fw-bold mb-0 text-dark"><i className="ti ti-filter me-2" />Filter</h6>
                        <button type="button" className="custom-btn-close border me-0 d-flex align-items-center justify-content-center rounded-circle" onClick={() => setShowFilter(false)}>
                          <i className="ti ti-x" />
                        </button>
                      </div>
                      <div className="filter-set-view p-2 px-3">
                        <div className="filter-set-content-head mb-2 mt-1 position-relative">
                          <label className="text-dark fw-bold fs-14 mb-2 d-block">Status</label>
                          <div
                            className="form-control fs-14 border shadow-sm d-flex align-items-center justify-content-between px-3 cursor-pointer"
                            style={{ height: 38, borderRadius: 6, borderColor: "#ffbaba", background: "#fff" }}
                            onClick={() => setStatusFilterOpen(!statusFilterOpen)}
                          >
                            <span className="text-dark">
                              {filterStatus[0] === "active" ? "Active" : filterStatus[0] === "inactive" ? "Inactive" : "All Status"}
                            </span>
                            <i className={`ti ti-chevron-${statusFilterOpen ? 'up' : 'down'} text-muted fs-12`} />
                          </div>
                          {statusFilterOpen && (
                            <div
                              className="position-absolute w-100 shadow-lg border-0 mt-1 bg-white"
                              style={{ zIndex: 1100, borderRadius: 6, border: '1px solid #e5e9ef', top: '100%', left: 0 }}
                            >
                              <ul className="list-unstyled mb-0 py-1">
                                <li
                                  className="px-3 py-2 fs-14 cursor-pointer custom-dropdown-item"
                                  onClick={() => { setFilterStatus([]); setStatusFilterOpen(false); }}
                                >
                                  All Status
                                </li>
                                <li
                                  className="px-3 py-2 fs-14 cursor-pointer custom-dropdown-item"
                                  style={{
                                    background: filterStatus[0] === "active" ? '#e41f07' : 'transparent',
                                    color: filterStatus[0] === "active" ? '#fff' : 'inherit'
                                  }}
                                  onClick={() => { setFilterStatus(["active"]); setStatusFilterOpen(false); }}
                                >
                                  Active
                                </li>
                                <li
                                  className="px-3 py-2 fs-14 cursor-pointer custom-dropdown-item"
                                  style={{
                                    background: filterStatus[0] === "inactive" ? '#e41f07' : 'transparent',
                                    color: filterStatus[0] === "inactive" ? '#fff' : 'inherit'
                                  }}
                                  onClick={() => { setFilterStatus(["inactive"]); setStatusFilterOpen(false); }}
                                >
                                  Inactive
                                </li>
                              </ul>
                            </div>
                          )}
                        </div>
                        <div className="d-flex align-items-center gap-2 mt-2 pt-2 border-top">
                          <button className="btn btn-light bg-light border-0 flex-grow-1 fs-14 fw-bold p-1 shadow-none" style={{ borderRadius: 6, height: 36 }} onClick={() => { setPendingFilter([]); setFilterStatus([]); setShowFilter(false); }}>Reset</button>
                          <button className="btn btn-danger flex-grow-1 fs-14 fw-bold p-1 shadow-sm" style={{ borderRadius: 8, height: 36 }} onClick={() => { setShowFilter(false); }}>Close</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Manage Columns */}
                {viewMode === "list" && (
                  <div className="dropdown">
                    <button
                      className="btn bg-soft-indigo d-flex align-items-center gap-2 px-3 border-0"
                      style={{ height: 38, fontSize: 14, borderRadius: 6 }}
                      data-bs-toggle="dropdown"
                      data-bs-auto-close="outside"
                    >
                      <i className="ti ti-columns-3" />
                      <span>Manage Columns</span>
                    </button>
                    <div className="dropdown-menu dropdown-md p-3 shadow border-0 mt-2">
                      <ul className="mb-0 list-unstyled p-0">
                        {ALL_COLS.map(col => (
                          <li className="gap-1 d-flex align-items-center mb-2" key={col}>
                            <div className="form-check form-switch w-100 ps-0">
                              <label className="form-check-label d-flex align-items-center gap-2 w-100 cursor-pointer">
                                <span>{col}</span>
                                <input className="form-check-input switchCheckDefault ms-auto" type="checkbox" role="switch"
                                  checked={visibleCols[col] !== false}
                                  onChange={() => setVisibleCols(prev => ({ ...prev, [col]: !prev[col] }))} />
                              </label>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* List / Grid Toggle */}
                <div className="d-flex align-items-center gap-1 border rounded p-1 bg-white shadow-sm" style={{ height: 38, borderRadius: 6 }}>
                  <button onClick={() => setViewMode("list")}
                    className={`btn btn-sm d-flex align-items-center justify-content-center ${viewMode === "list" ? "bg-teal text-white" : "bg-transparent text-muted"}`}
                    style={{ width: 28, height: 26, border: "none", borderRadius: 4 }}>
                    <i className="ti ti-list fs-14" />
                  </button>
                  <button onClick={() => setViewMode("grid")}
                    className={`btn btn-sm d-flex align-items-center justify-content-center ${viewMode === "grid" ? "bg-teal text-white" : "bg-transparent text-muted"}`}
                    style={{ width: 28, height: 26, border: "none", borderRadius: 4 }}>
                    <i className="ti ti-grid-dots fs-14" />
                  </button>
                </div>
              </div>
            </div>

            {/* Table / Grid */}
            <div className="flex-grow-1 overflow-auto px-4 pb-4">
              {viewMode === "list" ? (
                <div className="custom-table list-view-table table-nowrap border-0">
                  <Datatable columns={visibleColumns} dataSource={filtered} Selection={true} searchText={searchTerm} />
                </div>
              ) : (
                <div className="row g-3 mt-2">
                  {filtered.map(item => {
                    const priority = item.targetAmount >= 100000 ? "High" : item.targetAmount >= 40000 ? "Medium" : "Low";
                    const priorityStyle = priority === "High"
                      ? { bg: "#fff0f0", color: "#e41f07" }
                      : priority === "Medium"
                        ? { bg: "#fff8e1", color: "#f59e0b" }
                        : { bg: "#f0fdf4", color: "#16a34a" };
                    const avatarColors = ["#6366f1", "#0891b2", "#059669", "#d97706", "#db2777"];
                    const avatarColor = avatarColors[item.id % avatarColors.length];
                    return (
                      <div className="col-xxl-3 col-xl-4 col-md-6" key={item.id}>
                        <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: 12 }}>
                          <div className="card-body p-3 d-flex flex-column">

                            {/* Top badges */}
                            <div className="d-flex align-items-center gap-2 mb-3">
                              <span className="px-2 py-1 fs-12 fw-semibold rounded" style={{ background: priorityStyle.bg, color: priorityStyle.color }}>{priority}</span>
                              <span className="px-2 py-1 fs-12 fw-semibold rounded text-white" style={{ background: item.status === "active" ? "#22c55e" : "#ef4444" }}>
                                {item.status === "active" ? "Active" : "Inactive"}
                              </span>
                            </div>

                            {/* Header: avatar + name + menu */}
                            <div className="d-flex align-items-center justify-content-between mb-3 p-2 rounded" style={{ background: "#f8fafc" }}>
                              <div className="d-flex align-items-center gap-2">
                                <div className="flex-shrink-0 d-flex align-items-center justify-content-center fw-bold text-white fs-16" style={{ width: 40, height: 40, borderRadius: 10, background: avatarColor }}>
                                  {item.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="fw-bold fs-14 text-dark">{item.name}</div>
                                  <div className="fs-12 text-muted">{item.parentCategory || "Sub Category"}</div>
                                </div>
                              </div>
                              <div className="dropdown">
                                <button className="btn btn-sm bg-white border shadow-sm d-flex align-items-center justify-content-center" data-bs-toggle="dropdown" style={{ width: 30, height: 30, borderRadius: 6, padding: 0 }}>
                                  <i className="ti ti-dots-vertical fs-14" />
                                </button>
                                <div className="dropdown-menu dropdown-menu-end shadow border-0 py-2 mt-1" style={{ minWidth: 140, borderRadius: 8 }}>
                                  <button className="dropdown-item py-2 px-3 d-flex align-items-center gap-2 fs-14 text-danger" onClick={() => navigate(route.newSubCategory, { state: { record: item } })}>
                                    <i className="ti ti-edit fs-15" /> Edit
                                  </button>
                                  <button className="dropdown-item py-2 px-3 d-flex align-items-center gap-2 fs-14 text-danger" onClick={() => handleDelete(item.id)}>
                                    <i className="ti ti-trash fs-15" /> Delete
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Description */}
                            <p className="text-muted fs-14 mb-3" style={{ lineHeight: 1.6, flexGrow: 1, minHeight: 60 }}>
                              {item.description || "No description available for this sub-category."}
                            </p>

                            {/* Info rows */}
                            <div className="d-flex flex-column gap-2 mb-3">
                              <div className="d-flex align-items-center gap-2 fs-14 text-dark">
                                <i className="ti ti-circle-check text-muted fs-15" />
                                <span>Sub-Cat ID : <span className="text-muted">#{item.id}</span></span>
                              </div>
                              <div className="d-flex align-items-center gap-2 fs-14 text-dark">
                                <i className="ti ti-currency-rupee text-muted fs-15" />
                                <span>Amount : <span className="text-muted">₹{item.targetAmount.toLocaleString("en-IN")}</span></span>
                              </div>
                              <div className="d-flex align-items-center gap-2 fs-14 text-dark">
                                <i className="ti ti-tag text-muted fs-15" />
                                <span>Coupon : <span className="text-muted">{item.coupon || "—"}</span></span>
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
                                {item.name.charAt(0).toUpperCase()}
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
            content: !important;
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

export default SubCategoryPage;
