import React from "react";

// The between-slides moment: on a dark screen the crown is slowly revealed, then the name.
// Nothing else moves, apart from one soft pass of light across the gold.
export default function LogoScene({ tv }) {
  return (
    <div className="scene scene-logo">
      <div className="lg-lockup">
        <div className="lg-crown" aria-hidden="true"><div className="lg-fill" /></div>
        <h1 className="lg-name">{tv.settings.shulName || "Ateret Marjan"}</h1>
        <div className="lg-rule" aria-hidden="true" />
        <div className="lg-he" dir="rtl">{tv.settings.shulNameHe}</div>
      </div>
    </div>
  );
}
