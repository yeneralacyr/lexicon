export type ReminderSyncResult = {
  identifier: string | null;
  permissionStatus: 'unsupported';
  scheduled: false;
};

export async function syncDailyReminderNotifications(): Promise<ReminderSyncResult> {
  return {
    identifier: null,
    permissionStatus: 'unsupported',
    scheduled: false,
  };
}

export async function enableDailyReminderNotifications(): Promise<ReminderSyncResult> {
  return {
    identifier: null,
    permissionStatus: 'unsupported',
    scheduled: false,
  };
}

export async function disableDailyReminderNotifications(): Promise<ReminderSyncResult> {
  return {
    identifier: null,
    permissionStatus: 'unsupported',
    scheduled: false,
  };
}
