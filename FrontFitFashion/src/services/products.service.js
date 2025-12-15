import client from './graphql/client';

import { 
    GET_PRODUCT_DETAIL_QUERY,
    GET_PRODUCTS_QUERY
} from './graphql/products.queries';

export const productService = {
    getProductById: async (id) => {
        try {
            const { data } = await client.query({
                query: GET_PRODUCT_DETAIL_QUERY,
                variables: { id },
                fetchPolicy: 'network-only'
            });
            return data.product;
        } catch (error) {
            console.error("Error obteniendo producto:", error);
            throw error;
        }
    },

    getAllProducts: async () => {
        try {
            const { data } = await client.query({
                query: GET_PRODUCTS_QUERY,
                fetchPolicy: 'network-only'
            });
            return data.products;
        } catch (error) {
            console.error("Error obteniendo lista de productos:", error);
            throw error;
        }
    }
};