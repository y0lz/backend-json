const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

class SupabaseUserService {
    constructor() {
        this.isInitialized = false;
        this.supabaseUrl = process.env.SUPABASE_URL;
        this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        this.supabase = null;
    }

    async initialize() {
        try {
            console.log('🔄 Инициализация Supabase User Service...');
            
            if (!this.supabaseUrl || !this.supabaseServiceKey) {
                throw new Error('Отсутствуют переменные окружения SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY');
            }

            // Создаем клиент Supabase с service role key для полного доступа
            this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });
            
            // Проверяем подключение
            await this.testConnection();
            
            this.isInitialized = true;
            console.log('✅ Supabase User Service готов к работе');
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка инициализации Supabase User Service:', error.message);
            return false;
        }
    }

    async testConnection() {
        try {
            const { count, error } = await this.supabase
                .from('taxi_users')
                .select('*', { count: 'exact', head: true });

            if (error) {
                throw error;
            }

            console.log(`✅ Подключение к Supabase проверено. Пользователей: ${count || 0}`);
            return true;
        } catch (error) {
            console.error('❌ Ошибка подключения к Supabase:', error.message);
            throw error;
        }
    }

    // === ПОЛЬЗОВАТЕЛИ ===

    async getUsers() {
        try {
            const { data, error } = await this.supabase
                .from('taxi_users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Ошибка получения пользователей:', error);
            return [];
        }
    }

    async getUserById(id) {
        try {
            const { data, error } = await this.supabase
                .from('taxi_users')
                .select('*')
                .eq('id', id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = not found
                throw error;
            }

            return data || null;
        } catch (error) {
            console.error('Ошибка получения пользователя:', error);
            return null;
        }
    }

    async getUserByTelegramId(telegramId) {
        try {
            const { data, error } = await this.supabase
                .from('taxi_users')
                .select('*')
                .eq('telegram_id', telegramId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = not found
                throw error;
            }

            return data || null;
        } catch (error) {
            console.error('Ошибка получения пользователя по Telegram ID:', error);
            return null;
        }
    }

    async addUser(userData) {
        try {
            const userInput = {
                telegram_id: userData.telegramId,
                full_name: userData.fullName,
                phone: userData.phone,
                role: userData.role,
                branch_id: userData.branchId,
                address: userData.address,
                is_active: userData.isActive !== false,
                position: userData.position,
                work_until: userData.workUntil,
                car_model: userData.carModel,
                car_number: userData.carNumber
            };

            const { data, error } = await this.supabase
                .from('taxi_users')
                .insert([userInput])
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Ошибка добавления пользователя:', error);
            throw error;
        }
    }

    async updateUser(id, userData) {
        try {
            const updateData = {};
            
            if (userData.telegramId !== undefined) updateData.telegram_id = userData.telegramId;
            if (userData.fullName !== undefined) updateData.full_name = userData.fullName;
            if (userData.phone !== undefined) updateData.phone = userData.phone;
            if (userData.role !== undefined) updateData.role = userData.role;
            if (userData.branchId !== undefined) updateData.branch_id = userData.branchId;
            if (userData.address !== undefined) updateData.address = userData.address;
            if (userData.isActive !== undefined) updateData.is_active = userData.isActive;
            if (userData.position !== undefined) updateData.position = userData.position;
            if (userData.workUntil !== undefined) updateData.work_until = userData.workUntil;
            if (userData.carModel !== undefined) updateData.car_model = userData.carModel;
            if (userData.carNumber !== undefined) updateData.car_number = userData.carNumber;

            const { data, error } = await this.supabase
                .from('taxi_users')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Ошибка обновления пользователя:', error);
            throw error;
        }
    }

    async deleteUser(id) {
        try {
            const { data, error } = await this.supabase
                .from('taxi_users')
                .delete()
                .eq('id', id)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Ошибка удаления пользователя:', error);
            throw error;
        }
    }

    // === ФИЛИАЛЫ ===

    async getBranches() {
        try {
            const { data, error } = await this.supabase
                .from('taxi_branches')
                .select('*')
                .order('name', { ascending: true });

            if (error) {
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Ошибка получения филиалов:', error);
            return [];
        }
    }

    async addBranch(branchData) {
        try {
            const { data, error } = await this.supabase
                .from('taxi_branches')
                .insert([branchData])
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Ошибка добавления филиала:', error);
            throw error;
        }
    }

    // === СМЕНЫ ===

    async getTodayShifts(branchId = null) {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            let query = this.supabase
                .from('taxi_shifts')
                .select(`
                    *,
                    taxi_user:taxi_users(*)
                `)
                .eq('date', today);

            if (branchId) {
                query = query.eq('branch_id', branchId);
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Ошибка получения смен:', error);
            return [];
        }
    }

    async getAllShifts() {
        try {
            const { data, error } = await this.supabase
                .from('taxi_shifts')
                .select(`
                    *,
                    taxi_user:taxi_users(*)
                `)
                .order('date', { ascending: false });

            if (error) {
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Ошибка получения всех смен:', error);
            return [];
        }
    }

    async resetAllShifts() {
        try {
            const { error } = await this.supabase
                .from('taxi_shifts')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Удаляем все записи

            if (error) {
                throw error;
            }

            return { success: true, message: 'Все смены сброшены' };
        } catch (error) {
            console.error('Ошибка сброса смен:', error);
            throw error;
        }
    }

    async syncUserDataWithShifts() {
        // В Supabase данные всегда синхронизированы через foreign keys
        return 0;
    }

    async addShift(shiftData) {
        try {
            // Преобразуем camelCase в snake_case для Supabase
            const supabaseShiftData = {
                user_id: shiftData.userId,
                branch_id: shiftData.branchId,
                date: shiftData.date || new Date().toISOString().split('T')[0],
                start_time: shiftData.startTime,
                end_time: shiftData.endTime,
                is_working: shiftData.isWorking !== undefined ? shiftData.isWorking : true
            };

            const { data, error } = await this.supabase
                .from('taxi_shifts')
                .insert([supabaseShiftData])
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Ошибка добавления смены:', error);
            throw error;
        }
    }

    async updateShift(shiftId, shiftData) {
        try {
            // Преобразуем camelCase в snake_case для Supabase
            const supabaseShiftData = {};
            
            if (shiftData.userId !== undefined) supabaseShiftData.user_id = shiftData.userId;
            if (shiftData.branchId !== undefined) supabaseShiftData.branch_id = shiftData.branchId;
            if (shiftData.date !== undefined) supabaseShiftData.date = shiftData.date;
            if (shiftData.startTime !== undefined) supabaseShiftData.start_time = shiftData.startTime;
            if (shiftData.endTime !== undefined) supabaseShiftData.end_time = shiftData.endTime;
            if (shiftData.isWorking !== undefined) supabaseShiftData.is_working = shiftData.isWorking;

            const { data, error } = await this.supabase
                .from('taxi_shifts')
                .update(supabaseShiftData)
                .eq('id', shiftId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Ошибка обновления смены:', error);
            throw error;
        }
    }

    async deleteShift(shiftId) {
        try {
            // Сначала получаем информацию о смене
            const { data: shift, error: getError } = await this.supabase
                .from('taxi_shifts')
                .select(`
                    *,
                    taxi_user:taxi_users(*)
                `)
                .eq('id', shiftId)
                .single();

            if (getError) {
                throw getError;
            }

            if (!shift) {
                throw new Error('Смена не найдена');
            }

            // Получаем затронутые назначения
            const { data: assignments, error: assignmentsError } = await this.supabase
                .from('taxi_assignments')
                .select('*')
                .or(`courier_id.eq.${shift.user_id},passenger_id.eq.${shift.user_id}`)
                .eq('date', shift.date);

            if (assignmentsError) {
                console.error('Ошибка получения назначений:', assignmentsError);
            }

            // Удаляем смену
            const { error: deleteError } = await this.supabase
                .from('taxi_shifts')
                .delete()
                .eq('id', shiftId);

            if (deleteError) {
                throw deleteError;
            }

            return {
                success: true,
                user: shift.taxi_user,
                affectedAssignments: assignments || []
            };
        } catch (error) {
            console.error('Ошибка удаления смены:', error);
            throw error;
        }
    }

    // === НАЗНАЧЕНИЯ ===

    async getTodayAssignments(branchId = null) {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            let query = this.supabase
                .from('taxi_assignments')
                .select(`
                    *,
                    courier:courier_id(full_name),
                    passenger:passenger_id(full_name)
                `)
                .eq('date', today);

            if (branchId) {
                query = query.eq('branch_id', branchId);
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Ошибка получения назначений:', error);
            return [];
        }
    }

    async getAllAssignments() {
        try {
            const { data, error } = await this.supabase
                .from('taxi_assignments')
                .select(`
                    *,
                    courier:courier_id(full_name),
                    passenger:passenger_id(full_name)
                `)
                .order('date', { ascending: false });

            if (error) {
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Ошибка получения всех назначений:', error);
            return [];
        }
    }

    async addAssignment(assignmentData) {
        try {
            // Преобразуем camelCase в snake_case для Supabase
            const supabaseAssignmentData = {
                courier_id: assignmentData.courierId,
                passenger_id: assignmentData.passengerId,
                branch_id: assignmentData.branchId,
                pickup_address: assignmentData.pickupAddress,
                dropoff_address: assignmentData.dropoffAddress,
                date: assignmentData.date || new Date().toISOString().split('T')[0],
                status: assignmentData.status || 'pending',
                notes: assignmentData.notes,
                assigned_time: assignmentData.assignedTime || new Date().toISOString()
            };

            const { data, error } = await this.supabase
                .from('taxi_assignments')
                .insert([supabaseAssignmentData])
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Ошибка добавления назначения:', error);
            throw error;
        }
    }

    async updateAssignment(assignmentId, assignmentData) {
        try {
            // Преобразуем camelCase в snake_case для Supabase
            const supabaseAssignmentData = {};
            
            if (assignmentData.courierId !== undefined) supabaseAssignmentData.courier_id = assignmentData.courierId;
            if (assignmentData.passengerId !== undefined) supabaseAssignmentData.passenger_id = assignmentData.passengerId;
            if (assignmentData.branchId !== undefined) supabaseAssignmentData.branch_id = assignmentData.branchId;
            if (assignmentData.pickupAddress !== undefined) supabaseAssignmentData.pickup_address = assignmentData.pickupAddress;
            if (assignmentData.dropoffAddress !== undefined) supabaseAssignmentData.dropoff_address = assignmentData.dropoffAddress;
            if (assignmentData.date !== undefined) supabaseAssignmentData.date = assignmentData.date;
            if (assignmentData.status !== undefined) supabaseAssignmentData.status = assignmentData.status;
            if (assignmentData.notes !== undefined) supabaseAssignmentData.notes = assignmentData.notes;
            if (assignmentData.assignedTime !== undefined) supabaseAssignmentData.assigned_time = assignmentData.assignedTime;

            const { data, error } = await this.supabase
                .from('taxi_assignments')
                .update(supabaseAssignmentData)
                .eq('id', assignmentId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Ошибка обновления назначения:', error);
            throw error;
        }
    }

    async deleteAssignment(assignmentId) {
        try {
            // Сначала получаем информацию о назначении
            const { data: assignment, error: getError } = await this.supabase
                .from('taxi_assignments')
                .select('*')
                .eq('id', assignmentId)
                .single();

            if (getError) {
                throw getError;
            }

            if (!assignment) {
                throw new Error('Назначение не найдено');
            }

            // Удаляем назначение
            const { error: deleteError } = await this.supabase
                .from('taxi_assignments')
                .delete()
                .eq('id', assignmentId);

            if (deleteError) {
                throw deleteError;
            }

            return assignment;
        } catch (error) {
            console.error('Ошибка удаления назначения:', error);
            throw error;
        }
    }

    async getAssignmentById(assignmentId) {
        try {
            const { data, error } = await this.supabase
                .from('taxi_assignments')
                .select(`
                    *,
                    courier:courier_id(full_name),
                    passenger:passenger_id(full_name)
                `)
                .eq('id', assignmentId)
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Ошибка получения назначения:', error);
            return null;
        }
    }

    // === СТАТИСТИКА ===

    async getStats() {
        try {
            const today = new Date().toISOString().split('T')[0];

            // Получаем статистику пользователей
            const { count: totalUsers } = await this.supabase
                .from('taxi_users')
                .select('*', { count: 'exact', head: true });

            const { count: couriers } = await this.supabase
                .from('taxi_users')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'courier');

            const { count: passengers } = await this.supabase
                .from('taxi_users')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'passenger');

            // Получаем статистику смен
            const { count: todayShifts } = await this.supabase
                .from('taxi_shifts')
                .select('*', { count: 'exact', head: true })
                .eq('date', today);

            // Получаем статистику назначений
            const { count: todayAssignments } = await this.supabase
                .from('taxi_assignments')
                .select('*', { count: 'exact', head: true })
                .eq('date', today);

            // Получаем статистику филиалов
            const { count: branches } = await this.supabase
                .from('taxi_branches')
                .select('*', { count: 'exact', head: true });

            return {
                users: {
                    total: totalUsers || 0,
                    couriers: couriers || 0,
                    passengers: passengers || 0
                },
                shifts: {
                    today: todayShifts || 0
                },
                assignments: {
                    today: todayAssignments || 0
                },
                branches: branches || 0
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

    isReady() {
        return this.isInitialized && this.supabase !== null;
    }

    getClient() {
        return this.supabase;
    }
}

// Создаем единственный экземпляр сервиса
const supabaseUserService = new SupabaseUserService();

module.exports = supabaseUserService;