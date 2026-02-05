const SupabaseDataSyncService = require('./src/services/SupabaseDataSyncService');

async function testSupabase() {
    console.log('🔍 Тестирование подключения к Supabase...');
    
    try {
        // Инициализация сервиса
        const initialized = await SupabaseDataSyncService.initialize();
        
        if (!initialized) {
            console.error('❌ Не удалось инициализировать Supabase сервис');
            return;
        }
        
        console.log('✅ Supabase сервис инициализирован');
        
        // Получение информации о хранилище
        const storageInfo = SupabaseDataSyncService.getStorageInfo();
        console.log('📊 Информация о хранилище:', storageInfo);
        
        // Получение статистики
        const stats = await SupabaseDataSyncService.getStats();
        console.log('📈 Статистика:', stats);
        
        // Тест получения пользователей
        const users = await SupabaseDataSyncService.getUsers();
        console.log(`👥 Пользователей в системе: ${users.length}`);
        
        // Тест получения филиалов
        const branches = await SupabaseDataSyncService.getBranches();
        console.log(`🏢 Филиалов в системе: ${branches.length}`);
        
        console.log('✅ Все тесты пройдены успешно!');
        
    } catch (error) {
        console.error('❌ Ошибка тестирования:', error.message);
        console.error('💡 Проверьте:');
        console.error('   - Переменные окружения SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY');
        console.error('   - Создание таблиц в Supabase');
        console.error('   - Настройки Storage bucket');
    }
}

// Запуск тестов
testSupabase().then(() => {
    process.exit(0);
}).catch((error) => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
});