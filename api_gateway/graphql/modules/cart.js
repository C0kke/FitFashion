const rabbitRequest = require('../../utils/rabbitRequest'); 

const typeDefs = `#graphql
    type CartItem {
        # El ID es el ID del ítem en el carrito (o el Product ID si lo prefieres)
        id: ID! 
        product_id: ID!
        quantity: Int!
        # Estos campos vienen del ms_products, pero ms_cart los incluye en la respuesta
        price: Int! 
        name: String
    }

    type Cart {
        id: ID!
        user_id: ID!
        items: [CartItem]!
        total: Int!
    }

    type CheckoutResponse {
        order_id: ID!
        status: String!
        payment_url: String!
    }

    extend type Query {
        getCart: Cart
    }

    extend type Mutation {
        addItemToCart(productId: ID!, quantity: Int!): Cart

        removeItemFromCart(productId: ID!): Cart

        checkout: CheckoutResponse
    }
`;

const resolvers = {
    Query: {
        getCart: async (_, __, context) => {
            const { user_id } = context; 
            if (!user_id) throw new Error("No autorizado. ID de usuario faltante.");
            
            const response = await rabbitRequest('cart_rpc_queue', {
                pattern: 'get_cart_by_user',
                data: { user_id: user_id } 
            });
            return response;
        },
    },

    Mutation: {
        addItemToCart: async (_, { productId, quantity }, context) => {
            const { user_id } = context;
            if (!user_id) throw new Error("No autorizado. ID de usuario faltante.");

            const response = await rabbitRequest('cart_rpc_queue', {
                pattern: 'add_item_to_cart',
                data: { user_id: user_id, product_id: productId, quantity: quantity } 
            });
            return response;
        },

        checkout: async (_, __, context) => {
            const { user_id, shipping_address } = context; // 🔑 Usamos ID y Dirección inyectados en gateway.js
            if (!user_id || !shipping_address) throw new Error("No autorizado. Falta ID o Dirección de Envío.");

            const payload = {
                user_id: user_id,
                shipping_address: shipping_address 
            };
            
            const response = await rabbitRequest('cart_rpc_queue', {
                pattern: 'process_checkout',
                data: payload 
            });
            return response;
        }
    }
};

module.exports = { typeDefs, resolvers };