import * as Updates from 'expo-updates';
import { useEffect } from 'react';

import { reportUpdateAnalytics } from '@/utils/update-analytics';

export function UpdateAnalyticsReporter() {
  const updates = Updates.useUpdates();
  const currentUpdateId = Updates.updateId;
  const downloadedUpdateId = updates.isUpdatePending
    ? updates.downloadedUpdate?.updateId
    : undefined;
  const availableUpdateId = updates.availableUpdate?.updateId;
  const downloadFailureUpdateId = updates.downloadError
    ? updates.availableUpdate?.updateId
    : undefined;

  useEffect(() => {
    if (currentUpdateId && !Updates.isEmbeddedLaunch) {
      void reportUpdateAnalytics(currentUpdateId, 'success');
    }
  }, [currentUpdateId]);

  useEffect(() => {
    if (availableUpdateId) {
      void reportUpdateAnalytics(availableUpdateId, 'detected');
    }
  }, [availableUpdateId]);

  useEffect(() => {
    if (downloadedUpdateId) {
      void reportUpdateAnalytics(downloadedUpdateId, 'downloaded');
    }
  }, [downloadedUpdateId]);

  useEffect(() => {
    if (downloadFailureUpdateId) {
      void reportUpdateAnalytics(downloadFailureUpdateId, 'failure', 'UpdateDownloadFailed');
    }
  }, [downloadFailureUpdateId]);

  useEffect(() => {
    let cancelled = false;
    void Updates.readLogEntriesAsync(7 * 24 * 60 * 60 * 1000)
      .then((entries) => {
        if (cancelled) return;
        for (const entry of entries) {
          if (entry.code === 'UpdateFailedToLoad' && entry.updateId) {
            void reportUpdateAnalytics(entry.updateId, 'failure', entry.code);
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
