import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';

const ReportsPage = () => {
    const { products, shops, getCurrencySymbol } = useAppContext();
    const [selectedShopIds, setSelectedShopIds] = useState([]);

    const toggleShop = (shopId) => {
        setSelectedShopIds(prev =>
            prev.includes(shopId)
                ? prev.filter(id => id !== shopId)
                : [...prev, shopId]
        );
    };

    const selectAll = () => {
        if (selectedShopIds.length === shops.length) {
            setSelectedShopIds([]);
        } else {
            setSelectedShopIds(shops.map(s => s.id));
        }
    };

    // Group products by shop
    const shopProducts = useMemo(() => {
        return selectedShopIds.map(shopId => {
            const shop = shops.find(s => s.id === shopId);
            const items = products
                .filter(p => p.shop_id === shopId)
                .sort((a, b) => a.name.localeCompare(b.name));
            return { shop, items };
        }).filter(g => g.shop);
    }, [selectedShopIds, products, shops]);

    const totalProducts = shopProducts.reduce((sum, g) => sum + g.items.length, 0);

    return (
        <div>
            {/* Shop selector */}
            <div className="glass-card p-3 mb-4">
                <div className="d-flex align-items-center justify-content-between mb-2">
                    <h6 className="m-0">Выберите магазины</h6>
                    <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={selectAll}
                    >
                        {selectedShopIds.length === shops.length ? 'Снять все' : 'Выбрать все'}
                    </button>
                </div>
                <div className="d-flex flex-wrap gap-2">
                    {shops.map(shop => (
                        <button
                            key={shop.id}
                            className={`btn btn-sm ${selectedShopIds.includes(shop.id) ? 'btn-premium' : 'btn-outline-secondary'}`}
                            onClick={() => toggleShop(shop.id)}
                        >
                            {shop.name}
                            <span className="ms-1 opacity-75">{getCurrencySymbol(shop.currency || 'EUR')}</span>
                        </button>
                    ))}
                    {shops.length === 0 && <span className="text-muted">Нет магазинов</span>}
                </div>
            </div>

            {/* Summary */}
            {selectedShopIds.length > 0 && (
                <div className="text-muted small mb-3">
                    Магазинов: {selectedShopIds.length} · Товаров: {totalProducts}
                </div>
            )}

            {/* Tables per shop */}
            {shopProducts.map(({ shop, items }) => (
                <div key={shop.id} className="glass-card p-3 mb-4">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                        <h5 className="m-0">
                            🏪 {shop.name}
                            <span className="badge bg-secondary ms-2 fw-normal">{getCurrencySymbol(shop.currency || 'EUR')}</span>
                        </h5>
                        <span className="text-muted small">{items.length} товар(ов)</span>
                    </div>

                    {items.length === 0 ? (
                        <div className="text-muted text-center py-3">Нет товаров в этом магазине</div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-sm table-hover align-middle mb-0" style={{ color: 'inherit' }}>
                                <thead>
                                    <tr className="text-muted small">
                                        <th>#</th>
                                        <th>Товар</th>
                                        <th>Категория</th>
                                        <th className="text-end">Цена</th>
                                        <th className="text-end">Вес</th>
                                        <th className="text-end">Ккал</th>
                                        <th className="text-end">Б</th>
                                        <th className="text-end">Ж</th>
                                        <th className="text-end">У</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((p, idx) => (
                                        <tr key={p.id}>
                                            <td className="text-muted small">{idx + 1}</td>
                                            <td className="fw-medium">{p.name}</td>
                                            <td><span className="badge bg-secondary bg-opacity-25 text-body">{p.category}</span></td>
                                            <td className="text-end fw-bold text-primary">
                                                {p.price.toFixed(2)} {getCurrencySymbol(shop.currency || 'EUR')}
                                            </td>
                                            <td className="text-end">
                                                {p.weight ? (
                                                    p.weight >= 1000
                                                        ? `${(p.weight / 1000).toFixed(1)} кг`
                                                        : `${p.weight} г`
                                                ) : '—'}
                                            </td>
                                            <td className="text-end">{p.calories || '—'}</td>
                                            <td className="text-end">{p.proteins || '—'}</td>
                                            <td className="text-end">{p.fats || '—'}</td>
                                            <td className="text-end">{p.carbs || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="fw-bold border-top">
                                        <td colSpan="3" className="text-end">Итого:</td>
                                        <td className="text-end text-primary">
                                            {items.reduce((s, p) => s + p.price, 0).toFixed(2)} {getCurrencySymbol(shop.currency || 'EUR')}
                                        </td>
                                        <td colSpan="5"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            ))}

            {selectedShopIds.length === 0 && (
                <div className="glass-card p-5 text-center text-muted">
                    <div className="fs-1 mb-2">📊</div>
                    <div>Выберите один или несколько магазинов для просмотра отчёта</div>
                </div>
            )}
        </div>
    );
};

export default ReportsPage;
