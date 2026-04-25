import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardRedirect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      if (user.papel === 'super_admin') {
        navigate('/backoffice');
      } else if (user.papel === 'medico') {
        navigate('/medico');
      } else if (user.papel === 'admin') {
        navigate('/clinico');
      } else if (user.papel === 'atendente') {
        navigate('/clinico');
      } else {
        // Fallback
        navigate('/login');
      }
    } else if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
    </div>
  );
}
