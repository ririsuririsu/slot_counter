import { useEffect } from 'react';
import { Header } from './components/Header/Header';
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

  useEffect(() => {
    initializeStore();
  }, []);

  const isHokuto = currentMachine && isHokutoMachine(currentMachine);

  return (
    <>
      <Header />
      <main className={`container ${isHokuto ? styles.mainHokuto : styles.main}`}>
        {isHokuto ? <HokutoMain /> : <MonkeyTurnView />}
      </main>
    </>
  );
}

export default App;
