"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export type GeoState = {
  status: "idle" | "loading" | "ok" | "error";
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  message?: string;
};

const OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 60000,
};

// Geolocation support never changes, so no real subscription is needed
const subscribeNoop = () => () => {};
const getSupported = () =>
  typeof navigator !== "undefined" && "geolocation" in navigator;
const getServerSupported = () => true;

export function useGeolocation(auto = true) {
  const supported = useSyncExternalStore(
    subscribeNoop,
    getSupported,
    getServerSupported,
  );

  const [state, setState] = useState<GeoState>({
    status: auto ? "loading" : "idle",
    lat: null,
    lng: null,
    accuracy: null,
  });

  // Only updates state inside the async GPS callbacks
  const locate = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setState({
          status: "ok",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        }),
      (err) =>
        setState({
          status: "error",
          lat: null,
          lng: null,
          accuracy: null,
          message:
            err.code === 1
              ? "Location permission denied"
              : "Couldn't get your location",
        }),
      OPTIONS,
    );
  }, []);

  // For the Retry button (runs from a click, not an effect)
  const request = useCallback(() => {
    if (!getSupported()) return;
    setState((s) => ({ ...s, status: "loading", message: undefined }));
    locate();
  }, [locate]);

  useEffect(() => {
    if (auto && supported) locate();
  }, [auto, supported, locate]);

  if (!supported) {
    return {
      status: "error" as const,
      lat: null,
      lng: null,
      accuracy: null,
      message: "Location not supported on this device",
      request,
    };
  }

  return { ...state, request };
}
