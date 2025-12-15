import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      status
      message
      token
      user {
        id
        username
        email
        first_name
        role
        addresses
      }
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($username: String!, $password: String!, $email: String!, $name: String) {
    register(username: $username, password: $password, email: $email, name: $name) {
      status
      message
    }
  }
`;

export const ME_QUERY = gql`
  query Me {
    me {
      status
      user {
        id
        username
        first_name
        email
        role
        addresses
      }
    }
  }
`;

export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($first_name: String, $email: String, $addresses: [String]) {
    updateProfile(first_name: $first_name, email: $email, addresses: $addresses) {
      status
      message
      user {
        first_name
        email
        username
        addresses
      }
    }
  }
`;

export const ADMIN_GET_USERS = gql`
  query GetUsers {
    users {
      results: users {
        id
        username
        email
        first_name
        role
        date_joined
        addresses
      }
    }
  }
`;

export const ADMIN_UPDATE_USER = gql`
  mutation UpdateUserAdmin($id: ID!, $data: String!) {
    updateUserAdmin(id: $id, data: $data) {
      status
      message
    }
  }
`;

export const SET_PASSWORD_MUTATION = gql`
  mutation SetPassword($current_password: String!, $new_password: String!, $re_new_password: String!) {
    setPassword(current_password: $current_password, new_password: $new_password, re_new_password: $re_new_password) {
      status
      message
    }
  }
`;