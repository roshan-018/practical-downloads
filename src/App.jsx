import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import CustomGenerator from './components/CustomGenerator';

export default function App() {
  // 1. GLOBAL STATE
  // We keep student details here so they persist even if you navigate back and forth
  const [studentDetails, setStudentDetails] = useState({ name: '', rollNo: '' });
  
  // 2. ROUTING STATE
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'custom'
  const [activePractical, setActivePractical] = useState(null); // Holds the selected practical's payload

  // 3. NAVIGATION HANDLERS
  const handleSelectCustom = (practicalPayload) => {
    setActivePractical(practicalPayload);
    setCurrentView('custom');
  };

  const handleBackToHome = () => {
    setActivePractical(null);
    setCurrentView('home');
  };

  // 4. RENDER ENGINE (The Traffic Controller)
  return (
    <div className="app-container">
      
      {currentView === 'home' && (
        <Dashboard 
          studentDetails={studentDetails}
          setStudentDetails={setStudentDetails}
          onSelectCustom={handleSelectCustom}
        />
      )}

      {currentView === 'custom' && activePractical && (
        <CustomGenerator 
          practical={activePractical}
          studentDetails={studentDetails}
          onBack={handleBackToHome}
        />
      )}

    </div>
  );
}