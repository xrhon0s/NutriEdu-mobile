import { FormField } from '@/components/profile-controls';
import { useTranslation } from 'react-i18next';

export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation();
  return <FormField label={label} value={value} placeholder={t('profile.personal.birthDatePlaceholder')} onChangeText={onChange} />;
}
