import { client } from "../config/config.js";

export const AuthService = {
  async signIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signUp(email, password) {
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await client.auth.signOut();
    if (error) throw error;
  },

  async getUser() {
    const {
      data: { user },
    } = await client.auth.getUser();
    return user;
  },

  async getUserId() {
    const {
      data: { user },
    } = await client.auth.getUser();
    return user ? user.id : null;
  },

  // O Listener de estado fica aqui
  onAuthStateChange(callback) {
    return client.auth.onAuthStateChange(callback);
  },
};
