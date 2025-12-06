import { useEffect } from 'react';
import { Header } from './components/Header/Header';
import { ProbabilityDisplay } from './components/Statistics/ProbabilityDisplay';
import { SettingAnalysis } from './components/Statistics/SettingAnalysis';
import { CounterList } from './components/Counter/CounterList';
import { initializeStore } from './stores/machineStore';
import './styles/global.css';
import styles from './App.module.css';

function App() {
  useEffect(() => {
    initializeStore();
  }, []);

  return (
    <>
      <Header />
      <main className={`container ${styles.main}`}>
        <ProbabilityDisplay />
        <SettingAnalysis />
        <CounterList />
      </main>
    </>
  );
}

export default App;
