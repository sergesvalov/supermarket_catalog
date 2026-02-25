import React, { createContext, useState, useContext, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const queryClient = useQueryClient();

    const { data: shopsRes = { items: [] }, isLoading: isShopsLoading } = useQuery({ queryKey: ['shops'], queryFn: api.shops.list });
    const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({ queryKey: ['categories'], queryFn: api.categories.list });
    const { data: lists = [], isLoading: isListsLoading } = useQuery({ queryKey: ['lists'], queryFn: () => api.lists.getAll() });
    const { data: adminConfig = null, isLoading: isAdminLoading } = useQuery({ queryKey: ['adminConfig'], queryFn: () => api.admin.getConfig() });

    // Handle pagination objects by extracting items if they exist
    const shops = shopsRes.items || shopsRes;

    const [currency, setCurrency] = useState('EUR');
    const [exchangeRates, setExchangeRates] = useState({ usd_rate: 0, rub_rate: 0 });

    useEffect(() => {
        if (adminConfig) {
            if (adminConfig.currency) setCurrency(adminConfig.currency);
            setExchangeRates({
                usd_rate: adminConfig.usd_rate || 0,
                rub_rate: adminConfig.rub_rate || 0
            });
        }
    }, [adminConfig]);

    const getCurrencySymbol = (code) => {
        const symbols = { 'EUR': '€', 'USD': '$', 'RUB': '₽' };
        return symbols[code] || code;
    };
    const currencySymbol = getCurrencySymbol(currency);

    const loading = isShopsLoading || isCategoriesLoading || isListsLoading || isAdminLoading;

    const refreshProducts = () => queryClient.invalidateQueries({ queryKey: ['products'] });
    const refreshShops = () => queryClient.invalidateQueries({ queryKey: ['shops'] });
    const refreshCategories = () => queryClient.invalidateQueries({ queryKey: ['categories'] });
    const refreshLists = () => queryClient.invalidateQueries({ queryKey: ['lists'] });

    const value = {
        shops,
        categories,
        lists,
        currency,
        currencySymbol,
        getCurrencySymbol,
        loading,
        setCurrency,
        exchangeRates,
        setExchangeRates,
        refreshProducts,
        refreshShops,
        refreshCategories,
        refreshLists
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
