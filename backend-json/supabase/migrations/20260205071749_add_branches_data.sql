-- Обновление данных филиалов с правильными адресами и телефонами
UPDATE taxi_branches SET 
    address = 'ул. Васильева, 123',
    phone = '+7 (999) 123-45-67'
WHERE id = '8395781a-b9c3-49bc-90ad-3fd443e0df41';

UPDATE taxi_branches SET 
    address = 'ул. Каширина, 456', 
    phone = '+7 (999) 234-56-78'
WHERE id = '24470e55-b9c3-49bc-90ad-3fd443e0df42';

UPDATE taxi_branches SET 
    address = 'ул. Ялтинская, 789',
    phone = '+7 (999) 345-67-89' 
WHERE id = '219c4e43-b9c3-49bc-90ad-3fd443e0df43';