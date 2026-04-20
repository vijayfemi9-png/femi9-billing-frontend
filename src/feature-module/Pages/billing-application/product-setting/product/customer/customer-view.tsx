import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { all_routes } from "../../../../../../routes/all_routes";
import "./customer.scss";

interface Customer {
    id: number;
    name: string;
    companyName: string;
    email: string;
    workPhone: string;
    receivables: number;
    unusedCredits: number;
    status: "Active" | "Inactive";
    isDeleted?: boolean;
}

interface ContactPerson {
    id: number;
    salutation: string;
    firstName: string;
    lastName: string;
    email: string;
    workPhone: string;
    mobile: string;
    skype: string;
    designation: string;
    department: string;
    isPrimary: boolean;
    isEnabled: boolean;
    portalAccess: boolean;
}

const SK = "billing_customers";
const SK_CP = (cid: number) => `billing_cp_${cid}`;

function loadContacts(cid: number): ContactPerson[] {
    try { return JSON.parse(localStorage.getItem(SK_CP(cid)) || "[]"); } catch { return []; }
}
function saveContacts(cid: number, list: ContactPerson[]) {
    localStorage.setItem(SK_CP(cid), JSON.stringify(list));
}

function getAllRaw(): Customer[] {
    try { return JSON.parse(localStorage.getItem(SK) || "[]") as Customer[]; } catch { return []; }
}

const fmt = (n: number) =>
    "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2 });

const TABS = [
    { key: "overview", label: "Overview" },
    { key: "comments", label: "Comments" },
    { key: "transactions", label: "Transactions" },
    { key: "statement", label: "Statement" },
    { key: "history", label: "History" },
] as const;

type TabKey = typeof TABS[number]["key"];

const EmptyTab: React.FC<{ icon: string; title: string; sub: string }> = ({ icon, title, sub }) => (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: 300 }}>
        <div className="text-center">
            <i className={`${icon} fs-48 text-muted d-block mb-3`} style={{ opacity: 0.25 }} />
            <h6 className="fw-bold mb-1">{title}</h6>
            <p className="text-muted fs-14 mb-0">{sub}</p>
        </div>
    </div>
);

interface CommentItem {
    id: number;
    html: string;
    author: string;
    initials: string;
    avatarColor: string;
    timestamp: string;   // ISO string
}

const AVATAR_COLORS = [
    "#e41f07", "#7c3aed", "#0891b2", "#059669", "#d97706", "#db2777", "#4f46e5"
];

function getAvatarColor(name: string): string {
    let n = 0;
    for (let i = 0; i < name.length; i++) n += name.charCodeAt(i);
    return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function fmtRelative(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return "just now";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const SK_COMMENTS = (cid: number) => `billing_comments_${cid}`;

// ── Hook: Click Outside ──────────────────────────────────────────
// ── Hook: Click Outside ──────────────────────────────────────────
function useClickOutside(refs: React.RefObject<any>[], handler: () => void) {
    React.useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            if (refs.some(ref => !ref.current || ref.current.contains(event.target as Node))) {
                return;
            }
            handler();
        };
        document.addEventListener("mousedown", listener);
        document.addEventListener("touchstart", listener);
        return () => {
            document.removeEventListener("mousedown", listener);
            document.removeEventListener("touchstart", listener);
        };
        // Disable warning for array dependencies as they are refs
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handler]);
}

const CommentsTab: React.FC<{ customerId: number }> = ({ customerId }) => {
    const [comments, setComments] = React.useState<CommentItem[]>(() => {
        try { return JSON.parse(localStorage.getItem(SK_COMMENTS(customerId)) || "[]"); } catch { return []; }
    });
    const [editingId, setEditingId] = React.useState<number | null>(null);
    const [deleteId, setDeleteId] = React.useState<number | null>(null);
    const editorRef = React.useRef<HTMLDivElement>(null);
    const editRef = React.useRef<HTMLDivElement>(null);
    const commentItemRef = React.useRef<HTMLDivElement>(null); // For click outside cancel

    useClickOutside([editRef, commentItemRef], () => {
        setEditingId(null);
        setDeleteId(null);
    });

    // Re-load when customer switches
    React.useEffect(() => {
        try {
            setComments(JSON.parse(localStorage.getItem(SK_COMMENTS(customerId)) || "[]"));
        } catch { setComments([]); }
        setEditingId(null);
        setDeleteId(null);
    }, [customerId]);

    const save = (updated: CommentItem[]) => {
        setComments(updated);
        localStorage.setItem(SK_COMMENTS(customerId), JSON.stringify(updated));
    };

    const handleAdd = () => {
        const html = editorRef.current?.innerHTML?.trim() || "";
        const text = editorRef.current?.innerText?.trim() || "";
        if (!text) return;
        const author = "You";
        const item: CommentItem = {
            id: Date.now(),
            html,
            author,
            initials: getInitials(author),
            avatarColor: getAvatarColor(author),
            timestamp: new Date().toISOString(),
        };
        save([item, ...comments]);
        if (editorRef.current) editorRef.current.innerHTML = "";
    };

    const handleDelete = (id: number) => {
        save(comments.filter(c => c.id !== id));
        setDeleteId(null);
    };

    const handleSaveEdit = (id: number) => {
        const html = editRef.current?.innerHTML?.trim() || "";
        const text = editRef.current?.innerText?.trim() || "";
        if (!text) return;
        save(comments.map(c => c.id === id ? { ...c, html } : c));
        setEditingId(null);
    };

    const applyFmt = (cmd: string) => {
        document.execCommand(cmd, false);
        editorRef.current?.focus();
    };

    return (
        <div className="cv-comments-tab">

            {/* ── Editor ── */}
            <div className="cv-comment-editor">
                <div className="cv-comment-toolbar">
                    <button className="cv-fmt-btn" onMouseDown={e => { e.preventDefault(); applyFmt("bold"); }} title="Bold"><strong>B</strong></button>
                    <button className="cv-fmt-btn" onMouseDown={e => { e.preventDefault(); applyFmt("italic"); }} title="Italic"><em>I</em></button>
                    <button className="cv-fmt-btn" onMouseDown={e => { e.preventDefault(); applyFmt("underline"); }} title="Underline"><span style={{ textDecoration: "underline" }}>U</span></button>
                    <div className="cv-toolbar-sep" />
                    <button className="cv-fmt-btn" onMouseDown={e => { e.preventDefault(); applyFmt("insertUnorderedList"); }} title="Bullet list"><i className="ti ti-list" /></button>
                </div>
                <div
                    ref={editorRef}
                    className="cv-comment-editable"
                    contentEditable
                    suppressContentEditableWarning
                    data-placeholder="Write a comment..."
                    onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleAdd(); } }}
                />
                <div className="cv-comment-footer">
                    <button className="cv-comment-add-btn" onClick={handleAdd}>
                        <i className="ti ti-send me-1 fs-13" />Add Comment
                    </button>
                </div>
            </div>

            {/* ── All Comments ── */}
            <div className="cv-all-comments">
                <div className="cv-all-comments-header-row">
                    <span className="cv-all-comments-header">ALL COMMENTS</span>
                    <span className="cv-comment-count">{comments.length} comment{comments.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="cv-all-comments-divider" />

                {comments.length === 0 ? (
                    <div className="cv-no-comments">
                        <i className="ti ti-message-circle cv-no-comment-icon" />
                        <div className="cv-no-comment-title">No comments yet</div>
                        <div className="cv-no-comment-sub">Be the first to add a comment above.</div>
                    </div>
                ) : (
                    comments.map(c => (
                        <div key={c.id} ref={editingId === c.id || deleteId === c.id ? commentItemRef : null} className="cv-comment-item">
                            {/* Avatar */}
                            <div className="cv-comment-avatar" style={{ background: c.avatarColor }}>
                                {c.initials}
                            </div>

                            {/* Body */}
                            <div className="cv-comment-body">
                                <div className="cv-comment-meta">
                                    <span className="cv-comment-author">{c.author}</span>
                                    <span className="cv-comment-time" title={new Date(c.timestamp).toLocaleString("en-IN")}>
                                        {fmtRelative(c.timestamp)}
                                    </span>
                                    {/* Actions */}
                                    <div className="cv-comment-actions">
                                        {editingId !== c.id && (
                                            <button
                                                className="cv-action-btn"
                                                title="Edit"
                                                onClick={() => {
                                                    setEditingId(c.id);
                                                    setDeleteId(null);
                                                    setTimeout(() => {
                                                        if (editRef.current) {
                                                            editRef.current.innerHTML = c.html;
                                                            editRef.current.focus();
                                                        }
                                                    }, 30);
                                                }}>
                                                <i className="ti ti-pencil fs-12" />
                                            </button>
                                        )}
                                        <button
                                            className="cv-action-btn danger"
                                            title="Delete"
                                            onClick={() => setDeleteId(c.id === deleteId ? null : c.id)}>
                                            <i className="ti ti-trash fs-12" />
                                        </button>
                                    </div>
                                </div>

                                {/* Delete confirm inline */}
                                {deleteId === c.id && (
                                    <div className="cv-delete-confirm">
                                        <span>Delete this comment?</span>
                                        <button className="cv-del-yes" onClick={() => handleDelete(c.id)}>Yes, delete</button>
                                        <button className="cv-del-no" onClick={() => setDeleteId(null)}>Cancel</button>
                                    </div>
                                )}

                                {/* Edit inline */}
                                {editingId === c.id ? (
                                    <>
                                        <div
                                            ref={editRef}
                                            className="cv-comment-editable editing"
                                            contentEditable
                                            suppressContentEditableWarning
                                        />
                                        <div className="cv-edit-actions">
                                            <button className="cv-comment-add-btn" onClick={() => handleSaveEdit(c.id)}>Save</button>
                                            <button className="cv-cancel-btn" onClick={() => setEditingId(null)}>Cancel</button>
                                        </div>
                                    </>
                                ) : (
                                    <div
                                        className="cv-comment-text"
                                        dangerouslySetInnerHTML={{ __html: c.html }}
                                    />
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// ── Statement Tab ─────────────────────────────────────────────────
const MONTH_OPTIONS = [
    "This Month", "Last Month", "This Quarter",
    "Last Quarter", "This Year", "Last Year", "Custom"
] as const;

const FILTER_OPTIONS = ["All", "Invoices", "Payments", "Credit Notes"] as const;

function getMonthRange(opt: string): { from: string; to: string } {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmtDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    switch (opt) {
        case "Last Month": {
            const first = new Date(y, m - 1, 1);
            const last = new Date(y, m, 0);
            return { from: fmtDate(first), to: fmtDate(last) };
        }
        case "This Quarter": {
            const qStart = Math.floor(m / 3) * 3;
            return { from: fmtDate(new Date(y, qStart, 1)), to: fmtDate(new Date(y, qStart + 3, 0)) };
        }
        case "Last Quarter": {
            const qStart = Math.floor(m / 3) * 3 - 3;
            return { from: fmtDate(new Date(y, qStart, 1)), to: fmtDate(new Date(y, qStart + 3, 0)) };
        }
        case "This Year":
            return { from: fmtDate(new Date(y, 0, 1)), to: fmtDate(new Date(y, 11, 31)) };
        case "Last Year":
            return { from: fmtDate(new Date(y - 1, 0, 1)), to: fmtDate(new Date(y - 1, 11, 31)) };
        default: // This Month
            return { from: fmtDate(new Date(y, m, 1)), to: fmtDate(new Date(y, m + 1, 0)) };
    }
}

const StatementTab: React.FC<{ customer: Customer | null }> = ({ customer }) => {
    const [period, setPeriod] = React.useState("This Month");
    const [filter, setFilter] = React.useState("All");
    const [showPeriod, setShowPeriod] = React.useState(false);
    const [showFilter, setShowFilter] = React.useState(false);

    const range = getMonthRange(period);
    const fmt2 = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2 });

    const opening = 0;
    const invoiced = customer?.receivables ?? 0;
    const received = customer?.unusedCredits ?? 0;
    const balanceDue = invoiced - received;

    const txRows = [
        {
            date: range.from,
            transaction: "***Opening Balance***",
            details: "",
            amount: opening,
            payments: null as number | null,
            balance: opening,
        },
        ...(invoiced > 0 ? [{
            date: range.from,
            transaction: "Invoice",
            details: "INV-001",
            amount: invoiced,
            payments: null as number | null,
            balance: invoiced,
        }] : []),
        ...(received > 0 ? [{
            date: range.from,
            transaction: "Payment",
            details: "PMT-001",
            amount: null as number | null,
            payments: received,
            balance: balanceDue,
        }] : []),
    ];

    const periodRef = React.useRef<HTMLDivElement>(null);
    const filterRef = React.useRef<HTMLDivElement>(null);

    useClickOutside([periodRef], () => setShowPeriod(false));
    useClickOutside([filterRef], () => setShowFilter(false));

    return (
        <div className="cv-statement-tab">

            {/* ── Toolbar ── */}
            <div className="cv-stmt-toolbar">
                <div className="cv-stmt-toolbar-left">
                    {/* Period picker */}
                    <div ref={periodRef} className="cv-stmt-dropdown-wrapper">
                        <button
                            className="cv-stmt-pill-btn"
                            onClick={() => { setShowPeriod(p => !p); setShowFilter(false); }}>
                            <i className="ti ti-calendar fs-14" />
                            {period}
                            <i className="ti ti-chevron-down fs-11" />
                        </button>
                        {showPeriod && (
                            <div className="cv-stmt-dropdown">
                                {MONTH_OPTIONS.map(o => (
                                    <button
                                        key={o}
                                        className={`cv-stmt-drop-item ${period === o ? "active" : ""}`}
                                        onClick={() => { setPeriod(o); setShowPeriod(false); }}>
                                        {o}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Filter picker */}
                    <div ref={filterRef} className="cv-stmt-dropdown-wrapper">
                        <button
                            className="cv-stmt-pill-btn outline"
                            onClick={() => { setShowFilter(f => !f); setShowPeriod(false); }}>
                            Filter By: {filter}
                            <i className="ti ti-chevron-down fs-11" />
                        </button>
                        {showFilter && (
                            <div className="cv-stmt-dropdown">
                                {FILTER_OPTIONS.map(o => (
                                    <button
                                        key={o}
                                        className={`cv-stmt-drop-item ${filter === o ? "active" : ""}`}
                                        onClick={() => { setFilter(o); setShowFilter(false); }}>
                                        {o}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="cv-stmt-toolbar-right">
                    <button className="cv-stmt-icon-btn" title="Print" onClick={() => window.print()}>
                        <i className="ti ti-printer fs-16" />
                    </button>
                    <button className="cv-stmt-icon-btn" title="Download PDF">
                        <i className="ti ti-file-type-pdf fs-16" />
                    </button>
                    <button className="cv-stmt-icon-btn" title="Export">
                        <i className="ti ti-file-export fs-16" />
                    </button>
                    <button className="cv-stmt-send-btn">
                        <i className="ti ti-mail fs-14" /> Send Email
                    </button>
                </div>
            </div>

            {/* ── Statement Title ── */}
            <div className="cv-stmt-title-area">
                <div className="cv-stmt-title">Customer Statement for {customer?.companyName || customer?.name}</div>
                <div className="cv-stmt-subtitle">From {range.from} To {range.to}</div>
            </div>

            {/* ── Statement Paper ── */}
            <div className="cv-stmt-paper">

                {/* Company info — top right */}
                <div className="cv-stmt-company">
                    <div className="cv-stmt-co-name">femi9</div>
                    <div>Tamil Nadu</div>
                    <div>India</div>
                </div>

                {/* Customer + heading row */}
                <div className="cv-stmt-header-row">
                    <div className="cv-stmt-to">
                        <div className="cv-stmt-to-label">To</div>
                        <div className="cv-stmt-to-name">{customer?.companyName || customer?.name}</div>
                    </div>

                    <div className="cv-stmt-heading-block">
                        <div className="cv-stmt-heading">Statement of Accounts</div>
                        <hr className="cv-stmt-hr" />
                        <div className="cv-stmt-date-range">{range.from} To {range.to}</div>

                        {/* Account Summary */}
                        <table className="cv-stmt-summary-table">
                            <thead>
                                <tr><th colSpan={2}>Account Summary</th></tr>
                            </thead>
                            <tbody>
                                {[
                                    { label: "Opening Balance", val: opening },
                                    { label: "Invoiced Amount", val: invoiced },
                                    { label: "Amount Received", val: received },
                                ].map(r => (
                                    <tr key={r.label}>
                                        <td>{r.label}</td>
                                        <td className="text-end">{fmt2(r.val)}</td>
                                    </tr>
                                ))}
                                <tr className="cv-stmt-balance-row">
                                    <td>Balance Due</td>
                                    <td className="text-end">{fmt2(balanceDue)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Transactions Table ── */}
                <table className="cv-stmt-tx-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Transactions</th>
                            <th>Details</th>
                            <th className="text-end">Amount</th>
                            <th className="text-end">Payments</th>
                            <th className="text-end">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {txRows.map((r, i) => (
                            <tr key={i}>
                                <td>{r.date}</td>
                                <td>{r.transaction}</td>
                                <td>{r.details}</td>
                                <td className="text-end">{r.amount != null ? r.amount.toFixed(2) : ""}</td>
                                <td className="text-end">{r.payments != null ? r.payments.toFixed(2) : ""}</td>
                                <td className="text-end">{r.balance.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={4} />
                            <td className="cv-stmt-foot-label">Balance Due</td>
                            <td className="cv-stmt-foot-val">{fmt2(balanceDue)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};


const HistoryTab: React.FC<{ customer: Customer | null }> = ({ customer }) => {
    const historyData = [
        { date: "14/04/2026 11:31 AM", details: "created by", user: "vijayfemi9-png" },
        { date: "14/04/2026 04:55 PM", details: "updated by", user: "vijayfemi9-png" },
        { date: "14/04/2026 06:39 PM", details: "updated by", user: "vijayfemi9-png" },
        { date: "14/04/2026 06:42 PM", details: "assembly created (qty: 2) by", user: "vijayfemi9-png" },
    ];

    return (
        <div className="cv-history-tab-table">
            <div className="table-responsive">
                <table className="table mb-0">
                    <thead>
                        <tr>
                            <th style={{ width: '220px' }}>DATE</th>
                            <th>DETAILS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {historyData.map((row, i) => (
                            <tr key={i}>
                                <td className="text-muted">{row.date}</td>
                                <td>
                                    <span className="fw-bold text-dark">{row.details}</span> - <span className="text-muted" style={{ fontStyle: 'italic' }}>{row.user}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const PAYMENT_TERMS = [
    "Due on Receipt", "Net 15", "Net 30", "Net 45", "Net 60",
    "End of Month", "End of Next Month",
];

const PaymentDueCard: React.FC = () => {
    const [editing, setEditing] = React.useState(false);
    const [value, setValue] = React.useState("Due on Receipt");
    const [draft, setDraft] = React.useState("Due on Receipt");

    const handleEdit = () => { setDraft(value); setEditing(true); };
    const handleSave = () => { setValue(draft); setEditing(false); };
    const handleCancel = () => setEditing(false);

    return (
        <div className="cv-pdue-card mb-4 mt-2" style={{ padding: "0 12px" }}>
            <div className="fs-13 fw-semibold text-muted mb-1" style={{ color: "#8b93a6" }}>Payment due period</div>
            {editing ? (
                <div className="cv-pdue-edit-row d-flex gap-2">
                    <select
                        className="form-select form-select-sm shadow-none"
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        autoFocus>
                        {PAYMENT_TERMS.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    <button className="btn btn-sm btn-primary p-1 shadow-none" onClick={handleSave} title="Save">
                        <i className="ti ti-check fs-14" />
                    </button>
                    <button className="btn btn-sm btn-light p-1 shadow-none" onClick={handleCancel} title="Cancel">
                        <i className="ti ti-x fs-14" />
                    </button>
                </div>
            ) : (
                <div className="cv-pdue-value-row d-inline-flex align-items-center gap-2 cursor-pointer" onClick={handleEdit} title="Click to edit">
                    <span className="fs-14 fw-medium text-dark">{value}</span>
                </div>
            )}
        </div>
    );
};

const CustomerView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const route = all_routes;

    const [customers, setCustomers] = useState<Customer[]>(() => getAllRaw().filter(c => !c.isDeleted));
    const [selected, setSelected] = useState<Customer | null>(null);
    const [tab, setTab] = useState<TabKey>("overview");
    const [sideSearch, setSideSearch] = useState("");
    const [addrOpen, setAddrOpen] = useState(true);
    const [otherOpen, setOtherOpen] = useState(true);
    const [contactPersonsOpen, setContactPersonsOpen] = useState(true);
    const [recordInfoOpen, setRecordInfoOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 768);
    const [viewFilter, setViewFilter] = useState("Active Customers");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [actionModal, setActionModal] = useState<'none' | 'clone' | 'merge' | 'associate-templates' | 'configure-portal' | 'link-vendor'>('none');
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [mergeTargetId, setMergeTargetId] = useState<number | null>(null);
    const [cloneType, setCloneType] = useState<'Customer' | 'Vendor'>('Customer');
    const [linkVendorId, setLinkVendorId] = useState<string>('');
    const [portalAccessMap, setPortalAccessMap] = useState<Record<number, boolean>>({});
    const [showPortalConfig, setShowPortalConfig] = useState(false);

    const openPortalConfig = () => {
        const map: Record<number, boolean> = {};
        contactPersons.forEach(cp => { map[cp.id] = !!cp.portalAccess; });
        setPortalAccessMap(map);
        setShowPortalConfig(true);
    };

    const savePortalConfig = () => {
        if (!selected) return;
        const updated = contactPersons.map(cp => ({ ...cp, portalAccess: !!portalAccessMap[cp.id] }));
        saveContacts(selected.id, updated);
        setContactPersons(updated);
        setShowPortalConfig(false);
        showNotify("Portal access configured");
    };

    // ── Contact Persons ──────────────────────────────────────────────
    const [contactPersons, setContactPersons] = useState<ContactPerson[]>([]);
    const [showContactModal, setShowContactModal] = useState(false);
    const [editingContact, setEditingContact] = useState<ContactPerson | null>(null);
    const blankForm = { salutation: "Mr.", firstName: "", lastName: "", email: "", workPhone: "", mobile: "", skype: "", designation: "", department: "", isPrimary: false, portalAccess: true };
    const [cpForm, setCpForm] = useState(blankForm);
    const [cpImage, setCpImage] = useState<string | null>(null);

    const handleCpImage = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => setCpImage(e.target?.result as string);
        reader.readAsDataURL(file);
    };

    const openAddContact = () => { setEditingContact(null); setCpForm(blankForm); setCpImage(null); setShowContactModal(true); };
    const openEditContact = (cp: ContactPerson) => {
        setEditingContact(cp);
        setCpForm({ salutation: cp.salutation, firstName: cp.firstName, lastName: cp.lastName, email: cp.email, workPhone: cp.workPhone, mobile: cp.mobile, skype: cp.skype, designation: cp.designation, department: cp.department, isPrimary: cp.isPrimary, portalAccess: cp.portalAccess });
        setShowContactModal(true);
    };
    const saveContact = () => {
        if (!selected || !cpForm.firstName.trim()) return;
        const cid = selected.id;
        let updated: ContactPerson[];
        if (editingContact) {
            updated = contactPersons.map(c => c.id === editingContact.id ? { ...c, ...cpForm } : c);
        } else {
            const newCp: ContactPerson = { id: Date.now(), ...cpForm, isEnabled: true };
            if (newCp.isPrimary) updated = [newCp, ...contactPersons.map(c => ({ ...c, isPrimary: false }))];
            else updated = [...contactPersons, newCp];
        }
        saveContacts(cid, updated);
        setContactPersons(updated);
        setShowContactModal(false);
        showNotify(editingContact ? "Contact updated" : "Contact person added");
    };
    const deleteContact = (cpId: number) => {
        if (!selected) return;
        const updated = contactPersons.filter(c => c.id !== cpId);
        saveContacts(selected.id, updated);
        setContactPersons(updated);
        showNotify("Contact removed", "error");
    };
    const toggleContact = (cpId: number) => {
        if (!selected) return;
        const updated = contactPersons.map(c => c.id === cpId ? { ...c, isEnabled: !c.isEnabled } : c);
        saveContacts(selected.id, updated);
        setContactPersons(updated);
    };
    const markPrimary = (cpId: number) => {
        if (!selected) return;
        const updated = contactPersons.map(c => ({ ...c, isPrimary: c.id === cpId }));
        saveContacts(selected.id, updated);
        setContactPersons(updated);
        showNotify("Marked as primary");
    };

    const showNotify = (msg: string, type: 'success' | 'error' = 'success') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleClone = () => {
        if (!selected) return;
        const newCustomer: Customer = {
            ...selected,
            id: Date.now(),
            name: `${selected.name} (Copy)`,
            companyName: `${selected.companyName} (Copy)`,
            receivables: 0,
            unusedCredits: 0,
        };
        const updated = [newCustomer, ...customers];
        localStorage.setItem(SK, JSON.stringify(updated));
        setCustomers(updated);
        showNotify("Customer cloned successfully");
    };
    const copyCustomer = () => showNotify("Customer link copied");

    // Compute timeline data safely on the fly without using effects.
    const timelineData = React.useMemo(() => {
        if (!selected) return [];
        const t = [];
        t.push({
            date: new Date().toLocaleDateString('en-GB'),
            time: "02:59 PM",
            icon: "ti-message-circle",
            title: "Contact updated",
            desc: "Marked as active",
            by: "error 404"
        });
        if (contactPersons.length > 0) {
            t.push({
                date: new Date().toLocaleDateString('en-GB'),
                time: "10:15 AM",
                icon: "ti-user-plus",
                title: "Contact person added",
                desc: `Contact person ${contactPersons[0].firstName} has been created`,
                by: "error 404"
            });
        }
        t.push({
            date: new Date().toLocaleDateString('en-GB'),
            time: "09:00 AM",
            icon: "ti-user-check",
            title: "Customer created",
            desc: `${selected.name} has been added to the system`,
            by: "error 404"
        });
        return t;
    }, [selected, contactPersons]);

    const handleMerge = () => {
        if (!selected || !mergeTargetId) return;
        const target = customers.find(c => c.id === mergeTargetId);
        if (!target) return;

        const updated = customers.filter(c => c.id !== selected.id);
        localStorage.setItem(SK, JSON.stringify(updated));
        setCustomers(updated);
        setMergeTargetId(null);
        setActionModal('none');
        navigate(route.customerView.replace(":id", String(target.id)));
        showNotify(`Merged ${selected.name} into ${target.name}`);
    };

    useEffect(() => {
        const onResize = () => {
            const m = window.innerWidth < 768;
            setIsMobile(m);
            if (!m) setShowSidebar(true);
        };
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => {
        const all = getAllRaw().filter(c => !c.isDeleted);
        setCustomers(all);
        setSelected(all.find(c => c.id === Number(id)) || all[0] || null);
    }, [id]);

    useEffect(() => {
        if (selected) setContactPersons(loadContacts(selected.id));
    }, [selected?.id]);

    const handleDelete = () => {
        try {
            const raw = getAllRaw();
            const updated = raw.map(c => (Number(c.id) === Number(selected?.id) ? { ...c, isDeleted: true } : c));
            localStorage.setItem(SK, JSON.stringify(updated));
            navigate(route.customerList);
        } catch (e) {
            console.error("Delete failed", e);
        }
    };

    const sidebarList = customers.filter(c =>
        c.name.toLowerCase().includes(sideSearch.toLowerCase()) ||
        c.companyName.toLowerCase().includes(sideSearch.toLowerCase())
    );

    /* ── Not found ─────────────────────────────────────────────────────────────── */
    if (!selected && customers.length === 0) {
        return (
            <div className="page-wrapper d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
                <i className="ti ti-user-off fs-48 text-muted mb-3" style={{ opacity: 0.3 }} />
                <h6 className="fw-bold mb-2">No customers found</h6>
                <button className="btn btn-primary mt-2" onClick={() => navigate(route.customerList)}>
                    Back to Customers
                </button>
            </div>
        );
    }

    /* ── Full-page split layout ──────────────────────────────────────────────── */
    return (
        <div className="page-wrapper" style={isMobile ? { minHeight: "100vh", display: "flex", flexDirection: "column" } : { height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div className={`content pb-0 flex-grow-1 d-flex flex-column`} style={isMobile ? { minHeight: 0 } : { minHeight: 0, overflow: "hidden" }}>

                {/* ── Top Unified Header ── */}
                <div className="d-flex align-items-center justify-content-between flex-wrap mb-3 gap-3">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                            {isMobile && !showSidebar && (
                                <button className="btn btn-light btn-sm p-1 me-1" onClick={() => setShowSidebar(true)}>
                                    <i className="ti ti-menu-2 fs-16" />
                                </button>
                            )}
                            <h4 className="fw-bold mb-0" style={{ fontSize: '20px' }}>{selected?.name}</h4>
                        </div>
                        <nav aria-label="breadcrumb">
                            <ol className="breadcrumb mb-0 p-0" style={{ fontSize: '13px' }}>
                                <li className="breadcrumb-item"><Link to={all_routes.dealsDashboard}>Home</Link></li>
                                <li className="breadcrumb-item"><Link to={route.customerList}>Customers</Link></li>
                                <li className="breadcrumb-item active">{selected?.name}</li>
                            </ol>
                        </nav>
                    </div>

                    <div className="d-flex align-items-center gap-2 flex-wrap">
                        <button className="cv-header-btn btn-outline"
                            onClick={() => navigate(route.customerEdit.replace(":id", String(selected?.id)))}>Edit</button>
                        <div className="dropdown">
                            <button className="cv-header-btn btn-primary-red text-white"
                                data-bs-toggle="dropdown">
                                New Transaction <i className="ti ti-chevron-down fs-11" />
                            </button>
                            <div className="dropdown-menu dropdown-menu-end shadow border-0 py-1">
                                {[
                                    { label: "Invoice", route: route.addInvoices },
                                    { label: "Estimate", route: "#" },
                                    { label: "Sales Order", route: "#" },
                                    { label: "Payment Received", route: "#" },
                                    { label: "Credit Note", route: "#" }
                                ].map(v => (
                                    <Link key={v.label} className="dropdown-item fs-14 py-2" to={v.route}>{v.label}</Link>
                                ))}
                            </div>
                        </div>
                        <div className="dropdown">
                            <button className="cv-header-btn btn-outline" data-bs-toggle="dropdown">
                                More <i className="ti ti-chevron-down fs-11 ms-1" />
                            </button>
                            <div className="dropdown-menu dropdown-menu-end shadow border-0 py-1" style={{ minWidth: 200 }}>
                                <button className="dropdown-item fs-14 py-2 d-flex align-items-center justify-content-between"
                                    onClick={() => setActionModal('associate-templates')}>
                                    Associate Templates
                                </button>
                                <button className="dropdown-item fs-14 py-2"
                                    onClick={() => { setPortalAccessMap(Object.fromEntries(contactPersons.map(cp => [cp.id, cp.portalAccess]))); setActionModal('configure-portal'); }}>
                                    Configure Customer Portal
                                </button>
                                <div className="dropdown-divider" />
                                <button className="dropdown-item fs-14 py-2">Stop All Reminders</button>
                                <div className="dropdown-divider" />
                                <button className="dropdown-item fs-14 py-2" onClick={() => { setLinkVendorId(''); setActionModal('link-vendor'); }}>Link to Vendor</button>
                                <button className="dropdown-item fs-14 py-2" onClick={() => { setCloneType('Customer'); setActionModal('clone'); }}>
                                    <i className="ti ti-copy me-2 text-muted" /> Clone
                                </button>
                                <button className="dropdown-item fs-14 py-2" onClick={() => setActionModal('merge')}>
                                    <i className="ti ti-arrows-merge me-2 text-muted" /> Merge Customers
                                </button>
                                <div className="dropdown-divider" />
                                <button className="dropdown-item fs-14 py-2" onClick={() => {
                                    if (selected) {
                                        const nextStatus = (selected.status === "Active" ? "Inactive" : "Active") as "Active" | "Inactive";
                                        const updated = customers.map(c => c.id === selected.id ? { ...c, status: nextStatus } : c);
                                        localStorage.setItem(SK, JSON.stringify(updated));
                                        setCustomers(updated);
                                        setSelected({ ...selected, status: nextStatus });
                                        showNotify(`Marked as ${nextStatus}`);
                                    }
                                }}>
                                    Mark as {selected?.status === "Active" ? "Inactive" : "Active"}
                                </button>
                                <button className="dropdown-item fs-14 py-2 text-danger" onClick={() => setShowDeleteConfirm(true)}>
                                    Delete
                                </button>
                            </div>
                        </div>
                        <button className="cv-header-btn btn-icon" onClick={() => navigate(route.customerList)}>
                            <i className="ti ti-x fs-18 text-muted" />
                        </button>
                    </div>
                </div>

                {/* ── Shell: sidebar + detail ──────────────────────────── */}
                <div className="d-flex flex-grow-1 cv-shell-container bg-white shadow-sm border rounded" style={isMobile ? { minHeight: 0, flexDirection: "column" } : { minHeight: 0, overflow: "hidden" }}>

                    {/* ── SIDEBAR ── */}
                    {showSidebar && (
                        <div className="sidebar-wrapper customer-sidebar-nav"
                            style={{
                                width: isMobile ? "100%" : 320,
                                flexShrink: 0,
                                display: "flex",
                                flexDirection: "column",
                                background: "#f8f9fa",
                                transition: "width 0.3s ease"
                            }}>
                            {/* Sidebar Logo Header */}
                            <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom" style={{ background: "#fafafa", minHeight: 44 }}>
                                <span className="fw-bold fs-14 text-dark text-uppercase letter-spacing-1">femi9</span>
                                {isMobile && (
                                    <button className="btn btn-light btn-sm p-1" onClick={() => setShowSidebar(false)}>
                                        <i className="ti ti-x fs-14" />
                                    </button>
                                )}
                            </div>

                            {/* Sidebar Action Header */}
                            <div className="cv-sidebar-header">
                                <div className="d-flex align-items-center justify-content-between w-100">
                                    <div className="dropdown">
                                        <button className="btn p-0 border-0 bg-transparent d-flex align-items-center gap-1 fw-bold fs-13 text-dark"
                                            data-bs-toggle="dropdown">
                                            {viewFilter}
                                            <i className="ti ti-chevron-down fs-11 ms-1" style={{ color: "#e41f07" }} />
                                        </button>
                                        <div className="dropdown-menu shadow-sm border-0 py-1" style={{ minWidth: 180 }}>
                                            {["All Customers", "Active Customers", "Inactive Customers"].map(v => (
                                                <button key={v}
                                                    className={`dropdown-item fs-14 py-2 ${viewFilter === v ? "active" : ""}`}
                                                    onClick={() => setViewFilter(v)}>
                                                    {v}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                        <button className="btn d-flex align-items-center justify-content-center p-0 rounded"
                                            style={{ width: 24, height: 24, background: "#e41f07", border: "none", color: "#fff" }}
                                            onClick={() => navigate(route.customerAdd)}>
                                            <i className="ti ti-plus fs-13" />
                                        </button>
                                        <div className="dropdown">
                                            <button className="btn btn-light d-flex align-items-center justify-content-center p-0 rounded border"
                                                style={{ width: 24, height: 24, background: "#fff" }} data-bs-toggle="dropdown">
                                                <i className="ti ti-dots fs-13 text-muted" />
                                            </button>
                                            <div className="dropdown-menu dropdown-menu-end shadow border-0 py-1">
                                                <button className="dropdown-item fs-14 py-2" onClick={() => { setCustomers(getAllRaw().filter(c => !c.isDeleted)); setSideSearch(""); }}>Refresh List</button>
                                                <div className="dropdown-divider" />
                                                <button className="dropdown-item fs-14 py-2">Import Customers</button>
                                                <button className="dropdown-item fs-14 py-2">Export Customers</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar search */}
                            <div className="px-2 py-2 border-bottom bg-white" style={{ flexShrink: 0 }}>
                                <div className="input-group input-group-sm">
                                    <span className="input-group-text bg-transparent border-end-0">
                                        <i className="ti ti-search fs-13 text-muted" />
                                    </span>
                                    <input className="form-control border-start-0 ps-0 fs-13"
                                        placeholder="Search..."
                                        value={sideSearch}
                                        onChange={e => setSideSearch(e.target.value)} />
                                </div>
                            </div>

                            {/* Customer rows */}
                            <div className="flex-grow-1 overflow-auto custom-scrollbar" style={{ minHeight: 0 }}>
                                {sidebarList.length === 0 && (
                                    <div className="p-4 text-center text-muted fs-13">No customers</div>
                                )}
                                {sidebarList.map(c => (
                                    <div key={c.id}
                                        className={`cv-sidebar-item ${selected?.id === c.id ? "active" : ""}`}
                                        onClick={() => {
                                            setSelected(c);
                                            navigate(route.customerView.replace(":id", String(c.id)), { replace: true });
                                            if (isMobile) setShowSidebar(false);
                                        }}>
                                        <input type="checkbox" className="cv-sidebar-chk"
                                            onClick={e => e.stopPropagation()} readOnly />
                                        <div className="cv-sidebar-info">
                                            <div className="cv-sidebar-name text-truncate">{c.name}</div>
                                            <div className="cv-sidebar-bal">{fmt(c.receivables)}</div>
                                        </div>
                                        <i className="ti ti-paperclip cv-sidebar-clip" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── DETAIL PANEL ── */}
                    {selected && (
                        <div key={selected.id} className={`flex-grow-1 d-flex flex-column bg-white customer-detail-wrapper cv-fade-in${isMobile ? "" : " overflow-hidden"}`} style={{ minWidth: 0 }}>

                            {/* Tab bar */}
                            <div className="d-flex align-items-center border-bottom px-2 bg-white custom-scrollbar"
                                style={{ flexShrink: 0, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                                {TABS.map(t => (
                                    <button key={t.key}
                                        onClick={() => setTab(t.key)}
                                        className="btn border-0 py-3 px-3 fs-14 fw-medium flex-shrink-0"
                                        style={{
                                            background: "transparent",
                                            color: tab === t.key ? "#e41f07" : "#6c757d",
                                            borderBottom: tab === t.key ? "2px solid #e41f07" : "2px solid transparent",
                                            borderRadius: 0,
                                        }}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* Tab content */}
                            <div className="flex-grow-1 detail-pane-content" style={{ background: "#f7f8fa", minHeight: isMobile ? "auto" : 0, display: "flex", flexDirection: "column" }}>

                                {/* ── OVERVIEW ── */}
                                {tab === "overview" && (
                                    <div className="cv-overview-split flex-grow-1">

                                        {/* ── LEFT: Contact Info Panel ── */}
                                        <div className="cv-overview-left custom-scrollbar p-3">

                                            {/* ── Unified Profile & Contact Box ── */}
                                            <div className="mb-4" style={{ background: "#f8f9fa", borderRadius: "12px", overflow: "hidden" }}>
                                                {/* Profile display name */}
                                                <div className="px-3 py-3 border-bottom d-flex align-items-center justify-content-between" style={{ borderColor: "#e5e7eb !important" }}>
                                                    <span className="fs-15 text-dark">{selected.name || "COMPANY INFO"}</span>
                                                </div>
                                                {contactPersons.length === 0 ? null : (
                                                    <div className="cv-cp-cards py-3 px-3 m-0" style={{ gap: 0 }}>
                                                        {contactPersons.map(cp => (
                                                            <div key={cp.id} className={`d-flex align-items-start ${!cp.isEnabled ? "cv-cp-disabled" : ""}`} style={{ background: "transparent", border: "none" }}>
                                                                {/* Avatar - Exact Solid Match */}
                                                                <div className="flex-shrink-0" style={{ width: 50, height: 50, borderRadius: 8, background: "#c2c2c2", display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                                                                    <svg width="42" height="40" viewBox="0 0 24 24" fill="none" style={{ marginBottom: "-4px" }}>
                                                                        <circle cx="12" cy="8" r="4.5" fill="#ffffff"/>
                                                                        <path d="M4 22C4 17.5817 7.58172 14 12 14C16.4183 14 20 17.5817 20 22H4Z" fill="#ffffff"/>
                                                                    </svg>
                                                                </div>
                                                                {/* Info */}
                                                                <div className="ms-3 flex-grow-1 min-w-0">
                                                                    <div className="d-flex align-items-center justify-content-between mb-1">
                                                                        <div className="d-flex align-items-center gap-2">
                                                                            <span className="fs-15 fw-bold text-truncate" style={{ color: "#111827" }}>{cp.salutation} {cp.firstName} {cp.lastName}</span>
                                                                            {cp.isPrimary && <span className="cv-cp-badge primary">PRIMARY</span>}
                                                                            {!cp.isEnabled && <span className="cv-cp-badge inactive">INACTIVE</span>}
                                                                        </div>
                                                                        {/* Settings gear */}
                                                                        <div className="dropdown cv-cp-card-gear ms-2">   
                                                                            <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0 py-1" style={{ minWidth: 160 }}>
                                                                                <li><button className="dropdown-item fs-13 py-2" onClick={() => openEditContact(cp)}><i className="ti ti-pencil me-2 text-muted" />Edit</button></li>
                                                                                {!cp.isPrimary && <li><button className="dropdown-item fs-13 py-2" onClick={() => markPrimary(cp.id)}><i className="ti ti-star me-2 text-muted" />Mark as Primary</button></li>}
                                                                                <li><button className="dropdown-item fs-13 py-2" onClick={() => toggleContact(cp.id)}><i className={`ti ${cp.isEnabled ? "ti-toggle-left" : "ti-toggle-right"} me-2 text-muted`} />{cp.isEnabled ? "Disable" : "Enable"}</button></li>
                                                                                <li><hr className="dropdown-divider" /></li>
                                                                                <li><button className="dropdown-item fs-13 py-2 text-danger" onClick={() => deleteContact(cp.id)}><i className="ti ti-trash me-2" />Delete</button></li>
                                                                            </ul>
                                                                        </div>
                                                                    </div>
                                                                    {cp.email && <div className="fs-14 text-dark text-truncate mb-1" style={{ lineHeight: "1.3" }}>{cp.email}</div>}
                                                                    {cp.workPhone && (
                                                                        <div className="fs-14 text-dark d-flex align-items-center mb-2" style={{ lineHeight: "1.3" }}>
                                                                            <i className="ti ti-phone fs-13 me-1" />+91-{cp.workPhone.replace(/^\+91[-\s]?/, "")}
                                                                        </div>
                                                                    )}
                                                                    {cp.portalAccess ? (
                                                                        <div className="mt-1" style={{ lineHeight: "1.4" }}>
                                                                            <div className="fs-13 fw-medium" style={{ color: "#ff8c42" }}>Portal invitation not accepted</div>
                                                                            <button className="btn btn-link p-0 text-decoration-none fs-13 mt-1" style={{ color: "#317af1" }} onClick={() => showNotify(`Portal invite sent to ${cp.email}`)}>Re-invite</button>
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Address */}
                                            <div className="cv-section-header" onClick={() => setAddrOpen(o => !o)}>
                                                <span className="text-uppercase letter-spacing-1 fs-12 fw-bold text-dark">ADDRESS</span>
                                                <i className={`ti ti-chevron-${addrOpen ? "up" : "down"} fs-12`} style={{ color: "#e41f07" }} />
                                            </div>
                                            {addrOpen && (
                                                <div className="px-4 pb-4 pt-1">
                                                    <div className="mb-4">
                                                        <div className="fs-13 fw-bold text-dark mb-2">Billing Address</div>
                                                        <div className="fs-13 text-muted">No Billing Address - <button className="btn btn-link p-0 hover-underline fs-13" style={{ color: "#e41f07" }} onClick={() => showNotify('Opening Billing Address form...')}>New Address</button></div>
                                                    </div>
                                                    <div>
                                                        <div className="fs-13 fw-bold text-dark mb-2">Shipping Address</div>
                                                        <div className="fs-13 text-muted">No Shipping Address - <button className="btn btn-link p-0 hover-underline fs-13" style={{ color: "#e41f07" }} onClick={() => showNotify('Opening Shipping Address form...')}>New Address</button></div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Other Details */}
                                            <div className="cv-section-header" onClick={() => setOtherOpen(o => !o)}>
                                                <span className="text-uppercase letter-spacing-1 fs-12 fw-bold text-dark">OTHER DETAILS</span>
                                                <i className={`ti ti-chevron-${otherOpen ? "up" : "down"} fs-12`} style={{ color: "#e41f07" }} />
                                            </div>
                                            {otherOpen && (
                                                <div className="px-4 pb-4 pt-1">
                                                    {(() => {
                                                        const enabledCount = contactPersons.filter(cp => cp.portalAccess && cp.isEnabled).length;
                                                        const totalCount = contactPersons.length;
                                                        const portalStatusVal = (
                                                            <div className="d-flex align-items-center justify-content-between w-100">
                                                                {enabledCount > 0
                                                                    ? <span className="text-success d-flex align-items-center gap-1"><i className="ti ti-circle-filled fs-8" /> Enabled <span className="text-muted fw-normal">({enabledCount} of {totalCount} Contacts)</span></span>
                                                                    : <span className="text-danger d-flex align-items-center gap-1"><i className="ti ti-circle-filled fs-8" /> Disabled</span>}
                                                                {contactPersons.length > 0 && (
                                                                    <button className="btn p-0 border-0 bg-transparent text-secondary ms-2 hover-opacity" title="Configure Portal Access" onClick={openPortalConfig}>
                                                                        <i className="ti ti-settings fs-15" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                        return [
                                                            { label: "Customer Type", value: "Business" },
                                                            { label: "Default Currency", value: "INR - Indian Rupee" },
                                                            { label: "Payment Terms", value: "Due on Receipt" },
                                                            { label: "PAN", value: "jhhgfxcz" },
                                                            { label: "Portal Status", value: portalStatusVal },
                                                            { label: "Customer Language", value: "English" },
                                                        ].map((row, i) => (
                                                            <div key={i} className="row g-2 py-2 border-bottom" style={{ borderColor: "#f8f9fa" }}>
                                                                <div className="col-5 fs-13 text-muted">{row.label}</div>
                                                                <div className="col-7 fs-13 text-dark fw-medium text-break">{row.value}</div>
                                                            </div>
                                                        ));
                                                    })()}
                                                </div>
                                            )}

                                                {/* ── CONTACT PERSONS Section ── */}
                                                <div className="cv-section-header" onClick={() => setContactPersonsOpen(o => !o)}>
                                                    <span className="text-uppercase letter-spacing-1 fs-12 fw-bold text-dark">CONTACT PERSONS</span>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <button
                                                            className="d-flex align-items-center justify-content-center rounded-circle border-0"
                                                            style={{ width: 20, height: 20, background: '#347aeb', color: '#fff', cursor: 'pointer' }}
                                                            onClick={e => { e.stopPropagation(); openAddContact(); }}
                                                            title="Add contact person">
                                                            <i className="ti ti-plus" style={{ fontSize: 11 }} />
                                                        </button>
                                                        <i className={`ti ti-chevron-${contactPersonsOpen ? 'up' : 'down'} fs-12`} style={{ color: '#6c757d' }} />
                                                    </div>
                                                </div>
                                                {contactPersonsOpen && (
                                                    <div className="px-3 pb-3 pt-1">
                                                        {contactPersons.length === 0 ? (
                                                            <div className="fs-13 text-muted py-2">No contact persons found.</div>
                                                        ) : contactPersons.map(cp => (
                                                            <div key={cp.id} className="d-flex align-items-center justify-content-between py-2 border-bottom" style={{ borderColor: '#f1f5f9' }}>
                                                                <div>
                                                                    <div className="fs-13 fw-semibold text-dark">{cp.salutation} {cp.firstName} {cp.lastName}</div>
                                                                    {cp.email && <div className="fs-12 text-muted">{cp.email}</div>}
                                                                </div>
                                                                <button className="btn btn-sm p-1 border-0" onClick={() => openEditContact(cp)} title="Edit">
                                                                    <i className="ti ti-pencil fs-12 text-muted" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* ── Request Review Card ── */}
                                                <div className="mx-3 my-3 p-3 rounded" style={{ background: '#f0faf0', border: '1px solid #c3e6cb' }}>
                                                    <div className="d-flex align-items-center gap-2 mb-2">
                                                        <span style={{ fontSize: 20 }}>🙂</span>
                                                        <span className="fs-13 text-dark fw-medium">Would you like to know how much your customers like your service?</span>
                                                    </div>
                                                    <button className="btn btn-sm btn-outline-secondary fs-12 w-100" style={{ borderRadius: 4 }}
                                                        onClick={() => showNotify('Request Review feature coming soon')}>Request Review</button>
                                                </div>

                                                {/* ── RECORD INFO Section ── */}
                                                <div className="cv-section-header" onClick={() => setRecordInfoOpen(o => !o)}>
                                                    <span className="text-uppercase letter-spacing-1 fs-12 fw-bold text-dark">RECORD INFO</span>
                                                    <i className={`ti ti-chevron-${recordInfoOpen ? 'up' : 'down'} fs-12`} style={{ color: '#6c757d' }} />
                                                </div>
                                                {recordInfoOpen && (
                                                    <div className="px-4 pb-4 pt-1">
                                                        {[
                                                            { label: 'Created By', value: 'vijayfemi9-png' },
                                                            { label: 'Created Date', value: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
                                                            { label: 'Last Modified By', value: 'vijayfemi9-png' },
                                                            { label: 'Last Modified Date', value: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
                                                        ].map((row, i) => (
                                                            <div key={i} className="row g-2 py-2 border-bottom" style={{ borderColor: '#f8f9fa' }}>
                                                                <div className="col-5 fs-13 text-muted">{row.label}</div>
                                                                <div className="col-7 fs-13 text-dark fw-medium">{row.value}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                        </div>

                                        {/* ── RIGHT: Business Data Panel ── */}
                                        <div className="cv-overview-right custom-scrollbar">

                                            {/* Payment due – inline editable */}
                                            <PaymentDueCard />

                                            {/* Receivables Table */}
                                            <div className="cv-recv-card mb-4">
                                                <div className="px-3 pb-2">
                                                    <h5 className="mb-0 fw-semibold text-dark fs-16">Receivables</h5>
                                                </div>
                                                <div className="cv-recv-table-wrap mt-2">
                                                    <table className="table mb-0 border-top" style={{ borderColor: "#f1f5f9" }}>
                                                        <thead style={{ background: "#f8f9fa" }}>
                                                            <tr>
                                                                <th className="border-0 fs-11 text-muted fw-bold py-2 px-3" style={{ color: "#8b93a6" }}>CURRENCY</th>
                                                                <th className="border-0 text-end fs-11 text-muted fw-bold py-2 px-3" style={{ color: "#8b93a6" }}>OUTSTANDING<br />RECEIVABLES</th>
                                                                <th className="border-0 text-end fs-11 text-muted fw-bold py-2 px-3" style={{ color: "#8b93a6" }}>UNUSED CREDITS</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr className="border-bottom" style={{ borderColor: "#f1f5f9", background: "#fff" }}>
                                                                <td className="border-0 py-3 px-3 fs-14 fw-medium text-dark">INR- Indian Rupee</td>
                                                                <td className="border-0 text-end py-3 px-3 fs-14 text-dark align-middle">
                                                                    <span className="cv-recv-amount">{fmt(selected.receivables)}</span>
                                                                </td>
                                                                <td className="border-0 text-end py-3 px-3 fs-14 text-dark align-middle">
                                                                    <span className="cv-recv-amount">{fmt(selected.unusedCredits)}</span>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="cv-recv-inline-status px-3 py-3 d-flex align-items-center gap-3 fs-14" style={{ background: "#fcfcfd", borderBottom: "1px solid #f1f5f9" }}>
                                                    <span className="text-secondary">Items to be packed: <strong style={{ color: "#e41f07" }}>0</strong></span>
                                                    <span className="text-muted" style={{ opacity: 0.3 }}>|</span>
                                                    <span className="text-secondary">Items to be shipped: <strong style={{ color: "#e41f07" }}>0</strong></span>
                                                </div>
                                            </div>

                                            {/* Timeline */}
                                            <div className="cv-act-timeline mt-4" style={{ pointerEvents: 'none' }}>
                                                {timelineData.map((item, i, arr) => (
                                                    <div key={i} className={`cv-act-row${i === 0 ? " cv-act-row-first" : ""}${i === arr.length - 1 ? " cv-act-row-last" : ""}`}>
                                                        {/* Date / Time */}
                                                        <div className="cv-act-left text-end pe-3">
                                                            <div className="cv-act-date">{item.date}</div>
                                                            <div className="cv-act-time">{item.time}</div>
                                                        </div>
                                                        {/* Node — cv-act-node draws continuous ::before line */}
                                                        <div className="cv-act-node">
                                                            <div className="cv-act-icon-wrap">
                                                                <i className="ti ti-message fs-14" />
                                                            </div>
                                                        </div>
                                                        {/* Card */}
                                                        <div className="cv-act-card">
                                                            <div className="bg-white border rounded p-2" style={{ borderColor: '#e9ecef', pointerEvents: 'auto' }}>
                                                                <div className="cv-act-title fs-15 text-dark mb-1">{item.title}</div>
                                                                <div className="cv-act-desc fs-14" style={{ color: '#6b7280' }}>{item.desc}</div>
                                                                <div className="fs-14 fw-bold mt-1" style={{ color: '#5c6b89' }}>by error 404</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {tab !== "overview" && (
                                    <div className="flex-grow-1 overflow-auto custom-scrollbar" style={{ minHeight: 0 }}>
                                        {tab === "comments" && <CommentsTab customerId={selected?.id ?? 0} />}
                                        {tab === "transactions" && <EmptyTab icon="ti ti-receipt" title="No Transactions" sub="No transactions recorded yet." />}
                                        {tab === "statement" && <StatementTab customer={selected} />}
                                        {tab === "history" && <HistoryTab customer={selected} />}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Action Modals & Toasts ── */}

            {/* Associate Templates Modal */}
            {actionModal === 'associate-templates' && (
                <div className="modal fade show d-block" role="dialog" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                    onClick={e => { if (e.target === e.currentTarget) setActionModal('none'); }}>
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header py-3">
                                <h5 className="modal-title fw-bold fs-15">Associate Templates</h5>
                                <button type="button" className="btn-close custom-btn-close border me-0 d-flex align-items-center justify-content-center rounded-circle"
                                    style={{ width: 24, height: 24, padding: 0, flexShrink: 0 }}
                                    onClick={() => setActionModal('none')}>
                                    <i className="ti ti-x" style={{ fontSize: 12 }} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <p className="fs-13 text-muted mb-3">
                                    Choose the PDF templates to associate with this customer. These will be used when sending documents.
                                </p>
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <span className="fs-13 fw-semibold text-dark">PDF Templates</span>
                                    <button className="btn btn-outline-primary btn-sm fs-12 px-3">
                                        <i className="ti ti-plus me-1" />New PDF Template
                                    </button>
                                </div>
                                {["Customer Statement", "Sales Orders", "Invoices", "Credit Notes", "Payment Thank You"].map(label => (
                                    <div key={label} className="row g-2 mb-2 align-items-center">
                                        <label className="col-sm-5 col-form-label fs-13 text-muted">{label}</label>
                                        <div className="col-sm-7">
                                            <select className="form-select form-select-sm fs-13">
                                                <option>Standard Template</option>
                                                <option>Spreadsheet Template</option>
                                                <option>Elite Template</option>
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-light me-2" onClick={() => setActionModal('none')}>Cancel</button>
                                <button className="btn btn-primary" onClick={() => { setActionModal('none'); showNotify('Templates saved successfully'); }}>Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Configure Portal Access Modal */}
            {actionModal === 'configure-portal' && (
                <div className="modal fade show d-block" role="dialog" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                    onClick={e => { if (e.target === e.currentTarget) setActionModal('none'); }}>
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header py-3">
                                <h5 className="modal-title fw-bold fs-15">Configure Portal Access</h5>
                                <button type="button" className="btn-close custom-btn-close border me-0 d-flex align-items-center justify-content-center rounded-circle"
                                    style={{ width: 24, height: 24, padding: 0, flexShrink: 0 }}
                                    onClick={() => setActionModal('none')}>
                                    <i className="ti ti-x" style={{ fontSize: 12 }} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <p className="fs-13 text-muted mb-3">
                                    Select the contact persons who should have access to the customer portal.
                                </p>
                                <table className="table table-sm mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th style={{ width: 36 }}></th>
                                            <th className="fs-12 fw-bold text-uppercase">Name</th>
                                            <th className="fs-12 fw-bold text-uppercase">Email Address</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {contactPersons.length === 0 ? (
                                            <tr><td colSpan={3} className="text-center text-muted fs-13 py-3">No contact persons added yet.</td></tr>
                                        ) : contactPersons.map(cp => (
                                            <tr key={cp.id}>
                                                <td>
                                                    <input type="checkbox" className="form-check-input"
                                                        checked={!!portalAccessMap[cp.id]}
                                                        onChange={e => setPortalAccessMap(m => ({ ...m, [cp.id]: e.target.checked }))} />
                                                </td>
                                                <td className="fs-13">{cp.salutation} {cp.firstName} {cp.lastName}</td>
                                                <td className="fs-13 text-muted">{cp.email || "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-light me-2 " onClick={() => setActionModal('none')}>Cancel</button>
                                <button className="btn btn-primary" onClick={() => {
                                    if (!selected) return;
                                    const updated = contactPersons.map(cp => ({ ...cp, portalAccess: !!portalAccessMap[cp.id] }));
                                    saveContacts(selected.id, updated);
                                    setContactPersons(updated);
                                    setActionModal('none');
                                    showNotify('Portal access updated');
                                }}>Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Link to Vendor Modal */}
            {actionModal === 'link-vendor' && (
                <div className="modal fade show d-block" role="dialog" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                    onClick={e => { if (e.target === e.currentTarget) setActionModal('none'); }}>
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header py-3">
                                <h5 className="modal-title fw-bold fs-15">Link to Vendor</h5>
                                <button type="button" className="btn-close custom-btn-close border me-0 d-flex align-items-center justify-content-center rounded-circle"
                                    style={{ width: 24, height: 24, padding: 0, flexShrink: 0 }}
                                    onClick={() => setActionModal('none')}>
                                    <i className="ti ti-x" style={{ fontSize: 12 }} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <p className="fs-13 text-muted mb-4">
                                    Link this customer to a vendor in your organization. This helps in tracking transactions between the customer and vendor.
                                </p>
                                <label className="form-label fs-13 fw-semibold mb-1">Choose a vendor to link</label>
                                <select className="form-select fs-14" value={linkVendorId} onChange={e => setLinkVendorId(e.target.value)}>
                                    <option value="">Select Vendor</option>
                                    <option value="v1">Vendor A</option>
                                    <option value="v2">Vendor B</option>
                                    <option value="v3">Vendor C</option>
                                </select>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-light me-2" onClick={() => setActionModal('none')}>Cancel</button>
                                <button className="btn btn-primary" disabled={!linkVendorId}
                                    onClick={() => { setActionModal('none'); showNotify('Vendor linked successfully'); }}>
                                    Link
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Clone Customer Modal */}
            {actionModal === 'clone' && (
                <div className="modal fade show d-block" role="dialog" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                    onClick={e => { if (e.target === e.currentTarget) setActionModal('none'); }}>
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header py-3">
                                <h5 className="modal-title fw-bold fs-15">Clone</h5>
                                <button type="button" className="btn-close custom-btn-close border me-0 d-flex align-items-center justify-content-center rounded-circle"
                                    style={{ width: 24, height: 24, padding: 0, flexShrink: 0 }}
                                    onClick={() => setActionModal('none')}>
                                    <i className="ti ti-x" style={{ fontSize: 12 }} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <p className="fs-13 text-muted mb-3">Clone <strong>{selected?.name}</strong> as a:</p>
                                <div className="d-flex flex-column gap-3">
                                    <div className="form-check">
                                        <input type="radio" className="form-check-input" id="clone-customer"
                                            name="cloneType" checked={cloneType === 'Customer'}
                                            onChange={() => setCloneType('Customer')} />
                                        <label htmlFor="clone-customer" className="form-check-label fs-14">Customer</label>
                                    </div>
                                    <div className="form-check">
                                        <input type="radio" className="form-check-input" id="clone-vendor"
                                            name="cloneType" checked={cloneType === 'Vendor'}
                                            onChange={() => setCloneType('Vendor')} />
                                        <label htmlFor="clone-vendor" className="form-check-label fs-14">Vendor</label>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-light me-2" onClick={() => setActionModal('none')}>Cancel</button>
                                <button className="btn btn-primary" onClick={() => { handleClone(); setActionModal('none'); }}>Proceed</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Merge Customers Modal */}
            {actionModal === 'merge' && (
                <div className="modal fade show d-block" role="dialog" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                    onClick={e => { if (e.target === e.currentTarget) { setActionModal('none'); setMergeTargetId(null); } }}>
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header py-3">
                                <h5 className="modal-title fw-bold fs-15">Merge Customers</h5>
                                <button type="button" className="btn-close custom-btn-close border me-0 d-flex align-items-center justify-content-center rounded-circle"
                                    style={{ width: 24, height: 24, padding: 0, flexShrink: 0 }}
                                    onClick={() => { setActionModal('none'); setMergeTargetId(null); }}>
                                    <i className="ti ti-x" style={{ fontSize: 12 }} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <p className="fs-13 text-muted mb-4">
                                    You are about to merge <strong className="text-dark">{selected?.name}</strong> with the selected customer. All transactions, contacts and data will be moved to the selected customer and <strong className="text-dark">{selected?.name}</strong> will be deleted. This action cannot be undone.
                                </p>
                                <select className="form-select fs-14"
                                    value={mergeTargetId || ''}
                                    onChange={e => setMergeTargetId(Number(e.target.value) || null)}>
                                    <option value="">Select Customer</option>
                                    {customers.filter(c => c.id !== selected?.id).map(c => (
                                        <option key={c.id} value={c.id}>{c.name}{c.companyName ? ` (${c.companyName})` : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-light me-2" onClick={() => { setActionModal('none'); setMergeTargetId(null); }}>Cancel</button>
                                <button className="btn btn-primary" disabled={!mergeTargetId} onClick={handleMerge}>Continue</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {notification && (
                <div style={{
                    position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
                    background: notification.type === 'error' ? "#ef4444" : "#1f2937",
                    color: "#fff", padding: "12px 24px", borderRadius: 8,
                    display: "flex", alignItems: "center", gap: "8px",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
                    zIndex: 9999, animation: "cvFadeAndSlide 0.3s ease"
                }}>
                    <i className={notification.type === 'error' ? "ti ti-alert-circle fs-18" : "ti ti-check fs-18"} />
                    <span className="fs-14 fw-medium">{notification.msg}</span>
                </div>
            )}

            {/* ── Add / Edit Contact Person Modal ── */}
            {showContactModal && (
                <div className="modal fade show d-block" role="dialog" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2200 }}
                    onClick={e => { if (e.target === e.currentTarget) setShowContactModal(false); }}>
                    <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: 820 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-content">
                            {/* Header */}
                            <div className="modal-header py-3">
                                <h5 className="modal-title fw-bold fs-15">{editingContact ? "Edit Contact Person" : "Add Contact Person"}</h5>
                                <button
                                    type="button"
                                    className="custom-btn-close border me-0 d-flex align-items-center justify-content-center rounded-circle"
                                    style={{ width: 24, height: 24, padding: 0, flexShrink: 0, background: 'transparent', boxShadow: 'none', outline: 'none', color: '#6c757d', border: '1px solid #dee2e6', cursor: 'pointer' }}
                                    onClick={() => setShowContactModal(false)}>
                                    <i className="ti ti-x" style={{ fontSize: 12 }} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="modal-body d-flex gap-4" style={{ overflowY: "auto" }}>

                                {/* Left: Form */}
                                <div className="flex-grow-1" style={{ minWidth: 0 }}>

                                    {/* Name */}
                                    <div className="row g-2 mb-3">
                                        <label className="col-sm-3 col-form-label fw-semibold fs-13">Name</label>
                                        <div className="col-sm-9 d-flex gap-2">
                                            <select className="form-select form-select-sm" style={{ width: 90, flexShrink: 0 }}
                                                value={cpForm.salutation}
                                                onChange={e => setCpForm(f => ({ ...f, salutation: e.target.value }))}>
                                                {["Mr.", "Mrs.", "Ms.", "Miss.", "Dr."].map(s => <option key={s}>{s}</option>)}
                                            </select>
                                            <input className="form-control form-control-sm" placeholder="First Name"
                                                value={cpForm.firstName}
                                                onChange={e => setCpForm(f => ({ ...f, firstName: e.target.value }))} />
                                            <input className="form-control form-control-sm" placeholder="Last Name"
                                                value={cpForm.lastName}
                                                onChange={e => setCpForm(f => ({ ...f, lastName: e.target.value }))} />
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div className="row g-2 mb-3">
                                        <label className="col-sm-3 col-form-label fw-semibold fs-13">Email Address</label>
                                        <div className="col-sm-9">
                                            <input className="form-control form-control-sm" type="email"
                                                value={cpForm.email}
                                                onChange={e => setCpForm(f => ({ ...f, email: e.target.value }))} />
                                        </div>
                                    </div>

                                    {/* Work Phone */}
                                    <div className="row g-2 mb-2">
                                        <label className="col-sm-3 col-form-label fw-semibold fs-13">Phone</label>
                                        <div className="col-sm-9 d-flex flex-column gap-2">
                                            <div className="input-group input-group-sm">
                                                <select className="form-select form-select-sm" style={{ maxWidth: 72 }}>
                                                    <option>+91</option><option>+1</option><option>+44</option><option>+61</option>
                                                </select>
                                                <input className="form-control form-control-sm" placeholder="Work Phone"
                                                    value={cpForm.workPhone}
                                                    onChange={e => setCpForm(f => ({ ...f, workPhone: e.target.value }))} />
                                            </div>
                                            <div className="input-group input-group-sm">
                                                <select className="form-select form-select-sm" style={{ maxWidth: 72 }}>
                                                    <option>+91</option><option>+1</option><option>+44</option><option>+61</option>
                                                </select>
                                                <input className="form-control form-control-sm" placeholder="Mobile"
                                                    value={cpForm.mobile}
                                                    onChange={e => setCpForm(f => ({ ...f, mobile: e.target.value }))} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Skype */}
                                    <div className="row g-2 mb-3">
                                        <label className="col-sm-3 col-form-label fw-semibold fs-13">Skype Name/Number</label>
                                        <div className="col-sm-9">
                                            <div className="input-group input-group-sm">
                                                <span className="input-group-text bg-white">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#00aff0"><path d="M22.5 13.5c0 5.799-4.701 10.5-10.5 10.5a10.46 10.46 0 01-5.473-1.536A6.5 6.5 0 011.5 16.5 6.5 6.5 0 017.95 10.1a10.5 10.5 0 0114.55 3.4zM12 1.5c2.348 0 4.51.77 6.25 2.063A6.5 6.5 0 0122.5 9.5a6.48 6.48 0 01-1.56 4.25A10.47 10.47 0 0112 1.5z" /></svg>
                                                </span>
                                                <input className="form-control form-control-sm" placeholder="Skype Name/Number"
                                                    value={cpForm.skype}
                                                    onChange={e => setCpForm(f => ({ ...f, skype: e.target.value }))} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Other Details */}
                                    <div className="row g-2 mb-3">
                                        <label className="col-sm-3 col-form-label fw-semibold fs-13">Other Details</label>
                                        <div className="col-sm-9 d-flex gap-2">
                                            <input className="form-control form-control-sm" placeholder="Designation"
                                                value={cpForm.designation}
                                                onChange={e => setCpForm(f => ({ ...f, designation: e.target.value }))} />
                                            <input className="form-control form-control-sm" placeholder="Department"
                                                value={cpForm.department}
                                                onChange={e => setCpForm(f => ({ ...f, department: e.target.value }))} />
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Image upload — single image, compressed to <10MB */}
                                <div className="flex-shrink-0 d-flex flex-column" style={{ width: 200 }}>
                                    <div
                                        className="border rounded text-center p-2 h-100 d-flex flex-column align-items-center justify-content-center"
                                        style={{ borderStyle: 'dashed', borderColor: '#dee2e6', background: '#fafafa', cursor: 'pointer', minHeight: 180 }}
                                        onClick={() => document.getElementById('cp-img-input')?.click()}
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={e => {
                                            e.preventDefault();
                                            const file = e.dataTransfer.files?.[0];
                                            if (file) handleCpImage(file);
                                        }}
                                    >
                                        <input
                                            id="cp-img-input"
                                            type="file"
                                            accept="image/jpg,image/jpeg,image/png,image/gif,image/bmp"
                                            style={{ display: 'none' }}
                                            onChange={e => { const f = e.target.files?.[0]; if (f) handleCpImage(f); e.target.value = ''; }}
                                        />
                                        {cpImage ? (
                                            <>
                                                <div style={{ position: 'relative', width: 140, height: 140 }}>
                                                    <img src={cpImage} alt="Profile" style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                                                    <button
                                                        type="button"
                                                        onClick={e => { e.stopPropagation(); setCpImage(null); }}
                                                        style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', background: '#e41f07', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                                                        <i className="ti ti-x" style={{ fontSize: 11 }} />
                                                    </button>
                                                </div>
                                                <p className="text-muted fs-11 mt-2 mb-0">Click to change</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="rounded-circle d-flex align-items-center justify-content-center mb-2" style={{ width: 40, height: 40, background: '#e41f07' }}>
                                                    <i className="ti ti-upload text-white fs-18" />
                                                </div>
                                                <p className="fw-bold fs-13 mb-1">Drag &amp; Drop or Click</p>
                                                <p className="text-muted fs-11 mb-0">jpg, jpeg, png, gif, bmp</p>
                                                <p className="text-muted fs-11 mb-2">Max: 10MB (auto-compressed)</p>
                                                <span className="fs-12 fw-semibold" style={{ color: '#347aeb', textDecoration: 'underline' }}>Upload File</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Portal access */}
                            <div className="px-3 py-3 border-top border-bottom">
                                <div className="form-check d-flex align-items-start gap-2">
                                    <input type="checkbox" className="form-check-input mt-1" id="cp-portal"
                                        checked={cpForm.portalAccess}
                                        onChange={e => setCpForm(f => ({ ...f, portalAccess: e.target.checked }))} />
                                    <div>
                                        <label htmlFor="cp-portal" className="form-check-label fw-semibold fs-14">Enable portal access</label>
                                        <p className="text-muted fs-13 mb-0 mt-1">
                                            This customer will be able to see all their transactions with your organization by logging in to the portal using their email address.{" "}
                                            <a href="#" className="text-primary fw-semibold">Learn More</a>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="modal-footer">
                                <button className="btn btn-light me-2" onClick={() => setShowContactModal(false)}>Cancel</button>
                                <button className="btn btn-primary" disabled={!cpForm.firstName.trim()} onClick={saveContact}>Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal (Template Standard) */}
            {showDeleteConfirm && (
                <div
                    style={{
                        position: "fixed", inset: 0, zIndex: 2100,
                        background: "rgba(0,0,0,0.45)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}
                >
                    <div
                        className="bg-white shadow-lg text-center"
                        style={{ borderRadius: 12, width: "100%", maxWidth: 380, padding: "32px 28px" }}
                    >
                        <div
                            className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
                            style={{ width: 60, height: 60, background: "#fff0ef" }}
                        >
                            <i className="ti ti-trash text-danger" style={{ fontSize: 26 }} />
                        </div>
                        <h6 className="fw-bold fs-16 mb-1">Delete Customer?</h6>
                        <p className="text-muted fs-14 mb-4">
                            "<strong>{selected?.name}</strong>" will be permanently removed.
                        </p>
                        <div className="d-flex justify-content-center gap-3">
                            <button className="btn btn-light fs-14 px-4" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                            <button className="btn btn-danger fs-14 px-4" onClick={handleDelete}>
                                <i className="ti ti-trash me-1" />Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Configure Portal Access Modal */}
            {showPortalConfig && (
                <div
                    style={{
                        position: "fixed", inset: 0, zIndex: 2100,
                        background: "rgba(0,0,0,0.45)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowPortalConfig(false); }}
                >
                    <div
                        className="bg-white shadow-lg mx-3"
                        style={{ borderRadius: 12, width: "100%", maxWidth: 650, overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}
                    >
                        <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ flexShrink: 0 }}>
                            <h5 className="mb-0 fs-18 fw-medium text-dark" style={{ letterSpacing: "0.2px" }}>Configure Portal Access</h5>
                            <button className="btn p-0 border-0 bg-transparent text-danger hover-opacity" onClick={() => setShowPortalConfig(false)}>
                                <i className="ti ti-x fs-18" />
                            </button>
                        </div>

                        <div className="table-responsive" style={{ overflowY: "auto", flex: 1 }}>
                            <table className="table mb-0">
                                <thead className="border-top border-bottom" style={{ background: "#fcfdff" }}>
                                    <tr>
                                        <th className="text-uppercase text-muted fs-11 fw-bold letter-spacing-1 bg-transparent border-0 px-4 py-3" style={{ color: "#747f93" }}>NAME</th>
                                        <th className="text-uppercase text-muted fs-11 fw-bold letter-spacing-1 bg-transparent border-0 px-4 py-3" style={{ color: "#747f93" }}>EMAIL ADDRESS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contactPersons.map(cp => (
                                        <tr key={cp.id} className="border-bottom" style={{ background: "#ffffff" }}>
                                            <td className="px-4 py-3 border-0">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="form-check m-0 d-flex align-items-center justify-content-center">
                                                        <input 
                                                            type="checkbox" 
                                                            className="form-check-input m-0 cursor-pointer" 
                                                            style={{ width: 16, height: 16 }}
                                                            checked={!!portalAccessMap[cp.id]} 
                                                            onChange={e => setPortalAccessMap(prev => ({ ...prev, [cp.id]: e.target.checked }))} 
                                                        />
                                                    </div>
                                                    <span className="fs-14 text-dark" style={{ color: "#2d3748" }}>{cp.salutation} {cp.firstName} {cp.lastName}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 border-0 fs-14" style={{ color: "#2d3748" }}>{cp.email}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="modal-footer justify-content-start border-0 px-4 pb-4 pt-3" style={{ flexShrink: 0 }}>
                            <button className="btn btn-primary px-3 fs-14 fw-medium" onClick={savePortalConfig}>Save</button>
                            <button className="btn btn-light bg-white px-3 fs-14 fw-medium border shadow-sm" style={{ color: "#111827" }} onClick={() => setShowPortalConfig(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerView;
