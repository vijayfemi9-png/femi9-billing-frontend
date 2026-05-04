import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { all_routes } from "../../../../../../routes/all_routes";
import "./category.scss";

const route = all_routes;

const mockParentCategories = [
  "Super_stockist", "mvbfy", "cfvgbhj", "New SS",
  "drtr", "New S", "Super_distributor",
];

const NewCategoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    parent: "",
    status: "Enabled",
    isSubCategory: false,
    targetAmount: 0,
    reference: "",
    coupon: "",
  });

  // Auto-code generation
  useEffect(() => {
    if (formData.name && !formData.code) {
      const prefix = formData.name.substring(0, 3).toUpperCase();
      const random = Math.floor(100 + Math.random() * 900);
      setFormData(prev => ({ ...prev, code: `${prefix}${random}` }));
    }
  }, [formData.name]);

  const handleSave = () => {
    console.log("Saving Category:", formData);
    navigate(route.userCategory || "/product/category");
  };

  return (
    <div className="page-wrapper">
      <div className="content">

        {/* Page Header */}
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <h4 className="fw-bold fs-18 mb-0" style={{ color: "#111827" }}>Add Category</h4>
            </div>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-0 fs-13">
                <li className="breadcrumb-item"><Link to="/" className="text-muted">Home</Link></li>
                <li className="breadcrumb-item"><Link to="#" className="text-muted">Customer Category</Link></li>
                <li className="breadcrumb-item active text-dark fw-medium">Add Category</li>
              </ol>
            </nav>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="btn btn-white shadow-sm border d-flex align-items-center justify-content-center"
            style={{ width: 40, height: 40 }}
          >
            <i className="ti ti-x fs-18 text-dark" />
          </button>
        </div>

        <div className="row">
          <div className="col-lg-12">
            {/* Main Information Card */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 5 }}>
              <div className="card-header bg-white border-bottom py-3 px-4">
                <h5 className="card-title mb-0 fs-14 fw-bold">Basic Information</h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-4">
                  {/* Category Name */}
                  <div className="col-md-12">
                    <label className="form-label fw-bold text-dark fs-14 mb-2">Category Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control form-control-lg fs-14 border"
                      style={{ borderRadius: 3, borderColor: "#ffbaba" }}
                      placeholder="e.g. Distributor"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  {/* Category Code */}
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-dark fs-14 mb-2">Category Code</label>
                    <input
                      type="text"
                      className="form-control form-control-lg fs-14 border"
                      style={{ borderRadius: 3, borderColor: "#e5e9ef", background: "#f8f9fa" }}
                      placeholder="e.g. SS01"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    />
                  </div>

                  {/* Level */}
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-dark fs-14 mb-2">Level</label>
                    <input
                      type="text"
                      className="form-control form-control-lg fs-14 border"
                      style={{ borderRadius: 3, borderColor: "#e5e9ef", background: "#f8f9fa" }}
                      value={formData.isSubCategory ? "2" : "1"}
                      readOnly
                    />
                  </div>

                  {/* Description */}
                  <div className="col-md-12">
                    <label className="form-label fw-bold text-dark fs-14 mb-2">Description</label>
                    <textarea
                      className="form-control fs-14 border"
                      rows={3}
                      style={{ borderRadius: 3, borderColor: "#e5e9ef" }}
                      placeholder="Short description of this category..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  {/* Child Toggle */}
                  <div className="col-md-12">
                    <div className="d-flex align-items-center gap-3 p-3 bg-light border">
                      <div className="form-check form-switch p-0 mb-0">
                        <input
                          className="form-check-input ms-0"
                          type="checkbox"
                          role="switch"
                          id="childToggleMain"
                          style={{ width: 45, height: 24, cursor: 'pointer' }}
                          checked={formData.isSubCategory}
                          onChange={(e) => setFormData({ ...formData, isSubCategory: e.target.checked })}
                        />
                      </div>
                      <div>
                        <label className="form-check-label fw-bold text-dark fs-15 cursor-pointer" htmlFor="childToggleMain">This is a Child Category</label>
                        <p className="text-muted fs-12 mb-0">Link this category under a parent category</p>
                      </div>
                    </div>
                  </div>

                  {/* Parent Category */}
                  {formData.isSubCategory && (
                    <div className="col-md-12 animate__animated animate__fadeIn">
                      <label className="form-label fw-bold text-dark fs-14 mb-2">Parent Category <span className="text-danger">*</span></label>
                      <select
                        className="form-select form-select-lg fs-14 border"
                        style={{ borderRadius: 3, borderColor: "#e5e9ef" }}
                        value={formData.parent}
                        onChange={(e) => setFormData({ ...formData, parent: e.target.value })}
                      >
                        <option value="">-- Select Parent Category --</option>
                        {mockParentCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Advanced Settings Card */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-bottom py-3 px-4">
                <h5 className="card-title mb-0 fs-14 fw-bold">Advanced Settings</h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-4">
                  <div className="col-md-4">
                    <label className="form-label fw-bold text-dark fs-14">Target Amount</label>
                    <input
                      type="number"
                      className="form-control form-control-lg fs-14 border"
                      style={{ borderRadius: 3, borderColor: "#e5e9ef" }}
                      placeholder="0.00"
                      value={formData.targetAmount || ""}
                      onChange={(e) => setFormData({ ...formData, targetAmount: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold text-dark fs-14">Reference</label>
                    <input
                      type="text"
                      className="form-control form-control-lg fs-14 border"
                      style={{ borderRadius: 3, borderColor: "#e5e9ef" }}
                      placeholder="REF-XXXX"
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold text-dark fs-14">Coupon Code</label>
                    <input
                      type="text"
                      className="form-control form-control-lg fs-14 border"
                      style={{ borderRadius: 3, borderColor: "#e5e9ef" }}
                      placeholder="PROMO10"
                      value={formData.coupon}
                      onChange={(e) => setFormData({ ...formData, coupon: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="d-flex align-items-center gap-3">
              <button
                className="btn btn-danger btn-lg px-5 fw-bold fs-14 shadow-sm"
                style={{ background: "#e41f07", borderColor: "#e41f07", borderRadius: 3, height: 50 }}
                onClick={handleSave}
              >
                Save Category
              </button>
              <button
                className="btn btn-light btn-lg px-4 fw-bold fs-14"
                style={{ height: 50, border: "1px solid #e5e9ef", background: "#fff", borderRadius: 3 }}
                onClick={() => navigate(-1)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewCategoryPage;