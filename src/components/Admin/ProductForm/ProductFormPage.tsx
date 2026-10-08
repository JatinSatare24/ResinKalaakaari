// --- IMPORTS ---
import Link from "next/link";
import ProductForm, {
  type ProductFormProps,
} from "@/components/Admin/ProductForm/ProductForm";
import styles from "@/components/Admin/Products/Products.module.css";

// --- COMPONENT ---
// The heading and "back" link around the form, shared by Add and Edit.
export default function ProductFormPage(props: ProductFormProps) {
  const title = props.mode === "create" ? "Add product" : "Edit product";

  return (
    <section className={styles.wrapper} aria-labelledby="product-form-title">
      <Link href="/admin/products" className={styles.back}>
        ← All products
      </Link>
      <h1 id="product-form-title" className={styles.title}>
        {title}
      </h1>

      {props.categories.length === 0 ? (
        <p className={styles.empty}>
          There are no categories yet.{" "}
          <Link href="/admin/categories">Add a category first</Link>, then come
          back.
        </p>
      ) : (
        <ProductForm {...props} />
      )}
    </section>
  );
}
