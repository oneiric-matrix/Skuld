import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Recipe,
  ScheduledMeal,
  GroceryItem,
  ActiveKitchenTimer,
  DietaryPreference,
} from '../../agents/ChefService';
import { colors, spacing, borderRadius, typography, touchTargets } from '../../theme/tokens';

export interface ChefDashboardViewProps {
  scheduledMeals: ScheduledMeal[];
  recipes: Recipe[];
  groceryList: GroceryItem[];
  activeTimers: ActiveKitchenTimer[];
  onToggleGroceryItem: (itemId: string) => void;
  onSelectRecipe?: (recipe: Recipe) => void;
  onStartCookingTimer?: (label: string, durationSeconds: number) => void;
  onFilterDiet?: (diet: DietaryPreference) => void;
}

const DIETARY_TAGS: DietaryPreference[] = [
  'vegetarian',
  'vegan',
  'gluten_free',
  'keto',
  'dairy_free',
  'high_protein',
  'low_carb',
];

export const ChefDashboardView: React.FC<ChefDashboardViewProps> = ({
  scheduledMeals,
  recipes,
  groceryList,
  activeTimers,
  onToggleGroceryItem,
  onSelectRecipe,
  onStartCookingTimer,
  onFilterDiet,
}) => {
  const [activeTab, setActiveTab] = useState<'meals' | 'recipes' | 'groceries'>('meals');
  const [selectedTag, setSelectedTag] = useState<DietaryPreference | null>(null);
  const [activeRecipeModal, setActiveRecipeModal] = useState<Recipe | null>(null);

  const filteredRecipes = selectedTag
    ? recipes.filter((r) => r.dietaryTags.includes(selectedTag))
    : recipes;

  const handleTagToggle = (tag: DietaryPreference) => {
    const nextTag = selectedTag === tag ? null : tag;
    setSelectedTag(nextTag);
    if (onFilterDiet && nextTag) {
      onFilterDiet(nextTag);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Active Timers Bar if any timers exist */}
      {activeTimers.length > 0 ? (
        <View style={styles.timersBar}>
          <Text style={styles.timersBarTitle}>⏱️ ACTIVE KITCHEN TIMERS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {activeTimers.map((timer) => (
              <View key={timer.id} style={styles.timerBadge}>
                <Text style={styles.timerLabel}>{timer.label}</Text>
                <Text style={styles.timerRemaining}>{Math.ceil(timer.remainingSeconds / 60)}m left</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'meals' && styles.tabActive]}
          onPress={() => setActiveTab('meals')}
        >
          <Text style={[styles.tabText, activeTab === 'meals' && styles.tabTextActive]}>
            ᚲ Meals ({scheduledMeals.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'recipes' && styles.tabActive]}
          onPress={() => setActiveTab('recipes')}
        >
          <Text style={[styles.tabText, activeTab === 'recipes' && styles.tabTextActive]}>
            ᛒ Recipes ({recipes.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'groceries' && styles.tabActive]}
          onPress={() => setActiveTab('groceries')}
        >
          <Text style={[styles.tabText, activeTab === 'groceries' && styles.tabTextActive]}>
            ᚷ Groceries ({groceryList.filter((g) => !g.isChecked).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* MEALS SCHEDULE TAB */}
      {activeTab === 'meals' ? (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          {scheduledMeals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyRune}>ᚲ</Text>
              <Text style={styles.emptyText}>No meals scheduled for today</Text>
              <Text style={styles.emptySubtext}>Ask Chef to plan healthy balanced meals matching your macro goals</Text>
            </View>
          ) : (
            scheduledMeals.map((meal) => (
              <View key={meal.id} style={styles.mealCard}>
                <View style={styles.mealHeader}>
                  <Text style={styles.mealSlotBadge}>{meal.mealType.toUpperCase()}</Text>
                  <Text style={styles.mealDate}>{meal.scheduledDate}</Text>
                </View>
                <Text style={styles.mealName}>{meal.recipeName}</Text>
                {meal.notes ? <Text style={styles.mealNotes}>{meal.notes}</Text> : null}
              </View>
            ))
          )}
        </ScrollView>
      ) : null}

      {/* RECIPES DISCOVERY TAB */}
      {activeTab === 'recipes' ? (
        <View style={styles.recipesContainer}>
          {/* Dietary Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dietScroll}>
            {DIETARY_TAGS.map((tag) => {
              const isSelected = selectedTag === tag;
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.dietChip, isSelected && styles.dietChipActive]}
                  onPress={() => handleTagToggle(tag)}
                >
                  <Text style={[styles.dietChipText, isSelected && styles.dietChipTextActive]}>
                    {tag.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            {filteredRecipes.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyRune}>ᛒ</Text>
                <Text style={styles.emptyText}>No recipes matching filter</Text>
                <Text style={styles.emptySubtext}>Ask Chef to generate custom culinary recipes</Text>
              </View>
            ) : (
              filteredRecipes.map((rec) => (
                <TouchableOpacity
                  key={rec.id}
                  style={styles.recipeCard}
                  onPress={() => {
                    setActiveRecipeModal(rec);
                    if (onSelectRecipe) onSelectRecipe(rec);
                  }}
                >
                  <View style={styles.recipeTop}>
                    <Text style={styles.recipeName}>{rec.title}</Text>
                    <Text style={styles.recipeTime}>⏱️ {rec.prepTimeMinutes + rec.cookTimeMinutes}m</Text>
                  </View>
                  <Text style={styles.recipeDesc} numberOfLines={2}>{rec.description}</Text>
                  <View style={styles.tagRow}>
                    {rec.dietaryTags.map((t) => (
                      <View key={t} style={styles.tagBadge}>
                        <Text style={styles.tagBadgeText}>{t.replace('_', ' ')}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      ) : null}

      {/* GROCERY CHECKLIST TAB */}
      {activeTab === 'groceries' ? (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          {groceryList.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyRune}>ᚷ</Text>
              <Text style={styles.emptyText}>Grocery basket is empty</Text>
              <Text style={styles.emptySubtext}>Generate recipes to automatically populate missing ingredients</Text>
            </View>
          ) : (
            groceryList.map((item) => (
              <View key={item.id} style={styles.groceryCard}>
                <TouchableOpacity
                  style={[styles.groceryCheckbox, item.isChecked && styles.groceryCheckboxDone]}
                  onPress={() => onToggleGroceryItem(item.id)}
                >
                  <Text style={styles.groceryCheckmark}>{item.isChecked ? '✓' : ''}</Text>
                </TouchableOpacity>
                <View style={styles.groceryInfo}>
                  <Text style={[styles.groceryName, item.isChecked && styles.groceryNameDone]}>
                    {item.name}
                  </Text>
                  <Text style={styles.groceryCategory}>{item.amount} {item.recipeSource ? `• From ${item.recipeSource}` : ''}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      ) : null}

      {/* Recipe Quick View Modal */}
      {activeRecipeModal ? (
        <View style={styles.recipeDetailOverlay}>
          <View style={styles.recipeDetailCard}>
            <View style={styles.recipeModalHeader}>
              <Text style={styles.recipeModalTitle}>{activeRecipeModal.title}</Text>
              <TouchableOpacity onPress={() => setActiveRecipeModal(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSubheading}>INGREDIENTS ({activeRecipeModal.servings} Servings)</Text>
              {activeRecipeModal.ingredients.map((ing, i) => (
                <Text key={i} style={styles.ingredientText}>• {ing.amount} {ing.name} {ing.isOptional ? '(optional)' : ''}</Text>
              ))}

              <Text style={[styles.modalSubheading, { marginTop: spacing.md }]}>COOKING INSTRUCTIONS</Text>
              {activeRecipeModal.steps.map((st) => (
                <View key={st.stepNumber} style={styles.stepRow}>
                  <Text style={styles.stepNumber}>{st.stepNumber}.</Text>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepInstruction}>{st.instruction}</Text>
                    {st.timerSeconds && onStartCookingTimer ? (
                      <TouchableOpacity
                        style={styles.stepTimerBtn}
                        onPress={() => onStartCookingTimer(st.instruction.substring(0, 20), st.timerSeconds!)}
                      >
                        <Text style={styles.stepTimerBtnText}>⏱️ Start {Math.ceil(st.timerSeconds / 60)}m Timer</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.midnightObsidian,
  },
  timersBar: {
    backgroundColor: colors.cardElevated,
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  timersBarTitle: {
    ...typography.captionStyle,
    fontSize: 9,
    letterSpacing: 1.2,
    color: colors.glacialCyan,
    marginBottom: 4,
  },
  timerBadge: {
    backgroundColor: colors.cardSlate,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.glacialCyan,
  },
  timerLabel: {
    ...typography.captionStyle,
    fontSize: 10,
    color: colors.frostSilver,
  },
  timerRemaining: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.glacialCyan,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.cardSlate,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minHeight: touchTargets.min,
    justifyContent: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.emeraldGreen,
  },
  tabText: {
    ...typography.captionStyle,
    fontSize: 12,
    color: colors.slateMuted,
  },
  tabTextActive: {
    color: colors.frostSilver,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: spacing.md,
  },
  mealCard: {
    backgroundColor: colors.cardSlate,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  mealSlotBadge: {
    ...typography.captionStyle,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.emeraldGreen,
    fontWeight: '700',
  },
  mealDate: {
    ...typography.captionStyle,
    fontSize: 11,
    color: colors.runicGold,
    fontWeight: '600',
  },
  mealName: {
    ...typography.bodyStyle,
    fontSize: 15,
    fontWeight: '700',
    color: colors.frostSilver,
    marginBottom: spacing.xs,
  },
  mealNotes: {
    ...typography.captionStyle,
    color: colors.slateMuted,
  },
  recipesContainer: {
    flex: 1,
  },
  dietScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 50,
  },
  dietChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    backgroundColor: colors.cardSlate,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: 32,
    justifyContent: 'center',
  },
  dietChipActive: {
    backgroundColor: colors.emeraldGreen,
    borderColor: colors.emeraldGreen,
  },
  dietChipText: {
    fontSize: 11,
    color: colors.slateMuted,
    textTransform: 'capitalize',
  },
  dietChipTextActive: {
    color: colors.midnightObsidian,
    fontWeight: '700',
  },
  recipeCard: {
    backgroundColor: colors.cardSlate,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  recipeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recipeName: {
    ...typography.bodyStyle,
    fontSize: 15,
    fontWeight: '700',
    color: colors.frostSilver,
  },
  recipeTime: {
    ...typography.captionStyle,
    fontSize: 11,
    color: colors.glacialCyan,
  },
  recipeDesc: {
    ...typography.captionStyle,
    color: colors.slateMuted,
    marginBottom: spacing.xs,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tagBadge: {
    backgroundColor: colors.cardElevated,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  tagBadgeText: {
    fontSize: 9,
    color: colors.slateMuted,
    textTransform: 'capitalize',
  },
  groceryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSlate,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  groceryCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.slateMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  groceryCheckboxDone: {
    backgroundColor: colors.emeraldGreen,
    borderColor: colors.emeraldGreen,
  },
  groceryCheckmark: {
    color: colors.midnightObsidian,
    fontWeight: '700',
    fontSize: 12,
  },
  groceryInfo: {
    flex: 1,
  },
  groceryName: {
    ...typography.bodyStyle,
    fontSize: 14,
    color: colors.frostSilver,
  },
  groceryNameDone: {
    textDecorationLine: 'line-through',
    color: colors.slateMuted,
  },
  groceryCategory: {
    ...typography.captionStyle,
    fontSize: 10,
    color: colors.slateMuted,
  },
  recipeDetailOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 10, 18, 0.9)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  recipeDetailCard: {
    backgroundColor: colors.cardSlate,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.glacialCyan,
  },
  recipeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  recipeModalTitle: {
    ...typography.title,
    fontSize: 17,
    color: colors.frostSilver,
  },
  closeModalText: {
    fontSize: 18,
    color: colors.slateMuted,
    padding: 4,
  },
  modalSubheading: {
    ...typography.captionStyle,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.glacialCyan,
    marginVertical: spacing.xs,
  },
  ingredientText: {
    ...typography.bodyStyle,
    fontSize: 13,
    color: colors.frostSilver,
    marginVertical: 2,
  },
  stepRow: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
  },
  stepNumber: {
    ...typography.bodyStyle,
    fontWeight: '700',
    color: colors.emeraldGreen,
    marginRight: spacing.xs,
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    ...typography.bodyStyle,
    fontSize: 13,
    color: colors.frostSilver,
  },
  stepTimerBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.cardElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.glacialCyan,
    marginTop: 4,
  },
  stepTimerBtnText: {
    fontSize: 11,
    color: colors.glacialCyan,
    fontWeight: '600',
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyRune: {
    fontSize: 40,
    color: colors.slateMuted,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.title,
    fontSize: 16,
    color: colors.frostSilver,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.captionStyle,
    color: colors.slateMuted,
    textAlign: 'center',
  },
});
