// services/symptomActionHandler.ts

///////////////////////////////////////////////////////////
// ✅ REMOVED listenSymptomActions() entirely
//
// Previously this file added a third duplicate listener:
//   Notifications.addNotificationResponseReceivedListener(...)
//
// This caused triple-handling of every notification action
// alongside the listeners in _layout.tsx and notificationService.ts
//
// _layout.tsx is now the SINGLE listener for all notification
// actions across the entire app — medicine, hydration, symptom.
//
// The action identifiers "SYMPTOM_YES" and "SYMPTOM_NO" are
// handled directly in _layout.tsx (foreground/background) and
// backgroundNotificationTask.ts (killed app state).
///////////////////////////////////////////////////////////

// This file is kept for any future symptom-specific helper
// functions that do NOT involve notification listeners.
// Example: formatting symptom data, symptom DB helpers, etc.

export { };
