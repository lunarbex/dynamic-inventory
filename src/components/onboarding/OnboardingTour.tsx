"use client";

import { useEffect, useState } from "react";
import Joyride, { type CallBackProps, type Step, STATUS, EVENTS } from "react-joyride";

interface OnboardingTourProps {
  run: boolean;
  onFinish: () => void;
}

const STEPS: Step[] = [
  {
    target: "[data-tour='brand']",
    title: "Your personal archive",
    content: "InvenStories is your book — each inventory is a living archive of objects and the stories they carry.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: "[data-tour='inventory-switcher']",
    title: "Multiple inventories",
    content: "You can belong to several inventories — a family home, a personal collection, an estate. Switch between them here.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: "[data-tour='add-button']",
    title: "Add an entry",
    content: "Tap here to add an object. Take a photo, speak its story aloud, and the AI will organize everything — names, places, relationships.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: "[data-tour='chapter-grid']",
    title: "Chapters",
    content: "Your belongings are organized like chapters in a book — by activity or theme. Kitchen tools, heirlooms, library, tools & repair.",
    placement: "top",
    disableBeacon: true,
  },
  {
    target: "[data-tour='nav-map']",
    title: "Navigate your collection",
    content: "Explore by chapter, search by story, or view your objects on a map by where they came from.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: "[data-tour='nav-agents']",
    title: "Agents",
    content: "Agents work quietly in the background — finding patterns, surfacing forgotten entries, mapping connections between objects.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: "[data-tour='nav-search']",
    title: "Search everything",
    content: "Search across names, stories, people, places, and tags. Every word you've spoken is findable.",
    placement: "bottom",
    disableBeacon: true,
  },
];

// Mobile-safe steps: skip targets that may not exist on small screens
function getSteps(): Step[] {
  if (typeof window === "undefined") return STEPS;
  const isMobile = window.innerWidth < 640;
  if (!isMobile) return STEPS;
  // On mobile, skip inventory-switcher (hidden) and chapter-grid (may not exist yet)
  return STEPS.filter((s) =>
    !["[data-tour='inventory-switcher']"].includes(s.target as string)
  );
}

export function OnboardingTour({ run, onFinish }: OnboardingTourProps) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSteps(getSteps());
  }, []);

  useEffect(() => {
    if (run) setStepIndex(0);
  }, [run]);

  function handleCallback(data: CallBackProps) {
    const { status, type, index, action } = data;
    const finished = ([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status);

    if (finished) {
      onFinish();
      return;
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex((i) => (action === "prev" ? i - 1 : i + 1));
    }
  }

  if (!mounted) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      disableScrolling={false}
      disableOverlayClose={false}
      callback={handleCallback}
      locale={{
        back: "Back",
        close: "Close",
        last: "Finish",
        next: "Next →",
        skip: "Skip tour",
      }}
      styles={{
        options: {
          arrowColor: "var(--parchment-light)",
          backgroundColor: "var(--parchment-light)",
          overlayColor: "rgba(44, 36, 22, 0.55)",
          primaryColor: "var(--gold, #8b6914)",
          textColor: "var(--ink, #2c2416)",
          zIndex: 9998,
          width: 320,
        },
        tooltip: {
          borderRadius: 8,
          boxShadow: "0 8px 32px rgba(44,36,22,0.22)",
          padding: "20px 22px 16px",
          border: "1px solid var(--border, #cfc8b8)",
          fontFamily: "inherit",
        },
        tooltipTitle: {
          fontFamily: "'Lora', Georgia, serif",
          fontSize: "0.95rem",
          fontWeight: 700,
          color: "var(--ink, #2c2416)",
          marginBottom: 6,
        },
        tooltipContent: {
          fontSize: "0.8rem",
          lineHeight: 1.65,
          color: "var(--ink-mid, #6b5c3e)",
          padding: "4px 0 8px",
        },
        buttonNext: {
          backgroundColor: "var(--gold, #8b6914)",
          borderRadius: 5,
          fontSize: "0.75rem",
          fontWeight: 600,
          padding: "7px 14px",
          color: "#faf7f2",
          outline: "none",
        },
        buttonBack: {
          color: "var(--ink-light, #a89070)",
          fontSize: "0.75rem",
          marginRight: 8,
        },
        buttonSkip: {
          color: "var(--ink-light, #a89070)",
          fontSize: "0.75rem",
        },
        spotlight: {
          borderRadius: 8,
        },
        buttonClose: {
          display: "none",
        },
      }}
    />
  );
}
