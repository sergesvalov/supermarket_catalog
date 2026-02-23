import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';

const ReportsPage = () => {
    const { products, shops, getCurrencySymbol, exchangeRates } = useAppContext();
    const [selectedShopIds, setSelectedShopIds] = useState([]);
    const [displayCurrency, setDisplayCurrency] = useState('');
    const [priceViewMode, setPriceViewMode] = useState('actual');

    const CURRENCIES = [
        { code: '', label: 'Валюта магазина' },
        { code: 'EUR', label: 'Euro (€)' },
        { code: 'USD', label: 'Dollar ($)' },
        { code: 'RUB', label: 'Рубль (₽)' }
    ];

    // Convert price from one currency to another via EUR
    const convertPrice = (price, fromCurrency, toCurrency) => {
        if (!toCurrency || fromCurrency === toCurrency) return price;

        const rates = { EUR: 1, USD: exchangeRates.usd_rate || 0, RUB: exchangeRates.rub_rate || 0 };
        const fromRate = rates[fromCurrency];
        const toRate = rates[toCurrency];

        // Can't convert if rate is 0
        if (!fromRate || !toRate) return null;

        // price → EUR → target
        const priceInEur = price / fromRate;
        return priceInEur * toRate;
    };

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

    // Helper to compute price based on view mode
    const getComputedPrice = (p) => {
        if (priceViewMode === 'per_kg' && p.weight > 0) {
            return (p.price / p.weight) * 1000;
        }
        return p.price;
    };

    // Format converted price
    const formatPrice = (price, shopCurrency) => {
        const target = displayCurrency || shopCurrency;
        const converted = convertPrice(price, shopCurrency, target);
        const sym = getCurrencySymbol(target);

        if (converted === null) return `${price.toFixed(2)} ${getCurrencySymbol(shopCurrency)} (нет курса)`;
        return `${converted.toFixed(2)} ${sym}`;
    };

    // Get total for a shop
    const getShopTotal = (items, shopCurrency) => {
        const target = displayCurrency || shopCurrency;
        let total = 0;
        let hasError = false;
        items.forEach(p => {
            const converted = convertPrice(getComputedPrice(p), shopCurrency, target);
            if (converted === null) hasError = true;
            else total += converted;
        });
        const sym = getCurrencySymbol(target);
        if (hasError) return `${total.toFixed(2)} ${sym} (неполный)`;
        return `${total.toFixed(2)} ${sym}`;
    };

    // Grand total across all selected shops (only if display currency is set)
    const grandTotal = useMemo(() => {
        if (!displayCurrency) return null;
        let total = 0;
        let hasError = false;
        shopProducts.forEach(({ shop, items }) => {
            items.forEach(p => {
                const converted = convertPrice(getComputedPrice(p), shop.currency || 'EUR', displayCurrency);
                if (converted === null) hasError = true;
                else total += converted;
            });
        });
        return { total, hasError };
    }, [shopProducts, displayCurrency, exchangeRates, priceViewMode]);

    return (
        <div>
            {/* Shop selector + currency */}
            <div className="glass-card p-3 mb-4">
                <div className="d-flex align-items-center justify-content-between mb-2">
                    <h6 className="m-0">Выберите магазины</h6>
                    <div className="d-flex align-items-center gap-2">
                        <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={selectAll}
                        >
                            {selectedShopIds.length === shops.length ? 'Снять все' : 'Выбрать все'}
                        </button>
                    </div>
                </div>
                <div className="d-flex flex-wrap gap-2 mb-3">
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

                {/* Options */}
                <div className="d-flex flex-wrap align-items-center gap-4">
                    <div className="d-flex align-items-center gap-2">
                        <label className="form-label small text-muted m-0">Показать цены в:</label>
                        <select
                            className="form-select form-select-sm"
                            style={{ width: '200px' }}
                            value={displayCurrency}
                            onChange={e => setDisplayCurrency(e.target.value)}
                        >
                            {CURRENCIES.map(c => (
                                <option key={c.code} value={c.code}>{c.label}</option>
                            ))}
                        </select>
                        {displayCurrency && (
                            <span className="small text-muted">
                                (1€ = {exchangeRates.usd_rate || '?'}$ · {exchangeRates.rub_rate || '?'}₽)
                            </span>
                        )}
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <label className="form-label small text-muted m-0 text-nowrap">Вид цены:</label>
                        <select
                            className="form-select form-select-sm"
                            style={{ width: '180px' }}
                            value={priceViewMode}
                            onChange={e => setPriceViewMode(e.target.value)}
                        >
                            <option value="actual">Как есть</option>
                            <option value="per_kg">За 1 кг / 1 л</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary */}
            {selectedShopIds.length > 0 && (
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted small">
                        Магазинов: {selectedShopIds.length} · Товаров: {totalProducts}
                    </span>
                    {grandTotal && (
                        <span className="fw-bold text-primary">
                            Общий итог: {grandTotal.total.toFixed(2)} {getCurrencySymbol(displayCurrency)}
                            {grandTotal.hasError && <span className="text-warning ms-1">(неполный — задайте курсы)</span>}
                        </span>
                    )}
                </div>
            )}

            {/* Tables per shop */}
            {shopProducts.map(({ shop, items }) => {
                const shopCur = shop.currency || 'EUR';
                return (
                    <div key={shop.id} className="glass-card p-3 mb-4">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <h5 className="m-0">
                                🏪 {shop.name}
                                <span className="badge bg-secondary ms-2 fw-normal">{getCurrencySymbol(shopCur)}</span>
                                {displayCurrency && displayCurrency !== shopCur && (
                                    <span className="badge bg-primary ms-1 fw-normal">→ {getCurrencySymbol(displayCurrency)}</span>
                                )}
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
                                            {displayCurrency && displayCurrency !== shopCur && (
                                                <th className="text-end">Ориг. цена</th>
                                            )}
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
                                                <td className="fw-medium">
                                                    {p.name}
                                                    {priceViewMode === 'per_kg' && p.weight > 0 && <span className="badge bg-info text-dark ms-2 fw-normal" style={{ fontSize: '0.7em' }}>за кг</span>}
                                                </td>
                                                <td><span className="badge bg-secondary bg-opacity-25 text-body">{p.category}</span></td>
                                                <td className="text-end fw-bold text-primary">
                                                    {formatPrice(getComputedPrice(p), shopCur)}
                                                </td>
                                                {displayCurrency && displayCurrency !== shopCur && (
                                                    <td className="text-end text-muted small">
                                                        {getComputedPrice(p).toFixed(2)} {getCurrencySymbol(shopCur)}
                                                    </td>
                                                )}
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
                                                {getShopTotal(items, shopCur)}
                                            </td>
                                            {displayCurrency && displayCurrency !== shopCur && (
                                                <td className="text-end text-muted small">
                                                    {items.reduce((s, p) => s + getComputedPrice(p), 0).toFixed(2)} {getCurrencySymbol(shopCur)}
                                                </td>
                                            )}
                                            <td colSpan="5"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                );
            })}

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
