import FeatureGrid from "../components/home/FeatureGrid";
import HeroSection from "../components/home/HeroSection";
import HomeFooter from "../components/home/HomeFooter";
import HomeNavbar from "../components/home/HomeNavbar";
import "./Home.css";

function Home() {
  return (
    <div className="home-page">
      <HomeNavbar />
      <HeroSection />
      <FeatureGrid />
      <HomeFooter />
    </div>
  );
}

export default Home;
