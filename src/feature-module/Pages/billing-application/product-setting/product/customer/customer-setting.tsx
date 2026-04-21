import React, { useState, useEffect, useCallback, useRef } from 'react';
import "../../../billing-application.scss";
import { Link } from "react-router-dom";
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import Footer from "../../../../../../components/footer/footer";
import PageHeader from "../../../../../../components/page-header/pageHeader";
import SearchInput from "../../../../../../components/dataTable/dataTableSearch";
import SettingsTopbar from "../../../../settings/settings-topbar/settingsTopbar";
import CommonSelect from "../../../../../../components/common-select/commonSelect";
import { Input_Type } from "../../../../../../core/json/selectOption";
import './customer.scss';

/* ═══════════════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════════════ */
interface ToastItem {
    id: number;
    type: 'success' | 'danger' | 'warning' | 'info';
    title: string;
    message: string;
}
const toastColors: Record<ToastItem['type'], { alertClass: string; icon: string }> = {
    success: { alertClass: 'alert-success', icon: 'ti ti-checks' },
    danger: { alertClass: 'alert-danger', icon: 'ti ti-trash-x' },
    warning: { alertClass: 'alert-warning', icon: 'ti ti-alert-triangle' },
    info: { alertClass: 'alert-info', icon: 'ti ti-info-circle' },
};

const ToastContainer: React.FC<{ toasts: ToastItem[]; onClose: (id: number) => void }> = ({ toasts, onClose }) => (
    <div style={{ position: 'fixed', bottom: '16px', right: '16px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '280px', maxWidth: 'calc(100vw - 32px)' }}>
        {toasts.map(t => {
            const c = toastColors[t.type];
            return (
                <div key={t.id} className={`alert ${c.alertClass} alert-dismissible d-flex align-items-start mb-0`} role="alert" style={{ animation: 'slideIn 0.3s ease', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 13 }}>
                    <i className={`${c.icon} f-16 me-2 mt-1`} />
                    <div className="flex-grow-1"><strong>{t.title} - </strong> {t.message}</div>
                    <button type="button" className="btn-close ms-2 mt-1" onClick={() => onClose(t.id)} aria-label="Close" style={{ position: 'static' }} />
                </div>
            );
        })}
    </div>
);

/* ═══════════════════════════════════════
   HELPERS & COMPONENTS
   ═══════════════════════════════════════ */
const InfoTooltip: React.FC<{ text: string; placement?: 'top' | 'bottom' | 'right' | 'left' }> = ({ text, placement = 'top' }) => (
    <OverlayTrigger placement={placement} overlay={<Tooltip id={`tooltip-${text.replace(/\s+/g, '-')}`} style={{ fontSize: '12px' }}>{text}</Tooltip>}>
        <i className="ti ti-info-circle text-muted cursor-help f-14 ms-1" />
    </OverlayTrigger>
);

const Section: React.FC<{ title: string; description?: string; infoText?: string }> = ({ title, description, infoText }) => (
    <div className="mt-4 mb-3">
        {title && (
            <h6 className="d-flex align-items-center mb-1" style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>
                {title}
                {infoText && <InfoTooltip text={infoText} />}
            </h6>
        )}
        {description && <p className="text-muted" style={{ fontSize: '14px', marginBottom: '12px' }}>{description}</p>}
    </div>
);

/* ══ NEW UTILITY COMPONENTS ══ */
const FieldError: React.FC<{ msg: string }> = ({ msg }) => <span className="text-danger mt-1 d-block" style={{ fontSize: '11px' }}>{msg}</span>;

const WarnBanner: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="alert alert-warning py-2 px-3 mt-2 mb-0 d-flex align-items-center gap-2 border-0" style={{ fontSize: '12px', backgroundColor: '#fff9e6', color: '#856404', borderRadius: '6px' }}>
        <i className="ti ti-alert-triangle f-14" />
        {children}
    </div>
);

const InputFormatSelect: React.FC<{ value: string; onChange: (v: string) => void; required?: boolean }> = ({ value, onChange, required }) => {
    const formats = ['None', 'Numeric', 'AlphaNumeric', 'Decimal', 'Alphabetical'];
    return (
        <select className="form-select form-select-sm" value={value} onChange={e => onChange(e.target.value)} required={required}>
            {formats.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
    );
};

const DefaultValueInput: React.FC<{ dataType: string; value: string; onChange: (v: string) => void; idPrefix: string; hasError?: boolean }> = ({ dataType, value, onChange, idPrefix, hasError }) => {
    if (dataType === 'Date') {
        return <input type="date" className={`form-control form-control-sm ${hasError ? 'is-invalid' : ''}`} value={value} onChange={e => onChange(e.target.value)} />;
    }
    if (dataType === 'CheckBox') {
        return (
            <div className="form-check form-switch pt-1">
                <input className="form-check-input" type="checkbox" id={`${idPrefix}-def-chk`} checked={value === 'Yes'} onChange={e => onChange(e.target.checked ? 'Yes' : 'No')} />
                <label className="form-check-label ps-1" htmlFor={`${idPrefix}-def-chk`} style={{ fontSize: '13px' }}>Default Enabled</label>
            </div>
        );
    }
    return <input type={dataType.includes('Decimal') || dataType.includes('Number') ? 'number' : 'text'} className={`form-control form-control-sm ${hasError ? 'is-invalid' : ''}`} value={value} onChange={e => onChange(e.target.value)} />;
};

const getDefaultValueForType = (type: string) => {
    if (type === 'CheckBox') return 'No';
    if (type === 'Date') return new Date().toISOString().split('T')[0];
    return '';
};

const AddressFormatBox: React.FC<{
    label: string;
    value: string;
    onChange: (v: string) => void;
    infoText?: string;
}> = ({ label, value, onChange, infoText }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const placeholders = {
        CONTACT: [
            { label: 'Display Name', tag: '${CONTACT.CONTACT_DISPLAYNAME}' },
            { label: 'Company Name', tag: '${CONTACT.COMPANY_NAME}' },
            { label: 'Website', tag: '${CONTACT.WEBSITE}' },
            { label: 'Salutation', tag: '${CONTACT.SALUTATION}' },
            { label: 'First Name', tag: '${CONTACT.FIRST_NAME}' },
            { label: 'Last Name', tag: '${CONTACT.LAST_NAME}' },
            { label: 'Contact Email', tag: '${CONTACT.CONTACT_EMAIL}' },
            { label: 'Mobile Phone', tag: '${CONTACT.MOBILE}' },
            { label: 'Phone Label', tag: '${CONTACT.PHONE_LABEL}' },
            { label: 'Phone', tag: '${CONTACT.PHONE}' },
            { label: 'Department', tag: '${CONTACT.DEPARTMENT}' },
            { label: 'Designation', tag: '${CONTACT.DESIGNATION}' },
            { label: 'PAN Label', tag: '${CONTACT.PAN_LABEL}' },
            { label: 'PAN', tag: '${CONTACT.PAN}' },
        ],
        ADDRESS: [
            { label: 'Attention', tag: '${ADDRESS.ATTENTION}' },
            { label: 'Street Address 1', tag: '${ADDRESS.STREET_1}' },
            { label: 'Street Address 2', tag: '${ADDRESS.STREET_2}' },
            { label: 'City', tag: '${ADDRESS.CITY}' },
            { label: 'State/Province', tag: '${ADDRESS.STATE}' },
            { label: 'Country', tag: '${ADDRESS.COUNTRY}' },
            { label: 'ZIP/Postal Code', tag: '${ADDRESS.ZIP}' },
            { label: 'Fax Label', tag: '${ADDRESS.FAX_LABEL}' },
            { label: 'Fax', tag: '${ADDRESS.FAX}' },
        ]
    };

    const insertTag = (tag: string) => {
        onChange(value + (value ? '\n' : '') + tag);
        setShowDropdown(false);
        setSearch('');
    };

    const filtered = {
        CONTACT: placeholders.CONTACT.filter(p => p.label.toLowerCase().includes(search.toLowerCase())),
        ADDRESS: placeholders.ADDRESS.filter(p => p.label.toLowerCase().includes(search.toLowerCase())),
    };

    return (
        <div className="mb-4">
            <label className="text-dark fw-bold d-flex align-items-center gap-1 mb-2" style={{ fontSize: '14px', width: '100%' }}>
                {label} <span className="text-muted fw-normal" style={{ fontSize: '12px' }}>(Displayed in PDF only)</span>
                {infoText && <InfoTooltip text={infoText} />}
            </label>
            <div className="border rounded shadow-sm" style={{ backgroundColor: '#f9fafb' }}>
                <div className="p-2 border-bottom d-flex align-items-center bg-white" ref={dropdownRef}>
                    <div className="dropdown">
                        <button className="btn btn-outline-light btn-sm dropdown-toggle border shadow-none text-dark d-flex align-items-center"
                            type="button" onClick={() => setShowDropdown(!showDropdown)} style={{ fontSize: '13px', fontWeight: 600 }}>
                            Insert Placeholders
                        </button>
                        {showDropdown && (
                            <div className="dropdown-menu show placeholder-dropdown" style={{ 
                                position: 'absolute', 
                                top: '100%', 
                                left: '0', 
                                marginTop: '4px',
                                zIndex: 1050,
                                display: 'block',
                                transform: 'none'
                            }}>
                                <div className="placeholder-search-wrapper">
                                    <div className="position-relative">
                                        <i className="ti ti-search position-absolute top-50 translate-middle-y ms-2 text-muted" style={{ left: '0px', fontSize: '14px' }} />
                                        <input type="text" className="placeholder-search-input" placeholder="Search" value={search || ''} autoFocus onChange={e => setSearch(e.target.value)} />
                                    </div>
                                </div>
                                <div className="placeholder-list-container custom-scrollbar">
                                    <div className="placeholder-column">
                                        <div className="placeholder-header">Contact</div>
                                        {filtered.CONTACT.length > 0 ? filtered.CONTACT.map(p => (
                                            <button key={p.tag} className="placeholder-item" onClick={() => insertTag(p.tag)}>{p.label}</button>
                                        )) : <div className="px-3 py-2 text-muted small">No items found</div>}
                                    </div>
                                    <div className="placeholder-column">
                                        <div className="placeholder-header">Address</div>
                                        {filtered.ADDRESS.length > 0 ? filtered.ADDRESS.map(p => (
                                            <button key={p.tag} className="placeholder-item" onClick={() => insertTag(p.tag)}>{p.label}</button>
                                        )) : <div className="px-3 py-2 text-muted small">No items found</div>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <textarea className="form-control border-0 shadow-none bg-transparent" rows={6} value={value}
                    onChange={e => onChange(e.target.value)} style={{ fontSize: '13px', resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.6 }} />
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
interface CustomField {
    id: number;
    fieldName: string; // Internal identifier (slug)
    displayName: string;
    dataType: string;
    helpText?: string;
    dataPii: boolean;
    preventDuplicates: 'Yes' | 'No';
    inputFormat?: string;
    defaultValue: string;
    mandatory: 'Yes' | 'No';
    showInAllPdfs: 'Yes' | 'No';
    status: 'Active' | 'Inactive';
}

interface GeneralPrefs {
    allowDuplicateNames: boolean;
    enableCustomerNumbers: boolean;
    customerPrefix: string;
    customerNumberStart: string;
    enableVendorNumbers: boolean;
    vendorPrefix: string;
    vendorNumberStart: string;
    defaultCustomerType: 'Business' | 'Individual';
    creditLimitEnabled: boolean;
    creditAction: 'restrict' | 'warning';
    includeSalesOrders: boolean;
    billingAddressFormat: string;
    shippingAddressFormat: string;
}

const CustomerSetting: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'general' | 'field-customization'>('general');
    const [loading, setLoading] = useState(false);
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const closeToast = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), []);
    const showToast = useCallback((type: ToastItem['type'], title: string, message: string) => {
        const id = Date.now();
        setToasts(p => [...p, { id, type, title, message }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000);
    }, []);

    const defaultPrefs: GeneralPrefs = {
        allowDuplicateNames: false,
        enableCustomerNumbers: false,
        customerPrefix: 'CUS-',
        customerNumberStart: '00001',
        enableVendorNumbers: false,
        vendorPrefix: 'VEN-',
        vendorNumberStart: '00001',
        defaultCustomerType: 'Business',
        creditLimitEnabled: false,
        creditAction: 'warning',
        includeSalesOrders: false,
        billingAddressFormat: "${CONTACT.CONTACT_DISPLAYNAME}\n${CONTACT.COMPANY_NAME}\n${ADDRESS.STREET_1}\n${ADDRESS.STREET_2}\n${ADDRESS.CITY}, ${ADDRESS.STATE} ${ADDRESS.ZIP}\n${ADDRESS.COUNTRY}",
        shippingAddressFormat: "${ADDRESS.STREET_1}\n${ADDRESS.STREET_2}\n${ADDRESS.CITY}, ${ADDRESS.STATE} ${ADDRESS.ZIP}\n${ADDRESS.COUNTRY}",
    };

    const [prefs, setPrefs] = useState<GeneralPrefs>(defaultPrefs);
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [searchTextFields, setSearchTextFields] = useState<string>("");

    useEffect(() => {
        const savedPrefs = localStorage.getItem('customer_preferences');
        if (savedPrefs) setPrefs(JSON.parse(savedPrefs));
        const savedFields = localStorage.getItem('customer_custom_fields');
        if (savedFields) setCustomFields(JSON.parse(savedFields));
    }, []);

    const handleSaveGeneral = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            localStorage.setItem('customer_preferences', JSON.stringify(prefs));
            showToast('success', 'Saved', 'General preferences have been updated.');
            setLoading(false);
        }, 600);
    };

    const setP = <K extends keyof GeneralPrefs>(key: K, val: GeneralPrefs[K]) => {
        setPrefs(prev => ({ ...prev, [key]: val }));
    };

    /* ══ CUSTOM FIELD CRUD ══ */
    const [showAddModal, setShowAddModal] = useState(false);
    const [addSaving, setAddSaving] = useState(false);
    const [addErr, setAddErr] = useState<Record<string, string>>({});
    const defaultAddForm: Partial<CustomField> = {
        fieldName: '', displayName: '', dataType: 'Text Box (Single Line)', mandatory: 'No', showInAllPdfs: 'No', dataPii: false, preventDuplicates: 'No', defaultValue: ''
    };
    const [addForm, setAddForm] = useState<Partial<CustomField>>(defaultAddForm);

    const [showEditModal, setShowEditModal] = useState(false);
    const [editSaving, setEditSaving] = useState(false);
    const [editErr, setEditErr] = useState('');
    const [editForm, setEditForm] = useState<CustomField>({} as CustomField);

    const handleSaveAdd = () => {
        if (!addForm.displayName) { setAddErr({ displayName: 'Display Name is required.' }); return; }
        setAddSaving(true);
        setTimeout(() => {
            const newField: CustomField = {
                id: Date.now(),
                fieldName: addForm.displayName!.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
                displayName: addForm.displayName!,
                dataType: addForm.dataType || 'Text Box (Single Line)',
                defaultValue: addForm.defaultValue || '',
                helpText: addForm.helpText,
                dataPii: !!addForm.dataPii,
                preventDuplicates: addForm.preventDuplicates || 'No',
                inputFormat: addForm.inputFormat || 'None',
                mandatory: addForm.mandatory || 'No',
                showInAllPdfs: addForm.showInAllPdfs || 'No',
                status: 'Active'
            };
            const updated = [...customFields, newField];
            setCustomFields(updated);
            localStorage.setItem('customer_custom_fields', JSON.stringify(updated));
            setShowAddModal(false);
            setAddForm(defaultAddForm);
            setAddErr({});
            setAddSaving(false);
            showToast('success', 'Field Added', `"${newField.displayName}" has been added.`);
        }, 600);
    };

    const handleOpenEdit = (f: CustomField) => {
        setEditForm(f);
        setEditErr('');
        setShowEditModal(true);
    };

    const handleSaveEdit = () => {
        if (!editForm.displayName) { setEditErr('Display Name is required.'); return; }
        setEditSaving(true);
        setTimeout(() => {
            const updated = customFields.map(f => (f.id === editForm.id ? { ...editForm, fieldName: editForm.displayName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') } : f));
            setCustomFields(updated);
            localStorage.setItem('customer_custom_fields', JSON.stringify(updated));
            setShowEditModal(false);
            setEditSaving(false);
            showToast('success', 'Field Updated', `Changes to "${editForm.displayName}" saved.`);
        }, 600);
    };

    const handleDeleteField = (id: number) => {
        if (window.confirm('Are you sure you want to delete this custom field?')) {
            const updated = customFields.filter(f => f.id !== id);
            setCustomFields(updated);
            localStorage.setItem('customer_custom_fields', JSON.stringify(updated));
            showToast('danger', 'Deleted', 'Custom field removed.');
        }
    };

    return (
        <>
            <div className="page-wrapper">
                <div className="content">
                    <PageHeader title="Settings" badgeCount={false} showModuleTile={false} showExport={false} />
                    <SettingsTopbar />

                    <div className="row">
                        <div className="col-12">
                            <div className="card border-0 shadow-sm">
                                <div className="card-header bg-white border-bottom pt-3 pb-0 px-3 px-md-4">
                                    <div className="d-flex align-items-center gap-3 pref-tab-bar" style={{ overflowX: 'auto', paddingBottom: '10px' }}>
                                        {(['general', 'field-customization'] as const).map(tab => (
                                            <button key={tab} onClick={() => setActiveTab(tab)}
                                                className={`btn btn-sm fw-bold border-0 p-0 position-relative ${activeTab === tab ? 'text-primary' : 'text-muted'}`}
                                                style={{ fontSize: '14px', color: activeTab === tab ? '#e41f07' : '#6b7280', whiteSpace: 'nowrap', flexShrink: 0, paddingBottom: '4px !important' }}>
                                                {tab === 'general' ? 'General' : 'Field Customization'}
                                                {activeTab === tab && <div className="position-absolute start-0 end-0 bottom-0" style={{ height: '2px', backgroundColor: '#e41f07', marginBottom: '-10px' }} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="card-body px-3 px-md-4 py-2">
                                    {/* ══ TAB 1 — GENERAL ══ */}
                                    {activeTab === 'general' && (
                                        <form onSubmit={handleSaveGeneral} className="py-2" style={{ maxWidth: '820px' }}>

                                            {/* SECTION: Duplicate Name */}
                                            <div className="d-flex align-items-center gap-2 py-3">
                                                <input className="form-check-input mt-0" type="checkbox" id="allowDuplicateNames" checked={prefs.allowDuplicateNames} onChange={e => setP('allowDuplicateNames', e.target.checked)} />
                                                <label className="form-check-label text-dark" htmlFor="allowDuplicateNames" style={{ fontSize: '14px' }}>Allow duplicates for customer and vendor display name.</label>
                                                <InfoTooltip text="Checking this will allow multiple contacts to have the same display name." />
                                            </div>

                                            <hr className="my-2 border-light" />

                                            {/* SECTION: Numbering */}
                                            <Section title="Customer & Vendor Numbers" description="Generate customer and vendor numbers automatically. You can configure the series in which numbers are generated while creating new records." infoText="Setup automated numbering for your contacts." />

                                            <div className="pref-note mb-4 shadow-sm">
                                                <div className="pref-note-title">
                                                    <i className="ti ti-info-circle text-warning f-14" /> Note:
                                                </div>
                                                <ul className="pref-note-content">
                                                    <li>Generating these numbers may take a few minutes to a few hours, depending on the number of records that you have. The Customer Number field will be available once this process is done.</li>
                                                    <li>Once you've enabled this feature, you cannot disable it.</li>
                                                </ul>
                                            </div>

                                            {/* Customer Numbering */}
                                            <div className="mb-4">
                                                <div className="d-flex align-items-center gap-2">
                                                    <input className="form-check-input mt-0" type="checkbox" id="enableCustomerNumbers" checked={prefs.enableCustomerNumbers} onChange={e => setP('enableCustomerNumbers', e.target.checked)} />
                                                    <label className="form-check-label text-dark fw-bold" htmlFor="enableCustomerNumbers" style={{ fontSize: '14px' }}>Enable Customer Numbers</label>
                                                </div>
                                                {prefs.enableCustomerNumbers && (
                                                    <div className="pref-sub-section">
                                                        <div className="pref-config-box">
                                                            <div className="row g-3">
                                                                <div className="col-md-6">
                                                                    <label className="form-label text-muted fw-bold" style={{ fontSize: '14px' }}>Prefix</label>
                                                                    <input type="text" className="form-control form-control-sm" value={prefs.customerPrefix || ''} onChange={e => setP('customerPrefix', e.target.value)} />
                                                                </div>
                                                                <div className="col-md-6">
                                                                    <label className="form-label text-muted fw-bold" style={{ fontSize: '14px' }}>Unique No. Starts</label>
                                                                    <input type="text" className="form-control form-control-sm" value={prefs.customerNumberStart || ''} onChange={e => setP('customerNumberStart', e.target.value)} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Vendor Numbering */}
                                            <div className="mb-4">
                                                <div className="d-flex align-items-center gap-2">
                                                    <input className="form-check-input mt-0" type="checkbox" id="enableVendorNumbers" checked={prefs.enableVendorNumbers || false} onChange={e => setP('enableVendorNumbers', e.target.checked)} />
                                                    <label className="form-check-label text-dark fw-bold" htmlFor="enableVendorNumbers" style={{ fontSize: '14px' }}>Enable Vendor Numbers</label>
                                                </div>
                                            </div>

                                            <hr className="my-4 border-light" />

                                            {/* SECTION: Default Customer Type */}
                                            <Section title="Default Customer Type" description="Select the default customer type pre-selected in the creation form." infoText="Choose the most common type for your business." />
                                            <div className="d-flex align-items-center gap-4 py-2">
                                                <div className="d-flex align-items-center gap-2">
                                                    <input type="radio" className="form-radio-input" id="typeBusiness" name="defaultType" checked={prefs.defaultCustomerType === 'Business'} onChange={() => setP('defaultCustomerType', 'Business')} />
                                                    <label htmlFor="typeBusiness" className="mb-0" style={{ fontSize: '14px', cursor: 'pointer' }}>Business</label>
                                                </div>
                                                <div className="d-flex align-items-center gap-2">
                                                    <input type="radio" className="form-radio-input" id="typeIndividual" name="defaultType" checked={prefs.defaultCustomerType === 'Individual'} onChange={() => setP('defaultCustomerType', 'Individual')} />
                                                    <label htmlFor="typeIndividual" className="mb-0" style={{ fontSize: '14px', cursor: 'pointer' }}>Individual</label>
                                                </div>
                                            </div>

                                            <hr className="my-4 border-light" />

                                            {/* SECTION: Credit Limit */}
                                            <div className="py-2">
                                                <div className="d-flex align-items-center justify-content-between mb-2">
                                                    <div>
                                                        <h6 className="mb-1" style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>Customer Credit Limit <InfoTooltip text="Set limits on outstanding receivables." /></h6>
                                                        <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Manage outstanding receivable limits for customers.</p>
                                                    </div>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="text-muted fw-bold" style={{ fontSize: '14px' }}>{prefs.creditLimitEnabled ? 'Enabled' : 'Disabled'}</span>
                                                        <input type="checkbox" className="pref-toggle" checked={prefs.creditLimitEnabled} onChange={e => setP('creditLimitEnabled', e.target.checked)} />
                                                    </div>
                                                </div>

                                                {prefs.creditLimitEnabled && (
                                                    <div className="pref-sub-section py-2 mt-3">
                                                        <label className="text-dark fw-bold mb-3 d-block" style={{ fontSize: '14px' }}>Behavior on limit exceed:</label>
                                                        <div className="d-flex flex-column gap-3 mb-4">
                                                            <div className="d-flex align-items-center gap-2">
                                                                <input type="radio" className="form-radio-input" name="creditAction" id="creditRestrict" checked={prefs.creditAction === 'restrict'} onChange={() => setP('creditAction', 'restrict')} />
                                                                <label htmlFor="creditRestrict" className="mb-0" style={{ fontSize: '14px', cursor: 'pointer' }}>Restrict creating or updating invoices</label>
                                                            </div>
                                                            <div className="d-flex align-items-center gap-2">
                                                                <input type="radio" className="form-radio-input" name="creditAction" id="creditWarning" checked={prefs.creditAction === 'warning'} onChange={() => setP('creditAction', 'warning')} />
                                                                <label htmlFor="creditWarning" className="mb-0" style={{ fontSize: '14px', cursor: 'pointer' }}>Show a warning and allow users to proceed</label>
                                                            </div>
                                                        </div>

                                                        <div className="mb-3">
                                                            <div className="d-flex align-items-baseline gap-2">
                                                                <input className="form-check-input mt-1" type="checkbox" id="includeSalesOrders" checked={prefs.includeSalesOrders} onChange={e => setP('includeSalesOrders', e.target.checked)} />
                                                                <div>
                                                                    <label className="form-check-label text-dark" htmlFor="includeSalesOrders" style={{ fontSize: '14px' }}>Include sales orders' amount in limiting the credit given to customers</label>
                                                                    {prefs.includeSalesOrders && (
                                                                        <p className="text-muted mb-0 mt-1" style={{ fontSize: '14px', lineHeight: '1.5' }}>
                                                                            Credit Limit will not affect the creation of sales orders from marketplace, Zoho POS Registers and Zoho Commerce.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 pt-2">
                                                            <span className="text-dark fw-bold d-block mb-1" style={{ fontSize: '14px' }}>Note:</span>
                                                            <ul className="ps-3 mb-0" style={{ listStyleType: 'disc' }}>
                                                                <li className="text-muted" style={{ fontSize: '14px' }}>Go to the respective customer's contact details to set the credit limit.</li>
                                                            </ul>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <hr className="my-4 border-light" />

                                            {/* SECTION: Address Formats */}
                                            <AddressFormatBox label="Customer and Vendor Billing Address Format" value={prefs.billingAddressFormat} onChange={v => setP('billingAddressFormat', v)} infoText="Modify how billing addresses appear in PDFs." />
                                            <AddressFormatBox label="Customer and Vendor Shipping Address Format" value={prefs.shippingAddressFormat} onChange={v => setP('shippingAddressFormat', v)} infoText="Modify how shipping addresses appear in PDFs." />

                                            <div className="mt-5 pt-3 border-top">
                                                <button type="submit" className="btn btn-primary px-4 fw-bold shadow-none" disabled={loading} style={{ borderRadius: '4px' }}>
                                                    {loading ? 'Saving...' : 'Save'}
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    {/* ══ TAB 2 — FIELD CUSTOMIZATION ══ */}
                                    {activeTab === 'field-customization' && (
                                        <div className="py-2">
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <h5 className="fw-bold mb-0" style={{ fontSize: '14px' }}>Custom Fields</h5>
                                                <button type="button" className="btn btn-primary btn-sm px-3 fw-bold shadow-none" onClick={() => setShowAddModal(true)}>
                                                    <i className="ti ti-plus me-1" />Add New Field
                                                </button>
                                            </div>
                                            {customFields.length === 0 ? (
                                                <div className="text-center py-5 border rounded bg-light" style={{ color: '#8c8c8c', fontSize: '14px' }}>
                                                    <i className="ti ti-database-off" style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }} />
                                                    No custom fields yet.
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="mb-3" style={{ maxWidth: 280 }}>
                                                        <SearchInput value={searchTextFields} onChange={setSearchTextFields} />
                                                    </div>
                                                    <div className="table-responsive border rounded">
                                                        <table className="table table-hover mb-0">
                                                            <thead className="table-light">
                                                                <tr style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                                                    <th className="px-3 py-2">Name</th>
                                                                    <th className="py-2">Type</th>
                                                                    <th className="py-2">Default Value</th>
                                                                    <th className="py-2">Mandatory</th>
                                                                    <th className="py-2">Status</th>
                                                                    <th className="py-2">Action</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {customFields.filter(f => f.displayName.toLowerCase().includes(searchTextFields.toLowerCase())).map(f => (
                                                                    <tr key={f.id} style={{ fontSize: '14px' }}>
                                                                        <td className="px-3 py-3 text-dark">{f.displayName}</td>
                                                                        <td className="py-3 text-muted">{f.dataType}</td>
                                                                        <td className="py-3 text-muted">{f.defaultValue || '—'}</td>
                                                                        <td className="py-3">
                                                                            <div className="form-check form-switch mb-0">
                                                                                <input
                                                                                    className="form-check-input"
                                                                                    type="checkbox"
                                                                                    checked={f.mandatory === 'Yes'}
                                                                                    readOnly
                                                                                    style={{ width: 36, height: 20, cursor: 'default' }}
                                                                                />
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-3">
                                                                            <span className={`badge px-2 py-1 ${f.status === 'Active' ? 'text-success border border-success' : 'text-secondary border border-secondary'}`} style={{ fontSize: '12px', background: 'transparent', borderRadius: 6 }}>
                                                                                {f.status}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-3">
                                                                            <div className="dropup">
                                                                                <button className="btn btn-sm border px-2 bg-white text-dark" data-bs-toggle="dropdown" style={{ lineHeight: 1 }}>
                                                                                    <i className="ti ti-dots-vertical fs-14" />
                                                                                </button>
                                                                                <div className="dropdown-menu dropdown-menu-end shadow border-0 py-1">
                                                                                    <button className="dropdown-item fs-14 py-2" onClick={() => handleOpenEdit(f)}>
                                                                                        <i className="ti ti-edit me-2" />Edit
                                                                                    </button>
                                                                                    <button className="dropdown-item fs-14 py-2 text-danger" onClick={() => handleDeleteField(f.id)}>
                                                                                        <i className="ti ti-trash me-2" />Delete
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <Footer />
            </div>

            {/* ══ MODAL — ADD NEW CUSTOM FIELD ══ */}
            <div className={`modal fade ${showAddModal ? 'show d-block' : ''}`} role="dialog" style={{ backgroundColor: showAddModal ? 'rgba(0,0,0,0.5)' : 'transparent', zIndex: 1060 }}>
                <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                    <div className="modal-content shadow-lg border-0" style={{ borderRadius: '12px' }}>
                        <div className="modal-header py-3 border-bottom-0">
                            <h5 className="modal-title fw-bold" style={{ fontSize: 16 }}>Add New Field</h5>
                            <button type="button" className="btn-close custom-btn-close border p-1 me-0 d-flex align-items-center justify-content-center rounded-circle"
                                onClick={() => { if (!addSaving) { setShowAddModal(false); setAddForm(defaultAddForm); setAddErr({}); } }}>
                                <i className="ti ti-x" />
                            </button>
                        </div>
                        <div className="modal-body py-0 custom-scrollbar" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            <div className="px-1">
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1" style={{ fontSize: '13px' }}>Display Name <span className="text-danger">*</span></label>
                                    <input type="text" className={`form-control form-control-sm ${addErr.displayName ? 'is-invalid' : ''}`} value={addForm.displayName || ''}
                                        onChange={e => {
                                            const val = e.target.value;
                                            const slug = val.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                                            setAddForm(p => ({ ...p, displayName: val, fieldName: slug }));
                                            setAddErr(p => ({ ...p, displayName: '' }));
                                        }} placeholder="e.g. VAT Number" autoFocus />
                                    {addErr.displayName && <FieldError msg={addErr.displayName} />}
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-muted mb-1" style={{ fontSize: '12px' }}>Label Name</label>
                                    <input type="text" className="form-control form-control-sm bg-light" value={addForm.fieldName || ''} readOnly style={{ pointerEvents: 'none' }} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1" style={{ fontSize: '13px' }}>Data Type <span className="text-danger">*</span></label>
                                    <CommonSelect options={Input_Type} className="select"
                                        defaultValue={Input_Type.find(it => it.value === addForm.dataType) || Input_Type[0]}
                                        onChange={(val) => { setAddErr(p => ({ ...p, dataType: '' })); setAddForm(p => ({ ...p, dataType: val, defaultValue: getDefaultValueForType(val) })); }} />
                                    {addErr.dataType && <FieldError msg={addErr.dataType} />}
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1" style={{ fontSize: '13px' }}>Help Text</label>
                                    <input type="text" className="form-control form-control-sm" value={addForm.helpText || ''} placeholder="Help users understand this field."
                                        onChange={e => setAddForm(p => ({ ...p, helpText: e.target.value }))} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1" style={{ fontSize: '13px' }}>Data Privacy</label>
                                    <div className="d-flex align-items-center gap-2">
                                        <input type="checkbox" id="add-pii" className="form-check-input me-1 mt-0" checked={addForm.dataPii || false}
                                            onChange={() => setAddForm(p => ({ ...p, dataPii: !p.dataPii }))} style={{ width: '16px', height: '16px', cursor: 'pointer', float: 'none' }} />
                                        <label htmlFor="add-pii" style={{ cursor: 'pointer', fontSize: 13, marginBottom: 0 }}>PII (Personal Identifiable Information)</label>
                                    </div>
                                    {addForm.dataPii && <WarnBanner>Data will be stored without encryption.</WarnBanner>}
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1 d-block" style={{ fontSize: '13px' }}>Prevent Duplicate Values</label>
                                    <div className="d-flex align-items-center gap-4">
                                        {(['Yes', 'No'] as const).map(v => (
                                            <div key={v} className="d-flex align-items-center gap-2">
                                                <input type="radio" id={`add-dup-${v}`} name="add_dup" checked={addForm.preventDuplicates === v}
                                                    onChange={() => setAddForm(p => ({ ...p, preventDuplicates: v }))}
                                                    style={{ accentColor: '#e41f07', width: '15px', height: '15px', cursor: 'pointer', float: 'none' }} />
                                                <label htmlFor={`add-dup-${v}`} style={{ cursor: 'pointer', marginBottom: 0, fontSize: 13 }}>{v}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1" style={{ fontSize: '13px' }}>Input Format</label>
                                    <InputFormatSelect value={addForm.inputFormat || 'None'} onChange={v => setAddForm(p => ({ ...p, inputFormat: v }))} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1" style={{ fontSize: '13px' }}>Default Value</label>
                                    <DefaultValueInput dataType={addForm.dataType || 'Text Box (Single Line)'} value={addForm.defaultValue || ''}
                                        onChange={v => setAddForm(p => ({ ...p, defaultValue: v }))} idPrefix="add" hasError={!!addErr.defaultValue} />
                                    {addErr.defaultValue && <FieldError msg={addErr.defaultValue} />}
                                </div>
                                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                                    <label className="form-label mb-0 text-dark fw-bold" style={{ fontSize: '13px' }}>Mandatory</label>
                                    <div className="form-check form-switch mb-0">
                                        <input className="form-check-input switchCheckDefault" type="checkbox" role="switch"
                                            checked={addForm.mandatory === 'Yes'} onChange={e => setAddForm(p => ({ ...p, mandatory: e.target.checked ? 'Yes' : 'No' }))} />
                                    </div>
                                </div>
                                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                                    <label className="form-label mb-0 text-dark fw-bold" style={{ fontSize: '13px' }}>Show in all PDFs</label>
                                    <div className="form-check form-switch mb-0">
                                        <input className="form-check-input switchCheckDefault" type="checkbox" role="switch"
                                            checked={addForm.showInAllPdfs === 'Yes'} onChange={e => setAddForm(p => ({ ...p, showInAllPdfs: e.target.checked ? 'Yes' : 'No' }))} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer py-3 border-top-0">
                            <button type="button" className="btn btn-sm btn-light px-3"
                                onClick={() => { setShowAddModal(false); setAddForm(defaultAddForm); setAddErr({}); }}>Cancel</button>
                            <button type="button" className="btn btn-sm btn-primary px-3 shadow-none" onClick={handleSaveAdd} disabled={addSaving}>
                                {addSaving ? 'Saving...' : 'Save Field'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══ MODAL — EDIT CUSTOM FIELD ══ */}
            <div className={`modal fade ${showEditModal ? 'show d-block' : ''}`} role="dialog" style={{ backgroundColor: showEditModal ? 'rgba(0,0,0,0.5)' : 'transparent', zIndex: 1060 }}>
                <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                    <div className="modal-content shadow-lg border-0" style={{ borderRadius: '12px' }}>
                        <div className="modal-header py-3 border-bottom-0">
                            <h5 className="modal-title fw-bold" style={{ fontSize: 16 }}>Edit Custom Field</h5>
                            <button type="button" className="btn-close custom-btn-close border p-1 me-0 d-flex align-items-center justify-content-center rounded-circle" onClick={() => setShowEditModal(false)}>
                                <i className="ti ti-x" />
                            </button>
                        </div>
                        <div className="modal-body py-0 custom-scrollbar" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            <div className="px-1">
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1" style={{ fontSize: '13px' }}>Display Name <span className="text-danger">*</span></label>
                                    <input type="text" className={`form-control form-control-sm ${editErr ? 'is-invalid' : ''}`} value={editForm.displayName || ''}
                                        onChange={e => { 
                                            const val = e.target.value; 
                                            const slug = val.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''); 
                                            setEditForm(p => ({ ...p, displayName: val, fieldName: slug })); 
                                            setEditErr(''); 
                                        }} />
                                    {editErr && <FieldError msg={editErr} />}
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-muted mb-1" style={{ fontSize: '12px' }}>Label Name</label>
                                    <input type="text" className="form-control form-control-sm bg-light" value={editForm.fieldName || ''} readOnly style={{ pointerEvents: 'none' }} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-muted mb-1" style={{ fontSize: '12px' }}>Data Type</label>
                                    <input type="text" className="form-control form-control-sm bg-light" value={editForm.dataType || ''} readOnly style={{ pointerEvents: 'none' }} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1" style={{ fontSize: '13px' }}>Help Text</label>
                                    <input type="text" className="form-control form-control-sm" value={editForm.helpText || ''} placeholder="Help users understand this field."
                                        onChange={e => setEditForm(p => ({ ...p, helpText: e.target.value }))} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1" style={{ fontSize: '13px' }}>Data Privacy</label>
                                    <div className="d-flex align-items-center gap-2">
                                        <input type="checkbox" id="edit-pii" className="form-check-input me-1 mt-0" checked={editForm.dataPii || false}
                                            onChange={() => setEditForm(p => ({ ...p, dataPii: !p.dataPii }))} style={{ width: '16px', height: '16px', cursor: 'pointer', float: 'none' }} />
                                        <label htmlFor="edit-pii" style={{ cursor: 'pointer', fontSize: 13, marginBottom: 0 }}>PII</label>
                                    </div>
                                    {editForm.dataPii && <WarnBanner>Data will be stored without encryption.</WarnBanner>}
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1 d-block" style={{ fontSize: '13px' }}>Prevent Duplicate Values</label>
                                    <div className="d-flex align-items-center gap-4">
                                        {(['Yes', 'No'] as const).map(v => (
                                            <div key={v} className="d-flex align-items-center gap-2">
                                                <input type="radio" id={`edit-dup-${v}`} name="edit_dup" checked={editForm.preventDuplicates === v}
                                                    onChange={() => setEditForm(p => ({ ...p, preventDuplicates: v }))}
                                                    style={{ accentColor: '#e41f07', width: '15px', height: '15px', cursor: 'pointer', float: 'none' }} />
                                                <label htmlFor={`edit-dup-${v}`} style={{ cursor: 'pointer', marginBottom: 0, fontSize: 13 }}>{v}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1" style={{ fontSize: '13px' }}>Input Format <span className="text-danger">*</span></label>
                                    <InputFormatSelect value={editForm.inputFormat || 'None'} onChange={v => setEditForm(p => ({ ...p, inputFormat: v }))} required />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1" style={{ fontSize: '13px' }}>Default Value</label>
                                    <DefaultValueInput dataType={editForm.dataType || 'Text Box (Single Line)'} value={editForm.defaultValue || ''}
                                        onChange={v => setEditForm(p => ({ ...p, defaultValue: v }))} idPrefix="edit" />
                                </div>
                                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                                    <label className="form-label mb-0 text-dark fw-bold" style={{ fontSize: '13px' }}>Mandatory</label>
                                    <div className="form-check form-switch mb-0">
                                        <input className="form-check-input switchCheckDefault" type="checkbox" role="switch"
                                            checked={editForm.mandatory === 'Yes'} onChange={e => setEditForm(p => ({ ...p, mandatory: e.target.checked ? 'Yes' : 'No' }))} />
                                    </div>
                                </div>
                                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                                    <label className="form-label mb-0 text-dark fw-bold" style={{ fontSize: '13px' }}>Show in all PDFs</label>
                                    <div className="form-check form-switch mb-0">
                                        <input className="form-check-input switchCheckDefault" type="checkbox" role="switch"
                                            checked={editForm.showInAllPdfs === 'Yes'} onChange={e => setEditForm(p => ({ ...p, showInAllPdfs: e.target.checked ? 'Yes' : 'No' }))} />
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1 d-block" style={{ fontSize: '13px' }}>Status</label>
                                    <div className="d-flex align-items-center gap-4">
                                        {(['Active', 'Inactive'] as const).map(v => (
                                            <div key={v} className="d-flex align-items-center gap-2">
                                                <input type="radio" id={`edit-st-${v}`} name="edit_status" checked={editForm.status === v}
                                                    onChange={() => setEditForm(p => ({ ...p, status: v }))}
                                                    style={{ accentColor: '#e41f07', width: '15px', height: '15px', cursor: 'pointer', float: 'none' }} />
                                                <label htmlFor={`edit-st-${v}`} style={{ cursor: 'pointer', marginBottom: 0, fontSize: 13 }}>{v}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer py-3 border-top-0">
                            <button type="button" className="btn btn-sm btn-light px-3" onClick={() => setShowEditModal(false)}>Cancel</button>
                            <button type="button" className="btn btn-sm btn-primary px-3 shadow-none" onClick={handleSaveEdit} disabled={editSaving}>
                                {editSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ToastContainer toasts={toasts} onClose={closeToast} />
        </>
    );
};

export default CustomerSetting;
