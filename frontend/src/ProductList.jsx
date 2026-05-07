import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const API_URL = "http://localhost:3000/products";
// Socket should connect to the root URL if the gateway is at root
const SOCKET_URL = "http://localhost:3000";

export default function ProductList({ onEdit }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initial fetch
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Error fetching products");
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Error deleting product");
      // Local state is updated via WebSocket, so we don't necessarily need to remove it here manually, 
      // but if we want instant feedback we could. Since WebSockets are fast, we can rely on them.
    } catch (err) {
      console.error(err);
    }
  };

  // Socket connection
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on("connect", () => {
      console.log("Connected to WebSocket");
    });

    socket.on("productCreated", (newProduct) => {
      setProducts((prev) => [...prev, newProduct]);
    });

    socket.on("productUpdated", (updatedProduct) => {
      setProducts((prev) =>
        prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
      );
    });

    socket.on("productDeleted", ({ id }) => {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (loading) return <div className="list-shell"><div className="list-card"><p>Cargando productos...</p></div></div>;
  if (error) return <div className="list-shell"><div className="list-card"><p className="feedback error">{error}</p></div></div>;

  return (
    <>
      <style>{`
        .list-shell {
          width: 100%;
          max-width: 560px;
          padding: 24px;
        }

        .list-card {
          background: #141414;
          border: 1px solid #2a2a2a;
          border-radius: 2px;
          padding: 48px 44px;
          position: relative;
          overflow: hidden;
          height: 100%;
        }

        .list-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, #42f5a7 0%, #4287f5 100%);
        }

        .product-item {
          background: #0d0d0d;
          border: 1px solid #2a2a2a;
          padding: 16px;
          margin-bottom: 12px;
          border-radius: 2px;
          transition: border-color 0.2s, transform 0.2s;
        }

        .product-item:hover {
          border-color: #42f5a7;
          transform: translateY(-2px);
        }

        .product-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .product-name {
          font-family: 'DM Serif Display', serif;
          font-size: 20px;
          color: #f0f0f0;
        }

        .product-price {
          color: #42f5a7;
          font-weight: 500;
          font-size: 14px;
        }

        .product-desc {
          font-size: 12px;
          color: #888;
          margin-bottom: 12px;
          line-height: 1.4;
        }

        .status-badge {
          display: inline-block;
          font-size: 10px;
          padding: 4px 8px;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .status-badge.active {
          background: rgba(66, 245, 167, 0.1);
          color: #42f5a7;
          border: 1px solid rgba(66, 245, 167, 0.2);
        }

        .status-badge.inactive {
          background: rgba(245, 80, 66, 0.1);
          color: #f55042;
          border: 1px solid rgba(245, 80, 66, 0.2);
        }
        
        .empty-state {
          color: #666;
          text-align: center;
          font-style: italic;
        }

        .actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          border-top: 1px solid #2a2a2a;
          padding-top: 12px;
        }

        .action-btn {
          background: transparent;
          border: 1px solid #2a2a2a;
          color: #888;
          padding: 6px 12px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border-radius: 2px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover {
          color: #f0f0f0;
          border-color: #f0f0f0;
        }

        .action-btn.delete:hover {
          color: #f55042;
          border-color: #f55042;
        }
      `}</style>
      <div className="list-shell">
        <div className="list-card">
          <p className="eyebrow" style={{ color: '#42f5a7' }}>En Vivo</p>
          <h1 style={{ marginBottom: '24px' }}>Inventario <em>actual</em></h1>
          
          {products.length === 0 ? (
            <p className="empty-state">No hay productos registrados.</p>
          ) : (
            <div className="products-grid">
              {products.map((product) => (
                <div key={product.id} className="product-item">
                  <div className="product-header">
                    <div className="product-name">{product.name}</div>
                    <div className="product-price">${parseFloat(product.price).toFixed(2)}</div>
                  </div>
                  <div className="product-desc">{product.description}</div>
                  <div className={`status-badge ${product.isActive ? 'active' : 'inactive'}`}>
                    {product.isActive ? 'Activo' : 'Inactivo'}
                  </div>
                  <div className="actions">
                    <button className="action-btn" onClick={() => onEdit(product)}>Editar</button>
                    <button className="action-btn delete" onClick={() => handleDelete(product.id)}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
