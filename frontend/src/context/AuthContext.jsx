import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
 const [user, setUser] = useState(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const initializeAuth = () => {
 try {
 const token = sessionStorage.getItem('token');
 const storedUser = sessionStorage.getItem('user');
 const storedRole = sessionStorage.getItem('role');

 if (token && storedUser) {
 const parsedUser = JSON.parse(storedUser);
 // Ensure role is present in state
 setUser({ ...parsedUser, role: storedRole || parsedUser.role });
 } else {
 sessionStorage.removeItem('token');
 sessionStorage.removeItem('user');
 sessionStorage.removeItem('role');
 }
 } catch (error) {
 console.error("Auth initialization failed:", error);
 sessionStorage.clear();
 } finally {
 setLoading(false);
 }
 };

 initializeAuth();
 }, []);

 const login = async (identifier, password, department) => {
 try {
 const response = await api.post('/auth/login', { identifier, password, department });
 const data = response.data;

 // Safe validation: success and token are absolutely required
 if (!data?.success || !data?.token) {
 console.error("Invalid response structure (missing success/token):", data);
 throw new Error("Invalid server response format");
 }

 // Role should exist (even if it's a fallback 'user')
 const role = data.role || data.user?.role || '';
 if (!role) {
 console.warn("User role is missing in response:", data);
 // We'll allow it for now but it will fail ProtectedRoute checks
 }

 // Persistence
 sessionStorage.setItem('token', data.token);
 sessionStorage.setItem('role', role);
 sessionStorage.setItem('user', JSON.stringify({ ...data.user, role }));

 const userData = { ...data.user, role };
 setUser(userData);
 return userData;
 } catch (error) {
 console.error("AuthContext Login Error:", error.message);
 throw error;
 }
 };

 const setAuthData = (data) => {
 const role = data.role || data.user?.role || '';
 sessionStorage.setItem('token', data.token);
 sessionStorage.setItem('role', role);
 sessionStorage.setItem('user', JSON.stringify({ ...data.user, role }));
 setUser({ ...data.user, role });
 };

 const logout = () => {
 sessionStorage.removeItem('token');
 sessionStorage.removeItem('user');
 sessionStorage.removeItem('role');
 setUser(null);
 };

 const updateUser = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    setUser(newUser);
    sessionStorage.setItem('user', JSON.stringify(newUser));
  };

 return (
 <AuthContext.Provider value={{ user, login, logout, setAuthData, updateUser, isAuthenticated: !!user, loading }}>
 {children}
 </AuthContext.Provider>
 );
};

export const useAuth = () => {
 const context = useContext(AuthContext);
 if (!context) {
 throw new Error('useAuth must be used within an AuthProvider');
 }
 return context;
};
