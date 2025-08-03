
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../handlers/categories';
import { eq } from 'drizzle-orm';

const testCategoryInput: CreateCategoryInput = {
  name: 'Electronics',
  description: 'Electronic devices and gadgets',
  icon_url: 'https://example.com/electronics.png'
};

const testCategoryInputMinimal: CreateCategoryInput = {
  name: 'Clothing',
  description: null,
  icon_url: null
};

describe('categories handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createCategory', () => {
    it('should create a category with all fields', async () => {
      const result = await createCategory(testCategoryInput);

      expect(result.name).toEqual('Electronics');
      expect(result.description).toEqual('Electronic devices and gadgets');
      expect(result.icon_url).toEqual('https://example.com/electronics.png');
      expect(result.is_active).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create a category with minimal fields', async () => {
      const result = await createCategory(testCategoryInputMinimal);

      expect(result.name).toEqual('Clothing');
      expect(result.description).toBeNull();
      expect(result.icon_url).toBeNull();
      expect(result.is_active).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save category to database', async () => {
      const result = await createCategory(testCategoryInput);

      const categories = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, result.id))
        .execute();

      expect(categories).toHaveLength(1);
      expect(categories[0].name).toEqual('Electronics');
      expect(categories[0].description).toEqual('Electronic devices and gadgets');
      expect(categories[0].is_active).toBe(true);
    });
  });

  describe('getCategories', () => {
    it('should return all active categories', async () => {
      await createCategory(testCategoryInput);
      await createCategory(testCategoryInputMinimal);

      const result = await getCategories();

      expect(result).toHaveLength(2);
      expect(result[0].name).toEqual('Electronics');
      expect(result[1].name).toEqual('Clothing');
      expect(result.every(cat => cat.is_active)).toBe(true);
    });

    it('should not return inactive categories', async () => {
      const category = await createCategory(testCategoryInput);
      
      // Deactivate the category directly in database
      await db.update(categoriesTable)
        .set({ is_active: false })
        .where(eq(categoriesTable.id, category.id))
        .execute();

      const result = await getCategories();

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no categories exist', async () => {
      const result = await getCategories();

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('updateCategory', () => {
    it('should update category fields', async () => {
      const category = await createCategory(testCategoryInput);

      const updateInput = {
        name: 'Updated Electronics',
        description: 'Updated description'
      };

      const result = await updateCategory(category.id, updateInput);

      expect(result.id).toEqual(category.id);
      expect(result.name).toEqual('Updated Electronics');
      expect(result.description).toEqual('Updated description');
      expect(result.icon_url).toEqual(testCategoryInput.icon_url); // Unchanged
      expect(result.is_active).toBe(true);
    });

    it('should update partial fields', async () => {
      const category = await createCategory(testCategoryInput);

      const updateInput = {
        name: 'Partially Updated'
      };

      const result = await updateCategory(category.id, updateInput);

      expect(result.name).toEqual('Partially Updated');
      expect(result.description).toEqual(testCategoryInput.description); // Unchanged
      expect(result.icon_url).toEqual(testCategoryInput.icon_url); // Unchanged
    });

    it('should throw error for non-existent category', async () => {
      const updateInput = { name: 'Non-existent' };

      await expect(updateCategory(999, updateInput)).rejects.toThrow(/not found/i);
    });
  });

  describe('deleteCategory', () => {
    it('should deactivate category', async () => {
      const category = await createCategory(testCategoryInput);

      const result = await deleteCategory(category.id);

      expect(result).toBe(true);

      // Verify category is deactivated in database
      const categories = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, category.id))
        .execute();

      expect(categories[0].is_active).toBe(false);
    });

    it('should return true even for already inactive category', async () => {
      const category = await createCategory(testCategoryInput);
      
      // Deactivate first time
      await deleteCategory(category.id);
      
      // Deactivate second time
      const result = await deleteCategory(category.id);

      expect(result).toBe(true);
    });

    it('should return false for non-existent category', async () => {
      const result = await deleteCategory(999);

      expect(result).toBe(false);
    });

    it('should not appear in getCategories after deletion', async () => {
      const category = await createCategory(testCategoryInput);
      await deleteCategory(category.id);

      const result = await getCategories();

      expect(result).toHaveLength(0);
    });
  });
});
