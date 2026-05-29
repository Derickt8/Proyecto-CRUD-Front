import { useState, useEffect } from "react";
import { io } from "socket.io-client";

const API_URL = "http://localhost:3000/media";
const SOCKET_URL = "http://localhost:3000";

export default function MediaGallery() {
   const [mediaFiles, setMediaFiles] = useState([]);
   const [loadingMedia, setLoadingMedia] = useState(false);
   const [syncing, setSyncing] = useState(false);
   const [searchTerm, setSearchTerm] = useState("");
   const [selectedFolderCategory, setSelectedFolderCategory] = useState("Todos");
   const [toast, setToast] = useState({ show: false, message: "", type: "success" });
   const [visibleCount, setVisibleCount] = useState(60);

   const showToast = (message, type = "success") => {
      setToast({ show: true, message, type });
      setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
   };

   // Cargar archivos desde el backend (/media)
   const fetchMediaFiles = async () => {
      setLoadingMedia(true);
      try {
         const res = await fetch(API_URL);
         if (res.ok) {
            const data = await res.json();
            setMediaFiles(data);
         }
      } catch (err) {
         console.error("Error al obtener la lista de medios:", err);
         showToast("Error al obtener la lista de medios", "error");
      } finally {
         setLoadingMedia(false);
      }
   };

   // Sincronizar archivos de Google Drive
   const handleSyncDrive = async () => {
      setSyncing(true);
      try {
         const res = await fetch(`${API_URL}/sync`, { method: "POST" });
         if (res.ok) {
            showToast("Sincronización iniciada en segundo plano con Google Drive...");
         } else {
            const err = await res.json();
            showToast(err.message || "Error al iniciar sincronización", "error");
            setSyncing(false);
         }
      } catch (err) {
         console.error(err);
         showToast("Error de conexión al sincronizar con Google Drive", "error");
         setSyncing(false);
      }
   };

   // Eliminar archivo
   const handleDelete = async (id) => {
      if (window.confirm("¿Estás seguro de que deseas eliminar este elemento multimedia de la base de datos?")) {
         try {
            const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
            if (res.ok) {
               showToast("Archivo eliminado correctamente.");
            } else {
               showToast("Error al eliminar el archivo", "error");
            }
         } catch {
            showToast("Error de conexión al eliminar archivo", "error");
         }
      }
   };

   useEffect(() => {
      fetchMediaFiles();

      // WebSockets para sincronización en tiempo real
      const socket = io(SOCKET_URL);

      socket.on("mediaCreated", (newMedia) => {
         setMediaFiles((prev) => {
            if (prev.some((item) => item.id === newMedia.id)) return prev;
            return [newMedia, ...prev];
         });
      });

      socket.on("mediaDeleted", ({ id }) => {
         setMediaFiles((prev) => prev.filter((item) => item.id !== id));
      });

      socket.on("mediaSyncCompleted", (result) => {
         showToast(`¡Sincronización completada! Sincronizados: ${result.synced || 0}, Omitidos: ${result.skipped || 0}`);
         setSyncing(false);
         fetchMediaFiles();
      });

      return () => socket.disconnect();
   }, []);

   useEffect(() => {
      setVisibleCount(60);
   }, [searchTerm, selectedFolderCategory]);

   const getDriveId = (url) => {
      if (!url) return "";
      const match = url.match(/(?:id=|\/file\/d\/|\/d\/|thumbnail\?id=)([^&/]+)/);
      return match ? match[1] : "";
   };

   const isMediaVideo = (url, fileName) => {
      if (fileName && fileName.match(/\.(mp4|webm|avi|mov)$/i)) return true;
      if (url && (url.match(/\.(mp4|webm|avi|mov)$/i) || url.includes('preview'))) return true;
      return false;
   };

   const getThumbnailUrl = (item) => {
      if (!item) return "";
      const driveId = item.driveId;
      const fileName = item.fileName || item.originalName || '';
      const hash = fileName ? `#${fileName}` : '';
      if (driveId) {
         return `${API_URL}/file/${driveId}${hash}`;
      }
      const base = item.webContentLink || item.url || "";
      return base ? `${base}${hash}` : "";
   };

   const copyToClipboard = (text) => {
      navigator.clipboard.writeText(text);
      showToast("¡Enlace copiado al portapapeles!");
   };

   // Filtrar medios
   const folderCategoriesList = ["Todos", ...new Set(mediaFiles.map(m => m.folderCategory).filter(Boolean))];
   const filteredMedia = mediaFiles.filter(item => {
      const matchesSearch = (item.fileName || item.originalName || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedFolderCategory === "Todos" || item.folderCategory === selectedFolderCategory;
      return matchesSearch && matchesCategory;
   });

   const displayedMedia = filteredMedia.slice(0, visibleCount);

   return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '80vh' }}>
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

         {/* Cabecera idéntica al modal */}
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid var(--color-border)' }}>
            <div>
               <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)', display: 'flex', gap: '8px', alignItems: 'center', margin: 0 }}>
                  ☁️ Explorador de Google Drive Sincronizado
               </h3>
               <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px', marginBottom: 0 }}>
                  Visualiza imágenes y videos directamente de la nube para usarlos en el inventario o la aplicación móvil.
               </p>
            </div>
            <button 
               type="button" 
               className="btn btn-primary" 
               onClick={handleSyncDrive}
               disabled={syncing}
               style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', padding: '8px 16px', borderRadius: '8px' }}
            >
               <span style={{ display: 'inline-block', animation: syncing ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
               {syncing ? "Sincronizando..." : "Sincronizar Google Drive"}
            </button>
         </div>

         {/* Filtros de Búsqueda y Categorías idénticos al modal */}
         <div style={{ padding: '16px 20px', backgroundColor: '#fafbfb', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
               <input
                  placeholder="Buscar por Código de Producto / SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ flex: 1 }}
               />
               <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={fetchMediaFiles} 
                  disabled={loadingMedia}
                  style={{ fontSize: '13px', display: 'flex', gap: '6px', alignItems: 'center', backgroundColor: '#fff' }}
               >
                  <span>🔄</span> Refrescar
               </button>
            </div>

            {/* Píldoras de Carpetas / Categorías */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', overflowX: 'auto', paddingBottom: '4px' }}>
               {folderCategoriesList.map(catName => (
                  <button
                     key={catName}
                     type="button"
                     onClick={() => setSelectedFolderCategory(catName)}
                     style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: '1px solid var(--color-border)',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        backgroundColor: selectedFolderCategory === catName ? 'var(--color-primary)' : '#fff',
                        color: selectedFolderCategory === catName ? '#fff' : 'var(--color-muted)',
                        transition: 'all 0.15s ease'
                     }}
                  >
                     {catName}
                  </button>
               ))}
            </div>
         </div>

         {/* Contenedor del Listado (Grid / Vacío) idéntico al modal */}
         <div style={{ flex: 1, padding: '20px', backgroundColor: 'var(--color-bg)' }}>
            {loadingMedia ? (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--color-muted)' }}>
                  <span style={{ fontSize: '32px', animation: 'spin 1.5s linear infinite', display: 'inline-block' }}>⏳</span>
                  <span style={{ marginTop: '12px', fontWeight: 500 }}>Cargando archivos multimedia...</span>
               </div>
            ) : filteredMedia.length === 0 ? (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '350px', color: 'var(--color-muted)', textAlign: 'center' }}>
                  {/* Folder amarillo grande */}
                  <div style={{ fontSize: '72px', marginBottom: '16px' }}>📁</div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px' }}>
                     No se encontraron archivos en la nube.
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-muted)', maxWidth: '400px', margin: '0 auto', lineHeight: '1.5' }}>
                     Prueba sincronizando de nuevo o subiendo archivos a la carpeta raíz de Google Drive.
                  </p>
               </div>
            ) : (
               <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '16px'
               }}>
                  {displayedMedia.map((media) => {
                     const isVideo = isMediaVideo(media.url || media.webContentLink, media.fileName || media.originalName);
                     const thumbUrl = getThumbnailUrl(media);
                     const category = media.folderCategory || "General";

                     return (
                        <div
                           key={media.id}
                           className="media-card-hover"
                           style={{
                              backgroundColor: 'var(--color-card)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.01)',
                              position: 'relative',
                              transition: 'all 0.25s ease',
                           }}
                        >
                           {/* Preview */}
                           <div style={{ height: '110px', backgroundColor: 'var(--color-light)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                              {isVideo ? (
                                 <video src={thumbUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls={false} muted playsInline autoPlay loop />
                              ) : (
                                 <img 
                                    src={thumbUrl} 
                                    alt={media.fileName || media.originalName} 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    onError={(e) => {
                                       e.target.onerror = null;
                                       e.target.src = 'https://via.placeholder.com/180x110?text=Google+Drive';
                                    }}
                                    loading="lazy" 
                                 />
                              )}

                              {/* Category Badge - Ocultar si el usuario ya filtró por categoría (si no es Todos) */}
                              {selectedFolderCategory === "Todos" && (
                                 <span style={{
                                    position: 'absolute',
                                    top: '6px',
                                    left: '6px',
                                    fontSize: '9px',
                                    fontWeight: 600,
                                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                    color: '#fff',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    textTransform: 'uppercase',
                                    zIndex: 10
                                 }}>
                                    {category}
                                 </span>
                              )}

                              {/* Hover Actions Overlay */}
                              <div className="hover-action-overlay" style={{
                                 position: 'absolute',
                                 top: 0,
                                 left: 0,
                                 right: 0,
                                 bottom: 0,
                                 backgroundColor: 'rgba(15, 23, 42, 0.85)',
                                 display: 'flex',
                                 alignItems: 'center',
                                 justifyContent: 'center',
                                 gap: '12px',
                                 opacity: 0,
                                 transition: 'opacity 0.2s ease',
                                 zIndex: 20
                              }}>
                                 <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); copyToClipboard(thumbUrl); }}
                                    style={{
                                       backgroundColor: '#fff',
                                       border: 'none',
                                       borderRadius: '50%',
                                       width: '36px',
                                       height: '36px',
                                       display: 'flex',
                                       alignItems: 'center',
                                       justifyContent: 'center',
                                       cursor: 'pointer',
                                       fontSize: '16px',
                                       boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                       transition: 'transform 0.15s'
                                    }}
                                    title="Copiar Enlace"
                                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                 >
                                    📋
                                 </button>
                                 <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleDelete(media.id); }}
                                    style={{
                                       backgroundColor: '#f87171',
                                       border: 'none',
                                       borderRadius: '50%',
                                       width: '36px',
                                       height: '36px',
                                       display: 'flex',
                                       alignItems: 'center',
                                       justifyContent: 'center',
                                       cursor: 'pointer',
                                       fontSize: '16px',
                                       color: '#fff',
                                       boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                       transition: 'transform 0.15s'
                                    }}
                                    title="Eliminar"
                                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                 >
                                    🗑️
                                 </button>
                              </div>
                           </div>

                           {/* Info */}
                           <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, justifyContent: 'center' }}>
                              <span 
                                 style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', textAlign: 'center' }}
                                 title={media.fileName || media.originalName}
                              >
                                 {media.fileName || media.originalName}
                              </span>
                           </div>
                        </div>
                     );
                  })}

                  {filteredMedia.length > visibleCount && (
                     <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                        <button
                           type="button"
                           className="btn btn-primary"
                           onClick={() => setVisibleCount(prev => prev + 60)}
                           style={{
                              padding: '10px 24px',
                              fontSize: '13px',
                              fontWeight: 600,
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                           }}
                        >
                           Cargar más ({filteredMedia.length - visibleCount} restantes)
                        </button>
                     </div>
                  )}
               </div>
            )}
         </div>
         
         {/* Estilos CSS Dinámicos para animaciones */}
         <style>{`
            @keyframes spin {
               0% { transform: rotate(0deg); }
               100% { transform: rotate(360deg); }
            }
            @keyframes slideIn {
               from { transform: translateY(-10px); opacity: 0; }
               to { transform: translateY(0); opacity: 1; }
            }
            .media-card-hover:hover {
               transform: translateY(-3px);
               box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
            }
            .media-card-hover:hover .hover-action-overlay {
               opacity: 1 !important;
            }
         `}</style>
      </div>
   );
}
