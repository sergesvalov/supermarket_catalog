import { api } from './api.js';
import { 
    ProductCard, ShopItem, ShopOption, 
    ShoppingListCard, ShoppingListItemRow, ProductSearchItem 
} from './components.js';
import { validatePositive, parseOptionalFloat, parseOptionalInt } from './utils.js';

// === DOM ELEMENTS ===
const els = {
    // Вкладки
    productList: document.getElementById('productList'),
    shopSelect: document.getElementById('shopSelect'),
    productForm: document.getElementById('productForm'),
    
    inputs: {
        id: document.getElementById('productId'),
        name: document.getElementById('name'),
        shop: document.getElementById('shopSelect'),
        price: document.getElementById('price'),
        weight: document.getElementById('weight'),
        calories: document.getElementById('calories'),
        quantity: document.getElementById('quantity'),
    },
    formTitle: document.getElementById('formTitle'),
    submitBtn: document.getElementById('submitBtn'),
    cancelBtn: document.getElementById('cancelBtn'),

    // Магазины
    shopList: document.getElementById('shopList'),
    shopForm: document.getElementById('shopForm'),

    // Списки
    listsContainer: document.getElementById('listsContainer'),
    newListForm: document.getElementById('newListForm'),
    listsOverview: document.getElementById('listsOverview'),
    activeListView: document.getElementById('activeListView'),
    activeListTitle: document.getElementById('activeListTitle'),
    activeListItems: document.getElementById('activeListItems'),
    totalSum: document.getElementById('totalSum'),
    backToListsBtn: document.getElementById('backToListsBtn'),
    productSearchInput: document.getElementById('productSearchInput'),
    searchResults: document.getElementById('searchResults'),
};

// === STATE ===
let allProductsCache = [];
let currentListId = null;

// === INITIALIZATION ===
async function loadData() {
    try {
        console.log("Загрузка данных...");
        const [products, shops, lists] = await Promise.all([
            api.products.list(), 
            api.shops.list(),
            api.lists.getAll()
        ]);
        
        allProductsCache = products; 
        
        renderProducts(products);
        renderShops(shops);
        renderLists(lists);
        
        if (currentListId) {
            refreshActiveList();
            // Если мы уже внутри списка, нужно обновить и левую колонку выбора
            renderProductPicker(els.productSearchInput.value); 
        }
    } catch (e) { 
        console.error("Ошибка загрузки:", e); 
    }
}

function renderProducts(products) {
    if(els.productList) els.productList.innerHTML = products.map(ProductCard).join('');
}

function renderShops(shops) {
    if(els.shopSelect) {
        const currentVal = els.shopSelect.value;
        els.shopSelect.innerHTML = '<option value="">-- Не выбрано --</option>' + shops.map(ShopOption).join('');
        els.shopSelect.value = currentVal;
    }
    if(els.shopList) els.shopList.innerHTML = shops.map(ShopItem).join('');
}

function renderLists(lists) {
    if (!els.listsContainer) return;
    if (lists.length === 0) {
        els.listsContainer.innerHTML = '<div class="col-12 text-center text-muted py-5">Нет списков. Создайте первый!</div>';
    } else {
        els.listsContainer.innerHTML = lists.map(ShoppingListCard).join('');
    }
}

// === HANDLERS: СПИСКИ ===

// 1. Создание списка
if (els.newListForm) {
    els.newListForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        const input = document.getElementById('newListName');
        const name = input.value.trim();
        
        if(!name) return;

        try {
            await api.lists.create(name);
            input.value = '';
            await loadData();
        } catch (err) {
            alert("Ошибка создания списка: " + err.message);
        }
    });
}

// 2. Клик по списку (Открытие)
if (els.listsContainer) {
    els.listsContainer.addEventListener('click', async (e) => {
        const delBtn = e.target.closest('.btn-delete-list');
        if (delBtn) {
            e.stopPropagation();
            if(confirm('Удалить список?')) {
                await api.lists.delete(delBtn.dataset.id);
                loadData();
            }
            return;
        }
        
        const card = e.target.closest('.list-card');
        if (card) {
            openShoppingList(card.dataset.id);
        }
    });
}

async function openShoppingList(id) {
    currentListId = id;
    els.listsOverview.classList.add('d-none');
    els.activeListView.classList.remove('d-none');
    
    // Сброс фильтра
    els.productSearchInput.value = '';
    
    // === ВАЖНО: Сразу рендерим все товары слева ===
    renderProductPicker();
    
    await refreshActiveList();
}

async function refreshActiveList() {
    if(!currentListId) return;
    try {
        const list = await api.lists.getOne(currentListId);
        els.activeListTitle.innerText = list.name;
        
        // Защита от пустого списка items
        const items = list.items || [];

        if (items.length === 0) {
            els.activeListItems.innerHTML = '<li class="list-group-item text-center text-muted py-4">Список пуст. Выберите товары слева.</li>';
            els.totalSum.innerText = '0.00 €';
        } else {
            els.activeListItems.innerHTML = items.map(ShoppingListItemRow).join('');
            const sum = items.reduce((acc, item) => {
                if (!item.product) return acc;
                return acc + (item.product.price * item.quantity);
            }, 0);
            els.totalSum.innerText = sum.toFixed(2) + ' €';
        }
    } catch(e) {
        console.error("Ошибка загрузки списка:", e);
        els.activeListItems.innerHTML = `<div class="alert alert-danger">Ошибка: ${e.message}</div>`;
    }
}

function backToLists() {
    els.activeListView.classList.add('d-none');
    els.listsOverview.classList.remove('d-none');
    currentListId = null;
    loadData();
}

if(els.backToListsBtn) els.backToListsBtn.addEventListener('click', backToLists);

// 3. Умный поиск (ФИЛЬТРАЦИЯ)
if(els.productSearchInput) {
    els.productSearchInput.addEventListener('input', (e) => {
        // Просто перерисовываем левую колонку с новым фильтром
        renderProductPicker(e.target.value);
    });
}

// Хелпер для отрисовки выбора товаров
function renderProductPicker(query = '') {
    if (!els.searchResults) return;

    query = query.toLowerCase().trim();
    
    // Фильтруем кеш (если query пусто, вернется весь список)
    let filtered = allProductsCache.filter(p => p.name.toLowerCase().includes(query));
    
    // Сортируем: сначала дешевые
    filtered.sort((a, b) => a.price - b.price);

    if (filtered.length === 0) {
        els.searchResults.innerHTML = '<div class="list-group-item text-muted">Ничего не найдено</div>';
    } else {
        els.searchResults.innerHTML = filtered.map(ProductSearchItem).join('');
    }
}

// 4. Добавление в список
if(els.searchResults) {
    els.searchResults.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-add-to-list');
        if (!btn) return;
        
        e.preventDefault();

        try {
            await api.lists.addItem(currentListId, btn.dataset.product, 1);
            // Не очищаем поиск, чтобы можно было добавить еще товаров
            // els.productSearchInput.value = ''; 
            await refreshActiveList();
        } catch (err) {
            alert("Ошибка добавления: " + err.message);
        }
    });
}

// 5. Управление элементами списка (Чекбокс, Удаление)
if(els.activeListItems) {
    els.activeListItems.addEventListener('click', async (e) => {
        if (e.target.classList.contains('check-item')) {
            await api.lists.toggleItem(e.target.dataset.id, e.target.checked);
            refreshActiveList();
        }
        const delBtn = e.target.closest('.btn-remove-item');
        if (delBtn) {
            await api.lists.deleteItem(delBtn.dataset.id);
            refreshActiveList();
        }
    });
}

// === HANDLERS: ТОВАРЫ (Старые) ===

if (els.productForm) {
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
            if (id) await api.products.update(id, rawData);
            else await api.products.create(rawData);
            resetForm();
            loadData();
        } catch (err) { alert(err.message); }
    });
}

if (els.shopForm) {
    els.shopForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('newShopName');
        try {
            await api.shops.create({ name: input.value });
            input.value = '';
            loadData();
        } catch (err) { alert(err.message); }
    });
}

if (els.shopList) {
    els.shopList.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-delete-shop');
        if (!btn) return;
        if (confirm('Удалить магазин?')) {
            await api.shops.delete(btn.dataset.id);
            loadData();
        }
    });
}

if (els.productList) {
    els.productList.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-edit');
        if (!btn) return;
        const data = JSON.parse(btn.dataset.product);
        fillForm(data);
    });
}

// Helpers
function fillForm(p) {
    els.inputs.id.value = p.id;
    els.inputs.name.value = p.name;
    els.inputs.shop.value = p.shop_id || "";
    els.inputs.price.value = p.price;
    els.inputs.weight.value = p.weight || "";
    els.inputs.calories.value = p.calories || "";
    els.inputs.quantity.value = p.quantity || "";
    
    if(els.formTitle) els.formTitle.innerText = 'Редактировать товар';
    if(els.submitBtn) {
        els.submitBtn.innerText = 'Сохранить';
        els.submitBtn.classList.replace('btn-success', 'btn-primary');
    }
    if(els.cancelBtn) els.cancelBtn.classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    if(els.productForm) els.productForm.reset();
    if(els.inputs.id) els.inputs.id.value = '';
    if(els.formTitle) els.formTitle.innerText = 'Добавить товар';
    if(els.submitBtn) {
        els.submitBtn.innerText = 'Добавить';
        els.submitBtn.classList.replace('btn-primary', 'btn-success');
    }
    if(els.cancelBtn) els.cancelBtn.classList.add('d-none');
}

if(els.cancelBtn) els.cancelBtn.addEventListener('click', resetForm);

// START
document.addEventListener('DOMContentLoaded', loadData);