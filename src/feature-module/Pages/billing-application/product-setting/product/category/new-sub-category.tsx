import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Select } from "antd";
import { all_routes } from "../../../../../../routes/all_routes";
import "./category.scss";

const route = all_routes;

const parentOptions = [
  { value: "Super_stockist", label: "Super_stockist" },
  { value: "mvbfy", label: "mvbfy" },
  { value: "cfvgbhj", label: "cfvgbhj" },
  { value: "New SS", label: "New SS" },
  { value: "drtr", label: "drtr" },
  { value: "New S", label: "New S" },
  { value: "Super_distributor", label: "Super_distributor" },
];
const NewSubCategoryPage: React.FC = () => {
  const [showParentDropdown, setShowParentDropdown] = useState(false);

  const handleParentSelect = (val: string) => {
    setFormData({ ...formData, parent: val });
    setShowParentDropdown(false);
  };
  const navigate = useNavigate();
  const location = useLocation();
  const editRecord = location.state?.record;

  const [formData, setFormData] = useState({
    name: editRecord?.name || "",
    code: editRecord?.code || "",
    description: editRecord?.description || "",
    parent: editRecord?.parentCategory || "",
    status: editRecord?.status || "Enabled",
    isSubCategory: true,
    targetAmount: editRecord?.targetAmount || 0,
    reference: editRecord?.reference || "",
    coupon: editRecord?.coupon || "",
  });

  // Simple auto-code generation logic
  useEffect(() => {
    if (formData.name && !formData.code && !editRecord) {
      const prefix = formData.name.substring(0, 3).toUpperCase();
      const random = Math.floor(100 + Math.random() * 900);
      setFormData(prev => ({ ...prev, code: `${prefix}${random}` }));
    }
  }, [formData.name, editRecord]);

  const handleSave = () => {
    const savedData = localStorage.getItem("sub_categories_data");
    let categories = savedData ? JSON.parse(savedData) : [];
    
    const newRecord = {
      ...formData,
      id: editRecord ? editRecord.id : Date.now(),
      parentCategory: formData.parent,
      status: formData.status.toLowerCase() as any
    };

    if (editRecord) {
      categories = categories.map((c: any) => c.id === editRecord.id ? newRecord : c);
    } else {
      categories.push(newRecord);
    }

    localStorage.setItem("sub_categories_data", JSON.stringify(categories));
    navigate(route.subCategory);
  };

  return (
    <div className="page-wrapper">
      <div className="content">

        {/* Page Header with Breadcrumbs */}
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <h4 className="fw-bold fs-18 mb-0" style={{ color: "#111827" }}>
                {editRecord ? "Edit Sub Category" : "New Sub Category"}
              </h4>
            </div>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-0 fs-14">
                <li className="breadcrumb-item"><Link to="/" className="text-muted">Home</Link></li>
                <li className="breadcrumb-item"><Link to={route.subCategory} className="text-muted">Sub Category</Link></li>
                <li className="breadcrumb-item active text-dark fw-medium">New Sub Category</li>
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
            {/* Primary Form Card */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-bottom py-3 px-4">
                <h5 className="card-title mb-0 fs-16 fw-bold">Basic Information</h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-4">
                  {/* Category Name */}
                  <div className="col-md-6">
                    <label className="form-label text-danger fs-14 mb-2">Sub-Category Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control fs-14 border shadow-sm"
                      style={{ borderRadius: 3, borderColor: "#e5e9ef", height: 38 }}
                      placeholder="e.g. Mobile Phones, Dining Tables"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  {/* Parent Category */}
                  <div className="col-md-6">
                    <label className="form-label text-danger fs-14 mb-2">Parent Category <span className="text-danger">*</span></label>
                    <div className="dropdown w-100 position-relative">
                      <div
                        className="form-control fs-14 border shadow-sm d-flex align-items-center justify-content-between px-3"
                        style={{ height: 38, borderRadius: 3, borderColor: "#e5e9ef", background: "#fff", cursor: 'pointer' }}
                        onClick={() => setShowParentDropdown(!showParentDropdown)}
                      >
                        <span className={formData.parent ? "text-dark" : "text-muted"}>
                          {formData.parent || "— Select parent category —"}
                        </span>
                        <i className={`ti ti-chevron-${showParentDropdown ? 'up' : 'down'} text-muted fs-12`} />
                      </div>
                      {showParentDropdown && (
                        <div
                          className="position-absolute w-100 shadow-lg border-0 mt-1 bg-white"
                          style={{ zIndex: 1050, borderRadius: 3, border: '1px solid #e5e9ef' }}
                        >
                          <ul className="list-unstyled mb-0 py-1">
                            <li
                              className="px-3 py-2 fs-14 cursor-pointer custom-dropdown-item"
                              onClick={() => { setFormData({ ...formData, parent: "" }); setShowParentDropdown(false); }}
                            >
                              — Select parent category —
                            </li>
                            {parentOptions.map(opt => (
                              <li
                                key={opt.value}
                                className="px-3 py-2 fs-14 cursor-pointer custom-dropdown-item"
                                style={{
                                  background: formData.parent === opt.value ? '#e41f07' : 'transparent',
                                  color: formData.parent === opt.value ? '#fff' : 'inherit'
                                }}
                                onClick={() => { setFormData({ ...formData, parent: opt.value }); setShowParentDropdown(false); }}
                              >
                                {opt.label}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Category Code */}
                  <div className="col-md-6">
                    <label className="form-label text-dark fs-14 mb-2">Sub-Category Code</label>
                    <input
                      type="text"
                      className="form-control fs-14 border shadow-sm"
                      style={{ borderRadius: 3, borderColor: "#e5e9ef", background: "#fff", height: 38 }}
                      placeholder="e.g. SUB101"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    />
                  </div>

                  {/* Level */}
                  <div className="col-md-6">
                    <label className="form-label  text-dark fs-14 mb-2">Level</label>
                    <input
                      type="text"
                      className="form-control fs-14 border"
                      style={{ borderRadius: 3, borderColor: "#e5e9ef", background: "#fff", height: 38 }}
                      value="2"
                      readOnly
                    />
                  </div>

                  {/* Target Amount, Reference, Coupon Code */}
                  <div className="col-md-4">
                    <label className="form-label text-dark fs-14 mb-2">Target Amount</label>
                    <input
                      type="number"
                      className="form-control fs-14 border shadow-sm"
                      style={{ borderRadius: 3, borderColor: "#e5e9ef", height: 38 }}
                      placeholder="0.00"
                      value={formData.targetAmount || ""}
                      onChange={(e) => setFormData({ ...formData, targetAmount: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label text-dark fs-14 mb-2">Reference</label>
                    <input
                      type="text"
                      className="form-control fs-14 border shadow-sm"
                      style={{ borderRadius: 3, borderColor: "#e5e9ef", height: 38 }}
                      placeholder="REF-XXXX"
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label text-dark fs-14 mb-2">Cash back </label>
                    <input
                      type="text"
                      className="form-control fs-14 border shadow-sm"
                      style={{ borderRadius: 3, borderColor: "#e5e9ef", height: 38 }}
                      placeholder="PROMO10"
                      value={formData.coupon}
                      onChange={(e) => setFormData({ ...formData, coupon: e.target.value })}
                    />
                  </div>

                  {/* Description */}
                  <div className="col-md-12">
                    <label className="form-label  text-dark fs-14 mb-2">Description</label>
                    <textarea
                      className="form-control fs-14 border shadow-sm"
                      rows={3}
                      style={{ borderRadius: 3, borderColor: "#e5e9ef" }}
                      placeholder="Briefly describe this sub-category..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions in Footer */}
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
                  Save Category
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewSubCategoryPage;
