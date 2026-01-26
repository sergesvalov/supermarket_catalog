const API_BASE = '/api';

async function request(endpoint, method = 'GET', data = null) {
    const config = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (data) config.body = JSON.stringify(data);

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        
        // Если сервер вернул ошибку
        if (!response.ok) {
            // Пытаемся прочитать как JSON
            try {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Ошибка сервера');
            } catch (e) {
                // Если это не JSON (например, 502 Bad Gateway от Nginx)
                throw new Error(`Ошибка сети: ${response.status} ${response.statusText}`);
            }
        }
        
        return response.json();
    } catch (err) {
        console.error("API Error:", err);
        throw err;
    }
}

export const api = {
    products: {
        list: () => request('/products'),
        create: (data) => request('/products', 'POST', data),
        update: (id, data) => request(`/products/${id}`, 'PUT', data)
    },
    shops: {
        list: () => request('/shops'),
        create: (data) => request('/shops', 'POST', data),
        delete: (id) => request(`/shops/${id}`, 'DELETE')
    }
};