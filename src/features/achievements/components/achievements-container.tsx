"use client";

import { useState } from "react";
import { useAchievements } from "../hooks/use-achievements";
import type { BadgeFilter, BadgeId } from "../types";
import { AchievementsPage } from "./achievements-page";

export function AchievementsContainer() {
  const { state } = useAchievements();
  const [filter, setFilter] = useState<BadgeFilter>("all");
  const [selectedId, setSelectedId] = useState<BadgeId | null>(null);

  const selectedBadge =
    state.status === "ready" && selectedId !== null
      ? (state.badges.find((badge) => badge.id === selectedId) ?? null)
      : null;

  return (
    <AchievementsPage
      state={state}
      filter={filter}
      onFilterChange={setFilter}
      onSelectBadge={(badge) => setSelectedId(badge.id)}
      selectedBadge={selectedBadge}
      onCloseBadge={() => setSelectedId(null)}
    />
  );
}
