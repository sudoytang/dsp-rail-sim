import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../state/store";
import { CalcPanel } from "./CalcPanel";
import { Inspector } from "./Inspector";

type PanelTab = "setup" | "calc";

export function RightPanel() {
  const selection = useAppStore((state) => state.selection);
  const [tab, setTab] = useState<PanelTab>(loadTab);
  const initialSelection = useRef(true);

  useEffect(() => {
    if (initialSelection.current) {
      initialSelection.current = false;
      return;
    }
    setTab("setup");
  }, [selection.type, selection.id]);

  useEffect(() => {
    try {
      localStorage.setItem("dsp-rail-sim-tab", tab);
    } catch {
      return;
    }
  }, [tab]);
  return (
    <aside className="panel right-panel">
      <div className="panel-tabs" role="tablist"><button role="tab" aria-selected={tab === "setup"} className={tab === "setup" ? "active" : ""} onClick={() => setTab("setup")}>SETUP</button><button role="tab" aria-selected={tab === "calc"} className={tab === "calc" ? "active" : ""} onClick={() => setTab("calc")}>CALC</button></div>
      <div role="tabpanel" hidden={tab !== "setup"}><Inspector /></div>
      <div role="tabpanel" hidden={tab !== "calc"}><CalcPanel /></div>
    </aside>
  );
}

function loadTab(): PanelTab {
  try {
    return localStorage.getItem("dsp-rail-sim-tab") === "calc" ? "calc" : "setup";
  } catch {
    return "setup";
  }
}
