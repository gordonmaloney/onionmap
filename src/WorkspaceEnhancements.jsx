import { useEffect, useRef, useState } from "react";
import { formatShortDate, todayISO } from "./lib/dateUtils";
import { ACTIVITY_TYPES, daysSince, lastEngagement } from "./organisingData";

const id = (p) =>
  `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
export function FilterChips({ filters, campaigns, onRemove, onClear, count }) {
  const labels = {
    layer: filters.layer,
    clout: filters.clout === "all" ? "" : `Reach ${filters.clout}`,
    area: filters.area,
    organiser: filters.organiser,
    campaign:
      campaigns.find((c) => c.id === filters.campaign)?.name ||
      filters.campaign,
    activity: filters.activity,
    recency: {
      14: "Engaged ≤14 days",
      30: "Engaged ≤30 days",
      90: "Engaged ≤90 days",
      old: "Engaged >90 days ago",
      none: "No engagement recorded",
    }[filters.recency],
    followup: {
      overdue: "Follow-up overdue",
      week: "Due this week",
      none: "No follow-up",
    }[filters.followup],
  };
  const active = Object.entries(labels).filter(
    ([k, v]) => filters[k] !== "all" && v,
  );
  if (!active.length) return null;
  return (
    <div className="filter-chips">
      <b>{count} people match</b>
      {active.map(([k, v]) => (
        <button key={k} onClick={() => onRemove(k)}>
          {v} ×
        </button>
      ))}
      <button className="clear-all" onClick={onClear}>
        Clear all
      </button>
    </div>
  );
}

export function BulkBar({
  selectedCount,
  shownCount,
  selectMode,
  onSelectShown,
  onClear,
  onFollowup,
  onUpdate,
  onAssign,
  onCampaign,
  onReachOut,
  reachableCount,
}) {
  if (!selectedCount && !selectMode) return null;
  return (
    <div className="bulk-bar visible" role="region" aria-label="Selection actions">
      <div className="selection-dock-summary">
        <span className="selection-dock-count" aria-hidden="true">{selectedCount || "–"}</span>
        <span>
          <b>{selectedCount ? `${selectedCount} people selected` : "Select people"}</b>
          <small>{selectedCount ? "Click a person to add or remove them" : "Drag around people, or click them one at a time"}</small>
        </span>
      </div>
      <div className="selection-dock-actions">
        <button onClick={onSelectShown}>Select all ({shownCount})</button>
        {selectedCount > 0 && (
          <>
            <button className="bulk-update-action" onClick={onUpdate}>Update selected</button>
            <button onClick={onFollowup}>Follow up</button>
            <button onClick={onAssign}>Assign</button>
            <button onClick={onCampaign}>Campaign</button>
            <button className="reachout-action" disabled={!reachableCount} onClick={onReachOut}>
              ReachOut {reachableCount ? `(${reachableCount})` : ""} ↗
            </button>
          </>
        )}
        <button className="selection-dock-clear" onClick={onClear}>
          {selectedCount ? "Clear selection" : "Cancel"}
        </button>
      </div>
    </div>
  );
}

export function ActionMenu({ onActivity, onAttendance, onFollowup }) {
  return (
    <details className="action-menu">
      <summary>
        Record / plan <span aria-hidden="true">⌄</span>
      </summary>
      <div>
        <button onClick={onActivity}>
          <b>Record activity</b>
          <small>A conversation, meeting or action</small>
        </button>
        <button onClick={onAttendance}>
          <b>Record attendance</b>
          <small>Mark a group event quickly</small>
        </button>
        <button onClick={onFollowup}>
          <b>Set a follow-up</b>
          <small>Commit to the next organising step</small>
        </button>
      </div>
    </details>
  );
}

export function BulkActionModal({
  kind,
  personIds,
  people,
  campaigns,
  onClose,
  onApply,
}) {
  const [d, setD] = useState({
      operation: "activity",
      campaignId: "",
      assignedTo: "",
      dueDate: "",
      purpose: "Campaign conversation",
      date: todayISO(),
      activityType: "meeting",
      structure: "Branch meeting",
      role: "participant",
      notes: "",
    }),
    title =
      kind === "followup"
        ? "Set follow-ups"
        : kind === "assign"
          ? "Assign organiser"
          : kind === "update"
            ? "Update selected people"
          : "Add to campaign",
    invalid =
      kind === "update"
        ? d.operation === "note"
          ? !d.notes.trim()
          : !d.date || !d.activityType
        : kind === "campaign"
        ? !d.campaignId
        : kind === "assign"
          ? !d.assignedTo.trim()
          : !d.dueDate || !d.assignedTo.trim();
  return (
    <Dialog
      title={title}
      eyebrow={`${personIds.length} PEOPLE`}
      onClose={onClose}
    >
      <div className="bulk-summary">
        {personIds.slice(0, 8).map((pid) => (
          <span key={pid}>{people.find((p) => p.id === pid)?.name}</span>
        ))}
        {personIds.length > 8 && <span>+{personIds.length - 8} more</span>}
      </div>
      {kind === "campaign" && (
        <Field label="Campaign">
          <select
            value={d.campaignId}
            onChange={(e) => setD({ ...d, campaignId: e.target.value })}
          >
            <option value="">Choose campaign…</option>
            {campaigns
              .filter((c) => c.status === "active")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </Field>
      )}
      {kind === "update" && (
        <>
          <Field label="What would you like to do?">
            <select value={d.operation} onChange={(e) => setD({ ...d, operation: e.target.value })}>
              <option value="activity">Record the same activity for everyone</option>
              <option value="note">Add a note to everyone</option>
            </select>
          </Field>
          {d.operation === "note" ? (
            <Field label="Note to append">
              <textarea autoFocus rows="4" value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} placeholder="This will be added after each person’s existing notes." />
            </Field>
          ) : (
            <>
              <div className="pair">
                <Field label="Activity">
                  <select value={d.activityType} onChange={(e) => setD({ ...d, activityType: e.target.value })}>
                    {['Contact','Participation','Contribution','Non-participation'].map((group) => (
                      <optgroup label={group} key={group}>
                        {ACTIVITY_TYPES.filter((type) => type.group === group).map((type) => <option value={type.id} key={type.id}>{type.label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </Field>
                <Field label="Date">
                  <input type="date" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} />
                </Field>
              </div>
              <Field label="Event, structure or activity name">
                <input value={d.structure} onChange={(e) => setD({ ...d, structure: e.target.value })} placeholder="Branch meeting, demonstration, phonebank…" />
              </Field>
              <div className="pair">
                <Field label="Campaign">
                  <select value={d.campaignId} onChange={(e) => setD({ ...d, campaignId: e.target.value })}>
                    <option value="">No specific campaign</option>
                    {campaigns.filter((campaign) => campaign.status === "active").map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
                  </select>
                </Field>
                <Field label="Their role">
                  <select value={d.role} onChange={(e) => setD({ ...d, role: e.target.value })}>
                    <option value="participant">Participated</option>
                    <option value="helper">Helped</option>
                    <option value="lead">Led or facilitated</option>
                  </select>
                </Field>
              </div>
              <Field label="Shared notes (optional)">
                <textarea rows="3" value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} placeholder="Context that applies to everyone selected" />
              </Field>
            </>
          )}
        </>
      )}
      {kind === "assign" && (
        <Field label="Organiser">
          <input
            value={d.assignedTo}
            onChange={(e) => setD({ ...d, assignedTo: e.target.value })}
          />
        </Field>
      )}
      {kind === "followup" && (
        <>
          <Field label="Purpose">
            <input
              value={d.purpose}
              onChange={(e) => setD({ ...d, purpose: e.target.value })}
            />
          </Field>
          <div className="pair">
            <Field label="Due date">
              <input
                type="date"
                value={d.dueDate}
                onChange={(e) => setD({ ...d, dueDate: e.target.value })}
              />
            </Field>
            <Field label="Assigned to">
              <input
                value={d.assignedTo}
                onChange={(e) => setD({ ...d, assignedTo: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Campaign">
            <select
              value={d.campaignId}
              onChange={(e) => setD({ ...d, campaignId: e.target.value })}
            >
              <option value="">General organising</option>
              {campaigns
                .filter((c) => c.status === "active")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>
        </>
      )}
      <footer>
        <button className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="primary"
          disabled={invalid}
          onClick={() => onApply(d)}
        >
          Apply to {personIds.length} people
        </button>
      </footer>
    </Dialog>
  );
}

function Field({ label, children }) {
  return (
    <label className="dialog-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Dialog({ title, eyebrow, onClose, children }) {
  const ref = useRef(),
    returnTo = useRef(document.activeElement);
  useEffect(() => {
    const returnFocus = returnTo.current;
    ref.current?.focus();
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = [
          ...ref.current.querySelectorAll(
            'button,input,select,textarea,[href],[tabindex]:not([tabindex="-1"])',
          ),
        ].filter((x) => !x.disabled);
        if (!items.length) return;
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    addEventListener("keydown", key);
    return () => {
      removeEventListener("keydown", key);
      returnFocus?.focus?.();
    };
  }, [onClose]);
  return (
    <div
      className="shade"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="enhancement-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="enhancement-title"
        tabIndex="-1"
        ref={ref}
      >
        <header>
          <div>
            <small>{eyebrow}</small>
            <h2 id="enhancement-title">{title}</h2>
          </div>
          <button className="icon" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="dialog-body">{children}</div>
      </section>
    </div>
  );
}

export function FollowupOutcomeModal({
  followup,
  person,
  campaign,
  onClose,
  onSave,
}) {
  const [d, setD] = useState({
    outcome: "Conversation completed",
    notes: "",
    next: false,
    nextDate: "",
    review: false,
  });
  return (
    <Dialog
      title={`Complete follow-up with ${person?.name}`}
      eyebrow="RECORD THE OUTCOME"
      onClose={onClose}
    >
      <Field label="Outcome">
        <select
          value={d.outcome}
          onChange={(e) => setD({ ...d, outcome: e.target.value })}
        >
          {[
            "Conversation completed",
            "No answer",
            "Rearranged",
            "Declined",
            "Agreed to attend",
            "Took a task",
            "Introduced another person",
          ].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </Field>
      <Field label="Notes">
        <textarea
          rows="3"
          value={d.notes}
          onChange={(e) => setD({ ...d, notes: e.target.value })}
        />
      </Field>
      <label className="dialog-check">
        <input
          type="checkbox"
          checked={d.next}
          onChange={(e) => setD({ ...d, next: e.target.checked })}
        />{" "}
        Another follow-up is needed
      </label>
      {d.next && (
        <Field label="Next date">
          <input
            type="date"
            value={d.nextDate}
            onChange={(e) => setD({ ...d, nextDate: e.target.value })}
          />
        </Field>
      )}
      <label className="dialog-check">
        <input
          type="checkbox"
          checked={d.review}
          onChange={(e) => setD({ ...d, review: e.target.checked })}
        />{" "}
        Review this person’s onion position after saving
      </label>
      <p className="dialog-context">
        {campaign?.name || "General organising"} · due{" "}
        {formatShortDate(followup.dueDate)}
      </p>
      <footer>
        <button className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="primary" onClick={() => onSave(d)}>
          Save outcome
        </button>
      </footer>
    </Dialog>
  );
}

export function CampaignModal({ campaign, onClose, onSave }) {
  const [d, setD] = useState(
    campaign || {
      id: id("campaign"),
      name: "",
      status: "active",
      owner: "",
      description: "",
    },
  );
  return (
    <Dialog
      title={campaign ? "Edit campaign" : "Create campaign"}
      eyebrow="ORGANISING WORK"
      onClose={onClose}
    >
      <Field label="Campaign name">
        <input
          autoFocus
          value={d.name}
          onChange={(e) => setD({ ...d, name: e.target.value })}
        />
      </Field>
      <div className="pair">
        <Field label="Owner">
          <input
            value={d.owner}
            onChange={(e) => setD({ ...d, owner: e.target.value })}
          />
        </Field>
        <Field label="Status">
          <select
            value={d.status}
            onChange={(e) => setD({ ...d, status: e.target.value })}
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </Field>
      </div>
      <Field label="Description">
        <textarea
          rows="4"
          value={d.description}
          onChange={(e) => setD({ ...d, description: e.target.value })}
        />
      </Field>
      <footer>
        <button className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="primary"
          disabled={!d.name.trim()}
          onClick={() => onSave({ ...d, name: d.name.trim() })}
        >
          Save campaign
        </button>
      </footer>
    </Dialog>
  );
}

export function CampaignManager({ campaigns, onClose, onSave }) {
  const [editing, setEditing] = useState(false);
  if (editing)
    return (
      <CampaignModal
        campaign={editing === true ? null : editing}
        onClose={() => setEditing(false)}
        onSave={(campaign) => {
          onSave(campaign);
          setEditing(false);
        }}
      />
    );
  return (
    <Dialog title="Campaigns" eyebrow="ORGANISING WORK" onClose={onClose}>
      <div className="campaign-manager">
        <p>
          Keep campaign names and ownership clear so filters and follow-ups stay
          useful.
        </p>
        {campaigns.map((c) => (
          <button key={c.id} onClick={() => setEditing(c)}>
            <span>
              <b>{c.name}</b>
              <small>{c.description || "No description yet"}</small>
            </span>
            <i className={c.status}>{c.status}</i>
          </button>
        ))}
      </div>
      <footer>
        <button className="secondary" onClick={onClose}>
          Close
        </button>
        <button className="primary" onClick={() => setEditing(true)}>
          + New campaign
        </button>
      </footer>
    </Dialog>
  );
}

export function SectorModal({ config, onClose, onSave, onAutoSize }) {
  const [d, setD] = useState(config),
    presets = {
      work: {
        title: "Main area of interest",
        labels: [
          "Member defence",
          "Campaign work",
          "Branch activity",
          "Community organising",
        ],
      },
      recency: {
        title: "Recency of involvement",
        labels: [
          "Within 14 days",
          "15–30 days",
          "31–90 days",
          "Over 90 days / none",
        ],
      },
      tenure: {
        title: "Tenure type",
        labels: [
          "Private tenant",
          "Social tenant",
          "Owner-occupier",
          "Other / unknown",
        ],
      },
    };
  const apply = (key) => setD({ ...d, ...presets[key] });
  return (
    <Dialog
      title="Pizza slices"
      eyebrow="THIRD MAP DIMENSION"
      onClose={onClose}
    >
      <div className="sector-intro">
        <p>
          Choose what position around the onion means. The title describes the
          question; each coloured slice is one possible value.
        </p>
        <label className="dialog-check">
          <input
            type="checkbox"
            checked={d.enabled}
            onChange={(e) => setD({ ...d, enabled: e.target.checked })}
          />{" "}
          Show slices on the onion
        </label>
        <div className="sector-presets">
          <b>Starting points</b>
          <button onClick={() => apply("work")}>Area of interest</button>
          <button onClick={() => apply("recency")}>Engagement recency</button>
          <button onClick={() => apply("tenure")}>Tenure type</button>
        </div>
      </div>
      <Field label="What do the slices show?">
        <input
          value={d.title || ""}
          onChange={(e) => setD({ ...d, title: e.target.value })}
          placeholder="e.g. Main area of interest"
        />
      </Field>
      <div className="sector-fields">
        {d.labels.map((label, index) => (
          <Field key={index} label={`Value ${index + 1}`}>
            <span className={`slice-input slice-colour-${index}`}>
              <i />
              <input
                value={label}
                onChange={(e) =>
                  setD({
                    ...d,
                    labels: d.labels.map((value, i) =>
                      i === index ? e.target.value : value,
                    ),
                  })
                }
                placeholder="Name this slice"
              />
            </span>
          </Field>
        ))}
      </div>
      <div className="slice-widths">
        {(d.sizes || [90, 90, 90, 90]).map((size, index) => (
          <label key={index}>
            <span>{d.labels[index] || `Value ${index + 1}`}</span>
            <input
              type="range"
              min="20"
              max="280"
              value={size}
              onChange={(event) => {
                const sizes = [...(d.sizes || [90, 90, 90, 90])];
                const next = (index + 1) % 4;
                const change = +event.target.value - sizes[index];
                if (sizes[next] - change < 20) return;
                sizes[index] += change;
                sizes[next] -= change;
                setD({ ...d, sizes });
              }}
            />
            <b>{Math.round((size / 360) * 100)}%</b>
          </label>
        ))}
      </div>
      <div className="slice-sizing">
        <b>Slice widths</b>
        <p>
          Drag the small tabs on the onion to fine-tune widths, or size them in
          proportion to the people currently in each slice.
        </p>
        <button
          className="secondary"
          onClick={() => setD({ ...d, sizes: onAutoSize(d) })}
        >
          Size by number of people
        </button>
        <button
          className="secondary"
          onClick={() => setD({ ...d, sizes: [90, 90, 90, 90] })}
        >
          Make equal
        </button>
      </div>
      <footer>
        <button className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="primary"
          onClick={() =>
            onSave({
              ...d,
              title: d.title?.trim() || "Custom grouping",
              sizes: d.sizes || [90, 90, 90, 90],
              labels: d.labels.map(
                (label, index) => label.trim() || `Value ${index + 1}`,
              ),
            })
          }
        >
          Save slices
        </button>
      </footer>
    </Dialog>
  );
}

export function ContextSummary({
  person,
  activities,
  followups,
  campaigns,
  onOpen,
  onCampaigns,
}) {
  if (!person)
    return (
      <section className="context-summary">
        <small>WHAT NEXT?</small>
        <h3>Use the map to plan</h3>
        <p>
          Filter for a useful organising question, select people, then assign a
          next step.
        </p>
        <button onClick={onCampaigns}>Manage campaigns</button>
      </section>
    );
  const last = lastEngagement(person.id, activities),
    records = activities.filter((a) => a.personId === person.id),
    open = followups.filter(
      (f) => f.personId === person.id && f.status === "open",
    ),
    campaignIds = [...new Set(records.flatMap((a) => a.campaignIds))];
  return (
    <section className="context-summary person">
      <small>SELECTED PERSON</small>
      <h3>{person.name}</h3>
      <p>
        {person.area} · {person.organiser || "No organiser assigned"}
      </p>
      <dl>
        <div>
          <dt>Last engagement</dt>
          <dd>{last ? `${daysSince(last.date)} days ago` : "Not recorded"}</dd>
        </div>
        <div>
          <dt>Campaigns</dt>
          <dd>
            {campaignIds
              .map((id) => campaigns.find((c) => c.id === id)?.name)
              .filter(Boolean)
              .join(", ") || "None recorded"}
          </dd>
        </div>
        <div>
          <dt>Follow-ups</dt>
          <dd>{open.length || "None"}</dd>
        </div>
      </dl>
      <button onClick={onOpen}>Open full details</button>
    </section>
  );
}
