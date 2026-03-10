"use client";

import { useEffect, useState } from "react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, deleteObject } from "firebase/storage";
import { Header } from "@/components/layout/Header";

type Status = "pending" | "ok" | "error";

interface Check {
  label: string;
  status: Status;
  detail: string;
}

export default function DebugPage() {
  const { user } = useAuthContext();
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);

  function update(label: string, status: Status, detail: string) {
    setChecks((prev) => {
      const existing = prev.findIndex((c) => c.label === label);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = { label, status, detail };
        return next;
      }
      return [...prev, { label, status, detail }];
    });
  }

  async function runChecks() {
    if (!user) return;
    setRunning(true);
    setChecks([]);

    // 1. Auth
    update("Auth", "ok", `Signed in as ${user.email} (uid: ${user.uid})`);

    // 2. Firestore write
    update("Firestore write", "pending", "Testing...");
    let testDocId = "";
    try {
      const ref = await addDoc(collection(db, "_debug_test"), {
        ts: serverTimestamp(),
        uid: user.uid,
      });
      testDocId = ref.id;
      update("Firestore write", "ok", `Wrote test doc: ${ref.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      update("Firestore write", "error", msg);
    }

    // 3. Firestore delete (cleanup)
    if (testDocId) {
      try {
        await deleteDoc(doc(db, "_debug_test", testDocId));
        update("Firestore delete", "ok", "Cleaned up test doc");
      } catch (err) {
        update("Firestore delete", "error", String(err));
      }
    }

    // 4. Firestore read (inventory_items)
    update("Firestore read (inventory_items)", "pending", "Testing...");
    try {
      const { getDocs, query, collection: col, orderBy } = await import("firebase/firestore");
      const snap = await getDocs(query(col(db, "inventory_items"), orderBy("addedAt", "desc")));
      update("Firestore read (inventory_items)", "ok", `Read ${snap.docs.length} items`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      update("Firestore read (inventory_items)", "error", msg);
    }

    // 5. Storage write
    update("Firebase Storage write", "pending", "Testing...");
    const testPath = `_debug/${user.uid}/test.txt`;
    try {
      const storageRef = ref(storage, testPath);
      const blob = new Blob(["test"], { type: "text/plain" });
      await uploadBytes(storageRef, blob);
      update("Firebase Storage write", "ok", `Uploaded to ${testPath}`);

      // Cleanup
      await deleteObject(storageRef);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      update("Firebase Storage write", "error", msg);
    }

    // 6. Claude API
    update("Claude API", "pending", "Testing...");
    try {
      const res = await fetch("/api/process-recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: "This is a blue ceramic coffee mug that lives on my kitchen shelf." }),
      });
      if (res.ok) {
        const data = await res.json();
        update("Claude API", "ok", `Response: name="${data.extracted?.name}" categories=${JSON.stringify(data.extracted?.categories)}`);
      } else {
        const err = await res.json();
        update("Claude API", "error", `HTTP ${res.status}: ${err.error}`);
      }
    } catch (err) {
      update("Claude API", "error", err instanceof Error ? err.message : String(err));
    }

    setRunning(false);
  }

  const statusColor: Record<Status, string> = {
    pending: "text-amber-500",
    ok: "text-emerald-600",
    error: "text-red-600",
  };
  const statusIcon: Record<Status, string> = {
    pending: "⏳",
    ok: "✅",
    error: "❌",
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-stone-800">Firebase + Claude Diagnostics</h1>
          <p className="text-stone-500 text-sm mt-1">
            Tests each service independently to find where saves are failing
          </p>
        </div>

        {!user ? (
          <p className="text-stone-500">Sign in first to run diagnostics.</p>
        ) : (
          <>
            <button
              onClick={runChecks}
              disabled={running}
              className="px-5 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-200 disabled:text-stone-400 text-white font-semibold rounded-xl transition-colors mb-6"
            >
              {running ? "Running checks..." : "Run diagnostics"}
            </button>

            {checks.length > 0 && (
              <div className="space-y-3">
                {checks.map((check) => (
                  <div
                    key={check.label}
                    className={`p-4 rounded-xl border ${
                      check.status === "ok"
                        ? "bg-emerald-50 border-emerald-200"
                        : check.status === "error"
                        ? "bg-red-50 border-red-200"
                        : "bg-amber-50 border-amber-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{statusIcon[check.status]}</span>
                      <span className={`font-semibold text-sm ${statusColor[check.status]}`}>
                        {check.label}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 mt-1 font-mono break-all">
                      {check.detail}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 p-4 bg-stone-100 rounded-xl text-xs text-stone-500 space-y-1">
              <p className="font-semibold text-stone-700">Environment</p>
              <p>Project ID: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}</p>
              <p>Auth domain: {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}</p>
              <p>Storage bucket: {process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}</p>
              <p>Anthropic key set: {process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "yes" : "no"}</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
