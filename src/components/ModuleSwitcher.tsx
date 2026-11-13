"use client";

import { modules } from "@/modules/registry";
import { useAppStore } from "@/store/app";

/** Row of buttons to pick the active module. */
export default function ModuleSwitcher() {
  const activeId = useAppStore((s) => s.activeModuleId);
  const setActive = useAppStore((s) => s.setActiveModule);

  return (
    <nav
      aria-label="Modules"
      className="absolute inset-x-0 bottom-3 flex justify-center px-3"
    >
      <div className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-black/55 p-1 backdrop-blur">
        {modules.map((module) => {
          const active = module.id === activeId;
          return (
            <button
              key={module.id}
              type="button"
              aria-pressed={active}
              onClick={() => setActive(module.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                active ? "bg-white text-black" : "text-white/80 hover:bg-white/10"
              }`}
            >
              <span aria-hidden>{module.icon}</span>
              {module.name}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
