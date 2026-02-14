import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../api';

const CURRENCIES = [
    { code: 'EUR', symbol: '€', label: 'Euro (€)' },
    { code: 'USD', symbol: '$', label: 'Dollar ($)' },
    { code: 'RUB', symbol: '₽', label: 'Рубль (₽)' }
];

const ShopsPage = () => {
    const { shops, refreshShops, getCurrencySymbol } = useAppContext();
    const [newShopName, setNewShopName] = useState('');
    const [newShopCurrency, setNewShopCurrency] = useState('EUR');

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.shops.create({ name: newShopName, currency: newShopCurrency });
            setNewShopName('');
            setNewShopCurrency('EUR');
            refreshShops();
        } catch (error) {
            alert("Ошибка создания: " + error.message);
        }
    };

    const handleCurrencyChange = async (shopId, newCurrency) => {
        try {
            await api.shops.update(shopId, { currency: newCurrency });
            refreshShops();
        } catch (error) {
            alert("Ошибка обновления: " + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Удалить магазин?')) return;
        try {
            await api.shops.delete(id);
            refreshShops();
        } catch (error) {
            alert("Ошибка удаления: " + error.message);
        }
    };

    return (
        <div className="row justify-content-center">
            <div className="col-md-6">
                <div className="glass-card p-4">
                    <h5 className="mb-4">🏪 Управление магазинами</h5>

                    <form onSubmit={handleCreate} className="d-flex gap-2 mb-4 align-items-end">
                        <div className="flex-grow-1">
                            <label className="form-label small text-muted">Название</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Название магазина"
                                value={newShopName}
                                onChange={e => setNewShopName(e.target.value)}
                                required
                            />
                        </div>
                        <div style={{ minWidth: '120px' }}>
                            <label className="form-label small text-muted">Валюта</label>
                            <select
                                className="form-select form-control"
                                value={newShopCurrency}
                                onChange={e => setNewShopCurrency(e.target.value)}
                            >
                                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                            </select>
                        </div>
                        <button type="submit" className="btn btn-premium" style={{ height: '38px' }}>Создать</button>
                    </form>

                    <div className="list-group">
                        {shops.map(shop => (
                            <div key={shop.id} className="list-group-item list-item-premium d-flex justify-content-between align-items-center bg-transparent">
                                <div className="d-flex align-items-center gap-2">
                                    <span className="fw-medium">{shop.name}</span>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <select
                                        className="form-select form-select-sm"
                                        style={{ width: '80px' }}
                                        value={shop.currency || 'EUR'}
                                        onChange={e => handleCurrencyChange(shop.id, e.target.value)}
                                        title="Валюта магазина"
                                    >
                                        {CURRENCIES.map(c => (
                                            <option key={c.code} value={c.code}>{c.symbol}</option>
                                        ))}
                                    </select>
                                    <button
                                        className="btn btn-outline-danger btn-sm rounded-circle"
                                        onClick={() => handleDelete(shop.id)}
                                    >
                                        <i className="bi bi-trash"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {shops.length === 0 && (
                            <div className="text-center text-muted p-3">Нет магазинов</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShopsPage;
