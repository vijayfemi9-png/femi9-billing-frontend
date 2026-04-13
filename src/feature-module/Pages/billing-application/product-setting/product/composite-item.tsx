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
import { all_routes } from "../../../../../routes/all_routes";
import { productService } from "../../../../../api/productService";

const route = all_routes;

// ── Types ─────────────────────────────────────────────────────────────────────
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
    isDeleted?: boolean;
    children?: CompositeItemEntry[];
    isChild?: boolean;
    isFirstChild?: boolean;
    isLastChild?: boolean;
    quantity?: string;
    rowType?: 'item' | 'service';
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
        unit: 'pcs',
        sellingPrice: 0,
        costPrice: 0,
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
    const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
    const [filterTypes, setFilterTypes] = useState<string[]>([]);
    const [pendingFilterTypes, setPendingFilterTypes] = useState<string[]>([]);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);

    const filterDropdownRef = useRef<HTMLDivElement>(null);
    const columnsDropdownRef = useRef<HTMLDivElement>(null);

    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
        'Name': true, 'Composition Type': true, 'Sku': true,
        'Stock On Hand': true, 'Reorder Level': true, 'Status': true,
    });
    const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

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

    useEffect(() => {
        setExpandedRowKeys(displayData.map(d => String(d.id)));
    }, [displayData]);

    const handleDelete = () => {
        if (!deleteTarget) return;
        const all = loadData();
        const updated = all.map(d => d.id === deleteTarget.id ? { ...d, isDeleted: true } : d);
        saveData(updated);
        setData(updated.filter(d => !d.isDeleted));
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
            result.push(parentWithoutChildren);

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
                const hasChildren = record.children && record.children.length > 0;

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
                                        style={{ width: 24, height: 24, cursor: hasChildren ? 'pointer' : 'default' }}
                                        onClick={() => {
                                            if (!hasChildren) return;
                                            setExpandedRowKeys(prev =>
                                                prev.includes(String(record.id))
                                                    ? prev.filter(k => k !== String(record.id))
                                                    : [...prev, String(record.id)]
                                            );
                                        }}
                                    >
                                        <i className={`ti ${hasChildren ? (isExpanded ? 'ti-folder-open' : 'ti-folder') : 'ti-folder'} text-muted fs-16`} />
                                    </div>
                                    <h6 className="fw-medium fs-14 mb-0">
                                        <Link to="#" className="text-primary"
                                            onClick={(e) => { e.preventDefault(); navigate(route.compositeItemEdit?.replace(':id', String(record.id)) || '#'); }}>
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
    const totalImages = image || previewUrl ? 1 : 0;
    const isAssembly = itemType === 'assembly';
    const isKit = itemType === 'kit';

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImage(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    useEffect(() => {
        const loadCatalogs = async () => {
            try {
                const [bResp, cResp] = await Promise.all([
                    productService.getBrands(),
                    productService.getCategories(),
                ]);
                const freshBrands = (bResp.data?.data?.data ?? bResp.data?.data ?? bResp.data ?? []) as any[];
                const freshCategories = (cResp.data?.data?.data ?? cResp.data?.data ?? cResp.data ?? []) as any[];
                setBrands(freshBrands.map((b: any) => ({ value: String(b.id), label: b.name })));
                setCategories(freshCategories.map((c: any) => ({ value: String(c.id), label: c.name })));
            } catch (err) {
                console.error('Failed to fetch categories/brands', err);
                setBrands([
                    { value: 'brand_a', label: 'Brand A' },
                    { value: 'brand_b', label: 'Brand B' },
                ]);
                setCategories([
                    { value: 'cat_a', label: 'Category A' },
                    { value: 'cat_b', label: 'Category B' },
                ]);
            }
        };
        loadCatalogs();

        const loadProducts = async () => {
            try {
                const resp = await productService.getProducts();
                const apiItems = resp.data?.data?.data ?? resp.data?.data ?? resp.data ?? [];
                const mapped: ProductOption[] = (apiItems || []).map((p: any) => ({
                    value: String(p.id),
                    label: p.name || `Product ${p.id}`,
                    sku: p.sku || '',
                    sellingPrice: parseFloat(p.selling_price || 0),
                    costPrice: parseFloat(p.cost_price || 0),
                    stockOnHand: parseFloat(p.opening_stock || p.stock_on_hand || p.stockOnHand || 0),
                    type: p.type === 'service' ? 'service' : 'item',
                }));
                setProductOptions(mapped);
            } catch (err) {
                console.error('Failed to fetch product options', err);
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

    const handleSaveCategory = async () => {
        const name = newCategoryName.trim();
        if (!name) return;
        if (editingCategoryId) {
            setCategories(prev => prev.map(c => c.value === editingCategoryId ? { ...c, label: name } : c));
            if (selectedCategory?.value === editingCategoryId) setSelectedCategory({ value: editingCategoryId, label: name });
        } else {
            const newId = `local_${Date.now()}`;
            setCategories(prev => [...prev, { value: newId, label: name }]);
        }
        setNewCategoryName('');
        setEditingCategoryId(null);
        try {
            if (editingCategoryId) {
                await productService.updateCategory(editingCategoryId, { name });
            } else {
                await productService.createCategory({ name });
            }
            const refreshed = await productService.getCategories();
            const fresh = refreshed.data?.data?.data ?? refreshed.data?.data ?? refreshed.data ?? [];
            if (fresh.length > 0) setCategories(fresh.map((c: any) => ({ value: String(c.id), label: c.name })));
        } catch (_) {}
    };

    const handleSaveBrand = async () => {
        const name = newBrandName.trim();
        if (!name) return;
        if (editingBrandId) {
            setBrands(prev => prev.map(b => b.value === editingBrandId ? { ...b, label: name } : b));
            if (selectedBrand?.value === editingBrandId) setSelectedBrand({ value: editingBrandId, label: name });
        } else {
            const newId = `local_${Date.now()}`;
            setBrands(prev => [...prev, { value: newId, label: name }]);
        }
        setNewBrandName('');
        setEditingBrandId(null);
        try {
            if (editingBrandId) {
                await productService.updateBrand(editingBrandId, { name });
            } else {
                await productService.createBrand({ name });
            }
            const refreshed = await productService.getBrands();
            const fresh = refreshed.data?.data?.data ?? refreshed.data?.data ?? refreshed.data ?? [];
            if (fresh.length > 0) setBrands(fresh.map((b: any) => ({ value: String(b.id), label: b.name })));
        } catch (_) {}
    };

    const handleDeleteCategory = async (catId: string) => {
        if (!window.confirm('Are you sure you want to delete this category?')) return;
        setCategories(prev => prev.filter(c => c.value !== catId));
        if (selectedCategory?.value === catId) setSelectedCategory(null);
        try { await productService.deleteCategory(catId); } catch (_) {}
    };

    const handleDeleteBrand = async (brandId: string) => {
        if (!window.confirm('Are you sure you want to delete this brand?')) return;
        setBrands(prev => prev.filter(b => b.value !== brandId));
        if (selectedBrand?.value === brandId) setSelectedBrand(null);
        try { await productService.deleteBrand(brandId); } catch (_) {}
    };

    const handleSave = () => {
        if (!itemName.trim()) { alert('Please enter a name.'); return; }
        if (itemRows.filter(r => r.itemName.trim()).length === 0 && serviceRows.filter(r => r.itemName.trim()).length === 0) {
            alert('Please select at least one associated item or service.');
            return;
        }
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
        if (isEdit && id) {
            const idx = all.findIndex(a => String(a.id) === String(id));
            if (idx !== -1) all[idx] = {
                ...all[idx],
                name: itemName,
                sku,
                compositionType: itemType === 'assembly' ? 'Assembly' : 'Kit',
                reorderLevel: parseFloat(reorderPoint) || 0,
                stockOnHand: all[idx].stockOnHand ?? 0,
                category: selectedCategory?.label || '',
                brand: selectedBrand?.label || '',
                dimensions: [dimensionL, dimensionW, dimensionH].filter(Boolean).join(' x '),
                dimensionUnit: dimensionUnit.value,
                weight,
                weightUnit: weightUnit.value,
                upc,
                ean,
                mpn,
                isbn,
                children,
            };
        } else {
            const newId = all.length > 0 ? Math.max(...all.map(a => getNumericId(a.id))) + 1 : 1;
            all.push({
                id: newId,
                name: itemName,
                sku,
                compositionType: itemType === 'assembly' ? 'Assembly' : 'Kit',
                stockOnHand: 0,
                reorderLevel: parseFloat(reorderPoint) || 0,
                unit: selectedUnit?.value || 'pcs',
                sellingPrice: parseFloat(sellingPrice) || 0,
                costPrice: parseFloat(costPrice) || 0,
                category: selectedCategory?.label || '',
                brand: selectedBrand?.label || '',
                dimensions: [dimensionL, dimensionW, dimensionH].filter(Boolean).join(' x '),
                dimensionUnit: dimensionUnit.value,
                weight,
                weightUnit: weightUnit.value,
                upc,
                ean,
                mpn,
                isbn,
                children,
            });
        }
        saveData(all);
        setTimeout(() => { setLoading(false); navigate(route.compositeItems); }, 300);
    };

    // ── LIST VIEW ─────────────────────────────────────────────────────
    const listView = (
        <div className="page-wrapper">
            <div className="content pb-0">
                <PageHeader
                    title="Composite Items"
                    badgeCount={data.length}
                    showModuleTile={false}
                    showExport={true}
                    settingsLink={route.productPreference}
                />

                <div className="card h-100 mb-0 border-0 rounded-0">
                    <div className="card-header d-flex align-items-center justify-content-between gap-2 flex-wrap">
                        <div className="input-icon input-icon-start position-relative">
                            <span className="input-icon-addon text-dark">
                                <i className="ti ti-search" />
                            </span>
                            <SearchInput value={searchText} onChange={setSearchText} />
                        </div>
                        <button
                            title="Add Composite Item"
                            className="btn btn-primary d-flex align-items-center gap-1 px-3"
                            onClick={() => navigate(route.compositeItemAdd)}
                            style={{ height: '34px', borderRadius: '6px', fontWeight: 500 }}
                        >
                            <i className="ti ti-square-rounded-plus-filled me-1" />
                            Add New Item
                        </button>
                    </div>

                    <div className="card-body p-0 d-flex flex-column" style={{ minHeight: 'calc(100vh - 180px)' }}>
                        {/* Toolbar Header */}
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 p-3 pb-3">
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <div className="dropdown">
                                    <Link to="#" className="dropdown-toggle btn btn-sm btn-outline-light px-3 shadow-sm border" data-bs-toggle="dropdown" style={{ minHeight: '34px' }}>
                                        <i className="ti ti-sort-ascending-2 me-2" />
                                        Sort By
                                    </Link>
                                    <div className="dropdown-menu">
                                        <Link to="#" onClick={(e) => { e.preventDefault(); setSortBy('newest'); }} className={`dropdown-item ${sortBy === 'newest' ? 'active' : ''}`}>Newest</Link>
                                        <Link to="#" onClick={(e) => { e.preventDefault(); setSortBy('oldest'); }} className={`dropdown-item ${sortBy === 'oldest' ? 'active' : ''}`}>Oldest</Link>
                                    </div>
                                </div>
                            </div>
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <div className="dropdown" ref={filterDropdownRef}>
                                    <Link
                                        to="#"
                                        className="btn btn-sm btn-outline-light px-3 border shadow-sm d-flex align-items-center gap-1 fs-14"
                                        onClick={(e) => { e.preventDefault(); setShowFilterDropdown(!showFilterDropdown); }}
                                        style={{ minHeight: '34px' }}
                                    >
                                        <i className="ti ti-filter" />
                                        <span>Filter</span>
                                        <i className="ti ti-chevron-down ms-1" style={{ fontSize: 12 }} />
                                        {filterTypes.length > 0 && <span className="badge bg-primary ms-1">{filterTypes.length}</span>}
                                    </Link>
                                    <div className={`dropdown-menu dropdown-menu-md p-3 ${showFilterDropdown ? 'show d-block' : ''}`} style={{ position: 'absolute', top: '100%', right: 0, zIndex: 1050 }}>
                                        <h6 className="dropdown-header px-0 fs-13 fw-semibold text-dark mb-2">FILTER BY TYPE</h6>
                                        <div className="filter-content scrollable-y" style={{ maxHeight: '250px', overflowY: 'auto' }}>
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
                                            <div className="d-flex align-items-center gap-2 mt-3">
                                                <button type="button" className="btn btn-sm btn-outline-light w-100" onClick={() => { setPendingFilterTypes([]); setFilterTypes([]); setShowFilterDropdown(false); }}>Reset</button>
                                                <button type="button" className="btn btn-sm btn-primary w-100" onClick={() => { setFilterTypes([...pendingFilterTypes]); setShowFilterDropdown(false); }}>Filter</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {viewMode === 'list' && (
                                    <div className="dropdown" ref={columnsDropdownRef}>
                                        <Link
                                            to="#"
                                            className="btn btn-sm bg-soft-indigo px-3 border-0 shadow-sm d-inline-flex align-items-center gap-1 fs-14"
                                            onClick={(e) => { e.preventDefault(); setShowColumnsDropdown(!showColumnsDropdown); }}
                                            style={{ minHeight: '34px' }}
                                        >
                                            <i className="ti ti-columns-3" />
                                            <span>Manage Columns</span>
                                        </Link>
                                        <div className={`dropdown-menu dropdown-menu-md dropdown-md p-3 ${showColumnsDropdown ? 'show d-block' : ''}`} style={{ position: 'absolute', top: '100%', right: 0, zIndex: 1050 }}>
                                            <ul className="list-unstyled mb-0">
                                                {Object.keys(visibleColumns).map(col => (
                                                    <li className="gap-1 d-flex align-items-center mb-2" key={col}>
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

                        {/* Data Table (List Mode) */}
                        {viewMode === 'list' && (
                            <div className="custom-table table-nowrap overflow-visible flex-grow-1">
                                <Datatable
                                    columns={columns.filter(c => c.title === 'Action' || visibleColumns[c.title as string])}
                                    dataSource={tableData}
                                    Selection={true}
                                    searchText={searchText}
                                    expandable={{
                                        // We handle hierarchy via flat list, only use expandable for visual consistency if needed
                                        expandIcon: () => null,
                                    }}
                                />
                            </div>
                        )}

                        {/* Grid View */}
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
                                                <div className="card border mb-0 shadow-none">
                                                    <div className="card-body">
                                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                                            <div className="d-flex align-items-center">
                                                                <span className={`badge badge-tag me-2 border-0 ${item.compositionType === 'Assembly' ? 'badge-soft-danger text-danger' : 'badge-soft-purple text-purple'}`}>
                                                                    <i className={`ti ti-square-rounded-filled fs-8 me-1 ${item.compositionType === 'Assembly' ? 'text-danger' : 'text-purple'}`} />
                                                                    {item.compositionType || 'Assembly'}
                                                                </span>
                                                                <span className="badge bg-success">Active</span>
                                                            </div>
                                                            <span className="avatar avatar-xs fs-16">
                                                                <i className="ti ti-star-filled text-warning" />
                                                            </span>
                                                        </div>

                                                        <div className="d-flex align-items-center justify-content-between bg-light rounded p-2 mb-3">
                                                            <div className="d-flex align-items-center">
                                                                <div className="avatar border rounded-circle bg-white flex-shrink-0 me-2 d-flex align-items-center justify-content-center"
                                                                    style={{ width: 36, height: 36 }}>
                                                                    <i className="ti ti-packages fs-18 text-muted" />
                                                                </div>
                                                                <div>
                                                                    <h5 className="fw-medium fs-14 mb-0">
                                                                        <Link to="#" className="text-dark"
                                                                            onClick={e => { e.preventDefault(); navigate(route.compositeItemEdit.replace(':id', String(item.id))); }}>
                                                                            {item.name}
                                                                        </Link>
                                                                    </h5>
                                                                    <p className="fs-13 mb-0 text-muted">{item.compositionType || 'Assembly'}</p>
                                                                </div>
                                                            </div>
                                                            <div className="dropdown table-action">
                                                                <Link to="#" className="action-icon" data-bs-toggle="dropdown" aria-expanded="false">
                                                                    <i className="ti ti-dots-vertical" />
                                                                </Link>
                                                                <div className="dropdown-menu dropdown-menu-right">
                                                                    <Link className="dropdown-item" to="#" onClick={e => { e.preventDefault(); navigate(route.compositeItemEdit.replace(':id', String(item.id))); }}>
                                                                        <i className="ti ti-edit text-blue" /> Edit
                                                                    </Link>
                                                                    <Link className="dropdown-item" to="#" onClick={() => setDeleteTarget(item)}>
                                                                        <i className="ti ti-trash text-danger" /> Delete
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="d-block mb-0">
                                                            <div className="mb-2">
                                                                <p className="d-flex align-items-center mb-1 fs-13 text-dark">
                                                                    <i className="ti ti-barcode me-2" />
                                                                    SKU: {item.sku || '—'}
                                                                </p>
                                                                <p className="d-flex align-items-center mb-1 fs-13 text-dark">
                                                                    <i className="ti ti-stack-2 me-2" />
                                                                    Stock on Hand: {(item.stockOnHand ?? 0).toFixed(2)}
                                                                </p>
                                                            </div>
                                                            <div className="d-flex align-items-center justify-content-between">
                                                                <div className="avatar-list-stacked avatar-group-sm">
                                                                    {(item.children || []).slice(0, 3).map((child, idx) => (
                                                                        <span key={idx} className="avatar avatar-rounded bg-light border d-flex align-items-center justify-content-center" style={{ width: 24, height: 24 }}>
                                                                            <i className="ti ti-package fs-10 text-muted" />
                                                                        </span>
                                                                    ))}
                                                                    {(item.children?.length ?? 0) > 3 && (
                                                                        <span className="avatar text-dark bg-light border avatar-rounded fs-10" style={{ width: 24, height: 24 }}>
                                                                            +{(item.children?.length ?? 0) - 3}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="fs-12 text-muted">{item.children?.length || 0} items</span>
                                                            </div>
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

                {deleteTarget && (
                    <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content border-0 shadow">
                                <div className="modal-body p-4 text-center">
                                    <i className="ti ti-trash text-danger mb-3" style={{ fontSize: 48 }} />
                                    <h5 className="mb-2">Delete Item?</h5>
                                    <p className="text-muted mb-4">Are you sure you want to delete "{deleteTarget.name}"? This action cannot be undone.</p>
                                    <div className="d-flex gap-2 justify-content-center">
                                        <button className="btn btn-light px-4" onClick={() => setDeleteTarget(null)}>Cancel</button>
                                        <button className="btn btn-danger px-4" onClick={() => { setData(prev => prev.map(d => d.id === deleteTarget.id ? { ...d, isDeleted: true } : d)); saveData(data.map(d => d.id === deleteTarget.id ? { ...d, isDeleted: true } : d)); setDeleteTarget(null); }}>Delete</button>
                                    </div>
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
                />
                <div className="card">
                    <div className="card-body">
                        <div className="border-bottom mb-3 pb-3">
                            <h5 className="mb-0 fs-17">{isEdit ? 'Edit Composite Item' : 'New Composite Item'}</h5>
                        </div>
                        <form onSubmit={e => e.preventDefault()}>
                            <div className="row mb-3">
                                <div className="col-lg-8">
                                    {/* Name */}
                                    <div className="row align-items-center mb-3">
                                        <div className="col-md-3"><label className="form-label mb-0">Name <span className="text-danger">*</span></label></div>
                                        <div className="col-md-9"><input className="form-control" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Enter item name" /></div>
                                    </div>

                                    {/* SKU */}
                                    <div className="row align-items-center mb-3">
                                        <div className="col-md-3"><label className="form-label mb-0">SKU</label></div>
                                        <div className="col-md-9"><input className="form-control" value={sku} onChange={e => setSku(e.target.value)} /></div>
                                    </div>

                                    {/* Product Type Toggle */}
                                    <div className="row align-items-start mb-3">
                                        <div className="col-md-3"><label className="form-label mt-2">Composition Type</label></div>
                                        <div className="col-md-9 pt-1">
                                            <div className="form-check form-check-inline">
                                                <input className="form-check-input" type="radio" name="itemType" id="assembly" checked={itemType === 'assembly'} onChange={() => setItemType('assembly')} />
                                                <label className="form-check-label text-dark" htmlFor="assembly">Assembly</label>
                                            </div>
                                            <div className="form-check form-check-inline">
                                                <input className="form-check-input" type="radio" name="itemType" id="kit" checked={itemType === 'kit'} onChange={() => setItemType('kit')} />
                                                <label className="form-check-label text-dark" htmlFor="kit">Kit</label>
                                            </div>
                                            <div className="extra-small text-muted mt-2 d-flex gap-2">
                                                <span className={itemType === 'assembly' ? 'text-primary' : ''}>[Assembly: Stock of components decreases when you bundle them]</span>
                                                <span className={itemType === 'kit' ? 'text-primary' : ''}>[Kit: Components are stocked and sold together]</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="row align-items-start mb-3">
                                        <div className="col-md-3"><label className="form-label mt-1">Description</label></div>
                                        <div className="col-md-9"><textarea className="form-control" rows={3} value={itemDescription} onChange={e => setItemDescription(e.target.value)} /></div>
                                    </div>
                                </div>

                                <div className="col-lg-4 border-start px-4">
                                    <div className="mb-3 text-center">
                                        <div className="avatar avatar-xxxl border rounded bg-light mb-2 d-flex align-items-center justify-content-center overflow-hidden position-relative">
                                            {previewUrl ? (
                                                <img src={previewUrl} className="w-100 h-100 object-fit-cover" alt="Preview" />
                                            ) : (
                                                <i className="ti ti-photo fs-48 text-muted" />
                                            )}
                                        </div>
                                        <div className="d-flex justify-content-center gap-2 mt-2">
                                            <label className="btn btn-sm btn-outline-primary cursor-pointer mb-0">
                                                Upload <input type="file" hidden accept="image/*" onChangeCapture={handleImageChange} />
                                            </label>
                                            {previewUrl && <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => { setImage(null); setPreviewUrl(''); }}>Remove</button>}
                                        </div>
                                        <div className="extra-small text-muted mt-2">Max 5MB (JPG, PNG)</div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-medium">Category</label>
                                        <div className="input-group">
                                            <Select className="custom-react-select flex-grow-1" options={categories} styles={customStyles} theme={neutralTheme} components={{ IndicatorSeparator: () => null, DropdownIndicator }} value={selectedCategory} onChange={setSelectedCategory} placeholder="Select category" isSearchable />
                                            <button type="button" className="btn btn-light border" onClick={() => setShowCategoryModal(true)}><i className="ti ti-plus" /></button>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-medium">Brand</label>
                                        <div className="input-group">
                                            <Select className="custom-react-select flex-grow-1" options={brands} styles={customStyles} theme={neutralTheme} components={{ IndicatorSeparator: () => null, DropdownIndicator }} value={selectedBrand} onChange={setSelectedBrand} placeholder="Select brand" isSearchable />
                                            <button type="button" className="btn btn-light border" onClick={() => setShowBrandModal(true)}><i className="ti ti-plus" /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Associate Items Section */}
                            <div className="mt-4 pt-4 border-top">
                                <h6 className="mb-3">{itemType === 'assembly' ? 'Associated Items & Services' : 'Kit Components'}</h6>
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
                                                {itemRows.map((row, index) => (
                                                    <tr key={row.id}>
                                                        <td className="border-0 py-2 position-relative" style={{ paddingLeft: '44px' }}>
                                                            <TreeConnector
                                                                isChild={true}
                                                                isLastChild={index === itemRows.length - 1 && serviceRows.length === 0}
                                                            />
                                                            <div style={{ position: 'relative', zIndex: 2 }}>
                                                                <Select
                                                                    className="custom-react-select"
                                                                    styles={customStyles}
                                                                    theme={neutralTheme}
                                                                    components={{ IndicatorSeparator: () => null, DropdownIndicator }}
                                                                    options={productOptions.filter(opt => opt.type !== 'service')}
                                                                    value={row.productId ? productOptions.find(opt => opt.value === row.productId) || null : null}
                                                                    onChange={(val: any) => {
                                                                        if (!val) {
                                                                            setItemRows(itemRows.map(r => r.id === row.id ? { ...r, itemName: '', productId: undefined, stockOnHand: 0 } : r));
                                                                            return;
                                                                        }
                                                                        updateItemRowProduct(row.id, val.value);
                                                                    }}
                                                                    placeholder="Click to select an item"
                                                                    menuPortalTarget={document.body}
                                                                    menuPosition="fixed"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="border-0 py-2">
                                                            <input type="number" className="form-control form-control-sm text-end" value={row.quantity} min="0" onChange={e => setItemRows(itemRows.map(r => r.id === row.id ? { ...r, quantity: e.target.value } : r))} />
                                                        </td>
                                                        <td className="border-0 py-2">
                                                            <input type="number" className="form-control form-control-sm text-end" value={row.sellingPrice} step="0.01" min="0" onChange={e => setItemRows(itemRows.map(r => r.id === row.id ? { ...r, sellingPrice: e.target.value } : r))} />
                                                        </td>
                                                        <td className="border-0 py-2">
                                                            <input type="number" className="form-control form-control-sm text-end" value={row.costPrice} step="0.01" min="0" onChange={e => setItemRows(itemRows.map(r => r.id === row.id ? { ...r, costPrice: e.target.value } : r))} />
                                                        </td>
                                                        <td className="border-0 py-2 text-center position-relative">
                                                            <div className="d-inline-flex align-items-center gap-2">
                                                                <button type="button" className="btn p-0 text-danger border-0" onClick={() => setItemRows(itemRows.length === 1 ? [newRow('item')] : itemRows.filter(r => r.id !== row.id))}>
                                                                    <i className="ti ti-x" style={{ fontSize: 12 }} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}

                                                {showServiceSection && serviceRows.map((row, index) => (
                                                    <tr key={row.id}>
                                                        <td className="border-0 py-2 position-relative" style={{ paddingLeft: '44px' }}>
                                                            <TreeConnector
                                                                isChild={true}
                                                                isLastChild={index === serviceRows.length - 1}
                                                            />
                                                            <div style={{ position: 'relative', zIndex: 2 }}>
                                                                <Select
                                                                    className="custom-react-select"
                                                                    styles={customStyles}
                                                                    theme={neutralTheme}
                                                                    components={{ IndicatorSeparator: () => null, DropdownIndicator }}
                                                                    options={productOptions.filter(opt => opt.type === 'service')}
                                                                    value={row.productId ? productOptions.find(opt => opt.value === row.productId) || null : null}
                                                                    onChange={(val: any) => {
                                                                        if (!val) {
                                                                            setServiceRows(serviceRows.map(r => r.id === row.id ? { ...r, itemName: '', productId: undefined, stockOnHand: 0 } : r));
                                                                            return;
                                                                        }
                                                                        updateServiceRowProduct(row.id, val.value);
                                                                    }}
                                                                    placeholder="Select a service"
                                                                    menuPortalTarget={document.body}
                                                                    menuPosition="fixed"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="border-0 py-2">
                                                            <input type="number" className="form-control form-control-sm text-end" value={row.quantity} min="0" onChange={e => setServiceRows(serviceRows.map(r => r.id === row.id ? { ...r, quantity: e.target.value } : r))} />
                                                        </td>
                                                        <td className="border-0 py-2">
                                                            <input type="number" className="form-control form-control-sm text-end" value={row.sellingPrice} step="0.01" min="0" onChange={e => setServiceRows(serviceRows.map(r => r.id === row.id ? { ...r, sellingPrice: e.target.value } : r))} />
                                                        </td>
                                                        <td className="border-0 py-2">
                                                            <input type="number" className="form-control form-control-sm text-end" value={row.costPrice} step="0.01" min="0" onChange={e => setServiceRows(serviceRows.map(r => r.id === row.id ? { ...r, costPrice: e.target.value } : r))} />
                                                        </td>
                                                        <td className="border-0 py-2 text-center">
                                                            <button type="button" className="btn p-0 text-danger border-0" onClick={() => setServiceRows(serviceRows.filter(r => r.id !== row.id))}>
                                                                <i className="ti ti-x" style={{ fontSize: 12 }} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr>
                                                    <td className="border-0 pt-2 pb-3 ps-4">
                                                        <div className="d-flex gap-3">
                                                            <button type="button" className="text-primary fw-medium fs-14 d-flex align-items-center border-0 bg-transparent p-0" onClick={() => setItemRows([...itemRows, newRow('item')])}>
                                                                <i className="ti ti-circle-plus me-1" /> Add New Row
                                                            </button>
                                                            {!showServiceSection && (
                                                                <button type="button" className="text-primary fw-medium fs-14 d-flex align-items-center border-0 bg-transparent p-0" onClick={() => { setShowServiceSection(true); setServiceRows([newRow('service')]); }}>
                                                                    <i className="ti ti-circle-plus me-1" /> Add Services
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="border-0 pt-2 pb-3 text-end text-muted fs-14">Total (₹):</td>
                                                    <td className="border-0 pt-2 pb-3 text-end fw-semibold fs-14">{totalSelling.toFixed(2)}</td>
                                                    <td className="border-0 pt-2 pb-3 text-end fw-semibold fs-14">{totalCost.toFixed(2)}</td>
                                                    <td className="border-0 pt-2 pb-3"></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>

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
                            <div className="d-flex align-items-center justify-content-end flex-wrap gap-2 pt-4 mt-2 border-top">
                                <button type="button" className="btn btn-sm btn-light" onClick={() => navigate(route.compositeItems)}>Cancel</button>
                                <button type="button" className="btn btn-sm btn-primary" onClick={handleSave} disabled={loading}>
                                    {loading ? <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" /> : null}
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {showCategoryModal && (
                <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.45)', zIndex: 3000 }}
                    onClick={(e) => { if (e.target === e.currentTarget) { setShowCategoryModal(false); setEditingCategoryId(null); setNewCategoryName(''); } }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-3">
                            <div className="modal-header border-bottom-0 pb-0">
                                <h5 className="modal-title fw-semibold">Manage Categories</h5>
                                <button type="button" className="btn-close" onClick={() => { setShowCategoryModal(false); setEditingCategoryId(null); setNewCategoryName(''); }} />
                            </div>
                            <div className="modal-body pt-3">
                                <div className="mb-3">
                                    <label className="form-label fw-medium">Category Name <span className="text-danger">*</span></label>
                                    <input
                                        className="form-control"
                                        placeholder="Enter category name"
                                        value={newCategoryName}
                                        onChange={e => setNewCategoryName(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveCategory(); }}
                                    />
                                </div>
                                <div className="d-flex gap-2 mb-4">
                                    <button type="button" className="btn btn-primary btn-sm px-3" onClick={handleSaveCategory}>
                                        {editingCategoryId ? 'Update' : 'Save'}
                                    </button>
                                    <button type="button" className="btn btn-light btn-sm px-3 border" onClick={() => { setEditingCategoryId(null); setNewCategoryName(''); }}>
                                        Cancel
                                    </button>
                                </div>
                                <div className="border-top pt-3">
                                    <p className="fw-semibold text-uppercase fs-12 text-muted mb-2 d-flex align-items-center gap-1">
                                        Categories
                                        <OverlayTrigger placement="top" overlay={<Tooltip id="cat-tip">All created categories</Tooltip>}>
                                            <i className="ti ti-info-circle text-muted" style={{ fontSize: 13 }} />
                                        </OverlayTrigger>
                                    </p>
                                    {categories.length === 0 ? (
                                        <p className="text-muted fs-13">No categories yet.</p>
                                    ) : (
                                        <div className="list-group list-group-flush">
                                            {categories.map(cat => (
                                                <div key={cat.value} className="list-group-item px-0 d-flex align-items-center justify-content-between">
                                                    <span className="fs-14">{cat.label}</span>
                                                    <div className="d-flex gap-1">
                                                        <button type="button" className="btn btn-xs btn-icon btn-outline-light" title="Edit"
                                                            onClick={() => { setEditingCategoryId(cat.value); setNewCategoryName(cat.label); }}>
                                                            <i className="ti ti-edit text-blue" style={{ fontSize: 13 }} />
                                                        </button>
                                                        <button type="button" className="btn btn-xs btn-icon btn-outline-danger" title="Delete"
                                                            onClick={() => handleDeleteCategory(cat.value)}>
                                                            <i className="ti ti-trash" style={{ fontSize: 13 }} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showBrandModal && (
                <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.45)', zIndex: 3000 }}
                    onClick={(e) => { if (e.target === e.currentTarget) { setShowBrandModal(false); setEditingBrandId(null); setNewBrandName(''); } }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-3">
                            <div className="modal-header border-bottom-0 pb-0">
                                <h5 className="modal-title fw-semibold">Manage Brands</h5>
                                <button type="button" className="btn-close" onClick={() => { setShowBrandModal(false); setEditingBrandId(null); setNewBrandName(''); }} />
                            </div>
                            <div className="modal-body pt-3">
                                <div className="mb-3">
                                    <label className="form-label fw-medium">Brand Name <span className="text-danger">*</span></label>
                                    <input
                                        className="form-control"
                                        placeholder="Enter brand name"
                                        value={newBrandName}
                                        onChange={e => setNewBrandName(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveBrand(); }}
                                    />
                                </div>
                                <div className="d-flex gap-2 mb-4">
                                    <button type="button" className="btn btn-primary btn-sm px-3" onClick={handleSaveBrand}>
                                        {editingBrandId ? 'Update' : 'Save'}
                                    </button>
                                    <button type="button" className="btn btn-light btn-sm px-3 border" onClick={() => { setEditingBrandId(null); setNewBrandName(''); }}>
                                        Cancel
                                    </button>
                                </div>
                                <div className="border-top pt-3">
                                    <p className="fw-semibold text-uppercase fs-12 text-muted mb-2 d-flex align-items-center gap-1">
                                        Brands
                                        <OverlayTrigger placement="top" overlay={<Tooltip id="brand-tip">All created brands</Tooltip>}>
                                            <i className="ti ti-info-circle text-muted" style={{ fontSize: 13 }} />
                                        </OverlayTrigger>
                                    </p>
                                    {brands.length === 0 ? (
                                        <p className="text-muted fs-13">No brands yet.</p>
                                    ) : (
                                        <div className="list-group list-group-flush">
                                            {brands.map(brand => (
                                                <div key={brand.value} className="list-group-item px-0 d-flex align-items-center justify-content-between">
                                                    <span className="fs-14">{brand.label}</span>
                                                    <div className="d-flex gap-1">
                                                        <button type="button" className="btn btn-xs btn-icon btn-outline-light" title="Edit"
                                                            onClick={() => { setEditingBrandId(brand.value); setNewBrandName(brand.label); }}>
                                                            <i className="ti ti-edit text-blue" style={{ fontSize: 13 }} />
                                                        </button>
                                                        <button type="button" className="btn btn-xs btn-icon btn-outline-danger" title="Delete"
                                                            onClick={() => handleDeleteBrand(brand.value)}>
                                                            <i className="ti ti-trash" style={{ fontSize: 13 }} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
            </div>
        </div>
    );

    return isList ? listView : formView;
};

export default CompositeItem;
