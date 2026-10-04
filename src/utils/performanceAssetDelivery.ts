import { useState, useEffect } from "react";
import virtualCasinoBg from "../assets/images/virtual_dragon_tiger_bg.webp";
import appLogoIcon from "../assets/images/app_logo_icon.webp";

// Connection & Memory Network Navigator API Interfaces
interface NetworkInformation extends EventTarget {
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  saveData?: boolean;
  downlink?: number;
  rtt?: number;
  onchange?: EventListener;
}

interface NavigatorWithCapabilities extends Navigator {
  connection?: NetworkInformation;
  deviceMemory?: number;
}

export interface DeviceQualityProfile {
  isLowEndDevice: boolean;
  isSaveDataEnabled: boolean;
  effectiveConnectionType: "slow-2g" | "2g" | "3g" | "4g" | "wifi-fast";
  deviceMemoryGb: number;
  qualityTier: "low" | "medium" | "high";
  maxTextureResolution: number; // e.g. 640 for low, 1280 for medium, 1920 for high
}

export function getDeviceCapabilities(): DeviceQualityProfile {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      isLowEndDevice: false,
      isSaveDataEnabled: false,
      effectiveConnectionType: "4g",
      deviceMemoryGb: 4,
      qualityTier: "high",
      maxTextureResolution: 1920,
    };
  }

  const nav = navigator as NavigatorWithCapabilities;
  const conn = nav.connection;
  const memory = nav.deviceMemory || 4;
  const saveData = conn?.saveData || false;
  const ect = conn?.effectiveType || "4g";

  const isLowConnection = ect === "slow-2g" || ect === "2g" || ect === "3g";
  const isLowMemory = memory <= 2;
  const isLowEnd = isLowConnection || isLowMemory || saveData;

  let tier: "low" | "medium" | "high" = "high";
  let maxRes = 1920;

  if (saveData || ect === "slow-2g" || ect === "2g" || memory <= 1) {
    tier = "low";
    maxRes = 640;
  } else if (ect === "3g" || memory <= 2) {
    tier = "medium";
    maxRes = 1080;
  }

  return {
    isLowEndDevice: isLowEnd,
    isSaveDataEnabled: saveData,
    effectiveConnectionType: (ect as DeviceQualityProfile["effectiveConnectionType"]) || "4g",
    deviceMemoryGb: memory,
    qualityTier: tier,
    maxTextureResolution: maxRes,
  };
}

// Asset registry mapping
const ASSET_REGISTRY = {
  casinoBg: {
    high: virtualCasinoBg,
    medium: virtualCasinoBg,
    low: "/app-logo.png", // Lightweight fallback
  },
  appLogo: {
    high: appLogoIcon,
    medium: appLogoIcon,
    low: "/app-logo.png",
  },
} as const;

export type AssetKey = keyof typeof ASSET_REGISTRY;

export function getAdaptiveAssetUrl(key: AssetKey): string {
  const profile = getDeviceCapabilities();
  const asset = ASSET_REGISTRY[key];
  if (!asset) return "";
  return asset[profile.qualityTier] || asset.high;
}

export function useAdaptiveAsset(key: AssetKey): { url: string; profile: DeviceQualityProfile } {
  const [profile, setProfile] = useState<DeviceQualityProfile>(getDeviceCapabilities);
  const [url, setUrl] = useState<string>(() => getAdaptiveAssetUrl(key));

  useEffect(() => {
    const nav = navigator as NavigatorWithCapabilities;
    const conn = nav.connection;

    const handleNetworkChange = () => {
      const newProfile = getDeviceCapabilities();
      setProfile(newProfile);
      setUrl(getAdaptiveAssetUrl(key));
    };

    if (conn && typeof conn.addEventListener === "function") {
      conn.addEventListener("change", handleNetworkChange);
      return () => conn.removeEventListener("change", handleNetworkChange);
    }
  }, [key]);

  return { url, profile };
}
