import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../api';

const ProductsPage = () => {
    const { products, shops, currencySymbol, getCurrencySymbol, refreshProducts } = useAppContext();

    // Helper: get currency symbol for a product (shop currency or global fallback)
    const getProductCurrency = (product) => {
        if (product.shop?.currency) return getCurrencySymbol(product.shop.currency);
        return currencySymbol;
    };

    // Helper: get currency symbol for a shop_id from the shops list
    const getShopCurrencyById = (shopId) => {
        if (!shopId) return currencySymbol;
        const shop = shops.find(s => s.id === parseInt(shopId));
        return shop?.currency ? getCurrencySymbol(shop.currency) : currencySymbol;
    };
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date');

    // History State
    const [historyProduct, setHistoryProduct] = useState(null);

    const handleViewHistory = (e, product) => {
        e.stopPropagation();
        setHistoryProduct(product);
    };

    // New Product Form State
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: '', category: 'продукты', shop_id: '', price: '', weight: '', weightUnit: 'g', calories: '', proteins: '', fats: '', carbs: '', quantity: ''
    });

    const resetForm = () => {
        setFormData({ name: '', category: 'продукты', shop_id: '', price: '', weight: '', weightUnit: 'g', calories: '', proteins: '', fats: '', carbs: '', quantity: '' });
        setEditingProduct(null);
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            category: product.category || 'продукты',
            shop_id: product.shop_id || '',
            price: product.price,
            weight: product.weight ? (product.weight >= 1000 ? product.weight / 1000 : product.weight) : '',
            weightUnit: product.weight && product.weight >= 1000 ? 'kg' : 'g',
            calories: product.calories || '',
            proteins: product.proteins || '',
            fats: product.fats || '',
            carbs: product.carbs || '',
            quantity: product.quantity || ''
        });
        // Scroll to top to see form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                shop_id: formData.shop_id ? parseInt(formData.shop_id) : null,
                price: parseFloat(formData.price),
                weight: formData.weight ? (formData.weightUnit === 'kg' ? parseFloat(formData.weight) * 1000 : parseInt(formData.weight)) : null,
                calories: formData.calories ? parseInt(formData.calories) : null,
                proteins: formData.proteins ? parseFloat(formData.proteins) : null,
                fats: formData.fats ? parseFloat(formData.fats) : null,
                carbs: formData.carbs ? parseFloat(formData.carbs) : null,
                quantity: formData.quantity ? parseInt(formData.quantity) : 1
            };

            // Remove helper field before sending
            delete payload.weightUnit;

            if (editingProduct) {
                await api.products.update(editingProduct.id, payload);
            } else {
                await api.products.create(payload);
            }

            resetForm();
            refreshProducts();
        } catch (error) {
            alert("Error: " + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Удалить товар?')) return;
        try {
            await api.products.delete(id);
            refreshProducts();
        } catch (error) {
            alert("Delete failed: " + error.message);
        }
    };

    // Filter and Sort
    const filteredProducts = products
        .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === 'price') return a.price - b.price;
            if (sortBy === 'shop') return (a.shop?.name || '').localeCompare(b.shop?.name || '');
            return new Date(b.created_at) - new Date(a.created_at);
        });

    const categories = ['Без категории', 'продукты', 'хоз.товары', 'растения', 'для дома', 'для машины'];
    const getCategoryColor = (cat) => {
        switch (cat) {
            case 'хоз.товары': return 'bg-info text-dark';
            case 'растения': return 'bg-success';
            case 'для дома': return 'bg-warning text-dark';
            case 'для машины': return 'bg-secondary';
            case 'Без категории': return 'bg-light text-dark border';
            default: return 'bg-primary'; // продукты
        }
    };


    return (
        <div className="row">
            {/* History Modal */}
            {historyProduct && (
                <div className="modal-backdrop-custom" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} onClick={() => setHistoryProduct(null)}>
                    <div className="glass-card p-4" style={{ maxWidth: '500px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="fw-bold mb-0">📉 История цен: {historyProduct.name}</h5>
                            <button className="btn-close" onClick={() => setHistoryProduct(null)}></button>
                        </div>
                        {historyProduct.history && historyProduct.history.length > 0 ? (
                            <div className="table-responsive">
                                <table className="table table-borderless text-white">
                                    <thead>
                                        <tr>
                                            <th>Дата</th>
                                            <th className="text-end">Цена</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...historyProduct.history]
                                            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                            .map((h, idx) => (
                                                <tr key={idx} className="border-bottom border-secondary-subtle">
                                                    <td>{new Date(h.created_at).toLocaleDateString()} {new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                    <td className="text-end fw-bold">{h.price.toFixed(2)} {getProductCurrency(historyProduct)}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-center text-muted">История цен пуста</p>
                        )}
                        <div className="mt-3 text-center">
                            <button className="btn btn-outline-light btn-sm" onClick={() => setHistoryProduct(null)}>Закрыть</button>
                        </div>
                    </div>
                </div>
            )}


            {/* Add/Edit Product Form */}
            <div className="col-md-4 mb-4">
                <div className="glass-card p-4 sticky-top" style={{ top: '20px' }}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="fw-bold mb-0">
                            {editingProduct ? '✏️ Редактировать' : '✨ Добавить товар'}
                        </h5>
                        {editingProduct && (
                            <button className="btn btn-sm btn-outline-secondary" onClick={resetForm}>
                                Отмена
                            </button>
                        )}
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label small text-muted">Название</label>
                            <input
                                type="text"
                                className="form-control"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="mb-3">
                            <label className="form-label small text-muted">Категория</label>
                            <select
                                className="form-select form-control"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div className="mb-3">
                            <label className="form-label small text-muted">Магазин</label>
                            <select
                                className="form-select form-control"
                                value={formData.shop_id}
                                onChange={e => setFormData({ ...formData, shop_id: e.target.value })}
                            >
                                <option value="">-- Не выбрано --</option>
                                {shops.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} ({getCurrencySymbol(s.currency || 'EUR')})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-3">
                            <label className="form-label small text-muted">Цена</label>
                            <div className="input-group">
                                <input
                                    type="number" step="0.01" min="0"
                                    className="form-control"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    required
                                />
                                <span className="input-group-text">{getShopCurrencyById(formData.shop_id)}</span>
                            </div>
                        </div>
                        <div className="row mb-3">
                        </div>
                        <div className="row mb-3">
                            <div className="col-6">
                                <label className="form-label small text-muted">Вес</label>
                                <div className="input-group">
                                    <input type="number" step="0.1" min="0" className="form-control" placeholder="..."
                                        value={formData.weight}
                                        onChange={e => setFormData({ ...formData, weight: e.target.value })}
                                    />
                                    <select
                                        className="form-select px-1 bg-light text-dark"
                                        style={{ maxWidth: '60px' }}
                                        value={formData.weightUnit}
                                        onChange={e => setFormData({ ...formData, weightUnit: e.target.value })}
                                    >
                                        <option value="g">г</option>
                                        <option value="kg">кг</option>
                                    </select>
                                </div>
                            </div>
                            <div className="col-6">
                                <label className="form-label small text-muted">Ккал</label>
                                <input type="number" step="0.1" min="0" className="form-control" placeholder="..."
                                    value={formData.calories}
                                    onChange={e => setFormData({ ...formData, calories: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="row mb-3">
                            <div className="col-4">
                                <label className="form-label small text-muted">Белки</label>
                                <input type="number" className="form-control px-2" placeholder="..." step="0.1" min="0"
                                    value={formData.proteins}
                                    onChange={e => setFormData({ ...formData, proteins: e.target.value })}
                                />
                            </div>
                            <div className="col-4">
                                <label className="form-label small text-muted">Жиры</label>
                                <input type="number" className="form-control px-2" placeholder="..." step="0.1" min="0"
                                    value={formData.fats}
                                    onChange={e => setFormData({ ...formData, fats: e.target.value })}
                                />
                            </div>
                            <div className="col-4">
                                <label className="form-label small text-muted">Углеводы</label>
                                <input type="number" className="form-control px-2" placeholder="..." step="0.1" min="0"
                                    value={formData.carbs}
                                    onChange={e => setFormData({ ...formData, carbs: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="row mb-3">
                            <div className="col-4">
                                <label className="form-label small text-muted">Шт.</label>
                                <input type="number" step="1" min="0" className="form-control px-2" placeholder="..."
                                    value={formData.quantity}
                                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                />
                            </div>
                        </div>
                        <button type="submit" className={`btn w-100 ${editingProduct ? 'btn-warning text-white' : 'btn-premium'}`}>
                            {editingProduct ? 'Сохранить изменения' : 'Добавить'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Product List */}
            <div className="col-md-8">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <input
                        type="text"
                        className="form-control w-50"
                        placeholder="🔍 Поиск товаров..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <select
                        className="form-select w-auto"
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                    >
                        <option value="date">📅 По дате</option>
                        <option value="shop">🏪 По магазину</option>
                        <option value="price">💰 По цене</option>
                    </select>
                </div>

                <div className="d-flex flex-column gap-3">
                    {filteredProducts.map(p => (
                        <div
                            key={p.id}
                            className="glass-card p-3 d-flex justify-content-between align-items-center"
                            onClick={() => handleEdit(p)}
                            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <div>
                                <h6 className="mb-1 fw-bold">
                                    {p.name}
                                    <span className={`badge ms-2 ${getCategoryColor(p.category || 'продукты')}`} style={{ fontSize: '0.7em' }}>
                                        {p.category || 'продукты'}
                                    </span>
                                </h6>
                                <div className="small text-muted">
                                    <span className="badge bg-light text-dark border me-2">
                                        {p.shop ? p.shop.name : 'Без магазина'}
                                    </span>
                                    {p.weight && (
                                        <span className="me-2 text-secondary">
                                            {p.weight >= 1000 ? `${p.weight / 1000} кг` : `${p.weight} г`}
                                        </span>
                                    )}
                                    {p.calories && <span className="text-secondary me-2">{p.calories} ккал</span>}
                                    {(p.proteins || p.fats || p.carbs) && (
                                        <div className="d-inline-block text-muted" style={{ fontSize: '0.8em' }}>
                                            Б: {p.proteins || '-'} / Ж: {p.fats || '-'} / У: {p.carbs || '-'}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <span className="fs-5 fw-bold text-primary me-3">
                                    {p.price.toFixed(2)} {getProductCurrency(p)}
                                </span>
                                <button
                                    className="btn btn-outline-info btn-sm rounded-circle me-1"
                                    onClick={(e) => handleViewHistory(e, p)}
                                    title="История цен"
                                >
                                    <i className="bi bi-clock-history"></i>
                                </button>

                                <button
                                    className="btn btn-outline-danger btn-sm rounded-circle"
                                    onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                                    title="Удалить"
                                >
                                    <i className="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredProducts.length === 0 && (
                        <div className="text-center text-muted py-5">
                            Товары не найдены
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductsPage;
