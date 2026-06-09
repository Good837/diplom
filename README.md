# TastyHub



Україномовна вебплатформа для систематизації кулінарних рецептів (клієнт‑сервер: Flask REST API + React SPA).



- **Backend**: Python Flask 3.x, JWT, **bcrypt** для паролів

- **DB**: PostgreSQL (SQLAlchemy ORM + Alembic/Flask‑Migrate); також допустимий SQLite через `DATABASE_URL`

- **Frontend**: React 18+, **Axios** для HTTP

- **Мова інтерфейсу**: українська

- **Кодування**: UTF‑8





- Python 3.10+ (рекомендовано 3.11+)

- Node.js 18+ (краще 20+)

- PostgreSQL 14+ (або SQLite для локальної розробки)



## 1) Налаштування PostgreSQL



Створіть базу даних (приклад у `psql`):



```sql

CREATE DATABASE tastyhub;

```



## 2) Backend (Flask API)



### 2.1. Змінні середовища



Скопіюйте `backend/.env.example` у `backend/.env`:



```env

DATABASE_URL=postgresql+psycopg://USER:PASSWORD@localhost:5432/tastyhub

JWT_SECRET_KEY=change_me

CORS_ORIGINS=http://localhost:3000

SMTP_HOST=sandbox.smtp.mailtrap.io

SMTP_PORT=587

SMTP_USER=your_mailtrap_user

SMTP_PASSWORD=your_mailtrap_password

SMTP_FROM=TastyHub <noreply@tastyhub.local>

SMTP_USE_TLS=true

FRONTEND_URL=http://localhost:3000

```

Для підтвердження email при реєстрації потрібен робочий SMTP (наприклад [Mailtrap](https://mailtrap.io/) для розробки). `FRONTEND_URL` — адреса React-додатку для посилання в листі (`/verify-email?token=...`).



### 2.2. Залежності



```powershell

python -m pip install -r .\backend\requirements.txt

```



### 2.3. Міграції



```powershell

cd .\backend

flask db upgrade

```



### 2.3.1. Демо-дані (категорії та рецепти)



Після міграцій можна заповнити каталог демо-даними:



```powershell

cd .\backend

flask seed

```



Команда **ідемпотентна**: додає лише відсутні категорії та рецепти. Створює демо-користувача `chef_tastyhub` (email: `chef@tastyhub.local`, пароль: `demo123456`) з ~25 рецептами в 13 категоріях.



### 2.4. Запуск API



```powershell

cd .\backend

python .\run.py

```



API: `http://127.0.0.1:5000`



Основні ендпоінти:



- `GET /api/health`

- `POST /api/auth/register` (лист підтвердження), `POST /api/auth/verify-email`, `POST /api/auth/resend-verification`, `POST /api/auth/login` (лише після підтвердження email), `GET /api/auth/me` (JWT)

- `GET /api/categories`, `POST /api/categories` (JWT, адмін)

- `GET /api/recipes` — параметри `q` (назва), `ingredient`, `category_id`, `cooking_time_min`, `cooking_time_max`, `sort=newest|rating|popular`, `page`, `per_page` (у відповіді: `rating_avg`, `rating_count`, `my_rating` за JWT)

- `POST|PUT|DELETE /api/recipes` (JWT)

- `GET|POST /api/recipes/<id>/comments`; `PUT|DELETE /api/comments/<id>` (JWT)

- `PUT|DELETE /api/recipes/<id>/rating` (JWT, один голос на користувача)

- `POST|DELETE /api/recipes/<id>/save` (JWT) — улюблені

- `GET /api/users/me`, `PUT /api/users/me` (JWT)

- `GET /api/users/<username>` — публічний профіль (`recipe_count`, `member_since`, рецепти автора)

- `GET /api/users/me/saved` (JWT)

- `GET /api/admin/comments` (JWT, адмін) — модерація коментарів

- `GET|POST|DELETE /api/shopping-list` (JWT) — список покупок; `POST|DELETE /api/shopping-list/recipes/<id>`



## 3) Frontend (React)



### 3.1. Залежності



```powershell

cd .\frontend

npm install

```



(включає **axios**)



### 3.2. URL бекенду



За замовчуванням: `http://127.0.0.1:5000/api`.



```env

REACT_APP_API_URL=http://127.0.0.1:5000/api

```



у файлі `frontend/.env` або через змінну середовища.



### 3.3. Запуск



```powershell

cd .\frontend

npm start

```



Фронтенд: `http://localhost:3000`



Маршрути: `/`, `/favorites`, `/shopping-list`, `/recipes/:id`, `/u/:username`, `/me`, `/login`, `/register`, `/admin`



