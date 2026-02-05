module.exports = {
    // Основные настройки Nhost
    subdomain: process.env.NHOST_SUBDOMAIN || 'dnwvmirubduuihhuulir',
    region: process.env.NHOST_REGION || 'eu-central-1',
    
    // Альтернативно можно использовать полный backend URL
    backendUrl: process.env.NHOST_BACKEND_URL || null,
    
    // Настройки для проверки подключения
    connectionTest: {
        timeout: 10000, // 10 секунд
        retries: 3
    },
    
    // Настройки GraphQL
    graphql: {
        endpoint: '/v1/graphql',
        adminSecret: process.env.NHOST_ADMIN_SECRET || null
    },
    
    // Настройки Storage
    storage: {
        buckets: {
            default: 'default',
            documents: 'documents',
            images: 'images',
            avatars: 'avatars'
        }
    },
    
    // Настройки Auth
    auth: {
        autoRefreshToken: true,
        autoSignIn: false
    },
    
    // Схема базы данных (для справки)
    database: {
        tables: {
            users: 'users',
            shifts: 'shifts', 
            assignments: 'assignments',
            branches: 'branches'
        }
    }
};