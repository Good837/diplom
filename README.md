# TastyHub

Україномовна вебплатформа для пошуку, публікації та обміну кулінарними рецептами. Клієнт‑серверна архітектура: **Flask REST API** + **React SPA**.

## Можливості

- **Каталог рецептів** — пошук за назвою, фільтри за категорією, часом приготування та інгредієнтами; сортування за датою, рейтингом і популярністю
- **Структуровані інгредієнти** — кількість, одиниця виміру; автодоповнення назв при створенні рецепта
- **Модерація рецептів** — нові та відредаговані рецепти потрапляють у статус `pending`; після схвалення адміністратором з’являються в публічному каталозі
- **Оцінки та коментарі** — зірковий рейтинг (1–5), обговорення під рецептами
- **Особистий кабінет** — профіль, аватар, приватний режим, власні рецепти з відображенням статусу модерації
- **Улюблені** та **список покупок** — збереження рецептів і планування закупівель
- **Реєстрація з підтвердженням email** — лист із посиланням для активації облікового запису
- **Адмін‑панель** — категорії, користувачі, рецепти, черга модерації, коментарі

## Технології

| Шар | Стек |
| --- | --- |
| Backend | Python 3.10+, Flask 3.x, Flask-JWT-Extended, **bcrypt** |
| База даних | PostgreSQL 14+ (SQLAlchemy + Alembic); для локальної розробки також підходить SQLite через `DATABASE_URL` |
| Frontend | React 19, React Router 7, **Axios** |
| Мова інтерфейсу | Українська (UTF‑8) |

## Структура проєкту

```
tastyhub/
├── backend/           # Flask API, моделі, міграції
│   ├── app/
│   ├── migrations/
│   └── run.py
├── frontend/          # React SPA
│   └── src/
├── uploads/           # Завантажені зображення (аватари, фото рецептів)
└── .env.example       # Зразок змінних середовища
```

## Вимоги

- Python 3.10+ (рекомендовано 3.11+)
- Node.js 18+ (краще 20+)
- PostgreSQL 14+ або SQLite для локальної розробки

## Швидкий старт

### 1. База даних (PostgreSQL)

```sql
CREATE DATABASE tastyhub;
```

### 2. Backend

**Змінні середовища.** Скопіюйте `.env.example` у `backend/.env` і заповніть значення:

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@localhost:5432/tastyhub
JWT_SECRET_KEY=change_me
CORS_ORIGINS=http://localhost:3000

# Підтвердження email — Gmail (локально, SMTP)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASSWORD=your_16_char_app_password
EMAIL_FROM=TastyHub <you@gmail.com>
SMTP_USE_TLS=true
SMTP_USE_SSL=false
FRONTEND_URL=http://localhost:3000

# Опційно: завантаження зображень
UPLOAD_DIR=../uploads
MAX_UPLOAD_MB=5
```

`FRONTEND_URL` — адреса React-додатку для посилання в листі (`/verify-email?token=...`).

#### Підтвердження email через Gmail

1. Увімкніть **двофакторну автентифікацію** в [Google Account](https://myaccount.google.com/security).
2. Перейдіть: Security → **App passwords** (Паролі додатків).
3. Створіть пароль для «Mail» / «Other (TastyHub)» — 16 символів без пробілів.
4. У `backend/.env` вкажіть Gmail-адресу в `SMTP_USER` і `EMAIL_FROM` (вони мають збігатися). У `SMTP_PASSWORD` — App Password, **не** звичайний пароль від акаунта.

#### Підтвердження email через Brevo (Render free tier)

На **безкоштовному Render** SMTP-порти (587, 465) закриті — Gmail SMTP не працює. Використовуйте **Brevo HTTP API** (безкоштовно ~300 листів/день):

1. Зареєструйтесь на [brevo.com](https://www.brevo.com).
2. **Settings → Senders** — додайте Gmail і підтвердьте з листа.
3. **SMTP & API → API Keys** — створіть ключ (`xkeysib-...`).
4. На Render задайте:

```env
EMAIL_PROVIDER=brevo
BREVO_API_KEY=xkeysib-ваш_ключ
EMAIL_FROM=TastyHub <ваш@gmail.com>
FRONTEND_URL=https://ваш-сайт.vercel.app
```

`EMAIL_FROM` має збігатися з підтвердженим відправником у Brevo. SMTP-змінні на Render не потрібні.

Для локальної розробки без реальної пошти можна використати [Mailtrap](https://mailtrap.io/) — приклад у [`.env.example`](.env.example).

Альтернатива Gmail на порту 465: `SMTP_PORT=465`, `SMTP_USE_TLS=false`, `SMTP_USE_SSL=true`.

**Залежності та міграції:**

```powershell
python -m pip install -r .\backend\requirements.txt
cd .\backend
flask db upgrade
```

**Демо-дані** (опційно, ідемпотентна команда):

```powershell
flask seed
```

Створює демо-користувача `chef_tastyhub` (email: `chef@tastyhub.local`, пароль: `demo123456`) з ~25 рецептами в 13 категоріях.

**Запуск API:**

```powershell
python .\run.py
```

API: `http://127.0.0.1:5000`

### 3. Frontend

```powershell
cd .\frontend
npm install
```

URL бекенду за замовчуванням: `http://127.0.0.1:5000/api`. За потреби створіть `frontend/.env`:

```env
REACT_APP_API_URL=http://127.0.0.1:5000/api
```

```powershell
npm start
```

Фронтенд: `http://localhost:3000`

## Маршрути фронтенду

| Шлях | Опис |
| --- | --- |
| `/` | Головна — каталог, фільтри, створення рецепта |
| `/recipes/:id` | Сторінка рецепта |
| `/favorites` | Улюблені рецепти |
| `/shopping-list` | Список покупок |
| `/me` | Мій профіль |
| `/u/:username` | Публічний профіль користувача |
| `/login`, `/register`, `/verify-email` | Авторизація та підтвердження email |
| `/admin` | Адмін‑панель (лише для `is_admin`) |

## Основні ендпоінти API

| Метод | Шлях | Опис |
| --- | --- | --- |
| `GET` | `/api/health` | Перевірка стану |
| `POST` | `/api/auth/register` | Реєстрація (лист підтвердження) |
| `POST` | `/api/auth/verify-email` | Підтвердження email |
| `POST` | `/api/auth/resend-verification` | Повторне надсилання листа |
| `POST` | `/api/auth/login` | Вхід (після підтвердження email) |
| `GET` | `/api/auth/me` | Поточний користувач (JWT) |
| `GET` | `/api/categories` | Список категорій |
| `POST` | `/api/categories` | Створення категорії (JWT, адмін) |
| `GET` | `/api/recipes` | Каталог: `q`, `ingredient` / `ingredients`, `category_id` (один або кілька через кому, OR), `time` (пресети `under15`, `15-30`, `30-45`, `45-60`, `60-90`, `90-120`, `over120` та сумісні `under30`, `30-60`, `over60` — через кому, OR), `cooking_time_min`, `cooking_time_max` (якщо `time` не задано), `sort` (`newest`, `oldest`, `title`, `rating`, `popular`), `owner=me`, `page`, `per_page` |
| `POST` | `/api/recipes` | Створення рецепта → статус `pending` (JWT) |
| `PUT` | `/api/recipes/<id>` | Редагування → повторна модерація (JWT, власник) |
| `DELETE` | `/api/recipes/<id>` | Видалення (JWT, власник або адмін) |
| `GET` | `/api/recipes/<id>/comments` | Коментарі до рецепта |
| `POST` | `/api/recipes/<id>/comments` | Додати коментар (JWT) |
| `PUT` / `DELETE` | `/api/recipes/<id>/rating` | Оцінка рецепта (JWT) |
| `POST` / `DELETE` | `/api/recipes/<id>/save` | Улюблені (JWT) |
| `GET` | `/api/ingredients` | Усі унікальні назви інгредієнтів |
| `GET` | `/api/ingredients/suggest?q=` | Автодоповнення інгредієнтів |
| `GET` / `PUT` | `/api/users/me` | Профіль поточного користувача (JWT) |
| `GET` | `/api/users/me/saved` | Збережені рецепти (JWT) |
| `GET` | `/api/users/<username>` | Публічний профіль |
| `GET` | `/api/users` | Список користувачів (JWT, адмін) |
| `GET` / `POST` / `DELETE` | `/api/shopping-list` | Список покупок (JWT) |
| `POST` | `/api/uploads/avatar` | Завантаження аватара (JWT) |
| `POST` | `/api/uploads/recipe-image` | Завантаження фото рецепта (JWT) |
| `GET` | `/api/admin/comments` | Модерація коментарів (JWT, адмін) |
| `GET` | `/api/admin/recipes/pending` | Черга модерації рецептів (JWT, адмін) |
| `POST` | `/api/admin/recipes/<id>/approve` | Схвалити рецепт (JWT, адмін) |
| `POST` | `/api/admin/recipes/<id>/reject` | Відхилити рецепт (JWT, адмін) |

## Адміністратор

Прапорець `is_admin` задається в базі даних. Після реєстрації призначте його вручну, наприклад:

```sql
UPDATE users SET is_admin = true WHERE username = 'your_username';
```

Після цього стає доступною сторінка `/admin` і відповідні API-ендпоінти.

## Деплой (Render + Vercel)

### Чому зникають зображення на Render

Файлова система контейнера Render **ефемерна**: після деплою або рестарту файли в `uploads/` зникають, хоча в базі лишаються шляхи `/uploads/...`. Для production **обов'язково** налаштуйте **Cloudinary** (безкоштовний план) — нові завантаження зберігаються назавжди як `https://res.cloudinary.com/...`.

Старі биті посилання `/uploads/...` у БД не відновлюються автоматично — перезавантажте фото рецептів і аватарки, або очистіть їх у SQL:

```sql
UPDATE recipes SET image_url = NULL WHERE image_url LIKE '/uploads/%';
UPDATE users SET avatar_url = NULL WHERE avatar_url LIKE '/uploads/%';
```

### Backend на Render

У Web Service → **Environment** задайте пошту (Brevo), Cloudinary і production-URL фронтенду.

**Пошта через Brevo** (рекомендовано на free tier — SMTP на Render не працює):

| Змінна | Значення |
| --- | --- |
| `EMAIL_PROVIDER` | `brevo` |
| `BREVO_API_KEY` | API ключ з [Brevo](https://www.brevo.com) (`xkeysib-...`) |
| `EMAIL_FROM` | `TastyHub <ваша_адреса@gmail.com>` — підтверджений sender у Brevo |
| `FRONTEND_URL` | URL Vercel, напр. `https://tastyhub.vercel.app` (без `/` в кінці) |
| `CORS_ORIGINS` | URL Vercel + `http://localhost:3000` через кому |
| `CLOUDINARY_CLOUD_NAME` | з [Cloudinary Dashboard](https://cloudinary.com/console) |
| `CLOUDINARY_API_KEY` | API Key |
| `CLOUDINARY_API_SECRET` | API Secret |

Локально можна залишити `EMAIL_PROVIDER=smtp` з Gmail (див. розділ вище).

Після зміни змінних виконайте **Manual Deploy**. Якщо листи не надходять — перевірте логи Render (Brevo API errors).

### Frontend на Vercel

У `frontend/vercel.json` налаштовано SPA rewrite. У Vercel → **Environment Variables** (обов'язково для production):

```env
REACT_APP_API_URL=https://your-render-api.onrender.com/api
```

Без цієї змінної зображення та API звертаються до `http://127.0.0.1:5000`. Після додавання змінної виконайте **Redeploy** на Vercel.

Переконайтесь, що `FRONTEND_URL` на Render збігається з фактичним доменом Vercel — інакше посилання підтвердження в листі веде на `localhost`.
