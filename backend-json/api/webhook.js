// Telegram webhook endpoint for Vercel
const TelegramBot = require('node-telegram-bot-api')
const SupabaseDataSyncService = require('../src/services/SupabaseDataSyncService')

const token = process.env.TELEGRAM_BOT_TOKEN

let bot
let isInitialized = false

async function initializeServices() {
  if (isInitialized) return true
  
  try {
    console.log('🔄 Инициализация Supabase для webhook...')
    const supabaseReady = await SupabaseDataSyncService.initialize()
    
    if (!supabaseReady) {
      console.error('❌ Supabase не готов')
      return false
    }
    
    console.log('✅ Supabase готов для webhook')
    isInitialized = true
    return true
  } catch (error) {
    console.error('❌ Ошибка инициализации webhook:', error.message)
    return false
  }
}

async function handleTelegramUpdate(update) {
  try {
    if (!bot) {
      bot = new TelegramBot(token)
    }
    
    const message = update.message
    if (!message) return
    
    const chatId = message.chat.id
    const telegramId = message.from.id.toString()
    const text = message.text
    const firstName = message.from.first_name || ''
    
    console.log('📨 Webhook получил сообщение:', text, 'от:', firstName)
    
    // Обработка команд
    if (text === '/start') {
      await handleStartCommand(chatId, telegramId, firstName)
    } else if (text === '/menu') {
      await handleMenuCommand(chatId, telegramId)
    } else if (text === '/status') {
      await handleStatusCommand(chatId, telegramId)
    } else if (text === '/shift') {
      await handleShiftCommand(chatId, telegramId)
    } else {
      // Обычное сообщение
      await bot.sendMessage(chatId, 
        `📝 Получено сообщение: "${text}"\n\n` +
        `Доступные команды:\n` +
        `/start - Начать\n` +
        `/menu - Главное меню\n` +
        `/status - Статус\n` +
        `/shift - Смена`
      )
    }
    
  } catch (error) {
    console.error('❌ Ошибка обработки webhook:', error.message)
  }
}

async function handleStartCommand(chatId, telegramId, firstName) {
  try {
    const user = await SupabaseDataSyncService.getUserByTelegramId(telegramId)
    
    if (user) {
      await bot.sendMessage(chatId, 
        `👋 Привет, ${user.full_name || user.fullName || firstName}! Вы уже зарегистрированы.\n\n` +
        `📋 Роль: ${user.role}\n` +
        `🏢 Филиал: ${user.branch_id || user.branchId}\n\n` +
        `Используйте /menu для доступа к функциям`
      )
    } else {
      const branches = await SupabaseDataSyncService.getBranches()
      await bot.sendMessage(chatId, 
        `👋 Добро пожаловать, ${firstName}!\n\n` +
        `🆕 Вы новый пользователь. Для регистрации обратитесь к администратору.\n\n` +
        `📋 Доступно филиалов: ${branches.length}\n` +
        `🌐 Веб-интерфейс: https://backend-json-azure.vercel.app`
      )
    }
  } catch (error) {
    console.error('❌ Ошибка /start:', error.message)
    await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.')
  }
}

async function handleMenuCommand(chatId, telegramId) {
  try {
    const user = await SupabaseDataSyncService.getUserByTelegramId(telegramId)
    
    if (!user) {
      await bot.sendMessage(chatId, '❌ Вы не зарегистрированы. Отправьте /start')
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
    console.error('❌ Ошибка /menu:', error.message)
    await bot.sendMessage(chatId, '❌ Произошла ошибка.')
  }
}

async function handleStatusCommand(chatId, telegramId) {
  try {
    const user = await SupabaseDataSyncService.getUserByTelegramId(telegramId)
    
    if (!user) {
      await bot.sendMessage(chatId, '❌ Вы не зарегистрированы. Отправьте /start')
      return
    }
    
    const hasShift = await SupabaseDataSyncService.hasUserShiftToday(user.id)
    const assignments = await SupabaseDataSyncService.getTodayAssignments()
    const userAssignments = assignments.filter(a => 
      a.courier_id === user.id || a.passenger_id === user.id ||
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
    console.error('❌ Ошибка /status:', error.message)
    await bot.sendMessage(chatId, '❌ Произошла ошибка.')
  }
}

async function handleShiftCommand(chatId, telegramId) {
  try {
    const user = await SupabaseDataSyncService.getUserByTelegramId(telegramId)
    
    if (!user) {
      await bot.sendMessage(chatId, '❌ Вы не зарегистрированы. Отправьте /start')
      return
    }
    
    if (user.role !== 'courier') {
      await bot.sendMessage(chatId, '❌ Управление сменой доступно только курьерам.')
      return
    }
    
    const hasShift = await SupabaseDataSyncService.hasUserShiftToday(user.id)
    
    if (hasShift) {
      await bot.sendMessage(chatId, '✅ У вас уже есть активная смена на сегодня.')
    } else {
      await bot.sendMessage(chatId, 
        `🚗 Открытие смены\n\n` +
        `Для открытия смены используйте веб-интерфейс:\n` +
        `🌐 https://backend-json-azure.vercel.app\n\n` +
        `Или обратитесь к администратору.`
      )
    }
  } catch (error) {
    console.error('❌ Ошибка /shift:', error.message)
    await bot.sendMessage(chatId, '❌ Произошла ошибка.')
  }
}

module.exports = async (req, res) => {
  // Разрешаем только POST запросы от Telegram
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    // Инициализируем сервисы
    const initialized = await initializeServices()
    if (!initialized) {
      return res.status(500).json({ error: 'Services not initialized' })
    }
    
    // Обрабатываем обновление от Telegram
    await handleTelegramUpdate(req.body)
    
    res.status(200).json({ ok: true })
  } catch (error) {
    console.error('❌ Webhook error:', error.message)
    res.status(500).json({ error: 'Internal server error' })
  }
}