import React, { createContext, useState, useContext, useEffect } from 'react';
import { api } from '../api';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [products, setProducts] = useState([]);
    const [shops, setShops] = useState([]);
    const [lists, setLists] = useState([]);
    const [currency, setCurrency] = useState('EUR');

    const currencySymbols = {
        'EUR': '€',
        'USD': '$',
        'RUB': '₽'
    };
    const currencySymbol = currencySymbols[currency] || currency;

    const [loading, setLoading] = useState(false);

    // Initial Data Load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [productsData, shopsData, listsData, adminConfig] = await Promise.all([
                api.products.list(),
                api.shops.list(),
                api.lists.getAll(),
                api.admin.getConfig()
            ]);
            setProducts(productsData);
            setShops(shopsData);
            setLists(listsData);
            if (adminConfig && adminConfig.currency) {
                setCurrency(adminConfig.currency);
            }
        } catch (error) {
            console.error("Failed to load initial data", error);
            // Optionally add toast notification here
        } finally {
            setLoading(false);
        }
    };

    const refreshProducts = async () => {
        const data = await api.products.list();
        setProducts(data);
    };

    const refreshShops = async () => {
        const data = await api.shops.list();
        setShops(data);
    };

    const refreshLists = async () => {
        const data = await api.lists.getAll();
        setLists(data);
    };

    const value = {
        products,
        shops,
        lists,
        currency,
        currencySymbol,
        loading,
        setCurrency,
        refreshProducts,
        refreshShops,
        refreshLists
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
