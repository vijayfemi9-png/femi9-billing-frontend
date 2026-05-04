import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import "../billing-application.scss";
import { all_routes } from "../../../../routes/all_routes";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Invoice {
    id: number;
    invoiceNumber: string;
    date: string;
    orderNumber: string;
    customerName: string;
    status: "Draft" | "Sent" | "Overdue" | "Paid" | "Void";
    dueDate: string;
    amount: number;
    isDeleted?: boolean;
}

interface LineItem {
    id: number;
    description: string;
    qty: number;
    rate: number;
    tax: number;
    amount: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const SK = "billing_invoices";
const SK_ITEMS = (id: number) => `billing_invoice_items_${id}`;

function getAllRaw(): Invoice[] {
    try { return JSON.parse(localStorage.getItem(SK) || "[]") as Invoice[]; } catch { return []; }
}

function loadItems(id: number): LineItem[] {
    try { return JSON.parse(localStorage.getItem(SK_ITEMS(id)) || "[]") as LineItem[]; } catch { return []; }
}

function saveAll(data: Invoice[]) {
    try { localStorage.setItem(SK, JSON.stringify(data)); } catch { /**/ }
}

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2 });

const STATUS_COLORS: Record<Invoice["status"], { bg: string; color: string; border: string }> = {
    Draft:   { bg: "#f5f5f5",   color: "#666",    border: "#ddd" },
    Sent:    { bg: "#e8f4fd",   color: "#1a6fb5", border: "#b3d7f5" },
    Overdue: { bg: "#fdecea",   color: "#c0392b", border: "#f5b7b1" },
    Paid:    { bg: "#e8f8ef",   color: "#1e8449", border: "#a9dfbf" },
    Void:    { bg: "#f5f5f5",   color: "#999",    border: "#ddd" },
};

const TABS = [
    { key: "details",  label: "Invoice Details" },
    { key: "comments", label: "Comments & History" },
] as const;
type TabKey = typeof TABS[number]["key"];

// ── Delete Confirm ────────────────────────────────────────────────────────────
const DeleteConfirm: React.FC<{ invoiceNumber: string; onConfirm: () => void; onCancel: () => void }> = ({ invoiceNumber, onConfirm, onCancel }) => (
    <div style={{ position: "fixed", inset: 0, zIndex: 2100, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
        onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
        <div className="bg-white shadow-lg text-center" style={{ borderRadius: 12, width: "100%", maxWidth: 380, padding: "32px 28px" }}>
            <div className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle" style={{ width: 60, height: 60, background: "#fff0ef" }}>
                <i className="ti ti-trash text-danger" style={{ fontSize: 26 }} />
            </div>
            <h6 className="fw-bold mb-1" style={{ fontSize: 16 }}>Delete Invoice?</h6>
            <p className="text-muted mb-4" style={{ fontSize: 14 }}>
                "<strong>{invoiceNumber}</strong>" will be permanently removed.
            </p>
            <div className="d-flex justify-content-center gap-3">
                <button className="btn btn-light px-4" style={{ fontSize: 14 }} onClick={onCancel}>Cancel</button>
                <button className="btn btn-danger px-4" style={{ fontSize: 14 }} onClick={onConfirm}>
                    <i className="ti ti-trash me-1" />Delete
                </button>
            </div>
        </div>
    </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const InvoiceView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const route = all_routes;

    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [items, setItems] = useState<LineItem[]>([]);
    const [activeTab, setActiveTab] = useState<TabKey>("details");
    const [showDel, setShowDel] = useState(false);
    const [comment, setComment] = useState("");
    const [comments, setComments] = useState<{ text: string; date: string }[]>([]);

    useEffect(() => {
        const all = getAllRaw();
        const found = all.find((inv) => inv.id === Number(id) && !inv.isDeleted);
        setInvoice(found ?? null);
        if (found) setItems(loadItems(found.id));
    }, [id]);

    if (!invoice) {
        return (
            <div className="page-wrapper">
                <div className="content d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "60vh" }}>
                    <i className="ti ti-file-off" style={{ fontSize: 64, color: "#ccc" }} />
                    <h5 className="mt-3 text-muted">Invoice not found</h5>
                    <button className="btn btn-primary mt-3" onClick={() => navigate(route.billingInvoiceList)}>
                        Back to Invoices
                    </button>
                </div>
            </div>
        );
    }

    const sc = STATUS_COLORS[invoice.status];
    const subtotal = items.reduce((s, i) => s + i.amount, 0);
    const taxTotal = items.reduce((s, i) => s + (i.amount * i.tax) / 100, 0);
    const total = subtotal + taxTotal;

    const handleMarkSent = () => {
        const all = getAllRaw();
        const updated = all.map((x) => (x.id === invoice.id ? { ...x, status: "Sent" as Invoice["status"] } : x));
        saveAll(updated);
        setInvoice((prev) => prev ? { ...prev, status: "Sent" } : prev);
    };

    const handleMarkPaid = () => {
        const all = getAllRaw();
        const updated = all.map((x) => (x.id === invoice.id ? { ...x, status: "Paid" as Invoice["status"] } : x));
        saveAll(updated);
        setInvoice((prev) => prev ? { ...prev, status: "Paid" } : prev);
    };

    const handleVoid = () => {
        const all = getAllRaw();
        const updated = all.map((x) => (x.id === invoice.id ? { ...x, status: "Void" as Invoice["status"] } : x));
        saveAll(updated);
        setInvoice((prev) => prev ? { ...prev, status: "Void" } : prev);
    };

    const handleDelete = () => {
        const all = getAllRaw();
        const updated = all.map((x) => (x.id === invoice.id ? { ...x, isDeleted: true } : x));
        saveAll(updated);
        navigate(route.billingInvoiceList);
    };

    const handleAddComment = () => {
        if (!comment.trim()) return;
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        setComments((prev) => [...prev, { text: comment.trim(), date: dateStr }]);
        setComment("");
    };

    return (
        <div className="page-wrapper" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <div className="content pb-0 flex-grow-1 d-flex flex-column">

                {/* ── Top Bar ── */}
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3 px-1">
                    <div className="d-flex align-items-center gap-3">
                        <button
                            className="btn btn-light d-flex align-items-center gap-1 px-3"
                            style={{ fontSize: 14, borderRadius: 4 }}
                            onClick={() => navigate(route.billingInvoiceList)}
                        >
                            <i className="ti ti-arrow-left fs-15" /> Back
                        </button>
                        <div>
                            <h5 className="mb-0 fw-bold" style={{ fontSize: 18, color: "#111" }}>
                                {invoice.invoiceNumber}
                            </h5>
                            <div className="fs-12 text-muted">Invoice Details</div>
                        </div>
                        <span
                            style={{
                                background: sc.bg,
                                color: sc.color,
                                border: `1px solid ${sc.border}`,
                                borderRadius: 4,
                                padding: "3px 12px",
                                fontWeight: 600,
                                fontSize: 12,
                                letterSpacing: 0.5,
                            }}
                        >
                            {invoice.status.toUpperCase()}
                        </span>
                    </div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                        {invoice.status === "Draft" && (
                            <button className="btn btn-outline-primary d-flex align-items-center gap-1" style={{ fontSize: 14 }} onClick={handleMarkSent}>
                                <i className="ti ti-send fs-15" /> Mark as Sent
                            </button>
                        )}
                        {(invoice.status === "Sent" || invoice.status === "Overdue") && (
                            <button className="btn btn-success d-flex align-items-center gap-1" style={{ fontSize: 14 }} onClick={handleMarkPaid}>
                                <i className="ti ti-check fs-15" /> Mark as Paid
                            </button>
                        )}
                        <button
                            className="btn btn-outline-secondary d-flex align-items-center gap-1"
                            style={{ fontSize: 14 }}
                            onClick={() => navigate(route.billingInvoiceEdit.replace(":id", String(invoice.id)))}
                        >
                            <i className="ti ti-edit fs-15" /> Edit
                        </button>
                        <div className="dropdown">
                            <button className="btn btn-outline-light d-flex align-items-center" style={{ fontSize: 14 }} data-bs-toggle="dropdown">
                                <i className="ti ti-dots-vertical fs-15" />
                            </button>
                            <div className="dropdown-menu dropdown-menu-end">
                                <button className="dropdown-item" onClick={handleVoid} disabled={invoice.status === "Void" || invoice.status === "Paid"}>
                                    <i className="ti ti-ban me-2 text-warning" />Mark as Void
                                </button>
                                <div className="dropdown-divider" />
                                <button className="dropdown-item text-danger" onClick={() => setShowDel(true)}>
                                    <i className="ti ti-trash me-2" />Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div style={{ borderBottom: "1px solid #e5e7eb", marginBottom: 0 }}>
                    <div className="d-flex gap-0">
                        {TABS.map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setActiveTab(t.key)}
                                style={{
                                    border: "none",
                                    background: "none",
                                    padding: "10px 20px",
                                    fontSize: 14,
                                    fontWeight: activeTab === t.key ? 600 : 400,
                                    color: activeTab === t.key ? "#1a73e8" : "#6c757d",
                                    borderBottom: activeTab === t.key ? "2px solid #1a73e8" : "2px solid transparent",
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Tab Content ── */}
                <div className="flex-grow-1" style={{ overflowY: "auto" }}>

                    {/* Details Tab */}
                    {activeTab === "details" && (
                        <div className="row g-3 pt-3">
                            {/* ── Invoice Info Card ── */}
                            <div className="col-12">
                                <div className="card border-0 shadow-sm" style={{ borderRadius: 10 }}>
                                    <div className="card-body p-4">
                                        <div className="row g-4">
                                            {/* Left: Customer & dates */}
                                            <div className="col-md-6 col-lg-5">
                                                <div className="mb-4">
                                                    <div className="fs-11 text-muted text-uppercase fw-bold mb-1 ls-1">Bill To</div>
                                                    <div className="fs-16 fw-bold text-dark">{invoice.customerName}</div>
                                                </div>
                                                <div className="row g-2">
                                                    <div className="col-6">
                                                        <div className="fs-11 text-muted text-uppercase fw-bold mb-1">Invoice Date</div>
                                                        <div className="fs-14 text-dark">{invoice.date}</div>
                                                    </div>
                                                    <div className="col-6">
                                                        <div className="fs-11 text-muted text-uppercase fw-bold mb-1">Due Date</div>
                                                        <div className="fs-14 text-dark" style={{ color: invoice.status === "Overdue" ? "#c0392b" : undefined }}>
                                                            {invoice.dueDate}
                                                        </div>
                                                    </div>
                                                    {invoice.orderNumber && (
                                                        <div className="col-12 mt-2">
                                                            <div className="fs-11 text-muted text-uppercase fw-bold mb-1">Order Number</div>
                                                            <div className="fs-14 text-dark">{invoice.orderNumber}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right: Summary box */}
                                            <div className="col-md-6 col-lg-7">
                                                <div className="d-flex justify-content-end">
                                                    <div style={{ minWidth: 280, background: "#f8f9fa", borderRadius: 8, padding: "20px 24px" }}>
                                                        <div className="d-flex justify-content-between mb-2">
                                                            <span className="fs-13 text-muted">Invoice Number</span>
                                                            <span className="fs-13 fw-medium text-dark">{invoice.invoiceNumber}</span>
                                                        </div>
                                                        <div className="d-flex justify-content-between mb-2">
                                                            <span className="fs-13 text-muted">Status</span>
                                                            <span style={{ background: sc.bg, color: sc.color, borderRadius: 4, padding: "1px 8px", fontSize: 12, fontWeight: 600 }}>{invoice.status}</span>
                                                        </div>
                                                        <div className="d-flex justify-content-between border-top pt-2 mt-2">
                                                            <span className="fs-14 fw-bold text-dark">Balance Due</span>
                                                            <span className="fs-16 fw-bold text-dark">{fmt(invoice.status === "Paid" ? 0 : invoice.amount || total)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Line Items Table ── */}
                            <div className="col-12">
                                <div className="card border-0 shadow-sm" style={{ borderRadius: 10 }}>
                                    <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between px-4 py-3" style={{ borderRadius: "10px 10px 0 0" }}>
                                        <h6 className="mb-0 fw-bold fs-15">Line Items</h6>
                                    </div>
                                    <div className="card-body p-0">
                                        <div className="table-responsive">
                                            <table className="table table-hover mb-0" style={{ fontSize: 14 }}>
                                                <thead style={{ background: "#f8f9fa" }}>
                                                    <tr>
                                                        <th className="px-4 py-3 fw-semibold text-muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>#</th>
                                                        <th className="py-3 fw-semibold text-muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Item / Description</th>
                                                        <th className="py-3 fw-semibold text-muted text-end" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Qty</th>
                                                        <th className="py-3 fw-semibold text-muted text-end" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Rate</th>
                                                        <th className="py-3 fw-semibold text-muted text-end" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Tax %</th>
                                                        <th className="py-3 pe-4 fw-semibold text-muted text-end" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {items.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={6} className="text-center py-5 text-muted">
                                                                <i className="ti ti-shopping-cart-off d-block mb-2" style={{ fontSize: 36, color: "#ccc" }} />
                                                                No line items added yet.
                                                                <div className="mt-2">
                                                                    <button
                                                                        className="btn btn-outline-primary btn-sm"
                                                                        onClick={() => navigate(route.billingInvoiceEdit.replace(":id", String(invoice.id)))}
                                                                    >
                                                                        <i className="ti ti-plus me-1" />Add Items
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        items.map((item, idx) => (
                                                            <tr key={item.id}>
                                                                <td className="px-4 py-3 text-muted">{idx + 1}</td>
                                                                <td className="py-3 fw-medium text-dark">{item.description}</td>
                                                                <td className="py-3 text-end text-dark">{item.qty}</td>
                                                                <td className="py-3 text-end text-dark">{fmt(item.rate)}</td>
                                                                <td className="py-3 text-end text-dark">{item.tax}%</td>
                                                                <td className="py-3 pe-4 text-end text-dark">{fmt(item.amount)}</td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                                {items.length > 0 && (
                                                    <tfoot style={{ background: "#f8f9fa" }}>
                                                        <tr>
                                                            <td colSpan={5} className="px-4 py-2 text-end fw-semibold text-muted fs-13">Subtotal</td>
                                                            <td className="pe-4 py-2 text-end fw-semibold text-dark fs-13">{fmt(subtotal)}</td>
                                                        </tr>
                                                        <tr>
                                                            <td colSpan={5} className="px-4 py-2 text-end fw-semibold text-muted fs-13">Tax</td>
                                                            <td className="pe-4 py-2 text-end fw-semibold text-dark fs-13">{fmt(taxTotal)}</td>
                                                        </tr>
                                                        <tr>
                                                            <td colSpan={5} className="px-4 py-3 text-end fw-bold text-dark fs-15">Total</td>
                                                            <td className="pe-4 py-3 text-end fw-bold text-dark fs-15">{fmt(total)}</td>
                                                        </tr>
                                                    </tfoot>
                                                )}
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Comments Tab */}
                    {activeTab === "comments" && (
                        <div className="pt-3">
                            <div className="card border-0 shadow-sm" style={{ borderRadius: 10, maxWidth: 700 }}>
                                <div className="card-header bg-white border-bottom px-4 py-3" style={{ borderRadius: "10px 10px 0 0" }}>
                                    <h6 className="mb-0 fw-bold fs-15">Comments &amp; Activity</h6>
                                </div>
                                <div className="card-body p-4">
                                    <div className="mb-4">
                                        <textarea
                                            className="form-control"
                                            rows={3}
                                            placeholder="Add a comment..."
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            style={{ resize: "none", fontSize: 14 }}
                                        />
                                        <div className="mt-2 d-flex justify-content-end">
                                            <button className="btn btn-primary btn-sm" onClick={handleAddComment}>
                                                <i className="ti ti-send me-1" />Add Comment
                                            </button>
                                        </div>
                                    </div>

                                    {comments.length === 0 ? (
                                        <div className="text-center text-muted py-4">
                                            <i className="ti ti-message-circle d-block mb-2" style={{ fontSize: 36, color: "#ccc" }} />
                                            No comments yet.
                                        </div>
                                    ) : (
                                        <div className="d-flex flex-column gap-3">
                                            {comments.map((c, i) => (
                                                <div key={i} className="d-flex gap-3 align-items-start">
                                                    <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 36, height: 36, background: "#e8f4fd", color: "#1a6fb5", fontWeight: 700, fontSize: 14 }}>
                                                        {invoice.customerName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-grow-1">
                                                        <div className="d-flex align-items-center gap-2 mb-1">
                                                            <span className="fw-semibold fs-14 text-dark">{invoice.customerName}</span>
                                                            <span className="fs-12 text-muted">{c.date}</span>
                                                        </div>
                                                        <div className="fs-14 text-dark" style={{ lineHeight: 1.5 }}>{c.text}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showDel && (
                <DeleteConfirm
                    invoiceNumber={invoice.invoiceNumber}
                    onConfirm={handleDelete}
                    onCancel={() => setShowDel(false)}
                />
            )}
        </div>
    );
};

export default InvoiceView;
