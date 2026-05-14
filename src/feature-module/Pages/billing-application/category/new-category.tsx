// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { all_routes } from "../../../../routes/all_routes";
import "./category.scss";

const route = all_routes;

interface LocationNode {
  id: number;
  parentId: number | null;
  name: string;
  code: string;
  isDeleted?: boolean;
  childLayerName?: string;
}

function loadLocations(): LocationNode[] {
  try {
    const raw = localStorage.getItem("asl_locations_v11");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((n: LocationNode) => !n.isDeleted);
    }
  } catch { /**/ }
  return [];
}

function loadLayerNames(): string[] {
  try {
    const raw = localStorage.getItem("asl_layers_v11");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /**/ }
  return ["Country"];
}

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
    linkToLocation: editRecord?.linkToLocation ?? false,
    linkedCountryId: editRecord?.linkedCountryId ?? (null as number | null),
    linkedLayerId: editRecord?.linkedLayerId ?? (null as number | null),
  });

  const [allLocations, setAllLocations] = useState<LocationNode[]>([]);
  const [layerNames, setLayerNames] = useState<string[]>(["Country"]);

  useEffect(() => {
    setAllLocations(loadLocations());
    setLayerNames(loadLayerNames());
  }, []);

  useEffect(() => {
    if (formData.name && !formData.code && !editRecord) {
      const prefix = formData.name.substring(0, 3).toUpperCase();
      const random = Math.floor(100 + Math.random() * 900);
      setFormData(prev => ({ ...prev, code: `${prefix}${random}` }));
    }
  }, [formData.name, editRecord]);

  const countries = useMemo(
    () => allLocations.filter(n => n.parentId === null),
    [allLocations]
  );

  const selectedCountry = useMemo(
    () => allLocations.find(n => n.id === formData.linkedCountryId) ?? null,
    [allLocations, formData.linkedCountryId]
  );

  const childLayers = useMemo(
    () => allLocations.filter(n => n.parentId === formData.linkedCountryId),
    [allLocations, formData.linkedCountryId]
  );

  const childLayerLabel = useMemo(() => {
    if (!selectedCountry) return "Layer";
    return selectedCountry.childLayerName || layerNames[1] || "Layer";
  }, [selectedCountry, layerNames]);

  const takenLayerIds = useMemo(() => {
    try {
      const cats = JSON.parse(localStorage.getItem("categories") || "[]");
      const taken = new Set<number>();
      cats.forEach((cat: any) => {
        if (cat.linkedLayerId && cat.id !== editRecord?.id) taken.add(cat.linkedLayerId);
      });
      return taken;
    } catch { return new Set<number>(); }
  }, [editRecord]);

  const hasConflict = useMemo(
    () => childLayers.some(l => takenLayerIds.has(l.id)),
    [childLayers, takenLayerIds]
  );

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

            {/* Basic Information */}
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

            {/* Link to Location */}
            <div
              className="card mb-4"
              style={{ border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            >
              <div className="card-body p-4">

                {/* Toggle header row */}
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                      style={{ width: 42, height: 42, background: "#fff4f0", border: "1px solid #fdddd6" }}
                    >
                      <i className="ti ti-map-pin" style={{ fontSize: 20, color: "#e85d2f" }} />
                    </div>
                    <div>
                      <p className="fw-semibold mb-0 text-dark" style={{ fontSize: 14 }}>Link to Location</p>
                      <p className="mb-0" style={{ fontSize: 12, color: "#9ca3af" }}>
                        Associate this category with a country &amp; its layers
                      </p>
                    </div>
                  </div>
                  <div className="form-check form-switch mb-0 ms-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="linkToLocation"
                      style={{ width: 46, height: 24, cursor: "pointer" }}
                      checked={formData.linkToLocation}
                      onChange={(e) => setFormData({
                        ...formData,
                        linkToLocation: e.target.checked,
                        linkedCountryId: null,
                        linkedLayerId: null,
                      })}
                    />
                  </div>
                </div>

                {/* Expanded body */}
                {formData.linkToLocation && (
                  <div>
                    <hr style={{ margin: "16px 0", borderColor: "#f0f0f0" }} />

                    {/* Country */}
                    <div className="mb-3">
                      <label
                        className="d-flex align-items-center gap-1 mb-2"
                        style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}
                      >
                        <i className="ti ti-globe" style={{ fontSize: 14 }} />
                        Country
                      </label>
                      <select
                        className="form-select"
                        style={{
                          fontSize: 14,
                          borderRadius: 6,
                          borderColor: "#d1d5db",
                          height: 40,
                          background: "#fff",
                          color: "#111827",
                        }}
                        value={formData.linkedCountryId ?? ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          linkedCountryId: e.target.value ? +e.target.value : null,
                          linkedLayerId: null,
                        })}
                      >
                        <option value="">— Select country —</option>
                        {countries.map((c: LocationNode) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      {countries.length === 0 && (
                        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                          No locations found. Add locations first.
                        </p>
                      )}
                    </div>

                    {/* Layer */}
                    <div className="mb-3">
                      <label
                        className="d-flex align-items-center gap-1 mb-2"
                        style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}
                      >
                        <i className="ti ti-list" style={{ fontSize: 14 }} />
                        {childLayerLabel}
                      </label>
                      <select
                        className="form-select"
                        style={{
                          fontSize: 14,
                          borderRadius: 6,
                          height: 40,
                          background: "#fff",
                          color: formData.linkedLayerId ? "#111827" : "#9ca3af",
                          border: "1.5px solid #3b82f6",
                          boxShadow: "0 0 0 3px rgba(59,130,246,0.15)",
                          outline: "none",
                        }}
                        value={formData.linkedLayerId ?? ""}
                        disabled={!formData.linkedCountryId}
                        onChange={(e) => setFormData({
                          ...formData,
                          linkedLayerId: e.target.value ? +e.target.value : null,
                        })}
                      >
                        <option value="">— Select layer —</option>
                        {childLayers.map((l: LocationNode) => (
                          <option key={l.id} value={l.id}>
                            {l.name}{takenLayerIds.has(l.id) ? " (assigned)" : ""}
                          </option>
                        ))}
                      </select>

                      {/* Warning — always shown when a country with layers is selected */}
                      {selectedCountry && childLayers.length > 0 && (
                        <div
                          className="d-flex align-items-center gap-1 mt-2"
                          style={{ fontSize: 12, color: "#d97706" }}
                        >
                          <i className="ti ti-alert-triangle" style={{ fontSize: 13 }} />
                          <span>Some layers are already assigned to other categories.</span>
                        </div>
                      )}
                    </div>

                    {/* Summary */}
                    {selectedCountry && (
                      <div
                        className="d-flex align-items-center gap-2 px-3 py-2"
                        style={{
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: 8,
                        }}
                      >
                        <i className="ti ti-map-pin" style={{ fontSize: 15, color: "#2563eb" }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#1d4ed8" }}>
                          Linked to: {selectedCountry.name}
                          {childLayers.length > 0 && ` (${childLayers.length} ${childLayers.length === 1 ? "layer" : "layers"})`}
                        </span>
                      </div>
                    )}

                  </div>
                )}

              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default NewCategoryPage;
