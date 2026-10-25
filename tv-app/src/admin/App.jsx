import React, { useEffect, useState } from "react";
import { Home as HomeIcon, Clock, Megaphone, Images, Palette, Users, LogOut } from "lucide-react";
import { subscribeTv, seedTv, isDemo } from "../shared/store.js";
import { watchUser, signIn, signOutUser, resetPassword, claimOwner } from "./services.js";
import { Button, Field } from "./ui.jsx";
import Home from "./sections/Home.jsx";
import Schedule from "./sections/Schedule.jsx";
import Announcements from "./sections/Announcements.jsx";
import Flyers from "./sections/Flyers.jsx";
import Display from "./sections/Display.jsx";
import Managers from "./sections/Managers.jsx";

const NAV = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "schedule", label: "Times", icon: Clock },
  { id: "announcements", label: "Announcements", short: "News", icon: Megaphone },
  { id: "flyers", label: "Flyers", icon: Images },
  { id: "display", label: "Display", icon: Palette },
  { id: "managers", label: "People", icon: Users, owner: true },
];

function useZmanim() {
  const [z, setZ] = useState(window.__TV_ZMANIM__ || null);
  useEffect(() => {
    const on = (e) => setZ({ ...e.detail });
    window.addEventListener("tv-zmanim-ready", on);
    return () => window.removeEventListener("tv-zmanim-ready", on);
  }, []);
  return z;
}

function Login() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      if (mode === "signin") await signIn(email, password);
      else if (mode === "reset") { await resetPassword(email); setMsg("Check your email for a reset link."); }
      else await claimOwner(email, password, name);
    } catch (err) {
      const c = err.code || "";
      setMsg(c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found") ? "Email or password is incorrect."
        : c.includes("too-many-requests") ? "Too many tries. Wait a minute and try again."
        : c.includes("operation-not-allowed") ? "Email sign-in isn't turned on in Firebase yet (see the setup guide)."
        : c.includes("email-already-in-use") ? "That email already has an account. Sign in instead."
        : err.message);
    }
    setBusy(false);
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <div className="crown-mark" />
          <h1>Ateret Marjan TV</h1>
          <p>{mode === "setup" ? "First-time setup: create the owner account" : mode === "reset" ? "Reset your password" : "Sign in to manage the display"}</p>
        </div>
        {mode === "setup" && <Field label="Your name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>}
        <Field label="Email"><input className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        {mode !== "reset" && (
          <Field label="Password"><input className="input" type="password" autoComplete={mode === "setup" ? "new-password" : "current-password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        )}
        <Button variant="primary" className="btn-block" disabled={busy}>
          {busy ? "One moment…" : mode === "signin" ? "Sign in" : mode === "reset" ? "Send reset link" : "Create owner account"}
        </Button>
        {msg && <p className="login-msg">{msg}</p>}
        <div className="login-links">
          {mode !== "signin" && <button type="button" onClick={() => setMode("signin")}>Back to sign in</button>}
          {mode === "signin" && <button type="button" onClick={() => setMode("reset")}>Forgot password?</button>}
          {mode === "signin" && <button type="button" onClick={() => setMode("setup")}>First-time setup</button>}
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);
  const [tv, setTv] = useState(null);
  const [page, setPage] = useState(() => location.hash.slice(1) || "home");
  const z = useZmanim();

  useEffect(() => watchUser(setUser), []);
  useEffect(() => {
    if (!user?.role) return;
    let seeded = false;
    return subscribeTv((data, meta) => {
      setTv(data);
      // First run: give the TV something to show.
      if (meta.empty && !seeded) { seeded = true; seedTv().catch(() => {}); }
    });
  }, [user?.role]);
  useEffect(() => { history.replaceState(null, "", "#" + page); window.scrollTo(0, 0); }, [page]);
  useEffect(() => {
    const on = () => setPage(location.hash.slice(1) || "home");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  if (user === undefined) return <div className="loading"><div className="crown-mark pulse" /></div>;
  if (!user) return <Login />;
  if (!user.role) {
    return (
      <div className="login">
        <div className="login-card">
          <div className="login-brand"><div className="crown-mark" /><h1>No access yet</h1>
            <p>{user.email} isn't on the list of TV managers. Ask the owner to add you under People.</p></div>
          <Button onClick={signOutUser} icon={LogOut}>Sign out</Button>
        </div>
      </div>
    );
  }
  if (!tv) return <div className="loading"><div className="crown-mark pulse" /></div>;

  const nav = NAV.filter((n) => !n.owner || user.role === "owner");
  const current = nav.find((n) => n.id === page) || nav[0];
  const props = { tv, z, user, go: setPage };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="side-brand"><div className="crown-mark" /><div><b>Ateret Marjan</b><span>TV Dashboard</span></div></div>
        <nav>
          {nav.map((n) => (
            <button key={n.id} className={current.id === n.id ? "on" : ""} onClick={() => setPage(n.id)}>
              <n.icon size={20} /><span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <span>{user.email}</span>
          {!user.demo && <button className="link" onClick={signOutUser}>Sign out</button>}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <h1>{current.label}</h1>
          <span className="autosave">{isDemo() ? "Preview mode · changes stay on this device" : "Changes save automatically"}</span>
        </header>
        {current.id === "home" && <Home {...props} />}
        {current.id === "schedule" && <Schedule {...props} />}
        {current.id === "announcements" && <Announcements {...props} />}
        {current.id === "flyers" && <Flyers {...props} />}
        {current.id === "display" && <Display {...props} />}
        {current.id === "managers" && <Managers {...props} />}
      </main>

      <nav className="tabbar">
        {nav.map((n) => (
          <button key={n.id} className={current.id === n.id ? "on" : ""} onClick={() => setPage(n.id)}>
            <n.icon size={22} /><span>{n.short || n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
