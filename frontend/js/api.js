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
            try {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Ошибка сервера');
            } catch (e) {
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
    },
    lists: {
        getAll: () => request('/lists'),
        getOne: (id) => request(`/lists/${id}`),
        create: (name) => request('/lists', 'POST', { name }),
        delete: (id) => request(`/lists/${id}`, 'DELETE'),
        addItem: (listId, productId, qty) => request('/lists/items', 'POST', { shopping_list_id: listId, product_id: productId, quantity: qty }),
        toggleItem: (itemId, isBought) => request(`/lists/items/${itemId}?is_bought=${isBought}`, 'PATCH'),
        deleteItem: (itemId) => request(`/lists/items/${itemId}`, 'DELETE'),
        // Новый метод отправки
        sendToTelegram: (listId) => request(`/telegram/send/${listId}`, 'POST')
    },
    // Новая секция
    telegram: {
        getConfig: () => request('/telegram/config'),
        saveConfig: (token) => request('/telegram/config', 'POST', { bot_token: token }),
        getUsers: () => request('/telegram/users'),
        addUser: (name, chat_id) => request('/telegram/users', 'POST', { name, chat_id }),
        deleteUser: (id) => request(`/telegram/users/${id}`, 'DELETE')
    }
};