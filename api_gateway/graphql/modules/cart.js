const rabbitRequest = require('../../utils/rabbitRequest'); 

const typeDefs = `#graphql
    type CartItem {
        productId: ID!
        quantity: Int!
        nameSnapshot: String!
        unitPrice: Int!
        subtotal: Int!
    }

    type Cart {
        user_id: ID!
        items: [CartItem]!
        totalPrice: Int! 
    }

    type OrderItem {
        orderID: ID!
        productID: ID!
        nameSnapshot: String!
        unitPrice: Int!
        quantity: Int!
    }

    type Order {
        id: ID!
        total: Int!
        status: String!
        shipping_address: String!
        order_items: [OrderItem]!
    }

    type CheckoutResponse {
        order_id: ID!
        status: String!
        payment_url: String!
    }

    extend type Query {
        getCart: Cart
        getUserOrders: [Order!]!
        getAllOrders: [Order!]!
    }

    extend type Mutation {
        addItemToCart(productId: ID!, quantity: Int!): Cart
        removeItemFromCart(productId: ID!): Cart
        checkout(shippingAddress: String!): CheckoutResponse
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

        getUserOrders: async (_, __, context) => {
            const { user_id, rabbitChannel, responseEmitter } = context; 
            
            if (!user_id) throw new Error("No autorizado. ID de usuario faltante.");
            
            const payload = {
                pattern: 'get_user_orders', 
                data: { user_id: user_id } 
            };

            return await rabbitRequest(rabbitChannel, responseEmitter, 'cart_rpc_queue', payload);
        },

        getAllOrders: async (_, __, context) => {
            const { rabbitChannel, responseEmitter } = context; 
            
            const payload = {
                pattern: 'get_all_orders', 
                data: {} 
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

        checkout: async (_, { shippingAddress }, context) => {
            const { user_id, shipping_address, rabbitChannel, responseEmitter } = context; 
            
            if (!user_id) {
                throw new Error("No es posible completar el checkout. Faltan datos de usuario.");
            }

            const payload = {
                pattern: 'process_checkout',
                data: { 
                    user_id: user_id,
                    shipping_address: shippingAddress
                } 
            };
            
            return await rabbitRequest(rabbitChannel, responseEmitter, 'cart_rpc_queue', payload);
        },

        removeItemFromCart: async (_, { productId }, context) => {
            const { user_id, rabbitChannel, responseEmitter } = context; 
        
            if (!user_id) throw new Error("No autorizado. ID de usuario faltante.");

            const payload = {
                pattern: 'remove_item_from_cart',
                data: { 
                    user_id: user_id, 
                    product_id: productId
                } 
            };
            return await rabbitRequest(rabbitChannel, responseEmitter, 'cart_rpc_queue', payload);
        },
    },

    Order: {
        id: (parent) => parent.ID,
        total: (parent) => parent.Total,    
        status: (parent) => parent.Status,
        shipping_address: (parent) => parent.ShippingAddress,
        order_items: (parent) => parent.OrderItems,
    },

    OrderItem: {
        orderID: (parent) => parent.OrderID,
        productID: (parent) => parent.ProductID,
        nameSnapshot: (parent) => parent.NameSnapshot,
        unitPrice: (parent) => parent.UnitPrice,
        quantity: (parent) => parent.Quantity,
    }
};

module.exports = { typeDefs, resolvers };