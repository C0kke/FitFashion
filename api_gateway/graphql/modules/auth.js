const { sendKafkaRequest } = require('../../utils/kafkaRequest'); 

const typeDefs = `#graphql
  type User {
    id: ID
    username: String
    email: String
    first_name: String
    last_name: String
    role: String
    date_joined: String
  }

  type AuthResponse {
    status: Int
    message: String
    token: String
    auth_token: String
    user: User
    users: [User]
    count: Int
  }

  extend type Query {
    me: AuthResponse
    users: AuthResponse
  }

  extend type Mutation {
    login(username: String!, password: String!): AuthResponse
    
    register(
      username: String!, 
      password: String!, 
      email: String!, 
      name: String
    ): AuthResponse

    updateProfile(
      first_name: String,
      email: String
    ): AuthResponse

    setPassword(
      current_password: String!, 
      new_password: String!, 
      re_new_password: String!
    ): AuthResponse

    updateUserAdmin(
      id: ID!,
      data: String! 
    ): AuthResponse
  }
`;

const resolvers = {
  Query: {
    me: async (_, __, context) => {
      const { producer, responseEmitter, token } = context;
      if (!token) throw new Error("No autorizado");
      return await sendKafkaRequest(producer, responseEmitter, 'auth-request', 'GET_PROFILE', {}, token);
    },
    
    users: async (_, __, context) => {
      const { producer, responseEmitter } = context;
      const response = await sendKafkaRequest(producer, responseEmitter, 'auth-request', 'LIST_USERS', {});
      if (response && response.results) {
          response.users = response.results;
      }
      return response;
    }
  },

  Mutation: {
    login: async (_, { username, password }, context) => {
      const { producer, responseEmitter } = context;
      const result = await sendKafkaRequest(producer, responseEmitter, 'auth-request', 'LOGIN', { username, password });
      
      if (result.token && !result.auth_token) result.auth_token = result.token;
      return result;
    },

    register: async (_, { username, password, email, name }, context) => {
      const { producer, responseEmitter } = context;
      return await sendKafkaRequest(producer, responseEmitter, 'auth-request', 'REGISTER', { username, password, email, first_name: name });
    },

    updateProfile: async (_, args, context) => {
      const { producer, responseEmitter, token } = context;
      if (!token) throw new Error("No autorizado");
      return await sendKafkaRequest(producer, responseEmitter, 'auth-request', 'UPDATE_PROFILE', { data: args }, token);
    },

    setPassword: async (_, args, context) => {
      const { producer, responseEmitter, token } = context;
      if (!token) throw new Error("No autorizado");
      
      return await sendKafkaRequest(
        producer, 
        responseEmitter, 
        'auth-request', 
        'SET_PASSWORD', 
        args,
        token
      );
    },

    updateUserAdmin: async (_, { id, data }, context) => {
      const { producer, responseEmitter, token } = context;
      if (!token) throw new Error("No autorizado");
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      return await sendKafkaRequest(producer, responseEmitter, 'auth-request', 'ADMIN_UPDATE_USER', { target_id: id, data: parsedData }, token);
    }
  }
};

module.exports = { typeDefs, resolvers };