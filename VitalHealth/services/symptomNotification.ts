// services/symptomNotification.ts
// Fixed for Notifee + TypeScript compatibility

import {
  cancelSymptomNotification as notifeeCancel,
  scheduleSymptomCheck,
} from "./notifeeService";

///////////////////////////////////////////////////////////
// REGISTER (INFO ONLY)
///////////////////////////////////////////////////////////

export const registerSymptomNotificationActions = async () => {
  console.log("🩺 Symptom actions handled by Notifee");
};

///////////////////////////////////////////////////////////
// SCHEDULE SYMPTOM
///////////////////////////////////////////////////////////

export const scheduleSymptomNotification = async (
  id: number,
  name: string,
  _time: number
): Promise<string> => {
  console.log("🩺 Scheduling symptom:", name);

  // ✅ FIX: Only pass symptom name
  const notifId = await scheduleSymptomCheck(name);

  return notifId;
};

///////////////////////////////////////////////////////////
// CANCEL SYMPTOM
///////////////////////////////////////////////////////////

export const cancelSymptomNotification = async (): Promise<void> => {
  // ✅ FIX: no argument required
  await notifeeCancel();
};