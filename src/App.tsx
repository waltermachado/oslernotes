import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import DashboardRedirect from './pages/DashboardRedirect';
import BackofficeLayout from './pages/backoffice/BackofficeLayout';
import BackofficeClinicasPage from './pages/backoffice/BackofficeClinicasPage';
import BackofficeClinicaDetalhePage from './pages/backoffice/BackofficeClinicaDetalhePage';
import BackofficePlanosPage from './pages/backoffice/BackofficePlanosPage';
import BackofficeAuditoriaPage from './pages/backoffice/BackofficeAuditoriaPage';
import BackofficeNotificacoesPage from './pages/backoffice/BackofficeNotificacoesPage';
import ClinicoLayout from './pages/clinico/ClinicoLayout';
import ClinicoPlaceholderPage from './pages/clinico/ClinicoPlaceholderPage';
import ClinicoPainelPage from './pages/clinico/ClinicoPainelPage';
import ClinicoPacientesPage from './pages/clinico/ClinicoPacientesPage';
import ClinicoProntuariosPage from './pages/clinico/ClinicoProntuariosPage';
import ClinicoProntuarioPacientePage from './pages/clinico/ClinicoProntuarioPacientePage';
import ClinicoFilaPage from './pages/clinico/ClinicoFilaPage';

const Atendimento = () => <div className="p-8"><h1>Módulo Atendimento (Em breve)</h1></div>;

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route path="/dashboard" element={<DashboardRedirect />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
            <Route path="/backoffice" element={<BackofficeLayout />}>
              <Route index element={<Navigate to="clinicas" replace />} />
              <Route path="clinicas" element={<BackofficeClinicasPage />} />
              <Route path="clinicas/:clinicId" element={<BackofficeClinicaDetalhePage />} />
              <Route path="planos" element={<BackofficePlanosPage />} />
              <Route path="auditoria" element={<BackofficeAuditoriaPage />} />
              <Route path="notificacoes" element={<BackofficeNotificacoesPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin', 'medico', 'atendente']} />}>
            <Route path="/clinico" element={<ClinicoLayout />}>
              <Route index element={<Navigate to="painel" replace />} />
              <Route path="agenda" element={<ClinicoPlaceholderPage title="Agenda" />} />
              <Route path="fila" element={<ClinicoFilaPage />} />
              <Route path="painel" element={<ClinicoPainelPage />} />
              <Route path="pacientes" element={<ClinicoPacientesPage />} />
              <Route path="prontuarios" element={<ClinicoProntuariosPage />} />
              <Route path="prontuarios/:patientId" element={<ClinicoProntuarioPacientePage />} />
              <Route path="exames" element={<ClinicoPlaceholderPage title="Exames" />} />
              <Route path="chat" element={<ClinicoPlaceholderPage title="Chat" />} />
              <Route path="financeiro" element={<ClinicoPlaceholderPage title="Financeiro" />} />
              <Route path="configuracoes" element={<ClinicoPlaceholderPage title="Configurações" />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['medico']} />}>
            <Route path="/medico" element={<ClinicoLayout basePath="/medico" />}>
              <Route index element={<Navigate to="painel" replace />} />
              <Route path="agenda" element={<ClinicoPlaceholderPage title="Agenda" />} />
              <Route path="fila" element={<ClinicoFilaPage />} />
              <Route path="painel" element={<ClinicoPainelPage />} />
              <Route path="pacientes" element={<ClinicoPacientesPage />} />
              <Route path="prontuarios" element={<ClinicoProntuariosPage />} />
              <Route path="prontuarios/:patientId" element={<ClinicoProntuarioPacientePage />} />
              <Route path="exames" element={<ClinicoPlaceholderPage title="Exames" />} />
              <Route path="chat" element={<ClinicoPlaceholderPage title="Chat" />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin', 'atendente']} />}>
            <Route path="/atendimento" element={<Atendimento />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
