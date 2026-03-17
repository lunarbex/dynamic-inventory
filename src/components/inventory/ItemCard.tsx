"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { InventoryItem, ACTIVITY_ZONES } from "@/lib/types";
import { MapPin } from "lucide-react";

interface ItemCardProps {
  item: InventoryItem;
}

// Five warm, muted tag colors — deterministic per tag string
const TAG_PALETTE = [
  { bg: "#f0e8d0", color: "#6b4010" },
  { bg: "#deebd6", color: "#30561e" },
  { bg: "#dde8e4", color: "#1e5040" },
  { bg: "#ecdde4", color: "#661830" },
  { bg: "#e2ddf0", color: "#342070" },
];
function tagStyle(tag: string) {
  const idx = [...tag].reduce((acc, c) => acc + c.charCodeAt(0), 0) % TAG_PALETTE.length;
  return TAG_PALETTE[idx];
}

export function ItemCard({ item }: ItemCardProps) {
  const router = useRouter();
  const firstPhoto = item.photos[0];
  const primaryZone = ACTIVITY_ZONES.find((z) => z.id === item.categories[0]);
  const displayLocation = item.microLocation || item.macroLocation || (item.location ?? "");
  const storyPreview = item.story || item.description;
  const tags = (item.tags ?? []).slice(0, 3);

  return (
    <div
      className="group cursor-pointer flex flex-col"
      style={{ border: "1px solid var(--border)", background: "var(--parchment-light)", borderRadius: "10px", overflow: "hidden" }}
      onClick={() => router.push(`/items/${item.id}`)}
    >
      {/* ── Photo ── */}
      <div className="relative aspect-[4/3] overflow-hidden shrink-0">
        {firstPhoto ? (
          <Image
            src={firstPhoto}
            alt={item.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-4xl"
            style={{ background: "var(--parchment-dark)" }}
          >
            {primaryZone?.icon ?? "📦"}
          </div>
        )}
        {/* Multi-photo badge */}
        {item.photos.length > 1 && (
          <span
            className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5"
            style={{ background: "rgba(44,36,22,0.55)", color: "#faf7f2" }}
          >
            1 / {item.photos.length}
          </span>
        )}
      </div>

      {/* ── Card body ── */}
      <div className="flex flex-col gap-1.5 p-3 flex-1">
        {/* Title */}
        <h3 className="font-serif font-semibold text-sm leading-snug" style={{ color: "var(--ink)" }}>
          {item.name}
        </h3>

        {/* Story preview — 2 lines */}
        {storyPreview && (
          <p className="text-xs leading-relaxed line-clamp-2 italic" style={{ color: "var(--ink-mid)" }}>
            {storyPreview}
          </p>
        )}

        {/* Tags — clickable, stop card navigation */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5 relative z-10">
            {tags.map((tag) => {
              const s = tagStyle(tag);
              return (
                <Link
                  key={tag}
                  href={`/search?q=${encodeURIComponent(tag)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] font-medium px-2 py-0.5 transition-opacity hover:opacity-80"
                  style={{ background: s.bg, color: s.color }}
                >
                  #{tag}
                </Link>
              );
            })}
          </div>
        )}

        {/* Location + attribution row */}
        <div className="flex items-center justify-between mt-auto pt-1 gap-1">
          {displayLocation ? (
            <p className="text-[10px] flex items-center gap-1 min-w-0" style={{ color: "var(--ink-light)" }}>
              <MapPin className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{displayLocation}</span>
            </p>
          ) : <span />}
          {item.addedByName && (
            <p className="text-[10px] shrink-0" style={{ color: "var(--ink-light)" }}>
              {item.addedByName}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
