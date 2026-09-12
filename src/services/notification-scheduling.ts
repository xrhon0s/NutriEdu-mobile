export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined';

export const resolveNotificationPermission = (permission: unknown): NotificationPermissionState => {
  if (!permission || typeof permission !== 'object') return 'undetermined';
  const response = permission as { granted?: boolean; status?: string };
  if (response.granted === true || response.status === 'granted') return 'granted';
  return response.status === 'denied' ? 'denied' : 'undetermined';
};

export const parseReminderTime = (value: string) => {
  const [hour, minute] = value.split(':').map(Number);
  return { hour, minute };
};

export const isQuietTime = (time: string, start: string | null, end: string | null) => {
  if (!start || !end || start === end) return false;
  const toMinutes = (value: string) => {
    const { hour, minute } = parseReminderTime(value);
    return hour * 60 + minute;
  };
  const target = toMinutes(time);
  const quietStart = toMinutes(start);
  const quietEnd = toMinutes(end);
  return quietStart < quietEnd
    ? target >= quietStart && target < quietEnd
    : target >= quietStart || target < quietEnd;
};
