# Руководство по миграции с Nhost на Supabase

## ✅ Выполненные изменения

### 1. **Созданы новые сервисы Supabase**
- `SupabaseUserService.js` - работа с пользователями в PostgreSQL
- `SupabaseStorageService.js` - работа с JSON файлами в Supabase Storage
- `SupabaseDataSyncService.js` - координация всех хранилищ

### 2. **Обновлены зависимости**
- ✅ Удален `@nhost/nhost-js`
- ✅ Добавлен `@supabase/supabase-js`
- ✅ Обновлены скрипты в package.json

### 3. **Обновлен сервер**
- ✅ Заменены все импорты на Supabase сервисы
- ✅ Обновлены API endpoints
- ✅ Изменены health check и статус endpoints
- ✅ Обновлен Telegram bot

### 4. **Обновлена конфигурация**
- ✅ Изменены переменные окружения в .env

## 🔧 Необходимые действия пользователя

### 1. **Создать проект Supabase**

1. Перейдите на https://supabase.com
2. Создайте новый проект
3. Запишите следующие данные:
   - Project URL (например: `https://your-project-ref.supabase.co`)
   - Anon/Public Key
   - Service Role Key (секретный ключ)

### 2. **Обновить переменные окружения**

Откройте файл `backend-json/.env` и замените значения:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Data Storage Configuration
PRIMARY_STORAGE=hybrid
SUPABASE_SYNC_ENABLED=true

# Server Configuration
PORT=8848

# Telegram Bot (optional)
TELEGRAM_BOT_TOKEN=8293873506:AAEBf3VY9rJNY6sqfa2i4JU3PARO-MqI--c
```

### 3. **Создать таблицы в Supabase**

Выполните следующие SQL команды в Supabase SQL Editor:

```sql
-- Создание таблицы пользователей
CREATE TABLE taxi_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    telegram_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('courier', 'passenger', 'admin')),
    branch_id UUID,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    position TEXT,
    work_until TEXT,
    car_model TEXT,
    car_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы филиалов
CREATE TABLE taxi_branches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы смен
CREATE TABLE taxi_shifts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES taxi_users(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES taxi_branches(id),
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    is_working BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы назначений
CREATE TABLE taxi_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    courier_id UUID REFERENCES taxi_users(id),
    passenger_id UUID REFERENCES taxi_users(id),
    branch_id UUID REFERENCES taxi_branches(id),
    pickup_address TEXT NOT NULL,
    dropoff_address TEXT NOT NULL,
    assigned_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date DATE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для производительности
CREATE INDEX idx_taxi_users_telegram_id ON taxi_users(telegram_id);
CREATE INDEX idx_taxi_users_role ON taxi_users(role);
CREATE INDEX idx_taxi_shifts_date ON taxi_shifts(date);
CREATE INDEX idx_taxi_shifts_user_id ON taxi_shifts(user_id);
CREATE INDEX idx_taxi_assignments_date ON taxi_assignments(date);
CREATE INDEX idx_taxi_assignments_courier_id ON taxi_assignments(courier_id);
CREATE INDEX idx_taxi_assignments_passenger_id ON taxi_assignments(passenger_id);

-- Создание функции для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание триггера для автоматического обновления updated_at
CREATE TRIGGER update_taxi_users_updated_at BEFORE UPDATE ON taxi_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4. **Настроить Storage Bucket**

1. Перейдите в раздел Storage в Supabase Dashboard
2. Создайте новый bucket с именем `data`
3. Настройте политики доступа (RLS) для bucket

### 5. **Удалить старые зависимости**

```bash
cd backend-json
npm uninstall @nhost/nhost-js
```

### 6. **Перезапустить сервер**

```bash
npm start
```

## 🔄 Процесс миграции данных

После настройки Supabase система автоматически:

1. **Проверит подключение** к Supabase
2. **Мигрирует пользователей** из локальных JSON файлов в PostgreSQL
3. **Перенесет JSON файлы** в Supabase Storage
4. **Очистит локальные файлы** после успешной миграции

## 📊 Новая архитектура

### Гибридное хранилище (Supabase)
```
├── Пользователи → Supabase PostgreSQL
├── JSON файлы → Supabase Storage
├── Кэш → Memory (RAM)
└── Резерв → Локальные файлы
```

### Преимущества Supabase
- ✅ **Реальное время**: WebSocket подключения
- ✅ **Автоматическое масштабирование**
- ✅ **Встроенная аутентификация**
- ✅ **Row Level Security (RLS)**
- ✅ **Автоматические бэкапы**
- ✅ **REST и GraphQL API**
- ✅ **Интеграция с Vercel/Netlify**

## 🔧 Новые API endpoints

### Supabase Status
- `GET /api/supabase/status` - статус подключения
- `POST /api/supabase/test` - тест подключения

### Migration
- `POST /api/sync/migrate-to-supabase` - миграция данных

### Storage
- `GET /api/storage/stats` - статистика хранилища
- `POST /api/storage/upload/avatar/:userId` - загрузка аватаров

## 🚨 Важные изменения

1. **Переменные окружения**: Обязательно обновите .env файл
2. **База данных**: Создайте таблицы в Supabase
3. **Storage**: Настройте bucket для JSON файлов
4. **API endpoints**: Обновлены пути для статуса и тестирования

## 🔍 Проверка работы

После настройки проверьте:

1. **Health check**: `GET /health`
2. **Supabase status**: `GET /api/supabase/status`
3. **Статистика**: `GET /api/stats`
4. **Пользователи**: `GET /api/users`

## 📞 Поддержка

Если возникнут проблемы:

1. Проверьте переменные окружения
2. Убедитесь что таблицы созданы в Supabase
3. Проверьте настройки Storage bucket
4. Посмотрите логи сервера для диагностики

---

**Статус миграции**: ✅ **ГОТОВО К ТЕСТИРОВАНИЮ**
**Следующий шаг**: Настройка Supabase проекта и переменных окружения