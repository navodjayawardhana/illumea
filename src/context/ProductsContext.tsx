import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Product } from '../data/products';
import { api } from '../services/api';

interface ProductsContextType {
  products: Product[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

/**
 * The catalogue, fetched once from Vertik and shared by every section. Prices and stock are live
 * in the ERP, so nothing here is cached beyond the visit.
 */
export const ProductsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    api.getProducts()
      .then(setProducts)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return (
    <ProductsContext.Provider value={{ products, loading, error, reload }}>
      {children}
    </ProductsContext.Provider>
  );
};

export const useProducts = () => {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be used within a ProductsProvider');
  return ctx;
};
