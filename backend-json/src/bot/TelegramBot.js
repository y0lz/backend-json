const TelegramBot = require('node-telegram-bot-api')
const SupabaseDataSyncService = require('../services/SupabaseDataSyncService')

class TaxiTelegramBot {
  constructor(token) {
    this.bot = new TelegramBot(token, { polling: true })
    this.dataService = SupabaseDataSyncService
    this.registrationSessions = new Map() // Хранение сессий регистрации
    this.shiftSessions = new Map() // Хранение сессий открытия смены
    this.setupHandlers()
  }

  setupHandlers() {
    // Команда /start - начало регистрации
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id
      const telegramId = msg.from.id.toString()
      const firstName = msg.from.first_name || ''
      const lastName = msg.from.last_name || ''
      const username = msg.from.username || ''
      
      try {
        const user = await this.dataService.getUserByTelegramId(telegramId)
        
        if (user) {
          // Пользователь уже зарегистрирован
          // Получаем информацию о филиале
          const branches = await this.dataService.getBranches()
          const branch = branches.find(b => b.id === user.branchId)
          const branchName = branch ? branch.name : user.branchId
          
          await this.bot.sendMessage(chatId, 
            `👋 Привет, ${user.fullName}! Рады видеть вас снова!\n\n` +
            `📋 Ваша роль: ${this.getRoleText(user.role)}\n` +
            `🏢 Филиал: ${branchName}\n\n` +
            `Используйте /menu для доступа к функциям`
          )
        } else {
          // Новый пользователь - начинаем регистрацию
          await this.startRegistration(chatId, telegramId, firstName, lastName, username)
        }
      } catch (error) {
        console.error('Error in /start:', error)
        await this.bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.\n\nЕсли проблема повторяется, обратитесь к менеджеру доставки @logist_dar')
      }
    })

    // Обработка текстовых сообщений для регистрации
    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id
      const telegramId = msg.from.id.toString()
      
      // Пропускаем команды
      if (msg.text && msg.text.startsWith('/')) return
      
      // Проверяем есть ли активная сессия регистрации
      if (this.registrationSessions.has(telegramId)) {
        await this.handleRegistrationStep(msg)
        return
      }
      
      // Проверяем есть ли активная сессия открытия смены
      if (this.shiftSessions.has(telegramId)) {
        await this.handleShiftStep(msg)
        return
      }
      
      // Обрабатываем кнопки меню
      if (msg.text) {
        await this.handleMenuButton(msg)
      }
    })

    // Обработка callback кнопок
    this.bot.on('callback_query', async (callbackQuery) => {
      const msg = callbackQuery.message
      const chatId = msg.chat.id
      const telegramId = callbackQuery.from.id.toString()
      const data = callbackQuery.data

      try {
        if (data.startsWith('reg_role_')) {
          const role = data.replace('reg_role_', '')
          await this.handleRoleSelection(telegramId, chatId, role, msg.message_id)
        } else if (data.startsWith('reg_branch_')) {
          const branchId = data.replace('reg_branch_', '')
          await this.handleBranchSelection(telegramId, chatId, branchId, msg.message_id)
        } else if (data === 'reg_confirm') {
          await this.completeRegistration(telegramId, chatId, msg.message_id)
        } else if (data === 'reg_cancel') {
          await this.cancelRegistration(telegramId, chatId, msg.message_id)
        } else if (data === 'start_shift') {
          await this.handleStartShift(telegramId, chatId, msg.message_id)
        } else if (data === 'open_shift') {
          await this.startShiftOpening(telegramId, chatId, msg.message_id)
        } else if (data === 'show_menu') {
          await this.handleShowMenu(telegramId, chatId, msg.message_id)
        } else if (data.startsWith('shift_branch_')) {
          const branchId = data.replace('shift_branch_', '')
          await this.handleShiftBranchSelection(telegramId, chatId, branchId, msg.message_id)
        } else if (data === 'address_standard') {
          await this.handleAddressChoice(telegramId, chatId, 'standard', msg.message_id)
        } else if (data === 'address_custom') {
          await this.handleAddressChoice(telegramId, chatId, 'custom', msg.message_id)
        } else if (data === 'cancel_shift_opening') {
          await this.handleCancelShiftOpening(telegramId, chatId, msg.message_id)
        }
      } catch (error) {
        console.error('Error in callback:', error)
        await this.bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте /start заново.\n\nЕсли проблема повторяется, обратитесь к менеджеру доставки @logist_dar')
      }
    })

    // Остальные команды...
    this.setupOtherCommands()
  }

  async startRegistration(chatId, telegramId, firstName, lastName, username) {
    const session = {
      telegramId,
      firstName,
      lastName,
      username,
      step: 'role',
      data: {}
    }
    
    this.registrationSessions.set(telegramId, session)
    
    await this.bot.sendMessage(chatId,
      `Я помогу Тебе вызвать такси сегодня\n` +
      `И каждый твой рабочий день\n\n` +
      `Пройди быструю регистрацию, это нужно всего 1 раз`
    )

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🚗 Курьер', callback_data: 'reg_role_courier' },
          { text: '👤 Пассажир', callback_data: 'reg_role_passenger' }
        ]
      ]
    }

    await this.bot.sendMessage(chatId, 
      'Выберите должность:\n' +
      'Курьер - доставляете пассажиров\n' +
      'Пассажир - тот кого нужно везти', 
      { reply_markup: keyboard }
    )
  }

  async handleRoleSelection(telegramId, chatId, role, messageId) {
    const session = this.registrationSessions.get(telegramId)
    if (!session) return

    session.data.role = role
    session.step = 'fullName'

    await this.bot.editMessageText(
      `✅ Должность выбрана: ${this.getRoleText(role)}\n\nТеперь введите ваше полное ФИО:`,
      { chat_id: chatId, message_id: messageId }
    )
  }

  async handleRegistrationStep(msg) {
    const chatId = msg.chat.id
    const telegramId = msg.from.id.toString()
    const session = this.registrationSessions.get(telegramId)
    
    if (!session) return

    const text = msg.text?.trim()
    if (!text) {
      await this.bot.sendMessage(chatId, '❌ Пожалуйста, введите корректные данные.')
      return
    }

    switch (session.step) {
      case 'fullName':
        session.data.fullName = text
        session.step = 'phone'
        await this.bot.sendMessage(chatId, 
          `✅ ФИО: ${text}\n\nТеперь введите ваш номер телефона\nнапример: +79001234367 можно без +`
        )
        break

      case 'phone':
        if (!this.validatePhone(text)) {
          await this.bot.sendMessage(chatId, 
            '❌ Неверный формат телефона. Введите номер телефона\nнапример: +79001234367 или 79001234367'
          )
          return
        }
        session.data.phone = text
        session.step = 'address'
        await this.bot.sendMessage(chatId, 
          `✅ Телефон: ${text}\n\n📍 Введите ваш полный адрес:\nжелательно и район города тоже`
        )
        break

      case 'address':
        session.data.address = text
        
        // Для пассажира спрашиваем должность
        if (session.data.role === 'passenger') {
          session.step = 'position'
          await this.bot.sendMessage(chatId, 
            `✅ Адрес: ${text}\n\n💼 Введите вашу должность:`
          )
        } else {
          // Для курьера сразу переходим к времени работы
          session.step = 'workUntil'
          await this.bot.sendMessage(chatId, 
            `✅ Адрес: ${text}\n\n⏰ Укажите время конца смены\nнапример: 23:00 обязательно с :`
          )
        }
        break

      case 'position':
        session.data.position = text
        session.step = 'workUntil'
        await this.bot.sendMessage(chatId, 
          `✅ Должность: ${text}\n\n⏰ Укажите время конца смены\nнапример: 23:00 обязательно с :`
        )
        break

      case 'workUntil':
        if (!this.validateTime(text)) {
          await this.bot.sendMessage(chatId, 
            '❌ Неверный формат времени. Введите время в формате: 23:00 обязательно с :'
          )
          return
        }
        session.data.workUntil = text
        session.step = 'branch'
        await this.bot.sendMessage(chatId, 
          `✅ Время работы до: ${text}\n\nВыберите филиал, на котором вы сегодня работаете`
        )
        await this.showBranchSelection(chatId)
        break

      case 'carModel':
        session.data.carModel = text
        session.step = 'carNumber'
        await this.bot.sendMessage(chatId, 
          `✅ Модель авто: ${text}\n\n🚗 Введите номер автомобиля (например: А123БВ77):`
        )
        break

      case 'carNumber':
        session.data.carNumber = text
        await this.showRegistrationSummary(chatId)
        break
    }
  }

  async showBranchSelection(chatId) {
    try {
      const branches = await this.dataService.getBranches()
      
      const keyboard = {
        inline_keyboard: branches.map(branch => ([
          { text: `🏢 ${branch.name}`, callback_data: `reg_branch_${branch.id}` }
        ]))
      }

      await this.bot.sendMessage(chatId, 
        'Выберите филиал, на котором вы сегодня работаете:', 
        { reply_markup: keyboard }
      )
    } catch (error) {
      console.error('Error loading branches:', error)
      await this.bot.sendMessage(chatId, '❌ Ошибка загрузки филиалов. Попробуйте /start заново.')
    }
  }

  async handleBranchSelection(telegramId, chatId, branchId, messageId) {
    const session = this.registrationSessions.get(telegramId)
    if (!session) return

    try {
      const branches = await this.dataService.getBranches()
      const branch = branches.find(b => b.id === branchId)
      
      session.data.branchId = branchId
      session.data.branchName = branch?.name || branchId

      await this.bot.editMessageText(
        `✅ Филиал выбран: ${branch?.name || branchId}`,
        { chat_id: chatId, message_id: messageId }
      )

      // Если курьер - запрашиваем данные автомобиля
      if (session.data.role === 'courier') {
        session.step = 'carModel'
        await this.bot.sendMessage(chatId, 
          '🚗 Теперь введите модель вашего автомобиля:'
        )
      } else {
        // Если пассажир - показываем итоги
        await this.showRegistrationSummary(chatId)
      }
    } catch (error) {
      console.error('Error handling branch selection:', error)
      await this.bot.sendMessage(chatId, '❌ Ошибка. Попробуйте /start заново.')
    }
  }

  async showRegistrationSummary(chatId) {
    const telegramId = chatId.toString()
    const session = this.registrationSessions.get(telegramId)
    if (!session) return

    const { data } = session
    
    let summary = `📋 Проверьте данные регистрации:\n\n`
    summary += `👤 Имя: ${data.fullName}\n`
    summary += `📱 Роль: ${this.getRoleText(data.role)}\n`
    summary += `📞 Телефон: ${data.phone}\n`
    summary += `📍 Адрес: ${data.address}\n`
    
    if (data.role === 'passenger') {
      summary += `💼 Должность: ${data.position}\n`
    }
    
    summary += `⏰ Работает до: ${data.workUntil}\n`
    summary += `🏢 Филиал: ${data.branchName}\n`
    
    if (data.role === 'courier') {
      summary += `🚗 Автомобиль: ${data.carModel}\n`
      summary += `🔢 Номер: ${data.carNumber}\n`
    }

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Подтвердить', callback_data: 'reg_confirm' },
          { text: '❌ Отменить', callback_data: 'reg_cancel' }
        ]
      ]
    }

    await this.bot.sendMessage(chatId, summary, { reply_markup: keyboard })
  }

  async completeRegistration(telegramId, chatId, messageId) {
    const session = this.registrationSessions.get(telegramId)
    if (!session) return

    try {
      const userData = {
        telegramId: session.telegramId,
        role: session.data.role,
        fullName: session.data.fullName,
        phone: session.data.phone,
        address: session.data.address,
        branchId: session.data.branchId,
        workUntil: session.data.workUntil,
        isActive: true,
        ...(session.data.role === 'passenger' && {
          position: session.data.position
        }),
        ...(session.data.role === 'courier' && {
          carModel: session.data.carModel,
          carNumber: session.data.carNumber
        })
      }

      const user = await this.dataService.addUser(userData)
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: '✅ Открыть смену', callback_data: 'open_shift' }
          ],
          [
            { text: '📋 Меню', callback_data: 'show_menu' }
          ]
        ]
      }

      await this.bot.editMessageText(
        `🎉 Регистрация закончена!\n\n` +
        `Используйте /menu чтобы включить кнопки`,
        { 
          chat_id: chatId, 
          message_id: messageId,
          reply_markup: keyboard
        }
      )

      // Удаляем сессию регистрации
      this.registrationSessions.delete(telegramId)

    } catch (error) {
      console.error('Error completing registration:', error)
      await this.bot.editMessageText(
        `❌ Ошибка при регистрации: ${error.message}\n\n` +
        `Попробуйте /start заново.`,
        { chat_id: chatId, message_id: messageId }
      )
    }
  }

  async cancelRegistration(telegramId, chatId, messageId) {
    this.registrationSessions.delete(telegramId)
    
    await this.bot.editMessageText(
      '❌ Регистрация отменена.\n\nИспользуйте /start для новой попытки.\n\nЕсли нужна помощь, обратитесь к менеджеру доставки @logist_dar',
      { chat_id: chatId, message_id: messageId }
    )
  }

  async handleStartShift(telegramId, chatId, messageId) {
    try {
      const user = await this.dataService.getUserByTelegramId(telegramId)
      
      if (user && user.role === 'courier') {
        const shiftData = {
          userId: user.id,
          telegramId: telegramId,
          branchId: user.branchId,
          startTime: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          endTime: '20:00',
          isWorking: true
        }
        
        await this.dataService.addShift(shiftData)
        await this.bot.editMessageText(
          '✅ Смена начата! Вы в системе и готовы к назначениям.',
          { chat_id: chatId, message_id: messageId }
        )
      }
    } catch (error) {
      console.error('Error starting shift:', error)
      await this.bot.editMessageText(
        '❌ Ошибка при начале смены. Возможно, у вас уже есть активная смена.\n\n' +
        'Для решения проблем обратитесь к менеджеру доставки @logist_dar',
        { chat_id: chatId, message_id: messageId }
      )
    }
  }

  validatePhone(phone) {
    // Валидация телефона - принимаем разные форматы
    const phoneRegex = /^(\+?[78])?[0-9\-\s\(\)]{10,}$/
    return phoneRegex.test(phone)
  }

  validateTime(time) {
    // Валидация времени в формате HH:MM
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    return timeRegex.test(time)
  }

  setupOtherCommands() {
    // Команда /menu
    this.bot.onText(/\/menu/, async (msg) => {
      const chatId = msg.chat.id
      const telegramId = msg.from.id.toString()
      
      try {
        const user = await this.dataService.getUserByTelegramId(telegramId)
        
        if (!user) {
          return await this.bot.sendMessage(chatId, 
            '❌ Вы не зарегистрированы в системе.\nИспользуйте /start для регистрации.'
          )
        }

        const keyboard = this.getMenuKeyboard(user.role)
        await this.bot.sendMessage(chatId, 
          `📋 Главное меню (${this.getRoleText(user.role)}):`, 
          { reply_markup: keyboard }
        )
      } catch (error) {
        console.error('Error in /menu:', error)
        await this.bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.')
      }
    })

    // Команда /help
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id
      
      await this.bot.sendMessage(chatId,
        `📖 Справка по командам:\n\n` +
        `🚀 /start - Регистрация в системе\n` +
        `📋 /menu - Включить кнопки меню\n` +
        `📊 /shift - Информация о смене (для курьеров)\n` +
        `📈 /status - Ваш статус и назначения\n` +
        `❓ /help - Эта справка\n\n` +
        `📱 Используйте кнопки меню для быстрого доступа к функциям\n\n` +
        `💬 Если нужна помощь, обратитесь к менеджеру доставки @logist_dar`
      )
    })

    // Остальные команды остаются без изменений...
    this.setupShiftCommands()
    this.setupStatusCommands()
  }

  setupShiftCommands() {
    // Команда /shift для курьеров
    this.bot.onText(/\/shift/, async (msg) => {
      const chatId = msg.chat.id
      const telegramId = msg.from.id.toString()
      
      try {
        const user = await this.dataService.getUserByTelegramId(telegramId)
        
        if (!user) {
          return await this.bot.sendMessage(chatId, 
            '❌ Вы не зарегистрированы. Используйте /start для регистрации.'
          )
        }

        if (user.role !== 'courier') {
          return await this.bot.sendMessage(chatId, 
            '❌ Эта команда доступна только курьерам.'
          )
        }

        const hasShift = await this.dataService.hasUserShiftToday(user.id)

        if (hasShift) {
          const shifts = await this.dataService.getTodayShifts(user.branchId)
          const myShift = shifts.find(shift => shift.userId === user.id)
          
          // Получаем информацию о филиале
          const branches = await this.dataService.getBranches()
          const branch = branches.find(b => b.id === myShift.branchId)
          const branchName = branch ? branch.name : myShift.branchId
          
          // Определяем адрес пользователя
          let userAddress = 'Не указан'
          if (myShift.destinationAddress) {
            userAddress = myShift.destinationAddress
          } else if (user.address) {
            userAddress = user.address
          }
          
          await this.bot.sendMessage(chatId,
            `📋 Моя смена\n\n` +
            `👤 Имя: ${user.fullName}\n` +
            `⏰ Время ухода: ${myShift.endTime}\n` +
            `🏢 Филиал: ${branchName}\n` +
            `📍 Ваш Адрес: ${userAddress}\n` +
            `✅ Смена открыта: Да\n\n` +
            `Если смену нужно отменить или изменить данные, напишите менеджеру доставки @logist_dar`
          )
        } else {
          const keyboard = {
            inline_keyboard: [[
              { text: '✅ Начать смену', callback_data: 'start_shift' }
            ]]
          }
          await this.bot.sendMessage(chatId, 
            'У вас нет активной смены на сегодня.\nХотите начать работу?', 
            { reply_markup: keyboard }
          )
        }
      } catch (error) {
        console.error('Error in /shift:', error)
        await this.bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.')
      }
    })
  }

  setupStatusCommands() {
    // Команда /status
    this.bot.onText(/\/status/, async (msg) => {
      const chatId = msg.chat.id
      const telegramId = msg.from.id.toString()
      
      try {
        const user = await this.dataService.getUserByTelegramId(telegramId)
        
        if (!user) {
          return await this.bot.sendMessage(chatId, 
            '❌ Вы не зарегистрированы. Используйте /start для регистрации.'
          )
        }

        const today = new Date().toISOString().split('T')[0]
        const assignments = await this.dataService.getTodayAssignments(user.branchId)
        
        let statusText = `👤 ${user.fullName}\n` +
                        `📱 Роль: ${this.getRoleText(user.role)}\n` +
                        `🏢 Филиал: ${user.branchId}\n\n`

        if (user.role === 'courier') {
          const myAssignments = assignments.filter(a => a.courierId === user.id)
          statusText += `🚗 Назначений сегодня: ${myAssignments.length}\n`
          
          if (myAssignments.length > 0) {
            statusText += `\n📋 Текущие назначения:\n`
            myAssignments.forEach((assignment, index) => {
              statusText += `${index + 1}. Время: ${assignment.assignedTime}\n`
              statusText += `   📍 Куда: ${assignment.dropoffAddress}\n`
              statusText += `   📊 Статус: ${assignment.status}\n\n`
            })
          }
        } else if (user.role === 'passenger') {
          const myAssignments = assignments.filter(a => a.passengerId === user.id)
          if (myAssignments.length > 0) {
            const assignment = myAssignments[0]
            statusText += `🚗 У вас есть назначение:\n`
            statusText += `⏰ Время подачи: ${assignment.assignedTime}\n`
            statusText += `📍 Откуда: ${assignment.pickupAddress}\n`
            statusText += `📍 Куда: ${assignment.dropoffAddress}\n`
          } else {
            statusText += `❌ Назначений на сегодня нет`
          }
        }

        await this.bot.sendMessage(chatId, statusText)
      } catch (error) {
        console.error('Error in /status:', error)
        await this.bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.')
      }
    })
  }

  getMenuKeyboard(role) {
    const keyboard = {
      keyboard: [
        [{ text: '📋 Моя смена' }]
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }

    if (role === 'courier') {
      keyboard.keyboard.push([{ text: '🚗 Мои поездки' }])
    } else if (role === 'passenger') {
      keyboard.keyboard.push([{ text: '🚕 Мой курьер' }])
    }

    return keyboard
  }

  async handleMenuButton(msg) {
    const chatId = msg.chat.id
    const telegramId = msg.from.id.toString()
    const buttonText = msg.text

    try {
      const user = await this.dataService.getUserByTelegramId(telegramId)
      
      if (!user) {
        return await this.bot.sendMessage(chatId, 
          '❌ Вы не зарегистрированы в системе.\nИспользуйте /start для регистрации.'
        )
      }

      switch (buttonText) {
        case '📋 Моя смена':
          await this.handleMyShift(user, chatId)
          break
          
        case '🚗 Мои поездки':
          if (user.role === 'courier') {
            await this.handleMyTrips(user, chatId)
          }
          break
          
        case '🚕 Мой курьер':
          if (user.role === 'passenger') {
            await this.handleMyCourier(user, chatId)
          }
          break
          
        default:
          // Неизвестная кнопка - показываем меню
          const keyboard = this.getMenuKeyboard(user.role)
          await this.bot.sendMessage(chatId, 
            `📋 Главное меню (${this.getRoleText(user.role)}):`, 
            { reply_markup: keyboard }
          )
      }
    } catch (error) {
      console.error('Error handling menu button:', error)
      await this.bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте /menu.')
    }
  }

  async handleMyShift(user, chatId) {
    try {
      const hasShift = await this.dataService.hasUserShiftToday(user.id)

      if (hasShift) {
        const shifts = await this.dataService.getTodayShifts(user.branchId)
        const myShift = shifts.find(shift => shift.userId === user.id)
        
        // Получаем информацию о филиале
        const branches = await this.dataService.getBranches()
        const branch = branches.find(b => b.id === myShift.branchId)
        const branchName = branch ? branch.name : myShift.branchId
        
        // Определяем адрес пользователя
        let userAddress = 'Не указан'
        if (myShift.destinationAddress) {
          userAddress = myShift.destinationAddress
        } else if (user.address) {
          userAddress = user.address
        }
        
        await this.bot.sendMessage(chatId,
          `📋 Моя смена\n\n` +
          `👤 Имя: ${user.fullName}\n` +
          `⏰ Время ухода: ${myShift.endTime}\n` +
          `🏢 Филиал: ${branchName}\n` +
          `📍 Ваш Адрес: ${userAddress}\n` +
          `✅ Смена открыта: Да\n\n` +
          `Если смену нужно отменить или изменить данные, напишите менеджеру доставки @logist_dar`
        )
      } else {
        const keyboard = {
          inline_keyboard: [[
            { text: '✅ Открыть смену', callback_data: 'open_shift' }
          ]]
        }
        await this.bot.sendMessage(chatId, 
          'У вас нет активной смены на сегодня.\nХотите открыть смену?', 
          { reply_markup: keyboard }
        )
      }
    } catch (error) {
      console.error('Error in handleMyShift:', error)
      await this.bot.sendMessage(chatId, '❌ Ошибка получения информации о смене.\n\nДля решения проблем обратитесь к менеджеру доставки @logist_dar')
    }
  }

  async handleShowMenu(telegramId, chatId, messageId) {
    try {
      const user = await this.dataService.getUserByTelegramId(telegramId)
      
      if (!user) {
        await this.bot.editMessageText(
          '❌ Пользователь не найден. Используйте /start для регистрации.',
          { chat_id: chatId, message_id: messageId }
        )
        return
      }

      // Удаляем inline кнопки из сообщения
      await this.bot.editMessageText(
        `📋 Главное меню активировано!`,
        { chat_id: chatId, message_id: messageId }
      )

      // Отправляем новое сообщение с обычными кнопками
      const keyboard = this.getMenuKeyboard(user.role)
      await this.bot.sendMessage(chatId, 
        `📋 Главное меню (${this.getRoleText(user.role)}):`, 
        { reply_markup: keyboard }
      )
    } catch (error) {
      console.error('Error in handleShowMenu:', error)
      await this.bot.sendMessage(chatId, '❌ Ошибка при открытии меню. Используйте /menu')
    }
  }

  async startShiftOpening(telegramId, chatId, messageId) {
    const user = await this.dataService.getUserByTelegramId(telegramId)
    if (!user) {
      await this.bot.editMessageText(
        '❌ Пользователь не найден. Используйте /start для регистрации.',
        { chat_id: chatId, message_id: messageId }
      )
      return
    }

    // Создаем сессию открытия смены
    const session = {
      telegramId,
      userId: user.id,
      step: 'branch',
      data: {
        userAddress: user.address // Сохраняем стандартный адрес пользователя
      }
    }
    
    this.shiftSessions.set(telegramId, session)
    
    await this.bot.editMessageText(
      '🏢 Выберите филиал для работы сегодня:',
      { chat_id: chatId, message_id: messageId }
    )
    
    await this.showBranchSelectionForShift(chatId)
  }

  async showBranchSelectionForShift(chatId) {
    try {
      const branches = await this.dataService.getBranches()
      
      const branchButtons = branches.map(branch => ([
        { text: `🏢 ${branch.name}`, callback_data: `shift_branch_${branch.id}` }
      ]))
      
      // Добавляем кнопку отмены
      branchButtons.push([
        { text: '❌ Отменить', callback_data: 'cancel_shift_opening' }
      ])

      const keyboard = {
        inline_keyboard: branchButtons
      }

      await this.bot.sendMessage(chatId, 
        '🏢 Выберите филиал:', 
        { reply_markup: keyboard }
      )
    } catch (error) {
      console.error('Error loading branches for shift:', error)
      await this.bot.sendMessage(chatId, '❌ Ошибка загрузки филиалов.')
    }
  }

  async handleShiftBranchSelection(telegramId, chatId, branchId, messageId) {
    const session = this.shiftSessions.get(telegramId)
    if (!session) return

    try {
      const branches = await this.dataService.getBranches()
      const branch = branches.find(b => b.id === branchId)
      
      session.data.branchId = branchId
      session.data.branchName = branch?.name || branchId
      session.step = 'workUntil'

      await this.bot.editMessageText(
        `⏰ До какого времени вы работаете сегодня?\nнапример: 23:00 обязательно с :`,
        { chat_id: chatId, message_id: messageId }
      )
    } catch (error) {
      console.error('Error handling shift branch selection:', error)
      await this.bot.sendMessage(chatId, '❌ Ошибка. Попробуйте заново.')
    }
  }

  async handleShiftStep(msg) {
    const chatId = msg.chat.id
    const telegramId = msg.from.id.toString()
    const session = this.shiftSessions.get(telegramId)
    
    if (!session) return

    const text = msg.text?.trim()
    if (!text) {
      await this.bot.sendMessage(chatId, '❌ Пожалуйста, введите корректные данные.')
      return
    }

    switch (session.step) {
      case 'workUntil':
        if (!this.validateTime(text)) {
          await this.bot.sendMessage(chatId, 
            '❌ Неверный формат времени. Введите время в формате: 23:00 обязательно с :'
          )
          return
        }
        session.data.workUntil = text
        session.step = 'addressChoice'
        await this.showAddressChoice(chatId, session.data.userAddress)
        break

      case 'customAddress':
        session.data.destinationAddress = text
        await this.completeShiftOpening(chatId, session)
        break
    }
  }

  async handleCancelShiftOpening(telegramId, chatId, messageId) {
    try {
      // Удаляем сессию открытия смены
      this.shiftSessions.delete(telegramId)
      
      await this.bot.editMessageText(
        '❌ Открытие смены отменено.\n\nИспользуйте кнопку "📋 Моя смена" для повторной попытки.',
        { chat_id: chatId, message_id: messageId }
      )
    } catch (error) {
      console.error('Error canceling shift opening:', error)
      await this.bot.sendMessage(chatId, '❌ Ошибка при отмене. Попробуйте /menu')
    }
  }

  async showAddressChoice(chatId, userAddress) {
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🏠 Стандартный адрес', callback_data: 'address_standard' }
        ],
        [
          { text: '📍 Другой адрес', callback_data: 'address_custom' }
        ]
      ]
    }

    await this.bot.sendMessage(chatId, 
      `📍 Выберите адрес назначения:\n\n` +
      `🏠 Стандартный адрес: ${userAddress || 'Не указан'}\n` +
      `📍 Или укажите другой адрес для сегодняшней поездки`, 
      { reply_markup: keyboard }
    )
  }

  async handleAddressChoice(telegramId, chatId, choice, messageId) {
    const session = this.shiftSessions.get(telegramId)
    if (!session) return

    try {
      if (choice === 'standard') {
        // Используем стандартный адрес пользователя
        session.data.destinationAddress = session.data.userAddress
        await this.bot.editMessageText(
          `✅ Выбран стандартный адрес: ${session.data.userAddress}`,
          { chat_id: chatId, message_id: messageId }
        )
        await this.completeShiftOpening(chatId, session)
      } else if (choice === 'custom') {
        // Запрашиваем ввод нового адреса
        session.step = 'customAddress'
        await this.bot.editMessageText(
          '📍 Введите адрес, куда вы едете сегодня:',
          { chat_id: chatId, message_id: messageId }
        )
      }
    } catch (error) {
      console.error('Error handling address choice:', error)
      await this.bot.sendMessage(chatId, '❌ Ошибка. Попробуйте заново.')
    }
  }

  async completeShiftOpening(chatId, session) {
    try {
      const user = await this.dataService.getUserById(session.userId)
      if (!user) {
        await this.bot.sendMessage(chatId, '❌ Ошибка: пользователь не найден.')
        return
      }

      // Обновляем время работы пользователя
      await this.dataService.updateUser(session.userId, {
        workUntil: session.data.workUntil
      })

      // Создаем смену
      const shiftData = {
        userId: session.userId,
        telegramId: session.telegramId,
        branchId: session.data.branchId,
        startTime: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        endTime: session.data.workUntil,
        destinationAddress: session.data.destinationAddress,
        isWorking: true
      }
      
      await this.dataService.addShift(shiftData)
      
      await this.bot.sendMessage(chatId,
        `✅ Смена открыта успешно!\n\n` +
        `🏢 Филиал: ${session.data.branchName}\n` +
        `⏰ Работаете до: ${session.data.workUntil}\n` +
        `📍 Едете: ${session.data.destinationAddress}\n\n` +
        `Если смену нужно отменить или изменить данные, напишите менеджеру доставки @logist_dar`
      )

      // Удаляем сессию
      this.shiftSessions.delete(session.telegramId)
      
    } catch (error) {
      console.error('Error completing shift opening:', error)
      await this.bot.sendMessage(chatId, '❌ Ошибка при открытии смены: ' + error.message + '\n\nДля решения проблем обратитесь к менеджеру доставки @logist_dar')
    }
  }

  async handleMyStatus(user, chatId) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const assignments = await this.dataService.getTodayAssignments(user.branchId)
      
      let statusText = `👤 ${user.fullName}\n` +
                      `📱 Роль: ${this.getRoleText(user.role)}\n` +
                      `🏢 Филиал: ${user.branchId}\n\n`

      if (user.role === 'courier') {
        const myAssignments = assignments.filter(a => a.courierId === user.id)
        statusText += `🚗 Назначений сегодня: ${myAssignments.length}\n`
        
        if (myAssignments.length > 0) {
          statusText += `\n📋 Текущие назначения:\n`
          myAssignments.forEach((assignment, index) => {
            statusText += `${index + 1}. Время: ${assignment.assignedTime}\n`
            statusText += `   📍 Куда: ${assignment.dropoffAddress}\n`
            statusText += `   📊 Статус: ${assignment.status}\n\n`
          })
        }
      } else if (user.role === 'passenger') {
        const myAssignments = assignments.filter(a => a.passengerId === user.id)
        if (myAssignments.length > 0) {
          const assignment = myAssignments[0]
          statusText += `🚗 У вас есть назначение:\n`
          statusText += `⏰ Время подачи: ${assignment.assignedTime}\n`
          statusText += `📍 Откуда: ${assignment.pickupAddress}\n`
          statusText += `📍 Куда: ${assignment.dropoffAddress}\n`
        } else {
          statusText += `❌ Назначений на сегодня нет`
        }
      }

      await this.bot.sendMessage(chatId, statusText)
    } catch (error) {
      console.error('Error in handleMyStatus:', error)
      await this.bot.sendMessage(chatId, '❌ Ошибка получения статуса.')
    }
  }

  async handleMyTrips(user, chatId) {
    try {
      const assignments = await this.dataService.getTodayAssignments(user.branchId)
      // Фильтруем только активные назначения (исключаем отмененные и завершенные)
      const myAssignments = assignments.filter(a => 
        a.courierId === user.id && 
        a.status !== 'cancelled' && 
        a.status !== 'completed'
      )
      
      if (myAssignments.length === 0) {
        await this.bot.sendMessage(chatId, '📋 У вас нет активных назначений на сегодня.')
        return
      }

      let tripsText = `🚗 Ваши активные поездки на сегодня (${myAssignments.length}):\n\n`
      
      for (let i = 0; i < myAssignments.length; i++) {
        const assignment = myAssignments[i]
        const passenger = await this.dataService.getUserById(assignment.passengerId)
        
        tripsText += `${i + 1}. 👤 Пассажир: ${passenger?.fullName || 'Неизвестный'}\n`
        tripsText += `   💼 Должность: ${passenger?.position || 'Не указана'}\n`
        tripsText += `   📱 Телефон для связи: ${passenger?.phone || 'Не указан'}\n`
        tripsText += `   ⏰ Работает до: ${passenger?.workUntil || 'Не указано'}\n`
        tripsText += `   🕐 Время подачи: ${assignment.assignedTime}\n`
        tripsText += `   📍 Откуда: ${assignment.pickupAddress}\n`
        tripsText += `   📍 Куда: ${assignment.dropoffAddress}\n\n`
      }

      await this.bot.sendMessage(chatId, tripsText)
    } catch (error) {
      console.error('Error in handleMyTrips:', error)
      await this.bot.sendMessage(chatId, '❌ Ошибка получения поездок.')
    }
  }

  async handleMyCourier(user, chatId) {
    try {
      const assignments = await this.dataService.getTodayAssignments(user.branchId)
      // Фильтруем только активные назначения (исключаем отмененные и завершенные)
      const myAssignments = assignments.filter(a => 
        a.passengerId === user.id && 
        a.status !== 'cancelled' && 
        a.status !== 'completed'
      )
      
      if (myAssignments.length === 0) {
        await this.bot.sendMessage(chatId, '🚕 У вас пока нет активных назначений. Как только вам выберут курьера, вы получите уведомление.')
        return
      }

      const assignment = myAssignments[0]
      const courier = await this.dataService.getUserById(assignment.courierId)
      
      if (!courier) {
        await this.bot.sendMessage(chatId, '❌ Информация о курьере недоступна.')
        return
      }

      const courierText = `🚕 Ваш курьер:\n\n` +
                         `👤 ${courier.fullName}\n` +
                         `📱 ${courier.phone}\n` +
                         `🚗 ${courier.carModel} (${courier.carNumber})\n\n` +
                         `🕐 Время подачи: ${assignment.assignedTime}\n` +
                         `📍 Откуда: ${assignment.pickupAddress}\n` +
                         `📍 Куда: ${assignment.dropoffAddress}`

      await this.bot.sendMessage(chatId, courierText)
    } catch (error) {
      console.error('Error in handleMyCourier:', error)
      await this.bot.sendMessage(chatId, '❌ Ошибка получения информации о курьере.')
    }
  }

  getRoleText(role) {
    const roles = {
      'admin': 'Администратор',
      'courier': 'Курьер',
      'passenger': 'Пассажир'
    }
    return roles[role] || role
  }

  // Отправка уведомлений (без изменений)
  async notifyUser(telegramId, message) {
    try {
      await this.bot.sendMessage(telegramId, message)
    } catch (error) {
      console.error(`Failed to notify user ${telegramId}:`, error)
    }
  }

  async notifyAssignmentCancellation(assignment) {
    try {
      const courier = await this.dataService.getUserById(assignment.courierId)
      const passenger = await this.dataService.getUserById(assignment.passengerId)

      if (courier) {
        await this.notifyUser(courier.telegramId,
          `❌ Поездка отменена\n\n` +
          `👤 Пассажир: ${passenger?.fullName || 'Неизвестный'}\n` +
          `📍 Откуда: ${assignment.pickupAddress}\n` +
          `📍 Куда: ${assignment.dropoffAddress}\n\n` +
          `ℹ️ Поездка была отменена администратором. Ожидайте новых назначений.`
        )
      }

      if (passenger) {
        await this.notifyUser(passenger.telegramId,
          `❌ Поездка отменена\n\n` +
          `👤 Курьер: ${courier?.fullName || 'Неизвестный'}\n` +
          `📍 Откуда: ${assignment.pickupAddress}\n` +
          `📍 Куда: ${assignment.dropoffAddress}\n\n` +
          `ℹ️ Ваша поездка была отменена администратором. При необходимости вам назначат нового курьера.`
        )
      }
    } catch (error) {
      console.error('Error notifying assignment cancellation:', error)
    }
  }

  async notifyAssignment(assignment) {
    try {
      const courier = await this.dataService.getUserById(assignment.courierId)
      const passenger = await this.dataService.getUserById(assignment.passengerId)

      if (courier) {
        await this.notifyUser(courier.telegramId,
          `🚗 У вас новый пассажир, ознакомьтесь с данными поездки\n\n` +
          `👤 Пассажир: ${passenger.fullName}\n` +
          `💼 Должность: ${passenger.position || 'Не указана'}\n` +
          `📱 Телефон для связи: ${passenger.phone}\n` +
          `⏰ Работает до: ${passenger.workUntil || 'Не указано'}\n\n` +
          `📍 Откуда: ${assignment.pickupAddress}\n` +
          `📍 Куда: ${assignment.dropoffAddress}`
        )
      }

      if (passenger) {
        await this.notifyUser(passenger.telegramId,
          `🚕 Вам назначен курьер!\n\n` +
          `👤 Курьер: ${courier.fullName}\n` +
          `📱 Телефон: ${courier.phone}\n` +
          `🚗 Автомобиль: ${courier.carModel} (${courier.carNumber})\n` +
          `⏰ Работает до: ${courier.workUntil || 'Не указано'}\n\n` +
          `📍 Откуда: ${assignment.pickupAddress}\n` +
          `📍 Куда: ${assignment.dropoffAddress}\n\n` +
          `Курьер скоро с вами свяжется!`
        )
      }
    } catch (error) {
      console.error('Error notifying assignment:', error)
    }
  }
}

module.exports = TaxiTelegramBot