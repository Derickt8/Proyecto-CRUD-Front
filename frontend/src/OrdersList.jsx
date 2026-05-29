import { useEffect, useState } from "react";

const API_URL = "http://localhost:3000/orders";

export default function OrdersList() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('PENDIENTE_CONFIRMACION');

  const fetchOrders = async () => {
    try {
      const res = await fetch(API_URL);
      if (res.ok) setOrders(await res.json());
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleConfirm = async (id) => {
    if (!window.confirm("¿Confirmar el pago de esta orden? El stock se actualizará automáticamente.")) return;

    try {
      const res = await fetch(`${API_URL}/${id}/confirmar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const err = await res.json();
        alert("Error: " + (err.message || "No se pudo confirmar"));
        return;
      }

      alert("¡Orden confirmada exitosamente!");
      fetchOrders();
    } catch {
      alert("Error de conexión");
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("¿Estás seguro de cancelar esta orden?")) return;

    try {
      const res = await fetch(`${API_URL}/${id}/cancelar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        alert("Error al cancelar");
        return;
      }

      fetchOrders();
    } catch {
      alert("Error de conexión");
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'CONFIRMADA': return { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
      case 'CANCELADA': return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' };
      default: return { 
        backgroundColor: '#fef9c3', 
        color: '#854d0e', 
        border: '1px solid #fef08a',
        animation: 'blink 1.5s infinite'
      };
    }
  };

  const filteredOrders = filter === 'TODAS' ? orders : orders.filter(o => o.status === filter);

  return (
    <div className="card">
      <style>{`
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
      
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Panel de Gestión de Órdenes</span>
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '13px' }}
        >
          <option value="PENDIENTE_CONFIRMACION">Pendientes de Pago</option>
          <option value="CONFIRMADA">Confirmadas</option>
          <option value="CANCELADA">Canceladas</option>
          <option value="TODAS">Ver Todas</option>
        </select>
      </div>

      <div className="card-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredOrders.map(o => (
            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', border: '1px solid var(--color-border)', borderRadius: '12px', backgroundColor: 'white' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>{o.customerName}</span>
                  <span style={{ 
                    padding: '4px 12px', 
                    borderRadius: '20px', 
                    fontSize: '10px', 
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    ...getStatusStyle(o.status)
                  }}>
                    {o.status === 'PENDIENTE_CONFIRMACION' ? '• ESPERANDO PAGO' : o.status}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '4px' }}>
                  ID: <span style={{ fontFamily: 'monospace' }}>{o.id}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                  {new Date(o.createdAt).toLocaleString()}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Método:</span>
                  <span style={{ 
                    padding: '2px 8px', 
                    borderRadius: '4px', 
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: o.metodoPago?.includes('Stripe') ? '#e0e7ff' : '#f1f5f9',
                    color: o.metodoPago?.includes('Stripe') ? '#4338ca' : '#475569',
                    border: o.metodoPago?.includes('Stripe') ? '1px solid #c7d2fe' : '1px solid #e2e8f0',
                  }}>
                    {o.metodoPago || 'Efectivo'}
                  </span>
                </div>
                
                <div style={{ marginTop: '12px' }}>
                  {o.details?.map(d => (
                    <div key={d.id} style={{ fontSize: '13px' }}>
                       <span style={{ color: 'var(--color-muted)' }}>{d.quantity}x</span> {d.product?.nombre}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', minWidth: '160px' }}>
                <div style={{ fontWeight: 800, fontSize: '22px', color: '#1e293b' }}>
                  ${Number(o.total).toFixed(2)}
                </div>

                {o.status === 'PENDIENTE_CONFIRMACION' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button 
                      onClick={() => handleConfirm(o.id)}
                      className="btn"
                      style={{ padding: '8px 14px', fontSize: '11px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Confirmar pago
                    </button>
                    <button 
                      onClick={() => handleCancel(o.id)}
                      className="btn"
                      style={{ padding: '8px 14px', fontSize: '11px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #fee2e2', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredOrders.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-muted)' }}>
              <p style={{ fontStyle: 'italic' }}>No hay órdenes en este estado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
