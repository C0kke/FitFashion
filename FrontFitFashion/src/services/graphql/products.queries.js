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
      categories
      styles
    }
  }
`;

export const GET_PRODUCTS_QUERY = gql`
  query Products {
    products {
      id
      name
      price
      galleryImages
      builderImage
      description
      categories
      styles
    }
  }
`;

export const CREATE_PRODUCT_MUTATION = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      status
      message
      product_id
    }
  }
`;