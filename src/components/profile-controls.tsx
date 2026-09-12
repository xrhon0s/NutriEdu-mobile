import Ionicons from '@expo/vector-icons/Ionicons';
import { ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardTypeOptions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { theme } from '@/constants/nutriedu-theme';
import { useTranslation } from 'react-i18next';

export type Choice = { value: string; label: string };

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  unit,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  unit?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, multiline && styles.multilineShell]}>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[styles.input, multiline && styles.multilineInput]}
        />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

export function ChoiceField({
  label,
  value,
  choices,
  onChange,
  info,
}: {
  label: string;
  value: string;
  choices: Choice[];
  onChange: (value: string) => void;
  info?: string;
}) {
  const [showInfo, setShowInfo] = useState(false);
  const { t } = useTranslation();

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {info ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('profile.controls.infoAbout', { label })}
            onPress={() => setShowInfo((current) => !current)}
            hitSlop={8}
            style={styles.infoButton}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
          </Pressable>
        ) : null}
      </View>
      {showInfo && info ? <Text style={styles.infoText}>{info}</Text> : null}
      <View style={styles.choiceGroup}>
        {choices.map((choice) => {
          const selected = value === choice.value;
          return (
            <Pressable
              key={choice.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(choice.value)}
              style={({ pressed }) => [
                styles.choice,
                selected && styles.choiceSelected,
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{choice.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.searchShell}>
      <Ionicons name="search-outline" size={20} color={theme.colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={styles.searchInput}
      />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('profile.controls.clearSearch')} onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function SelectableRow({
  title,
  description,
  selected,
  detail,
  onPress,
}: {
  title: string;
  description?: string | null;
  selected: boolean;
  detail?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.selectable,
        selected && styles.selectableSelected,
        pressed && styles.pressed,
      ]}>
      <View style={styles.selectableText}>
        <View style={styles.selectableTitleRow}>
          <Text style={styles.selectableTitle}>{title}</Text>
          {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        </View>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={23}
        color={selected ? theme.colors.primary : theme.colors.textMuted}
      />
    </Pressable>
  );
}

export function SaveButton({ label, saving, onPress }: { label: string; saving: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={saving}
      onPress={onPress}
      style={({ pressed }) => [styles.saveButton, saving && styles.disabled, pressed && styles.pressed]}>
      {saving ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="save-outline" size={19} color="#FFFFFF" />}
      <Text style={styles.saveText}>{saving ? t('profile.controls.saving') : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: theme.spacing.md },
  sectionHeading: { gap: theme.spacing.xs },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  sectionDescription: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  sectionContent: { gap: theme.spacing.md },
  field: { gap: 7 },
  label: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  infoText: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.small, padding: 10 },
  inputShell: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.medium,
    backgroundColor: theme.colors.surface,
  },
  multilineShell: { minHeight: 104, alignItems: 'stretch' },
  input: { flex: 1, minHeight: 48, paddingHorizontal: 14, color: theme.colors.text, fontSize: 16 },
  multilineInput: { minHeight: 102, paddingTop: 13, paddingBottom: 13 },
  unit: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700', paddingRight: 14 },
  choiceGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  choice: {
    minHeight: 42,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.small,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  choiceSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.surfaceMuted },
  choiceText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '600' },
  choiceTextSelected: { color: theme.colors.primaryPressed },
  selectable: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.medium,
    backgroundColor: theme.colors.surface,
    padding: 14,
  },
  selectableSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.surfaceMuted },
  selectableText: { flex: 1, gap: 5 },
  selectableTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  selectableTitle: { flex: 1, color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  detail: { color: theme.colors.warning, fontSize: 11, fontWeight: '800' },
  description: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 },
  searchShell: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.medium,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 13,
  },
  searchInput: { flex: 1, minHeight: 46, color: theme.colors.text, fontSize: 15 },
  saveButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: theme.radius.medium,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 18,
  },
  saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.65 },
  pressed: { opacity: 0.78 },
});
