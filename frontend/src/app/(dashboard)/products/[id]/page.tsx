"use client";

import { useParams } from "next/navigation";
import { useProducts } from "@/hooks/useProducts";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProductDetailPage() {
  const params = useParams();
  const productId = parseInt(params.id as string);
  const { products, loading, error } = useProducts();

  const product = products.find((p) => p.product_id === productId);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  if (!product) {
    return <div className="p-8">Product not found</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">{product.name}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <span className="font-semibold">SKU:</span> {product.sku}
            </div>
            <div>
              <span className="font-semibold">Type:</span> {product.product_type}
            </div>
            <div>
              <span className="font-semibold">Cost Price:</span> ${product.cost_price}
            </div>
            <div>
              <span className="font-semibold">Selling Price:</span> ${product.selling_price}
            </div>
            {product.description && (
              <div>
                <span className="font-semibold">Description:</span>
                <p>{product.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

