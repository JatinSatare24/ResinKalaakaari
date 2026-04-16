import ProductCard from '@/components/ProductCard/ProductCard'
import styles from '@/components/ProductCard/ProductCard.module.css'
import CategoriesFilter from '@/components/CategoryFilter/CategoryFilter'
import SearchBar from '@/components/SearchBar/SearchBar'
import SortDropdown from '@/components/SortDropdown/SortDropdown'
import Breadcrumb from '@/components/BreadCrumbNavigation/BreadCrumbNavigation'
// 1. CHANGE THIS IMPORT to your server-side client creator
import { createServerSupabaseClient } from '@/lib/server'

export default async function ProductsPage({ searchParams }: {
    searchParams: Promise<{ category?: string; search?: string; sort?: string }>;
}) {
    // 2. Initialize the server-side client
    const supabase = await createServerSupabaseClient()

    const params = await searchParams
    const filteredCategory = params?.category
    const searchQuery = params?.search?.trim()
    const sortQuery = params?.sort

    // 3. Build the query
    let productsQuery = supabase
        .from('products')
        .select(`
            *,
            categories!inner (
                id,
                name,
                slug
            )
        `);

    // Handle filtering
    if (filteredCategory) {
        // Use the relationship name 'categories' followed by the column 'slug'
        productsQuery = productsQuery.eq('categories.slug', filteredCategory);
    }

    if (searchQuery) {
        productsQuery = productsQuery.ilike('name', `%${searchQuery}%`);
    }

    // Handle Sorting
    if (sortQuery === 'price_asc') {
        productsQuery = productsQuery.order('price', { ascending: true });
    } else if (sortQuery === 'price_desc') {
        productsQuery = productsQuery.order('price', { ascending: false });
    } else if (sortQuery === 'newest') {
        productsQuery = productsQuery.order('created_at', { ascending: false });
    }

    // 4. Fetch everything in parallel
    const [productRes, categoriesRes] = await Promise.all([
        productsQuery,
        supabase.from('categories').select('id, name, slug, displayOrder').order('displayOrder')
    ]);

    const { data: fetchedProducts, error: productsError } = productRes;
    const { data: categories, error: categoriesError } = categoriesRes;

    // Error handling...
    if (productsError || categoriesError) {
        console.error('Error:', productsError?.message || categoriesError?.message);
        return <p>Failed to load data!</p>;
    }

    const selectedCategory = categories?.find(c => c.slug === filteredCategory);
    const products = fetchedProducts ?? [];

    return (
        <main className={styles.productContainer}>
            <Breadcrumb
                categoryName={selectedCategory?.name}
                categorySlug={selectedCategory?.slug}
            />

            <CategoriesFilter categories={categories ?? []} />
            <SearchBar />

            <div className={styles.SortContainer}>
                <SortDropdown />
                <p className={styles.productCount}>{products.length} products</p>
            </div>

            <div className={styles.productGrid}>
                {products.length > 0 ? (
                    products.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))
                ) : (
                    <div className={styles.noResultsContainer}>
                        <p className={styles.noResults}>No products matched🙁. Try a different keyword.</p>
                    </div>
                )}
            </div>
        </main>
    );
}