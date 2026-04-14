import React, { useState, useEffect, useRef, useMemo } from 'react';
import "../../billing-application.scss";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { Tooltip, OverlayTrigger } from 'react-bootstrap';
import Select, { components } from "react-select";
import CreatableSelect from "react-select/creatable";
import Footer from "../../../../../components/footer/footer";
import PageHeader from "../../../../../components/page-header/pageHeader";
import Datatable from "../../../../../components/dataTable";
import SearchInput from "../../../../../components/dataTable/dataTableSearch";
import PredefinedDatePicker from "../../../../../components/common-dateRangePicker/PredefinedDatePicker";
import { all_routes } from "../../../../../routes/all_routes";
import { productService } from "../../../../../api/productService";
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

const route = all_routes;

// ── Types ─────────────────────────────────────────────────────────────────────
interface HistoryEntry {
    date: string;
    details: string;
    user: string;
}

interface CompositeItemEntry {
    id: number | string;
    name: string;
    compositionType?: 'Assembly' | 'Kit';
    sku?: string;
    stockOnHand?: number;
    reorderLevel?: number;
    unit?: string;
    sellingPrice?: number;
    costPrice?: number;
    category?: string;
    brand?: string;
    dimensions?: string;
    dimensionUnit?: string;
    weight?: string;
    weightUnit?: string;
    upc?: string;
    ean?: string;
    mpn?: string;
    isbn?: string;
    manufacturer?: string;
    isReturnable?: boolean;
    image?: string;
    isDeleted?: boolean;
    history?: HistoryEntry[];
    children?: CompositeItemEntry[];
    isChild?: boolean;
    isFirstChild?: boolean;
    isLastChild?: boolean;
    quantity?: string;
    rowType?: 'item' | 'service';
    _hasChildren?: boolean;
    // Expanded Fields
    purchaseAccount?: string;
    purchaseDescription?: string;
    salesAccount?: string;
    salesDescription?: string;
    inventoryAccount?: string;
    valuationMethod?: string;
    createdSource?: string;
    openingStock?: number;
    accountingStock?: number;
    committedStock?: number;
    availableForSale?: number;
    physicalStock?: number;
    toShip?: number;
    toReceive?: number;
    toInvoice?: number;
    toBill?: number;
}

// ── Seed Data ─────────────────────────────────────────────────────────────────
const SEED_DATA: CompositeItemEntry[] = [
    {
        id: 1,
        name: 'jkhgfcd',
        compositionType: 'Assembly',
        sku: 'dfghj',
        stockOnHand: 0.00,
        reorderLevel: 3.00,
        unit: 'box',
        sellingPrice: 0,
        costPrice: 0,
        category: 'kalai',
        brand: 'femi9',
        manufacturer: 'femi9',
        dimensions: '3 x 3 x 3',
        dimensionUnit: 'cm',
        weight: '100',
        weightUnit: 'g',
        mpn: 'juytr',
        isReturnable: true,
        history: [
            { date: '09/04/2026 04:04 PM', details: 'created by', user: 'gowthamfemi9' },
        ],
        children: [
            { id: '1-1', name: 'iuytfrdgs', quantity: '1 box', isChild: true },
            { id: '1-2', name: 'uytrgfhjkl', quantity: '1 box', sku: 'jhgf', isChild: true },
        ]
    },
];

function loadData(): CompositeItemEntry[] {
    const cloneSeedData = () => SEED_DATA.map(item => ({
        ...item,
        children: item.children ? item.children.map(child => ({ ...child })) : undefined,
    }));

    const storage = (() => {
        try {
            return typeof window !== 'undefined' ? window.localStorage : null;
        } catch {
            return null;
        }
    })();

    if (!storage) {
        return cloneSeedData();
    }

    try {
        const stored = storage.getItem('compositeItemData');
        if (stored) {
            const parsed = JSON.parse(stored) as CompositeItemEntry[];
            if (Array.isArray(parsed)) {
                // Ensure no corrupted top-level child items are loaded
                return parsed.filter(d => !d.isChild);
            }
        }
    } catch {
        // Ignore storage read or parse failures and fall back to seed data.
    }

    try {
        storage.setItem('compositeItemData', JSON.stringify(SEED_DATA));
    } catch {
        // Ignore storage write failures so the page can still render.
    }

    return cloneSeedData();
}

function saveData(data: CompositeItemEntry[]) {
    try {
        const storage = typeof window !== 'undefined' ? window.localStorage : null;
        storage?.setItem('compositeItemData', JSON.stringify(data));
    } catch { /* ignore */ }
}

const updateItemInHierarchy = (items: CompositeItemEntry[], targetId: any, patches: Partial<CompositeItemEntry>): CompositeItemEntry[] => {
    return items.map(item => {
        if (String(item.id) === String(targetId)) {
            return { ...item, ...patches };
        }
        if (item.children && item.children.length > 0) {
            return {
                ...item,
                children: updateItemInHierarchy(item.children, targetId, patches)
            };
        }
        return item;
    });
};

function getCurrentUser(): string {
    try { return localStorage.getItem('composite_current_user') || 'vijayfemi9-png'; } catch { return 'vijayfemi9-png'; }
}

function formatHistoryDate(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    let hh = d.getHours();
    const min = String(d.getMinutes()).padStart(2, '0');
    const ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12 || 12;
    return `${dd}/${mm}/${yyyy} ${String(hh).padStart(2, '0')}:${min} ${ampm}`;
}

// --- Consolidated Image Compression (Max 10MB input, target ~200KB output) ---
function compressImage(file: File, maxDim: number = 1200): Promise<string> {
    return new Promise((resolve, reject) => {
        // 10MB limit check
        const TEN_MB = 10 * 1024 * 1024;
        if (file.size > TEN_MB) {
            reject(new Error('File size exceeds 10MB limit.'));
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxDim || height > maxDim) {
                    const ratio = Math.min(maxDim / width, maxDim / height);
                    width *= ratio;
                    height *= ratio;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) { reject(new Error('Canvas context failed')); return; }
                ctx.drawImage(img, 0, 0, width, height);

                // Start with 0.7 quality
                let quality = 0.7;
                let dataUrl = canvas.toDataURL('image/jpeg', quality);
                
                // If still too large (unlikely for 1200px at 0.7), reduce quality
                while (dataUrl.length > 500000 && quality > 0.1) {
                    quality -= 0.1;
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                }
                
                resolve(dataUrl);
            };
            img.onerror = () => reject(new Error('Image failed to load'));
        };
        reader.onerror = () => reject(new Error('File failed to read'));
    });
}

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ message, onClose, type = 'success' }: { message: string; onClose: () => void; type?: 'success' | 'error' }) => {
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
    const isErr = type === 'error';
    return (
        <div style={{ position: 'fixed', right: isErr ? 'auto' : 24, bottom: isErr ? 'auto' : 24, top: isErr ? 24 : 'auto', left: isErr ? '50%' : 'auto', transform: isErr ? 'translateX(-50%)' : 'none', zIndex: 3000, background: isErr ? '#e5484d' : '#0d8a56', color: '#fff', padding: '10px 16px', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
            <i className={`ti ${isErr ? 'ti-alert-triangle-filled' : 'ti-circle-check-filled'}`} style={{ fontSize: 18 }} />{message}
            <i className="ti ti-x" style={{ cursor: 'pointer', marginLeft: 8, opacity: 0.7 }} onClick={onClose} />
        </div>
    );
};

// ── Shared Select Styles ──────────────────────────────────────────────────────
const customStyles = {
    control: (base: any, state: any) => ({
        ...base,
        borderColor: state.isFocused ? '#e41f07' : '#e3e3e3',
        boxShadow: 'none',
        '&:hover': { borderColor: '#e41f07' },
        borderRadius: '0.375rem', minHeight: '38px', cursor: 'pointer',
    }),
    option: (base: any, state: any) => ({
        ...base,
        backgroundColor: state.isSelected ? '#e41f07' : state.isFocused ? '#fff5f5' : 'white',
        color: state.isSelected ? '#fff' : state.isFocused ? '#e41f07' : '#707070',
        cursor: 'pointer',
    }),
    singleValue: (base: any) => ({ ...base, color: '#333' }),
    placeholder: (base: any) => ({ ...base, color: '#9e9e9e' }),
};

const unitSelectStyles = {
    control: (base: any) => ({
        ...base,
        borderColor: '#d9d9d9',
        boxShadow: 'none',
        borderRadius: '0 0.375rem 0.375rem 0',
        minHeight: '38px',
        height: '38px',
        cursor: 'pointer',
        backgroundColor: '#f5f5f5',
        '&:hover': { borderColor: '#cfcfcf' },
    }),
    valueContainer: (base: any) => ({ ...base, padding: '0 6px' }),
    singleValue: (base: any) => ({ ...base, fontSize: '14px', color: '#333' }),
    option: (base: any, state: any) => ({
        ...base,
        fontSize: '14px',
        backgroundColor: state.isSelected ? '#e41f07' : state.isFocused ? '#fff5f5' : 'white',
        color: state.isSelected ? '#fff' : state.isFocused ? '#e41f07' : '#707070',
        cursor: 'pointer',
    }),
    menu: (base: any) => ({ ...base, minWidth: '90px', zIndex: 9999 }),
    indicatorsContainer: (base: any) => ({ ...base, padding: '0 2px' }),
};

const neutralTheme = (theme: any) => ({
    ...theme,
    colors: {
        ...theme.colors,
        primary: '#e41f07',
        primary25: '#fff5f5',
        primary50: '#f9d2cd',
        primary75: '#f29c92',
    },
});

const DropdownIndicator = (props: any) => (
    <components.DropdownIndicator {...props}>
        <i className={`ti ${props.selectProps.menuIsOpen ? 'ti-chevron-up' : 'ti-chevron-down'} fs-14 text-muted`} />
    </components.DropdownIndicator>
);

const FooterMenuList = (props: any) => (
    <components.MenuList {...props}>
        {props.children}
        {props.selectProps.menuFooter}
    </components.MenuList>
);

// ── Zoho-style dropdown for Category / Brand ──────────────────────────────────
const zohoDropdownStyles = {
    control: (base: any, state: any) => ({
        ...base,
        borderColor: state.isFocused ? '#e41f07' : '#e3e3e3',
        boxShadow: 'none',
        '&:hover': { borderColor: '#e41f07' },
        borderRadius: '0.375rem',
        minHeight: '38px',
        cursor: 'pointer',
    }),
    menu: (base: any) => ({
        ...base,
        borderRadius: 8,
        boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
        border: '1px solid #e9ecef',
        overflow: 'hidden',
        zIndex: 9999,
    }),
    menuList: (base: any) => ({
        ...base,
        padding: 0,
        maxHeight: 260,
    }),
    option: (base: any, state: any) => ({
        ...base,
        backgroundColor: state.isFocused && !state.isSelected ? '#fff5f5' : '#fff',
        color: state.isSelected ? '#e41f07' : '#333',
        fontWeight: state.isSelected ? 600 : 400,
        fontSize: 14,
        padding: '10px 16px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    }),
    singleValue: (base: any) => ({ ...base, color: '#333' }),
    placeholder: (base: any) => ({ ...base, color: '#9e9e9e', fontSize: 14 }),
    input: (base: any) => ({ ...base, fontSize: 14 }),
    dropdownIndicator: (base: any) => ({ ...base, color: '#9e9e9e' }),
    indicatorSeparator: () => ({ display: 'none' }),
    valueContainer: (base: any) => ({ ...base, padding: '2px 12px' }),
};

const ZohoOption = (props: any) => (
    <components.Option {...props}>
        <span>{props.label}</span>
        {props.isSelected && <i className="ti ti-check" style={{ color: '#e41f07', fontSize: 15, flexShrink: 0 }} />}
    </components.Option>
);

// Hides react-select's built-in input from the control but keeps it functional for filtering
const ZohoHiddenInput = (props: any) => (
    <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <components.Input {...props} />
    </div>
);

const ZohoMenuList = (props: any) => {
    const { onInputChange, inputValue, selectProps } = props;
    const [showInlineAdd, setShowInlineAdd] = React.useState(false);
    const [inlineValue, setInlineValue] = React.useState('');
    const inlineInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (showInlineAdd) setTimeout(() => inlineInputRef.current?.focus(), 50);
    }, [showInlineAdd]);

    const handleInlineSave = () => {
        const name = inlineValue.trim();
        if (!name) return;
        selectProps.onInlineAdd?.(name);
        setInlineValue('');
        setShowInlineAdd(false);
    };

    return (
        <div>
            {/* Search box — calls react-select's onInputChange so built-in filtering works */}
            <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid #f0f0f0', background: '#fff' }}>
                <div style={{ position: 'relative' }}>
                    <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: 14 }} />
                    <input
                        autoFocus
                        value={inputValue}
                        onChange={e => onInputChange(e.target.value, { action: 'input-change' })}
                        placeholder={selectProps.searchPlaceholder || 'Search...'}
                        style={{
                            width: '100%', border: '1.5px solid #e9ecef', borderRadius: 6,
                            padding: '6px 10px 6px 32px', fontSize: 13, outline: 'none',
                            background: '#f8fafd',
                        }}
                        onFocus={e => (e.target.style.borderColor = '#e41f07')}
                        onBlur={e => (e.target.style.borderColor = '#e9ecef')}
                    />
                </div>
            </div>

            {/* Options — react-select renders these via props.children (handles click, selection & auto-close) */}
            <components.MenuList {...props}>
                {props.children}
            </components.MenuList>

            {/* Inline Add Form */}
            {showInlineAdd && (
                <div style={{ padding: '10px 12px', borderTop: '1px solid #f0f0f0', background: '#f8fafd' }}>
                    <div className="d-flex align-items-center gap-2">
                        <input
                            ref={inlineInputRef}
                            className="form-control form-control-sm"
                            placeholder="Enter name..."
                            value={inlineValue}
                            onChange={e => setInlineValue(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') { e.preventDefault(); handleInlineSave(); }
                                if (e.key === 'Escape') { setInlineValue(''); setShowInlineAdd(false); }
                            }}
                        />
                        <button
                            type="button"
                            className="btn btn-sm btn-primary px-2 flex-shrink-0"
                            onMouseDown={e => { e.preventDefault(); handleInlineSave(); }}
                            title="Save"
                        >
                            <i className="ti ti-check" />
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-light border px-2 flex-shrink-0"
                            onMouseDown={e => { e.preventDefault(); setInlineValue(''); setShowInlineAdd(false); }}
                            title="Cancel"
                        >
                            <i className="ti ti-x" />
                        </button>
                    </div>
                </div>
            )}

            {/* Footer: Add + Manage */}
            {!showInlineAdd && (selectProps.addLabel || selectProps.manageLabel) && (
                <div style={{ borderTop: '1px solid #f0f0f0', background: '#fff' }}>
                    {selectProps.addLabel && (
                        <button
                            type="button"
                            className="w-100 border-0 bg-transparent py-2 fw-semibold fs-13 d-flex align-items-center justify-content-center gap-2"
                            style={{ color: '#e41f07', cursor: 'pointer', borderBottom: selectProps.manageLabel ? '1px solid #f0f0f0' : 'none' }}
                            onMouseDown={e => { e.preventDefault(); setShowInlineAdd(true); setInlineValue(''); }}
                        >
                            <i className="ti ti-plus fs-14" /> {selectProps.addLabel}
                        </button>
                    )}
                    {selectProps.manageLabel && (
                        <button
                            type="button"
                            className="w-100 border-0 bg-transparent py-2 fw-semibold fs-13 d-flex align-items-center justify-content-center gap-2"
                            style={{ color: '#e41f07', cursor: 'pointer' }}
                            onMouseDown={e => { e.preventDefault(); selectProps.onManageClick?.(); }}
                        >
                            <i className="ti ti-settings fs-14" /> {selectProps.manageLabel}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

const SearchOption = (props: any) => (
    <components.Option {...props}>
        <div className="d-flex align-items-center justify-content-between">
            <span>{props.label}</span>
            {props.isSelected && <i className="ti ti-check text-primary fs-14" />}
        </div>
    </components.Option>
);

const SearchControl = (props: any) => {
    const { selectProps } = props;
    return (
        <div onMouseDown={(e) => {
            const target = e.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' || target.closest('.react-select__input');
            if (selectProps.menuIsOpen && isInput) return;
            e.preventDefault(); e.stopPropagation();
            if (selectProps.menuIsOpen) selectProps.onMenuClose(); else selectProps.onMenuOpen();
        }}>
            <components.Control {...props} />
        </div>
    );
};

const SearchMenuList = (props: any) => {
    const { selectProps } = props;
    const [isFocused, setIsFocused] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    return (
        <components.MenuList {...props}>
            <div className="p-2 border-bottom sticky-top bg-white" style={{ zIndex: 2, top: 0 }}>
                <div className="input-group input-group-sm border rounded"
                    onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
                    style={{ borderColor: isFocused ? '#e41f07' : '#e3e3e3', boxShadow: 'none', backgroundColor: isHovered && !isFocused ? '#fcfdfe' : 'white', transition: 'all 0.2s ease' }}>
                    <span className="input-group-text bg-transparent border-0 pe-1">
                        <i className="ti ti-search" style={{ color: isFocused ? '#e41f07' : '#999' }} />
                    </span>
                    <input type="text" className="form-control border-0 shadow-none ps-0 bg-transparent" placeholder="Search" autoFocus
                        value={selectProps.inputValue || ""} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
                        onChange={(e) => selectProps.onInputChange(e.currentTarget.value, { action: 'input-change' })}
                        onKeyDown={(e) => e.stopPropagation()} />
                </div>
            </div>
            {props.children}
            {selectProps.menuFooter}
        </components.MenuList>
    );
};

const searchableSelectProps: any = {
    styles: customStyles, theme: neutralTheme, isSearchable: true,
    components: { MenuList: SearchMenuList, Option: SearchOption, DropdownIndicator, Control: SearchControl, Input: () => null, IndicatorSeparator: () => null },
    blurInputOnSelect: true, closeMenuOnSelect: true,
};

const MoreButton = ({ children }: { children: React.ReactNode }) => {
    const [hovered, setHovered] = React.useState(false);
    return (
        <span
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                borderRadius: 6,
                backgroundColor: hovered ? '#fff3f2' : '#ffffff',
                border: `1px solid ${hovered ? '#f6c4bf' : '#dee2e6'}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
            }}
        >
            {children}
        </span>
    );
};

const HelpIcon = ({ text, id }: { text: string; id: string }) => (
    <OverlayTrigger placement="top" overlay={<Tooltip id={id}>{text}</Tooltip>}>
        <span className="ms-1 d-inline-flex align-items-center" style={{ cursor: 'help' }}>
            <i className="ti ti-help-circle text-muted" style={{ fontSize: '13px' }} />
        </span>
    </OverlayTrigger>
);

// ── Associate Row ─────────────────────────────────────────────────────────────
type AssociateRow = {
    id: string;
    itemName: string;
    quantity: string;
    sellingPrice: string;
    costPrice: string;
    type: 'item' | 'service';
    productId?: string;
    stockOnHand?: number;
};
const newRow = (type: 'item' | 'service' = 'item'): AssociateRow => ({
    id: Math.random().toString(36).substr(2, 9), itemName: '', quantity: '1', sellingPrice: '0.00', costPrice: '0.00', type,
});

type ProductOption = {
    value: string;
    label: string;
    sku?: string;
    sellingPrice?: number;
    costPrice?: number;
    stockOnHand?: number;
    type?: 'item' | 'service';
};

// ── View Mode ─────────────────────────────────────────────────────────────────
type ViewMode = 'list' | 'grid';

const VIEWS = [
    { key: "all", label: "All Composite Items" },
    { key: "assembly", label: "Assembly Items" },
    { key: "kit", label: "Kit Items" },
    { key: "active", label: "Active Items" },
    { key: "inactive", label: "Inactive Items" },
    { key: "lowstock", label: "Low Stock Items" },
];

// ── Main Component ─────────────────────────────────────────────────────────────
const CompositeItem = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const location = useLocation();

    const isAdd = location.pathname.endsWith('/new');
    const isEdit = !!id && !isAdd;
    const isList = !isAdd && !isEdit;

    // ── List State ────────────────────────────────────────────────────
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [data, setData] = useState<CompositeItemEntry[]>(loadData);
    const [searchText, setSearchText] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<CompositeItemEntry | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [sidebarFilter, setSidebarFilter] = useState<string>('all');
    const [sidebarSearchText, setSidebarSearchText] = useState<string>('');
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
    const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
    const [filterTypes, setFilterTypes] = useState<string[]>([]);
    const [pendingFilterTypes, setPendingFilterTypes] = useState<string[]>([]);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [sidebarExpandedRows, setSidebarExpandedRows] = useState<string[]>([]);
    const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);

    const filterDropdownRef = useRef<HTMLDivElement>(null);
    const columnsDropdownRef = useRef<HTMLDivElement>(null);

    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
        'Name': true, 'Composition Type': true, 'Sku': true,
        'Stock On Hand': true, 'Reorder Level': true, 'Status': true,
    });
    const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
    const [selectedItem, setSelectedItem] = useState<CompositeItemEntry | null>(null);
    const [detailTab, setDetailTab] = useState<'overview' | 'transactions' | 'history'>('overview');
    const [txFilterBy, setTxFilterBy] = useState<string>('Sales Orders');
    const [txStatus, setTxStatus] = useState<string>('All');
    const [showTxFilterMenu, setShowTxFilterMenu] = useState(false);
    const [showTxStatusMenu, setShowTxStatusMenu] = useState(false);
    const [showCreateAssemblyModal, setShowCreateAssemblyModal] = useState(false);
    const [assemblyQty, setAssemblyQty] = useState('1');
    const [panelImages, setPanelImages] = useState<string[]>([]);
    const [panelActiveIdx, setPanelActiveIdx] = useState(0);
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const detailContentRef = useRef<HTMLDivElement>(null);

    // ── Mobile detection ──────────────────────────────────────────────
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Scroll to top when item changes
    useEffect(() => {
        if (detailContentRef.current) {
            detailContentRef.current.scrollTo(0, 0);
        }
    }, [selectedItem?.id]);

    useEffect(() => {
        if (isList) setData(loadData().filter(d => !d.isDeleted));
    }, [isList]);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
                setShowFilterDropdown(false);
            }
            if (columnsDropdownRef.current && !columnsDropdownRef.current.contains(e.target as Node)) {
                setShowColumnsDropdown(false);
            }
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const displayData = useMemo(() => {
        return [...data]
            .filter(d => filterTypes.length === 0 || (d.compositionType && filterTypes.includes(d.compositionType)))
            .filter(d => {
                if (!searchText.trim()) return true;
                const s = searchText.toLowerCase();
                return (
                    d.name?.toLowerCase().includes(s) ||
                    d.sku?.toLowerCase().includes(s) ||
                    d.compositionType?.toLowerCase().includes(s)
                );
            })
            .sort((a, b) => {
                const idA = Number(a.id);
                const idB = Number(b.id);
                const safeA = Number.isFinite(idA) ? idA : 0;
                const safeB = Number.isFinite(idB) ? idB : 0;
                return sortBy === 'newest' ? safeB - safeA : safeA - safeB;
            })
            .map(d => ({
                ...d,
                children: d.children?.map((c, i, arr) => ({
                    ...c,
                    isChild: true,
                    isFirstChild: i === 0,
                    isLastChild: i === arr.length - 1,
                })),
            }));
    }, [data, filterTypes, sortBy, searchText]);

     // Auto-expansion on refresh removed as requested. Items will remain collapsed by default.


    const handleDelete = () => {
        if (!deleteTarget) return;
        const nowStr = formatHistoryDate(new Date());
        const user = getCurrentUser();
        const all = loadData();
        const updated = all.map(d => {
            if (d.id !== deleteTarget.id) return d;
            const prevHistory = d.history || [];
            return { ...d, isDeleted: true, history: [...prevHistory, { date: nowStr, details: `"${d.name}" deleted by`, user }] };
        });
        saveData(updated);
        setData(updated.filter(d => !d.isDeleted));
        // Keep the panel open so user can see "deleted by" in History tab
        if (selectedItem?.id === deleteTarget.id) {
            const deletedEntry = updated.find(d => d.id === deleteTarget.id);
            if (deletedEntry) setSelectedItem({ ...deletedEntry });
        }
        setToast({ message: `"${deleteTarget.name}" has been deleted.`, type: 'success' });
        setDeleteTarget(null);
    };

    const handleExportCSV = () => {
        const headers = ['Name', 'Composition Type', 'SKU', 'Stock on Hand', 'Reorder Level', 'Unit'];
        const rows = data.map(r => [r.name, r.compositionType, r.sku, r.stockOnHand, r.reorderLevel, r.unit]);
        const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'composite-items.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        setToast({ message: 'Exported as CSV successfully.', type: 'success' });
    };

    const handleExportPDF = () => {
        const rows = data.map(r => `<tr><td>${r.name}</td><td>${r.compositionType}</td><td>${r.sku}</td><td>${r.stockOnHand}</td><td>${r.reorderLevel}</td></tr>`).join('');
        const html = `<html><head><title>Composite Items</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5;font-weight:600}</style></head><body><h2>Composite Items</h2><table><thead><tr><th>Name</th><th>Type</th><th>SKU</th><th>Stock on Hand</th><th>Reorder Level</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
        const win = window.open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); win.print(); }
    };

    const tableData = useMemo(() => {
        const result: CompositeItemEntry[] = [];
        displayData.forEach(item => {
            // Strip children from the parent item when adding to the flat list
            // to prevent the table component from double-rendering them.
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { children, ...parentWithoutChildren } = item;
            result.push({ ...parentWithoutChildren, _hasChildren: !!(children && children.length > 0) });

            if (expandedRowKeys.includes(String(item.id)) && item.children) {
                item.children.forEach((child, index) => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { children: _, ...childWithoutChildren } = child;
                    result.push({
                        ...childWithoutChildren,
                        isChild: true,
                        isLastChild: index === item.children!.length - 1
                    });
                });
            }
        });
        return result;
    }, [displayData, expandedRowKeys]);

    // ── Tree Connector Component ──────────────────────────────────────────────
    const TreeConnector = ({
        isChild,
        isLastChild,
        hasChildren,
        isExpanded
    }: {
        isChild?: boolean;
        isLastChild?: boolean;
        hasChildren?: boolean;
        isExpanded?: boolean
    }) => {
        const LINE_COLOR = '#d1d5db';
        const BLEED = 12; // Extra height to overlap rows and bridge gaps
        const LEFT_OFFSET = 20;

        return (
            <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 40,
                pointerEvents: 'none',
                zIndex: 1
            }}>
                {/* Vertical line coming from above (only for children) */}
                {isChild && (
                    <div style={{
                        position: 'absolute',
                        left: LEFT_OFFSET,
                        top: -BLEED,
                        bottom: '50%',
                        width: '1.5px',
                        backgroundColor: LINE_COLOR,
                    }} />
                )}

                {/* Vertical line going to below (for children who aren't last, or expanded parents) */}
                {((isChild && !isLastChild) || (hasChildren && isExpanded)) && (
                    <div style={{
                        position: 'absolute',
                        left: LEFT_OFFSET,
                        top: '50%',
                        bottom: -BLEED,
                        width: '1.5px',
                        backgroundColor: LINE_COLOR,
                    }} />
                )}

                {/* Horizontal hook for children */}
                {isChild && (
                    <div style={{
                        position: 'absolute',
                        left: LEFT_OFFSET,
                        top: '50%',
                        width: 14,
                        height: '1.5px',
                        backgroundColor: LINE_COLOR,
                    }} />
                )}
            </div>
        );
    };

    // ── Columns ───────────────────────────────────────────────────────
    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            render: (text: string, record: CompositeItemEntry) => {
                const isExpanded = expandedRowKeys.includes(String(record.id));
                const hasChildren = record._hasChildren;

                return (
                    <div className="d-flex align-items-center position-relative" style={{ minHeight: '44px', paddingLeft: record.isChild ? '44px' : '0' }}>
                        <TreeConnector
                            isChild={record.isChild}
                            isLastChild={record.isLastChild}
                            hasChildren={hasChildren}
                            isExpanded={isExpanded}
                        />

                        <div className="d-flex align-items-center gap-2" style={{ position: 'relative', zIndex: 2 }}>
                            {record.isChild ? (
                                <span className="text-dark fs-13">
                                    {text} {record.quantity && <span className="text-muted">( {record.quantity} )</span>}
                                    {record.sku && <span className="text-muted"> | SKU : {record.sku}</span>}
                                </span>
                            ) : (
                                <>
                                    <div
                                        className="d-flex align-items-center justify-content-center me-2"
                                        style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 6,
                                            cursor: hasChildren ? 'pointer' : 'default',
                                            backgroundColor: isExpanded && hasChildren ? '#fff0ee' : 'transparent',
                                            transition: 'background-color 0.2s ease',
                                        }}
                                        onClick={(e) => {
                                            if (!hasChildren) return;
                                            e.stopPropagation();
                                            setExpandedRowKeys(prev =>
                                                prev.includes(String(record.id))
                                                    ? prev.filter(k => k !== String(record.id))
                                                    : [...prev, String(record.id)]
                                            );
                                        }}
                                    >
                                        <i
                                            className={`ti ${hasChildren ? (isExpanded ? 'ti-folder-open' : 'ti-folder') : 'ti-folder'} fs-16`}
                                            style={{ color: isExpanded && hasChildren ? '#e41f07' : '#6c757d', transition: 'color 0.2s ease' }}
                                        />
                                    </div>
                                    <h6 className="fw-medium fs-14 mb-0" style={{ position: 'relative', zIndex: 10 }}>
                                        <Link to="#" className="text-primary"
                                            onClick={(e) => { e.preventDefault(); setSelectedItem(record); setDetailTab('overview'); setPanelImages(record.image ? [record.image] : []); setPanelActiveIdx(0); }}>
                                            {text}
                                        </Link>
                                    </h6>


                                </>
                            )}
                        </div>
                    </div>
                );
            },
            sorter: (a: CompositeItemEntry, b: CompositeItemEntry) => a.name.localeCompare(b.name),
        },
        {
            title: 'Composition Type',
            dataIndex: 'compositionType',
            render: (text: string, record: CompositeItemEntry) => record.isChild ? null : (
                <span className="fw-normal fs-14 text-dark">{text}</span>
            ),
            sorter: (a: CompositeItemEntry, b: CompositeItemEntry) => (a.compositionType || '').localeCompare(b.compositionType || ''),
        },
        {
            title: 'Sku',
            dataIndex: 'sku',
            render: (text: string, record: CompositeItemEntry) => record.isChild ? null : (
                <span className="fs-14 text-dark">{text || '—'}</span>
            ),
            sorter: (a: CompositeItemEntry, b: CompositeItemEntry) => (a.sku || '').localeCompare(b.sku || ''),
        },
        {
            title: 'Stock On Hand',
            dataIndex: 'stockOnHand',
            render: (val: number, record: CompositeItemEntry) => record.isChild ? null : (
                <span className="fs-14 text-dark">{val?.toFixed(2)}</span>
            ),
            sorter: (a: CompositeItemEntry, b: CompositeItemEntry) => (a.stockOnHand || 0) - (b.stockOnHand || 0),
        },
        {
            title: 'Reorder Level',
            dataIndex: 'reorderLevel',
            render: (val: number, record: CompositeItemEntry) => record.isChild ? null : (
                <span className="fs-14 text-dark">{val?.toFixed(2)}</span>
            ),
            sorter: (a: CompositeItemEntry, b: CompositeItemEntry) => (a.reorderLevel || 0) - (b.reorderLevel || 0),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            render: () => (
                <span className="badge badge-pill bg-soft-success text-success border-success-light">
                    <i className="ti ti-point-filled me-1" />Active
                </span>
            ),
        },
        {
            title: 'Action',
            dataIndex: 'action',
            render: (_: any, record: CompositeItemEntry) => (
                <div className="dropdown table-action">
                    <Link
                        to="#"
                        className="action-icon"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                        style={{ lineHeight: 1 }}
                    >
                        <MoreButton>
                            <i className="ti ti-dots-vertical" style={{ fontSize: 12, color: '#6c757d' }} />
                        </MoreButton>
                    </Link>
                    <div className="dropdown-menu dropdown-menu-right">
                        <Link className="dropdown-item" to="#"
                            onClick={(e) => { e.preventDefault(); navigate(route.compositeItemEdit?.replace(':id', String(record.id)) || '#'); }}>
                            <i className="ti ti-edit text-blue" /> Edit
                        </Link>
                        <Link className="dropdown-item" to="#" onClick={() => setDeleteTarget(record)}>
                            <i className="ti ti-trash text-danger" /> Delete
                        </Link>
                    </div>

                </div>
            ),

        },
    ];

    // ── Form State ────────────────────────────────────────────────────
    const [itemType, setItemType] = useState<'assembly' | 'kit'>('assembly');
    const [itemName, setItemName] = useState('');
    const [itemDescription, setItemDescription] = useState('');
    const [sku, setSku] = useState('');
    const [isReturnable, setIsReturnable] = useState(true);
    const [loading, setLoading] = useState(false);
    const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [image, setImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [itemRows, setItemRows] = useState<AssociateRow[]>([newRow('item')]);
    const [serviceRows, setServiceRows] = useState<AssociateRow[]>([]);
    const [showServiceSection, setShowServiceSection] = useState(false);
    const [rowMenuId, setRowMenuId] = useState<string | null>(null);

    // Close "more" row menu when clicking/touching outside.
    useEffect(() => {
        if (!rowMenuId) return;
        const onDocPointer = (e: MouseEvent | TouchEvent) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest?.('[data-row-menu="true"]')) return;
            setRowMenuId(null);
        };
        document.addEventListener('mousedown', onDocPointer);
        document.addEventListener('touchstart', onDocPointer);
        return () => {
            document.removeEventListener('mousedown', onDocPointer);
            document.removeEventListener('touchstart', onDocPointer);
        };
    }, [rowMenuId]);
    const [trackInventory, setTrackInventory] = useState(true);
    const [isSellable, setIsSellable] = useState(true);
    const [isPurchasable, setIsPurchasable] = useState(true);
    const [sellingPrice, setSellingPrice] = useState('');
    const [costPrice, setCostPrice] = useState('');
    const [salesDescription, setSalesDescription] = useState('');
    const [purchaseDescription, setPurchaseDescription] = useState('');
    const [salesAccount, setSalesAccount] = useState<any>({ value: 'sales', label: 'Sales' });
    const [purchaseAccount, setPurchaseAccount] = useState<any>({ value: 'cogs', label: 'Cost of Goods Sold' });
    const [selectedUnit, setSelectedUnit] = useState<any>(null);
    const [selectedCategory, setSelectedCategory] = useState<any>(null);
    const [selectedBrand, setSelectedBrand] = useState<any>(null);
    const [dimensionL, setDimensionL] = useState('');
    const [dimensionW, setDimensionW] = useState('');
    const [dimensionH, setDimensionH] = useState('');
    const [dimensionUnit, setDimensionUnit] = useState({ value: 'cm', label: 'cm' });
    const [weight, setWeight] = useState('');
    const [weightUnit, setWeightUnit] = useState({ value: 'kg', label: 'kg' });
    const [selectedManufacturer, setSelectedManufacturer] = useState<any>(null);
    const [upc, setUpc] = useState('');
    const [mpn, setMpn] = useState('');
    const [ean, setEan] = useState('');
    const [isbn, setIsbn] = useState('');
    const [selectedInventoryAccount, setSelectedInventoryAccount] = useState<any>(null);
    const [selectedValuation, setSelectedValuation] = useState<any>(null);
    const [reorderPoint, setReorderPoint] = useState('');
    const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
    const [brands, setBrands] = useState<{ value: string; label: string }[]>([]);
    const [vendors, setVendors] = useState<{ value: string; label: string }[]>([
        { value: 'vendor_a', label: 'Vendor A' },
        { value: 'vendor_b', label: 'Vendor B' },
    ]);
    const [selectedVendor, setSelectedVendor] = useState<any>(null);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showBrandModal, setShowBrandModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newBrandName, setNewBrandName] = useState('');
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
    const [categorySearch, setCategorySearch] = useState('');
    const [brandSearch, setBrandSearch] = useState('');
    const [showNewCategory, setShowNewCategory] = useState(false);
    const [priceListTypeView, setPriceListTypeView] = useState<'Sales' | 'Purchase'>('Sales');
    const [associatedPriceLists, setAssociatedPriceLists] = useState<any[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem("priceListData");
        if (stored) {
            try {
                const allLists = JSON.parse(stored);
                // Filter lists that include this item or apply to all items
                const filtered = allLists.filter((pl: any) => 
                    !pl.isDeleted && 
                    (pl.priceListType === 'All Items' || 
                     (pl.items && pl.items.some((it: any) => it.itemName === selectedItem?.name)))
                );
                setAssociatedPriceLists(filtered);
            } catch (e) { console.error(e); }
        }
    }, [selectedItem]);

    const [showAssociateModal, setShowAssociateModal] = useState(false);
    const [selectedPriceListId, setSelectedPriceListId] = useState<string>('');
    const [priceListOptions, setPriceListOptions] = useState<any[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem("priceListData");
        if (stored) {
            try {
                const all = JSON.parse(stored).filter((pl: any) => !pl.isDeleted);
                setPriceListOptions(all);
            } catch (e) { console.error(e); }
        }
    }, [showAssociateModal]);

    const handleAssociatePriceList = () => {
        if (!selectedPriceListId) {
            setToast({ message: 'Please select a price list.', type: 'error' });
            return;
        }

        const stored = localStorage.getItem("priceListData");
        if (stored && selectedItem) {
            try {
                const allLists = JSON.parse(stored);
                const plIndex = allLists.findIndex((pl: any) => String(pl.id) === String(selectedPriceListId));
                
                if (plIndex !== -1) {
                    const pl = allLists[plIndex];
                    if (!pl.items) pl.items = [];
                    
                    // Check if already exists
                    if (pl.items.some((it: any) => it.itemName === selectedItem.name)) {
                        setToast({ message: 'This item is already associated with the selected price list.', type: 'error' });
                        setShowAssociateModal(false);
                        return;
                    }

                    // Add new association
                    pl.items.push({
                        id: Math.max(0, ...pl.items.map((it: any) => it.id || 0)) + 1,
                        itemName: selectedItem.name,
                        salesRate: String(selectedItem.sellingPrice || '0.00'),
                        customRate: String(selectedItem.sellingPrice || '0.00'),
                        discountPct: '0',
                        selected: false
                    });

                    allLists[plIndex] = pl;
                    localStorage.setItem("priceListData", JSON.stringify(allLists));
                    
                    // Update local state to reflect changes instantly
                    setAssociatedPriceLists(prev => [...prev, pl]);
                    setToast({ message: 'Price list associated successfully.', type: 'success' });
                }
            } catch (e) {
                console.error(e);
                setToast({ message: 'Failed to associate price list.', type: 'error' });
            }
        }
        setShowAssociateModal(false);
    };

    const [isPriceListExpanded, setIsPriceListExpanded] = useState(true);
    const [showNewBrand, setShowNewBrand] = useState(false);

    // Close open select menus when clicking outside
    useEffect(() => {
        const h = (event: MouseEvent) => {
            const t = event.target as Element;
            if (t.closest('.custom-react-select') || t.closest('.modal')) return;
            if (openMenuId) setOpenMenuId(null);
        };
        if (openMenuId) document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [openMenuId]);

    const [units, setUnits] = useState([
        { value: 'box', label: 'BOX - box' }, { value: 'cm', label: 'CMS - cm' },
        { value: 'dz', label: 'DOZ - dz' }, { value: 'ft', label: 'FTS - ft' },
        { value: 'g', label: 'GMS - g' }, { value: 'kg', label: 'KGS - kg' },
        { value: 'lb', label: 'LBS - lb' }, { value: 'pcs', label: 'PCS - pcs' },
    ]);
    const [manufacturers, setManufacturers] = useState([
        { value: 'man_a', label: 'Manufacturer A' }, { value: 'man_b', label: 'Manufacturer B' },
    ]);
    const salesAccountOptions = [{ value: 'sales', label: 'Sales' }, { value: 'other_income', label: 'Other Income' }];
    const purchaseAccountOptions = [{ value: 'cogs', label: 'Cost of Goods Sold' }, { value: 'purchases', label: 'Purchases' }];
    const inventoryAccountOptions = [{ label: 'Stock', options: [{ value: 'inv_asset', label: 'Inventory Asset' }] }];
    const valuationMethods = [{ value: 'FIFO', label: 'FIFO (First In, First Out)' }, { value: 'WAC', label: 'WAC (Weighted Average Costing)' }];
    const dimensionUnits = [{ value: 'cm', label: 'cm' }, { value: 'in', label: 'in' }, { value: 'mm', label: 'mm' }, { value: 'm', label: 'm' }];
    const weightUnits = [{ value: 'kg', label: 'kg' }, { value: 'g', label: 'g' }, { value: 'lb', label: 'lb' }, { value: 'oz', label: 'oz' }];

    const totalItemSelling = itemRows.reduce((sum, r) => sum + (parseFloat(r.sellingPrice) || 0) * (parseFloat(r.quantity) || 0), 0);
    const totalItemCost = itemRows.reduce((sum, r) => sum + (parseFloat(r.costPrice) || 0) * (parseFloat(r.quantity) || 0), 0);
    const totalServiceSelling = serviceRows.reduce((sum, r) => sum + (parseFloat(r.sellingPrice) || 0) * (parseFloat(r.quantity) || 0), 0);
    const totalServiceCost = serviceRows.reduce((sum, r) => sum + (parseFloat(r.costPrice) || 0) * (parseFloat(r.quantity) || 0), 0);
    const totalSelling = totalItemSelling + totalServiceSelling;
    const totalCost = totalItemCost + totalServiceCost;
    const itemSelectedCount = itemRows.filter(r => r.itemName.trim()).length;
    const serviceSelectedCount = serviceRows.filter(r => r.itemName.trim()).length;
    const selectedItemOptions = itemRows
        .map(row => productOptions.find(opt => opt.value === row.productId || opt.label === row.itemName))
        .filter((opt): opt is ProductOption => !!opt);
    const isAssembly = itemType === 'assembly';
    const isKit = itemType === 'kit';

    useEffect(() => {
        // Load brands & categories from localStorage first (no API call needed)
        const loadCatalogs = () => {
            try {
                const storedBrands = localStorage.getItem('composite_brands');
                const storedCats = localStorage.getItem('composite_categories');
                setBrands(storedBrands ? JSON.parse(storedBrands) : [
                    { value: 'b1', label: 'General' },
                    { value: 'b2', label: 'Premium' },
                    { value: 'b3', label: 'Economy' },
                ]);
                setCategories(storedCats ? JSON.parse(storedCats) : [
                    { value: 'c1', label: 'General' },
                    { value: 'c2', label: 'Discounted' },
                    { value: 'c3', label: 'Seasonal' },
                ]);
            } catch {
                setBrands([
                    { value: 'b1', label: 'General' },
                    { value: 'b2', label: 'Premium' },
                    { value: 'b3', label: 'Economy' },
                ]);
                setCategories([
                    { value: 'c1', label: 'General' },
                    { value: 'c2', label: 'Discounted' },
                    { value: 'c3', label: 'Seasonal' },
                ]);
            }
        };
        loadCatalogs();

        // Load product options from localStorage (no API call)
        const loadProducts = () => {
            try {
                const stored = localStorage.getItem('composite_products');
                setProductOptions(stored ? JSON.parse(stored) : [
                    { value: '1', label: 'Sample Product 1', sku: 'SP-001', sellingPrice: 100, costPrice: 60, stockOnHand: 25, type: 'item' },
                    { value: '2', label: 'Sample Product 2', sku: 'SP-002', sellingPrice: 80, costPrice: 45, stockOnHand: 12, type: 'item' },
                    { value: '3', label: 'Sample Service', sku: 'SV-001', sellingPrice: 150, costPrice: 0, stockOnHand: 0, type: 'service' },
                ]);
            } catch {
                setProductOptions([
                    { value: '1', label: 'Sample Product 1', sku: 'SP-001', sellingPrice: 100, costPrice: 60, stockOnHand: 25, type: 'item' },
                    { value: '2', label: 'Sample Product 2', sku: 'SP-002', sellingPrice: 80, costPrice: 45, stockOnHand: 12, type: 'item' },
                    { value: '3', label: 'Sample Service', sku: 'SV-001', sellingPrice: 150, costPrice: 0, stockOnHand: 0, type: 'service' },
                ]);
            }
        };
        loadProducts();
    }, []);

    useEffect(() => {
        if (isEdit && id) {
            const found = loadData().find(d => d.id === Number(id));
            if (found) {
                setItemName(found.name);
                setSku(found.sku || '');
                setItemType(found.compositionType === 'Assembly' ? 'assembly' : 'kit');
                setReorderPoint(String(found.reorderLevel));
                if (found.category) setSelectedCategory({ value: found.category, label: found.category });
                if (found.brand) setSelectedBrand({ value: found.brand, label: found.brand });
                if (found.image) setPreviewUrl(found.image); // Load image
                setIsSellable(!!found.isSellable);
                setIsPurchasable(!!found.isPurchasable);
                setSellingPrice(String(found.sellingPrice ?? ''));
                setCostPrice(String(found.costPrice ?? ''));
                setSalesDescription(found.salesDescription || '');
                setPurchaseDescription(found.purchaseDescription || '');
                setIsReturnable(!!found.isReturnable);
                if (found.unit) setSelectedUnit({ value: found.unit, label: found.unit });
                if (found.preferredVendor) setSelectedVendor({ value: found.preferredVendor, label: found.preferredVendor });
                
                if (found.dimensions) {
                    const parts = found.dimensions.split('x').map(s => s.trim());
                    setDimensionL(parts[0] || '');
                    setDimensionW(parts[1] || '');
                    setDimensionH(parts[2] || '');
                }
                if (found.dimensionUnit) setDimensionUnit({ value: found.dimensionUnit, label: found.dimensionUnit });
                if (found.weight) setWeight(found.weight);
                if (found.weightUnit) setWeightUnit({ value: found.weightUnit, label: found.weightUnit });
                setUpc(found.upc || '');
                setEan(found.ean || '');
                setMpn(found.mpn || '');
                setIsbn(found.isbn || '');
                if (found.children && found.children.length > 0) {
                    const nextItemRows = found.children.filter(child => (child as any).type !== 'service').map((child, index) => ({
                        id: String(child.id ?? `${found.id}-${index + 1}`),
                        itemName: child.name || '',
                        quantity: child.quantity || '1',
                        sellingPrice: String((child as any).sellingPrice ?? 0),
                        costPrice: String((child as any).costPrice ?? 0),
                        type: ((child as any).type === 'service' ? 'service' : 'item') as 'item' | 'service',
                        stockOnHand: (child as any).stockOnHand,
                        productId: (child as any).productId ? String((child as any).productId) : undefined,
                    }));
                    const nextServiceRows = found.children.filter(child => (child as any).type === 'service').map((child, index) => ({
                        id: String(child.id ?? `${found.id}-s${index + 1}`),
                        itemName: child.name || '',
                        quantity: child.quantity || '1',
                        sellingPrice: String((child as any).sellingPrice ?? 0),
                        costPrice: String((child as any).costPrice ?? 0),
                        type: 'service' as const,
                        stockOnHand: (child as any).stockOnHand,
                        productId: (child as any).productId ? String((child as any).productId) : undefined,
                    }));
                    setItemRows(nextItemRows.length > 0 ? nextItemRows : [newRow('item')]);
                    setServiceRows(nextServiceRows);
                }
            }
        }
    }, [isEdit, id]);

    useEffect(() => {
        if (isKit) {
            setTrackInventory(false);
            setSelectedInventoryAccount(null);
            setSelectedValuation(null);
        } else {
            setTrackInventory(true);
        }
    }, [isKit]);

    useEffect(() => {
        if (productOptions.length === 0 || itemRows.length === 0) return;
    }, [productOptions, itemRows]);

    const buildRowFromProduct = (opt: ProductOption, existing?: AssociateRow): AssociateRow => ({
        id: existing?.id || Math.random().toString(36).substr(2, 9),
        itemName: opt.label,
        quantity: existing?.quantity || '1',
        sellingPrice: existing?.sellingPrice || opt.sellingPrice?.toFixed(2) || '0.00',
        costPrice: existing?.costPrice || opt.costPrice?.toFixed(2) || '0.00',
        type: opt.type === 'service' ? 'service' : 'item',
        productId: opt.value,
        stockOnHand: opt.stockOnHand || 0,
    });

    const updateItemRowProduct = (rowId: string, productValue: string) => {
        const opt = productOptions.find(p => p.value === productValue);
        setItemRows(prev => prev.map(row => {
            if (row.id !== rowId) return row;
            if (!opt) {
                return { ...row, productId: undefined, itemName: '', stockOnHand: 0 };
            }
            return buildRowFromProduct(opt, row);
        }));
    };

    const updateServiceRowProduct = (rowId: string, productValue: string) => {
        const opt = productOptions.find(p => p.value === productValue && p.type === 'service');
        setServiceRows(prev => prev.map(row => {
            if (row.id !== rowId) return row;
            if (!opt) {
                return { ...row, productId: undefined, itemName: '', stockOnHand: 0 };
            }
            return buildRowFromProduct(opt, row);
        }));
    };

    const handleSaveCategory = () => {
        const name = newCategoryName.trim();
        if (!name) return;
        let updatedCats: { value: string; label: string }[] = [];
        if (editingCategoryId) {
            setCategories(prev => {
                updatedCats = prev.map(c => c.value === editingCategoryId ? { ...c, label: name } : c);
                localStorage.setItem('composite_categories', JSON.stringify(updatedCats));
                return updatedCats;
            });
            if (selectedCategory?.value === editingCategoryId) setSelectedCategory({ value: editingCategoryId, label: name });
        } else {
            const newId = `local_${Date.now()}`;
            setCategories(prev => {
                updatedCats = [...prev, { value: newId, label: name }];
                localStorage.setItem('composite_categories', JSON.stringify(updatedCats));
                return updatedCats;
            });
        }
        setNewCategoryName('');
        setEditingCategoryId(null);
        setShowNewCategory(false);
    };

    const handleSaveBrand = () => {
        const name = newBrandName.trim();
        if (!name) return;
        let updatedBrands: { value: string; label: string }[] = [];
        if (editingBrandId) {
            setBrands(prev => {
                updatedBrands = prev.map(b => b.value === editingBrandId ? { ...b, label: name } : b);
                localStorage.setItem('composite_brands', JSON.stringify(updatedBrands));
                return updatedBrands;
            });
            if (selectedBrand?.value === editingBrandId) setSelectedBrand({ value: editingBrandId, label: name });
        } else {
            const newId = `local_${Date.now()}`;
            setBrands(prev => {
                updatedBrands = [...prev, { value: newId, label: name }];
                localStorage.setItem('composite_brands', JSON.stringify(updatedBrands));
                return updatedBrands;
            });
        }
        setNewBrandName('');
        setEditingBrandId(null);
        setShowNewBrand(false);
    };

    const handleCreateCategoryDirectly = (inputValue: string) => {
        if (!inputValue.trim()) return;
        const newId = `local_${Date.now()}`;
        const newCat = { value: newId, label: inputValue.trim() };
        setCategories(prev => {
            const updated = [...prev, newCat];
            localStorage.setItem('composite_categories', JSON.stringify(updated));
            return updated;
        });
        setSelectedCategory(newCat);
    };

    const handleCreateBrandDirectly = (inputValue: string) => {
        if (!inputValue.trim()) return;
        const newId = `local_${Date.now()}`;
        const newBrand = { value: newId, label: inputValue.trim() };
        setBrands(prev => {
            const updated = [...prev, newBrand];
            localStorage.setItem('composite_brands', JSON.stringify(updated));
            return updated;
        });
        setSelectedBrand(newBrand);
    };

    const handleDeleteCategory = (catId: string) => {
        if (!window.confirm('Are you sure you want to delete this category?')) return;
        setCategories(prev => {
            const updated = prev.filter(c => c.value !== catId);
            localStorage.setItem('composite_categories', JSON.stringify(updated));
            return updated;
        });
        if (selectedCategory?.value === catId) setSelectedCategory(null);
    };

    const handleDeleteBrand = (brandId: string) => {
        if (!window.confirm('Are you sure you want to delete this brand?')) return;
        setBrands(prev => {
            const updated = prev.filter(b => b.value !== brandId);
            localStorage.setItem('composite_brands', JSON.stringify(updated));
            return updated;
        });
        if (selectedBrand?.value === brandId) setSelectedBrand(null);
    };

    const handleSave = () => {
        if (!itemName.trim()) { alert('Please enter a name.'); return; }
        
        setLoading(true);
        const all = loadData();
        const getNumericId = (value: string | number) => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : 0;
        };
        const children = [...itemRows, ...serviceRows]
            .filter(r => r.itemName.trim())
            .map((row, index) => ({
                id: `${id || all.length + 1}-${index + 1}`,
                name: row.itemName,
                quantity: row.quantity,
                sku: '',
                isChild: true,
                type: row.type,
                sellingPrice: parseFloat(row.sellingPrice) || 0,
                costPrice: parseFloat(row.costPrice) || 0,
                productId: row.productId,
            }));
        const nowStr = formatHistoryDate(new Date());
        const user = getCurrentUser();
        
        const commonData = {
            name: itemName,
            sku,
            compositionType: itemType === 'assembly' ? 'Assembly' : 'Kit',
            reorderLevel: parseFloat(reorderPoint) || 0,
            category: selectedCategory?.label || '',
            brand: selectedBrand?.label || '',
            dimensions: [dimensionL, dimensionW, dimensionH].filter(Boolean).join(' x '),
            dimensionUnit: dimensionUnit?.value || 'cm',
            weight,
            weightUnit: weightUnit?.value || 'kg',
            upc,
            ean,
            mpn,
            isbn,
            children,
            image: previewUrl,
            isSellable,
            isPurchasable,
            sellingPrice: parseFloat(sellingPrice) || 0,
            costPrice: parseFloat(costPrice) || 0,
            salesDescription,
            purchaseDescription,
            unit: selectedUnit?.value || 'pcs',
            preferredVendor: selectedVendor?.label || '',
            isReturnable,
        };

        if (isEdit && id) {
            const idx = all.findIndex(a => String(a.id) === String(id));
            if (idx !== -1) {
                const prevHistory = all[idx].history || [];
                all[idx] = {
                    ...all[idx],
                    ...commonData,
                    stockOnHand: all[idx].stockOnHand ?? 0,
                    history: [...prevHistory, { date: nowStr, details: 'updated by', user }],
                };
            }
        } else {
            const newId = all.length > 0 ? Math.max(...all.map(a => getNumericId(a.id))) + 1 : 1;
            all.push({
                ...commonData,
                id: newId,
                stockOnHand: 0,
                history: [{ date: nowStr, details: 'created by', user }],
            });
        }
        saveData(all);
        setTimeout(() => { setLoading(false); navigate(route.compositeItems); }, 300);
    };

    // ── LIST VIEW ─────────────────────────────────────────────────────
    const listView = (
        <div className="page-wrapper" style={{ overflow: 'hidden' }}>
            <div className={`content ${selectedItem ? 'p-0' : 'pb-0'}`} style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
                {!selectedItem && (
                    <PageHeader
                        title="Composite Items"
                        badgeCount={data.length}
                        showModuleTile={false}
                        moduleTitle="Composite Items"
                        moduleLink={route.compositeItems}
                        showExport={false}

                        onRefresh={() => {
                            const all = loadData();
                            setData(all.filter(d => !d.isDeleted));
                        }}
                        exportComponent={
                            <div className="dropdown">
                                <Link to="#" className="dropdown-toggle btn btn-outline-light px-2 shadow" data-bs-toggle="dropdown">
                                    <i className="ti ti-package-export me-2" />Export
                                </Link>
                                <div className="dropdown-menu dropdown-menu-end">
                                    <ul>
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
                    />
                )}

                <div className="card mb-0 border-0 rounded-0 flex-grow-1" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* ── Condition: Standard List vs Master-Detail ── */}
                    {!selectedItem ? (
                        <>
                            <div className="card-header d-flex align-items-center justify-content-between gap-2 flex-wrap" style={{ flexShrink: 0 }}>
                                <div className="input-icon input-icon-start position-relative" style={{ width: '250px' }}>
                                    <span className="input-icon-addon text-dark">
                                        <i className="ti ti-search" />
                                    </span>
                                    <SearchInput value={searchText} onChange={setSearchText} />
                                </div>
                                <Link to={route.compositeItemAdd} className="btn btn-primary d-flex align-items-center gap-1 flex-shrink-0">
                                    <i className="ti ti-square-rounded-plus-filled me-1" />
                                    Add New Item
                                </Link>
                            </div>

                            <div className="card-body p-0" style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
                                    {/* Toolbar Header */}
                                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 p-3 pb-3">
                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                            <div className="dropdown">
                                                <Link to="#" className="dropdown-toggle btn btn-outline-light px-2 shadow" data-bs-toggle="dropdown">
                                                    <i className="ti ti-sort-ascending-2 me-2" /> Sort By
                                                </Link>
                                                <div className="dropdown-menu">
                                                    <ul>
                                                        <li><Link to="#" onClick={(e) => { e.preventDefault(); setSortBy('newest'); }} className={`dropdown-item ${sortBy === 'newest' ? 'active' : ''}`}>Newest</Link></li>
                                                        <li><Link to="#" onClick={(e) => { e.preventDefault(); setSortBy('oldest'); }} className={`dropdown-item ${sortBy === 'oldest' ? 'active' : ''}`}>Oldest</Link></li>
                                                    </ul>
                                                </div>
                                            </div>
                                            <PredefinedDatePicker />
                                        </div>
                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                            <div className="dropdown" ref={filterDropdownRef}>
                                                <Link to="#" className="btn btn-outline-light shadow px-2" onClick={(e) => { e.preventDefault(); setShowFilterDropdown(!showFilterDropdown); }}>
                                                    <i className="ti ti-filter me-2" /> Filter <i className="ti ti-chevron-down ms-2" />
                                                    {filterTypes.length > 0 && <span className="badge bg-primary ms-1">{filterTypes.length}</span>}
                                                </Link>
                                                <div className={`filter-dropdown-menu dropdown-menu dropdown-menu-lg p-0 ${showFilterDropdown ? 'show' : ''}`} style={showFilterDropdown ? { display: 'block', position: 'absolute', top: '100%', right: 0, zIndex: 1050 } : {}}>
                                                    <div className="filter-header d-flex align-items-center justify-content-between border-bottom p-3">
                                                        <h6 className="mb-0"><i className="ti ti-filter me-1" /> Filter </h6>
                                                        <button type="button" className="btn-close custom-btn-close border p-1 me-0 d-flex align-items-center justify-content-center rounded-circle" onClick={() => setShowFilterDropdown(false)} aria-label="Close">
                                                            <i className="ti ti-x" />
                                                        </button>
                                                    </div>
                                                    <div className="filter-set-view p-3">
                                                        <div className="accordion" id="filterAccordion">
                                                            <div className="filter-set-content border-bottom pb-3 mb-3">
                                                                <div className="filter-set-content-head">
                                                                    <Link to="#" className="collapsed fs-14 fw-medium text-dark d-block" data-bs-toggle="collapse" data-bs-target="#collapseType" aria-expanded="false">
                                                                        Type
                                                                    </Link>
                                                                </div>
                                                                <div className="filter-set-contents collapse show mt-2" id="collapseType">
                                                                    <div className="row g-2">
                                                                        {['Assembly', 'Kit'].map(t => (
                                                                            <div className="col-12" key={t}>
                                                                                <div className="form-check">
                                                                                    <input className="form-check-input" type="checkbox" id={`filter-${t}`}
                                                                                        checked={pendingFilterTypes.includes(t)}
                                                                                        onChange={() => setPendingFilterTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])} />
                                                                                    <label className="form-check-label fs-14 text-dark" htmlFor={`filter-${t}`}>
                                                                                        {t} Items
                                                                                    </label>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="filter-reset-btns d-flex align-items-center gap-2 mt-3">
                                                            <button type="button" className="btn btn-light w-100" onClick={() => { setPendingFilterTypes([]); setFilterTypes([]); setShowFilterDropdown(false); }}>Reset</button>
                                                            <button type="button" className="btn btn-primary w-100" onClick={() => { setFilterTypes([...pendingFilterTypes]); setShowFilterDropdown(false); }}>Filter</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {viewMode === 'list' && (
                                                <div className="dropdown" ref={columnsDropdownRef}>
                                                    <Link to="#" className="btn bg-soft-indigo px-2 border-0" data-bs-toggle="dropdown" data-bs-auto-close="outside">
                                                        <i className="ti ti-columns-3 me-2" /> Manage Columns
                                                    </Link>
                                                    <div className={`dropdown-menu dropdown-menu-md dropdown-md p-3 ${showColumnsDropdown ? 'show d-block' : ''}`} style={{ position: 'absolute', top: '100%', right: 0, zIndex: 1050 }}>
                                                        <ul>
                                                            {Object.keys(visibleColumns).map(col => (
                                                                <li className="gap-1 d-flex align-items-center mb-2" key={col}>
                                                                    <i className="ti ti-columns me-1" />
                                                                    <div className="form-check form-switch w-100 ps-0">
                                                                        <label className="form-check-label d-flex align-items-center gap-2 w-100 fs-14">
                                                                            <span>{col}</span>
                                                                            <input className="form-check-input switchCheckDefault ms-auto" type="checkbox" role="switch"
                                                                                checked={visibleColumns[col]}
                                                                                onChange={() => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))} />
                                                                        </label>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="d-flex align-items-center shadow p-1 rounded border view-icons bg-white ms-1">
                                                <Link to="#" className={`btn btn-sm p-1 border-0 fs-14 ${viewMode === 'list' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setViewMode('list'); }}>
                                                    <i className="ti ti-list-tree" />
                                                </Link>
                                                <Link to="#" className={`flex-shrink-0 btn btn-sm p-1 border-0 ms-1 fs-14 ${viewMode === 'grid' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setViewMode('grid'); }}>
                                                    <i className="ti ti-grid-dots" />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Full Table */}
                                    {viewMode === 'list' && (
                                        <div className="custom-table table-nowrap overflow-visible flex-grow-1">
                                            <Datatable
                                                columns={columns.filter(c => c.title === 'Action' || visibleColumns[c.title as string])}
                                                dataSource={tableData}
                                                Selection={true}
                                                searchText={searchText}
                                                expandable={{ expandIcon: () => null }}
                                                onRow={(record) => ({
                                                    onClick: (e: any) => {
                                                        const target = e.target as HTMLElement;
                                                        if (target.closest('.dropdown') || target.closest('.table-action') || target.closest('.action-icon')) {
                                                            return;
                                                        }
                                                        if (record.isChild) return;
                                                        setSelectedItem(record);
                                                        setDetailTab('overview');
                                                        setPanelImages(record.image ? [record.image] : []);
                                                        setPanelActiveIdx(0);
                                                    },
                                                    style: { cursor: record.isChild ? 'default' : 'pointer' },
                                                })}

                                                rowClassName={(record) => {
                                                    return !record.isChild && selectedItem !== null && String(record.id) === String(selectedItem?.id)
                                                        ? 'ant-table-row-selected-highlight'
                                                        : '';
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Full Grid */}
                                    {viewMode === 'grid' && (
                                        <div className="p-3">
                                            <div className="row g-3">
                                                {displayData.length === 0 ? (
                                                    <div className="col-12 text-center py-5 text-muted">
                                                        <i className="ti ti-box" style={{ fontSize: 48, opacity: 0.3 }} />
                                                        <p className="mt-2 text-dark">No composite items found.</p>
                                                    </div>
                                                ) : (
                                                    displayData.map(item => (
                                                        <div key={item.id} className="col-xxl-3 col-xl-4 col-md-6">
                                                            <div className="card border mb-0 shadow-none h-100 transition-all hover-shadow-sm">
                                                                <div className="card-body p-3">
                                                                    {/* Top Badges */}
                                                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                                                        <span className={`badge border-0 rounded-pill px-2 py-1 fs-11 fw-semibold ${item.compositionType === 'Kit' ? 'badge-soft-purple text-purple' : 'badge-soft-danger text-danger'}`}>
                                                                            {item.compositionType === 'Kit' ? 'Kit' : 'High'}
                                                                        </span>
                                                                        <span className="badge badge-soft-success text-success border-0 rounded-pill px-2 py-1 fs-11 fw-semibold">
                                                                            Active
                                                                        </span>
                                                                    </div>

                                                                    {/* Item Header (Gray bg block) */}
                                                                    <div className="d-flex align-items-center justify-content-between bg-light rounded-3 p-2 mb-3">
                                                                        <div className="d-flex align-items-center gap-2 overflow-hidden">
                                                                            <div className="avatar border rounded-circle bg-white shadow-sm flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: 38, height: 38 }}>
                                                                                <i className={`ti ${item.compositionType === 'Kit' ? 'ti-package' : 'ti-packages'} fs-20 text-muted`} />
                                                                            </div>
                                                                            <div className="overflow-hidden">
                                                                                <h5 className="fw-bold fs-14 mb-0 text-dark text-truncate cursor-pointer" onClick={() => { setSelectedItem(item); setDetailTab('overview'); }}>{item.name}</h5>
                                                                                <p className="fs-12 mb-0 text-muted text-truncate">{item.category || 'Category Name'}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="dropdown">
                                                                            <button className="btn btn-sm btn-white border bg-white shadow-none p-0 d-flex align-items-center justify-content-center rounded-2" style={{ width: 34, height: 34 }} data-bs-toggle="dropdown">
                                                                                <i className="ti ti-dots-vertical fs-14 text-muted" />
                                                                            </button>
                                                                            <div className="dropdown-menu dropdown-menu-right">
                                                                                <Link className="dropdown-item fs-13" to="#" onClick={(e) => { e.preventDefault(); navigate(route.compositeItemEdit?.replace(':id', String(item.id)) || '#'); }}>
                                                                                    <i className="ti ti-edit me-2" />Edit
                                                                                </Link>
                                                                                <div className="dropdown-divider" />
                                                                                <Link className="dropdown-item fs-13 text-danger" to="#" onClick={() => setDeleteTarget(item)}>
                                                                                    <i className="ti ti-trash me-2" />Delete
                                                                                </Link>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Description */}
                                                                    <p className="text-muted fs-13 mb-3" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '38px' }}>
                                                                        {item.description || 'Professional composite item management with hierarchical tracking and stock control system.'}
                                                                    </p>

                                                                    {/* Body stats */}
                                                                    <div className="mb-3">
                                                                        <div className="d-flex align-items-center gap-2 mb-2">
                                                                            <i className="ti ti-circle-check text-muted" style={{ fontSize: 13 }} />
                                                                            <span className="text-muted fs-13">Project ID :</span>
                                                                            <span className="text-dark fs-13 fw-medium">#{item.sku || '12145'}</span>
                                                                        </div>
                                                                        <div className="d-flex align-items-center gap-2 mb-2">
                                                                            <i className="ti ti-currency-dollar text-muted" style={{ fontSize: 13 }} />
                                                                            <span className="text-muted fs-13">Value :</span>
                                                                            <span className="text-dark fs-13 fw-medium">₹ {(item.stockOnHand ?? 0 * (item.costPrice ?? 0)).toLocaleString()}</span>
                                                                        </div>
                                                                        <div className="d-flex align-items-center gap-2">
                                                                            <i className="ti ti-calendar text-muted" style={{ fontSize: 13 }} />
                                                                            <span className="text-muted fs-13">Due Date :</span>
                                                                            <span className="text-dark fs-13 fw-medium">15 Oct 2023</span>
                                                                        </div>
                                                                    </div>


                                                                    {/* Footer / Meta */}
                                                                    <div className="d-flex align-items-center justify-content-between pt-3 border-top">
                                                                        <div className="avatar-group d-flex align-items-center">
                                                                            <div className="avatar avatar-xs rounded-circle border border-white" style={{ position: 'relative', zIndex: 3, background: '#eee', width: 22, height: 22 }}></div>
                                                                            <div className="avatar avatar-xs rounded-circle border border-white" style={{ position: 'relative', zIndex: 2, background: '#ddd', marginLeft: -8, width: 22, height: 22 }}></div>
                                                                            <div className="avatar avatar-xs rounded-circle border border-white d-flex align-items-center justify-content-center fw-bold text-muted fs-9" style={{ position: 'relative', zIndex: 1, background: '#f5f5f5', marginLeft: -8, width: 22, height: 22 }}>+05</div>
                                                                        </div>
                                                                        <div className="d-flex align-items-center gap-1 border rounded-circle bg-soft-primary p-1" style={{ width: 26, height: 26 }}>
                                                                            <i className="ti ti-brand-chrome text-primary fs-12 mx-auto" />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="card-footer bg-white border-top p-3 d-flex align-items-center justify-content-between">
                                                                    <div className="badge badge-soft-indigo rounded-pill px-2 py-1 fs-12 d-flex align-items-center gap-2">
                                                                        <i className="ti ti-packages fs-13" />
                                                                        <span>Total Stock : {(item.stockOnHand ?? 0).toFixed(0)}</span>
                                                                    </div>
                                                                    <div className="d-flex align-items-center gap-2 text-muted fs-12">
                                                                        <span className="d-flex align-items-center gap-1"><i className="ti ti-message-2 fs-14" /> 02</span>
                                                                        <span className="d-flex align-items-center gap-1"><i className="ti ti-files fs-14" /> 04</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        /* ── Master-Detail Layout ── */
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>

                            {/* 1. LEFT PANE: Navigation List */}
                            <div className="sidebar-wrapper" style={{ width: (sidebarCollapsed || isMobile) ? 0 : 320, flexShrink: 0, borderRight: (sidebarCollapsed || isMobile) ? '0' : '1px solid #e9ecef', display: 'flex', flexDirection: 'column', background: '#f8f9fa' }}>
                                {/* Nav Header */}
                                <div className="p-3 border-bottom d-flex align-items-center justify-content-between bg-white sticky-top" style={{ minHeight: '60px', zIndex: 10 }}>
                                    <div className="dropdown">
                                        <div className="d-flex align-items-center gap-1 cursor-pointer" data-bs-toggle="dropdown">
                                            <h6 className="mb-0 fw-bold fs-15 text-dark">All Composite Items</h6>
                                            <i className="ti ti-chevron-down fs-11 text-muted" />
                                        </div>
                                        <div className="dropdown-menu shadow border" style={{ minWidth: 200 }}>
                                            {VIEWS.map(v => (
                                                <button 
                                                    key={v.key} 
                                                    className={`dropdown-item fs-13 ${sidebarFilter === v.key ? 'active' : ''}`} 
                                                    style={{
                                                        backgroundColor: sidebarFilter === v.key ? '#e41f07' : 'transparent',
                                                        color: sidebarFilter === v.key ? '#fff' : '#44566c',
                                                        transition: 'all 0.2s',
                                                    }}
                                                    onMouseEnter={e => {
                                                        if (sidebarFilter !== v.key) {
                                                            e.currentTarget.style.backgroundColor = '#fff5f5';
                                                            e.currentTarget.style.color = '#e41f07';
                                                        }
                                                    }}
                                                    onMouseLeave={e => {
                                                        if (sidebarFilter !== v.key) {
                                                            e.currentTarget.style.backgroundColor = 'transparent';
                                                            e.currentTarget.style.color = '#44566c';
                                                        }
                                                    }}
                                                    onClick={() => setSidebarFilter(v.key)}
                                                >
                                                    {v.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-center gap-1">
                                        <button 
                                            className="btn btn-primary d-flex align-items-center justify-content-center p-0 rounded" 
                                            style={{ width: '28px', height: '28px', backgroundColor: '#e41f07', borderColor: '#e41f07' }} 
                                            onClick={() => navigate(route.compositeItemAdd)}
                                        >
                                            <i className="ti ti-plus fs-14" />
                                        </button>
                                        <div className="dropdown">
                                            <button 
                                                className="btn btn-light border d-flex align-items-center justify-content-center p-0 rounded shadow-none" 
                                                style={{ width: '28px', height: '28px' }}
                                                data-bs-toggle="dropdown"
                                            >
                                                <i className="ti ti-dots-vertical fs-14 text-muted" />
                                            </button>
                                            <div className="dropdown-menu dropdown-menu-end shadow border p-0" style={{ minWidth: 160 }}>
                                                <button className="dropdown-item py-2 d-flex align-items-center gap-2 fs-13" onClick={() => { setData(loadData().filter(d => !d.isDeleted)); setSearchText(''); setSidebarSearchText(''); setToast({ message: 'List refreshed.', type: 'success' }); }}>
                                                    <i className="ti ti-refresh text-muted" /> Refresh List
                                                </button>
                                                <div className="dropdown-divider m-0" />
                                                <button className="dropdown-item py-2 d-flex align-items-center gap-2 fs-13" onClick={handleExportPDF}>
                                                    <i className="ti ti-file-type-pdf text-muted" /> Export PDF
                                                </button>
                                                <button className="dropdown-item py-2 d-flex align-items-center gap-2 fs-13" onClick={handleExportCSV}>
                                                    <i className="ti ti-file-type-xls text-muted" /> Export Excel
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* List Context */}
                                <div style={{ flex: 1, overflowY: 'auto' }} className="bg-white scrollable-y">
                                    {(() => {
                                        const filteredItems = displayData
                                            .filter(d => {
                                                if (sidebarFilter === 'all') return true;
                                                if (sidebarFilter === 'assembly') return d.compositionType === 'Assembly';
                                                if (sidebarFilter === 'kit') return d.compositionType === 'Kit';
                                                if (sidebarFilter === 'lowstock') return (d.stockOnHand ?? 0) < (d.reorderLevel ?? 0);
                                                return true;
                                            })
                                            .filter(d => d.name.toLowerCase().includes(sidebarSearchText.toLowerCase()));

                                        const renderSidebarItem = (item: CompositeItemEntry, level = 0, isLast = false, parentExpanded = true) => {
                                            const isExpanded = sidebarExpandedRows.includes(String(item.id));
                                            const hasChildren = item.children && item.children.length > 0;
                                            const isActive = selectedItem?.id === item.id;

                                            return (
                                                <React.Fragment key={item.id}>
                                                    <div
                                                        className={`d-flex align-items-center px-4 py-2 border-bottom cursor-pointer position-relative ${isActive ? '' : 'hover-bg-light'}`}
                                                        onClick={() => { setSelectedItem(item); setDetailTab('overview'); }}
                                                        style={{ 
                                                            paddingLeft: `0px`,
                                                            backgroundColor: isActive ? '#fff5f5' : 'transparent',
                                                            borderLeft: isActive ? '3px solid #e41f07' : '3px solid transparent',
                                                            minHeight: '40px',
                                                            paddingRight: '12px'
                                                        }}
                                                    >
                                                        {/* Tree Lines (Static Axis at 28px - Foolproof alignment) */}
                                                        {level > 0 && (
                                                            <>
                                                                <div className="position-absolute" style={{ 
                                                                    left: 28, 
                                                                    top: 0, 
                                                                    bottom: isLast ? '50%' : '100%', 
                                                                    width: 1, 
                                                                    background: '#bbbbbb',
                                                                    zIndex: 1
                                                                }} />
                                                                <div className="position-absolute" style={{ 
                                                                    left: 28, 
                                                                    top: '50%', 
                                                                    width: 12, 
                                                                    height: 1, 
                                                                    background: '#bbbbbb',
                                                                    zIndex: 1
                                                                }} />
                                                            </>
                                                        )}

                                                        <div className="d-flex align-items-center gap-0 min-width-0 flex-grow-1" style={{ position: 'relative', zIndex: 2 }}>
                                                            {/* Checkbox Slot (Fixed Width 20px) */}
                                                            <div className="d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 20 }}>
                                                                {level === 0 && (
                                                                    <div className="form-check mb-0">
                                                                        <input
                                                                            className="form-check-input m-0 rounded-1"
                                                                            type="checkbox"
                                                                            checked={selectedRows.includes(String(item.id))}
                                                                            onChange={() => setSelectedRows(prev => prev.includes(String(item.id)) ? prev.filter(x => x !== String(item.id)) : [...prev, String(item.id)])}
                                                                            onClick={e => e.stopPropagation()}
                                                                            style={{ width: '13px', height: '13px' }}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Folder Icon Slot - Centered exactly on 28px Axis (20 + 8) */}
                                                            {level === 0 && (
                                                                <div className="d-flex align-items-center justify-content-center flex-shrink-0 position-relative" style={{ width: 16 }}>
                                                                    <div 
                                                                        className="d-flex align-items-center justify-content-center cursor-pointer" 
                                                                        style={{ width: 16, height: 16, position: 'relative', zIndex: 3 }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (hasChildren) {
                                                                                setSidebarExpandedRows(prev => prev.includes(String(item.id)) ? prev.filter(x => x !== String(item.id)) : [...prev, String(item.id)]);
                                                                            }
                                                                        }}
                                                                    >
                                                                        <i className={`ti ${isExpanded ? 'ti-folder-open text-primary' : 'ti-folder'} text-muted fs-14`} />
                                                                    </div>
                                                                    {/* Vertical segment connecting icon to children below */}
                                                                    {isExpanded && hasChildren && (
                                                                        <div className="position-absolute" style={{ 
                                                                            left: '50%', 
                                                                            top: '10px', 
                                                                            bottom: '-16px', 
                                                                            width: 1, 
                                                                            background: '#bbbbbb',
                                                                            zIndex: 1
                                                                        }} />
                                                                    )}
                                                                </div>
                                                            )}
                                                            
                                                            <div className="min-width-0" style={{ marginLeft: level === 0 ? '6px' : '40px' }}>
                                                                <p className={`mb-0 fs-13 text-truncate ${level === 0 ? 'text-primary fw-medium' : 'text-dark'}`}>
                                                                    {item.name}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {hasChildren && isExpanded && item.children!.map((child, idx) => 
                                                        renderSidebarItem(child, level + 1, idx === item.children!.length - 1, isExpanded)
                                                    )}
                                                </React.Fragment>
                                            );
                                        };

                                        return filteredItems.map((item, idx) => renderSidebarItem(item, 0, idx === filteredItems.length - 1));
                                    })()}
                                </div>
                            </div>

                            {/* 2. RIGHT PANE: Detail View */}
                            <div className="detail-pane-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
                                {/* Detail Header */}
                                <div className="px-3 py-2 border-bottom d-flex align-items-center justify-content-between sticky-top bg-white" style={{ minHeight: '64px', zIndex: 10 }}>
                                    <div className="d-flex align-items-center gap-3">
                                        {/* Mobile: back button */}
                                        {isMobile ? (
                                            <button
                                                className="item-nav-btn me-1"
                                                title="Back to list"
                                                onClick={() => setSelectedItem(null)}
                                            >
                                                <i className="ti ti-arrow-left" />
                                            </button>
                                        ) : null}




                                        <div>
                                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                                <h4 className="mb-0 fw-bold fs-18 text-dark">{selectedItem.name}</h4>
                                                {selectedItem.isDeleted && (
                                                    <span className="badge bg-danger bg-opacity-10 text-danger border border-danger fs-11 fw-semibold px-2 py-1">
                                                        <i className="ti ti-trash me-1" style={{ fontSize: 10 }} />Deleted
                                                    </span>
                                                )}
                                            </div>
                                            <div className="d-flex align-items-center gap-2 text-muted fs-12 mt-1">
                                                {selectedItem.isReturnable && (
                                                    <span className="d-flex align-items-center gap-1">
                                                        <i className="ti ti-refresh fs-12 text-muted" /> Returnable Item
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="d-flex align-items-center gap-2">
                                        {!selectedItem.isDeleted && (
                                            <>
                                                <button
                                                    className="btn btn-sm btn-white border shadow-none d-flex align-items-center justify-content-center rounded-2"
                                                    style={{ width: '34px', height: '34px', padding: 0 }}
                                                    onClick={() => navigate(route.compositeItemEdit.replace(':id', String(selectedItem.id)))}
                                                >
                                                    <i className="ti ti-pencil fs-15 text-dark" />
                                                </button>
                                                <button
                                                    className="btn btn-primary px-3 fs-13 fw-semibold d-flex align-items-center rounded-2"
                                                    style={{ height: '34px', backgroundColor: '#e41f07', borderColor: '#e41f07' }}
                                                    onClick={() => { setAssemblyQty('1'); setShowCreateAssemblyModal(true); }}
                                                >
                                                    Create Assemblies
                                                </button>

                                                <div className="dropdown">
                                                    <button className="btn btn-sm btn-white border shadow-none dropdown-toggle px-3 fs-13 fw-semibold rounded-2" style={{ height: '34px' }} data-bs-toggle="dropdown">More</button>
                                                    <div className="dropdown-menu dropdown-menu-right">
                                                        <Link to="#" className="dropdown-item fs-13" onClick={() => navigate(route.compositeItemEdit.replace(':id', String(selectedItem.id)))}>
                                                            <i className="ti ti-edit me-2" />Edit
                                                        </Link>
                                                        <Link to="#" className="dropdown-item fs-13" onClick={() => { setAssemblyQty('1'); setShowCreateAssemblyModal(true); }}>
                                                            <i className="ti ti-stack-2 me-2" />Create Assembly
                                                        </Link>
                                                        <div className="dropdown-divider" />
                                                        <Link to="#" className="dropdown-item fs-13 text-danger" onClick={() => { setDeleteTarget(selectedItem); }}>
                                                            <i className="ti ti-trash me-2" />Delete
                                                        </Link>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                        <button className="btn btn-sm btn-white border-0 shadow-none p-0 ms-1 d-flex align-items-center justify-content-center" onClick={() => setSelectedItem(null)} style={{ width: '34px', height: '34px' }}>
                                            <i className="ti ti-x fs-20 text-muted" />
                                        </button>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className="ci-tabs-row border-bottom px-3 d-flex align-items-center bg-white" style={{ flexShrink: 0 }}>
                                    {(['overview', 'transactions', 'history'] as const).map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setDetailTab(tab)}
                                            className={`nav-link border-0 bg-transparent py-3 px-4 fs-14 fw-medium position-relative ${detailTab === tab ? 'text-primary' : 'text-muted'}`}
                                            style={{ color: detailTab === tab ? '#e41f07' : '#6c757d' }}
                                        >
                                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                            {detailTab === tab && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: '#e41f07', borderRadius: '3px 3px 0 0' }} />}
                                        </button>
                                    ))}
                                </div>

                                {/* Content Scrollable */}
                                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }} className="bg-white">
                                    {detailTab === 'overview' && (
                                        <div className="ci-overview-row row g-4 overflow-visible">
                                            {/* MAIN CONTENT (FULL WIDTH) */}
                                            <div className="col-lg-12">
                                                {/* Primary Details Table */}
                                                <div className="row g-4">
                                                    {/* LEFT COLUMN: PRIMARY DETAILS (70%) */}
                                                    <div className="col-lg-7">
                                                        <div className="mb-4">
                                                            <h6 className="text-dark fs-15 fw-bold mb-3">Primary Details</h6>
                                                            {[
                                                                { label: 'Item Name', value: selectedItem.name, color: '#e41f07' },
                                                                { label: 'Item Type', value: 'Inventory Items' },
                                                                { label: 'SKU', value: selectedItem.sku || '—' },
                                                                { label: 'Category', value: selectedItem.category || '—' },
                                                                { label: 'Unit', value: selectedItem.unit || '—' },
                                                                { label: 'Dimensions', value: selectedItem.dimensions ? `${selectedItem.dimensions} ${selectedItem.dimensionUnit || ''}` : '—' },
                                                                { label: 'Weight', value: selectedItem.weight ? `${selectedItem.weight} ${selectedItem.weightUnit || ''}` : '—' },
                                                                { label: 'MPN', value: selectedItem.mpn || '—' },
                                                                { label: 'Manufacturer', value: selectedItem.manufacturer || '—' },
                                                                { label: 'Brand', value: selectedItem.brand || '—' },
                                                                { label: 'Created Source', value: selectedItem.createdSource || 'User' },
                                                                { label: 'Inventory Account', value: selectedItem.inventoryAccount || 'Inventory Asset' },
                                                            ].map((field, idx) => (
                                                            <div key={idx} className="row g-0 py-2 align-items-center">
                                                                <div className="col-5 text-muted fs-13">{field.label}</div>
                                                                <div className="col-7 fs-13 fw-medium" style={{ color: field.color || '#212529' }}>{field.value}</div>
                                                            </div>
                                                            ))}
                                                        </div>

                                                        {/* Purchase Information */}
                                                        <div className="mb-5">
                                                            <h6 className="text-dark fs-15 fw-bold mb-3">Purchase Information</h6>
                                                            <div className="row g-0 py-2 align-items-center">
                                                                <div className="col-5 text-muted fs-13">Cost Price</div>
                                                                <div className="col-7 text-dark fs-13 fw-medium">₹{(selectedItem.costPrice || 0).toFixed(2)}</div>
                                                            </div>
                                                            <div className="row g-0 py-2 align-items-center">
                                                                <div className="col-5 text-muted fs-13">Purchase Account</div>
                                                                <div className="col-7 text-dark fs-13">Cost of Goods Sold</div>
                                                            </div>
                                                            <div className="row g-0 py-2 align-items-center">
                                                                <div className="col-5 text-muted fs-13">Description</div>
                                                                <div className="col-7 text-dark fs-13">{selectedItem.purchaseDescription || '—'}</div>
                                                            </div>
                                                        </div>

                                                        {/* Sales Information */}
                                                        <div className="mb-5">
                                                            <h6 className="text-dark fs-15 fw-bold mb-3">Sales Information</h6>
                                                            <div className="row g-0 py-2 align-items-center">
                                                                <div className="col-5 text-muted fs-13">Selling Price</div>
                                                                <div className="col-7 text-dark fs-13 fw-medium">₹{(selectedItem.sellingPrice || 0).toFixed(2)}</div>
                                                            </div>
                                                            <div className="row g-0 py-2 align-items-center">
                                                                <div className="col-5 text-muted fs-13">Sales Account</div>
                                                                <div className="col-7 text-dark fs-13">Sales</div>
                                                            </div>
                                                            <div className="row g-0 py-2 align-items-center">
                                                                <div className="col-5 text-muted fs-13">Description</div>
                                                                <div className="col-7 text-dark fs-13">{selectedItem.salesDescription || '—'}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* RIGHT COLUMN: IMAGE & STOCK SIDEBAR (30%) */}
                                                    <div className="col-lg-5">
                                                        <div className="ms-lg-3">
                                                            {/* Image Preview Card */}
                                                            <div className="card border rounded-3 shadow-sm overflow-hidden mb-4">
                                                                <div className="position-relative p-3 bg-white" style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    {selectedItem.image ? (
                                                                        <img src={selectedItem.image} alt={selectedItem.name} className="img-fluid rounded" style={{ maxHeight: '200px', objectFit: 'contain' }} />
                                                                    ) : (
                                                                        <div 
                                                                            className="w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-light border-dashed cursor-pointer" 
                                                                            style={{ border: '2px dashed #ddd', borderRadius: 10, minHeight: 180 }}
                                                                            onClick={() => document.getElementById('composite-img-upload-panel')?.click()}
                                                                        >
                                                                            <i className="ti ti-photo-plus text-muted mb-2" style={{ fontSize: 32 }} />
                                                                            <span className="text-muted fs-12 fw-medium">Click to add primary image</span>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {/* Action Icons Overlays */}
                                                                    {selectedItem.image && (
                                                                        <>
                                                                            <div 
                                                                                className="position-absolute bottom-0 start-0 m-3 px-2 py-1 bg-soft-success text-success fs-11 fw-bold rounded d-flex align-items-center gap-1"
                                                                                style={{ backgroundColor: '#e6f4ea', color: '#0d8a56' }}
                                                                            >
                                                                                <i className="ti ti-circle-check-filled fs-12" /> Primary
                                                                            </div>
                                                                            <div 
                                                                                className="position-absolute bottom-0 end-0 m-3 p-1 text-muted hover-text-danger cursor-pointer"
                                                                                onClick={() => {
                                                                                    const all = loadData();
                                                                                    const updated = updateItemInHierarchy(all, selectedItem.id, { image: '' });
                                                                                    saveData(updated);
                                                                                    setData(updated.filter(d => !d.isDeleted));
                                                                                    setSelectedItem({ ...selectedItem, image: '' });
                                                                                    setToast({ message: 'Primary image removed.', type: 'success' });
                                                                                }}
                                                                            >
                                                                                <i className="ti ti-trash fs-18" />
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Hidden File Input */}
                                                            <input
                                                                id="composite-img-upload-panel"
                                                                type="file"
                                                                hidden
                                                                accept="image/*"
                                                                onChange={async (e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        setImage(file);
                                                                        try {
                                                                            const dataUrl = await compressImage(file);
                                                                            setPreviewUrl(dataUrl);
                                                                            
                                                                            // Auto-save changes in overview tab
                                                                            const all = loadData();
                                                                            const updated = all.map(d => d.id === selectedItem.id ? { ...d, image: dataUrl } : d);
                                                                            saveData(updated);
                                                                            setSelectedItem({ ...selectedItem, image: dataUrl });
                                                                            setToast({ message: 'Primary image updated successfully.', type: 'success' });
                                                                        } catch (err: any) {
                                                                            setToast({ message: err.message || 'Failed to compress image.', type: 'error' });
                                                                        }
                                                                    }
                                                                    e.target.value = '';
                                                                }}
                                                            />

                                                            {/* Stock Info Breakdown */}
                                                            <div className="stock-info-vertical">
                                                                {/* Opening Stock */}
                                                                <div className="d-flex align-items-center justify-content-between mb-4 mt-2">
                                                                    <div className="d-flex align-items-center gap-2">
                                                                        <span className="fs-16 fw-bold text-dark border-bottom border-dark border-dotted">Opening Stock : {(selectedItem.stockOnHand || 0).toFixed(2)}</span>
                                                                    </div>
                                                                    <Link to="#" className="text-primary fs-14 d-flex align-items-center gap-1" style={{ color: '#0066ff' }}>
                                                                        <i className="ti ti-pencil fs-16" /> Edit
                                                                    </Link>
                                                                </div>

                                                                {/* Accounting Stock */}
                                                                <div className="mb-4">
                                                                    <h6 className="fs-18 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                                                                        Accounting Stock <i className="ti ti-info-circle fs-16 text-muted cursor-pointer" />
                                                                    </h6>
                                                                    <div className="d-flex flex-column gap-3 ps-1">
                                                                        <div className="d-flex align-items-center justify-content-between">
                                                                            <span className="text-dark fs-14 border-bottom border-dark border-dotted">Stock on Hand</span>
                                                                            <span className="text-dark fs-14 fw-medium">: {(selectedItem.stockOnHand || 0).toFixed(2)}</span>
                                                                        </div>
                                                                        <div className="d-flex align-items-center justify-content-between">
                                                                            <span className="text-dark fs-14 border-bottom border-dark border-dotted">Committed Stock</span>
                                                                            <span className="text-dark fs-14 fw-medium">: 0.00</span>
                                                                        </div>
                                                                        <div className="d-flex align-items-center justify-content-between">
                                                                            <span className="text-dark fs-14 border-bottom border-dark border-dotted">Available for Sale</span>
                                                                            <span className="text-dark fs-14 fw-medium">: {(selectedItem.stockOnHand || 0).toFixed(2)}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Physical Stock */}
                                                                <div className="mb-4">
                                                                    <h6 className="fs-18 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                                                                        Physical Stock <i className="ti ti-info-circle fs-16 text-muted cursor-pointer" />
                                                                    </h6>
                                                                    <div className="d-flex flex-column gap-3 ps-1 pb-4 border-bottom">
                                                                        <div className="d-flex align-items-center justify-content-between">
                                                                            <span className="text-dark fs-14 border-bottom border-dark border-dotted">Stock on Hand</span>
                                                                            <span className="text-dark fs-14 fw-medium">: {(selectedItem.stockOnHand || 0).toFixed(2)}</span>
                                                                        </div>
                                                                        <div className="d-flex align-items-center justify-content-between">
                                                                            <span className="text-dark fs-14 border-bottom border-dark border-dotted">Committed Stock</span>
                                                                            <span className="text-dark fs-14 fw-medium">: 0.00</span>
                                                                        </div>
                                                                        <div className="d-flex align-items-center justify-content-between">
                                                                            <span className="text-dark fs-14 border-bottom border-dark border-dotted">Available for Sale</span>
                                                                            <span className="text-dark fs-14 fw-medium">: {(selectedItem.stockOnHand || 0).toFixed(2)}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Status Cards */}
                                                                <div className="d-flex flex-column gap-3 mb-4">
                                                                    {[
                                                                        { value: '0', label: 'To be Shipped' },
                                                                        { value: '0', label: 'To be Received' },
                                                                        { value: '0', label: 'To be Invoiced' },
                                                                        { value: '0', label: 'To be Billed' },
                                                                    ].map((card, idx) => (
                                                                        <div key={idx} className="card border rounded-3 border-light-subtle shadow-none mb-0 bg-white" style={{ minWidth: 160 }}>
                                                                            <div className="card-body p-3">
                                                                                <div className="d-flex align-items-baseline gap-2">
                                                                                    <h3 className="mb-0 fw-bold">{card.value}</h3>
                                                                                    <span className="text-muted fs-12">Qty</span>
                                                                                </div>
                                                                                <p className="text-dark fs-13 mb-0 mt-1">{card.label}</p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* Reorder Point */}
                                                                <div className="mt-2">
                                                                    <span className="text-dark fs-14 d-block mb-1">Reorder point</span>
                                                                    <h4 className="fw-bold fs-20">{selectedItem.reorderLevel || '3.00'}</h4>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>



                                                {/* Reporting Tags */}
                                                <div className="mb-5">
                                                    <h6 className="text-dark fs-15 fw-bold mb-2">Reporting Tags</h6>
                                                    <p className="text-muted fs-13 mb-0">No reporting tag has been associated with this item.</p>
                                                </div>

                                                {/* Associated Price Lists Section */}
                                                <div className="mb-5">
                                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                                        <div 
                                                            className="fs-14 fw-bold d-flex align-items-center gap-2 text-dark cursor-pointer select-none"
                                                            onClick={() => setIsPriceListExpanded(!isPriceListExpanded)}
                                                        >
                                                            Associated Price Lists 
                                                            <i className={`ti ${isPriceListExpanded ? 'ti-chevron-down' : 'ti-chevron-right'} fs-11 text-muted`} />
                                                        </div>
                                                        {isPriceListExpanded && (
                                                            <div className="btn-group p-1 bg-light rounded" style={{ border: '1px solid #dee2e6' }}>
                                                                <button 
                                                                    className={`btn btn-sm px-3 border-0 rounded ${priceListTypeView === 'Sales' ? 'bg-primary text-white shadow-sm' : 'text-muted'}`}
                                                                    style={priceListTypeView === 'Sales' ? { backgroundColor: '#0066ff' } : {}}
                                                                    onClick={() => setPriceListTypeView('Sales')}
                                                                >
                                                                    Sales
                                                                </button>
                                                                <button 
                                                                    className={`btn btn-sm px-3 border-0 rounded ${priceListTypeView === 'Purchase' ? 'bg-primary text-white shadow-sm' : 'text-muted'}`}
                                                                    style={priceListTypeView === 'Purchase' ? { backgroundColor: '#0066ff' } : {}}
                                                                    onClick={() => setPriceListTypeView('Purchase')}
                                                                >
                                                                    Purchase
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {isPriceListExpanded && (
                                                        <>
                                                            <div className="border rounded overflow-hidden">
                                                                <table className="table table-nowrap mb-0 border-0">
                                                                    <thead className="bg-light">
                                                                        <tr>
                                                                            <th className="fs-11 fw-bold text-muted py-2" style={{ backgroundColor: '#f8f9fa' }}>NAME</th>
                                                                            <th className="fs-11 fw-bold text-muted py-2 text-end" style={{ backgroundColor: '#f8f9fa' }}>PRICE</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {associatedPriceLists.filter(pl => pl.transactionType === priceListTypeView || pl.transactionType === 'Both').length > 0 ? (
                                                                            associatedPriceLists
                                                                                .filter(pl => pl.transactionType === priceListTypeView || pl.transactionType === 'Both')
                                                                                .map(pl => (
                                                                                    <tr key={pl.id} className="border-bottom">
                                                                                        <td className="py-2 fs-13 text-primary">{pl.name}</td>
                                                                                        <td className="py-2 fs-13 text-end fw-medium text-dark">₹ {(selectedItem?.sellingPrice || 0).toLocaleString()}</td>
                                                                                    </tr>
                                                                                ))
                                                                        ) : (
                                                                            <tr>
                                                                                <td colSpan={2} className="py-5 text-center bg-white">
                                                                                    <p className="text-muted fs-14 mb-2">The {priceListTypeView.toLowerCase()} price lists associated with this item will be <br/> displayed here. <Link to={route.priceListAdd} style={{ color: '#e41f07' }}>Create Price List</Link></p>
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                            <div className="mt-3">
                                                                <Link 
                                                                    to="#" 
                                                                    className="text-primary fs-14 fw-medium d-flex align-items-center gap-2" 
                                                                    style={{ color: '#e41f07' }}
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        setShowAssociateModal(true);
                                                                    }}
                                                                >
                                                                    <i className="ti ti-circle-plus fs-16" /> Associate Price List
                                                                </Link>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Associate Price List Modal */}
                                                {showAssociateModal && (
                                                    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
                                                        <div className="modal-dialog modal-dialog-centered">
                                                            <div className="modal-content border-0 shadow-lg">
                                                                <div className="modal-header border-bottom py-3">
                                                                    <h5 className="modal-title fs-16 fw-bold">Associate Price List</h5>
                                                                    <button type="button" className="btn-close fs-12" onClick={() => setShowAssociateModal(false)}></button>
                                                                </div>
                                                                <div className="modal-body p-4">
                                                                    <div className="row align-items-center mb-4">
                                                                        <div className="col-4">
                                                                            <label className="form-label mb-0 fs-14">Select Price List</label>
                                                                        </div>
                                                                        <div className="col-8">
                                                                            <select 
                                                                                className="form-select fs-14 shadow-none" 
                                                                                style={{ borderColor: '#a3c3ff', color: '#6c757d' }}
                                                                                value={selectedPriceListId}
                                                                                onChange={(e) => setSelectedPriceListId(e.target.value)}
                                                                            >
                                                                                <option value="">Select a Price List</option>
                                                                                {priceListOptions
                                                                                    .filter(pl => pl.transactionType === priceListTypeView || pl.transactionType === 'Both')
                                                                                    .map(pl => (
                                                                                        <option key={pl.id} value={pl.id}>{pl.name}</option>
                                                                                    ))
                                                                                }
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                    <div className="border-top pt-3 d-flex gap-2">
                                                                        <button 
                                                                            type="button" 
                                                                            className="btn btn-primary px-4 py-2 fs-14 fw-semibold" 
                                                                            style={{ backgroundColor: '#4a90e2', borderColor: '#4a90e2' }}
                                                                            onClick={handleAssociatePriceList}
                                                                        >
                                                                            Save
                                                                        </button>
                                                                        <button 
                                                                            type="button" 
                                                                            className="btn btn-light px-4 py-2 fs-14 fw-semibold border" 
                                                                            onClick={() => setShowAssociateModal(false)}
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}


                                                {/* Associated Items Table */}
                                                <div className="mb-5">
                                                    <h6 className="text-dark fs-15 fw-bold mb-3">Associated Items</h6>
                                                    <div className="table-responsive border rounded">
                                                        <table className="table table-nowrap mb-0 table-borderless">
                                                            <thead className="bg-light">
                                                                <tr>
                                                                    <th className="fs-12 fw-bold text-muted py-2" style={{ width: '60%' }}>ITEM DETAILS</th>
                                                                    <th className="fs-12 fw-bold text-muted py-2 text-end">QUANTITY</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {selectedItem.children && selectedItem.children.length > 0 ? (
                                                                    selectedItem.children.map(child => (
                                                                        <tr key={child.id} className="border-bottom">
                                                                            <td className="py-3">
                                                                                <div className="d-flex align-items-start gap-2">
                                                                                    <div 
                                                                                        className="avatar avatar-lg rounded border bg-light d-flex align-items-center justify-content-center cursor-pointer" 
                                                                                        style={{ width: 44, height: 44 }}
                                                                                        onClick={() => {
                                                                                            const found = data.find(item => item.name === child.name);
                                                                                            if (found) setSelectedItem(found);
                                                                                        }}
                                                                                    >
                                                                                        <i className="ti ti-photo text-muted fs-18" />
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="text-dark fw-medium fs-14 mb-1 d-block">{child.name}</span>
                                                                                        {child.sku && <span className="text-muted fs-12 d-block">[{child.sku}]</span>}


                                                                                        <div className="mt-1">
                                                                                            <span className="text-muted fs-12 me-2">Accounting Stock: 0.00</span>
                                                                                            <span className="text-muted fs-12">Physical Stock: 0.00</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </td>
                                                                            <td className="py-3 text-end fs-14 fw-medium">
                                                                                {child.quantity?.split(' ')[0] || '1'}
                                                                            </td>
                                                                        </tr>
                                                                    ))
                                                                ) : (
                                                                    <tr>
                                                                        <td colSpan={2} className="text-center py-4 text-muted fs-13">No associated items.</td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>

                                                {/* Sales Order Summary Chart */}
                                                <div className="card border rounded shadow-none overflow-hidden">
                                                    <div className="card-body p-0">
                                                        <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
                                                            <h6 className="mb-0 fs-14 fw-semibold text-dark">Sales Order Summary (In INR)</h6>
                                                            <select className="form-select form-select-sm border-0 bg-transparent fw-medium text-dark" style={{ width: 'auto' }}>
                                                                <option>This Month</option>
                                                            </select>
                                                        </div>
                                                        <div className="row g-0">
                                                            <div className="col-md-9 p-3 position-relative" style={{ minHeight: '180px' }}>
                                                                <Chart
                                                                    type="area"
                                                                    height={180}
                                                                    series={[{ name: 'Sales', data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }]}
                                                                    options={{
                                                                        chart: { toolbar: { show: false }, zoom: { enabled: false } },
                                                                        dataLabels: { enabled: false },
                                                                        stroke: { curve: 'smooth', width: 2, colors: ['#008ffb'] },
                                                                        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1, stops: [0, 90, 100] } },
                                                                        xaxis: { categories: ['01 Apr', '03 Apr', '05 Apr', '07 Apr', '09 Apr', '11 Apr', '13 Apr', '15 Apr', '17 Apr', '19 Apr'], labels: { style: { fontSize: '10px' } } },
                                                                        yaxis: { min: 0, max: 5000, tickAmount: 5, labels: { style: { fontSize: '10px' } } },
                                                                        grid: { borderColor: '#f1f1f1', strokeDashArray: 3 }
                                                                    }}
                                                                />
                                                                <div className="text-center text-muted fs-13 position-absolute start-50 top-50 translate-middle">No data found.</div>
                                                            </div>
                                                            <div className="col-md-3 border-start p-3 d-flex flex-column justify-content-center">
                                                                <p className="text-muted fs-13 mb-1">Total Sales</p>
                                                                <div className="bg-soft-primary p-2 rounded border-start border-primary border-4">
                                                                    <div className="d-flex align-items-center gap-2 mb-1">
                                                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#008ffb' }} />
                                                                        <span className="fs-11 fw-bold text-dark">DIRECT SALES</span>
                                                                    </div>
                                                                    <h6 className="mb-0 fs-14 fw-bold">₹0.00</h6>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>

                                    )}

                                    {detailTab === 'transactions' && (
                                        <div>
                                            {/* Filter bar */}
                                            <div className="d-flex align-items-center gap-2 mb-4">
                                                {/* Filter By */}
                                                <div className="position-relative">
                                                    <button
                                                        className="btn btn-sm btn-light border d-flex align-items-center gap-1 fs-13"
                                                        onClick={() => { setShowTxFilterMenu(v => !v); setShowTxStatusMenu(false); }}
                                                        style={{ height: 32 }}
                                                    >
                                                        <span className="text-muted">Filter By:</span>
                                                        <span className="fw-medium ms-1">{txFilterBy}</span>
                                                        <i className="ti ti-chevron-down ms-1" style={{ fontSize: 11 }} />
                                                    </button>
                                                    {showTxFilterMenu && (
                                                        <div className="dropdown-menu show" style={{ minWidth: 160, top: '100%', left: 0, zIndex: 100 }}>
                                                            {['Sales Orders', 'Purchase Orders', 'Invoices', 'Bills', 'Assembly Orders'].map(opt => (
                                                                <button
                                                                    key={opt}
                                                                    className={`dropdown-item fs-13 ${txFilterBy === opt ? 'active' : ''}`}
                                                                    onClick={() => { setTxFilterBy(opt); setShowTxFilterMenu(false); }}
                                                                >
                                                                    {opt}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Status */}
                                                <div className="position-relative">
                                                    <button
                                                        className="btn btn-sm btn-light border d-flex align-items-center gap-1 fs-13"
                                                        onClick={() => { setShowTxStatusMenu(v => !v); setShowTxFilterMenu(false); }}
                                                        style={{ height: 32 }}
                                                    >
                                                        <span className="text-muted">Status:</span>
                                                        <span className="fw-medium ms-1">{txStatus}</span>
                                                        <i className="ti ti-chevron-down ms-1" style={{ fontSize: 11 }} />
                                                    </button>
                                                    {showTxStatusMenu && (
                                                        <div className="dropdown-menu show" style={{ minWidth: 130, top: '100%', left: 0, zIndex: 100 }}>
                                                            {['All', 'Open', 'Closed', 'Cancelled'].map(opt => (
                                                                <button
                                                                    key={opt}
                                                                    className={`dropdown-item fs-13 ${txStatus === opt ? 'active' : ''}`}
                                                                    onClick={() => { setTxStatus(opt); setShowTxStatusMenu(false); }}
                                                                >
                                                                    {opt}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Empty state */}
                                            <div className="text-center py-5 text-muted">
                                                <p className="fs-14">No {txFilterBy} recorded yet.</p>
                                            </div>
                                        </div>
                                    )}

                                    {detailTab === 'history' && (
                                        <div>
                                            <div className="table-responsive">
                                                <table className="table table-borderless mb-0" style={{ tableLayout: 'fixed' }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: '1px solid #e9ecef' }}>
                                                            <th className="fs-12 fw-semibold text-muted py-2" style={{ width: '34%', letterSpacing: '0.05em' }}>DATE</th>
                                                            <th className="fs-12 fw-semibold text-muted py-2" style={{ letterSpacing: '0.05em' }}>DETAILS</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(selectedItem.history && selectedItem.history.length > 0) ? (
                                                            selectedItem.history.map((entry, idx) => (
                                                                <tr key={idx} style={{ borderBottom: '1px solid #f3f3f3' }}>
                                                                    <td className="py-3 fs-13 text-muted align-top">{entry.date}</td>
                                                                    <td className="py-3 fs-13 align-top">
                                                                        <span className="fw-medium text-dark">{entry.details}</span>
                                                                        {' - '}
                                                                        <span className="fst-italic text-muted">{entry.user}</span>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={2} className="py-5 text-center text-muted fs-13">No history available.</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {deleteTarget && (
                    <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
                        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 420 }}>
                            <div className="modal-content border-0 shadow">
                                <div className="modal-header border-0 pb-0 px-4 pt-4">
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="d-flex align-items-center justify-content-center bg-danger bg-opacity-10 rounded-circle" style={{ width: 44, height: 44, flexShrink: 0 }}>
                                            <i className="ti ti-trash text-danger" style={{ fontSize: 22 }} />
                                        </div>
                                        <div>
                                            <h5 className="mb-0 fw-semibold fs-16">Delete Item?</h5>
                                            <p className="text-muted fs-12 mb-0 mt-1">This action cannot be undone</p>
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-sm border-0 p-0 ms-auto d-flex align-items-center justify-content-center rounded-circle"
                                        style={{ 
                                            width: 24, 
                                            height: 24, 
                                            backgroundColor: '#fff5f5',
                                            border: '1px solid #f9d2cd'
                                        }}
                                        onClick={() => setDeleteTarget(null)}
                                        aria-label="Close"
                                    >
                                        <i className="ti ti-x fs-10" style={{ color: '#e41f07' }} />
                                    </button>
                                </div>
                                <div className="modal-body px-4 pt-3 pb-2">
                                    {/* Item being deleted */}
                                    <div className="border rounded p-3 bg-light mb-3">
                                        <div className="d-flex align-items-center gap-2">
                                            <i className="ti ti-folder text-muted fs-16" />
                                            <span className="fw-semibold text-dark fs-14">{deleteTarget.name}</span>
                                            {deleteTarget.sku && (
                                                <span className="text-muted fs-12 ms-auto">SKU: {deleteTarget.sku}</span>
                                            )}
                                        </div>
                                    </div>
                                    {/* Who is deleting */}
                                    <div className="d-flex align-items-center gap-2 text-muted fs-13 mb-1">
                                        <i className="ti ti-user fs-14" />
                                        <span>Deleted by:</span>
                                        <span className="fw-medium text-dark">{getCurrentUser()}</span>
                                    </div>
                                    <p className="text-muted fs-12 mt-2 mb-0">
                                        The item <span className="fw-semibold text-dark">"{deleteTarget.name}"</span> will be marked as deleted. You can view this action in the History tab.
                                    </p>
                                </div>
                                <div className="modal-footer border-0 px-4 pb-4 pt-2 d-flex gap-2 justify-content-end">
                                    <button className="btn btn-light px-4 fs-13" onClick={() => setDeleteTarget(null)}>Cancel</button>
                                    <button className="btn btn-danger px-4 fs-13 d-flex align-items-center gap-2" onClick={handleDelete}>
                                        <i className="ti ti-trash fs-14" />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Create Assemblies Modal ── */}
                {showCreateAssemblyModal && selectedItem && (
                    <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
                        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 440 }}>
                            <div className="modal-content border-0 shadow">
                                <div className="modal-header border-bottom px-4 py-3 align-items-center">
                                    <h5 className="modal-title fw-semibold fs-16 mb-0">Create Assemblies</h5>
                                    <button
                                        className="btn btn-sm border-0 p-0 ms-auto d-flex align-items-center justify-content-center rounded-circle"
                                        style={{ 
                                            width: 24, 
                                            height: 24, 
                                            backgroundColor: '#fff5f5',
                                            border: '1px solid #f9d2cd'
                                        }}
                                        onClick={() => setShowCreateAssemblyModal(false)}
                                        aria-label="Close"
                                    >
                                        <i className="ti ti-x fs-10" style={{ color: '#e41f07' }} />
                                    </button>
                                </div>
                                <div className="modal-body px-4 py-3">
                                    <p className="text-muted fs-13 mb-3">
                                        Create an assembly order for <span className="fw-semibold text-dark">{selectedItem.name}</span>.
                                    </p>
                                    <div className="mb-3">
                                        <label className="form-label fs-13 fw-medium">Quantity to Assemble <span className="text-danger">*</span></label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="form-control"
                                            value={assemblyQty}
                                            onChange={e => setAssemblyQty(e.target.value)}
                                            placeholder="Enter quantity"
                                        />
                                    </div>
                                    {selectedItem.children && selectedItem.children.length > 0 && (
                                        <div className="border rounded p-3 bg-light mb-2">
                                            <p className="fs-12 fw-semibold text-muted mb-2 text-uppercase">Components Required</p>
                                            {selectedItem.children.map(c => (
                                                <div key={c.id} className="d-flex justify-content-between fs-13 mb-1">
                                                    <span className="text-dark">{c.name}</span>
                                                    <span className="text-muted">{parseFloat(c.quantity || '1') * (parseFloat(assemblyQty) || 1)} {c.quantity?.replace(/[\d.]/g, '').trim() || 'pcs'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer border-top px-4 py-3 d-flex gap-2 justify-content-end">
                                    <button className="btn btn-light px-4 fs-13" onClick={() => setShowCreateAssemblyModal(false)}>Cancel</button>
                                    <button
                                        className="btn btn-primary px-4 fs-13"
                                        onClick={() => {
                                            if (!assemblyQty || parseFloat(assemblyQty) <= 0) { alert('Please enter a valid quantity.'); return; }
                                            const nowStr = formatHistoryDate(new Date());
                                            const user = getCurrentUser();
                                            const all = loadData();
                                            const updated = all.map(d => {
                                                if (d.id !== selectedItem.id) return d;
                                                const prevHistory = d.history || [];
                                                return { ...d, history: [...prevHistory, { date: nowStr, details: `assembly created (qty: ${assemblyQty}) by`, user }] };
                                            });
                                            saveData(updated);
                                            setData(updated.filter(d => !d.isDeleted));
                                            const fresh = updated.find(d => d.id === selectedItem.id);
                                            if (fresh) setSelectedItem({ ...fresh });
                                            setShowCreateAssemblyModal(false);
                                            setToast({ message: `Assembly order created for "${selectedItem.name}" (Qty: ${assemblyQty}).`, type: 'success' });
                                        }}
                                    >
                                        Create Assembly
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                <Footer />
            </div>
        </div>
    );

    // ── FORM VIEW ─────────────────────────────────────────────────────
    const formView = (
        <div className="page-wrapper">
            <div className="content">
                <PageHeader
                    title={isEdit ? 'Edit Composite Item' : 'New Composite Item'}
                    badgeCount={false}
                    moduleTitle="Composite Items"
                    showModuleTile={true}
                    moduleLink={route.compositeItems}
                    showExport={false}
                    onRefresh={() => window.location.reload()}
                />

                <div className="card">
                    <div className="card-body">
                        <form onSubmit={e => e.preventDefault()}>
                            {/* ── Zoho-style two-column layout ── */}
                            <div className="d-flex align-items-start gap-4 mb-4 pb-4 border-bottom">

                                {/* Left: Form Fields */}
                                <div style={{ flex: 1, minWidth: 0 }}>

                                    {/* Name */}
                                    <div className="d-flex align-items-center mb-3">
                                        <label style={{ width: 160, minWidth: 160, textAlign: 'right', paddingRight: 16, fontSize: 13, color: '#555' }}>
                                            Name <span className="text-danger">*</span>
                                        </label>
                                        <div style={{ flex: 1 }}>
                                            <input className="form-control" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="" />
                                        </div>
                                    </div>

                                    {/* Item Type */}
                                    <div className="d-flex align-items-start mb-3">
                                        <label style={{ width: 160, minWidth: 160, textAlign: 'right', paddingRight: 16, fontSize: 13, color: '#555', paddingTop: 6 }}>
                                            Item Type <span className="text-danger">*</span>
                                        </label>
                                        <div style={{ flex: 1, display: 'flex', gap: 12 }}>
                                            {/* Assembly card */}
                                            <label
                                                htmlFor="type-assembly"
                                                style={{
                                                    flex: 1, border: `1.5px solid ${itemType === 'assembly' ? '#e41f07' : '#dee2e6'}`,
                                                    borderRadius: 6, padding: '10px 14px', cursor: 'pointer',
                                                    background: itemType === 'assembly' ? '#fff8f7' : '#fff',
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                <div className="d-flex align-items-center gap-2 mb-1">
                                                    <input type="radio" id="type-assembly" name="itemType" checked={itemType === 'assembly'} onChange={() => setItemType('assembly')} style={{ accentColor: '#e41f07' }} />
                                                    <span style={{ fontWeight: 600, fontSize: 13 }}>Assembly Item</span>
                                                </div>
                                                <p style={{ fontSize: 12, color: '#888', marginBottom: 0, lineHeight: 1.4 }}>
                                                    A group of items combined together to be tracked and managed as a single item.
                                                </p>
                                            </label>
                                            {/* Kit card */}
                                            <label
                                                htmlFor="type-kit"
                                                style={{
                                                    flex: 1, border: `1.5px solid ${itemType === 'kit' ? '#e41f07' : '#dee2e6'}`,
                                                    borderRadius: 6, padding: '10px 14px', cursor: 'pointer',
                                                    background: itemType === 'kit' ? '#fff5f5' : '#fff',
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                <div className="d-flex align-items-center gap-2 mb-1">
                                                    <input type="radio" id="type-kit" name="itemType" checked={itemType === 'kit'} onChange={() => setItemType('kit')} style={{ accentColor: '#e41f07' }} />
                                                    <span style={{ fontWeight: 600, fontSize: 13 }}>Kit Item</span>
                                                </div>
                                                <p style={{ fontSize: 12, color: '#888', marginBottom: 0, lineHeight: 1.4 }}>
                                                    Individual items sold together as one kit.
                                                </p>
                                            </label>
                                        </div>
                                    </div>

                                    {/* SKU */}
                                    <div className="d-flex align-items-center mb-3">
                                        <label style={{ width: 160, minWidth: 160, textAlign: 'right', paddingRight: 16, fontSize: 13, color: '#555' }}>SKU</label>
                                        <div style={{ flex: 1 }}>
                                            <input className="form-control" value={sku} onChange={e => setSku(e.target.value)} />
                                        </div>
                                    </div>

                                    {/* Unit */}
                                    <div className="d-flex align-items-center mb-3">
                                        <label style={{ width: 160, minWidth: 160, textAlign: 'right', paddingRight: 16, fontSize: 13, color: '#555' }}>Unit</label>
                                        <div style={{ flex: 1 }}>
                                            <Select
                                                className="custom-react-select"
                                                options={[
                                                    { value: 'pcs', label: 'pcs' }, { value: 'box', label: 'box' },
                                                    { value: 'kg', label: 'kg' }, { value: 'g', label: 'g' },
                                                    { value: 'l', label: 'l' }, { value: 'ml', label: 'ml' },
                                                ]}
                                                styles={customStyles} theme={neutralTheme}
                                                components={{ IndicatorSeparator: () => null, DropdownIndicator }}
                                                value={selectedUnit} onChange={setSelectedUnit}
                                                placeholder="Select or type to add"
                                                isSearchable
                                            />
                                        </div>
                                    </div>

                                    {/* Category */}
                                    <div className="d-flex align-items-center mb-3">
                                        <label style={{ width: 160, minWidth: 160, textAlign: 'right', paddingRight: 16, fontSize: 13, color: '#555' }}>Category</label>
                                        <div style={{ flex: 1 }}>
                                            <CreatableSelect
                                                className="custom-react-select"
                                                options={categories}
                                                {...searchableSelectProps}
                                                inputValue={categorySearch}
                                                onInputChange={(val) => setCategorySearch(val)}
                                                placeholder="Select or type to create a category"
                                                value={selectedCategory}
                                                onChange={(val) => setSelectedCategory(val)}
                                                onCreateOption={handleCreateCategoryDirectly}
                                                menuIsOpen={openMenuId === 'category'}
                                                onMenuOpen={() => setOpenMenuId('category')}
                                                onMenuClose={() => setOpenMenuId(null)}
                                                {...({
                                                    menuFooter: (
                                                        <div className="border-top pt-2 pb-2 px-3 mt-1 bg-white" style={{ position: 'sticky', bottom: 0, zIndex: 1 }}>
                                                            <Link to="#" data-bs-toggle="modal" data-bs-target="#manage-categories-modal"
                                                                className="text-primary d-flex align-items-center fw-medium" style={{ textDecoration: 'none' }}
                                                                onClick={() => setOpenMenuId(null)}>
                                                                <i className="ti ti-settings me-2" /> Manage Categories
                                                            </Link>
                                                        </div>
                                                    )
                                                } as any)}
                                            />
                                        </div>
                                    </div>

                                    {/* Brand */}
                                    <div className="d-flex align-items-center mb-3">
                                        <label style={{ width: 160, minWidth: 160, textAlign: 'right', paddingRight: 16, fontSize: 13, color: '#555' }}>Brand</label>
                                        <div style={{ flex: 1 }}>
                                            <CreatableSelect
                                                className="custom-react-select"
                                                options={brands}
                                                {...searchableSelectProps}
                                                inputValue={brandSearch}
                                                onInputChange={(val) => setBrandSearch(val)}
                                                placeholder="Select or type to create a brand"
                                                value={selectedBrand}
                                                onChange={(val) => setSelectedBrand(val)}
                                                onCreateOption={handleCreateBrandDirectly}
                                                menuIsOpen={openMenuId === 'brand'}
                                                onMenuOpen={() => setOpenMenuId('brand')}
                                                onMenuClose={() => setOpenMenuId(null)}
                                                {...({
                                                    menuFooter: (
                                                        <div className="border-top pt-2 pb-2 px-3 mt-1 bg-white" style={{ position: 'sticky', bottom: 0, zIndex: 1 }}>
                                                            <Link to="#" data-bs-toggle="modal" data-bs-target="#manage-brands-modal"
                                                                className="text-primary d-flex align-items-center fw-medium" style={{ textDecoration: 'none' }}
                                                                onClick={() => setOpenMenuId(null)}>
                                                                <i className="ti ti-settings me-2" /> Manage Brands
                                                            </Link>
                                                        </div>
                                                    )
                                                } as any)}
                                            />
                                        </div>
                                    </div>

                                    {/* Returnable Item */}
                                    <div className="d-flex align-items-center mb-3">
                                        <div style={{ width: 160, minWidth: 160 }} />
                                        <div style={{ flex: 1 }}>
                                            <div className="form-check mb-0">
                                                <input className="form-check-input" type="checkbox" id="returnable" checked={isReturnable} onChange={e => setIsReturnable(e.target.checked)} style={{ accentColor: '#e41f07' }} />
                                                <label className="form-check-label d-flex align-items-center gap-1" htmlFor="returnable" style={{ fontSize: 13, cursor: 'pointer' }}>
                                                    Returnable Item
                                                    <HelpIcon text="Enable if this item can be returned by customers." id="returnable-tip" />
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                </div>

                                {/* Right: Image Upload */}
                                <div style={{ width: 260, minWidth: 220, flexShrink: 0 }}>
                                    <label
                                        htmlFor="composite-img-upload"
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={async e => {
                                            e.preventDefault();
                                            const file = e.dataTransfer.files?.[0];
                                            if (file) {
                                                try {
                                                    const dataUrl = await compressImage(file);
                                                    setPreviewUrl(dataUrl);
                                                    setImage(file);
                                                } catch (err: any) {
                                                    setToast({ message: err.message || 'Upload failed.', type: 'error' });
                                                }
                                            }
                                        }}
                                        style={{
                                            display: 'block', border: '1.5px dashed #c8d6e5',
                                            borderRadius: 8, background: previewUrl ? 'transparent' : '#f8fafd',
                                            minHeight: 200, cursor: 'pointer', overflow: 'hidden',
                                        }}
                                    >
                                        <input
                                            id="composite-img-upload"
                                            type="file"
                                            hidden
                                            accept="image/png,image/jpeg,image/jpg,image/webp"
                                            onChange={e => { handleImageSelect(e.target.files?.[0]); e.target.value = ''; }}
                                        />
                                        {previewUrl ? (
                                            <img src={previewUrl} alt="Preview" style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
                                        ) : (
                                            <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: 200, padding: '24px 16px', textAlign: 'center' }}>
                                                <i className="ti ti-photo mb-2" style={{ fontSize: 36, color: '#b0bec5' }} />
                                                <p className="mb-1 fw-medium fs-13 text-dark">
                                                    Drag image here or{' '}
                                                    <span style={{ color: '#e41f07', textDecoration: 'underline' }}>Browse Image</span>
                                                </p>
                                                <p className="mb-0 text-muted" style={{ fontSize: 11 }}>
                                                    Single image only (Max 10MB, auto-compressed)
                                                </p>
                                            </div>
                                        )}
                                    </label>
                                    {previewUrl && (
                                        <button type="button" className="btn btn-sm btn-outline-danger mt-2 w-100"
                                            onClick={() => { setImage(null); setPreviewUrl(''); }}>
                                            <i className="ti ti-trash me-1" /> Remove Image
                                        </button>
                                    )}
                                </div>

                            </div>

                            {/* ── Associate Items Table ── */}
                            <div className="mt-4 pt-4 border-top">
                                <h6 className="mb-3">{itemType === 'assembly' ? 'Associated Items' : 'Kit Components'}</h6>
                                <div className="bg-white border rounded overflow-hidden">
                                    <div className="custom-table overflow-visible">
                                        <table className="table mb-0">
                                            <thead className="bg-light">
                                                <tr>
                                                    <th className="border-0 fs-12 text-muted fw-semibold" style={{ minWidth: 280 }}>ITEM DETAILS</th>
                                                    <th className="border-0 text-end fs-12 text-muted fw-semibold">QUANTITY</th>
                                                    <th className="border-0 text-end fs-12 text-muted fw-semibold">SELLING PRICE</th>
                                                    <th className="border-0 text-end fs-12 text-muted fw-semibold">COST PRICE</th>
                                                    <th className="border-0"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {itemRows.map((row) => (
                                                    <tr key={row.id}>
                                                        <td className="border-0 py-2">
                                                            <Select
                                                                className="custom-react-select"
                                                                styles={customStyles} theme={neutralTheme}
                                                                components={{ IndicatorSeparator: () => null, DropdownIndicator }}
                                                                options={productOptions.filter(opt => opt.type !== 'service')}
                                                                value={row.productId ? productOptions.find(opt => opt.value === row.productId) || null : null}
                                                                onChange={(val: any) => {
                                                                    if (!val) { setItemRows(itemRows.map(r => r.id === row.id ? { ...r, itemName: '', productId: undefined, stockOnHand: 0 } : r)); return; }
                                                                    updateItemRowProduct(row.id, val.value);
                                                                }}
                                                                placeholder="Click to select an item"
                                                                menuPortalTarget={document.body} menuPosition="fixed"
                                                            />
                                                        </td>
                                                        <td className="border-0 py-2" style={{ width: 100 }}>
                                                            <input type="number" className="form-control form-control-sm text-end" value={row.quantity} min="0" onChange={e => setItemRows(itemRows.map(r => r.id === row.id ? { ...r, quantity: e.target.value } : r))} />
                                                        </td>
                                                        <td className="border-0 py-2" style={{ width: 120 }}>
                                                            <input type="number" className="form-control form-control-sm text-end" value={row.sellingPrice} step="0.01" min="0" onChange={e => setItemRows(itemRows.map(r => r.id === row.id ? { ...r, sellingPrice: e.target.value } : r))} />
                                                        </td>
                                                        <td className="border-0 py-2" style={{ width: 120 }}>
                                                            <input type="number" className="form-control form-control-sm text-end" value={row.costPrice} step="0.01" min="0" onChange={e => setItemRows(itemRows.map(r => r.id === row.id ? { ...r, costPrice: e.target.value } : r))} />
                                                        </td>
                                                        <td className="border-0 py-2 text-center" style={{ width: 40 }}>
                                                            <button type="button" className="btn p-0 text-danger border-0" onClick={() => setItemRows(itemRows.length === 1 ? [newRow('item')] : itemRows.filter(r => r.id !== row.id))}>
                                                                <i className="ti ti-x" style={{ fontSize: 13 }} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr>
                                                    <td className="border-0 pt-2 pb-3 ps-2">
                                                        <div className="d-flex gap-3">
                                                            <button type="button" className="fw-medium fs-13 d-flex align-items-center border-0 bg-transparent p-0" style={{ color: '#e41f07' }} onClick={() => setItemRows([...itemRows, newRow('item')])}>
                                                                <i className="ti ti-circle-plus me-1" /> Add New Row
                                                            </button>
                                                            {!showServiceSection && (
                                                                <button type="button" className="fw-medium fs-13 d-flex align-items-center border-0 bg-transparent p-0" style={{ color: '#e41f07' }}
                                                                    onClick={() => { setShowServiceSection(true); setServiceRows([newRow('service')]); }}>
                                                                    <i className="ti ti-circle-plus me-1" /> Add Services
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="border-0 pt-2 pb-3 text-end text-muted fs-13">Total (₹):</td>
                                                    <td className="border-0 pt-2 pb-3 text-end fw-semibold fs-13">{totalItemSelling.toFixed(2)}</td>
                                                    <td className="border-0 pt-2 pb-3 text-end fw-semibold fs-13">{totalItemCost.toFixed(2)}</td>
                                                    <td className="border-0"></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* ── Associate Services Table (separate) ── */}
                            {showServiceSection && (
                                <div className="mt-4 pt-4 border-top">
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <h6 className="mb-0">Associate Services <span className="text-danger">*</span></h6>
                                        <button type="button" className="btn btn-sm btn-light border d-flex align-items-center gap-1 fs-13"
                                            onClick={() => { setShowServiceSection(false); setServiceRows([]); }}>
                                            <i className="ti ti-x fs-13" /> Close Services
                                        </button>
                                    </div>
                                    <div className="bg-white border rounded overflow-hidden">
                                        <div className="custom-table overflow-visible">
                                            <table className="table mb-0">
                                                <thead className="bg-light">
                                                    <tr>
                                                        <th className="border-0 fs-12 text-muted fw-semibold" style={{ minWidth: 280 }}>SERVICE DETAILS</th>
                                                        <th className="border-0 text-end fs-12 text-muted fw-semibold">QUANTITY</th>
                                                        <th className="border-0 text-end fs-12 text-muted fw-semibold">SELLING PRICE</th>
                                                        <th className="border-0 text-end fs-12 text-muted fw-semibold">COST PRICE</th>
                                                        <th className="border-0"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {serviceRows.map((row) => (
                                                        <tr key={row.id}>
                                                            <td className="border-0 py-2">
                                                                <Select
                                                                    className="custom-react-select"
                                                                    styles={customStyles} theme={neutralTheme}
                                                                    components={{ IndicatorSeparator: () => null, DropdownIndicator }}
                                                                    options={productOptions.filter(opt => opt.type === 'service')}
                                                                    value={row.productId ? productOptions.find(opt => opt.value === row.productId) || null : null}
                                                                    onChange={(val: any) => {
                                                                        if (!val) { setServiceRows(serviceRows.map(r => r.id === row.id ? { ...r, itemName: '', productId: undefined, stockOnHand: 0 } : r)); return; }
                                                                        updateServiceRowProduct(row.id, val.value);
                                                                    }}
                                                                    placeholder="Click to select an item"
                                                                    menuPortalTarget={document.body} menuPosition="fixed"
                                                                />
                                                            </td>
                                                            <td className="border-0 py-2" style={{ width: 100 }}>
                                                                <input type="number" className="form-control form-control-sm text-end" value={row.quantity} min="0" onChange={e => setServiceRows(serviceRows.map(r => r.id === row.id ? { ...r, quantity: e.target.value } : r))} />
                                                            </td>
                                                            <td className="border-0 py-2" style={{ width: 120 }}>
                                                                <input type="number" className="form-control form-control-sm text-end" value={row.sellingPrice} step="0.01" min="0" onChange={e => setServiceRows(serviceRows.map(r => r.id === row.id ? { ...r, sellingPrice: e.target.value } : r))} />
                                                            </td>
                                                            <td className="border-0 py-2" style={{ width: 120 }}>
                                                                <input type="number" className="form-control form-control-sm text-end" value={row.costPrice} step="0.01" min="0" onChange={e => setServiceRows(serviceRows.map(r => r.id === row.id ? { ...r, costPrice: e.target.value } : r))} />
                                                            </td>
                                                            <td className="border-0 py-2 text-center" style={{ width: 40 }}>
                                                                <button type="button" className="btn p-0 text-danger border-0"
                                                                    onClick={() => {
                                                                        const updated = serviceRows.filter(r => r.id !== row.id);
                                                                        if (updated.length === 0) { setShowServiceSection(false); setServiceRows([]); }
                                                                        else setServiceRows(updated);
                                                                    }}>
                                                                    <i className="ti ti-x" style={{ fontSize: 13 }} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr>
                                                        <td className="border-0 pt-2 pb-3 ps-2">
                                                            <button type="button" className="fw-medium fs-13 d-flex align-items-center border-0 bg-transparent p-0" style={{ color: '#e41f07' }}
                                                                onClick={() => setServiceRows([...serviceRows, newRow('service')])}>
                                                                <i className="ti ti-circle-plus me-1" /> Add New Row
                                                            </button>
                                                        </td>
                                                        <td className="border-0 pt-2 pb-3 text-end text-muted fs-13">Total (₹):</td>
                                                        <td className="border-0 pt-2 pb-3 text-end fw-semibold fs-13">{totalServiceSelling.toFixed(2)}</td>
                                                        <td className="border-0 pt-2 pb-3 text-end fw-semibold fs-13">{totalServiceCost.toFixed(2)}</td>
                                                        <td className="border-0"></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Sales Information */}
                            <div className="mt-4 pt-4 border-top">
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <h6 className="mb-0">Sales Information</h6>
                                    <div className="form-check mb-0">
                                        <input className="form-check-input" type="checkbox" id="sellable" checked={isSellable} onChange={e => setIsSellable(e.target.checked)} />
                                        <label className="form-check-label" htmlFor="sellable">Sellable</label>
                                    </div>
                                </div>
                                {isSellable && (
                                    <div>
                                        <div className="row align-items-center mb-3">
                                            <div className="col-md-3"><label className="form-label mb-0">Selling Price (INR) <span className="text-danger">*</span></label></div>
                                            <div className="col-md-5">
                                                <div className="input-group">
                                                    <input type="number" className="form-control" step="0.01" min="0" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} placeholder="0.00" />
                                                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setSellingPrice(totalSelling.toFixed(2))}>Copy from total</button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="row align-items-center mb-3">
                                            <div className="col-md-3"><label className="form-label mb-0">Account <span className="text-danger">*</span></label></div>
                                            <div className="col-md-5">
                                                <Select options={salesAccountOptions} styles={customStyles} theme={neutralTheme}
                                                    components={{ IndicatorSeparator: () => null, DropdownIndicator }}
                                                    value={salesAccount} onChange={setSalesAccount} placeholder="Select account" />
                                            </div>
                                        </div>
                                        <div className="row align-items-start mb-3">
                                            <div className="col-md-3"><label className="form-label mt-1">Description</label></div>
                                            <div className="col-md-5"><textarea className="form-control" rows={3} value={salesDescription} onChange={e => setSalesDescription(e.target.value)} /></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Purchase Information */}
                            {!isKit && <div className="mt-4 pt-4 border-top">
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <h6 className="mb-0">Purchase Information</h6>
                                    <div className="form-check mb-0">
                                        <input className="form-check-input" type="checkbox" id="purchasable" checked={isPurchasable} onChange={e => setIsPurchasable(e.target.checked)} />
                                        <label className="form-check-label" htmlFor="purchasable">Purchasable</label>
                                    </div>
                                </div>
                                {isPurchasable && (
                                    <div>
                                        <div className="row align-items-center mb-3">
                                            <div className="col-md-3"><label className="form-label mb-0">Cost Price (INR) <span className="text-danger">*</span></label></div>
                                            <div className="col-md-5">
                                                <div className="input-group">
                                                    <input type="number" className="form-control" step="0.01" min="0" value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="0.00" />
                                                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setCostPrice(totalCost.toFixed(2))}>Copy from total</button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="row align-items-center mb-3">
                                            <div className="col-md-3"><label className="form-label mb-0">Account <span className="text-danger">*</span></label></div>
                                            <div className="col-md-5">
                                                <Select options={purchaseAccountOptions} styles={customStyles} theme={neutralTheme}
                                                    components={{ IndicatorSeparator: () => null, DropdownIndicator }}
                                                    value={purchaseAccount} onChange={setPurchaseAccount} placeholder="Select account" />
                                            </div>
                                        </div>
                                        <div className="row align-items-start mb-3">
                                            <div className="col-md-3"><label className="form-label mt-1">Description</label></div>
                                            <div className="col-md-5"><textarea className="form-control" rows={3} value={purchaseDescription} onChange={e => setPurchaseDescription(e.target.value)} /></div>
                                        </div>
                                        <div className="row align-items-center mb-3">
                                            <div className="col-md-3"><label className="form-label mb-0">Preferred Vendor</label></div>
                                            <div className="col-md-5">
                                                <Select options={vendors} styles={customStyles} theme={neutralTheme}
                                                    components={{ IndicatorSeparator: () => null, DropdownIndicator }}
                                                    isSearchable placeholder="Select vendor"
                                                    value={selectedVendor} onChange={setSelectedVendor} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>}

                            {/* Fulfilment Details */}
                            <div className="mt-4 pt-4 border-top">
                                <div className="row mt-3 g-3">
                                    <div className="col-md-6">
                                        <div className="row align-items-center mb-3">
                                            <div className="col-md-4"><label className="form-label mb-0">Dimensions</label></div>
                                            <div className="col-md-8">
                                                <div className="input-group input-group-sm">
                                                    <input type="text" className="form-control text-center" placeholder="L" value={dimensionL} onChange={e => setDimensionL(e.target.value)} />
                                                    <input type="text" className="form-control text-center" placeholder="W" value={dimensionW} onChange={e => setDimensionW(e.target.value)} />
                                                    <input type="text" className="form-control text-center" placeholder="H" value={dimensionH} onChange={e => setDimensionH(e.target.value)} />
                                                    <div style={{ width: '90px' }}>
                                                        <Select className="custom-react-select" options={dimensionUnits} value={dimensionUnit} onChange={(val: any) => setDimensionUnit(val)} styles={unitSelectStyles} components={{ IndicatorSeparator: () => null, DropdownIndicator }} isSearchable={false} menuIsOpen={openMenuId === 'dimUnit'} onMenuOpen={() => setOpenMenuId('dimUnit')} onMenuClose={() => setOpenMenuId(null)} />
                                                    </div>
                                                </div>
                                                <div className="extra-small mt-1 text-muted">(Length X Width X Height)</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="row align-items-center mb-3">
                                            <div className="col-md-4"><label className="form-label mb-0">Weight</label></div>
                                            <div className="col-md-8">
                                                <div className="input-group input-group-sm">
                                                    <input type="text" className="form-control" value={weight} onChange={e => setWeight(e.target.value)} />
                                                    <div style={{ width: '90px' }}>
                                                        <Select className="custom-react-select" options={weightUnits} value={weightUnit} onChange={(val: any) => setWeightUnit(val)} styles={unitSelectStyles} components={{ IndicatorSeparator: () => null, DropdownIndicator }} isSearchable={false} menuIsOpen={openMenuId === 'weightUnit'} onMenuOpen={() => setOpenMenuId('weightUnit')} onMenuClose={() => setOpenMenuId(null)} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="row align-items-center mb-3">
                                            <div className="col-md-4">
                                                <label className="form-label mb-0">
                                                    UPC <HelpIcon text="Universal Product Code" id="composite-upc-tip" />
                                                </label>
                                            </div>
                                            <div className="col-md-8"><input type="text" className="form-control" value={upc} onChange={e => setUpc(e.target.value)} /></div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="row align-items-center mb-3">
                                            <div className="col-md-4">
                                                <label className="form-label mb-0">
                                                    EAN <HelpIcon text="European Article Number" id="composite-ean-tip" />
                                                </label>
                                            </div>
                                            <div className="col-md-8"><input type="text" className="form-control" value={ean} onChange={e => setEan(e.target.value)} /></div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="row align-items-center mb-3">
                                            <div className="col-md-4">
                                                <label className="form-label mb-0">
                                                    MPN <HelpIcon text="Manufacturer Part Number" id="composite-mpn-tip" />
                                                </label>
                                            </div>
                                            <div className="col-md-8"><input type="text" className="form-control" value={mpn} onChange={e => setMpn(e.target.value)} /></div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="row align-items-center mb-3">
                                            <div className="col-md-4">
                                                <label className="form-label mb-0">
                                                    ISBN <HelpIcon text="International Standard Book Number" id="composite-isbn-tip" />
                                                </label>
                                            </div>
                                            <div className="col-md-8"><input type="text" className="form-control" value={isbn} onChange={e => setIsbn(e.target.value)} /></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Information */}
                            {!isKit && <div className="mt-4 pt-4 border-top">
                                <h6 className="mb-3">Additional Information</h6>
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <div className="row align-items-center mb-3">
                                            <div className="col-md-4"><label className="form-label mb-0">Inventory Account <span className="text-danger">*</span></label></div>
                                            <div className="col-md-8">
                                                <Select options={inventoryAccountOptions} styles={customStyles} theme={neutralTheme}
                                                    components={{ IndicatorSeparator: () => null, DropdownIndicator }}
                                                    value={selectedInventoryAccount} onChange={setSelectedInventoryAccount} placeholder="Select an account" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="row align-items-center mb-3">
                                            <div className="col-md-4"><label className="form-label mb-0">Valuation Method <span className="text-danger">*</span></label></div>
                                            <div className="col-md-8">
                                                <Select options={valuationMethods} styles={customStyles} theme={neutralTheme}
                                                    components={{ IndicatorSeparator: () => null, DropdownIndicator }}
                                                    value={selectedValuation} onChange={setSelectedValuation} placeholder="Select valuation method" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="row align-items-center mb-3">
                                            <div className="col-md-4"><label className="form-label mb-0">Reorder Point</label></div>
                                            <div className="col-md-8"><input type="number" className="form-control" min="0" value={reorderPoint} onChange={e => setReorderPoint(e.target.value)} /></div>
                                        </div>
                                    </div>
                                </div>
                            </div>}

                            {/* Actions */}
                            <div className="d-flex align-items-center gap-2 pt-4 mt-2 border-top">
                                <button type="button" className="btn btn-primary px-4" onClick={handleSave} disabled={loading}>
                                    {loading ? <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" /> : null}
                                    Save
                                </button>
                                <button type="button" className="btn btn-light border px-4" onClick={() => navigate(route.compositeItems)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="modal fade" id="manage-categories-modal" tabIndex={-1} aria-hidden="true">
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 rounded-3">
                            <div className="modal-header border-bottom-0 pb-0">
                                <h5 className="modal-title fw-medium fs-5">Manage Categories</h5>
                                <button type="button" className="btn-close" data-bs-dismiss="modal" />
                            </div>
                            <div className="modal-body px-4 py-4">
                                {showNewCategory && (
                                    <div className="mb-4">
                                        <div className="row mb-3 align-items-center">
                                            <div className="col-md-4"><label className="form-label mb-0"><span className="text-danger">Category Name*</span></label></div>
                                            <div className="col-md-8"><input type="text" className="form-control" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveCategory(); }} /></div>
                                        </div>
                                        <div className="d-flex gap-2 mt-3">
                                            <button type="button" className="btn btn-primary btn-sm px-3" onClick={handleSaveCategory}>{editingCategoryId ? 'Update' : 'Save'}</button>
                                            <button type="button" className="btn btn-light btn-sm px-3 border" onClick={() => { setShowNewCategory(false); setEditingCategoryId(null); setNewCategoryName(''); }}>Cancel</button>
                                        </div>
                                        <div className="mt-4" />
                                    </div>
                                )}
                                <div className="d-flex align-items-center justify-content-between mb-3 mt-2">
                                    <h6 className="text-uppercase mb-0 text-dark fw-semibold" style={{ fontSize: '12px' }}>CATEGORIES</h6>
                                    {!showNewCategory && <Link to="#" className="text-primary d-flex align-items-center fw-medium" onClick={() => { setShowNewCategory(true); setEditingCategoryId(null); setNewCategoryName(''); }}><i className="ti ti-circle-plus me-1" /> Add New Category</Link>}
                                </div>
                                <div className="list-group list-group-flush border rounded-3 overflow-hidden mt-2">
                                    {categories.map(c => (
                                        <div key={c.value} className="list-group-item d-flex align-items-center justify-content-between px-3 py-3 border-bottom border-light">
                                            <div className="d-flex align-items-center">
                                                <i className="ti ti-folder text-primary me-2 fs-5" />
                                                <span className="fw-medium text-dark">{c.label}</span>
                                            </div>
                                            <div className="d-flex align-items-center gap-2">
                                                <Link to="#" className="text-muted" onClick={() => { setEditingCategoryId(c.value); setNewCategoryName(c.label); setShowNewCategory(true); }}><i className="ti ti-edit" /></Link>
                                                <Link to="#" className="text-danger" onClick={() => handleDeleteCategory(c.value)}><i className="ti ti-trash" /></Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal fade" id="manage-brands-modal" tabIndex={-1} aria-hidden="true">
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 rounded-3">
                            <div className="modal-header border-bottom-0 pb-0">
                                <h5 className="modal-title fw-medium fs-5">Manage Brands</h5>
                                <button type="button" className="btn-close" data-bs-dismiss="modal" />
                            </div>
                            <div className="modal-body px-4 py-4">
                                {showNewBrand && (
                                    <div className="mb-4">
                                        <div className="row mb-3 align-items-center">
                                            <div className="col-md-4"><label className="form-label mb-0"><span className="text-danger">Brand Name*</span></label></div>
                                            <div className="col-md-8"><input type="text" className="form-control" value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveBrand(); }} /></div>
                                        </div>
                                        <div className="d-flex gap-2 mt-3">
                                            <button type="button" className="btn btn-primary btn-sm px-3" onClick={handleSaveBrand}>{editingBrandId ? 'Update' : 'Save'}</button>
                                            <button type="button" className="btn btn-light btn-sm px-3 border" onClick={() => { setShowNewBrand(false); setEditingBrandId(null); setNewBrandName(''); }}>Cancel</button>
                                        </div>
                                        <div className="mt-4" />
                                    </div>
                                )}
                                <div className="d-flex align-items-center justify-content-between mb-3 mt-2">
                                    <h6 className="text-uppercase mb-0 text-dark fw-semibold" style={{ fontSize: '12px' }}>BRANDS</h6>
                                    {!showNewBrand && <Link to="#" className="text-primary d-flex align-items-center fw-medium" onClick={() => { setShowNewBrand(true); setEditingBrandId(null); setNewBrandName(''); }}><i className="ti ti-circle-plus me-1" /> Add New Brand</Link>}
                                </div>
                                <div className="list-group list-group-flush border rounded-3 overflow-hidden mt-2">
                                    {brands.map(b => (
                                        <div key={b.value} className="list-group-item d-flex align-items-center justify-content-between px-3 py-3 border-bottom border-light">
                                            <span className="fw-medium text-dark">{b.label}</span>
                                            <div className="d-flex align-items-center gap-2">
                                                <Link to="#" className="text-muted" onClick={() => { setEditingBrandId(b.value); setNewBrandName(b.label); setShowNewBrand(true); }}><i className="ti ti-edit" /></Link>
                                                <Link to="#" className="text-danger" onClick={() => handleDeleteBrand(b.value)}><i className="ti ti-trash" /></Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <Footer />
            </div>
        </div>
    );

    return isList ? listView : formView;
};

export default CompositeItem;
