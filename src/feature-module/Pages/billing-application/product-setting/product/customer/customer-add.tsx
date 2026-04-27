import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "./customer.scss";
import PageHeader from "../../../../../../components/page-header/pageHeader";
import Footer from "../../../../../../components/footer/footer";
import { all_routes } from "../../../../../../routes/all_routes";
import { OverlayTrigger, Tooltip } from "react-bootstrap";

const HelpIcon = ({ text, id }: { text: string; id: string }) => (
    <OverlayTrigger placement="top" overlay={<Tooltip id={id}>{text}</Tooltip>}>
        <span className="ms-1 d-inline-flex align-items-center" style={{ cursor: 'help' }}>
            <i className="ti ti-info-circle text-muted" style={{ fontSize: '13px' }} />
        </span>
    </OverlayTrigger>
);

interface CustomerAddProps {
    onClose?: () => void;
}

const SK = "billing_customers";

const CustomerAdd: React.FC<CustomerAddProps> = ({ onClose }) => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEdit = !!id;
    const route = all_routes;
    const [activeTab, setActiveTab] = useState("Other Details");

    const [showGstModal, setShowGstModal] = useState(false);
    const [gstin, setGstin] = useState("");
    const [isFetching, setIsFetching] = useState(false);
    const [showMoreDetails, setShowMoreDetails] = useState(false);
    const [showExtraCols, setShowExtraCols] = useState(false);

    // Comprehensive State (Restoring all user fields)
    const [formData, setFormData] = useState({
        type: "Business",
        salutation: "Mr.",
        firstName: "",
        lastName: "",
        companyName: "",
        companyCategory: "",
        displayName: "",
        email: "",
        workPhonePrefix: "+91",
        workPhone: "",
        mobilePrefix: "+91",
        mobile: "",
        language: "English",
        // Other Details
        pan: "",
        currency: "INR- Indian Rupee",
        paymentTerms: "Due on Receipt",
        priceList: "",
        portalAccess: false,
        website: "",
        department: "",
        designation: "",
        twitter: "",
        skype: "",
        facebook: "",
        // Addresses
        billingAddress: {
            attention: "",
            country: "India",
            street1: "",
            street2: "",
            city: "",
            state: "Tamil Nadu",
            zipCode: "",
            phone: "",
            fax: ""
        },
        shippingAddress: {
            attention: "",
            country: "India",
            street1: "",
            street2: "",
            city: "",
            state: "Tamil Nadu",
            zipCode: "",
            phone: "",
            fax: ""
        },
        // Contact Persons
        contactPersons: [
            { salutation: "Mr.", firstName: "", lastName: "", email: "", workPhonePrefix: "+91", workPhoneLine: "", mobilePrefix: "+91", mobileLine: "", skype: "", designation: "", department: "", isExpanded: false }
        ],
        remarks: ""
    });

    const tabs = [
        "Other Details", "Address", "Contact Persons", "Custom Fields", "Reporting Tags", "Remarks"
    ];

    // Handlers
    const handleBaseChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddressChange = (type: 'billing' | 'shipping', field: string, value: string) => {
        const addressKey = type === 'billing' ? 'billingAddress' : 'shippingAddress';
        setFormData(prev => ({
            ...prev,
            [addressKey]: { ...prev[addressKey], [field]: value }
        }));
    };

    const copyBillingAddress = (e: React.MouseEvent) => {
        e.preventDefault();
        setFormData(prev => ({
            ...prev,
            shippingAddress: { ...prev.billingAddress }
        }));
    };

    const handleContactChange = (index: number, field: string, value: string) => {
        const updatedContacts = [...formData.contactPersons];
        updatedContacts[index] = { ...updatedContacts[index], [field]: value };
        setFormData(prev => ({ ...prev, contactPersons: updatedContacts }));
    };

    const addContactRow = () => {
        setFormData(prev => ({
            ...prev,
            contactPersons: [...prev.contactPersons, { salutation: "Mr.", firstName: "", lastName: "", email: "", workPhonePrefix: "+91", workPhoneLine: "", mobilePrefix: "+91", mobileLine: "", skype: "", designation: "", department: "", isExpanded: false }]
        }));
    };

    const removeContactRow = (index: number) => {
        if (formData.contactPersons.length > 1) {
            const updatedContacts = formData.contactPersons.filter((_, i) => i !== index);
            setFormData(prev => ({ ...prev, contactPersons: updatedContacts }));
        }
    };

    const handleBack = () => {
        if (onClose) onClose(); else navigate(-1);
    };

    const handleSave = () => {
        // 1. Validation
        if (!formData.displayName) {
            alert("Customer Display Name is required.");
            return;
        }

        // 2. Load existing
        let current: any[] = [];
        try {
            const s = localStorage.getItem(SK);
            if (s) current = JSON.parse(s);
        } catch (e) { console.error("Failed to load customers", e); }

        // 3. Prepare entry
        const customerData = {
            ...formData,
            name: formData.displayName,
            workPhone: `${formData.workPhonePrefix}-${formData.workPhone}`.replace(/-+$/, ""),
            mobile: `${formData.mobilePrefix}-${formData.mobile}`.replace(/-+$/, ""),
            status: "Active"
        };

        // 4. Save (update or insert)
        try {
            if (isEdit && id) {
                const updated = current.map((c: any) =>
                    String(c.id) === String(id) ? { ...c, ...customerData, id: c.id, receivables: c.receivables, unusedCredits: c.unusedCredits } : c
                );
                localStorage.setItem(SK, JSON.stringify(updated));
            } else {
                const ids = current.map((c: any) => Number(c.id) || 0);
                const nextId = ids.length > 0 ? Math.max(...ids) + 1 : 1;
                localStorage.setItem(SK, JSON.stringify([...current, { ...customerData, id: nextId, receivables: 0, unusedCredits: 0 }]));
            }
            handleBack();
        } catch (e) {
            alert("Failed to save customer. Storage might be full.");
        }
    };


    // Dynamic Display Name Options
    const getDisplayNameOptions = () => {
        const options: string[] = [];
        const { salutation, firstName, companyName } = formData;

        const name = firstName || "";
        const full = `${salutation} ${name}`.trim();
        const short = name.trim();

        if (full) options.push(full);
        if (short && short !== full) options.push(short);
        if (companyName) options.push(companyName);

        return Array.from(new Set(options)).filter(Boolean);
    };

    const displayNameOptions = getDisplayNameOptions();

    // Load existing customer data when editing
    useEffect(() => {
        if (!isEdit || !id) {
            console.log("CustomerAdd: Not in edit mode or no ID", { isEdit, id });
            return;
        }

        try {
            const raw = localStorage.getItem(SK);
            if (!raw) return;

            const all = JSON.parse(raw);
            const existing = all.find((c: any) => String(c.id) === String(id));

            console.log("CustomerAdd: Found existing customer", existing);

            if (existing) {
                // Explicitly map fields to ensure they are picked up by the form state
                setFormData(prev => ({
                    ...prev,
                    ...existing,
                    // Ensure these are explicitly set if they exist in the raw data
                    firstName: existing.firstName || existing.name || "",
                    displayName: existing.displayName || existing.name || "",
                    billingAddress: existing.billingAddress || prev.billingAddress,
                    shippingAddress: existing.shippingAddress || prev.shippingAddress,
                    contactPersons: existing.contactPersons || prev.contactPersons,
                    workPhone: (existing.workPhone || "").replace(/^\+91[-\s]?/, "").trim(),
                    mobile: (existing.mobile || "").replace(/^\+91[-\s]?/, "").trim(),
                }));
            } else {
                console.warn("CustomerAdd: Could not find customer with ID", id);
            }
        } catch (err) {
            console.error("CustomerAdd: Error loading existing data", err);
        }
    }, [id, isEdit]);

    useEffect(() => {
        if (!formData.displayName && displayNameOptions.length > 0) {
            handleBaseChange("displayName", displayNameOptions[0]);
        }
    }, [formData.firstName, formData.companyName]);

    const handleFetchGst = () => {
        if (!gstin) return;
        setIsFetching(true);

        // Simulating GST Portal API Request
        setTimeout(() => {
            const panPart = gstin.length >= 12 ? gstin.substring(2, 12).toUpperCase() : "";

            setFormData(prev => ({
                ...prev,
                type: "Business",
                companyName: "Zylker Systems Pvt Ltd",
                pan: panPart || prev.pan,
                displayName: "Zylker Systems Pvt Ltd",
                billingAddress: {
                    ...prev.billingAddress,
                    attention: "Accounts Department",
                    country: "India",
                    street1: "123, Anna Salai",
                    street2: "Teynampet",
                    city: "Chennai",
                    state: "Tamil Nadu",
                    zipCode: "600018"
                }
            }));

            setIsFetching(false);
            setShowGstModal(false);
        }, 1200);
    };


    return (
        <div className="page-wrapper">
            <div className="content mb-4">
                <PageHeader
                    title={isEdit ? "Edit Customer" : "New Customer"}
                    badgeCount={false}
                    moduleTitle="Customers"
                    showModuleTile={true}
                    moduleLink={route.customerList || "/customer-list"}
                    showExport={false}
                    exportComponent={
                        <button
                            type="button"
                            className="btn btn-icon btn-outline-light shadow"
                            aria-label="Close"
                            title="Close"
                            onClick={handleBack}
                        >
                            <i className="ti ti-x" />
                        </button>
                    }
                />

                <div className="card" style={{ borderRadius: 0 }}>
                    <div className="card-body p-0">
                        <div className="zoho-form-wrapper border-0 shadow-none m-0 rounded-0 w-100">
                            <div className="form-header-title">{isEdit ? "Edit Customer" : "New Customer"}</div>

                            <div className="zoho-form-content">
                                {/* GST Prefill Banner */}
                                <div className="prefill-banner-custom">
                                    <i className="ti ti-download fs-16" />
                                    <span>Prefill customer details from the GST portal using the Customer's GSTIN.</span>
                                    <a href="#" style={{ color: "#e41f07" }} onClick={(e) => { e.preventDefault(); setShowGstModal(true); }}>Prefill &gt;</a>
                                </div>

                                {/* Customer Type Cards */}
                                <div className="form-row">
                                    <div className="form-label d-flex align-items-center">Customer Type <HelpIcon text="Choose whether the customer is a business or individual." id="tip-type" /></div>
                                    <div className="form-field-container d-flex align-items-center gap-4">
                                        <div className="form-check d-flex align-items-center mb-0 ps-0">
                                            <input className="form-check-input mt-0 me-2 ms-0" type="radio" name="customerType" id="typeBusiness" checked={formData.type === "Business"} onChange={() => handleBaseChange("type", "Business")} style={{ width: 16, height: 16, cursor: "pointer" }} />
                                            <label className="form-check-label text-dark fs-14" htmlFor="typeBusiness" style={{ cursor: "pointer" }}>Business</label>
                                        </div>
                                        <div className="form-check d-flex align-items-center mb-0 ps-0">
                                            <input className="form-check-input mt-0 me-2 ms-0" type="radio" name="customerType" id="typeIndividual" checked={formData.type === "Individual"} onChange={() => handleBaseChange("type", "Individual")} style={{ width: 16, height: 16, cursor: "pointer" }} />
                                            <label className="form-check-label text-dark fs-14" htmlFor="typeIndividual" style={{ cursor: "pointer" }}>Individual</label>
                                        </div>
                                    </div>
                                </div>

                                {/* Primary Contact Row */}
                                <div className="form-row">
                                    <div className="form-label d-flex align-items-center">Primary Contact <HelpIcon text="Main person representing this customer." id="tip-primary" /></div>
                                    <div className="form-field-container d-flex gap-2">
                                        <div style={{ width: 120 }}>
                                            <select className="form-control-custom text-muted" value={formData.salutation} onChange={(e) => handleBaseChange("salutation", e.target.value)}>
                                                <option>Salutation</option>
                                                <option value="Mr.">Mr.</option>
                                                <option value="Mrs.">Mrs.</option>
                                                <option value="Ms.">Ms.</option>
                                                <option value="Dr.">Dr.</option>
                                            </select>
                                        </div>
                                        <input type="text" className="form-control-custom flex-grow-1" placeholder="Name" value={formData.firstName} onChange={(e) => handleBaseChange("firstName", e.target.value)} />
                                    </div>
                                </div>

                                {formData.type !== "Individual" && (
                                    <div className="form-row">
                                        <div className="form-label">Company Name</div>
                                        <div className="form-field-container">
                                            <input type="text" className="form-control-custom" placeholder="Enter company name" value={formData.companyName} onChange={(e) => handleBaseChange("companyName", e.target.value)} />
                                        </div>
                                    </div>
                                )}

                                <div className="form-row">
                                    <div className="form-label">Customer Category</div>
                                    <div className="form-field-container">
                                        <input
                                            type="text"
                                            className="form-control-custom"
                                            placeholder="Select or type category"
                                            list="company-category-list"
                                            value={formData.companyCategory}
                                            onChange={(e) => handleBaseChange("companyCategory", e.target.value)}
                                        />
                                        <datalist id="company-category-list">
                                            <option value="Technology" />
                                            <option value="Manufacturing" />
                                            <option value="Retail" />
                                            <option value="Healthcare" />
                                            <option value="Finance & Banking" />
                                            <option value="Education" />
                                            <option value="Real Estate" />
                                            <option value="Logistics & Transport" />
                                            <option value="Food & Beverage" />
                                            <option value="Hospitality & Tourism" />
                                            <option value="Media & Entertainment" />
                                            <option value="Construction" />
                                            <option value="Agriculture" />
                                            <option value="Consulting" />
                                            <option value="E-Commerce" />
                                            <option value="Pharmaceutical" />
                                            <option value="Automotive" />
                                            <option value="Textile & Apparel" />
                                            <option value="Legal Services" />
                                            <option value="Others" />
                                        </datalist>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-label required d-flex align-items-center">Customer Display Name <HelpIcon text="Name displayed on invoices and quotes." id="tip-display" /></div>
                                    <div className="form-field-container d-flex align-items-center">
                                        <select className="form-control-custom" value={formData.displayName} onChange={(e) => handleBaseChange("displayName", e.target.value)}>
                                            {displayNameOptions.length === 0 ? (
                                                <option value="">Enter Name To See Options</option>
                                            ) : (
                                                displayNameOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)
                                            )}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-label d-flex align-items-center">Customer Email <HelpIcon text="Primary email address for communication." id="tip-email" /></div>
                                    <div className="form-field-container">
                                        <input type="email" className="form-control-custom" placeholder="Email Address" value={formData.email} onChange={(e) => handleBaseChange("email", e.target.value)} />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-label d-flex align-items-center">Customer Language <HelpIcon text="Language used to send documents and invoices." id="tip-lang" /></div>
                                    <div className="form-field-container">
                                        <select className="form-control-custom" style={{ maxWidth: 350 }} value={formData.language} onChange={(e) => handleBaseChange("language", e.target.value)}>
                                            <option>English</option>
                                            <option>Tamil</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Documents */}
                                <div className="form-row mt-4">
                                    <div className="form-label">Documents</div>
                                    <div className="form-field-container">
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="d-flex border rounded overflow-hidden" style={{ display: "inline-flex" }}>
                                                <label className="btn btn-light border-0 d-flex align-items-center gap-2 px-3 py-2 fs-14 mb-0" style={{ cursor: "pointer", borderRadius: 0 }}>
                                                    <i className="ti ti-upload fs-14" /> Upload File
                                                    <input type="file" multiple accept="*/*" style={{ display: "none" }} onChange={() => { }} />
                                                </label>
                                                <button type="button" className="btn btn-light border-0 border-start px-2 py-2" style={{ borderRadius: 0 }}>
                                                    <i className="ti ti-chevron-down fs-13" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="fs-13 text-muted mt-1">You can upload a maximum of 10 files, 10MB each</div>
                                    </div>
                                </div>

                                {/* Tabs Selection Bar */}
                                <div className="tab-bar-custom">
                                    {tabs.map(t => (
                                        <div key={t} className={`tab-item-custom ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
                                            {t}
                                        </div>
                                    ))}
                                </div>

                                <div className="tab-body-pane">
                                    {activeTab === "Other Details" && (
                                        <div className="pane-content">
                                            <div className="form-row">
                                                <div className="form-label d-flex align-items-center">PAN <HelpIcon text="Permanent Account Number." id="tip-pan" /></div>
                                                <div className="form-field-container">
                                                    <input type="text" className="form-control-custom" style={{ maxWidth: 350 }} value={formData.pan} onChange={(e) => handleBaseChange("pan", e.target.value)} />
                                                </div>
                                            </div>
                                            <div className="form-row">
                                                <div className="form-label">Currency</div>
                                                <div className="form-field-container">
                                                    <select className="form-control-custom" style={{ maxWidth: 350 }} value={formData.currency} onChange={(e) => handleBaseChange("currency", e.target.value)}>
                                                        <option>INR- Indian Rupee</option>
                                                        <option>USD- US Dollar</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="form-row">
                                                <div className="form-label">Payment Terms</div>
                                                <div className="form-field-container">
                                                    <select className="form-control-custom" style={{ maxWidth: 350 }} value={formData.paymentTerms} onChange={(e) => handleBaseChange("paymentTerms", e.target.value)}>
                                                        <option>Due on Receipt</option>
                                                        <option>Net 15</option>
                                                        <option>Net 30</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Enable Portal */}
                                            <div className="form-row mt-4">
                                                <div className="form-label d-flex align-items-center">Enable Portal? <HelpIcon text="Allow portal access for this customer." id="tip-portal" /></div>
                                                <div className="form-field-container text-start">
                                                    <label className="d-inline-flex align-items-start gap-2 mb-0 cursor-pointer text-start">
                                                        <input type="checkbox" className="form-check-input m-0 flex-shrink-0" style={{ width: 16, height: 16, marginTop: "2px" }} checked={formData.portalAccess} onChange={(e) => handleBaseChange("portalAccess", e.target.checked)} />
                                                        <span className="fs-13 text-muted text-start" style={{ lineHeight: 1.4 }}>Allow portal access for this customer</span>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Add more details toggle */}
                                            <div className="form-row mt-3">
                                                <div className="form-label" />
                                                <div className="form-field-container">
                                                    <button type="button" className="btn btn-link p-0 fs-14 text-decoration-none" style={{ color: "#e41f07" }} onClick={() => setShowMoreDetails(p => !p)}>
                                                        {showMoreDetails ? "Hide details" : "Add more details"}
                                                    </button>
                                                </div>
                                            </div>

                                            {showMoreDetails && (
                                                <>
                                                    <div className="form-row mt-4">
                                                        <div className="form-label">Website URL</div>
                                                        <div className="form-field-container">
                                                            <div className="input-group-custom">
                                                                <div className="input-group-prefix"><i className="ti ti-world" /></div>
                                                                <input type="text" className="form-control-custom" placeholder="ex: www.zylker.com" value={formData.website} onChange={(e) => handleBaseChange("website", e.target.value)} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="form-row mt-4">
                                                        <div className="form-label">Department</div>
                                                        <div className="form-field-container">
                                                            <input type="text" className="form-control-custom" value={formData.department} onChange={(e) => handleBaseChange("department", e.target.value)} />
                                                        </div>
                                                    </div>
                                                    <div className="form-row mt-4">
                                                        <div className="form-label">Designation</div>
                                                        <div className="form-field-container">
                                                            <input type="text" className="form-control-custom" value={formData.designation} onChange={(e) => handleBaseChange("designation", e.target.value)} />
                                                        </div>
                                                    </div>
                                                    <div className="form-row mt-4">
                                                        <div className="form-label">X</div>
                                                        <div className="form-field-container">
                                                            <div className="input-group-custom">
                                                                <div className="input-group-prefix"><i className="ti ti-brand-x" /></div>
                                                                <input type="text" className="form-control-custom" value={formData.twitter} onChange={(e) => handleBaseChange("twitter", e.target.value)} />
                                                            </div>
                                                            <a href="#" className="field-helper-link" onClick={e => e.preventDefault()}>https://x.com/</a>
                                                        </div>
                                                    </div>
                                                    <div className="form-row mt-4">
                                                        <div className="form-label">Skype Name/Number</div>
                                                        <div className="form-field-container">
                                                            <div className="input-group-custom">
                                                                <div className="input-group-prefix"><i className="ti ti-brand-skype" /></div>
                                                                <input type="text" className="form-control-custom" value={formData.skype} onChange={(e) => handleBaseChange("skype", e.target.value)} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="form-row mt-4">
                                                        <div className="form-label">Facebook</div>
                                                        <div className="form-field-container">
                                                            <div className="input-group-custom">
                                                                <div className="input-group-prefix"><i className="ti ti-brand-facebook" /></div>
                                                                <input type="text" className="form-control-custom" value={formData.facebook} onChange={(e) => handleBaseChange("facebook", e.target.value)} />
                                                            </div>
                                                            <a href="#" className="field-helper-link" onClick={e => e.preventDefault()}>http://www.facebook.com/</a>
                                                        </div>
                                                    </div>
                                                </>
                                            )}


                                        </div>
                                    )}

                                    {activeTab === "Address" && (
                                        <div className="pane-content address-pane">
                                            <div className="row gy-4 gx-5">
                                                <div className="col-md-6">
                                                    <h6 className="fw-bold mb-4 fs-14 text-dark letter-spacing-1">BILLING ADDRESS</h6>
                                                    <div className="mb-3">
                                                        <div className="form-row mb-3">
                                                            <div className="form-label fs-13 text-muted">Attention</div>
                                                            <div className="form-field-container">
                                                                <input type="text" className="form-control-custom" value={formData.billingAddress.attention} onChange={(e) => handleAddressChange('billing', 'attention', e.target.value)} />
                                                            </div>
                                                        </div>
                                                        <div className="form-row mb-3">
                                                            <div className="form-label fs-13 text-muted">Country/Region</div>
                                                            <div className="form-field-container">
                                                                <select className="form-control-custom" value={formData.billingAddress.country} onChange={(e) => handleAddressChange('billing', 'country', e.target.value)}>
                                                                    <option>India</option>
                                                                    <option>USA</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div className="form-row mb-3 align-top">
                                                            <div className="form-label fs-13 text-muted pt-2">Address</div>
                                                            <div className="form-field-container">
                                                                <input type="text" className="form-control-custom mb-2" placeholder="Street 1" value={formData.billingAddress.street1} onChange={(e) => handleAddressChange('billing', 'street1', e.target.value)} />
                                                                <input type="text" className="form-control-custom" placeholder="Street 2" value={formData.billingAddress.street2} onChange={(e) => handleAddressChange('billing', 'street2', e.target.value)} />
                                                            </div>
                                                        </div>
                                                        <div className="form-row mb-3">
                                                            <div className="form-label fs-13 text-muted">City</div>
                                                            <div className="form-field-container">
                                                                <input type="text" className="form-control-custom" value={formData.billingAddress.city} onChange={(e) => handleAddressChange('billing', 'city', e.target.value)} />
                                                            </div>
                                                        </div>
                                                        <div className="form-row mb-3">
                                                            <div className="form-label fs-13 text-muted">State</div>
                                                            <div className="form-field-container">
                                                                <select className="form-control-custom" value={formData.billingAddress.state} onChange={(e) => handleAddressChange('billing', 'state', e.target.value)}>
                                                                    <option>Tamil Nadu</option>
                                                                    <option>Karnataka</option>
                                                                    <option>Kerala</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div className="form-row mb-3">
                                                            <div className="form-label fs-13 text-muted">Pin Code</div>
                                                            <div className="form-field-container">
                                                                <input type="text" className="form-control-custom" value={formData.billingAddress.zipCode} onChange={(e) => handleAddressChange('billing', 'zipCode', e.target.value)} />
                                                            </div>
                                                        </div>
                                                        <div className="form-row mb-3">
                                                            <div className="form-label fs-13 text-muted">Phone</div>
                                                            <div className="form-field-container">
                                                                <input type="text" className="form-control-custom" value={formData.billingAddress.phone} onChange={(e) => handleAddressChange('billing', 'phone', e.target.value)} />
                                                            </div>
                                                        </div>
                                                        <div className="form-row mb-3">
                                                            <div className="form-label fs-13 text-muted">Fax Number</div>
                                                            <div className="form-field-container">
                                                                <input type="text" className="form-control-custom" value={formData.billingAddress.fax} onChange={(e) => handleAddressChange('billing', 'fax', e.target.value)} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-md-6">
                                                    <div className="d-flex justify-content-between align-items-center mb-4">
                                                        <h6 className="fw-bold mb-0 fs-14 text-dark letter-spacing-1">SHIPPING ADDRESS</h6>
                                                        <Link to="#" className="text-primary fs-12 text-decoration-none" onClick={copyBillingAddress}>
                                                            <i className="ti ti-copy" /> Copy Billing
                                                        </Link>
                                                    </div>
                                                    <div className="mb-3">
                                                        <div className="form-row mb-3">
                                                            <div className="form-label fs-13 text-muted">Attention</div>
                                                            <div className="form-field-container">
                                                                <input type="text" className="form-control-custom" value={formData.shippingAddress.attention} onChange={(e) => handleAddressChange('shipping', 'attention', e.target.value)} />
                                                            </div>
                                                        </div>
                                                        <div className="form-row mb-3">
                                                            <div className="form-label fs-13 text-muted">Country/Region</div>
                                                            <div className="form-field-container">
                                                                <select className="form-control-custom" value={formData.shippingAddress.country} onChange={(e) => handleAddressChange('shipping', 'country', e.target.value)}>
                                                                    <option>India</option>
                                                                    <option>USA</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div className="form-row mb-3 align-top">
                                                            <div className="form-label fs-13 text-muted pt-2">Address</div>
                                                            <div className="form-field-container">
                                                                <input type="text" className="form-control-custom mb-2" placeholder="Street 1" value={formData.shippingAddress.street1} onChange={(e) => handleAddressChange('shipping', 'street1', e.target.value)} />
                                                                <input type="text" className="form-control-custom" placeholder="Street 2" value={formData.shippingAddress.street2} onChange={(e) => handleAddressChange('shipping', 'street2', e.target.value)} />
                                                            </div>
                                                        </div>
                                                        <div className="form-row mb-3">
                                                            <div className="form-label fs-13 text-muted">City</div>
                                                            <div className="form-field-container">
                                                                <input type="text" className="form-control-custom" value={formData.shippingAddress.city} onChange={(e) => handleAddressChange('shipping', 'city', e.target.value)} />
                                                            </div>
                                                        </div>
                                                        <div className="form-row mb-3">
                                                            <div className="form-label fs-13 text-muted">State</div>
                                                            <div className="form-field-container">
                                                                <select className="form-control-custom" value={formData.shippingAddress.state} onChange={(e) => handleAddressChange('shipping', 'state', e.target.value)}>
                                                                    <option>Tamil Nadu</option>
                                                                    <option>Karnataka</option>
                                                                    <option>Kerala</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div className="form-row mb-3">
                                                            <div className="form-label fs-13 text-muted">Pin Code</div>
                                                            <div className="form-field-container">
                                                                <input type="text" className="form-control-custom" value={formData.shippingAddress.zipCode} onChange={(e) => handleAddressChange('shipping', 'zipCode', e.target.value)} />
                                                            </div>
                                                        </div>
                                                        <div className="form-row mb-3">
                                                            <div className="form-label fs-13 text-muted">Phone</div>
                                                            <div className="form-field-container">
                                                                <input type="text" className="form-control-custom" value={formData.shippingAddress.phone} onChange={(e) => handleAddressChange('shipping', 'phone', e.target.value)} />
                                                            </div>
                                                        </div>
                                                        <div className="form-row mb-3">
                                                            <div className="form-label fs-13 text-muted">Fax Number</div>
                                                            <div className="form-field-container">
                                                                <input type="text" className="form-control-custom" value={formData.shippingAddress.fax} onChange={(e) => handleAddressChange('shipping', 'fax', e.target.value)} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="address-note">
                                                <div className="note-title">Note:</div>
                                                <div className="note-text">
                                                    <p>Add and manage additional addresses from the Customers and Vendors details section.</p>
                                                    <p>You can customise how customers' addresses are displayed in transaction PDFs. To do this, go to Settings &gt; Preferences &gt; Customers and Vendors, and navigate to the Address Format sections.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "Contact Persons" && (
                                        <div className="pane-content">
                                            <div className="contact-table-wrapper">
                                                <table className="contact-table">
                                                    <thead>
                                                        <tr>
                                                            <th style={{ width: "90px" }}>SALUTATION</th>
                                                            <th>NAME</th>
                                                            <th>EMAIL ADDRESS</th>
                                                            <th style={{ width: "190px" }}>MOBILE</th>
                                                            {showExtraCols && <th style={{ width: "140px" }}>SKYPE</th>}
                                                            {showExtraCols && <th style={{ width: "130px" }}>DESIGNATION</th>}
                                                            {showExtraCols && <th style={{ width: "130px" }}>DEPARTMENT</th>}
                                                            <th style={{ width: "50px" }}></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {formData.contactPersons.map((contact, index) => (
                                                            <tr key={index}>
                                                                <td>
                                                                    <select
                                                                        className="form-control-custom white-input"
                                                                        value={contact.salutation}
                                                                        onChange={(e) => handleContactChange(index, "salutation", e.target.value)}
                                                                    >
                                                                        <option>Mr.</option>
                                                                        <option>Mrs.</option>
                                                                        <option>Ms.</option>
                                                                        <option>Miss</option>
                                                                        <option>Dr.</option>
                                                                    </select>
                                                                </td>
                                                                <td><input type="text" className="form-control-custom white-input" placeholder="" value={contact.firstName} onChange={(e) => handleContactChange(index, "firstName", e.target.value)} /></td>
                                                                <td><input type="email" className="form-control-custom white-input" placeholder="" value={contact.email} onChange={(e) => handleContactChange(index, "email", e.target.value)} /></td>
                                                                <td>
                                                                    <div className="phone-group-cell">
                                                                        <select
                                                                            value={contact.mobilePrefix || "+91"}
                                                                            onChange={(e) => handleContactChange(index, "mobilePrefix", e.target.value)}
                                                                        >
                                                                            <option value="+91">+91</option>
                                                                            <option value="+1">+1</option>
                                                                            <option value="+44">+44</option>
                                                                            <option value="+971">+971</option>
                                                                            <option value="+65">+65</option>
                                                                        </select>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Mobile No."
                                                                            value={contact.mobileLine}
                                                                            onChange={(e) => handleContactChange(index, "mobileLine", e.target.value)}
                                                                        />
                                                                    </div>
                                                                </td>
                                                                {showExtraCols && <td><input type="text" className="form-control-custom white-input" placeholder="" value={contact.skype || ""} onChange={(e) => handleContactChange(index, "skype", e.target.value)} /></td>}
                                                                {showExtraCols && <td><input type="text" className="form-control-custom white-input" placeholder="" value={contact.designation || ""} onChange={(e) => handleContactChange(index, "designation", e.target.value)} /></td>}
                                                                {showExtraCols && <td><input type="text" className="form-control-custom white-input" placeholder="" value={contact.department || ""} onChange={(e) => handleContactChange(index, "department", e.target.value)} /></td>}
                                                                <td className="text-center align-middle" style={{ whiteSpace: "nowrap" }}>
                                                                    <button type="button" title="More fields" className="btn p-0 border-0 bg-transparent me-2" style={{ color: showExtraCols ? "#e41f07" : "#6c757d" }} onClick={() => setShowExtraCols(!showExtraCols)}>
                                                                        <i className="ti ti-dots fs-16" />
                                                                    </button>
                                                                    {formData.contactPersons.length > 1 && (
                                                                        <button type="button" title="Delete" className="btn p-0 border-0 bg-transparent" style={{ color: "#e41f07" }} onClick={() => removeContactRow(index)}>
                                                                            <i className="ti ti-trash fs-15" />
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="mt-3">
                                                <button type="button" className="btn-add-red-dashed" onClick={addContactRow}>
                                                    <i className="ti ti-plus" /> Add Contact Person
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "Remarks" && (
                                        <div className="pane-content">
                                            <div className="form-row flex-column align-items-start">
                                                <div className="form-label mb-2" style={{ paddingTop: 0 }}>Remarks</div>
                                                <div className="form-field-container w-100" style={{ maxWidth: 800 }}>
                                                    <textarea
                                                        className="form-control-custom p-3"
                                                        style={{ height: 150, resize: "vertical" }}
                                                        placeholder="Internal notes about this customer..."
                                                        value={formData.remarks}
                                                        onChange={(e) => handleBaseChange("remarks", e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="d-flex align-items-center gap-3 border-top w-100 bg-white" style={{ padding: "20px 60px" }}>
                                <button type="button" className="btn text-white" style={{ backgroundColor: "#e41f07", padding: "8px 24px", fontWeight: 500, borderRadius: "6px" }} onClick={handleSave}>Save</button>
                                <button type="button" className="btn btn-light" style={{ backgroundColor: "#f8fafc", padding: "8px 24px", fontWeight: 500, borderRadius: "6px", border: "1px solid #e2e8f0", color: "#0f172a" }} onClick={handleBack}>Cancel</button>
                            </div>
                        </div>
                    </div>

                    {/* GST Prefill Modal */}
                    {showGstModal && (
                        <div className="gst-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowGstModal(false); }}>
                            <div className="gst-modal-content">
                                <div className="gst-modal-header">
                                    <h5>Prefill Customer Details From the GST Portal</h5>
                                    <button className="btn-close-custom" onClick={() => setShowGstModal(false)}>
                                        <i className="ti ti-x" />
                                    </button>
                                </div>
                                <div className="gst-modal-body text-start">
                                    <label className="form-label-gst">GSTIN/UIN*</label>
                                    <div className="d-flex gap-2">
                                        <input
                                            type="text"
                                            className="form-control-custom"
                                            style={{ maxWidth: 300 }}
                                            placeholder="Enter GSTIN"
                                            value={gstin}
                                            onChange={(e) => setGstin(e.target.value)}
                                        />
                                        <button
                                            className="btn-fetch"
                                            onClick={handleFetchGst}
                                            disabled={isFetching || !gstin}
                                        >
                                            {isFetching ? "Fetching..." : "Fetch"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );

};

export default CustomerAdd;
