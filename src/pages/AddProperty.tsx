import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, Check } from 'lucide-react';
import { supabase } from '../core/supabase';
import Swal from 'sweetalert2';
import './AddProperty.css';

const PROPERTY_TYPES = [
    'Single Room',
    'Organization',
    'Commercial',
    'Family House',
    'Store'
];

const AMENITIES = [
    { id: 'amenity_kitchen', label: 'Kitchen' },
    { id: 'amenity_water', label: 'Water' },
    { id: 'amenity_toilet', label: 'Toilet' },
    { id: 'amenity_shower', label: 'Shower' }
];

const AddProperty: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        sqm: '',
        city: 'Yabello',
        location: '',
        phone: '',
        type: 'Family House',
        description: '',
        bedrooms: '',
        bathrooms: '',
        amenities: [] as string[]
    });
    const [images, setImages] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setImages(prev => [...prev, ...files]);

            const newPreviews = files.map(file => URL.createObjectURL(file));
            setPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const toggleAmenity = (id: string) => {
        setFormData(prev => ({
            ...prev,
            amenities: prev.amenities.includes(id)
                ? prev.amenities.filter(a => a !== id)
                : [...prev.amenities, id]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // 1. Upload Images
            const imageUrls: string[] = [];
            for (const image of images) {
                const fileName = `${Date.now()}-${image.name}`;
                const { data, error } = await supabase.storage
                    .from('properties')
                    .upload(`${user.id}/${fileName}`, image);

                if (error) throw error;

                const { data: { publicUrl } } = supabase.storage
                    .from('properties')
                    .getPublicUrl(data.path);

                imageUrls.push(publicUrl);
            }

            // 2. Insert Property
            const { error } = await supabase.from('properties').insert({
                user_id: user.id,
                name: formData.name,
                location: formData.location,
                city: formData.city,
                price: parseFloat(formData.price),
                type: formData.type,
                description: formData.description,
                bedrooms: formData.type === 'Family House' ? (parseInt(formData.bedrooms) || 0) : 0,
                bathrooms: formData.type === 'Family House' ? (parseInt(formData.bathrooms) || 0) : 0,
                area: parseFloat(formData.sqm) || 0,
                phone_number: formData.phone,
                image_url: imageUrls[0] || 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=600',
                images: imageUrls,
                amenities: formData.amenities,
                is_verified: true,
                verification_status: 'verified'
            });

            if (error) throw error;

            await Swal.fire({
                title: 'Success!',
                text: 'Property has been added successfully.',
                icon: 'success',
                confirmButtonColor: '#1A1A2E'
            });

            navigate('/properties');
        } catch (err: any) {
            Swal.fire({
                title: 'Error',
                text: err.message || 'Failed to add property',
                icon: 'error',
                confirmButtonColor: '#1A1A2E'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="add-property-container">
            <div className="add-property-header">
                <button className="back-button" onClick={() => navigate(-1)}>
                    <ArrowLeft size={24} />
                </button>
                <h1>Add Property</h1>
            </div>

            <form onSubmit={handleSubmit} className="add-property-form">
                {/* Image Section */}
                <div className="section-container">
                    <label className="field-label">Upload Images</label>
                    <div className="image-picker-container">
                        <label className="image-picker-box">
                            {previews.length === 0 ? (
                                <div className="picker-placeholder">
                                    <Upload size={42} className="picker-icon" />
                                    <span>Add Image</span>
                                </div>
                            ) : (
                                <div className="image-previews-grid">
                                    {previews.map((url, i) => (
                                        <div key={i} className="preview-card">
                                            <img src={url} alt="Preview" />
                                            <button type="button" onClick={() => removeImage(i)} className="remove-btn">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="add-more-box">
                                        <Upload size={24} />
                                    </div>
                                </div>
                            )}
                            <input type="file" multiple accept="image/*" onChange={handleImageChange} hidden={previews.length > 0} />
                            {previews.length > 0 && <input type="file" multiple accept="image/*" onChange={handleImageChange} hidden />}
                        </label>
                    </div>
                </div>

                {/* Basic Info */}
                <div className="section-container">
                    <label className="field-label">Property Title</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g. Modern Family House"
                        className="vibe-input"
                        required
                    />
                </div>

                <div className="fields-row">
                    <div className="field-item">
                        <label className="field-label">Price per Month</label>
                        <input
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleInputChange}
                            placeholder="0.00"
                            className="vibe-input"
                            required
                        />
                    </div>
                    <div className="field-item">
                        <label className="field-label">SQM Area</label>
                        <input
                            type="number"
                            name="sqm"
                            value={formData.sqm}
                            onChange={handleInputChange}
                            placeholder="0"
                            className="vibe-input"
                        />
                    </div>
                </div>

                <div className="section-container">
                    <label className="field-label">City</label>
                    <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="e.g. Yabello"
                        className="vibe-input"
                    />
                </div>

                <div className="section-container">
                    <label className="field-label">Kebele (Address)</label>
                    <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        placeholder="e.g. Kebele 01"
                        className="vibe-input"
                        required
                    />
                </div>

                <div className="section-container">
                    <label className="field-label">Phone Number</label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="e.g. +251911..."
                        className="vibe-input"
                        required
                    />
                </div>

                <div className="section-container">
                    <label className="field-label">Category</label>
                    <select name="type" value={formData.type} onChange={handleInputChange} className="vibe-select">
                        {PROPERTY_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>

                {formData.type === 'Family House' && (
                    <div className="fields-row">
                        <div className="field-item">
                            <label className="field-label">Bedrooms</label>
                            <input
                                type="number"
                                name="bedrooms"
                                value={formData.bedrooms}
                                onChange={handleInputChange}
                                placeholder="0"
                                className="vibe-input"
                            />
                        </div>
                        <div className="field-item">
                            <label className="field-label">Bathrooms</label>
                            <input
                                type="number"
                                name="bathrooms"
                                value={formData.bathrooms}
                                onChange={handleInputChange}
                                placeholder="0"
                                className="vibe-input"
                            />
                        </div>
                    </div>
                )}

                <div className="section-container">
                    <label className="field-label">Select Amenities</label>
                    <div className="amenities-wrap">
                        {AMENITIES.map(amenity => (
                            <button
                                key={amenity.id}
                                type="button"
                                className={`amenity-chip ${formData.amenities.includes(amenity.id) ? 'active' : ''}`}
                                onClick={() => toggleAmenity(amenity.id)}
                            >
                                {formData.amenities.includes(amenity.id) && <Check size={14} />}
                                <span>{amenity.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="section-container">
                    <label className="field-label">Description</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Describe your property..."
                        className="vibe-textarea"
                        rows={5}
                    ></textarea>
                </div>

                <div className="form-submit-container">
                    <button type="submit" className="vibe-submit-btn" disabled={loading}>
                        {loading ? 'Submitting...' : 'Submit Property'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddProperty;
