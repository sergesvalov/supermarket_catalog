import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../api';

const AdminPage = () => {
    const { currency, setCurrency } = useAppContext();
    const [selectedCurrency, setSelectedCurrency] = useState(currency);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await api.admin.saveConfig(selectedCurrency);
            setCurrency(selectedCurrency); // Update global state
            alert('Настройки сохранены!');
        } catch (error) {
            alert("Error: " + error.message);
        }
    };

    return (
        <div className="row justify-content-center">
            <div className="col-md-6">
                <div className="glass-card p-4">
                    <h5 className="mb-3">⚙️ Администрирование</h5>
                    <form onSubmit={handleSave}>
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
                        <button type="submit" className="btn btn-premium w-100">Сохранить настройки</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminPage;
