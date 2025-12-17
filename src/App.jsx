import { useEffect, useMemo, useState } from "react";
import dispoLogo from "./assets/digital-dispo-logo.png";

const BRAND = { line1: "THE DIGITAL DISPO LLC", line2: "PLANNING TOOL (Lloyds a bitch)" };

const STATUS = ["Open", "In Process", "On Hold", "Closed"];
const PRIORITY = ["Low", "Normal", "High", "Urgent"];
const PEOPLE = ["Joey", "Lloyd", "Jake"];
const CATEGORY = ["Client Acquisition", "Marketing", "Setup", "IT", "Misc."];

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

function asDateString(v) {
  // Handles BigQuery DATE objects like { value: "2025-12-17" } AND normal strings
  if (!v) return "";
  if (typeof v === "string") return v.slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object" && "value" in v) return String(v.value).slice(0, 10);
  return String(v);
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
  const [items, setItems] = useState([]);

  // Toast
  const [toast, setToast] = useState("");
  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(""), 2400);
  }

  // prevent double-submit on Create
  const [creating, setCreating] = useState(false);

  // Confirm modal state (for Close + Follow-up)
  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    onConfirm: null,
  });

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

  // API helper (prevents “apiFetch not defined” + consistent error handling)
  async function apiFetch(path, opts = {}) {
    const base = import.meta.env.VITE_API_BASE_URL;
    const key = import.meta.env.VITE_API_KEY;

    if (!base) throw new Error("VITE_API_BASE_URL is missing");
    if (!key) throw new Error("VITE_API_KEY is missing");

    const res = await fetch(`${base}${path}`, {
      ...opts,
      headers: {
        "x-api-key": key,
        ...(opts.headers || {}),
      },
    });

    const text = await res.text();
    if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
    return text ? JSON.parse(text) : null;
  }

  // Load items from API on mount
  useEffect(() => {
    async function load() {
      try {
        const rows = await apiFetch("/action-items");

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
              created_at: r.created_at ? String(r.created_at) : "",
              updated_at: r.updated_at ? String(r.updated_at) : "",
              requested_due_date: asDateString(r.requested_due_date),
              expected_due_date: asDateString(r.expected_due_date),
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
    assigned_to: ["Joey"],
    priority: "Normal",
  }));

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

    if (creating) return; // hard double-click guard
    setCreating(true);

    try {
      const title = createForm.title.trim();
      if (!title) {
        showToast("Please enter a title.");
        return;
      }

      const assigned = Array.isArray(createForm.assigned_to)
        ? createForm.assigned_to.filter(Boolean)
        : [];
      if (!assigned.length) {
        showToast("Please select at least one assignee.");
        return;
      }

      // expected_due_date is OPTIONAL on create (assignee sets later)
      const payload = {
        title,
        description: createForm.description?.trim() || null,
        category: createForm.category || null,
        priority: createForm.priority || "Normal",
        status: createForm.status || "Open",
        requested_by: createForm.requested_by || null,
        assigned_to: assigned,
        requested_due_date: createForm.requested_due_date || null,
        expected_due_date: createForm.expected_due_date || null,
      };

      const created = await apiFetch("/action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // normalize returned values for UI
      const createdNorm = {
        ...created,
        requested_due_date: asDateString(created.requested_due_date),
        expected_due_date: asDateString(created.expected_due_date),
        assigned_to: Array.isArray(created.assigned_to) ? created.assigned_to : assigned,
      };

      setItems((prev) => [createdNorm, ...prev]);
      resetCreateForm();
      setCreateOpen(false);
      showToast("Action item created.");
    } catch (err) {
      console.error(err);
      showToast("Create failed. Please check required fields and try again.");
    } finally {
      setCreating(false);
    }
  }

  // Edit modal (local-only for now)
  const [editingId, setEditingId] = useState(null);
  const editingItem = useMemo(
    () => items.find((x) => x.id === editingId) || null,
    [items, editingId]
  );

  function startEdit(id) {
    setEditingId(id);
  }
  function cancelEdit() {
    setEditingId(null);
  }

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
         return saveEdit(patch); // <- return here too (not strictly needed but good)
        },
      });
     return; // confirm flow handled separately
    }
    return saveEdit(patch); // ✅ THIS IS THE KEY
  }



  async function saveEdit(patch) {
  const id = editingId;
  if (!id) return;

  try {
    // Build payload that matches your API schema
    const payload = {
      title: patch.title?.trim() || null,
      description: patch.description ? patch.description.trim() : null,
      category: patch.category || null,
      priority: patch.priority || null,
      status: patch.status || null,
      requested_by: patch.requested_by || null,
      assigned_to: Array.isArray(patch.assigned_to) ? patch.assigned_to : null,

      // dates come from <input type="date"> as YYYY-MM-DD strings
      requested_due_date: patch.requested_due_date ? String(patch.requested_due_date).slice(0, 10) : null,
      expected_due_date: patch.expected_due_date ? String(patch.expected_due_date).slice(0, 10) : null,
    };

    await apiFetch(`/action-items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Update UI locally (fast) — mirrors what backend does
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((x) =>
        x.id === id
          ? {
              ...x,
              ...payload,
              // keep arrays clean
              assigned_to: Array.isArray(payload.assigned_to) ? payload.assigned_to : x.assigned_to,
              updated_at: now,
              // if you closed it, show in UI immediately
              closed_at: payload.status === "Closed" ? (x.closed_at || now) : null,
            }
          : x
      )
    );

    setEditingId(null);
    showToast("Saved.");
  } catch (e) {
    console.error(e);
    showToast(`Save failed: ${e.message || "error"}`);
  }
}


  async function applyStatus(id, status) {
  try {
    await apiFetch(`/action-items/${id}/status`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status }),
});
    const now = new Date().toISOString();
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status, updated_at: now } : x)));
  } catch (e) {
    console.error(e);
    showToast(`Status update failed: ${e.message || "error"}`);
  }
}


  function requestStatusChange(id, status) {
    if (status === "Closed") {
      openConfirm({
        title: "Confirm close",
        message: "Mark this action item as CLOSED?",
        confirmText: "Yes, Close",
        cancelText: "Cancel",
        onConfirm: () => {
          closeConfirm();
          applyStatus(id, "Closed");
          showToast("Closed.");
        },
      });
      return;
    }
    applyStatus(id, status);
    showToast(`Status → ${status}`);
  }

  function requestFollowUp(id) {
    openConfirm({
      title: "Send follow up",
      message: "Send follow up message?",
      confirmText: "Send",
      cancelText: "Cancel",
      onConfirm: () => {
        closeConfirm();
        showToast("Follow up sent.");
      },
    });
  }

  function removeItem(id) {
    if (!confirm("Delete this action item?")) return;
    setItems((prev) => prev.filter((x) => x.id !== id));
    showToast("Deleted.");
  }

  const stats = useMemo(() => {
    const total = items.length;
    const open = items.filter((x) => x.status === "Open").length;
    const inproc = items.filter((x) => x.status === "In Process").length;
    const hold = items.filter((x) => x.status === "On Hold").length;
    const closed = items.filter((x) => x.status === "Closed").length;
    return { total, open, inproc, hold, closed };
  }, [items]);

  const filtered = useMemo(() => {
    let rows = [...items];

    if (!showClosed) rows = rows.filter((r) => r.status !== "Closed");

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
    if (activeAssignee !== "All") rows = rows.filter((r) => (r.assigned_to || []).includes(activeAssignee));

    rows.sort((a, b) => {
      if (sortKey === "updated_desc") return (b.updated_at || "").localeCompare(a.updated_at || "");
      if (sortKey === "created_desc") return (b.created_at || "").localeCompare(a.created_at || "");
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

                    <div className="dd-quickstatus">
                      {STATUS.filter((s) => s !== r.status).map((s) => (
                        <button key={s} className="dd-chip" onClick={() => requestStatusChange(r.id, s)} type="button">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

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

      {createOpen ? (
        <CreateModal
          value={createForm}
          onChange={setCreateForm}
          onClose={closeCreate}
          onSubmit={onCreate}
          creating={creating}
        />
      ) : null}

      {editingItem ? <EditModal item={editingItem} onClose={cancelEdit} onSave={saveEditWithCloseConfirm} /> : null}

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

      <div className={cx("dd-toast", toast ? "dd-toast-show" : "")}>{toast}</div>
    </div>
  );
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
              <select value={value.requested_by} onChange={(e) => onChange((f) => ({ ...f, requested_by: e.target.value }))}>
                {PEOPLE.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            <label className="dd-field">
              <span>Assigned to</span>
              <MultiSelectChips options={PEOPLE} value={value.assigned_to} onChange={(next) => onChange((f) => ({ ...f, assigned_to: next }))} />
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
              <input type="date" value={value.requested_due_date} onChange={(e) => onChange((f) => ({ ...f, requested_due_date: e.target.value }))} />
            </label>

            <label className="dd-field">
              <span>Expected due date</span>
              <input type="date" value={value.expected_due_date} onChange={(e) => onChange((f) => ({ ...f, expected_due_date: e.target.value }))} />
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
              <button className="dd-btn dd-btn-primary" type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create"}
              </button>
              <button className="dd-btn" type="button" onClick={onClose} disabled={creating}>
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
  const [saving, setSaving] = useState(false);
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

  async function submit(e) {
  e.preventDefault();
  if (saving) return;

  const title = draft.title.trim();
  if (!title) return;

  try {
    setSaving(true);
    await onSave(
      { ...draft, title, description: (draft.description || "").trim() },
      item
    );
  } finally {
    setSaving(false);
  }
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
            <textarea value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} rows={4} />
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
              <MultiSelectChips options={PEOPLE} value={draft.assigned_to} onChange={(next) => setDraft((d) => ({ ...d, assigned_to: next }))} />
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
              <input type="date" value={draft.requested_due_date} onChange={(e) => setDraft((d) => ({ ...d, requested_due_date: e.target.value }))} />
            </label>

            <label className="dd-field">
              <span>Expected due date</span>
              <input type="date" value={draft.expected_due_date} onChange={(e) => setDraft((d) => ({ ...d, expected_due_date: e.target.value }))} />
            </label>

            <div className="dd-actions">
              <button
              className="dd-btn dd-btn-primary"
              type="submit"
              disabled={saving}
              style={{ opacity: saving ? 0.7 : 1 }}
              >
             {saving ? "Saving..." : "Save"}
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
