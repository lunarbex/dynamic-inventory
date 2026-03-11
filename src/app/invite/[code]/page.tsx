"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { LoginForm } from "@/components/auth/LoginForm";
import { acceptInvite } from "@/lib/inventories";
import { useInventoryContext } from "@/context/InventoryContext";
import { BookOpen, Loader2 } from "lucide-react";

export default function InvitePage() {
  const { user, loading: authLoading } = useAuthContext();
  const { selectInventory } = useInventoryContext();
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [status, setStatus] = useState<"idle" | "joining" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

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
        selectInventory(inv.id);
        setTimeout(() => router.push("/"), 1500);
      })
      .catch(() => {
        setErrorMsg("Something went wrong. Please try again.");
        setStatus("error");
      });
  }, [user, status, code, selectInventory, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <div className="text-center pt-12 pb-4 px-6">
          <BookOpen className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <p className="text-stone-700 font-semibold">You've been invited to an inventory</p>
          <p className="text-stone-400 text-sm mt-1">Sign in or create an account to join</p>
        </div>
        <LoginForm />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <BookOpen className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        {status === "joining" && (
          <>
            <Loader2 className="w-6 h-6 text-amber-500 animate-spin mx-auto mb-3" />
            <p className="text-stone-700 font-semibold">Joining inventory…</p>
          </>
        )}
        {status === "success" && (
          <>
            <p className="text-stone-700 font-semibold text-lg">You're in!</p>
            <p className="text-stone-400 text-sm mt-1">Redirecting to your inventory…</p>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-stone-700 font-semibold">Invite not valid</p>
            <p className="text-stone-400 text-sm mt-1 mb-4">{errorMsg}</p>
            <button onClick={() => router.push("/")}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors text-sm">
              Go home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
