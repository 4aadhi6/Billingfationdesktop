import { useState, useEffect } from 'react';
import BarcodeDisplay from './components/BarcodeDisplay'; // <-- IMPORTED

// --- Interfaces are now just comments for reference ---
// interface Product { id: string; name: string; category: string; price: number; colors: string; sizes: string; }
// interface BillItem { productId: string; productName: string; quantity: number; price: number; }
// interface Bill { id: string; items: BillItem[]; discountAmount: number; paymentMethod: string; subTotal: number; grandTotal: number; createdAt: string; }

const PREDEFINED_CATEGORIES = [
  'Shirts', 'T-Shirts', 'Jeans', 'Trousers', 'Sarees', 'Kurtis',
  'Dresses', 'Suits', 'Lehengas', 'Jackets', 'Sweaters', 'Shorts',
  'Skirts', 'Ethnic Wear', 'Western Wear', 'Sportswear',
  'Sleepwear', 'Lingerie', 'Accessories', 'Footwear', 'Kids Wear'
];

const SHOP_NAME = "Fashion World";
const API_BASE_URL = "http://localhost:3001/api";

const App = () => {
  // All your state and logic remains the same.
  // ... (Paste your ENTIRE App component code here, from const App: React.FC = () => { ... } to the end)
  // Just make sure to remove the BarcodeDisplay component definition from inside this file.

  // --- Start of Pasted Code ---
  const [currentView, setCurrentView] = useState('products');
  const [appLoading, setAppLoading] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Product Management State
  const [products, setProducts] = useState([]);
  const [productName, setProductName] = useState('');
  const [productFormCategory, setProductFormCategory] = useState('');
  const [otherCategoryName, setOtherCategoryName] = useState('');
  const [price, setPrice] = useState('');
  const [colors, setColors] = useState('');
  const [sizes, setSizes] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);

  // Billing State
  const [productIdentifierInput, setProductIdentifierInput] = useState('');
  const [currentBillItems, setCurrentBillItems] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Invoice & History State
  const [completedBills, setCompletedBills] = useState([]);
  const [invoiceToPreview, setInvoiceToPreview] = useState(null);

  // --- API Abstraction ---
  async function fetchFromAPI(endpoint, options) {
    setApiError(null);
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });
      if (!response.ok) {
        let errorMessage = `API request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      if (response.status === 204) {
        return undefined;
      }
      return response.json();
    } catch (error) {
      console.error(`Error with API endpoint ${API_BASE_URL}${endpoint}:`, error);
      setApiError(error.message || 'An unexpected error occurred. Please check your backend connection and try again.');
      throw error;
    }
  }

  // Load data from backend on initial mount
  useEffect(() => {
    const loadInitialData = async () => {
      setAppLoading(true);
      setApiError(null);
      try {
        console.log("Attempting to fetch initial data from backend...");
        const [fetchedProducts, fetchedBills] = await Promise.all([
          fetchFromAPI('/products'),
          fetchFromAPI('/bills')
        ]);
        setProducts(fetchedProducts || []);
        setCompletedBills(fetchedBills || []);
        console.log("Successfully fetched initial data:", { fetchedProducts, fetchedBills });
      } catch (error) {
        console.error("Failed to load initial data from backend:", error);
        alert(`Failed to load initial data: ${apiError || 'Please ensure your backend server is running and accessible.'}. The application may not function correctly.`);
        setProducts([]);
        setCompletedBills([]);
      } finally {
        setAppLoading(false);
      }
    };
    loadInitialData();
  }, []);

  const handleAddOrUpdateProduct = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setApiError(null);
    const resolvedCategory = productFormCategory === 'Other...' ? otherCategoryName.trim() : productFormCategory;

    if (!productName || !resolvedCategory || !price) {
      alert('Please fill in product name, category, and price.');
      setFormSubmitting(false);
      return;
    }
    if (productFormCategory === 'Other...' && !otherCategoryName.trim()) {
        alert('Please enter a name for the new category.');
        setFormSubmitting(false);
        return;
    }
    const productPrice = parseFloat(price);
    if (isNaN(productPrice) || productPrice <= 0) {
      alert('Please enter a valid price.');
      setFormSubmitting(false);
      return;
    }

    const productDataPayload = {
      name: productName,
      category: resolvedCategory,
      price: productPrice,
      colors,
      sizes,
    };

    try {
      if (editingProduct) {
        productDataPayload.id = editingProduct.id;
        const updatedProduct = await fetchFromAPI(`/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(productDataPayload),
        });
        setProducts(products.map(p => (p.id === updatedProduct.id ? updatedProduct : p)));
      } else {
        const newProduct = await fetchFromAPI('/products', {
          method: 'POST',
          body: JSON.stringify(productDataPayload),
        });
        setProducts([...products, newProduct]);
      }
      resetProductForm();
    } catch (error) {
      alert(`Error saving product: ${apiError || 'Please try again.'}`);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      setFormSubmitting(true);
      setApiError(null);
      try {
        await fetchFromAPI(`/products/${productId}`, {
          method: 'DELETE',
        });
        setProducts(products.filter(p => p.id !== productId));
      } catch (error) {
        alert(`Error deleting product: ${apiError || 'Please try again.'}`);
      } finally {
        setFormSubmitting(false);
      }
    }
  };

  const handleFinalizeBill = async () => {
    if (currentBillItems.length === 0) {
      alert('Cannot finalize an empty bill.');
      return;
    }
    if (grandTotal < 0) {
      alert('Discount cannot be more than the subtotal.');
      return;
    }
    setFormSubmitting(true);
    setApiError(null);

    const billDataPayload = {
      items: currentBillItems,
      discountAmount,
      paymentMethod,
      subTotal,
      grandTotal,
    };

    try {
      const newBill = await fetchFromAPI('/bills', {
        method: 'POST',
        body: JSON.stringify(billDataPayload),
      });
      setCompletedBills([newBill, ...completedBills]);
      setInvoiceToPreview(newBill);
      setCurrentView('invoicePreview');
      resetBillingForm();
    } catch (error) {
      alert(`Error finalizing bill: ${apiError || 'Please try again.'}`);
    } finally {
      setFormSubmitting(false);
    }
  };

  const resetProductForm = () => {
    setProductName('');
    setProductFormCategory('');
    setOtherCategoryName('');
    setPrice('');
    setColors('');
    setSizes('');
    setEditingProduct(null);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductName(product.name);
    if (PREDEFINED_CATEGORIES.includes(product.category)) {
      setProductFormCategory(product.category);
      setOtherCategoryName('');
    } else {
      setProductFormCategory('Other...');
      setOtherCategoryName(product.category);
    }
    setPrice(product.price.toString());
    setColors(product.colors);
    setSizes(product.sizes);
    setCurrentView('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFindAndAddProductToBill = () => {
    if (!productIdentifierInput.trim()) {
      alert('Please enter a Product ID (Barcode) or Name.');
      return;
    }
    const searchTerm = productIdentifierInput.trim();
    let productToAdd = products.find(p => p.id === searchTerm);
    if (!productToAdd) {
      productToAdd = products.find(p => p.name.toLowerCase() === searchTerm.toLowerCase());
    }

    if (!productToAdd) {
      alert(`Product with ID/Name "${searchTerm}" not found locally. Ensure products are loaded from backend.`);
      setProductIdentifierInput('');
      return;
    }

    const existingItemIndex = currentBillItems.findIndex(item => item.productId === productToAdd.id);
    if (existingItemIndex > -1) {
      const updatedItems = [...currentBillItems];
      updatedItems[existingItemIndex].quantity += quantity;
      setCurrentBillItems(updatedItems);
    } else {
      setCurrentBillItems([...currentBillItems, {
        productId: productToAdd.id,
        productName: productToAdd.name,
        quantity,
        price: productToAdd.price
      }]);
    }
    setProductIdentifierInput('');
    setQuantity(1);
  };

  const handleRemoveFromBill = (productId) => {
    setCurrentBillItems(currentBillItems.filter(item => item.productId !== productId));
  };

  const calculateTotals = () => {
    const subTotal = currentBillItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const grandTotal = subTotal - discountAmount;
    return { subTotal, grandTotal };
  };

  const { subTotal, grandTotal } = calculateTotals();
  const discountPercentage = subTotal > 0 ? ((discountAmount / subTotal) * 100).toFixed(2) : '0.00';

  const resetBillingForm = () => {
    setCurrentBillItems([]);
    setDiscountAmount(0);
    setPaymentMethod('Cash');
    setProductIdentifierInput('');
    setQuantity(1);
  };

    const renderProductForm = () => (
    <div className="bg-slate-800 p-6 rounded-lg shadow-xl mb-8">
      <h2 className="text-2xl font-semibold text-sky-400 mb-6">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
      <form onSubmit={handleAddOrUpdateProduct} className="space-y-4">
        <div>
          <label htmlFor="productName" className="block text-sm font-medium text-slate-300 mb-1">Product Name</label>
          <input type="text" id="productName" value={productName} onChange={e => setProductName(e.target.value)} required className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-sky-500 focus:border-sky-500" />
        </div>
        <div>
          <label htmlFor="categorySelect" className="block text-sm font-medium text-slate-300 mb-1">Category</label>
          <select
            id="categorySelect"
            value={productFormCategory}
            onChange={e => setProductFormCategory(e.target.value)}
            required
            className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-sky-500 focus:border-sky-500"
          >
            <option value="">-- Select Category --</option>
            {PREDEFINED_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            <option value="Other...">Other...</option>
          </select>
        </div>
        {productFormCategory === 'Other...' && (
          <div>
            <label htmlFor="otherCategoryName" className="block text-sm font-medium text-slate-300 mb-1">New Category Name</label>
            <input
              type="text"
              id="otherCategoryName"
              value={otherCategoryName}
              onChange={e => setOtherCategoryName(e.target.value)}
              required={productFormCategory === 'Other...'}
              className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
        )}
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-slate-300 mb-1">Price (₹)</label>
          <input type="number" id="price" value={price} onChange={e => setPrice(e.target.value)} required min="0.01" step="0.01" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-sky-500 focus:border-sky-500" />
        </div>
        <div>
          <label htmlFor="colors" className="block text-sm font-medium text-slate-300 mb-1">Available Colors (comma-separated)</label>
          <input type="text" id="colors" value={colors} onChange={e => setColors(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-sky-500 focus:border-sky-500" />
        </div>
        <div>
          <label htmlFor="sizes" className="block text-sm font-medium text-slate-300 mb-1">Available Sizes (comma-separated)</label>
          <input type="text" id="sizes" value={sizes} onChange={e => setSizes(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-sky-500 focus:border-sky-500" />
        </div>
        <p className="text-xs text-slate-400">
          Product ID will be auto-generated by the backend. Visual barcode (using this ID) will be shown in the product list.
        </p>
        <div className="flex space-x-3">
          <button type="submit" className="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-md transition duration-150" disabled={formSubmitting}>
            {formSubmitting ? (editingProduct ? 'Updating...' : 'Adding...') : (editingProduct ? 'Update Product' : 'Add Product')}
          </button>
          {editingProduct && (
            <button type="button" onClick={resetProductForm} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-4 rounded-md transition duration-150" disabled={formSubmitting}>
              Cancel Edit
            </button>
          )}
        </div>
      </form>
    </div>
  );

  const renderProductList = () => (
    <div className="bg-slate-800 p-6 rounded-lg shadow-xl">
      <h2 className="text-2xl font-semibold text-sky-400 mb-6">Product List</h2>
      {apiError && currentView === 'products' && (
        <div className="mb-4 p-3 bg-red-500/20 text-red-300 border border-red-500 rounded-md">{`Error loading products: ${apiError}`}</div>
      )}
      {products.length === 0 && !appLoading && !apiError ? (
        <p className="text-slate-400">No products found. Add products using the form above.</p>
      ) : products.length === 0 && appLoading ? (
         <p className="text-slate-400">Loading products from backend...</p>
      ): (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-600">
              <tr>
                <th className="py-3 px-4 text-slate-300 font-semibold text-center">Barcode & Price</th>
                <th className="py-3 px-4 text-slate-300 font-semibold">Name</th>
                <th className="py-3 px-4 text-slate-300 font-semibold">Category</th>
                <th className="py-3 px-4 text-slate-300 font-semibold">Colors</th>
                <th className="py-3 px-4 text-slate-300 font-semibold">Sizes</th>
                <th className="py-3 px-4 text-slate-300 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="border-b border-slate-700 hover:bg-slate-700/50 align-top">
                  <td className="py-3 px-2 text-slate-200">
                     <BarcodeDisplay productId={product.id} price={product.price} shopName={SHOP_NAME} />
                  </td>
                  <td className="py-3 px-4 text-slate-200">{product.name}</td>
                  <td className="py-3 px-4 text-slate-200">{product.category}</td>
                  <td className="py-3 px-4 text-slate-200">{product.colors || '-'}</td>
                  <td className="py-3 px-4 text-slate-200">{product.sizes || '-'}</td>
                  <td className="py-3 px-4 text-slate-200 space-x-2 whitespace-nowrap">
                    <button onClick={() => handleEditProduct(product)} className="text-sky-400 hover:text-sky-300 text-sm" disabled={formSubmitting}>Edit</button>
                    <button onClick={() => handleDeleteProduct(product.id)} className="text-red-400 hover:text-red-300 text-sm" disabled={formSubmitting}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderBillingSection = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2 bg-slate-800 p-6 rounded-lg shadow-xl">
        <h2 className="text-2xl font-semibold text-sky-400 mb-6">Create New Bill</h2>

        <div className="mb-4">
          <label htmlFor="productIdentifierInput" className="block text-sm font-medium text-slate-300 mb-1">Scan/Enter Product ID (from Barcode) or Name</label>
          <div className="flex space-x-2">
            <input
              type="text"
              id="productIdentifierInput"
              value={productIdentifierInput}
              onChange={e => setProductIdentifierInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && productIdentifierInput.trim()) handleFindAndAddProductToBill();}}
              placeholder="Enter ID or Name"
              className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-sky-500 focus:border-sky-500"
            />
             <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={e => setQuantity(Math.max(1, parseInt(e.target.value)) || 1)}
              min="1"
              className="w-24 bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-sky-500 focus:border-sky-500"
              aria-label="Quantity"
            />
            <button
              onClick={handleFindAndAddProductToBill}
              disabled={products.length === 0 || !productIdentifierInput.trim() || formSubmitting}
              className="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-md transition duration-150 disabled:opacity-50"
            >
              Add
            </button>
          </div>
           {products.length === 0 && !appLoading && <p className="text-sm text-yellow-400 mt-2">No products available. Please add products first or check backend connection.</p>}
        </div>

        <div className="mt-8">
          <h3 className="text-xl font-semibold text-sky-300 mb-4">Current Bill Items</h3>
          {currentBillItems.length === 0 ? (
            <p className="text-slate-400">No items added to the bill yet.</p>
          ) : (
            <ul className="space-y-3">
              {currentBillItems.map(item => (
                <li key={item.productId} className="flex justify-between items-center bg-slate-700 p-3 rounded-md">
                  <div>
                    <span className="font-medium text-slate-100">{item.productName}</span>
                    <span className="text-sm text-slate-400"> (x{item.quantity} @ ₹{item.price.toFixed(2)})</span>
                     <p className="text-xs text-slate-500">ID: {item.productId}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                     <span className="text-slate-200">₹{(item.price * item.quantity).toFixed(2)}</span>
                     <button onClick={() => handleRemoveFromBill(item.productId)} className="text-red-400 hover:text-red-300 text-xs p-1">Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg shadow-xl h-fit">
        <h3 className="text-xl font-semibold text-sky-400 mb-4">Summary & Payment</h3>
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-slate-300">
            <span>Subtotal:</span>
            <span className="font-semibold text-slate-100">₹{subTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <label htmlFor="discount" className="whitespace-nowrap mr-2">Discount (₹):</label>
            <input
              type="number"
              id="discount"
              value={discountAmount}
              onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
              min="0"
              className="w-full max-w-[100px] bg-slate-700 border border-slate-600 rounded-md p-1.5 text-white text-right focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
           <div className="flex justify-between text-sm text-slate-400">
            <span>Discount %:</span>
            <span>{discountPercentage}%</span>
          </div>
          <hr className="border-slate-600 my-2" />
          <div className="flex justify-between text-xl font-bold text-sky-300">
            <span>Grand Total:</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="paymentMethod" className="block text-sm font-medium text-slate-300 mb-1">Payment Method</label>
          <select
            id="paymentMethod"
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-sky-500 focus:border-sky-500"
          >
            <option value="Cash">Cash</option>
            <option value="GPay">GPay</option>
            <option value="Card">Card (Credit/Debit)</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <button
          onClick={handleFinalizeBill}
          disabled={currentBillItems.length === 0 || formSubmitting}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-md transition duration-150 disabled:opacity-50"
        >
          {formSubmitting ? 'Finalizing...' : 'Finalize Bill & View Invoice'}
        </button>
      </div>
    </div>
  );

  const renderInvoicePreview = () => {
    if (!invoiceToPreview) return null;
    const { id, items, discountAmount: invDiscount, paymentMethod: invPayment, subTotal: invSubTotal, grandTotal: invGrandTotal, createdAt } = invoiceToPreview;
    const invDiscountPercentage = invSubTotal > 0 ? ((invDiscount / invSubTotal) * 100).toFixed(2) : '0.00';

    return (
      <div id="invoiceToPreview" className="bg-slate-100 text-slate-800 p-6 md:p-8 rounded-lg shadow-xl max-w-2xl mx-auto print:shadow-none print:border print:border-slate-300">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-sky-600">{SHOP_NAME}</h2>
          <p className="text-slate-600">Invoice</p>
        </div>

        <div className="flex justify-between text-sm text-slate-700 mb-4">
          <span>Invoice ID: {id}</span>
          <span>Date: {new Date(createdAt).toLocaleString()}</span>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-sky-500 mb-2 border-b border-slate-300 pb-1">Items:</h3>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-300">
              <tr >
                <th className="text-left py-2 px-1 text-slate-700">Product</th>
                <th className="text-left py-2 px-1 text-slate-700 text-xs">ID (Barcode)</th>
                <th className="text-center py-2 px-1 text-slate-700">Qty</th>
                <th className="text-right py-2 px-1 text-slate-700">Price</th>
                <th className="text-right py-2 px-1 text-slate-700">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.productId} className="border-b border-slate-200">
                  <td className="py-2 px-1 text-slate-800 font-medium">{item.productName}</td>
                  <td className="py-2 px-1 text-slate-600 text-xs">{item.productId}</td>
                  <td className="text-center py-2 px-1 text-slate-800">{item.quantity}</td>
                  <td className="text-right py-2 px-1 text-slate-800">₹{item.price.toFixed(2)}</td>
                  <td className="text-right py-2 px-1 text-slate-800 font-semibold">₹{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-2 text-sm text-slate-800 mb-6 mt-4">
          <div className="flex justify-between"><span>Subtotal:</span> <span>₹{invSubTotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Discount Applied (₹):</span> <span className="text-red-600">- ₹{invDiscount.toFixed(2)}</span></div>
          <div className="flex justify-between text-xs text-slate-500"><span>(Discount % of Subtotal):</span> <span>({invDiscountPercentage}%)</span></div>
          <hr className="border-slate-300 my-1" />
          <div className="flex justify-between font-bold text-lg text-sky-600"><span>Grand Total:</span> <span>₹{invGrandTotal.toFixed(2)}</span></div>
        </div>

        <div className="text-sm text-slate-700 mb-6">
          <p>Payment Method: <span className="font-semibold">{invPayment}</span></p>
        </div>

        <div className="text-center text-xs text-slate-500 mt-8">
          Thank you for shopping at {SHOP_NAME}!
        </div>

        <div className="mt-8 flex justify-center space-x-4 print:hidden">
          <button
            onClick={() => { setCurrentView('billing'); setInvoiceToPreview(null); }}
            className="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-6 rounded-md transition"
          >
            New Bill
          </button>
          <button
            onClick={() => window.print()}
            className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-6 rounded-md transition print-button"
          >
            Print Invoice
          </button>
        </div>
      </div>
    );
  };

  const renderBillingHistory = () => (
    <div className="bg-slate-800 p-6 rounded-lg shadow-xl">
      <h2 className="text-2xl font-semibold text-sky-400 mb-6">Billing History</h2>
      {apiError && currentView === 'history' && (
         <div className="mb-4 p-3 bg-red-500/20 text-red-300 border border-red-500 rounded-md">{`Error loading billing history: ${apiError}`}</div>
      )}
      {completedBills.length === 0 && !appLoading && !apiError ? (
        <p className="text-slate-400">No bills recorded yet.</p>
      ) : completedBills.length === 0 && appLoading ? (
        <p className="text-slate-400">Loading billing history from backend...</p>
      ) : (
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
          {completedBills.map(bill => (
            <div key={bill.id} className="bg-slate-700 p-4 rounded-md shadow">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-sky-300">{bill.id}</h3>
                  <p className="text-xs text-slate-400">Date: {new Date(bill.createdAt).toLocaleString()}</p>
                </div>
                <button
                    onClick={() => { setInvoiceToPreview(bill); setCurrentView('invoicePreview');}}
                    className="text-sky-400 hover:text-sky-300 text-sm font-medium py-1 px-3 rounded hover:bg-slate-600 transition-colors"
                >
                    View Invoice
                </button>
              </div>
              <div className="text-sm text-slate-300 grid grid-cols-2 gap-x-4">
                  <span>Items: {bill.items.length}</span>
                  <span>Payment: {bill.paymentMethod}</span>
                  <span>Subtotal: ₹{bill.subTotal.toFixed(2)}</span>
                  <span>Discount: ₹{bill.discountAmount.toFixed(2)}</span>
              </div>
              <p className="text-md font-semibold text-slate-100 mt-2">Grand Total: ₹{bill.grandTotal.toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (appLoading && products.length === 0 && completedBills.length === 0 && !apiError) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-xl">Loading Fashion World App Data from Backend...</div>;
  }
   if (appLoading && apiError && products.length === 0 && completedBills.length === 0) {
     return <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white text-xl p-8 text-center">
         <p className="text-2xl font-bold text-red-400 mb-4">Application Initialization Failed</p>
         <p className="mb-2">Could not load essential data from the backend.</p>
         <p className="text-sm text-red-300 mb-4">Error: {apiError}</p>
         <p className="text-sm">Please ensure your backend server is running, accessible at <code className="bg-slate-700 p-1 rounded">{API_BASE_URL}</code>, and properly configured. Then, restart the app.</p>
     </div>;
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white font-sans p-4 md:p-8">
      <header className="mb-8 print:hidden">
        <h1 className="text-4xl md:text-5xl font-bold text-sky-400 text-center">{SHOP_NAME} Billing</h1>
        <nav className="mt-6 flex justify-center space-x-2 md:space-x-4 bg-slate-800/50 p-3 rounded-lg max-w-md mx-auto shadow">
          {['products', 'billing', 'history'].map(viewName => (
            <button
              key={viewName}
              onClick={() => {
                if (currentView === 'invoicePreview' && viewName !== 'history') {
                    setInvoiceToPreview(null);
                }
                setCurrentView(viewName);
              }}
              className={`px-3 py-2 md:px-4 md:py-2 rounded-md text-sm md:text-base font-medium transition-colors
                ${currentView === viewName && viewName !== 'invoicePreview' ? 'bg-sky-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-sky-300'}`}
                 disabled={formSubmitting && viewName !== currentView}
            >
              {viewName.charAt(0).toUpperCase() + viewName.slice(1)}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {apiError && !appLoading && (currentView === 'products' || currentView === 'billing' || currentView === 'history') && (
            <div className="my-4 p-3 bg-red-500/20 text-red-300 border border-red-500 rounded-md text-sm">
                <strong>API Error:</strong> {apiError}
            </div>
        )}

        {currentView === 'products' && (
          <>
            {renderProductForm()}
            {renderProductList()}
          </>
        )}
        {currentView === 'billing' && renderBillingSection()}
        {currentView === 'invoicePreview' && invoiceToPreview && renderInvoicePreview()}
        {currentView === 'history' && renderBillingHistory()}
      </main>

      {formSubmitting && <div className="fixed bottom-4 right-4 bg-sky-500 text-white text-sm py-2 px-4 rounded-lg shadow-lg z-50">Submitting...</div>}

      <footer className="mt-12 text-center text-sm text-slate-500 print:hidden">
        © {new Date().getFullYear()} {SHOP_NAME} App. All rights reserved.
      </footer>
    </div>
  );
};
// --- End of Pasted Code ---

export default App;
