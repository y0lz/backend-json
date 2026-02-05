const fs = require('fs');
const path = require('path');

console.log('🚀 Supabase Setup Wizard для marakasi-01');
console.log('=====================================');
console.log('');

// Проверяем текущие переменные окружения
const envPath = path.join(__dirname, '.env');
let envContent = '';

try {
    envContent = fs.readFileSync(envPath, 'utf8');
} catch (error) {
    console.error('❌ Не удалось прочитать .env файл:', error.message);
    process.exit(1);
}

console.log('📋 Текущая конфигурация:');
console.log('');

// Парсим текущие значения
const currentConfig = {};
envContent.split('\n').forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        currentConfig[key] = value;
    }
});

// Показываем текущие значения
const configItems = [
    { key: 'SUPABASE_URL', description: 'Project URL', example: 'https://abcdefghijk.supabase.co' },
    { key: 'SUPABASE_ANON_KEY', description: 'Anon/Public Key', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Service Role Key', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
];

let needsSetup = false;

configItems.forEach(item => {
    const currentValue = currentConfig[item.key] || 'не установлено';
    const isPlaceholder = currentValue.includes('your-') || currentValue === 'не установлено';
    
    console.log(`${item.key}:`);
    console.log(`  Описание: ${item.description}`);
    console.log(`  Текущее значение: ${isPlaceholder ? '❌ ' + currentValue : '✅ установлено'}`);
    console.log(`  Пример: ${item.example}`);
    console.log('');
    
    if (isPlaceholder) {
        needsSetup = true;
    }
});

if (needsSetup) {
    console.log('⚠️  ТРЕБУЕТСЯ НАСТРОЙКА SUPABASE');
    console.log('');
    console.log('📝 Инструкции по настройке:');
    console.log('');
    console.log('1. Перейдите на https://supabase.com');
    console.log('2. Создайте новый проект или войдите в существующий');
    console.log('3. В настройках проекта найдите:');
    console.log('   - Project URL (в разделе General)');
    console.log('   - API Keys (в разделе API)');
    console.log('     * anon/public key');
    console.log('     * service_role key (секретный!)');
    console.log('');
    console.log('4. Обновите файл backend-json/.env:');
    console.log('');
    console.log('SUPABASE_URL=https://your-project-ref.supabase.co');
    console.log('SUPABASE_ANON_KEY=your-anon-key');
    console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
    console.log('');
    console.log('5. Создайте таблицы в Supabase SQL Editor (см. SUPABASE_MIGRATION_GUIDE.md)');
    console.log('');
    console.log('6. Создайте Storage bucket с именем "data"');
    console.log('');
    console.log('7. Запустите тесты: npm run test:supabase');
    console.log('');
    console.log('❗ ВАЖНО: Не делитесь service_role ключом - он дает полный доступ к базе!');
} else {
    console.log('✅ Конфигурация выглядит корректно!');
    console.log('');
    console.log('🔄 Запускаем тест подключения...');
    
    // Запускаем тест
    require('./test-supabase.js');
}

console.log('');
console.log('📚 Дополнительная документация:');
console.log('- SUPABASE_MIGRATION_GUIDE.md - подробные инструкции');
console.log('- MIGRATION_COMPLETE_SUMMARY.md - обзор изменений');
console.log('');
console.log('🆘 Нужна помощь? Проверьте логи сервера и документацию Supabase.');