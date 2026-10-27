import { createRoot } from "react-dom/client";
import PlanComparisonTool from "./components/PlanComparisonTool";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <>
    <header className="bg-navy-950 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-6 sm:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-solar-400">Sunflow Energy Solutions · internal tool</p>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Electricity plan, battery &amp; solar comparison</h1>
        </div>
        <p className="max-w-xs text-sm text-mist-300">Enter a customer&apos;s bill, then see which plan, battery size and solar addition cuts their costs most.</p>
      </div>
    </header>
    <PlanComparisonTool />
  </>
);
