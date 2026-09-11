import { useCallback, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { theme } from '@/constants/nutriedu-theme';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import { scheduleLocalNotificationTest, synchronizeLocalReminders } from '@/services/local-notifications';
import { InAppNotification, NotificationListResponse, NotificationPreferences } from '@/types/api';

type ViewMode = 'inbox' | 'preferences';
type PreferenceKey = 'mealReminders' | 'weeklyPlan' | 'shopping' | 'progress' | 'security';

const preferenceKeys: PreferenceKey[] = ['mealReminders', 'weeklyPlan', 'shopping', 'progress', 'security'];
const preferenceIcons: Record<PreferenceKey, React.ComponentProps<typeof Ionicons>['name']> = {
  mealReminders: 'restaurant-outline',
  weeklyPlan: 'calendar-outline',
  shopping: 'cart-outline',
  progress: 'trending-up-outline',
  security: 'shield-checkmark-outline',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<ViewMode>('inbox');
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingNotification, setTestingNotification] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const loadInbox = useCallback(async (cursor?: number) => {
    const response = await apiRequest<NotificationListResponse>(
      `/notifications${cursor ? `?cursor=${cursor}` : ''}`,
      { token },
    );
    setItems((current) => cursor ? mergeNotifications(current, response.items) : response.items);
    setUnreadCount(response.unreadCount);
    setNextCursor(response.nextCursor);
  }, [token]);

  const refresh = useCallback(async () => {
    try {
      setError('');
      setStatus('');
      const [, preferenceResult] = await Promise.all([
        loadInbox(),
        apiRequest<NotificationPreferences>('/notifications/preferences', { token }),
      ]);
      setPreferences(preferenceResult);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('notifications.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadInbox, t, token]);

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    try {
      setLoadingMore(true);
      setError('');
      await loadInbox(nextCursor);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('notifications.loadError'));
    } finally {
      setLoadingMore(false);
    }
  };

  const markRead = async (notification: InAppNotification) => {
    if (!notification.readAt) {
      const response = await apiRequest<{ id: number; readAt: string }>(`/notifications/${notification.id}/read`, { method: 'PATCH', token });
      setItems((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: response.readAt } : item));
      setUnreadCount((current) => Math.max(0, current - 1));
    }
  };

  const openNotification = async (notification: InAppNotification) => {
    try {
      setError('');
      await markRead(notification);
      navigateToDestination(notification.destination, router);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('notifications.loadError'));
    }
  };

  const markAllRead = async () => {
    try {
      setError('');
      await apiRequest('/notifications/read-all', { method: 'POST', token });
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || readAt })));
      setUnreadCount(0);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('notifications.loadError'));
    }
  };

  const updatePreference = <Key extends keyof NotificationPreferences>(key: Key, value: NotificationPreferences[Key]) => {
    setPreferences((current) => current ? { ...current, [key]: value } : current);
    setStatus('');
  };

  const savePreferences = async () => {
    if (!preferences || !validPreferences(preferences)) {
      setError(t('notifications.invalidSettings'));
      return;
    }
    try {
      setSaving(true);
      setError('');
      setStatus('');
      const result = await apiRequest<NotificationPreferences>('/notifications/preferences', {
        method: 'PUT',
        token,
        body: JSON.stringify(preferences),
      });
      setPreferences(result);
      try {
        const reminderResult = await synchronizeLocalReminders(result, i18n.resolvedLanguage);
        if (reminderResult.status === 'permission-denied') {
          setStatus(t('notifications.savedPermissionDenied'));
        } else if (reminderResult.status === 'unsupported') {
          setStatus(t('notifications.savedWeb'));
        } else if (reminderResult.skippedQuietHours) {
          setStatus(t('notifications.savedWithSkipped', {
            count: reminderResult.scheduledCount,
            skipped: reminderResult.skippedQuietHours,
          }));
        } else {
          setStatus(t('notifications.savedWithReminders', { count: reminderResult.scheduledCount }));
        }
      } catch {
        setStatus(t('notifications.savedSchedulingError'));
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('notifications.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const testNotification = async () => {
    try {
      setTestingNotification(true);
      setError('');
      setStatus('');
      const result = await scheduleLocalNotificationTest(i18n.resolvedLanguage);
      if (result.status === 'permission-denied') {
        setStatus(t('notifications.testPermissionDenied'));
      } else if (result.status === 'unsupported') {
        setStatus(t('notifications.testUnsupported'));
      } else {
        setStatus(t('notifications.testScheduled', { count: result.scheduledCount }));
      }
    } catch (testError) {
      const message = testError instanceof Error ? testError.message : t('notifications.testUnknownError');
      setError(t('notifications.testError', { message }));
    } finally {
      setTestingNotification(false);
    }
  };

  if (loading) return <LoadingState label={t('notifications.loading')} />;
  if (error && !preferences) return <ErrorState message={error} onRetry={() => { setLoading(true); void refresh(); }} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboardArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void refresh(); }} tintColor={theme.colors.primary} />}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>{t('notifications.eyebrow')}</Text>
              <Text style={styles.title}>{t('notifications.title')}</Text>
            </View>
          </View>

          <View accessibilityRole="tablist" style={styles.tabs}>
            {(['inbox', 'preferences'] as ViewMode[]).map((view) => {
              const selected = mode === view;
              return (
                <Pressable key={view} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => setMode(view)} style={[styles.tab, selected && styles.selectedTab]}>
                  <Text style={[styles.tabText, selected && styles.selectedTabText]}>{t(`notifications.${view}`)}</Text>
                </Pressable>
              );
            })}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {status ? <Text style={styles.success}>{status}</Text> : null}

          {mode === 'inbox' ? (
            <View style={styles.section}>
              <View style={styles.inboxHeader}>
                <Text style={styles.unread}>{t('notifications.unread', { count: unreadCount })}</Text>
                {unreadCount ? (
                  <Pressable accessibilityRole="button" onPress={markAllRead} hitSlop={8}>
                    <Text style={styles.textAction}>{t('notifications.markAll')}</Text>
                  </Pressable>
                ) : null}
              </View>

              {items.length ? items.map((notification) => {
                const copy = notificationCopy(notification, t);
                return (
                  <Pressable
                    key={notification.id}
                    accessibilityRole="button"
                    onPress={() => openNotification(notification)}
                    style={({ pressed }) => [styles.notification, !notification.readAt && styles.unreadNotification, pressed && styles.pressed]}>
                    <View style={[styles.categoryIcon, { backgroundColor: categoryColor(notification.category).background }]}>
                      <Ionicons name={categoryColor(notification.category).icon} size={20} color={categoryColor(notification.category).foreground} />
                    </View>
                    <View style={styles.notificationText}>
                      <View style={styles.notificationTitleRow}>
                        <Text style={styles.notificationTitle}>{copy.title}</Text>
                        {!notification.readAt ? <View style={styles.unreadDot} /> : null}
                      </View>
                      <Text style={styles.notificationBody}>{copy.body}</Text>
                      <Text style={styles.date}>{formatDate(notification.createdAt, i18n.resolvedLanguage)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                  </Pressable>
                );
              }) : (
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-circle-outline" size={36} color={theme.colors.primary} />
                  <Text style={styles.emptyTitle}>{t('notifications.emptyTitle')}</Text>
                  <Text style={styles.emptyText}>{t('notifications.emptyText')}</Text>
                </View>
              )}

              {nextCursor ? (
                <Pressable accessibilityRole="button" disabled={loadingMore} onPress={loadMore} style={({ pressed }) => [styles.loadMoreButton, pressed && styles.pressed]}>
                  {loadingMore ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
                  <Text style={styles.loadMoreText}>{loadingMore ? t('notifications.loadingMore') : t('notifications.loadMore')}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : preferences ? (
            <View style={styles.section}>
              <Text style={styles.description}>{t('notifications.settingsDescription')}</Text>
              <View style={styles.field}>
                <Text style={styles.sectionTitle}>{t('notifications.timezone')}</Text>
                <Text style={styles.fieldDescription}>{t('notifications.timezoneDescription')}</Text>
                <TimezoneSelect value={preferences.timezone} onChange={(value) => updatePreference('timezone', value)} />
              </View>
              <Text style={styles.sectionTitle}>{t('notifications.quietHours')}</Text>
              <Text style={styles.fieldDescription}>{t('notifications.quietHoursDescription')}</Text>
              <View style={styles.quietRow}>
                <View style={styles.quietField}>
                  <Text style={styles.label}>{t('notifications.quietStart')}</Text>
                  <TextInput accessibilityLabel={t('notifications.quietStart')} value={preferences.quietStart || ''} maxLength={5} placeholder={t('notifications.optional')} onChangeText={(value) => updatePreference('quietStart', value || null)} style={styles.input} />
                </View>
                <View style={styles.quietField}>
                  <Text style={styles.label}>{t('notifications.quietEnd')}</Text>
                  <TextInput accessibilityLabel={t('notifications.quietEnd')} value={preferences.quietEnd || ''} maxLength={5} placeholder={t('notifications.optional')} onChangeText={(value) => updatePreference('quietEnd', value || null)} style={styles.input} />
                </View>
              </View>
              <Text style={styles.sectionTitle}>{t('notifications.categoryTitle')}</Text>
              <View style={styles.preferenceList}>
                {preferenceKeys.map((key) => (
                  <View key={key} style={styles.preferenceRow}>
                    <View style={styles.preferenceIcon}>
                      <Ionicons name={preferenceIcons[key]} size={20} color={theme.colors.primary} />
                    </View>
                    <View style={styles.preferenceText}>
                      <Text style={styles.preferenceLabel}>{t(`notifications.categories.${key}`)}</Text>
                      <Text style={styles.preferenceDescription}>{t(`notifications.categories.${key}Description`)}</Text>
                    </View>
                    <View style={styles.switchColumn}>
                      <Switch accessibilityLabel={t(`notifications.categories.${key}`)} value={preferences[key]} onValueChange={(value) => updatePreference(key, value)} trackColor={{ false: theme.colors.border, true: '#8ED8AE' }} thumbColor={preferences[key] ? theme.colors.primary : '#FFFFFF'} />
                    </View>
                  </View>
                ))}
              </View>
              <Text style={styles.sectionTitle}>{t('notifications.scheduleTitle')}</Text>
              <Text style={styles.fieldDescription}>{t('notifications.scheduleDescription')}</Text>
              <View style={styles.scheduleList}>
                {preferences.mealReminders ? (
                  <View style={styles.scheduleGroup}>
                    <View style={styles.scheduleHeading}>
                      <Ionicons name="restaurant-outline" size={19} color={theme.colors.primary} />
                      <Text style={styles.preferenceLabel}>{t('notifications.mealSchedule')}</Text>
                    </View>
                    <View style={styles.mealTimes}>
                      {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => (
                        <View key={meal} style={styles.mealTime}>
                          <Text style={styles.timeLabel}>{t(`notifications.${meal}`)}</Text>
                          <TimeSelect
                            value={preferences.mealReminderTimes[meal]}
                            onChange={(value) => updatePreference('mealReminderTimes', { ...preferences.mealReminderTimes, [meal]: value })}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
                {preferences.weeklyPlan ? (
                  <WeeklySchedule
                    icon="calendar-outline"
                    title={t('notifications.weeklyPlanSchedule')}
                    day={preferences.weeklyPlanReminderDay}
                    time={preferences.weeklyPlanReminderTime}
                    onDayChange={(value) => updatePreference('weeklyPlanReminderDay', value)}
                    onTimeChange={(value) => updatePreference('weeklyPlanReminderTime', value)}
                  />
                ) : null}
                {preferences.shopping ? (
                  <WeeklySchedule
                    icon="cart-outline"
                    title={t('notifications.shoppingSchedule')}
                    day={preferences.shoppingReminderDay}
                    time={preferences.shoppingReminderTime}
                    onDayChange={(value) => updatePreference('shoppingReminderDay', value)}
                    onTimeChange={(value) => updatePreference('shoppingReminderTime', value)}
                  />
                ) : null}
              </View>
              <Pressable accessibilityRole="button" disabled={saving} onPress={savePreferences} style={({ pressed }) => [styles.saveButton, saving && styles.disabled, pressed && styles.pressed]}>
                <Ionicons name="save-outline" size={19} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>{saving ? t('notifications.saving') : t('notifications.saveAndSchedule')}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={testingNotification} onPress={testNotification} style={({ pressed }) => [styles.testButton, testingNotification && styles.disabled, pressed && styles.pressed]}>
                {testingNotification
                  ? <ActivityIndicator size="small" color={theme.colors.primary} />
                  : <Ionicons name="notifications-outline" size={19} color={theme.colors.primary} />}
                <Text style={styles.testButtonText}>{testingNotification ? t('notifications.testing') : t('notifications.testNow')}</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function WeeklySchedule({ icon, title, day, time, onDayChange, onTimeChange }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  day: number;
  time: string;
  onDayChange: (value: number) => void;
  onTimeChange: (value: string) => void;
}) {
  return (
    <View style={styles.scheduleGroup}>
      <View style={styles.scheduleHeading}>
        <Ionicons name={icon} size={19} color={theme.colors.primary} />
        <Text style={styles.preferenceLabel}>{title}</Text>
      </View>
      <WeekdaySelect value={day} onChange={onDayChange} />
      <View style={styles.singleTime}><TimeSelect value={time} onChange={onTimeChange} /></View>
    </View>
  );
}

function WeekdaySelect({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const { t } = useTranslation();
  const labels = [
    t('notifications.weekdays.sundayShort'), t('notifications.weekdays.mondayShort'),
    t('notifications.weekdays.tuesdayShort'), t('notifications.weekdays.wednesdayShort'),
    t('notifications.weekdays.thursdayShort'), t('notifications.weekdays.fridayShort'),
    t('notifications.weekdays.saturdayShort'),
  ];
  return (
    <View accessibilityRole="radiogroup" style={styles.weekdays}>
      {labels.map((label, index) => (
        <Pressable
          key={index}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === index }}
          onPress={() => onChange(index)}
          style={({ pressed }) => [styles.weekday, value === index && styles.selectedWeekday, pressed && styles.pressed]}>
          <Text style={[styles.weekdayText, value === index && styles.selectedWeekdayText]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2).toString().padStart(2, '0');
  return `${hour}:${index % 2 ? '30' : '00'}`;
});

function TimeSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(true)} style={({ pressed }) => [styles.timeButton, pressed && styles.pressed]}>
        <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
        <Text style={styles.timeValue}>{value}</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.timeModal} edges={['bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('notifications.selectTime')}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t('notifications.closeTime')} onPress={() => setOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={23} color={theme.colors.text} />
              </Pressable>
            </View>
            <FlatList
              data={timeOptions}
              keyExtractor={(item) => item}
              numColumns={3}
              contentContainerStyle={styles.timeOptions}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: item === value }}
                  onPress={() => { onChange(item); setOpen(false); }}
                  style={({ pressed }) => [styles.timeOption, item === value && styles.selectedTime, pressed && styles.pressed]}>
                  <Text style={[styles.timeOptionText, item === value && styles.selectedTimeText]}>{item}</Text>
                </Pressable>
              )}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

type TimezoneOption = { value: string; label: string; offset: string };

const timezoneOptions: TimezoneOption[] = [
  { value: 'America/Bogota', label: 'Bogota, Colombia', offset: 'UTC-5' },
  { value: 'America/Lima', label: 'Lima, Peru', offset: 'UTC-5' },
  { value: 'America/Guayaquil', label: 'Quito, Ecuador', offset: 'UTC-5' },
  { value: 'America/Panama', label: 'Panama', offset: 'UTC-5' },
  { value: 'America/Caracas', label: 'Caracas, Venezuela', offset: 'UTC-4' },
  { value: 'America/Santo_Domingo', label: 'Santo Domingo', offset: 'UTC-4' },
  { value: 'America/Santiago', label: 'Santiago, Chile', offset: 'UTC-4 / UTC-3' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires, Argentina', offset: 'UTC-3' },
  { value: 'America/Montevideo', label: 'Montevideo, Uruguay', offset: 'UTC-3' },
  { value: 'America/Sao_Paulo', label: 'Sao Paulo, Brasil', offset: 'UTC-3' },
  { value: 'America/Mexico_City', label: 'Ciudad de Mexico', offset: 'UTC-6' },
  { value: 'America/Guatemala', label: 'Guatemala', offset: 'UTC-6' },
  { value: 'America/Costa_Rica', label: 'San Jose, Costa Rica', offset: 'UTC-6' },
  { value: 'America/Havana', label: 'La Habana, Cuba', offset: 'UTC-5 / UTC-4' },
  { value: 'America/New_York', label: 'Nueva York, EE. UU.', offset: 'UTC-5 / UTC-4' },
  { value: 'America/Chicago', label: 'Chicago, EE. UU.', offset: 'UTC-6 / UTC-5' },
  { value: 'America/Denver', label: 'Denver, EE. UU.', offset: 'UTC-7 / UTC-6' },
  { value: 'America/Los_Angeles', label: 'Los Angeles, EE. UU.', offset: 'UTC-8 / UTC-7' },
  { value: 'America/Toronto', label: 'Toronto, Canada', offset: 'UTC-5 / UTC-4' },
  { value: 'Europe/Madrid', label: 'Madrid, Espana', offset: 'UTC+1 / UTC+2' },
  { value: 'UTC', label: 'Tiempo universal', offset: 'UTC' },
];

function TimezoneSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = timezoneOptions.find((option) => option.value === value) || { value, label: value, offset: '' };
  const normalizedQuery = normalizeSearch(query);
  const options = timezoneOptions.filter((option) => normalizeSearch(`${option.label} ${option.value} ${option.offset}`).includes(normalizedQuery));

  const select = (option: TimezoneOption) => {
    onChange(option.value);
    setQuery('');
    setOpen(false);
  };

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(true)} style={({ pressed }) => [styles.timezoneButton, pressed && styles.pressed]}>
        <Ionicons name="globe-outline" size={21} color={theme.colors.primary} />
        <View style={styles.timezoneText}>
          <Text style={styles.timezoneLabel}>{selected.label}</Text>
          <Text style={styles.timezoneValue}>{[selected.value, selected.offset].filter(Boolean).join(' · ')}</Text>
        </View>
        <Ionicons name="chevron-down" size={19} color={theme.colors.textMuted} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.timezoneModal} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>{t('notifications.preferences')}</Text>
                <Text style={styles.modalTitle}>{t('notifications.timezone')}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={t('notifications.timezoneClose')} onPress={() => setOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={23} color={theme.colors.text} />
              </Pressable>
            </View>
            <View style={styles.timezoneSearch}>
              <Ionicons name="search-outline" size={19} color={theme.colors.textMuted} />
              <TextInput autoFocus value={query} onChangeText={setQuery} placeholder={t('notifications.timezoneSearch')} placeholderTextColor={theme.colors.textMuted} style={styles.timezoneSearchInput} />
            </View>
            <FlatList
              data={options}
              keyExtractor={(option) => option.value}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.timezoneList}
              ListEmptyComponent={<Text style={styles.timezoneEmpty}>{t('notifications.timezoneEmpty')}</Text>}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable accessibilityRole="radio" accessibilityState={{ checked: isSelected }} onPress={() => select(item)} style={({ pressed }) => [styles.timezoneOption, isSelected && styles.selectedTimezone, pressed && styles.pressed]}>
                    <View style={styles.timezoneText}>
                      <Text style={[styles.timezoneLabel, isSelected && styles.selectedTimezoneText]}>{item.label}</Text>
                      <Text style={styles.timezoneValue}>{item.value} · {item.offset}</Text>
                    </View>
                    {isSelected ? <Ionicons name="checkmark-circle" size={21} color={theme.colors.primary} /> : null}
                  </Pressable>
                );
              }}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const mergeNotifications = (current: InAppNotification[], incoming: InAppNotification[]) => {
  const byId = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values()).sort((left, right) => right.id - left.id);
};

const validPreferences = (preferences: NotificationPreferences) => {
  const validTime = (value: string | null) => !value || /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  const scheduleTimes = [
    ...Object.values(preferences.mealReminderTimes),
    preferences.weeklyPlanReminderTime,
    preferences.shoppingReminderTime,
  ];
  return Boolean(preferences.timezone.trim())
    && validTime(preferences.quietStart)
    && validTime(preferences.quietEnd)
    && scheduleTimes.every((value) => validTime(value))
    && [preferences.weeklyPlanReminderDay, preferences.shoppingReminderDay]
      .every((day) => Number.isInteger(day) && day >= 0 && day <= 6);
};

const notificationCopy = (notification: InAppNotification, t: (key: string) => string) => {
  const knownEvents: Record<string, { title: string; body: string }> = {
    welcome: { title: t('notifications.events.welcomeTitle'), body: t('notifications.events.welcomeBody') },
    inbox_ready: { title: t('notifications.events.inboxReadyTitle'), body: t('notifications.events.inboxReadyBody') },
    weekly_plan_updated: { title: t('notifications.events.weeklyPlanTitle'), body: t('notifications.events.weeklyPlanBody') },
  };
  return knownEvents[notification.eventType] || { title: notification.title, body: notification.body };
};

const categoryColor = (category: InAppNotification['category']): { icon: React.ComponentProps<typeof Ionicons>['name']; foreground: string; background: string } => {
  if (category === 'security') return { icon: 'shield-checkmark-outline', foreground: theme.colors.primaryPressed, background: theme.colors.surfaceMuted };
  if (category === 'weekly_plan') return { icon: 'calendar-outline', foreground: theme.colors.warning, background: theme.colors.warningSurface };
  if (category === 'shopping') return { icon: 'cart-outline', foreground: '#2864A5', background: '#E8F2FC' };
  if (category === 'progress') return { icon: 'trending-up-outline', foreground: '#7A4C9B', background: '#F2EAF7' };
  return { icon: 'restaurant-outline', foreground: '#A34D2B', background: '#FCEDE7' };
};

const navigateToDestination = (destination: string | null, router: ReturnType<typeof useRouter>) => {
  if (destination === '/plan') router.push('/plan');
  else if (destination === '/shopping') router.push('/shopping');
  else if (destination === '/privacy-center') router.push('/privacy-center');
  else if (destination === '/profile') router.push('/profile');
};

const formatDate = (value: string, language: string | undefined) => new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  keyboardArea: { flex: 1 },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, minWidth: 0 },
  eyebrow: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  title: { color: theme.colors.text, fontSize: 25, fontWeight: '800', marginTop: 3 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  selectedTab: { borderBottomColor: theme.colors.primary },
  tabText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '700' },
  selectedTabText: { color: theme.colors.primaryPressed },
  error: { color: theme.colors.danger, backgroundColor: theme.colors.dangerSurface, borderRadius: theme.radius.small, padding: 12 },
  success: { color: theme.colors.primaryPressed, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.small, padding: 12 },
  section: { gap: 14 },
  inboxHeader: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  unread: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  textAction: { color: theme.colors.primary, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  notification: { minHeight: 88, flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, padding: 13 },
  unreadNotification: { borderLeftWidth: 3, borderLeftColor: theme.colors.primary },
  categoryIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.medium },
  notificationText: { flex: 1, minWidth: 0 },
  notificationTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notificationTitle: { flex: 1, color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.primary },
  notificationBody: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  date: { color: theme.colors.textMuted, fontSize: 11, marginTop: 7 },
  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 42 },
  emptyTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800' },
  emptyText: { maxWidth: 300, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 19 },
  loadMoreButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: theme.radius.medium },
  loadMoreText: { color: theme.colors.primary, fontWeight: '800' },
  description: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  field: { gap: 7 },
  fieldDescription: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: -3 },
  label: { color: theme.colors.text, fontSize: 12, fontWeight: '800' },
  input: { minHeight: 48, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.small, backgroundColor: theme.colors.surface, color: theme.colors.text, paddingHorizontal: 12, fontSize: 14 },
  sectionTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  quietRow: { flexDirection: 'row', gap: 10 },
  quietField: { flex: 1, gap: 7 },
  preferenceList: { borderTopWidth: 1, borderTopColor: theme.colors.border },
  preferenceRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingVertical: 10 },
  preferenceIcon: { width: 38, height: 38, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.small, backgroundColor: theme.colors.surfaceMuted },
  preferenceText: { flex: 1, minWidth: 0 },
  preferenceLabel: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  preferenceDescription: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 16, marginTop: 3 },
  switchColumn: { width: 52, flexShrink: 0, alignItems: 'flex-end', justifyContent: 'center' },
  scheduleList: { borderTopWidth: 1, borderTopColor: theme.colors.border },
  scheduleGroup: { gap: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingVertical: 14 },
  scheduleHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  mealTimes: { flexDirection: 'row', gap: 8 },
  mealTime: { flex: 1, minWidth: 0, gap: 6 },
  timeLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700' },
  singleTime: { width: 116 },
  weekdays: { flexDirection: 'row', gap: 4 },
  weekday: { flex: 1, minWidth: 0, height: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.small, backgroundColor: theme.colors.surface },
  selectedWeekday: { borderColor: theme.colors.primary, backgroundColor: theme.colors.surfaceMuted },
  weekdayText: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '800' },
  selectedWeekdayText: { color: theme.colors.primaryPressed },
  timeButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.small, backgroundColor: theme.colors.surface, paddingHorizontal: 7 },
  timeValue: { color: theme.colors.text, fontSize: 13, fontWeight: '800' },
  timeModal: { height: '66%', backgroundColor: theme.colors.background, borderTopLeftRadius: theme.radius.medium, borderTopRightRadius: theme.radius.medium },
  timeOptions: { paddingHorizontal: theme.spacing.lg, paddingBottom: 24 },
  timeOption: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', margin: 3, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.small, backgroundColor: theme.colors.surface },
  selectedTime: { borderColor: theme.colors.primary, backgroundColor: theme.colors.surfaceMuted },
  timeOptionText: { color: theme.colors.text, fontSize: 13, fontWeight: '700' },
  selectedTimeText: { color: theme.colors.primaryPressed },
  timezoneButton: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.small, backgroundColor: theme.colors.surface, paddingHorizontal: 12, paddingVertical: 8 },
  timezoneText: { flex: 1, minWidth: 0 },
  timezoneLabel: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  timezoneValue: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 15, marginTop: 3 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(21, 35, 27, 0.38)' },
  timezoneModal: { height: '84%', backgroundColor: theme.colors.background, borderTopLeftRadius: theme.radius.medium, borderTopRightRadius: theme.radius.medium, paddingTop: 6 },
  modalHeader: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: theme.spacing.lg },
  modalEyebrow: { color: theme.colors.primary, fontSize: 10, fontWeight: '800' },
  modalTitle: { color: theme.colors.text, fontSize: 21, fontWeight: '800', marginTop: 2 },
  closeButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  timezoneSearch: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.small, backgroundColor: theme.colors.surface, marginHorizontal: theme.spacing.lg, paddingHorizontal: 12 },
  timezoneSearchInput: { flex: 1, minWidth: 0, color: theme.colors.text, fontSize: 14, paddingVertical: 10 },
  timezoneList: { paddingHorizontal: theme.spacing.lg, paddingTop: 10, paddingBottom: 24 },
  timezoneOption: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingHorizontal: 10, paddingVertical: 9 },
  selectedTimezone: { backgroundColor: theme.colors.surfaceMuted },
  selectedTimezoneText: { color: theme.colors.primaryPressed },
  timezoneEmpty: { color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 36 },
  saveButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: theme.radius.medium, backgroundColor: theme.colors.primary },
  saveButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  testButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface },
  testButtonText: { color: theme.colors.primary, fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.76 },
});
