import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "./assets/vite.svg";
import heroImg from "./assets/hero.png";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import CollegeHeader from "./components/collegeHeader";
import HeroSection from "./components/HeroSection";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <header>
        <CollegeHeader />
        <HeroSection />
      </header>
      <main>
        <section className="MainFunctions">
          <div className="grid text-center">
            <div className="g-col-6 g-col-md-4">Raise a Complaint</div>
            <div className="g-col-6 g-col-md-4">Check on complaint</div>
          </div>
        </section>
      </main>
      <footer></footer>
    </>
  );
}

export default App;
