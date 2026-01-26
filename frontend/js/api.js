const API_BASE = '/api';

async function request(endpoint, method = 'GET', data = null) {
    const config = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (data) config.body = JSON.stringify(data);

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Ошибка запроса');
    }
    return response.json();
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