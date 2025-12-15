import { gql } from '@apollo/client';

export const GET_PRODUCT_DETAIL_QUERY = gql`
  query Product($id: ID!) {
    product(id: $id) {
      id
      name
      price
      description
      stock
      builderImage
      galleryImages
    }
  }
`;

export const GET_PRODUCTS_QUERY = gql`
  query Products {
    products {
      id
      name
      price
      builderImage
      description
    }
  }
`;