// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../../../api/axios";
import { all_routes } from "../../../../routes/all_routes";
import {
    getAllRaw,
    loadStorageItems,
    saveAll,
    saveStorageItems,
    type Invoice,
} from "./invoice-list";

interface AttachedFile {
    id: number;
    name: string;
}
interface LineItem {
    id: number;
    description: string;
    qty: number;
    rate: number;
    discount: number;
    discountType: "%" | "amount";
    amount: number;
}

function formatDate(d: Date) {
    return `${("0" + d.getDate()).slice(-2)}/${("0" + (d.getMonth() + 1)).slice(-2)}/${d.getFullYear()}`;
}
function toInputDate(s: string) {
    if (!s) return "";
    const p = s.split("/");
    return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : s;
}
function fromInputDate(s: string) {
    if (!s) return "";
    const p = s.split("-");
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : s;
}

const SALESPERSONS = ["Salesperson 1", "Salesperson 2"];
const PAYMENT_TERMS = ["Due on Receipt", "Net 7", "Net 15", "Net 30", "Net 45", "Net 60", "Custom"];
const TRANSACTION_SERIES = ["Default Transaction Series"];
const TAX_OPTIONS = ["CGST 9%", "SGST 9%", "IGST 18%"];
const CUSTOMER_CATEGORIES = ["Category 1", "Category 2"];
const PRICE_LISTS = ["Standard Price List", "Wholesale Price List"];
const fmt2 = (n: number) => n.toFixed(2);

const AddInvoice: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id?: string }>();
    const route = all_routes;
    const isEdit = !!id;

    const [customerName, setCustomerName] = useState("");
    const [transactionSeries, setTransactionSeries] = useState("Default Transaction Series");
    const [invNumber, setInvNumber] = useState("");
    const [orderNumber, setOrderNumber] = useState("");
    const [invoiceDate, setInvoiceDate] = useState(toInputDate(formatDate(new Date())));
    const [paymentTerms, setPaymentTerms] = useState("Due on Receipt");
    const [dueDate, setDueDate] = useState(toInputDate(formatDate(new Date())));
    const [salesperson, setSalesperson] = useState("");
    const [subject, setSubject] = useState("");
    const [customerCategory, setCustomerCategory] = useState("");
    const [priceList, setPriceList] = useState("");
    const [reference, setReference] = useState("");
    const [location, setLocation] = useState("");
    const [showReferenceModal, setShowReferenceModal] = useState(false);
    const [referrals, setReferrals] = useState([
        { id: 1, name: "Anandh", email: "anandh@gmail.com", phone: "9122044555", type: "Referral" },
        { id: 2, name: "Ranjith", email: "ranjith123@gmail.com", phone: "9876543211", type: "Referral" }
    ]);
    const [showAddReferralForm, setShowAddReferralForm] = useState(false);
    const [newRef, setNewRef] = useState({ name: "", email: "", phone: "", type: "Referral" });
    const [taxType, setTaxType] = useState<"TDS" | "TCS">("TDS");
    const [selectedTax, setSelectedTax] = useState("");
    const [courierCharges, setCourierCharges] = useState(0);
    const [otherCharges, setOtherCharges] = useState<{ label: string; amount: number }[]>([]);

    function addOtherCharge() {
        setOtherCharges(prev => [...prev, { label: "", amount: 0 }]);
    }
    function updateOtherCharge(index: number, field: "label" | "amount", value: string | number) {
        setOtherCharges(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value } as any;
            return next;
        });
    }
    function removeOtherCharge(index: number) {
        setOtherCharges(prev => prev.filter((_, i) => i !== index));
    }
    const [notes, setNotes] = useState("Thanks for your business.");

    const [uploadedFiles, setUploadedFiles] = useState<AttachedFile[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [items, setItems] = useState<LineItem[]>([
        { id: 1, description: "", qty: 1, rate: 0, discount: 0, discountType: "%", amount: 0 },
    ]);
    const [activeSearchIdx, setActiveSearchIdx] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const INVENTORY_ITEMS = [
        { id: 1, name: "vijay", sku: "kjhgfc", rate: 230, stock: "19,001.00 box" },
        { id: 2, name: "Item Two", sku: "SKU002", rate: 450, stock: "150.00 pcs" },
        { id: 3, name: "Sample Product", sku: "PRD003", rate: 1200, stock: "45.00 unit" },
    ];

    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [customerSearchQuery, setCustomerSearchQuery] = useState("");
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

    const [showConfigModal, setShowConfigModal] = useState(false);
    const [autoGenerate, setAutoGenerate] = useState(true);
    const [invoicePrefix, setInvoicePrefix] = useState("INV-");
    const [nextInvoiceNum, setNextInvoiceNum] = useState("000001");
    const [restartNumbering, setRestartNumbering] = useState(false);

    const [showGatewayModal, setShowGatewayModal] = useState(false);
    const [selectedGateway, setSelectedGateway] = useState("");

    const [paymentReceived, setPaymentReceived] = useState(false);
    const [paymentMode, setPaymentMode] = useState("Cash");
    const [depositTo, setDepositTo] = useState("Petty Cash");
    const [paymentRows, setPaymentRows] = useState([
        { paymentMode: "Cash", depositTo: "Petty Cash", advanceAmount: 0, amount: 0 }
    ]);

    const [advancePayment, setAdvancePayment] = useState(false);
    const [advanceRows, setAdvanceRows] = useState([
        { paymentMode: "Cash", depositTo: "Petty Cash", amount: 0 }
    ]);
    const [isAdvanceCategory, setIsAdvanceCategory] = useState(false);
    const [customerAdvanceBalance, setCustomerAdvanceBalance] = useState(0);
    const [advanceCategoryCustomers, setAdvanceCategoryCustomers] = useState<{ name: string; balance: number }[]>([]);

    const [bulkOpen, setBulkOpen] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [selectedBulkItems, setSelectedBulkItems] = useState<number[]>([]);
    const [bulkSearch, setBulkSearch] = useState("");
    const bulkSearchRef = useRef<HTMLInputElement>(null);
    const [isScannerMode, setIsScannerMode] = useState(false);
    const [scannedFeedback, setScannedFeedback] = useState("");

    useEffect(() => {
        if (showBulkModal) {
            setTimeout(() => bulkSearchRef.current?.focus(), 100);
        } else {
            setIsScannerMode(false);
        }
    }, [showBulkModal]);

    function handleAddItem(itemToAdd: any) {
        setItems(prev => {
            const newItems = [...prev];
            // Remove empty last row if it exists
            if (newItems.length > 0 && newItems[newItems.length - 1].description === "") {
                newItems.pop();
            }
            return [...newItems, {
                id: Date.now(),
                description: itemToAdd.name,
                qty: 1,
                rate: itemToAdd.rate,
                discount: 0,
                discountType: "%",
                amount: itemToAdd.rate
            }];
        });
    }
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            // Check if click is outside any search-related element
            if (!target.closest(".item-search-container") && !target.closest(".customer-search-container")) {
                setActiveSearchIdx(null);
                setShowCustomerDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    useEffect(() => {
        const load = async () => {
            let allCustomers = [];

            // 1. Load from localStorage (Source: Customer Page)
            try {
                const localData = localStorage.getItem("billing_customers");
                if (localData) {
                    allCustomers = JSON.parse(localData);
                }
            } catch (err) {
                console.error("Error loading local customers:", err);
            }

            // 2. Load from API (Fallback/Merge)
            try {
                const res = await api.get("/customers");
                const apiCustomers = (res.data as { data: any[] }).data || [];
                // Merge or prioritize local data if needed
                // For now, we combine them
                allCustomers = [...allCustomers, ...apiCustomers.filter(ac => !allCustomers.find(lc => lc.id === ac.id))];
            } catch { /**/ }

            setCustomers(allCustomers);

            if (!isEdit) {
                try {
                    const res = await api.get("/invoices/next-number");
                    setInvNumber((res.data as { invoice_number: string }).invoice_number);
                } catch { /**/ }
            }
        };
        void load();
    }, [isEdit]);

    useEffect(() => {
        if (isEdit && id) {
            const inv = getAllRaw().find((i: Invoice) => i.id === +id);
            if (inv) {
                setCustomerName(inv.customerName);
                setInvoiceDate(toInputDate(inv.date));
                setDueDate(toInputDate(inv.dueDate));
                setOrderNumber(inv.orderNumber || "");
                setInvNumber(inv.invoiceNumber);
                const loaded = loadStorageItems<LineItem>(inv.id) as LineItem[];
                if (loaded.length > 0) setItems(loaded);
            }
        }
    }, [id, isEdit]);

    useEffect(() => {
        try {
            const prefs = JSON.parse(localStorage.getItem("invoice_preferences") || "{}");
            if (!prefs.advancePaymentEnabled) { setAdvanceCategoryCustomers([]); return; }
            const savedCats: any[] = (() => { try { return JSON.parse(localStorage.getItem("categories") || "[]"); } catch { return []; } })();
            const defaultCats = [
                { id: 1, name: "Super_stockist" }, { id: 2, name: "mvbfy" }, { id: 3, name: "cfvgbhj" },
                { id: 4, name: "New SS" }, { id: 5, name: "drtr" }, { id: 6, name: "New S" }, { id: 7, name: "Super_distributor" },
            ];
            const allCats = [...defaultCats.filter(d => !savedCats.find((s: any) => s.id === d.id)), ...savedCats];
            const advCatIds: number[] = prefs.advancePaymentCategories || [];
            const advCatNames = allCats.filter(c => advCatIds.includes(c.id)).map(c => c.name.trim().toLowerCase());
            const balances = JSON.parse(localStorage.getItem("customer_advance_balances") || "{}");
            const allCustomers: any[] = (() => { try { return JSON.parse(localStorage.getItem("billing_customers") || "[]"); } catch { return []; } })();
            const matched = allCustomers
                .filter(c => advCatNames.includes((c.companyCategory || "").trim().toLowerCase()))
                .map(c => ({
                    name: c.displayName || c.display_name || c.companyName || "Unknown",
                    balance: balances[String(c.id)] || 0,
                }));
            setAdvanceCategoryCustomers(matched);
        } catch { setAdvanceCategoryCustomers([]); }
    }, [customers]);

    useEffect(() => {
        try {
            const prefs = JSON.parse(localStorage.getItem("invoice_preferences") || "{}");
            if (!prefs.advancePaymentEnabled || !customerName) {
                setIsAdvanceCategory(false);
                setCustomerAdvanceBalance(0);
                return;
            }
            const selectedCustomer = customers.find((c: any) => String(c.id) === customerName);
            if (!selectedCustomer) { setIsAdvanceCategory(false); return; }

            const custCat = (selectedCustomer.companyCategory || "").trim().toLowerCase();
            const savedCats: any[] = (() => { try { return JSON.parse(localStorage.getItem("categories") || "[]"); } catch { return []; } })();
            const defaultCats = [
                { id: 1, name: "Super_stockist" }, { id: 2, name: "mvbfy" }, { id: 3, name: "cfvgbhj" },
                { id: 4, name: "New SS" }, { id: 5, name: "drtr" }, { id: 6, name: "New S" }, { id: 7, name: "Super_distributor" },
            ];
            const allCats = [...defaultCats.filter(d => !savedCats.find(s => s.id === d.id)), ...savedCats];
            const advCatIds: number[] = prefs.advancePaymentCategories || [];
            const advCatNames = allCats.filter(c => advCatIds.includes(c.id)).map(c => c.name.trim().toLowerCase());
            const matched = advCatNames.includes(custCat);
            setIsAdvanceCategory(matched);

            if (matched) {
                const balances = JSON.parse(localStorage.getItem("customer_advance_balances") || "{}");
                setCustomerAdvanceBalance(balances[customerName] || 0);
            } else {
                setCustomerAdvanceBalance(0);
            }
        } catch { setIsAdvanceCategory(false); }
    }, [customerName, customers]);

    const selectedCustomerObj = customers.find((c: any) => String(c.id) === customerName);
    const selectedCustomerDisplayName = selectedCustomerObj?.displayName || selectedCustomerObj?.display_name || "";

    const subtotal = items.reduce((s, i) => s + i.amount, 0);

    function calcTaxAmount(): number {
        if (!selectedTax) return 0;
        const match = selectedTax.match(/(\d+(\.\d+)?)%/);
        if (!match) return 0;
        return (subtotal * parseFloat(match[1])) / 100;
    }
    const taxAmount = calcTaxAmount();
    const totalOtherCharges = otherCharges.reduce((s, c) => s + c.amount, 0);
    const total = subtotal + taxAmount + courierCharges + totalOtherCharges;
    const amountReceived = paymentRows.reduce((s, r) => s + r.amount + (r.advanceAmount || 0), 0);

    function updateItem(index: number, field: keyof LineItem, value: string | number) {
        setItems(prev => {
            const next = [...prev];
            const it = { ...next[index], [field]: value } as LineItem;
            if (["qty", "rate", "discount", "discountType"].includes(field as string)) {
                const gross = +it.qty * +it.rate;
                const discAmt = it.discountType === "%" ? (gross * +it.discount) / 100 : +it.discount;
                it.amount = Math.max(0, gross - discAmt);
            }
            next[index] = it;
            return next;
        });
    }

    function addRow() {
        setItems(prev => [...prev, { id: Date.now(), description: "", qty: 1, rate: 0, discount: 0, discountType: "%", amount: 0 }]);
    }

    function removeRow(index: number) {
        setItems(prev => prev.filter((_, i) => i !== index));
    }

    function addPaymentRow() {
        setPaymentRows(prev => [...prev, { paymentMode: "Bank Transfer", depositTo: "Savings Account", advanceAmount: 0, amount: 0 }]);
    }

    function handleDeleteReferral(id: number) {
        setReferrals(prev => prev.filter(r => r.id !== id));
    }

    function handleEditReferral(id: number) {
        const ref = referrals.find(r => r.id === id);
        if (ref) {
            const newName = prompt("Edit Name:", ref.name);
            if (newName) {
                setReferrals(prev => prev.map(r => r.id === id ? { ...r, name: newName } : r));
            }
        }
    }

    function handleSaveReferral() {
        if (!newRef.name) return;
        const id = referrals.length > 0 ? Math.max(...referrals.map(r => r.id)) + 1 : 1;
        setReferrals(prev => [...prev, { ...newRef, id }]);
        setNewRef({ name: "", email: "", phone: "", type: "Referral" });
        setShowAddReferralForm(false);
    }

    function removePaymentRow(index: number) {
        if (paymentRows.length > 1) {
            setPaymentRows(prev => prev.filter((_, i) => i !== index));
        }
    }

    function updatePaymentRow(index: number, field: string, value: any) {
        setPaymentRows(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    }

    function addAdvanceRow() {
        setAdvanceRows(prev => [...prev, { paymentMode: "Cash", depositTo: "Petty Cash", amount: 0 }]);
    }
    function removeAdvanceRow(index: number) {
        if (advanceRows.length > 1) setAdvanceRows(prev => prev.filter((_, i) => i !== index));
    }
    function updateAdvanceRow(index: number, field: string, value: any) {
        setAdvanceRows(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const fl = e.target.files;
        if (!fl) return;
        const ts = window.performance.now();
        const added: AttachedFile[] = [];
        for (let j = 0; j < fl.length; j++) {
            added.push({ id: Math.floor(ts) + j, name: fl[j].name });
        }
        setUploadedFiles(prev => {
            const next = [...prev, ...added];
            return next.length > 10 ? next.slice(0, 10) : next;
        });
        e.target.value = "";
    }

    function handleSave(status: "Draft" | "Sent") {
        setLoading(true);
        try {
            const all = getAllRaw();
            let savedId: number;

            const selectedCustomer = customers.find((c: any) => String(c.id) === customerName);
            const displayName = selectedCustomer?.displayName || selectedCustomer?.display_name || customerName || "Unknown Customer";

            if (isEdit && id) {
                savedId = Number(id);
                const idx = all.findIndex(inv => inv.id === savedId);
                if (idx !== -1) {
                    all[idx] = {
                        ...all[idx],
                        customerName: displayName,
                        invoiceNumber: invNumber,
                        date: fromInputDate(invoiceDate),
                        dueDate: fromInputDate(dueDate),
                        orderNumber,
                        status,
                        amount: total,
                    };
                }
            } else {
                savedId = all.length ? Math.max(...all.map(a => a.id)) + 1 : 1;
                all.push({
                    id: savedId,
                    invoiceNumber: invNumber || `INV-${String(savedId).padStart(6, "0")}`,
                    customerName: displayName,
                    date: fromInputDate(invoiceDate),
                    dueDate: fromInputDate(dueDate),
                    orderNumber,
                    status,
                    amount: total,
                });
            }

            saveAll(all);
            saveStorageItems(savedId, items);
            navigate(route.billingInvoiceView.replace(":id", String(savedId)));
        } catch (err) {
            console.error("Save error:", err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="page-wrapper">
            <style>{`
                .page-wrapper {
                    font-size: 14px !important;
                }
                .page-wrapper input, 
                .page-wrapper select, 
                .page-wrapper textarea, 
                .page-wrapper button,
                .page-wrapper span,
                .page-wrapper label,
                .page-wrapper div,
                .page-wrapper td,
                .page-wrapper th {
                    font-size: 14px !important;
                }
                .invoice-table-scroll {
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }
                @media (min-width: 768px) {
                    .invoice-table-scroll {
                        overflow: visible !important;
                    }
                }
                .invoice-table-scroll::-webkit-scrollbar {
                    display: none;
                }
                .invoice-table-scroll {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
            <div className="content">

                {/* Page Header */}
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <div>
                        <h4 className="fw-bold fs-20 mb-1">{isEdit ? "Edit Invoice" : "New Invoice"}</h4>
                        <nav aria-label="breadcrumb">
                            <ol className="breadcrumb mb-0 fs-14">
                                <li className="breadcrumb-item"><Link to="/" className="text-muted">Home</Link></li>
                                <li className="breadcrumb-item"><Link to={route.billingInvoiceList} className="text-muted">Invoices</Link></li>
                                <li className="breadcrumb-item active text-dark fw-medium">{isEdit ? "Edit Invoice" : "New Invoice"}</li>
                            </ol>
                        </nav>
                    </div>
                    <button
                        onClick={() => navigate(route.billingInvoiceList)}
                        style={{ width: 36, height: 36, borderRadius: 3, background: "#ffffff", border: "1px solid #e5e9ef", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                    >
                        <i className="ti ti-x" style={{ fontSize: 16, color: "#1d2a3a" }} />
                    </button>
                </div>

                {/* Form Card */}
                <div className="card border-0 shadow-sm" style={{ borderRadius: 5 }}>
                    <div className="card-body p-4">
                        <div className="row g-4">

                            {/* ── Screenshot-style form fields ── */}
                            <div className="col-12">
                                <style>{`
                                    .inv-row { display: flex; align-items: center; margin-bottom: 20px; }
                                    .inv-label { min-width: 180px; font-size: 14px; font-weight: 500; color: #1a1a2e; flex-shrink: 0; }
                                    .inv-label.req { color: #c0392b; }
                                    .inv-input { height: 36px; font-size: 14px; border: 1px solid #d0d5dd; border-radius: 4px; padding: 0 10px; background: #fff; outline: none; transition: border-color 0.15s; }
                                    .inv-input:focus { border-color: #e41f07 !important; box-shadow: none !important; outline: none !important; }
                                    .inv-select { height: 36px; font-size: 14px; border: 1px solid #d0d5dd; border-radius: 4px; padding: 0 28px 0 10px; background: #fff; outline: none; appearance: auto; transition: border-color 0.15s; }
                                    .inv-select:focus { border-color: #e41f07 !important; box-shadow: none !important; outline: none !important; }
                                `}</style>

                                {/* Customer Name */}
                                <div className="inv-row">
                                    <label className="inv-label req text-danger">Customer Name*</label>
                                    <div className="customer-search-container d-flex" style={{ flex: 1, maxWidth: 520, position: "relative" }}>
                                        <div style={{ flex: 1, position: "relative" }}>
                                            <input
                                                type="text"
                                                className="inv-input w-100"
                                                placeholder="Select or add a customer"
                                                style={{ borderRadius: "4px 0 0 4px", paddingRight: 30 }}
                                                value={customerSearchQuery !== "" ? customerSearchQuery : (customers.find((c: any) => String(c.id) === customerName)?.displayName || customers.find((c: any) => String(c.id) === customerName)?.display_name || "")}
                                                onChange={e => { setCustomerSearchQuery(e.target.value); setCustomerName(""); setShowCustomerDropdown(true); }}
                                                onFocus={() => setShowCustomerDropdown(true)}
                                            />
                                            <i className="ti ti-chevron-down" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#6b7280", pointerEvents: "none" }} />
                                        </div>
                                        <button
                                            type="button"
                                            style={{ width: 38, height: 36, background: "#e41f07", border: "1px solid #e41f07", borderRadius: "0 4px 4px 0", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                                            onClick={() => setShowCustomerDropdown(o => !o)}
                                        >
                                            <i className="ti ti-search" style={{ fontSize: 15 }} />
                                        </button>
                                        {showCustomerDropdown && (
                                            <div className="dropdown-menu show shadow-lg border-0 p-0 overflow-hidden" style={{ position: "absolute", width: "calc(100% - 38px)", top: "100%", left: 0, zIndex: 1050, marginTop: 4, borderRadius: 8 }}>
                                                <div style={{ maxHeight: 260, overflowY: "auto" }}>
                                                    {customers.filter((c: any) => (c.displayName || c.display_name || "").toLowerCase().includes(customerSearchQuery.toLowerCase())).map((c: any) => (
                                                        <button key={c.id} type="button" className="dropdown-item px-3 py-2 border-bottom d-flex align-items-center gap-3"
                                                            onClick={() => { setCustomerName(String(c.id)); setCustomerSearchQuery(""); setShowCustomerDropdown(false); }}>
                                                            <div className="bg-light rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 32, height: 32 }}>
                                                                <i className="ti ti-user text-muted" style={{ fontSize: 15 }} />
                                                            </div>
                                                            <div>
                                                                <div className="fw-semibold" style={{ fontSize: 14 }}>{c.displayName || c.display_name || "Unnamed Customer"}</div>
                                                                <div className="text-muted" style={{ fontSize: 13 }}>{c.company_name || "Individual"}</div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                    {customers.filter((c: any) => (c.displayName || c.display_name || "").toLowerCase().includes(customerSearchQuery.toLowerCase())).length === 0 && (
                                                        <div className="px-3 py-4 text-center text-muted" style={{ fontSize: 14 }}>No customers found</div>
                                                    )}
                                                </div>
                                                <button type="button" className="dropdown-item px-3 py-2 text-danger fw-semibold d-flex align-items-center gap-2 bg-white border-top" style={{ fontSize: 14 }}
                                                    onClick={() => { setShowCustomerDropdown(false); navigate(route.addCustomer); }}>
                                                    <i className="ti ti-circle-plus" style={{ fontSize: 15 }} /> Add New Customer
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Invoice # */}
                                <div className="inv-row">
                                    <label className="inv-label req text-danger">Invoice#*</label>
                                    <div style={{ position: "relative", width: 280 }}>
                                        <input
                                            type="text"
                                            className="inv-input"
                                            style={{ width: "100%", paddingRight: 36 }}
                                            value={invNumber}
                                            onChange={e => setInvNumber(e.target.value)}
                                        />
                                        <button type="button" onClick={() => setShowConfigModal(true)}
                                            style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 0, color: "#e41f07", cursor: "pointer", display: "flex", alignItems: "center" }}>
                                            <i className="ti ti-settings" style={{ fontSize: 16 }} />
                                        </button>
                                    </div>
                                </div>

                                {/* Order Number */}
                                <div className="inv-row">
                                    <label className="inv-label">Order Number</label>
                                    <input
                                        type="text"
                                        className="inv-input"
                                        style={{ width: 280 }}
                                        value={orderNumber}
                                        onChange={e => setOrderNumber(e.target.value)}
                                    />
                                </div>

                                {/* Invoice Date + Terms + Due Date — all in one row */}
                                <div className="inv-row flex-wrap" style={{ gap: 16 }}>
                                    <label className="inv-label req text-danger">Invoice Date*</label>
                                    <input
                                        type="date"
                                        className="inv-input"
                                        style={{ width: 160 }}
                                        value={invoiceDate}
                                        onChange={e => setInvoiceDate(e.target.value)}
                                    />
                                    <label style={{ fontSize: 14, fontWeight: 500, color: "#1a1a2e", marginLeft: 8, flexShrink: 0 }}>Terms</label>
                                    <select
                                        className="inv-select"
                                        style={{ width: 170 }}
                                        value={paymentTerms}
                                        onChange={e => setPaymentTerms(e.target.value)}
                                    >
                                        {PAYMENT_TERMS.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                    <label style={{ fontSize: 14, fontWeight: 500, color: "#1a1a2e", marginLeft: 8, flexShrink: 0 }}>Due Date</label>
                                    <input
                                        type="date"
                                        className="inv-input"
                                        style={{ width: 160, borderStyle: "dashed" }}
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                    />
                                </div>

                                {/* Salesperson */}
                                <div className="inv-row">
                                    <label className="inv-label">Salesperson</label>
                                    <select
                                        className="inv-select"
                                        style={{ width: 280 }}
                                        value={salesperson}
                                        onChange={e => setSalesperson(e.target.value)}
                                    >
                                        <option value="">Select or Add Salesperson</option>
                                        {SALESPERSONS.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>

                                {/* Subject */}
                                <div className="inv-row" style={{ alignItems: "flex-start" }}>
                                    <label className="inv-label" style={{ paddingTop: 6 }}>
                                        Subject <i className="ti ti-info-circle" style={{ fontSize: 13, color: "#6b7280", marginLeft: 3 }} />
                                    </label>
                                    <textarea
                                        className="inv-input"
                                        rows={2}
                                        placeholder="Let your customer know what this Invoice is for"
                                        style={{ width: 400, height: "auto", padding: "6px 10px", resize: "vertical", lineHeight: 1.5 }}
                                        value={subject}
                                        onChange={e => setSubject(e.target.value)}
                                    />
                                </div>

                                {/* Customer Category */}
                                <div className="inv-row">
                                    <label className="inv-label">Customer Category</label>
                                    <select className="inv-select" style={{ width: 280 }} value={customerCategory} onChange={e => setCustomerCategory(e.target.value)}>
                                        <option value="">Select Category</option>
                                        {CUSTOMER_CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
                                    </select>
                                </div>

                                {/* Price List */}
                                <div className="inv-row">
                                    <label className="inv-label">Price List</label>
                                    <select className="inv-select" style={{ width: 280 }} value={priceList} onChange={e => setPriceList(e.target.value)}>
                                        <option value="">Select Price List</option>
                                        {PRICE_LISTS.map(p => <option key={p}>{p}</option>)}
                                    </select>
                                </div>

                                {/* Reference # */}
                                <div className="inv-row">
                                    <label className="inv-label req text-danger">Reference #</label>
                                    <div className="d-flex" style={{ width: 280 }}>
                                        <input
                                            type="text"
                                            className="inv-input"
                                            placeholder="Click to select reference"
                                            style={{ flex: 1, borderRadius: "4px 0 0 4px", cursor: "pointer" }}
                                            value={reference}
                                            readOnly
                                            onClick={() => setShowReferenceModal(true)}
                                        />
                                        <button type="button" onClick={() => setShowReferenceModal(true)}
                                            style={{ width: 36, height: 36, border: "1px solid #d0d5dd", borderLeft: "none", borderRadius: "0 4px 4px 0", background: "#f9fafb", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <i className="ti ti-users" style={{ fontSize: 14, color: "#6b7280" }} />
                                        </button>
                                    </div>
                                </div>

                                {/* Location */}
                                <div className="inv-row">
                                    <label className="inv-label">Location</label>
                                    <select className="inv-select" style={{ width: 280 }} value={location} onChange={e => setLocation(e.target.value)}>
                                        <option value="">Select Location</option>
                                        <option>Main Warehouse</option>
                                        <option>Showroom</option>
                                    </select>
                                </div>

                            </div>

                            {/* Item Table */}
                            <div className="col-12 mt-4" style={{ position: "relative" }}>
                                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3" style={{ position: "relative", zIndex: 20 }}>
                                    <span className="fs-14 fw-bold text-dark">Item Table</span>
                                    <div className="d-flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-white d-flex align-items-center gap-2 px-3 py-1 fw-medium border shadow-sm"
                                            style={{ fontSize: 14, height: 34, color: "#111827", borderRadius: 4 }}
                                            onClick={() => { setShowBulkModal(true); setIsScannerMode(true); }}
                                        >
                                            <i className="ti ti-scan fs-16" style={{ color: "#e41f07" }} /> <span style={{ color: "#e03e21ff" }}>Scan Item</span>
                                        </button>
                                        <div style={{ position: "relative" }}>
                                            <button
                                                type="button"
                                                className="btn btn-white d-flex align-items-center gap-2 px-3 py-1 fw-medium border shadow-sm"
                                                style={{ fontSize: 14, height: 34, color: "#4b4c4dff", borderRadius: 4 }}
                                                onClick={() => setBulkOpen(o => !o)}
                                            >
                                                <i className="ti ti-circle-check fs-16" style={{ color: "#e41f07" }} /> <span style={{ color: "#e03e21ff" }}>Bulk Actions</span> <i className="ti ti-chevron-down ms-1" style={{ fontSize: 10 }} />
                                            </button>
                                            {bulkOpen && (
                                                <ul
                                                    className="shadow-lg border-0 p-2 bg-white"
                                                    style={{
                                                        position: "absolute",
                                                        top: "calc(100% + 6px)",
                                                        left: 0,
                                                        width: 260,
                                                        borderRadius: 10,
                                                        zIndex: 1060,
                                                        listStyle: "none",
                                                        margin: 0,
                                                        padding: "6px"
                                                    }}
                                                >
                                                    <li>
                                                        <button className="dropdown-item rounded-2 py-2 d-flex align-items-center gap-2 text-dark fs-14" onClick={() => { setShowBulkModal(true); setBulkOpen(false); }}>
                                                            <i className="ti ti-layout-grid-add text-muted fs-16" /> Add Items in Bulk
                                                        </button>
                                                    </li>
                                                    <li>
                                                        <button className="dropdown-item rounded-2 py-2 d-flex align-items-center gap-2 text-dark fs-14" onClick={() => { alert("Bulk update logic here"); setBulkOpen(false); }}>
                                                            <i className="ti ti-edit-circle text-muted fs-16" /> Bulk Update Line Items
                                                        </button>
                                                    </li>
                                                    <li>
                                                        <button className="dropdown-item rounded-2 py-2 d-flex align-items-center gap-2 text-dark fs-14" onClick={() => { setItems([{ id: Date.now(), description: "", qty: 1, rate: 0, discount: 0, discountType: "%", amount: 0 }]); setBulkOpen(false); }}>
                                                            <i className="ti ti-trash text-danger fs-16" /> Delete All Items
                                                        </button>
                                                    </li>
                                                    <li><hr className="dropdown-divider opacity-50" /></li>
                                                    <li>
                                                        <button className="dropdown-item rounded-2 py-2 d-flex align-items-center gap-2 text-dark fs-14" onClick={() => setBulkOpen(false)}>
                                                            <i className="ti ti-eye-off text-muted fs-16" /> Hide All Additional Information
                                                        </button>
                                                    </li>
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="invoice-table-scroll">
                                    <table className="table mb-0" style={{ fontSize: 14, minWidth: 640 }}>
                                        <thead className="bg-light">
                                            <tr>
                                                <th style={{ width: 40, borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}></th>
                                                <th style={{ borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>ITEM DETAILS</th>
                                                <th style={{ width: 120, borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }} className="text-end">QUANTITY</th>
                                                <th style={{ width: 120, borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }} className="text-end">RATE</th>
                                                <th style={{ width: 150, borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }} className="text-end">DISCOUNT</th>
                                                <th style={{ width: 120, borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }} className="text-end">AMOUNT</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, idx) => (
                                                <tr key={item.id} className="border-bottom">
                                                    <td className="text-center align-middle py-3">
                                                        <i className="ti ti-grip-vertical text-muted fs-14" />
                                                    </td>
                                                    <td className="align-middle py-3" style={{ minWidth: 220 }}>
                                                        <div className="item-search-container" style={{ position: "relative" }}>
                                                            <input
                                                                className="form-control shadow-none fw-medium px-3 py-2"
                                                                type="text"
                                                                placeholder="Type or click to select an item."
                                                                style={{ fontSize: 14, color: "#111827", border: "1px solid #e5e7eb", borderRadius: 6, backgroundColor: "#fff" }}
                                                                value={item.description}
                                                                onChange={e => {
                                                                    updateItem(idx, "description", e.target.value);
                                                                    setSearchQuery(e.target.value);
                                                                    setActiveSearchIdx(idx);
                                                                }}
                                                                onFocus={() => setActiveSearchIdx(idx)}
                                                            />
                                                            {activeSearchIdx === idx && (
                                                                <div className="dropdown-menu show shadow-lg border-0 p-0 overflow-hidden" style={{ position: "absolute", width: 320, top: "100%", left: 0, zIndex: 1055, marginTop: 4, borderRadius: 8 }}>
                                                                    {INVENTORY_ITEMS.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase())).map(ii => (
                                                                        <button
                                                                            key={ii.id}
                                                                            type="button"
                                                                            className="dropdown-item p-3 border-bottom d-flex justify-content-between align-items-start"
                                                                            style={{ backgroundColor: "#3b82f6", color: "#fff" }}
                                                                            onClick={() => {
                                                                                updateItem(idx, "description", ii.name);
                                                                                updateItem(idx, "rate", ii.rate);
                                                                                setActiveSearchIdx(null);
                                                                            }}
                                                                        >
                                                                            <div>
                                                                                <div className="fw-bold fs-14">{ii.name}</div>
                                                                                <div className="fs-14 opacity-75">SKU: {ii.sku} Rate: ₹{ii.rate.toFixed(2)}</div>
                                                                            </div>
                                                                            <div className="text-end">
                                                                                <div className="fs-14 opacity-75 text-uppercase fw-bold">Stock on Hand</div>
                                                                                <div className="fs-14 fw-bold">{ii.stock}</div>
                                                                            </div>
                                                                        </button>
                                                                    ))}
                                                                    <button type="button" className="dropdown-item p-3 text-primary fw-bold fs-14 d-flex align-items-center gap-2 bg-white" onClick={() => setActiveSearchIdx(null)}>
                                                                        <i className="ti ti-circle-plus fs-16" /> Add New Item
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="align-middle text-end py-3">
                                                        <input
                                                            className="form-control text-end shadow-none px-2 py-2"
                                                            type="number"
                                                            style={{ fontSize: 14, border: "1px solid #e5e7eb", borderRadius: 6, backgroundColor: "#fff" }}
                                                            value={item.qty}
                                                            onChange={e => updateItem(idx, "qty", Number(e.target.value))}
                                                        />
                                                    </td>
                                                    <td className="align-middle text-end py-3">
                                                        <input
                                                            className="form-control text-end shadow-none px-2 py-2"
                                                            type="number"
                                                            style={{ fontSize: 14, border: "1px solid #e5e7eb", borderRadius: 6, backgroundColor: "#fff" }}
                                                            value={item.rate === 0 ? "" : item.rate}
                                                            placeholder="0"
                                                            onChange={e => updateItem(idx, "rate", e.target.value === "" ? 0 : Number(e.target.value))}
                                                            onFocus={e => e.target.select()}
                                                        />
                                                    </td>
                                                    <td className="align-middle py-3">
                                                        <div className="d-flex justify-content-end">
                                                            <div className="input-group" style={{ width: 120, flexWrap: "nowrap", height: 36 }}>
                                                                <input
                                                                    className="form-control text-end shadow-none px-2"
                                                                    type="number"
                                                                    style={{
                                                                        fontSize: 14,
                                                                        border: "1px solid #e5e7eb",
                                                                        borderRight: 0,
                                                                        borderTopLeftRadius: 6,
                                                                        borderBottomLeftRadius: 6,
                                                                        backgroundColor: "#fff",
                                                                        height: "100%"
                                                                    }}
                                                                    value={item.discount === 0 ? "" : item.discount}
                                                                    placeholder="0"
                                                                    onChange={e => updateItem(idx, "discount", e.target.value === "" ? 0 : Number(e.target.value))}
                                                                    onFocus={e => e.target.select()}
                                                                />
                                                                <button
                                                                    className="btn dropdown-toggle no-caret px-2 d-flex align-items-center justify-content-center"
                                                                    data-bs-toggle="dropdown"
                                                                    style={{
                                                                        background: "#fff",
                                                                        border: "1px solid #e64635ff",
                                                                        color: "#e64635ff",
                                                                        borderTopRightRadius: 6,
                                                                        borderBottomRightRadius: 6,
                                                                        zIndex: 0,
                                                                        height: "100%"
                                                                    }}
                                                                >
                                                                    <span className="fw-bold fs-14">{item.discountType}</span>
                                                                </button>
                                                                <ul className="dropdown-menu dropdown-menu-end shadow-sm border p-1" style={{ borderRadius: 6, minWidth: "100%" }}>
                                                                    <li><button className="dropdown-item rounded-1 fs-14 text-center fw-bold" onClick={() => updateItem(idx, "discountType", "%")}>%</button></li>
                                                                    <li><button className="dropdown-item rounded-1 fs-14 text-center fw-bold" onClick={() => updateItem(idx, "discountType", "INR")}>INR</button></li>
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="align-middle text-end py-3">
                                                        <div className="d-flex align-items-center justify-content-end gap-3">
                                                            <span className="fw-bold fs-14 text-dark">{fmt2(item.amount)}</span>
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm text-danger p-0 border-0 shadow-none text-decoration-none"
                                                                onClick={() => removeRow(idx)}
                                                            >
                                                                <i className="ti ti-circle-x fs-18" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="d-flex flex-wrap gap-2 mt-4">
                                    <button
                                        type="button"
                                        className="btn btn-white border px-4 d-flex align-items-center gap-2 shadow-sm text-dark fs-14 fw-medium"
                                        style={{ height: 44, borderRadius: 8, background: "#fff", borderColor: "#f3f4f6" }}
                                        onClick={addRow}
                                    >
                                        <i className="ti ti-plus fs-16" style={{ color: "#e41f07" }} /> Add New Row
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-white border px-4 d-flex align-items-center gap-2 shadow-sm text-dark fs-14 fw-medium"
                                        style={{ height: 44, borderRadius: 8, background: "#fff", borderColor: "#f3f4f6" }}
                                        onClick={() => setShowBulkModal(true)}
                                    >
                                        <i className="ti ti-layout-grid-add fs-16" style={{ color: "#e41f07" }} /> Add Items in Bulk
                                    </button>
                                </div>
                            </div>

                            <div className="col-12 mt-4">
                                <div style={{ width: "100%", fontSize: 14, border: "1px solid #e5e7eb", borderRadius: 6, overflow: "hidden" }}>
                                    <div className="d-flex justify-content-between align-items-center px-3 py-2" style={{ borderBottom: "1px solid #e5e7eb" }}>
                                        <span className="text-muted">Sub Total</span>
                                        <span className="fw-semibold text-dark">{fmt2(subtotal)}</span>
                                    </div>
                                    <div className="d-flex align-items-center justify-content-between px-3 py-2 gap-2" style={{ borderBottom: "1px solid #e5e7eb" }}>
                                        <div className="d-flex align-items-center gap-3">
                                            <label className="d-flex align-items-center gap-1 mb-0" style={{ cursor: "pointer" }}>
                                                <input type="radio" name="taxtype" checked={taxType === "TDS"} onChange={() => setTaxType("TDS")} style={{ accentColor: "#e41f07", width: 14, height: 14 }} />
                                                <span className="ms-1">TDS</span>
                                            </label>
                                            <label className="d-flex align-items-center gap-1 mb-0" style={{ cursor: "pointer" }}>
                                                <input type="radio" name="taxtype" checked={taxType === "TCS"} onChange={() => setTaxType("TCS")} style={{ accentColor: "#e41f07", width: 14, height: 14 }} />
                                                <span className="ms-1">TCS</span>
                                            </label>
                                        </div>
                                        <div className="d-flex align-items-center gap-3">
                                            <select
                                                className="form-select form-select-sm border"
                                                style={{ fontSize: 14, borderRadius: 4, minWidth: 130 }}
                                                value={selectedTax}
                                                onChange={e => setSelectedTax(e.target.value)}
                                            >
                                                <option value="">Select a Tax</option>
                                                {TAX_OPTIONS.map(t => <option key={t}>{t}</option>)}
                                            </select>
                                            <span className="fw-semibold text-dark" style={{ minWidth: 60, textAlign: "right" }}>
                                                {taxAmount > 0 ? `+ ${fmt2(taxAmount)}` : "0.00"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-center justify-content-between px-3 py-2 gap-3" style={{ borderBottom: "1px solid #e5e7eb" }}>
                                        <span className="text-muted">Courier Charges</span>
                                        <div className="d-flex align-items-center gap-2">
                                            <input
                                                type="number"
                                                className="form-control form-control-sm border text-end"
                                                style={{ maxWidth: 100, borderRadius: 4, fontSize: 14 }}
                                                value={courierCharges === 0 ? "" : courierCharges}
                                                placeholder="0"
                                                onChange={e => setCourierCharges(e.target.value === "" ? 0 : +e.target.value)}
                                                onFocus={e => e.target.select()}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-link btn-sm p-0 text-danger"
                                                style={{ textDecoration: "none" }}
                                                onClick={() => setCourierCharges(0)}
                                            >
                                                <i className="ti ti-circle-x" style={{ fontSize: 16 }} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Other Charges Section */}
                                    {otherCharges.map((oc, idx) => (
                                        <div key={idx} className="d-flex align-items-center justify-content-between px-3 py-2 gap-3" style={{ borderBottom: "1px solid #e5e7eb" }}>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                style={{ fontSize: 14, color: "#111827", fontWeight: 500, width: 160, border: "1px solid #d1d5db", borderRadius: 4, padding: "5px 10px", background: "#fff", outline: "none" }}
                                                placeholder="Enter Charge Name"
                                                value={oc.label}
                                                onChange={e => updateOtherCharge(idx, "label", e.target.value)}
                                                onFocus={e => e.target.style.borderColor = "#e41f07"}
                                                onBlur={e => e.target.style.borderColor = "#d1d5db"}
                                            />
                                            <div className="d-flex align-items-center gap-2">
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm border text-end"
                                                    style={{ maxWidth: 100, borderRadius: 4, fontSize: 14, color: "#111827", fontWeight: 600, borderColor: "#d1d5db", padding: "5px 10px" }}
                                                    value={oc.amount === 0 ? "" : oc.amount}
                                                    placeholder="0"
                                                    onChange={e => updateOtherCharge(idx, "amount", e.target.value === "" ? 0 : +e.target.value)}
                                                    onFocus={e => { e.target.style.borderColor = "#e41f07"; e.target.select(); }}
                                                    onBlur={e => e.target.style.borderColor = "#d1d5db"}
                                                />
                                                <button
                                                    type="button"
                                                    className="btn btn-link btn-sm p-0 text-danger"
                                                    style={{ textDecoration: "none" }}
                                                    onClick={() => removeOtherCharge(idx)}
                                                >
                                                    <i className="ti ti-circle-x" style={{ fontSize: 16 }} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="px-3 py-1" style={{ borderBottom: "1px solid #e5e7eb" }}>
                                        <button
                                            type="button"
                                            className="btn btn-link btn-sm p-0 text-primary fw-medium"
                                            style={{ fontSize: 14, textDecoration: "none", color: "#e41f07" }}
                                            onClick={addOtherCharge}
                                        >
                                            <i className="ti ti-circle-plus me-1" /> Add Charge
                                        </button>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center px-3 py-2">
                                        <span className="fw-bold fs-14">Total (₹)</span>
                                        <span className="fw-bold fs-14">{fmt2(total)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 mt-4">
                                <label className="form-label fs-14 fw-semibold">Customer Notes</label>
                                <textarea
                                    className="form-control border"
                                    rows={4}
                                    style={{ borderRadius: 3, fontSize: 14 }}
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                                <p className="text-muted fs-14 mt-1 mb-0">Will be displayed on the invoice</p>
                            </div>

                            <div className="col-12 mt-4">
                                <input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={handleFileChange} />
                                <div style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 6, overflow: "hidden" }} className="p-3">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <span className="fw-semibold fs-14">Attach File(s) to Invoice</span>
                                        <button
                                            type="button"
                                            className="btn btn-light btn-sm"
                                            style={{ borderRadius: 4, fontSize: 14, border: "1px solid #e5e7eb" }}
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <i className="ti ti-upload me-1" /> Upload File
                                        </button>
                                    </div>
                                    {uploadedFiles.length > 0 && (
                                        <ul className="list-unstyled mb-2" style={{ fontSize: 14 }}>
                                            {uploadedFiles.map((f, i) => (
                                                <li key={f.id} className="d-flex align-items-center gap-2 mb-1">
                                                    <i className="ti ti-file text-muted" />
                                                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                                                    <button type="button" className="btn btn-link btn-sm text-muted p-0" onClick={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))}>
                                                        <i className="ti ti-x" style={{ fontSize: 14 }} />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    <p className="text-muted fs-14 mb-0">You can upload a maximum of 10 files, 10MB each</p>
                                </div>
                            </div>

                            {/* Payment Received Section */}
                            <div className="col-12">
                                <div className="border rounded p-3" style={{ borderRadius: 5, fontSize: 14 }}>

                                    {/* Checkbox */}
                                    <div className="d-flex align-items-center gap-2 mb-3">
                                        <input
                                            type="checkbox"
                                            id="paymentReceived"
                                            checked={paymentReceived}
                                            onChange={e => { setPaymentReceived(e.target.checked); setAdvancePayment(e.target.checked); }}
                                            style={{ width: 16, height: 16, accentColor: "#dc2626", cursor: "pointer", outline: "none", boxShadow: "none" }}
                                        />
                                        <label htmlFor="paymentReceived" className="fw-semibold mb-0 fs-14" style={{ cursor: "pointer", color: "#374151" }}>
                                            I have received the payment
                                        </label>
                                    </div>

                                    {paymentReceived && (
                                        <div className="mt-3 pt-3" style={{ borderTop: "1px solid #f1f5f9" }}>
                                            {/* Responsive Payment Section - Horizontal on Desktop, Stacked on Mobile */}
                                            <div className="d-none d-md-block mb-2">
                                                <div className="row g-2 px-1">
                                                    <div className="col-md-4"><label className="fw-bold fs-14 text-muted text-uppercase">Payment Mode</label></div>
                                                    <div className="col-md-4"><label className="fw-bold fs-14 text-muted text-uppercase">Deposit To</label></div>
                                                    <div className="col-md-3"><label className="fw-bold fs-14 text-muted text-uppercase">Amount Received</label></div>
                                                    <div className="col-md-1"></div>
                                                </div>
                                            </div>

                                            {paymentRows.map((row, idx) => (
                                                <div key={idx} className="mb-3 mb-md-2">
                                                    {/* Mobile Card Header */}
                                                    <div className="d-md-none d-flex align-items-center justify-content-between mb-2 pb-1 border-bottom">
                                                        <span className="fw-bold fs-14 text-dark">PAYMENT #{idx + 1}</span>
                                                        {paymentRows.length > 1 && (
                                                            <button type="button" className="btn btn-link text-danger p-0 fs-14 fw-semibold" onClick={() => removePaymentRow(idx)} style={{ textDecoration: 'none' }}>
                                                                Remove
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="row g-3 g-md-2 align-items-center">
                                                        <div className="col-12 col-md-4">
                                                            <label className="d-md-none fw-bold mb-1 fs-14 text-muted">PAYMENT MODE</label>
                                                            <select
                                                                className="form-select shadow-none"
                                                                style={{ height: 38, fontSize: 14, borderRadius: 4 }}
                                                                value={row.paymentMode}
                                                                onChange={e => updatePaymentRow(idx, "paymentMode", e.target.value)}
                                                            >
                                                                <option>Cash</option>
                                                                <option>Bank Transfer</option>
                                                                <option>Cheque</option>
                                                                <option>Credit Card</option>
                                                                <option>UPI</option>
                                                            </select>
                                                        </div>

                                                        <div className="col-12 col-md-4">
                                                            <label className="d-md-none fw-bold mb-1 fs-14 text-muted">DEPOSIT TO</label>
                                                            <select
                                                                className="form-select shadow-none"
                                                                style={{ height: 38, fontSize: 14, borderRadius: 4 }}
                                                                value={row.depositTo}
                                                                onChange={e => updatePaymentRow(idx, "depositTo", e.target.value)}
                                                            >
                                                                <option>Petty Cash</option>
                                                                <option>Savings Account</option>
                                                                <option>Current Account</option>
                                                            </select>
                                                        </div>

                                                        <div className="col-12 col-md-3">
                                                            <label className="d-md-none fw-bold mb-1 fs-14 text-muted">AMOUNT RECEIVED</label>
                                                            <input
                                                                type="number"
                                                                className="form-control shadow-none text-end"
                                                                placeholder="0"
                                                                style={{ height: 40, fontSize: 14, fontWeight: "bold", borderRadius: 4, background: "#f0fdf4", color: "#16a34a", borderColor: "#d1d5db", textAlign: "right" }}
                                                                value={row.amount || ""}
                                                                onChange={e => updatePaymentRow(idx, "amount", e.target.value === "" ? 0 : +e.target.value)}
                                                            />
                                                        </div>

                                                        <div className="col-md-1 d-none d-md-block text-center">
                                                            {paymentRows.length > 1 && (
                                                                <button type="button" className="btn btn-link text-danger p-0 shadow-none" onClick={() => removePaymentRow(idx)} style={{ textDecoration: "none" }}>
                                                                    <i className="ti ti-trash fs-18" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Add & Totals Area - Mirrored Grid for Perfect Alignment */}
                                            <div className="row g-2 mt-2 pt-3 border-top align-items-center">
                                                {/* Mirroring col-md-3 + col-md-2 for the button area */}
                                                <div className="col-12 col-md-5">
                                                    <button type="button" className="btn btn-link p-0 fw-medium fs-14 text-danger" style={{ textDecoration: "none" }} onClick={addPaymentRow}>
                                                        <i className="ti ti-circle-plus me-1" />Add Split Payment
                                                    </button>
                                                </div>

                                                {/* Mirroring col-md-3 for labels */}
                                                <div className="col-6 col-md-3 text-md-end">
                                                    <div className="text-muted fs-14 mb-2">Total (₹) :</div>
                                                    <div className="fw-medium fs-14 text-danger">Balance Amount (₹) :</div>
                                                </div>

                                                {/* Mirroring col-md-3 for values - Flushed with Amount Received input */}
                                                <div className="col-6 col-md-3 text-end">
                                                    <div className="fw-bold fs-14 text-dark mb-2">{fmt2(total)}</div>
                                                    <div className="fw-bold fs-14 text-success">{fmt2(Math.max(0, total - amountReceived))}</div>
                                                </div>

                                                {/* Mirroring col-md-1 (Trash icon space) */}
                                                <div className="col-md-1 d-none d-md-block"></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Advance Payment Section */}
                            <div className="col-12">
                                <div className="border rounded p-3" style={{ borderRadius: 5, fontSize: 14 }}>

                                    <div className="d-flex align-items-center gap-2 mb-3">
                                        <input
                                            type="checkbox"
                                            id="advancePayment"
                                            checked={advancePayment}
                                            onChange={e => { setAdvancePayment(e.target.checked); setPaymentReceived(e.target.checked); }}
                                            style={{ width: 16, height: 16, accentColor: "#dc2626", cursor: "pointer", outline: "none", boxShadow: "none" }}
                                        />
                                        <label htmlFor="advancePayment" className="fw-semibold mb-0 fs-14" style={{ cursor: "pointer", color: "#374151" }}>
                                            Advance Payment
                                        </label>
                                    </div>

                                    {advancePayment && (
                                        <div className="mt-2 pt-3" style={{ borderTop: "1px solid #f1f5f9" }}>
                                            <div className="d-flex align-items-start gap-2 p-3 rounded" style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
                                                <i className="ti ti-alert-triangle" style={{ color: "#ea580c", fontSize: 18, flexShrink: 0, marginTop: 1 }} />
                                                <div className="flex-grow-1">
                                                    <p className="fw-semibold mb-2 fs-14" style={{ color: "#c2410c" }}>Advance Payment Pending</p>
                                                    {advanceCategoryCustomers.length > 0 ? (
                                                        <div className="d-flex flex-column gap-2">
                                                            {advanceCategoryCustomers.map((cust, i) => (
                                                                <div key={i} className="d-flex align-items-center justify-content-between px-3 py-2 rounded" style={{ background: "#fff", border: "1px solid #fed7aa" }}>
                                                                    <span className="fw-semibold fs-14" style={{ color: "#92400e" }}>
                                                                        <i className="ti ti-user me-2" style={{ color: "#ea580c" }} />
                                                                        {cust.name}
                                                                    </span>
                                                                    <span className="fw-bold fs-14" style={{ color: cust.balance > 0 ? "#16a34a" : "#ea580c" }}>
                                                                        ₹{fmt2(cust.balance)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="mb-0 fs-14" style={{ color: "#9a3412" }}>
                                                            <i className="ti ti-info-circle me-1" />No customers found in advance payment categories.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Additional Fields */}
                            <div className="col-12">
                                <p className="text-muted fs-14 mb-0">
                                    <strong>Additional Fields:</strong> Start adding custom fields for your invoices by going to{" "}
                                    <em>Settings</em> → <em>Sales</em> → <em>Invoices</em>.
                                </p>
                            </div>

                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="card-footer d-flex flex-wrap gap-2 align-items-center px-4 py-3 bg-white" style={{ borderTop: "1px solid #f0f2f4" }}>
                        <button
                            type="button"
                            className="btn fw-bold fs-14 text-white px-4"
                            style={{ background: "#e41f07", border: "1px solid #e41f07", borderRadius: 4, height: 38, opacity: 1 }}
                            onClick={() => handleSave("Sent")}
                            disabled={loading}
                        >
                            {loading ? (isEdit ? "Updating..." : "Saving...") : (isEdit ? "Update Invoice" : "Save and Send")}
                        </button>
                        <button
                            type="button"
                            className="btn fw-bold fs-14 text-white px-4"
                            style={{ background: "#f2994a", border: "1px solid #f2994a", borderRadius: 4, height: 38, opacity: 1 }}
                            onClick={() => handleSave("Draft")}
                            disabled={loading}
                        >
                            Save as Draft
                        </button>
                        <button
                            type="button"
                            className="btn fw-bold fs-14 px-4"
                            style={{ background: "#fff", border: "1px solid #d0d5dd", borderRadius: 4, height: 38, color: "#344054" }}
                            onClick={() => navigate(route.billingInvoiceList)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>

            </div>

            {/* Configure Invoice Number Preferences Modal */}
            {showConfigModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="card border-0 shadow" style={{ width: 480, borderRadius: 5 }}>
                        <div className="card-header d-flex align-items-center justify-content-between bg-white border-bottom-0" style={{ borderRadius: "5px 5px 0 0", padding: "1.25rem 1.5rem" }}>
                            <h6 className="mb-0 fw-bold fs-16 text-dark">Configure Invoice Number Preferences</h6>
                            <button type="button" className="btn btn-link p-0 text-muted border-0" style={{ textDecoration: "none" }} onClick={() => setShowConfigModal(false)}>
                                <i className="ti ti-x" style={{ fontSize: 20 }} />
                            </button>
                        </div>
                        <div className="card-body px-4 py-0">
                            <div className="p-3 mb-4 border rounded d-flex gap-3 align-items-start" style={{ background: "#fff8f6", borderColor: "#fee2e2", borderRadius: 4 }}>
                                <i className="ti ti-settings text-danger mt-1" />
                                <div className="fs-14 text-muted flex-grow-1">
                                    Configure multiple transaction number series to auto-generate transaction numbers with unique prefixes according to your business needs.
                                </div>
                                <Link to="#" className="text-danger fs-14 text-nowrap fw-semibold" style={{ textDecoration: "none" }}>Configure →</Link>
                            </div>

                            <div className="mb-4">
                                <p className="fs-14 text-dark mb-1">Your invoice numbers are set on auto-generate mode to save your time.</p>
                                <p className="fs-14 text-dark mb-0">Are you sure about changing this setting?</p>
                            </div>

                            <div className="form-check mb-3">
                                <input className="form-check-input" type="radio" id="autoGen" checked={autoGenerate} onChange={() => setAutoGenerate(true)} style={{ accentColor: "#dc2626", cursor: "pointer" }} />
                                <label className="form-check-label fs-14 fw-semibold text-dark cursor-pointer" htmlFor="autoGen" style={{ cursor: "pointer" }}>
                                    Continue auto-generating invoice numbers <i className="ti ti-info-circle text-muted ms-1" />
                                </label>
                            </div>

                            {autoGenerate && (
                                <div className="row g-3 mb-4 pt-1">
                                    <div className="col-md-5">
                                        <label className="form-label fs-14 text-muted mb-1">Prefix</label>
                                        <input type="text" className="form-control border" style={{ borderRadius: 4, fontSize: 14, height: 38 }} value={invoicePrefix} onChange={e => setInvoicePrefix(e.target.value)} />
                                    </div>
                                    <div className="col-md-7">
                                        <label className="form-label fs-14 text-muted mb-1">Next Number</label>
                                        <input type="text" className="form-control border" style={{ borderRadius: 4, fontSize: 14, height: 38 }} value={nextInvoiceNum} onChange={e => setNextInvoiceNum(e.target.value)} />
                                    </div>
                                    <div className="col-12">
                                        <div className="form-check">
                                            <input className="form-check-input" type="checkbox" id="restartNum" checked={restartNumbering} onChange={e => setRestartNumbering(e.target.checked)} style={{ accentColor: "#dc2626", cursor: "pointer" }} />
                                            <label className="form-check-label fs-14 text-muted" htmlFor="restartNum" style={{ cursor: "pointer" }}>
                                                Restart numbering for invoices at the start of each fiscal year.
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="form-check mb-4">
                                <input className="form-check-input" type="radio" id="manualGen" checked={!autoGenerate} onChange={() => setAutoGenerate(false)} style={{ accentColor: "#dc2626", cursor: "pointer" }} />
                                <label className="form-check-label fs-14 fw-semibold text-dark cursor-pointer" htmlFor="manualGen" style={{ cursor: "pointer" }}>
                                    Enter invoice numbers manually
                                </label>
                            </div>
                        </div>
                        <div className="card-footer bg-white d-flex justify-content-end gap-2 px-4 py-3" style={{ borderTop: "1px solid #f0f2f4" }}>
                            <button className="btn btn-light fs-14" style={{ borderRadius: 3 }} onClick={() => setShowConfigModal(false)}>Cancel</button>
                            <button className="btn btn-danger fs-14" style={{ background: "#e41f07", borderColor: "#e41f07", borderRadius: 3 }} onClick={() => setShowConfigModal(false)}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Payment Gateway Modal */}
            {showGatewayModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1060, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="bg-white" style={{ width: 480, borderRadius: 8, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
                        {/* Modal Header */}
                        <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ borderBottom: "1px solid #f0f2f4" }}>
                            <h6 className="mb-0 fw-semibold fs-14">Add Payment Gateway</h6>
                            <button type="button" className="btn btn-link p-0 text-danger" onClick={() => setShowGatewayModal(false)}>
                                <i className="ti ti-x" style={{ fontSize: 18 }} />
                            </button>
                        </div>

                        {/* Gateway List */}
                        <div className="px-4 py-3" style={{ maxHeight: 420, overflowY: "auto" }}>
                            {[
                                {
                                    id: "zoho",
                                    label: (
                                        <div className="d-flex align-items-center gap-2">
                                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 6, background: "#e8f0fe" }}>
                                                <i className="ti ti-shield-check" style={{ fontSize: 20, color: "#1a73e8" }} />
                                            </span>
                                            <span className="fw-semibold fs-14">Zoho Payments</span>
                                            <span style={{ background: "#f59e0b", color: "#fff", fontSize: 14, fontWeight: 600, borderRadius: 20, padding: "2px 10px" }}>
                                                ★ Preferred Gateway
                                            </span>
                                        </div>
                                    ),
                                },
                                {
                                    id: "razorpay",
                                    label: (
                                        <span style={{ color: "#2b6cb0", fontWeight: 800, fontSize: 16, fontFamily: "sans-serif" }}>
                                            <i className="ti ti-bolt" style={{ color: "#3b82f6", fontSize: 14 }} />Razorpay
                                        </span>
                                    ),
                                },
                                {
                                    id: "paytm",
                                    label: (
                                        <div className="d-flex align-items-center gap-2">
                                            <span style={{ fontWeight: 800, fontSize: 16, color: "#002970", fontFamily: "sans-serif" }}>Pay<span style={{ color: "#00baf2" }}>tm</span></span>
                                            <span style={{ background: "#00baf2", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "1px 6px" }}>PG</span>
                                        </div>
                                    ),
                                },
                                {
                                    id: "stripe",
                                    label: (
                                        <span style={{ color: "#635bff", fontWeight: 600, fontSize: 16, fontFamily: "sans-serif", letterSpacing: -0.5 }}>stripe</span>
                                    ),
                                },
                                {
                                    id: "paypal",
                                    label: (
                                        <span style={{ fontWeight: 700, fontSize: 14, fontFamily: "sans-serif" }}>
                                            <span style={{ color: "#003087" }}>Pay</span><span style={{ color: "#009cde" }}>Pal</span>
                                        </span>
                                    ),
                                },
                                {
                                    id: "verifone",
                                    label: (
                                        <div>
                                            <div style={{ fontSize: 10, color: "#888", marginBottom: 1 }}>2Checkout is now</div>
                                            <div className="d-flex align-items-center gap-1">
                                                <span style={{ display: "inline-flex", gap: 2 }}>
                                                    {[0, 1, 2].map(i => (
                                                        <span key={i} style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "#1d1d1b", opacity: 0.8 }} />
                                                    ))}
                                                </span>
                                                <span style={{ fontWeight: 700, fontSize: 14, color: "#1d1d1b", fontFamily: "sans-serif" }}>verifone</span>
                                            </div>
                                        </div>
                                    ),
                                },
                            ].map(gw => (
                                <label
                                    key={gw.id}
                                    className="d-flex align-items-center gap-3 p-3 mb-2 cursor-pointer"
                                    style={{ background: selectedGateway === gw.id ? "#f0f6ff" : "#f8f9fa", borderRadius: 6, cursor: "pointer", border: selectedGateway === gw.id ? "1px solid #bfdbfe" : "1px solid transparent" }}
                                >
                                    <input
                                        type="radio"
                                        name="paygateway"
                                        value={gw.id}
                                        checked={selectedGateway === gw.id}
                                        onChange={() => setSelectedGateway(gw.id)}
                                        style={{ accentColor: "#3b82f6", width: 16, height: 16, flexShrink: 0 }}
                                    />
                                    {gw.label}
                                </label>
                            ))}
                        </div>

                        {/* Modal Footer */}
                        <div className="d-flex align-items-center gap-2 px-4 py-3" style={{ borderTop: "1px solid #f0f2f4" }}>
                            <button
                                className="btn fs-14 fw-semibold px-4"
                                style={{ borderRadius: 6, background: selectedGateway ? "#3b82f6" : "#93c5fd", borderColor: "transparent", color: "#fff" }}
                                disabled={!selectedGateway}
                                onClick={() => setShowGatewayModal(false)}
                            >
                                Proceed
                            </button>
                            <button
                                className="btn btn-light fs-14 fw-semibold px-4"
                                style={{ borderRadius: 6 }}
                                onClick={() => setShowGatewayModal(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Manage Referrals / References Modal */}
            {showReferenceModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="card border-0 shadow-lg" style={{ width: 800, borderRadius: 8, overflow: "hidden" }}>
                        <div className="card-header d-flex align-items-center justify-content-between bg-white py-3 px-4" style={{ borderBottom: "1px solid #f0f2f4" }}>
                            <div className="d-flex align-items-center gap-2">
                                <i className="ti ti-users fs-20 text-primary" />
                                <h6 className="mb-0 fw-bold fs-16 text-dark">Manage Referrals / References</h6>
                            </div>
                            <button
                                type="button"
                                className="btn p-0 border-0 shadow-none"
                                onClick={() => setShowReferenceModal(false)}
                            >
                                <i className="ti ti-x text-dark fs-18 fw-bold" />
                            </button>
                        </div>
                        <div className="card-body p-4">
                            <div className="d-flex align-items-center justify-content-between mb-4">
                                <div className="input-group" style={{ width: 220 }}>
                                    <span className="input-group-text bg-white border-end-0 py-1" style={{ height: 32 }}>
                                        <i className="ti ti-search text-muted fs-14" />
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control border-start-0 ps-0 shadow-none py-1"
                                        placeholder="Search..."
                                        style={{ fontSize: 14, height: 32 }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-danger d-flex align-items-center justify-content-center gap-2 px-3 fw-bold"
                                    style={{ fontSize: 14, height: 36, borderRadius: 4 }}
                                    onClick={() => setShowAddReferralForm(true)}
                                >
                                    <i className="ti ti-plus" /> New Referral
                                </button>
                            </div>

                            {showAddReferralForm && (
                                <div className="p-3 bg-light rounded mb-4 border shadow-sm">
                                    <div className="row g-3">
                                        <div className="col-md-3">
                                            <label className="form-label mb-1 fw-bold text-dark" style={{ fontSize: 14 }}>Name <span className="text-danger">*</span></label>
                                            <input
                                                type="text"
                                                className="form-control border shadow-none bg-white"
                                                placeholder="Full Name"
                                                style={{ fontSize: 14, height: 36 }}
                                                value={newRef.name}
                                                onChange={e => setNewRef({ ...newRef, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label mb-1 fw-bold text-dark" style={{ fontSize: 14 }}>Email</label>
                                            <input
                                                type="email"
                                                className="form-control border shadow-none bg-white"
                                                placeholder="email@example.com"
                                                style={{ fontSize: 14, height: 36 }}
                                                value={newRef.email}
                                                onChange={e => setNewRef({ ...newRef, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-2">
                                            <label className="form-label mb-1 fw-bold text-dark" style={{ fontSize: 14 }}>Phone</label>
                                            <input
                                                type="text"
                                                className="form-control border shadow-none bg-white"
                                                placeholder="+91 987..."
                                                style={{ fontSize: 14, height: 36 }}
                                                value={newRef.phone}
                                                onChange={e => setNewRef({ ...newRef, phone: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-2">
                                            <label className="form-label mb-1 fw-bold text-dark" style={{ fontSize: 14 }}>Type <span className="text-danger">*</span></label>
                                            <select
                                                className="form-select border shadow-none bg-white"
                                                style={{ fontSize: 14, height: 36 }}
                                                value={newRef.type}
                                                onChange={e => setNewRef({ ...newRef, type: e.target.value })}
                                            >
                                                <option>Referral</option>
                                                <option>Reference</option>
                                            </select>
                                        </div>
                                        <div className="col-md-2 d-flex align-items-end gap-2 pb-1">
                                            <button type="button" className="btn btn-primary btn-sm px-3 fw-bold" style={{ fontSize: 14, height: 36 }} onClick={handleSaveReferral}>Save</button>
                                            <button type="button" className="btn btn-light btn-sm border px-2 text-muted" style={{ fontSize: 14, height: 36 }} onClick={() => setShowAddReferralForm(false)}>Cancel</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="border rounded" style={{ overflow: "visible" }}>
                                <table className="table table-hover align-middle mb-0" style={{ fontSize: 14 }}>
                                    <thead className="table-light">
                                        <tr>
                                            <th className="fw-bold text-muted ps-4 py-3">NAME</th>
                                            <th className="fw-bold text-muted py-3">EMAIL</th>
                                            <th className="fw-bold text-muted py-3">PHONE</th>
                                            <th className="fw-bold text-muted py-3">TYPE</th>
                                            <th className="fw-bold text-muted py-3 text-center" style={{ width: 100 }}>ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {referrals.map(ref => (
                                            <tr
                                                key={ref.id}
                                                style={{ cursor: "pointer" }}
                                                className="position-relative"
                                                onClick={() => { setReference(ref.name); setShowReferenceModal(false); }}
                                            >
                                                <td className="fw-bold text-dark ps-4 py-3">{ref.name}</td>
                                                <td className="text-muted">{ref.email}</td>
                                                <td className="text-muted">{ref.phone}</td>
                                                <td>
                                                    <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1" style={{ fontSize: 14 }}>{ref.type}</span>
                                                </td>
                                                <td className="py-3 text-center">
                                                    <div className="dropdown dropup" onClick={e => e.stopPropagation()}>
                                                        <button
                                                            className="btn btn-light btn-sm border px-2 py-1 shadow-none"
                                                            type="button"
                                                            data-bs-toggle="dropdown"
                                                            aria-expanded="false"
                                                            style={{ background: "#f8f9fa" }}
                                                        >
                                                            <i className="ti ti-dots-vertical" />
                                                        </button>
                                                        <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0 mt-1" style={{ fontSize: 14 }}>
                                                            <li>
                                                                <button className="dropdown-item py-2 d-flex align-items-center gap-2 text-primary fw-semibold" type="button" onClick={() => { setReference(ref.name); setShowReferenceModal(false); }}>
                                                                    <i className="ti ti-check" /> Select
                                                                </button>
                                                            </li>
                                                            <li>
                                                                <button className="dropdown-item py-2 d-flex align-items-center gap-2" type="button" onClick={() => handleEditReferral(ref.id)}>
                                                                    <i className="ti ti-edit text-muted" /> Edit
                                                                </button>
                                                            </li>
                                                            <li>
                                                                <hr className="dropdown-divider opacity-50" />
                                                            </li>
                                                            <li>
                                                                <button className="dropdown-item py-2 d-flex align-items-center gap-2 text-danger" type="button" onClick={() => handleDeleteReferral(ref.id)}>
                                                                    <i className="ti ti-trash" /> Delete
                                                                </button>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* ══ Bulk Add Modal ══ */}
            {showBulkModal && (
                <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.45)", zIndex: 1100 }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered" style={{ maxWidth: 850 }}>
                        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12, overflow: "hidden" }}>
                            {/* Header */}
                            <div className="modal-header border-0 px-4 pt-4 pb-0 d-flex align-items-center justify-content-between">
                                <h5 className="modal-title fw-bold fs-18 text-dark" style={{ letterSpacing: "-0.01em" }}>{isScannerMode ? "Scan Items" : "Add Items in Bulk"}</h5>
                                <button
                                    type="button"
                                    className="btn d-flex align-items-center justify-content-center p-0 rounded-circle border-0"
                                    onClick={() => setShowBulkModal(false)}
                                    style={{ width: 26, height: 26, backgroundColor: "#fff5f4", color: "#e41f07" }}
                                >
                                    <i className="ti ti-x fs-14" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="modal-body px-0 pt-3 pb-0">
                                {/* Search Bar Area */}
                                <div className="px-4 pb-3">
                                    <div className="d-flex align-items-center justify-content-between gap-3">
                                        <div className="position-relative flex-grow-1" style={{ maxWidth: 400 }}>
                                            <i className="ti ti-search position-absolute text-muted" style={{ left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16 }} />
                                            <input
                                                ref={bulkSearchRef}
                                                type="text"
                                                className="form-control ps-5 py-2 fs-14 border shadow-none"
                                                style={{ borderRadius: 6, borderColor: "#e5e7eb", background: "#fff", height: 42 }}
                                                placeholder={isScannerMode ? "Scan barcode or type SKU..." : "Search items..."}
                                                autoFocus
                                                value={bulkSearch}
                                                onChange={(e) => setBulkSearch(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && bulkSearch.trim() !== "") {
                                                        const matches = INVENTORY_ITEMS.filter(item =>
                                                            item.name.toLowerCase().includes(bulkSearch.toLowerCase()) ||
                                                            item.sku.toLowerCase().includes(bulkSearch.toLowerCase())
                                                        );
                                                        if (matches.length > 0) {
                                                            const itemToAdd = matches[0];
                                                            handleAddItem(itemToAdd);
                                                            setScannedFeedback(`Added: ${itemToAdd.name}`);
                                                            setBulkSearch("");
                                                            setTimeout(() => setScannedFeedback(""), 2000);

                                                            if (!isScannerMode) {
                                                                setShowBulkModal(false);
                                                            }
                                                        }
                                                    }
                                                }}
                                            />
                                            {scannedFeedback && (
                                                <div className="position-absolute" style={{ top: -35, left: 0, color: "#16a34a", fontSize: 14, fontWeight: 600 }}>
                                                    <i className="ti ti-circle-check-filled me-1" /> {scannedFeedback}
                                                </div>
                                            )}
                                        </div>
                                        {isScannerMode && (
                                            <div className="d-flex align-items-center gap-2 text-muted fs-14">
                                                <i className="ti ti-info-circle" />
                                                Keep scanning to add more items
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Table Area */}
                                <div className="px-4">
                                    <div style={{ maxHeight: "460px", overflowY: "auto" }}>
                                        <table className="table mb-0 fs-14 align-middle" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                                            <thead className="sticky-top" style={{ top: 0, zIndex: 10, backgroundColor: "#f3f4f6" }}>
                                                <tr>
                                                    <th className="py-3 border-bottom-0 text-center" style={{ width: 60, backgroundColor: "#f3f4f6" }}>
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input shadow-none m-0"
                                                            style={{ width: 18, height: 18, borderRadius: 4, cursor: "pointer", verticalAlign: "middle" }}
                                                            checked={selectedBulkItems.length === INVENTORY_ITEMS.length && INVENTORY_ITEMS.length > 0}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedBulkItems(INVENTORY_ITEMS.map(i => i.id));
                                                                else setSelectedBulkItems([]);
                                                            }}
                                                        />
                                                    </th>
                                                    <th className="py-3 border-bottom-0 fw-bold text-dark" style={{ backgroundColor: "#f3f4f6" }}>Item Name</th>
                                                    <th className="py-3 border-bottom-0 fw-bold text-dark" style={{ backgroundColor: "#f3f4f6" }}>SKU</th>
                                                    <th className="py-3 border-bottom-0 fw-bold text-dark" style={{ backgroundColor: "#f3f4f6" }}>Rate</th>
                                                    <th className="py-3 border-bottom-0 fw-bold text-dark text-end pe-4" style={{ backgroundColor: "#f3f4f6" }}>Stock</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {INVENTORY_ITEMS.filter(item =>
                                                    item.name.toLowerCase().includes(bulkSearch.toLowerCase()) ||
                                                    item.sku.toLowerCase().includes(bulkSearch.toLowerCase())
                                                ).map(item => (
                                                    <tr key={item.id}
                                                        onClick={() => {
                                                            if (selectedBulkItems.includes(item.id)) {
                                                                setSelectedBulkItems(prev => prev.filter(id => id !== item.id));
                                                            } else {
                                                                setSelectedBulkItems(prev => [...prev, item.id]);
                                                            }
                                                        }}
                                                        style={{ cursor: "pointer", borderTop: "1px solid #f3f4f6" }}
                                                    >
                                                        <td className="py-3 text-center">
                                                            <input
                                                                type="checkbox"
                                                                className="form-check-input shadow-none m-0"
                                                                style={{ width: 18, height: 18, borderRadius: 4, cursor: "pointer", verticalAlign: "middle" }}
                                                                checked={selectedBulkItems.includes(item.id)}
                                                                readOnly
                                                            />
                                                        </td>
                                                        <td className="py-3 fw-medium text-dark">{item.name}</td>
                                                        <td className="py-3 text-muted" style={{ fontSize: 14 }}>{item.sku}</td>
                                                        <td className="py-3 fw-bold text-dark">₹{fmt2(item.rate)}</td>
                                                        <td className="py-3 text-end pe-4 text-muted" style={{ fontSize: 14 }}>{item.stock}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="modal-footer border-0 px-4 py-4 d-flex align-items-center justify-content-between bg-white">
                                <span className="text-muted fs-14 fw-medium">{selectedBulkItems.length} items selected</span>
                                <div className="d-flex gap-2">
                                    <button
                                        type="button"
                                        className="btn px-4 fs-14 fw-bold border shadow-sm"
                                        style={{ color: "#4b4c4d", backgroundColor: "#f3f4f6", borderColor: "#e5e7eb", borderRadius: 6 }}
                                        onClick={() => setShowBulkModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="btn px-4 fs-14 fw-bold text-white shadow-sm"
                                        style={{ backgroundColor: "#e41f07", borderRadius: 6, minWidth: 140, padding: "10px 24px" }}
                                        onClick={() => {
                                            const selected = INVENTORY_ITEMS.filter(i => selectedBulkItems.includes(i.id));
                                            const newItems = selected.map(s => ({
                                                id: Date.now() + Math.random(),
                                                description: s.name,
                                                qty: 1,
                                                rate: s.rate,
                                                discount: 0,
                                                discountType: "%",
                                                amount: s.rate
                                            }));
                                            const baseItems = items.filter(i => i.description.trim() !== "" || i.rate !== 0);
                                            setItems([...baseItems, ...newItems]);
                                            setShowBulkModal(false);
                                            setSelectedBulkItems([]);
                                        }}
                                    >
                                        Add Items
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddInvoice;
