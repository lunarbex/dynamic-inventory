"use client";

import { useState, useEffect } from "react";
import { getOnboardingState, updateOnboardingState } from "@/lib/firestore";
import type { OnboardingState } from "@/lib/types";

const DEFAULT_STATE: OnboardingState = {
  hasSeenWelcome: false,
  hasCompletedTour: false,
  hasAddedFirstItem: false,
};

export function useOnboarding(uid: string | null) {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    getOnboardingState(uid).then((s) => {
      setState(s);
      if (!s.hasSeenWelcome) setShowWelcome(true);
      setLoading(false);
    });
  }, [uid]);

  async function dismissWelcome() {
    setShowWelcome(false);
    if (!uid) return;
    const updated = { ...DEFAULT_STATE, ...state, hasSeenWelcome: true };
    setState(updated);
    await updateOnboardingState(uid, { hasSeenWelcome: true });
  }

  async function startTour() {
    setShowWelcome(false);
    setRunTour(true);
    if (!uid) return;
    await updateOnboardingState(uid, { hasSeenWelcome: true });
  }

  async function finishTour() {
    setRunTour(false);
    if (!uid) return;
    const updated = { ...DEFAULT_STATE, ...state, hasSeenWelcome: true, hasCompletedTour: true };
    setState(updated);
    await updateOnboardingState(uid, { hasSeenWelcome: true, hasCompletedTour: true });
  }

  function replayTour() {
    setShowWelcome(false);
    setRunTour(false);
    setTimeout(() => setRunTour(true), 100);
  }

  async function resetOnboarding() {
    const fresh: OnboardingState = { hasSeenWelcome: false, hasCompletedTour: false, hasAddedFirstItem: false };
    setState(fresh);
    setRunTour(false);
    setShowWelcome(false);
    if (!uid) return;
    await updateOnboardingState(uid, fresh);
    // Show welcome modal after a tick so state settles
    setTimeout(() => setShowWelcome(true), 100);
  }

  return {
    loading,
    state: state ?? DEFAULT_STATE,
    showWelcome,
    runTour,
    dismissWelcome,
    startTour,
    finishTour,
    replayTour,
    resetOnboarding,
  };
}
