"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearAttemptKey,
  getAttemptKey,
  readAttemptKey,
  voucherUseAttemptScope,
} from "../api/attempt-keys";
import {
  fetchVouchers,
  requestVoucherUse,
  type VouchersResult,
} from "../api/redemption-adapter";
import type {
  VoucherCollectionState,
  VoucherDetailState,
  VoucherId,
  VoucherModel,
} from "../vouchers";

const LOGIN_ROUTE = "/login";
const USE_CODE_LIFETIME_MS = 30 * 60 * 1000;
const USE_RETRY_MESSAGE = "ยังยืนยันผลการใช้สิทธิ์ไม่ได้ โปรดลองใหม่อีกครั้ง";

interface ActiveVoucherUse {
  id: VoucherId;
  usedAt: string;
  useCode: string;
}

function millisecondsUntil(deadline: number) {
  return Math.max(deadline - Date.now(), 0);
}

export function useVoucherCollection(): VoucherCollectionState {
  const router = useRouter();
  const [result, setResult] = useState<VouchersResult | null>(null);
  const [requestId, setRequestId] = useState(0);

  const retry = useCallback(() => {
    setResult(null);
    setRequestId((id) => id + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetchVouchers(fetch, controller.signal)
      .then((next) => {
        setResult(next);
        if (next.kind === "unauthenticated") {
          router.replace(LOGIN_ROUTE);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResult({ kind: "error" });
        }
      });

    return () => controller.abort();
  }, [requestId, router]);

  if (result === null || result.kind === "unauthenticated") {
    return { status: "loading" };
  }
  if (result.kind === "error") {
    return { status: "error", message: result.message, onRetry: retry };
  }
  return { status: "ready", vouchers: result.vouchers };
}

export interface VoucherDetailController {
  state: VoucherDetailState;
  useCode: string | null;
  usePending: boolean;
  useError?: string;
  submitUse: (voucher: VoucherModel) => void;
}

export function useVoucherDetail(
  voucherId: VoucherId | null,
): VoucherDetailController {
  const router = useRouter();
  const [result, setResult] = useState<VouchersResult | null>(null);
  const [requestId, setRequestId] = useState(0);
  const [activeUse, setActiveUse] = useState<ActiveVoucherUse | null>(null);
  const [usePending, setUsePending] = useState(false);
  const [useError, setUseError] = useState<string>();
  const useControllerRef = useRef<AbortController | null>(null);

  const retry = useCallback(() => {
    setResult(null);
    setRequestId((id) => id + 1);
  }, []);

  useEffect(() => {
    if (voucherId === null) {
      return;
    }
    const controller = new AbortController();
    const { signal } = controller;
    const scope = voucherUseAttemptScope(voucherId);

    async function load(id: VoucherId) {
      const next = await fetchVouchers(fetch, signal);
      if (signal.aborted) {
        return;
      }
      setResult(next);
      if (next.kind === "unauthenticated") {
        router.replace(LOGIN_ROUTE);
        return;
      }
      if (next.kind !== "ok") {
        return;
      }

      const voucher = next.vouchers.find((item) => item.id === id);
      const key = readAttemptKey(scope);
      if (!voucher || voucher.usedAt === null || key === null) {
        return;
      }

      const recovered = await requestVoucherUse(id, key, fetch, signal);
      if (signal.aborted) {
        return;
      }
      if (recovered.kind === "ok") {
        setActiveUse({
          id: recovered.id,
          usedAt: recovered.usedAt,
          useCode: recovered.useCode,
        });
      } else if (recovered.kind !== "unknown") {
        clearAttemptKey(scope);
        setActiveUse(null);
      }
    }

    load(voucherId).catch(() => {
      if (!signal.aborted) {
        setResult({ kind: "error" });
      }
    });

    return () => controller.abort();
  }, [requestId, router, voucherId]);

  useEffect(() => () => useControllerRef.current?.abort(), []);

  const voucher =
    result?.kind === "ok"
      ? (result.vouchers.find((item) => item.id === voucherId) ?? null)
      : null;
  const voucherExpiresAt = voucher?.expiresAt ?? null;

  useEffect(() => {
    if (!activeUse) {
      return;
    }
    const useDeadline =
      new Date(activeUse.usedAt).getTime() + USE_CODE_LIFETIME_MS;
    const voucherDeadline = voucherExpiresAt
      ? new Date(voucherExpiresAt).getTime()
      : useDeadline;
    const timer = setTimeout(
      () => {
        clearAttemptKey(voucherUseAttemptScope(activeUse.id));
        setActiveUse(null);
      },
      millisecondsUntil(Math.min(useDeadline, voucherDeadline)),
    );
    return () => clearTimeout(timer);
  }, [activeUse, voucherExpiresAt]);

  const submitUse = useCallback(
    (target: VoucherModel) => {
      if (useControllerRef.current) {
        return;
      }
      const controller = new AbortController();
      const { signal } = controller;
      const scope = voucherUseAttemptScope(target.id);
      useControllerRef.current = controller;
      setUsePending(true);
      setUseError(undefined);

      requestVoucherUse(target.id, getAttemptKey(scope), fetch, signal)
        .then((next) => {
          if (signal.aborted) {
            return;
          }
          switch (next.kind) {
            case "ok":
              setActiveUse({
                id: next.id,
                usedAt: next.usedAt,
                useCode: next.useCode,
              });
              return;
            case "unauthenticated":
              clearAttemptKey(scope);
              router.replace(LOGIN_ROUTE);
              return;
            case "conflict":
              clearAttemptKey(scope);
              setRequestId((id) => id + 1);
              return;
            case "rejected":
              clearAttemptKey(scope);
              setUseError(next.message ?? USE_RETRY_MESSAGE);
              return;
            case "unknown":
              setUseError(next.message ?? USE_RETRY_MESSAGE);
              return;
          }
        })
        .catch(() => {
          if (!signal.aborted) {
            setUseError(USE_RETRY_MESSAGE);
          }
        })
        .finally(() => {
          if (useControllerRef.current === controller) {
            useControllerRef.current = null;
            setUsePending(false);
          }
        });
    },
    [router],
  );

  const useCode = activeUse?.id === voucherId ? activeUse.useCode : null;

  return {
    state: toDetailState(voucherId, result, voucher, activeUse, retry),
    useCode,
    usePending,
    useError,
    submitUse,
  };
}

function toDetailState(
  voucherId: VoucherId | null,
  result: VouchersResult | null,
  voucher: VoucherModel | null,
  activeUse: ActiveVoucherUse | null,
  retry: () => void,
): VoucherDetailState {
  if (voucherId === null) {
    return { status: "empty" };
  }
  if (result === null || result.kind === "unauthenticated") {
    return { status: "loading" };
  }
  if (result.kind === "error") {
    return { status: "error", message: result.message, onRetry: retry };
  }
  if (!voucher) {
    return { status: "empty" };
  }
  return {
    status: "ready",
    voucher:
      activeUse?.id === voucher.id
        ? { ...voucher, usedAt: activeUse.usedAt, status: "used" }
        : voucher,
  };
}
