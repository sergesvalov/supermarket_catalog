/**
 * @typedef {Object} Shop
 * @property {number} id
 * @property {string} name
 * @property {string} currency
 */

/**
 * @typedef {Object} Product
 * @property {number} id
 * @property {string} name
 * @property {string} category
 * @property {number} price
 * @property {number} [weight]
 * @property {number} [calories]
 * @property {Shop} [shop]
 */

const API_BASE = '/api';

async function request(endpoint, method = 'GET', data = null) {
    const config = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (data) config.body = JSON.stringify(data);

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        if (response.status === 204) return null;

        if (!response.ok) {
            let errorMessage = `Ошибка сети: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData.detail) {
                    errorMessage = errorData.detail;
                }
            } catch (_) {
                // JSON parse failed, keep the default network error message
            }
            throw new Error(errorMessage);
        }
        return response.json();
    } catch (err) {
        console.error("API Error:", err);
        err.message += ` (URL: ${endpoint})`;
        throw err;
    }
}

export const api = {
    products: {
        list: (params = {}) => {
            const qs = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    qs.append(key, value);
                }
            });
            const queryString = qs.toString() ? `?${qs.toString()}` : '';
            return request(`/products${queryString}`);
        },
        create: (data) => request('/products', 'POST', data),
        update: (id, data) => request(`/products/${id}`, 'PUT', data),
        delete: (id) => request(`/products/${id}`, 'DELETE')
    },
    shops: {
        list: () => request('/shops'),
        create: (data) => request('/shops', 'POST', data),
        update: (id, data) => request(`/shops/${id}`, 'PUT', data),
        delete: (id) => request(`/shops/${id}`, 'DELETE')
    },
    categories: {
        list: () => request('/categories'),
        create: (data) => request('/categories', 'POST', data),
        update: (id, data) => request(`/categories/${id}`, 'PUT', data),
        delete: (id) => request(`/categories/${id}`, 'DELETE')
    },
    lists: {
        getAll: () => request('/lists'),
        getOne: (id) => request(`/lists/${id}`),
        create: (name) => request('/lists', 'POST', { name }),
        delete: (id) => request(`/lists/${id}`, 'DELETE'),
        addItem: (listId, productId, qty) => request('/lists/items', 'POST', { shopping_list_id: listId, product_id: productId, quantity: qty }),
        toggleItem: (itemId, isBought) => request(`/lists/items/${itemId}?is_bought=${isBought}`, 'PATCH'),
        deleteItem: (itemId) => request(`/lists/items/${itemId}`, 'DELETE'),
        sendToTelegram: (listId) => request(`/telegram/send/${listId}`, 'POST')
    },
    telegram: {
        getConfig: () => request('/telegram/config'),
        saveConfig: (token) => request('/telegram/config', 'POST', { bot_token: token }),
        getUsers: () => request('/telegram/users'),
        addUser: (name, chat_id) => request('/telegram/users', 'POST', { name, chat_id }),
        deleteUser: (id) => request(`/telegram/users/${id}`, 'DELETE'),
        sendReport: (text) => request('/telegram/send_report', 'POST', { text })
    },
    admin: {
        getConfig: () => request('/admin/config'),
        saveConfig: (data) => request('/admin/config', 'POST', data),
        importProducts: () => request('/admin/import', 'POST'),
        exportProducts: () => request('/admin/export', 'POST'),
        importFromFile: () => request('/admin/import-file', 'POST')
    }
};
