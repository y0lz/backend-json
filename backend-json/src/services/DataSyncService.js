const LowDBDataService = require('./LowDBDataService');
const StorageDataService = require('./StorageDataService');
const NhostUserService = require('./NhostUserService');
const storageService = require('./storage-integration');

class DataSyncService {
    constructor() {
        this.lowDBService = new LowDBDataService();
        this.storageDataService = StorageDataService;
        this.nhostService = NhostUserService;
        this.syncEnabled = process.env.NHOST_SYNC_ENABLED === 'true';
        this.primaryStorage = process.env.PRIMARY_STORAGE || 'lowdb'; // 'lowdb', 'nhost', или 'hybrid'
    }

    async initialize() {
        try {
            console.log('🔄 Инициализация Data Sync Service...');
            
            if (this.primaryStorage === 'hybrid') {
                // Гибридный режим: пользователи в PostgreSQL, остальное в Nhost Storage
                console.log('🔀 Режим: Гибридное хранилище');
                await this.nhostService.initialize();
                await this.storageDataService.initialize();
                
                console.log('✅ Гибридное хранилище готово');
                console.log('   👥 Пользователи → PostgreSQL');
                console.log('   📁 JSON файлы → Nhost Storage');
            } else {
                // Обычные режимы
                await this.lowDBService.initialize();
                await this.nhostService.initialize();
                
                console.log(`📊 Режим синхронизации: ${this.syncEnabled ? 'включен' : 'отключен'}`);
                console.log(`💾 Основное хранилище: ${this.primaryStorage}`);
                
                // Если включена синхронизация, проверяем нужна ли миграция
                if (this.syncEnabled && this.primaryStorage === 'nhost') {
                    await this.checkAndMigrate();
                }
            }
            
            console.log('✅ Data Sync Service готов к работе');
            return true;
        } catch (error) {
            console.error('❌ Ошибка инициализации Data Sync Service:', error.message);
            return false;
        }
    }

    async checkAndMigrate() {
        try {
            // Проверяем есть ли данные в Nhost
            const nhostStats = await this.nhostService.getStats();
            const lowdbStats = await this.lowDBService.getStats();
            
            console.log('📊 Статистика данных:');
            console.log(`   LowDB: ${lowdbStats.users.total} пользователей`);
            console.log(`   Nhost: ${nhostStats.users.total} пользователей`);
            
            // Если в Nhost нет данных, а в LowDB есть - мигрируем
            if (nhostStats.users.total === 0 && lowdbStats.users.total > 0) {
                console.log('🔄 Обнаружены данные в LowDB, начинаем миграцию в Nhost...');
                const migrationResult = await this.nhostService.migrateFromLowDB(this.lowDBService);
                
                if (migrationResult.success) {
                    console.log('✅ Миграция данных завершена успешно');
                } else {
                    console.error('❌ Ошибка миграции:', migrationResult.error);
                }
            }
        } catch (error) {
            console.error('❌ Ошибка проверки миграции:', error.message);
        }
    }

    // === УНИВЕРСАЛЬНЫЕ МЕТОДЫ ===

    async getUsers() {
        if (this.primaryStorage === 'hybrid') {
            // Гибридный режим: пользователи из PostgreSQL
            const nhostUsers = await this.nhostService.getUsers();
            return nhostUsers.map(user => ({
                id: user.id,
                telegramId: user.telegram_id,
                fullName: user.full_name,
                phone: user.phone,
                role: user.role,
                branchId: user.branch_id,
                address: user.address,
                isActive: user.is_active,
                position: user.position,
                workUntil: user.work_until,
                carModel: user.car_model,
                carNumber: user.car_number,
                createdAt: user.created_at,
                updatedAt: user.updated_at
            }));
        } else if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            const nhostUsers = await this.nhostService.getUsers();
            // Преобразуем формат Nhost в формат LowDB для совместимости
            return nhostUsers.map(user => ({
                id: user.id,
                telegramId: user.telegram_id,
                fullName: user.full_name,
                phone: user.phone,
                role: user.role,
                branchId: user.branch_id,
                address: user.address,
                isActive: user.is_active,
                avatarFileId: user.avatar_file_id,
                createdAt: user.created_at,
                updatedAt: user.updated_at,
                branch: user.taxi_branch
            }));
        } else {
            return await this.lowDBService.getUsers();
        }
    }

    async getUserById(id) {
        if (this.primaryStorage === 'hybrid') {
            // Гибридный режим: пользователи из PostgreSQL
            const user = await this.nhostService.getUserById(id);
            if (!user) return null;
            
            return {
                id: user.id,
                telegramId: user.telegram_id,
                fullName: user.full_name,
                phone: user.phone,
                role: user.role,
                branchId: user.branch_id,
                address: user.address,
                isActive: user.is_active,
                position: user.position,
                workUntil: user.work_until,
                carModel: user.car_model,
                carNumber: user.car_number,
                createdAt: user.created_at,
                updatedAt: user.updated_at
            };
        } else if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            const user = await this.nhostService.getUserById(id);
            if (!user) return null;
            
            return {
                id: user.id,
                telegramId: user.telegram_id,
                fullName: user.full_name,
                phone: user.phone,
                role: user.role,
                branchId: user.branch_id,
                address: user.address,
                isActive: user.is_active,
                avatarFileId: user.avatar_file_id,
                createdAt: user.created_at,
                updatedAt: user.updated_at,
                branch: user.taxi_branch
            };
        } else {
            return await this.lowDBService.getUserById(id);
        }
    }

    async getUserByTelegramId(telegramId) {
        if (this.primaryStorage === 'hybrid') {
            // Гибридный режим: пользователи из PostgreSQL
            const user = await this.nhostService.getUserByTelegramId(telegramId);
            if (!user) return null;
            
            return {
                id: user.id,
                telegramId: user.telegram_id,
                fullName: user.full_name,
                phone: user.phone,
                role: user.role,
                branchId: user.branch_id,
                address: user.address,
                isActive: user.is_active,
                position: user.position,
                workUntil: user.work_until,
                carModel: user.car_model,
                carNumber: user.car_number,
                createdAt: user.created_at,
                updatedAt: user.updated_at
            };
        } else if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            const user = await this.nhostService.getUserByTelegramId(telegramId);
            if (!user) return null;
            
            return {
                id: user.id,
                telegramId: user.telegram_id,
                fullName: user.full_name,
                phone: user.phone,
                role: user.role,
                branchId: user.branch_id,
                address: user.address,
                isActive: user.is_active,
                avatarFileId: user.avatar_file_id,
                createdAt: user.created_at,
                updatedAt: user.updated_at,
                branch: user.taxi_branch
            };
        } else {
            return await this.lowDBService.getUserByTelegramId(telegramId);
        }
    }

    async addUser(userData) {
        let result;
        
        if (this.primaryStorage === 'hybrid') {
            // Гибридный режим: пользователи в PostgreSQL
            const nhostUser = await this.nhostService.addUser(userData);
            result = {
                id: nhostUser.id,
                telegramId: nhostUser.telegram_id,
                fullName: nhostUser.full_name,
                phone: nhostUser.phone,
                role: nhostUser.role,
                branchId: nhostUser.branch_id,
                address: nhostUser.address,
                isActive: nhostUser.is_active,
                position: nhostUser.position,
                workUntil: nhostUser.work_until,
                carModel: nhostUser.car_model,
                carNumber: nhostUser.car_number,
                createdAt: nhostUser.created_at,
                updatedAt: nhostUser.updated_at
            };
        } else if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            const nhostUser = await this.nhostService.addUser(userData);
            result = {
                id: nhostUser.id,
                telegramId: nhostUser.telegram_id,
                fullName: nhostUser.full_name,
                phone: nhostUser.phone,
                role: nhostUser.role,
                branchId: nhostUser.branch_id,
                address: nhostUser.address,
                isActive: nhostUser.is_active,
                avatarFileId: nhostUser.avatar_file_id,
                createdAt: nhostUser.created_at,
                updatedAt: nhostUser.updated_at
            };
            
            // Синхронизируем с LowDB если включена синхронизация
            if (this.syncEnabled) {
                try {
                    await this.lowDBService.addUser(result);
                } catch (error) {
                    console.error('Ошибка синхронизации с LowDB:', error.message);
                }
            }
        } else {
            result = await this.lowDBService.addUser(userData);
            
            // Синхронизируем с Nhost если включена синхронизация
            if (this.syncEnabled && this.nhostService.isReady()) {
                try {
                    await this.nhostService.addUser(userData);
                } catch (error) {
                    console.error('Ошибка синхронизации с Nhost:', error.message);
                }
            }
        }
        
        return result;
    }

    async updateUser(id, userData) {
        let result;
        
        if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            const nhostUser = await this.nhostService.updateUser(id, userData);
            result = {
                id: nhostUser.id,
                telegramId: nhostUser.telegram_id,
                fullName: nhostUser.full_name,
                phone: nhostUser.phone,
                role: nhostUser.role,
                branchId: nhostUser.branch_id,
                address: nhostUser.address,
                isActive: nhostUser.is_active,
                avatarFileId: nhostUser.avatar_file_id,
                updatedAt: nhostUser.updated_at
            };
            
            // Синхронизируем с LowDB если включена синхронизация
            if (this.syncEnabled) {
                try {
                    await this.lowDBService.updateUser(id, userData);
                } catch (error) {
                    console.error('Ошибка синхронизации с LowDB:', error.message);
                }
            }
        } else {
            result = await this.lowDBService.updateUser(id, userData);
            
            // Синхронизируем с Nhost если включена синхронизация
            if (this.syncEnabled && this.nhostService.isReady()) {
                try {
                    await this.nhostService.updateUser(id, userData);
                } catch (error) {
                    console.error('Ошибка синхронизации с Nhost:', error.message);
                }
            }
        }
        
        return result;
    }

    async deleteUser(id) {
        let result;
        
        if (this.primaryStorage === 'hybrid') {
            // Гибридный режим: пользователи в PostgreSQL
            result = await this.nhostService.deleteUser(id);
        } else if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            result = await this.nhostService.deleteUser(id);
            
            // Синхронизируем с LowDB если включена синхронизация
            if (this.syncEnabled) {
                try {
                    await this.lowDBService.deleteUser(id);
                } catch (error) {
                    console.error('Ошибка синхронизации с LowDB:', error.message);
                }
            }
        } else {
            result = await this.lowDBService.deleteUser(id);
            
            // Синхронизируем с Nhost если включена синхронизация
            if (this.syncEnabled && this.nhostService.isReady()) {
                try {
                    await this.nhostService.deleteUser(id);
                } catch (error) {
                    console.error('Ошибка синхронизации с Nhost:', error.message);
                }
            }
        }
        
        return result;
    }

    // === ФИЛИАЛЫ ===

    async getBranches() {
        if (this.primaryStorage === 'hybrid') {
            // Гибридный режим: филиалы из Nhost Storage
            return await this.storageDataService.getBranches();
        } else if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            return await this.nhostService.getBranches();
        } else {
            return await this.lowDBService.getBranches();
        }
    }

    // === СМЕНЫ ===

    async getTodayShifts(branchId = null) {
        if (this.primaryStorage === 'hybrid') {
            // Гибридный режим: смены из Nhost Storage
            return await this.storageDataService.getTodayShifts(branchId);
        } else if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            const nhostShifts = await this.nhostService.getTodayShifts(branchId);
            // Преобразуем формат для совместимости
            return nhostShifts.map(shift => ({
                id: shift.id,
                userId: shift.user_id,
                telegramId: shift.taxi_user?.telegram_id,
                branchId: shift.branch_id,
                date: shift.date,
                startTime: shift.start_time,
                endTime: shift.end_time,
                isWorking: shift.is_working,
                user: shift.taxi_user,
                branch: shift.taxi_branch
            }));
        } else {
            return await this.lowDBService.getTodayShifts(branchId);
        }
    }

    async addShift(shiftData) {
        if (this.primaryStorage === 'hybrid') {
            // Гибридный режим: смены в Nhost Storage
            return await this.storageDataService.addShift(shiftData);
        } else if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            return await this.nhostService.addShift(shiftData);
        } else {
            return await this.lowDBService.addShift(shiftData);
        }
    }

    async hasUserShiftToday(userId) {
        if (this.primaryStorage === 'hybrid') {
            // Гибридный режим: смены в Nhost Storage
            return await this.storageDataService.hasUserShiftToday(userId);
        } else if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            // Для Nhost проверяем через getTodayShifts
            const shifts = await this.nhostService.getTodayShifts();
            return shifts.some(shift => shift.user_id === userId);
        } else {
            return await this.lowDBService.hasUserShiftToday(userId);
        }
    }

    async deleteShift(shiftId) {
        if (this.primaryStorage === 'hybrid') {
            // Гибридный режим: смены в Nhost Storage
            return await this.storageDataService.deleteShift(shiftId);
        } else if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            // Для Nhost нужно реализовать deleteShift в NhostUserService
            // Пока используем LowDB
            return await this.lowDBService.deleteShift(shiftId);
        } else {
            return await this.lowDBService.deleteShift(shiftId);
        }
    }

    async updateShift(shiftId, shiftData) {
        if (this.primaryStorage === 'hybrid') {
            // Гибридный режим: смены в Nhost Storage
            const shifts = await this.storageDataService.storageService.getShifts();
            const shiftIndex = shifts.findIndex(shift => shift.id === shiftId);
            
            if (shiftIndex === -1) {
                throw new Error('Смена не найдена');
            }

            shifts[shiftIndex] = { 
                ...shifts[shiftIndex], 
                ...shiftData,
                updatedAt: new Date().toISOString()
            };
            
            await this.storageDataService.storageService.saveShifts(shifts);
            return shifts[shiftIndex];
        } else if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            // Для Nhost нужно реализовать updateShift в NhostUserService
            // Пока используем LowDB
            return await this.lowDBService.updateShift(shiftId, shiftData);
        } else {
            return await this.lowDBService.updateShift(shiftId, shiftData);
        }
    }

    // === НАЗНАЧЕНИЯ ===

    async getTodayAssignments(branchId = null) {
        if (this.primaryStorage === 'hybrid') {
            // Гибридный режим: назначения из Nhost Storage
            return await this.storageDataService.getTodayAssignments(branchId);
        } else if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            const nhostAssignments = await this.nhostService.getTodayAssignments(branchId);
            // Преобразуем формат для совместимости
            return nhostAssignments.map(assignment => ({
                id: assignment.id,
                courierId: assignment.courier_id,
                passengerId: assignment.passenger_id,
                branchId: assignment.branch_id,
                pickupAddress: assignment.pickup_address,
                dropoffAddress: assignment.dropoff_address,
                assignedTime: assignment.assigned_time,
                date: assignment.date,
                status: assignment.status,
                notes: assignment.notes,
                courier: assignment.courier,
                passenger: assignment.passenger,
                branch: assignment.taxi_branch
            }));
        } else {
            return await this.lowDBService.getTodayAssignments(branchId);
        }
    }

    async addAssignment(assignmentData) {
        if (this.primaryStorage === 'hybrid') {
            // Гибридный режим: назначения в Nhost Storage
            return await this.storageDataService.addAssignment(assignmentData);
        } else if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            return await this.nhostService.addAssignment(assignmentData);
        } else {
            return await this.lowDBService.addAssignment(assignmentData);
        }
    }

    async updateAssignment(assignmentId, assignmentData) {
        if (this.primaryStorage === 'hybrid') {
            // Гибридный режим: назначения в Nhost Storage
            return await this.storageDataService.updateAssignment(assignmentId, assignmentData);
        } else if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            // Для Nhost нужно реализовать updateAssignment в NhostUserService
            // Пока используем LowDB
            return await this.lowDBService.updateAssignment(assignmentId, assignmentData);
        } else {
            return await this.lowDBService.updateAssignment(assignmentId, assignmentData);
        }
    }

    async deleteAssignment(assignmentId) {
        if (this.primaryStorage === 'hybrid') {
            // Гибридный режим: назначения в Nhost Storage
            return await this.storageDataService.deleteAssignment(assignmentId);
        } else if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            // Для Nhost нужно реализовать deleteAssignment в NhostUserService
            // Пока используем LowDB
            return await this.lowDBService.deleteAssignment(assignmentId);
        } else {
            return await this.lowDBService.deleteAssignment(assignmentId);
        }
    }

    async getAssignmentById(assignmentId) {
        if (this.primaryStorage === 'hybrid') {
            // Гибридный режим: назначения в Nhost Storage
            const assignments = await this.storageDataService.storageService.getAssignments();
            return assignments.find(assignment => assignment.id === assignmentId) || null;
        } else if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            // Для Nhost нужно реализовать getAssignmentById в NhostUserService
            // Пока используем LowDB
            return await this.lowDBService.getAssignmentById(assignmentId);
        } else {
            return await this.lowDBService.getAssignmentById(assignmentId);
        }
    }

    // === ДОСТУПНЫЕ РЕСУРСЫ ===

    async getAvailableCouriers(date, branchId) {
        if (this.primaryStorage === 'hybrid') {
            // Гибридный режим: возвращаем всех активных курьеров
            const users = await this.getUsers();
            let couriers = users.filter(user => user.role === 'courier' && user.isActive);
            
            // Фильтруем по филиалу если указан
            if (branchId) {
                couriers = couriers.filter(courier => courier.branchId === branchId);
            }
            
            return couriers;
        } else if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            // Для Nhost нужно реализовать getAvailableCouriers в NhostUserService
            // Пока используем LowDB
            return await this.lowDBService.getAvailableCouriers(date, branchId);
        } else {
            return await this.lowDBService.getAvailableCouriers(date, branchId);
        }
    }

    async getAvailablePassengers(date, branchId) {
        if (this.primaryStorage === 'hybrid') {
            // Гибридный режим: возвращаем всех активных пассажиров
            const users = await this.getUsers();
            let passengers = users.filter(user => user.role === 'passenger' && user.isActive);
            
            // Фильтруем по филиалу если указан
            if (branchId) {
                passengers = passengers.filter(passenger => passenger.branchId === branchId);
            }
            
            return passengers;
        } else if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            // Для Nhost нужно реализовать getAvailablePassengers в NhostUserService
            // Пока используем LowDB
            return await this.lowDBService.getAvailablePassengers(date, branchId);
        } else {
            return await this.lowDBService.getAvailablePassengers(date, branchId);
        }
    }

    // === ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ===

    async getAllShifts() {
        if (this.primaryStorage === 'hybrid') {
            // Гибридный режим: смены из Nhost Storage
            return await this.storageDataService.storageService.getShifts();
        } else if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            // Для Nhost нужно реализовать getAllShifts в NhostUserService
            // Пока используем LowDB
            return await this.lowDBService.getAllShifts();
        } else {
            return await this.lowDBService.getAllShifts();
        }
    }

    async getAllAssignments() {
        if (this.primaryStorage === 'hybrid') {
            // Гибридный режим: назначения из Nhost Storage
            return await this.storageDataService.storageService.getAssignments();
        } else if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            // Для Nhost нужно реализовать getAllAssignments в NhostUserService
            // Пока используем LowDB
            return await this.lowDBService.getAllAssignments();
        } else {
            return await this.lowDBService.getAllAssignments();
        }
    }

    async getConfig() {
        if (this.primaryStorage === 'hybrid') {
            // Гибридный режим: конфигурация из Nhost Storage
            return await this.storageDataService.getConfig();
        } else {
            // Конфигурация всегда из LowDB
            return await this.lowDBService.getConfig();
        }
    }

    async resetAllShifts() {
        if (this.primaryStorage === 'hybrid') {
            // Гибридный режим: очищаем смены в Nhost Storage
            await this.storageDataService.storageService.saveShifts([]);
            return true;
        } else if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            // Для Nhost нужно реализовать resetAllShifts в NhostUserService
            // Пока используем LowDB
            return await this.lowDBService.resetAllShifts();
        } else {
            return await this.lowDBService.resetAllShifts();
        }
    }

    async syncUserDataWithShifts() {
        // Синхронизация всегда через LowDB
        return await this.lowDBService.syncUserDataWithShifts();
    }

    // === СТАТИСТИКА ===

    async getStats() {
        if (this.primaryStorage === 'hybrid') {
            // Гибридный режим: пользователи из PostgreSQL, остальное из Nhost Storage
            const nhostUserStats = await this.nhostService.getStats();
            const storageStats = await this.storageDataService.getStats();
            
            return {
                users: nhostUserStats.users, // Пользователи из PostgreSQL
                shifts: storageStats.shifts,   // Смены из Nhost Storage
                assignments: storageStats.assignments, // Назначения из Nhost Storage
                branches: storageStats.branches // Филиалы из Nhost Storage
            };
        } else if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            return await this.nhostService.getStats();
        } else {
            return await this.lowDBService.getStats();
        }
    }

    // === РАБОТА С ФАЙЛАМИ ===

    async uploadUserAvatar(userId, fileBuffer, fileName, mimeType) {
        if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            return await this.nhostService.uploadUserAvatar(userId, fileBuffer, fileName, mimeType);
        } else {
            // Для LowDB используем Storage Service напрямую
            return await storageService.uploadUserAvatar(userId, fileBuffer, fileName, mimeType);
        }
    }

    async getUserAvatarUrl(userId) {
        if (this.primaryStorage === 'nhost' && this.nhostService.isReady()) {
            return await this.nhostService.getUserAvatarUrl(userId);
        } else {
            // Для LowDB получаем пользователя и его avatar_file_id
            const user = await this.lowDBService.getUserById(userId);
            if (user?.avatarFileId) {
                return await storageService.getFileUrl(user.avatarFileId);
            }
            return null;
        }
    }

    // === УТИЛИТЫ ===

    async switchPrimaryStorage(newPrimary) {
        if (newPrimary !== 'lowdb' && newPrimary !== 'nhost') {
            throw new Error('Primary storage должен быть "lowdb" или "nhost"');
        }
        
        console.log(`🔄 Переключение основного хранилища на: ${newPrimary}`);
        
        if (newPrimary === 'nhost' && !this.nhostService.isReady()) {
            throw new Error('Nhost сервис не готов');
        }
        
        this.primaryStorage = newPrimary;
        console.log(`✅ Основное хранилище переключено на: ${newPrimary}`);
    }

    async fullSync() {
        if (!this.syncEnabled) {
            throw new Error('Синхронизация отключена');
        }
        
        console.log('🔄 Начинаем полную синхронизацию данных...');
        
        try {
            if (this.primaryStorage === 'nhost') {
                // Синхронизируем из Nhost в LowDB
                const nhostUsers = await this.nhostService.getUsers();
                console.log(`📊 Синхронизируем ${nhostUsers.length} пользователей из Nhost в LowDB`);
                
                for (const user of nhostUsers) {
                    try {
                        const userData = {
                            id: user.id,
                            telegramId: user.telegram_id,
                            fullName: user.full_name,
                            phone: user.phone,
                            role: user.role,
                            branchId: user.branch_id,
                            address: user.address,
                            isActive: user.is_active,
                            avatarFileId: user.avatar_file_id
                        };
                        
                        const existingUser = await this.lowDBService.getUserById(user.id);
                        if (existingUser) {
                            await this.lowDBService.updateUser(user.id, userData);
                        } else {
                            await this.lowDBService.addUser(userData);
                        }
                    } catch (error) {
                        console.error(`Ошибка синхронизации пользователя ${user.full_name}:`, error.message);
                    }
                }
            } else {
                // Синхронизируем из LowDB в Nhost
                const lowdbUsers = await this.lowDBService.getUsers();
                console.log(`📊 Синхронизируем ${lowdbUsers.length} пользователей из LowDB в Nhost`);
                
                for (const user of lowdbUsers) {
                    try {
                        const existingUser = await this.nhostService.getUserById(user.id);
                        if (existingUser) {
                            await this.nhostService.updateUser(user.id, user);
                        } else {
                            await this.nhostService.addUser(user);
                        }
                    } catch (error) {
                        console.error(`Ошибка синхронизации пользователя ${user.fullName}:`, error.message);
                    }
                }
            }
            
            console.log('✅ Полная синхронизация завершена');
            return { success: true };
        } catch (error) {
            console.error('❌ Ошибка полной синхронизации:', error.message);
            return { success: false, error: error.message };
        }
    }

    isReady() {
        if (this.primaryStorage === 'nhost') {
            return this.nhostService.isReady();
        } else {
            return this.lowDBService.isReady();
        }
    }

    getStorageInfo() {
        return {
            primaryStorage: this.primaryStorage,
            syncEnabled: this.syncEnabled,
            lowdbReady: this.lowDBService.isReady(),
            nhostReady: this.nhostService.isReady(),
            isHybrid: this.primaryStorage === 'hybrid'
        };
    }
}

// Создаем единственный экземпляр сервиса
const dataSyncService = new DataSyncService();

module.exports = dataSyncService;