const NhostStorageService = require('./NhostStorageService');
const { v4: uuidv4 } = require('uuid');

class StorageDataService {
    constructor() {
        this.storageService = NhostStorageService;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            console.log('🔄 Инициализация Storage Data Service...');
            
            // Инициализируем Nhost Storage Service
            await this.storageService.initialize();
            
            // Мигрируем данные из локальных файлов если нужно
            await this.storageService.migrateFromLocal();
            
            this.isInitialized = true;
            console.log('✅ Storage Data Service готов к работе');
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка инициализации Storage Data Service:', error.message);
            return false;
        }
    }

    // === СМЕНЫ ===

    async getTodayShifts(branchId = null) {
        try {
            const shifts = await this.storageService.getShifts();
            const today = new Date().toISOString().split('T')[0];
            
            let todayShifts = shifts.filter(shift => shift.date === today);
            
            if (branchId) {
                todayShifts = todayShifts.filter(shift => shift.branchId === branchId);
            }
            
            return todayShifts;
        } catch (error) {
            console.error('Ошибка получения смен:', error);
            return [];
        }
    }

    async addShift(shiftData) {
        try {
            const shifts = await this.storageService.getShifts();
            
            const newShift = {
                id: shiftData.id || `shift_${Date.now()}`,
                userId: shiftData.userId,
                telegramId: shiftData.telegramId,
                branchId: shiftData.branchId,
                date: shiftData.date || new Date().toISOString().split('T')[0],
                startTime: shiftData.startTime,
                endTime: shiftData.endTime,
                isWorking: shiftData.isWorking !== false,
                destinationAddress: shiftData.destinationAddress || '',
                createdAt: new Date().toISOString()
            };

            // Проверяем, нет ли уже смены у пользователя на сегодня
            const existingShiftIndex = shifts.findIndex(shift => 
                shift.userId === newShift.userId && shift.date === newShift.date
            );

            if (existingShiftIndex !== -1) {
                // Обновляем существующую смену
                shifts[existingShiftIndex] = { ...shifts[existingShiftIndex], ...newShift };
            } else {
                // Добавляем новую смену
                shifts.push(newShift);
            }

            await this.storageService.saveShifts(shifts);
            return newShift;
        } catch (error) {
            console.error('Ошибка добавления смены:', error);
            throw error;
        }
    }

    async hasUserShiftToday(userId) {
        try {
            const todayShifts = await this.getTodayShifts();
            return todayShifts.some(shift => shift.userId === userId);
        } catch (error) {
            console.error('Ошибка проверки смены пользователя:', error);
            return false;
        }
    }

    async deleteShift(shiftId) {
        try {
            const shifts = await this.storageService.getShifts();
            const shiftIndex = shifts.findIndex(shift => shift.id === shiftId);
            
            if (shiftIndex === -1) {
                throw new Error('Смена не найдена');
            }

            const deletedShift = shifts[shiftIndex];
            
            // Получаем информацию о пользователе через DataSyncService
            const DataSyncService = require('./DataSyncService');
            const user = await DataSyncService.getUserById(deletedShift.userId);
            
            // Находим затронутые назначения
            const assignments = await this.storageService.getAssignments();
            const affectedAssignments = assignments.filter(assignment => 
                assignment.courierId === deletedShift.userId || assignment.passengerId === deletedShift.userId
            );
            
            console.log(`Found ${affectedAssignments.length} affected assignments`);
            
            // Удаляем смену
            shifts.splice(shiftIndex, 1);
            await this.storageService.saveShifts(shifts);
            
            console.log('✅ Shift deleted successfully');
            return { 
                success: true, 
                user: user,
                affectedAssignments: affectedAssignments 
            };
        } catch (error) {
            console.error('Ошибка удаления смены:', error);
            throw error;
        }
    }

    // === НАЗНАЧЕНИЯ ===

    async getTodayAssignments(branchId = null) {
        try {
            const assignments = await this.storageService.getAssignments();
            const today = new Date().toISOString().split('T')[0];
            
            let todayAssignments = assignments.filter(assignment => assignment.date === today);
            
            if (branchId) {
                todayAssignments = todayAssignments.filter(assignment => assignment.branchId === branchId);
            }
            
            return todayAssignments;
        } catch (error) {
            console.error('Ошибка получения назначений:', error);
            return [];
        }
    }

    async addAssignment(assignmentData) {
        try {
            const assignments = await this.storageService.getAssignments();
            
            const newAssignment = {
                id: assignmentData.id || `assignment_${Date.now()}`,
                courierId: assignmentData.courierId,
                passengerId: assignmentData.passengerId,
                branchId: assignmentData.branchId,
                pickupAddress: assignmentData.pickupAddress,
                dropoffAddress: assignmentData.dropoffAddress,
                assignedTime: assignmentData.assignedTime,
                date: assignmentData.date || new Date().toISOString().split('T')[0],
                status: assignmentData.status || 'assigned',
                notes: assignmentData.notes || '',
                createdAt: new Date().toISOString()
            };

            assignments.push(newAssignment);
            await this.storageService.saveAssignments(assignments);
            
            return newAssignment;
        } catch (error) {
            console.error('Ошибка добавления назначения:', error);
            throw error;
        }
    }

    async updateAssignment(assignmentId, updateData) {
        try {
            const assignments = await this.storageService.getAssignments();
            const assignmentIndex = assignments.findIndex(assignment => assignment.id === assignmentId);
            
            if (assignmentIndex === -1) {
                throw new Error('Назначение не найдено');
            }

            assignments[assignmentIndex] = { 
                ...assignments[assignmentIndex], 
                ...updateData,
                updatedAt: new Date().toISOString()
            };
            
            await this.storageService.saveAssignments(assignments);
            return assignments[assignmentIndex];
        } catch (error) {
            console.error('Ошибка обновления назначения:', error);
            throw error;
        }
    }

    async deleteAssignment(assignmentId) {
        try {
            const assignments = await this.storageService.getAssignments();
            const assignmentIndex = assignments.findIndex(assignment => assignment.id === assignmentId);
            
            if (assignmentIndex === -1) {
                throw new Error('Назначение не найдено');
            }

            const deletedAssignment = assignments[assignmentIndex];
            assignments.splice(assignmentIndex, 1);
            
            await this.storageService.saveAssignments(assignments);
            return deletedAssignment;
        } catch (error) {
            console.error('Ошибка удаления назначения:', error);
            throw error;
        }
    }

    // === ФИЛИАЛЫ ===

    async getBranches() {
        try {
            return await this.storageService.getBranches();
        } catch (error) {
            console.error('Ошибка получения филиалов:', error);
            return [];
        }
    }

    async addBranch(branchData) {
        try {
            const branches = await this.storageService.getBranches();
            
            const newBranch = {
                id: branchData.id || uuidv4(),
                name: branchData.name,
                address: branchData.address,
                phone: branchData.phone || '',
                isActive: branchData.isActive !== false,
                createdAt: new Date().toISOString()
            };

            branches.push(newBranch);
            await this.storageService.saveBranches(branches);
            
            return newBranch;
        } catch (error) {
            console.error('Ошибка добавления филиала:', error);
            throw error;
        }
    }

    // === КОНФИГУРАЦИЯ ===

    async getConfig() {
        try {
            return await this.storageService.getConfig();
        } catch (error) {
            console.error('Ошибка получения конфигурации:', error);
            return {};
        }
    }

    async saveConfig(config) {
        try {
            await this.storageService.saveConfig(config);
            return true;
        } catch (error) {
            console.error('Ошибка сохранения конфигурации:', error);
            return false;
        }
    }

    // === СТАТИСТИКА ===

    async getStats() {
        try {
            const shifts = await this.getTodayShifts();
            const assignments = await this.getTodayAssignments();
            const branches = await this.getBranches();

            return {
                users: {
                    total: 0, // Пользователи в PostgreSQL
                    couriers: 0,
                    passengers: 0
                },
                shifts: {
                    today: shifts.length
                },
                assignments: {
                    today: assignments.length
                },
                branches: branches.length
            };
        } catch (error) {
            console.error('Ошибка получения статистики:', error);
            return {
                users: { total: 0, couriers: 0, passengers: 0 },
                shifts: { today: 0 },
                assignments: { today: 0 },
                branches: 0
            };
        }
    }

    // === УТИЛИТЫ ===

    isReady() {
        return this.isInitialized && this.storageService.isReady();
    }

    getStorageInfo() {
        return {
            isReady: this.isReady(),
            storageService: this.storageService.getStorageInfo()
        };
    }

    clearCache() {
        this.storageService.clearCache();
    }
}

// Создаем единственный экземпляр сервиса
const storageDataService = new StorageDataService();

module.exports = storageDataService;