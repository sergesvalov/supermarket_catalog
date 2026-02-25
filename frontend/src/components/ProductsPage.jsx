import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import ProductCard from './ProductCard';
import ProductForm from './ProductForm';

const ProductsPage = () => {
    const { shops, categories, currencySymbol, getCurrencySymbol, refreshCategories } = useAppContext();
    const queryClient = useQueryClient();

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
    const [filterShopId, setFilterShopId] = useState('');

    // Fetch products based on filters
    const { data: productsData = { items: [] }, isLoading, isError } = useQuery({
        queryKey: ['products', { search: searchTerm, shop_id: filterShopId, sort_by: sortBy }],
        queryFn: () => api.products.list({ search: searchTerm, shop_id: filterShopId, sort_by: sortBy }),
        keepPreviousData: true
    });
    const filteredProducts = productsData.items || productsData;

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

    const createMutation = useMutation({
        mutationFn: api.products.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            resetForm();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }) => api.products.update(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            resetForm();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: api.products.delete,
        onMutate: async (deletedId) => {
            // Optimistic update
            await queryClient.cancelQueries(['products']);
            const previousData = queryClient.getQueryData(['products', { search: searchTerm, shop_id: filterShopId, sort_by: sortBy }]);

            if (previousData) {
                queryClient.setQueryData(
                    ['products', { search: searchTerm, shop_id: filterShopId, sort_by: sortBy }],
                    (old) => {
                        const items = old.items || old;
                        const newItems = items.filter(p => p.id !== deletedId);
                        return old.items ? { ...old, items: newItems } : newItems;
                    }
                );
            }
            return { previousData };
        },
        onError: (err, deletedId, context) => {
            queryClient.setQueryData(['products', { search: searchTerm, shop_id: filterShopId, sort_by: sortBy }], context.previousData);
            alert("Delete failed: " + err.message);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        }
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            shop_id: formData.shop_id ? parseInt(formData.shop_id) : null,
            price: parseFloat(formData.price),
            weight: formData.weight ? (['kg', 'l'].includes(formData.weightUnit) ? parseFloat(formData.weight) * 1000 : parseFloat(formData.weight)) : null,
            calories: formData.calories ? parseInt(formData.calories) : null,
            proteins: formData.proteins ? parseFloat(formData.proteins) : null,
            fats: formData.fats ? parseFloat(formData.fats) : null,
            carbs: formData.carbs ? parseFloat(formData.carbs) : null,
            quantity: formData.quantity ? parseInt(formData.quantity) : 1
        };
        delete payload.weightUnit;

        if (editingProduct) {
            updateMutation.mutate({ id: editingProduct.id, payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleDelete = (id) => {
        if (!confirm('Удалить товар?')) return;
        deleteMutation.mutate(id);
    };

    const getCategoryColor = (catName) => {
        const cat = categories.find(c => c.name === catName);
        return cat ? cat.color_class : 'bg-primary';
    };

    // Category Editor State
    const [showCategoryEditor, setShowCategoryEditor] = useState(false);
    const [categoryForm, setCategoryForm] = useState({ id: null, name: '', color_class: 'bg-primary' });

    const openCategoryEditor = () => {
        setShowCategoryEditor(true);
        setCategoryForm({ id: null, name: '', color_class: 'bg-primary' });
    };

    const handleSaveCategory = async (e) => {
        e.preventDefault();
        try {
            if (categoryForm.id) {
                await api.categories.update(categoryForm.id, categoryForm);
            } else {
                await api.categories.create(categoryForm);
            }
            setCategoryForm({ id: null, name: '', color_class: 'bg-primary' });
            refreshCategories();
        } catch (error) {
            alert("Error saving category: " + error.message);
        }
    };

    const handleDeleteCategory = async (id) => {
        if (!confirm('Удалить категорию? Товары с этой категорией не удалятся, но могут потерять цвет.')) return;
        try {
            await api.categories.delete(id);
            refreshCategories();
        } catch (error) {
            alert("Delete failed: " + error.message);
        }
    };

    const editCategory = (cat) => {
        setCategoryForm({ id: cat.id, name: cat.name, color_class: cat.color_class || 'bg-primary' });
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

            {/* Category Editor Modal */}
            {showCategoryEditor && (
                <div className="modal-backdrop-custom" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} onClick={() => setShowCategoryEditor(false)}>
                    <div className="glass-card p-4" style={{ maxWidth: '500px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="fw-bold mb-0">Категории</h5>
                            <button className="btn-close" onClick={() => setShowCategoryEditor(false)}></button>
                        </div>

                        <form onSubmit={handleSaveCategory} className="mb-4">
                            <div className="row g-2 align-items-end">
                                <div className="col-6">
                                    <label className="form-label small text-muted">Название</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        required
                                        value={categoryForm.name}
                                        onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="col-4">
                                    <label className="form-label small text-muted">Цвет</label>
                                    <select
                                        className="form-select form-select-sm"
                                        value={categoryForm.color_class}
                                        onChange={e => setCategoryForm({ ...categoryForm, color_class: e.target.value })}
                                    >
                                        <option value="bg-primary">Синий (Primary)</option>
                                        <option value="bg-secondary">Серый (Secondary)</option>
                                        <option value="bg-success">Зеленый (Success)</option>
                                        <option value="bg-danger text-light">Красный (Danger)</option>
                                        <option value="bg-warning text-dark">Желтый (Warning)</option>
                                        <option value="bg-info text-dark">Голубой (Info)</option>
                                        <option value="bg-light text-dark border">Светлый (Light)</option>
                                        <option value="bg-dark text-light">Темный (Dark)</option>
                                    </select>
                                </div>
                                <div className="col-2">
                                    <button type="submit" className={`btn btn-sm w-100 ${categoryForm.id ? 'btn-warning' : 'btn-primary'}`}>
                                        {categoryForm.id ? '✓' : '+'}
                                    </button>
                                </div>
                            </div>
                            {categoryForm.id && (
                                <div className="mt-1 text-end">
                                    <button type="button" className="btn btn-link btn-sm text-secondary p-0" onClick={() => setCategoryForm({ id: null, name: '', color_class: 'bg-primary' })}>
                                        отмена ред.
                                    </button>
                                </div>
                            )}
                        </form>

                        <div className="list-group">
                            {categories.map(cat => (
                                <div key={cat.id} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center bg-transparent text-white border-secondary-subtle">
                                    <div>
                                        <span className={`badge ${cat.color_class} me-2`}>{cat.name}</span>
                                    </div>
                                    <div className="btn-group">
                                        <button className="btn btn-sm btn-outline-info" onClick={() => editCategory(cat)}>
                                            <i className="bi bi-pencil"></i>
                                        </button>
                                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteCategory(cat.id)}>
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}


            {/* Add/Edit Product Form */}
            <div className="col-md-4 mb-4">
                <ProductForm
                    formData={formData}
                    setFormData={setFormData}
                    categories={categories}
                    shops={shops}
                    editingProduct={editingProduct}
                    getShopCurrencyById={getShopCurrencyById}
                    openCategoryEditor={openCategoryEditor}
                    handleSubmit={handleSubmit}
                    resetForm={resetForm}
                />
            </div>

            {/* Product List */}
            <div className="col-md-8">
                <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
                    <input
                        type="text"
                        className="form-control"
                        style={{ flex: 1 }}
                        placeholder="🔍 Поиск товаров..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <select
                        className="form-select w-auto"
                        value={filterShopId}
                        onChange={e => setFilterShopId(e.target.value)}
                    >
                        <option value="">🏪 Все магазины</option>
                        {shops.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
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
                    {isLoading ? (
                        <div className="text-center text-muted py-5">
                            <div className="spinner-border mb-3" role="status"></div>
                            <div>Загрузка товаров...</div>
                        </div>
                    ) : (
                        <>
                            {filteredProducts.map(p => (
                                <ProductCard
                                    key={p.id}
                                    product={p}
                                    getCategoryColor={getCategoryColor}
                                    getProductCurrency={getProductCurrency}
                                    handleEdit={handleEdit}
                                    handleViewHistory={handleViewHistory}
                                    handleDelete={handleDelete}
                                />
                            ))}
                            {filteredProducts.length === 0 && (
                                <div className="text-center text-muted py-5">
                                    Товары не найдены
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductsPage;
