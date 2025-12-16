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

  type ProductResponse {
    status: String
    message: String
    product_id: String
  }

  input CreateProductInput {
    name: String!
    price: Int!
    stock: Int!
    description: String
    layerIndex: Int
    builderImage: String!
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
  
  extend type Mutation {
    createProduct(input: CreateProductInput!): ProductResponse
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

  Mutation: {
    createProduct: async (_, { input }, context) => {
        const { rabbitChannel, responseEmitter, role } = context;

        if (role !== 'ADMIN' && role !== 'GESTOR') {
            throw new Error("No tienes permisos para crear productos");
        }

        // 2. Enviar mensaje a RabbitMQ
        const payload = {
            pattern: 'create_product',
            data: input 
        };

        // Enviamos a la cola 'products_queue'
        const response = await rabbitRequest(rabbitChannel, responseEmitter, 'products_queue', payload);
        
        // 3. Retornar respuesta
        return {
            status: 'success',
            message: 'Producto creado correctamente',
            product_id: response.id || 'N/A'
        };
    }
  },
};

module.exports = { typeDefs, resolvers };