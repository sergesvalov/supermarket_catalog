import { api } from '../api.js';

export async function initTelegram() {
    const formConfig = document.getElementById('tgConfigForm');
    const formUser = document.getElementById('tgUserForm');
    const userListEl = document.getElementById('tgUserList');
    
    // Загрузка настроек при старте
    await loadSettings();

    // 1. Сохранение токена
    if (formConfig) {
        formConfig.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = formConfig.querySelector('button');
            const tokenInput = document.getElementById('tgToken');
            const token = tokenInput.value.trim();
            
            if (!token) return;

            // UI Feedback
            const oldText = btn.innerText;
            btn.innerText = 'Проверка...';
            btn.disabled = true;

            try {
                await api.telegram.saveConfig(token);
                alert("✅ Токен успешно проверен и сохранен!");
            } catch (err) { 
                alert("❌ Ошибка: " + err.message); 
            } finally {
                btn.innerText = oldText;
                btn.disabled = false;
            }
        });
    }

    // 2. Добавление пользователя
    if (formUser) {
        formUser.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('tgUserName').value.trim();
            const chatId = document.getElementById('tgUserChatId').value.trim();
            if (!name || !chatId) return;

            try {
                await api.telegram.addUser(name, chatId);
                document.getElementById('tgUserName').value = '';
                document.getElementById('tgUserChatId').value = '';
                await loadUsers();
            } catch (err) { alert(err.message); }
        });
    }

    // 3. Удаление пользователя
    if (userListEl) {
        userListEl.addEventListener('click', async (e) => {
            const btn = e.target.closest('.btn-delete-tg-user');
            if (!btn) return;
            if (confirm('Удалить получателя?')) {
                await api.telegram.deleteUser(btn.dataset.id);
                await loadUsers();
            }
        });
    }

    async function loadUsers() {
        if (!userListEl) return;
        const users = await api.telegram.getUsers();
        userListEl.innerHTML = users.map(u => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>${u.name}</strong> <span class="text-muted small">(${u.chat_id})</span>
                </div>
                <button class="btn btn-sm btn-outline-danger btn-delete-tg-user" data-id="${u.id}">&times;</button>
            </li>
        `).join('');
    }

    async function loadSettings() {
        try {
            const config = await api.telegram.getConfig();
            const inputToken = document.getElementById('tgToken');
            if (config && inputToken) {
                inputToken.value = config.bot_token;
            }
            await loadUsers();
        } catch(e) { console.error("TG Init error", e); }
    }
}