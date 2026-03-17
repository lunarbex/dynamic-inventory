"use client";

import { useState } from "react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useInventoryContext } from "@/context/InventoryContext";
import { createInviteCode, removeMember, updateMemberRole } from "@/lib/inventories";
import type { MemberRole } from "@/lib/types";
import { Link2, Copy, Check, X, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";

export function InvitePanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuthContext();
  const { currentInventory, currentRole } = useInventoryContext();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  const isAdmin = currentRole === "admin";

  async function generateInvite() {
    if (!currentInventory) return;
    setGeneratingInvite(true);
    try {
      const code = await createInviteCode(currentInventory.id, "contributor");
      const url = `${window.location.origin}/invite/${code}`;
      setInviteUrl(url);
    } catch {
      toast.error("Failed to generate invite link");
    } finally {
      setGeneratingInvite(false);
    }
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRemoveMember(userId: string, email: string) {
    if (!currentInventory) return;
    if (!confirm(`Remove ${email} from this inventory?`)) return;
    try {
      await removeMember(currentInventory.id, userId);
      toast.success(`${email} removed`);
    } catch {
      toast.error("Failed to remove member");
    }
  }

  async function handleRoleChange(userId: string, role: MemberRole) {
    if (!currentInventory) return;
    try {
      await updateMemberRole(currentInventory.id, userId, role);
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role");
    }
  }

  if (!currentInventory) return null;

  const members = Object.values(currentInventory.members).sort((a, b) =>
    a.role === "admin" ? -1 : b.role === "admin" ? 1 : 0
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div>
            <p className="font-semibold text-stone-800">{currentInventory.name}</p>
            <p className="text-xs text-stone-400">{members.length} {members.length === 1 ? "member" : "members"}</p>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-xl transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Members */}
        <div className="px-5 py-3 space-y-2 max-h-64 overflow-y-auto">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-3 py-1.5">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-amber-700">
                {m.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-800 truncate">{m.displayName || m.email}</p>
                {m.displayName && (
                  <p className="text-xs text-stone-400 truncate">{m.email}</p>
                )}
                {m.userId === user?.uid && !m.displayName && (
                  <p className="text-xs text-stone-400">You</p>
                )}
                {m.userId === user?.uid && m.displayName && (
                  <p className="text-xs text-amber-500">You</p>
                )}
              </div>
              {isAdmin && m.userId !== user?.uid ? (
                <div className="flex items-center gap-1">
                  <div className="relative">
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.userId, e.target.value as MemberRole)}
                      className="appearance-none text-xs text-stone-600 bg-stone-100 rounded-lg pl-2.5 pr-6 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                    >
                      <option value="admin">Admin</option>
                      <option value="contributor">Contributor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
                  </div>
                  <button onClick={() => handleRemoveMember(m.userId, m.email)}
                    className="p-1.5 text-stone-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-stone-400 capitalize">{m.role}</span>
              )}
            </div>
          ))}
        </div>

        {/* Invite */}
        {isAdmin && (
          <div className="px-5 py-4 border-t border-stone-100">
            {inviteUrl ? (
              <div className="space-y-2">
                <p className="text-xs text-stone-500">Share this link to invite as contributor:</p>
                <div className="flex gap-2">
                  <div className="flex-1 text-xs bg-stone-100 text-stone-600 rounded-xl px-3 py-2 truncate font-mono">
                    {inviteUrl}
                  </div>
                  <button onClick={copyInvite}
                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl transition-colors flex-shrink-0">
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={generateInvite} disabled={generatingInvite}
                className="w-full flex items-center justify-center gap-2 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                <Link2 className="w-4 h-4" />
                {generatingInvite ? "Generating…" : "Generate invite link"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
