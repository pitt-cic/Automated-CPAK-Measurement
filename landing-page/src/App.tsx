import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Hero } from './components/sections/Hero';
import { Problem } from './components/sections/Problem';
import { Solution } from './components/sections/Solution';
import { Demo } from './components/sections/Demo';
import { HowItWorks } from './components/sections/HowItWorks';
import { Results } from './components/sections/Results';
import { TechStack } from './components/sections/TechStack';
import { CallToAction } from './components/sections/CallToAction';
import { AngleGrid } from './components/ui/AngleGrid';

function App() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <AngleGrid />
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <Demo />
        <HowItWorks />
        <Results />
        <TechStack />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}

export default App;
