import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import { getDatabase } from '@/db';

const DAILY_REMINDER_HOUR = 19;
const DAILY_REMINDER_MINUTE = 0;
const DAILY_REMINDER_CHANNEL_ID = 'daily-reminder';
const DAILY_REMINDER_META_KEY = 'daily_reminder_notification_id';
let notificationHandlerConfigured = false;

function getReminderConfig() {
  const notificationsConfig = (Constants.expoConfig?.extra?.notifications ??
    {}) as Partial<{
      dailyReminderHour: number;
      dailyReminderMinute: number;
    }>;

  return {
    dailyReminderHour: notificationsConfig.dailyReminderHour ?? DAILY_REMINDER_HOUR,
    dailyReminderMinute: notificationsConfig.dailyReminderMinute ?? DAILY_REMINDER_MINUTE,
  };
}

export function setupNotificationHandler() {
  if (Platform.OS === 'web' || notificationHandlerConfigured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  notificationHandlerConfigured = true;
}

export type ReminderSyncResult = {
  identifier: string | null;
  permissionStatus: Notifications.PermissionStatus | 'unsupported';
  scheduled: boolean;
};

async function getMetaValue(key: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', key);
  return row?.value ?? null;
}

async function setMetaValue(key: string, value: string | null) {
  const db = await getDatabase();

  if (value === null) {
    await db.runAsync('DELETE FROM app_meta WHERE key = ?', key);
    return;
  }

  await db.runAsync(
    `
      INSERT INTO app_meta (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    key,
    value
  );
}

async function ensureReminderChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(DAILY_REMINDER_CHANNEL_ID, {
    name: 'Günlük hatırlatmalar',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 180, 250],
    lightColor: '#FFFFFF',
  });
}

async function cancelStoredReminder() {
  const existingIdentifier = await getMetaValue(DAILY_REMINDER_META_KEY);

  if (existingIdentifier) {
    await Notifications.cancelScheduledNotificationAsync(existingIdentifier).catch(() => undefined);
  }

  await setMetaValue(DAILY_REMINDER_META_KEY, null);
}

export async function syncDailyReminderNotifications(options: {
  enabled: boolean;
  requestPermissions?: boolean;
}): Promise<ReminderSyncResult> {
  if (Platform.OS === 'web') {
    return {
      identifier: null,
      permissionStatus: 'unsupported',
      scheduled: false,
    };
  }

  await ensureReminderChannel();

  if (!options.enabled) {
    await cancelStoredReminder();

    const permissions = await Notifications.getPermissionsAsync();
    return {
      identifier: null,
      permissionStatus: permissions.status,
      scheduled: false,
    };
  }

  let permissions = await Notifications.getPermissionsAsync();

  if (permissions.status !== 'granted' && options.requestPermissions) {
    permissions = await Notifications.requestPermissionsAsync();
  }

  if (permissions.status !== 'granted') {
    await cancelStoredReminder();

    return {
      identifier: null,
      permissionStatus: permissions.status,
      scheduled: false,
    };
  }

  await cancelStoredReminder();

  const reminderConfig = getReminderConfig();

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Lexicon seni bekliyor',
      body: 'Bugünkü tekrarlarını yap ve 7 yeni kelime hakkını boş bırakma.',
      sound: 'default',
      data: {
        source: 'daily-reminder',
        url: '/today',
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      channelId: Platform.OS === 'android' ? DAILY_REMINDER_CHANNEL_ID : undefined,
      hour: reminderConfig.dailyReminderHour,
      minute: reminderConfig.dailyReminderMinute,
    },
  });

  await setMetaValue(DAILY_REMINDER_META_KEY, identifier);

  return {
    identifier,
    permissionStatus: permissions.status,
    scheduled: true,
  };
}

export async function enableDailyReminderNotifications() {
  return syncDailyReminderNotifications({
    enabled: true,
    requestPermissions: true,
  });
}

export async function disableDailyReminderNotifications() {
  return syncDailyReminderNotifications({
    enabled: false,
  });
}
