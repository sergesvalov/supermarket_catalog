import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../api';
import { useQuery } from '@tanstack/react-query';
import ShopSelector from './ShopSelector';
import ReportTable from './ReportTable';

const ReportsPage = () => {
    const { shops, getCurrencySymbol, exchangeRates } = useAppContext();
    const { data: productsData = { items: [] } } = useQuery({ queryKey: ['products'], queryFn: api.products.list });
    const products = productsData.items || productsData;
    const [selectedShopIds, setSelectedShopIds] = useState([]);
    const [displayCurrency, setDisplayCurrency] = useState('');
    const [priceViewMode, setPriceViewMode] = useState('actual');
    const [searchQuery, setSearchQuery] = useState('');

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
                .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .sort((a, b) => a.name.localeCompare(b.name));
            return { shop, items };
        }).filter(g => g.shop && g.items.length > 0);
    }, [selectedShopIds, products, shops, searchQuery]);

    const totalProducts = shopProducts.reduce((sum, g) => sum + g.items.length, 0);

    // Helper to compute price based on view mode
    const getComputedPrice = (p) => {
        if (priceViewMode === 'per_unit') {
            if (p.weight > 0) {
                return (p.price / p.weight) * 1000;
            }
            if (p.quantity > 1) {
                return (p.price / p.quantity) * 10;
            }
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

    const handleSendToTelegram = async () => {
        if (shopProducts.length === 0) return;

        let msg = ['📊 <b>Отчет по магазинам</b>\n'];

        if (grandTotal) {
            msg.push(`💰 <b>Общий итог: ${grandTotal.total.toFixed(2)} ${getCurrencySymbol(displayCurrency)}</b>\n`);
        }

        shopProducts.forEach(({ shop, items }) => {
            const shopCur = shop.currency || 'EUR';
            msg.push(`🏪 <b>${shop.name}</b>`);

            items.forEach(p => {
                const price = getComputedPrice(p);
                const formattedPrice = formatPrice(price, shopCur);

                let modeText = '';
                if (priceViewMode === 'per_unit') {
                    if (p.weight > 0) modeText = ' (за кг/л)';
                    else if (p.quantity > 1) modeText = ' (за 10 шт)';
                }

                msg.push(`▫️ ${p.name}${modeText}: <b>${formattedPrice}</b>`);
            });

            msg.push(`<i>Итого по магазину:</i> <b>${getShopTotal(items, shopCur)}</b>\n`);
        });

        try {
            await api.telegram.sendReport(msg.join('\n'));
            alert('Отчет отправлен в Telegram!');
        } catch (error) {
            alert('Ошибка отправки: ' + error.message);
        }
    };

    return (
        <div>
            {/* Shop selector + currency */}
            <ShopSelector
                shops={shops}
                selectedShopIds={selectedShopIds}
                selectAll={selectAll}
                toggleShop={toggleShop}
                getCurrencySymbol={getCurrencySymbol}
            />

            {/* Options */}
            <div className="glass-card p-3 mb-4">
                <div className="d-flex flex-wrap align-items-center gap-4">
                    <div className="d-flex align-items-center gap-2">
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            style={{ width: '250px' }}
                            placeholder="🔍 Поиск товаров..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
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
                            <option value="per_unit">За 1 кг / 1 л / 10 шт</option>
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
                    <button
                        className="btn btn-sm btn-premium ms-3"
                        onClick={handleSendToTelegram}
                    >
                        <i className="bi bi-telegram me-1"></i> Отправить
                    </button>
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

                        <ReportTable
                            shopCur={shopCur}
                            displayCurrency={displayCurrency}
                            items={items}
                            formatPrice={formatPrice}
                            getComputedPrice={getComputedPrice}
                            getCurrencySymbol={getCurrencySymbol}
                            getShopTotal={getShopTotal}
                            priceViewMode={priceViewMode}
                        />
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
