"use client";

import { useRouter } from "next/navigation";
import {
  BottomNavigation,
  type NavigationItemId,
} from "./bottom-navigation";

const navigationRoutes: Partial<Record<NavigationItemId, string>> = {
  home: "/",
  places: "/locations",
};

export function AppBottomNavigation({
  selected,
}: {
  selected: NavigationItemId;
}) {
  const router = useRouter();

  function handleNavigate(id: NavigationItemId) {
    const href = navigationRoutes[id];
    if (href && id !== selected) {
      router.push(href);
    }
  }

  return <BottomNavigation selected={selected} onChange={handleNavigate} />;
}
