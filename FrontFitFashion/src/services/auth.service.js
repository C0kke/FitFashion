import client from './graphql/client';
import { 
    LOGIN_MUTATION, 
    REGISTER_MUTATION, 
    ME_QUERY, 
    UPDATE_PROFILE_MUTATION,
    ADMIN_GET_USERS,
    ADMIN_UPDATE_USER,
    SET_PASSWORD_MUTATION
} from './graphql/auth.queries';

export const authService = {
    login: async (username, password) => {
        try {
            const result = await client.mutate({
                mutation: LOGIN_MUTATION,
                variables: { username, password }
            });
            
            if (result.data && result.data.login) {
                return result.data.login;
            }
            
            return null;

        } catch (error) {
            throw error;
        }
    },
    register: async (userData) => {
        const { data } = await client.mutate({
            mutation: REGISTER_MUTATION,
            variables: { ...userData }
        });
        return { ...data.register, status: 201 }; 
    },

    getCurrentUser: async () => {
        try {
        const { data } = await client.query({
            query: ME_QUERY,
            fetchPolicy: 'network-only'
        });
        
        if (!data.me || !data.me.user) return null;
        
        return {
            status: 200,
            ...data.me.user
        };
        } catch (error) {
            console.error("Error en getCurrentUser", error);
            throw error;
        }
    },

    updateProfile: async (profileData) => {
        const { data } = await client.mutate({
            mutation: UPDATE_PROFILE_MUTATION,
            variables: { 
                first_name: profileData.first_name,
                email: profileData.email,
                addresses: profileData.addresses
            }
        });
        return { data: data.updateProfile.user };
    },

    getAllUsers: async () => {
        const { data } = await client.query({
            query: ADMIN_GET_USERS,
            fetchPolicy: 'network-only'
        });
        return { data: data.users };
    },

    updateUserAdmin: async (id, updateData) => {
        const dataString = JSON.stringify(updateData);
        const { data } = await client.mutate({
            mutation: ADMIN_UPDATE_USER,
            variables: { id, data: dataString }
        });
        return data.updateUserAdmin;
    },

    changePassword: async (current_password, new_password) => {
        const { data } = await client.mutate({
        mutation: SET_PASSWORD_MUTATION,
        variables: { 
            current_password, 
            new_password, 
            re_new_password: new_password
        }
        });
        return data.setPassword;
    }
};