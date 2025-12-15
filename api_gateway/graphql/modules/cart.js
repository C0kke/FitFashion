const rabbitRequest = require('../../utils/rabbitRequest'); 

const typeDefs = `#graphql
    type CartItem {
        id: ID! 
        product_id: ID!
        quantity: Int!
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
            const { user_id, rabbitChannel, responseEmitter } = context; 
            
            if (!user_id) throw new Error("No autorizado. ID de usuario faltante.");
            
            const payload = {
                pattern: 'get_cart_by_user',
                data: { user_id: user_id } 
            };
            
            return await rabbitRequest(rabbitChannel, responseEmitter, 'cart_rpc_queue', payload);
        },
    },

    Mutation: {
        addItemToCart: async (_, { productId, quantity }, context) => {
            const { user_id, rabbitChannel, responseEmitter } = context; 
            console.log("Agregar al carrito - user_id:", user_id, "productId:", productId, "quantity:", quantity);
            
            if (!user_id) throw new Error("No autorizado. ID de usuario faltante.");

            const payload = {
                pattern: 'adjust_item_quantity',
                data: { user_id: user_id, product_id: productId, quantity: quantity } 
            };
            
            return await rabbitRequest(rabbitChannel, responseEmitter, 'cart_rpc_queue', payload);
        },

        checkout: async (_, __, context) => {
            const { user_id, shipping_address, rabbitChannel, responseEmitter } = context; 
            
            if (!user_id || !shipping_address) {
                throw new Error("No es posible completar el checkout. Faltan datos de usuario o dirección.");
            }

            const payload = {
                pattern: 'process_checkout',
                data: { 
                    user_id: user_id,
                    shipping_address: shipping_address
                } 
            };
            
            return await rabbitRequest(rabbitChannel, responseEmitter, 'cart_rpc_queue', payload);
        }
    }
};

module.exports = { typeDefs, resolvers };