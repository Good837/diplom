# TastyHub

Full‑stack вебзастосунок для керування рецептами.

- **Backend**: Python Flask (REST API), JWT
- **DB**: PostgreSQL (SQLAlchemy ORM + Alembic/Flask‑Migrate)
- **Frontend**: React (Create React App)
- **Мова інтерфейсу**: українська
- **Кодування**: UTF‑8

## Вимоги

- Python 3.11+ (працює з 3.13)
- Node.js 18+ (краще 20+)
- PostgreSQL 14+

## 1) Налаштування PostgreSQL

Створіть базу даних (приклад у `psql`):

```sql
CREATE DATABASE tastyhub;
```

Створіть користувача або використайте існуючого.

## 2) Backend (Flask API)

### 2.1. Змінні середовища

Скопіюйте файл `[backend/.env.example](backend/.env.example)` у `backend/.env` і заповніть:

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@localhost:5432/tastyhub
JWT_SECRET_KEY=change_me
CORS_ORIGINS=http://localhost:3000
```

### 2.2. Встановлення залежностей

У PowerShell (з кореня репозиторію):

```powershell
python -m pip install -r .\backend\requirements.txt
```

### 2.3. Міграції

> Примітка: перша міграція вже додана вручну (без автогенерації), тому достатньо виконати `upgrade`.

```powershell
cd .\backend
flask db upgrade
```

### 2.4. Запуск API

```powershell
cd .\backend
python .\run.py
```

API буде доступний на `http://127.0.0.1:5000`.

Корисні ендпоінти:

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (JWT)
- `GET /api/categories`
- `POST /api/categories` (JWT)
- `GET /api/recipes` (пошук/фільтри)
- `POST /api/recipes` (JWT)
- `PUT /api/recipes/<id>` (JWT, лише власник)
- `DELETE /api/recipes/<id>` (JWT, лише власник)

## 3) Frontend (React)

### 3.1. Встановлення залежностей

```powershell
cd .\frontend
npm install
```

### 3.2. (Опційно) URL бекенду

За замовчуванням фронтенд очікує API тут: `http://127.0.0.1:5000/api`.

Якщо потрібно змінити:

```powershell
$env:REACT_APP_API_URL="http://127.0.0.1:5000/api"
npm start
```

Або створіть файл `frontend/.env`:

```env
REACT_APP_API_URL=http://127.0.0.1:5000/api
```

### 3.3. Запуск

```powershell
cd .\frontend
npm start
```

Фронтенд відкриється на `http://localhost:3000`.

## Мінімальний тест‑план

1. Зареєструйте користувача (сторінка **Реєстрація**), потім увійдіть (**Увійти**).
2. Додайте категорію на **Головна**.
3. Створіть рецепт (кнопка **Створити рецепт**).
4. Перейдіть у **Деталі** та спробуйте **Редагувати/Видалити** як власник.
5. Вийдіть, зайдіть іншим користувачем та перевірте, що чужий рецепт **не** можна редагувати/видаляти.

