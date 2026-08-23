import { useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  emptyRecipeFilters,
  filterRecipes,
  RecipeFilterControls,
  RecipeFilters,
} from '@/components/recipe-filters';
import { theme } from '@/constants/nutriedu-theme';
import { Recipe } from '@/types/api';

type RecipePickerModalProps = {
  visible: boolean;
  slotLabel: string;
  recipes: Recipe[];
  selectedRecipeId?: number;
  onClose: () => void;
  onSelect: (recipe: Recipe) => void;
};

export function RecipePickerModal({
  visible,
  slotLabel,
  recipes,
  selectedRecipeId,
  onClose,
  onSelect,
}: RecipePickerModalProps) {
  const [filters, setFilters] = useState<RecipeFilters>(emptyRecipeFilters);

  const filteredRecipes = useMemo(() => filterRecipes(recipes, filters), [filters, recipes]);

  const close = () => {
    setFilters(emptyRecipeFilters);
    onClose();
  };

  const select = (recipe: Recipe) => {
    setFilters(emptyRecipeFilters);
    onSelect(recipe);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.keyboardArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>SELECCIONAR RECETA</Text>
              <Text style={styles.title}>{slotLabel}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar selector" hitSlop={10} onPress={close} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </Pressable>
          </View>

          <FlatList
            data={filteredRecipes}
            keyExtractor={(item) => String(item.id)}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            ListHeaderComponent={<RecipeFilterControls value={filters} onChange={setFilters} />}
            renderItem={({ item }) => {
              const selected = item.id === selectedRecipeId;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => select(item)}
                  style={({ pressed }) => [styles.recipeRow, selected && styles.selectedRow, pressed && styles.pressed]}>
                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeName}>{item.nombre}</Text>
                    <Text style={styles.recipeMeta}>{item.calorias ?? '--'} kcal · {healthLabel(item.nivel_salud)}</Text>
                  </View>
                  <Ionicons name={selected ? 'checkmark-circle' : 'add-circle-outline'} size={24} color={theme.colors.primary} />
                </Pressable>
              );
            }}
            ListEmptyComponent={<Text style={styles.empty}>No encontramos recetas compatibles con esa busqueda.</Text>}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const healthLabel = (level: number) => level >= 5 ? 'Muy saludable' : level >= 3 ? 'Saludable' : 'Moderada';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  keyboardArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  headerText: { flex: 1 },
  eyebrow: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  title: { color: theme.colors.text, fontSize: 21, fontWeight: '800', marginTop: 3 },
  closeButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  list: { padding: theme.spacing.lg, gap: 10, paddingBottom: 48 },
  recipeRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, padding: theme.spacing.md },
  selectedRow: { borderColor: theme.colors.primary, backgroundColor: theme.colors.surfaceMuted },
  pressed: { opacity: 0.75 },
  recipeInfo: { flex: 1, minWidth: 0 },
  recipeName: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  recipeMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 5 },
  empty: { color: theme.colors.textMuted, textAlign: 'center', lineHeight: 20, paddingVertical: 48 },
});
