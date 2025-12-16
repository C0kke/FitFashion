import client from './graphql/client';

import { 
    GET_PRODUCT_DETAIL_QUERY,
    GET_PRODUCTS_QUERY,
    CREATE_PRODUCT_MUTATION
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
    },

    createProduct: async (productData) => {
        try {
            // Usamos 'mutate' en lugar de 'query' para modificar datos
            const { data } = await client.mutate({
                mutation: CREATE_PRODUCT_MUTATION,
                variables: { input: productData },
                // RefetchQueries opcional: para actualizar la lista al volver al home
                refetchQueries: [{ query: GET_PRODUCTS_QUERY }] 
            });
            return data.createProduct;
        } catch (error) {
            console.error("Error creando producto:", error);
            throw error;
        }
    }
};