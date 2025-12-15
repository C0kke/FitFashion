const { makeExecutableSchema } = require('@graphql-tools/schema');

const authModule = require('./modules/auth');
// const cartModule = require('./modules/cart');
const productModule = require('./modules/products');

const rootTypeDefs = `#graphql
  type Query {
    _empty: String
  }
  type Mutation {
    _empty: String
  }
`;

const schema = makeExecutableSchema({
  typeDefs: [
    rootTypeDefs, 
    authModule.typeDefs,
    // cartModule.typeDefs 
    productModule.typeDefs
  ],
  resolvers: [
    authModule.resolvers,
    // cartModule.resolvers
    productModule.resolvers
  ]
});

module.exports = schema;