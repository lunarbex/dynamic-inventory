"use client";

import { useState } from "react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useInventoryContext } from "@/context/InventoryContext";
import { createInventory } from "@/lib/inventories";
import { BookOpen, Plus, Loader2, Users } from "lucide-react";
import toast from "react-hot-toast";

export function InventorySelector() {
  const { user } = useAuthContext();
  const { inventories, loadingInventories, selectInventory } = useInventoryContext();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newName.trim()) return;
    setSaving(true);
    try {
      const book = await createInventory(newName.trim(), user.uid, user.email ?? "");
      toast.success(`"${book.name}" created`);
      selectInventory(book.id);
    } catch {
      toast.error("Failed to create inventory");
    } finally {
      setSaving(false);
    }
  }

  if (loadingInventories) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <BookOpen className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-stone-900">Object Stories</h1>
          <p className="text-stone-500 text-sm mt-1">
            {inventories.length === 0
              ? "Create your first inventory to get started"
              : "Choose an inventory to open"}
          </p>
        </div>

        {/* Existing inventories */}
        {inventories.length > 0 && (
          <div className="space-y-2 mb-6">
            {inventories.map((inv) => {
              const memberCount = Object.keys(inv.members).length;
              return (
                <button
                  key={inv.id}
                  onClick={() => selectInventory(inv.id)}
                  className="w-full flex items-center gap-3 p-4 bg-white border border-stone-200 hover:border-amber-400 hover:bg-amber-50 rounded-2xl transition-all text-left group"
                >
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-800 truncate">{inv.name}</p>
                    <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                      <Users className="w-3 h-3" />
                      {memberCount} {memberCount === 1 ? "member" : "members"}
                    </p>
                  </div>
                  <span className="text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                    Open →
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Create new */}
        {creating ? (
          <form onSubmit={handleCreate} className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-stone-700">Name your inventory</p>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. &quot;Our Family Home,&quot; &quot;Mom's Estate&quot;"
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-stone-300"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={saving || !newName.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-200 disabled:text-stone-400 text-white text-sm font-semibold rounded-xl transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
              </button>
              <button type="button" onClick={() => setCreating(false)} disabled={saving}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm font-medium rounded-xl transition-colors">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setCreating(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-stone-300 hover:border-amber-400 hover:bg-amber-50 text-stone-500 hover:text-amber-600 rounded-2xl transition-all text-sm font-medium">
            <Plus className="w-4 h-4" />
            New inventory
          </button>
        )}
      </div>
    </div>
  );
}
