import { FormField } from '@/components/profile-controls';

export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <FormField label={label} value={value} placeholder="AAAA-MM-DD" onChangeText={onChange} />;
}
