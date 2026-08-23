import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/nutriedu-theme';

const minimumDate = new Date(1900, 0, 1);

const parseDate = (value: string) => {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(1990, 0, 1);
  return Number.isNaN(parsed.getTime()) ? new Date(1990, 0, 1) : parsed;
};

const serializeDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseDate(value);

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'set' && date) onChange(serializeDate(date));
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Seleccionar fecha de nacimiento"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}>
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value ? selectedDate.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Seleccionar fecha'}
        </Text>
        <Ionicons name="calendar-outline" size={21} color={theme.colors.primary} />
      </Pressable>

      {open ? (
        <View style={styles.pickerArea}>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
            minimumDate={minimumDate}
            maximumDate={new Date()}
            accentColor={theme.colors.primary}
            onChange={handleChange}
          />
          {Platform.OS === 'ios' ? (
            <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.doneButton}>
              <Text style={styles.doneText}>Listo</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  trigger: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.medium,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
  },
  value: { flex: 1, color: theme.colors.text, fontSize: 16 },
  placeholder: { color: theme.colors.textMuted },
  pickerArea: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, overflow: 'hidden' },
  doneButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: theme.colors.border },
  doneText: { color: theme.colors.primaryPressed, fontWeight: '800' },
  pressed: { opacity: 0.78 },
});
