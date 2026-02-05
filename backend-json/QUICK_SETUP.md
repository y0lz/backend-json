# 🚀 Быстрая настройка Supabase для marakasi-01

## ✅ Статус
- Подключение к Supabase: ✅ Работает
- Storage bucket: ✅ Создан
- JSON файлы: ✅ Мигрированы
- Таблицы PostgreSQL: ⚠️ Нужно создать

## 📋 Создание таблиц (ОБЯЗАТЕЛЬНО)

1. Откройте https://supabase.com/dashboard
2. Выберите проект `huwwnqizbgwvdzkcokyj`
3. Перейдите в **SQL Editor**
4. Создайте новый запрос и выполните следующий SQL:

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

-- Создание индексов
CREATE INDEX idx_taxi_users_telegram_id ON taxi_users(telegram_id);
CREATE INDEX idx_taxi_users_role ON taxi_users(role);
CREATE INDEX idx_taxi_shifts_date ON taxi_shifts(date);
CREATE INDEX idx_taxi_assignments_date ON taxi_assignments(date);

-- Добавление тестовых филиалов
INSERT INTO taxi_branches (id, name, address, phone, is_active) VALUES 
('8395781a-b9c3-49bc-90ad-3fd443e0df41', 'Васильева', 'ул. Васильева, 123', '+7 (999) 123-45-67', true),
('24470e55-b9c3-49bc-90ad-3fd443e0df42', 'Каширина', 'ул. Каширина, 456', '+7 (999) 234-56-78', true),
('219c4e43-b9c3-49bc-90ad-3fd443e0df43', 'Ялтинская', 'ул. Ялтинская, 789', '+7 (999) 345-67-89', true);
```

5. Нажмите **RUN** для выполнения

## 🧪 После создания таблиц

Запустите финальный тест:
```bash
npm run test:supabase
```

Если все работает, запустите сервер:
```bash
npm start
```

## ✅ Готово!

После выполнения SQL у вас будет:
- 4 таблицы в PostgreSQL
- 3 тестовых филиала
- Storage bucket с JSON файлами
- Полностью рабочая система на Supabase