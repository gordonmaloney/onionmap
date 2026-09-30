import { useEffect, useRef, useState } from "react";
import "./App.css";
import "./circle.css";
import "./theme-layout.css";
import "./header-mobile.css";
import "./enhancements.css";
import "./accessibility-polish.css";
import {
  ActivityPanel,
  ActivityModal,
  AttendanceModal,
  FollowupModal,
  FollowupsView,
} from "./OrganisingTools";
import {
  ACTIVITY_TYPES,
  SEED_ACTIVITIES,
  SEED_CAMPAIGNS,
  SEED_FOLLOWUPS,
  lastEngagement,
  daysSince,
} from "./organisingData";
import OrganisingDataTransfer from "./OrganisingDataTransfer";
import { todayISO, isOverdue, isDueWithin } from "./lib/dateUtils";
import {
  loadSession,
  saveSession,
  backupSession,
  restoreBackup,
} from "./lib/sessionStore";
import { createReachOutLink } from "./lib/reachoutLink";
import {
  DEFAULT_SECTORS,
  DEFAULT_SECTOR_SIZES,
  normaliseSectorSizes,
  positionPeople,
  remapAngleBetweenSectorSizes,
  sectorAngle,
  sectorIndexForAngle,
  withMapPosition,
} from "./lib/mapPosition";
import {
  FilterChips,
  BulkBar,
  ActionMenu,
  BulkActionModal,
  FollowupOutcomeModal,
  CampaignManager,
  SectorModal,
  ContextSummary,
} from "./WorkspaceEnhancements";

const LAYERS = [
  {
    id: "constituency",
    name: "Constituency",
    desc: "In our organising universe, not meaningfully involved yet.",
  },
  {
    id: "member",
    name: "Member",
    desc: "Members with little active involvement.",
  },
  {
    id: "involved",
    name: "Involved",
    desc: "Have attended, participated or taken some action.",
  },
  {
    id: "active",
    name: "Active",
    desc: "Reliable people who participate and take responsibility.",
  },
  {
    id: "core",
    name: "Core / Leader",
    desc: "Organise others and build the organisation.",
  },
];
const REACH = [
  {
    name: "Not yet mapped",
    short: "Not yet mapped",
    desc: "We do not yet know enough about their relationships.",
  },
  {
    name: "Some connections",
    short: "Some connections",
    desc: "Has identifiable relationships with a few people.",
  },
  {
    name: "Trusted by a group",
    short: "Trusted by a group",
    desc: "Is listened to or respected by a recognisable group.",
  },
  {
    name: "Can bring others",
    short: "Can bring others",
    desc: "Can reliably encourage several people to act.",
  },
  {
    name: "Broad organising reach",
    short: "Broad reach",
    desc: "Has significant influence across a clear constituency.",
  },
];
const raw = [
  [
    "Amara Okafor",
    "core",
    3,
    "Ash Court",
    "Leila",
    "Co-chairs the repairs group.",
    "p4;p7;p13",
  ],
  [
    "Leila Hassan",
    "core",
    4,
    "North Estate",
    "Sam",
    "Natural convenor; people ask her before acting.",
    "p1;p6;p11;p16",
  ],
  [
    "Tomás Rivera",
    "active",
    2,
    "Mill House",
    "Leila",
    "Reliable on turnout and translation.",
    "p8;p20",
  ],
  [
    "June Patel",
    "active",
    3,
    "Ash Court",
    "Leila",
    "Runs the floor WhatsApp groups.",
    "p5;p10;p15",
  ],
  [
    "Darren Cole",
    "constituency",
    4,
    "North Estate",
    "Sam",
    "Respected caretaker; not yet a member.",
    "p9;p12;p18;p23",
  ],
  [
    "Ruth Mensah",
    "active",
    2,
    "North Estate",
    "Sam",
    "Takes responsibility for welcome calls.",
    "p14",
  ],
  [
    "Maya Chen",
    "involved",
    3,
    "Ash Court",
    "Leila",
    "Popular parent; attended two meetings.",
    "p15;p21",
  ],
  [
    "Owen Price",
    "member",
    1,
    "Mill House",
    "Leila",
    "Joined after rent increase.",
    "p20",
  ],
  [
    "Fatima Begum",
    "member",
    2,
    "North Estate",
    "Sam",
    "Trusted on her landing.",
    "p12",
  ],
  [
    "Callum Reid",
    "involved",
    1,
    "Ash Court",
    "Leila",
    "Helped with petition stalls.",
    "",
  ],
  [
    "Nadiya Ali",
    "involved",
    2,
    "North Estate",
    "Sam",
    "Good one-to-one conversations.",
    "p18",
  ],
  [
    "Ben Walker",
    "constituency",
    1,
    "North Estate",
    "Sam",
    "Spoke at the last door knock.",
    "",
  ],
  [
    "Grace Kim",
    "active",
    2,
    "Ash Court",
    "Leila",
    "Coordinates meeting access.",
    "p22",
  ],
  [
    "Kwame Boateng",
    "member",
    0,
    "North Estate",
    "Sam",
    "New member; follow up next week.",
    "",
  ],
  [
    "Elena Rossi",
    "member",
    1,
    "Ash Court",
    "Leila",
    "Interested in damp campaign.",
    "",
  ],
  [
    "Aisha Clarke",
    "involved",
    2,
    "Mill House",
    "Sam",
    "Strong relationship with young tenants.",
    "p19",
  ],
  [
    "Peter Novak",
    "constituency",
    0,
    "Mill House",
    "Leila",
    "Met at community kitchen.",
    "",
  ],
  [
    "Sofia Ahmed",
    "member",
    1,
    "North Estate",
    "Sam",
    "Works evenings; prefers texts.",
    "",
  ],
  [
    "Jay Williams",
    "constituency",
    2,
    "Mill House",
    "Sam",
    "Youth football coach.",
    "p24",
  ],
  [
    "Inez Silva",
    "involved",
    1,
    "Mill House",
    "Leila",
    "Signed up three neighbours.",
    "",
  ],
  [
    "Marcus Green",
    "constituency",
    0,
    "Ash Court",
    "Leila",
    "No conversation yet.",
    "",
  ],
  [
    "Priya Shah",
    "member",
    2,
    "Ash Court",
    "Leila",
    "Well connected in school community.",
    "p10",
  ],
  [
    "Declan Murphy",
    "constituency",
    1,
    "North Estate",
    "Sam",
    "Caretaking shift worker.",
    "",
  ],
  [
    "Zara Thompson",
    "member",
    3,
    "Mill House",
    "Sam",
    "Trusted union rep at local depot.",
    "p3;p8",
  ],
  [
    "Hannah Liu",
    "active",
    1,
    "Mill House",
    "Leila",
    "Steady admin and follow-up.",
    "",
  ],
];
const SEED = raw.map((p, i) => ({
  id: `p${i + 1}`,
  name: p[0],
  layer: p[1],
  clout: p[2],
  area: p[3],
  organiser: p[4],
  notes: p[5],
  influences: p[6] ? p[6].split(";") : [],
  email: "",
  phone: `+44 7700 900${String(101 + i).slice(-3)}`,
}));
const init = () => ({
  id: `p${Date.now()}`,
  name: "",
  layer: "constituency",
  clout: 0,
  area: "",
  organiser: "",
  notes: "",
  influences: [],
  email: "",
  phone: "",
});
const THEME_KEY = "onionmap.theme",
  FONT_KEY = "onionmap.fontScale",
  FONT_MIN = 0.95,
  FONT_MAX = 1.16,
  FONT_STEP = 0.07;
const initialTheme = () => {
  try {
    return (
      localStorage.getItem(THEME_KEY) ||
      (window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light")
    );
  } catch {
    return "dark";
  }
};
const initialFontScale = () => {
  try {
    return Math.min(
      FONT_MAX,
      Math.max(FONT_MIN, Number(localStorage.getItem(FONT_KEY)) || 1),
    );
  } catch {
    return 1;
  }
};
const initials = (n) =>
  n
    .split(/\s+/)
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
function Icon({ n }) {
  let d = {
    plus: "M12 5v14M5 12h14",
    search: "M21 21l-4-4m2-6a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    close: "M6 6l12 12M18 6 6 18",
    link: "M10 13a5 5 0 0 0 7 1l3-3a5 5 0 0 0-7-7l-2 2m3 5a5 5 0 0 0-7-1l-3 3a5 5 0 0 0 7 7l2-2",
    trash: "M3 6h18m-2 0-1 14H6L5 6m3 0V4h8v2",
    sheet: "M6 2h9l4 4v16H6zM9 11h6M9 15h6",
  }[n];
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
function useModalFocus(onClose) {
  const ref = useRef(),
    returnTo = useRef(document.activeElement);
  useEffect(() => {
    const panel = ref.current,
      returnFocus = returnTo.current;
    panel?.focus();
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = [
          ...panel.querySelectorAll(
            'button,input,select,textarea,summary,[href],[tabindex]:not([tabindex="-1"])',
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
  return ref;
}
function pos(p) {
  let li = LAYERS.findIndex((l) => l.id === p.layer),
    base = [43, 34, 25, 16, 7][li],
    r =
      base +
      (li === 4
        ? Math.max(-1.2, Math.min(1.2, p.mapOffset || 0))
        : Math.max(-2.7, Math.min(2.7, p.mapOffset || 0))),
    a = (((p.mapAngle || 0) - 90) * Math.PI) / 180;
  return { x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r };
}
function Onion({
  people,
  shown,
  selected,
  multiSelected,
  selectMode,
  onSelect,
  onMove,
  lines,
  zoom,
  overlay,
  signals,
  selectedCampaign,
  sectors,
  onResizeSectors,
  onConfigureSectors,
  onAreaSelect,
  onClearSelection,
  onZoom,
}) {
  let ref = useRef(),
    viewportRef = useRef(),
    gesture = useRef({ touches: new Map() }),
    [target, setTarget] = useState(null),
    [marquee, setMarquee] = useState(null),
    active = people.find((p) => p.id === selected),
    outgoing = new Set(active?.influences || []),
    incoming = new Set(
      active
        ? people
            .filter((p) => p.influences.includes(active.id))
            .map((p) => p.id)
        : [],
    ),
    related = new Set([...outgoing, ...incoming]),
    sectorSizes = normaliseSectorSizes(sectors.sizes),
    sectorStart = Number(sectors.startAngle) || 0;
  function pointInOnion(event) {
    const bounds = ref.current.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    };
  }
  function marqueeDown(event) {
    if (event.pointerType !== "mouse" || event.button !== 0 || event.target !== event.currentTarget) return;
    const point = pointInOnion(event);
    gesture.current.marquee = { start: point, additive: event.shiftKey, remove: event.altKey };
    event.currentTarget.setPointerCapture(event.pointerId);
    setMarquee({ x1: point.x, y1: point.y, x2: point.x, y2: point.y });
  }
  function marqueeMove(event) {
    const activeMarquee = gesture.current.marquee;
    if (!activeMarquee || event.pointerType !== "mouse") return;
    const point = pointInOnion(event);
    setMarquee({ x1: activeMarquee.start.x, y1: activeMarquee.start.y, x2: point.x, y2: point.y });
  }
  function marqueeUp(event) {
    const activeMarquee = gesture.current.marquee;
    if (!activeMarquee || event.pointerType !== "mouse") return;
    const point = pointInOnion(event),
      dx = Math.abs(point.x - activeMarquee.start.x),
      dy = Math.abs(point.y - activeMarquee.start.y);
    if (dx < 1 && dy < 1) onClearSelection();
    else {
      const left = Math.min(point.x, activeMarquee.start.x),
        right = Math.max(point.x, activeMarquee.start.x),
        top = Math.min(point.y, activeMarquee.start.y),
        bottom = Math.max(point.y, activeMarquee.start.y),
        ids = people.filter((person) => {
          const location = pos(person);
          return shown.has(person.id) && location.x >= left && location.x <= right && location.y >= top && location.y <= bottom;
        }).map((person) => person.id);
      onAreaSelect(ids, activeMarquee.remove ? "remove" : activeMarquee.additive ? "add" : "replace");
    }
    gesture.current.marquee = null;
    setMarquee(null);
  }
  function touchDown(event) {
    if (event.pointerType !== "touch") return;
    const state = gesture.current;
    state.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (state.touches.size === 2) {
      const [a, b] = [...state.touches.values()];
      state.pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      state.pinchZoom = zoom;
    }
  }
  function touchMove(event) {
    if (event.pointerType !== "touch") return;
    const state = gesture.current, previous = state.touches.get(event.pointerId);
    if (!previous) return;
    state.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (state.touches.size >= 2) {
      const [a, b] = [...state.touches.values()], distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (state.pinchDistance) onZoom(Math.max(0.75, Math.min(1.8, state.pinchZoom * distance / state.pinchDistance)));
    } else {
      viewportRef.current.scrollLeft -= event.clientX - previous.x;
      viewportRef.current.scrollTop -= event.clientY - previous.y;
    }
  }
  function touchUp(event) {
    if (event.pointerType !== "touch") return;
    gesture.current.touches.delete(event.pointerId);
    if (gesture.current.touches.size < 2) gesture.current.pinchDistance = null;
  }
  function locationAt(e) {
    let b = ref.current.getBoundingClientRect(),
      radius = Math.min(b.width, b.height) / 2,
      x = (e.clientX - b.left - b.width / 2) / radius,
      y = (e.clientY - b.top - b.height / 2) / radius,
      d = Math.hypot(x, y),
      layerIndex =
        d < 0.15 ? 4 : d < 0.34 ? 3 : d < 0.53 ? 2 : d < 0.72 ? 1 : 0,
      angle = ((Math.atan2(y, x) * 180) / Math.PI + 90 + 360) % 360,
      base = [43, 34, 25, 16, 7][layerIndex],
      offset = Math.max(-2.7, Math.min(2.7, d * 50 - base));
    return { layerIndex, angle, offset };
  }
  function layerAt(e) {
    return locationAt(e).layerIndex;
  }
  function drop(e) {
    e.preventDefault();
    let id = e.dataTransfer.getData("person"),
      location = locationAt(e);
    setTarget(null);
    onMove(id, LAYERS[location.layerIndex].id, {
      mapAngle: location.angle,
      mapOffset: location.offset,
    });
  }
  function resizeStart(index, event) {
    event.preventDefault();
    event.stopPropagation();
    const start = sectorSizes.slice(),
      startAngle = sectorStart,
      originalAngles = new Map(people.map((person) => [person.id, person.mapAngle])),
      pointerStart = locationAt(event).angle,
      nextIndex = (index + 1) % sectorSizes.length;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const move = (e) => {
      let delta = locationAt(e).angle - pointerStart;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      delta = Math.max(
        20 - start[index],
        Math.min(start[nextIndex] - 20, delta),
      );
      const next = start.slice();
      next[index] += delta;
      next[nextIndex] -= delta;
      const nextAngle = index === sectorSizes.length - 1
        ? (startAngle + delta + 360) % 360
        : startAngle;
      onResizeSectors(
        next,
        new Map(
          [...originalAngles].map(([id, angle]) => [
            id,
            remapAngleBetweenSectorSizes(angle, start, next, startAngle, nextAngle),
          ]),
        ),
        nextAngle,
      );
    };
    const end = () => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", end);
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", end);
  }
  const stops = sectorSizes
    .reduce(
      (all, size, index) => {
        const from = all.edge,
          to = from + size;
        all.parts.push(`var(--slice-${index}) ${from}deg ${to}deg`);
        all.edge = to;
        return all;
      },
      { edge: 0, parts: [] },
    )
    .parts.join(",");
  return (
    <div className="onion-viewport" ref={viewportRef} onPointerDown={touchDown} onPointerMove={touchMove} onPointerUp={touchUp} onPointerCancel={touchUp}>
      <div
        className="onion"
        ref={ref}
        style={{ transform: `scale(${zoom})` }}
        onDragOver={(e) => {
          e.preventDefault();
          setTarget(layerAt(e));
        }}
        onDragLeave={() => setTarget(null)}
        onDrop={drop}
        onPointerDown={marqueeDown}
        onPointerMove={marqueeMove}
        onPointerUp={marqueeUp}
      >
        {marquee && <i className="selection-marquee" style={{ left: `${Math.min(marquee.x1, marquee.x2)}%`, top: `${Math.min(marquee.y1, marquee.y2)}%`, width: `${Math.abs(marquee.x2 - marquee.x1)}%`, height: `${Math.abs(marquee.y2 - marquee.y1)}%` }} />}
      {sectors.enabled && (
        <div className="sectors" aria-hidden="true">
          <i
            className="sector-fill"
            style={{ background: `conic-gradient(from ${sectorStart}deg, ${stops})` }}
          />
          {[0, ...sectorSizes.slice(0, 3)].map((_, index) => {
            const angle = sectorStart + sectorSizes
              .slice(0, index)
              .reduce((sum, value) => sum + value, 0);
            return (
              <i
                className="sector-divider"
                key={`divider-${index}`}
                style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}
              />
            );
          })}
          {sectorSizes.map((_, index) => {
              const angle = sectorStart + sectorSizes
                  .slice(0, index + 1)
                  .reduce((sum, value) => sum + value, 0),
                r = ((angle - 90) * Math.PI) / 180;
              return (
                <button
                  key={index}
                  className="sector-handle"
                  style={{
                  left: `${50 + Math.cos(r) * 51.5}%`,
                  top: `${50 + Math.sin(r) * 51.5}%`,
                  }}
                  onPointerDown={(event) => resizeStart(index, event)}
                  tabIndex="-1"
                >
                  <span>Resize slices</span>
                </button>
              );
            })}
          </div>
        )}
        {LAYERS.map((l, i) => (
          <div
            className={`ring r${i} ${target === i ? "drop-target" : ""}`}
            key={l.id}
          >
            <b>{target === i ? `Move to ${l.name}` : l.name}</b>
          </div>
        ))}
        {lines && (
          <svg
            className="lines"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
          >
            <defs>
              <marker
                id="arr"
                markerWidth="7"
                markerHeight="7"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0 0v6l7-3z" />
              </marker>
            </defs>
            {people
              .filter((a) => shown.has(a.id))
              .flatMap((a) =>
                a.influences.map((id) => {
                  let b = people.find((p) => p.id === id);
                  if (!b || !shown.has(id)) return null;
                  let x = pos(a, people),
                    y = pos(b, people),
                    kind =
                      selected === a.id
                        ? "from-selected"
                        : selected === id
                          ? "to-selected"
                          : "";
                  return (
                    <line
                      className={kind}
                      key={a.id + id}
                      x1={x.x * 10}
                      y1={x.y * 10}
                      x2={y.x * 10}
                      y2={y.y * 10}
                    />
                  );
                }),
              )}
          </svg>
        )}
        {people
          .filter((p) => shown.has(p.id))
          .map((p) => {
            let xy = pos(p, people),
              size = 40 + p.clout * 6,
              signal = signals.get(p.id),
              age = signal?.last ? daysSince(signal.last.date) : null,
              overlayClass =
                overlay === "recency"
                  ? age === null
                    ? "no-data"
                    : age <= 30
                      ? "recent"
                      : age <= 90
                        ? "settling"
                        : "distant"
                  : overlay === "followups" && signal?.overdue
                    ? "needs-followup"
                    : overlay === "campaign" &&
                        selectedCampaign !== "all" &&
                        signal?.campaigns.has(selectedCampaign)
                      ? "in-campaign"
                      : "",
              dim =
                (selected && selected !== p.id && !related.has(p.id)) ||
                (overlay === "campaign" &&
                  selectedCampaign !== "all" &&
                  !signal?.campaigns.has(selectedCampaign));
            return (
              <button
                key={p.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("person", p.id);
                  e.currentTarget.classList.add("dragging");
                }}
                onDragEnd={(e) => {
                  e.currentTarget.classList.remove("dragging");
                  setTarget(null);
                }}
                onClick={(e) => onSelect(p.id, e.shiftKey)}
                onKeyDown={(e) => {
                  if (
                    ![
                      "ArrowUp",
                      "ArrowRight",
                      "ArrowDown",
                      "ArrowLeft",
                    ].includes(e.key)
                  )
                    return;
                  e.preventDefault();
                  let index = LAYERS.findIndex((l) => l.id === p.layer),
                    inward = e.key === "ArrowUp" || e.key === "ArrowRight",
                    nextIndex = Math.max(
                      0,
                      Math.min(LAYERS.length - 1, index + (inward ? 1 : -1)),
                    );
                  if (nextIndex !== index) onMove(p.id, LAYERS[nextIndex].id);
                }}
                aria-keyshortcuts="ArrowUp ArrowRight ArrowDown ArrowLeft"
                className={`node c${p.clout} ${selected === p.id ? "selected" : ""} ${multiSelected.has(p.id) ? "multi-selected" : ""} ${selectMode ? "select-mode" : ""} ${outgoing.has(p.id) ? "outgoing" : ""} ${incoming.has(p.id) ? "incoming" : ""} ${dim ? "dim" : ""} ${overlayClass}`}
                style={{
                  left: xy.x + "%",
                  top: xy.y + "%",
                  width: size,
                  height: size,
                }}
                title={`${p.name} · ${selectMode ? "Click to select" : "Click to open"} · Arrow keys change involvement · ${REACH[p.clout].name}${age === null ? " · no engagement recorded" : ` · ${age} days since engagement`}`}
                aria-pressed={multiSelected.has(p.id)}
                aria-label={`${p.name}. ${LAYERS.find((l) => l.id === p.layer).name}. Organising reach: ${REACH[p.clout].name}`}
              >
                <span>{initials(p.name)}</span>
                <i className="select-mark" aria-hidden="true">
                  ✓
                </i>
                <b>{p.name.split(" ")[0]}</b>
                {signal?.overdue && <em title="Follow-up overdue">!</em>}
              </button>
            );
          })}
        {!shown.size && (
          <div className="empty">
            <b>No people match</b>
            <span>Try clearing a filter.</span>
          </div>
        )}
      </div>
      {sectors.enabled && (
        <section className="chart-slice-key" aria-label={sectors.title}>
          <header>
            <div>
              <small>SLICE SHOWS</small>
              <b>{sectors.title}</b>
            </div>
            <button onClick={onConfigureSectors}>Edit slices</button>
          </header>
          {sectors.labels.map((label, index) => (
            <span key={`${label}-${index}`}>
              <i className={`slice-colour-${index}`} />
              {label}
              <small>
                {
                  people.filter(
                    (person) =>
                      sectorIndexForAngle(person.mapAngle, sectors.sizes, sectors.startAngle) ===
                      index,
                  ).length
                }
              </small>
            </span>
          ))}
          <p>Drag the tabs around the edge to resize.</p>
        </section>
      )}
    </div>
  );
}
function Drawer({
  person,
  people,
  isNew,
  onClose,
  onSave,
  onDelete,
  onSaveAnother,
  activities,
  campaigns,
  followups,
  onAddActivity,
  onAddFollowup,
  sectors,
}) {
  let [d, setD] = useState(person),
    [relationshipSearch, setRelationshipSearch] = useState(""),
    dialogRef = useModalFocus(onClose);
  useEffect(() => setD(person), [person]);
  let set = (k, v) => setD((x) => ({ ...x, [k]: v })),
    incoming = people.filter((p) => p.influences.includes(d.id));
  return (
    <div
      className="shade"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside
        className="drawer"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="person-drawer-title"
        tabIndex="-1"
      >
        <header>
          <div>
            <small>{isNew ? "QUICK ADD" : "PERSON DETAILS"}</small>
            <h2 id="person-drawer-title">{isNew ? "Add a person" : d.name}</h2>
          </div>
          <button
            className="icon"
            onClick={onClose}
            aria-label="Close person details"
          >
            <Icon n="close" />
          </button>
        </header>
        <div className="body">
          <label>
            Name <em>required</em>
            <input
              autoFocus
              value={d.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Full name"
            />
          </label>
          <label>
            Current involvement
            <select
              value={d.layer}
              onChange={(e) => set("layer", e.target.value)}
            >
              {LAYERS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l.desc}
                </option>
              ))}
            </select>
          </label>
          {sectors.enabled && (
            <label>
              {sectors.title || "Custom grouping"}{" "}
              <span className="field-hint">
                Shown by their position around the onion
              </span>
              <select
                value={sectorIndexForAngle(d.mapAngle, sectors.sizes, sectors.startAngle)}
                onChange={(e) =>
                  set("mapAngle", sectorAngle(+e.target.value, sectors.sizes, sectors.startAngle))
                }
              >
                {sectors.labels.map((label, index) => (
                  <option value={index} key={index}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="pair">
            <label>
              Area / building
              <input
                value={d.area}
                onChange={(e) => set("area", e.target.value)}
                placeholder="e.g. Ash Court"
              />
            </label>
            <label>
              Organiser responsible
              <input
                value={d.organiser}
                onChange={(e) => set("organiser", e.target.value)}
                placeholder="Name"
              />
            </label>
          </div>
          {isNew && (
            <label>
              Phone number{" "}
              <span className="field-hint">Optional · used for ReachOut</span>
              <input
                type="tel"
                value={d.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+44 7700 900000"
              />
            </label>
          )}
          <section className="reach-picker">
            <div>
              <b>Organising reach</b>
              <button
                className="help"
                title="A working assessment of observed relationships, not a rating of someone's worth or commitment."
              >
                ?
              </button>
            </div>
            <p>
              A working assessment of relationships we have observed — not a
              rating of worth or commitment.
            </p>
            {REACH.map((r, n) => (
              <button
                type="button"
                className={d.clout === n ? "on" : ""}
                onClick={() => set("clout", n)}
                key={r.name}
              >
                <i style={{ width: 14 + n * 3, height: 14 + n * 3 }} />
                <span>
                  <b>{r.name}</b>
                  <small>{r.desc}</small>
                </span>
              </button>
            ))}
          </section>
          {!isNew && (
            <ActivityPanel
              person={d}
              activities={activities}
              campaigns={campaigns}
              followups={followups}
              onAddActivity={onAddActivity}
              onAddFollowup={onAddFollowup}
            />
          )}
          {!isNew && (
            <>
              <fieldset>
                <legend>People who listen to {d.name}</legend>
                <p>
                  These are directional relationships: {d.name} → another
                  person.
                </p>
                <input
                  className="relationship-search"
                  value={relationshipSearch}
                  onChange={(e) => setRelationshipSearch(e.target.value)}
                  placeholder="Search people…"
                />
                <div className="checks">
                  {people
                    .filter(
                      (p) =>
                        p.id !== d.id &&
                        p.name
                          .toLowerCase()
                          .includes(relationshipSearch.toLowerCase()),
                    )
                    .map((p) => (
                      <label key={p.id}>
                        <input
                          type="checkbox"
                          checked={d.influences.includes(p.id)}
                          onChange={(e) =>
                            set(
                              "influences",
                              e.target.checked
                                ? [...d.influences, p.id]
                                : d.influences.filter((x) => x !== p.id),
                            )
                          }
                        />
                        <i>{initials(p.name)}</i>
                        <span>
                          {p.name}
                          <small>{p.area}</small>
                        </span>
                      </label>
                    ))}
                </div>
              </fieldset>
              {incoming.length > 0 && (
                <section className="incoming-list">
                  <b>People {d.name} listens to</b>
                  {incoming.map((p) => (
                    <span key={p.id}>
                      <i>{initials(p.name)}</i>
                      {p.name}
                    </span>
                  ))}
                </section>
              )}
              <label>
                Working notes
                <textarea
                  rows="3"
                  value={d.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="What matters for the next conversation? What have we observed?"
                />
              </label>
              <label>
                Phone number{" "}
                <span className="field-hint">
                  Used only when opening people in ReachOut
                </span>
                <input
                  type="tel"
                  value={d.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+44 7700 900000"
                />
              </label>
              <details>
                <summary>
                  Email address <span>optional</span>
                </summary>
                <label>
                  Email
                  <input
                    type="email"
                    value={d.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                </label>
              </details>
            </>
          )}
          {isNew && (
            <p className="quick-note">
              Add the essentials now. You can select this person on the map to
              add relationships, notes and contact details.
            </p>
          )}
        </div>
        <footer>
          {isNew ? (
            <button
              className="secondary"
              disabled={!d.name.trim()}
              onClick={() => onSaveAnother({ ...d, name: d.name.trim() })}
            >
              Save & add another
            </button>
          ) : (
            <button className="danger" onClick={() => onDelete(d.id)}>
              <Icon n="trash" /> Remove
            </button>
          )}
          <button
            className="primary"
            disabled={!d.name.trim()}
            onClick={() => onSave({ ...d, name: d.name.trim() })}
          >
            {isNew ? "Add to map" : "Save changes"}
          </button>
        </footer>
      </aside>
    </div>
  );
}
function parse(text, sectors) {
  let lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { rows: [], errors: ["Paste some rows first."] };
  let delim = lines[0].includes("\t") ? "\t" : ",",
    split = (line) => {
      let out = [],
        s = "",
        q = false;
      for (let i = 0; i < line.length; i++) {
        let c = line[i];
        if (c === '"' && line[i + 1] === '"') {
          s += '"';
          i++;
        } else if (c === '"') q = !q;
        else if (c === delim && !q) {
          out.push(s.trim());
          s = "";
        } else s += c;
      }
      return [...out, s.trim()];
    },
    a = lines.map(split),
    head = a[0][0].toLowerCase() === "name",
    errors = [],
    data = head ? a.slice(1) : a,
    importedLabels = (data[0]?.[12] || "")
      .split(";")
      .map((value) => value.trim())
      .filter(Boolean),
    importedSizes = (data[0]?.[13] || "")
      .split(";")
      .map(Number)
      .filter(Number.isFinite),
    importSectors = {
      ...sectors,
      title: data[0]?.[10] || sectors?.title,
      labels: importedLabels.length === 4 ? importedLabels : sectors?.labels,
      sizes: importedSizes.length === 4 ? importedSizes : sectors?.sizes,
      startAngle: Number.isFinite(+data[0]?.[14])
        ? +data[0][14]
        : sectors?.startAngle || 0,
    },
    temp = data.map((r, i) => {
      let n = i + (head ? 2 : 1),
        layer = (r[1] || "")
          .toLowerCase()
          .replace("core / leader", "core")
          .replace("core/leader", "core"),
        reachText = String(r[2] || "").toLowerCase(),
        reachIndex = REACH.findIndex(
          (x) =>
            x.name.toLowerCase() === reachText ||
            x.short.toLowerCase() === reachText,
        ),
        clout = reachIndex >= 0 ? reachIndex : +r[2];
      if (!r[0]) errors.push(`Row ${n}: name is required.`);
      if (!LAYERS.some((l) => l.id === layer))
        errors.push(`Row ${n}: “${r[1]}” is not a recognised layer.`);
      if (!Number.isInteger(clout) || clout < 0 || clout > 4)
        errors.push(
          `Row ${n}: organising reach must be 0–4 or a recognised label.`,
        );
      const metricIndex = importSectors?.labels?.findIndex(
        (label) => label.toLowerCase() === String(r[11] || "").toLowerCase(),
      );
      return {
        id: `i${Date.now()}-${i}`,
        name: r[0],
        layer,
        clout,
        area: r[3] || "",
        organiser: r[4] || "",
        notes: r[5] || "",
        names: (r[6] || "")
          .split(";")
          .map((x) => x.trim())
          .filter(Boolean),
        email: "",
        phone: r[7] || "",
        mapAngle:
          r[8] !== undefined && r[8] !== "" && Number.isFinite(+r[8])
            ? +r[8]
            : metricIndex >= 0
              ? sectorAngle(metricIndex, importSectors.sizes, importSectors.startAngle)
              : undefined,
        mapOffset:
          r[9] !== undefined && r[9] !== "" && Number.isFinite(+r[9])
            ? +r[9]
            : undefined,
      };
    }),
    map = new Map(temp.map((p) => [p.name.toLowerCase(), p.id]));
  temp.forEach((p, i) =>
    p.names.forEach(
      (n) =>
        !map.has(n.toLowerCase()) &&
        errors.push(
          `Row ${i + (head ? 2 : 1)}: relationship “${n}” is not in the pasted data.`,
        ),
    ),
  );
  return {
    errors,
    sectors: importSectors,
    rows: temp.map(({ names, ...p }) => ({
      ...p,
      influences: names.map((n) => map.get(n.toLowerCase())).filter(Boolean),
    })),
  };
}
function Transfer({ people, sectors, onClose, onImport }) {
  let [tab, setTab] = useState("import"),
    [text, setText] = useState(""),
    [result, setResult] = useState(),
    [copied, setCopied] = useState(false),
    names = new Map(people.map((p) => [p.id, p.name])),
    tsv = [
      "name\tlayer\torganising_reach\tarea\torganiser\tnotes\tinfluences\tphone\tmap_angle\tmap_offset\tmetric_name\tmetric_value\tmetric_labels\tmetric_slice_sizes\tmetric_start_angle",
      ...people.map((p) =>
        [
          p.name,
          p.layer,
          p.clout,
          p.area,
          p.organiser,
          p.notes,
          p.influences
            .map((x) => names.get(x))
            .filter(Boolean)
            .join("; "),
          p.phone,
          p.mapAngle,
          p.mapOffset,
          sectors.title,
          sectors.labels[
            sectorIndexForAngle(p.mapAngle, sectors.sizes, sectors.startAngle)
          ],
          sectors.labels.join("; "),
          normaliseSectorSizes(sectors.sizes)
            .map((value) => value.toFixed(2))
            .join("; "),
          sectors.startAngle || 0,
        ]
          .map((x) => String(x).replaceAll("\t", " ").replaceAll("\n", " "))
          .join("\t"),
      ),
    ].join("\n");
  async function copy() {
    await navigator.clipboard.writeText(tsv);
    setCopied(true);
  }
  return (
    <div className="shade">
      <section className="modal">
        <header>
          <div>
            <small>PORTABLE DATA</small>
            <h2>Import / Export</h2>
          </div>
          <button
            className="icon"
            onClick={onClose}
            aria-label="Close import and export"
          >
            <Icon n="close" />
          </button>
        </header>
        <nav>
          <button
            className={tab === "import" ? "on" : ""}
            onClick={() => setTab("import")}
          >
            Import from Sheets
          </button>
          <button
            className={tab === "export" ? "on" : ""}
            onClick={() => setTab("export")}
          >
            Export to Sheets
          </button>
        </nav>
        {tab === "import" ? (
          <div className="transfer">
            <p>
              Copy cells from Google Sheets and paste below. Tab-separated data
              and CSV are supported. Existing <strong>clout</strong> headers are
              still accepted.
            </p>
            <code>
              name · layer · organising_reach · area · organiser · notes ·
              influences · phone · map_angle · map_offset · metric_name ·
              metric_value · metric_labels · metric_slice_sizes ·
              metric_start_angle
            </code>
            <textarea
              rows="10"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setResult(null);
              }}
              placeholder={
                "name\tlayer\torganising_reach\tarea\torganiser\tnotes\tinfluences\tphone\tmap_angle\tmap_offset\tmetric_name\tmetric_value\nRobin Khan\tmember\t3\tWest Block\tAlex\tTrusted neighbour\tMorgan Lee; Jo Bell\t+44 7700 900123\t0\t0\tMain area of interest\tMember defence"
              }
            />
            {result && (
              <div
                className={
                  result.errors.length ? "validation bad" : "validation good"
                }
              >
                {result.errors.length ? (
                  result.errors.map((x) => <span key={x}>{x}</span>)
                ) : (
                  <b>
                    Ready to import {result.rows.length} people. This replaces
                    the current map.
                  </b>
                )}
              </div>
            )}
            <footer>
              <button className="secondary" onClick={onClose}>
                Cancel
              </button>
              {result && !result.errors.length ? (
                <button
                  className="primary"
                onClick={() => onImport(result.rows, result.sectors)}
                >
                  Replace map
                </button>
              ) : (
                <button
                  className="primary"
                  disabled={!text.trim()}
              onClick={() => setResult(parse(text, sectors))}
                >
                  Check & preview
                </button>
              )}
            </footer>
          </div>
        ) : (
          <div className="transfer">
            <p>
              Copy this tab-separated data, select the first cell in Google
              Sheets, and paste.
            </p>
            <textarea rows="13" readOnly value={tsv} />
            <p>
              {people.length} people and all influence relationships and map
              positions included.
            </p>
            <footer>
              <button className="secondary" onClick={onClose}>
                Close
              </button>
              <button className="primary" onClick={copy}>
                {copied ? "Copied!" : "Copy for Google Sheets"}
              </button>
            </footer>
          </div>
        )}
      </section>
    </div>
  );
}
function List({ people, onSelect, selectedPeople, onToggle }) {
  let [sort, setSort] = useState("name"),
    rows = [...people].sort((a, b) =>
      sort === "clout"
        ? b.clout - a.clout
        : String(a[sort]).localeCompare(String(b[sort])),
    );
  return (
    <div className="list">
      <table>
        <thead>
          <tr>
            <th>Select</th>
            {[
              ["name", "Person"],
              ["layer", "Involvement"],
              ["clout", "Organising reach"],
              ["area", "Area / building"],
              ["organiser", "Organiser"],
              ["phone", "Phone"],
            ].map(([k, n]) => (
              <th key={k}>
                <button onClick={() => setSort(k)}>
                  {n}
                  {sort === k ? " ↓" : ""}
                </button>
              </th>
            ))}
            <th>Listens to</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr
              className={selectedPeople.has(p.id) ? "row-selected" : ""}
              onClick={(e) => onSelect(p.id, e.shiftKey)}
              key={p.id}
            >
              <td>
                <input
                  type="checkbox"
                  aria-label={`Select ${p.name}`}
                  checked={selectedPeople.has(p.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggle(p.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </td>
              <td>
                <span className="who">
                  <i>{initials(p.name)}</i>
                  <b>{p.name}</b>
                </span>
              </td>
              <td>
                <span className={"pill " + p.layer}>
                  {LAYERS.find((l) => l.id === p.layer)?.name}
                </span>
              </td>
              <td>
                <span className="reach-cell">
                  <i
                    style={{
                      width: 10 + p.clout * 2,
                      height: 10 + p.clout * 2,
                    }}
                  />
                  <span>
                    <b>{REACH[p.clout].name}</b>
                    <small>{REACH[p.clout].desc}</small>
                  </span>
                </span>
              </td>
              <td>{p.area || "—"}</td>
              <td>{p.organiser || "—"}</td>
              <td>{p.phone || "—"}</td>
              <td>
                {p.influences.length}{" "}
                {p.influences.length === 1 ? "person" : "people"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="none">No people match these filters.</p>}
    </div>
  );
}

function SideRail({
  f,
  setF,
  campaigns,
  onMoreFilters,
}) {
  return (
    <aside className="side-rail">
      <section>
        <small>FOCUS THE MAP</small>
        <label>
          Campaign
          <select
            value={f.campaign}
            onChange={(e) => setF({ ...f, campaign: e.target.value })}
          >
            <option value="all">Any campaign</option>
            <option value="none">No campaign recorded</option>
            {campaigns
              .filter((c) => c.status === "active")
              .map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Last engagement
          <select
            value={f.recency}
            onChange={(e) => setF({ ...f, recency: e.target.value })}
          >
            <option value="all">Any time</option>
            <option value="14">Within 14 days</option>
            <option value="30">Within 30 days</option>
            <option value="90">Within 90 days</option>
            <option value="old">More than 90 days ago</option>
            <option value="none">No engagement recorded</option>
          </select>
        </label>
        <label>
          Follow-up
          <select
            value={f.followup}
            onChange={(e) => setF({ ...f, followup: e.target.value })}
          >
            <option value="all">Any status</option>
            <option value="overdue">Overdue</option>
            <option value="week">Due this week</option>
            <option value="none">No follow-up assigned</option>
          </select>
        </label>
        <button className="more-filters" onClick={onMoreFilters}>More filters…</button>
      </section>
      <section className="imprint">
        <img src="/brand-assets/living-rent-logo.png" alt="Living Rent" />
        <p>Built by members of Living Rent, Scotland's tenants' union.</p>
      </section>
    </aside>
  );
}

export default function App({
  initialSession,
  onWorkspaceChange,
  persistenceStatus = "Saved locally",
  persistenceTone = "saved",
  onExportWorkspace,
  onImportWorkspace,
  onLogout,
}) {
  const initial = useRef(
    initialSession || loadSession({
      people: SEED,
      campaigns: SEED_CAMPAIGNS,
      activities: SEED_ACTIVITIES,
      followups: SEED_FOLLOWUPS,
    }),
  ).current;
  const initialPeople = positionPeople(
    initial.people.map((person) => ({
      ...person,
      phone:
        person.phone ||
        SEED.find((seed) => seed.id === person.id && seed.name === person.name)
          ?.phone ||
        "",
    })),
  );
  const savedSectors = initial.mapSettings?.sectors || {},
    initialSectors = {
      enabled: savedSectors.enabled ?? true,
      title: savedSectors.title || "Main area of interest",
      labels:
        savedSectors.labels || DEFAULT_SECTORS.map((sector) => sector.label),
      sizes: savedSectors.sizes || DEFAULT_SECTOR_SIZES,
      startAngle: Number(savedSectors.startAngle) || 0,
    };
  const [people, setPeople] = useState(initialPeople),
    [activities, setActivities] = useState(initial.activities),
    [campaigns, setCampaigns] = useState(initial.campaigns),
    [followups, setFollowups] = useState(initial.followups),
    [theme, setTheme] = useState(initial.settings?.theme || initialTheme()),
    [fontScale, setFontScale] = useState(initial.settings?.fontScale || initialFontScale()),
    [view, setView] = useState("onion"),
    [selected, setSelected] = useState(),
    [selectedPeople, setSelectedPeople] = useState(new Set()),
    [selectMode, setSelectMode] = useState(false),
    [announcement, setAnnouncement] = useState(""),
    [bulkKind, setBulkKind] = useState(),
    [outcomeFollowup, setOutcomeFollowup] = useState(),
    [campaignModal, setCampaignModal] = useState(false),
    [sectorConfig, setSectorConfig] = useState(initialSectors),
    [sectorModal, setSectorModal] = useState(false),
    [adding, setAdding] = useState(false),
    [activityPerson, setActivityPerson] = useState(),
    [followupPerson, setFollowupPerson] = useState(),
    [attendance, setAttendance] = useState(false),
    [transfer, setTransfer] = useState(false),
    [dataTransfer, setDataTransfer] = useState(false),
    [lines, setLines] = useState(true),
    [filtersOpen, setFiltersOpen] = useState(false),
    [zoom, setZoom] = useState(1),
    [overlay, setOverlay] = useState("none"),
    [undo, setUndo] = useState(),
    [redo, setRedo] = useState(),
    [f, setF] = useState({
      q: "",
      layer: "all",
      clout: "all",
      area: "all",
      organiser: "all",
      campaign: "all",
      activity: "all",
      recency: "all",
      followup: "all",
    }),
    [lastDefaults, setLastDefaults] = useState({
      layer: "constituency",
      area: "",
      organiser: "",
    });
  useEffect(() => {
    const workspace = {
      schemaVersion: 2,
      people,
      campaigns,
      activities,
      followups,
      mapSettings: { sectors: sectorConfig },
      settings: { theme, fontScale },
    };
    if (onWorkspaceChange) onWorkspaceChange(workspace);
    else saveSession(workspace);
  }, [
    people,
    activities,
    campaigns,
    followups,
    sectorConfig,
    theme,
    fontScale,
    onWorkspaceChange,
  ]);
  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(FONT_KEY, String(fontScale));
  }, [theme, fontScale]);
  useEffect(() => {
    if (!announcement) return;
    const timer = setTimeout(() => setAnnouncement(""), 4200);
    return () => clearTimeout(timer);
  }, [announcement]);
  useEffect(() => {
    const clearSelectionWithEscape = (event) => {
      if (event.key !== "Escape" || document.querySelector(".shade")) return;
      setSelectedPeople(new Set());
      setSelectMode(false);
    };
    addEventListener("keydown", clearSelectionWithEscape);
    return () => removeEventListener("keydown", clearSelectionWithEscape);
  }, []);
  const choices = (k) =>
      [...new Set(people.map((p) => p[k]).filter(Boolean))].sort(),
    personActivities = (id) => activities.filter((a) => a.personId === id),
    personFollowups = (id) =>
      followups.filter((x) => x.personId === id && x.status === "open"),
    matchesRecency = (id, band) => {
      let last = lastEngagement(id, activities),
        days = last ? daysSince(last.date) : null;
      return (
        band === "all" ||
        (band === "14" && days !== null && days <= 14) ||
        (band === "30" && days !== null && days <= 30) ||
        (band === "90" && days !== null && days <= 90) ||
        (band === "old" && days !== null && days > 90) ||
        (band === "none" && days === null)
      );
    },
    filtered = people.filter((p) => {
      let q = f.q.toLowerCase(),
        acts = personActivities(p.id),
        fus = personFollowups(p.id);
      return (
        (!q ||
          [p.name, p.area, p.organiser, p.notes].some((x) =>
            x.toLowerCase().includes(q),
          )) &&
        (f.layer === "all" || p.layer === f.layer) &&
        (f.clout === "all" || p.clout === +f.clout) &&
        (f.area === "all" || p.area === f.area) &&
        (f.organiser === "all" || p.organiser === f.organiser) &&
        (f.campaign === "all" ||
          (f.campaign === "none" && !acts.some((a) => a.campaignIds.length)) ||
          acts.some((a) => a.campaignIds.includes(f.campaign))) &&
        (f.activity === "all" || acts.some((a) => a.type === f.activity)) &&
        matchesRecency(p.id, f.recency) &&
        (f.followup === "all" ||
          (f.followup === "overdue" && fus.some((x) => isOverdue(x.dueDate))) ||
          (f.followup === "week" && fus.some((x) => isDueWithin(x.dueDate))) ||
          (f.followup === "none" && !fus.length))
      );
    }),
    shown = new Set(filtered.map((p) => p.id)),
    current = people.find((p) => p.id === selected),
    activeFilters = [
      "layer",
      "clout",
      "area",
      "organiser",
      "campaign",
      "activity",
      "recency",
      "followup",
    ].filter((k) => f[k] !== "all").length,
    signals = new Map(
      people.map((p) => [
        p.id,
        {
          last: lastEngagement(p.id, activities),
          campaigns: new Set(
            personActivities(p.id).flatMap((a) => a.campaignIds),
          ),
          overdue: personFollowups(p.id).some((x) => isOverdue(x.dueDate)),
        },
      ]),
    );
  const announce = (message) => {
      setAnnouncement("");
      setTimeout(() => setAnnouncement(message), 20);
    },
    openInReachOut = async (ids) => {
      const contacts = people.filter(
        (person) => ids.includes(person.id) && person.phone?.trim(),
      );
      if (!contacts.length) {
        announce("Add a phone number before opening ReachOut");
        return;
      }
      const target = window.open("about:blank", "_blank");
      try {
        const link = await createReachOutLink(contacts);
        if (target) {
          target.opener = null;
          target.location.href = link;
        } else window.location.href = link;
        announce(`Opened ${contacts.length} people in ReachOut`);
      } catch (error) {
        target?.close();
        announce(error.message);
      }
    },
    snapshot = () => ({
      schemaVersion: 2,
      people,
      campaigns,
      activities,
      followups,
      mapSettings: { sectors: sectorConfig },
      settings: { theme, fontScale },
    }),
    save = (p) => {
      setPeople((a) =>
        a.some((x) => x.id === p.id)
          ? a.map((x) => (x.id === p.id ? p : x))
          : [...a, p],
      );
      setLastDefaults({ layer: p.layer, area: p.area, organiser: p.organiser });
      setSelected();
      setAdding(false);
      announce(`${p.name} saved`);
    },
    saveAnother = (p) => {
      setPeople((a) => [...a, p]);
      setLastDefaults({ layer: p.layer, area: p.area, organiser: p.organiser });
      setAdding(false);
      setTimeout(() => setAdding(true), 0);
    },
    remove = (id) => {
      if (confirm("Remove this person from the map?")) {
        const before = snapshot();
        setPeople((a) =>
          a
            .filter((p) => p.id !== id)
            .map((p) => ({
              ...p,
              influences: p.influences.filter((x) => x !== id),
            })),
        );
        setUndo({
          label: "Person removed",
          run: () => {
            setPeople(before.people);
            setActivities(before.activities);
            setFollowups(before.followups);
          },
        });
        setSelected();
      }
    },
    clearFilters = () =>
      setF({
        q: "",
        layer: "all",
        clout: "all",
        area: "all",
        organiser: "all",
        campaign: "all",
        activity: "all",
        recency: "all",
        followup: "all",
      }),
    newPerson = () => withMapPosition({ ...init(), ...lastDefaults }),
    addActivity = (a) => {
      setActivities((x) => [...x, a]);
      if (a.followUp)
        setFollowups((x) => [
          ...x,
          {
            id: `f-${Date.now()}`,
            personId: a.personId,
            campaignId: a.campaignIds[0] || "",
            assignedTo: a.assignedTo,
            dueDate: a.followUpDate,
            purpose: a.followUpPurpose,
            notes: "Created from activity",
            status: "open",
          },
        ]);
      setActivityPerson();
    },
    completeFollowup = (fup) => setOutcomeFollowup(fup),
    saveOutcome = (fup, result) => {
      setFollowups((x) =>
        x.map((f) =>
          f.id === fup.id
            ? {
                ...f,
                status: "completed",
                completedAt: todayISO(),
                outcome: result.outcome,
              }
            : f,
        ),
      );
      setActivities((x) => [
        ...x,
        {
          id: `a-${Date.now()}`,
          personId: fup.personId,
          date: todayISO(),
          type:
            result.outcome === "No answer" ? "contact-attempt" : "conversation",
          campaignIds: fup.campaignId ? [fup.campaignId] : [],
          structure: "Follow-up",
          role: "participant",
          notes: result.notes || `${result.outcome}: ${fup.purpose}`,
          recordedBy: fup.assignedTo,
        },
      ]);
      if (result.next && result.nextDate)
        setFollowups((x) => [
          ...x,
          {
            ...fup,
            id: `f-${Date.now()}`,
            dueDate: result.nextDate,
            status: "open",
          },
        ]);
      setOutcomeFollowup();
      if (result.review) setSelected(fup.personId);
    },
    applyBulk = (data) => {
      const ids = [...selectedPeople];
      if (bulkKind === "assign")
        setPeople((x) =>
          x.map((p) =>
            ids.includes(p.id) ? { ...p, organiser: data.assignedTo } : p,
          ),
        );
      if (bulkKind === "update" && data.operation === "note")
        setPeople((currentPeople) =>
          currentPeople.map((person) =>
            ids.includes(person.id)
              ? {
                  ...person,
                  notes: [person.notes?.trim(), data.notes.trim()]
                    .filter(Boolean)
                    .join("\n"),
                }
              : person,
          ),
        );
      if (bulkKind === "update" && data.operation === "activity")
        setActivities((currentActivities) => [
          ...currentActivities,
          ...ids.map((personId, index) => ({
            id: `a-bulk-${Date.now()}-${index}`,
            personId,
            date: data.date,
            type: data.activityType,
            campaignIds: data.campaignId ? [data.campaignId] : [],
            structure: data.structure.trim(),
            role: data.role,
            notes: data.notes.trim(),
            recordedBy: "",
          })),
        ]);
      if (bulkKind === "campaign")
        setActivities((x) => [
          ...x,
          ...ids.map((personId, i) => ({
            id: `a-bulk-${Date.now()}-${i}`,
            personId,
            date: todayISO(),
            type: "conversation",
            campaignIds: [data.campaignId],
            structure: "Campaign planning",
            role: "participant",
            notes: "Added to campaign contact plan",
            recordedBy: "",
          })),
        ]);
      if (bulkKind === "followup")
        setFollowups((x) => [
          ...x,
          ...ids.map((personId, i) => ({
            id: `f-bulk-${Date.now()}-${i}`,
            personId,
            campaignId: data.campaignId,
            assignedTo: data.assignedTo,
            dueDate: data.dueDate,
            purpose: data.purpose,
            status: "open",
            notes: "",
          })),
        ]);
      announce(`Bulk action applied to ${ids.length} people`);
      setBulkKind();
      setSelectedPeople(new Set());
      setSelectMode(false);
    };
  return (
    <div
      className="app"
      data-theme={theme}
      style={{ "--onion-text-scale": fontScale }}
    >
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>
      <a className="skip-link" href="#onion-workspace">
        Skip to organising workspace
      </a>
      <header className="top">
        <a className="brand">
          <b>
            <span>ONION</span>MAP
          </b>
          <i>|</i>
          <small>
            by Tenant<span>Act</span>
          </small>
        </a>
        <div>
          <span className={`saved ${persistenceTone === "saved" ? "ok" : ""} ${persistenceTone}`}>
            <i />
            {persistenceStatus}
          </span>
          <div className="header-display">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>
            <button
              disabled={fontScale <= FONT_MIN}
              onClick={() =>
                setFontScale((v) =>
                  Math.max(FONT_MIN, +(v - FONT_STEP).toFixed(2)),
                )
              }
            >
              A−
            </button>
            <button
              disabled={fontScale >= FONT_MAX}
              onClick={() =>
                setFontScale((v) =>
                  Math.min(FONT_MAX, +(v + FONT_STEP).toFixed(2)),
                )
              }
            >
              A+
            </button>
          </div>
          <details className="session">
            <summary>Session</summary>
            <div>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? "☀" : "☾"}{" "}
                {theme === "dark" ? "Use light mode" : "Use dark mode"}
              </button>
              <button
                onClick={() =>
                  setFontScale((v) =>
                    v >= FONT_MAX
                      ? FONT_MIN
                      : Math.min(FONT_MAX, +(v + FONT_STEP).toFixed(2)),
                  )
                }
              >
                A+ Interface size ({Math.round(fontScale * 100)}%)
              </button>
              <button onClick={() => setTransfer(true)}>
                <Icon n="sheet" /> People import / export
              </button>
              <button onClick={() => setDataTransfer(true)}>
                <Icon n="sheet" /> Activity data
              </button>
              {onExportWorkspace && <button onClick={onExportWorkspace}><Icon n="sheet" /> Export workspace backup</button>}
              {onImportWorkspace && <button onClick={onImportWorkspace}><Icon n="sheet" /> Import workspace backup</button>}
              {onLogout && <button onClick={onLogout}>Log out</button>}
              <button
                className="danger"
                onClick={() => {
                  if (
                    confirm(
                      "Reset to all example data? This replaces your current session.",
                    )
                  ) {
                    backupSession(snapshot());
                    setPeople(positionPeople(SEED));
                    setCampaigns(SEED_CAMPAIGNS);
                    setActivities(SEED_ACTIVITIES);
                    setFollowups(SEED_FOLLOWUPS);
                    setUndo({
                      label: "Example data restored",
                      run: () => {
                        const prior = restoreBackup();
                        if (prior) {
                          setPeople(prior.people);
                          setCampaigns(prior.campaigns);
                          setActivities(prior.activities);
                          setFollowups(prior.followups);
                        }
                      },
                    });
                  }
                }}
              >
                <Icon n="trash" /> Reset example data
              </button>
            </div>
          </details>
          <button
            className="primary"
            onClick={() => {
              setAdding(true);
              setSelected();
            }}
          >
            <Icon n="plus" /> Add person
          </button>
        </div>
      </header>
      <div className="mobile-actions" aria-label="Quick actions">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle colour theme"
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
        <button
          onClick={() =>
            setFontScale((v) =>
              v >= FONT_MAX
                ? FONT_MIN
                : Math.min(FONT_MAX, +(v + FONT_STEP).toFixed(2)),
            )
          }
          aria-label="Change interface size"
        >
          A+
        </button>
        <button
          onClick={() => setTransfer(true)}
          aria-label="Open session import and export"
        >
          •••
        </button>
        <button
          className="add"
          onClick={() => {
            setAdding(true);
            setSelected();
          }}
          aria-label="Add person"
        >
          +
        </button>
      </div>
      <main id="onion-workspace" tabIndex="-1">
        <section className="intro">
          <div>
            <small>YOUR ORGANISING UNIVERSE</small>
            <h1>{view === "followups" ? "Follow-ups" : "Membership map"}</h1>
            <p>
              {people.length} people ·{" "}
              {campaigns.filter((c) => c.status === "active").length} active
              campaigns · {followups.filter((f) => f.status === "open").length}{" "}
              open follow-ups
            </p>
          </div>
          <nav className="views">
            <button
              className={view === "onion" ? "on" : ""}
              onClick={() => setView("onion")}
            >
              <i /> Onion
            </button>
            <button
              className={view === "list" ? "on" : ""}
              onClick={() => setView("list")}
            >
              ☷ List
            </button>
            <button
              className={view === "followups" ? "on" : ""}
              onClick={() => setView("followups")}
            >
              ✓ Follow-ups
            </button>
          </nav>
        </section>
        {view !== "followups" && (
          <>
            <FilterChips
              filters={f}
              campaigns={campaigns}
              count={filtered.length}
              onRemove={(key) => setF({ ...f, [key]: "all" })}
              onClear={clearFilters}
            />
            <BulkBar
              selectedCount={selectedPeople.size}
              shownCount={filtered.length}
              selectMode={selectMode}
              onToggleMode={() => setSelectMode((x) => !x)}
              onSelectShown={() =>
                setSelectedPeople(new Set(filtered.map((p) => p.id)))
              }
              onClear={() => {
                setSelectedPeople(new Set());
                setSelectMode(false);
              }}
              onFollowup={() => setBulkKind("followup")}
              onUpdate={() => setBulkKind("update")}
              onAssign={() => setBulkKind("assign")}
              onCampaign={() => setBulkKind("campaign")}
              reachableCount={
                [...selectedPeople].filter((id) =>
                  people.find((person) => person.id === id)?.phone?.trim(),
                ).length
              }
              onReachOut={() => openInReachOut([...selectedPeople])}
            />
          </>
        )}
        {view === "onion" && (
          <SideRail
            f={f}
            setF={setF}
            campaigns={campaigns}
            activities={activities}
            onMoreFilters={() => setFiltersOpen(true)}
          />
        )}
        {view !== "followups" && (
          <>
            <section className="toolbar">
              <label className="search">
                <Icon n="search" />
                <input
                  aria-label="Search people"
                  value={f.q}
                  onChange={(e) => setF({ ...f, q: e.target.value })}
                  placeholder="Search people, areas, activity…"
                />
              </label>
              <button
                className={"filter-button " + (filtersOpen ? "on" : "")}
                onClick={() => setFiltersOpen(!filtersOpen)}
              >
                Filters {activeFilters > 0 && <b>{activeFilters}</b>}
              </button>
              {activeFilters > 0 && (
                <button className="clear" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
              {view === "onion" && (
                <button className={"select-people-button " + (selectMode ? "on" : "")} onClick={() => {
                  setSelectMode((active) => !active);
                  if (selectMode) setSelectedPeople(new Set());
                }}>□ {selectMode ? "Finish selecting" : "Select people"}</button>
              )}
              <span className="toolbar-spacer" />
              <span className="workspace-status">
                {filtered.length} of {people.length} shown
              </span>
              <ActionMenu
                onActivity={() => setActivityPerson("any")}
                onAttendance={() => setAttendance(true)}
                onFollowup={() => setFollowupPerson("any")}
              />
            </section>
            {filtersOpen && (
              <section className="filters activity-filters">
                <header className="filter-panel-head"><b>Filter people</b><button onClick={() => setFiltersOpen(false)} aria-label="Close filters">×</button></header>
                <label>
                  Involvement
                  <select
                    value={f.layer}
                    onChange={(e) => setF({ ...f, layer: e.target.value })}
                  >
                    <option value="all">All layers</option>
                    {LAYERS.map((l) => (
                      <option value={l.id} key={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Organising reach
                  <select
                    value={f.clout}
                    onChange={(e) => setF({ ...f, clout: e.target.value })}
                  >
                    <option value="all">Any reach</option>
                    {REACH.map((r, n) => (
                      <option key={r.name} value={n}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
                {["area", "organiser"].map((k) => (
                  <label key={k}>
                    {k}
                    <select
                      value={f[k]}
                      onChange={(e) => setF({ ...f, [k]: e.target.value })}
                    >
                      <option value="all">All {k}s</option>
                      {choices(k).map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                ))}
                <label>
                  Campaign
                  <select
                    value={f.campaign}
                    onChange={(e) => setF({ ...f, campaign: e.target.value })}
                  >
                    <option value="all">Any campaign</option>
                    <option value="none">No campaign recorded</option>
                    {campaigns
                      .filter((c) => c.status === "active")
                      .map((c) => (
                        <option value={c.id} key={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Has activity
                  <select
                    value={f.activity}
                    onChange={(e) => setF({ ...f, activity: e.target.value })}
                  >
                    <option value="all">Any activity</option>
                    {ACTIVITY_TYPES.map((t) => (
                      <option value={t.id} key={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Last meaningful engagement
                  <select
                    value={f.recency}
                    onChange={(e) => setF({ ...f, recency: e.target.value })}
                  >
                    <option value="all">Any time</option>
                    <option value="14">Within 14 days</option>
                    <option value="30">Within 30 days</option>
                    <option value="90">Within 90 days</option>
                    <option value="old">More than 90 days ago</option>
                    <option value="none">No engagement recorded</option>
                  </select>
                </label>
                <label>
                  Follow-up
                  <select
                    value={f.followup}
                    onChange={(e) => setF({ ...f, followup: e.target.value })}
                  >
                    <option value="all">Any status</option>
                    <option value="overdue">Overdue</option>
                    <option value="week">Due this week</option>
                    <option value="none">No follow-up assigned</option>
                  </select>
                </label>
              </section>
            )}
          </>
        )}
        {view === "onion" ? (
          <>
            <section className="mapbar">
              <span className="map-mode-hint">Drag people to reposition · drag empty space to select</span>
              <div className="map-actions">
                <button
                  className="history-button"
                  disabled={!undo}
                  onClick={() => {
                    undo?.run();
                    setRedo(undo);
                    setUndo();
                    announce("Change undone");
                  }}
                  aria-label="Undo last map change"
                >
                  ↶
                </button>
                <button
                  className="history-button"
                  disabled={!redo?.redo}
                  onClick={() => {
                    redo?.redo?.();
                    setUndo(redo);
                    setRedo();
                    announce("Change redone");
                  }}
                  aria-label="Redo last map change"
                >
                  ↷
                </button>
                <details className="map-options">
                  <summary>Map options</summary>
                  <div>
                    <label>Overlay<select value={overlay} onChange={(e) => setOverlay(e.target.value)}><option value="none">None</option><option value="recency">Engagement recency</option><option value="campaign" disabled={f.campaign === "all" || f.campaign === "none"}>Selected campaign</option><option value="followups">Overdue follow-ups</option></select></label>
                    <button onClick={() => setLines(!lines)} aria-pressed={lines}><Icon n="link" /> {lines ? "Hide relationships" : "Show relationships"}</button>
                    <button onClick={() => setSectorModal(true)}>◔ Configure slices</button>
                    <button onClick={() => setZoom(1)}>Reset map view</button>
                    <div className="map-help-copy"><b>How to read the onion</b><span>Ring = involvement</span><span>Size = organising reach</span><span>Slice = {sectorConfig.title}</span><small>Reach describes observed relationships, not anyone’s worth or commitment.</small></div>
                  </div>
                </details>
              </div>
            </section>
            <section className="map">
              <Onion
                people={people}
                shown={shown}
                selected={selected}
                multiSelected={selectedPeople}
                selectMode={selectMode}
                onSelect={(id, additive) => {
                  if (selectMode || additive || selectedPeople.size) {
                    const removing = selectedPeople.has(id);
                    setSelectedPeople((s) => {
                      const n = new Set(s);
                      if (n.has(id)) n.delete(id);
                      else n.add(id);
                      return n;
                    });
                    announce(`${people.find((person) => person.id === id)?.name} ${removing ? "removed from" : "added to"} selection`);
                  } else setSelected(id);
                }}
                onAreaSelect={(ids, mode) => {
                  setSelectedPeople((currentSelection) => {
                    const next = mode === "replace" ? new Set() : new Set(currentSelection);
                    ids.forEach((id) => mode === "remove" ? next.delete(id) : next.add(id));
                    return next;
                  });
                  setSelectMode(true);
                  setSelected();
                  announce(`${ids.length} ${ids.length === 1 ? "person" : "people"} ${mode === "remove" ? "removed from" : "added to"} selection`);
                }}
                onClearSelection={() => {
                  setSelectedPeople(new Set());
                  setSelectMode(false);
                  setSelected();
                }}
                onMove={(id, layer, position = {}) => {
                  const person = people.find((p) => p.id === id),
                    previous = person?.layer,
                    previousPosition = {
                      mapAngle: person?.mapAngle,
                      mapOffset: person?.mapOffset,
                    };
                  if (previous === layer && !Object.keys(position).length)
                    return;
                  setPeople((a) =>
                    a.map((p) =>
                      p.id === id ? { ...p, layer, ...position } : p,
                    ),
                  );
                  const message =
                    previous === layer
                      ? `${person?.name} repositioned`
                      : `${person?.name} moved to ${LAYERS.find((l) => l.id === layer)?.name}`;
                  announce(message);
                  setUndo({
                    label: message,
                    run: () =>
                      setPeople((a) =>
                        a.map((p) =>
                          p.id === id
                            ? { ...p, layer: previous, ...previousPosition }
                            : p,
                        ),
                      ),
                    redo: () =>
                      setPeople((a) =>
                        a.map((p) =>
                          p.id === id ? { ...p, layer, ...position } : p,
                        ),
                      ),
                  });
                  setRedo();
                }}
                lines={lines}
                zoom={zoom}
                overlay={overlay}
                signals={signals}
                selectedCampaign={f.campaign}
                sectors={sectorConfig}
                onResizeSectors={(sizes, angles, startAngle) => {
                  setSectorConfig((config) => ({ ...config, sizes, startAngle }));
                  setPeople((currentPeople) =>
                    currentPeople.map((person) => ({
                      ...person,
                      mapAngle: angles.get(person.id) ?? person.mapAngle,
                    })),
                  );
                }}
                onConfigureSectors={() => setSectorModal(true)}
                onZoom={setZoom}
              />
              <div className="floating-zoom" aria-label="Map zoom controls">
                <button onClick={() => setZoom((value) => Math.max(0.75, value - 0.15))} aria-label="Zoom out">−</button>
                <button onClick={() => setZoom(1)} aria-label="Reset zoom">{Math.round(zoom * 100)}%</button>
                <button onClick={() => setZoom((value) => Math.min(1.8, value + 0.15))} aria-label="Zoom in">+</button>
              </div>
              <aside className="key">
                {current && <ContextSummary
                    person={current}
                    activities={activities}
                    followups={followups}
                    campaigns={campaigns}
                    onOpen={() => setSelected(current?.id)}
                    onCampaigns={() => setCampaignModal(true)}
                  />}
                {overlay !== "none" && (
                  <div className="overlay-key">
                    <b>
                      {overlay === "recency"
                        ? "Engagement recency"
                        : overlay === "followups"
                          ? "Follow-up commitments"
                          : "Campaign participation"}
                    </b>
                    <small>
                      {overlay === "recency"
                        ? "Green: within 30 days · amber: 31–90 · dotted: over 90 · grey: no data"
                        : overlay === "followups"
                          ? "Amber ! marks an overdue organiser follow-up."
                          : "People in the selected campaign remain prominent."}
                    </small>
                  </div>
                )}
                {LAYERS.map((l, i) => (
                  <div key={l.id}>
                    <i className={"k" + i} />
                    <span>
                      <b>{l.name}</b>
                      <small>{l.desc}</small>
                    </span>
                    <strong>
                      {people.filter((p) => p.layer === l.id).length}
                    </strong>
                  </div>
                ))}
              </aside>
            </section>
          </>
        ) : view === "list" ? (
          <List
            people={filtered}
            onSelect={setSelected}
            selectedPeople={selectedPeople}
            onToggle={(id) =>
              setSelectedPeople((s) => {
                const n = new Set(s);
                if (n.has(id)) n.delete(id);
                else n.add(id);
                return n;
              })
            }
          />
        ) : (
          <FollowupsView
            people={people}
            campaigns={campaigns}
            activities={activities}
            followups={followups}
            onComplete={completeFollowup}
            onSelect={setSelected}
            onAdd={() => setFollowupPerson("any")}
          />
        )}
      </main>
      {(current || adding) && (
        <Drawer
          person={adding ? newPerson() : current}
          people={people}
          isNew={adding}
          onClose={() => {
            setSelected();
            setAdding(false);
          }}
          onSave={save}
          onSaveAnother={saveAnother}
          onDelete={remove}
          activities={activities}
          campaigns={campaigns}
          followups={followups}
          onAddActivity={() => setActivityPerson(current)}
          onAddFollowup={() => setFollowupPerson(current)}
          sectors={sectorConfig}
        />
      )}{" "}
      {activityPerson && (
        <ActivityModal
          person={activityPerson === "any" ? null : activityPerson}
          people={people}
          campaigns={campaigns}
          onClose={() => setActivityPerson()}
          onSave={addActivity}
        />
      )}{" "}
      {followupPerson && (
        <FollowupModal
          person={followupPerson === "any" ? null : followupPerson}
          people={people}
          campaigns={campaigns}
          onClose={() => setFollowupPerson()}
          onSave={(fup) => {
            setFollowups((x) => [...x, fup]);
            setFollowupPerson();
          }}
        />
      )}
      {attendance && (
        <AttendanceModal
          people={people}
          campaigns={campaigns}
          onClose={() => setAttendance(false)}
          onSave={(rows) => {
            setActivities((x) => [...x, ...rows]);
            setAttendance(false);
          }}
        />
      )}
      {transfer && (
        <Transfer
          people={people}
          sectors={sectorConfig}
          onClose={() => setTransfer(false)}
          onImport={(rows, importedSectors) => {
            const before = snapshot();
            backupSession(before);
            setPeople(rows.map(withMapPosition));
            if (importedSectors?.labels?.length === 4)
              setSectorConfig({ ...importedSectors, enabled: true });
            setTransfer(false);
            setUndo({
              label: "People import applied",
              run: () => {
                setPeople(before.people);
                setCampaigns(before.campaigns);
                setActivities(before.activities);
                setFollowups(before.followups);
              },
            });
          }}
        />
      )}
      {dataTransfer && (
        <OrganisingDataTransfer
          people={people}
          campaigns={campaigns}
          activities={activities}
          followups={followups}
          onClose={() => setDataTransfer(false)}
          onReplace={(kind, rows) => {
            const before = snapshot();
            backupSession(before);
            if (kind === "activities") setActivities(rows);
            else setFollowups(rows);
            setUndo({
              label: `${kind} import applied`,
              run: () => {
                setPeople(before.people);
                setCampaigns(before.campaigns);
                setActivities(before.activities);
                setFollowups(before.followups);
              },
            });
          }}
        />
      )}
      {bulkKind && (
        <BulkActionModal
          kind={bulkKind}
          personIds={[...selectedPeople]}
          people={people}
          campaigns={campaigns}
          onClose={() => setBulkKind()}
          onApply={applyBulk}
        />
      )}{" "}
      {outcomeFollowup && (
        <FollowupOutcomeModal
          followup={outcomeFollowup}
          person={people.find((p) => p.id === outcomeFollowup.personId)}
          campaign={campaigns.find((c) => c.id === outcomeFollowup.campaignId)}
          onClose={() => setOutcomeFollowup()}
          onSave={(result) => saveOutcome(outcomeFollowup, result)}
        />
      )}{" "}
      {sectorModal && (
        <SectorModal
          config={sectorConfig}
          onClose={() => setSectorModal(false)}
          onSave={(config) => {
            setPeople((currentPeople) =>
              currentPeople.map((person) => ({
                ...person,
                mapAngle: remapAngleBetweenSectorSizes(
                  person.mapAngle,
                  sectorConfig.sizes,
                  config.sizes,
                  sectorConfig.startAngle,
                  config.startAngle,
                ),
              })),
            );
            setSectorConfig(config);
            setSectorModal(false);
            announce("Pizza slices updated");
          }}
          onAutoSize={(config) => {
            const counts = [0, 0, 0, 0];
            people.forEach(
              (person) =>
                counts[
                  sectorIndexForAngle(person.mapAngle, config.sizes, config.startAngle)
                ]++,
            );
            const total = Math.max(1, counts.reduce((sum, value) => sum + value, 0));
            return counts.map((count) => Math.max(20, (count / total) * 360));
          }}
        />
      )}{" "}
      {campaignModal && (
        <CampaignManager
          campaigns={campaigns}
          onClose={() => setCampaignModal(false)}
          onSave={(campaign) =>
            setCampaigns((x) =>
              x.some((c) => c.id === campaign.id)
                ? x.map((c) => (c.id === campaign.id ? campaign : c))
                : [...x, campaign],
            )
          }
        />
      )}{" "}
      {announcement && (
        <div className="confirmation-toast" role="status">
          <span>{announcement}</span>
          <i aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
