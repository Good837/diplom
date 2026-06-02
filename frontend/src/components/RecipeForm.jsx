import React, { useEffect, useMemo, useState } from 'react';

export function RecipeForm({
  categories,
  initial,
  submitLabel = 'Зберегти',
  onSubmit,
  onCancel,
  busy,
}) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [ingredients, setIngredients] = useState(initial?.ingredients || '');
  const [instructions, setInstructions] = useState(initial?.instructions || '');
  const [cookingTime, setCookingTime] = useState(
    initial?.cooking_time ? String(initial.cooking_time) : ''
  );
  const [imageFile, setImageFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [categoryId, setCategoryId] = useState(initial?.category?.id ? String(initial.category.id) : '');

  useEffect(() => {
    if (!categoryId && categories?.length) setCategoryId(String(categories[0].id));
  }, [categories, categoryId]);

  const canSubmit = useMemo(() => {
    return (
      title.trim() &&
      description.trim() &&
      ingredients.trim() &&
      instructions.trim() &&
      Number(cookingTime) > 0 &&
      categoryId
    );
  }, [title, description, ingredients, instructions, cookingTime, categoryId]);

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit || busy) return;
        const shouldRemove = Boolean(removeImage && !imageFile);
        onSubmit({
          title: title.trim(),
          description: description.trim(),
          ingredients: ingredients.trim(),
          instructions: instructions.trim(),
          cooking_time: Number(cookingTime),
          image_file: imageFile || undefined,
          image_url: shouldRemove ? null : undefined,
          category_id: Number(categoryId),
        });
      }}
    >
      <div className="grid2">
        <label className="field">
          <span className="label">Назва</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Напр., Борщ" />
        </label>

        <label className="field">
          <span className="label">Категорія</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span className="label">Опис</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </label>

      <label className="field">
        <span className="label">Інгредієнти</span>
        <textarea
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          rows={4}
          placeholder="Перелічіть інгредієнти (через кому або з нового рядка)"
        />
      </label>

      <label className="field">
        <span className="label">Інструкції</span>
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={6} />
      </label>

      <div className="grid2">
        <label className="field">
          <span className="label">Час приготування (хв)</span>
          <input
            type="number"
            min="1"
            value={cookingTime}
            onChange={(e) => setCookingTime(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="label">Зображення</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile((e.target.files && e.target.files[0]) || null)}
          />
          {initial?.image_url ? (
            <label className="row" style={{ marginTop: 6 }}>
              <input
                type="checkbox"
                checked={removeImage}
                onChange={(e) => setRemoveImage(e.target.checked)}
                disabled={Boolean(imageFile)}
              />
              <span className="muted">Прибрати поточне зображення</span>
            </label>
          ) : (
            <span className="hint">Підтримуються JPG/PNG/GIF/WEBP.</span>
          )}
        </label>
      </div>

      <div className="row">
        <button className="btn" type="submit" disabled={!canSubmit || busy}>
          {busy ? 'Збереження…' : submitLabel}
        </button>
        {onCancel ? (
          <button className="btn btnSecondary" type="button" onClick={onCancel} disabled={busy}>
            Скасувати
          </button>
        ) : null}
      </div>
    </form>
  );
}

