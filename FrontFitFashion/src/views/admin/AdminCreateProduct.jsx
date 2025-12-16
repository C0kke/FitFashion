import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productService } from '../../services/products.service'; // Asegurando la ruta correcta ../../
import './styles/AdminCreateProduct.css';

const AdminCreateProduct = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [statusMsg, setStatusMsg] = useState(""); 

    // Estado del formulario (Quitamos layerIndex de aquí porque será fijo)
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

    // --- CONFIGURACIÓN CLOUDINARY ---
    const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Manejo de imagen del Maniquí 
    const handleAssetImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAssetImage(file);
            setAssetPreview(URL.createObjectURL(file));
        }
    };

    // Manejo de imágenes de Galería
    const handleGalleryImagesChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setGalleryImages(prev => [...prev, ...files]);
            const newPreviews = files.map(file => URL.createObjectURL(file));
            setGalleryPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeGalleryImage = (index) => {
        setGalleryImages(prev => prev.filter((_, i) => i !== index));
        setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
    };

    // --- FUNCIÓN DE SUBIDA A CLOUDINARY ---
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
        setStatusMsg("Iniciando carga de imágenes...");

        try {
            // 1. Validaciones
            if (!assetImage) throw new Error("Debes subir la imagen para el maniquí.");
            if (galleryImages.length === 0) throw new Error("Debes subir al menos una imagen para la galería.");

            // 2. Subir Asset (Maniquí)
            setStatusMsg("Subiendo imagen del maniquí...");
            const assetUrl = await uploadToCloudinary(assetImage);

            // 3. Subir Galería 
            setStatusMsg(`Subiendo ${galleryImages.length} imágenes de galería...`);
            const galleryUploadPromises = galleryImages.map(file => uploadToCloudinary(file));
            const galleryUrls = await Promise.all(galleryUploadPromises);

            // 4. Preparar Payload limpio
            setStatusMsg("Guardando producto en base de datos...");
            
            const productPayload = {
                name: formData.name,
                price: parseInt(formData.price),
                stock: parseInt(formData.stock),
                description: formData.description,
                categories: formData.categories.split(',').map(c => c.trim()).filter(Boolean),
                styles: formData.styles.split(',').map(s => s.trim()).filter(Boolean),
                
                layerIndex: 1, 
                
                builderImage: assetUrl,   
                galleryImages: galleryUrls 
            };

            // 5. Llamar al servicio
            await productService.createProduct(productPayload);
            
            alert('¡Producto creado exitosamente!');
            navigate('/'); 

        } catch (err) {
            console.error(err);
            setError(err.message || "Error al crear producto");
        } finally {
            setLoading(false);
            setStatusMsg("");
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