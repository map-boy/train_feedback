import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// ── Existing imports ──────────────────────────────────────────────────────────
import TeacherLogin         from './TeacherLogin';
import Dashboard            from './Dashboard';
import SurveyForm           from './SurveyForm';
import CustomerFeedbackForm from './CustomerFeedbackForm';
import SuccessScreen        from './SuccessScreen';

// ── FELIX imports ─────────────────────────────────────────────────────────────
import FelixTeacherDashboard from './FelixTeacherDashboard';
import FelixLiveProctor      from './FelixLiveProctor';
import FelixExamPage         from './FelixExamPage';
import FelixResultPage       from './FelixResult';
import FelixStudentEntry     from './FelixStudentEntry';

import {
  AppView,
  FelixUser, FelixExam, FelixResult,
  FelixPage, FelixSessionState,
} from './types';

const DEFAULT_TEACHER: FelixUser = { name: 'Teacher', email: '', role: 'teacher' };

export default function App() {
  const [view, setView] = useState<AppView>('login');

  const [felixState, setFelixState] = useState<FelixSessionState>({
    user: DEFAULT_TEACHER,
    exam: null,
    result: null,
    currentPage: 'felix_teacher_dashboard',
  });

  const setFelixPage = (page: FelixPage) =>
    setFelixState(prev => ({ ...prev, currentPage: page }));

  const handleProctor = (exam: FelixExam) =>
    setFelixState(prev => ({ ...prev, exam, currentPage: 'felix_live_proctor' }));

  const handleExamComplete = (result: FelixResult) =>
    setFelixState(prev => ({ ...prev, result, currentPage: 'felix_result' }));

  const handleReturnHome = () =>
    setFelixState({ user: DEFAULT_TEACHER, exam: null, result: null, currentPage: 'felix_teacher_dashboard' });

  const renderFelix = () => {
    switch (felixState.currentPage) {
      case 'felix_teacher_dashboard':
        return (
          <FelixTeacherDashboard
            teacher={felixState.user ?? DEFAULT_TEACHER}
            onProctor={handleProctor}
          />
        );
      case 'felix_live_proctor':
        return felixState.exam ? (
          <FelixLiveProctor
            exam={felixState.exam}
            onExit={() => setFelixPage('felix_teacher_dashboard')}
          />
        ) : <Navigate to="/felix" />;
      case 'felix_exam':
        return felixState.exam && felixState.user ? (
          <FelixExamPage
            exam={felixState.exam}
            student={felixState.user}
            onComplete={handleExamComplete}
          />
        ) : <Navigate to="/felix" />;
      case 'felix_result':
        return felixState.result && felixState.exam ? (
          <FelixResultPage
            result={felixState.result}
            exam={felixState.exam}
            onReturnHome={handleReturnHome}
          />
        ) : <Navigate to="/felix" />;
      default:
        return (
          <FelixTeacherDashboard
            teacher={DEFAULT_TEACHER}
            onProctor={handleProctor}
          />
        );
    }
  };

  const renderMainApp = () => {
    if (view === 'login') return <TeacherLogin onLogin={() => setView('dashboard')} />;
    return <Dashboard onLogout={() => setView('login')} />;
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                element={renderMainApp()} />
        <Route path="/survey-training" element={<SurveyForm onSubmit={() => {}} />} />
        <Route path="/survey-customer" element={<CustomerFeedbackForm onSubmit={() => {}} />} />
        <Route path="/success"         element={<SuccessScreen onReset={() => {}} />} />

        {/* Teacher dashboard — clicking FELIX tab */}
        <Route path="/felix"           element={renderFelix()} />

        {/* Student exam entry — shareable link /felix/exam?code=XXXXXXXX */}
        <Route path="/felix/exam"      element={<FelixStudentEntry />} />
      </Routes>
    </BrowserRouter>
  );
}