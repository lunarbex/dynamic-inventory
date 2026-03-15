"use client";

import { useEffect, useRef } from "react";

interface OnboardingTourProps {
  run: boolean;
  onFinish: () => void;
}

const STEPS = [
  {
    element: "[data-tour='brand']",
    popover: {
      title: "Your personal archive",
      description: "InvenStories is your book — each inventory is a living archive of objects and the stories they carry.",
      side: "bottom" as const,
      align: "start" as const,
    },
  },
  {
    element: "[data-tour='inventory-switcher']",
    popover: {
      title: "Multiple inventories",
      description: "You can belong to several inventories — a family home, a personal collection, an estate. Switch between them here.",
      side: "bottom" as const,
      align: "start" as const,
    },
  },
  {
    element: "[data-tour='add-button']",
    popover: {
      title: "Add an entry",
      description: "Tap here to add an object. Take a photo, speak its story aloud, and the AI will organize everything — names, places, relationships.",
      side: "bottom" as const,
      align: "end" as const,
    },
  },
  {
    element: "[data-tour='chapter-grid']",
    popover: {
      title: "Chapters",
      description: "Your belongings are organized like chapters in a book — by activity or theme. Kitchen tools, heirlooms, library, tools & repair.",
      side: "top" as const,
      align: "center" as const,
    },
  },
  {
    element: "[data-tour='nav-map']",
    popover: {
      title: "Navigate your collection",
      description: "Explore by chapter, search by story, or view your objects on a map by where they came from.",
      side: "bottom" as const,
      align: "center" as const,
    },
  },
  {
    element: "[data-tour='nav-agents']",
    popover: {
      title: "Agents",
      description: "Agents work quietly in the background — finding patterns, surfacing forgotten entries, mapping connections between objects.",
      side: "bottom" as const,
      align: "center" as const,
    },
  },
  {
    element: "[data-tour='nav-search']",
    popover: {
      title: "Search everything",
      description: "Search across names, stories, people, places, and tags. Every word you've spoken is findable.",
      side: "bottom" as const,
      align: "center" as const,
    },
  },
];

export function OnboardingTour({ run, onFinish }: OnboardingTourProps) {
  const driverRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    if (!run) {
      driverRef.current?.destroy();
      driverRef.current = null;
      return;
    }

    let cancelled = false;

    // Filter steps to only those whose target exists in the DOM
    const visibleSteps = STEPS.filter((s) => document.querySelector(s.element));

    import("driver.js").then(({ driver }) => {
      if (cancelled) return;

      const d = driver({
        animate: true,
        overlayColor: "rgba(44, 36, 22, 0.6)",
        smoothScroll: true,
        allowClose: true,
        overlayOpacity: 0.6,
        stagePadding: 6,
        stageRadius: 8,
        popoverClass: "invenstories-tour",
        nextBtnText: "Next →",
        prevBtnText: "← Back",
        doneBtnText: "Finish",
        showProgress: true,
        steps: visibleSteps,
        onDestroyStarted: () => {
          d.destroy();
          onFinish();
        },
      });

      driverRef.current = d;
      d.drive();
    });

    return () => {
      cancelled = true;
      driverRef.current?.destroy();
      driverRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  return null;
}
