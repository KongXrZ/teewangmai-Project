"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  loadBuildingDetail,
  loadFloorDetail,
  mergeSingleFloorDetail,
  resolveInitialFloorId,
  withFloorQuery,
} from "./building-detail-adapter";
import { BuildingDetailPage } from "./building-detail-page";
import type { BuildingDetailState, FloorId } from "./location-view-models";

export function BuildingDetailContainer({
  buildingId,
}: {
  buildingId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedFloorId = searchParams.get("floor");
  const [state, setState] = useState<BuildingDetailState>({ status: "loading" });
  const [defaultFloorId, setDefaultFloorId] = useState<FloorId | undefined>();
  const [reloadNonce, setReloadNonce] = useState(0);
  const floorControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    loadBuildingDetail(buildingId, controller.signal)
      .then((outcome) => {
        if (controller.signal.aborted) {
          return;
        }
        if (outcome.kind === "ok") {
          setDefaultFloorId(outcome.defaultFloorId);
          setState({ status: "ready", building: outcome.building });
        } else if (outcome.kind === "not_found") {
          setDefaultFloorId(undefined);
          setState({ status: "not_found" });
        } else {
          setDefaultFloorId(undefined);
          setState({ status: "error" });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setDefaultFloorId(undefined);
          setState({ status: "error" });
        }
      });

    return () => {
      controller.abort();
      floorControllerRef.current?.abort();
    };
  }, [buildingId, reloadNonce]);

  function handleRetry() {
    setState({ status: "loading" });
    setReloadNonce((n) => n + 1);
  }

  const initialFloorId =
    state.status === "ready"
      ? resolveInitialFloorId(state.building.floors, requestedFloorId, defaultFloorId)
      : undefined;

  function handleSelectFloor(floorId: FloorId) {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${withFloorQuery(window.location.search, floorId)}`,
    );
    floorControllerRef.current?.abort();
    const controller = new AbortController();
    floorControllerRef.current = controller;

    loadFloorDetail(buildingId, floorId, controller.signal)
      .then((outcome) => {
        if (controller.signal.aborted || outcome.kind !== "ok") {
          return;
        }
        setState((prev) =>
          prev.status === "ready" && prev.building.id === buildingId
            ? {
                status: "ready",
                building: mergeSingleFloorDetail(
                  prev.building,
                  outcome.floor,
                  outcome.crowdFloor,
                  outcome.crowdFailed,
                ),
              }
            : prev,
        );
      })
      .catch(() => {
        // Keep currently loaded floor data if incremental floor refresh is aborted or transiently fails.
      });
  }

  return (
    <BuildingDetailPage
      state={state}
      initialFloorId={initialFloorId}
      onSelectFloor={handleSelectFloor}
      onCheckIn={() => router.push("/scan")}
      onRetry={handleRetry}
    />
  );
}
