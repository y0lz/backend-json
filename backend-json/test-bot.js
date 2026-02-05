const TelegramBot = require('node-telegram-bot-api')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const token = process.env.TELEGRAM_BOT_TOKEN

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN не найден в .env')
  process.exit(1)
}

console.log('🚀 Запуск тестового бота...')
console.log('📱 Токен:', token.substring(0, 10) + '...')

// Создаем бота с обработкой ошибок
const bot = new TelegramBot(token, { 
  polling: {
    interval: 1000,
    autoStart: true,
    params: {
      timeout: 10
    }
  }
})

// Обработка ошибок polling
bot.on('polling_error', (error) => {
  console.error('❌ Ошибка polling:', error.code, error.message)
  if (error.code === 'EFATAL') {
    console.error('💀 Критическая ошибка, перезапуск...')
    process.exit(1)
  }
})

// Обработка ошибок webhook
bot.on('webhook_error', (error) => {
  console.error('❌ Ошибка webhook:', error.message)
})

// Простой обработчик для тестирования
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id
  console.log('📨 Получена команда /start от:', msg.from.first_name, 'ID:', msg.from.id)
  
  try {
    await bot.sendMessage(chatId, '✅ Бот работает! Привет, ' + (msg.from.first_name || 'пользователь') + '!')
    console.log('✅ Ответ отправлен')
  } catch (error) {
    console.error('❌ Ошибка отправки сообщения:', error.message)
  }
})

bot.onText(/\/test/, async (msg) => {
  const chatId = msg.chat.id
  console.log('📨 Получена команда /test от:', msg.from.first_name)
  
  try {
    await bot.sendMessage(chatId, '🧪 Тест успешен!')
    console.log('✅ Тест ответ отправлен')
  } catch (error) {
    console.error('❌ Ошибка отправки тест сообщения:', error.message)
  }
})

bot.on('message', (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return
  console.log('📨 Получено сообщение:', msg.text, 'от:', msg.from.first_name)
})

// Проверяем подключение
bot.getMe().then((botInfo) => {
  console.log('✅ Бот подключен успешно!')
  console.log('🤖 Имя бота:', botInfo.first_name)
  console.log('🆔 Username:', '@' + botInfo.username)
  console.log('🔗 Отправьте /start или /test боту')
  console.log('⏸️  Нажмите Ctrl+C для остановки')
}).catch((error) => {
  console.error('❌ Ошибка подключения к боту:', error.message)
  process.exit(1)
})

// Обработка завершения
process.on('SIGINT', () => {
  console.log('\n🛑 Остановка бота...')
  bot.stopPolling()
  process.exit(0)
})