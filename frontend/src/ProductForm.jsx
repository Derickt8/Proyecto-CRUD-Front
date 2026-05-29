import { useState, useEffect } from "react";

const API_URL = "http://localhost:3000/products";
const MEDIA_API_URL = "http://localhost:3000/media";
const CATEGORIES_URL = "http://localhost:3000/categories";
const initialForm = { nombre: "", descripcion: "", codigo: "", precio: "", stock: 0, imagen: "", imagenes: [], estado: 'ACTIVO', categoryId: "" };

export default function ProductForm({ productToEdit, setProductToEdit, form, setForm }) {
   const [categories, setCategories] = useState([]);
   const [mainImageFile, setMainImageFile] = useState(null);
   const [galleryFiles, setGalleryFiles] = useState([]);
   const [uploading, setUploading] = useState(false);
   const [toast, setToast] = useState({ show: false, message: "", type: "success" });
   const [activeTab, setActiveTab] = useState("upload");
   const [galleryLinkInput, setGalleryLinkInput] = useState("");

   useEffect(() => {
      fetch(CATEGORIES_URL)
         .then(r => r.ok ? r.json() : [])
         .then(data => setCategories(Array.isArray(data) ? data : (data.value || data.items || [])))
         .catch(() => setCategories([]));
   }, []);

   const showToast = (message, type = "success") => {
      setToast({ show: true, message, type });
      setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
   };

   const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

   const handleAddGalleryLink = () => {
      if (!galleryLinkInput.trim()) return;
      const url = galleryLinkInput.trim();
      setForm(prev => {
         const current = Array.isArray(prev.imagenes) ? prev.imagenes : [];
         if (current.includes(url)) return prev;
         return { ...prev, imagenes: [...current, url] };
      });
      setGalleryLinkInput("");
   };

   const handleGalleryLinkKeyDown = (e) => {
      if (e.key === 'Enter') {
         e.preventDefault();
         handleAddGalleryLink();
      }
   };

   const handleRemoveMain = () => {
      setForm(prev => ({ ...prev, imagen: "" }));
   };

   const handleRemoveFromGallery = (url) => {
      setForm(prev => ({
         ...prev,
         imagenes: (prev.imagenes || []).filter(u => u !== url)
      }));
   };

   const handleMainImageChange = (e) => {
      if (e.target.files && e.target.files[0]) {
         setMainImageFile(e.target.files[0]);
      }
   };

   const handleGalleryChange = (e) => {
      if (e.target.files) {
         setGalleryFiles(Array.from(e.target.files));
      }
   };

   // Subir archivos a Drive (independiente)
   const handleUploadToDrive = async () => {
      if (!mainImageFile && galleryFiles.length === 0) {
         showToast("Selecciona al menos un archivo para subir.", "error");
         return;
      }
      setUploading(true);
      try {
         const formData = new FormData();
         if (mainImageFile) {
            formData.append('imagenPrincipal', mainImageFile);
         }
         if (galleryFiles.length > 0) {
            galleryFiles.forEach((file) => formData.append('galeria', file));
         }

         const res = await fetch(`${API_URL}/upload-to-drive`, {
            method: "POST",
            body: formData,
         });

         if (!res.ok) {
            const err = await res.json();
            showToast("Error al subir: " + (err.message || "Error desconocido"), "error");
            return;
         }

         const data = await res.json();
         // Poblar las URLs en el formulario automáticamente
         setForm(prev => ({
            ...prev,
            imagen: data.imagenPrincipal || prev.imagen,
            imagenes: [...(prev.imagenes || []), ...(data.galeria || [])],
         }));
         // Limpiar archivos seleccionados
         setMainImageFile(null);
         setGalleryFiles([]);
         showToast(`¡Archivos subidos! Principal: ${data.imagenPrincipal ? '✓' : '—'}, Galería: ${(data.galeria || []).length} archivos`);
      } catch (err) {
         showToast("Error de conexión al subir archivos: " + err.message, "error");
      } finally {
         setUploading(false);
      }
   };

   // Registrar producto con JSON
   const handleSubmit = async (e) => {
      e.preventDefault();

      if (!form.nombre || !form.nombre.trim()) {
         showToast("Por favor, ingresa el nombre del producto", "error");
         return;
      }
      if (!form.codigo || !form.codigo.trim()) {
         showToast("Por favor, ingresa el ID UNICO (Código / SKU)", "error");
         return;
      }
      if (!form.categoryId) {
         showToast("Por favor, selecciona una Categoría para el producto", "error");
         return;
      }

      const url = productToEdit ? `${API_URL}/${productToEdit.id}` : API_URL;

      const formData = { ...form };
      delete formData.id;
      delete formData.createdAt;
      delete formData.updatedAt;
      delete formData.categoria;
      delete formData.category;
      delete formData.media;

      const payload = {
         ...formData,
         precio: Number(formData.precio),
         stock: Number(formData.stock)
      };

      try {
         const res = await fetch(url, {
            method: productToEdit ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
         });
         if (!res.ok) {
            const err = await res.json();
            const msg = Array.isArray(err.message) ? err.message.join('\n') : err.message;
            showToast("Error al guardar: " + msg, "error");
            return;
         }
         showToast(productToEdit ? "Producto actualizado correctamente" : "Producto registrado correctamente");
         setProductToEdit(null);
         setForm(initialForm);
      } catch (err) {
         showToast("Error de conexión: " + err.message, "error");
      }
   };

   const getDriveId = (url) => {
      if (!url) return "";
      const match = url.match(/(?:id=|\/file\/d\/|\/d\/|thumbnail\?id=)([^&/]+)/);
      return match ? match[1] : "";
   };

   const isMediaVideo = (url) => {
      if (!url) return false;
      return url.match(/\.(mp4|webm|avi|mov)(?:[?#]|$)/i) || url.includes('preview');
   };

   const getThumbnailUrl = (item) => {
      if (!item) return "";
      const urlStr = String(item);
      const hashMatch = urlStr.match(/#([^#]+)$/);
      const hash = hashMatch ? `#${hashMatch[1]}` : "";
      const driveIdMatch = urlStr.match(/(?:id=|\/file\/d\/|\/d\/|thumbnail\?id=)([^&/]+)/);
      if (driveIdMatch && (urlStr.includes('drive.google.com') || urlStr.includes('docs.google.com') || urlStr.includes('googleusercontent.com'))) {
         const driveId = driveIdMatch[1];
         return `${MEDIA_API_URL}/file/${driveId}${hash}`;
      }
      return urlStr;
   };

   return (
      <div className="card">
         {/* Toast de notificación */}
         {toast.show && (
            <div style={{
               position: 'fixed',
               top: '20px',
               right: '20px',
               padding: '12px 24px',
               borderRadius: '8px',
               backgroundColor: toast.type === 'error' ? '#fde8e8' : '#eafaf1',
               color: toast.type === 'error' ? '#9b1c1c' : '#03543f',
               border: `1px solid ${toast.type === 'error' ? '#fbd5d5' : '#def7ec'}`,
               boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
               zIndex: 9999,
               display: 'flex',
               alignItems: 'center',
               gap: '8px',
               animation: 'slideIn 0.3s ease-out',
               fontWeight: 500,
               fontSize: '14px'
            }}>
               <span>{toast.type === 'error' ? '❌' : '✅'}</span>
               {toast.message}
            </div>
         )}

         <div className="card-header">
            <span>{productToEdit ? "Editar Producto" : "Registrar Nuevo Producto"}</span>
         </div>

         <div className="card-body">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
               {/* SECCIÓN 1: MULTIMEDIA */}
               <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '20px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                     <span style={{ backgroundColor: 'var(--color-primary)', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>1</span>
                     Multimedia
                  </h4>
                  
                  {/* Segmented Control / Tabs */}
                  <div style={{ display: 'flex', backgroundColor: 'var(--color-light)', padding: '4px', borderRadius: '8px', marginBottom: '16px', maxWidth: '400px' }}>
                     <button
                        type="button"
                        onClick={() => setActiveTab("upload")}
                        style={{
                           flex: 1,
                           padding: '8px 12px',
                           borderRadius: '6px',
                           border: 'none',
                           fontSize: '13px',
                           fontWeight: 500,
                           cursor: 'pointer',
                           backgroundColor: activeTab === "upload" ? '#fff' : 'transparent',
                           color: activeTab === "upload" ? 'var(--color-text)' : 'var(--color-muted)',
                           boxShadow: activeTab === "upload" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                           transition: 'all 0.2s'
                        }}
                     >
                        📤 Cargar Archivo Local
                     </button>
                     <button
                        type="button"
                        onClick={() => setActiveTab("link")}
                        style={{
                           flex: 1,
                           padding: '8px 12px',
                           borderRadius: '6px',
                           border: 'none',
                           fontSize: '13px',
                           fontWeight: 500,
                           cursor: 'pointer',
                           backgroundColor: activeTab === "link" ? '#fff' : 'transparent',
                           color: activeTab === "link" ? 'var(--color-text)' : 'var(--color-muted)',
                           boxShadow: activeTab === "link" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                           transition: 'all 0.2s'
                        }}
                     >
                        🔗 Vincular Enlace de la Nube
                     </button>
                  </div>

                  {activeTab === "upload" ? (
                     /* SUBIDA DE ARCHIVOS A DRIVE */
                     <div style={{ border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '16px', backgroundColor: '#fafbfb', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                        <p style={{ fontSize: '12px', color: 'var(--color-muted)', margin: 0 }}>
                           Selecciona archivos locales para subirlos automáticamente a Google Drive y vincularlos a este producto.
                        </p>
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                           <div style={{ flex: '1 1 240px' }}>
                              <label style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>Imagen Principal</label>
                              <input type="file" accept="image/*,video/*" onChange={handleMainImageChange} style={{ fontSize: '13px' }} />
                              {mainImageFile && <div style={{ fontSize: '12px', color: 'var(--color-primary)', marginTop: '4px' }}>✓ {mainImageFile.name}</div>}
                           </div>
                           <div style={{ flex: '2 1 400px' }}>
                              <label style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>Galería (Max 10)</label>
                              <input type="file" multiple accept="image/*,video/*" onChange={handleGalleryChange} style={{ fontSize: '13px' }} />
                              {galleryFiles.length > 0 && <div style={{ fontSize: '12px', color: 'var(--color-primary)', marginTop: '4px' }}>✓ {galleryFiles.length} archivos seleccionados</div>}
                           </div>
                        </div>
                        <button
                           type="button"
                           onClick={handleUploadToDrive}
                           disabled={uploading || (!mainImageFile && galleryFiles.length === 0)}
                           style={{
                              padding: '10px 24px',
                              backgroundColor: uploading ? '#94a3b8' : '#2563eb',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: uploading ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              alignSelf: 'flex-start',
                              transition: 'background-color 0.2s'
                           }}
                        >
                           {uploading ? '⏳ Subiendo...' : '☁️ Subir a Google Drive'}
                        </button>
                     </div>
                  ) : (
                     /* VINCULAR ENLACE DE LA NUBE */
                     <div style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: '16px', backgroundColor: '#fafbfb', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                           Vincula recursos desde la nube pegando sus enlaces de Google Drive.
                        </span>
                        
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                           {/* Imagen Principal Link */}
                           <div style={{ flex: '1 1 240px' }}>
                              <label style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>Enlace de Imagen Principal</label>
                              <input
                                 type="text"
                                 name="imagen"
                                 value={form.imagen}
                                 onChange={handleChange}
                                 placeholder="Pegue aquí el enlace copiado desde el módulo Multimedia..."
                                 style={{ padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                              />
                           </div>
                           
                           {/* Galería Links */}
                           <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'block', fontWeight: 500 }}>Añadir Enlace a la Galería</label>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                 <input
                                    type="text"
                                    value={galleryLinkInput}
                                    onChange={(e) => setGalleryLinkInput(e.target.value)}
                                    onKeyDown={handleGalleryLinkKeyDown}
                                    placeholder="Pegue enlace y presione Enter para añadir..."
                                    style={{ flex: 1, padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                                 />
                                 <button
                                    type="button"
                                    onClick={handleAddGalleryLink}
                                    style={{
                                       padding: '10px 16px',
                                       backgroundColor: '#7c3aed',
                                       color: '#fff',
                                       border: 'none',
                                       borderRadius: '8px',
                                       fontSize: '13px',
                                       fontWeight: 600,
                                       cursor: 'pointer',
                                       transition: 'background-color 0.2s'
                                    }}
                                 >
                                    ➕ Añadir
                                 </button>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {/* VISTA PREVIA AUTOMÁTICA */}
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '16px' }}>
                     {/* Imagen Principal del Producto */}
                     <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>Imagen Principal del Producto</span>
                        {form.imagen ? (
                           <div style={{ 
                              position: 'relative', 
                              border: '1px solid var(--color-border)', 
                              borderRadius: '8px', 
                              overflow: 'hidden', 
                              backgroundColor: 'var(--color-light)', 
                              height: '150px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                           }}>
                              {isMediaVideo(form.imagen) ? (
                                 <video src={getThumbnailUrl(form.imagen)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} controls />
                              ) : (
                                 <img 
                                    src={getThumbnailUrl(form.imagen)} 
                                    alt="Principal" 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    onError={(e) => {
                                       e.target.onerror = null;
                                       e.target.src = 'https://via.placeholder.com/300x150?text=Imagen+No+Válida';
                                    }}
                                    loading="lazy" 
                                 />
                              )}
                              <button
                                 type="button"
                                 onClick={handleRemoveMain}
                                 style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    backgroundColor: 'rgba(239, 68, 68, 0.9)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '12px'
                                 }}
                                 title="Quitar imagen"
                              >
                                 ×
                              </button>
                           </div>
                        ) : (
                           <div style={{
                              border: '2px dashed var(--color-border)',
                              borderRadius: '8px',
                              height: '150px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--color-muted)',
                              fontSize: '13px',
                              backgroundColor: '#fff',
                              textAlign: 'center',
                              padding: '16px'
                           }}>
                              <span style={{ fontSize: '24px', marginBottom: '4px' }}>📷</span>
                              <span style={{ fontWeight: 500 }}>Sin imagen principal asignada</span>
                           </div>
                        )}
                     </div>

                     {/* Galería Adicional */}
                     <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>Galería Adicional ({form.imagenes?.length || 0})</span>
                        <div style={{
                           border: '1px solid var(--color-border)',
                           borderRadius: '8px',
                           padding: '12px',
                           minHeight: '150px',
                           maxHeight: '150px',
                           overflowY: 'auto',
                           backgroundColor: '#fff',
                           display: 'flex',
                           gap: '10px',
                           flexWrap: 'wrap',
                           alignContent: 'flex-start'
                        }}>
                           {form.imagenes && form.imagenes.length > 0 ? (
                              form.imagenes.map((url, idx) => (
                                 <div key={idx} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-light)' }}>
                                    {isMediaVideo(url) ? (
                                       <video src={getThumbnailUrl(url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                       <img 
                                          src={getThumbnailUrl(url)} 
                                          alt={`Gallery ${idx}`} 
                                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                          onError={(e) => {
                                             e.target.onerror = null;
                                             e.target.src = 'https://via.placeholder.com/60?text=Error';
                                          }}
                                          loading="lazy" 
                                       />
                                    )}
                                    
                                    <button
                                       type="button"
                                       onClick={() => handleRemoveFromGallery(url)}
                                       style={{
                                          position: 'absolute',
                                          top: '2px',
                                          right: '2px',
                                          width: '16px',
                                          height: '16px',
                                          borderRadius: '50%',
                                          backgroundColor: 'rgba(239, 68, 68, 0.9)',
                                          color: '#fff',
                                          border: 'none',
                                          fontSize: '10px',
                                          fontWeight: 'bold',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          cursor: 'pointer',
                                          padding: 0
                                       }}
                                    >
                                       ×
                                    </button>
                                 </div>
                              ))
                           ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '120px', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', fontSize: '13px' }}>
                                 <span style={{ fontSize: '20px', marginBottom: '2px' }}>🎞️</span>
                                 <span>Galería vacía.</span>
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               </div>

               {/* SECCIÓN 2: DATOS GENERALES */}
               <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '20px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                     <span style={{ backgroundColor: 'var(--color-primary)', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>2</span>
                     Datos Generales
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                     <div>
                        <label style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>Nombre del producto</label>
                        <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Teclado Gamer Logitech" required />
                     </div>

                     <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                           <label style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>ID UNICO (Código / SKU)</label>
                           <input name="codigo" value={form.codigo} onChange={handleChange} placeholder="SKU-123" required />
                        </div>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                           <label style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>Categoría</label>
                           <select name="categoryId" value={form.categoryId} onChange={handleChange} required>
                              <option value="" disabled>Seleccione una...</option>
                              {categories.map(cat => (
                                 <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                              ))}
                           </select>
                        </div>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                           <label style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>Estado</label>
                           <select name="estado" value={form.estado} onChange={handleChange}>
                              <option value="ACTIVO">ACTIVO</option>
                              <option value="INACTIVO">INACTIVO</option>
                              <option value="BORRADOR">BORRADOR</option>
                           </select>
                        </div>
                     </div>

                     <div>
                        <label style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>Descripción técnica</label>
                        <textarea
                           name="descripcion"
                           value={form.descripcion}
                           onChange={handleChange}
                           onInvalid={(e) => e.target.setCustomValidity("La descripción técnica es obligatoria.")}
                           onInput={(e) => e.target.setCustomValidity("")}
                           rows={3}
                           placeholder="Características del equipo..."
                           required
                        />
                     </div>
                  </div>
               </div>

               {/* SECCIÓN 3: PRECIOS Y STOCK */}
               <div style={{ paddingBottom: '10px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                     <span style={{ backgroundColor: 'var(--color-primary)', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>3</span>
                     Precios y Stock
                  </h4>

                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                     <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>Precio Unitario ($)</label>
                        <input
                           type="number"
                           step="0.01"
                           min="0"
                           name="precio"
                           value={form.precio}
                           onChange={handleChange}
                           placeholder="0.00"
                           required
                           style={{ color: form.precio === "" ? 'rgba(0,0,0,0.3)' : 'inherit' }}
                        />
                     </div>
                     <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>Stock Disponible</label>
                        <input
                           type="number"
                           name="stock"
                           value={form.stock === 0 && form.stock !== "0" && form.stock !== 0 ? "" : form.stock}
                           onChange={handleChange}
                           placeholder="0"
                           required
                           style={{ color: form.stock === "" ? 'rgba(0,0,0,0.3)' : 'inherit' }}
                        />
                     </div>
                  </div>
               </div>

               {/* ACCIONES DEL FORMULARIO */}
               <div style={{ display: 'flex', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                  <button 
                     type="submit" 
                     className="btn btn-primary"
                     style={{
                        padding: '14px 36px',
                        fontSize: '16px',
                        fontWeight: '700',
                        backgroundColor: '#1d4ed8', // Azul Intenso / de alta visibilidad
                        color: '#ffffff',
                        boxShadow: '0 4px 10px rgba(29, 78, 216, 0.3)',
                        minWidth: '220px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        border: 'none'
                     }}
                  >
                     {productToEdit ? "Guardar cambios" : "Registrar producto"}
                  </button>
                  {productToEdit && (
                     <button 
                        type="button" 
                        className="btn btn-ghost" 
                        onClick={() => setProductToEdit(null)}
                        style={{ padding: '14px 24px', fontSize: '15px' }}
                     >
                        Cancelar edición
                     </button>
                  )}
               </div>
            </form>
         </div>

         {/* Estilos CSS Dinámicos para animaciones */}
         <style>{`
            @keyframes spin {
               0% { transform: rotate(0deg); }
               100% { transform: rotate(360deg); }
            }
            @keyframes fadeIn {
               from { opacity: 0; }
               to { opacity: 1; }
            }
            @keyframes scaleIn {
               from { transform: scale(0.95); opacity: 0; }
               to { transform: scale(1); opacity: 1; }
            }
            @keyframes slideIn {
               from { transform: translateY(-10px); opacity: 0; }
               to { transform: translateY(0); opacity: 1; }
            }
         `}</style>
      </div>
   );
}
