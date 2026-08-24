import { Platform } from 'react-native';
import type { NotificationResponse } from 'expo-notifications';
import { NotificationPreferences } from '@/types/api';

const CHANNEL_ID = 'nutriedu-reminders';
const LOCAL_REMINDER_SOURCE = 'nutriedu-local-reminder';

type ReminderDestination = '/plan' | '/shopping';
type ReminderLanguage = 'es' | 'en';

export type LocalReminderSyncResult = {
  status: 'scheduled' | 'permission-denied' | 'unsupported';
  scheduledCount: number;
  skippedQuietHours: number;
};

type ReminderDefinition = {
  id: string;
  title: string;
  body: string;
  destination: ReminderDestination;
  time: string;
  weekday?: number;
};

const reminderCopy = {
  es: {
    breakfast: ['Hora de tu desayuno', 'Consulta tu plan antes de comenzar.'],
    lunch: ['Hora de tu almuerzo', 'Consulta tu plan antes de comenzar.'],
    dinner: ['Hora de tu cena', 'Consulta tu plan antes de comenzar.'],
    weeklyPlan: ['Prepara tu plan semanal', 'Organiza tus comidas para los proximos dias.'],
    shopping: ['Revisa tu lista de compras', 'Comprueba lo que necesitas para tu plan.'],
  },
  en: {
    breakfast: ['Breakfast time', 'Check your plan before getting started.'],
    lunch: ['Lunch time', 'Check your plan before getting started.'],
    dinner: ['Dinner time', 'Check your plan before getting started.'],
    weeklyPlan: ['Prepare your weekly plan', 'Organize your meals for the days ahead.'],
    shopping: ['Review your shopping list', 'Check what you need for your plan.'],
  },
} as const;

export const configureLocalNotificationHandling = async (
  onDestination: (destination: ReminderDestination) => void,
) => {
  if (Platform.OS === 'web') return () => undefined;
  const Notifications = await import('expo-notifications');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  const openDestination = (response: NotificationResponse | null) => {
    const destination = response?.notification.request.content.data?.destination;
    if (destination === '/plan' || destination === '/shopping') {
      onDestination(destination);
      Notifications.clearLastNotificationResponse();
    }
  };

  try {
    openDestination(Notifications.getLastNotificationResponse());
  } catch {
    // The native module can still be initializing during a cold start.
  }

  const subscription = Notifications.addNotificationResponseReceivedListener(openDestination);
  return () => subscription.remove();
};

export const synchronizeLocalReminders = async (
  preferences: NotificationPreferences,
  language: string | undefined,
): Promise<LocalReminderSyncResult> => {
  if (Platform.OS === 'web') {
    return { status: 'unsupported', scheduledCount: 0, skippedQuietHours: 0 };
  }
  const Notifications = await import('expo-notifications');

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const owned = scheduled.filter(
    ({ content }) => content.data?.source === LOCAL_REMINDER_SOURCE,
  );
  await Promise.all(
    owned.map(({ identifier }) => Notifications.cancelScheduledNotificationAsync(identifier)),
  );

  const definitions = buildReminderDefinitions(preferences, language === 'en' ? 'en' : 'es');
  if (!definitions.length) {
    return { status: 'scheduled', scheduledCount: 0, skippedQuietHours: 0 };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Recordatorios NutriEdu',
      description: 'Recordatorios de comidas, plan semanal y compras.',
      importance: Notifications.AndroidImportance.DEFAULT,
      enableVibrate: true,
      vibrationPattern: [0, 250, 150, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      showBadge: false,
      sound: null,
    });
  }

  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    permission = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: false },
    });
  }
  if (!permission.granted) {
    return { status: 'permission-denied', scheduledCount: 0, skippedQuietHours: 0 };
  }

  let scheduledCount = 0;
  let skippedQuietHours = 0;
  for (const reminder of definitions) {
    if (isQuietTime(reminder.time, preferences.quietStart, preferences.quietEnd)) {
      skippedQuietHours += 1;
      continue;
    }

    const { hour, minute } = parseTime(reminder.time);
    const trigger = reminder.weekday === undefined
      ? {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          channelId: CHANNEL_ID,
          hour,
          minute,
        }
      : {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          channelId: CHANNEL_ID,
          weekday: reminder.weekday + 1,
          hour,
          minute,
        };

    await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.body,
        data: {
          source: LOCAL_REMINDER_SOURCE,
          reminderId: reminder.id,
          destination: reminder.destination,
        },
      },
      trigger,
    });
    scheduledCount += 1;
  }

  return { status: 'scheduled', scheduledCount, skippedQuietHours };
};

const buildReminderDefinitions = (
  preferences: NotificationPreferences,
  language: ReminderLanguage,
): ReminderDefinition[] => {
  const copy = reminderCopy[language];
  const reminders: ReminderDefinition[] = [];

  if (preferences.mealReminders) {
    (['breakfast', 'lunch', 'dinner'] as const).forEach((meal) => {
      reminders.push({
        id: `meal-${meal}`,
        title: copy[meal][0],
        body: copy[meal][1],
        destination: '/plan',
        time: preferences.mealReminderTimes[meal],
      });
    });
  }
  if (preferences.weeklyPlan) {
    reminders.push({
      id: 'weekly-plan',
      title: copy.weeklyPlan[0],
      body: copy.weeklyPlan[1],
      destination: '/plan',
      time: preferences.weeklyPlanReminderTime,
      weekday: preferences.weeklyPlanReminderDay,
    });
  }
  if (preferences.shopping) {
    reminders.push({
      id: 'shopping',
      title: copy.shopping[0],
      body: copy.shopping[1],
      destination: '/shopping',
      time: preferences.shoppingReminderTime,
      weekday: preferences.shoppingReminderDay,
    });
  }

  return reminders;
};

const parseTime = (value: string) => {
  const [hour, minute] = value.split(':').map(Number);
  return { hour, minute };
};

export const isQuietTime = (time: string, start: string | null, end: string | null) => {
  if (!start || !end || start === end) return false;
  const toMinutes = (value: string) => {
    const { hour, minute } = parseTime(value);
    return hour * 60 + minute;
  };
  const target = toMinutes(time);
  const quietStart = toMinutes(start);
  const quietEnd = toMinutes(end);
  return quietStart < quietEnd
    ? target >= quietStart && target < quietEnd
    : target >= quietStart || target < quietEnd;
};
