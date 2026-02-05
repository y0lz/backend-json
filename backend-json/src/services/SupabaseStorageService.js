const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

class SupabaseStorageService {
    constructor() {
        this.supabaseUrl = process.env.SUPABASE_URL;
        this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        this.bucketName = 'data'; // Bucket для JSON файлов
        this.supabase = null;
        
        // Кэш для JSON файлов
        this.jsonCache = new Map();
        this.isInitialized = false;
    }

    async initialize() {
        try {
            console.log('🔄 Инициализация Supabase Storage Service...');
            
            if (!this.supabaseUrl || !this.supabaseServiceKey) {
                throw new Error('Отсутствуют переменные окружения SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY');
            }

            // Создаем клиент Supabase с service role key для полного доступа к Storage
            this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });
            
            // Проверяем/создаем bucket
            await this.ensureBucket();
            
            // Загружаем существующие файлы
            await this.loadExistingFiles();
            
            // Мигрируем данные из локальных файлов если нужно
            await this.migrateFromLocal();
            
            this.isInitialized = true;
            console.log('✅ Supabase Storage Service готов к работе');
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка инициализации Supabase Storage Service:', error.message);
            console.log('⚠️ Продолжаем без Storage, используя пустые данные');
            this.isInitialized = true; // Продолжаем работу с пустыми данными
            return true;
        }
    }

    async ensureBucket() {
        try {
            // Проверяем существует ли bucket
            const { data: buckets, error: listError } = await this.supabase.storage.listBuckets();
            
            if (listError) {
                throw listError;
            }

            const bucketExists = buckets.some(bucket => bucket.name === this.bucketName);
            
            if (!bucketExists) {
                console.log(`📦 Создаем bucket: ${this.bucketName}`);
                const { error: createError } = await this.supabase.storage.createBucket(this.bucketName, {
                    public: false,
                    allowedMimeTypes: ['application/json'],
                    fileSizeLimit: 1024 * 1024 * 10 // 10MB
                });

                if (createError) {
                    throw createError;
                }
                
                console.log(`✅ Bucket ${this.bucketName} создан`);
            } else {
                console.log(`✅ Bucket ${this.bucketName} уже существует`);
            }
        } catch (error) {
            console.error(`❌ Ошибка работы с bucket: ${error.message}`);
            throw error;
        }
    }

    async loadExistingFiles() {
        try {
            const { data: files, error } = await this.supabase.storage
                .from(this.bucketName)
                .list('', {
                    limit: 100,
                    sortBy: { column: 'name', order: 'asc' }
                });

            if (error) {
                throw error;
            }

            console.log(`📁 Найдено файлов в Supabase Storage: ${files.length}`);
            
            files.forEach(file => {
                if (file.name.endsWith('.json')) {
                    console.log(`   - ${file.name}`);
                }
            });
        } catch (error) {
            console.log(`⚠️ Не удалось загрузить список файлов: ${error.message}`);
        }
    }

    async getJsonFile(fileName) {
        try {
            // Проверяем кэш
            if (this.jsonCache.has(fileName)) {
                return this.jsonCache.get(fileName);
            }

            // Скачиваем файл из Supabase Storage
            const { data, error } = await this.supabase.storage
                .from(this.bucketName)
                .download(fileName);

            if (error) {
                // Если файл не найден, возвращаем пустые данные
                if (error.message.includes('not found') || error.message.includes('does not exist')) {
                    const emptyData = fileName.includes('config') ? {} : [];
                    this.jsonCache.set(fileName, emptyData);
                    return emptyData;
                }
                throw error;
            }

            // Преобразуем Blob в текст
            const content = await data.text();
            const jsonData = JSON.parse(content);
            
            // Сохраняем в кэш
            this.jsonCache.set(fileName, jsonData);
            
            return jsonData;
        } catch (error) {
            console.error(`Ошибка получения ${fileName}:`, error.message);
            const emptyData = fileName.includes('config') ? {} : [];
            this.jsonCache.set(fileName, emptyData);
            return emptyData;
        }
    }

    async saveJsonFile(fileName, data) {
        try {
            // Сохраняем в кэш в любом случае
            this.jsonCache.set(fileName, data);
            
            // Преобразуем данные в JSON строку
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            
            // Загружаем в Supabase Storage
            const { error } = await this.supabase.storage
                .from(this.bucketName)
                .upload(fileName, blob, {
                    cacheControl: '3600',
                    upsert: true // Перезаписываем если файл существует
                });

            if (error) {
                console.error(`Ошибка сохранения ${fileName} в Storage:`, error.message);
                // Продолжаем работу с кэшем
            } else {
                console.log(`💾 Файл сохранен в Supabase Storage: ${fileName}`);
            }
            
            return true;
        } catch (error) {
            console.error(`Ошибка сохранения ${fileName}:`, error.message);
            // Все равно возвращаем true, так как данные в кэше
            return true;
        }
    }

    // === УДОБНЫЕ МЕТОДЫ ===
    
    async getShifts() {
        return await this.getJsonFile('shifts.json');
    }

    async saveShifts(shifts) {
        return await this.saveJsonFile('shifts.json', shifts);
    }

    async getAssignments() {
        return await this.getJsonFile('assignments.json');
    }

    async saveAssignments(assignments) {
        return await this.saveJsonFile('assignments.json', assignments);
    }

    async getBranches() {
        return await this.getJsonFile('branches.json');
    }

    async saveBranches(branches) {
        return await this.saveJsonFile('branches.json', branches);
    }

    async getConfig() {
        return await this.getJsonFile('config.json');
    }

    async saveConfig(config) {
        return await this.saveJsonFile('config.json', config);
    }

    // === ЗАГРУЗКА OPENAPI СПЕЦИФИКАЦИИ ===
    
    async uploadOpenAPISpec() {
        try {
            console.log('🔄 Загрузка OpenAPI спецификации в Supabase Storage...');
            
            const fs = require('fs');
            const path = require('path');
            
            // Читаем файл OpenAPISpec.json из корня проекта
            const specPath = path.join(__dirname, '../../../OpenAPISpec.json');
            
            if (!fs.existsSync(specPath)) {
                throw new Error('Файл OpenAPISpec.json не найден в корне проекта');
            }
            
            const specContent = fs.readFileSync(specPath, 'utf8');
            const specData = JSON.parse(specContent);
            
            // Сохраняем в Storage
            const success = await this.saveJsonFile('OpenAPISpec.json', specData);
            
            if (success) {
                console.log('✅ OpenAPI спецификация успешно загружена в Supabase Storage');
                return true;
            } else {
                console.log('⚠️ OpenAPI спецификация сохранена в кэш (Storage недоступен)');
                return true;
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки OpenAPI спецификации:', error.message);
            return false;
        }
    }

    async getOpenAPISpec() {
        return await this.getJsonFile('OpenAPISpec.json');
    }

    // === МИГРАЦИЯ ИЗ ЛОКАЛЬНЫХ ФАЙЛОВ ===
    
    async migrateFromLocal() {
        try {
            console.log('🔄 Миграция JSON файлов из локальной папки в Supabase Storage...');
            
            const fs = require('fs');
            const localDataPath = path.join(__dirname, '../../data');
            
            const filesToMigrate = [
                'shifts.json',
                'assignments.json',
                'branches.json',
                'config.json'
            ];

            let migratedCount = 0;
            
            for (const fileName of filesToMigrate) {
                const filePath = path.join(localDataPath, fileName);
                
                if (fs.existsSync(filePath)) {
                    try {
                        const content = fs.readFileSync(filePath, 'utf8');
                        const data = JSON.parse(content);
                        
                        // Проверяем, есть ли данные для миграции
                        const hasData = Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0;
                        
                        if (hasData) {
                            const success = await this.saveJsonFile(fileName, data);
                            if (success) {
                                migratedCount++;
                                console.log(`   ✅ ${fileName} мигрирован (${Array.isArray(data) ? data.length : Object.keys(data).length} записей)`);
                            } else {
                                console.log(`   ❌ ${fileName} не удалось мигрировать`);
                            }
                        } else {
                            // Создаем пустой файл
                            const emptyData = fileName.includes('config') ? {} : [];
                            const success = await this.saveJsonFile(fileName, emptyData);
                            if (success) {
                                migratedCount++;
                                console.log(`   ✅ ${fileName} создан пустым`);
                            }
                        }
                    } catch (error) {
                        console.log(`   ❌ ${fileName}: ${error.message}`);
                    }
                } else {
                    // Создаем пустой файл
                    const emptyData = fileName.includes('config') ? {} : [];
                    const success = await this.saveJsonFile(fileName, emptyData);
                    if (success) {
                        migratedCount++;
                        console.log(`   ✅ ${fileName} создан пустым`);
                    }
                }
            }
            
            // Загружаем OpenAPI спецификацию
            const openApiUploaded = await this.uploadOpenAPISpec();
            if (openApiUploaded) {
                migratedCount++;
            }
            
            console.log(`🎉 Миграция завершена! Мигрировано файлов: ${migratedCount}`);
            return migratedCount;
            
        } catch (error) {
            console.error('❌ Ошибка миграции:', error.message);
            return 0;
        }
    }

    // === РАБОТА С ФАЙЛАМИ ПОЛЬЗОВАТЕЛЕЙ ===

    async uploadUserAvatar(userId, fileBuffer, fileName, mimeType) {
        try {
            const filePath = `avatars/${userId}/${fileName}`;
            
            const { data, error } = await this.supabase.storage
                .from(this.bucketName)
                .upload(filePath, fileBuffer, {
                    contentType: mimeType,
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) {
                throw error;
            }

            return {
                success: true,
                fileId: data.path,
                url: this.getFileUrl(data.path)
            };
        } catch (error) {
            console.error('Ошибка загрузки аватара:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    getFileUrl(filePath) {
        if (!this.supabase) return null;
        
        const { data } = this.supabase.storage
            .from(this.bucketName)
            .getPublicUrl(filePath);

        return data.publicUrl;
    }

    clearCache() {
        this.jsonCache.clear();
        console.log('🧹 Кэш JSON файлов очищен');
    }

    isReady() {
        return this.isInitialized && this.supabase !== null;
    }

    getStorageInfo() {
        return {
            isReady: this.isInitialized,
            cachedFiles: Array.from(this.jsonCache.keys()),
            bucketName: this.bucketName,
            storageUrl: this.supabaseUrl
        };
    }

    getClient() {
        return this.supabase;
    }
}

// Создаем единственный экземпляр сервиса
const supabaseStorageService = new SupabaseStorageService();

module.exports = supabaseStorageService;