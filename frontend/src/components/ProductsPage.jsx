import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../api';

const ProductsPage = () => {
    const { products, shops, currency, refreshProducts } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date');

    // New Product Form State
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: '', shop_id: '', price: '', weight: '', calories: '', quantity: ''
    });

    const resetForm = () => {
        setFormData({ name: '', shop_id: '', price: '', weight: '', calories: '', quantity: '' });
        setEditingProduct(null);
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            shop_id: product.shop_id || '',
            price: product.price,
            weight: product.weight || '',
            calories: product.calories || '',
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
                weight: formData.weight ? parseInt(formData.weight) : null,
                calories: formData.calories ? parseInt(formData.calories) : null,
                quantity: formData.quantity ? parseInt(formData.quantity) : 1
            };

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

    return (
        <div className="row">
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
                            <label className="form-label small text-muted">Магазин</label>
                            <select
                                className="form-select form-control"
                                value={formData.shop_id}
                                onChange={e => setFormData({ ...formData, shop_id: e.target.value })}
                            >
                                <option value="">-- Не выбрано --</option>
                                {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="mb-3">
                            <label className="form-label small text-muted">Цена ({currency})</label>
                            <input
                                type="number" step="0.01"
                                className="form-control"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                required
                            />
                        </div>
                        <div className="row mb-3">
                            <div className="col-4">
                                <label className="form-label small text-muted">Вес(г)</label>
                                <input type="number" className="form-control px-2" placeholder="..."
                                    value={formData.weight}
                                    onChange={e => setFormData({ ...formData, weight: e.target.value })}
                                />
                            </div>
                            <div className="col-4">
                                <label className="form-label small text-muted">Ккал</label>
                                <input type="number" className="form-control px-2" placeholder="..."
                                    value={formData.calories}
                                    onChange={e => setFormData({ ...formData, calories: e.target.value })}
                                />
                            </div>
                            <div className="col-4">
                                <label className="form-label small text-muted">Шт.</label>
                                <input type="number" className="form-control px-2" placeholder="..."
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
                                <h6 className="mb-1 fw-bold">{p.name}</h6>
                                <div className="small text-muted">
                                    <span className="badge bg-light text-dark border me-2">
                                        {p.shop ? p.shop.name : 'Без магазина'}
                                    </span>
                                    {p.weight && <span className="me-2 text-secondary">{p.weight}г</span>}
                                    {p.calories && <span className="text-secondary">{p.calories} ккал</span>}
                                </div>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <span className="fs-5 fw-bold text-primary me-3">
                                    {p.price.toFixed(2)} {currency}
                                </span>
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
