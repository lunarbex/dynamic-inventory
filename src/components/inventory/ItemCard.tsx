"use client";

import Link from "next/link";
import Image from "next/image";
import { InventoryItem, ACTIVITY_ZONES } from "@/lib/types";
import { MapPin, User } from "lucide-react";

interface ItemCardProps {
  item: InventoryItem;
}

export function ItemCard({ item }: ItemCardProps) {
  const firstPhoto = item.photos[0];
  const zones = item.categories
    .map((id) => ACTIVITY_ZONES.find((z) => z.id === id))
    .filter(Boolean);

  const displayLocation = item.microLocation || item.macroLocation || (item.location ?? "");

  return (
    <Link href={`/items/${item.id}`} className="block group">
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-md hover:border-stone-300 transition-all">
        {firstPhoto ? (
          <div className="relative aspect-[4/3] bg-stone-100">
            <Image
              src={firstPhoto}
              alt={item.name}
              fill
              className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="aspect-[4/3] bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center text-4xl">
            {zones[0]?.icon ?? "📦"}
          </div>
        )}

        <div className="p-3">
          <h3 className="font-semibold text-stone-800 truncate">{item.name}</h3>

          {item.description && (
            <p className="text-stone-500 text-xs mt-0.5 line-clamp-2">{item.description}</p>
          )}

          <div className="flex flex-wrap gap-1 mt-2">
            {zones.slice(0, 2).map((zone) => (
              <span key={zone!.id} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                {zone!.icon} {zone!.label}
              </span>
            ))}
            {zones.length > 2 && (
              <span className="text-xs text-stone-400">+{zones.length - 2}</span>
            )}
          </div>

          {(item.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {(item.tags ?? []).slice(0, 3).map((tag) => (
                <span key={tag} className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                  #{tag}
                </span>
              ))}
              {(item.tags ?? []).length > 3 && (
                <span className="text-xs text-stone-400">+{item.tags!.length - 3}</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
            {displayLocation && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {displayLocation}
              </span>
            )}
            {item.isLoanable && (
              <span className="text-xs text-emerald-600 flex-shrink-0">⟲ Loanable</span>
            )}
            <span className="flex items-center gap-1 flex-shrink-0 ml-auto">
              <User className="w-3 h-3" />
              {item.addedByEmail.split("@")[0]}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
