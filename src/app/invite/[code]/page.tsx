"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { LoginForm } from "@/components/auth/LoginForm";
import { acceptInvite } from "@/lib/inventories";
import { useInventoryContext } from "@/context/InventoryContext";
import { BookOpen, Loader2 } from "lucide-react";

export const PENDING_INVITE_KEY = "pendingInviteCode";

export default function InvitePage() {
  const { user, loading: authLoading } = useAuthContext();
  const { selectInventory } = useInventoryContext();
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [status, setStatus] = useState<"idle" | "joining" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Persist the invite code so users who navigate away to sign up can still join.
  useEffect(() => {
    if (code) sessionStorage.setItem(PENDING_INVITE_KEY, code);
  }, [code]);

  useEffect(() => {
    if (!user || status !== "idle") return;
    setStatus("joining");
    acceptInvite(code, user.uid, user.email ?? "")
      .then((inv) => {
        if (!inv) {
          setErrorMsg("This invite link is invalid or has expired.");
          setStatus("error");
          return;
        }
        setStatus("success");
        sessionStorage.removeItem(PENDING_INVITE_KEY);
        selectInventory(inv.id);
        setTimeout(() => router.push("/"), 1500);
      })
      .catch((err) => {
        console.error("[InvitePage] acceptInvite failed:", err);
        const msg = err?.code === "permission-denied"
          ? "Permission denied — the invite link may have expired. Ask for a new one."
          : "Something went wrong. Please try again.";
        setErrorMsg(msg);
        setStatus("error");
      });
  }, [user, status, code, selectInventory, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--parchment)" }}>
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: "var(--gold)" }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ background: "var(--parchment)" }}>
        <div className="text-center pt-12 pb-2 px-6">
          <BookOpen className="w-9 h-9 mx-auto mb-3" style={{ color: "var(--gold)" }} />
          <p className="font-serif font-semibold text-lg" style={{ color: "var(--ink)" }}>
            You&apos;ve been invited to an inventory
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--ink-light)" }}>
            Sign in or create an account to join
          </p>
        </div>
        <LoginForm />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--parchment)" }}>
      <div className="text-center">
        <BookOpen className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--gold)" }} />

        {status === "joining" && (
          <>
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" style={{ color: "var(--gold)" }} />
            <p className="font-serif font-semibold" style={{ color: "var(--ink)" }}>Joining inventory…</p>
          </>
        )}

        {status === "success" && (
          <>
            <p className="font-serif font-semibold text-lg" style={{ color: "var(--ink)" }}>You&apos;re in!</p>
            <p className="text-sm mt-1" style={{ color: "var(--ink-light)" }}>Redirecting to your inventory…</p>
          </>
        )}

        {status === "error" && (
          <>
            <p className="font-serif font-semibold mb-2" style={{ color: "var(--ink)" }}>Couldn&apos;t join</p>
            <p className="text-sm mb-5" style={{ color: "var(--ink-light)" }}>{errorMsg}</p>
            <button
              onClick={() => router.push("/")}
              className="px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: "var(--gold)", color: "#faf7f2", borderRadius: "6px" }}
            >
              Go home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
