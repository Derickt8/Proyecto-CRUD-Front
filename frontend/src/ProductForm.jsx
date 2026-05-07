import { useState } from "react";

const API_URL = "http://localhost:3000/products";

const initialForm = {
  name: "",
  description: "",
  price: "",
  isActive: true,
};

export default function ProductForm() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState(null); // null | "loading" | "success" | "error"
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
      };

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Error ${res.status}`);
      }

      setStatus("success");
      setForm(initialForm);
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Error al conectar con el servidor.");
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0d0d0d;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Mono', monospace;
        }

        .shell {
          width: 100%;
          max-width: 560px;
          padding: 24px;
        }

        .card {
          background: #141414;
          border: 1px solid #2a2a2a;
          border-radius: 2px;
          padding: 48px 44px;
          position: relative;
          overflow: hidden;
        }

        .card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, #c8f542 0%, #42f5a7 100%);
        }

        .eyebrow {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #c8f542;
          margin-bottom: 12px;
        }

        h1 {
          font-family: 'DM Serif Display', serif;
          font-size: 32px;
          color: #f0f0f0;
          line-height: 1.15;
          margin-bottom: 36px;
          font-weight: 400;
        }

        h1 em {
          font-style: italic;
          color: #c8f542;
        }

        .field {
          margin-bottom: 22px;
        }

        label {
          display: block;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #666;
          margin-bottom: 8px;
        }

        input[type="text"],
        input[type="number"],
        textarea {
          width: 100%;
          background: #0d0d0d;
          border: 1px solid #2a2a2a;
          border-radius: 2px;
          padding: 12px 14px;
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          color: #e0e0e0;
          transition: border-color 0.15s ease;
          outline: none;
          resize: none;
        }

        input[type="text"]:focus,
        input[type="number"]:focus,
        textarea:focus {
          border-color: #c8f542;
        }

        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }

        textarea { height: 90px; line-height: 1.6; }

        .toggle-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 32px;
        }

        .toggle-label {
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #666;
        }

        .toggle {
          position: relative;
          width: 40px;
          height: 22px;
        }

        .toggle input { opacity: 0; width: 0; height: 0; }

        .toggle-track {
          position: absolute;
          inset: 0;
          background: #2a2a2a;
          border-radius: 22px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .toggle input:checked + .toggle-track { background: #c8f542; }

        .toggle-track::after {
          content: '';
          position: absolute;
          top: 3px; left: 3px;
          width: 16px; height: 16px;
          background: #0d0d0d;
          border-radius: 50%;
          transition: transform 0.2s;
        }

        .toggle input:checked + .toggle-track::after { transform: translateX(18px); }

        .btn {
          width: 100%;
          padding: 14px;
          background: #c8f542;
          color: #0d0d0d;
          border: none;
          border-radius: 2px;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
        }

        .btn:hover:not(:disabled) { opacity: 0.88; }
        .btn:active:not(:disabled) { transform: scale(0.99); }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .feedback {
          margin-top: 16px;
          padding: 12px 14px;
          border-radius: 2px;
          font-size: 11px;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .feedback.success {
          background: rgba(200, 245, 66, 0.08);
          border: 1px solid rgba(200, 245, 66, 0.25);
          color: #c8f542;
        }

        .feedback.error {
          background: rgba(245, 80, 66, 0.08);
          border: 1px solid rgba(245, 80, 66, 0.25);
          color: #f55042;
        }

        .dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .success .dot { background: #c8f542; }
        .error .dot { background: #f55042; }

        .spinner {
          display: inline-block;
          width: 12px; height: 12px;
          border: 1.5px solid #0d0d0d;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          vertical-align: middle;
          margin-right: 6px;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="shell">
        <div className="card">
          <p className="eyebrow">Nest CRUD · Products</p>
          <h1>Nuevo <em>producto</em></h1>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Nombre</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="ej. Laptop Pro 16"
                required
              />
            </div>

            <div className="field">
              <label>Descripción</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Descripción del producto..."
                required
              />
            </div>

            <div className="field">
              <label>Precio (USD)</label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className="toggle-row">
              <label className="toggle">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleChange}
                />
                <span className="toggle-track" />
              </label>
              <span className="toggle-label">
                {form.isActive ? "Producto activo" : "Producto inactivo"}
              </span>
            </div>

            <button className="btn" type="submit" disabled={status === "loading"}>
              {status === "loading" ? (
                <><span className="spinner" />Enviando...</>
              ) : (
                "Crear producto"
              )}
            </button>
          </form>

          {status === "success" && (
            <div className="feedback success">
              <span className="dot" />
              Producto creado correctamente.
            </div>
          )}

          {status === "error" && (
            <div className="feedback error">
              <span className="dot" />
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
