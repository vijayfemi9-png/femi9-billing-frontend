import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { all_routes } from "../../../../../../routes/all_routes";
import "./category.scss";

const route = all_routes;

const NewCategoryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editRecord = location.state?.record;

  const [formData, setFormData] = useState({
    name: editRecord?.name || "",
    code: editRecord?.code || "",
    description: editRecord?.description || "",
    level: editRecord?.level || 1,
    portalAccess: editRecord?.portalAccess ?? true,
    visibleInMap: editRecord?.visibleInMap ?? true,
    status: editRecord?.status || "Enabled",
  });

  useEffect(() => {
    if (formData.name && !formData.code && !editRecord) {
      const prefix = formData.name.substring(0, 3).toUpperCase();
      const random = Math.floor(100 + Math.random() * 900);
      setFormData(prev => ({ ...prev, code: `${prefix}${random}` }));
    }
  }, [formData.name, editRecord]);

  const handleSave = () => {
    if (!formData.name) return;
    const existing = JSON.parse(localStorage.getItem("categories") || "[]");

    if (editRecord) {
      const updated = existing.map((cat: any) =>
        cat.id === editRecord.id ? { ...cat, ...formData } : cat
      );
      localStorage.setItem("categories", JSON.stringify(updated));
    } else {
      const newCat = {
        ...formData,
        id: Date.now(),
        parent: null,
      };
      localStorage.setItem("categories", JSON.stringify([...existing, newCat]));
    }
    navigate(route.userCategory);
  };

  return (
    <div className="page-wrapper">
      <div className="content">

        <div className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <h4 className="fw-bold fs-18 mb-1" style={{ color: "#111827" }}>
              {editRecord ? "Edit Category" : "New Category"}
            </h4>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-0 fs-14">
                <li className="breadcrumb-item"><Link to="/" className="text-muted">Home</Link></li>
                <li className="breadcrumb-item"><Link to={route.userCategory} className="text-muted">Customer Category</Link></li>
                <li className="breadcrumb-item active text-dark fw-medium">
                  {editRecord ? "Edit Category" : "New Category"}
                </li>
              </ol>
            </nav>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="btn btn-white shadow-sm border d-flex align-items-center justify-content-center"
            style={{ width: 32, height: 32, borderRadius: 3 }}
          >
            <i className="ti ti-x fs-16 text-dark" />
          </button>
        </div>

        <div className="row">
          <div className="col-lg-12">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-bottom py-3 px-4">
                <h5 className="card-title mb-0 fs-16 fw-bold">Basic Information</h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-4">

                  <div className="col-md-6">
                    <label className="form-label text-danger fs-14 mb-2">
                      Category Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control fs-14 border shadow-sm"
                      style={{ borderRadius: 3, borderColor: "#e5e9ef", height: 38 }}
                      placeholder="e.g. Distributor"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-dark fs-14 mb-2">Category Code</label>
                    <input
                      type="text"
                      className="form-control fs-14 border shadow-sm"
                      style={{ borderRadius: 3, borderColor: "#e5e9ef", height: 38 }}
                      placeholder="e.g. CAT101"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-dark fs-14 mb-2">Level</label>
                    <input
                      type="number"
                      className="form-control fs-14 border"
                      style={{ borderRadius: 3, borderColor: "#e5e9ef", height: 38 }}
                      min={1}
                      placeholder="e.g. 1"
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: Number(e.target.value) })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-dark fs-14 mb-2">Status</label>
                    <select
                      className="form-select fs-14 border shadow-sm"
                      style={{ borderRadius: 3, borderColor: "#e5e9ef", height: 38 }}
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Enabled">Enabled</option>
                      <option value="Disabled">Disabled</option>
                    </select>
                  </div>

                  <div className="col-md-12">
                    <label className="form-label text-dark fs-14 mb-2">Description</label>
                    <textarea
                      className="form-control fs-14 border shadow-sm"
                      rows={3}
                      style={{ borderRadius: 3, borderColor: "#e5e9ef" }}
                      placeholder="Briefly describe this category..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="col-md-6">
                    <div className="d-flex align-items-center gap-3 mb-1">
                      <div className="form-check form-switch mb-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="portalAccess"
                          style={{ width: 40, height: 22, cursor: "pointer" }}
                          checked={formData.portalAccess}
                          onChange={(e) => setFormData({ ...formData, portalAccess: e.target.checked })}
                        />
                      </div>
                      <label htmlFor="portalAccess" className="form-label fs-14 mb-0 cursor-pointer">
                        Portal Access
                      </label>
                    </div>
                    <p className="text-muted fs-12 ms-1">Allow users in this category to log in</p>
                  </div>

                  <div className="col-md-6">
                    <div className="d-flex align-items-center gap-3 mb-1">
                      <div className="form-check form-switch mb-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="visibleInMap"
                          style={{ width: 40, height: 22, cursor: "pointer" }}
                          checked={formData.visibleInMap}
                          onChange={(e) => setFormData({ ...formData, visibleInMap: e.target.checked })}
                        />
                      </div>
                      <label htmlFor="visibleInMap" className="form-label fs-14 mb-0 cursor-pointer">
                        Visible in Hierarchy Map
                      </label>
                    </div>
                    <p className="text-muted fs-12 ms-1">Show in flow diagram</p>
                  </div>

                </div>
              </div>

              <div className="card-footer bg-white border-top py-3 px-4 d-flex align-items-center gap-2">
                <button
                  className="btn btn-light px-4 fw-bold fs-14"
                  style={{ borderRadius: 3, height: 38, border: "1px solid #e5e9ef", background: "#fff" }}
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger px-4 fw-bold fs-14 shadow-sm"
                  style={{ background: "#e41f07", borderColor: "#e41f07", borderRadius: 3, height: 38 }}
                  onClick={handleSave}
                >
                  {editRecord ? "Update Category" : "Save Category"}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default NewCategoryPage;
