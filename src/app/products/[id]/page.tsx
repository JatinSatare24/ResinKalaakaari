"use client"

import { products } from '@/data/products'
import { useContext } from 'react'
import { CartContext } from "@/context/CartContext"
import { useParams } from 'next/navigation'
import ProductDetail from '@/components/ProductDetails/ProductDetail'

type paramsProps = {
    params: {
        id: string
    }
}

export default function productDetail({ params }: paramsProps) {

    const { id } = useParams()

    const product = products.find(product => product.id === Number(id))

    const { addToCart } = useContext(CartContext)!

    if (!product) {
        return (
            <p>product not found!</p>
        )
    }
    return (
        <main>
            <ProductDetail addToCart={addToCart} product={product} />
        </main>

    )
}