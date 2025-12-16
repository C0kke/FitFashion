import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productService } from '../../services/products.service'; // Asegurando la ruta correcta ../../
import './styles/AdminCreateProduct.css';

const AdminCreateProduct = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [statusMsg, setStatusMsg] = useState(""); 

    const MAX_FILE_SIZE = 5 * 1024 * 1024;

    // Estado del formulario
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        stock: '',
        description: '',
        categories: '', 
        styles: '',     
    });

    // Estado para las imágenes 
    const [assetImage, setAssetImage] = useState(null); 
    const [assetPreview, setAssetPreview] = useState(null);

    const [galleryImages, setGalleryImages] = useState([]); 
    const [galleryPreviews, setGalleryPreviews] = useState([]);

    // Cloudinary Config
    const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    // Manejo de cambios en inputs de texto
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Manejo de imagen del Maniquí 
    const handleAssetImageChange = (e) => {
        setError(null); 
        const file = e.target.files[0];
        
        if (file) {
            if (file.size > MAX_FILE_SIZE) {
                setError("La imagen del maniquí es muy pesada (Máx 5MB).");
                e.target.value = "";
                return;
            }
            if (!file.type.startsWith('image/')) {
                setError("El archivo del maniquí debe ser una imagen válida.");
                return;
            }
            setAssetImage(file);
            setAssetPreview(URL.createObjectURL(file));
        }
    };

    // Manejo de imágenes de Galería
    const handleGalleryImagesChange = (e) => {
        setError(null);
        const files = Array.from(e.target.files);
        let errorMsg = "";
        
        // Filtrar archivos válidos
        const validFiles = files.filter(file => {
            if (file.size > MAX_FILE_SIZE) {
                aerrorMsg = `La imagen "${file.name}" pesa más de 5MB y fue ignorada.`;
                return false;
            }
            return true;
        });

        if (validFiles.length > 0) {
            // Máximo 5 imágenes en total
            if (galleryImages.length + validFiles.length > 5) {
                setError("Solo puedes tener un máximo de 5 imágenes en la galería. Se ignoraron algunas.");
                return;
            }

            setGalleryImages(prev => [...prev, ...validFiles]);
            const newPreviews = validFiles.map(file => URL.createObjectURL(file));
            setGalleryPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeGalleryImage = (index) => {
        setGalleryImages(prev => prev.filter((_, i) => i !== index));
        setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
    };

    // Subir a Cloudinary
    const uploadToCloudinary = async (file) => {
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", UPLOAD_PRESET);
        data.append("cloud_name", CLOUD_NAME);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: "POST",
            body: data
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(`Error subiendo imagen: ${errData.error?.message || 'Desconocido'}`);
        }

        const fileData = await res.json();
        return fileData.secure_url; 
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setStatusMsg("Validando datos...");

        try {
            // Limpiar espacios en blanco al inicio y final
            const cleanName = formData.name.trim();
            const cleanDesc = formData.description.trim();
            const cleanPrice = parseInt(formData.price);
            const cleanStock = parseInt(formData.stock);

            // Validaciones de Texto
            if (!cleanName) throw new Error("El nombre del producto no puede estar vacío.");
            if (cleanName.length < 3) throw new Error("El nombre es muy corto.");
            if (!cleanDesc) throw new Error("La descripción es obligatoria.");

            // Validaciones Numéricas
            if (isNaN(cleanPrice) || cleanPrice < 0) throw new Error("El precio debe ser un número válido mayor o igual a 0.");
            if (isNaN(cleanStock) || cleanStock < 0) throw new Error("El stock debe ser un número válido mayor o igual a 0.");

            // Validaciones de Listas
            const cleanCategories = formData.categories.split(',').map(c => c.trim()).filter(Boolean);
            const cleanStyles = formData.styles.split(',').map(s => s.trim()).filter(Boolean);

            if (cleanCategories.length === 0) throw new Error("Debes agregar al menos una categoría válida.");
            if (cleanStyles.length === 0) throw new Error("Debes agregar al menos un estilo.");

            // Validaciones de Imágenes
            if (!assetImage) throw new Error("Falta la imagen del maniquí (Asset).");
            if (galleryImages.length === 0) throw new Error("Falta al menos una imagen en la galería.");

            setStatusMsg("Subiendo imagen del maniquí...");
            const assetUrl = await uploadToCloudinary(assetImage);

            setStatusMsg(`Subiendo ${galleryImages.length} imágenes de galería...`);
            const galleryUploadPromises = galleryImages.map(file => uploadToCloudinary(file));
            const galleryUrls = await Promise.all(galleryUploadPromises);

            // Preparar payload
            setStatusMsg("Guardando producto en base de datos...");
            
            const productPayload = {
                name: cleanName,
                price: cleanPrice,
                stock: cleanStock,
                description: cleanDesc,
                categories: cleanCategories,
                styles: cleanStyles,
                layerIndex: 1, // Valor fijo
                builderImage: assetUrl,   
                galleryImages: galleryUrls 
            };

            // Enviar al backend
            await productService.createProduct(productPayload);
            
            // Éxito
            setStatusMsg("¡Producto creado exitosamente!");
            setTimeout(() => {
                navigate('/'); 
            }, 1500);

        } catch (err) {
            console.error(err);
            setError(err.message || "Error al crear producto");
            setStatusMsg(""); 
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-create-container">
            <div className="create-card">
                <h2>Crear Nuevo Producto</h2>
                
                {error && <div className="error-banner">{error}</div>}
                {statusMsg && <div className="status-banner">{statusMsg}</div>}

                <form onSubmit={handleSubmit} className="create-form">
                    
                    {/* SECCIÓN 1: DATOS BÁSICOS */}
                    <div className="form-section">
                        <h3>Información General</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Nombre del Producto</label>
                                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group short">
                                <label>Precio ($)</label>
                                <input type="number" name="price" value={formData.price} onChange={handleInputChange} required min="0" />
                            </div>
                            <div className="form-group short">
                                <label>Stock Inicial</label>
                                <input type="number" name="stock" value={formData.stock} onChange={handleInputChange} required min="0" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Descripción</label>
                            <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3" required />
                        </div>
                    </div>

                    {/* SECCIÓN 2: CATEGORIZACIÓN */}
                    <div className="form-section">
                        <h3>Categorización</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Categorías (separadas por coma)</label>
                                <input type="text" name="categories" value={formData.categories} onChange={handleInputChange} placeholder="Ej: Poleras, Verano, Ofertas" />
                            </div>
                            <div className="form-group">
                                <label>Estilos (separados por coma)</label>
                                <input type="text" name="styles" value={formData.styles} onChange={handleInputChange} placeholder="Ej: Casual, Urbano" />
                            </div>
                            {/* ELIMINADO: Input de Layer Index */}
                        </div>
                    </div>

                    {/* SECCIÓN 3: IMÁGENES */}
                    <div className="form-section images-section">
                        <h3>Imágenes</h3>
                        
                        {/* Maniquí Asset */}
                        <div className="image-upload-box">
                            <label>Imagen para Probador (PNG Transparente)</label>
                            <input type="file" accept="image/png" onChange={handleAssetImageChange} />
                            {assetPreview && (
                                <div className="preview-box single">
                                    <img src={assetPreview} alt="Preview Asset" />
                                </div>
                            )}
                        </div>

                        {/* Galería */}
                        <div className="image-upload-box">
                            <label>Galería de Fotos (Max 5)</label>
                            <input type="file" accept="image/*" multiple onChange={handleGalleryImagesChange} />
                            <div className="gallery-grid">
                                {galleryPreviews.map((src, index) => (
                                    <div key={index} className="preview-box">
                                        <img src={src} alt={`Gallery ${index}`} />
                                        <button type="button" className="btn-remove-img" onClick={() => removeGalleryImage(index)}>×</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={() => navigate('/')}>Cancelar</button>
                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? 'Procesando...' : 'Publicar Producto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminCreateProduct;