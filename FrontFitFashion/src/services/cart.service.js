import client from './graphql/client';
import { 
    GET_CART_QUERY, 
    ADD_TO_CART_MUTATION, 
    REMOVE_FROM_CART_MUTATION,
    GET_ALL_ORDERS,
    GET_USER_ORDERS,
    CHECKOUT_MUTATION
} from './graphql/cart.queries';

export const cartService = {
    getCart: async () => {
        try {
            const result = await client.query({
                query: GET_CART_QUERY,
                fetchPolicy: 'network-only'
            });
            
            if (result.errors) {
                throw new Error(result.errors[0].message || 'Error de GraphQL al obtener el carrito.');
            }
            const cartData = result.data.getCart;
            if (!cartData) return null;
            return {
                status: 200,
                id: cartData.user_id, 
                total_price: cartData.totalPrice,
                items: cartData.items.map(item => ({
                    id: item.productId, 
                    quantity: item.quantity,
                    subtotal: item.subtotal,
                    price: item.unitPrice, 
                    name: item.nameSnapshot, 
                }))
            };
        } catch (error) {
            console.error("Error obteniendo el carrito", error);
            throw error;
        }
    },

    addToCart: async (productId, quantity = 1) => {
        try {
            const result = await client.mutate({
                mutation: ADD_TO_CART_MUTATION,
                variables: { productId, quantity }
            });

            if (result.errors) {
                throw new Error(result.errors[0].message || 'Error de GraphQL.');
            }

            const cartData = result.data.addItemToCart; 

            if (!cartData) {
                 throw new Error('Respuesta del servidor incompleta o nula después de addItemToCart.');
            }
            return {
                cart: cartData,
                status: 200,
                message: 'Item agregado con éxito'
            };

        } catch (error) {
                console.error("Error al agregar item:", error);
        }
    },

    removeItem: async (itemId) => {
        try {
            const { data } = await client.mutate({
                mutation: REMOVE_FROM_CART_MUTATION,
                variables: { productId: itemId } 
            });
            return { 
                status: 200,
                cart: data.removeFromCart
            };
        } catch (error) {
            console.error("Error al eliminar item:", error);
            throw error;
        }
    },

    checkout: async (shippingAddressId) => {
        try {
            const { data } = await client.mutate({
                mutation: CHECKOUT_MUTATION,
                variables: { shippingAddressId }
            });
            return {
                status: data.createOrder.status,
                message: data.createOrder.message,
                order: data.createOrder.order
            };
        } catch (error) {
            console.error("Error en checkout", error);
            throw error;
        }
    },

    getUserOrders: async () => {
        try {
            const { data } = await client.query({
                query: GET_USER_ORDERS,
                fetchPolicy: 'network-only'
            });
            
            return {
                status: 200,
                orders: data.myOrders
            };
        } catch (error) {
            console.error("Error obteniendo mis órdenes", error);
            throw error;
        }
    },

    getAllOrders: async () => {
        try {
            const { data } = await client.query({
                query: GET_ALL_ORDERS,
                fetchPolicy: 'network-only'
            });

            return {
                status: 200,
                orders: data.allOrders
            };
        } catch (error) {
            console.error("Error obteniendo todas las órdenes (Admin)", error);
            throw error;
        }
    }
};