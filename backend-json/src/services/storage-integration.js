const { createClient, withAdminSession } = require('@nhost/nhost-js')
const nhostConfig = require('../config/nhost.config')

class StorageIntegrationService {
    constructor() {
        this.adminClient = null
        this.isInitialized = false
    }

    async initialize() {
        try {
            console.log('🔄 Инициализация Storage Integration Service...')
            
            // Создаем admin клиента для серверных операций
            this.adminClient = createClient({
                subdomain: nhostConfig.subdomain,
                region: nhostConfig.region,
                configure: [
                    withAdminSession({
                        adminSecret: process.env.NHOST_ADMIN_SECRET,
                        role: 'admin',
                        sessionVariables: {
                            'service': 'taxi-management'
                        }
                    })
                ]
            })

            this.isInitialized = true
            console.log('✅ Storage Integration Service инициализирован')
            
            return true
        } catch (error) {
            console.error('❌ Ошибка инициализации Storage Service:', error.message)
            return false
        }
    }

    // Загрузка аватара пользователя
    async uploadUserAvatar(userId, fileBuffer, fileName, mimeType) {
        if (!this.isInitialized) {
            throw new Error('Storage Service не инициализирован')
        }

        try {
            console.log(`📤 Загрузка аватара для пользователя ${userId}...`)

            // Используем прямой HTTP запрос к Storage API
            const FormData = require('form-data')
            const formData = new FormData()
            
            const finalFileName = `avatar-${userId}-${fileName}`
            formData.append('file[]', fileBuffer, {
                filename: finalFileName,
                contentType: mimeType
            })
            formData.append('bucket-id', 'default')

            const storageUrl = `https://dnwvmirubduuihhuulir.storage.eu-central-1.nhost.run/v1/files`
            
            const response = await fetch(storageUrl, {
                method: 'POST',
                body: formData,
                headers: {
                    'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET,
                    ...formData.getHeaders()
                }
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error?.message || `HTTP ${response.status}`)
            }

            const uploadedFile = result.processedFiles?.[0]
            
            console.log(`✅ Аватар загружен: ${uploadedFile.id}`)
            
            return {
                fileId: uploadedFile.id,
                fileName: uploadedFile.name,
                size: uploadedFile.size,
                url: await this.getFileUrl(uploadedFile.id)
            }

        } catch (error) {
            console.error('❌ Ошибка загрузки аватара:', error.message)
            throw error
        }
    }

    // Загрузка документа
    async uploadDocument(userId, fileBuffer, fileName, mimeType, category = 'general') {
        if (!this.isInitialized) {
            throw new Error('Storage Service не инициализирован')
        }

        try {
            console.log(`📄 Загрузка документа для пользователя ${userId}...`)

            const FormData = require('form-data')
            const formData = new FormData()
            
            const finalFileName = `doc-${userId}-${Date.now()}-${fileName}`
            formData.append('file[]', fileBuffer, {
                filename: finalFileName,
                contentType: mimeType
            })
            formData.append('bucket-id', 'default')
            formData.append('metadata[]', JSON.stringify({
                userId: userId,
                category: category,
                uploadedAt: new Date().toISOString()
            }))

            const storageUrl = `https://dnwvmirubduuihhuulir.storage.eu-central-1.nhost.run/v1/files`
            
            const response = await fetch(storageUrl, {
                method: 'POST',
                body: formData,
                headers: {
                    'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET,
                    ...formData.getHeaders()
                }
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error?.message || `HTTP ${response.status}`)
            }

            const uploadedFile = result.processedFiles?.[0]
            
            console.log(`✅ Документ загружен: ${uploadedFile.id}`)
            
            return {
                fileId: uploadedFile.id,
                fileName: uploadedFile.name,
                size: uploadedFile.size,
                category: category,
                url: await this.getFileUrl(uploadedFile.id)
            }

        } catch (error) {
            console.error('❌ Ошибка загрузки документа:', error.message)
            throw error
        }
    }

    // Получение URL файла
    async getFileUrl(fileId) {
        if (!this.isInitialized) {
            throw new Error('Storage Service не инициализирован')
        }

        try {
            const result = await this.adminClient.storage.getPresignedUrl({ fileId })
            
            if (result.error) {
                throw new Error(result.error.message)
            }

            return result.presignedUrl?.url
        } catch (error) {
            console.error('❌ Ошибка получения URL файла:', error.message)
            throw error
        }
    }

    // Удаление файла
    async deleteFile(fileId) {
        if (!this.isInitialized) {
            throw new Error('Storage Service не инициализирован')
        }

        try {
            console.log(`🗑️ Удаление файла ${fileId}...`)

            const result = await this.adminClient.storage.delete({ fileId })
            
            if (result.error) {
                throw new Error(result.error.message)
            }

            console.log(`✅ Файл удален: ${fileId}`)
            return true

        } catch (error) {
            console.error('❌ Ошибка удаления файла:', error.message)
            throw error
        }
    }

    // Получение списка файлов пользователя
    async getUserFiles(userId, limit = 10) {
        if (!this.isInitialized) {
            throw new Error('Storage Service не инициализирован')
        }

        try {
            const query = `
                query GetUserFiles($limit: Int!) {
                    files(
                        limit: $limit
                        order_by: {createdAt: desc}
                    ) {
                        id
                        name
                        size
                        mimeType
                        createdAt
                        bucketId
                        metadata
                    }
                }
            `

            const result = await this.adminClient.graphql.request({
                query,
                variables: {
                    limit: limit
                }
            })

            if (result.error) {
                throw new Error(result.error.message)
            }

            // Фильтруем файлы пользователя по имени (содержит userId)
            const allFiles = result.body.data.files
            const userFiles = allFiles.filter(file => 
                file.name.includes(userId) || 
                (file.metadata && file.metadata.userId === userId)
            )

            return userFiles

        } catch (error) {
            console.error('❌ Ошибка получения файлов пользователя:', error.message)
            throw error
        }
    }

    // Получение статистики Storage
    async getStorageStats() {
        if (!this.isInitialized) {
            throw new Error('Storage Service не инициализирован')
        }

        try {
            const query = `
                query GetStorageStats {
                    files(limit: 1000) {
                        id
                        size
                        bucketId
                    }
                }
            `

            const result = await this.adminClient.graphql.request({ query })

            if (result.error) {
                throw new Error(result.error.message)
            }

            const files = result.body.data.files
            const totalFiles = files.length
            const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0)
            const buckets = [...new Set(files.map(f => f.bucketId))]

            return {
                totalFiles,
                totalSize,
                buckets,
                formattedSize: this.formatFileSize(totalSize)
            }

        } catch (error) {
            console.error('❌ Ошибка получения статистики:', error.message)
            throw error
        }
    }

    // Форматирование размера файла
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes'

        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(1024))

        return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`
    }

    // Проверка доступности сервиса
    isReady() {
        return this.isInitialized && this.adminClient !== null
    }
}

// Создаем единственный экземпляр сервиса
const storageIntegrationService = new StorageIntegrationService()

module.exports = storageIntegrationService