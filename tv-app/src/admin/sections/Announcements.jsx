import React, { useState } from "react";
import { Plus, Pencil, Trash2, Megaphone } from "lucide-react";
import { Card, Button, Field, Toggle, Modal, todayKey } from "../ui.jsx";
import { uid, ANNOUNCEMENT_STYLES } from "../../shared/defaults.js";
import { writeTv } from "../../shared/store.js";

export function status(item, today = todayKey()) {
  if (item.active === false) return { label: "Off", cls: "" };
  if (item.start && item.start > today) return { label: `Starts ${item.start}`, cls: "badge-soon" };
  if (item.end && item.end < today) return { label: "Ended", cls: "" };
  return { label: "On TV", cls: "badge-live" };
}

function Editor({ initial, onSave, onClose }) {
  const [a, setA] = useState(initial);
  const set = (p) => setA({ ...a, ...p });
  return (
    <Modal
      title={initial.title || initial.body ? "Edit announcement" : "New announcement"}
      onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!a.title && !a.body} onClick={() => onSave(a)}>Save</Button>
      </>}
    >
      <Field label="Type">
        <div className="style-pick">
          {Object.entries(ANNOUNCEMENT_STYLES).map(([k, v]) => (
            <button key={k} type="button" className={`style-opt style-${k} ${a.style === k ? "on" : ""}`} onClick={() => set({ style: k })}>
              <b>{v.label}</b><span>{v.hint}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Headline" hint="Short and big. Shows huge on the full-screen slide.">
        <input className="input" maxLength={90} value={a.title} placeholder="e.g. Mazal Tov to the Cohen family!" onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <Field label="Message" hint={`${(a.body || "").length}/320`}>
        <textarea className="input" rows={4} maxLength={320} value={a.body} placeholder="Details people should read from across the room." onChange={(e) => set({ body: e.target.value })} />
      </Field>
      <div className="grid-2">
        <Field label="Start showing (optional)"><input type="date" className="input" value={a.start} onChange={(e) => set({ start: e.target.value })} /></Field>
        <Field label="Stop after (optional)"><input type="date" className="input" value={a.end} onChange={(e) => set({ end: e.target.value })} /></Field>
      </div>
      <Toggle label="Full-screen slide" hint="Appears in the rotation between schedule screens" checked={a.slide !== false} onChange={(slide) => set({ slide })} />
      <Toggle label="Scrolling ticker" hint="Scrolls along the bottom of the schedule screen" checked={a.ticker !== false} onChange={(ticker) => set({ ticker })} />
    </Modal>
  );
}

export default function Announcements({ tv }) {
  const list = tv.announcements;
  const [editing, setEditing] = useState(null);
  const save = (next) => writeTv("announcements", JSON.parse(JSON.stringify(next)));
  const upsert = (a) => {
    save(list.some((x) => x.id === a.id) ? list.map((x) => (x.id === a.id ? a : x)) : [a, ...list]);
    setEditing(null);
  };
  const blank = () => ({ id: uid(), active: true, style: "info", title: "", body: "", slide: true, ticker: true, start: "", end: "" });

  return (
    <div className="stack">
      <Card
        title="Announcements"
        subtitle="Full-screen slides and the bottom ticker. Set dates so they take themselves down."
        action={<Button variant="primary" icon={Plus} onClick={() => setEditing(blank())}>New</Button>}
      >
        {list.length === 0 && (
          <div className="empty-big">
            <Megaphone size={36} />
            <p>No announcements yet.</p>
            <Button variant="primary" icon={Plus} onClick={() => setEditing(blank())}>Write the first one</Button>
          </div>
        )}
        <div className="ann-list">
          {list.map((a) => {
            const st = status(a);
            return (
              <article key={a.id} className={`ann-item style-${a.style} ${a.active === false ? "is-off" : ""}`}>
                <div className="ann-item-body" onClick={() => setEditing(a)}>
                  <div className="ann-item-meta">
                    <span className={`tag tag-${a.style}`}>{ANNOUNCEMENT_STYLES[a.style]?.label || "Announcement"}</span>
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                    {a.slide !== false && <span className="meta">Slide</span>}
                    {a.ticker !== false && <span className="meta">Ticker</span>}
                  </div>
                  {a.title && <h4>{a.title}</h4>}
                  {a.body && <p>{a.body}</p>}
                </div>
                <div className="ann-item-actions">
                  <button type="button" role="switch" aria-label="Show on TV" aria-checked={a.active !== false} className={`switch ${a.active !== false ? "on" : ""}`}
                    onClick={() => save(list.map((x) => (x.id === a.id ? { ...x, active: x.active === false } : x)))}><span /></button>
                  <button className="icon-btn" onClick={() => setEditing(a)} aria-label="Edit"><Pencil size={18} /></button>
                  <button className="icon-btn danger" onClick={() => confirm("Delete this announcement?") && save(list.filter((x) => x.id !== a.id))} aria-label="Delete"><Trash2 size={18} /></button>
                </div>
              </article>
            );
          })}
        </div>
      </Card>
      {editing && <Editor initial={editing} onSave={upsert} onClose={() => setEditing(null)} />}
    </div>
  );
}
