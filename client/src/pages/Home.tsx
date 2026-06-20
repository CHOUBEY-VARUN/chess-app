import HeroSection from "../components/home/HeroSection";
import HomeNavbar from "../components/home/HomeNavbar";
import "./Home.css";

function Home() {
  return (
    <div className="home-page">
      <HomeNavbar />
      <HeroSection />
    </div>
  );
}

export default Home;
