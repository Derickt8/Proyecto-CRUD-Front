import { useState } from "react";
import ProductForm from "./ProductForm";
import ProductList from "./ProductList";

function App() {
  const [productToEdit, setProductToEdit] = useState(null);

  return (
    <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: '1200px', padding: '24px' }}>
      <ProductForm productToEdit={productToEdit} setProductToEdit={setProductToEdit} />
      <ProductList onEdit={setProductToEdit} />
    </div>
  );
}

export default App;