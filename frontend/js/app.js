import { api } from './api.js';
import { state, setProducts } from './state.js';

// Импорт модулей
import { initProducts, renderProducts } from './modules/products.js';
import { initShops, renderShops } from './modules/shops.js';
import { initLists, renderLists, refreshActiveList, renderProductPicker } from './modules/lists.js';

// === MAIN ENTRY POINT ===

async function loadData() {
    try {
        console.log("Загрузка данных...");
        const [products, shops, lists] = await Promise.all([
            api.products.list(), 
            api.shops.list(),
            api.lists.getAll()
        ]);

        // 1. Сохраняем продукты в стейт (нужны для поиска в списках)
        setProducts(products);

        // 2. Рендерим все части
        renderProducts(products);
        renderShops(shops);
        renderLists(lists);

        // 3. Если открыт конкретный список, обновляем его данные
        if (state.currentListId) {
            await refreshActiveList();
            // Обновляем пикер товаров (на случай если добавился новый товар)
            const searchInput = document.getElementById('productSearchInput');
            renderProductPicker(searchInput ? searchInput.value : '');
        }

    } catch (e) {
        console.error("Critical Load Error:", e);
    }
}

// Инициализация при старте
document.addEventListener('DOMContentLoaded', () => {
    // Подключаем слушатели событий (передаем loadData как коллбек для обновления)
    initProducts(loadData);
    initShops(loadData);
    initLists(loadData);

    // Первичная загрузка
    loadData();
});