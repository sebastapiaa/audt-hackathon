import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import NewInvestigation from './pages/NewInvestigation';
import Library from './pages/Library';
import Research from './pages/Research';
import Editor from './pages/Editor';
import Settings from './pages/Settings';

export default function App() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/new" element={<NewInvestigation />} />
          <Route path="/library" element={<Library />} />
          <Route path="/research/:id?" element={<Research />} />
          <Route path="/editor/:id?" element={<Editor />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
