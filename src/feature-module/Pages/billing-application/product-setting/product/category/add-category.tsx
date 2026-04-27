import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { all_routes } from "../../../../../../routes/all_routes";
import Footer from "../../../../../../components/footer/footer";
import "./category.scss";

const route = all_routes;

const mockCategories = [
  { id: 1, name: "Super_stockist", level: 1 },
  { id: 2, name: "mvbfy", level: 1 },
  { id: 3, name: "cfvgbhj", level: 1 },
  { id: 4, name: "New SS", level: 1 },
];

const AddCategoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [parentDropOpen, setParentDropOpen] = useState(false);
  const parentDropRef = useRef<HTMLDivElement>(null);
  const [locationDropOpen, setLocationDropOpen] = useState(false);
  const locationDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (parentDropRef.current && !parentDropRef.current.contains(e.target as Node)) {
        setParentDropOpen(false);
      }
      if (locationDropRef.current && !locationDropRef.current.contains(e.target as Node)) {
        setLocationDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const location = useLocation();
  const editData = location.state?.editData;

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    level: 1,
    portalAccess: true,
    visibleInMap: true,
    parent: "",
    isChild: false,
    linkToLocation: "",
  });

  useEffect(() => {
    if (editData) {
      setFormData({
        ...editData,
        isChild: !!editData.parent,
      });
    }
  }, [editData]);

  const handleSave = () => {
    if (!formData.name) return;
    const existing = JSON.parse(localStorage.getItem("categories") || "[]");

    if (editData) {
      // Update existing
      const updated = existing.map((cat: any) =>
        cat.id === editData.id ? { ...cat, ...formData, parent: formData.parent || null } : cat
      );
      localStorage.setItem("categories", JSON.stringify(updated));
    } else {
      // Create new
      const newCat = {
        ...formData,
        id: Date.now(),
        status: "Enabled",
        linkToLocation: formData.linkToLocation || null,
        parent: formData.parent || null,
      };
      localStorage.setItem("categories", JSON.stringify([...existing, newCat]));
    }
    navigate(route.userCategory);
  };

  return (
    <div className="page-wrapper">
      <div className="content">

        {/* Page Header */}
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <h4 className="fw-bold fs-20 mb-1">{editData ? "Edit Category" : "Add Category"}</h4>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-0 fs-13">
                <li className="breadcrumb-item"><Link to="/" className="text-muted">Home</Link></li>
                <li className="breadcrumb-item"><Link to={route.userCategory} className="text-muted">Customer Category</Link></li>
                <li className="breadcrumb-item active text-dark fw-medium">{editData ? "Edit Category" : "Add Category"}</li>
              </ol>
            </nav>
          </div>
          <button
            onClick={() => navigate(route.userCategory)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 3,
              background: "#ffffff",
              border: "1px solid #e5e9ef",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 16, color: "#1d2a3a" }} />
          </button>
        </div>

        {/* Form Card */}
        <div className="card border-0 shadow-sm" style={{ borderRadius: 5, fontSize: 14 }}>
          <div className="card-body p-4">
            <div className="row g-4">

              {/* Category Name */}
              <div className="col-md-12">
                <label className="form-label text-danger fs-14">Category Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control border"
                  placeholder="e.g. Distributor"
                  style={{ borderRadius: 3, fontSize: 14 }}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Code & Level */}
              <div className="col-md-6">
                <label className="form-label  fs-14">Category Code</label>
                <input
                  type="text"
                  className="form-control border"
                  placeholder="e.g. SS01"
                  style={{ borderRadius: 3, borderColor: "#fca5a5", fontSize: 14 }}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fs-14">Level</label>
                <input
                  type="number"
                  className="form-control border"
                  min={1}
                  placeholder="e.g. 1"
                  style={{ borderRadius: 3, borderColor: "#e5e9ef", fontSize: 14 }}
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: Number(e.target.value) })}
                />
              </div>

              {/* Description */}
              <div className="col-md-12">
                <label className="form-label fs-14">Description</label>
                <textarea
                  className="form-control border"
                  rows={3}
                  placeholder="Short description of this category..."
                  style={{ borderRadius: 3, borderColor: "#e5e9ef", fontSize: 14 }}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Child Category Toggle */}
              <div className="col-md-12">
                <div className="d-flex align-items-center gap-3 mb-1">
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="isChild"
                      style={{ width: 40, height: 22, cursor: "pointer" }}
                      checked={formData.isChild}
                      onChange={(e) => setFormData({ ...formData, isChild: e.target.checked, parent: "", level: 1 })}
                    />
                  </div>
                  <label htmlFor="isChild" className="form-label fs-14 mb-0 cursor-pointer">
                    This is a Child Category
                  </label>
                </div>
                <p className="text-muted fs-12 mb-0 ms-1">Link this category under a parent category</p>

                {formData.isChild && (
                  <div className="mt-3">
                    <label className="form-label fs-14">Parent Category</label>
                    <div ref={parentDropRef} style={{ position: "relative", fontSize: 14 }}>
                      <div
                        onClick={() => setParentDropOpen(o => !o)}
                        style={{
                          border: `1px solid ${parentDropOpen ? "#e41f07" : "#e5e9ef"}`,
                          borderRadius: 3,
                          padding: "8px 36px 8px 12px",
                          cursor: "pointer",
                          background: "#fff",
                          color: formData.parent ? "#111827" : "#6c757d",
                          userSelect: "none",
                          position: "relative",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        }}
                      >
                        {formData.parent || "— Select parent category —"}
                        <i
                          className="ti ti-chevron-down"
                          style={{
                            position: "absolute",
                            right: 10,
                            top: "50%",
                            transform: `translateY(-50%) rotate(${parentDropOpen ? 180 : 0}deg)`,
                            transition: "transform 0.2s",
                            color: "#6c757d",
                            fontSize: 16,
                          }}
                        />
                      </div>
                      {parentDropOpen && (
                        <div style={{
                          position: "absolute",
                          top: "calc(100% + 2px)",
                          left: 0,
                          right: 0,
                          background: "#fff",
                          border: "1px solid #e5e9ef",
                          borderRadius: 3,
                          zIndex: 999,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          overflow: "hidden",
                        }}>
                          {[{ id: 0, name: "", label: "— Select parent category —" }, ...mockCategories.map(c => ({ ...c, label: c.name }))].map((item) => (
                            <div
                              key={item.id}
                              onMouseEnter={e => (e.currentTarget.style.background = "#e41f07", e.currentTarget.style.color = "#fff")}
                              onMouseLeave={e => {
                                const isSelected = formData.parent === item.name;
                                e.currentTarget.style.background = isSelected ? "#e41f07" : "#fff";
                                e.currentTarget.style.color = isSelected ? "#fff" : (item.name ? "#111827" : "#6c757d");
                              }}
                              onClick={() => {
                                const sel = mockCategories.find(c => c.name === item.name);
                                setFormData({ ...formData, parent: item.name, level: sel ? sel.level + 1 : 2 });
                                setParentDropOpen(false);
                              }}
                              style={{
                                padding: "10px 12px",
                                cursor: "pointer",
                                background: formData.parent === item.name ? "#e41f07" : "#fff",
                                color: formData.parent === item.name ? "#fff" : (item.name ? "#111827" : "#6c757d"),
                                transition: "background 0.15s",
                              }}
                            >
                              {item.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Link to Location */}
              <div className="col-md-12">
                <label className="form-label fs-14">Link to Location</label>
                <p className="text-muted fs-12 mb-2">Associate this category with a country & its layers</p>
                <div ref={locationDropRef} style={{ position: "relative", fontSize: 14 }}>
                  <div
                    onClick={() => setLocationDropOpen(o => !o)}
                    style={{
                      border: `1px solid ${locationDropOpen ? "#e41f07" : "#e5e9ef"}`,
                      borderRadius: 3,
                      padding: "8px 36px 8px 12px",
                      cursor: "pointer",
                      background: "#fff",
                      color: formData.linkToLocation ? "#111827" : "#6c757d",
                      userSelect: "none",
                      position: "relative",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }}
                  >
                    {formData.linkToLocation || "— Select country —"}
                    <i
                      className="ti ti-chevron-down"
                      style={{
                        position: "absolute",
                        right: 10,
                        top: "50%",
                        transform: `translateY(-50%) rotate(${locationDropOpen ? 180 : 0}deg)`,
                        transition: "transform 0.2s",
                        color: "#6c757d",
                        fontSize: 16,
                      }}
                    />
                  </div>
                  {locationDropOpen && (
                    <div style={{
                      position: "absolute",
                      top: "calc(100% + 2px)",
                      left: 0,
                      right: 0,
                      background: "#fff",
                      border: "1px solid #e5e9ef",
                      borderRadius: 3,
                      zIndex: 999,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      overflow: "hidden",
                    }}>
                      {["", "India", "USA"].map((country) => (
                        <div
                          key={country}
                          onMouseEnter={e => (e.currentTarget.style.background = "#e41f07", e.currentTarget.style.color = "#fff")}
                          onMouseLeave={e => {
                            const isSelected = formData.linkToLocation === country;
                            e.currentTarget.style.background = isSelected ? "#e41f07" : "#fff";
                            e.currentTarget.style.color = isSelected ? "#fff" : (country ? "#111827" : "#6c757d");
                          }}
                          onClick={() => {
                            setFormData({ ...formData, linkToLocation: country });
                            setLocationDropOpen(false);
                          }}
                          style={{
                            padding: "10px 12px",
                            cursor: "pointer",
                            background: formData.linkToLocation === country ? "#e41f07" : "#fff",
                            color: formData.linkToLocation === country ? "#fff" : (country ? "#111827" : "#6c757d"),
                            transition: "background 0.15s",
                          }}
                        >
                          {country || "— Select country —"}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Portal Access & Visible in Map */}
              <div className="col-md-6">
                <div className="d-flex align-items-center gap-3 mb-1">
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="portalAcc"
                      style={{ width: 40, height: 22, cursor: "pointer" }}
                      checked={formData.portalAccess}
                      onChange={(e) => setFormData({ ...formData, portalAccess: e.target.checked })}
                    />
                  </div>
                  <label htmlFor="portalAcc" className="form-label  fs-14 mb-0 cursor-pointer">Portal Access</label>
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
                      id="visibleMap"
                      style={{ width: 40, height: 22, cursor: "pointer" }}
                      checked={formData.visibleInMap}
                      onChange={(e) => setFormData({ ...formData, visibleInMap: e.target.checked })}
                    />
                  </div>
                  <label htmlFor="visibleMap" className="form-label fs-14 mb-0 cursor-pointer">Visible in Hierarchy Map</label>
                </div>
                <p className="text-muted fs-12 ms-1">Show in flow diagram</p>
              </div>

              {/* Hierarchy Preview */}
              <div className="col-md-12">
                <div className="p-3" style={{ background: "#f1f7ff", border: "1px solid #bfdbfe", borderRadius: 5 }}>
                  <p className="fs-12 fw-bold text-uppercase mb-3" style={{ color: "#1e40af", letterSpacing: "0.05em" }}>
                    Hierarchy Preview
                  </p>
                  <div className="d-flex flex-column gap-2">
                    {formData.isChild && formData.parent && (
                      <>
                        <div className="d-flex align-items-center gap-2 px-3 py-2" style={{ background: "#fff", border: "1px solid #e0e7ff", borderRadius: 3 }}>
                          <i className="ti ti-user-circle fs-15" style={{ color: "#7950f2" }} />
                          <span className="fw-semibold fs-13 text-dark">{formData.parent}</span>
                          <span className="badge ms-auto fs-11" style={{ background: "#ede9fe", color: "#7950f2" }}>Parent</span>
                        </div>
                        <div className="ps-3">
                          <i className="ti ti-corner-down-right text-muted fs-13" />
                        </div>
                      </>
                    )}
                    <div className="d-flex align-items-center gap-2 px-3 py-2" style={{ background: "#fff", border: `1px solid ${formData.name ? "#fca5a5" : "#e0e7ff"}`, borderRadius: 3 }}>
                      <i className="ti ti-user-circle fs-15" style={{ color: formData.name ? "#e41f07" : "#94a3b8" }} />
                      <span className=" fs-13" style={{ color: formData.name ? "#e41f07" : "#94a3b8" }}>
                        {formData.name || "New Category"}
                      </span>
                      <span className="badge ms-auto fs-11" style={{ background: formData.name ? "#fff0ef" : "#f1f5f9", color: formData.name ? "#e41f07" : "#94a3b8" }}>
                        Level {formData.level}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Footer Actions */}
          <div
            className="card-footer d-flex justify-content-between align-items-center px-4 py-3 bg-white"
            style={{ borderTop: "1px solid #f0f2f4" }}
          >

            <div className="d-flex gap-2">
              <button
                className="btn btn-light fw-semibold px-4"
                style={{ borderRadius: 3 }}
                onClick={() => navigate(route.userCategory)}>
                Cancel
              </button>
              <button
                className="btn btn-danger px-3 fw-semibold fs-13"
                style={{ background: "#e41f07", borderColor: "#e41f07", borderRadius: 3 }}
                onClick={handleSave}
              >
                {editData ? "Update Category" : "Save Category"}
              </button>
            </div>
          </div>
        </div>

      </div>
      <Footer />
    </div>
  );
};

export default AddCategoryPage;
