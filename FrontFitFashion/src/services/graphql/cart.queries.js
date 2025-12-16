import { gql } from '@apollo/client';

export const GET_CART_QUERY = gql`
    query GetUserCartFull {
        getCart {
        user_id
        totalPrice
        items {
            productId
            quantity
            nameSnapshot
            unitPrice
            subtotal
        }
    }
    }
`;


export const ADD_TO_CART_MUTATION = gql`
    mutation AddItemToCart($productId: ID!, $quantity: Int!) {
        addItemToCart(productId: $productId, quantity: $quantity) {
        items {
            productId
            quantity
        }
        }
    }
`;

export const REMOVE_FROM_CART_MUTATION = gql`
    mutation RemoveItem($productId: ID!) {
        removeItemFromCart(productId: $productId) {
        items {
            productId
            quantity
        }
        }
    }
`;

export const CHECKOUT_MUTATION = gql`
    mutation Checkout {
        checkout {
        order_id
        status
        payment_url
        }
    }
`;

export const GET_USER_ORDERS = gql`
    query GetUserOrders {
        getUserOrders {
        id
        total
        status
        shipping_address
        created_at # Si agregaste fecha en el schema, si no, bórralo
        order_items {
            productID    # OJO: Verifica si en tu schema 'OrderItem' es 'productID' o 'product_id'
            quantity
            unitPrice
            nameSnapshot
        }
        }
    }
`;

export const GET_ALL_ORDERS = gql`
    query GetAllOrders {
        getAllOrders {
        id
        user_id      # Útil para saber de quién es la orden
        total
        status
        shipping_address
        order_items {
            productID
            quantity
        }
        }
    }
`;