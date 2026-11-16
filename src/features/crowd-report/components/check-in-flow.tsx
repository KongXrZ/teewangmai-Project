"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/components/auth-provider";
import { QuickScanPage } from "@/features/quick-scan/components/quick-scan-page";
import type { QuickScanVerification } from "@/features/quick-scan/types";
import {
  canStartSubmit,
  checkInFlowReducer,
  initialCheckInFlowState,
  type CheckInScanState,
} from "../check-in-flow";
import { getErrorCopy } from "../crowd-report";
import { unavailableCheckInGateway } from "../gateway";
import { requestGpsEvidence, type GpsResult } from "../location";
import type { CheckInGateway, CrowdLevel } from "../types";
import { CrowdReportForm } from "./crowd-report-form";

const LOGIN_ROUTE = "/login?next=%2Fscan";

export interface CheckInFlowProps {
  gateway?: CheckInGateway;
  requestGps?: (signal: AbortSignal) => Promise<GpsResult>;
}

function toVerification(scan: CheckInScanState): QuickScanVerification {
  if (scan.status === "rejected") {
    return {
      status: "rejected",
      message: scan.message || getErrorCopy(scan.reason).description,
    };
  }
  return scan;
}

export function CheckInFlow({
  gateway = unavailableCheckInGateway,
  requestGps = requestGpsEvidence,
}: CheckInFlowProps) {
  const router = useRouter();
  const { status: authStatus } = useAuth();
  const [state, dispatch] = useReducer(
    checkInFlowReducer,
    initialCheckInFlowState,
  );
  const stateRef = useRef(state);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.replace(LOGIN_ROUTE);
    }
  }, [authStatus, router]);

  useEffect(
    () => () => {
      requestRef.current?.abort();
      requestRef.current = null;
    },
    [],
  );

  const cancelRequest = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
  }, []);

  const beginRequest = useCallback(() => {
    if (requestRef.current) return null;
    const controller = new AbortController();
    requestRef.current = controller;
    return controller;
  }, []);

  const endRequest = useCallback((controller: AbortController) => {
    if (requestRef.current === controller) {
      requestRef.current = null;
    }
  }, []);

  const handleConfirmLevel = useCallback((level: CrowdLevel) => {
    dispatch({ type: "confirm_level", level });
  }, []);

  const handleDetect = useCallback(
    (rawValue: string) => {
      const current = stateRef.current;
      if (current.phase !== "scan" || current.scan.status === "verifying") {
        return;
      }
      const controller = beginRequest();
      if (!controller) return;
      dispatch({ type: "resolve_start" });

      gateway
        .resolveQr(rawValue, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) {
            dispatch({ type: "resolve_done", result });
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            dispatch({
              type: "resolve_done",
              result: { kind: "rejected", reason: "network" },
            });
          }
        })
        .finally(() => endRequest(controller));
    },
    [beginRequest, endRequest, gateway],
  );

  const handleRescan = useCallback(() => {
    cancelRequest();
    dispatch({ type: "rescan" });
  }, [cancelRequest]);

  const handleSubmit = useCallback(
    (level: CrowdLevel) => {
      const current = stateRef.current;
      const floor = current.floor;
      if (!canStartSubmit(current) || !floor) return;
      const controller = beginRequest();
      if (!controller) return;
      const { signal } = controller;
      dispatch({ type: "submit_start" });

      (async () => {
        const gps = await requestGps(signal);
        if (signal.aborted) return;
        if (gps.kind === "failed") {
          dispatch({ type: "gps_failed", reason: gps.reason });
          return;
        }
        const result = await gateway.submitCheckIn(
          { floorRef: floor.floorRef, level, gps: gps.evidence },
          signal,
        );
        if (!signal.aborted) {
          dispatch({ type: "submit_done", result });
        }
      })()
        .catch(() => {
          if (!signal.aborted) {
            dispatch({
              type: "submit_done",
              result: { kind: "rejected", reason: "network" },
            });
          }
        })
        .finally(() => endRequest(controller));
    },
    [beginRequest, endRequest, gateway, requestGps],
  );

  const handleDone = useCallback(() => {
    cancelRequest();
    dispatch({ type: "reset" });
  }, [cancelRequest]);

  if (state.phase === "scan") {
    return (
      <QuickScanPage
        verification={toVerification(state.scan)}
        onDetect={handleDetect}
        onRescan={handleRescan}
      />
    );
  }

  return (
    <CrowdReportForm
      key={state.formKey}
      context={state.phase === "ready" ? (state.floor?.context ?? null) : null}
      submission={state.submission}
      initialLevel={state.level}
      onConfirmLevel={handleConfirmLevel}
      onSubmit={handleSubmit}
      onDone={handleDone}
    />
  );
}
