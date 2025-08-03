
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type Category, type CreateCategoryInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function getCategories(): Promise<Category[]> {
  try {
    const results = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.is_active, true))
      .execute();

    return results.map(category => ({
      ...category,
      // No numeric conversions needed for categories table
    }));
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    throw error;
  }
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  try {
    const result = await db.insert(categoriesTable)
      .values({
        name: input.name,
        description: input.description,
        icon_url: input.icon_url,
        is_active: true // Default value
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Category creation failed:', error);
    throw error;
  }
}

export async function updateCategory(id: number, input: Partial<CreateCategoryInput>): Promise<Category> {
  try {
    const result = await db.update(categoriesTable)
      .set({
        ...input,
        // Don't allow updating is_active through this function
      })
      .where(eq(categoriesTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Category with id ${id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Category update failed:', error);
    throw error;
  }
}

export async function deleteCategory(id: number): Promise<boolean> {
  try {
    const result = await db.update(categoriesTable)
      .set({
        is_active: false
      })
      .where(eq(categoriesTable.id, id))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Category deletion failed:', error);
    throw error;
  }
}
