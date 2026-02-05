const SupabaseUserService = require('./SupabaseUserService');

class SupabaseDataSyncService {
    constructor() {
        this.userService = SupabaseUserService;
        this.primaryStorage = 'supabase';
    }

    async initialize() {
        try {
            console.log('🔄 Инициализация Supabase Data Service...');
            
            await this.userService.initialize();
            
            console.log('✅ Supabase готов');
            console.log('   👥 Пользователи → Supabase PostgreSQL');
            console.log('   🏢 Филиалы → Supabase PostgreSQL');
            console.log('   🚗 Смены → Supabase PostgreSQL');
            console.log('   📋 Назначения → Supabase PostgreSQL');
            
            console.log('✅ Supabase Data Service готов к работе');
            return true;
        } catch (error) {
            console.error('❌ Ошибка инициализации Supabase Data Service:', error.message);
            return false;
        }
    }

    getStorageInfo() {
        return {
            primaryStorage: 'supabase',
            syncEnabled: false,
            lowdbReady: false,
            supabaseReady: this.userService.isReady(),
            storageReady: false,
            isHybrid: false
        };
    }

    isReady() {
        return this.userService.isReady();
    }

    // === ПОЛЬЗОВАТЕЛИ ===

    async getUsers() {
        return await this.userService.getUsers();
    }

    async getUserById(id) {
        return await this.userService.getUserById(id);
    }

    async getUserByTelegramId(telegramId) {
        return await this.userService.getUserByTelegramId(telegramId);
    }

    async addUser(userData) {
        return await this.userService.addUser(userData);
    }

    async updateUser(id, userData) {
        return await this.userService.updateUser(id, userData);
    }

    async deleteUser(id) {
        return await this.userService.deleteUser(id);
    }

    // === ФИЛИАЛЫ ===

    async getBranches() {
        return await this.userService.getBranches();
    }

    // === СМЕНЫ ===

    async getTodayShifts(branchId = null) {
        const supabaseShifts = await this.userService.getTodayShifts(branchId);
        // Преобразуем формат для совместимости
        return supabaseShifts.map(shift => ({
            id: shift.id,
            userId: shift.user_id,
            telegramId: shift.taxi_user?.telegram_id,
            branchId: shift.branch_id,
            date: shift.date,
            startTime: shift.start_time,
            endTime: shift.end_time,
            isWorking: shift.is_working,
            user: shift.taxi_user
        }));
    }

    async getAllShifts() {
        return await this.userService.getAllShifts();
    }

    async addShift(shiftData) {
        return await this.userService.addShift(shiftData);
    }

    async updateShift(shiftId, shiftData) {
        return await this.userService.updateShift(shiftId, shiftData);
    }

    async deleteShift(shiftId) {
        return await this.userService.deleteShift(shiftId);
    }

    async hasUserShiftToday(userId) {
        const shifts = await this.userService.getTodayShifts();
        return shifts.some(shift => shift.user_id === userId);
    }

    async resetAllShifts() {
        return await this.userService.resetAllShifts();
    }

    async syncUserDataWithShifts() {
        return await this.userService.syncUserDataWithShifts();
    }

    // === НАЗНАЧЕНИЯ ===

    async getTodayAssignments(branchId = null) {
        const supabaseAssignments = await this.userService.getTodayAssignments(branchId);
        // Преобразуем формат для совместимости
        return supabaseAssignments.map(assignment => ({
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
            passenger: assignment.passenger
        }));
    }

    async getAllAssignments() {
        return await this.userService.getAllAssignments();
    }

    async addAssignment(assignmentData) {
        return await this.userService.addAssignment(assignmentData);
    }

    async updateAssignment(assignmentId, assignmentData) {
        return await this.userService.updateAssignment(assignmentId, assignmentData);
    }

    async deleteAssignment(assignmentId) {
        return await this.userService.deleteAssignment(assignmentId);
    }

    async getAssignmentById(assignmentId) {
        return await this.userService.getAssignmentById(assignmentId);
    }

    // === ДОСТУПНЫЕ РЕСУРСЫ ===

    async getAvailableCouriers(date, branchId) {
        // Возвращаем всех активных курьеров
        const users = await this.getUsers();
        let couriers = users.filter(user => user.role === 'courier' && (user.is_active || user.isActive));
        
        // Фильтруем по филиалу если указан
        if (branchId) {
            couriers = couriers.filter(user => (user.branch_id || user.branchId) === branchId);
        }
        
        return couriers;
    }

    async getAvailablePassengers(date, branchId) {
        // Возвращаем всех активных пассажиров
        const users = await this.getUsers();
        let passengers = users.filter(user => user.role === 'passenger' && (user.is_active || user.isActive));
        
        // Фильтруем по филиалу если указан
        if (branchId) {
            passengers = passengers.filter(user => (user.branch_id || user.branchId) === branchId);
        }
        
        return passengers;
    }

    // === СТАТИСТИКА ===

    async getStats() {
        return await this.userService.getStats();
    }

    // === КОНФИГУРАЦИЯ ===

    async getConfig() {
        // Возвращаем базовую конфигурацию
        return {
            version: '2.0.0-supabase',
            storage: 'supabase',
            features: {
                telegram: !!process.env.TELEGRAM_BOT_TOKEN,
                notifications: true,
                realtime: true
            }
        };
    }
}

module.exports = new SupabaseDataSyncService();