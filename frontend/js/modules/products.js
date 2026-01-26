import { api } from '../api.js';
import { ProductCard } from '../components.js';
import { validatePositive, parseOptionalFloat, parseOptionalInt } from '../utils.js';
import { showHistoryModal } from './history.js';

// Кешируем элементы для модуля
let listEl, formEl, titleEl, submitBtn, cancelBtn;
let inputs = {};

export function renderProducts(products) {
    if (listEl) {
        listEl.innerHTML = products.map(ProductCard).join('');
    }
}

export function initProducts(refreshCallback) {
    // Поиск элементов
    listEl = document.getElementById('productList');
    formEl = document.getElementById('productForm');
    titleEl = document.getElementById('formTitle');
    submitBtn = document.getElementById('submitBtn');
    cancelBtn = document.getElementById('cancelBtn');
    
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
            if (id) {
                await api.products.update(id, rawData);
            } else {
                await api.products.create(rawData);
            }
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