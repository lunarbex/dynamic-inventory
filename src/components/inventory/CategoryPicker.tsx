"use client";

import { ACTIVITY_ZONES, ActivityZoneId } from "@/lib/types";

interface CategoryPickerProps {
  selected: ActivityZoneId[];
  onChange: (categories: ActivityZoneId[]) => void;
}

export function CategoryPicker({ selected, onChange }: CategoryPickerProps) {
  function toggle(id: ActivityZoneId) {
    if (selected.includes(id)) {
      onChange(selected.filter((c) => c !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ACTIVITY_ZONES.map((zone) => {
        const isSelected = selected.includes(zone.id);
        return (
          <button
            key={zone.id}
            type="button"
            onClick={() => toggle(zone.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
              isSelected
                ? "bg-amber-500 text-white font-medium shadow-sm"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            <span>{zone.icon}</span>
            <span>{zone.label}</span>
          </button>
        );
      })}
    </div>
  );
}
