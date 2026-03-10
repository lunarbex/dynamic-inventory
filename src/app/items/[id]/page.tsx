"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { LoginForm } from "@/components/auth/LoginForm";
import { Header } from "@/components/layout/Header";
import { getItem, deleteItem, updateItem } from "@/lib/firestore";
import type { InventoryItem, ActivityZoneId } from "@/lib/types";
import { ACTIVITY_ZONES } from "@/lib/types";
import { CategoryPicker } from "@/components/inventory/CategoryPicker";
import { TagInput } from "@/components/inventory/TagInput";
import { EditItemForm } from "@/components/inventory/EditItemForm";
import {
  MapPin, User, Calendar, Trash2, ArrowLeft,
  ChevronLeft, ChevronRight, Navigation, Heart, Pencil,
} from "lucide-react";
import toast from "react-hot-toast";

export default function ItemDetailPage() {
  const { user, loading: authLoading } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingCategories, setEditingCategories] = useState(false);
  const [savingCategories, setSavingCategories] = useState(false);
  const [draftCategories, setDraftCategories] = useState<ActivityZoneId[]>([]);
  const [editingTags, setEditingTags] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const [draftTags, setDraftTags] = useState<string[]>([]);

  const id = params.id as string;

  useEffect(() => {
    if (!id) return;
    getItem(id).then(setItem).finally(() => setLoading(false));
  }, [id]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginForm />;

  if (!item) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="text-center py-20">
          <p className="text-stone-500">Item not found</p>
          <Link href="/" className="text-amber-600 mt-2 block hover:underline">Back to inventory</Link>
        </div>
      </div>
    );
  }

  async function handleCategoriesSave(cats: ActivityZoneId[]) {
    const currentItem = item;
    if (!currentItem) return;
    setSavingCategories(true);
    try {
      await updateItem(currentItem.id, { categories: cats }, { uid: user!.uid, email: user!.email ?? "" });
      setItem({ ...currentItem, categories: cats });
      setEditingCategories(false);
      toast.success("Categories saved");
    } catch {
      toast.error("Failed to save categories");
    } finally {
      setSavingCategories(false);
    }
  }

  async function handleTagsSave(tags: string[]) {
    const currentItem = item;
    if (!currentItem) return;
    setSavingTags(true);
    try {
      await updateItem(currentItem.id, { tags }, { uid: user!.uid, email: user!.email ?? "" });
      setItem({ ...currentItem, tags });
      setEditingTags(false);
      toast.success("Tags saved");
    } catch {
      toast.error("Failed to save tags");
    } finally {
      setSavingTags(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this item? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteItem(id);
      toast.success("Item deleted");
      router.push("/");
    } catch {
      toast.error("Failed to delete item");
      setDeleting(false);
    }
  }

  const zones = item.categories.map((id) => ACTIVITY_ZONES.find((z) => z.id === id)).filter(Boolean);
  const formattedDate = item.addedAt
    ? new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(item.addedAt)
    : "";
  const formattedUpdatedDate = item.updatedAt
    ? new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(item.updatedAt)
    : "";

  const hasOriginCoords = item.originPlace?.lat && item.originPlace?.lng;
  const osmUrl = hasOriginCoords
    ? `https://www.openstreetmap.org/?mlat=${item.originPlace.lat}&mlon=${item.originPlace.lng}#map=10/${item.originPlace.lat}/${item.originPlace.lng}`
    : null;

  if (editing) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-6">
          <button onClick={() => setEditing(false)}
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />Back to item
          </button>
          <h2 className="text-lg font-semibold text-stone-800 mb-6">Edit — {item.name}</h2>
          <EditItemForm
            item={item}
            userId={user.uid}
            userEmail={user.email ?? ""}
            onSave={(updated) => { setItem(updated); setEditing(false); }}
            onCancel={() => setEditing(false)}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />Back to inventory
        </Link>

        {/* Photo carousel */}
        {item.photos.length > 0 && (
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-stone-100 mb-6">
            <Image src={item.photos[photoIndex]} alt={item.name} fill className="object-cover" />
            {item.photos.length > 1 && (
              <>
                <button onClick={() => setPhotoIndex((i) => (i - 1 + item.photos.length) % item.photos.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => setPhotoIndex((i) => (i + 1) % item.photos.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center">
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {item.photos.map((_, i) => (
                    <button key={i} onClick={() => setPhotoIndex(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === photoIndex ? "bg-white scale-125" : "bg-white/50"}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Title */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{item.name}</h1>
            {item.description && <p className="text-stone-500 mt-1">{item.description}</p>}
          </div>
          <button onClick={() => setEditing(true)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-3 mt-3 text-sm text-stone-400">
          <span className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />{item.addedByEmail}
          </span>
          {formattedDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />{formattedDate}
            </span>
          )}
          {item.isLoanable && (
            <span className="text-emerald-600 font-medium">⟲ Available to borrow</span>
          )}
          {item.updatedByEmail && formattedUpdatedDate && (
            <span className="flex items-center gap-1 text-stone-300">
              Last edited by {item.updatedByEmail} on {formattedUpdatedDate}
            </span>
          )}
        </div>

        {/* Categories */}
        <div className="mt-4">
          {editingCategories ? (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Categories</p>
              <CategoryPicker
                selected={draftCategories}
                onChange={setDraftCategories}
              />
              <div className="flex gap-2 mt-4">
                <button onClick={() => handleCategoriesSave(draftCategories)} disabled={savingCategories}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-200 disabled:text-stone-400 text-white text-sm font-semibold rounded-xl transition-colors">
                  {savingCategories ? "Saving…" : "Save"}
                </button>
                <button onClick={() => setEditingCategories(false)} disabled={savingCategories}
                  className="px-4 py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 text-sm font-medium rounded-xl transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 items-center">
              {zones.map((zone) => (
                <span key={zone!.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 text-sm rounded-full font-medium">
                  {zone!.icon} {zone!.label}
                </span>
              ))}
                  <button onClick={() => { setDraftCategories([...item.categories]); setEditingCategories(true); }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-stone-400 hover:text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors">
                <Pencil className="w-3 h-3" /> Edit
              </button>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="mt-3">
          {editingTags ? (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Tags</p>
              <TagInput tags={draftTags} onChange={setDraftTags} />
              <div className="flex gap-2 mt-3">
                <button onClick={() => handleTagsSave(draftTags)} disabled={savingTags}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-200 disabled:text-stone-400 text-white text-sm font-semibold rounded-xl transition-colors">
                  {savingTags ? "Saving…" : "Save"}
                </button>
                <button onClick={() => setEditingTags(false)} disabled={savingTags}
                  className="px-4 py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 text-sm font-medium rounded-xl transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 items-center">
              {(item.tags ?? []).map((tag) => (
                <span key={tag} className="px-2.5 py-1 bg-stone-100 text-stone-600 text-sm rounded-full">
                  #{tag}
                </span>
              ))}
              <button onClick={() => { setDraftTags([...(item.tags ?? [])]); setEditingTags(true); }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-stone-400 hover:text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors">
                <Pencil className="w-3 h-3" />
                {(item.tags ?? []).length === 0 ? "Add tags" : "Edit tags"}
              </button>
            </div>
          )}
        </div>

        {/* Location section */}
        <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {item.microLocation && (
            <div className="bg-stone-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">Storage spot</p>
              <p className="text-sm text-stone-700 flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-stone-400" />
                {item.microLocation}
              </p>
            </div>
          )}
          {item.macroLocation && (
            <div className="bg-stone-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">Current city</p>
              <p className="text-sm text-stone-700">{item.macroLocation}</p>
            </div>
          )}
          {item.originPlace?.name && (
            <div className="bg-stone-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">Origin</p>
              <p className="text-sm text-stone-700 flex items-start gap-1">
                <Navigation className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
                {item.originPlace.name}
              </p>
              {osmUrl && (
                <a href={osmUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-amber-600 hover:underline mt-1 block">
                  View on map →
                </a>
              )}
            </div>
          )}
        </section>

        {/* Object life */}
        {(item.condition || item.passTo) && (
          <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {item.condition && (
              <div className="bg-stone-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">Condition</p>
                <p className="text-sm text-stone-700">{item.condition}</p>
              </div>
            )}
            {item.passTo && (
              <div className="bg-stone-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">Pass to</p>
                <p className="text-sm text-stone-700 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                  {item.passTo}
                </p>
              </div>
            )}
          </section>
        )}

        {/* Story */}
        {item.story && (
          <section className="mt-6">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Story</h2>
            <p className="text-stone-700 leading-relaxed">{item.story}</p>
          </section>
        )}

        {/* Provenance */}
        {item.provenance && (
          <section className="mt-5">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Provenance</h2>
            <p className="text-stone-700 leading-relaxed">{item.provenance}</p>
          </section>
        )}

        {/* Original transcript */}
        {item.voiceTranscript && (
          <details className="mt-6">
            <summary className="text-sm text-stone-400 cursor-pointer hover:text-stone-600 select-none">
              Original voice transcript
            </summary>
            <blockquote className="mt-2 pl-3 border-l-2 border-stone-200 text-stone-500 text-sm italic leading-relaxed">
              {item.voiceTranscript}
            </blockquote>
          </details>
        )}

        {/* Delete */}
        <div className="mt-10 pt-6 border-t border-stone-100">
          <button onClick={handleDelete} disabled={deleting}
            className="flex items-center gap-2 text-sm text-red-400 hover:text-red-600 transition-colors disabled:opacity-50">
            <Trash2 className="w-4 h-4" />
            {deleting ? "Deleting..." : "Delete this item"}
          </button>
        </div>
      </main>
    </div>
  );
}
