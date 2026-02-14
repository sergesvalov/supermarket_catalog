import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../api';

const ListsPage = () => {
    const { lists, products, refreshLists, currency, getCurrencySymbol, currencySymbol } = useAppContext();

    // Helper: get currency symbol for a product
    const getProductCurrency = (product) => {
        if (product?.shop?.currency) return getCurrencySymbol(product.shop.currency);
        return currencySymbol;
    };
    const [view, setView] = useState('all'); // 'all' or 'single'
    const [activeList, setActiveList] = useState(null);
    const [newList, setNewList] = useState('');
    const [productSearch, setProductSearch] = useState('');

    const handleCreateList = async (e) => {
        e.preventDefault();
        try {
            await api.lists.create(newList);
            setNewList('');
            refreshLists();
        } catch (error) {
            alert(error.message);
        }
    };

    const handleDeleteList = async (id, e) => {
        e.stopPropagation();
        if (!confirm('Удалить список?')) return;
        try {
            await api.lists.delete(id);
            refreshLists();
            if (activeList?.id === id) setView('all');
        } catch (error) {
            alert(error.message);
        }
    };

    const openList = async (list) => {
        try {
            const data = await api.lists.getOne(list.id);
            setActiveList(data);
            setView('single');
        } catch (error) {
            alert(error.message);
        }
    };

    const addItem = async (productId) => {
        try {
            await api.lists.addItem(activeList.id, productId, 1);
            openList(activeList); // Refresh
        } catch (error) {
            alert(error.message);
        }
    };

    const toggleItem = async (itemId, currentStatus) => {
        try {
            await api.lists.toggleItem(itemId, !currentStatus);
            openList(activeList);
        } catch (error) {
            alert(error.message);
        }
    };

    const deleteItem = async (itemId) => {
        try {
            await api.lists.deleteItem(itemId);
            openList(activeList);
        } catch (error) {
            alert(error.message);
        }
    };

    const sendToTelegram = async (id = null) => {
        const listId = id || activeList?.id;
        if (!listId) return;

        try {
            await api.lists.sendToTelegram(listId);
            alert('Отправлено в Telegram!');
        } catch (error) {
            alert('Ошибка отправки: ' + error.message);
        }
    };

    // Filter products for search
    const searchResults = productSearch
        ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 5)
        : [];

    // Group totals by currency
    const currencyTotals = {};
    activeList?.items?.forEach(item => {
        const sym = getProductCurrency(item.product);
        const amount = (item.product?.price || 0) * item.quantity;
        currencyTotals[sym] = (currencyTotals[sym] || 0) + amount;
    });
    const totalDisplay = Object.entries(currencyTotals)
        .map(([sym, total]) => `${total.toFixed(2)} ${sym}`)
        .join(' / ') || '0.00';

    if (view === 'single' && activeList) {
        return (
            <div>
                <div className="d-flex align-items-center gap-3 mb-4">
                    <button className="btn btn-outline-secondary" onClick={() => setView('all')}>
                        <i className="bi bi-arrow-left"></i> Назад
                    </button>
                    <h3 className="m-0 ms-2 fw-bold">{activeList.name}</h3>
                    <div className="ms-auto fs-4 fw-bold text-primary">
                        {totalDisplay}
                    </div>
                    <button className="btn btn-outline-primary" onClick={sendToTelegram}>
                        <i className="bi bi-telegram"></i>
                    </button>
                </div>

                <div className="row">
                    <div className="col-md-5 mb-4">
                        <div className="glass-card p-3">
                            <h5 className="mb-3">🔍 Добавить товар</h5>
                            <input
                                type="text"
                                className="form-control mb-3"
                                placeholder="Начните вводить..."
                                value={productSearch}
                                onChange={e => setProductSearch(e.target.value)}
                            />
                            <div className="list-group scrollable-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {searchResults.map(p => (
                                    <button
                                        key={p.id}
                                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                                        onClick={() => addItem(p.id)}
                                    >
                                        <span>{p.name}</span>
                                        <span className="badge bg-primary rounded-pill">{p.price} {getProductCurrency(p)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="col-md-7">
                        <div className="glass-card p-3">
                            <h5 className="mb-3">📝 Что купить</h5>
                            <ul className="list-group list-group-flush bg-transparent">
                                {activeList.items?.map(item => (
                                    <li key={item.id} className={`list-group-item bg-transparent d-flex align-items-center justify-content-between ${item.is_bought ? 'text-decoration-line-through text-muted' : ''}`}>
                                        <div className="d-flex align-items-center gap-2" style={{ cursor: 'pointer' }} onClick={() => toggleItem(item.id, item.is_bought)}>
                                            <i className={`bi ${item.is_bought ? 'bi-check-circle-fill text-success' : 'bi-circle'}`}></i>
                                            <span>{item.product?.name || '???'}</span>
                                            <span className="badge bg-secondary">{item.quantity} шт</span>
                                        </div>
                                        <button className="btn btn-sm text-danger" onClick={() => deleteItem(item.id)}>
                                            <i className="bi bi-x-lg"></i>
                                        </button>
                                    </li>
                                ))}
                                {activeList.items?.length === 0 && <div className="text-muted text-center py-3">Список пуст</div>}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="row mb-4">
                <div className="col-md-6">
                    <form onSubmit={handleCreateList} className="d-flex gap-2">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Название нового списка"
                            value={newList}
                            onChange={e => setNewList(e.target.value)}
                            required
                        />
                        <button type="submit" className="btn btn-premium text-nowrap">Создать</button>
                    </form>
                </div>
            </div>

            <div className="row g-4">
                {lists.map(list => (
                    <div key={list.id} className="col-md-4 col-sm-6">
                        <div
                            className="glass-card p-4 h-100 d-flex flex-column cursor-pointer position-relative card-hover-effect"
                            onClick={() => openList(list)}
                            style={{ cursor: 'pointer' }}
                        >
                            <h5 className="fw-bold mb-3">{list.name}</h5>
                            <div className="mt-auto d-flex justify-content-between text-muted small">
                                <span>{new Date(list.created_at).toLocaleDateString()}</span>
                                <span>{list.items_count || 0} товаров</span>
                            </div>
                            <div className="position-absolute top-0 end-0 m-2 d-flex gap-2">
                                <button
                                    className="btn btn-outline-primary btn-sm rounded-circle"
                                    onClick={(e) => { e.stopPropagation(); sendToTelegram(list.id); }}
                                    title="Отправить в Telegram"
                                >
                                    <i className="bi bi-telegram"></i>
                                </button>
                                <button
                                    className="btn btn-outline-danger btn-sm rounded-circle"
                                    onClick={(e) => handleDeleteList(list.id, e)}
                                    title="Удалить"
                                >
                                    <i className="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ListsPage;
