import notifee, { EventType } from '@notifee/react-native';
import 'expo-router/entry';

////////////////////////////////////////////////////////////
// 🔥 BACKGROUND HANDLER
////////////////////////////////////////////////////////////

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS) {
    const action = detail.pressAction.id;

    console.log("🔥 Background Action:", action);
  }
});

////////////////////////////////////////////////////////////
// 🔥 FOREGROUND HANDLER (IMPORTANT)
////////////////////////////////////////////////////////////

notifee.onForegroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS) {
    const action = detail.pressAction.id;

    console.log("⚡ Foreground Action:", action);
  }
});