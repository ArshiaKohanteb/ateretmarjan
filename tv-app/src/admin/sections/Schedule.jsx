import React, { useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, CalendarDays } from "lucide-react";
import { Card, Button, Field, Toggle, Segmented, DaysPicker, TimeEditor, useDraft, todayKey } from "../ui.jsx";
import { uid, WEEKDAYS } from "../../shared/defaults.js";
import { writeTv, patchTv } from "../../shared/store.js";
import { addDays, localInfo } from "../../shared/schedule.js";

const move = (list, i, d) => {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

function nextDateFor(weekday) {
  const t = todayKey();
  const wd = localInfo(Date.now()).weekday;
  return addDays(t, (weekday - wd + 7) % 7);
}

function ItemRow({ item, onChange, onDelete, onUp, onDown, mode, z }) {
  const set = (patch) => onChange({ ...item, ...patch });
  const previewDate = mode === "shabbat" ? nextDateFor(item.day === "fri" ? 5 : 6)
    : mode === "daily" ? nextDateFor((item.days || [])[0] ?? 0) : todayKey();
  return (
    <div className="item-row">
      <div className="item-main">
        <div className="item-top">
          <input className="input input-name" placeholder="Name (e.g. Mincha)" value={item.name || ""} onChange={(e) => set({ name: e.target.value })} />
          {mode === "daily" && (
            <input className="input input-note" placeholder="Note (optional)" value={item.note || ""} onChange={(e) => set({ note: e.target.value })} />
          )}
          {mode === "shabbat" && (
            <Segmented small value={item.day || "sat"} onChange={(day) => set({ day })} options={[{ value: "fri", label: "Friday" }, { value: "sat", label: "Shabbat" }]} />
          )}
        </div>
        {mode === "daily" && <DaysPicker value={item.days || []} onChange={(days) => set({ days })} />}
        <TimeEditor value={item.time} onChange={(time) => set({ time })} allowShabbat={mode !== "daily"} z={z} dateKey={previewDate} />
      </div>
      <div className="item-actions">
        <button className="icon-btn" onClick={onUp} aria-label="Move up"><ChevronUp size={18} /></button>
        <button className="icon-btn" onClick={onDown} aria-label="Move down"><ChevronDown size={18} /></button>
        <button className="icon-btn danger" onClick={onDelete} aria-label="Delete"><Trash2 size={18} /></button>
      </div>
    </div>
  );
}

function ItemList({ items, setItems, mode, z, newItem, addLabel }) {
  return (
    <>
      <div className="item-list">
        {items.length === 0 && <p className="empty-state">Nothing here yet.</p>}
        {items.map((it, i) => (
          <ItemRow
            key={it.id}
            item={it}
            mode={mode}
            z={z}
            onChange={(v) => setItems(items.map((x) => (x.id === it.id ? v : x)))}
            onDelete={() => confirm(`Remove "${it.name || "this time"}"?`) && setItems(items.filter((x) => x.id !== it.id))}
            onUp={() => setItems(move(items, i, -1))}
            onDown={() => setItems(move(items, i, 1))}
          />
        ))}
      </div>
      <Button icon={Plus} onClick={() => setItems([...items, newItem()])}>{addLabel}</Button>
    </>
  );
}

function Weekday({ tv, z }) {
  const [items, setItems] = useDraft(tv.minyanim, (v) => writeTv("minyanim", v));
  return (
    <Card title="Weekday minyanim" subtitle="Pick the days for each time. The TV shows today's list and highlights what's next.">
      <ItemList items={items} setItems={setItems} mode="daily" z={z} addLabel="Add a minyan"
        newItem={() => ({ id: uid(), name: "", note: "", days: [...WEEKDAYS], time: { type: "fixed", value: "" } })} />
    </Card>
  );
}

function Shabbat({ tv, z }) {
  const [items, setItems] = useDraft(tv.shabbat, (v) => writeTv("shabbat", v));
  return (
    <>
      <Card title="Shabbat schedule" subtitle="Candle lighting and Havdalah fill in automatically each week.">
        <ItemList items={items} setItems={setItems} mode="shabbat" z={z} addLabel="Add to Shabbat"
          newItem={() => ({ id: uid(), name: "", day: "sat", time: { type: "fixed", value: "" } })} />
      </Card>
      <Card title="When to show it">
        <Field label="Start showing the Shabbat schedule on">
          <Segmented value={Number(tv.settings.shabbatShowFrom ?? 4)} onChange={(v) => patchTv("settings", { shabbatShowFrom: v })}
            options={[{ value: 3, label: "Wednesday" }, { value: 4, label: "Thursday" }, { value: 5, label: "Friday" }, { value: 0, label: "All week" }]} />
        </Field>
      </Card>
    </>
  );
}

function Special({ tv, z }) {
  const [list, setList] = useDraft(tv.special, (v) => writeTv("special", v));
  const [open, setOpen] = useState(null);
  const today = todayKey();
  const update = (id, patch) => setList(list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  return (
    <Card
      title="Holidays & special days"
      subtitle="A special schedule replaces the weekday minyanim on its dates (Yom Tov, fast days, Chol HaMoed…)."
      action={<Button variant="primary" icon={Plus} onClick={() => { const id = uid(); setList([...list, { id, title: "", start: today, end: today, active: true, items: [] }]); setOpen(id); }}>New</Button>}
    >
      <div className="special-list">
        {list.length === 0 && <p className="empty-state">No special schedules. Add one before a holiday.</p>}
        {list.map((s) => {
          const live = s.active !== false && s.start <= today && (s.end || s.start) >= today;
          const past = (s.end || s.start) < today;
          return (
            <div key={s.id} className={`special ${open === s.id ? "open" : ""}`}>
              <button className="special-head" onClick={() => setOpen(open === s.id ? null : s.id)}>
                <CalendarDays size={20} />
                <span className="special-title">{s.title || "Untitled schedule"}</span>
                <span className="special-dates">{s.start}{s.end && s.end !== s.start ? ` → ${s.end}` : ""}</span>
                {live && <span className="badge badge-live">Showing now</span>}
                {past && <span className="badge">Past</span>}
              </button>
              {open === s.id && (
                <div className="special-body">
                  <div className="grid-3">
                    <Field label="Name shown on TV"><input className="input" placeholder="e.g. Sukkot Schedule" value={s.title} onChange={(e) => update(s.id, { title: e.target.value })} /></Field>
                    <Field label="First day"><input type="date" className="input" value={s.start} onChange={(e) => update(s.id, { start: e.target.value })} /></Field>
                    <Field label="Last day"><input type="date" className="input" value={s.end} onChange={(e) => update(s.id, { end: e.target.value })} /></Field>
                  </div>
                  <Toggle label="Active" checked={s.active !== false} onChange={(active) => update(s.id, { active })} />
                  <ItemList items={s.items || []} setItems={(items) => update(s.id, { items })} mode="special" z={z} addLabel="Add a time"
                    newItem={() => ({ id: uid(), name: "", time: { type: "fixed", value: "" } })} />
                  <Button variant="ghost-danger" icon={Trash2} onClick={() => confirm("Delete this special schedule?") && setList(list.filter((x) => x.id !== s.id))}>Delete schedule</Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function Schedule({ tv, z }) {
  const [tab, setTab] = useState("weekday");
  return (
    <div className="stack">
      <Segmented value={tab} onChange={setTab} options={[{ value: "weekday", label: "Weekday" }, { value: "shabbat", label: "Shabbat" }, { value: "special", label: "Holidays" }]} />
      {tab === "weekday" && <Weekday tv={tv} z={z} />}
      {tab === "shabbat" && <Shabbat tv={tv} z={z} />}
      {tab === "special" && <Special tv={tv} z={z} />}
    </div>
  );
}
