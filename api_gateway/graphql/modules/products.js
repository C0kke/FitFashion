const rabbitRequest = require('../../utils/rabbitRequest');

// 1. Schemas
const typeDefs = `#graphql
  type Product {
    id: ID!
    name: String!
    price: Int!   
    description: String
    stock: Int
    layerIndex: Int
    builderImage: String
    galleryImages: [String]
    categories: [String]
    styles: [String]
  }

  extend type Query {
    # Obtener lista de productos (opcionalmente filtrados por categoría)
    products(category: String): [Product]
    
    # Obtener un producto específico por ID
    product(id: ID!): Product
  }
`;

// 2. Resolvers
const resolvers = {
  Query: {
    products: async (_, args, context) => {

      const { rabbitChannel, responseEmitter } = context;

      const response = await rabbitRequest(
        rabbitChannel,     
        responseEmitter,   
        'products_queue', 
        { 
          pattern: 'find_all_products', 
          data: { category: args.category } 
        }
      );
      return response;
    },

    product: async (_, args, context) => {
      const { rabbitChannel, responseEmitter } = context;

      const response = await rabbitRequest(
        rabbitChannel, 
        responseEmitter, 
        'products_queue', 
        { 
          pattern: 'find_one_product', 
          data: args.id 
        }
      );
      return response;
    },
  },
};

module.exports = { typeDefs, resolvers };