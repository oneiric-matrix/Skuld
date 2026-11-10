import { ChefService, chefAgent } from '../../src/agents/ChefService';
import { ButlerAgentService, butlerAgent } from '../../src/agents/ButlerAgentService';
import { agentBus } from '../../src/kernel/AgentBusService';

describe('ChefService (Task 3.8)', () => {
  let chef: ChefService;

  beforeEach(() => {
    chef = ChefService.getInstance();
    chef.clearAll();
    butlerAgent.clearAll();
  });

  describe('Recipe Creation & Filtering', () => {
    it('creates a recipe and filters by dietary tags', () => {
      const recipe = chef.createRecipe(
        'Mediterranean Quinoa Bowl',
        'Healthy grain bowl with feta and kalamata olives',
        15,
        20,
        2,
        [
          { name: 'Quinoa', amount: '1 cup' },
          { name: 'Feta Cheese', amount: '50g' },
          { name: 'Cucumbers', amount: '1 diced' },
        ],
        [
          { stepNumber: 1, instruction: 'Rinse and boil quinoa', timerSeconds: 900 },
          { stepNumber: 2, instruction: 'Assemble vegetables and garnish with feta' },
        ],
        ['vegetarian', 'gluten_free']
      );

      expect(recipe.id).toMatch(/^rcp_/);
      expect(recipe.title).toBe('Mediterranean Quinoa Bowl');
      expect(recipe.prepTimeMinutes).toBe(15);
      expect(recipe.ingredients).toHaveLength(3);
      expect(recipe.dietaryTags).toContain('vegetarian');

      const vegetarianRecipes = chef.getRecipes('vegetarian');
      expect(vegetarianRecipes).toHaveLength(1);

      const ketoRecipes = chef.getRecipes('keto');
      expect(ketoRecipes).toHaveLength(0);
    });

    it('throws error for invalid recipe inputs', () => {
      expect(() =>
        chef.createRecipe('', 'desc', 10, 10, 1, [{ name: 'Salt', amount: '1 tsp' }], [])
      ).toThrow('Recipe title cannot be empty');

      expect(() =>
        chef.createRecipe('Dish', 'desc', -5, 10, 1, [{ name: 'Salt', amount: '1 tsp' }], [])
      ).toThrow('Prep and cook time must be non-negative');

      expect(() =>
        chef.createRecipe('Dish', 'desc', 10, 10, 0, [{ name: 'Salt', amount: '1 tsp' }], [])
      ).toThrow('Servings must be at least 1');

      expect(() => chef.createRecipe('Dish', 'desc', 10, 10, 2, [], [])).toThrow(
        'Recipe must have at least one ingredient'
      );
    });

    it('retrieves single recipe and deletes recipe', () => {
      const recipe = chef.createRecipe('Pasta Aglio e Olio', '', 5, 10, 2, [
        { name: 'Spaghetti', amount: '200g' },
      ], []);

      expect(chef.getRecipe(recipe.id)?.title).toBe('Pasta Aglio e Olio');
      expect(chef.deleteRecipe(recipe.id)).toBe(true);
      expect(chef.deleteRecipe('fake_id')).toBe(false);
      expect(chef.getRecipes()).toHaveLength(0);
    });
  });

  describe('Meal Planning & Butler Briefings', () => {
    it('schedules a meal and retrieves for given date and type', () => {
      const recipe = chef.createRecipe('Salmon with Asparagus', '', 10, 15, 2, [
        { name: 'Salmon fillet', amount: '2' },
      ], []);

      const scheduled = chef.scheduleMeal(recipe.id, 'dinner', '2026-11-10');
      expect(scheduled.id).toMatch(/^sch_/);
      expect(scheduled.recipeName).toBe('Salmon with Asparagus');
      expect(scheduled.mealType).toBe('dinner');

      const dinner = chef.getScheduledMeal('2026-11-10', 'dinner');
      expect(dinner).toBeDefined();
      expect(dinner?.recipeName).toBe('Salmon with Asparagus');

      const list = chef.getScheduledMeals('2026-11-10');
      expect(list).toHaveLength(1);
    });

    it('throws error scheduling non-existent recipe', () => {
      expect(() => chef.scheduleMeal('non_existent', 'lunch')).toThrow(
        'Recipe non_existent not found'
      );
    });

    it('deletes scheduled meal', () => {
      const recipe = chef.createRecipe('Oatmeal', '', 2, 5, 1, [{ name: 'Oats', amount: '1 cup' }], []);
      const meal = chef.scheduleMeal(recipe.id, 'breakfast');

      expect(chef.deleteScheduledMeal(meal.id)).toBe(true);
      expect(chef.deleteScheduledMeal('fake_id')).toBe(false);
    });

    it('answers get_scheduled_meal query requested by Butler for daily briefing', async () => {
      const recipe = chef.createRecipe('Tuscan Herb Chicken', '', 15, 30, 4, [
        { name: 'Chicken breast', amount: '4' },
      ], []);

      // Schedule for today
      chef.scheduleMeal(recipe.id, 'dinner');

      const res = await agentBus.askAgent<
        { mealType: string; date?: number },
        { recipeName: string; prepTimeMinutes: number }
      >('butler', 'chef', 'get_scheduled_meal', { mealType: 'dinner' });

      expect(res.success).toBe(true);
      expect(res.data?.recipeName).toBe('Tuscan Herb Chicken');
      expect(res.data?.prepTimeMinutes).toBe(15);

      // Verify Butler daily briefing receives this
      const briefing = await butlerAgent.generateDailyBriefing();
      expect(briefing).toContain("Tonight's scheduled dinner is Tuscan Herb Chicken.");
    });

    it('returns default placeholder when no meal is scheduled', async () => {
      const res = await agentBus.askAgent<
        { mealType: string; date?: number },
        { recipeName: string }
      >('butler', 'chef', 'get_scheduled_meal', { mealType: 'lunch' });

      expect(res.success).toBe(true);
      expect(res.data?.recipeName).toBe('Chef Special (TBD)');
    });
  });

  describe('Grocery List Auto-Generation', () => {
    it('generates grocery items directly from recipe ingredients', () => {
      const recipe = chef.createRecipe('Stir Fry Noodles', '', 10, 10, 2, [
        { name: 'Egg Noodles', amount: '200g' },
        { name: 'Soy Sauce', amount: '2 tbsp' },
        { name: 'Broccoli', amount: '1 head' },
      ], []);

      const items = chef.generateGroceryListFromRecipe(recipe.id);
      expect(items).toHaveLength(3);
      expect(items[0].name).toBe('Egg Noodles');
      expect(items[0].recipeSource).toBe('Stir Fry Noodles');
      expect(chef.getGroceryList()).toHaveLength(3);
    });

    it('throws error generating grocery list from non-existent recipe', () => {
      expect(() => chef.generateGroceryListFromRecipe('fake_recipe')).toThrow(
        'Recipe fake_recipe not found'
      );
    });

    it('toggles, clears completed items, and deletes grocery items', () => {
      const item1 = chef.addGroceryItem('Olive Oil', '500ml');
      const item2 = chef.addGroceryItem('Garlic', '1 bulb');

      chef.toggleGroceryItem(item1.id);
      expect(chef.getGroceryList(false)).toHaveLength(1); // unchecked only

      chef.clearCompletedGroceryItems();
      expect(chef.getGroceryList(true)).toHaveLength(1); // item1 removed

      expect(chef.deleteGroceryItem(item2.id)).toBe(true);
      expect(chef.getGroceryList()).toHaveLength(0);
    });

    it('throws error toggling non-existent grocery item or empty name', () => {
      expect(() => chef.addGroceryItem('', '1 cup')).toThrow(
        'Grocery item name cannot be empty'
      );
      expect(() => chef.toggleGroceryItem('fake_item')).toThrow(
        'Grocery item fake_item not found'
      );
    });
  });

  describe('Kitchen Timers & Butler Reminders', () => {
    it('starts, stops, and manages kitchen timers', () => {
      const timer = chef.startTimer('Boiling Pasta', 600);
      expect(timer.id).toMatch(/^tmr_/);
      expect(timer.isRunning).toBe(true);
      expect(timer.totalDurationSeconds).toBe(600);

      const stopped = chef.stopTimer(timer.id);
      expect(stopped.isRunning).toBe(false);

      expect(chef.getTimers()).toHaveLength(1);
      expect(chef.deleteTimer(timer.id)).toBe(true);
      expect(chef.getTimers()).toHaveLength(0);
    });

    it('throws error for invalid timer inputs or missing timer', () => {
      expect(() => chef.startTimer('', 300)).toThrow('Timer label cannot be empty');
      expect(() => chef.startTimer('Oven', 0)).toThrow('Timer duration must be positive');
      expect(() => chef.stopTimer('missing_timer')).toThrow('Timer missing_timer not found');
    });

    it('schedules meal prep reminder with Butler over Agent Bus', async () => {
      const recipe = chef.createRecipe('Risotto', '', 20, 25, 4, [{ name: 'Arborio rice', amount: '300g' }], []);
      const scheduled = chef.scheduleMeal(recipe.id, 'dinner');

      const res = await chef.scheduleMealPrepReminderWithButler(scheduled.id);
      expect(res.scheduled).toBe(true);
      expect(res.reminderId).toBeDefined();

      const reminders = butlerAgent.getReminders(true);
      expect(reminders).toHaveLength(1);
      expect(reminders[0].text).toContain('Meal Prep: Time to start cooking Risotto');
    });

    it('throws error scheduling prep reminder for non-existent meal', async () => {
      await expect(chef.scheduleMealPrepReminderWithButler('missing_sch')).rejects.toThrow(
        'Scheduled meal missing_sch not found'
      );
    });
  });

  describe('Agent Bus Handler Integration', () => {
    it('answers list_recipes and get_grocery_list queries over Agent Bus', async () => {
      chef.createRecipe('Avocado Toast', '', 5, 5, 1, [{ name: 'Bread', amount: '2 slices' }], [], ['vegan']);
      chef.addGroceryItem('Sourdough Bread', '1 loaf');

      const recipesRes = await agentBus.askAgent<{ tag?: string }, Array<{ title: string }>>(
        'butler',
        'chef',
        'list_recipes',
        { tag: 'vegan' }
      );
      expect(recipesRes.success).toBe(true);
      expect(recipesRes.data).toHaveLength(1);
      expect(recipesRes.data![0].title).toBe('Avocado Toast');

      const groceryRes = await agentBus.askAgent<Record<string, unknown>, Array<{ name: string }>>(
        'butler',
        'chef',
        'get_grocery_list',
        {}
      );
      expect(groceryRes.success).toBe(true);
      expect(groceryRes.data).toHaveLength(1);
      expect(groceryRes.data![0].name).toBe('Sourdough Bread');
    });
  });
});
