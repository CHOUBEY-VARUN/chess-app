import FeatureCard from "./FeatureCard";

const FEATURES = [
  {
    title: "Private Rooms",
    description: "Create a room and share the code with another player.",
  },
  {
    title: "Real-Time Moves",
    description: "Moves update instantly using Socket.IO.",
  },
  {
    title: "Legal Chess",
    description: "Game rules are handled properly using chess.js.",
  },
] as const;

function FeatureGrid() {
  return (
    <section className="features">
      {FEATURES.map((feature) => (
        <FeatureCard
          key={feature.title}
          title={feature.title}
          description={feature.description}
        />
      ))}
    </section>
  );
}

export default FeatureGrid;
