import { useState, useEffect } from "react";
import ProductForm from "./ProductForm";
import ProductList from "./ProductList";
import OrdersList from "./OrdersList";
import MediaGallery from "./MediaGallery";
import './index.css';

const initialForm = { nombre: "", descripcion: "", codigo: "", precio: "", stock: 0, imagen: "", imagenes: [], estado: 'ACTIVO', categoryId: "" };

function App() {
  const [productToEdit, setProductToEdit] = useState(null);
  const [productFormState, setProductFormState] = useState(initialForm);
  const [view, setView] = useState('products'); // 'products' | 'orders' | 'media'

  useEffect(() => {
     if (productToEdit) {
        const categoryId = productToEdit.category?.id || productToEdit.categoryId || "";
        setProductFormState({ 
           ...productToEdit, 
           categoryId, 
           imagenes: Array.isArray(productToEdit.imagenes) 
              ? productToEdit.imagenes 
              : (productToEdit.imagenes ? productToEdit.imagenes.split(',') : [])
        });
     } else {
        setProductFormState(initialForm);
     }
  }, [productToEdit]);

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-primary)' }}>PC Store</div>
        <ul className="sidebar-nav">
          <li className={view === 'products' ? 'active' : ''} onClick={() => setView('products')}>Inventario</li>
          <li className={view === 'orders' ? 'active' : ''} onClick={() => setView('orders')}>Órdenes</li>
          <li className={view === 'media' ? 'active' : ''} onClick={() => setView('media')}>Multimedia</li>
        </ul>
      </aside>

      <main className="main-content">
        {view === 'products' ? (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <ProductForm 
                 productToEdit={productToEdit} 
                 setProductToEdit={setProductToEdit} 
                 form={productFormState}
                 setForm={setProductFormState}
              />
              <ProductList onEdit={setProductToEdit} />
           </div>
        ) : view === 'orders' ? (
           <OrdersList />
        ) : (
           <MediaGallery />
        )}
      </main>
    </div>
  );
}

export default App;