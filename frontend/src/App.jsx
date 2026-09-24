import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import NewPatientFlow from './pages/NewPatientFlow';
import VisitDetail from './pages/VisitDetail';
import DoctorQueue from './pages/DoctorQueue';
import DoctorConsultation from './pages/DoctorConsultation';
import Pharmacy from './pages/Pharmacy';
import Inventory from './pages/Inventory';
import Tests from './pages/Tests';
import Billing from './pages/Billing';
import BillingPatient from './pages/BillingPatient';
import BillDetail from './pages/BillDetail';
import Audit from './pages/Audit';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="patients" element={<Patients />} />
        <Route path="patients/new" element={<NewPatientFlow />} />
        <Route path="patients/:id" element={<PatientDetail />} />
        <Route path="visits/:id" element={<VisitDetail />} />
        <Route path="doctor/queue" element={<DoctorQueue />} />
        <Route path="doctor/consultation/:token" element={<DoctorConsultation />} />
        <Route path="pharmacy" element={<Pharmacy />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="tests" element={<Tests />} />
        <Route path="billing" element={<Billing />} />
        <Route path="billing/:patientId" element={<BillingPatient />} />
        <Route path="bills/:billId" element={<BillDetail />} />
        <Route path="audit" element={<Audit />} />
      </Route>
    </Routes>
  );
}
