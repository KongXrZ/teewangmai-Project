import type { BadgesResult } from "./api/badges-adapter";

export interface BadgesRequestCallbacks {
  onSuccess: (result: BadgesResult) => void;
  onError: () => void;
}

export interface BadgesRefreshRunner {
  start: (
    loader: (signal: AbortSignal) => Promise<BadgesResult>,
    callbacks: BadgesRequestCallbacks,
  ) => Promise<void>;
  cancel: () => void;
}

export function createBadgesRefreshRunner(): BadgesRefreshRunner {
  let activeSeq = 0;
  let activeController: AbortController | null = null;

  function cancel() {
    activeSeq += 1;
    activeController?.abort();
    activeController = null;
  }

  async function start(
    loader: (signal: AbortSignal) => Promise<BadgesResult>,
    callbacks: BadgesRequestCallbacks,
  ): Promise<void> {
    activeController?.abort();
    const seq = ++activeSeq;
    const controller = new AbortController();
    activeController = controller;

    try {
      const result = await loader(controller.signal);
      if (controller.signal.aborted || seq !== activeSeq) {
        return;
      }
      activeController = null;
      callbacks.onSuccess(result);
    } catch {
      if (controller.signal.aborted || seq !== activeSeq) {
        return;
      }
      activeController = null;
      callbacks.onError();
    }
  }

  return { start, cancel };
}
