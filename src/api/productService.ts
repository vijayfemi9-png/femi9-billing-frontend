import api from './axios';

export const productService = {
    // Products
    getProducts: (params?: any) => api.get('/products', { params }),
    getProduct: (id: string | number) => api.get(`/products/${id}`, {
        headers: { 'Accept': 'application/json' }
    }),
    createProduct: (data: FormData) => api.post('/products', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    updateProduct: (id: string | number, data: FormData) => {
        // Laravel often requires _method=PUT for multipart/form-data updates via POST
        data.append('_method', 'PUT');
        return api.post(`/products/${id}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    deleteProduct: (id: string | number) => api.delete(`/products/${id}`),

    // Composite Items
    getCompositeItems: (params?: any) => api.get('/composite-items', { params }),
    getCompositeItem: (id: string | number) => api.get(`/composite-items/${id}`),
    createCompositeItem: (data: FormData) => api.post('/composite-items', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    updateCompositeItem: (id: string | number, data: FormData) => {
        data.append('_method', 'PUT');
        return api.post(`/composite-items/${id}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    deleteCompositeItem: (id: string | number) => api.delete(`/composite-items/${id}`),

    // Brands
    getBrands: () => api.get('/brands/list'),
    createBrand: (data: any) => api.post('/brands', data),
    updateBrand: (id: string | number, data: any) => api.put(`/brands/${id}`, data),
    deleteBrand: (id: string | number) => api.delete(`/brands/${id}`),

    // Categories
    getCategories: () => api.get('/categories/list'),
    createCategory: (data: any) => api.post('/categories', data),
    updateCategory: (id: string | number, data: any) => api.put(`/categories/${id}`, data),
    deleteCategory: (id: string | number) => api.delete(`/categories/${id}`),
};
