import { useState, useEffect, useRef } from "react";
import "../../../billing-application.scss";
import Footer from "../../../../../../components/footer/footer";

// ── Types ─────────────────────────────────────────────────────────────────────
type Country  = { id: number; name: string; code: string;                    isDeleted?: boolean };
type State    = { id: number; name: string; code: string; countryId: number;  isDeleted?: boolean };
type District = { id: number; name: string; code: string; stateId: number;    isDeleted?: boolean };
type Taluk    = { id: number; name: string; code: string; districtId: number; isDeleted?: boolean };
type Pincode  = { id: number; code: string; talukId: number;                  isDeleted?: boolean };
type Level    = "country" | "state" | "district" | "taluk" | "pincode";
// ── Storage Keys ──────────────────────────────────────────────────────────────
const SK = {
    country: "asl_countries", state: "asl_states",
    district: "asl_districts", taluk: "asl_taluks", pincode: "asl_pincodes",
};

// ── Seed Data ─────────────────────────────────────────────────────────────────
const SEED_COUNTRIES: Country[] = [
    { id: 1, name: "India", code: "IN" }, { id: 2, name: "USA", code: "US" }, { id: 3, name: "Canada", code: "CA" },
];
const SEED_STATES: State[] = [
    { id: 1, name: "Tamil Nadu",  code: "TN", countryId: 1 },
    { id: 2, name: "Karnataka",   code: "KA", countryId: 1 },
    { id: 3, name: "Maharashtra", code: "MH", countryId: 1 },
    { id: 4, name: "California",  code: "CA", countryId: 2 },
];
const SEED_DISTRICTS: District[] = [
    { id: 1, name: "Erode",           code: "ERD", stateId: 1 },
    { id: 2, name: "Coimbatore",      code: "CBE", stateId: 1 },
    { id: 3, name: "Salem",           code: "SLM", stateId: 1 },
    { id: 4, name: "Bengaluru Urban", code: "BLR", stateId: 2 },
];
const SEED_TALUKS: Taluk[] = [
    { id: 1, name: "Erode Taluk",      code: "ERD-T", districtId: 1 },
    { id: 2, name: "Bhavani",          code: "BHV",   districtId: 1 },
    { id: 3, name: "Coimbatore North", code: "CBN",   districtId: 2 },
    { id: 4, name: "Coimbatore South", code: "CBS",   districtId: 2 },
];
const SEED_PINCODES: Pincode[] = [
    { id: 1, code: "638001", talukId: 1 }, { id: 2, code: "638102", talukId: 1 },
    { id: 3, code: "638301", talukId: 2 }, { id: 4, code: "641001", talukId: 3 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadData<T>(key: string, seed: T[]): T[] {
    try {
        const s = localStorage.getItem(key);
        if (s) { const p = JSON.parse(s) as T[]; if (Array.isArray(p) && p.length) return p; }
    } catch { /**/ }
    try { localStorage.setItem(key, JSON.stringify(seed)); } catch { /**/ }
    return seed;
}
function saveLS<T>(key: string, data: T[]) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch { /**/ }
}
const nextId = (arr: { id: number }[]) => arr.length ? Math.max(...arr.map(a => a.id)) + 1 : 1;
const live   = <T extends { isDeleted?: boolean }>(arr: T[]) => arr.filter(x => !x.isDeleted);

// ── Level config ──────────────────────────────────────────────────────────────
const LEVELS: { key: Level; label: string; singular: string; icon: string; color: string }[] = [
    { key: "country",  label: "Countries", singular: "Country",  icon: "world",              color: "#e41f07" },
    { key: "state",    label: "States",    singular: "State",    icon: "map-2",              color: "#e41f07" },
    { key: "district", label: "Districts", singular: "District", icon: "building-community", color: "#e41f07" },
    { key: "taluk",    label: "Towns",     singular: "Town",     icon: "map-pin",            color: "#e41f07" },
    { key: "pincode",  label: "Pincodes",  singular: "Pincode",  icon: "hash",               color: "#e41f07" },
];

// ── Styles ────────────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
    border: "1px solid #e0e0e0", borderRadius: 8, padding: "10px 14px",
    fontSize: 13, outline: "none", background: "#fff", color: "#333",
    width: "100%", boxSizing: "border-box",
};
const sel: React.CSSProperties = { ...inp, appearance: "auto" as any, cursor: "pointer" };
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 5, display: "block" };

// ── Delete Confirm ────────────────────────────────────────────────────────────
const DeleteConfirm = ({ label, onConfirm, onCancel }: { label: string; onConfirm: () => void; onCancel: () => void }) => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card border-0 shadow-lg" style={{ borderRadius: 14, width: 360, padding: "28px 28px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#fff0ef", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className="ti ti-trash" style={{ color: "#e41f07", fontSize: 22 }} />
                </div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#222" }}>Delete "{label}"?</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>This entry will be removed.</div>
                </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={onCancel} style={{ border: "1px solid #ddd", background: "#fff", color: "#555", borderRadius: 8, padding: "8px 22px", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>Cancel</button>
                <button onClick={onConfirm} style={{ border: "none", background: "#e41f07", color: "#fff", borderRadius: 8, padding: "8px 24px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                    <i className="ti ti-trash me-1" />Delete
                </button>
            </div>
        </div>
    </div>
);

// ── Tag chip ─────────────────────────────────────────────────────────────────
const Tag = ({ label, sub, color, onDelete, onClick }: { label: string; sub?: string; color: string; onDelete: () => void; onClick?: () => void }) => (
    <div 
        onClick={onClick}
        style={{ 
            display: "inline-flex", alignItems: "center", gap: 2, background: `${color}12`, border: `1px solid ${color}30`, 
            borderRadius: 20, padding: "3px 6px 3px 10px", fontSize: 12, color: "#333", fontWeight: 500,
            cursor: onClick ? "pointer" : "default",
            transition: "all 0.2s"
        }}
        onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.background = `${color}22`; }}
        onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.background = `${color}12`; }}
    >
        <span style={{ fontWeight: 600, color: "#111" }}>{label}</span>
        {sub && <span style={{ color: "#aaa", fontWeight: 400, marginLeft: 2 }}>{sub}</span>}
        <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }} 
            title="Delete" 
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#bbb", fontSize: 16, lineHeight: 1, padding: "0 2px", display: "flex", alignItems: "center" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#e41f07"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#bbb"; }}
        >×</button>
    </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const AssingLocation = () => {
    const [countries,  setCountries]  = useState<Country[]> (() => loadData(SK.country,  SEED_COUNTRIES));
    const [states,     setStates]     = useState<State[]>   (() => loadData(SK.state,    SEED_STATES));
    const [districts,  setDistricts]  = useState<District[]>(() => loadData(SK.district, SEED_DISTRICTS));
    const [taluks,     setTaluks]     = useState<Taluk[]>   (() => loadData(SK.taluk,    SEED_TALUKS));
    const [pincodes,   setPincodes]   = useState<Pincode[]> (() => loadData(SK.pincode,  SEED_PINCODES));

    useEffect(() => { saveLS(SK.country,  countries);  }, [countries]);
    useEffect(() => { saveLS(SK.state,    states);     }, [states]);
    useEffect(() => { saveLS(SK.district, districts);  }, [districts]);
    useEffect(() => { saveLS(SK.taluk,    taluks);     }, [taluks]);
    useEffect(() => { saveLS(SK.pincode,  pincodes);   }, [pincodes]);

    // Active level
    const [level, setLevel] = useState<Level>("country");
    const cfg = LEVELS.find(l => l.key === level)!;

    // Form fields
    const [name,     setName]     = useState("");
    const [parentId, setParentId] = useState("");
    
    const nameRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setName(""); setParentId(""); }, [level]);

    const handleDrillDown = (id: number) => {
        if (level === "country") {
            setLevel("state");
            setParentId(id.toString());
        } else if (level === "state") {
            setLevel("district");
            setParentId(id.toString());
        } else if (level === "district") {
            setLevel("taluk");
            setParentId(id.toString());
        } else if (level === "taluk") {
            setLevel("pincode");
            setParentId(id.toString());
        }
        setTimeout(() => nameRef.current?.focus(), 50);
    };

    // Delete confirm
    const [del, setDel] = useState<{ label: string; onConfirm: () => void } | null>(null);
    const softDel = <T extends { id: number; isDeleted?: boolean }>(setter: React.Dispatch<React.SetStateAction<T[]>>, id: number) =>
        setter(p => p.map(x => x.id === id ? { ...x, isDeleted: true } : x));

    // Parent options
    const parentOptions = () => {
        if (level === "state")    return live(countries).map(c => ({ id: c.id, label: `${c.name} (${c.code})` }));
        if (level === "district") return live(states).map(s => ({ id: s.id, label: `${s.name} (${s.code})` }));
        if (level === "taluk")    return live(districts).map(d => ({ id: d.id, label: `${d.name} (${d.code})` }));
        if (level === "pincode")  return live(taluks).map(t => ({ id: t.id, label: `${t.name} (${t.code})` }));
        return [];
    };
    const parentLabel: Record<Level, string> = {
        country: "", state: "Country", district: "State", taluk: "Town", pincode: "Town"
    };

    // Validation
    const canAdd = () => {
        if (level === "pincode") return name.trim() !== "" && parentId !== "";
        if (level === "country") return name.trim() !== "";
        return name.trim() !== "" && parentId !== "";
    };

    const performAdd = (toAdd?: string) => {
        const fullString = (toAdd || name).trim();
        if (fullString === "") return;

        // Support multiple comma-separated items
        const items = fullString.split(",").map(i => i.trim()).filter(i => i !== "");
        
        items.forEach(finalName => {
            if (level !== "country" && parentId === "") return;

            const pid = parseInt(parentId);
            const autoCode = (finalName.slice(0, 3).toUpperCase()) || "---";
            
            if (level === "country")  setCountries(p => [...p, { id: nextId(p), name: finalName, code: autoCode }]);
            if (level === "state")    setStates(p => [...p, { id: nextId(p), name: finalName, code: autoCode, countryId: pid }]);
            if (level === "district") setDistricts(p => [...p, { id: nextId(p), name: finalName, code: autoCode, stateId: pid }]);
            if (level === "taluk")    setTaluks(p => [...p, { id: nextId(p), name: finalName, code: autoCode, districtId: pid }]);
            if (level === "pincode")  setPincodes(p => [...p, { id: nextId(p), code: finalName, talukId: pid }]);
        });
        
        setName("");
    };

    const handleAdd = () => performAdd();

    const countOf = (l: Level) => {
        const pid = parseInt(parentId);
        if (l === "country")  return live(countries).length;
        if (l === "state")    return live(states).filter(s => !parentId || s.countryId === pid).length;
        if (l === "district") return live(districts).filter(d => !parentId || d.stateId === pid).length;
        if (l === "taluk")    return live(taluks).filter(t => !parentId || t.districtId === pid).length;
        return live(pincodes).filter(p => !parentId || p.talukId === pid).length;
    };

    const currentTags = () => {
        const pid = parseInt(parentId);
        if (level === "country")  return live(countries).map(c => ({ id: c.id, label: c.name, sub: c.code }));
        
        if (level === "state")    return live(states).filter(s => !parentId || s.countryId === pid).map(s => ({ id: s.id, label: s.name, sub: s.code }));
        if (level === "district") return live(districts).filter(d => !parentId || d.stateId === pid).map(d => ({ id: d.id, label: d.name, sub: d.code }));
        if (level === "taluk")    return live(taluks).filter(t => !parentId || t.districtId === pid).map(t => ({ id: t.id, label: t.name, sub: t.code }));
        
        return live(pincodes).filter(p => !parentId || p.talukId === pid).map(p => ({ id: p.id, label: p.code, sub: "" }));
    };

    const tags = currentTags();
    const onEnter = (e: React.KeyboardEvent) => { if (e.key === "Enter") handleAdd(); };

    return (
        <div className="page-wrapper">
            <div className="content">

                {/* ── Page Header ──────────────────────────────────────────── */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                    <div>
                        <h4 style={{ fontSize: 20, fontWeight: 700, color: "#111", display: "flex", alignItems: "center", gap: 10 }}>
                            {cfg.label}
                            <span style={{ background: "#e41f0718", color: "#e41f07", borderRadius: 20, fontSize: 12, padding: "2px 12px", fontWeight: 700 }}>
                                {countOf(level)}
                            </span>
                        </h4>
                        <nav style={{ fontSize: 13, color: "#888", display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                            <span style={{ color: "#e41f07", fontWeight: 500 }}>Home</span>
                            <span>›</span>
                            <span> Assign Location</span>
                        </nav>
                    </div>

                    <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
                        <button
                            onClick={() => {
                                setLevel("country");
                                setName("");
                                setParentId("");
                                setTimeout(() => nameRef.current?.focus(), 50);
                            }}
                            style={{
                                border: "none", background: "#e41f07",
                                color: "#fff", borderRadius: 8, padding: "8px 20px",
                                fontSize: 13, fontWeight: 700, cursor: "pointer",
                                display: "flex", alignItems: "center", gap: 6,
                                boxShadow: "0 4px 12px rgba(228,31,7,0.2)",
                                transition: "all 0.2s"
                            }}
                        >
                            <i className="ti ti-plus" style={{ fontSize: 12 }} /> Add Layer
                        </button>

                        <button
                            onClick={() => {
                                setLevel("country");
                                setName("");
                                setParentId("");
                                setTimeout(() => nameRef.current?.focus(), 50);
                            }}
                            style={{
                                border: "1px solid #ddd", background: "#fff",
                                color: "#555", borderRadius: 8, padding: "8px 20px",
                                fontSize: 13, fontWeight: 700, cursor: "pointer",
                                display: "flex", alignItems: "center", gap: 6,
                                transition: "all 0.2s"
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "#e41f07"; e.currentTarget.style.color = "#e41f07"; e.currentTarget.style.background = "#fff0ef"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "#ddd"; e.currentTarget.style.color = "#555"; e.currentTarget.style.background = "#fff"; }}
                        >
                            <i className="ti ti-trash" style={{ fontSize: 12 }} /> Delete Country
                        </button>
                    </div>
                </div>

                {/* ── Unified Single Box UI ─────────────────────────────────── */}
                <div className="card border-0 shadow-sm" style={{ borderRadius: 12, overflow: "hidden" }}>
                    
                    <div style={{ padding: "18px 24px", borderBottom: "1px solid #f0f0f0" }}>
                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end", maxWidth: 1000 }}>


                            {/* parent display */}
                            {level !== "country" && parentId && (
                                <div style={{ flex: "0 0 200px" }}>
                                    <label style={lbl}>{parentLabel[level]}</label>
                                    <div style={{ 
                                        ...inp, 
                                        background: "#f8f9fa", 
                                        color: "#000", 
                                        fontWeight: 700,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        border: "1px dashed #e41f0740"
                                    }}>
                                        <i className="ti ti-link" style={{ color: "#e41f07", fontSize: 12 }} />
                                        {parentOptions().find(o => o.id.toString() === parentId)?.label || "Select Parent"}
                                    </div>
                                </div>
                            )}

                            {/* name input */}
                            <div style={{ flex: "1 1 200px" }}>
                                <label style={lbl}>{level === "pincode" ? "Pincode" : `${cfg.singular} Name`} <span style={{ color: "#e41f07" }}>*</span></label>
                                <input
                                    ref={nameRef}
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    onKeyDown={onEnter}
                                    placeholder={level === "pincode" ? "e.g. 638001" : `e.g. ${cfg.singular === "State" ? "Tamil Nadu" : "India"}`}
                                    style={inp}
                                    autoFocus
                                />
                            </div>

                            <div style={{ flexShrink: 0 }}>
                                <button
                                    onClick={handleAdd}
                                    disabled={!canAdd()}
                                    style={{
                                        border: "none",
                                        background: canAdd() ? "#e41f07" : "#e41f07",
                                        color: "#fff",
                                        borderRadius: 8, padding: "10px 24px",
                                        fontSize: 14, fontWeight: 700,
                                        cursor: canAdd() ? "pointer" : "default",
                                        display: "flex", alignItems: "center", gap: 7,
                                        height: 40,
                                        boxShadow: canAdd() ? "0 4px 12px rgba(228, 31, 7, 0.2)" : "none",
                                        transition: "all 0.2s"
                                    }}
                                >
                                    Submit
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Chips section */}
                    <div style={{ padding: "16px 24px", minHeight: 100, background: "#fafafa" }}>
                        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#666" }}>Existing {cfg.label}</span>
                        </div>
                        {tags.length === 0 ? (
                            <div style={{ color: "#bbb", fontSize: 13 }}>No {level}s added yet.</div>
                        ) : (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {tags.map(t => (
                                    <Tag
                                        key={t.id}
                                        label={t.label}
                                        sub={t.sub}
                                        color={cfg.color}
                                        onClick={level !== "pincode" ? () => handleDrillDown(t.id) : undefined}
                                        onDelete={() => setDel({
                                            label: t.label,
                                            onConfirm: () => {
                                                if (level === "country")  softDel(setCountries, t.id);
                                                if (level === "state")    softDel(setStates, t.id);
                                                if (level === "district") softDel(setDistricts, t.id);
                                                if (level === "taluk")    softDel(setTaluks, t.id);
                                                if (level === "pincode")  softDel(setPincodes, t.id);
                                                setDel(null);
                                            }
                                        })}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {del && <DeleteConfirm label={del.label} onConfirm={del.onConfirm} onCancel={() => setDel(null)} />}
            <Footer />
        </div>
    );
};

export default AssingLocation;
