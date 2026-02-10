import { api } from './api.js';
import { state, setProducts } from './state.js';

import { initProducts, renderProducts } from './modules/products.js';
import { initShops, renderShops } from './modules/shops.js';
import { initLists, renderLists, refreshActiveList, renderProductPicker } from './modules/lists.js';
import { initTelegram } from './modules/telegram.js';
import { initAdmin } from './modules/admin.js';

async function loadData() {
    try {
        // Сначала загружаем конфиг, чтобы установить валюту
        await initAdmin();

        console.log("Загрузка данных...");
        const [products, shops, lists] = await Promise.all([
            api.products.list(),
            api.shops.list(),
            api.lists.getAll()
        ]);

        setProducts(products);
        renderProducts(products);
        renderShops(shops);
        renderLists(lists);

        if (state.currentListId) {
            await refreshActiveList();
            const searchInput = document.getElementById('productSearchInput');
            renderProductPicker(searchInput ? searchInput.value : '');
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initProducts(loadData);
    initShops(loadData);
    initLists(loadData);
    initTelegram();
    // initAdmin вызывается внутри loadData, но initAdmin еще и вешает слушатели, 
    // поэтому его безопаснее вызвать и здесь для инициализации формы, 
    // но логику загрузки данных лучше держать в loadData.
    // В текущей реализации initAdmin делает и то, и другое.
    // Чтобы избежать двойного вызова getConfig, можно slightly refactor.
    // Но для простоты оставим вызов внутри loadData, он там нужен await.

    loadData();
});