import React from "react";
import { Check } from "lucide-react";
import { Card, Field, Toggle, Stepper, Segmented, useDraft } from "../ui.jsx";
import { THEMES, THEME_OPTIONS } from "../../shared/themes.js";
import { patchTv } from "../../shared/store.js";

function Swatch({ id }) {
  if (id === "auto") {
    return (
      <div className="swatch swatch-split">
        <Swatch id="ivory" />
        <Swatch id="royal" />
      </div>
    );
  }
  const v = THEMES[id].vars;
  return (
    <div className="swatch swatch-tv">
      <div style={{ background: v["--field"], color: v["--field-ink"] }}>
        <span className="sw-clock">7:42</span>
      </div>
      <div style={{ background: v["--ground"], color: v["--ink"] }}>
        <span className="sw-row" style={{ background: v["--accent"], color: v["--accent-ink"] }}>Mincha <b>5:45</b></span>
        <span className="sw-row">Arvit <b>6:20</b></span>
      </div>
    </div>
  );
}

export default function Display({ tv }) {
  const s = tv.settings;
  const set = (patch) => patchTv("settings", patch);
  const [text, setText] = useDraft(
    { shulName: s.shulName, shulNameHe: s.shulNameHe, donate: s.donate },
    (v) => patchTv("settings", v)
  );
  const zmanimList = window.__TV_ZMANIM__?.zmanimList || [];
  const hidden = s.hiddenZmanim || [];

  return (
    <div className="stack">
      <Card title="Look" subtitle="Pick a theme. The TV switches within a few seconds.">
        <div className="themes">
          {THEME_OPTIONS.map((t) => (
            <button key={t.id} className={`theme-card ${s.theme === t.id ? "on" : ""}`} onClick={() => set({ theme: t.id })}>
              <Swatch id={t.id} />
              <span className="theme-name">{t.name}{s.theme === t.id && <Check size={16} />}</span>
              <span className="theme-blurb">{t.blurb}</span>
            </button>
          ))}
        </div>
        <Field label="On Shabbat, switch to">
          <select className="input" value={s.shabbatTheme || ""} onChange={(e) => set({ shabbatTheme: e.target.value })}>
            <option value="">Keep the same theme</option>
            {Object.entries(THEMES).map(([id, t]) => <option key={id} value={id}>{t.name}</option>)}
          </select>
        </Field>
      </Card>

      <Card title="Rotation" subtitle="The TV shows the schedule, then a few flyers or announcements, then back to the schedule.">
        <div className="grid-2">
          <Field label="Schedule screen"><Stepper value={s.scheduleSeconds} min={10} max={300} step={5} suffix="sec" onChange={(v) => set({ scheduleSeconds: v })} /></Field>
          <Field label="Each flyer"><Stepper value={s.flyerSeconds} min={5} max={120} step={1} suffix="sec" onChange={(v) => set({ flyerSeconds: v })} /></Field>
          <Field label="Each announcement"><Stepper value={s.announcementSeconds} min={5} max={120} step={1} suffix="sec" onChange={(v) => set({ announcementSeconds: v })} /></Field>
          <Field label="Slides between schedule screens"><Stepper value={s.itemsBetween} min={1} max={10} onChange={(v) => set({ itemsBetween: v })} /></Field>
        </div>
        <Field label="Stay on the schedule before a minyan" hint="Flyers pause this many minutes before each minyan so people can see the time.">
          <Segmented value={Number(s.holdBeforeMinyan) || 0} onChange={(v) => set({ holdBeforeMinyan: v })}
            options={[{ value: 0, label: "Off" }, { value: 5, label: "5 min" }, { value: 10, label: "10 min" }, { value: 15, label: "15 min" }, { value: 30, label: "30 min" }]} />
        </Field>
      </Card>

      <Card title="Schedule screen">
        <Toggle label="Zmanim" checked={s.showZmanim} onChange={(v) => set({ showZmanim: v })} />
        {s.showZmanim && zmanimList.length > 0 && (
          <div className="chip-pick">
            {zmanimList.map((zm) => {
              const on = !hidden.includes(zm.id);
              return (
                <button key={zm.id} className={on ? "on" : ""} onClick={() => set({ hiddenZmanim: on ? [...hidden, zm.id] : hidden.filter((x) => x !== zm.id) })}>
                  {zm.label}
                </button>
              );
            })}
          </div>
        )}
        <Toggle label="Daf Yomi & learning" checked={s.showLimudim} onChange={(v) => set({ showLimudim: v })} />
        <Toggle label="Makam of the week" checked={s.showMakam} onChange={(v) => set({ showMakam: v })} />
        <Toggle label="Hilulot" checked={s.showHiloulot} onChange={(v) => set({ showHiloulot: v })} />
        <Toggle label="Scrolling announcements ticker" checked={s.showTicker} onChange={(v) => set({ showTicker: v })} />
        {s.showTicker && (
          <Field label="Ticker speed">
            <Segmented value={s.tickerSpeed} onChange={(v) => set({ tickerSpeed: v })}
              options={[{ value: 90, label: "Slow" }, { value: 60, label: "Medium" }, { value: 40, label: "Fast" }]} />
          </Field>
        )}
        <Toggle label="Donation info" checked={s.showDonate} onChange={(v) => set({ showDonate: v })} />
        <Toggle label="Show seconds on the clock" checked={s.showSeconds} onChange={(v) => set({ showSeconds: v })} />
      </Card>

      <Card title="Names & donation details">
        <div className="grid-2">
          <Field label="Shul name"><input className="input" value={text.shulName} onChange={(e) => setText({ ...text, shulName: e.target.value })} /></Field>
          <Field label="Hebrew name"><input className="input" dir="rtl" value={text.shulNameHe} onChange={(e) => setText({ ...text, shulNameHe: e.target.value })} /></Field>
          <Field label="Venmo"><input className="input" value={text.donate.venmo} onChange={(e) => setText({ ...text, donate: { ...text.donate, venmo: e.target.value } })} /></Field>
          <Field label="Zelle"><input className="input" value={text.donate.zelle} onChange={(e) => setText({ ...text, donate: { ...text.donate, zelle: e.target.value } })} /></Field>
          <Field label="Website"><input className="input" value={text.donate.website} onChange={(e) => setText({ ...text, donate: { ...text.donate, website: e.target.value } })} /></Field>
        </div>
      </Card>
    </div>
  );
}
