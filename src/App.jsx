import { useEffect, useMemo, useState } from "react";
import dispoLogo from "./assets/digital-dispo-logo.png";

const BRAND = { line1: "THE DIGITAL DISPO LLC", line2: "PLANNING TOOL" };

const STATUS = ["Open", "In Process", "On Hold", "Closed"];
const PRIORITY = ["Low", "Normal", "High", "Urgent"];
const PEOPLE = ["Joey", "Lloyd", "Jake"];

const CATEGORY = ["Client Acquisition", "Marketing", "Setup", "IT", "Misc."];

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function plusDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function MultiSelectChips({ options, value, onChange }) {
  const selected = Array.isArray(value) ? value : [];

  function toggle(opt) {
    const has = selected.includes(opt);
    const next = has ? selected.filter((x) => x !== opt) : [...selected, opt];
    onChange(next);
  }

  return (
    <div className="dd-chips">
      {options.map((opt) => {
        const isOn = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            className={cx("dd-chip", isOn && "dd-chip-on")}
            onClick={() => toggle(opt)}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function App() {
  // Data (local only for now)
  const [items, setItems] = useState([]);


useEffect(() => {
  async function load() {
    try {
      const base = import.meta.env.VITE_API_BASE_URL;
      const key = import.meta.env.VITE_API_KEY;

      const res = await fetch(`${base}/action-items`, {
        headers: { "x-api-key": key },
      });

      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);

      const rows = JSON.parse(text);

      // Keep your UI labels consistent (API likely returns lowercase statuses)
      const normalizeStatus = (s) => {
        const v = String(s || "").toLowerCase();
        if (v === "open") return "Open";
        if (v === "in_process" || v === "in process") return "In Process";
        if (v === "on_hold" || v === "on hold") return "On Hold";
        if (v === "closed") return "Closed";
        return s || "Open";
      };

      const normalized = Array.isArray(rows)
        ? rows.map((r) => ({
            ...r,
            status: normalizeStatus(r.status),
            // make sure these exist as strings for your UI rendering/sorting
            created_at: r.created_at ? String(r.created_at) : "",
            updated_at: r.updated_at ? String(r.updated_at) : "",
            requested_due_date: r.requested_due_date ? String(r.requested_due_date) : "",
            expected_due_date: r.expected_due_date ? String(r.expected_due_date) : "",
            assigned_to: Array.isArray(r.assigned_to) ? r.assigned_to : [],
          }))
        : [];

      setItems(normalized);
    } catch (e) {
      console.error(e);
      showToast(`Load failed: ${e.message || "error"}`);
    }
  }

  load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);




  // List controls
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [showClosed, setShowClosed] = useState(false);
  const [activePriority, setActivePriority] = useState("All");
  const [activeAssignee, setActiveAssignee] = useState("All");
  const [sortKey, setSortKey] = useState("updated_desc");

  const [creating, setCreating] = useState(false);


  // Toast
  const [toast, setToast] = useState("");

  // Confirm modal state (for Close + Follow-up)
  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    onConfirm: null,
  });

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(() => ({
    title: "",
    description: "",
    category: "Client Acquisition",
    status: "Open",
    requested_due_date: "",
    expected_due_date: "",
    requested_by: "Joey",
    assigned_to: ["Joey"], // multi
    priority: "Normal",
  }));

  // Edit modal
  const [editingId, setEditingId] = useState(null);
  const editingItem = useMemo(
    () => items.find((x) => x.id === editingId) || null,
    [items, editingId]
  );

  const stats = useMemo(() => {
    const total = items.length;
    const open = items.filter((x) => x.status === "Open").length;
    const inproc = items.filter((x) => x.status === "In Process").length;
    const hold = items.filter((x) => x.status === "On Hold").length;
    const closed = items.filter((x) => x.status === "Closed").length;
    return { total, open, inproc, hold, closed };
  }, [items]);

  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(""), 2400);
  }


  const API_BASE = import.meta.env.VITE_API_BASE;
const API_KEY  = import.meta.env.VITE_API_KEY;

function showToast(message, type = "info") {
  setToast({ message, type });
}

/* 👇 PUT IT RIGHT HERE */
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;

  const headers = {
    ...(options.headers || {}),
    "x-api-key": API_KEY,
  };

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = data?.error || data?.message || msg;
    } catch {}
    throw new Error(msg);
  }

  if (res.status === 204) return null;
  return res.json();
}


  function openConfirm(opts) {
    setConfirm({
      open: true,
      title: opts.title || "Confirm",
      message: opts.message || "Are you sure?",
      confirmText: opts.confirmText || "Confirm",
      cancelText: opts.cancelText || "Cancel",
      onConfirm: opts.onConfirm || null,
    });
  }
  function closeConfirm() {
    setConfirm((c) => ({ ...c, open: false, onConfirm: null }));
  }

  function resetCreateForm() {
    setCreateForm(() => ({
      title: "",
      description: "",
      category: "Client Acquisition",
      status: "Open",
      requested_due_date: "",
      expected_due_date: "",
      requested_by: "Joey",
      assigned_to: ["Joey"],
      priority: "Normal",
    }));
  }

  function openCreate() {
    setCreateOpen(true);
  }
  function closeCreate() {
    setCreateOpen(false);
  }

  async function onCreate(e) {
  e.preventDefault();

  // --- Frontend required fields (expected_due_date is NOT required) ---
  const title = (createForm.title || "").trim();
  if (!title) return showToast("Title is required.");

  const assigned = Array.isArray(createForm.assigned_to)
    ? createForm.assigned_to.filter(Boolean)
    : [];
  if (!assigned.length) return showToast("Pick at least 1 assignee.");

  const requestedBy = (createForm.requested_by || "").trim();
  if (!requestedBy) return showToast("Requested by is required.");

  const requestedDue = (createForm.requested_due_date || "").trim();
  if (!requestedDue) return showToast("Requested due date is required.");

  // --- Build payload EXACTLY how the backend expects it ---
  // IMPORTANT: send NULL for blank dates (NOT "")
  const payload = {
    title,
    description: (createForm.description || "").trim() || null,
    category: createForm.category || null,
    priority: createForm.priority || "Normal",
    status: createForm.status || "Open",
    requested_by: requestedBy,
    assigned_to: assigned,
    requested_due_date: requestedDue || null,
    expected_due_date: (createForm.expected_due_date || "").trim() || null, // optional
  };

  try {
    const created = await apiFetch("/action-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // success UI
    setItems((prev) => [created, ...prev]);
    resetCreateForm();
    setCreateOpen(false);
    showToast("Action item created.");
  } catch (err) {
    // if backend returns { error: "..." } this will show it
    showToast(err?.message || "Create failed. Please check required fields and try again.");
  }
}


  function startEdit(id) {
    setEditingId(id);
  }
  function cancelEdit() {
    setEditingId(null);
  }

  // If status is changed to Closed via Edit -> confirm before saving
  function saveEditWithCloseConfirm(patch, originalItem) {
    const goingClosed = originalItem?.status !== "Closed" && patch.status === "Closed";

    if (goingClosed) {
      openConfirm({
        title: "Confirm close",
        message: "Mark this action item as CLOSED?",
        confirmText: "Yes, Close",
        cancelText: "Cancel",
        onConfirm: () => {
          closeConfirm();
          saveEdit(patch, true);
        },
      });
      return;
    }

    saveEdit(patch, false);
  }

  function saveEdit(patch, wasClosedConfirm) {
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((x) => (x.id === editingId ? { ...x, ...patch, updated_at: now } : x))
    );
    setEditingId(null);
    showToast("Saved.");

    // Later: API -> BigQuery update
    // If wasClosedConfirm === true => zapier_type: "close"
  }

  function applyStatus(id, status) {
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status, updated_at: now } : x))
    );
  }

  function requestStatusChange(id, status) {
    if (status === "Closed") {
      const item = items.find((x) => x.id === id);
      openConfirm({
        title: "Confirm close",
        message: "Mark this action item as CLOSED?",
        confirmText: "Yes, Close",
        cancelText: "Cancel",
        onConfirm: () => {
          closeConfirm();
          applyStatus(id, "Closed");
          showToast("Closed.");

          // Later: API + Zapier webhook
          // zapier_type: "close"
          // payload should include full item data (you’ll have it from `item`)
        },
      });
      return;
    }

    applyStatus(id, status);
    showToast(`Status → ${status}`);

    // Later: API update (optional zap)
  }

  function requestFollowUp(id) {
    const item = items.find((x) => x.id === id);
    openConfirm({
      title: "Send follow up",
      message: "Send follow up message?",
      confirmText: "Send",
      cancelText: "Cancel",
      onConfirm: () => {
        closeConfirm();
        showToast("Follow up sent.");

        // Later: API call to Zapier webhook
        // zapier_type: "follow_up"
        // payload should include full item data (item)
      },
    });
  }

  function removeItem(id) {
    if (!confirm("Delete this action item?")) return;
    setItems((prev) => prev.filter((x) => x.id !== id));
    showToast("Deleted.");
    // Later: API -> BigQuery soft-delete
  }

  const filtered = useMemo(() => {
    let rows = [...items];

    if (!showClosed) {
      rows = rows.filter((r) => r.status !== "Closed");
    }

    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const hay = `${r.title} ${r.description} ${r.category} ${r.status} ${r.requested_by} ${(r.assigned_to || []).join(
          " "
        )}`.toLowerCase();
        return hay.includes(q);
      });
    }

    if (activeStatus !== "All") rows = rows.filter((r) => r.status === activeStatus);
    if (activePriority !== "All") rows = rows.filter((r) => r.priority === activePriority);
    if (activeAssignee !== "All")
      rows = rows.filter((r) => (r.assigned_to || []).includes(activeAssignee));

    rows.sort((a, b) => {
      if (sortKey === "updated_desc") return b.updated_at.localeCompare(a.updated_at);
      if (sortKey === "created_desc") return b.created_at.localeCompare(a.created_at);
      const ad = a.expected_due_date || a.requested_due_date || "";
      const bd = b.expected_due_date || b.requested_due_date || "";
      if (sortKey === "due_asc") return ad.localeCompare(bd);
      if (sortKey === "due_desc") return bd.localeCompare(ad);
      return 0;
    });

    return rows;
  }, [items, query, showClosed, activeStatus, activePriority, activeAssignee, sortKey]);

  return (
    <div className="dd-page">
      <header className="dd-header">
        <div className="dd-brand">
          <img className="dd-logo" src={dispoLogo} alt="Digital Dispo logo" />
          <div className="dd-brand-text">
            <div className="dd-title dd-title-tight">{BRAND.line1}</div>
            <div className="dd-subtitle dd-subtitle-strong">{BRAND.line2}</div>
          </div>
        </div>

        <div className="dd-header-right">
          <div className="dd-kpis">
            <div className="dd-kpi">
              <div className="dd-kpi-num">{stats.total}</div>
              <div className="dd-kpi-label">Total</div>
            </div>
            <div className="dd-kpi">
              <div className="dd-kpi-num">{stats.open}</div>
              <div className="dd-kpi-label">Open</div>
            </div>
            <div className="dd-kpi">
              <div className="dd-kpi-num">{stats.inproc}</div>
              <div className="dd-kpi-label">In Process</div>
            </div>
            <div className="dd-kpi">
              <div className="dd-kpi-num">{stats.hold}</div>
              <div className="dd-kpi-label">On Hold</div>
            </div>
            <div className="dd-kpi">
              <div className="dd-kpi-num">{stats.closed}</div>
              <div className="dd-kpi-label">Closed</div>
            </div>
          </div>
        </div>
      </header>

      <main className="dd-main dd-main-full">
        <section className="dd-card dd-list">
          <div className="dd-card-head dd-card-head-row">
            <div>
              <div className="dd-card-title">Action items</div>
              <div className="dd-card-sub">Search + filters + quick status updates.</div>
            </div>

            <div className="dd-controls">
              <button className="dd-btn dd-btn-primary" type="button" onClick={openCreate}>
                + Create Action Item
              </button>

              <input
                className="dd-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
              />

              <select className="dd-select" value={activeStatus} onChange={(e) => setActiveStatus(e.target.value)}>
                {["All", ...STATUS].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select className="dd-select" value={activePriority} onChange={(e) => setActivePriority(e.target.value)}>
                {["All", ...PRIORITY].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <select className="dd-select" value={activeAssignee} onChange={(e) => setActiveAssignee(e.target.value)}>
                {["All", ...PEOPLE].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <label className="dd-showclosed">
                <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
                <span>Show Closed</span>
              </label>

              <select className="dd-select" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                <option value="updated_desc">Sort: Updated (new)</option>
                <option value="created_desc">Sort: Created (new)</option>
                <option value="due_asc">Sort: Due date (soon)</option>
                <option value="due_desc">Sort: Due date (late)</option>
              </select>
            </div>
          </div>

          <div className="dd-table">
            <div className="dd-thead">
              <div>Item</div>
              <div>People</div>
              <div>Dates</div>
              <div>Status</div>
              <div className="dd-right">Actions</div>
            </div>

            {filtered.length === 0 ? (
              <div className="dd-empty">
                <div className="dd-empty-title">No items.</div>
                <div className="dd-empty-sub">Click “Create Action Item” to add one.</div>
              </div>
            ) : (
              filtered.map((r) => (
                <div key={r.id} className="dd-tr">
                  <div className="dd-cell">
                    <div className="dd-item-top">
                      <div className="dd-item-title">{r.title}</div>
                      <span className={cx("dd-pill", `dd-pill-${pillKey(r)}`)}>
                        {r.category} • {r.priority}
                      </span>
                    </div>
                    {r.description ? <div className="dd-item-desc">{r.description}</div> : null}
                  </div>

                  <div className="dd-cell dd-muted">
                    <div>
                      <span className="dd-mini">Requested:</span> {r.requested_by}
                    </div>
                    <div>
                      <span className="dd-mini">Assigned:</span> {(r.assigned_to || []).join(", ")}
                    </div>
                  </div>

                  <div className="dd-cell dd-muted">
                    <div>
                      <span className="dd-mini">Req:</span> {r.requested_due_date || "—"}
                    </div>
                    <div>
                      <span className="dd-mini">Exp:</span> {r.expected_due_date || "—"}
                    </div>
                  </div>

                  <div className="dd-cell">
                    <div className={cx("dd-status", `dd-status-${statusKey(r.status)}`)}>{r.status}</div>

                    {/* Quick status buttons - include Closed */}
                    <div className="dd-quickstatus">
                      {STATUS.filter((s) => s !== r.status).map((s) => (
                        <button
                          key={s}
                          className="dd-chip"
                          onClick={() => requestStatusChange(r.id, s)}
                          type="button"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions stack */}
                  <div className="dd-cell dd-right dd-actions-stack">
                    <button className="dd-btn dd-btn-small" onClick={() => startEdit(r.id)} type="button">
                      Edit
                    </button>
                    <button className="dd-btn dd-btn-small dd-btn-danger" onClick={() => removeItem(r.id)} type="button">
                      Delete
                    </button>
                    <button className="dd-btn dd-btn-small" onClick={() => requestFollowUp(r.id)} type="button">
                      Send Follow Up
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Create Modal */}
      {createOpen ? (
        <CreateModal
          value={createForm}
          onChange={setCreateForm}
          onClose={closeCreate}
          onSubmit={onCreate}
          creating={creating}
        />
      ) : null}


      {/* Edit Modal */}
      {editingItem ? (
        <EditModal item={editingItem} onClose={cancelEdit} onSave={saveEditWithCloseConfirm} />
      ) : null}

      {/* Confirm Modal */}
      {confirm.open ? (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmText={confirm.confirmText}
          cancelText={confirm.cancelText}
          onCancel={closeConfirm}
          onConfirm={() => {
            const fn = confirm.onConfirm;
            if (typeof fn === "function") fn();
          }}
        />
      ) : null}

      {/* Toast */}
      <div className={cx("dd-toast", toast ? "dd-toast-show" : "")}>{toast}</div>
    </div>
  );
}

function statusKey(s) {
  return String(s).toLowerCase().replace(/\s+/g, "-");
}
function pillKey(r) {
  const p = String(r.priority || "Normal").toLowerCase();
  if (p === "urgent") return "urgent";
  if (p === "high") return "high";
  if (p === "low") return "low";
  return "normal";
}

function CreateModal({ value, onChange, onClose, onSubmit, creating }) {
  return (
    <div className="dd-modal-backdrop" role="dialog" aria-modal="true">
      <div className="dd-modal">
        <div className="dd-modal-head">
          <div>
            <div className="dd-modal-title">Create action item</div>
            <div className="dd-modal-sub">Requested due date (creator) vs Expected due date (assignee)</div>
          </div>
          <button className="dd-btn dd-btn-small" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <form className="dd-form" onSubmit={onSubmit}>
          <div className="dd-row dd-row-2">
            <label className="dd-field">
              <span>Title *</span>
              <input
                value={value.title}
                onChange={(e) => onChange((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g., Launch Digital Dispo Planner API"
                maxLength={160}
              />
            </label>

            <label className="dd-field">
              <span>Category</span>
              <select value={value.category} onChange={(e) => onChange((f) => ({ ...f, category: e.target.value }))}>
                {CATEGORY.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="dd-field">
            <span>Description</span>
            <textarea
              value={value.description}
              onChange={(e) => onChange((f) => ({ ...f, description: e.target.value }))}
              placeholder="Details, links, acceptance criteria…"
              rows={3}
              maxLength={2000}
            />
          </label>

          <div className="dd-row dd-row-4">
            <label className="dd-field">
              <span>Requested by</span>
              <select
                value={value.requested_by}
                onChange={(e) => onChange((f) => ({ ...f, requested_by: e.target.value }))}
              >
                {PEOPLE.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            <label className="dd-field">
              <span>Assigned to</span>
              <MultiSelectChips
                options={PEOPLE}
                value={value.assigned_to}
                onChange={(next) => onChange((f) => ({ ...f, assigned_to: next }))}
              />
              <div className="dd-mini" style={{ marginTop: 6 }}>
                Click to toggle assignees.
              </div>
            </label>

            <label className="dd-field">
              <span>Status</span>
              <select value={value.status} onChange={(e) => onChange((f) => ({ ...f, status: e.target.value }))}>
                {STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="dd-field">
              <span>Priority</span>
              <select value={value.priority} onChange={(e) => onChange((f) => ({ ...f, priority: e.target.value }))}>
                {PRIORITY.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="dd-row dd-row-4">
            <label className="dd-field">
              <span>Requested due date</span>
              <input
                type="date"
                value={value.requested_due_date}
                onChange={(e) => onChange((f) => ({ ...f, requested_due_date: e.target.value }))}
              />
            </label>

            <label className="dd-field">
              <span>Expected due date</span>
              <input
                type="date"
                value={value.expected_due_date}
                onChange={(e) => onChange((f) => ({ ...f, expected_due_date: e.target.value }))}
              />
            </label>

            <div className="dd-field dd-inline-note">
              <span>Quick add</span>
              <div className="dd-quick">
                <button
                  type="button"
                  className="dd-chip"
                  onClick={() =>
                    onChange((f) => ({
                      ...f,
                      requested_due_date: todayISO(),
                      expected_due_date: todayISO(),
                    }))
                  }
                >
                  Today
                </button>
                <button
                  type="button"
                  className="dd-chip"
                  onClick={() => {
                    const iso = plusDaysISO(7);
                    onChange((f) => ({ ...f, requested_due_date: iso, expected_due_date: iso }));
                  }}
                >
                  +7d
                </button>
              </div>
            </div>

            <div className="dd-actions">
              <button
                className="dd-btn dd-btn-primary"
                type="submit"
                disabled={creating}
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button className="dd-btn" type="button" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditModal({ item, onClose, onSave }) {
  const [draft, setDraft] = useState(() => ({
    title: item.title || "",
    description: item.description || "",
    category: item.category || "Client Acquisition",
    status: item.status || "Open",
    priority: item.priority || "Normal",
    requested_by: item.requested_by || "Joey",
    assigned_to: Array.isArray(item.assigned_to) ? item.assigned_to : ["Joey"],
    requested_due_date: item.requested_due_date || "",
    expected_due_date: item.expected_due_date || "",
  }));

  function submit(e) {
    e.preventDefault();
    const title = draft.title.trim();
    if (!title) return;
    onSave({ ...draft, title, description: draft.description.trim() }, item);
  }

  return (
    <div className="dd-modal-backdrop" role="dialog" aria-modal="true">
      <div className="dd-modal">
        <div className="dd-modal-head">
          <div>
            <div className="dd-modal-title">Edit action item</div>
            <div className="dd-modal-sub">Make changes, then Save.</div>
          </div>
          <button className="dd-btn dd-btn-small" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <form className="dd-form" onSubmit={submit}>
          <div className="dd-row dd-row-2">
            <label className="dd-field">
              <span>Title *</span>
              <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
            </label>

            <label className="dd-field">
              <span>Category</span>
              <select value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}>
                {CATEGORY.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="dd-field">
            <span>Description</span>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              rows={4}
            />
          </label>

          <div className="dd-row dd-row-4">
            <label className="dd-field">
              <span>Requested by</span>
              <select value={draft.requested_by} onChange={(e) => setDraft((d) => ({ ...d, requested_by: e.target.value }))}>
                {PEOPLE.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            <label className="dd-field">
              <span>Assigned to</span>
              <MultiSelectChips
                options={PEOPLE}
                value={draft.assigned_to}
                onChange={(next) => setDraft((d) => ({ ...d, assigned_to: next }))}
              />
            </label>

            <label className="dd-field">
              <span>Status</span>
              <select value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
                {STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="dd-field">
              <span>Priority</span>
              <select value={draft.priority} onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}>
                {PRIORITY.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="dd-row dd-row-4">
            <label className="dd-field">
              <span>Requested due date</span>
              <input
                type="date"
                value={draft.requested_due_date}
                onChange={(e) => setDraft((d) => ({ ...d, requested_due_date: e.target.value }))}
              />
            </label>

            <label className="dd-field">
              <span>Expected due date</span>
              <input
                type="date"
                value={draft.expected_due_date}
                onChange={(e) => setDraft((d) => ({ ...d, expected_due_date: e.target.value }))}
              />
            </label>

            <div className="dd-actions">
              <button className="dd-btn dd-btn-primary" type="submit">
                Save
              </button>
              <button className="dd-btn" type="button" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, confirmText, cancelText, onConfirm, onCancel }) {
  return (
    <div className="dd-modal-backdrop" role="dialog" aria-modal="true">
      <div className="dd-modal" style={{ maxWidth: 560 }}>
        <div className="dd-modal-head">
          <div>
            <div className="dd-modal-title">{title}</div>
            <div className="dd-modal-sub">{message}</div>
          </div>
          <button className="dd-btn dd-btn-small" onClick={onCancel} type="button">
            Close
          </button>
        </div>

        <div className="dd-form" style={{ paddingTop: 10 }}>
          <div className="dd-actions" style={{ justifyContent: "flex-end" }}>
            <button className="dd-btn" type="button" onClick={onCancel}>
              {cancelText}
            </button>
            <button className="dd-btn dd-btn-primary" type="button" onClick={onConfirm}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
