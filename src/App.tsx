import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import AdminUsers from './pages/AdminUsers';
import AdminStudents from './pages/AdminStudents';
import StudentDetail from './pages/StudentDetail';
import AdminLogs from './pages/AdminLogs';

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
    const { user, profile, loading } = useAuth();

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50/50 backdrop-blur-md">Carregando...</div>;
    
    if (!user) return <Navigate to="/login" replace />;

    if (roles && profile && !roles.includes(profile.role)) {
         return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout><Dashboard/></Layout></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><Layout><AdminUsers/></Layout></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute roles={['admin']}><Layout><AdminStudents/></Layout></ProtectedRoute>} />
          <Route path="/admin/logs" element={<ProtectedRoute roles={['admin']}><Layout><AdminLogs/></Layout></ProtectedRoute>} />
          <Route path="/student/:id" element={<ProtectedRoute><Layout><StudentDetail/></Layout></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
