import React, { useState, useCallback, useEffect } from 'react';
import "../billing-application.scss";
import PageHeader from "../../../../components/page-header/pageHeader";
import SettingsTopbar from "../../settings/settings-topbar/settingsTopbar";
import CommonSelect from "../../../../components/common-select/commonSelect";
import SearchInput from "../../../../components/dataTable/dataTableSearch";
import { Input_Type } from "../../../../core/json/selectOption";

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
    danger:  { alertClass: 'alert-danger',  icon: 'ti ti-trash-x' },
    warning: { alertClass: 'alert-warning', icon: 'ti ti-alert-triangle' },
    info:    { alertClass: 'alert-info',     icon: 'ti ti-info-circle' },
};

const ToastContainer: React.FC<{ toasts: ToastItem[]; onClose: (id: number) => void }> = ({ toasts, onClose }) => (
    <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 280, maxWidth: 'calc(100vw - 32px)' }}>
        {toasts.map(t => {
            const c = toastColors[t.type];
            return (
                <div key={t.id} className={`alert ${c.alertClass} alert-dismissible d-flex align-items-start mb-0`} role="alert" style={{ animation: 'slideIn 0.3s ease', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 14 }}>
                    <i className={`${c.icon} f-16 me-2 mt-1`} />
                    <div className="flex-grow-1"><strong>{t.title} - </strong>{t.message}</div>
                    <button type="button" className="btn-close ms-2 mt-1" onClick={() => onClose(t.id)} aria-label="Close" style={{ position: 'static' }} />
                </div>
            );
        })}
    </div>
);

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */
const FieldError: React.FC<{ msg: string }> = ({ msg }) => (
    <span className="text-danger mt-1 d-block" style={{ fontSize: 14 }}>{msg}</span>
);

const WarnBanner: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="alert alert-warning py-2 px-3 mt-2 mb-0 d-flex align-items-center gap-2 border-0" style={{ fontSize: 14, backgroundColor: '#fff9e6', color: '#856404', borderRadius: 6 }}>
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
                <label className="form-check-label ps-1" htmlFor={`${idPrefix}-def-chk`} style={{ fontSize: 14 }}>Default Enabled</label>
            </div>
        );
    }
    return <input type="text" className={`form-control form-control-sm ${hasError ? 'is-invalid' : ''}`} value={value} onChange={e => onChange(e.target.value)} />;
};

const getDefaultValueForType = (type: string) => {
    if (type === 'CheckBox') return 'No';
    if (type === 'Date') return new Date().toISOString().split('T')[0];
    return '';
};

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */
interface CustomerCategory {
    id: number;
    name: string;
    code: string;
    status: 'Enabled' | 'Disabled';
}

interface InvoicePrefs {
    allowEditSentInvoice: boolean;
    associateExpenseReceipts: boolean;
    invoiceOrderNumber: 'sales-order' | 'sales-order-ref';
    notifyOnlinePayment: boolean;
    includePaymentReceipt: boolean;
    automateThankYouNote: boolean;
    advancePaymentEnabled: boolean;
    advancePaymentCategories: number[];
    qrCodeEnabled: boolean;
    qrCodeType: string;
    qrCodeDescription: string;
    hideZeroValueItems: boolean;
    termsAndConditions: string;
    customerNotes: string;
}

const DEFAULT_CATEGORIES: CustomerCategory[] = [
    { id: 1, name: 'Super_stockist',    code: 'SS001',  status: 'Enabled' },
    { id: 2, name: 'mvbfy',             code: 'MV0001', status: 'Enabled' },
    { id: 3, name: 'cfvgbhj',           code: 'CF0001', status: 'Enabled' },
    { id: 4, name: 'New SS',            code: 'SS01',   status: 'Enabled' },
    { id: 5, name: 'drtr',              code: 'DR001',  status: 'Enabled' },
    { id: 6, name: 'New S',             code: 'S001',   status: 'Enabled' },
    { id: 7, name: 'Super_distributor', code: 'SD001',  status: 'Enabled' },
];

interface CustomField {
    id: number;
    fieldName: string;
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

const QR_CODE_TYPES = [
    {
        value: 'upi-id',
        label: 'UPI ID',
        description: 'Your UPI ID will be displayed as a QR code on invoices.',
    },
    {
        value: 'invoice-url',
        label: 'Invoice URL',
        description: 'When scanned, invoice URL will be displayed to the customer. Recommended if you provide online payment options.',
    },
    {
        value: 'custom',
        label: 'Custom',
        description: 'When scanned, the custom URL you configure or the information you enter will be displayed.',
    },
];

/* Custom dropdown that shows label + description per option */
const QrCodeTypeSelect: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selected = QR_CODE_TYPES.find(o => o.value === value) || QR_CODE_TYPES[0];
    const filtered = QR_CODE_TYPES.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        o.description.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div ref={ref} style={{ position: 'relative', width: '100%' }}>
            {/* Trigger */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', fontSize: 14, fontWeight: 500, color: '#212529',
                    background: '#fff', border: '1px solid #ced4da', borderRadius: 6,
                    cursor: 'pointer', outline: 'none',
                }}
            >
                <span>{selected.label}</span>
                <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 16, color: '#6c757d' }} />
            </button>

            {/* Dropdown panel */}
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                    background: '#fff', border: '1px solid #ced4da', borderRadius: 6,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 1050,
                }}>
                    {/* Search */}
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid #f0f0f0' }}>
                        <div style={{ position: 'relative' }}>
                            <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#adb5bd', fontSize: 14 }} />
                            <input
                                type="text"
                                autoFocus
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search"
                                style={{
                                    width: '100%', padding: '6px 8px 6px 30px', fontSize: 14,
                                    border: '1px solid #e0e0e0', borderRadius: 4, outline: 'none',
                                }}
                            />
                        </div>
                    </div>

                    {/* Options */}
                    <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                        {filtered.map(opt => {
                            const isSelected = opt.value === value;
                            return (
                                <div
                                    key={opt.value}
                                    onClick={() => { onChange(opt.value); setOpen(false); setSearch(''); }}
                                    style={{
                                        padding: '12px 14px',
                                        cursor: 'pointer',
                                        background: isSelected ? '#FFF0EE' : '#fff',
                                        borderBottom: '1px solid #f5f5f5',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        justifyContent: 'space-between',
                                        gap: 8,
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '#f8f9fa'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isSelected ? '#FFF0EE' : '#fff'; }}
                                >
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: '#212529', marginBottom: 3 }}>{opt.label}</div>
                                        <div style={{ fontSize: 14, color: '#6c757d', lineHeight: 1.4 }}>{opt.description}</div>
                                    </div>
                                    {isSelected && (
                                        <i className="ti ti-check" style={{ color: '#e41f07', fontSize: 16, flexShrink: 0, marginTop: 2 }} />
                                    )}
                                </div>
                            );
                        })}
                        {filtered.length === 0 && (
                            <div style={{ padding: '16px', textAlign: 'center', color: '#adb5bd', fontSize: 14 }}>No results found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
const InvoiceSetting: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'preferences' | 'field-customization'>('preferences');
    const [loading, setLoading] = useState(false);

    /* Load categories from localStorage (same source as CustomerCategory page) */
    const [allCategories] = useState<CustomerCategory[]>(() => {
        const saved: CustomerCategory[] = JSON.parse(localStorage.getItem('categories') || '[]');
        const savedIds = new Set(saved.map(c => c.id));
        return [...DEFAULT_CATEGORIES.filter(c => !savedIds.has(c.id)), ...saved].filter(c => c.status === 'Enabled');
    });
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const closeToast = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), []);
    const showToast = useCallback((type: ToastItem['type'], title: string, message: string) => {
        const id = Date.now();
        setToasts(p => [...p, { id, type, title, message }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000);
    }, []);

    const defaultPrefs: InvoicePrefs = {
        allowEditSentInvoice: true,
        associateExpenseReceipts: false,
        invoiceOrderNumber: 'sales-order',
        notifyOnlinePayment: true,
        includePaymentReceipt: true,
        automateThankYouNote: false,
        advancePaymentEnabled: false,
        advancePaymentCategories: [],
        qrCodeEnabled: true,
        qrCodeType: 'invoice-url',
        qrCodeDescription: 'Scan the QR code to view the configured information.',
        hideZeroValueItems: false,
        termsAndConditions: '',
        customerNotes: 'Thanks for your business.',
    };

    const [prefs, setPrefs] = useState<InvoicePrefs>(() => {
        const saved = localStorage.getItem('invoice_preferences');
        return saved ? { ...defaultPrefs, ...JSON.parse(saved) } : defaultPrefs;
    });

    const setP = <K extends keyof InvoicePrefs>(key: K, val: InvoicePrefs[K]) =>
        setPrefs(prev => ({ ...prev, [key]: val }));

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            localStorage.setItem('invoice_preferences', JSON.stringify(prefs));
            showToast('success', 'Saved', 'Invoice preferences have been updated.');
            setLoading(false);
        }, 600);
    };

    /* ── Custom Fields state ── */
    const [customFields, setCustomFields] = useState<CustomField[]>(() => {
        const saved = localStorage.getItem('invoice_custom_fields');
        return saved ? JSON.parse(saved) : [];
    });
    const [searchText, setSearchText] = useState('');

    const defaultAddForm: Partial<CustomField> = {
        fieldName: '', displayName: '', dataType: 'Text Box (Single Line)',
        mandatory: 'No', showInAllPdfs: 'No', dataPii: false,
        preventDuplicates: 'No', defaultValue: '',
    };
    const [showAddModal, setShowAddModal] = useState(false);
    const [addSaving, setAddSaving] = useState(false);
    const [addErr, setAddErr] = useState<Record<string, string>>({});
    const [addForm, setAddForm] = useState<Partial<CustomField>>(defaultAddForm);

    const [showEditModal, setShowEditModal] = useState(false);
    const [editSaving, setEditSaving] = useState(false);
    const [editErr, setEditErr] = useState('');
    const [editForm, setEditForm] = useState<CustomField>({} as CustomField);

    const saveFields = (fields: CustomField[]) => {
        setCustomFields(fields);
        localStorage.setItem('invoice_custom_fields', JSON.stringify(fields));
    };

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
                status: 'Active',
            };
            saveFields([...customFields, newField]);
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
            const updated = customFields.map(f =>
                f.id === editForm.id
                    ? { ...editForm, fieldName: editForm.displayName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') }
                    : f
            );
            saveFields(updated);
            setShowEditModal(false);
            setEditSaving(false);
            showToast('success', 'Field Updated', `Changes to "${editForm.displayName}" saved.`);
        }, 600);
    };

    const handleDeleteField = (id: number) => {
        if (window.confirm('Are you sure you want to delete this custom field?')) {
            saveFields(customFields.filter(f => f.id !== id));
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
                                {/* Tab Header */}
                                <div className="card-header bg-white pt-4 pb-0 px-4 border-0">
                                    <div className="tab-bar-custom m-0">
                                        {(['preferences', 'field-customization'] as const).map(tab => (
                                            <div
                                                key={tab}
                                                className={`tab-item-custom ${activeTab === tab ? 'active' : ''}`}
                                                onClick={() => setActiveTab(tab)}
                                            >
                                                {tab === 'preferences' ? 'Preferences' : 'Field Customization'}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="card-body px-4 py-4">

                                    {/* ════════════════════════════════
                                        TAB 1 — PREFERENCES
                                    ════════════════════════════════ */}
                                    {activeTab === 'preferences' && (
                                        <form onSubmit={handleSave} style={{ maxWidth: 820 }}>

                                            {/* General checkboxes */}
                                            <div className="py-2">
                                                <div className="d-flex align-items-center gap-2 mb-3">
                                                    <input
                                                        className="form-check-input mt-0"
                                                        type="checkbox"
                                                        id="allowEditSentInvoice"
                                                        checked={prefs.allowEditSentInvoice}
                                                        onChange={e => setP('allowEditSentInvoice', e.target.checked)}
                                                    />
                                                    <label className="form-check-label text-dark" htmlFor="allowEditSentInvoice" style={{ fontSize: 14 }}>
                                                        Allow editing of Sent Invoice?
                                                    </label>
                                                </div>
                                                <div className="d-flex align-items-center gap-2 mb-3">
                                                    <input
                                                        className="form-check-input mt-0"
                                                        type="checkbox"
                                                        id="associateExpenseReceipts"
                                                        checked={prefs.associateExpenseReceipts}
                                                        onChange={e => setP('associateExpenseReceipts', e.target.checked)}
                                                    />
                                                    <label className="form-check-label text-dark" htmlFor="associateExpenseReceipts" style={{ fontSize: 14 }}>
                                                        Associate and display expense receipts in Invoice PDF
                                                    </label>
                                                </div>
                                            </div>

                                            <hr className="my-3 border-light" />

                                            {/* Invoice Order Number */}
                                            <div className="py-2">
                                                <h6 className="fw-bold mb-3" style={{ fontSize: 14, color: '#1a1a2e' }}>Invoice Order Number</h6>
                                                <div className="d-flex align-items-center gap-2 mb-3">
                                                    <input
                                                        type="radio"
                                                        className="form-radio-input"
                                                        id="orderSalesNumber"
                                                        name="invoiceOrderNumber"
                                                        checked={prefs.invoiceOrderNumber === 'sales-order'}
                                                        onChange={() => setP('invoiceOrderNumber', 'sales-order')}
                                                    />
                                                    <label htmlFor="orderSalesNumber" className="form-check-label text-dark" style={{ fontSize: 14, cursor: 'pointer' }}>
                                                        Use Sales Order Number
                                                    </label>
                                                </div>
                                                <div className="d-flex align-items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        className="form-radio-input"
                                                        id="orderSalesRefNumber"
                                                        name="invoiceOrderNumber"
                                                        checked={prefs.invoiceOrderNumber === 'sales-order-ref'}
                                                        onChange={() => setP('invoiceOrderNumber', 'sales-order-ref')}
                                                    />
                                                    <label htmlFor="orderSalesRefNumber" className="form-check-label text-dark" style={{ fontSize: 14, cursor: 'pointer' }}>
                                                        Use Sales Order Reference Number
                                                    </label>
                                                </div>
                                            </div>

                                            <hr className="my-3 border-light" />

                                            {/* Payments */}
                                            <div className="py-2">
                                                <h6 className="fw-bold mb-3" style={{ fontSize: 14, color: '#1a1a2e' }}>Payments</h6>
                                                <div className="d-flex align-items-center gap-2 mb-3">
                                                    <input
                                                        className="form-check-input mt-0"
                                                        type="checkbox"
                                                        id="notifyOnlinePayment"
                                                        checked={prefs.notifyOnlinePayment}
                                                        onChange={e => setP('notifyOnlinePayment', e.target.checked)}
                                                    />
                                                    <label className="form-check-label text-dark" htmlFor="notifyOnlinePayment" style={{ fontSize: 14 }}>
                                                        Get notified when customers pay online
                                                    </label>
                                                </div>
                                                <div className="d-flex align-items-center gap-2 mb-3">
                                                    <input
                                                        className="form-check-input mt-0"
                                                        type="checkbox"
                                                        id="includePaymentReceipt"
                                                        checked={prefs.includePaymentReceipt}
                                                        onChange={e => setP('includePaymentReceipt', e.target.checked)}
                                                    />
                                                    <label className="form-check-label text-dark" htmlFor="includePaymentReceipt" style={{ fontSize: 14 }}>
                                                        Do you want to include the payment receipt along with the Thank You note?
                                                    </label>
                                                </div>
                                                <div className="d-flex align-items-center gap-2">
                                                    <input
                                                        className="form-check-input mt-0"
                                                        type="checkbox"
                                                        id="automateThankYouNote"
                                                        checked={prefs.automateThankYouNote}
                                                        onChange={e => setP('automateThankYouNote', e.target.checked)}
                                                    />
                                                    <label className="form-check-label text-dark" htmlFor="automateThankYouNote" style={{ fontSize: 14 }}>
                                                        Automate thank you note to customer on receipt of online payment
                                                    </label>
                                                </div>
                                            </div>

                                            <hr className="my-3 border-light" />

                                            {/* Advance Payment */}
                                            <div className="py-2">
                                                <div className="d-flex align-items-center gap-2">
                                                    <input
                                                        className="form-check-input mt-0"
                                                        type="checkbox"
                                                        id="advancePaymentEnabled"
                                                        checked={prefs.advancePaymentEnabled}
                                                        onChange={e => setP('advancePaymentEnabled', e.target.checked)}
                                                    />
                                                    <label className="form-check-label text-dark fw-bold" htmlFor="advancePaymentEnabled" style={{ fontSize: 14, cursor: 'pointer' }}>
                                                        Advance Payment
                                                    </label>
                                                </div>

                                                {prefs.advancePaymentEnabled && (
                                                    <div className="mt-3 ms-4 border rounded p-3" style={{ background: '#fafafa', maxHeight: 200, overflowY: 'auto' }}>
                                                        <p className="text-muted mb-3" style={{ fontSize: 14 }}>
                                                            Select the customer categories for which advance payment is applicable.
                                                        </p>
                                                        <div className="d-flex flex-column gap-0">
                                                            {allCategories.map((cat) => {
                                                                const isChecked = prefs.advancePaymentCategories.includes(cat.id);
                                                                return (
                                                                    <div
                                                                        key={cat.id}
                                                                        className="d-flex align-items-center gap-2 px-2 py-2"
                                                                    >
                                                                        <input
                                                                            className="form-check-input mt-0"
                                                                            type="checkbox"
                                                                            id={`adv-cat-${cat.id}`}
                                                                            checked={isChecked}
                                                                            onChange={() => {
                                                                                const updated = isChecked
                                                                                    ? prefs.advancePaymentCategories.filter(id => id !== cat.id)
                                                                                    : [...prefs.advancePaymentCategories, cat.id];
                                                                                setP('advancePaymentCategories', updated);
                                                                            }}
                                                                        />
                                                                        <label htmlFor={`adv-cat-${cat.id}`} className="mb-0 text-dark" style={{ fontSize: 14, cursor: 'pointer' }}>
                                                                            {cat.name}
                                                                            <span className="text-muted ms-1" style={{ fontSize: 14 }}>({cat.code})</span>
                                                                        </label>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        {allCategories.length === 0 && (
                                                            <p className="text-muted mb-0" style={{ fontSize: 14 }}>
                                                                No customer categories found. Add categories from the Customer Category page.
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <hr className="my-3 border-light" />

                                            {/* Invoice QR Code */}
                                            <div className="py-2">
                                                <div className="d-flex align-items-center justify-content-between mb-2">
                                                    <h6 className="fw-bold mb-0" style={{ fontSize: 14, color: '#1a1a2e' }}>Invoice QR Code</h6>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="text-muted fw-bold" style={{ fontSize: 14 }}>
                                                            {prefs.qrCodeEnabled ? 'Enabled' : 'Disabled'}
                                                        </span>
                                                        <input
                                                            type="checkbox"
                                                            className="pref-toggle"
                                                            checked={prefs.qrCodeEnabled}
                                                            onChange={e => setP('qrCodeEnabled', e.target.checked)}
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-primary mb-3" style={{ fontSize: 14 }}>
                                                    Enable and configure the QR code you want to display on the PDF copy of an Invoice. Your customers can scan the QR code using their device to access the URL or other information that you configure.
                                                </p>

                                                {prefs.qrCodeEnabled && (
                                                    <div className="pref-sub-section py-2 mt-2">
                                                        {/* QR Code Type */}
                                                        <div className="row mb-4 align-items-start">
                                                            <div className="col-md-3 d-flex align-items-center" style={{ paddingTop: 8 }}>
                                                                <label className="form-check-label text-dark" style={{ fontSize: 14 }}>QR Code Type</label>
                                                            </div>
                                                            <div className="col-md-9">
                                                                <QrCodeTypeSelect
                                                                    value={prefs.qrCodeType}
                                                                    onChange={v => setP('qrCodeType', v)}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* QR Code Description */}
                                                        <div className="row mb-3 align-items-start">
                                                            <div className="col-md-3 d-flex align-items-center" style={{ paddingTop: 6 }}>
                                                                <label className="form-check-label text-dark" style={{ fontSize: 14 }}>QR Code Description</label>
                                                            </div>
                                                            <div className="col-md-9">
                                                                <textarea
                                                                    className="form-control"
                                                                    rows={4}
                                                                    style={{ fontSize: 14, resize: 'vertical' }}
                                                                    value={prefs.qrCodeDescription}
                                                                    onChange={e => setP('qrCodeDescription', e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="mt-3 p-3 rounded" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', fontSize: 14 }}>
                                                    <strong>Note:</strong>{' '}
                                                    <span className="text-muted">You can display this QR code in your invoice PDFs. To do this, edit the invoice template from </span>
                                                    <span className="text-primary" style={{ cursor: 'pointer' }}>PDF Templates in Settings</span>
                                                    <span className="text-muted"> and select the </span>
                                                    <em>Show Invoice QR Code</em>
                                                    <span className="text-muted"> checkbox in the Other Details section.</span>
                                                </div>
                                            </div>

                                            <hr className="my-3 border-light" />

                                            {/* Zero-Value Line Items */}
                                            <div className="py-2">
                                                <h6 className="fw-bold mb-3" style={{ fontSize: 14, color: '#1a1a2e' }}>Zero-Value Line Items</h6>
                                                <div className="d-flex align-items-start gap-2">
                                                    <input
                                                        className="form-check-input mt-1"
                                                        type="checkbox"
                                                        id="hideZeroValueItems"
                                                        checked={prefs.hideZeroValueItems}
                                                        onChange={e => setP('hideZeroValueItems', e.target.checked)}
                                                    />
                                                    <div>
                                                        <label className="form-check-label fw-semibold text-dark" htmlFor="hideZeroValueItems" style={{ fontSize: 14 }}>
                                                            Hide zero-value line items
                                                        </label>
                                                        <p className="text-muted mt-1 mb-0" style={{ fontSize: 14 }}>
                                                            Choose whether you want to hide zero-value line items in an invoice's PDF and the Customer Portal. They will still be visible while editing an invoice. This setting will not apply to invoices whose total is zero.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <hr className="my-3 border-light" />

                                            {/* Terms & Conditions */}
                                            <div className="py-2">
                                                <h6 className="fw-bold mb-3" style={{ fontSize: 14, color: '#1a1a2e' }}>Terms &amp; Conditions</h6>
                                                <textarea
                                                    className="form-control"
                                                    rows={6}
                                                    style={{ fontSize: 14, resize: 'vertical' }}
                                                    value={prefs.termsAndConditions}
                                                    onChange={e => setP('termsAndConditions', e.target.value)}
                                                    placeholder="Enter your terms and conditions..."
                                                />
                                            </div>

                                            <hr className="my-3 border-light" />

                                            {/* Customer Notes */}
                                            <div className="py-2">
                                                <h6 className="fw-bold mb-3" style={{ fontSize: 14, color: '#1a1a2e' }}>Customer Notes</h6>
                                                <textarea
                                                    className="form-control"
                                                    rows={5}
                                                    style={{ fontSize: 14, resize: 'vertical' }}
                                                    value={prefs.customerNotes}
                                                    onChange={e => setP('customerNotes', e.target.value)}
                                                />
                                            </div>

                                            {/* Save */}
                                            <div className="mt-5 pt-3 border-top">
                                                <button type="submit" className="btn btn-primary px-4 fw-bold shadow-none" disabled={loading} style={{ borderRadius: 4 }}>
                                                    {loading ? 'Saving...' : 'Save'}
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    {/* ════════════════════════════════
                                        TAB 2 — FIELD CUSTOMIZATION
                                    ════════════════════════════════ */}
                                    {activeTab === 'field-customization' && (
                                        <div className="py-2">
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <h5 className="fw-bold mb-0" style={{ fontSize: 14 }}>Custom Fields</h5>
                                                <button type="button" className="btn btn-primary btn-sm px-3 fw-bold shadow-none" onClick={() => setShowAddModal(true)}>
                                                    <i className="ti ti-plus me-1" />Add New Field
                                                </button>
                                            </div>

                                            {customFields.length === 0 ? (
                                                <div className="text-center py-5 border rounded bg-light" style={{ color: '#8c8c8c', fontSize: 14 }}>
                                                    <i className="ti ti-database-off" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
                                                    No custom fields yet.
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="mb-3" style={{ maxWidth: 280 }}>
                                                        <SearchInput value={searchText} onChange={setSearchText} />
                                                    </div>
                                                    <div className="table-responsive border rounded">
                                                        <table className="table table-hover mb-0">
                                                            <thead className="table-light">
                                                                <tr style={{ fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                                                    <th className="px-3 py-2">Name</th>
                                                                    <th className="py-2">Type</th>
                                                                    <th className="py-2">Default Value</th>
                                                                    <th className="py-2">Mandatory</th>
                                                                    <th className="py-2">Status</th>
                                                                    <th className="py-2">Action</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {customFields
                                                                    .filter(f => f.displayName.toLowerCase().includes(searchText.toLowerCase()))
                                                                    .map(f => (
                                                                        <tr key={f.id} style={{ fontSize: 14 }}>
                                                                            <td className="px-3 py-3 text-dark">{f.displayName}</td>
                                                                            <td className="py-3 text-muted">{f.dataType}</td>
                                                                            <td className="py-3 text-muted">{f.defaultValue || '—'}</td>
                                                                            <td className="py-3">
                                                                                <div className="form-check form-switch mb-0">
                                                                                    <input className="form-check-input" type="checkbox" checked={f.mandatory === 'Yes'} readOnly style={{ width: 36, height: 20, cursor: 'default' }} />
                                                                                </div>
                                                                            </td>
                                                                            <td className="py-3">
                                                                                <span className={`badge px-2 py-1 ${f.status === 'Active' ? 'text-success border border-success' : 'text-secondary border border-secondary'}`} style={{ fontSize: 14, background: 'transparent', borderRadius: 6 }}>
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
            </div>

            {/* ══ MODAL — ADD CUSTOM FIELD ══ */}
            <div className={`modal fade ${showAddModal ? 'show d-block' : ''}`} role="dialog" style={{ backgroundColor: showAddModal ? 'rgba(0,0,0,0.5)' : 'transparent', zIndex: 1060 }}>
                <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                    <div className="modal-content shadow-lg border-0" style={{ borderRadius: 12 }}>
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
                                    <label className="form-label text-dark fw-bold mb-1" style={{ fontSize: 14 }}>Display Name <span className="text-danger">*</span></label>
                                    <input type="text" className={`form-control form-control-sm ${addErr.displayName ? 'is-invalid' : ''}`}
                                        value={addForm.displayName || ''}
                                        onChange={e => {
                                            const val = e.target.value;
                                            const slug = val.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                                            setAddForm(p => ({ ...p, displayName: val, fieldName: slug }));
                                            setAddErr(p => ({ ...p, displayName: '' }));
                                        }} placeholder="e.g. PO Number" autoFocus />
                                    {addErr.displayName && <FieldError msg={addErr.displayName} />}
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-muted mb-1" style={{ fontSize: 14 }}>Label Name</label>
                                    <input type="text" className="form-control form-control-sm bg-light" value={addForm.fieldName || ''} readOnly style={{ pointerEvents: 'none' }} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1" style={{ fontSize: 14 }}>Data Type <span className="text-danger">*</span></label>
                                    <CommonSelect options={Input_Type} className="select"
                                        defaultValue={Input_Type.find(it => it.value === addForm.dataType) || Input_Type[0]}
                                        onChange={(val: string) => { setAddErr(p => ({ ...p, dataType: '' })); setAddForm(p => ({ ...p, dataType: val, defaultValue: getDefaultValueForType(val) })); }} />
                                    {addErr.dataType && <FieldError msg={addErr.dataType} />}
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1" style={{ fontSize: 14 }}>Help Text</label>
                                    <input type="text" className="form-control form-control-sm" value={addForm.helpText || ''} placeholder="Help users understand this field."
                                        onChange={e => setAddForm(p => ({ ...p, helpText: e.target.value }))} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1" style={{ fontSize: 14 }}>Data Privacy</label>
                                    <div className="d-flex align-items-center gap-2">
                                        <input type="checkbox" id="add-pii" className="form-check-input me-1 mt-0" checked={addForm.dataPii || false}
                                            onChange={() => setAddForm(p => ({ ...p, dataPii: !p.dataPii }))} style={{ width: 16, height: 16, cursor: 'pointer', float: 'none' }} />
                                        <label htmlFor="add-pii" style={{ cursor: 'pointer', fontSize: 14, marginBottom: 0 }}>PII (Personal Identifiable Information)</label>
                                    </div>
                                    {addForm.dataPii && <WarnBanner>Data will be stored without encryption.</WarnBanner>}
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1 d-block" style={{ fontSize: 14 }}>Prevent Duplicate Values</label>
                                    <div className="d-flex align-items-center gap-4">
                                        {(['Yes', 'No'] as const).map(v => (
                                            <div key={v} className="d-flex align-items-center gap-2">
                                                <input type="radio" id={`add-dup-${v}`} name="add_dup" checked={addForm.preventDuplicates === v}
                                                    onChange={() => setAddForm(p => ({ ...p, preventDuplicates: v }))}
                                                    style={{ accentColor: '#e41f07', width: 15, height: 15, cursor: 'pointer', float: 'none' }} />
                                                <label htmlFor={`add-dup-${v}`} style={{ cursor: 'pointer', marginBottom: 0, fontSize: 14 }}>{v}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1" style={{ fontSize: 14 }}>Input Format</label>
                                    <InputFormatSelect value={addForm.inputFormat || 'None'} onChange={v => setAddForm(p => ({ ...p, inputFormat: v }))} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1" style={{ fontSize: 14 }}>Default Value</label>
                                    <DefaultValueInput dataType={addForm.dataType || 'Text Box (Single Line)'} value={addForm.defaultValue || ''}
                                        onChange={v => setAddForm(p => ({ ...p, defaultValue: v }))} idPrefix="add" hasError={!!addErr.defaultValue} />
                                    {addErr.defaultValue && <FieldError msg={addErr.defaultValue} />}
                                </div>
                                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                                    <label className="form-label mb-0 text-dark fw-bold" style={{ fontSize: 14 }}>Mandatory</label>
                                    <div className="form-check form-switch mb-0">
                                        <input className="form-check-input switchCheckDefault" type="checkbox" role="switch"
                                            checked={addForm.mandatory === 'Yes'} onChange={e => setAddForm(p => ({ ...p, mandatory: e.target.checked ? 'Yes' : 'No' }))} />
                                    </div>
                                </div>
                                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                                    <label className="form-label mb-0 text-dark fw-bold" style={{ fontSize: 14 }}>Show in all PDFs</label>
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
                    <div className="modal-content shadow-lg border-0" style={{ borderRadius: 12 }}>
                        <div className="modal-header py-3 border-bottom-0">
                            <h5 className="modal-title fw-bold" style={{ fontSize: 16 }}>Edit Custom Field</h5>
                            <button type="button" className="btn-close custom-btn-close border p-1 me-0 d-flex align-items-center justify-content-center rounded-circle" onClick={() => setShowEditModal(false)}>
                                <i className="ti ti-x" />
                            </button>
                        </div>
                        <div className="modal-body py-0 custom-scrollbar" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            <div className="px-1">
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1" style={{ fontSize: 14 }}>Display Name <span className="text-danger">*</span></label>
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
                                    <label className="form-label text-muted mb-1" style={{ fontSize: 14 }}>Label Name</label>
                                    <input type="text" className="form-control form-control-sm bg-light" value={editForm.fieldName || ''} readOnly style={{ pointerEvents: 'none' }} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-muted mb-1" style={{ fontSize: 14 }}>Data Type</label>
                                    <input type="text" className="form-control form-control-sm bg-light" value={editForm.dataType || ''} readOnly style={{ pointerEvents: 'none' }} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1" style={{ fontSize: 14 }}>Help Text</label>
                                    <input type="text" className="form-control form-control-sm" value={editForm.helpText || ''} placeholder="Help users understand this field."
                                        onChange={e => setEditForm(p => ({ ...p, helpText: e.target.value }))} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1" style={{ fontSize: 14 }}>Data Privacy</label>
                                    <div className="d-flex align-items-center gap-2">
                                        <input type="checkbox" id="edit-pii" className="form-check-input me-1 mt-0" checked={editForm.dataPii || false}
                                            onChange={() => setEditForm(p => ({ ...p, dataPii: !p.dataPii }))} style={{ width: 16, height: 16, cursor: 'pointer', float: 'none' }} />
                                        <label htmlFor="edit-pii" style={{ cursor: 'pointer', fontSize: 14, marginBottom: 0 }}>PII</label>
                                    </div>
                                    {editForm.dataPii && <WarnBanner>Data will be stored without encryption.</WarnBanner>}
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1 d-block" style={{ fontSize: 14 }}>Prevent Duplicate Values</label>
                                    <div className="d-flex align-items-center gap-4">
                                        {(['Yes', 'No'] as const).map(v => (
                                            <div key={v} className="d-flex align-items-center gap-2">
                                                <input type="radio" id={`edit-dup-${v}`} name="edit_dup" checked={editForm.preventDuplicates === v}
                                                    onChange={() => setEditForm(p => ({ ...p, preventDuplicates: v }))}
                                                    style={{ accentColor: '#e41f07', width: 15, height: 15, cursor: 'pointer', float: 'none' }} />
                                                <label htmlFor={`edit-dup-${v}`} style={{ cursor: 'pointer', marginBottom: 0, fontSize: 14 }}>{v}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1" style={{ fontSize: 14 }}>Input Format <span className="text-danger">*</span></label>
                                    <InputFormatSelect value={editForm.inputFormat || 'None'} onChange={v => setEditForm(p => ({ ...p, inputFormat: v }))} required />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1" style={{ fontSize: 14 }}>Default Value</label>
                                    <DefaultValueInput dataType={editForm.dataType || 'Text Box (Single Line)'} value={editForm.defaultValue || ''}
                                        onChange={v => setEditForm(p => ({ ...p, defaultValue: v }))} idPrefix="edit" />
                                </div>
                                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                                    <label className="form-label mb-0 text-dark fw-bold" style={{ fontSize: 14 }}>Mandatory</label>
                                    <div className="form-check form-switch mb-0">
                                        <input className="form-check-input switchCheckDefault" type="checkbox" role="switch"
                                            checked={editForm.mandatory === 'Yes'} onChange={e => setEditForm(p => ({ ...p, mandatory: e.target.checked ? 'Yes' : 'No' }))} />
                                    </div>
                                </div>
                                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                                    <label className="form-label mb-0 text-dark fw-bold" style={{ fontSize: 14 }}>Show in all PDFs</label>
                                    <div className="form-check form-switch mb-0">
                                        <input className="form-check-input switchCheckDefault" type="checkbox" role="switch"
                                            checked={editForm.showInAllPdfs === 'Yes'} onChange={e => setEditForm(p => ({ ...p, showInAllPdfs: e.target.checked ? 'Yes' : 'No' }))} />
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-dark fw-bold mb-1 d-block" style={{ fontSize: 14 }}>Status</label>
                                    <div className="d-flex align-items-center gap-4">
                                        {(['Active', 'Inactive'] as const).map(v => (
                                            <div key={v} className="d-flex align-items-center gap-2">
                                                <input type="radio" id={`edit-st-${v}`} name="edit_status" checked={editForm.status === v}
                                                    onChange={() => setEditForm(p => ({ ...p, status: v }))}
                                                    style={{ accentColor: '#e41f07', width: 15, height: 15, cursor: 'pointer', float: 'none' }} />
                                                <label htmlFor={`edit-st-${v}`} style={{ cursor: 'pointer', marginBottom: 0, fontSize: 14 }}>{v}</label>
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

export default InvoiceSetting;
