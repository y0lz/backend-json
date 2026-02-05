const TelegramBot = require('node-telegram-bot-api')
const SupabaseDataSyncService = require('./src/services/SupabaseDataSyncService')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const token = process.env.TELEGRAM_BOT_TOKEN

async function startDebugBot() {
  try {
    console.log('🚀 Запуск отладочного бота...')
    
    // Инициализируем Supabase
    console.log('🔄 Инициализация Supabase...')
    const isInitialized = await SupabaseDataSyncService.initialize()
    
    if (!isInitialized) {
      console.error('❌ Не удалось инициализировать Supabase')
      return
    }
    
    console.log('✅ Supabase готов')
    
    // Создаем бота
    const bot = new TelegramBot(token, { polling: true })
    
    // Обработка ошибок
    bot.on('polling_error', (error) => {
      console.error('❌ Ошибка polling:', error.message)
    })
    
    // Простой обработчик /start с Supabase
    bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id
      const telegramId = msg.from.id.toString()
      const firstName = msg.from.first_name || ''
      
      console.log('📨 Получена команда /start от:', firstName, 'ID:', telegramId)
      
      try {
        // Проверяем пользователя в Supabase
        const user = await SupabaseDataSyncService.getUserByTelegramId(telegramId)
        
        if (user) {
          console.log('👤 Найден пользователь:', user.full_name || user.fullName)
          await bot.sendMessage(chatId, 
            `👋 Привет, ${user.full_name || user.fullName}! Вы уже зарегистрированы.\n\n` +
            `📋 Роль: ${user.role}\n` +
            `🏢 Филиал: ${user.branch_id || user.branchId}\n\n` +
            `Используйте /menu для доступа к функциям`
          )
        } else {
          console.log('🆕 Новый пользователь, начинаем регистрацию')
          
          // Получаем филиалы
          const branches = await SupabaseDataSyncService.getBranches()
          console.log('🏢 Найдено филиалов:', branches.length)
          
          await bot.sendMessage(chatId, 
            `👋 Добро пожаловать, ${firstName}!\n\n` +
            `🆕 Вы новый пользователь. Начинаем регистрацию...\n\n` +
            `📋 Доступно филиалов: ${branches.length}\n` +
            `🔧 Для полной регистрации используйте веб-интерфейс или обратитесь к администратору.`
          )
        }
        
      } catch (error) {
        console.error('❌ Ошибка обработки /start:', error.message)
        await bot.sendMessage(chatId, '❌ Произошла ошибка при обработке команды. Попробуйте позже.')
      }
    })
    
    // Обработчик /menu
    bot.onText(/\/menu/, async (msg) => {
      const chatId = msg.chat.id
      const telegramId = msg.from.id.toString()
      
      console.log('📨 Получена команда /menu от:', msg.from.first_name)
      
      try {
        const user = await SupabaseDataSyncService.getUserByTelegramId(telegramId)
        
        if (!user) {
          await bot.sendMessage(chatId, '❌ Вы не зарегистрированы. Отправьте /start для регистрации.')
          return
        }
        
        await bot.sendMessage(chatId, 
          `📋 Главное меню\n\n` +
          `👤 ${user.full_name || user.fullName}\n` +
          `📋 Роль: ${user.role}\n\n` +
          `Доступные команды:\n` +
          `/status - Текущий статус\n` +
          `/shift - Управление сменой`
        )
        
      } catch (error) {
        console.error('❌ Ошибка обработки /menu:', error.message)
        await bot.sendMessage(chatId, '❌ Произошла ошибка при обработке команды.')
      }
    })
    
    // Обработчик /status
    bot.onText(/\/status/, async (msg) => {
      const chatId = msg.chat.id
      const telegramId = msg.from.id.toString()
      
      console.log('📨 Получена команда /status от:', msg.from.first_name)
      
      try {
        const user = await SupabaseDataSyncService.getUserByTelegramId(telegramId)
        
        if (!user) {
          await bot.sendMessage(chatId, '❌ Вы не зарегистрированы. Отправьте /start для регистрации.')
          return
        }
        
        // Проверяем смену
        const hasShift = await SupabaseDataSyncService.hasUserShiftToday(user.id)
        
        // Получаем назначения
        const assignments = await SupabaseDataSyncService.getTodayAssignments()
        const userAssignments = assignments.filter(a => 
          a.courierId === user.id || a.passengerId === user.id
        )
        
        await bot.sendMessage(chatId, 
          `📊 Ваш статус\n\n` +
          `👤 ${user.full_name || user.fullName}\n` +
          `📋 Роль: ${user.role}\n` +
          `🚗 Смена: ${hasShift ? '✅ Активна' : '❌ Не открыта'}\n` +
          `📋 Назначений сегодня: ${userAssignments.length}`
        )
        
      } catch (error) {
        console.error('❌ Ошибка обработки /status:', error.message)
        await bot.sendMessage(chatId, '❌ Произошла ошибка при обработке команды.')
      }
    })
    
    // Обработка всех сообщений для отладки
    bot.on('message', (msg) => {
      if (msg.text && !msg.text.startsWith('/')) {
        console.log('📨 Получено сообщение:', msg.text, 'от:', msg.from.first_name)
      }
    })
    
    console.log('✅ Отладочный бот запущен!')
    console.log('🔗 Попробуйте команды: /start, /menu, /status')
    
  } catch (error) {
    console.error('❌ Ошибка запуска отладочного бота:', error.message)
  }
}

startDebugBot()

// Обработка завершения
process.on('SIGINT', () => {
  console.log('\n🛑 Остановка отладочного бота...')
  process.exit(0)
})