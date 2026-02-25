import React from 'react';

const ShopSelector = ({ shops, selectedShopIds, selectAll, toggleShop, getCurrencySymbol }) => {
    return (
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
        </div>
    );
};

export default ShopSelector;
