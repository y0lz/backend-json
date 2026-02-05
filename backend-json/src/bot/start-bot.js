const TaxiTelegramBot = require('./TelegramBot')
const fs = require('fs')
const path = require('path')

// Загружаем конфигурацию
const configPath = path.join(__dirname, '../../data/config.json')
let config

try {
  const configData = fs.readFileSync(configPath, 'utf8')
  config = JSON.parse(configData)
} catch (error) {
  console.error('❌ Ошибка загрузки конфигурации:', error.message)
  console.log('📝 Создайте файл config.json с токеном бота')
  process.exit(1)
}

// Проверяем токен бота
const botToken = config.telegram?.botToken

if (!botToken || botToken === 'YOUR_BOT_TOKEN_HERE') {
  console.error('❌ Токен Telegram бота не настроен!')
  console.log('📝 Инструкция по настройке:')
  console.log('1. Создайте бота через @BotFather в Telegram')
  console.log('2. Получите токен бота')
  console.log('3. Обновите файл backend-json/data/config.json:')
  console.log('   "telegram": { "botToken": "ВАШ_ТОКЕН_ЗДЕСЬ" }')
  process.exit(1)
}

// Запускаем бота
console.log('🚀 Запуск Telegram бота...')
console.log('📱 Токен:', botToken.substring(0, 10) + '...')

try {
  const bot = new TaxiTelegramBot(botToken)
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

// Обработка завершения процесса
process.on('SIGINT', () => {
  console.log('\n🛑 Остановка Telegram бота...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Остановка Telegram бота...')
  process.exit(0)
})