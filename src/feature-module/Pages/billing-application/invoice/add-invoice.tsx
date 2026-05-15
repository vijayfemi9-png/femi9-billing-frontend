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

const InfoTip: React.FC<{ text: string }> = ({ text }) => {
    const [show, setShow] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const ref = useRef<HTMLSpanElement>(null);
    const handleEnter = () => {
        if (ref.current) {
            const r = ref.current.getBoundingClientRect();
            setPos({ top: r.top - 8, left: r.left + r.width / 2 });
        }
        setShow(true);
    };
    return (
        <span ref={ref} style={{ display: "inline-flex", alignItems: "center", cursor: "default" }}
            onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)}>
            <i className="ti ti-info-circle" style={{ fontSize: 13, color: "#6b7280", marginLeft: 3 }} />
            {show && (
                <div style={{
                    position: "fixed", top: pos.top, left: pos.left, transform: "translate(-50%, -100%)",
                    background: "#1e293b", color: "#fff", fontSize: 11, borderRadius: 5,
                    padding: "4px 8px", whiteSpace: "nowrap", zIndex: 9999,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.18)", pointerEvents: "none", marginTop: -6,
                    maxWidth: 220, lineHeight: 1.4,
                }}>
                    {text}
                    <div style={{
                        position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)",
                        width: 0, height: 0, borderLeft: "4px solid transparent",
                        borderRight: "4px solid transparent", borderTop: "4px solid #1e293b",
                    }} />
                </div>
            )}
        </span>
    );
};

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

    // Toolbar states
    const [toolbarAccount, setToolbarAccount] = useState("");
    const [isGlobalDiscountEnabled, setIsGlobalDiscountEnabled] = useState(false);
    const [globalDiscountValue, setGlobalDiscountValue] = useState(0);
    const [globalDiscountType, setGlobalDiscountType] = useState<"%" | "amount">("%");
    const [reportingTags, setReportingTags] = useState("");
    const [editingToolbar, setEditingToolbar] = useState<"account" | "tags" | null>(null);
    const [showAccountDropdown, setShowAccountDropdown] = useState(false);
    const [showTagsPopup, setShowTagsPopup] = useState(false);
    const [customerCategory, setCustomerCategory] = useState("");
    const [priceList, setPriceList] = useState("");
    const [reference, setReference] = useState("");
    const [location, setLocation] = useState("");
    const [showReferenceModal, setShowReferenceModal] = useState(false);
    const [referrals, setReferrals] = useState([
        { id: 1, name: "Anandh", email: "anandh@gmail.com", phone: "9122044555", type: "Reference" },
        { id: 2, name: "Ranjith", email: "ranjith123@gmail.com", phone: "9876543211", type: "Reference" }
    ]);
    const [showAddReferralForm, setShowAddReferralForm] = useState(false);
    const [newRef, setNewRef] = useState({ name: "", email: "", phone: "", type: "Reference" });
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

    const INVENTORY_ITEMS = (() => {
        try {
            const raw: any[] = JSON.parse(localStorage.getItem("product_list_data") || "[]");
            return raw
                .filter((p: any) => !p.isDeleted && p.status !== "inactive")
                .map((p: any) => ({
                    id: p.id,
                    name: p.name || "Unnamed",
                    sku: p.sku || "",
                    rate: p.selling_price ?? p.costPrice ?? 0,
                    stock: p.stockOnHand != null ? `${p.stockOnHand}${p.unit ? " " + p.unit : ""}` : "—",
                }));
        } catch { return []; }
    })();

    const [customers, setCustomers] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem("billing_customers") || "[]"); } catch { return []; } });
    const [loading, setLoading] = useState(false);
    const [customerSearchQuery, setCustomerSearchQuery] = useState("");
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
    const [showCustPanel, setShowCustPanel] = useState(false);
    const [custPanelTab, setCustPanelTab] = useState<"details" | "activity">("details");
    const [advSearchField, setAdvSearchField] = useState("Display Name");
    const [advSearchQuery, setAdvSearchQuery] = useState("");
    const [advSearchPage, setAdvSearchPage] = useState(1);
    const ADV_SEARCH_PAGE_SIZE = 10;

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
    const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
    const NEW_CUST_DEFAULT = {
        customerType: "Business",
        salutation: "Mr.", firstName: "", lastName: "", companyName: "", companyCategory: "", displayName: "",
        email: "", workPhonePrefix: "+91", workPhone: "", mobilePrefix: "+91", mobile: "",
        language: "English", pan: "", currency: "INR- Indian Rupee", paymentTerms: "Due on Receipt",
        enablePortal: false, phone: "", salesperson: "", priceList: "",
        gstin: "", tds: "", website: "", openingBalance: "",
        billingAttention: "", billingCountry: "India", billingStreet1: "", billingStreet2: "",
        billingCity: "", billingState: "", billingZip: "", billingPhone: "", billingFax: "",
        shippingAttention: "", shippingCountry: "India", shippingStreet1: "", shippingStreet2: "",
        shippingCity: "", shippingState: "", shippingZip: "", shippingPhone: "", shippingFax: "",
        remarks: "",
    };
    const custCategories: { id: number; name: string }[] = (() => { try { return JSON.parse(localStorage.getItem("categories") || "[]"); } catch { return []; } })();
    const custPriceLists: { id: number; name: string }[] = (() => { try { return JSON.parse(localStorage.getItem("priceListData") || "[]"); } catch { return []; } })();
    const custSalespersons: string[] = (() => { try { const d = JSON.parse(localStorage.getItem("billing_salespersons") || "[]"); return d.length > 0 ? d : SALESPERSONS; } catch { return SALESPERSONS; } })();
    const [newCustForm, setNewCustForm] = useState(NEW_CUST_DEFAULT);
    const [newCustTab, setNewCustTab] = useState("Other Details");
    const [newCustShowMore, setNewCustShowMore] = useState(false);
    const [newCustCustomFields, setNewCustCustomFields] = useState<{name: string; value: string}[]>([]);
    const [newCustTags, setNewCustTags] = useState<string[]>([]);
    const [newCustTagInput, setNewCustTagInput] = useState("");
    const [selectedBulkItems, setSelectedBulkItems] = useState<number[]>([]);
    const [bulkQuantities, setBulkQuantities] = useState<Record<number, string>>({});
    const [bulkSearch, setBulkSearch] = useState("");
    const bulkSearchRef = useRef<HTMLInputElement>(null);
    const bulkQtyRefs = useRef<Record<number, HTMLInputElement | null>>({});
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
            const prefs = (() => { try { return JSON.parse(localStorage.getItem("invoice_preferences") || "{}"); } catch { return {}; } })();
            const selectedCatIds: number[] = prefs.advancePaymentCategories || [];
            const DEFAULT_CATEGORIES = [
                { id: 1, name: "Super_stockist" }, { id: 2, name: "mvbfy" }, { id: 3, name: "cfvgbhj" },
                { id: 4, name: "New SS" }, { id: 5, name: "drtr" }, { id: 6, name: "New S" }, { id: 7, name: "Super_distributor" },
            ];
            const savedCats: any[] = (() => { try { return JSON.parse(localStorage.getItem("categories") || "[]"); } catch { return []; } })();
            const allCats = savedCats.length > 0 ? savedCats : DEFAULT_CATEGORIES;
            const selectedCatNames = allCats
                .filter((c: any) => selectedCatIds.includes(Number(c.id)))
                .map((c: any) => (c.name || "").trim().toLowerCase());

            const allCustomers: any[] = (() => { try { return JSON.parse(localStorage.getItem("billing_customers") || "[]"); } catch { return []; } })();
            const balances = (() => { try { return JSON.parse(localStorage.getItem("customer_advance_balances") || "{}"); } catch { return {}; } })();

            const filtered = allCustomers.filter((c: any) => {
                const custCat = (c.companyCategory || c.category || "").trim().toLowerCase();
                return selectedCatNames.length === 0 || selectedCatNames.includes(custCat);
            });

            const mapped = filtered.map((c: any) => ({
                id: String(c.id),
                name: c.displayName || c.display_name || c.companyName || "Unknown",
                balance: balances[String(c.id)] || 0,
            }));
            setAdvanceCategoryCustomers(mapped);
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

    // Financial Calculations
    const subtotal = items.reduce((acc, item) => acc + item.amount, 0);

    // Global Discount Calculation
    const globalDiscountAmount = isGlobalDiscountEnabled 
        ? (globalDiscountType === "%" ? (subtotal * globalDiscountValue / 100) : globalDiscountValue)
        : 0;
        
    const taxableAmount = Math.max(0, subtotal - globalDiscountAmount);
    const taxAmount = selectedTax ? (taxableAmount * parseFloat(selectedTax.split(" ").pop() || "0")) / 100 : 0;
    const totalOtherCharges = otherCharges.reduce((acc, oc) => acc + oc.amount, 0);
    const total = taxableAmount + taxAmount + courierCharges + totalOtherCharges;
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

    function handleSaveNewCustomer() {
        const f = newCustForm;
        const displayName = f.displayName || [f.firstName, f.lastName].filter(Boolean).join(" ") || f.companyName;
        if (!displayName) return;
        const existing: any[] = (() => { try { return JSON.parse(localStorage.getItem("billing_customers") || "[]"); } catch { return []; } })();
        const nextId = existing.length > 0 ? Math.max(...existing.map((c: any) => Number(c.id) || 0)) + 1 : 1;
        const newCustomer = {
            id: nextId,
            customerType: f.customerType,
            salutation: f.salutation,
            firstName: f.firstName,
            lastName: f.lastName,
            companyName: f.companyName,
            companyCategory: f.companyCategory,
            displayName,
            name: displayName,
            email: f.email,
            phone: f.workPhone || f.mobile || f.phone,
            mobile: f.mobile,
            workPhone: f.workPhone,
            language: f.language,
            pan: f.pan,
            gstin: f.gstin,
            website: f.website,
            currency: f.currency,
            paymentTerms: f.paymentTerms,
            priceList: f.priceList,
            salesperson: f.salesperson,
            enablePortal: f.enablePortal,
            openingBalance: f.openingBalance,
            billingAddress: { attention: f.billingAttention, country: f.billingCountry, street1: f.billingStreet1, street2: f.billingStreet2, city: f.billingCity, state: f.billingState, zip: f.billingZip, phone: f.billingPhone, fax: f.billingFax },
            shippingAddress: { attention: f.shippingAttention, country: f.shippingCountry, street1: f.shippingStreet1, street2: f.shippingStreet2, city: f.shippingCity, state: f.shippingState, zip: f.shippingZip, phone: f.shippingPhone, fax: f.shippingFax },
            customFields: newCustCustomFields,
            reportingTags: newCustTags,
            remarks: f.remarks,
            receivables: 0,
            unusedCredits: 0,
        };
        const updated = [...existing, newCustomer];
        localStorage.setItem("billing_customers", JSON.stringify(updated));
        setCustomers(updated);
        setCustomerName(String(nextId));
        setNewCustForm(NEW_CUST_DEFAULT);
        setNewCustTab("Other Details");
        setNewCustShowMore(false);
        setNewCustCustomFields([]);
        setNewCustTags([]);
        setNewCustTagInput("");
        setShowAddCustomerModal(false);
        setShowCustomerDropdown(false);
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
        setNewRef({ name: "", email: "", phone: "", type: "Reference" });
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
                    <div className="card-body p-2 p-sm-3 p-md-4">
                        <div className="row g-4">

                            {/* ── Screenshot-style form fields ── */}
                            <div className="col-12">
                                <style>{`
                                    .inv-row { display: flex; align-items: center; margin-bottom: 20px; }
                                    .inv-label { min-width: 180px; font-size: 14px; font-weight: 500; color: #1a1a2e; flex-shrink: 0; }
                                    .inv-label.req { color: #c0392b; }
                                    .inv-input { height: 36px; font-size: 14px; border: 1px solid #d0d5dd; border-radius: 4px; padding: 0 10px; background: #fff; outline: none; transition: border-color 0.15s; }
                                    .inv-input:focus { border-color: #e41f07 !important; box-shadow: none !important; outline: none !important; }
                                    .inv-select { height: 36px; font-size: 14px; border: 1px solid #d0d5dd; border-radius: 4px; padding: 0 28px 0 10px; background: #fff url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e") no-repeat right 8px center / 10px 10px; outline: none; appearance: none; -webkit-appearance: none; cursor: pointer; transition: border-color 0.15s; }
                                    .inv-select:focus { border-color: #e41f07 !important; box-shadow: none !important; outline: none !important; }
                                    @media (max-width: 576px) {
                                        .inv-row { flex-direction: column; align-items: flex-start; gap: 6px; }
                                        .inv-label { min-width: unset; width: 100%; }
                                        .inv-input { width: 100% !important; max-width: 100% !important; }
                                        .inv-select { width: 100% !important; max-width: 100% !important; }
                                        .customer-search-container { width: 100% !important; max-width: 100% !important; flex: 1; }
                                        .inv-row textarea { width: 100% !important; max-width: 100% !important; }
                                    }
                                `}</style>

                                {/* Customer Name */}
                                <div className="inv-row" style={{ alignItems: "center", gap: 16 }}>
                                    <label className="inv-label req text-danger">Customer Name*</label>
                                    <div className="customer-search-container d-flex" style={{ flex: 1, maxWidth: 520, position: "relative" }}>
                                        <div style={{ flex: 1, position: "relative" }}>
                                            <input
                                                type="text"
                                                className="inv-input w-100"
                                                placeholder="Select or add a customer"
                                                style={{ borderRadius: "4px 0 0 4px", paddingRight: 30 }}
                                                value={customerSearchQuery !== "" ? customerSearchQuery : (customers.find((c: any) => String(c.id) === customerName)?.displayName || customers.find((c: any) => String(c.id) === customerName)?.name || "")}
                                                onChange={e => { setCustomerSearchQuery(e.target.value); setCustomerName(""); setShowCustomerDropdown(true); }}
                                                onFocus={() => setShowCustomerDropdown(true)}
                                            />
                                            <i className="ti ti-chevron-down" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#6b7280", pointerEvents: "none" }} />
                                        </div>
                                        <button
                                            type="button"
                                            style={{ width: 38, height: 36, background: "#e41f07", border: "1px solid #e41f07", borderRadius: "0 4px 4px 0", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                                            onClick={() => { setAdvSearchQuery(""); setAdvSearchPage(1); setShowAdvancedSearch(true); }}
                                        >
                                            <i className="ti ti-search" style={{ fontSize: 15 }} />
                                        </button>
                                        {showCustomerDropdown && (
                                            <div className="dropdown-menu show shadow-lg border-0 p-0 overflow-hidden" style={{ position: "absolute", width: "calc(100% - 38px)", top: "100%", left: 0, zIndex: 1050, marginTop: 4, borderRadius: 8 }}>
                                                <div style={{ maxHeight: 260, overflowY: "auto" }}>
                                                    {(() => {
                                                        const filtered = customers.filter((c: any) =>
                                                            (c.displayName || c.name || "").toLowerCase().includes(customerSearchQuery.toLowerCase())
                                                        );
                                                        return filtered.length === 0 ? (
                                                            <div className="px-3 py-4 text-center text-muted" style={{ fontSize: 14 }}>No customers found</div>
                                                        ) : filtered.map((c: any) => (
                                                            <button key={c.id} type="button" className="dropdown-item px-3 py-2 border-bottom d-flex align-items-center gap-3"
                                                                onClick={() => { setCustomerName(String(c.id)); setCustomerSearchQuery(""); setShowCustomerDropdown(false); }}>
                                                                <div className="bg-light rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 32, height: 32 }}>
                                                                    <i className="ti ti-user text-muted" style={{ fontSize: 15 }} />
                                                                </div>
                                                                <div>
                                                                    <div className="fw-semibold" style={{ fontSize: 14 }}>{c.displayName || c.name || "Unnamed Customer"}</div>
                                                                    <div className="text-muted" style={{ fontSize: 13 }}>{c.companyName || "Individual"}</div>
                                                                </div>
                                                            </button>
                                                        ));
                                                    })()}
                                                </div>
                                                <button type="button" className="dropdown-item px-3 py-2 text-danger fw-semibold d-flex align-items-center gap-2 bg-white border-top" style={{ fontSize: 14 }}
                                                    onClick={() => { setShowCustomerDropdown(false); setShowAddCustomerModal(true); }}>
                                                    <i className="ti ti-circle-plus" style={{ fontSize: 15 }} /> Add New Customer
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {/* Customer details chip */}
                                    {customerName && (() => {
                                        const sel = customers.find((c: any) => String(c.id) === customerName);
                                        if (!sel) return null;
                                        const name = sel.displayName || sel.name || "Customer";
                                        const allInvoices: any[] = (() => { try { return JSON.parse(localStorage.getItem("billing_invoices") || "[]"); } catch { return []; } })();
                                        const unpaid = allInvoices.filter((inv: any) =>
                                            String(inv.customerId) === customerName && inv.status !== "Paid" && inv.status !== "Void"
                                        ).length;
                                        return (
                                            <button
                                                type="button"
                                                onClick={() => { setCustPanelTab("details"); setShowCustPanel(true); }}
                                                style={{
                                                    background: "#2d3748", border: "none", borderRadius: 8, color: "#fff",
                                                    padding: "8px 14px", display: "flex", alignItems: "center", gap: 10,
                                                    cursor: "pointer", flexShrink: 0, minWidth: 180, textAlign: "left",
                                                }}
                                            >
                                                <div style={{ flex: 1 }}>
                                                    <div className="fw-bold" style={{ fontSize: 13 }}>{name}'s Details</div>
                                                    {unpaid > 0 && (
                                                        <div className="d-flex align-items-center gap-1 mt-1" style={{ fontSize: 11, color: "#fbbf24" }}>
                                                            <i className="ti ti-alert-triangle" style={{ fontSize: 12 }} />
                                                            {unpaid} Unpaid Invoice{unpaid > 1 ? "s" : ""}
                                                        </div>
                                                    )}
                                                    {unpaid === 0 && (
                                                        <div className="d-flex align-items-center gap-1 mt-1" style={{ fontSize: 11, color: "#86efac" }}>
                                                            <i className="ti ti-circle-check" style={{ fontSize: 12 }} />
                                                            No pending invoices
                                                        </div>
                                                    )}
                                                </div>
                                                <i className="ti ti-chevron-right" style={{ fontSize: 14, color: "#9ca3af" }} />
                                            </button>
                                        );
                                    })()}
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
                                        Subject <InfoTip text="This will be displayed in the email sent to your customer" />
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
                                        <div style={{ position: "relative" }}>
                                            <button
                                                type="button"
                                                className="btn btn-white d-flex align-items-center gap-2 px-3 py-1 fw-medium border shadow-sm"
                                                style={{ fontSize: 14, height: 34, color: "#4b4c4dff", borderRadius: 4 }}
                                                onClick={() => setBulkOpen(o => !o)}
                                            >
                                                <i className="ti ti-circle-check fs-16" style={{ color: "#e41f07" }} /> <span style={{ color: "#e03e21ff" }}>Bulk Actions</span> <i className="ti ti-chevron-down ms-1" style={{ fontSize: 10, color: "#9ca3af" }} />
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
                                                            min={1}
                                                            style={{ fontSize: 14, border: "1px solid #e5e7eb", borderRadius: 6, backgroundColor: "#fff" }}
                                                            value={item.qty === 0 ? "" : item.qty}
                                                            placeholder="1"
                                                            onChange={e => updateItem(idx, "qty", e.target.value === "" ? 0 : Number(e.target.value))}
                                                            onBlur={e => { if (!e.target.value || Number(e.target.value) < 1) updateItem(idx, "qty", 1); }}
                                                            onFocus={e => e.target.select()}
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

                                {/* Table Footer Toolbar */}
                                <div className="d-flex align-items-center bg-light border-start border-end border-bottom py-1" style={{ fontSize: 13, color: "#6b7280" }}>
                                    {/* Select an Account Dropdown */}
                                    <div className="position-relative border-end" style={{ minWidth: 180 }}>
                                        <div 
                                            className="d-flex align-items-center gap-2 px-3 py-1 cursor-pointer hover-bg-white" 
                                            style={{ height: 32 }}
                                            onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                                        >
                                            <i className="ti ti-archive fs-16" />
                                            <span className="text-truncate text-muted">{toolbarAccount || "Select an account"}</span>
                                            <i className={`ti ti-chevron-${showAccountDropdown ? 'up' : 'down'} fs-10 ms-auto`} />
                                        </div>
                                        
                                        {showAccountDropdown && (
                                            <div className="position-absolute start-0 top-100 mt-1 bg-white border shadow-lg rounded" style={{ width: 280, zIndex: 1000, maxHeight: 400, overflowY: 'auto' }}>
                                                <div className="p-2 border-bottom">
                                                    <div className="input-group input-group-sm">
                                                        <span className="input-group-text bg-white border-end-0 border-primary" style={{ borderRight: 'none' }}><i className="ti ti-search text-muted" /></span>
                                                        <input type="text" className="form-control border-start-0 shadow-none border-primary" style={{ borderLeft: 'none' }} placeholder="Search" />
                                                    </div>
                                                </div>
                                                <div className="py-1">
                                                    <div className="px-3 py-1 fw-bold fs-12 text-uppercase text-muted bg-light">Equity</div>
                                                    {["Dividends Paid", "Drawings", "Investments", "Opening Balance Offset", "Owner's Equity"].map(acc => (
                                                        <div 
                                                            key={acc} 
                                                            className={`px-3 py-2 cursor-pointer d-flex align-items-center justify-content-between fs-13 ${toolbarAccount === acc ? 'bg-primary text-white rounded-1 mx-1' : 'hover-bg-light text-dark'}`} 
                                                            onClick={() => { setToolbarAccount(acc); setShowAccountDropdown(false); }}
                                                        >
                                                            <span>{acc}</span>
                                                            {toolbarAccount === acc && <i className="ti ti-check fs-14" />}
                                                        </div>
                                                    ))}
                                                    
                                                    <div className="px-3 py-1 fw-bold fs-12 text-uppercase text-muted bg-light mt-1">Income</div>
                                                    {["Discount", "General Income", "Interest Income", "Late Fee Income", "Other Charges", "Sales"].map(acc => (
                                                        <div 
                                                            key={acc} 
                                                            className={`px-3 py-2 cursor-pointer d-flex align-items-center justify-content-between fs-13 ${toolbarAccount === acc ? 'bg-primary text-white rounded-1 mx-1' : 'hover-bg-light text-dark'}`} 
                                                            onClick={() => { setToolbarAccount(acc); setShowAccountDropdown(false); }}
                                                        >
                                                            <span>{acc}</span>
                                                            {toolbarAccount === acc && <i className="ti ti-check fs-14" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Discount Toggle */}
                                    <div className="d-flex align-items-center gap-2 px-3 py-1 cursor-pointer border-end hover-bg-white" style={{ height: 32 }} onClick={() => setIsGlobalDiscountEnabled(!isGlobalDiscountEnabled)}>
                                        <i className="ti ti-ticket fs-16" />
                                        <span className={`text-muted ${isGlobalDiscountEnabled ? '' : 'fw-bold'}`} style={{ lineHeight: 1 }}>Discount</span>
                                        <i className="ti ti-chevron-down fs-10 ms-1" style={{ color: "#9ca3af" }} />
                                    </div>

                                    {/* Reporting Tags Popup */}
                                    <div className="position-relative" style={{ minWidth: 160 }}>
                                        <div 
                                            className="d-flex align-items-center gap-2 px-3 py-1 cursor-pointer hover-bg-white" 
                                            style={{ height: 32 }}
                                            onClick={() => setShowTagsPopup(!showTagsPopup)}
                                        >
                                            <i className="ti ti-tag fs-16" />
                                            <span className="text-muted">Reporting Tags</span>
                                            <i className="ti ti-chevron-down fs-10 ms-1" style={{ color: "#9ca3af" }} />
                                        </div>

                                        {showTagsPopup && (
                                            <div className="position-absolute start-0 top-100 mt-1 bg-white border shadow-lg rounded" style={{ width: 450, zIndex: 1000 }}>
                                                <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
                                                    <span className="fw-bold fs-14">Reporting Tags</span>
                                                    <i className="ti ti-x cursor-pointer" onClick={() => setShowTagsPopup(false)} />
                                                </div>
                                                <div className="p-4">
                                                    <p className="fs-14 text-muted mb-4">
                                                        There are no active reporting tags, or no tags have been created for association at the item level. Kindly create or edit reporting tags from Settings.
                                                    </p>
                                                    <button type="button" className="btn btn-sm btn-light border px-3" onClick={() => setShowTagsPopup(false)}>OK</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
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

                                    {/* Global Discount Row */}
                                    {isGlobalDiscountEnabled && (
                                        <div className="d-flex align-items-center justify-content-between px-3 py-2 gap-3" style={{ borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="text-muted fs-13 fw-medium">Discount</span>
                                                <div className="btn-group btn-group-sm border rounded overflow-hidden" style={{ height: 24 }}>
                                                    <button type="button" className={`btn btn-sm py-0 px-2 fs-11 ${globalDiscountType === "%" ? "text-white" : "btn-white text-dark"}`} style={{ borderRadius: 0, background: globalDiscountType === "%" ? "#dc2626" : "transparent" }} onClick={() => setGlobalDiscountType("%")}>%</button>
                                                    <button type="button" className={`btn btn-sm py-0 px-2 fs-11 ${globalDiscountType === "amount" ? "text-white" : "btn-white text-dark"}`} style={{ borderRadius: 0, background: globalDiscountType === "amount" ? "#dc2626" : "transparent" }} onClick={() => setGlobalDiscountType("amount")}>₹</button>
                                                </div>
                                            </div>
                                            <div className="d-flex align-items-center gap-2">
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm border text-end"
                                                    style={{ maxWidth: 80, borderRadius: 4, fontSize: 13, height: 28 }}
                                                    value={globalDiscountValue || ""}
                                                    placeholder="0"
                                                    onChange={e => setGlobalDiscountValue(e.target.value === "" ? 0 : +e.target.value)}
                                                    onFocus={e => e.target.select()}
                                                />
                                                <span className="fw-bold fs-13 text-danger" style={{ minWidth: 60, textAlign: "right" }}>
                                                    - {fmt2(globalDiscountAmount)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
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
                                            {!customerName ? (
                                                <div className="d-flex align-items-center gap-2 p-3 rounded border" style={{ background: "#fefce8", borderColor: "#fde68a" }}>
                                                    <i className="ti ti-alert-triangle" style={{ color: "#d97706", fontSize: 18, flexShrink: 0 }} />
                                                    <p className="mb-0 fs-14 fw-medium" style={{ color: "#92400e" }}>Please select a customer first to view advance balance.</p>
                                                </div>
                                            ) : customerAdvanceBalance > 0 ? (
                                                <div className="d-flex align-items-center justify-content-between p-3 rounded border" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <i className="ti ti-circle-check" style={{ color: "#16a34a", fontSize: 20, flexShrink: 0 }} />
                                                        <div>
                                                            <p className="fw-semibold mb-0 fs-14" style={{ color: "#15803d" }}>
                                                                {selectedCustomerDisplayName} has <span className="fw-bold">₹{fmt2(customerAdvanceBalance)}</span> advance balance
                                                            </p>
                                                            <p className="mb-0 fs-13 text-muted">This will be applied against the invoice amount.</p>
                                                        </div>
                                                    </div>
                                                    <div className="d-flex align-items-center gap-2 px-3 py-2 rounded border" style={{ background: "#fff", borderColor: "#d1d5db", flexShrink: 0 }}>
                                                        <span className="fw-bold fs-15" style={{ color: "#16a34a" }}>₹{fmt2(customerAdvanceBalance)}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="d-flex align-items-center gap-2 p-3 rounded border" style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
                                                    <i className="ti ti-info-circle" style={{ color: "#dc2626", fontSize: 18, flexShrink: 0 }} />
                                                    <div>
                                                        <p className="fw-semibold mb-0 fs-14" style={{ color: "#374151" }}>
                                                            <i className="ti ti-user me-1 text-muted" />{selectedCustomerDisplayName}
                                                        </p>
                                                        <p className="mb-0 fs-13 text-muted">No advance balance available for this customer.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
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
                                                                <option>Advance Payment</option>
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
                            style={{ background: "#e79111ff", border: "1px solid #e79111ff", borderRadius: 4, height: 38, opacity: 1 }}
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
                                    Continue auto-generating invoice numbers <InfoTip text="Invoice numbers will be generated automatically based on your prefix and sequence" />
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
            {/* Customer Details Side Panel */}
            {showCustPanel && customerName && (() => {
                const sel = customers.find((c: any) => String(c.id) === customerName);
                if (!sel) return null;
                const name = sel.displayName || sel.name || "Customer";
                const initials = name.charAt(0).toUpperCase();
                const allInvoices: any[] = (() => { try { return JSON.parse(localStorage.getItem("billing_invoices") || "[]"); } catch { return []; } })();
                const custInvoices = allInvoices.filter((inv: any) => String(inv.customerId) === customerName);
                const outstanding = custInvoices.filter((inv: any) => inv.status !== "Paid" && inv.status !== "Void").reduce((s: number, inv: any) => s + (inv.grandTotal || 0), 0);
                return (
                    <div style={{ position: "fixed", inset: 0, zIndex: 1070, display: "flex", justifyContent: "flex-end" }} onClick={() => setShowCustPanel(false)}>
                        <div style={{ width: 340, height: "100%", background: "#fff", boxShadow: "-4px 0 24px rgba(0,0,0,0.13)", overflowY: "auto", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div className="d-flex align-items-start justify-content-between px-4 pt-4 pb-3" style={{ borderBottom: "1px solid #f0f2f4" }}>
                                <div className="d-flex align-items-center gap-3">
                                    <div style={{ width: 44, height: 44, borderRadius: 8, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#475569" }}>
                                        {initials}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>Customer</div>
                                        <div className="fw-bold d-flex align-items-center gap-2" style={{ fontSize: 15, color: "#111827" }}>
                                            {name}
                                            <i className="ti ti-external-link" style={{ fontSize: 13, color: "#e41f07", cursor: "pointer" }} onClick={() => window.open(route.customerList, "_blank")} />
                                        </div>
                                    </div>
                                </div>
                                <button type="button" className="btn p-0 border-0 shadow-none" onClick={() => setShowCustPanel(false)}>
                                    <i className="ti ti-x fs-16" style={{ color: "#9ca3af" }} />
                                </button>
                            </div>
                            {/* Info */}
                            <div className="px-4 py-3" style={{ borderBottom: "1px solid #f0f2f4" }}>
                                {sel.companyName && <div className="d-flex align-items-center gap-2 mb-1" style={{ fontSize: 13, color: "#374151" }}><i className="ti ti-building text-muted" style={{ fontSize: 13 }} />{sel.companyName}</div>}
                                {sel.email && <div className="d-flex align-items-center gap-2" style={{ fontSize: 13, color: "#374151" }}><i className="ti ti-mail text-muted" style={{ fontSize: 13 }} />{sel.email}</div>}
                            </div>
                            {/* Tabs */}
                            <div className="d-flex px-4 gap-4" style={{ borderBottom: "1px solid #e5e7eb", position: "relative", marginTop: 12 }}>
                                {(["details", "activity"] as const).map(tab => (
                                    <div key={tab} style={{ paddingBottom: 0, position: "relative" }}>
                                        <button
                                            type="button"
                                            className="btn p-0 border-0 shadow-none"
                                            style={{ fontSize: 13, fontWeight: 600, color: custPanelTab === tab ? "#e41f07" : "#6b7280", padding: "12px 0", background: "none", display: "block" }}
                                            onClick={() => setCustPanelTab(tab)}
                                        >
                                            {tab === "details" ? "Details" : "Activity Log"}
                                        </button>
                                        {custPanelTab === tab && (
                                            <div style={{ position: "absolute", bottom: -1, left: 0, right: 0, height: 2, background: "#e41f07", borderRadius: "2px 2px 0 0" }} />
                                        )}
                                    </div>
                                ))}
                            </div>
                            {/* Tab Content */}
                            <div className="flex-grow-1 px-4 py-3">
                                {custPanelTab === "details" ? (
                                    <>
                                        {/* Stats */}
                                        <div className="d-flex gap-2 mb-4">
                                            <div className="flex-1 rounded p-3 text-center" style={{ flex: 1, border: "1px solid #f0f2f4", borderRadius: 8 }}>
                                                <i className="ti ti-alert-triangle mb-1" style={{ fontSize: 18, color: "#f59e0b", display: "block" }} />
                                                <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>Outstanding Receivables</div>
                                                <div className="fw-bold" style={{ fontSize: 15 }}>₹{outstanding.toFixed(2)}</div>
                                            </div>
                                            <div className="flex-1 rounded p-3 text-center" style={{ flex: 1, border: "1px solid #f0f2f4", borderRadius: 8 }}>
                                                <i className="ti ti-currency-rupee mb-1" style={{ fontSize: 18, color: "#10b981", display: "block" }} />
                                                <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>Unused Credits</div>
                                                <div className="fw-bold" style={{ fontSize: 15 }}>₹{(sel.unusedCredits || 0).toFixed(2)}</div>
                                            </div>
                                        </div>
                                        {/* Contact Details */}
                                        <div className="fw-bold mb-3" style={{ fontSize: 13, color: "#111827" }}>Contact Details</div>
                                        {[
                                            ["Customer Type", sel.customerType || sel.salutation || "Business"],
                                            ["Currency", sel.currency || "INR"],
                                            ["Payment Terms", sel.paymentTerms || "Due on Receipt"],
                                            ["Portal Status", sel.portalStatus || "Disabled"],
                                            ["Customer Language", sel.language || "English"],
                                        ].map(([label, value]) => (
                                            <div key={label} className="d-flex justify-content-between align-items-center py-2" style={{ borderBottom: "1px solid #f9fafb", fontSize: 13 }}>
                                                <span style={{ color: "#9ca3af" }}>{label}</span>
                                                <span style={{ color: "#111827", fontWeight: 500 }}>{value}</span>
                                            </div>
                                        ))}
                                    </>
                                ) : (() => {
                                    const activityEntries: { id: number; icon: string; message: string; datetime: string; invNum?: string }[] = [];
                                    custInvoices.forEach((inv: any) => {
                                        const invActivities: any[] = (() => { try { return JSON.parse(localStorage.getItem(`billing_invoice_activity_${inv.id}`) || "[]"); } catch { return []; } })();
                                        invActivities.forEach((a: any) => activityEntries.push({ ...a, invNum: inv.invNumber || inv.id }));
                                        if (invActivities.length === 0) {
                                            activityEntries.push({ id: inv.id, icon: "ti-file-invoice", message: `Invoice ${inv.invNumber || "#" + inv.id} created`, datetime: inv.invoiceDate || "", invNum: inv.invNumber || inv.id });
                                        }
                                    });
                                    activityEntries.sort((a, b) => b.id - a.id);
                                    const iconMap: Record<string, { bg: string; color: string; icon: string }> = {
                                        "invoice_created": { bg: "#fef9c3", color: "#ca8a04", icon: "ti-file-invoice" },
                                        "invoice_updated": { bg: "#fff3cd", color: "#f59e0b", icon: "ti-edit" },
                                        "status_changed": { bg: "#fff3cd", color: "#f59e0b", icon: "ti-edit" },
                                        "payment": { bg: "#dcfce7", color: "#16a34a", icon: "ti-circle-check" },
                                        "void": { bg: "#fee2e2", color: "#dc2626", icon: "ti-ban" },
                                        "ti-file-invoice": { bg: "#fff0ef", color: "#e41f07", icon: "ti-file-invoice" },
                                    };
                                    if (activityEntries.length === 0) return (
                                        <div className="text-center text-muted py-5" style={{ fontSize: 13 }}>
                                            <i className="ti ti-history d-block mb-2" style={{ fontSize: 28 }} />
                                            No activity recorded yet
                                        </div>
                                    );
                                    return (
                                        <div className="d-flex flex-column gap-3">
                                            {activityEntries.map((entry, i) => {
                                                const style = iconMap[entry.icon] || { bg: "#fff0ef", color: "#e41f07", icon: "ti-activity" };
                                                return (
                                                    <div key={i} className="d-flex gap-3 align-items-start">
                                                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: style.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                            <i className={`ti ${style.icon}`} style={{ fontSize: 14, color: style.color }} />
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{entry.message}</div>
                                                            {entry.datetime && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{entry.datetime}</div>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Advanced Customer Search Modal */}
            {showAdvancedSearch && (() => {
                const q = advSearchQuery.trim().toLowerCase();
                const filtered = customers.filter((c: any) => {
                    if (!q) return true;
                    if (advSearchField === "Display Name") return (c.displayName || c.name || "").toLowerCase().includes(q);
                    if (advSearchField === "Email") return (c.email || "").toLowerCase().includes(q);
                    if (advSearchField === "Company Name") return (c.companyName || "").toLowerCase().includes(q);
                    if (advSearchField === "Phone") return (c.workPhone || c.mobile || "").toLowerCase().includes(q);
                    return true;
                });
                const totalPages = Math.ceil(filtered.length / ADV_SEARCH_PAGE_SIZE) || 1;
                const page = Math.min(advSearchPage, totalPages);
                const pageRows = filtered.slice((page - 1) * ADV_SEARCH_PAGE_SIZE, page * ADV_SEARCH_PAGE_SIZE);
                return (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1060, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
                        <div className="card border-0 shadow-lg" style={{ width: "100%", maxWidth: 760, borderRadius: 10, overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
                            {/* Header */}
                            <div className="d-flex align-items-center justify-content-between px-4 py-3 bg-white" style={{ borderBottom: "1px solid #f0f2f4" }}>
                                <h6 className="mb-0 fw-bold fs-16 text-dark">Advanced Customer Search</h6>
                                <button type="button" className="btn p-0 border-0 shadow-none" onClick={() => setShowAdvancedSearch(false)}>
                                    <i className="ti ti-x fs-18" style={{ color: "#9ca3af" }} />
                                </button>
                            </div>
                            {/* Search Bar */}
                            <div className="px-4 py-3 bg-white">
                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                    <div className="dropdown">
                                        <button
                                            type="button"
                                            className="btn btn-light border d-flex align-items-center gap-2 fw-medium"
                                            style={{ fontSize: 14, height: 38, borderRadius: 6 }}
                                            data-bs-toggle="dropdown"
                                        >
                                            {advSearchField} <i className="ti ti-chevron-down fs-13" style={{ color: "#9ca3af" }} />
                                        </button>
                                        <ul className="dropdown-menu shadow-sm border-0" style={{ fontSize: 14 }}>
                                            {["Display Name", "Email", "Company Name", "Phone"].map(f => (
                                                <li key={f}>
                                                    <button className="dropdown-item py-2" type="button"
                                                        onClick={() => { setAdvSearchField(f); setAdvSearchQuery(""); setAdvSearchPage(1); }}
                                                    >{f}</button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <input
                                        type="text"
                                        className="form-control shadow-none"
                                        placeholder={`Search by ${advSearchField}...`}
                                        style={{ flex: 1, minWidth: 160, height: 38, fontSize: 14, borderRadius: 6 }}
                                        value={advSearchQuery}
                                        autoFocus
                                        onChange={e => { setAdvSearchQuery(e.target.value); setAdvSearchPage(1); }}
                                        onKeyDown={e => e.key === "Enter" && setAdvSearchPage(1)}
                                    />
                                    <button
                                        type="button"
                                        className="btn fw-bold text-white"
                                        style={{ background: "#e41f07", border: "none", height: 38, borderRadius: 6, paddingInline: 24, fontSize: 14 }}
                                        onClick={() => setAdvSearchPage(1)}
                                    >
                                        Search
                                    </button>
                                </div>
                            </div>
                            {/* Table */}
                            <div style={{ overflowY: "auto", flex: 1, padding: "0 16px" }}>
                                <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ background: "#f3f4f6" }}>
                                            {[["CUSTOMER NAME", "160px"], ["EMAIL", "auto"], ["COMPANY NAME", "140px"], ["PHONE", "120px"]].map(([label, w]) => (
                                                <th key={label} style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", letterSpacing: "0.05em", padding: "12px 16px", border: "none", background: "#f3f4f6", whiteSpace: "nowrap", width: w }}>{label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageRows.length === 0 ? (
                                            <tr><td colSpan={4} className="text-center text-muted py-5" style={{ fontSize: 14 }}>No customers found</td></tr>
                                        ) : pageRows.map((c: any) => (
                                            <tr
                                                key={c.id}
                                                style={{ cursor: "pointer" }}
                                                onMouseEnter={e => (e.currentTarget.style.background = "#fff5f5")}
                                                onMouseLeave={e => (e.currentTarget.style.background = "")}
                                                onClick={() => { setCustomerName(String(c.id)); setCustomerSearchQuery(""); setShowAdvancedSearch(false); }}
                                            >
                                                <td style={{ padding: "12px 16px", fontWeight: 600, color: "#e41f07", fontSize: 14, whiteSpace: "nowrap" }}>
                                                    {c.displayName || c.name || "—"}
                                                </td>
                                                <td style={{ padding: "12px 16px", color: "#374151", fontSize: 14 }}>{c.email || "—"}</td>
                                                <td style={{ padding: "12px 16px", color: "#374151", fontSize: 14, whiteSpace: "nowrap" }}>{c.companyName || "—"}</td>
                                                <td style={{ padding: "12px 16px", color: "#374151", fontSize: 14, whiteSpace: "nowrap" }}>{c.workPhone || c.mobile || "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Pagination */}
                            {filtered.length > 0 && (
                                <div className="d-flex justify-content-end align-items-center px-4 py-3 bg-white" style={{ gap: 8 }}>
                                    <button type="button" className="btn btn-light border btn-sm" style={{ borderRadius: 6, width: 32, height: 32 }} disabled={page === 1} onClick={() => setAdvSearchPage(p => p - 1)}>
                                        <i className="ti ti-chevron-left fs-14" />
                                    </button>
                                    <span className="fw-medium" style={{ fontSize: 14, minWidth: 60, textAlign: "center" }}>
                                        {(page - 1) * ADV_SEARCH_PAGE_SIZE + 1} - {Math.min(page * ADV_SEARCH_PAGE_SIZE, filtered.length)}
                                    </span>
                                    <button type="button" className="btn btn-light border btn-sm" style={{ borderRadius: 6, width: 32, height: 32 }} disabled={page * ADV_SEARCH_PAGE_SIZE >= filtered.length} onClick={() => setAdvSearchPage(p => p + 1)}>
                                        <i className="ti ti-chevron-right fs-14" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Manage Referrals / References Modal */}
            {showReferenceModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px" }}>
                    <div className="card border-0 shadow-lg" style={{ width: "100%", maxWidth: 800, borderRadius: 8, overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
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
                        <div className="card-body p-3 p-md-4" style={{ overflowY: "auto", flex: 1 }}>
                            <div className="d-flex align-items-center justify-content-between mb-4 gap-2 flex-wrap">
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
                                        <div className="col-md-3">
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
                                        <div className="col-md-3">
                                            <label className="form-label mb-1 fw-bold text-dark" style={{ fontSize: 14 }}>Type <span className="text-danger">*</span></label>
                                            <select
                                                className="form-select border shadow-none bg-white"
                                                style={{ fontSize: 14, height: 36 }}
                                                value={newRef.type}
                                                onChange={e => setNewRef({ ...newRef, type: e.target.value })}
                                            >
                                                <option>Reference</option>
                                            </select>
                                        </div>
                                        <div className="col-12 d-flex justify-content-end gap-2">
                                            <button type="button" className="btn btn-danger px-4 fw-bold" style={{ fontSize: 14, height: 36 }} onClick={handleSaveReferral}>Save</button>
                                            <button type="button" className="btn btn-light border px-3 text-muted" style={{ fontSize: 14, height: 36 }} onClick={() => setShowAddReferralForm(false)}>Cancel</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="border rounded" style={{ overflowX: "auto", overflowY: "auto", maxHeight: 320 }}>
                                <table className="table table-hover align-middle mb-0" style={{ fontSize: 14, minWidth: 600 }}>
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
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 820 }}>
                        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12, overflow: "hidden" }}>
                            {/* Header */}
                            <div className="modal-header border-0 px-3 pt-3 pb-0 d-flex align-items-center justify-content-between">
                                <h5 className="modal-title fw-bold fs-16 text-dark">{isScannerMode ? "Scan Items" : "Add Items in Bulk"}</h5>
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
                            <div className="modal-body px-0 pt-2 pb-0">
                                {/* Search Bar Area */}
                                <div className="px-3 pb-2">
                                    <div className="d-flex align-items-center justify-content-between gap-2">
                                        <div className="position-relative" style={{ width: 260 }}>
                                            <i className="ti ti-search position-absolute text-muted" style={{ left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 12 }} />
                                            <input
                                                ref={bulkSearchRef}
                                                type="text"
                                                className="form-control ps-4 fs-13 border shadow-none"
                                                style={{ borderRadius: 6, borderColor: "#e5e7eb", background: "#fff", height: 32 }}
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
                                <div className="px-3">
                                    <div>
                                        <table className="table mb-0 fs-14 align-middle" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                                            <thead className="sticky-top" style={{ top: 0, zIndex: 10, backgroundColor: "#f3f4f6" }}>
                                                <tr>
                                                    <th className="py-2 border-bottom-0 text-center" style={{ width: 48, backgroundColor: "#f3f4f6" }}>
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
                                                    <th className="py-2 border-bottom-0 fw-bold text-dark" style={{ backgroundColor: "#f3f4f6", fontSize: 13 }}>Item Name</th>
                                                    <th className="py-2 border-bottom-0 fw-bold text-dark" style={{ backgroundColor: "#f3f4f6", fontSize: 13 }}>SKU</th>
                                                    <th className="py-2 border-bottom-0 fw-bold text-dark" style={{ backgroundColor: "#f3f4f6", fontSize: 13 }}>Rate</th>
                                                    <th className="py-2 border-bottom-0 fw-bold text-dark text-center" style={{ backgroundColor: "#f3f4f6", width: 90, fontSize: 13 }}>Quantity</th>
                                                    <th className="py-2 border-bottom-0 fw-bold text-dark text-end pe-3" style={{ backgroundColor: "#f3f4f6", fontSize: 13 }}>Stock</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {INVENTORY_ITEMS.filter(item =>
                                                    item.name.toLowerCase().includes(bulkSearch.toLowerCase()) ||
                                                    item.sku.toLowerCase().includes(bulkSearch.toLowerCase())
                                                ).map(item => {
                                                    const isSelected = selectedBulkItems.includes(item.id);
                                                    return (
                                                        <tr key={item.id}
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setSelectedBulkItems(prev => prev.filter(id => id !== item.id));
                                                                    setBulkQuantities(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                                                                } else {
                                                                    setSelectedBulkItems(prev => [...prev, item.id]);
                                                                    setBulkQuantities(prev => ({ ...prev, [item.id]: prev[item.id] ?? "1" }));
                                                                    setTimeout(() => bulkQtyRefs.current[item.id]?.focus(), 0);
                                                                }
                                                            }}
                                                            style={{ cursor: "pointer", borderTop: "1px solid #f3f4f6" }}
                                                        >
                                                            <td className="py-3 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    className="form-check-input shadow-none m-0"
                                                                    style={{ width: 18, height: 18, borderRadius: 4, cursor: "pointer", verticalAlign: "middle" }}
                                                                    checked={isSelected}
                                                                    readOnly
                                                                />
                                                            </td>
                                                            <td className="py-3 fw-medium" style={{ color: "#111827" }}>{item.name}</td>
                                                            <td className="py-3 text-muted" style={{ fontSize: 14 }}>{item.sku}</td>
                                                            <td className="py-3 fw-bold" style={{ color: "#111827" }}>₹{fmt2(item.rate)}</td>
                                                            <td className="py-3 text-center" onClick={e => e.stopPropagation()}>
                                                                <input
                                                                    ref={el => bulkQtyRefs.current[item.id] = el}
                                                                    type="number"
                                                                    min={1}
                                                                    value={bulkQuantities[item.id] ?? "1"}
                                                                    disabled={!isSelected}
                                                                    onChange={e => setBulkQuantities(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                                    onBlur={e => {
                                                                        const v = parseInt(e.target.value);
                                                                        setBulkQuantities(prev => ({ ...prev, [item.id]: String(isNaN(v) || v < 1 ? 1 : v) }));
                                                                        e.target.style.borderColor = "#d1d5db";
                                                                    }}
                                                                    style={{ width: 72, border: "1px solid #d1d5db", borderRadius: 6, padding: "5px 8px", fontSize: 13, textAlign: "center", outline: "none", background: isSelected ? "#fff" : "#f9fafb", color: isSelected ? "#111827" : "#9ca3af" }}
                                                                    onFocus={e => e.target.style.borderColor = "#e41f07"}
                                                                />
                                                            </td>
                                                            <td className="py-3 text-end pe-4 text-muted" style={{ fontSize: 14 }}>{item.stock}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="modal-footer border-0 px-3 py-3 d-flex align-items-center justify-content-between bg-white">
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
                                            const newItems = selected.map(s => {
                                                const qty = Math.max(1, parseInt(bulkQuantities[s.id] ?? "1") || 1);
                                                return {
                                                    id: Date.now() + Math.random(),
                                                    description: s.name,
                                                    qty,
                                                    rate: s.rate,
                                                    discount: 0,
                                                    discountType: "%",
                                                    amount: s.rate * qty
                                                };
                                            });
                                            const baseItems = items.filter(i => i.description.trim() !== "" || i.rate !== 0);
                                            setItems([...baseItems, ...newItems]);
                                            setShowBulkModal(false);
                                            setSelectedBulkItems([]);
                                            setBulkQuantities({});
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
            {/* Add New Customer Modal */}
            {showAddCustomerModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div className="bg-white shadow-lg" style={{ width: "100%", maxWidth: 640, borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "95vh" }}>

                        {/* Header */}
                        <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ borderBottom: "1px solid #e5e7eb" }}>
                            <span className="fw-bold" style={{ fontSize: 16, color: "#111827" }}>New Customer</span>
                            <button type="button" className="btn p-0 shadow-none border-0" onClick={() => setShowAddCustomerModal(false)}>
                                <i className="ti ti-x" style={{ fontSize: 18, color: "#9ca3af" }} />
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div style={{ overflowY: "auto", flex: 1, padding: "20px 28px" }}>

                            {/* Customer Type */}
                            <div className="d-flex align-items-center mb-3" style={{ gap: 32 }}>
                                <label style={{ fontSize: 13, color: "#374151", minWidth: 140 }}>Customer Type</label>
                                <div className="d-flex gap-4">
                                    {["Business", "Individual"].map(t => (
                                        <label key={t} className="d-flex align-items-center gap-2" style={{ fontSize: 14, cursor: "pointer", fontWeight: newCustForm.customerType === t ? 600 : 400 }}>
                                            <input type="radio" name="custType" value={t} checked={newCustForm.customerType === t}
                                                onChange={() => setNewCustForm(p => ({ ...p, customerType: t }))}
                                                style={{ accentColor: "#e41f07", width: 15, height: 15 }} />
                                            {t}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Primary Contact */}
                            <div className="d-flex align-items-center mb-3">
                                <label style={{ fontSize: 13, color: "#374151", minWidth: 140, flexShrink: 0 }}>Primary Contact</label>
                                <div className="d-flex gap-2 flex-grow-1">
                                    <select className="form-select shadow-none" style={{ width: 110, height: 36, fontSize: 13, borderRadius: 4, flexShrink: 0 }}
                                        value={newCustForm.salutation}
                                        onChange={e => setNewCustForm(p => ({ ...p, salutation: e.target.value }))}>
                                        {["Salutation", "Mr.", "Mrs.", "Ms.", "Dr.", "Prof."].map(s => <option key={s} value={s === "Salutation" ? "" : s}>{s}</option>)}
                                    </select>
                                    <input type="text" className="form-control shadow-none" placeholder="First Name" style={{ height: 36, fontSize: 13, borderRadius: 4 }}
                                        value={newCustForm.firstName}
                                        onChange={e => {
                                            const v = e.target.value;
                                            setNewCustForm(p => {
                                                const auto = [v, p.lastName].filter(Boolean).join(" ") || p.companyName;
                                                return { ...p, firstName: v, displayName: p.displayName || auto };
                                            });
                                        }} />
                                    <input type="text" className="form-control shadow-none" placeholder="Last Name" style={{ height: 36, fontSize: 13, borderRadius: 4 }}
                                        value={newCustForm.lastName}
                                        onChange={e => {
                                            const v = e.target.value;
                                            setNewCustForm(p => {
                                                const auto = [p.firstName, v].filter(Boolean).join(" ") || p.companyName;
                                                return { ...p, lastName: v, displayName: p.displayName || auto };
                                            });
                                        }} />
                                </div>
                            </div>

                            {/* Company Name */}
                            <div className="d-flex align-items-center mb-3">
                                <label style={{ fontSize: 13, color: "#374151", minWidth: 140, flexShrink: 0 }}>Company Name</label>
                                <input type="text" className="form-control shadow-none" placeholder="" style={{ height: 36, fontSize: 13, borderRadius: 4 }}
                                    value={newCustForm.companyName}
                                    onChange={e => setNewCustForm(p => ({ ...p, companyName: e.target.value }))} />
                            </div>

                            {/* Customer Category */}
                            <div className="d-flex align-items-center mb-3">
                                <label style={{ fontSize: 13, color: "#374151", minWidth: 140, flexShrink: 0 }}>Customer Category</label>
                                <select className="form-select shadow-none" style={{ height: 36, fontSize: 13, borderRadius: 4 }}
                                    value={newCustForm.companyCategory}
                                    onChange={e => setNewCustForm(p => ({ ...p, companyCategory: e.target.value }))}>
                                    <option value="">Select Category</option>
                                    {custCategories.length > 0
                                        ? custCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                                        : ["Technology","Manufacturing","Retail","Healthcare","Finance & Banking","Education","Real Estate","Logistics & Transport","Food & Beverage","Hospitality & Tourism","Construction","Agriculture","Consulting","E-Commerce","Pharmaceutical","Automotive","Textile & Apparel","Legal Services","Others"].map(n => <option key={n} value={n}>{n}</option>)
                                    }
                                </select>
                            </div>

                            {/* Display Name */}
                            <div className="d-flex align-items-center mb-3">
                                <label style={{ fontSize: 13, minWidth: 140, flexShrink: 0 }}>
                                    <span style={{ color: "#e41f07", fontWeight: 600 }}>Display Name*</span>
                                </label>
                                <input type="text" className="form-control shadow-none" placeholder="Select or type to add"
                                    style={{ height: 36, fontSize: 13, borderRadius: 4 }}
                                    value={newCustForm.displayName}
                                    onChange={e => setNewCustForm(p => ({ ...p, displayName: e.target.value }))} />
                            </div>

                            {/* Email Address */}
                            <div className="d-flex align-items-center mb-3">
                                <label style={{ fontSize: 13, color: "#374151", minWidth: 140, flexShrink: 0 }}>Email Address</label>
                                <input type="email" className="form-control shadow-none" placeholder=""
                                    style={{ height: 36, fontSize: 13, borderRadius: 4 }}
                                    value={newCustForm.email}
                                    onChange={e => setNewCustForm(p => ({ ...p, email: e.target.value }))} />
                            </div>

                            {/* Phone */}
                            <div className="d-flex align-items-center mb-3">
                                <label style={{ fontSize: 13, color: "#374151", minWidth: 140, flexShrink: 0 }}>Phone</label>
                                <div className="d-flex gap-2 flex-grow-1">
                                    <div className="d-flex" style={{ flex: 1 }}>
                                        <select className="form-select shadow-none" style={{ width: 72, height: 36, fontSize: 13, borderRadius: "4px 0 0 4px", flexShrink: 0 }}
                                            value={newCustForm.workPhonePrefix}
                                            onChange={e => setNewCustForm(p => ({ ...p, workPhonePrefix: e.target.value }))}>
                                            {["+91", "+1", "+44", "+61"].map(c => <option key={c}>{c}</option>)}
                                        </select>
                                        <input type="text" className="form-control shadow-none" placeholder="Work Phone"
                                            style={{ height: 36, fontSize: 13, borderRadius: "0 4px 4px 0", borderLeft: "none" }}
                                            value={newCustForm.workPhone}
                                            onChange={e => setNewCustForm(p => ({ ...p, workPhone: e.target.value }))} />
                                    </div>
                                    <div className="d-flex" style={{ flex: 1 }}>
                                        <select className="form-select shadow-none" style={{ width: 72, height: 36, fontSize: 13, borderRadius: "4px 0 0 4px", flexShrink: 0 }}
                                            value={newCustForm.mobilePrefix}
                                            onChange={e => setNewCustForm(p => ({ ...p, mobilePrefix: e.target.value }))}>
                                            {["+91", "+1", "+44", "+61"].map(c => <option key={c}>{c}</option>)}
                                        </select>
                                        <input type="text" className="form-control shadow-none" placeholder="Mobile"
                                            style={{ height: 36, fontSize: 13, borderRadius: "0 4px 4px 0", borderLeft: "none" }}
                                            value={newCustForm.mobile}
                                            onChange={e => setNewCustForm(p => ({ ...p, mobile: e.target.value }))} />
                                    </div>
                                </div>
                            </div>

                            {/* Customer Language */}
                            <div className="d-flex align-items-center mb-4">
                                <label style={{ fontSize: 13, color: "#374151", minWidth: 140, flexShrink: 0 }}>Customer Language</label>
                                <select className="form-select shadow-none" style={{ height: 36, fontSize: 13, borderRadius: 4, maxWidth: 220 }}
                                    value={newCustForm.language}
                                    onChange={e => setNewCustForm(p => ({ ...p, language: e.target.value }))}>
                                    {["English", "Tamil", "Hindi", "Telugu", "Kannada", "Malayalam"].map(l => <option key={l}>{l}</option>)}
                                </select>
                            </div>

                            {/* Tabs */}
                            <div style={{ borderBottom: "1px solid #e5e7eb", marginBottom: 16 }}>
                                <div className="d-flex gap-0">
                                    {["Other Details", "Address", "Custom Fields", "Reporting Tags", "Remarks"].map(tab => (
                                        <button key={tab} type="button" onClick={() => setNewCustTab(tab)}
                                            className="btn btn-link shadow-none p-0 me-4 pb-2"
                                            style={{ fontSize: 13, textDecoration: "none", color: newCustTab === tab ? "#e41f07" : "#6b7280", fontWeight: newCustTab === tab ? 600 : 400, borderBottom: newCustTab === tab ? "2px solid #e41f07" : "2px solid transparent", borderRadius: 0 }}>
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tab Content */}
                            {newCustTab === "Other Details" && (
                                <div>
                                    <div className="d-flex align-items-center mb-3">
                                        <label style={{ fontSize: 13, color: "#374151", minWidth: 140, flexShrink: 0 }}>PAN</label>
                                        <input type="text" className="form-control shadow-none" style={{ height: 36, fontSize: 13, borderRadius: 4 }}
                                            value={newCustForm.pan} onChange={e => setNewCustForm(p => ({ ...p, pan: e.target.value }))} />
                                    </div>
                                    <div className="d-flex align-items-center mb-3">
                                        <label style={{ fontSize: 13, color: "#374151", minWidth: 140, flexShrink: 0 }}>Currency</label>
                                        <select className="form-select shadow-none" style={{ height: 36, fontSize: 13, borderRadius: 4 }}
                                            value={newCustForm.currency} onChange={e => setNewCustForm(p => ({ ...p, currency: e.target.value }))}>
                                            <option>INR- Indian Rupee</option><option>USD- US Dollar</option><option>EUR- Euro</option><option>GBP- British Pound</option>
                                        </select>
                                    </div>
                                    <div className="d-flex align-items-center mb-3">
                                        <label style={{ fontSize: 13, color: "#374151", minWidth: 140, flexShrink: 0 }}>Payment Terms</label>
                                        <select className="form-select shadow-none" style={{ height: 36, fontSize: 13, borderRadius: 4 }}
                                            value={newCustForm.paymentTerms} onChange={e => setNewCustForm(p => ({ ...p, paymentTerms: e.target.value }))}>
                                            <option>Due on Receipt</option><option>Net 15</option><option>Net 30</option><option>Net 45</option><option>Net 60</option>
                                        </select>
                                    </div>
                                    <div className="d-flex align-items-center mb-3">
                                        <label style={{ fontSize: 13, color: "#374151", minWidth: 140, flexShrink: 0 }}>Salesperson</label>
                                        <select className="form-select shadow-none" style={{ height: 36, fontSize: 13, borderRadius: 4 }}
                                            value={newCustForm.salesperson} onChange={e => setNewCustForm(p => ({ ...p, salesperson: e.target.value }))}>
                                            <option value="">Select Salesperson</option>
                                            {custSalespersons.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div className="d-flex align-items-center mb-3">
                                        <label style={{ fontSize: 13, color: "#374151", minWidth: 140, flexShrink: 0 }}>Price List</label>
                                        <select className="form-select shadow-none" style={{ height: 36, fontSize: 13, borderRadius: 4 }}
                                            value={newCustForm.priceList} onChange={e => setNewCustForm(p => ({ ...p, priceList: e.target.value }))}>
                                            <option value="">Select Price List</option>
                                            {custPriceLists.map(pl => <option key={pl.id} value={pl.name}>{pl.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="d-flex align-items-center mb-3">
                                        <label style={{ fontSize: 13, color: "#374151", minWidth: 140, flexShrink: 0 }}>Enable Portal?</label>
                                        <label className="d-flex align-items-center gap-2" style={{ fontSize: 13, cursor: "pointer", color: "#374151" }}>
                                            <input type="checkbox" checked={newCustForm.enablePortal}
                                                onChange={e => setNewCustForm(p => ({ ...p, enablePortal: e.target.checked }))}
                                                style={{ width: 15, height: 15, accentColor: "#e41f07" }} />
                                            Allow portal access for this customer
                                        </label>
                                    </div>
                                    <div className="d-flex align-items-center mb-1">
                                        <label style={{ fontSize: 13, color: "#374151", minWidth: 140, flexShrink: 0 }}>Documents</label>
                                        <button type="button" className="btn border shadow-none d-flex align-items-center gap-2"
                                            style={{ height: 34, fontSize: 13, borderRadius: 4, color: "#374151" }}>
                                            <i className="ti ti-upload" style={{ fontSize: 14 }} /> Upload File
                                        </button>
                                    </div>
                                    <div style={{ marginLeft: 140, fontSize: 12, color: "#9ca3af", paddingLeft: 4, marginBottom: 12 }}>
                                        You can upload a maximum of 10 files, 10MB each
                                    </div>

                                    {/* Add more details toggle */}
                                    <button type="button" className="btn btn-link shadow-none p-0 mb-2"
                                        style={{ fontSize: 13, color: "#e41f07", textDecoration: "none", fontWeight: 500 }}
                                        onClick={() => setNewCustShowMore(p => !p)}>
                                        <i className={`ti ti-chevron-${newCustShowMore ? "up" : "down"} me-1`} />
                                        {newCustShowMore ? "Hide details" : "Add more details"}
                                    </button>

                                    {newCustShowMore && (
                                        <div>
                                            <div className="d-flex align-items-center mb-3">
                                                <label style={{ fontSize: 13, color: "#374151", minWidth: 140, flexShrink: 0 }}>GSTIN</label>
                                                <input type="text" className="form-control shadow-none" placeholder="GST Identification Number"
                                                    style={{ height: 36, fontSize: 13, borderRadius: 4 }}
                                                    value={newCustForm.gstin} onChange={e => setNewCustForm(p => ({ ...p, gstin: e.target.value }))} />
                                            </div>
                                            <div className="d-flex align-items-center mb-3">
                                                <label style={{ fontSize: 13, color: "#374151", minWidth: 140, flexShrink: 0 }}>TDS</label>
                                                <input type="text" className="form-control shadow-none" placeholder="TDS %"
                                                    style={{ height: 36, fontSize: 13, borderRadius: 4 }}
                                                    value={newCustForm.tds} onChange={e => setNewCustForm(p => ({ ...p, tds: e.target.value }))} />
                                            </div>
                                            <div className="d-flex align-items-center mb-3">
                                                <label style={{ fontSize: 13, color: "#374151", minWidth: 140, flexShrink: 0 }}>Website</label>
                                                <input type="text" className="form-control shadow-none" placeholder="https://"
                                                    style={{ height: 36, fontSize: 13, borderRadius: 4 }}
                                                    value={newCustForm.website} onChange={e => setNewCustForm(p => ({ ...p, website: e.target.value }))} />
                                            </div>
                                            <div className="d-flex align-items-center mb-3">
                                                <label style={{ fontSize: 13, color: "#374151", minWidth: 140, flexShrink: 0 }}>Opening Balance</label>
                                                <input type="number" className="form-control shadow-none" placeholder="0.00"
                                                    style={{ height: 36, fontSize: 13, borderRadius: 4 }}
                                                    value={newCustForm.openingBalance} onChange={e => setNewCustForm(p => ({ ...p, openingBalance: e.target.value }))} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {newCustTab === "Address" && (() => {
                                const addrField = (label: string, fKey: string, placeholder = "") => (
                                    <div className="d-flex align-items-center mb-2" key={fKey}>
                                        <label style={{ fontSize: 12, color: "#6b7280", minWidth: 110, flexShrink: 0 }}>{label}</label>
                                        <input type="text" className="form-control shadow-none" placeholder={placeholder}
                                            style={{ height: 32, fontSize: 13, borderRadius: 4 }}
                                            value={(newCustForm as any)[fKey]}
                                            onChange={e => setNewCustForm(p => ({ ...p, [fKey]: e.target.value }))} />
                                    </div>
                                );
                                return (
                                    <div className="row g-3">
                                        <div className="col-12 col-md-6">
                                            <p className="fw-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Billing Address</p>
                                            {addrField("Attention", "billingAttention")}
                                            {addrField("Country", "billingCountry", "India")}
                                            {addrField("Street 1", "billingStreet1")}
                                            {addrField("Street 2", "billingStreet2")}
                                            {addrField("City", "billingCity")}
                                            {addrField("State", "billingState")}
                                            {addrField("ZIP Code", "billingZip")}
                                            {addrField("Phone", "billingPhone")}
                                            {addrField("Fax", "billingFax")}
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                <p className="fw-semibold mb-0" style={{ fontSize: 13, color: "#374151" }}>Shipping Address</p>
                                                <button type="button" className="btn btn-link p-0 shadow-none"
                                                    style={{ fontSize: 12, color: "#e41f07", textDecoration: "none" }}
                                                    onClick={() => setNewCustForm(p => ({ ...p, shippingAttention: p.billingAttention, shippingCountry: p.billingCountry, shippingStreet1: p.billingStreet1, shippingStreet2: p.billingStreet2, shippingCity: p.billingCity, shippingState: p.billingState, shippingZip: p.billingZip, shippingPhone: p.billingPhone, shippingFax: p.billingFax }))}>
                                                    Copy Billing Address
                                                </button>
                                            </div>
                                            {addrField("Attention", "shippingAttention")}
                                            {addrField("Country", "shippingCountry", "India")}
                                            {addrField("Street 1", "shippingStreet1")}
                                            {addrField("Street 2", "shippingStreet2")}
                                            {addrField("City", "shippingCity")}
                                            {addrField("State", "shippingState")}
                                            {addrField("ZIP Code", "shippingZip")}
                                            {addrField("Phone", "shippingPhone")}
                                            {addrField("Fax", "shippingFax")}
                                        </div>
                                    </div>
                                );
                            })()}

                            {newCustTab === "Custom Fields" && (
                                <div>
                                    {newCustCustomFields.map((cf, i) => (
                                        <div key={i} className="d-flex align-items-center gap-2 mb-2">
                                            <input type="text" className="form-control shadow-none" placeholder="Field Name"
                                                style={{ height: 34, fontSize: 13, borderRadius: 4 }}
                                                value={cf.name}
                                                onChange={e => setNewCustCustomFields(prev => prev.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} />
                                            <input type="text" className="form-control shadow-none" placeholder="Value"
                                                style={{ height: 34, fontSize: 13, borderRadius: 4 }}
                                                value={cf.value}
                                                onChange={e => setNewCustCustomFields(prev => prev.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))} />
                                            <button type="button" className="btn p-0 shadow-none border-0"
                                                onClick={() => setNewCustCustomFields(prev => prev.filter((_, idx) => idx !== i))}>
                                                <i className="ti ti-trash text-danger" style={{ fontSize: 16 }} />
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" className="btn btn-link shadow-none p-0 mt-1"
                                        style={{ fontSize: 13, color: "#e41f07", textDecoration: "none", fontWeight: 500 }}
                                        onClick={() => setNewCustCustomFields(prev => [...prev, { name: "", value: "" }])}>
                                        <i className="ti ti-circle-plus me-1" />Add Custom Field
                                    </button>
                                </div>
                            )}

                            {newCustTab === "Reporting Tags" && (
                                <div>
                                    <div className="d-flex gap-2 mb-3">
                                        <input type="text" className="form-control shadow-none" placeholder="Type a tag and press Enter"
                                            style={{ height: 36, fontSize: 13, borderRadius: 4 }}
                                            value={newCustTagInput}
                                            onChange={e => setNewCustTagInput(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === "Enter" && newCustTagInput.trim()) {
                                                    e.preventDefault();
                                                    setNewCustTags(p => [...p, newCustTagInput.trim()]);
                                                    setNewCustTagInput("");
                                                }
                                            }} />
                                        <button type="button" className="btn fw-semibold shadow-none"
                                            style={{ background: "#e41f07", color: "#fff", borderRadius: 4, fontSize: 13, height: 36, padding: "0 16px", flexShrink: 0 }}
                                            onClick={() => { if (newCustTagInput.trim()) { setNewCustTags(p => [...p, newCustTagInput.trim()]); setNewCustTagInput(""); } }}>
                                            Add
                                        </button>
                                    </div>
                                    <div className="d-flex flex-wrap gap-2">
                                        {newCustTags.length === 0 && <span className="text-muted" style={{ fontSize: 13 }}>No tags added yet.</span>}
                                        {newCustTags.map((tag, i) => (
                                            <span key={i} className="d-flex align-items-center gap-1 px-3 py-1 rounded-pill"
                                                style={{ background: "#fef2f2", border: "1px solid #fecaca", fontSize: 13, color: "#374151" }}>
                                                {tag}
                                                <button type="button" className="btn p-0 shadow-none border-0 ms-1"
                                                    onClick={() => setNewCustTags(p => p.filter((_, idx) => idx !== i))}>
                                                    <i className="ti ti-x" style={{ fontSize: 12, color: "#e41f07" }} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {newCustTab === "Remarks" && (
                                <div>
                                    <textarea className="form-control shadow-none" rows={5} placeholder="Add remarks or notes about this customer..."
                                        style={{ fontSize: 13, borderRadius: 4, resize: "vertical", width: "100%" }}
                                        value={newCustForm.remarks}
                                        onChange={e => setNewCustForm(p => ({ ...p, remarks: e.target.value }))} />
                                    <p className="text-muted mt-1 mb-0" style={{ fontSize: 12 }}>These remarks are for internal use only.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="d-flex justify-content-end gap-2 px-4 py-3" style={{ borderTop: "1px solid #e5e7eb" }}>
                            <button type="button" className="btn border fw-semibold shadow-none" style={{ fontSize: 13, borderRadius: 6, color: "#4b5563", height: 36, padding: "0 20px" }}
                                onClick={() => setShowAddCustomerModal(false)}>
                                Cancel
                            </button>
                            <button type="button" className="btn fw-bold text-white shadow-none" style={{ background: "#e41f07", border: "1px solid #e41f07", fontSize: 13, borderRadius: 6, height: 36, padding: "0 20px" }}
                                onClick={handleSaveNewCustomer}>
                                Save Customer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddInvoice;
