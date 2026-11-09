import { agentBus } from '../kernel/AgentBusService';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type DietaryPreference =
  | 'vegetarian'
  | 'vegan'
  | 'gluten_free'
  | 'keto'
  | 'dairy_free'
  | 'high_protein'
  | 'low_carb';

export interface Ingredient {
  name: string;
  amount: string; // e.g. "2 cups", "200g", "1 tbsp"
  isOptional?: boolean;
}

export interface CookingStep {
  stepNumber: number;
  instruction: string;
  timerSeconds?: number;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  ingredients: Ingredient[];
  steps: CookingStep[];
  dietaryTags: DietaryPreference[];
  createdAt: number;
}

export interface ScheduledMeal {
  id: string;
  recipeId: string;
  recipeName: string;
  mealType: MealType;
  scheduledDate: string; // "YYYY-MM-DD"
  timestamp: number;
  notes?: string;
}

export interface GroceryItem {
  id: string;
  name: string;
  amount: string;
  isChecked: boolean;
  recipeSource?: string;
}

export interface ActiveKitchenTimer {
  id: string;
  label: string;
  totalDurationSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  startedAt?: number;
}

/**
 * Chef & Culinary Domain Service.
 * Manages recipe libraries, dietary filters, interactive cooking step timers,
 * weekly meal schedules, and grocery list auto-generation.
 * Cooperates with Butler via AgentBus to answer daily dinner plans and schedule meal prep reminders.
 */
export class ChefService {
  private static instance: ChefService | null = null;
  private recipes = new Map<string, Recipe>();
  private scheduledMeals = new Map<string, ScheduledMeal>();
  private groceryList = new Map<string, GroceryItem>();
  private activeTimers = new Map<string, ActiveKitchenTimer>();

  private constructor() {
    this.registerBusHandlers();
  }

  static getInstance(): ChefService {
    if (!ChefService.instance) {
      ChefService.instance = new ChefService();
    }
    return ChefService.instance;
  }

  private getDateKey(timestamp = Date.now()): string {
    const d = new Date(timestamp);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }

  /**
   * Registers Chef query & action handlers on the central Agent Bus.
   */
  private registerBusHandlers(): void {
    // 1. Peer agents (e.g. Butler) query scheduled meal for daily briefings
    agentBus.registerQueryHandler<
      { mealType: string; date?: number },
      { recipeName: string; prepTimeMinutes: number }
    >('chef', 'get_scheduled_meal', async (query) => {
      const dateKey = this.getDateKey(query.payload.date || Date.now());
      const meal = this.getScheduledMeal(dateKey, query.payload.mealType as MealType);
      if (meal) {
        const recipe = this.getRecipe(meal.recipeId);
        return {
          recipeName: meal.recipeName,
          prepTimeMinutes: recipe?.prepTimeMinutes || 0,
        };
      }
      return { recipeName: 'Chef Special (TBD)', prepTimeMinutes: 0 };
    });

    // 2. Peer agents can query recipe catalog
    agentBus.registerQueryHandler<{ tag?: DietaryPreference }, Recipe[]>(
      'chef',
      'list_recipes',
      async (query) => {
        return this.getRecipes(query.payload.tag);
      }
    );

    // 3. Peer agents can query active grocery items
    agentBus.registerQueryHandler<Record<string, unknown>, GroceryItem[]>(
      'chef',
      'get_grocery_list',
      async () => {
        return this.getGroceryList();
      }
    );
  }

  // --- Recipe Management Operations ---

  createRecipe(
    title: string,
    description: string,
    prepTimeMinutes: number,
    cookTimeMinutes: number,
    servings: number,
    ingredients: Ingredient[],
    steps: CookingStep[],
    dietaryTags: DietaryPreference[] = []
  ): Recipe {
    if (!title || !title.trim()) {
      throw new Error('Recipe title cannot be empty');
    }
    if (prepTimeMinutes < 0 || cookTimeMinutes < 0) {
      throw new Error('Prep and cook time must be non-negative');
    }
    if (servings <= 0) {
      throw new Error('Servings must be at least 1');
    }
    if (!ingredients || ingredients.length === 0) {
      throw new Error('Recipe must have at least one ingredient');
    }

    const recipe: Recipe = {
      id: `rcp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim(),
      description: description.trim(),
      prepTimeMinutes,
      cookTimeMinutes,
      servings,
      ingredients,
      steps,
      dietaryTags,
      createdAt: Date.now(),
    };

    this.recipes.set(recipe.id, recipe);
    return recipe;
  }

  getRecipe(id: string): Recipe | undefined {
    return this.recipes.get(id);
  }

  getRecipes(dietaryFilter?: DietaryPreference): Recipe[] {
    const list = Array.from(this.recipes.values());
    if (dietaryFilter) {
      return list.filter((r) => r.dietaryTags.includes(dietaryFilter));
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }

  deleteRecipe(id: string): boolean {
    return this.recipes.delete(id);
  }

  // --- Meal Planning Operations ---

  scheduleMeal(
    recipeId: string,
    mealType: MealType,
    dateKey = this.getDateKey(),
    notes?: string
  ): ScheduledMeal {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) {
      throw new Error(`Recipe ${recipeId} not found`);
    }

    const scheduled: ScheduledMeal = {
      id: `sch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      recipeId,
      recipeName: recipe.title,
      mealType,
      scheduledDate: dateKey,
      timestamp: Date.now(),
      notes: notes?.trim(),
    };

    this.scheduledMeals.set(scheduled.id, scheduled);
    return scheduled;
  }

  getScheduledMeal(dateKey: string, mealType: MealType): ScheduledMeal | undefined {
    return Array.from(this.scheduledMeals.values()).find(
      (m) => m.scheduledDate === dateKey && m.mealType === mealType
    );
  }

  getScheduledMeals(dateKey = this.getDateKey()): ScheduledMeal[] {
    return Array.from(this.scheduledMeals.values()).filter(
      (m) => m.scheduledDate === dateKey
    );
  }

  deleteScheduledMeal(id: string): boolean {
    return this.scheduledMeals.delete(id);
  }

  // --- Grocery List Operations ---

  addGroceryItem(name: string, amount: string, recipeSource?: string): GroceryItem {
    if (!name || !name.trim()) {
      throw new Error('Grocery item name cannot be empty');
    }

    const item: GroceryItem = {
      id: `grc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      amount: amount.trim(),
      isChecked: false,
      recipeSource,
    };

    this.groceryList.set(item.id, item);
    return item;
  }

  /**
   * Generates grocery list items automatically from ingredients of a scheduled or selected recipe.
   */
  generateGroceryListFromRecipe(recipeId: string): GroceryItem[] {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) {
      throw new Error(`Recipe ${recipeId} not found`);
    }

    const addedItems: GroceryItem[] = [];
    for (const ing of recipe.ingredients) {
      const item = this.addGroceryItem(ing.name, ing.amount, recipe.title);
      addedItems.push(item);
    }

    return addedItems;
  }

  toggleGroceryItem(id: string): GroceryItem {
    const item = this.groceryList.get(id);
    if (!item) {
      throw new Error(`Grocery item ${id} not found`);
    }
    item.isChecked = !item.isChecked;
    return item;
  }

  getGroceryList(includeChecked = true): GroceryItem[] {
    const list = Array.from(this.groceryList.values());
    return includeChecked ? list : list.filter((i) => !i.isChecked);
  }

  deleteGroceryItem(id: string): boolean {
    return this.groceryList.delete(id);
  }

  clearCompletedGroceryItems(): void {
    for (const [id, item] of this.groceryList.entries()) {
      if (item.isChecked) {
        this.groceryList.delete(id);
      }
    }
  }

  // --- Interactive Kitchen Timers ---

  startTimer(label: string, durationSeconds: number): ActiveKitchenTimer {
    if (!label || !label.trim()) {
      throw new Error('Timer label cannot be empty');
    }
    if (durationSeconds <= 0) {
      throw new Error('Timer duration must be positive');
    }

    const timer: ActiveKitchenTimer = {
      id: `tmr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      label: label.trim(),
      totalDurationSeconds: Math.round(durationSeconds),
      remainingSeconds: Math.round(durationSeconds),
      isRunning: true,
      startedAt: Date.now(),
    };

    this.activeTimers.set(timer.id, timer);
    return timer;
  }

  stopTimer(id: string): ActiveKitchenTimer {
    const timer = this.activeTimers.get(id);
    if (!timer) {
      throw new Error(`Timer ${id} not found`);
    }
    timer.isRunning = false;
    return timer;
  }

  getTimers(): ActiveKitchenTimer[] {
    return Array.from(this.activeTimers.values());
  }

  deleteTimer(id: string): boolean {
    return this.activeTimers.delete(id);
  }

  // --- Cross-Agent Collaboration ---

  /**
   * Schedules meal prep time or dinner reminders with Butler over Agent Bus.
   */
  async scheduleMealPrepReminderWithButler(
    scheduledMealId: string,
    prepLeadTimeMinutes = 45
  ): Promise<{ scheduled: boolean; reminderId?: string }> {
    const meal = this.scheduledMeals.get(scheduledMealId);
    if (!meal) {
      throw new Error(`Scheduled meal ${scheduledMealId} not found`);
    }

    const recipe = this.getRecipe(meal.recipeId);
    const prepMinutes = recipe ? recipe.prepTimeMinutes : prepLeadTimeMinutes;

    const response = await agentBus.askAgent<
      { text: string; remindAt: number; priority: string },
      { id: string }
    >('chef', 'butler', 'create_reminder', {
      text: `Meal Prep: Time to start cooking ${meal.recipeName} (${meal.mealType})! Allow ~${prepMinutes} mins.`,
      remindAt: Date.now() + 1000, // prompt reminder
      priority: 'normal',
    });

    if (response.success && response.data) {
      return { scheduled: true, reminderId: response.data.id };
    }
    return { scheduled: false };
  }

  clearAll(): void {
    this.recipes.clear();
    this.scheduledMeals.clear();
    this.groceryList.clear();
    this.activeTimers.clear();
  }
}

export const chefAgent = ChefService.getInstance();
