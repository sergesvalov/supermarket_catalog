import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../api';

const ShopsPage = () => {
    const { shops, refreshShops } = useAppContext();
    const [newShopName, setNewShopName] = useState('');

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.shops.create({ name: newShopName });
            setNewShopName('');
            refreshShops();
        } catch (error) {
            alert("Error creating shop: " + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Удалить магазин?')) return;
        try {
            await api.shops.delete(id);
            refreshShops();
        } catch (error) {
            alert("Delete failed: " + error.message);
        }
    };

    return (
        <div className="row justify-content-center">
            <div className="col-md-6">
                <div className="glass-card p-4">
                    <h5 className="mb-4">🏪 Управление магазинами</h5>

                    <form onSubmit={handleCreate} className="d-flex gap-2 mb-4">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Название магазина"
                            value={newShopName}
                            onChange={e => setNewShopName(e.target.value)}
                            required
                        />
                        <button type="submit" className="btn btn-premium">Создать</button>
                    </form>

                    <div className="list-group">
                        {shops.map(shop => (
                            <div key={shop.id} className="list-group-item list-item-premium d-flex justify-content-between align-items-center bg-transparent">
                                <span className="fw-medium">{shop.name}</span>
                                <button
                                    className="btn btn-outline-danger btn-sm rounded-circle"
                                    onClick={() => handleDelete(shop.id)}
                                >
                                    <i className="bi bi-trash"></i>
                                </button>
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
