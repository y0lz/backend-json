-- Полная очистка и пересоздание таблиц для taxi management system

-- Удаление всех существующих таблиц и связанных объектов
DROP TABLE IF EXISTS taxi_assignments CASCADE;
DROP TABLE IF EXISTS taxi_shifts CASCADE;
DROP TABLE IF EXISTS taxi_users CASCADE;
DROP TABLE IF EXISTS taxi_branches CASCADE;

-- Удаление функций и триггеров если они существуют
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Создание функции для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание таблицы филиалов (создаем первой, так как на неё ссылаются другие)
CREATE TABLE taxi_branches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы пользователей
CREATE TABLE taxi_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    telegram_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('courier', 'passenger', 'admin')),
    branch_id UUID REFERENCES taxi_branches(id),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    position TEXT,
    work_until TEXT,
    car_model TEXT,
    car_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
CREATE INDEX idx_taxi_users_branch_id ON taxi_users(branch_id);
CREATE INDEX idx_taxi_shifts_date ON taxi_shifts(date);
CREATE INDEX idx_taxi_shifts_user_id ON taxi_shifts(user_id);
CREATE INDEX idx_taxi_shifts_branch_id ON taxi_shifts(branch_id);
CREATE INDEX idx_taxi_assignments_date ON taxi_assignments(date);
CREATE INDEX idx_taxi_assignments_courier_id ON taxi_assignments(courier_id);
CREATE INDEX idx_taxi_assignments_passenger_id ON taxi_assignments(passenger_id);
CREATE INDEX idx_taxi_assignments_branch_id ON taxi_assignments(branch_id);
CREATE INDEX idx_taxi_assignments_status ON taxi_assignments(status);

-- Создание триггера для автоматического обновления updated_at
CREATE TRIGGER update_taxi_users_updated_at 
    BEFORE UPDATE ON taxi_users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Включение Row Level Security (RLS) для безопасности
ALTER TABLE taxi_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxi_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxi_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxi_assignments ENABLE ROW LEVEL SECURITY;

-- Создание политик доступа (разрешаем все операции для service_role)
CREATE POLICY "Enable all operations for service role" ON taxi_users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all operations for service role" ON taxi_branches
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all operations for service role" ON taxi_shifts
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all operations for service role" ON taxi_assignments
    FOR ALL USING (auth.role() = 'service_role');

-- Вставка тестовых филиалов
INSERT INTO taxi_branches (id, name, address, phone, is_active) 
VALUES 
    ('8395781a-b9c3-49bc-90ad-3fd443e0df41', 'Васильева', 'ул. Васильева, 123', '+7 (999) 123-45-67', true),
    ('24470e55-b9c3-49bc-90ad-3fd443e0df42', 'Каширина', 'ул. Каширина, 456', '+7 (999) 234-56-78', true),
    ('219c4e43-b9c3-49bc-90ad-3fd443e0df43', 'Ялтинская', 'ул. Ялтинская, 789', '+7 (999) 345-67-89', true);

-- Создание тестового администратора
INSERT INTO taxi_users (telegram_id, full_name, role, branch_id, is_active)
VALUES ('123456789', 'Администратор Системы', 'admin', '8395781a-b9c3-49bc-90ad-3fd443e0df41', true);

-- Проверка созданных таблиц
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename LIKE 'taxi_%'
ORDER BY tablename;