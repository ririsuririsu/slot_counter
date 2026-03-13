import { useEffect } from 'react';
import { Header } from './components/Header/Header';
import { HomeScreen } from './components/Home/HomeScreen';
import { ProbabilityDisplay } from './components/Statistics/ProbabilityDisplay';
import { SettingAnalysis } from './components/Statistics/SettingAnalysis';
import { CounterList } from './components/Counter/CounterList';
import { HokutoMain } from './components/Hokuto/HokutoMain';
import { useMachineStore, isHokutoMachine } from './stores/machineStore';
import { initializeStore } from './stores/machineStore';
import './styles/global.css';
import styles from './App.module.css';

function MonkeyTurnView() {
  return (
    <>
      <ProbabilityDisplay />
      <SettingAnalysis />
      <CounterList />
    </>
  );
}

function App() {
  const currentMachine = useMachineStore((state) => state.getCurrentMachine());
  const setShowLogEntry = useMachineStore((state) => state.setShowLogEntry);

  useEffect(() => {
    initializeStore();
  }, []);

  // No machine selected → show home screen
  if (!currentMachine) {
    return <HomeScreen />;
  }

  const isHokuto = isHokutoMachine(currentMachine);

  return (
    <>
      <Header onAddLog={isHokuto ? () => setShowLogEntry(true) : undefined} />
      <main className={`container ${isHokuto ? styles.mainHokuto : styles.main}`}>
        {isHokuto ? <HokutoMain /> : <MonkeyTurnView />}
      </main>
    </>
  );
}

export default App;
