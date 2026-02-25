import React from 'react';

const ReportTable = ({ shopCur, displayCurrency, items, formatPrice, getComputedPrice, getCurrencySymbol, getShopTotal, priceViewMode }) => {
    if (items.length === 0) {
        return <div className="text-muted text-center py-3">Нет товаров в этом магазине</div>;
    }

    return (
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
                                {priceViewMode === 'per_unit' && p.weight > 0 && <span className="badge bg-info text-dark ms-2 fw-normal" style={{ fontSize: '0.7em' }}>за кг/л</span>}
                                {priceViewMode === 'per_unit' && (!p.weight || p.weight === 0) && p.quantity > 1 && <span className="badge bg-info text-dark ms-2 fw-normal" style={{ fontSize: '0.7em' }}>за 10 шт</span>}
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
                                        ? `${(p.weight / 1000).toFixed(1)} кг/л`
                                        : `${p.weight} г/мл`
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
    );
};

export default ReportTable;
