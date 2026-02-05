const TaxiTelegramBot = require('./TelegramBot')
const SupabaseDataSyncService = require('../services/SupabaseDataSyncService')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env') })

// Получаем токен из переменных окружения
const botToken = process.env.TELEGRAM_BOT_TOKEN

if (!botToken || botToken === 'YOUR_BOT_TOKEN_HERE') {
  console.error('❌ Токен Telegram бота не настроен!')
  console.log('📝 Инструкция по настройке:')
  console.log('1. Создайте бота через @BotFather в Telegram')
  console.log('2. Получите токен бота')
  console.log('3. Обновите файл backend-json/.env:')
  console.log('   TELEGRAM_BOT_TOKEN=ВАШ_ТОКЕН_ЗДЕСЬ')
  process.exit(1)
}

// Инициализируем сервисы и запускаем бота
async function startBot() {
  try {
    console.log('🚀 Запуск Telegram бота...')
    console.log('📱 Токен:', botToken.substring(0, 10) + '...')
    
    // Инициализируем Supabase сервис
    console.log('🔄 Инициализация Supabase...')
    const isInitialized = await SupabaseDataSyncService.initialize()
    
    if (!isInitialized) {
      console.error('❌ Не удалось инициализировать Supabase')
      process.exit(1)
    }
    
    console.log('✅ Supabase инициализирован')
    
    // Запускаем бота
    const bot = new TaxiTelegramBot(botToken)
    
    // Проверяем подключение к Telegram
    const botInfo = await bot.bot.getMe()
    console.log('🤖 Бот подключен:', botInfo.first_name, '@' + botInfo.username)
    
    console.log('✅ Telegram бот успешно запущен!')
    console.log('📋 Доступные команды:')
    console.log('   /start - Регистрация новых пользователей')
    console.log('   /menu - Главное меню')
    console.log('   /shift - Управление сменой (курьеры)')
    console.log('   /status - Текущий статус и назначения')
    console.log('')
    console.log('🔗 Найдите вашего бота в Telegram и отправьте /start')
    console.log('⏸️  Нажмите Ctrl+C для остановки бота')
    
    // Держим процесс активным
    setInterval(() => {
      // Проверяем состояние каждые 30 секунд
    }, 30000)
    
  } catch (error) {
    console.error('❌ Ошибка запуска бота:', error.message)
    process.exit(1)
  }
}

// Запускаем бота
startBot()

// Обработка завершения процесса
process.on('SIGINT', () => {
  console.log('\n🛑 Остановка Telegram бота...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Остановка Telegram бота...')
  process.exit(0)
})