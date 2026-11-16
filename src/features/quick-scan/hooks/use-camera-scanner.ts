"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createQrDecoder, type QrDecoder } from "../qr-decoder";
import {
  classifyCameraError,
  createDetectionGate,
  stopMediaStream,
  type CameraStatus,
} from "../scanner-state";

type CameraPhase = Exclude<CameraStatus, "detected">;

export type ScanRound = string | number;

export interface UseCameraScannerOptions {
  onDetect?: (rawValue: string) => void;
  round?: ScanRound;
}

const DECODE_INTERVAL_MS = 150;

const videoConstraints: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
};

function requestCameraStream(): Promise<MediaStream> {
  const mediaDevices =
    typeof navigator === "undefined" ? undefined : navigator.mediaDevices;
  if (!mediaDevices?.getUserMedia) {
    return Promise.reject(
      Object.assign(new Error("Camera API unavailable"), {
        name: "NotSupportedError",
      }),
    );
  }
  return mediaDevices.getUserMedia(videoConstraints);
}

export function useCameraScanner({
  onDetect,
  round = 0,
}: UseCameraScannerOptions = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<CameraPhase>("requesting");
  const [detectedRound, setDetectedRound] = useState<ScanRound | null>(null);

  const sessionRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const decoderRef = useRef<Promise<QrDecoder> | null>(null);
  const gateRef = useRef(createDetectionGate());
  const onDetectRef = useRef(onDetect);
  const roundRef = useRef(round);

  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  useEffect(() => {
    if (roundRef.current !== round) {
      roundRef.current = round;
      gateRef.current.reset();
    }
  }, [round]);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
  }, []);

  const runDecodeLoop = useCallback(
    async (session: number) => {
      const isCurrent = () => session === sessionRef.current;
      let decoder: QrDecoder;
      try {
        decoderRef.current ??= createQrDecoder();
        decoder = await decoderRef.current;
      } catch {
        decoderRef.current = null;
        if (isCurrent()) {
          stop();
          setPhase("error");
        }
        return;
      }

      const tick = async () => {
        if (!isCurrent()) return;
        const video = videoRef.current;
        if (video && !gateRef.current.settled && video.readyState >= 2) {
          try {
            const rawValue = await decoder(video);
            if (isCurrent() && rawValue && gateRef.current.accept(rawValue)) {
              setDetectedRound(roundRef.current);
              onDetectRef.current?.(rawValue);
            }
          } catch {}
        }
        if (isCurrent()) {
          timerRef.current = setTimeout(tick, DECODE_INTERVAL_MS);
        }
      };

      void tick();
    },
    [stop],
  );

  const connect = useCallback(async () => {
    stop();
    const session = sessionRef.current;
    const isCurrent = () => session === sessionRef.current;

    let stream: MediaStream;
    try {
      stream = await requestCameraStream();
    } catch (error) {
      if (isCurrent()) setPhase(classifyCameraError(error));
      return;
    }

    if (!isCurrent()) {
      stopMediaStream(stream);
      return;
    }

    streamRef.current = stream;
    stream.getVideoTracks().forEach((track) => {
      track.addEventListener("ended", () => {
        if (!isCurrent()) return;
        stop();
        setPhase("error");
      });
    });
    setPhase("starting");

    const video = videoRef.current;
    if (!video) {
      stop();
      setPhase("error");
      return;
    }

    try {
      video.srcObject = stream;
      await video.play();
    } catch {
      if (!isCurrent()) return;
      stop();
      setPhase("error");
      return;
    }

    if (!isCurrent()) return;
    setPhase("scanning");
    void runDecodeLoop(session);
  }, [runDecodeLoop, stop]);

  const start = useCallback(() => {
    setPhase("requesting");
    void connect();
  }, [connect]);

  useEffect(() => {
    void connect();

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        stop();
        setPhase("idle");
      } else {
        start();
      }
    }

    function handlePageHide() {
      stop();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      stop();
    };
  }, [connect, start, stop]);

  const status: CameraStatus =
    phase === "scanning" && detectedRound === round ? "detected" : phase;

  return { videoRef, status, retry: start };
}
