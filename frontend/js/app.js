import { api } from './api.js';
import { ProductCard, ShopItem, ShopOption } from './components.js';
import { validatePositive, parseOptionalFloat, parseOptionalInt } from './utils.js';

// === State & DOM Elements ===
const els = {
    productList: document.getElementById('productList'),
    shopList: document.getElementById('shopList'),
    shopSelect: document.getElementById('shopSelect'),
    productForm: document.getElementById('productForm'),
    shopForm: document.getElementById('shopForm'),
    formTitle: document.getElementById('formTitle'),
    submitBtn: document.getElementById('submitBtn'),
    cancelBtn: document.getElementById('cancelBtn'),
    inputs: {
        id: document.getElementById('productId'),
        name: document.getElementById('name'),
        shop: document.getElementById('shopSelect'),
        price: document.getElementById('price'),
        weight: document.getElementById('weight'),
        calories: document.getElementById('calories'),
        quantity: document.getElementById('quantity'),
    }
};

// === Logic ===

async function loadData() {
    try {
        const [products, shops] = await Promise.all([api.products.list(), api.shops.list()]);
        renderProducts(products);
        renderShops(shops);
    } catch (e) { console.error(e); }
}

function renderProducts(products) {
    els.productList.innerHTML = products.map(ProductCard).join('');
}

function renderShops(shops) {
    // Сохраняем текущий выбор в селекте
    const currentVal = els.shopSelect.value;
    
    // Рендер селекта
    els.shopSelect.innerHTML = '<option value="">-- Не выбрано --</option>' + shops.map(ShopOption).join('');
    els.shopSelect.value = currentVal;

    // Рендер списка
    els.shopList.innerHTML = shops.map(ShopItem).join('');
}

// === Event Handlers (Delegation) ===

// 1. Обработка кликов в списке товаров (Редактирование)
els.productList.addEventListener('click', (e) => {
    // Ищем ближайшую кнопку с классом btn-edit
    const btn = e.target.closest('.btn-edit');
    if (!btn) return;

    const data = JSON.parse(btn.dataset.product);
    fillForm(data);
});

// 2. Обработка кликов в списке магазинов (Удаление)
els.shopList.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-delete-shop');
    if (!btn) return;

    if (confirm('Удалить магазин?')) {
        await api.shops.delete(btn.dataset.id);
        loadData();
    }
});

// 3. Форма Товара
els.productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const rawData = {
        name: els.inputs.name.value,
        shop_id: parseOptionalInt(els.inputs.shop.value),
        price: parseFloat(els.inputs.price.value),
        weight: parseOptionalFloat(els.inputs.weight.value),
        calories: parseOptionalFloat(els.inputs.calories.value),
        quantity: parseOptionalInt(els.inputs.quantity.value),
    };

    if (!validatePositive(rawData.price, rawData.weight, rawData.calories, rawData.quantity)) {
        return alert('Числа не могут быть отрицательными!');
    }

    try {
        const id = els.inputs.id.value;
        if (id) {
            await api.products.update(id, rawData);
        } else {
            await api.products.create(rawData);
        }
        resetForm();
        loadData();
    } catch (err) {
        alert(err.message);
    }
});

// 4. Форма Магазина
els.shopForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('newShopName');
    try {
        await api.shops.create({ name: input.value });
        input.value = '';
        loadData();
    } catch (err) { alert(err.message); }
});

// === Helpers ===

function fillForm(p) {
    els.inputs.id.value = p.id;
    els.inputs.name.value = p.name;
    els.inputs.shop.value = p.shop_id || "";
    els.inputs.price.value = p.price;
    els.inputs.weight.value = p.weight || "";
    els.inputs.calories.value = p.calories || "";
    els.inputs.quantity.value = p.quantity || "";

    els.formTitle.innerText = 'Редактировать товар';
    els.submitBtn.innerText = 'Сохранить';
    els.submitBtn.classList.replace('btn-success', 'btn-primary');
    els.cancelBtn.classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    els.productForm.reset();
    els.inputs.id.value = '';
    els.formTitle.innerText = 'Добавить товар';
    els.submitBtn.innerText = 'Добавить';
    els.submitBtn.classList.replace('btn-primary', 'btn-success');
    els.cancelBtn.classList.add('d-none');
}

// Привязываем кнопку отмены (она одна, делегирование не нужно)
els.cancelBtn.addEventListener('click', resetForm);

// === Init ===
document.addEventListener('DOMContentLoaded', loadData);