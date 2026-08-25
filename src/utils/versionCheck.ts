/**
 * In-App Live Auto-Update and Version Check Utility
 * Checks build timestamp and manifest to trigger instant OTA hot-reloads.
 */

export interface VersionInfo {
  version: string;
  buildTime: number;
  commitHash: string;
  updateAvailable: boolean;
  notes?: string;
}

export const CURRENT_BUILD_VERSION = 'v2.5.0';
export const CURRENT_BUILD_TIMESTAMP = 1787640000000; // 2026-08-25
export const CURRENT_COMMIT_HASH = '4cf8db4';

const LAST_CHECKED_KEY = 'tip_calc_last_version_check';
const DISMISSED_VERSION_KEY = 'tip_calc_dismissed_version';

/**
 * Checks if a newer version is deployed or available.
 */
export async function checkForAppUpdates(): Promise<{
  updateAvailable: boolean;
  latestVersion: string;
  notes?: string;
}> {
  try {
    // 1. Check ServiceWorker controller updates if registered
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        if (registration.waiting) {
          return {
            updateAvailable: true,
            latestVersion: CURRENT_BUILD_VERSION,
            notes: 'A fresh build with receipt parsing & UI enhancements is ready.',
          };
        }
        registration.update().catch(() => {});
      }
    }

    // 2. Fetch remote manifest with cache-busting timestamp
    const response = await fetch(`/version.json?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (response.ok) {
      const remote = await response.json();
      if (remote && remote.buildTime && remote.buildTime > CURRENT_BUILD_TIMESTAMP) {
        const dismissed = localStorage.getItem(DISMISSED_VERSION_KEY);
        if (dismissed !== remote.version) {
          return {
            updateAvailable: true,
            latestVersion: remote.version || 'v2.5.1',
            notes: remote.notes || 'Latest performance & OCR upgrades available.',
          };
        }
      }
    }
  } catch (err) {
    // Fallback: offline or non-hosted environment
    console.debug('Version check completed offline:', err);
  }

  return {
    updateAvailable: false,
    latestVersion: CURRENT_BUILD_VERSION,
  };
}

/**
 * Applies instant OTA reload: Clears caches and forces hard browser reload.
 */
export async function applyInstantUpdate(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && 'caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
  } catch (e) {
    console.warn('Cache clearing during update warning:', e);
  }

  // Force hard reload
  window.location.reload();
}
