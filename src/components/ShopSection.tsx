import React, { useState, useMemo } from 'react';
import { SlidersHorizontal, Sparkles, Search } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { useProducts } from '../context/ProductsContext';

interface ShopSectionProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  initialCategory?: string;
}

export const ShopSection: React.FC<ShopSectionProps> = ({
  searchQuery,
  setSearchQuery,
  initialCategory = 'All',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'rating'>('featured');
  const [onlyDiscounts, setOnlyDiscounts] = useState(false);

  const { products, loading, error, reload } = useProducts();
  // The categories are whatever the ERP files its products under, so a new one appears here
  // without a change to the site.
  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map((p) => p.category)))], [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === 'All' || product.category === selectedCategory;
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDiscount = onlyDiscounts ? product.isDiscount : true;

      return matchesCategory && matchesSearch && matchesDiscount;
    }).sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0; // featured default
    });
  }, [products, selectedCategory, searchQuery, onlyDiscounts, sortBy]);

  return (
    <section className="py-12 sm:py-20 bg-[#faf9f6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title & Description */}
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest">
            100% Herbal Skincare Collection
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif-title font-bold text-stone-900">
            Explore All Products
          </h1>
          <p className="text-stone-600 text-xs sm:text-sm">
            Manufactured to strict NMRA & GMP certified standards. Free from hydroquinone, parabens, and bleaching chemicals.
          </p>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 shadow-xs mb-8 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full md:w-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                    selectedCategory === cat
                      ? 'bg-[#1b3b22] text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort & Quick Filter Dropdowns */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              
              <button
                onClick={() => setOnlyDiscounts(!onlyDiscounts)}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition flex items-center gap-1.5 ${
                  onlyDiscounts
                    ? 'bg-amber-100 border-amber-300 text-amber-900'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>On Offer</span>
              </button>

              <div className="flex items-center gap-2 text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-stone-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-stone-50 border border-stone-200 text-stone-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>

            </div>

          </div>

          {/* Active Search Indicator */}
          {searchQuery && (
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
              <span>
                Showing results for: <strong className="text-stone-900">"{searchQuery}"</strong>
              </span>
              <button
                onClick={() => setSearchQuery('')}
                className="text-emerald-700 hover:underline font-semibold"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="text-center text-xs text-stone-500 py-16">Loading products...</div>
        ) : error ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 my-8 space-y-3">
            <h3 className="text-lg font-bold text-stone-800">The shop could not be loaded</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">{error}</p>
            <button onClick={reload} className="mt-2 px-5 py-2 bg-[#1b3b22] text-white text-xs font-semibold rounded-full">
              Try again
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 my-8 space-y-3">
            <Search className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="text-lg font-bold text-stone-800">No products found</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              We couldn't find any items matching your selected criteria. Try selecting another category or clear your search term.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
                setOnlyDiscounts(false);
              }}
              className="mt-2 px-5 py-2 bg-[#1b3b22] text-white text-xs font-semibold rounded-full"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

      </div>
    </section>
  );
};
