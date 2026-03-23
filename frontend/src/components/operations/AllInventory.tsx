"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import { 

  Package, Search, Filter, Download, MapPin, 

  TrendingUp, TrendingDown, AlertTriangle, Eye,

  Edit, Plus, BarChart3, Clock, DollarSign, FileText, FileSpreadsheet, ChevronDown, Trash2,
  Droplet, Calculator, AlertCircle, Info, Box, Minus, CheckCircle

} from 'lucide-react';

import { api } from "@/lib/api";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { useAuthStore } from "@/store/authStore";

interface LocationItem {
  location: string;
  qty: number;
}

const AllInventory = () => {
  const router = useRouter();
  const pathname = usePathname();

  const [viewMode, setViewMode] = useState('table'); // table, cards

  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  const [locationFilter, setLocationFilter] = useState('all');

  const [categoryFilter, setCategoryFilter] = useState('all');

  const [statusFilter, setStatusFilter] = useState('all');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAddInventory, setShowAddInventory] = useState(false);
  const [editingInventory, setEditingInventory] = useState<any | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { user } = useAuthStore();
  const companyId = user?.company_id;

  // Form state
  const [formData, setFormData] = useState({
    product_id: '',
    variant_id: '', // For packaged products
    category_id: '',
    unit_id: '',
    quantity: '',
    location_id: '',
    unit_cost: '',
    orderBy: 'packages',
    packages: 0,
    units: 0,
    referenceNumber: '',
    notes: '',
    totalValue: 0,
  });

  // Track selected product's type and variants
  const [selectedProductType, setSelectedProductType] = useState<'packaged' | 'bulk' | null>(null);
  const [selectedProductVariants, setSelectedProductVariants] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);

  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [allInventoryData, setAllInventoryData] = useState<any[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  // Load categories only once on mount (they don't change often)
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesResponse = await api.get<any[]>("/catalog/categories").catch(() => ({ data: [], error: null }));
        const fetchedCategories = categoriesResponse.data || [];
        setCategories(fetchedCategories);
        setCategoriesLoaded(true);
      } catch (err) {
        console.error('Error loading categories:', err);
        setCategories([]);
        setCategoriesLoaded(true);
      }
    };
    
    if (!categoriesLoaded) {
      loadCategories();
    }
  }, [categoriesLoaded]);

  // Load locations and units
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const locationsResponse = await api.get<any[]>("/inventory/locations").catch(() => ({ data: [], error: null }));
        const fetchedLocations = locationsResponse.data || [];
        setLocations(fetchedLocations);
      } catch (err) {
        console.error('Error loading locations:', err);
        setLocations([]);
      }
    };

    const loadUnits = async () => {
      try {
        const unitsResponse = await api.get<any[]>("/units").catch(() => ({ data: [], error: null }));
        const fetchedUnits = unitsResponse.data || [];
        setUnits(fetchedUnits);
      } catch (err) {
        console.error('Error loading units:', err);
        setUnits([]);
      }
    };
    
    loadLocations();
    loadUnits();
  }, []);

  // Load inventory data when location/search changes (not category/status - those are client-side filters)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadInventory();
    }, 150); // Reduced debounce for faster response

    return () => clearTimeout(timer);
  }, [locationFilter, searchTerm]); // Removed categoryFilter - filtering is done client-side

  // Initial load
  useEffect(() => {
    loadInventory();
  }, []); // Only on mount

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showExportMenu && !target.closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showExportMenu]);

  const loadInventory = async () => {

    setLoading(true);

    setError(null);

    try {
    const params: any = {};

    if (locationFilter !== 'all') {
      params.locationId = locationFilter;
    }

    if (categoryFilter !== 'all') {
      params.categoryId = categoryFilter;
    }

    if (searchTerm) {
      params.search = searchTerm;
    }

    console.log('Loading inventory with params:', params);

      // Fetch products, inventory data, and stock levels for location details
      const [productsResponse, inventoryResponse, stockLevelsResponse] = await Promise.all([
        api.get<any[]>("/catalog/products"),
        api.get<any[]>("/operations/inventory/all", params).catch(() => ({ data: [], error: null })),
        api.get<any[]>("/inventory/stock-levels", params).catch(() => ({ data: [], error: null })) // For location details
      ]);

      // Handle products response
      if (productsResponse.error) {
      // Handle 500 errors gracefully - don't show error for backend issues
        if (productsResponse.details?.status === 500) {
        setInventoryItems([]);
        setLoading(false);
        return;
      }
        setError(productsResponse.error);
      setLoading(false);
      return;
      }

      const products = productsResponse.data || [];
      const inventoryData = inventoryResponse.data || [];
      const stockLevels = stockLevelsResponse.data || [];
      
      // Log product variants for debugging
      const packagedProducts = products.filter((p: any) => p.product_type === 'packaged');
      console.log('Loaded inventory data:', {
        productsCount: products.length,
        packagedProductsCount: packagedProducts.length,
        packagedProductsWithVariants: packagedProducts.filter((p: any) => p.variants && p.variants.length > 0).length,
        inventoryDataCount: inventoryData.length,
        stockLevelsCount: stockLevels.length,
        sampleProduct: packagedProducts.length > 0 ? {
          id: packagedProducts[0].product_id,
          name: packagedProducts[0].name,
          type: packagedProducts[0].product_type,
          hasVariants: !!(packagedProducts[0].variants && packagedProducts[0].variants.length > 0),
          variantsCount: packagedProducts[0].variants?.length || 0
        } : null
      });
      
      // Store raw data for client-side filtering
      setAllProducts(products);
      setAllInventoryData(inventoryData);
      
      // Create a map of locations by product_id
      const locationsByProduct = new Map();
      stockLevels.forEach((sl: any) => {
        if (sl.product_id) {
          if (!locationsByProduct.has(sl.product_id)) {
            locationsByProduct.set(sl.product_id, []);
          }
          locationsByProduct.get(sl.product_id).push({
            location: sl.location_name || 'Unknown',
            qty: sl.quantity || 0
          });
        }
      });

      // Use categories from state (loaded separately)
      const categoryMap = new Map();
      categories.forEach((cat: any) => {
        categoryMap.set(cat.category_id, cat.name);
      });

      // Create a map of units for lookup
      const unitMap = new Map();
      units.forEach((unit: any) => {
        unitMap.set(unit.unit_id, unit);
      });

      // Create a map of inventory data by product_id for quick lookup
      const inventoryMap = new Map();
      inventoryData.forEach((item: any) => {
        const productId = item.product_id;
        if (productId) {
          if (!inventoryMap.has(productId)) {
            inventoryMap.set(productId, {
              total_quantity: 0,
              unit_name: item.unit_name || 'unit',
              unit_symbol: item.unit_name || 'unit',
              cost_price: item.cost_price || null,
              selling_price: item.selling_price || null,
              location_count: item.location_count || 0,
            });
          }
          // Sum up quantities if multiple inventory records exist for same product
          const current = inventoryMap.get(productId);
          current.total_quantity += (item.total_quantity || 0);
          // Use the first non-null cost/selling price found
          if (current.cost_price === null && item.cost_price) {
            current.cost_price = item.cost_price;
          }
          if (current.selling_price === null && item.selling_price) {
            current.selling_price = item.selling_price;
          }
        }
      });

      // Transform inventory data directly (operations endpoint already aggregates data from database)
      const transformed = inventoryData.map((item: any) => {
        const totalQty = item.total_quantity || 0;
        const unit = item.unit_name || 'unit';
        let costPrice = item.cost_price || 0;
        const sellingPrice = item.selling_price || costPrice || 0;
        const categoryName = item.category_name || 'Uncategorized';
        const locationCount = item.location_count || 0;
        
        // Get product details for reorder point
        const product = products.find((p: any) => p.product_id === item.product_id);
        const reorderPoint = product?.reorder_level || 0;
        
        // Try to get unit_cost from stock_levels if cost_price is 0
        // Check if we have stock levels for this product with unit_cost
        if (costPrice === 0 || !costPrice) {
          const productStockLevels = stockLevels.filter((sl: any) => sl.product_id === item.product_id);
          if (productStockLevels.length > 0) {
            // Use the first non-zero unit_cost found
            const stockLevelWithCost = productStockLevels.find((sl: any) => sl.unit_cost && sl.unit_cost > 0);
            if (stockLevelWithCost) {
              costPrice = stockLevelWithCost.unit_cost;
            }
          }
        }
        
        // Calculate status based on quantity and reorder point
        let status: string;
        if (totalQty === 0) {
          status = 'out_of_stock';
        } else if (totalQty > 0 && reorderPoint > 0 && totalQty <= reorderPoint) {
          status = 'low';
        } else {
          status = 'healthy';
        }

        // Calculate total value: quantity * cost price (or selling price as fallback)
        // Use selling_price if cost_price is 0 or not set
        const priceForValue = costPrice > 0 ? costPrice : (sellingPrice > 0 ? sellingPrice : 0);
        const totalValue = totalQty * priceForValue;

        // Get actual locations for this product
        const productLocations = locationsByProduct.get(item.product_id) || [];

        return {
          sku: item.sku || 'N/A',
          name: item.product_name || item.name || 'Unknown',
          category: categoryName,
          category_id: item.category_id, // Store category_id for filtering
          type: categoryName,
          totalQty: totalQty,
          unit: unit,
          unitPrice: sellingPrice || costPrice,
          totalValue: totalValue,
          locations: productLocations,
          reorderPoint: reorderPoint,
          status: status,
      lastMovement: 'N/A',
      turnover: 0,
          product_id: item.product_id,
          stock_level_id: item.stock_level_id || null,
          updated_at: item.created_at || null
        };
      });

      // Filter out items with 0 quantity before storing
      const itemsWithInventory = transformed.filter(item => {
        const qty = Number(item.totalQty) || 0;
        return qty > 0;
      });

      // Store all transformed items (client-side filtering in useMemo)
      console.log('Transformed inventory items:', {
        totalCount: transformed.length,
        withInventory: itemsWithInventory.length,
        items: itemsWithInventory
      });
      setInventoryItems(itemsWithInventory);
    setLoading(false);
      console.log('Inventory loading complete, items set:', itemsWithInventory.length);
    } catch (err) {
      console.error('Error loading inventory:', err);
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
      setLoading(false);
    }
  };



  // Memoize filtered items to avoid recalculating on every render
  const filteredItems = useMemo(() => {
    return inventoryItems.filter(item => {
      // Only show products that have inventory (quantity > 0)
      // This filters out products that exist but have no stock levels
      const qty = Number(item.totalQty) || 0;
      if (qty <= 0) {
        return false;
      }

      // Category filter (client-side)
      if (categoryFilter !== 'all') {
        if (String(item.category_id) !== String(categoryFilter)) {
          return false;
        }
      }

      // Search filter
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = item.name.toLowerCase().includes(term) ||
               item.sku.toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const statusMap: Record<string, string> = {
          'healthy': 'healthy',
          'Low Stock': 'low',
          'low': 'low',
          'Out of Stock': 'out_of_stock',
          'out_of_stock': 'out_of_stock',
          'Overstock': 'overstock',
          'overstock': 'overstock'
        };
        const expectedStatus = statusMap[statusFilter.toLowerCase()] || statusFilter.toLowerCase();
        if (item.status !== expectedStatus) return false;
    }

    return true;
  });
  }, [inventoryItems, categoryFilter, searchTerm, statusFilter]);






  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedItems(filteredItems.map(item => item.sku));
    } else {
      setSelectedItems([]);
    }
  };



  const handleSelectItem = (sku: string) => {

    if (selectedItems.includes(sku)) {

      setSelectedItems(selectedItems.filter(s => s !== sku));

    } else {

      setSelectedItems([...selectedItems, sku]);

    }

  };

  // Export inventory data to Excel
  const handleExportExcel = () => {
    const dataToExport = filteredItems.length > 0 ? filteredItems : inventoryItems;
    
    // Prepare data for Excel
    const headers = ['SKU', 'Product Name', 'Category', 'Type', 'Quantity', 'Unit', 'Unit Price', 'Total Value', 'Status'];
    const rows = dataToExport.map(item => [
      item.sku,
      item.name,
      item.category,
      item.type,
        item.totalQty,
      item.unit,
        item.unitPrice,
        item.totalValue,
      item.status
    ]);
    
    // Create CSV content (Excel can open CSV files)
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  // Export inventory data to PDF
  const handleExportPDF = () => {
    const dataToExport = filteredItems.length > 0 ? filteredItems : inventoryItems;
    
    // Create HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Inventory Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .header-info { margin-bottom: 20px; color: #666; }
          </style>
        </head>
        <body>
          <h1>Inventory Report</h1>
          <div class="header-info">
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Total Items:</strong> ${dataToExport.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Unit Price</th>
                <th>Total Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${dataToExport.map(item => `
                <tr>
                  <td>${item.sku}</td>
                  <td>${item.name}</td>
                  <td>${item.category}</td>
                  <td>${item.totalQty}</td>
                  <td>${item.unit}</td>
                  <td>RWF ${item.unitPrice.toLocaleString()}</td>
                  <td>RWF ${item.totalValue.toLocaleString()}</td>
                  <td>${item.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    // Open in new window and print to PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    }
    setShowExportMenu(false);
  };

  // Handle bulk edit action
  const handleBulkEdit = () => {
    if (selectedItems.length === 0) {
      alert('Please select at least one item to edit.');
      return;
    }

    // Get selected products
    const selectedProducts = inventoryItems.filter(item => 
      selectedItems.includes(item.sku)
    );

    // Check if we're in Manager Dashboard context
    const isManagerDashboard = pathname?.startsWith('/dashboard/manager');
    
    if (isManagerDashboard) {
      // Navigate to products section with bulk edit mode
      // Store selected items in sessionStorage for the products page to read
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('bulk-edit-skus', JSON.stringify(selectedItems));
      }
      router.push('/dashboard/manager?section=products&bulkEdit=true');
    } else {
      // Navigate to products page with bulk edit mode
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('bulk-edit-skus', JSON.stringify(selectedItems));
      }
      router.push('/products?bulkEdit=true');
    }
  };

  // Handle adjust stock action
  const handleAdjustStock = () => {
    if (selectedItems.length === 0) {
      alert('Please select at least one item to adjust stock.');
      return;
    }

    // Get selected products
    const selectedProducts = inventoryItems.filter(item => 
      selectedItems.includes(item.sku)
    );

    // Check if we're in Manager Dashboard context
    const isManagerDashboard = pathname?.startsWith('/dashboard/manager');
    
    if (isManagerDashboard) {
      // Navigate to stock adjustments section
      // Store selected items in sessionStorage for stock adjustments to read
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('adjust-stock-skus', JSON.stringify(selectedItems));
      }
      router.push('/dashboard/manager?section=stock-adjustments&create=true');
    } else {
      // Navigate to stock adjustments page
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('adjust-stock-skus', JSON.stringify(selectedItems));
      }
      router.push('/inventory/adjustments?create=true');
    }
  };

  // Handle edit inventory - populate form with item data
  const handleEditInventory = async (item: any) => {
    setFormError(null);
    
    // Find the product to get full details
    let product = allProducts.find((p: any) => p.product_id === item.product_id);
    
    // If product not found or if it's a packaged product, fetch full product details with variants
    if (!product || product.product_type === 'packaged') {
      try {
        const productResponse = await api.get(`/catalog/products/${item.product_id}`);
        if (productResponse.data) {
          product = productResponse.data;
        }
      } catch (err) {
        console.warn('Could not fetch full product details:', err);
      }
    }
    
    if (!product) {
      setFormError('Product not found');
      return;
    }

    // Set product type and variants
    const productType = product.product_type;
    setSelectedProductType(productType === 'packaged' ? 'packaged' : productType === 'bulk' ? 'bulk' : null);
    
    // Set selectedProduct state for the new form
    setSelectedProduct(product);
    
    if (productType === 'packaged' && product.variants && Array.isArray(product.variants)) {
      setSelectedProductVariants(product.variants);
    } else {
      setSelectedProductVariants([]);
    }

    // Fetch stock levels for this product to get stock_level_id
    try {
      const stockLevelsResponse = await api.get<any[]>(`/inventory/stock-levels?productId=${item.product_id}`);
      
      if (stockLevelsResponse.error) {
        setFormError(stockLevelsResponse.error);
        console.error('Error fetching stock levels:', stockLevelsResponse.error);
        return;
      }

      const stockLevels = stockLevelsResponse.data || [];
      console.log('Stock levels fetched:', stockLevels);
      
      // Use the stock level with the highest stock_level_id (most recent) or first one found
      const stockLevel = stockLevels.length > 0 
        ? stockLevels.reduce((latest, current) => 
            (current.stock_level_id > (latest?.stock_level_id || 0)) ? current : latest
          )
        : null;
      
      if (stockLevel) {
        // Use the actual stock level quantity, not the aggregated totalQty
        const actualQuantity = parseFloat(stockLevel.quantity_in_stock || stockLevel.quantity) || 0;
        const unitCost = parseFloat(stockLevel.average_cost || stockLevel.unit_cost || 0);
        const totalValue = parseFloat(stockLevel.total_value || 0);
        
        console.log('📦 Stock level data:', {
          stock_level_id: stockLevel.stock_level_id,
          variant_id: stockLevel.variant_id,
          actualQuantity,
          unitCost,
          totalValue,
          itemTotalQty: item.totalQty,
          stockLevelQuantity: stockLevel.quantity_in_stock || stockLevel.quantity,
          allStockLevels: stockLevels.map((sl: any) => ({
            id: sl.stock_level_id,
            variant_id: sl.variant_id,
            qty: sl.quantity_in_stock || sl.quantity,
            loc: sl.location_id
          }))
        });
        
        // Set selected variant if it exists
        let selectedVariantData = null;
        if (productType === 'packaged' && stockLevel.variant_id && product.variants) {
          selectedVariantData = product.variants.find((v: any) => v.variant_id === stockLevel.variant_id);
          if (selectedVariantData) {
            setSelectedVariant(selectedVariantData);
          }
        }
        
        // Calculate packages and units for packaged products
        let packages = 0;
        let units = 0;
        if (productType === 'packaged' && selectedVariantData && selectedVariantData.units_per_package) {
          const unitsPerPackage = selectedVariantData.units_per_package || 1;
          packages = Math.floor(actualQuantity / unitsPerPackage);
          units = actualQuantity;
        }
        
        setEditingInventory({ 
          ...item, 
          stock_level_id: stockLevel.stock_level_id,
          variant_id: stockLevel.variant_id || null,
          currentQuantity: actualQuantity,
          location_id: stockLevel.location_id
        });
        
        // Calculate unit cost from total_value or use existing
        const calculatedUnitCost = unitCost > 0 
          ? unitCost 
          : (totalValue > 0 && actualQuantity > 0 
              ? totalValue / actualQuantity 
              : (product.cost_price || product.selling_price || 0));
        
        // For packaged products, determine unit from variant if variant_id exists
        let unitId = product.unit_id;
        if (productType === 'packaged' && stockLevel.variant_id && product.variants) {
          const variant = product.variants.find((v: any) => v.variant_id === stockLevel.variant_id);
          if (variant && variant.base_unit) {
            // Try to find unit by base_unit
            const unit = units.find((u: any) => u.short_code?.toLowerCase() === variant.base_unit?.toLowerCase());
            if (unit) {
              unitId = unit.unit_id;
            }
          }
        }
        
        // Set form data with all fields including new form structure
        setFormData({
          product_id: String(item.product_id),
          variant_id: stockLevel.variant_id ? String(stockLevel.variant_id) : '',
          category_id: product.category_id ? String(product.category_id) : '',
          unit_id: unitId ? String(unitId) : '',
          quantity: actualQuantity, // Use actual stock level quantity
          location_id: stockLevel.location_id ? String(stockLevel.location_id) : '',
          unit_cost: calculatedUnitCost,
          orderBy: productType === 'packaged' ? 'packages' : 'packages',
          packages: packages,
          units: units,
          referenceNumber: '',
          notes: '',
          totalValue: totalValue > 0 ? totalValue : (actualQuantity * calculatedUnitCost),
        });
        setShowAddInventory(true);
        // Scroll to form
        setTimeout(() => {
          const formElement = document.querySelector('.min-h-screen.bg-gray-50');
          if (formElement) {
            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else {
        setFormError('Stock level not found for this product. You may need to add inventory first.');
        console.warn('No stock level found for product:', item.product_id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load inventory details';
      setFormError(errorMessage);
      console.error('Error in handleEditInventory:', err);
    }
  };

  // Handle delete inventory
  const handleDeleteInventory = async (item: any) => {
    if (!confirm(`Are you sure you want to delete inventory for ${item.name}? This will set the quantity to 0.`)) {
      return;
    }

    setFormError(null);
    setLoading(true);

    try {
      if (!companyId) {
        setFormError('Company ID is required');
        setLoading(false);
        return;
      }

      // Fetch stock levels for this product to get stock_level_id
      const stockLevelsResponse = await api.get<any[]>(`/inventory/stock-levels?productId=${item.product_id}`);
      
      if (stockLevelsResponse.error) {
        setFormError(stockLevelsResponse.error);
        setLoading(false);
        console.error('Error fetching stock levels:', stockLevelsResponse.error);
        return;
      }

      const stockLevels = stockLevelsResponse.data || [];
      console.log('Stock levels for delete:', stockLevels);
      
      if (stockLevels.length === 0) {
        // If no stock level exists, the product has no inventory, so it's already "deleted"
        console.log('No stock level found - product has no inventory');
        await loadInventory(); // Reload to refresh the list
        setLoading(false);
        return;
      }

      // Delete all stock levels for this product by setting quantity to 0
      let hasError = false;
      for (const stockLevel of stockLevels) {
        const currentQty = Number(stockLevel.quantity) || 0;
        
        if (currentQty > 0) {
          console.log('Deleting stock level:', stockLevel.stock_level_id, 'Current qty:', currentQty);
          
          const response = await api.post(`/inventory/stock-levels/${stockLevel.stock_level_id}/adjust`, {
            company_id: companyId,
            product_id: item.product_id,
            location_id: stockLevel.location_id,
            adjustment_type: 'decrease',
            quantity: currentQty,
            reason_code: 'deletion',
            remarks: 'Inventory deleted via UI',
          });

          if (response.error) {
            console.error('Error deleting stock level:', stockLevel.stock_level_id, response.error);
            hasError = true;
            // Continue with other stock levels even if one fails
          } else {
            console.log('Stock level deleted successfully:', stockLevel.stock_level_id);
          }
        } else {
          console.log('Stock level already at 0:', stockLevel.stock_level_id);
        }
      }
      
      if (hasError) {
        setFormError('Some stock levels could not be deleted. Please try again.');
        setLoading(false);
        return;
      }
      
      console.log('All stock levels processed for deletion');

      await loadInventory();
      setLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete inventory';
      setFormError(errorMessage);
      setLoading(false);
      console.error('Error in handleDeleteInventory:', err);
    }
  };

  // Handle add inventory form submission
  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    if (!companyId) {
      setFormError('Company ID is required');
      setIsSubmitting(false);
      return;
    }

    // Determine the actual quantity based on product type
    let actualQuantity = 0;
    if (selectedProductType === 'packaged' && selectedVariant) {
      // For packaged products, use units (which is calculated from packages)
      actualQuantity = Number(formData.units) || Number(formData.quantity) || 0;
    } else {
      // For bulk products, use quantity directly
      actualQuantity = Number(formData.quantity) || 0;
    }

    // Validate required fields
    if (!formData.product_id || !formData.location_id || actualQuantity === 0) {
      setFormError('Please fill in all required fields (Product, Location, and Quantity)');
      setIsSubmitting(false);
      return;
    }

    // For packaged products, variant_id is required
    if (selectedProductType === 'packaged' && !formData.variant_id) {
      setFormError('Please select a variant for this packaged product');
      setIsSubmitting(false);
      return;
    }

    try {
      if (editingInventory && editingInventory.stock_level_id) {
        // Update existing stock level using PUT endpoint with all fields at once
        const updatePayload: any = {
          quantity_in_stock: actualQuantity,
        };

        // Add location if changed
        if (formData.location_id && Number(formData.location_id) !== editingInventory.location_id) {
          updatePayload.location_id = Number(formData.location_id);
        }

        // Add unit_cost if provided
        if (formData.unit_cost && formData.unit_cost !== '' && formData.unit_cost !== 0) {
          const unitCost = parseFloat(String(formData.unit_cost));
          if (!isNaN(unitCost) && unitCost >= 0) {
            updatePayload.unit_cost = unitCost;
          }
        }

        // Add safety_stock if needed (can be added later if form supports it)
        
        console.log('📝 Updating stock level:', {
          stock_level_id: editingInventory.stock_level_id,
          payload: updatePayload
        });

        const updateResponse = await api.put(`/inventory/stock-levels/${editingInventory.stock_level_id}`, updatePayload);

        if (updateResponse.error) {
          console.error('❌ Update error:', updateResponse.error);
          setFormError(updateResponse.error);
          setIsSubmitting(false);
          return;
        }

        console.log('✅ Stock level updated successfully:', updateResponse.data);
        
        // Optionally update product cost_price if unit_cost was provided
        if (formData.unit_cost && formData.unit_cost !== '' && formData.unit_cost !== 0) {
          const unitCost = parseFloat(String(formData.unit_cost));
          if (!isNaN(unitCost) && unitCost > 0) {
            try {
              const product = allProducts.find((p: any) => p.product_id === Number(editingInventory.product_id));
              if (product && (!product.cost_price || product.cost_price === 0)) {
                await api.put(`/catalog/products/${editingInventory.product_id}`, {
                  cost_price: unitCost
                });
                console.log('✅ Product cost_price updated to:', unitCost);
              }
            } catch (updateError) {
              console.warn('⚠️ Error updating product cost_price:', updateError);
              // Don't fail the whole operation if this fails
            }
          }
        }


        // Success - reload and close
        console.log('🔄 Reloading inventory after update...');
        
        // Add a small delay to ensure backend transaction is committed
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await loadInventory();
        console.log('✅ Inventory reloaded');
        
        // Clear form and close
        setFormData({
          product_id: '',
          variant_id: '',
          category_id: '',
          unit_id: '',
          quantity: 0,
          location_id: '',
          unit_cost: 0,
          orderBy: 'packages',
          packages: 0,
          units: 0,
          referenceNumber: '',
          notes: '',
          totalValue: 0,
        });
        setSelectedProduct(null);
        setSelectedVariant(null);
        setEditingInventory(null);
        setShowAddInventory(false);
        setIsSubmitting(false);
        
        // Show success message
        console.log('✅ Inventory updated successfully');
      } else {
        // Create new stock level
        const quantity = parseFloat(formData.quantity) || 0;
        if (quantity <= 0) {
          setFormError('Quantity must be greater than 0');
          setIsSubmitting(false);
          return;
        }
        
        // Calculate unit_cost and total_value if provided
        const unitCost = formData.unit_cost ? parseFloat(formData.unit_cost) : null;
        const totalValue = unitCost && quantity > 0 ? unitCost * quantity : null;
        
        const payload: any = {
          product_id: Number(formData.product_id),
          location_id: Number(formData.location_id),
          quantity: quantity,
          unit_cost: unitCost, // Include unit_cost in creation
        };

        // For packaged products, include variant_id
        if (selectedProductType === 'packaged' && formData.variant_id) {
          payload.variant_id = Number(formData.variant_id);
        }
        
        console.log('📦 Creating stock level with unit_cost:', {
          unit_cost: unitCost,
          total_value: totalValue,
          quantity: quantity
        });

        console.log('Creating new stock level with payload:', payload);
        const response = await api.post('/inventory/stock-levels', payload);

        if (response.error) {
          // If stock level already exists (409), try to update it instead
          if (response.details?.status === 409 || response.error.includes('already exists')) {
            console.log('Stock level already exists, attempting to update...');
            
            const productIdForSearch = Number(formData.product_id);
            const locationIdForSearch = Number(formData.location_id);
            
            if (!productIdForSearch || !locationIdForSearch) {
              setFormError('Product and Location must be selected from the form');
              setIsSubmitting(false);
              return;
            }
            
            const existingStockLevels = await api.get<any[]>(`/inventory/stock-levels?productId=${productIdForSearch}`);
            
            if (existingStockLevels.data && existingStockLevels.data.length > 0) {
              const existingStockLevel = existingStockLevels.data.find(
                (sl: any) => sl.location_id === locationIdForSearch
              );

              console.log('Found existing stock level:', existingStockLevel);
              
              if (existingStockLevel) {
                if (!existingStockLevel.stock_level_id) {
                  console.error('Stock level found but missing stock_level_id:', existingStockLevel);
                  setFormError('Stock level ID not found in response. Please try editing the existing entry instead.');
                  setIsSubmitting(false);
                  return;
                }
                const currentQty = Number(existingStockLevel.quantity) || 0;
                const newQty = Number(formData.quantity) || 0;
                
                console.log('Quantity comparison:', { currentQty, newQty });
                
                if (newQty === currentQty) {
                  console.log('Quantities are the same, no adjustment needed');
                  setFormError(`The quantity for this product at this location is already ${currentQty}. No change needed.`);
                  setIsSubmitting(false);
                  return;
                }
                
                const adjustmentType = newQty > currentQty ? 'increase' : 'decrease';
                const adjustmentQty = Math.abs(newQty - currentQty);
                console.log('Adjusting stock level:', {
                  stock_level_id: existingStockLevel.stock_level_id,
                  adjustmentType,
                  adjustmentQty,
                  currentQty,
                  newQty
                });
                
                // Validate adjustmentQty
                if (adjustmentQty <= 0) {
                  setFormError(`The quantity for this product at this location is already ${currentQty}. No change needed.`);
                  setIsSubmitting(false);
                  return;
                }
                
                // If unit_cost was provided, update product's cost_price
                if (formData.unit_cost && formData.unit_cost !== '') {
                  const unitCost = parseFloat(formData.unit_cost) || 0;
                  if (unitCost > 0) {
                    console.log('💰 Using unit cost:', { unitCost, quantity: Number(formData.quantity) });
                    
                    // Update product's cost_price if not set or if it's 0
                    try {
                      const product = allProducts.find((p: any) => p.product_id === productIdForSearch);
                      if (product && (!product.cost_price || product.cost_price === 0)) {
                        console.log('📝 Updating product cost_price to:', unitCost);
                        await api.put(`/catalog/products/${productIdForSearch}`, {
                          cost_price: unitCost
                        });
                        console.log('✅ Product cost_price updated');
                      }
                    } catch (updateError) {
                      console.warn('⚠️ Could not update product cost_price:', updateError);
                      // Don't fail the whole operation if this fails
                    }
                  }
                }
                
                const unitCost = formData.unit_cost ? parseFloat(formData.unit_cost) : null;
                
                const adjustResponse = await api.post(
                  `/inventory/stock-levels/${existingStockLevel.stock_level_id}/adjust`,
                  {
                    product_id: productIdForSearch,
                    location_id: locationIdForSearch,
                    adjustment_type: adjustmentType,
                    quantity: Number(adjustmentQty), // Ensure it's a number
                    unit_cost: unitCost, // Send unit_cost to update stock_level
                    reason_code: 'manual_adjustment',
                    remarks: 'Updated via inventory form (conflict resolution)',
                  }
                );
                console.log('Adjust response:', adjustResponse);
                
                // Check for error in response
                if (adjustResponse.error) {
                  console.error('Adjust error:', adjustResponse.error);
                  setFormError(adjustResponse.error);
                  setIsSubmitting(false);
                  return;
                }

                // Success - reload and close
                console.log('Stock level adjusted successfully, reloading inventory...');
                try {
                  await loadInventory();
                  console.log('Inventory reloaded successfully');
                } catch (loadError) {
                  console.error('Error reloading inventory:', loadError);
                  // Still close the form even if reload fails
                }
                
                // Reset form and close
                setFormData({
                  product_id: '',
                  variant_id: '',
                  category_id: '',
                  unit_id: '',
                  quantity: '',
                  location_id: '',
                  unit_cost: '',
                });
                setEditingInventory(null);
                setShowAddInventory(false);
                setIsSubmitting(false);
                console.log('Form closed and reset');
                return;
              } else {
                setFormError('Stock level exists but location mismatch. Please edit the existing entry.');
                setIsSubmitting(false);
                return;
              }
            } else {
              setFormError('Stock level already exists but could not be found. Please try editing instead.');
              setIsSubmitting(false);
              return;
            }
          } else {
            // Other error
            setFormError(response.error);
            setIsSubmitting(false);
            return;
          }
        }

        // SUCCESS - New stock level created
        console.log('✅ New stock level created successfully:', response.data);
        
        // If value was provided, update product's cost_price
        if (formData.unit_cost && formData.unit_cost !== '') {
          const unitCost = Number(formData.unit_cost);
          if (unitCost > 0) {
            console.log('💰 Using unit cost:', { unitCost, quantity: Number(formData.quantity) });
            
            // Update product's cost_price if not set
            try {
              const product = allProducts.find((p: any) => p.product_id === Number(formData.product_id));
              if (product && (!product.cost_price || product.cost_price === 0)) {
                console.log('📝 Updating product cost_price to:', unitCost);
                await api.put(`/catalog/products/${formData.product_id}`, {
                  cost_price: unitCost
                });
                console.log('✅ Product cost_price updated');
              }
            } catch (updateError) {
              console.warn('⚠️ Could not update product cost_price:', updateError);
              // Don't fail the whole operation if this fails
            }
          }
        }
        
        // Small delay to ensure database transaction is committed
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Reload inventory to show the new item
        console.log('🔄 Reloading inventory data...');
        try {
          await loadInventory();
          console.log('✅ Inventory reloaded successfully');
          
          // Wait a bit more to ensure state is updated
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (loadError) {
          console.error('❌ Error reloading inventory:', loadError);
          setFormError('Inventory created but failed to refresh. Please refresh the page.');
          setIsSubmitting(false);
          return; // Don't close form if reload fails
        }
        
        // Reset form and close
        console.log('🔄 Resetting form and closing...');
        setFormData({
          product_id: '',
          variant_id: '',
          category_id: '',
          unit_id: '',
          quantity: '',
          location_id: '',
          unit_cost: '',
        });
        setEditingInventory(null);
        setShowAddInventory(false);
        setIsSubmitting(false);
        setFormError(null); // Clear any previous errors
        console.log('✅ Form closed successfully');
      }
    } catch (err) {
      console.error('Error in handleAddInventory:', err);
      setFormError(err instanceof Error ? err.message : 'Failed to save inventory');
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetInventoryForm = () => {
    setFormData({
      product_id: '',
      variant_id: '',
      category_id: '',
      unit_id: '',
      quantity: '',
      location_id: '',
      unit_cost: '',
      orderBy: 'packages',
      packages: 0,
      units: 0,
      referenceNumber: '',
      notes: '',
      totalValue: 0,
    });
    setSelectedProductType(null);
    setSelectedProductVariants([]);
    setSelectedProduct(null);
    setSelectedVariant(null);
    setEditingInventory(null);
    setFormError(null);
    setShowAddInventory(false);
  };

  // Handle product change for new form
  const handleProductChange = (productId: string) => {
    const product = allProducts.find((p: any) => p.product_id === parseInt(productId));
    setSelectedProduct(product || null);
    setSelectedVariant(null);
    const productType = product?.product_type;
    setSelectedProductType(productType === 'packaged' ? 'packaged' : productType === 'bulk' ? 'bulk' : null);
    
    // Load variants if packaged
    if (productType === 'packaged' && product) {
      if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
        setSelectedProductVariants(product.variants);
      } else {
        // Fetch variants if not loaded
        api.get(`/catalog/products/${product.product_id}`).then((response) => {
          if (response.data?.variants) {
            setSelectedProductVariants(response.data.variants || []);
            // Update product in allProducts with variants
            const updatedProducts = allProducts.map((p: any) => 
              p.product_id === product.product_id 
                ? { ...p, variants: response.data.variants }
                : p
            );
            setAllProducts(updatedProducts);
          }
        }).catch(() => {
          setSelectedProductVariants([]);
        });
      }
    } else {
      setSelectedProductVariants([]);
    }
    
    setFormData({
      ...formData,
      product_id: productId,
      variant_id: '',
      packages: 0,
      units: 0,
      quantity: 0,
      unit_cost: product?.cost_price || product?.selling_price || 0,
      totalValue: 0,
    });
  };

  // Handle variant change for new form
  const handleVariantChange = (variantId: string) => {
    const variant = selectedProduct?.variants?.find((v: any) => v.variant_id === parseInt(variantId));
    setSelectedVariant(variant || null);
    setFormData({
      ...formData,
      variant_id: variantId,
      packages: 0,
      units: 0,
      unit_cost: variant?.cost_price || variant?.unit_price || selectedProduct?.cost_price || selectedProduct?.selling_price || 0,
      totalValue: 0,
      orderBy: 'packages',
    });
  };

  // Calculate totals for new form
  const calculateTotals = (field: string, value: any) => {
    const updated = { ...formData, [field]: value };

    if (selectedProduct?.product_type === 'packaged' && selectedVariant) {
      const unitsPerPackage = selectedVariant.units_per_package || 1;
      if (updated.orderBy === 'packages') {
        updated.units = updated.packages * unitsPerPackage;
        updated.totalValue = updated.units * (Number(updated.unit_cost) || 0);
        updated.quantity = updated.units;
      } else {
        updated.packages = Math.ceil(updated.units / unitsPerPackage);
        updated.totalValue = updated.units * (Number(updated.unit_cost) || 0);
        updated.quantity = updated.units;
      }
    } else if (selectedProduct?.product_type === 'bulk') {
      updated.totalValue = (Number(updated.quantity) || 0) * (Number(updated.unit_cost) || 0);
    }

    setFormData(updated);
  };

  // Wrapper for form submission from button click
  const handleFormSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    const syntheticEvent = {
      preventDefault: () => {},
    } as React.FormEvent;
    await handleAddInventory(syntheticEvent);
  };

  // Auto-fill category, unit, and handle variants when product is selected
  useEffect(() => {
    const loadProductVariants = async () => {
      if (formData.product_id && allProducts.length > 0) {
        const selectedProduct = allProducts.find((p: any) => p.product_id === Number(formData.product_id));
        if (selectedProduct) {
          const productType = selectedProduct.product_type;
          setSelectedProductType(productType === 'packaged' ? 'packaged' : productType === 'bulk' ? 'bulk' : null);
          
          // For packaged products, load variants
          if (productType === 'packaged') {
            // Check if variants are already loaded
            if (selectedProduct.variants && Array.isArray(selectedProduct.variants) && selectedProduct.variants.length > 0) {
              console.log('✅ Variants already loaded for product:', selectedProduct.name, 'Variants:', selectedProduct.variants);
              setSelectedProductVariants(selectedProduct.variants);
            } else {
              // Fetch full product details with variants
              console.log('⚠️ Variants not found, fetching full product details...');
              try {
                const productResponse = await api.get(`/catalog/products/${selectedProduct.product_id}`);
                if (productResponse.data && productResponse.data.variants) {
                  console.log('✅ Fetched product with variants:', productResponse.data.variants);
                  setSelectedProductVariants(productResponse.data.variants || []);
                  // Update the product in allProducts array
                  const updatedProducts = allProducts.map((p: any) => 
                    p.product_id === selectedProduct.product_id 
                      ? { ...p, variants: productResponse.data.variants }
                      : p
                  );
                  setAllProducts(updatedProducts);
                } else {
                  console.warn('⚠️ Product fetched but no variants found');
                  setSelectedProductVariants([]);
                }
              } catch (err) {
                console.error('❌ Error fetching product variants:', err);
                setSelectedProductVariants([]);
              }
            }
            
            // Reset variant_id when product changes
            setFormData(prev => ({
              ...prev,
              variant_id: '',
              category_id: selectedProduct.category_id ? String(selectedProduct.category_id) : prev.category_id,
              unit_id: selectedProduct.unit_id ? String(selectedProduct.unit_id) : prev.unit_id,
            }));
          } else {
            // For bulk products, no variants
            setSelectedProductVariants([]);
            setFormData(prev => ({
              ...prev,
              variant_id: '',
              category_id: selectedProduct.category_id ? String(selectedProduct.category_id) : prev.category_id,
              unit_id: selectedProduct.unit_id ? String(selectedProduct.unit_id) : prev.unit_id,
            }));
          }
        }
      } else {
        setSelectedProductType(null);
        setSelectedProductVariants([]);
      }
    };

    loadProductVariants();
  }, [formData.product_id, allProducts]);

  // Handle single item adjust stock (from card view)
  const handleSingleItemAdjustStock = (sku: string) => {
    // Set this item as selected and navigate
    setSelectedItems([sku]);
    
    // Check if we're in Manager Dashboard context
    const isManagerDashboard = pathname?.startsWith('/dashboard/manager');
    
    if (isManagerDashboard) {
      // Navigate to stock adjustments section
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('adjust-stock-skus', JSON.stringify([sku]));
      }
      router.push('/dashboard/manager?section=stock-adjustments&create=true');
    } else {
      // Navigate to stock adjustments page
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('adjust-stock-skus', JSON.stringify([sku]));
      }
      router.push('/inventory/adjustments?create=true');
    }
  };

  const getStatusBadge = (status: string) => {

    const badges: Record<string, { color: string; label: string }> = {

      healthy: { color: 'green', label: '✓ Healthy' },

      low: { color: 'yellow', label: '⚠ Low Stock' },

      out_of_stock: { color: 'red', label: '✗ Out of Stock' },

      overstock: { color: 'orange', label: '📦 Overstock' }

    };

    const badge = badges[status] || badges.healthy;

    return (

      <span className={`px-2 py-1 text-xs font-medium rounded ${
        status === 'healthy' ? 'bg-green-100 text-green-700' :
        status === 'low' ? 'bg-yellow-100 text-yellow-700' :
        status === 'out_of_stock' ? 'bg-red-100 text-red-700' :
        'bg-orange-100 text-orange-700'
      }`}>

        {badge.label}

      </span>

    );

  };



  const summaryCards = [
    {
      label: 'Total SKUs',
      value: inventoryItems.length,
      subtext: `${inventoryItems.filter(i => i.totalQty > 0).length} in stock`,
      icon: Package,
      color: 'blue'
    },
    {
      label: 'Total Value',
      value: `RWF ${inventoryItems.reduce((sum, item) => sum + item.totalValue, 0).toLocaleString()}`,
      subtext: 'Current inventory value',
      icon: DollarSign,
      color: 'green'
    },
    {
      label: 'Low Stock Items',
      value: inventoryItems.filter(i => i.status === 'low').length,
      subtext: 'Need reordering',
      icon: AlertTriangle,
      color: 'yellow'
    },
    {
      label: 'Out of Stock',
      value: inventoryItems.filter(i => i.status === 'out_of_stock').length,
      subtext: 'Critical attention',
      icon: TrendingDown,
      color: 'red'
    }
  ];

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <ErrorMessage error={error} />
      </div>
    );
  }



  return (
    <div className="h-screen flex flex-col bg-gray-50">

      {/* Header */}

      <div className="bg-white border-b border-gray-200 px-6 py-4">

        <div className="flex items-center justify-between mb-4 print:hidden">

          <div>

            <h1 className="text-2xl font-bold text-gray-900">All Inventory</h1>

            <p className="text-sm text-gray-500">Complete inventory overview across all locations</p>

          </div>

          <div className="flex gap-3 relative">

            <div className="relative export-menu-container">
            <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              Export
                <ChevronDown className="w-4 h-4" />
            </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
            <button 
                    onClick={handleExportPDF}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <FileText className="w-4 h-4 text-red-600" />
                    <span>Export as PDF</span>
            </button>
                  <button
                    onClick={handleExportExcel}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    <span>Export as Excel</span>
                  </button>
                </div>
              )}
            </div>

            <button 
              type="button"
              onClick={() => setShowAddInventory(!showAddInventory)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              {showAddInventory ? 'Cancel' : 'Add Inventory'}
            </button>

          </div>

        </div>

        {/* Error Message Display */}
        {formError && !showAddInventory && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {formError}
            <button 
              onClick={() => setFormError(null)}
              className="ml-2 text-red-700 hover:text-red-900 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Add/Edit Inventory Form */}
        {showAddInventory && (
          <div className="min-h-screen bg-gray-50 p-6 mb-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Add Inventory</h1>
                <p className="text-gray-600 mb-6">Add stock to your inventory locations</p>

                {formError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {formError}
                    <button 
                      onClick={() => setFormError(null)}
                      className="ml-2 text-red-700 hover:text-red-900 font-bold"
                    >
                      ×
                    </button>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="border-2 border-gray-300 rounded-lg p-5 bg-gray-50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                      <h3 className="text-lg font-bold text-gray-900">Select Product</h3>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Product *</label>
                      <select
                        value={formData.product_id}
                        onChange={(e) => handleProductChange(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 text-base"
                      >
                        <option value="">Select a product...</option>
                        {allProducts.map((p: any) => (
                          <option key={p.product_id} value={p.product_id}>
                            {p.sku || 'N/A'} - {p.name} ({p.product_type === 'packaged' ? '📦 Packaged' : '📏 Bulk'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedProduct && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm text-blue-900">
                          <strong>Category:</strong> {selectedProduct.category_name || 'N/A'} • 
                          <strong className="ml-2">Type:</strong> {selectedProduct.product_type === 'packaged' ? '📦 Packaged Product' : '📏 Bulk Product'}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedProduct?.product_type === 'packaged' && (
                    <div className="border-2 border-blue-300 rounded-lg p-5 bg-blue-50">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                        <h3 className="text-lg font-bold text-gray-900">Select Size/Variant</h3>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Variant *</label>
                        <select
                          value={formData.variant_id}
                          onChange={(e) => handleVariantChange(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:border-blue-500 text-base"
                        >
                          <option value="">Select a size/variant...</option>
                          {selectedProductVariants.map((v: any) => (
                            <option key={v.variant_id} value={v.variant_id}>
                              {v.variant_name || v.name} - {v.size} {v.size_unit || v.sizeUnit} ({v.variant_sku || v.sku})
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedVariant && (
                        <div className="mt-3 p-4 bg-white border-2 border-blue-300 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-2">Variant Details</h4>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-gray-600">SKU</p>
                              <p className="font-mono font-semibold">{selectedVariant.variant_sku || selectedVariant.sku}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Size</p>
                              <p className="font-semibold">{selectedVariant.size} {selectedVariant.size_unit || selectedVariant.sizeUnit}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Base Unit</p>
                              <p className="font-semibold">{selectedVariant.base_unit || 'unit'}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Package Unit</p>
                              <p className="font-semibold">{selectedVariant.package_unit || selectedVariant.packageUnit} ({selectedVariant.units_per_package || selectedVariant.unitsPerPackage || 1} {selectedVariant.base_unit || 'unit'}s)</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Cost Price</p>
                              <p className="font-semibold">RWF {(selectedVariant.cost_price || selectedVariant.unit_price || selectedProduct?.cost_price || 0).toLocaleString()}/{selectedVariant.base_unit || 'unit'}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Selling Price</p>
                              <p className="font-semibold">RWF {(selectedVariant.unit_price || selectedVariant.selling_price || selectedProduct?.selling_price || 0).toLocaleString()}/{selectedVariant.base_unit || 'unit'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {((selectedProduct?.product_type === 'packaged' && selectedVariant) || selectedProduct?.product_type === 'bulk') && (
                    <div className="border-2 border-green-300 rounded-lg p-5 bg-green-50">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                          {selectedProduct?.product_type === 'packaged' ? '3' : '2'}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Enter Quantity</h3>
                      </div>

                      {selectedProduct?.product_type === 'packaged' && selectedVariant && (
                        <>
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({...formData, orderBy: 'packages'});
                                calculateTotals('orderBy', 'packages');
                              }}
                              className={`p-4 rounded-lg border-2 transition-all ${
                                formData.orderBy === 'packages'
                                  ? 'border-green-600 bg-white'
                                  : 'border-gray-300 bg-white hover:border-green-400'
                              }`}
                            >
                              <Box className="w-6 h-6 mx-auto mb-2 text-green-600" />
                              <p className="font-semibold text-sm">Enter by {selectedVariant.package_unit || 'packages'}s</p>
                              <p className="text-xs text-gray-600 mt-1">Receiving full {selectedVariant.package_unit || 'packages'}s</p>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setFormData({...formData, orderBy: 'units'});
                                calculateTotals('orderBy', 'units');
                              }}
                              className={`p-4 rounded-lg border-2 transition-all ${
                                formData.orderBy === 'units'
                                  ? 'border-green-600 bg-white'
                                  : 'border-gray-300 bg-white hover:border-green-400'
                              }`}
                            >
                              <Package className="w-6 h-6 mx-auto mb-2 text-green-600" />
                              <p className="font-semibold text-sm">Enter by {selectedVariant.base_unit || 'units'}s</p>
                              <p className="text-xs text-gray-600 mt-1">Precise unit count</p>
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            {formData.orderBy === 'packages' ? (
                              <>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                                    Number of {selectedVariant.package_unit || 'packages'}s *
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => calculateTotals('packages', Math.max(0, formData.packages - 1))}
                                      className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                                    >
                                      <Minus className="w-5 h-5" />
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      value={formData.packages}
                                      onChange={(e) => calculateTotals('packages', parseInt(e.target.value) || 0)}
                                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl font-bold focus:border-green-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => calculateTotals('packages', formData.packages + 1)}
                                      className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                                    >
                                      <Plus className="w-5 h-5" />
                                    </button>
                                  </div>
                                </div>
                                <div className="bg-white rounded-lg p-4 border-2 border-green-300">
                                  <p className="text-sm text-gray-600 mb-1">This equals</p>
                                  <p className="text-3xl font-bold text-green-600">{formData.units}</p>
                                  <p className="text-sm text-gray-600 mt-1">{selectedVariant.base_unit || 'units'}s</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                                    Number of {selectedVariant.base_unit || 'units'}s *
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => calculateTotals('units', Math.max(0, formData.units - 1))}
                                      className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                                    >
                                      <Minus className="w-5 h-5" />
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      value={formData.units}
                                      onChange={(e) => calculateTotals('units', parseInt(e.target.value) || 0)}
                                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl font-bold focus:border-green-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => calculateTotals('units', formData.units + 1)}
                                      className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                                    >
                                      <Plus className="w-5 h-5" />
                                    </button>
                                  </div>
                                </div>
                                <div className="bg-white rounded-lg p-4 border-2 border-orange-300">
                                  <p className="text-sm text-gray-600 mb-1">Requires</p>
                                  <p className="text-3xl font-bold text-orange-600">{formData.packages}</p>
                                  <p className="text-sm text-gray-600 mt-1">{selectedVariant.package_unit || 'packages'}s</p>
                                </div>
                              </>
                            )}
                          </div>

                          <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                            <Calculator className="w-4 h-4 inline mr-2 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900">
                              {formData.packages} {selectedVariant.package_unit || 'packages'}s = {formData.units} {selectedVariant.base_unit || 'units'}s
                            </span>
                          </div>
                        </>
                      )}

                      {selectedProduct?.product_type === 'bulk' && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">
                            Quantity ({selectedProduct.bulk_unit || 'unit'}s) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.quantity}
                            onChange={(e) => calculateTotals('quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-2xl font-bold text-center focus:border-green-500"
                            placeholder="0.00"
                          />
                          <p className="text-xs text-gray-600 mt-1 text-center">
                            Amount in {selectedProduct.bulk_unit || 'unit'}s received
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {((selectedProduct?.product_type === 'packaged' && selectedVariant) || selectedProduct?.product_type === 'bulk') && (
                    <div className="border-2 border-purple-300 rounded-lg p-5 bg-purple-50">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                          {selectedProduct?.product_type === 'packaged' ? '4' : '3'}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Location & Cost</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">
                            <MapPin className="w-4 h-4 inline mr-1" />
                            Location *
                          </label>
                          <select
                            value={formData.location_id}
                            onChange={(e) => setFormData({...formData, location_id: e.target.value})}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                          >
                            <option value="">Select location...</option>
                            {locations.map((loc: any) => (
                              <option key={loc.location_id} value={loc.location_id}>{loc.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">
                            <DollarSign className="w-4 h-4 inline mr-1" />
                            Unit Cost (RWF) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.unit_cost}
                            onChange={(e) => calculateTotals('unitCost', parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 text-lg font-semibold"
                          />
                          <p className="text-xs text-gray-600 mt-1">
                            Cost per {selectedProduct?.product_type === 'packaged' ? selectedVariant?.base_unit || 'unit' : selectedProduct?.bulk_unit || 'unit'}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Reference Number (Optional)
                        </label>
                        <input
                          type="text"
                          value={formData.referenceNumber}
                          onChange={(e) => setFormData({...formData, referenceNumber: e.target.value})}
                          placeholder="e.g., PO-12345, GRN-67890"
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Notes (Optional)</label>
                        <textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({...formData, notes: e.target.value})}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                          rows={2}
                          placeholder="Any additional notes..."
                        />
                      </div>
                    </div>
                  )}

                  {formData.totalValue > 0 && (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Summary</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Quantity</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {selectedProduct?.product_type === 'packaged' 
                              ? `${formData.units} ${selectedVariant?.base_unit || 'units'}s (${formData.packages} ${selectedVariant?.package_unit || 'packages'}s)`
                              : `${formData.quantity} ${selectedProduct?.bulk_unit || 'units'}s`
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Unit Cost</p>
                          <p className="text-lg font-semibold text-gray-900">
                            RWF {Number(formData.unit_cost || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 mb-1">Total Value</p>
                          <p className="text-3xl font-bold text-green-600">
                            RWF {formData.totalValue.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 justify-end pt-4 border-t-2">
                    <button
                      type="button"
                      onClick={resetInventoryForm}
                      className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleFormSubmit}
                      disabled={!formData.location_id || formData.totalValue === 0 || isSubmitting}
                      className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 ${
                        formData.location_id && formData.totalValue > 0 && !isSubmitting
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <CheckCircle className="w-5 h-5" />
                      {isSubmitting ? (editingInventory ? 'Updating...' : 'Adding...') : (editingInventory ? 'Update Inventory' : 'Add Inventory')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Toggle */}

        <div className="flex items-center justify-between print:hidden">

          <div className="flex gap-2">

            <button

              onClick={() => setViewMode('table')}

              className={`px-4 py-2 text-sm rounded-lg ${

                viewMode === 'table'

                  ? 'bg-blue-100 text-blue-700 font-medium'

                  : 'text-gray-600 hover:bg-gray-100'

              }`}

            >

              Table View

            </button>

            <button

              onClick={() => setViewMode('cards')}

              className={`px-4 py-2 text-sm rounded-lg ${

                viewMode === 'cards'

                  ? 'bg-blue-100 text-blue-700 font-medium'

                  : 'text-gray-600 hover:bg-gray-100'

              }`}

            >

              Card View

            </button>

          </div>



          {selectedItems.length > 0 && (

            <div className="flex gap-2">

              <span className="text-sm text-gray-600 self-center">

                {selectedItems.length} selected

              </span>

              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleBulkEdit();
                }}
                disabled={selectedItems.length === 0}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Bulk Edit
              </button>

              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAdjustStock();
                }}
                disabled={selectedItems.length === 0}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Adjust Stock
              </button>

            </div>

          )}

        </div>

      </div>



      <div className="flex-1 overflow-y-auto p-6">

        {/* Summary Cards */}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

          {summaryCards.map((card, idx) => {

            const Icon = card.icon;

            return (

              <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">

                <div className="flex items-start justify-between mb-2">

                  <p className="text-sm text-gray-600">{card.label}</p>

                  <div className={`p-2 rounded ${
                    card.color === 'blue' ? 'bg-blue-100' :
                    card.color === 'green' ? 'bg-green-100' :
                    card.color === 'yellow' ? 'bg-yellow-100' :
                    'bg-red-100'
                  }`}>

                    <Icon className={`w-4 h-4 ${
                      card.color === 'blue' ? 'text-blue-600' :
                      card.color === 'green' ? 'text-green-600' :
                      card.color === 'yellow' ? 'text-yellow-600' :
                      'text-red-600'
                    }`} />

                  </div>

                </div>

                <p className="text-2xl font-bold text-gray-900">{card.value}</p>

                <p className="text-xs text-gray-500 mt-1">{card.subtext}</p>

              </div>

            );

          })}

        </div>



        {/* Filters */}

        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">

            <div className="md:col-span-2 relative">

              <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />

              <input

                type="text"

                placeholder="Search by SKU, name, or category..."

                value={searchTerm}

                onChange={(e) => setSearchTerm(e.target.value)}

                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"

              />

            </div>

            <select 
              className="px-3 py-2 border border-gray-300 rounded-lg"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((cat: any) => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <select 
              className="px-3 py-2 border border-gray-300 rounded-lg"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="all">All Locations</option>
              {locations.map((location: any) => (
                <option key={location.location_id} value={location.location_id}>
                  {location.name}
                </option>
              ))}
            </select>

            <select 
              className="px-3 py-2 border border-gray-300 rounded-lg"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="healthy">Healthy</option>
              <option value="low">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="overstock">Overstock</option>
            </select>

          </div>

        </div>



        {/* Table View */}

        {viewMode === 'table' && (

          <div className="bg-white border border-gray-200 rounded-lg">

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead className="bg-gray-50 border-b border-gray-200">

                  <tr>

                    <th className="px-4 py-3 w-12">

                      <input

                        type="checkbox"

                        className="rounded"

                        checked={selectedItems.length === inventoryItems.length}

                        onChange={handleSelectAll}

                      />

                    </th>

                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Qty on Hand</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Value</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Last Updated</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Turnover</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Actions</th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-gray-200">

                  {filteredItems.map((item) => (

                    <tr key={item.sku} className="hover:bg-gray-50">

                      <td className="px-4 py-3">

                        <input

                          type="checkbox"

                          className="rounded"

                          checked={selectedItems.includes(item.sku)}

                          onChange={() => handleSelectItem(item.sku)}

                        />

                      </td>

                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.stock_level_id || item.product_id || 'N/A'}
                      </td>

                      <td className="px-4 py-3 text-sm font-medium text-gray-900">

                        {item.sku}

                      </td>

                      <td className="px-4 py-3">

                        <div>

                          <p className="text-sm font-medium text-gray-900">{item.name}</p>

                          <p className="text-xs text-gray-500">{item.type}</p>

                        </div>

                      </td>

                      <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>

                      <td className="px-4 py-3">

                        <p className="text-sm font-medium text-gray-900">

                          {item.totalQty} {item.unit}

                        </p>

                        {item.totalQty <= item.reorderPoint && item.totalQty > 0 && (

                          <p className="text-xs text-yellow-600">Below reorder point</p>

                        )}

                      </td>

                      <td className="px-4 py-3 text-sm font-medium text-gray-900">

                        RWF {item.totalValue.toLocaleString()}

                      </td>

                      <td className="px-4 py-3">

                        {item.locations.length > 0 ? (

                          <div className="text-xs text-gray-600">

                            {(item.locations as LocationItem[]).map((loc: LocationItem, idx: number) => (

                              <div key={idx} className="flex items-center gap-1">

                                <MapPin className="w-3 h-3" />

                                {loc.location}: {loc.qty}

                              </div>

                            ))}

                          </div>

                        ) : (

                          <span className="text-xs text-gray-400">No locations</span>

                        )}

                      </td>

                      <td className="px-4 py-3">{getStatusBadge(item.status)}</td>

                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'N/A'}
                      </td>

                      <td className="px-4 py-3">

                        <div className="flex items-center gap-1">

                          {item.turnover >= 5 ? (

                            <TrendingUp className="w-4 h-4 text-green-600" />

                          ) : (

                            <TrendingDown className="w-4 h-4 text-orange-600" />

                          )}

                          <span className="text-sm text-gray-900">{item.turnover}x</span>

                        </div>

                      </td>

                      <td className="px-4 py-3">

                        <div className="flex gap-2">

                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEditInventory(item);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteInventory(item);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </div>

        )}



        {/* Card View */}

        {viewMode === 'cards' && (

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {inventoryItems.map((item) => (

              <div key={item.sku} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">

                <div className="flex items-start justify-between mb-3">

                  <div className="flex-1">

                    <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>

                    <p className="text-sm text-gray-600">SKU: {item.sku}</p>

                    <p className="text-xs text-gray-500">{item.category} • {item.type}</p>

                  </div>

                  <input

                    type="checkbox"

                    className="rounded"

                    checked={selectedItems.includes(item.sku)}

                    onChange={() => handleSelectItem(item.sku)}

                  />

                </div>



                <div className="grid grid-cols-2 gap-3 mb-3">

                  <div>

                    <p className="text-xs text-gray-600">Quantity</p>

                    <p className="text-lg font-bold text-gray-900">

                      {item.totalQty} {item.unit}

                    </p>

                  </div>

                  <div>

                    <p className="text-xs text-gray-600">Value</p>

                    <p className="text-lg font-bold text-gray-900">

                      RWF {(item.totalValue / 1000).toFixed(0)}K

                    </p>

                  </div>

                </div>



                <div className="mb-3">

                  {getStatusBadge(item.status)}

                </div>



                {item.locations.length > 0 && (

                  <div className="border-t border-gray-200 pt-3 mb-3">

                    <p className="text-xs text-gray-600 mb-1">Locations:</p>

                    {(item.locations as LocationItem[]).map((loc: LocationItem, idx: number) => (

                      <div key={idx} className="flex items-center justify-between text-xs text-gray-700">

                        <span>{loc.location}</span>

                        <span className="font-medium">{loc.qty} {item.unit}</span>

                      </div>

                    ))}

                  </div>

                )}



                <div className="flex gap-2">

                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // View/Edit details - opens the edit form
                      handleEditInventory(item);
                    }}
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50 transition"
                  >
                    View Details
                  </button>

                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Adjust stock - navigate to stock adjustment page
                      handleSingleItemAdjustStock(item.sku);
                    }}
                    className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
                  >
                    Adjust Stock
                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    </div>
  );

};



export default AllInventory;

