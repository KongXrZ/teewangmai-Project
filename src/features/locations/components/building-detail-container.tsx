"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  loadBuildingDetail,
  loadFloorDetail,
  mergeSingleFloorDetail,
  resolveInitialFloorId,
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
  const [initialFloorId, setInitialFloorId] = useState<FloorId | undefined>();
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
          setInitialFloorId(
            resolveInitialFloorId(
              outcome.building.floors,
              requestedFloorId,
              outcome.defaultFloorId,
            ),
          );
          setState({ status: "ready", building: outcome.building });
        } else if (outcome.kind === "not_found") {
          setInitialFloorId(undefined);
          setState({ status: "not_found" });
        } else {
          setInitialFloorId(undefined);
          setState({ status: "error" });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setInitialFloorId(undefined);
          setState({ status: "error" });
        }
      });

    return () => {
      controller.abort();
      floorControllerRef.current?.abort();
    };
  }, [buildingId, reloadNonce, requestedFloorId]);

  function handleRetry() {
    setState({ status: "loading" });
    setReloadNonce((n) => n + 1);
  }

  function handleSelectFloor(floorId: FloorId) {
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
      onCheckIn={() => router.push("/check-in")}
      onRetry={handleRetry}
    />
  );
}
