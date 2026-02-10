import { api } from '../api.js';
import { ProductCard } from '../components.js';
import { validatePositive, parseOptionalFloat, parseOptionalInt } from '../utils.js';
import { showHistoryModal } from './history.js';

import { state } from '../state.js';

// Кешируем элементы для модуля
let listEl, formEl, titleEl, submitBtn, cancelBtn, sortSelect;
let inputs = {};

export function renderProducts(products) {
    // Если передали продукты - обновляем стейт (например при первичной загрузке)
    // Но если сортируем - берем из стейта
    if (products) {
        // Ничего не делаем, так как стейт обновляется в app.js через setProducts
        // Но нам нужно знать какой список рендерить.
        // Лучше так: сортировка всегда берет state.allProducts и рендерит их.
    }

    // Сортировка
    let sorted = [...state.allProducts];
    const criterion = sortSelect ? sortSelect.value : 'date';

    if (criterion === 'price') {
        sorted.sort((a, b) => a.price - b.price);
    } else if (criterion === 'shop') {
        sorted.sort((a, b) => {
            const nameA = a.shop ? a.shop.name : 'zzz'; // Без магазина - в конец
            const nameB = b.shop ? b.shop.name : 'zzz';
            return nameA.localeCompare(nameB);
        });
    } else {
        // По дате (новые сверху)
        sorted.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    }

    if (listEl) {
        listEl.innerHTML = sorted.map(ProductCard).join('');
    }
}

export function initProducts(refreshCallback) {
    // Поиск элементов
    listEl = document.getElementById('productList');
    formEl = document.getElementById('productForm');
    titleEl = document.getElementById('formTitle');
    submitBtn = document.getElementById('submitBtn');
    cancelBtn = document.getElementById('cancelBtn');
    sortSelect = document.getElementById('sortSelect');

    if (sortSelect) {
        sortSelect.addEventListener('change', () => renderProducts());
    }

    if (!formEl) return;

    // Сбор инпутов
    inputs = {
        id: document.getElementById('productId'),
        name: document.getElementById('name'),
        shop: document.getElementById('shopSelect'),
        price: document.getElementById('price'),
        weight: document.getElementById('weight'),
        calories: document.getElementById('calories'),
        quantity: document.getElementById('quantity'),
    };

    // 1. Делегирование кликов (Edit / History)
    listEl.addEventListener('click', (e) => {
        const btnEdit = e.target.closest('.btn-edit');
        if (btnEdit) {
            fillForm(JSON.parse(btnEdit.dataset.product));
            return;
        }

        const btnHistory = e.target.closest('.btn-history');
        if (btnHistory) {
            showHistoryModal(btnHistory.dataset.name, JSON.parse(btnHistory.dataset.history));
            return;
        }

        const btnDelete = e.target.closest('.btn-delete-product');
        if (btnDelete) {
            if (confirm('Вы уверены, что хотите удалить этот товар?')) {
                api.products.delete(btnDelete.dataset.id)
                    .then(() => {
                        // Обновляем список
                        if (refreshCallback) refreshCallback();
                    })
                    .catch(err => alert('Ошибка удаления: ' + err.message));
            }
        }
    });

    // 2. Обработка формы
    formEl.addEventListener('submit', async (e) => {
        e.preventDefault();

        // ВАЖНО: Четкое получение shop_id
        const shopIdValue = inputs.shop.value;

        const rawData = {
            name: inputs.name.value.trim(),
            shop_id: shopIdValue ? parseInt(shopIdValue) : null,
            price: parseFloat(inputs.price.value),
            weight: parseOptionalFloat(inputs.weight.value),
            calories: parseOptionalFloat(inputs.calories.value),
            quantity: parseOptionalInt(inputs.quantity.value),
        };

        if (!validatePositive(rawData.price, rawData.weight, rawData.calories, rawData.quantity)) {
            return alert('Числа не могут быть отрицательными!');
        }

        try {
            const id = inputs.id.value;
            console.log('DEBUG: Product ID =', id, '| Type:', typeof id, '| Truthy:', !!id);
            let result;
            if (id) {
                console.log('DEBUG: Sending PUT to update product', id);
                result = await api.products.update(id, rawData);
            } else {
                console.log('DEBUG: Sending POST to create new product');
                result = await api.products.create(rawData);
            }
            console.log('DEBUG: API Response:', result);
            resetForm();
            if (refreshCallback) await refreshCallback();
        } catch (err) {
            alert("Ошибка сохранения: " + err.message);
        }
    });

    if (cancelBtn) cancelBtn.addEventListener('click', resetForm);
}

function fillForm(p) {
    inputs.id.value = p.id;
    inputs.name.value = p.name;
    inputs.shop.value = p.shop_id || ""; // Связываем селект по ID
    inputs.price.value = p.price;
    inputs.weight.value = p.weight || "";
    inputs.calories.value = p.calories || "";
    inputs.quantity.value = p.quantity || "";

    titleEl.innerText = 'Редактировать товар';
    submitBtn.innerText = 'Сохранить';
    submitBtn.classList.replace('btn-success', 'btn-primary');
    cancelBtn.classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    formEl.reset();
    inputs.id.value = '';
    titleEl.innerText = 'Добавить товар';
    submitBtn.innerText = 'Добавить';
    submitBtn.classList.replace('btn-primary', 'btn-success');
    cancelBtn.classList.add('d-none');
}