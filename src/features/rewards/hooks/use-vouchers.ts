"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import {
  clearAttemptKey,
  getAttemptKey,
  readAttemptKey,
  shouldClearVoucherUseKey,
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

const USE_CODE_LIFETIME_MS = 30 * 60 * 1000;
const USE_RETRY_MESSAGE = "ยังยืนยันผลการใช้สิทธิ์ไม่ได้ โปรดลองใหม่อีกครั้ง";

export interface ActiveVoucherUse {
  id: VoucherId;
  usedAt: string;
  useCode: string;
}

function millisecondsUntil(deadline: number) {
  return Math.max(deadline - Date.now(), 0);
}

export interface VoucherCollectionController {
  state: VoucherCollectionState;
  activeUses: Readonly<Record<VoucherId, ActiveVoucherUse>>;
  usePending: boolean;
  useError?: string;
  clearUseError: () => void;
  submitUse: (voucher: VoucherModel) => void;
}

export function useVoucherCollection(): VoucherCollectionController {
  const { status: authStatus, refresh: refreshAuth } = useAuth();
  const enabled = authStatus === "authenticated" || authStatus === "error";
  const [result, setResult] = useState<VouchersResult | null>(null);
  const [requestId, setRequestId] = useState(0);
  const [activeUses, setActiveUses] = useState<
    Record<VoucherId, ActiveVoucherUse>
  >({});
  const [usePending, setUsePending] = useState(false);
  const [useError, setUseError] = useState<string>();
  const useControllerRef = useRef<AbortController | null>(null);

  const retry = useCallback(() => {
    setResult(null);
    setRequestId((id) => id + 1);
  }, []);

  const clearUseError = useCallback(() => {
    setUseError(undefined);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const { signal } = controller;

    async function load() {
      const next = await fetchVouchers(fetch, signal);
      if (signal.aborted) {
        return;
      }
      if (next.kind === "unauthenticated") {
        await refreshAuth();
        if (!signal.aborted) {
          setResult({ kind: "unauthenticated" });
        }
        return;
      }

      if (next.kind === "ok") {
        const recoverable = next.vouchers
          .map((voucher) => ({
            voucher,
            scope: voucherUseAttemptScope(voucher.id),
            key:
              voucher.usedAt !== null
                ? readAttemptKey(voucherUseAttemptScope(voucher.id))
                : null,
          }))
          .filter(
            (
              entry,
            ): entry is { voucher: VoucherModel; scope: string; key: string } =>
              entry.key !== null,
          );

        if (recoverable.length > 0) {
          const recoveredMap: Record<VoucherId, ActiveVoucherUse> = {};
          let sawUnauthenticated = false;

          await Promise.all(
            recoverable.map(async ({ voucher, scope, key }) => {
              const recovered = await requestVoucherUse(
                voucher.id,
                key,
                fetch,
                signal,
              );
              if (signal.aborted) {
                return;
              }
              if (recovered.kind === "ok") {
                recoveredMap[recovered.id] = {
                  id: recovered.id,
                  usedAt: recovered.usedAt,
                  useCode: recovered.useCode,
                };
              } else if (recovered.kind === "unauthenticated") {
                sawUnauthenticated = true;
              } else if (shouldClearVoucherUseKey(recovered.kind)) {
                clearAttemptKey(scope);
              }
            }),
          );

          if (signal.aborted) {
            return;
          }
          if (sawUnauthenticated) {
            await refreshAuth();
            if (!signal.aborted) {
              setResult({ kind: "unauthenticated" });
            }
            return;
          }
          setActiveUses(recoveredMap);
        }
      }

      setResult(next);
    }

    load().catch(() => {
      if (!signal.aborted) {
        setResult({ kind: "error" });
      }
    });

    return () => controller.abort();
  }, [enabled, refreshAuth, requestId]);

  useEffect(() => () => useControllerRef.current?.abort(), []);

  useEffect(() => {
    const entries = Object.values(activeUses);
    if (entries.length === 0) {
      return;
    }
    const vouchersById = new Map(
      result?.kind === "ok"
        ? result.vouchers.map((voucher) => [voucher.id, voucher])
        : [],
    );

    const timers = entries.map((active) => {
      const useDeadline =
        new Date(active.usedAt).getTime() + USE_CODE_LIFETIME_MS;
      const voucherExpiresAt = vouchersById.get(active.id)?.expiresAt;
      const voucherDeadline = voucherExpiresAt
        ? new Date(voucherExpiresAt).getTime()
        : useDeadline;
      return setTimeout(
        () => {
          clearAttemptKey(voucherUseAttemptScope(active.id));
          setActiveUses((current) => {
            if (!(active.id in current)) {
              return current;
            }
            const next = { ...current };
            delete next[active.id];
            return next;
          });
        },
        millisecondsUntil(Math.min(useDeadline, voucherDeadline)),
      );
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [activeUses, result]);

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
              setActiveUses((current) => ({
                ...current,
                [next.id]: {
                  id: next.id,
                  usedAt: next.usedAt,
                  useCode: next.useCode,
                },
              }));
              return;
            case "unauthenticated":
              setUseError(USE_RETRY_MESSAGE);
              void refreshAuth();
              return;
            case "conflict":
              clearAttemptKey(scope);
              setUseError(
                next.message ?? "สิทธิ์นี้ถูกใช้หรือหมดอายุแล้ว โปรดตรวจสอบอีกครั้ง",
              );
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
    [refreshAuth],
  );

  let state: VoucherCollectionState;
  if (result === null) {
    state = { status: "loading" };
  } else if (result.kind === "unauthenticated") {
    state = { status: "unauthenticated" };
  } else if (result.kind === "error") {
    state = { status: "error", message: result.message, onRetry: retry };
  } else {
    state = {
      status: "ready",
      vouchers: result.vouchers.map((voucher) => {
        const active = activeUses[voucher.id];
        return active
          ? { ...voucher, usedAt: active.usedAt, status: "used" }
          : voucher;
      }),
    };
  }

  return {
    state,
    activeUses,
    usePending,
    useError,
    clearUseError,
    submitUse,
  };
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
  const { status: authStatus, refresh: refreshAuth } = useAuth();
  const enabled = authStatus === "authenticated" || authStatus === "error";
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
    if (voucherId === null || !enabled) {
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
      if (next.kind === "unauthenticated") {
        await refreshAuth();
        if (!signal.aborted) {
          setResult({ kind: "unauthenticated" });
        }
        return;
      }

      const voucher =
        next.kind === "ok"
          ? next.vouchers.find((item) => item.id === id)
          : undefined;
      const key = readAttemptKey(scope);
      if (voucher && voucher.usedAt !== null && key !== null) {
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
        } else if (recovered.kind === "unauthenticated") {
          await refreshAuth();
          if (!signal.aborted) {
            setResult({ kind: "unauthenticated" });
          }
          return;
        } else if (shouldClearVoucherUseKey(recovered.kind)) {
          clearAttemptKey(scope);
          setActiveUse(null);
        }
      }
      setResult(next);
    }

    load(voucherId).catch(() => {
      if (!signal.aborted) {
        setResult({ kind: "error" });
      }
    });

    return () => controller.abort();
  }, [enabled, refreshAuth, requestId, voucherId]);

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
              setUseError(USE_RETRY_MESSAGE);
              void refreshAuth();
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
    [refreshAuth],
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
  if (result === null) {
    return { status: "loading" };
  }
  if (result.kind === "unauthenticated") {
    return { status: "unauthenticated" };
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
