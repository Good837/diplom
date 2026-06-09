import React, { useEffect, useMemo, useState } from 'react';

import {
  ALLOWED_UNITS,
  EMPTY_INGREDIENT,
  normalizeIngredientsForForm,
  serializeIngredientsForApi,
} from '../utils/ingredients';
import { validateRecipeFields } from '../utils/validation';

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
  const [ingredientRows, setIngredientRows] = useState(() => normalizeIngredientsForForm(initial?.ingredients));
  const [instructions, setInstructions] = useState(initial?.instructions || '');
  const [cookingTime, setCookingTime] = useState(
    initial?.cooking_time ? String(initial.cooking_time) : ''
  );
  const [imageFile, setImageFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [categoryId, setCategoryId] = useState(initial?.category?.id ? String(initial.category.id) : '');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!categoryId && categories?.length) setCategoryId(String(categories[0].id));
  }, [categories, categoryId]);

  function updateIngredientRow(index, patch) {
    setIngredientRows((rows) =>
      rows.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, ...patch };
        if (patch.unit === 'за смаком') next.amount = '';
        return next;
      })
    );
  }

  function addIngredientRow() {
    setIngredientRows((rows) => [...rows, { ...EMPTY_INGREDIENT }]);
  }

  function removeIngredientRow(index) {
    setIngredientRows((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)));
  }

  const canSubmit = useMemo(() => {
    const errors = validateRecipeFields({
      title,
      description,
      ingredients: ingredientRows,
      instructions,
      cookingTime,
      categoryId,
      imageFile,
    });
    return Object.keys(errors).length === 0;
  }, [title, description, ingredientRows, instructions, cookingTime, categoryId, imageFile]);

  function handleImageChange(e) {
    const file = (e.target.files && e.target.files[0]) || null;
    setImageFile(file);
    if (file) {
      const errors = validateRecipeFields({
        title,
        description,
        ingredients: ingredientRows,
        instructions,
        cookingTime,
        categoryId,
        imageFile: file,
      });
      setFieldErrors((prev) => ({ ...prev, image: errors.image || undefined }));
    } else {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.image;
        return next;
      });
    }
  }

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        const errors = validateRecipeFields({
          title,
          description,
          ingredients: ingredientRows,
          instructions,
          cookingTime,
          categoryId,
          imageFile,
        });
        setFieldErrors(errors);
        if (Object.keys(errors).length || busy) return;
        const shouldRemove = Boolean(removeImage && !imageFile);
        onSubmit({
          title: title.trim(),
          description: description.trim(),
          ingredients: serializeIngredientsForApi(ingredientRows),
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
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Напр., Борщ"
            maxLength={200}
          />
          {fieldErrors.title ? <span className="fieldError">{fieldErrors.title}</span> : null}
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
          {fieldErrors.categoryId ? <span className="fieldError">{fieldErrors.categoryId}</span> : null}
        </label>
      </div>

      <label className="field">
        <span className="label">Опис</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} />
        {fieldErrors.description ? <span className="fieldError">{fieldErrors.description}</span> : null}
      </label>

      <div className="field">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="label">Інгредієнти</span>
          <button className="btn btnSecondary" type="button" onClick={addIngredientRow} disabled={busy}>
            Додати інгредієнт
          </button>
        </div>
        <div className="ingredientList">
          {ingredientRows.map((row, index) => (
            <div className="ingredientRow" key={index}>
              <input
                className="ingredientName"
                value={row.name}
                onChange={(e) => updateIngredientRow(index, { name: e.target.value })}
                placeholder="Назва"
                maxLength={120}
              />
              <input
                className="ingredientAmount"
                type="number"
                min="0"
                step="any"
                value={row.amount}
                onChange={(e) => updateIngredientRow(index, { amount: e.target.value })}
                placeholder="Кількість"
                disabled={row.unit === 'за смаком'}
              />
              <select
                className="ingredientUnit"
                value={row.unit}
                onChange={(e) => updateIngredientRow(index, { unit: e.target.value })}
              >
                {ALLOWED_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
              <button
                className="btn btnSecondary ingredientRemove"
                type="button"
                onClick={() => removeIngredientRow(index)}
                disabled={busy || ingredientRows.length <= 1}
                aria-label="Видалити інгредієнт"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {fieldErrors.ingredients ? <span className="fieldError">{fieldErrors.ingredients}</span> : null}
      </div>

      <label className="field">
        <span className="label">Інструкції</span>
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={6} maxLength={8000} />
        {fieldErrors.instructions ? <span className="fieldError">{fieldErrors.instructions}</span> : null}
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
          {fieldErrors.cookingTime ? <span className="fieldError">{fieldErrors.cookingTime}</span> : null}
        </label>

        <label className="field">
          <span className="label">Зображення</span>
          <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleImageChange} />
          {fieldErrors.image ? <span className="fieldError">{fieldErrors.image}</span> : null}
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
            <span className="hint">JPG/PNG/GIF/WEBP, до 5 МБ.</span>
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
