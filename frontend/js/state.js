// Простое хранилище состояния
export const state = {
    allProducts: [],
    currentListId: null
};

export function setProducts(products) {
    state.allProducts = products;
}