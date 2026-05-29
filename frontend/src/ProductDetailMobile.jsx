import './ProductDetailMobile.css';

const ProductDetailMobile = () => {
  return (
    <div className="pdp__container">
      {/* HERO MEDIA SECTION */}
      <section className="pdp__hero">
        <img 
          src="https://via.placeholder.com/600x400?text=Product+Image" 
          alt="Product Gallery" 
          className="pdp__hero-img"
        />
        <div className="pdp__hero-overlay"></div>
        
        <div className="pdp__hero-top-nav">
          <button className="pdp__icon-btn-dark">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          
          <div className="pdp__nav-right">
            <button className="pdp__icon-btn-dark">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </button>
            <button className="pdp__icon-btn-dark">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
            <button className="pdp__icon-btn-dark pdp__more-options">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
              <span className="pdp__notification-dot"></span>
            </button>
          </div>
        </div>

        <button className="pdp__play-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </button>

        <div className="pdp__hero-badge">
          Vídeo | Fotos 1/6
        </div>
      </section>

      {/* PRICING AND TITLE AREA */}
      <section className="pdp__section-card">
        <div className="pdp__price">US$ 189,62 / Pieza</div>
        <div className="pdp__inline-row">
          <span className="pdp__text-secondary">Pedido Mínimo: 1 Pieza</span>
          <button className="pdp__btn-outline-pill">Obtener la muestra</button>
        </div>
        <div className="pdp__trust-badge">
          ✔ Secured Trading
        </div>
        <p className="pdp__product-title">
          Monitor de juegos curvo 27 pulgadas 144Hz 1ms respuesta rápida panel IPS resolución 2K para PC y consolas.
        </p>
      </section>

      {/* SUPPLIER CARD */}
      <div className="pdp__supplier-card">
        <div className="pdp__supplier-info">
          <div className="pdp__supplier-name">Nanjing Keppel Technology Co., Ltd.</div>
          <div className="pdp__supplier-meta">
            <span className="pdp__badge-audited">Audited</span>
            <span className="pdp__text-secondary">3 yrs</span>
            <span className="pdp__star-rating">★ 5.0/5</span>
          </div>
        </div>
        <svg className="pdp__chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </div>

      {/* TABBED NAVIGATION */}
      <div className="pdp__tabs">
        <div className="pdp__tab pdp__tab--active">Visión General</div>
        <div className="pdp__tab">Detalles de Producto</div>
        <div className="pdp__tab">Recomendaciones</div>
      </div>

      {/* CONTENT SECTIONS */}
      <section className="pdp__section-card">
        <h3 className="pdp__section-title">Protección en el Comercio en Línea</h3>
        <div className="pdp__payment-badges">
          <span className="pdp__payment-badge">Visa</span>
          <span className="pdp__payment-badge">Mastercard</span>
          <span className="pdp__payment-badge">PayPal</span>
        </div>
        <div className="pdp__guarantee-list">
          <div className="pdp__guarantee-item">
            <svg className="pdp__check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span className="pdp__text-secondary">Protección de la calidad del producto</span>
          </div>
          <div className="pdp__guarantee-item">
            <svg className="pdp__check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span className="pdp__text-secondary">Protección de envío a tiempo</span>
          </div>
        </div>
      </section>

      <section className="pdp__section-card">
        <h3 className="pdp__section-title">Detalles Rápidos</h3>
        <div className="pdp__grid">
          <div className="pdp__grid-item">
            <span className="pdp__key">Application</span>
            <span className="pdp__value">Monitor</span>
          </div>
          <div className="pdp__grid-item">
            <span className="pdp__key">Aspect Ratio</span>
            <span className="pdp__value">16:9</span>
          </div>
        </div>
        <div className="pdp__divider"></div>
        <div className="pdp__grid">
          <div className="pdp__grid-item">
            <span className="pdp__key">Resolution</span>
            <span className="pdp__value">2560x1440</span>
          </div>
          <div className="pdp__grid-item">
            <span className="pdp__key">Panel Type</span>
            <span className="pdp__value">IPS</span>
          </div>
        </div>
        <div className="pdp__divider"></div>
        <div className="pdp__grid">
          <div className="pdp__grid-item">
            <span className="pdp__key">Response Time</span>
            <span className="pdp__value">1ms</span>
          </div>
          <div className="pdp__grid-item">
            <span className="pdp__key">Refresh Rate</span>
            <span className="pdp__value">144Hz</span>
          </div>
        </div>
      </section>

      <section className="pdp__section-card">
        <h3 className="pdp__section-title">Empaquetado y Entrega</h3>
        <div className="pdp__list-row">
          <span className="pdp__key">Package Size</span>
          <span className="pdp__value">68 x 42 x 18 cm</span>
        </div>
        <div className="pdp__list-row">
          <span className="pdp__key">Gross Weight</span>
          <span className="pdp__value">6.5 kg</span>
        </div>
      </section>

      {/* STICKY BOTTOM ACTION BAR */}
      <div className="pdp__bottom-bar">
        <button className="pdp__action-chat">
          <div className="pdp__chat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <span className="pdp__chat-text">Charlar</span>
        </button>
        <div className="pdp__action-btns">
          <button className="pdp__btn-ghost-pill">Enviar Consulta</button>
          <button className="pdp__btn-primary-pill">Iniciar Pedido</button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailMobile;
