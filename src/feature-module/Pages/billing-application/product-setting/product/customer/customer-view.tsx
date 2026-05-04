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
    const commentItemRef = React.useRef<HTMLDivElement>(null);
    const commentsEndRef = React.useRef<HTMLDivElement>(null);

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
        save([...comments, item]);
        if (editorRef.current) editorRef.current.innerHTML = "";
        setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
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

    const [activeFmts, setActiveFmts] = React.useState({ bold: false, italic: false, underline: false, insertUnorderedList: false });

    const updateFmtState = React.useCallback(() => {
        setActiveFmts({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
            insertUnorderedList: document.queryCommandState('insertUnorderedList'),
        });
    }, []);

    React.useEffect(() => {
        document.addEventListener('selectionchange', updateFmtState);
        return () => document.removeEventListener('selectionchange', updateFmtState);
    }, [updateFmtState]);

    const applyFmt = (cmd: string) => {
        editorRef.current?.focus();
        document.execCommand(cmd, false);
        setTimeout(updateFmtState, 0);
    };

    return (
        <div className="cv-comments-tab">

            {/* ── Editor ── */}
            <div className="cv-comment-editor">
                <div className="cv-comment-toolbar">
                    <button className={`cv-fmt-btn${activeFmts.bold ? ' active' : ''}`} onMouseDown={e => { e.preventDefault(); applyFmt("bold"); }} title="Bold"><strong>B</strong></button>
                    <button className={`cv-fmt-btn${activeFmts.italic ? ' active' : ''}`} onMouseDown={e => { e.preventDefault(); applyFmt("italic"); }} title="Italic"><em>I</em></button>
                    <button className={`cv-fmt-btn${activeFmts.underline ? ' active' : ''}`} onMouseDown={e => { e.preventDefault(); applyFmt("underline"); }} title="Underline"><span style={{ textDecoration: "underline" }}>U</span></button>
                    <div className="cv-toolbar-sep" />
                    <button className={`cv-fmt-btn${activeFmts.insertUnorderedList ? ' active' : ''}`} onMouseDown={e => { e.preventDefault(); applyFmt("insertUnorderedList"); }} title="Bullet list"><i className="ti ti-list" /></button>
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
                                                            editRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                                        }
                                                    }, 50);
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
                                        <div className="cv-edit-actions" ref={el => el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}>
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
                <div ref={commentsEndRef} />
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
    const [searchTerm, setSearchTerm] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    useClickOutside([dropdownRef], () => setIsOpen(false));

    const filteredTerms = PAYMENT_TERMS.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleSave = () => { setValue(draft); setEditing(false); setIsOpen(false); };
    const handleCancel = () => { setEditing(false); setIsOpen(false); };

    return (
        <div className="cv-pdue-card mb-4 mt-2 px-3">
            <div className="fs-14 fw-medium mb-2" style={{ color: "#74829c", letterSpacing: '0.02em' }}>Payment due period</div>
            {editing ? (
                <div className="position-relative" ref={dropdownRef} style={{ width: 'fit-content' }}>
                    <div
                        className="d-flex align-items-center border rounded shadow-sm overflow-hidden cursor-pointer"
                        style={{ height: '32px', minWidth: '180px', borderColor: '#408dfb', background: '#fff' }}
                        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                    >
                        <div className="flex-grow-1 px-2 fs-14 text-dark text-truncate" style={{ maxWidth: '85px' }}>
                            {draft}
                        </div>
                        <i className={`ti ti-chevron-${isOpen ? 'up' : 'down'} fs-10 me-2`} style={{ color: isOpen ? '#408dfb' : '#94a3b8' }} />
                        <div className="d-flex align-items-center h-100 border-start" style={{ borderColor: '#e2e8f0' }} onClick={e => e.stopPropagation()}>
                            <button className="btn p-0 d-flex align-items-center justify-content-center" style={{ width: 32, height: '100%', background: '#2eb872', border: 'none' }} onClick={handleSave}>
                                <i className="ti ti-check fs-12 text-white" />
                            </button>
                            <button className="btn p-0 d-flex align-items-center justify-content-center" style={{ width: 32, height: '100%', background: '#fff0f0', border: 'none' }} onClick={handleCancel}>
                                <i className="ti ti-x fs-12" style={{ color: '#ef4444' }} />
                            </button>
                        </div>
                    </div>

                    {isOpen && (
                        <div className="position-absolute start-0 w-100 mt-1 bg-white border rounded shadow-lg overflow-hidden" style={{ zIndex: 1000, minWidth: '240px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                            <div className="p-2 border-bottom">
                                <div className="input-group input-group-sm border rounded" style={{ background: '#fff' }}>
                                    <span className="input-group-text bg-transparent border-0 pe-1">
                                        <i className="ti ti-search text-muted fs-12" />
                                    </span>
                                    <input
                                        className="form-control border-0 bg-transparent shadow-none fs-12 p-1"
                                        placeholder="Search"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="custom-scrollbar" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                                {filteredTerms.length === 0 ? (
                                    <div className="p-3 text-center text-muted fs-12">No results</div>
                                ) : filteredTerms.map(t => (
                                    <div
                                        key={t}
                                        className={`px-3 py-2 fs-13 cursor-pointer d-flex align-items-center justify-content-between ${draft === t ? 'bg-primary text-white' : 'text-dark hover-bg-light'}`}
                                        style={{ transition: 'all 0.05s' }}
                                        onClick={() => { setDraft(t); setIsOpen(false); }}
                                    >
                                        <span>{t}</span>
                                        {draft === t && <i className="ti ti-check fs-12 text-white" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="d-flex align-items-center">
                    <div
                        className="cursor-pointer py-1"
                        style={{ transition: 'all 0.2s' }}
                        onClick={(e) => { e.stopPropagation(); setDraft(value); setEditing(true); setIsOpen(true); }}
                        title="Click to edit"
                    >
                        <div className="fs-15 fw-bold text-dark" style={{ lineHeight: '1.4' }}>{value}</div>
                    </div>
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
    const [searchFocused, setSearchFocused] = useState(false);
    const [addrOpen, setAddrOpen] = useState(true);
    const [otherOpen, setOtherOpen] = useState(true);
    const [contactPersonsOpen, setContactPersonsOpen] = useState(true);
    const [recordInfoOpen, setRecordInfoOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 768);
    const [viewFilter, setViewFilter] = useState("Active Customers");
    const [viewFilterOpen, setViewFilterOpen] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [actionModal, setActionModal] = useState<'none' | 'clone' | 'merge' | 'associate-templates' | 'configure-portal' | 'link-vendor'>('none');
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [mergeTargetId, setMergeTargetId] = useState<number | null>(null);
    const [cloneType, setCloneType] = useState<'Customer' | 'Vendor'>('Customer');
    const [linkVendorId, setLinkVendorId] = useState<string>('');
    const [portalAccessMap, setPortalAccessMap] = useState<Record<number, boolean>>({});
    const [showPortalConfig, setShowPortalConfig] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

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
    const [expandedSidebarContactId, setExpandedSidebarContactId] = useState<number | null>(null);
    const [expandedContactId, setExpandedContactId] = useState<number | null>(null);

    const handleDeleteContact = (cid: number) => {
        if (!selected) return;
        const updated = contactPersons.filter(c => c.id !== cid);
        saveContacts(selected.id, updated);
        setContactPersons(updated);
        showNotify("Contact removed", "error");
    };

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
        <div className={`page-wrapper customer-view-page`} style={isMobile ? { minHeight: "100vh", display: "flex", flexDirection: "column" } : { height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
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
                            <h4 className="fw-bold mb-0" style={{ fontSize: '18px' }}>{selected?.name}</h4>
                        </div>
                        <nav aria-label="breadcrumb">
                            <ol className="breadcrumb mb-0 p-0" style={{ fontSize: '14px' }}>
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
                            <button className="cv-header-btn btn-icon" data-bs-toggle="dropdown" title="More actions">
                                <i className="ti ti-dots-vertical fs-16 text-muted" />
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
                                            <i className="ti ti-chevron-down fs-14 ms-1" style={{ color: "#767879ff" }} />
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
                                            style={{ width: 34, height: 34, background: "#e41f07", border: "none", color: "#fff" }}
                                            onClick={() => navigate(route.customerAdd)}>
                                            <i className="ti ti-plus fs-14" />
                                        </button>
                                        <div className="dropdown">
                                            <button className="btn btn-light d-flex align-items-center justify-content-center p-0 rounded border"
                                                style={{ width: 34, height: 34, background: "#fff" }} data-bs-toggle="dropdown">
                                                <i className="ti ti-dots fs-14 text-muted" />
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
                                <div className="d-flex align-items-center rounded" style={{
                                    background: '#fff',
                                    border: searchFocused ? '1px solid #e41f07' : '1px solid #dee2e6',
                                    boxShadow: searchFocused ? '0 0 0 0.2rem rgba(228,31,7,0.15)' : 'none',
                                    transition: 'border-color 0.15s, box-shadow 0.15s',
                                }}>
                                    <span className="px-2 d-flex align-items-center">
                                        <i className="ti ti-search fs-13 text-muted" />
                                    </span>
                                    <input className="form-control border-0 ps-0 fs-14 bg-transparent"
                                        style={{ outline: 'none', boxShadow: 'none' }}
                                        placeholder="Search..."
                                        value={sideSearch}
                                        onChange={e => setSideSearch(e.target.value)}
                                        onFocus={() => setSearchFocused(true)}
                                        onBlur={() => setSearchFocused(false)} />
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
                            <div style={{ flexShrink: 0, borderBottom: "2px solid #dee2e6" }}>
                                <div className="d-flex align-items-center bg-white custom-scrollbar"
                                    style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: "2px" }}>
                                    {TABS.map(t => (
                                        <button key={t.key}
                                            onClick={() => setTab(t.key)}
                                            className="btn py-3 px-3 fs-14 fw-medium flex-shrink-0 position-relative"
                                            style={{
                                                background: "transparent",
                                                color: tab === t.key ? "#e41f07" : "#6c757d",
                                                border: "none",
                                                borderRadius: 0,
                                            }}>
                                            {t.label}
                                            {tab === t.key && (
                                                <div className="position-absolute start-0 end-0 bottom-0"
                                                    style={{ height: "2px", backgroundColor: "#e41f07", marginBottom: "-2px" }} />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tab content */}
                            <div className="flex-grow-1 detail-pane-content custom-scrollbar" style={{ background: "#f7f8fa", minHeight: isMobile ? "auto" : 0, display: "flex", flexDirection: "column", overflowY: 'auto' }}>

                                {/* ── OVERVIEW ── */}
                                {tab === "overview" && (
                                    <div className="cv-overview-split d-flex">
                                        {/* ── LEFT: Contact Info Panel ── */}
                                        <div className="cv-overview-left p-3">

                                            {/* Company Header */}
                                            <div className="px-1 mb-4">
                                                <h4 className="fs-15 fw-bold text-dark mb-0">femi9</h4>
                                                <hr className="mt-2 mb-0" style={{ opacity: 0.1 }} />
                                            </div>

                                            {/* ── Unified Profile Card ── */}
                                            <div className="cv-profile-card-premium mb-4">
                                                <div className="d-flex align-items-start justify-content-between">
                                                    <div className="d-flex align-items-start gap-3">
                                                        {/* Avatar */}
                                                        <div className="cv-avatar-solid">
                                                            <svg width="36" height="34" viewBox="0 0 24 24" fill="none">
                                                                <circle cx="12" cy="8" r="4.5" fill="#ffffff" />
                                                                <path d="M4 22C4 17.5817 7.58172 14 12 14C16.4183 14 20 17.5817 20 22H4Z" fill="#ffffff" />
                                                            </svg>
                                                        </div>
                                                        <div className="cv-profile-info">
                                                            <h5 className="fs-16 fw-bold text-dark mb-1">{selected?.name}</h5>
                                                            <div className="fs-13 text-muted mb-1">{selected?.email}</div>
                                                            <div className="fs-14 text-muted d-flex align-items-center gap-1">
                                                                <i className="ti ti-phone fs-14" />
                                                                {selected?.workPhone}
                                                            </div>
                                                            <div className="mt-2">
                                                                <div className="fs-14 fw-medium" style={{ color: "#6c757d" }}>Portal invitation not accepted</div>
                                                                <button
                                                                    className="btn btn-link p-0 fs-13 text-decoration-none mt-1"
                                                                    style={{ color: "#e41f07" }}
                                                                    onClick={() => showNotify('Your invitation has been sent')}
                                                                >
                                                                    Re-invite
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="position-absolute" style={{ top: 12, right: 12 }}>
                                                        <button
                                                            className="btn p-1 text-muted hover-opacity shadow-none"
                                                            onClick={() => setShowSettings(!showSettings)}
                                                        >
                                                            <i className="ti ti-settings fs-16" />
                                                        </button>
                                                        {showSettings && (
                                                            <>
                                                                <div
                                                                    className="position-fixed top-0 start-0 w-100 h-100"
                                                                    style={{ zIndex: 1000 }}
                                                                    onClick={() => setShowSettings(false)}
                                                                />
                                                                <div className="cv-settings-dropdown" style={{ zIndex: 1001, top: "100%", right: 0 }}>
                                                                    <Link to={route.customerEdit.replace(":id", String(selected?.id))} className="dropdown-item">
                                                                        <i className="ti ti-edit me-2" />Edit
                                                                    </Link>
                                                                    <div className="dropdown-divider" />
                                                                    <button
                                                                        className="dropdown-item text-danger"
                                                                        onClick={() => { setShowSettings(false); handleDelete(); }}
                                                                    >
                                                                        <i className="ti ti-trash me-2" />Delete
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Address */}
                                            <div className="cv-section-header-compact mt-4 mb-2" onClick={() => setAddrOpen(o => !o)}>
                                                <span>ADDRESS</span>
                                                <i className={`ti ti-chevron-${addrOpen ? "up" : "down"} fs-14`} />
                                            </div>
                                            {addrOpen && (
                                                <div className="ps-1 mb-4">
                                                    <div className="mb-3">
                                                        <div className="fs-14 fw-semibold text-dark mb-1">Billing Address</div>
                                                        <div className="fs-14 text-muted">No Billing Address - <span className="text-primary cursor-pointer">New Address</span></div>
                                                    </div>
                                                    <div>
                                                        <div className="fs-14 fw-semibold text-dark mb-1">Shipping Address</div>
                                                        <div className="fs-14 text-muted">No Shipping Address - <span className="text-primary cursor-pointer">New Address</span></div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Other Details */}
                                            <div className="cv-section-header-compact mb-2" onClick={() => setOtherOpen(o => !o)}>
                                                <span>OTHER DETAILS</span>
                                                <i className={`ti ti-chevron-${otherOpen ? "up" : "down"} fs-12`} />
                                            </div>
                                            {otherOpen && (
                                                <div className="ps-1">
                                                    {[
                                                        { label: "Customer Type", value: "Business" },
                                                        { label: "Default Currency", value: "INR" },
                                                    ].map((row, i) => (
                                                        <div key={i} className="d-flex align-items-center mb-3">
                                                            <div className="fs-14 text-muted w-50">{row.label}</div>
                                                            <div className="fs-14 text-dark fw-medium">{row.value}</div>
                                                        </div>
                                                    ))}
                                                    {/* Portal Status */}
                                                    <div className="d-flex align-items-start mb-3">
                                                        <div className="fs-14 text-muted w-50">Portal Status</div>
                                                        {(() => {
                                                            const enabled = contactPersons.filter(cp => cp.portalAccess).length;
                                                            const total = contactPersons.length;
                                                            return enabled > 0 ? (
                                                                <div className="d-flex flex-column">
                                                                    <div className="d-flex align-items-center gap-1">
                                                                        <span style={{ color: '#16a34a', fontSize: 13, fontWeight: 500 }}>
                                                                            <span style={{ fontSize: 10 }}>●</span> Enabled
                                                                        </span>
                                                                        <button
                                                                            className="btn p-0 border-0 bg-transparent"
                                                                            style={{ color: '#64748b', lineHeight: 1 }}
                                                                            title="Configure Portal Access"
                                                                            onClick={openPortalConfig}>
                                                                            <i className="ti ti-settings fs-14" />
                                                                        </button>
                                                                    </div>
                                                                    <span className="fs-14 text-muted">({enabled} of {total} Contacts)</span>
                                                                </div>
                                                            ) : (
                                                                <div className="d-flex align-items-center gap-1">
                                                                    <span className="fs-14 text-muted">Disabled</span>
                                                                    <button
                                                                        className="btn p-0 border-0 bg-transparent"
                                                                        style={{ color: '#64748b', lineHeight: 1 }}
                                                                        title="Configure Portal Access"
                                                                        onClick={openPortalConfig}>
                                                                        <i className="ti ti-settings fs-16" />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── CONTACT PERSONS Section ── */}
                                            <div className="cv-section-header" onClick={() => setContactPersonsOpen(o => !o)}>
                                                <span className="text-uppercase letter-spacing-1 fs-14 fw-bold text-dark">CONTACT PERSONS</span>
                                                <div className="d-flex align-items-center gap-2">
                                                    <button
                                                        className="d-flex align-items-center justify-content-center rounded-circle border-0"
                                                        style={{ width: 20, height: 20, background: '#e41f07', color: '#fff', cursor: 'pointer' }}
                                                        onClick={e => { e.stopPropagation(); openAddContact(); }}
                                                        title="Add contact person">
                                                        <i className="ti ti-plus" style={{ fontSize: 11 }} />
                                                    </button>
                                                    <i className={`ti ti-chevron-${contactPersonsOpen ? 'up' : 'down'} fs-12`} style={{ color: '#64748b' }} />
                                                </div>
                                            </div>
                                            {contactPersonsOpen && (
                                                <div className="px-3 pb-3">
                                                    {contactPersons.length === 0 ? (
                                                        <div className="fs-14 text-muted py-2 px-1">No contact persons found.</div>
                                                    ) : contactPersons.map(cp => {
                                                        const isExpanded = expandedSidebarContactId === cp.id;
                                                        return (
                                                            <div key={cp.id} className="mb-2 rounded border" style={{ borderColor: isExpanded ? '#e41f07' : '#f1f5f9', background: isExpanded ? '#fffcfc' : '#fff', overflow: 'hidden' }}>
                                                                <div
                                                                    className="d-flex align-items-center justify-content-between p-2 cursor-pointer"
                                                                    onClick={() => setExpandedSidebarContactId(isExpanded ? null : cp.id)}
                                                                >
                                                                    <div className="d-flex align-items-center gap-2">
                                                                        <div className="avatar-circle fs-10 fw-bold text-white d-flex align-items-center justify-content-center" style={{ width: 24, height: 24, borderRadius: '50%', background: getAvatarColor(cp.firstName + cp.lastName) }}>
                                                                            {getInitials(cp.firstName + " " + cp.lastName)}
                                                                        </div>
                                                                        <div>
                                                                            <div className="fs-14 fw-semibold text-dark">{cp.firstName} {cp.lastName}</div>
                                                                            <div className="fs-14 text-muted" style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cp.email}</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="d-flex align-items-center gap-1">
                                                                        <button className="btn btn-sm p-1 border-0" onClick={(e) => { e.stopPropagation(); openEditContact(cp); }} title="Edit">
                                                                            <i className="ti ti-pencil fs-14 text-muted" />
                                                                        </button>
                                                                        <i className={`ti ti-chevron-${isExpanded ? 'up' : 'down'} fs-14 text-muted`} />
                                                                    </div>
                                                                </div>
                                                                {isExpanded && (
                                                                    <div className="p-3 border-top" style={{ backgroundColor: "#f8f9fa" }}>
                                                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                                                            <div className="fs-12 text-muted text-uppercase fw-bold" style={{ letterSpacing: '0.5px' }}>Work Phone</div>
                                                                            <div className="fs-13 text-dark fw-medium">{cp.workPhone || "—"}</div>
                                                                        </div>
                                                                        <div className="d-flex align-items-center justify-content-between">
                                                                            <div className="fs-12 text-muted text-uppercase fw-bold" style={{ letterSpacing: '0.5px' }}>Mobile</div>
                                                                            <div className="fs-13 text-dark fw-medium">{cp.mobile || "—"}</div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}



                                            {/* ── RECORD INFO Section ── */}
                                            <div className="cv-section-header" onClick={() => setRecordInfoOpen(o => !o)}>
                                                <span className="text-uppercase letter-spacing-1 fs-14 fw-bold text-dark">RECORD INFO</span>
                                                <i className={`ti ti-chevron-${recordInfoOpen ? 'up' : 'down'} fs-14`} style={{ color: '#64748b' }} />
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
                                                            <div className="col-5 fs-14 text-muted">{row.label}</div>
                                                            <div className="col-7 fs-14 text-dark fw-medium">{row.value}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                        </div>

                                        {/* ── RIGHT: Business Data Panel ── */}
                                        <div className="cv-overview-right bg-white p-4">

                                            {/* Payment due period */}
                                            <PaymentDueCard />

                                            {/* Receivables */}
                                            <div className="mb-4">
                                                <h5 className="fs-14 text-dark mb-3">Receivables</h5>
                                                <div className="cv-table-premium">
                                                    <table className="table mb-0 border-bottom">
                                                        <thead>
                                                            <tr>
                                                                <th className="fs-13 text-muted text-front">CURRENCY</th>
                                                                <th className="fs-13 text-muted text-end">OUTSTANDING<br />RECEIVABLES</th>
                                                                <th className="fs-13 text-muted text-end">UNUSED CREDITS</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr>
                                                                <td className="fs-14 text-dark py-3">INR- Indian Rupee</td>
                                                                <td className="fs-14 text-dark text-end py-3">{selected ? fmt(selected.receivables) : "₹0.00"}</td>
                                                                <td className="fs-14 text-dark text-end py-3">{selected ? fmt(selected.unusedCredits) : "₹0.00"}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                                {/* Inline Status Bar */}
                                                <div className="cv-status-bar-premium mt-0">
                                                    <div className="status-item">Items to be packed: <span className="count">0</span></div>
                                                    <div className="status-divider" />
                                                    <div className="status-item">Items to be shipped: <span className="count">0</span></div>
                                                </div>
                                            </div>

                                            {/* Timeline */}
                                            <div className="cv-timeline-premium mt-5">
                                                {timelineData.map((item, i) => (
                                                    <div key={i} className="timeline-item">
                                                        <div className="timeline-left">
                                                            <div className="time">{item.date}</div>
                                                            <div className="time-sub">{item.time}</div>
                                                        </div>
                                                        <div className="timeline-middle">
                                                            <div className="timeline-icon-wrap">
                                                                <i className={`ti ${item.icon}`} />
                                                            </div>
                                                            <div className="timeline-line" />
                                                        </div>
                                                        <div className="timeline-right">
                                                            <div className="timeline-card">
                                                                <h6 className="fs-14 fw-bold text-dark mb-2">{item.title}</h6>
                                                                <div className="fs-14 text-muted">{item.desc}</div>
                                                                <div className="fs-14 fw-bold mt-1" style={{ color: "#7c8ca0" }}>by {item.by}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {tab !== "overview" && (
                                    <div className="flex-grow-1" style={{ minHeight: 0 }}>
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
                                <button type="button" className="custom-btn-close border me-0 d-flex align-items-center justify-content-center rounded-circle"
                                    onClick={() => setActionModal('none')}>
                                    <i className="ti ti-x" />
                                </button>
                            </div>
                            <div className="modal-body">
                                <p className="fs-14 text-muted mb-3">
                                    Choose the PDF templates to associate with this customer. These will be used when sending documents.
                                </p>
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <span className="fs-14 fw-semibold text-dark">PDF Templates</span>
                                    <button className="btn btn-outline-primary btn-sm fs-14 px-3">
                                        <i className="ti ti-plus me-1" />New PDF Template
                                    </button>
                                </div>
                                {["Customer Statement", "Sales Orders", "Invoices", "Credit Notes", "Payment Thank You"].map(label => (
                                    <div key={label} className="d-flex align-items-center mb-3">
                                        <label className="fs-14 text-muted mb-0" style={{ minWidth: 180, flexShrink: 0 }}>{label}</label>
                                        <select className="form-select form-select-sm fs-14 flex-grow-1"
                                            style={{ transition: 'border-color 0.15s', outline: 'none' }}
                                            onFocus={e => { e.currentTarget.style.borderColor = '#e41f07'; e.currentTarget.style.boxShadow = '0 0 0 0.2rem rgba(228,31,7,0.15)'; }}
                                            onBlur={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }}>
                                            <option>Standard Template</option>
                                            <option>Spreadsheet Template</option>
                                            <option>Elite Template</option>
                                        </select>
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
                                <button type="button" className="custom-btn-close border me-0 d-flex align-items-center justify-content-center rounded-circle"
                                    onClick={() => setActionModal('none')}>
                                    <i className="ti ti-x" />
                                </button>
                            </div>
                            <div className="modal-body">
                                <p className="fs-14 text-muted mb-3">
                                    Select the contact persons who should have access to the customer portal.
                                </p>
                                <table className="table table-sm mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th style={{ width: 36 }}></th>
                                            <th className="fs-14 fw-semibold text-uppercase">Name</th>
                                            <th className="fs-14 fw-semibold text-uppercase">Email Address</th>
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
                                                <td className="fs-14">{cp.salutation} {cp.firstName} {cp.lastName}</td>
                                                <td className="fs-14 text-muted">{cp.email || "—"}</td>
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
                                <h5 className="modal-title fw-bold fs-14">Link to Vendor</h5>
                                <button type="button" className="custom-btn-close border me-0 d-flex align-items-center justify-content-center rounded-circle"
                                    onClick={() => setActionModal('none')}>
                                    <i className="ti ti-x" />
                                </button>
                            </div>
                            <div className="modal-body">
                                <p className="fs-14 text-muted mb-4">
                                    Link this customer to a vendor in your organization. This helps in tracking transactions between the customer and vendor.
                                </p>
                                <label className="form-label fs-14 fw-semibold mb-1">Choose a vendor to link</label>
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
                                <h5 className="modal-title fw-bold fs-14">Clone</h5>
                                <button type="button" className="custom-btn-close border me-0 d-flex align-items-center justify-content-center rounded-circle"
                                    onClick={() => setActionModal('none')}>
                                    <i className="ti ti-x" />
                                </button>
                            </div>
                            <div className="modal-body">
                                <p className="fs-14 text-muted mb-3">Clone <strong>{selected?.name}</strong> as a:</p>
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
                                <button type="button" className="custom-btn-close border me-0 d-flex align-items-center justify-content-center rounded-circle"
                                    onClick={() => { setActionModal('none'); setMergeTargetId(null); }}>
                                    <i className="ti ti-x" />
                                </button>
                            </div>
                            <div className="modal-body">
                                <p className="fs-14 text-muted mb-4">
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
                    position: "fixed", top: 40, left: "50%", transform: "translateX(-50%)",
                    background: notification.type === 'error' ? "#fef2f2" : "#f0fdf4",
                    border: `1px solid ${notification.type === 'error' ? "#fee2e2" : "#dcfce7"}`,
                    color: notification.type === 'error' ? "#991b1b" : "#166534",
                    padding: "6px 16px 6px 6px", borderRadius: "10px",
                    display: "flex", alignItems: "center", gap: "10px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    zIndex: 9999, animation: "cvFadeInDown 0.4s ease forwards"
                }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: "6px",
                        background: notification.type === 'error' ? "#ef4444" : "#22c55e",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", flexShrink: 0
                    }}>
                        <i className={notification.type === 'error' ? "ti ti-alert-circle fs-16" : "ti ti-check fs-16"} />
                    </div>
                    <span className="fs-14 fw-medium" style={{ letterSpacing: "-0.01em" }}>{notification.msg}</span>
                </div>
            )}

            {/* ── Add / Edit Contact Person Modal ── */}
            {showContactModal && (
                <div className="modal fade show d-block" role="dialog" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2200 }}
                    onClick={e => { if (e.target === e.currentTarget) setShowContactModal(false); }}>
                    <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: 820 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-content">
                            {/* Header */}
                            <div className="modal-header py-2 px-3 d-flex align-items-center justify-content-between border-bottom" style={{ minHeight: '50px' }}>
                                <h5 className="modal-title fw-bold fs-14 text-dark mb-0">{editingContact ? "Edit Contact Person" : "Add Contact Person"}</h5>
                                <button
                                    type="button"
                                    className="btn-close-small d-flex align-items-center justify-content-center border-0 rounded-circle"
                                    style={{ width: 20, height: 20, cursor: 'pointer', background: '#fff0ef', color: '#e41f07', padding: 0 }}
                                    onClick={() => setShowContactModal(false)}>
                                    <i className="ti ti-x fs-14 fw-bold" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="modal-body d-flex gap-4 p-4" style={{ overflowY: "auto" }}>

                                {/* Left: Form */}
                                <div className="flex-grow-1" style={{ minWidth: 0 }}>

                                    {/* Name */}
                                    <div className="row g-2 mb-3">
                                        <label className="col-sm-3 col-form-label fw-semibold fs-14">Name</label>
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
                                        <label className="col-sm-3 col-form-label fw-semibold fs-14">Email Address</label>
                                        <div className="col-sm-9">
                                            <input className="form-control form-control-sm" type="email"
                                                value={cpForm.email}
                                                onChange={e => setCpForm(f => ({ ...f, email: e.target.value }))} />
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    <div className="row g-2 mb-3">
                                        <label className="col-sm-3 col-form-label fw-semibold fs-14">Phone</label>
                                        <div className="col-sm-9">
                                            <div className="d-flex flex-column gap-2">
                                                {/* Work Phone Group */}
                                                <div className="cv-phone-input-group">
                                                    <select>
                                                        <option>+91</option><option>+1</option><option>+44</option><option>+61</option>
                                                    </select>
                                                    <input placeholder="Work Phone"
                                                        value={cpForm.workPhone}
                                                        onChange={e => setCpForm(f => ({ ...f, workPhone: e.target.value }))} />
                                                </div>
                                                {/* Mobile Group */}
                                                <div className="cv-phone-input-group">
                                                    <select>
                                                        <option>+91</option><option>+1</option><option>+44</option><option>+61</option>
                                                    </select>
                                                    <input placeholder="Mobile"
                                                        value={cpForm.mobile}
                                                        onChange={e => setCpForm(f => ({ ...f, mobile: e.target.value }))} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Skype */}
                                    <div className="row g-2 mb-3">
                                        <label className="col-sm-3 col-form-label fw-semibold fs-14">Skype Name/Number</label>
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
                                    <div className="row g-2 mb-4">
                                        <label className="col-sm-3 col-form-label fw-semibold fs-14">Other Details</label>
                                        <div className="col-sm-9">
                                            <div className="d-flex gap-2 mb-3">
                                                <input className="form-control form-control-sm" placeholder="Designation"
                                                    value={cpForm.designation}
                                                    onChange={e => setCpForm(f => ({ ...f, designation: e.target.value }))} />
                                                <input className="form-control form-control-sm" placeholder="Department"
                                                    value={cpForm.department}
                                                    onChange={e => setCpForm(f => ({ ...f, department: e.target.value }))} />
                                            </div>

                                            {/* Enable portal access (Moved below other details) */}
                                            <div className="form-check d-flex align-items-start gap-2 p-0 mt-3">
                                                <input type="checkbox" className="form-check-input mt-1 ms-0" id="cp-portal"
                                                    checked={cpForm.portalAccess}
                                                    onChange={e => setCpForm(f => ({ ...f, portalAccess: e.target.checked }))} />
                                                <div>
                                                    <label htmlFor="cp-portal" className="form-check-label fw-semibold fs-14 text-dark">Enable portal access</label>
                                                    <p className="text-muted fs-14 mb-0 mt-1" style={{ lineHeight: '1.4' }}>
                                                        This customer will be able to see all their transactions with your organization by logging in to the portal using their email address.{" "}
                                                        <a href="#" className="text-primary fw-medium" style={{ textDecoration: 'none' }}>Learn More</a>
                                                    </p>
                                                </div>
                                            </div>
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
                                                <p className="text-muted fs-14 mt-2 mb-0">Click to change</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="rounded-circle d-flex align-items-center justify-content-center mb-2" style={{ width: 40, height: 40, background: '#e41f07' }}>
                                                    <i className="ti ti-upload text-white fs-14" />
                                                </div>
                                                <p className="fw-bold fs-14 mb-1">Drag &amp; Drop or Click</p>
                                                <p className="text-muted fs-14 mb-0">jpg, jpeg, png, gif, bmp</p>
                                                <p className="text-muted fs-14 mb-2">Max: 10MB (auto-compressed)</p>
                                                <span className="fs-14 fw-semibold" style={{ color: '#347aeb', textDecoration: 'underline' }}>Upload File</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Spacer replaced the old portal block */}
                            <div className="px-3"></div>

                            {/* Footer */}
                            <div className="cv-cp-modal-footer">
                                <button className="cv-cp-modal-save" disabled={!cpForm.firstName.trim()} onClick={saveContact}>Save</button>
                                <button className="cv-cp-modal-cancel" onClick={() => setShowContactModal(false)}>Cancel</button>
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
                        <h6 className="fw-bold fs-14 mb-1">Delete Customer?</h6>
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
                        {/* Header */}
                        <div className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom" style={{ flexShrink: 0 }}>
                            <h5 className="mb-0 fw-bold fs-14 text-dark">Configure Portal Access</h5>
                            <button
                                className="d-flex align-items-center justify-content-center border-0 rounded-circle shadow-sm"
                                style={{ width: 22, height: 22, cursor: 'pointer', background: '#fff0ef', color: '#e41f07', transition: 'all 0.2s' }}
                                onClick={() => setShowPortalConfig(false)}>
                                <i className="ti ti-x fs-14 fw-bold" />
                            </button>
                        </div>

                        {/* Table */}
                        <div className="table-responsive" style={{ overflowY: "auto", flex: 1 }}>
                            <table className="table mb-0">
                                <thead style={{ background: "#f8fafc", borderBottom: '1px solid #e5e7eb' }}>
                                    <tr>
                                        <th className="fs-14 fw-bold text-uppercase px-4 py-3 border-0" style={{ color: "#94a3b8", letterSpacing: '0.07em' }}>NAME</th>
                                        <th className="fs-14 fw-bold text-uppercase px-4 py-3 border-0" style={{ color: "#94a3b8", letterSpacing: '0.07em' }}>EMAIL ADDRESS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contactPersons.map(cp => (
                                        <tr key={cp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td className="px-4 py-3 border-0">
                                                <div className="d-flex align-items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input m-0 cursor-pointer"
                                                        style={{ width: 17, height: 17, borderRadius: 4 }}
                                                        checked={!!portalAccessMap[cp.id]}
                                                        onChange={e => setPortalAccessMap(prev => ({ ...prev, [cp.id]: e.target.checked }))}
                                                    />
                                                    <span className="fs-14 text-dark">{cp.salutation} {cp.firstName} {cp.lastName}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 border-0 fs-14 text-dark">{cp.email}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="d-flex align-items-center gap-2 px-4 py-3 border-top" style={{ flexShrink: 0 }}>
                            <button className="btn fs-14 fw-medium text-white px-4" style={{ background: '#e41f07', border: 'none', borderRadius: 6 }} onClick={savePortalConfig}>Save</button>
                            <button className="btn fs-14 fw-medium px-4 border" style={{ background: '#fff', color: '#111827', borderColor: '#e2e8f0', borderRadius: 6 }} onClick={() => setShowPortalConfig(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerView;
