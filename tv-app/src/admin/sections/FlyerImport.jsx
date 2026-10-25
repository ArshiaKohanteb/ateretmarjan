import React, { useRef, useState } from "react";
import { FileScan, Loader2, Trash2, Plus, Check } from "lucide-react";
import { Card, Button, Field, Segmented } from "../ui.jsx";
import { uid } from "../../shared/defaults.js";
import { writeTv } from "../../shared/store.js";
import { addDays, localInfo } from "../../shared/schedule.js";
import { readFlyer } from "../services.js";

const HOLIDAY = /chag|yom tov|rosh|kippur|sukk|shemini|simch|hoshana|pesach|shavuot|purim|chanuk|hanuk|fast|tisha|selichot/i;

function weekDates() {
  const t = localInfo(Date.now());
  const saturday = addDays(t.dateKey, (6 - t.weekday + 7) % 7);
  return { today: t.dateKey, friday: addDays(saturday, -1), saturday };
}

function guessTarget(day, w) {
  if ((day.date === w.friday || day.date === w.saturday) && !HOLIDAY.test(day.label || "")) return "shabbat";
  return "special";
}

const isAuto = (name, re) => re.test(name || "");

export default function FlyerImport({ tv }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [days, setDays] = useState(null);
  const [done, setDone] = useState("");
  const w = weekDates();

  async function read(file) {
    if (!file) return;
    setBusy(true); setError(""); setDone(""); setDays(null);
    try {
      const found = await readFlyer(file, w);
      if (!found.length) throw new Error("No times found on that image.");
      setDays(found.map((d) => ({ ...d, key: uid(), target: guessTarget(d, w), items: d.items.map((i) => ({ ...i, id: uid() })) })));
    } catch (e) {
      console.error(e);
      const msg = String(e.message || e);
      setError(msg.includes("api-not-enabled") || msg.includes("API has not been used") || msg.includes("PERMISSION_DENIED") || msg.includes("not enabled")
        ? "Flyer reading isn't switched on yet. In Firebase, open AI Logic and click Get started (Gemini Developer API)."
        : msg.includes("prepayment") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")
        ? "The flyer reader is out of credit. Add a few dollars of Gemini credit at ai.studio/projects (one flyer costs well under a cent)."
        : `Couldn't read that flyer. ${msg}`);
    }
    setBusy(false);
  }

  const setDay = (key, patch) => setDays(days.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const setItem = (key, id, patch) => setDays(days.map((d) => (d.key === key ? { ...d, items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) } : d)));

  async function apply() {
    const toItem = (i, extra = {}) => ({ id: uid(), name: i.name, note: i.note || "", time: { type: "fixed", value: i.time }, ...extra });

    const shabbatDays = days.filter((d) => d.target === "shabbat");
    if (shabbatDays.length) {
      const items = shabbatDays.flatMap((d) => d.items.map((i) => toItem(i, { day: d.date === w.friday ? "fri" : "sat" })));
      // Keep automatic candle lighting / havdalah unless the flyer gave its own.
      if (!items.some((i) => isAuto(i.name, /candle/i))) items.unshift({ id: uid(), name: "Candle Lighting", day: "fri", time: { type: "zman", zman: "candleLighting", offset: 0, round: 0 } });
      if (!items.some((i) => isAuto(i.name, /havdal|end of/i))) items.push({ id: uid(), name: "Havdalah", day: "sat", time: { type: "zman", zman: "havdalah", offset: 0, round: 0 } });
      await writeTv("shabbat", JSON.parse(JSON.stringify(items)));
    }

    const specialDays = days.filter((d) => d.target === "special" && d.date);
    if (specialDays.length) {
      const dates = new Set(specialDays.map((d) => d.date));
      const kept = (tv.special || []).filter((s) => !(s.start === s.end && dates.has(s.start)));
      const added = specialDays.map((d) => ({ id: uid(), title: d.label || "Special Schedule", start: d.date, end: d.date, active: true, items: d.items.map((i) => toItem(i)) }));
      await writeTv("special", JSON.parse(JSON.stringify([...kept, ...added])));
    }

    const n = days.filter((d) => d.target !== "skip").length;
    setDays(null);
    setDone(`Updated ${n} day${n === 1 ? "" : "s"}. The TV picks it up within seconds.`);
  }

  return (
    <Card
      title="Import the rabbi's flyer"
      subtitle="Upload a photo or screenshot of this week's times. Check what it found, then publish."
    >
      {!days && (
        <div className="drop" onClick={() => !busy && input.current.click()}>
          {busy ? <Loader2 className="spin" size={32} /> : <FileScan size={32} />}
          <b>{busy ? "Reading the flyer…" : "Choose the flyer"}</b>
          <span>Only Ateret Marjan times are kept when it lists both sides.</span>
          <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { read(e.target.files[0]); e.target.value = ""; }} />
        </div>
      )}
      {error && <p className="error">{error}</p>}
      {done && <p className="success"><Check size={18} /> {done}</p>}

      {days && (
        <div className="import">
          {days.map((d) => (
            <div key={d.key} className={`import-day ${d.target === "skip" ? "is-off" : ""}`}>
              <div className="grid-3">
                <Field label="Day"><input className="input" value={d.label} onChange={(e) => setDay(d.key, { label: e.target.value })} /></Field>
                <Field label="Date"><input type="date" className="input" value={d.date} onChange={(e) => setDay(d.key, { date: e.target.value, target: guessTarget({ ...d, date: e.target.value }, w) })} /></Field>
                <Field label="Put it in">
                  <Segmented small value={d.target} onChange={(target) => setDay(d.key, { target })}
                    options={[{ value: "shabbat", label: "Shabbat" }, { value: "special", label: "Holiday / day" }, { value: "skip", label: "Skip" }]} />
                </Field>
              </div>
              <ul className="import-rows">
                {d.items.map((i) => (
                  <li key={i.id}>
                    <input className="input input-name" value={i.name} onChange={(e) => setItem(d.key, i.id, { name: e.target.value })} />
                    <input className="input input-note" placeholder="Note" value={i.note || ""} onChange={(e) => setItem(d.key, i.id, { note: e.target.value })} />
                    <input type="time" className="input input-time" value={i.time} onChange={(e) => setItem(d.key, i.id, { time: e.target.value })} />
                    <button className="icon-btn danger" aria-label="Remove" onClick={() => setDay(d.key, { items: d.items.filter((x) => x.id !== i.id) })}><Trash2 size={18} /></button>
                  </li>
                ))}
              </ul>
              <Button variant="ghost" icon={Plus} onClick={() => setDay(d.key, { items: [...d.items, { id: uid(), name: "", note: "", time: "" }] })}>Add a line</Button>
            </div>
          ))}
          <p className="hint">
            "Shabbat" replaces this week's Shabbat schedule (candle lighting and havdalah stay automatic unless the flyer lists them).
            "Holiday / day" adds a special schedule for that date.
          </p>
          <div className="row-actions">
            <Button variant="primary" icon={Check} onClick={apply}>Publish to the TV</Button>
            <Button variant="ghost" onClick={() => setDays(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
