import { useState } from "react";
import { CalcPanel } from "./CalcPanel";
import { Inspector } from "./Inspector";

export function RightPanel() {
  const [tab, setTab] = useState<"setup" | "calc">("setup");
  return (
    <aside className="panel right-panel">
      <div className="panel-tabs" role="tablist"><button role="tab" aria-selected={tab === "setup"} className={tab === "setup" ? "active" : ""} onClick={() => setTab("setup")}>SETUP</button><button role="tab" aria-selected={tab === "calc"} className={tab === "calc" ? "active" : ""} onClick={() => setTab("calc")}>CALC</button></div>
      <div role="tabpanel" hidden={tab !== "setup"}><Inspector /></div>
      <div role="tabpanel" hidden={tab !== "calc"}><CalcPanel /></div>
    </aside>
  );
}
