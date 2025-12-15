import { useMemo, useState } from "react";

/**
 * Digital Dispo Planner — UI-first (frontend-only)
 * Changes in this step:
 * - Action Items takes full page (no left create panel)
 * - Create Action Item is a button -> opens modal
 * - Requested By dropdown: Joey/Lloyd/Jake
 * - Assigned To: multi-select (same options)
 * - Category options updated (no category filter in list)
 * - List filters: Show Closed (checkbox), Priority dropdown, Assigned To dropdown
 */

const BRAND = { name: "Digital Dispo", est: "EST. 2024" };

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

export default function App() {
  // Data (local only for now)
  const [items, setItems] = useState([]);

  // List controls
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [showClosed, setShowClosed] = useState(false);
  const [activePriority, setActivePriority] = useState("All");
  const [activeAssignee, setActiveAssignee] = useState("All");
  const [sortKey, setSortKey] = useState("updated_desc");

  // Toast
  const [toast, setToast] = useState("");

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

  function resetCreateForm() {
    setCreateForm((f) => ({
      ...f,
      title: "",
      description: "",
      category: "Client Acquisition",
      status: "Open",
      requested_due_date: "",
      expected_due_date: "",
      priority: "Normal",
      requested_by: "Joey",
      assigned_to: ["Joey"],
    }));
  }

  function openCreate() {
    setCreateOpen(true);
  }

  function closeCreate() {
    setCreateOpen(false);
  }

  function onCreate(e) {
    e.preventDefault();

    const title = createForm.title.trim();
    if (!title) return showToast("Title is required.");

    const now = new Date().toISOString();

    const assigned = Array.isArray(createForm.assigned_to)
      ? createForm.assigned_to.filter(Boolean)
      : [];

    const newItem = {
      id: uid(),
      title,
      description: createForm.description.trim(),
      category: createForm.category,
      status: createForm.status,
      priority: createForm.priority,
      requested_due_date: createForm.requested_due_date || "",
      expected_due_date: createForm.expected_due_date || "",
      requested_by: createForm.requested_by,
      assigned_to: assigned.length ? assigned : ["Joey"],
      created_at: now,
      updated_at: now,
    };

    setItems((prev) => [newItem, ...prev]);
    resetCreateForm();
    setCreateOpen(false);
    showToast("Action item created.");
    // Later: API -> BigQuery insert + Zapier webhook
  }

  function startEdit(id) {
    setEditingId(id);
  }
  function cancelEdit() {
    setEditingId(null);
  }
  function saveEdit(patch) {
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((x) => (x.id === editingId ? { ...x, ...patch, updated_at: now } : x))
    );
    setEditingId(null);
    showToast("Saved.");
    // Later: API -> BigQuery update + Zapier webhook
  }

  function quickSetStatus(id, status) {
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status, updated_at: now } : x))
    );
    showToast(`Status → ${status}`);
    // Later: API + Zapier webhook
  }

  function removeItem(id) {
    if (!confirm("Delete this action item?")) return;
    setItems((prev) => prev.filter((x) => x.id !== id));
    showToast("Deleted.");
    // Later: API -> BigQuery soft-delete + Zapier webhook
  }

  const filtered = useMemo(() => {
    let rows = [...items];

    // Show Closed checkbox
    if (!showClosed) {
      rows = rows.filter((r) => r.status !== "Closed");
    }

    // Search
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const hay = `${r.title} ${r.description} ${r.category} ${r.status} ${r.requested_by} ${(r.assigned_to || []).join(
          " "
        )}`.toLowerCase();
        return hay.includes(q);
      });
    }

    // Status filter
    if (activeStatus !== "All") {
      rows = rows.filter((r) => r.status === activeStatus);
    }

    // Priority filter
    if (activePriority !== "All") {
      rows = rows.filter((r) => r.priority === activePriority);
    }

    // Assigned-to filter
    if (activeAssignee !== "All") {
      rows = rows.filter((r) => (r.assigned_to || []).includes(activeAssignee));
    }

    // Sort
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
          <div className="dd-mark" aria-hidden="true">
            <span className="dd-mark-inner">D</span>
          </div>
          <div className="dd-brand-text">
            <div className="dd-title">{BRAND.name}</div>
            <div className="dd-subtitle">{BRAND.est}</div>
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

              <select
                className="dd-select"
                value={activeStatus}
                onChange={(e) => setActiveStatus(e.target.value)}
              >
                {["All", ...STATUS].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                className="dd-select"
                value={activePriority}
                onChange={(e) => setActivePriority(e.target.value)}
              >
                {["All", ...PRIORITY].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <select
                className="dd-select"
                value={activeAssignee}
                onChange={(e) => setActiveAssignee(e.target.value)}
              >
                {["All", ...PEOPLE].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <label className="dd-showclosed">
                <input
                  type="checkbox"
                  checked={showClosed}
                  onChange={(e) => setShowClosed(e.target.checked)}
                />
                <span>Show Closed</span>
              </label>

              <select
                className="dd-select"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
              >
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
                      {STATUS.filter((s) => s !== r.status)
                        .slice(0, 2)
                        .map((s) => (
                          <button key={s} className="dd-chip" onClick={() => quickSetStatus(r.id, s)} type="button">
                            {s}
                          </button>
                        ))}
                    </div>
                  </div>

                  <div className="dd-cell dd-right">
                    <button className="dd-btn dd-btn-small" onClick={() => startEdit(r.id)} type="button">
                      Edit
                    </button>
                    <button className="dd-btn dd-btn-small dd-btn-danger" onClick={() => removeItem(r.id)} type="button">
                      Delete
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
        />
      ) : null}

      {/* Edit Modal */}
      {editingItem ? (
        <EditModal
          item={editingItem}
          onClose={cancelEdit}
          onSave={saveEdit}
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

/** CREATE MODAL **/
function CreateModal({ value, onChange, onClose, onSubmit }) {
  return (
    <div className="dd-modal-backdrop" role="dialog" aria-modal="true">
      <div className="dd-modal">
        <div className="dd-modal-head">
          <div>
            <div className="dd-modal-title">Create action item</div>
            <div className="dd-modal-sub">
              Requested due date (creator) vs Expected due date (assignee)
            </div>
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
              <select
                value={value.category}
                onChange={(e) => onChange((f) => ({ ...f, category: e.target.value }))}
              >
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
              <span>Assigned to (multi)</span>
              <select
                multiple
                value={value.assigned_to}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                  onChange((f) => ({ ...f, assigned_to: selected }));
                }}
                style={{ height: 44 }}
              >
                {PEOPLE.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            <label className="dd-field">
              <span>Status</span>
              <select
                value={value.status}
                onChange={(e) => onChange((f) => ({ ...f, status: e.target.value }))}
              >
                {STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="dd-field">
              <span>Priority</span>
              <select
                value={value.priority}
                onChange={(e) => onChange((f) => ({ ...f, priority: e.target.value }))}
              >
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
                    onChange((f) => ({
                      ...f,
                      requested_due_date: iso,
                      expected_due_date: iso,
                    }));
                  }}
                >
                  +7d
                </button>
              </div>
            </div>

            <div className="dd-actions">
              <button className="dd-btn dd-btn-primary" type="submit">
                Create
              </button>
              <button className="dd-btn" type="button" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>

          <div className="dd-modal-footnote">
            <div className="dd-mini">
              Tip: multi-select = hold <b>Ctrl</b> (Windows) / <b>Cmd</b> (Mac) and click.
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/** EDIT MODAL **/
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
    onSave({ ...draft, title, description: draft.description.trim() });
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
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                maxLength={160}
              />
            </label>

            <label className="dd-field">
              <span>Category</span>
              <select
                value={draft.category}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
              >
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
              maxLength={2000}
            />
          </label>

          <div className="dd-row dd-row-4">
            <label className="dd-field">
              <span>Requested by</span>
              <select
                value={draft.requested_by}
                onChange={(e) => setDraft((d) => ({ ...d, requested_by: e.target.value }))}
              >
                {PEOPLE.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            <label className="dd-field">
              <span>Assigned to (multi)</span>
              <select
                multiple
                value={draft.assigned_to}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                  setDraft((d) => ({ ...d, assigned_to: selected }));
                }}
                style={{ height: 44 }}
              >
                {PEOPLE.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            <label className="dd-field">
              <span>Status</span>
              <select
                value={draft.status}
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
              >
                {STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="dd-field">
              <span>Priority</span>
              <select
                value={draft.priority}
                onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}
              >
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
