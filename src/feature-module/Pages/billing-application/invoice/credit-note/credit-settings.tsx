// @ts-nocheck
import React, { useState, useCallback } from "react";
import "./credit.scss";
import PageHeader from "../../../../../components/page-header/pageHeader";
import SettingsTopbar from "../../../settings/settings-topbar/settingsTopbar";
import { all_routes } from "../../../../../routes/all_routes";

// ── Toast ──────────────────────────────────────────────────────────────────────
interface ToastItem { id: number; type: "success" | "danger"; title: string; message: string; }
const ToastContainer = ({ toasts, onClose }: { toasts: ToastItem[]; onClose: (id: number) => void }) => (
    <div style={{ position: "fixed", bottom: 16, right: 16, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, minWidth: 280 }}>
        {toasts.map(t => (
            <div key={t.id} className={`alert ${t.type === "success" ? "alert-success" : "alert-danger"} alert-dismissible d-flex align-items-start mb-0`} role="alert" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 14 }}>
                <i className={`${t.type === "success" ? "ti ti-checks" : "ti ti-trash-x"} f-16 me-2 mt-1`} />
                <div className="flex-grow-1"><strong>{t.title} — </strong>{t.message}</div>
                <button type="button" className="btn-close ms-2 mt-1" onClick={() => onClose(t.id)} style={{ position: "static" }} />
            </div>
        ))}
    </div>
);

// ── Types ──────────────────────────────────────────────────────────────────────
interface CreditNotePrefs {
    allowEditSentCreditNote: boolean;
    autoApplyToInvoice: boolean;
    notifyCustomerOnIssue: boolean;
    includeReasonOnPdf: boolean;
    hideZeroValueItems: boolean;
    numberPrefix: string;
    termsAndConditions: string;
    customerNotes: string;
}

interface CustomField {
    id: number;
    displayName: string;
    fieldName: string;
    dataType: string;
    mandatory: "Yes" | "No";
    showInAllPdfs: "Yes" | "No";
    status: "Active" | "Inactive";
}

const DEFAULT_PREFS: CreditNotePrefs = {
    allowEditSentCreditNote: true,
    autoApplyToInvoice: false,
    notifyCustomerOnIssue: true,
    includeReasonOnPdf: true,
    hideZeroValueItems: false,
    numberPrefix: "CN",
    termsAndConditions: "",
    customerNotes: "Thank you for your business.",
};

// ── Component ──────────────────────────────────────────────────────────────────
const CreditNoteSetting: React.FC = () => {
    const [activeTab, setActiveTab] = useState<"preferences" | "field-customization">("preferences");
    const [loading, setLoading] = useState(false);
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const closeToast = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), []);
    const showToast = useCallback((type: ToastItem["type"], title: string, message: string) => {
        const id = Date.now();
        setToasts(p => [...p, { id, type, title, message }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000);
    }, []);

    const [prefs, setPrefs] = useState<CreditNotePrefs>(() => {
        const saved = localStorage.getItem("credit_note_preferences");
        return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
    });

    const setP = <K extends keyof CreditNotePrefs>(key: K, val: CreditNotePrefs[K]) =>
        setPrefs(prev => ({ ...prev, [key]: val }));

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            localStorage.setItem("credit_note_preferences", JSON.stringify(prefs));
            showToast("success", "Saved", "Credit Note preferences updated.");
            setLoading(false);
        }, 600);
    };

    // ── Custom Fields ──────────────────────────────────────────────────────────
    const [customFields, setCustomFields] = useState<CustomField[]>(() => {
        const saved = localStorage.getItem("credit_note_custom_fields");
        return saved ? JSON.parse(saved) : [];
    });
    const [searchText, setSearchText] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ displayName: "", dataType: "Text Box (Single Line)", mandatory: "No" as "Yes" | "No", showInAllPdfs: "No" as "Yes" | "No" });
    const [addErr, setAddErr] = useState("");
    const [addSaving, setAddSaving] = useState(false);

    const saveFields = (fields: CustomField[]) => {
        setCustomFields(fields);
        localStorage.setItem("credit_note_custom_fields", JSON.stringify(fields));
    };

    const handleAddField = () => {
        if (!addForm.displayName.trim()) { setAddErr("Display Name is required."); return; }
        setAddSaving(true);
        setTimeout(() => {
            const slug = addForm.displayName.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
            const newField: CustomField = {
                id: Date.now(),
                displayName: addForm.displayName.trim(),
                fieldName: slug,
                dataType: addForm.dataType,
                mandatory: addForm.mandatory,
                showInAllPdfs: addForm.showInAllPdfs,
                status: "Active",
            };
            saveFields([...customFields, newField]);
            setShowAddModal(false);
            setAddForm({ displayName: "", dataType: "Text Box (Single Line)", mandatory: "No", showInAllPdfs: "No" });
            setAddErr("");
            setAddSaving(false);
            showToast("success", "Field Added", `"${newField.displayName}" has been added.`);
        }, 500);
    };

    const handleDeleteField = (id: number) => {
        if (window.confirm("Delete this custom field?")) {
            saveFields(customFields.filter(f => f.id !== id));
            showToast("danger", "Deleted", "Custom field removed.");
        }
    };

    const DATA_TYPES = ["Text Box (Single Line)", "Text Box (Multi Line)", "Number", "Decimal", "Date", "CheckBox", "Dropdown"];

    return (
        <>
            <div className="page-wrapper">
                <div className="content">
                    <PageHeader title="Settings" badgeCount={false} showModuleTile={false} showExport={false} />
                    <SettingsTopbar />

                    <div className="row">
                        <div className="col-12">
                            <div className="card border-0 shadow-sm">
                                {/* Tab Header */}
                                <div className="card-header bg-white pt-4 pb-0 px-4 border-0">
                                    <div className="tab-bar-custom m-0">
                                        {(["preferences", "field-customization"] as const).map(tab => (
                                            <div key={tab} className={`tab-item-custom ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
                                                {tab === "preferences" ? "Preferences" : "Field Customization"}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="card-body px-4 py-4">

                                    {/* ── Tab 1: Preferences ── */}
                                    {activeTab === "preferences" && (
                                        <form onSubmit={handleSave} style={{ maxWidth: 820 }}>

                                            {/* General */}
                                            <div className="py-2">
                                                <h6 className="fw-bold mb-3" style={{ fontSize: 14, color: "#1a1a2e" }}>General</h6>
                                                {[
                                                    { id: "allowEdit", key: "allowEditSentCreditNote" as const, label: "Allow editing of sent Credit Notes" },
                                                    { id: "autoApply", key: "autoApplyToInvoice" as const,      label: "Automatically apply credit notes to unpaid invoices" },
                                                    { id: "notify",    key: "notifyCustomerOnIssue" as const,   label: "Notify customer when a credit note is issued" },
                                                    { id: "reason",    key: "includeReasonOnPdf" as const,      label: "Include reason for credit note in PDF" },
                                                    { id: "hideZero",  key: "hideZeroValueItems" as const,      label: "Hide zero-value line items in PDF and Customer Portal" },
                                                ].map(item => (
                                                    <div key={item.id} className="d-flex align-items-center gap-2 mb-3">
                                                        <input className="form-check-input mt-0" type="checkbox" id={item.id} checked={prefs[item.key]} onChange={e => setP(item.key, e.target.checked)} />
                                                        <label className="form-check-label text-dark" htmlFor={item.id} style={{ fontSize: 14 }}>{item.label}</label>
                                                    </div>
                                                ))}
                                            </div>

                                            <hr className="my-3 border-light" />

                                            {/* Number Prefix */}
                                            <div className="py-2">
                                                <h6 className="fw-bold mb-3" style={{ fontSize: 14, color: "#1a1a2e" }}>Credit Note Number Prefix</h6>
                                                <div className="row align-items-center">
                                                    <div className="col-md-3">
                                                        <label className="form-label text-dark" style={{ fontSize: 14 }}>Prefix</label>
                                                    </div>
                                                    <div className="col-md-4">
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            style={{ fontSize: 14 }}
                                                            value={prefs.numberPrefix}
                                                            onChange={e => setP("numberPrefix", e.target.value)}
                                                            placeholder="e.g. CN"
                                                            maxLength={10}
                                                        />
                                                        <small className="text-muted">e.g. CN-00001</small>
                                                    </div>
                                                </div>
                                            </div>

                                            <hr className="my-3 border-light" />

                                            {/* Terms & Conditions */}
                                            <div className="py-2">
                                                <h6 className="fw-bold mb-3" style={{ fontSize: 14, color: "#1a1a2e" }}>Terms &amp; Conditions</h6>
                                                <textarea className="form-control" rows={5} style={{ fontSize: 14, resize: "vertical" }} value={prefs.termsAndConditions} onChange={e => setP("termsAndConditions", e.target.value)} placeholder="Enter terms and conditions for credit notes..." />
                                            </div>

                                            <hr className="my-3 border-light" />

                                            {/* Customer Notes */}
                                            <div className="py-2">
                                                <h6 className="fw-bold mb-3" style={{ fontSize: 14, color: "#1a1a2e" }}>Customer Notes</h6>
                                                <textarea className="form-control" rows={4} style={{ fontSize: 14, resize: "vertical" }} value={prefs.customerNotes} onChange={e => setP("customerNotes", e.target.value)} />
                                            </div>

                                            <div className="mt-5 pt-3 border-top">
                                                <button type="submit" className="btn btn-primary px-4 fw-bold shadow-none" disabled={loading} style={{ borderRadius: 4 }}>
                                                    {loading ? "Saving..." : "Save"}
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    {/* ── Tab 2: Field Customization ── */}
                                    {activeTab === "field-customization" && (
                                        <div className="py-2">
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <h5 className="fw-bold mb-0" style={{ fontSize: 14 }}>Custom Fields</h5>
                                                <button type="button" className="btn btn-primary btn-sm px-3 fw-bold shadow-none" onClick={() => setShowAddModal(true)}>
                                                    <i className="ti ti-plus me-1" />Add New Field
                                                </button>
                                            </div>

                                            {/* Search */}
                                            {customFields.length > 0 && (
                                                <div className="mb-3" style={{ maxWidth: 280 }}>
                                                    <div className="d-flex align-items-center border rounded bg-white" style={{ height: 34, paddingLeft: 8 }}>
                                                        <i className="ti ti-search text-muted fs-14 me-1" />
                                                        <input className="form-control border-0 shadow-none fs-13" style={{ height: 30 }} placeholder="Search fields..." value={searchText} onChange={e => setSearchText(e.target.value)} />
                                                    </div>
                                                </div>
                                            )}

                                            {customFields.length === 0 ? (
                                                <div className="text-center py-5 border rounded bg-light" style={{ color: "#8c8c8c", fontSize: 14 }}>
                                                    <i className="ti ti-database-off" style={{ fontSize: 40, display: "block", marginBottom: 12 }} />
                                                    No custom fields yet. Click "Add New Field" to get started.
                                                </div>
                                            ) : (
                                                <div className="table-responsive border rounded">
                                                    <table className="table table-hover mb-0">
                                                        <thead className="table-light">
                                                            <tr style={{ fontSize: 14, fontWeight: 600 }}>
                                                                <th className="px-3 py-2">Display Name</th>
                                                                <th className="py-2">Data Type</th>
                                                                <th className="py-2">Mandatory</th>
                                                                <th className="py-2">Show in PDFs</th>
                                                                <th className="py-2">Status</th>
                                                                <th className="py-2">Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {customFields.filter(f => f.displayName.toLowerCase().includes(searchText.toLowerCase())).map(f => (
                                                                <tr key={f.id} style={{ fontSize: 14 }}>
                                                                    <td className="px-3 py-3 text-dark fw-medium">{f.displayName}</td>
                                                                    <td className="py-3 text-muted">{f.dataType}</td>
                                                                    <td className="py-3">
                                                                        <span className={`badge px-2 py-1 ${f.mandatory === "Yes" ? "bg-danger bg-opacity-10 text-danger" : "bg-secondary bg-opacity-10 text-secondary"}`} style={{ borderRadius: 6 }}>{f.mandatory}</span>
                                                                    </td>
                                                                    <td className="py-3">
                                                                        <span className={`badge px-2 py-1 ${f.showInAllPdfs === "Yes" ? "bg-success bg-opacity-10 text-success" : "bg-secondary bg-opacity-10 text-secondary"}`} style={{ borderRadius: 6 }}>{f.showInAllPdfs}</span>
                                                                    </td>
                                                                    <td className="py-3">
                                                                        <span className={`badge px-2 py-1 ${f.status === "Active" ? "bg-success bg-opacity-10 text-success" : "bg-secondary bg-opacity-10 text-secondary"}`} style={{ borderRadius: 6 }}>{f.status}</span>
                                                                    </td>
                                                                    <td className="py-3">
                                                                        <button className="btn btn-sm border px-2 bg-white text-danger" onClick={() => handleDeleteField(f.id)} title="Delete" style={{ lineHeight: 1 }}>
                                                                            <i className="ti ti-trash fs-14" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
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

            {/* Add Field Modal */}
            {showAddModal && (
                <>
                    <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} />
                    <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12 }}>
                                <div className="modal-header border-0 pb-0">
                                    <h5 className="modal-title fw-bold" style={{ fontSize: 16 }}>Add Custom Field</h5>
                                    <button type="button" className="btn-close shadow-none" onClick={() => { setShowAddModal(false); setAddErr(""); }} />
                                </div>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label fw-medium text-dark" style={{ fontSize: 14 }}>Display Name <span className="text-danger">*</span></label>
                                        <input type="text" className={`form-control ${addErr ? "is-invalid" : ""}`} style={{ fontSize: 14 }} placeholder="e.g. Purchase Order #" autoFocus value={addForm.displayName} onChange={e => { setAddForm(p => ({ ...p, displayName: e.target.value })); setAddErr(""); }} />
                                        {addErr && <div className="invalid-feedback d-block">{addErr}</div>}
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-medium text-dark" style={{ fontSize: 14 }}>Data Type</label>
                                        <select className="form-select" style={{ fontSize: 14 }} value={addForm.dataType} onChange={e => setAddForm(p => ({ ...p, dataType: e.target.value }))}>
                                            {DATA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="d-flex gap-4">
                                        <div className="form-check form-switch">
                                            <input className="form-check-input" type="checkbox" id="add-mandatory" checked={addForm.mandatory === "Yes"} onChange={e => setAddForm(p => ({ ...p, mandatory: e.target.checked ? "Yes" : "No" }))} />
                                            <label className="form-check-label" htmlFor="add-mandatory" style={{ fontSize: 14 }}>Mandatory</label>
                                        </div>
                                        <div className="form-check form-switch">
                                            <input className="form-check-input" type="checkbox" id="add-pdf" checked={addForm.showInAllPdfs === "Yes"} onChange={e => setAddForm(p => ({ ...p, showInAllPdfs: e.target.checked ? "Yes" : "No" }))} />
                                            <label className="form-check-label" htmlFor="add-pdf" style={{ fontSize: 14 }}>Show in PDFs</label>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-0 pt-0">
                                    <button type="button" className="btn btn-light shadow-none" onClick={() => { setShowAddModal(false); setAddErr(""); }}>Cancel</button>
                                    <button type="button" className="btn btn-primary shadow-none fw-bold" onClick={handleAddField} disabled={addSaving}>
                                        {addSaving ? "Saving..." : "Save Field"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <ToastContainer toasts={toasts} onClose={closeToast} />
        </>
    );
};

export default CreditNoteSetting;
