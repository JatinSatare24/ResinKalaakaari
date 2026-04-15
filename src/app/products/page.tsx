import ProductCard from '@/components/ProductCard/ProductCard'
// import { products } from '@/data/products'
import styles from '@/components/ProductCard/ProductCard.module.css'
import CategoriesFilter from '@/components/CategoryFilter/CategoryFilter'
import SearchBar from '@/components/SearchBar/SearchBar'
import SortDropdown from '@/components/SortDropdown/SortDropdown'
import Breadcrumb from '@/components/BreadCrumbNavigation/BreadCrumbNavigation'
import { client } from '@/lib/supabase'

export default async function ProductsPage({ searchParams }: {
    searchParams: Promise<{ category?: string; search: string; sort: string }>;
}) {

    const supabase = client()

    const params = await searchParams
    const filteredCategory = params?.category
    const searchQuery = params?.search?.trim()
    const sortQuery = params?.sort

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

    if (filteredCategory) {
        productsQuery = productsQuery.eq('categories.slug', filteredCategory);
    }

    if (searchQuery) {
        productsQuery = productsQuery.ilike(
            'name',
            `%${searchQuery}%`
        )
    }

    if (sortQuery === 'price_asc') {
        productsQuery = productsQuery.order('price', { ascending: true });
    } else if (sortQuery === 'price_desc') {
        productsQuery = productsQuery.order('price', { ascending: false });
    } else if (sortQuery === 'newest') {
        productsQuery = productsQuery.order('created_at', { ascending: false });
    }

    const [productRes, categoriesRes] = await Promise.all([
        productsQuery,
        supabase.from('categories').select('id, name, slug, displayOrder').order('displayOrder')
    ])

    const { data: fetchedProducts, error: productsError } = productRes
    const { data: categories, error: categoriesError } = categoriesRes

    const selectedCategory = categories?.find(
        (category) => category.slug === filteredCategory
    )

    if (productsError) {
        console.error('Error fetching products: ', productsError.message)
        return <p>Failed to load products!</p>
    }

    if (categoriesError) {
        console.error('Error fetching categories:', categoriesError.message);
        return <p>Failed to load categories!</p>
    }

    const products = fetchedProducts ?? []

    return (
        <main className={styles.productContainer}>
            <Breadcrumb
                categoryName={selectedCategory?.name}
                categorySlug={selectedCategory?.slug}
            />

            <div>
                <CategoriesFilter categories={categories} />
            </div>

            <SearchBar />

            <div className={styles.SortContainer}>
                <SortDropdown />
                <p className={styles.productCount}>{fetchedProducts?.length ?? 0} products</p>
            </div>

            <div className={styles.productGrid}>
                {products && products.length > 0
                    ? products?.map(product => (
                        <ProductCard key={product.id} product={product} />
                    )) : <div className={styles.noResultsContainer}><p className={styles.noResults}>No products matched🙁. Try a different keyword.</p></div>}
            </div>
        </main>
    );
}