// Telegram webhook endpoint for Vercel
const TelegramBot = require('node-telegram-bot-api')
const SupabaseDataSyncService = require('../src/services/SupabaseDataSyncService')

const token = process.env.TELEGRAM_BOT_TOKEN

let bot
let isInitialized = false

// Хранение сессий пользователей (в production лучше использовать Redis)
const userSessions = new Map()

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
    
    // Обработка callback кнопок
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query)
      return
    }
    
    const message = update.message
    if (!message) return
    
    const chatId = message.chat.id
    const telegramId = message.from.id.toString()
    const text = message.text
    const firstName = message.from.first_name || ''
    
    console.log('📨 Webhook получил сообщение:', text, 'от:', firstName)
    
    // Проверяем активную сессию пользователя
    const session = userSessions.get(telegramId)
    
    if (session) {
      await handleSessionResponse(chatId, telegramId, text, session)
      return
    }
    
    // Обработка команд
    if (text === '/start') {
      await handleStartCommand(chatId, telegramId, firstName)
    } else if (text === '/menu') {
      await handleMenuCommand(chatId, telegramId)
    } else if (text === '/status') {
      await handleStatusCommand(chatId, telegramId)
    } else if (text === '/shift') {
      await handleShiftCommand(chatId, telegramId)
    } else if (text === '/register') {
      await handleRegisterCommand(chatId, telegramId, firstName)
    } else {
      // Обычное сообщение без активной сессии
      await bot.sendMessage(chatId, 
        `📝 Получено сообщение: "${text}"\n\n` +
        `Доступные команды:\n` +
        `/start - Начать\n` +
        `/menu - Главное меню\n` +
        `/status - Статус\n` +
        `/shift - Смена\n` +
        `/register - Регистрация`
      )
    }
    
  } catch (error) {
    console.error('❌ Ошибка обработки webhook:', error.message)
  }
}

async function handleCallbackQuery(callbackQuery) {
  try {
    const chatId = callbackQuery.message.chat.id
    const telegramId = callbackQuery.from.id.toString()
    const data = callbackQuery.data
    const messageId = callbackQuery.message.message_id
    
    console.log('🔘 Получен callback:', data, 'от:', callbackQuery.from.first_name)
    
    // Подтверждаем получение callback
    await bot.answerCallbackQuery(callbackQuery.id)
    
    if (data.startsWith('role_')) {
      const role = data.replace('role_', '')
      await handleRoleSelection(chatId, telegramId, role, messageId)
    } else if (data.startsWith('branch_')) {
      const branchId = data.replace('branch_', '')
      await handleBranchSelection(chatId, telegramId, branchId, messageId)
    } else if (data === 'confirm_registration') {
      await handleConfirmRegistration(chatId, telegramId, messageId)
    } else if (data === 'cancel_registration') {
      await handleCancelRegistration(chatId, telegramId, messageId)
    } else if (data === 'open_shift') {
      await handleOpenShift(chatId, telegramId, messageId)
    }
    
  } catch (error) {
    console.error('❌ Ошибка обработки callback:', error.message)
  }
}

async function handleSessionResponse(chatId, telegramId, text, session) {
  try {
    if (session.step === 'waiting_full_name') {
      // Пользователь ввел полное имя
      session.data.fullName = text
      session.step = 'waiting_phone'
      userSessions.set(telegramId, session)
      
      await bot.sendMessage(chatId, 
        `✅ Имя сохранено: ${text}\n\n` +
        `📱 Теперь введите ваш номер телефона:\n` +
        `Например: +7 999 123-45-67`
      )
      
    } else if (session.step === 'waiting_phone') {
      // Пользователь ввел телефон
      session.data.phone = text
      session.step = 'select_role'
      userSessions.set(telegramId, session)
      
      await showRoleSelection(chatId)
      
    } else if (session.step === 'waiting_address' && session.data.role === 'passenger') {
      // Пассажир ввел адрес
      session.data.address = text
      await showRegistrationConfirmation(chatId, session.data)
      
    } else if (session.step === 'waiting_car_info' && session.data.role === 'courier') {
      // Курьер ввел информацию об автомобиле
      const carInfo = text.split(',').map(s => s.trim())
      if (carInfo.length >= 2) {
        session.data.carModel = carInfo[0]
        session.data.carNumber = carInfo[1]
      } else {
        session.data.carModel = text
      }
      await showRegistrationConfirmation(chatId, session.data)
    }
    
  } catch (error) {
    console.error('❌ Ошибка обработки ответа сессии:', error.message)
    await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте еще раз.')
  }
}

async function handleRegisterCommand(chatId, telegramId, firstName) {
  try {
    // Проверяем, не зарегистрирован ли уже пользователь
    const existingUser = await SupabaseDataSyncService.getUserByTelegramId(telegramId)
    
    if (existingUser) {
      await bot.sendMessage(chatId, 
        `✅ Вы уже зарегистрированы как ${existingUser.full_name || existingUser.fullName}!\n\n` +
        `Используйте /menu для доступа к функциям.`
      )
      return
    }
    
    // Начинаем процесс регистрации
    const session = {
      step: 'waiting_full_name',
      data: {
        telegramId: telegramId,
        firstName: firstName
      }
    }
    
    userSessions.set(telegramId, session)
    
    await bot.sendMessage(chatId, 
      `👋 Добро пожаловать в систему такси!\n\n` +
      `📝 Начинаем регистрацию...\n\n` +
      `👤 Введите ваше полное имя:\n` +
      `Например: Иванов Иван Иванович`
    )
    
  } catch (error) {
    console.error('❌ Ошибка регистрации:', error.message)
    await bot.sendMessage(chatId, '❌ Произошла ошибка при начале регистрации.')
  }
}

async function showRoleSelection(chatId) {
  const keyboard = {
    inline_keyboard: [
      [
        { text: '🚗 Курьер', callback_data: 'role_courier' },
        { text: '👤 Пассажир', callback_data: 'role_passenger' }
      ]
    ]
  }
  
  await bot.sendMessage(chatId, 
    `👔 Выберите вашу роль:\n\n` +
    `🚗 Курьер - доставляете заказы\n` +
    `👤 Пассажир - заказываете доставку`,
    { reply_markup: keyboard }
  )
}

async function handleRoleSelection(chatId, telegramId, role, messageId) {
  try {
    const session = userSessions.get(telegramId)
    if (!session) {
      await bot.sendMessage(chatId, '❌ Сессия истекла. Начните регистрацию заново с /register')
      return
    }
    
    session.data.role = role
    
    // Редактируем сообщение
    await bot.editMessageText(
      `✅ Роль выбрана: ${role === 'courier' ? '🚗 Курьер' : '👤 Пассажир'}`,
      { chat_id: chatId, message_id: messageId }
    )
    
    // Показываем выбор филиала
    await showBranchSelection(chatId, telegramId)
    
  } catch (error) {
    console.error('❌ Ошибка выбора роли:', error.message)
  }
}

async function showBranchSelection(chatId, telegramId) {
  try {
    const branches = await SupabaseDataSyncService.getBranches()
    
    const keyboard = {
      inline_keyboard: branches.map(branch => [
        { text: `🏢 ${branch.name}`, callback_data: `branch_${branch.id}` }
      ])
    }
    
    await bot.sendMessage(chatId, 
      `🏢 Выберите филиал:`,
      { reply_markup: keyboard }
    )
    
  } catch (error) {
    console.error('❌ Ошибка показа филиалов:', error.message)
    await bot.sendMessage(chatId, '❌ Ошибка загрузки филиалов.')
  }
}

async function handleBranchSelection(chatId, telegramId, branchId, messageId) {
  try {
    const session = userSessions.get(telegramId)
    if (!session) {
      await bot.sendMessage(chatId, '❌ Сессия истекла. Начните регистрацию заново с /register')
      return
    }
    
    // Получаем информацию о филиале
    const branches = await SupabaseDataSyncService.getBranches()
    const branch = branches.find(b => b.id === branchId)
    
    session.data.branchId = branchId
    session.data.branchName = branch ? branch.name : branchId
    
    // Редактируем сообщение
    await bot.editMessageText(
      `✅ Филиал выбран: 🏢 ${session.data.branchName}`,
      { chat_id: chatId, message_id: messageId }
    )
    
    // Запрашиваем дополнительную информацию в зависимости от роли
    if (session.data.role === 'passenger') {
      session.step = 'waiting_address'
      userSessions.set(telegramId, session)
      
      await bot.sendMessage(chatId, 
        `🏠 Введите ваш основной адрес:\n` +
        `Например: ул. Ленина, 123, кв. 45`
      )
    } else if (session.data.role === 'courier') {
      session.step = 'waiting_car_info'
      userSessions.set(telegramId, session)
      
      await bot.sendMessage(chatId, 
        `🚗 Введите информацию об автомобиле:\n` +
        `Формат: Марка модель, Номер\n` +
        `Например: Toyota Camry, А123БВ777`
      )
    }
    
  } catch (error) {
    console.error('❌ Ошибка выбора филиала:', error.message)
  }
}

async function showRegistrationConfirmation(chatId, userData) {
  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Подтвердить', callback_data: 'confirm_registration' },
        { text: '❌ Отменить', callback_data: 'cancel_registration' }
      ]
    ]
  }
  
  let confirmText = `📋 Подтвердите данные регистрации:\n\n` +
    `👤 Имя: ${userData.fullName}\n` +
    `📱 Телефон: ${userData.phone}\n` +
    `👔 Роль: ${userData.role === 'courier' ? '🚗 Курьер' : '👤 Пассажир'}\n` +
    `🏢 Филиал: ${userData.branchName}\n`
  
  if (userData.role === 'passenger' && userData.address) {
    confirmText += `🏠 Адрес: ${userData.address}\n`
  }
  
  if (userData.role === 'courier') {
    if (userData.carModel) confirmText += `🚗 Автомобиль: ${userData.carModel}\n`
    if (userData.carNumber) confirmText += `🔢 Номер: ${userData.carNumber}\n`
  }
  
  confirmText += `\n✅ Все верно?`
  
  await bot.sendMessage(chatId, confirmText, { reply_markup: keyboard })
}

async function handleConfirmRegistration(chatId, telegramId, messageId) {
  try {
    const session = userSessions.get(telegramId)
    if (!session) {
      await bot.sendMessage(chatId, '❌ Сессия истекла. Начните регистрацию заново с /register')
      return
    }
    
    // Создаем пользователя в базе данных
    const userData = {
      telegramId: session.data.telegramId,
      fullName: session.data.fullName,
      phone: session.data.phone,
      role: session.data.role,
      branchId: session.data.branchId,
      address: session.data.address || null,
      carModel: session.data.carModel || null,
      carNumber: session.data.carNumber || null,
      isActive: true
    }
    
    const newUser = await SupabaseDataSyncService.addUser(userData)
    
    if (newUser) {
      // Удаляем сессию
      userSessions.delete(telegramId)
      
      // Редактируем сообщение
      await bot.editMessageText(
        `🎉 Регистрация завершена успешно!\n\n` +
        `Добро пожаловать в систему, ${userData.fullName}!\n\n` +
        `Используйте /menu для доступа к функциям.`,
        { chat_id: chatId, message_id: messageId }
      )
    } else {
      await bot.sendMessage(chatId, '❌ Ошибка при создании пользователя. Попробуйте позже.')
    }
    
  } catch (error) {
    console.error('❌ Ошибка подтверждения регистрации:', error.message)
    await bot.sendMessage(chatId, '❌ Произошла ошибка при регистрации.')
  }
}

async function handleCancelRegistration(chatId, telegramId, messageId) {
  // Удаляем сессию
  userSessions.delete(telegramId)
  
  // Редактируем сообщение
  await bot.editMessageText(
    `❌ Регистрация отменена.\n\n` +
    `Для повторной регистрации используйте /register`,
    { chat_id: chatId, message_id: messageId }
  )
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
      await bot.sendMessage(chatId, 
        `👋 Добро пожаловать, ${firstName}!\n\n` +
        `🆕 Вы новый пользователь.\n\n` +
        `Доступные действия:\n` +
        `/register - Пройти регистрацию\n` +
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
      await bot.sendMessage(chatId, '❌ Вы не зарегистрированы. Отправьте /register для регистрации.')
      return
    }
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '📊 Мой статус', callback_data: 'my_status' },
          { text: '🚗 Смена', callback_data: 'my_shift' }
        ],
        [
          { text: '📋 Мои поездки', callback_data: 'my_trips' }
        ]
      ]
    }
    
    await bot.sendMessage(chatId, 
      `📋 Главное меню\n\n` +
      `👤 ${user.full_name || user.fullName}\n` +
      `📋 Роль: ${user.role === 'courier' ? '🚗 Курьер' : '👤 Пассажир'}\n\n` +
      `Выберите действие:`,
      { reply_markup: keyboard }
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
      await bot.sendMessage(chatId, '❌ Вы не зарегистрированы. Отправьте /register для регистрации.')
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
      `📋 Роль: ${user.role === 'courier' ? '🚗 Курьер' : '👤 Пассажир'}\n` +
      `🚗 Смена: ${hasShift ? '✅ Активна' : '❌ Не открыта'}\n` +
      `📋 Назначений сегодня: ${userAssignments.length}\n\n` +
      `🌐 Веб-интерфейс: https://backend-json-azure.vercel.app`
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
      await bot.sendMessage(chatId, '❌ Вы не зарегистрированы. Отправьте /register для регистрации.')
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
      const keyboard = {
        inline_keyboard: [
          [{ text: '🚗 Открыть смену', callback_data: 'open_shift' }]
        ]
      }
      
      await bot.sendMessage(chatId, 
        `🚗 Управление сменой\n\n` +
        `❌ У вас нет активной смены на сегодня.\n\n` +
        `Хотите открыть смену?`,
        { reply_markup: keyboard }
      )
    }
  } catch (error) {
    console.error('❌ Ошибка /shift:', error.message)
    await bot.sendMessage(chatId, '❌ Произошла ошибка.')
  }
}

async function handleOpenShift(chatId, telegramId, messageId) {
  try {
    const user = await SupabaseDataSyncService.getUserByTelegramId(telegramId)
    
    if (!user || user.role !== 'courier') {
      await bot.editMessageText(
        '❌ Ошибка: пользователь не найден или не является курьером.',
        { chat_id: chatId, message_id: messageId }
      )
      return
    }
    
    // Создаем смену
    const shiftData = {
      userId: user.id,
      branchId: user.branch_id || user.branchId,
      startTime: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      endTime: '20:00',
      isWorking: true
    }
    
    const shift = await SupabaseDataSyncService.addShift(shiftData)
    
    if (shift) {
      await bot.editMessageText(
        `✅ Смена открыта успешно!\n\n` +
        `🕐 Время начала: ${shiftData.startTime}\n` +
        `🕐 Работаете до: ${shiftData.endTime}\n\n` +
        `Удачной работы! 🚗`,
        { chat_id: chatId, message_id: messageId }
      )
    } else {
      await bot.editMessageText(
        '❌ Ошибка при открытии смены. Попробуйте позже.',
        { chat_id: chatId, message_id: messageId }
      )
    }
    
  } catch (error) {
    console.error('❌ Ошибка открытия смены:', error.message)
    await bot.editMessageText(
      '❌ Произошла ошибка при открытии смены.',
      { chat_id: chatId, message_id: messageId }
    )
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