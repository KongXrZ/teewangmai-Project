"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAchievements } from "../hooks/use-achievements";
import type { BadgeFilter, BadgeId } from "../types";
import { findSelectedBadge } from "../view-model";
import { AchievementsPage } from "./achievements-page";

export function AchievementsContainer() {
  const router = useRouter();
  const { state } = useAchievements();
  const [filter, setFilter] = useState<BadgeFilter>("all");
  const [selectedId, setSelectedId] = useState<BadgeId | null>(null);

  const selectedBadge =
    state.status === "ready"
      ? findSelectedBadge(state.badges, selectedId)
      : null;

  if (state.status === "ready" && selectedId !== null && selectedBadge === null) {
    setSelectedId(null);
  }

  return (
    <AchievementsPage
      state={state}
      filter={filter}
      onFilterChange={setFilter}
      onSelectBadge={(badge) => setSelectedId(badge.id)}
      selectedBadge={selectedBadge}
      onCloseBadge={() => setSelectedId(null)}
      onBack={() => router.push("/profile")}
    />
  );
}
