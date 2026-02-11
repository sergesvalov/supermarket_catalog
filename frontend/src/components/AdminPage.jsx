import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../api';

const AdminPage = () => {
    const { currency, setCurrency } = useAppContext();
    const [selectedCurrency, setSelectedCurrency] = useState(currency);

    // Telegram State
    const [token, setToken] = useState('');
    const [users, setUsers] = useState([]);
    const [newUser, setNewUser] = useState({ name: '', chat_id: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const config = await api.telegram.getConfig();
            if (config) setToken(config.bot_token || '');
            const usersData = await api.telegram.getUsers();
            setUsers(usersData);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSaveCurrency = async (e) => {
        e.preventDefault();
        try {
            await api.admin.saveConfig(selectedCurrency);
            setCurrency(selectedCurrency); // Update global state
            alert('Настройки валюты сохранены!');
        } catch (error) {
            alert("Error: " + error.message);
        }
    };

    const saveToken = async (e) => {
        e.preventDefault();
        try {
            await api.telegram.saveConfig(token);
            alert('Токен сохранен!');
        } catch (e) {
            alert('Ошибка: ' + e.message);
        }
    };

    const addUser = async (e) => {
        e.preventDefault();
        try {
            await api.telegram.addUser(newUser.name, newUser.chat_id);
            setNewUser({ name: '', chat_id: '' });
            loadData();
        } catch (e) {
            alert('Ошибка: ' + e.message);
        }
    };

    const deleteUser = async (id) => {
        if (!confirm("Удалить пользователя?")) return;
        try {
            await api.telegram.deleteUser(id);
            loadData();
        } catch (e) {
            alert('Ошибка: ' + e.message);
        }
    };

    return (
        <div className="row justify-content-center">
            <div className="col-md-6">
                {/* Apps Settings */}
                <div className="glass-card p-4 mb-4">
                    <h5 className="mb-3">⚙️ Администрирование</h5>
                    <form onSubmit={handleSaveCurrency}>
                        <div className="mb-3">
                            <label className="form-label">Валюта приложения</label>
                            <select
                                className="form-select form-control"
                                value={selectedCurrency}
                                onChange={e => setSelectedCurrency(e.target.value)}
                            >
                                <option value="EUR">Euro (€)</option>
                                <option value="USD">US Dollar ($)</option>
                                <option value="RUB">Rubles (₽)</option>
                            </select>
                            <div className="form-text text-muted mt-2">
                                Изменение валюты обновит отображение цен во всем приложении.
                            </div>
                        </div>
                        <button type="submit" className="btn btn-premium w-100">Сохранить настройки валюты</button>
                    </form>
                </div>

                {/* Telegram Settings */}
                <div className="glass-card p-4 mb-4">
                    <h5 className="mb-3">🤖 Настройка Telegram Бота</h5>
                    <form onSubmit={saveToken}>
                        <div className="mb-3">
                            <label className="form-label small text-muted">Token (от @BotFather)</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="123456:ABC-DEF..."
                                value={token}
                                onChange={e => setToken(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-premium w-100">Сохранить токен</button>
                    </form>
                    <div className="mt-3 small text-muted text-center">
                        Chat ID можно узнать через <code>@userinfobot</code>
                    </div>
                </div>

                {/* Telegram Users */}
                <div className="glass-card p-4">
                    <h5 className="mb-3">👥 Получатели Telegram</h5>
                    <form onSubmit={addUser} className="d-flex gap-2 mb-3">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Имя"
                            value={newUser.name}
                            onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                            required
                        />
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Chat ID"
                            value={newUser.chat_id}
                            onChange={e => setNewUser({ ...newUser, chat_id: e.target.value })}
                            required
                        />
                        <button type="submit" className="btn btn-success">+</button>
                    </form>

                    <ul className="list-group bg-transparent">
                        {users.map(u => (
                            <li key={u.id} className="list-group-item bg-transparent d-flex justify-content-between align-items-center">
                                <div>
                                    <span className="fw-bold">{u.name}</span>
                                    <span className="text-muted ms-2 small">({u.chat_id})</span>
                                </div>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => deleteUser(u.id)}>
                                    <i className="bi bi-trash"></i>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AdminPage;
