import React, { useMemo } from "react";
import qrcode from "qrcode-generator";
import { Ornament } from "./common.jsx";

// A crisp QR code as an SVG path (white modules on a rounded white tile).
function QR({ value }) {
  const { d, n } = useMemo(() => {
    const q = qrcode(0, "M");
    q.addData(value);
    q.make();
    const n = q.getModuleCount();
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return { d, n };
  }, [value]);
  return (
    <svg className="qr" viewBox={`-2 -2 ${n + 4} ${n + 4}`} aria-hidden="true" shapeRendering="crispEdges">
      <rect x="-2" y="-2" width={n + 4} height={n + 4} rx="2" fill="#fff" />
      <path d={d} fill="#0A1A3A" />
    </svg>
  );
}

// Let long emails wrap at the @ rather than mid-word.
const breakAtAt = (v) => {
  const i = v.indexOf("@");
  return i > 0 ? <>{v.slice(0, i)}<wbr />{v.slice(i)}</> : v;
};
const venmoUser = (h) => String(h || "").replace(/^@/, "").trim();
const site = (w) => String(w || "").replace(/^https?:\/\//, "").replace(/\/$/, "");

export default function DonateScene({ tv, sched }) {
  const d = tv.settings.donate || {};
  const shabbat = sched?.inPeriod;
  const methods = [
    d.venmo && { key: "venmo", label: "Venmo", value: d.venmo.startsWith("@") ? d.venmo : "@" + d.venmo, qr: `https://venmo.com/u/${venmoUser(d.venmo)}` },
    d.zelle && { key: "zelle", label: "Zelle", value: d.zelle, qr: null, hint: "Send from your bank app" },
    d.website && { key: "web", label: "Online", value: site(d.website), qr: `https://${site(d.website)}` },
  ].filter(Boolean);

  return (
    <div className="scene scene-donate">
      <div className="donate-card glass">
        <Ornament className="rise" />
        <h1 className="donate-title rise" style={{ animationDelay: ".1s" }}>Support {tv.settings.shulName}</h1>
        <p className="donate-sub rise" style={{ animationDelay: ".25s" }}>
          {shabbat ? "Please remember us after Shabbat" : "Your generosity keeps our minyanim, kiddush and programs going"}
        </p>
        <div className={`donate-methods ${shabbat ? "no-qr" : ""}`}>
          {methods.map((m, i) => (
            <div key={m.key} className="donate-method rise" style={{ animationDelay: `${0.4 + i * 0.15}s` }}>
              {!shabbat && (m.qr ? <QR value={m.qr} /> : <div className="qr qr-blank"><span>Z</span></div>)}
              <span className="donate-label">{m.label}</span>
              <span className="donate-value">{breakAtAt(m.value)}</span>
              {!shabbat && <span className="donate-hint">{m.qr ? "Scan with your phone camera" : m.hint}</span>}
            </div>
          ))}
        </div>
        {d.website && (
          <p className="donate-foot rise" style={{ animationDelay: ".9s" }}>
            {shabbat ? "After Shabbat, everything is at " : "Everything is also at "}<b>{site(d.website)}</b>
          </p>
        )}
      </div>
    </div>
  );
}
