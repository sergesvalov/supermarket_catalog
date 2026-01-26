import { api } from '../api.js';
import { ProductCard } from '../components.js';
import { validatePositive, parseOptionalFloat, parseOptionalInt } from '../utils.js';
import { showHistoryModal } from './history.js';

// DOM элементы
const els = {
    list: document.getElementById('productList'),
    form: document.getElementById('productForm'),
    title: document.getElementById('formTitle'),
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

export function renderProducts(products) {
    if (els.list) els.list.innerHTML = products.map(ProductCard).join('');
}

export function initProducts(refreshCallback) {
    if (!els.list) return;

    // 1. Клики по списку (Edit / History)
    els.list.addEventListener('click', (e) => {
        const btnEdit = e.target.closest('.btn-edit');
        if (btnEdit) {
            const data = JSON.parse(btnEdit.dataset.product);
            fillForm(data);
            return;
        }

        const btnHistory = e.target.closest('.btn-history');
        if (btnHistory) {
            const history = JSON.parse(btnHistory.dataset.history);
            const name = btnHistory.dataset.name;
            showHistoryModal(name, history);
        }
    });

    // 2. Сабмит формы
    if (els.form) {
        els.form.addEventListener('submit', async (e) => {
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
                if (id) await api.products.update(id, rawData);
                else await api.products.create(rawData);
                resetForm();
                if (refreshCallback) refreshCallback();
            } catch (err) { alert(err.message); }
        });
    }

    // 3. Отмена
    if (els.cancelBtn) els.cancelBtn.addEventListener('click', resetForm);
}

function fillForm(p) {
    els.inputs.id.value = p.id;
    els.inputs.name.value = p.name;
    els.inputs.shop.value = p.shop_id || "";
    els.inputs.price.value = p.price;
    els.inputs.weight.value = p.weight || "";
    els.inputs.calories.value = p.calories || "";
    els.inputs.quantity.value = p.quantity || "";

    els.title.innerText = 'Редактировать товар';
    els.submitBtn.innerText = 'Сохранить';
    els.submitBtn.classList.replace('btn-success', 'btn-primary');
    els.cancelBtn.classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    els.form.reset();
    els.inputs.id.value = '';
    els.title.innerText = 'Добавить товар';
    els.submitBtn.innerText = 'Добавить';
    els.submitBtn.classList.replace('btn-primary', 'btn-success');
    els.cancelBtn.classList.add('d-none');
}