import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const API_URL = "http://localhost:3000/products";
const SOCKET_URL = "http://localhost:3000";

const CATEGORY_COLORS = {
  gabinetes: 'var(--color-primary)',
  monitores: '#3b82f6',
  mouse: '#8b5cf6',
  procesador: '#ef4444',
  teclado: '#f59e0b',
  tarjeta_grafica: '#10b981',
  electronicos: '#71A39E'
};

export default function ProductList({ onEdit }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const MEDIA_API_URL = "http://localhost:3000/media";

  const getThumbnailUrl = (urlStr) => {
    if (!urlStr) return "";
    const hashMatch = urlStr.match(/#([^#]+)$/);
    const hash = hashMatch ? `#${hashMatch[1]}` : "";
    const driveIdMatch = urlStr.match(/(?:id=|\/file\/d\/|\/d\/|thumbnail\?id=)([^&/]+)/);
    if (driveIdMatch && (urlStr.includes('drive.google.com') || urlStr.includes('docs.google.com') || urlStr.includes('googleusercontent.com'))) {
       const driveId = driveIdMatch[1];
       return `${MEDIA_API_URL}/file/${driveId}${hash}`;
    }
    const base = urlStr.split('#')[0];
    return base ? `${base}${hash}` : "";
  };

  const isMediaVideo = (url) => {
     if (!url) return false;
     return !!url.match(/\.(mp4|webm|avi|mov)(?:[?#]|$)/i) || url.includes('preview');
  };
  const [filterSearch, setFilterSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('ACTIVO');
  const [filterStock, setFilterStock] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const params = new URLSearchParams();
        if (filterSearch) params.set('search', filterSearch);
        if (filterEstado) params.set('estado', filterEstado);
        if (filterStock) params.set('stock', 'true');

        let localData = [];
        try {
          const res = await fetch(`${API_URL}?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            localData = Array.isArray(data) ? data : (data.items || []);
          }
        } catch (e) {
          console.error("Error al cargar productos locales:", e);
        }

        let fakeData = [];
        try {
          // Obtener de la API de productos externos del backend
          if (filterEstado === 'ACTIVO' || filterEstado === 'ALL') {
            const res = await fetch(`${API_URL}/external`);
            if (res.ok) {
              const data = await res.json();
              fakeData = Array.isArray(data) ? data : (data.items || []);
            }
          }
        } catch (e) {
          console.error("Error al cargar productos externos:", e);
        }

        // Aplicar filtros locales de búsqueda y stock a los productos de la API externa
        if (filterSearch) {
          const query = filterSearch.toLowerCase();
          fakeData = fakeData.filter(p => 
            p.nombre.toLowerCase().includes(query) || 
            p.codigo.toLowerCase().includes(query)
          );
        }
        if (filterStock) {
          fakeData = fakeData.filter(p => p.stock > 0);
        }

        setProducts([...localData, ...fakeData]);
      } finally { setLoading(false); }
    };
    fetchProducts();
  }, [filterSearch, filterEstado, filterStock]);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.on("productCreated", (p) => setProducts(p1 => [...p1, p]));
    socket.on("productUpdated", (p) => setProducts(p1 => p1.map(x => x.id === p.id ? p : x)));
    socket.on("productDeleted", ({ id }) => setProducts(p1 => p1.filter(x => x.id !== id)));
    return () => socket.disconnect();
  }, []);

  const handleDelete = (id) => fetch(`${API_URL}/${id}`, { method: 'DELETE' });

  return (
    <div className="card">
      <div className="card-header">Listado de Productos</div>
      <div className="card-body">
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <input placeholder="Buscar por nombre o código..." value={filterSearch} onChange={(e)=>setFilterSearch(e.target.value)} style={{ flex: 1 }} />
          <select value={filterEstado} onChange={(e)=>setFilterEstado(e.target.value)} style={{ width: '150px' }}>
             <option value="ACTIVO">Activos</option>
             <option value="INACTIVO">Inactivos</option>
             <option value="ALL">Todos</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text)', background: 'var(--color-light)', padding: '0 16px', borderRadius: '8px', cursor: 'pointer' }}>
             <input type="checkbox" checked={filterStock} onChange={(e)=>setFilterStock(e.target.checked)} style={{ width: 'auto' }}/> Solo stock
          </label>
        </div>

        {loading ? <p style={{ color: 'var(--color-muted)' }}>Cargando datos...</p> : (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {products.map(p => (
                 <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-card)' }}>
                     <div style={{ display: 'flex', gap: '16px' }}>
                        {p.imagen && (
                           <div style={{ width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                              {isMediaVideo(p.imagen) ? (
                                 <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
                                    <span style={{ fontSize: '20px' }}>▶️</span>
                                 </div>
                              ) : (
                                 <img src={getThumbnailUrl(p.imagen)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="thumb" loading="lazy" />
                              )}
                           </div>
                        )}
                        <div>
                           <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                              {p.nombre}
                              {p.categoria && (
                                 <span style={{ 
                                    marginLeft: '8px', 
                                    fontSize: '11px', 
                                    padding: '2px 6px', 
                                    borderRadius: '4px', 
                                    backgroundColor: CATEGORY_COLORS[p.categoria] || '#6b7280', 
                                    color: 'white' 
                                 }}>
                                    {p.categoria.replace('_', ' ').toUpperCase()}
                                 </span>
                              )}
                           </div>
                           <div style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '8px' }}>ID UNICO: {p.codigo}</div>
                           <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                              <span className={`badge ${p.estado === 'ACTIVO' ? 'badge-positive' : 'badge-negative'}`}>{p.estado}</span>
                              <span style={{ fontSize: '13px', color: p.stock > 0 ? 'var(--color-text)' : 'var(--color-negative-text)' }}>
                                 <span className={`dot ${p.stock > 0 ? 'dot-green' : 'dot-red'}`}></span>
                                 Stock: {p.stock}
                              </span>
                           </div>
                        </div>
                     </div>
                     <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                       <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '16px' }}>${Number(p.precio).toFixed(2)}</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {!p.id.toString().startsWith('fake_') ? (
                            <>
                              <button className="btn btn-ghost" onClick={() => onEdit(p)}>Editar</button>
                              <button className="btn btn-ghost" style={{ color: 'var(--color-negative-text)' }} onClick={() => handleDelete(p.id)}>Borrar</button>
                            </>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--color-muted)', padding: '6px' }}>Solo lectura (API)</span>
                          )}
                        </div>
                     </div>
                 </div>
              ))}
              {products.length === 0 && <p style={{ color: 'var(--color-muted)', fontStyle: 'italic' }}>No se encontraron productos.</p>}
           </div>
        )}
      </div>
    </div>
  );
}
