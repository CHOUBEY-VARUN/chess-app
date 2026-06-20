import FeatureCard from "./FeatureCard";

const FEATURES = [
  {
    title: "Private Rooms",
    description: "Create a two-player room and send the invite code across.",
    mark: "grass",
  },
  {
    title: "Real-Time Moves",
    description: "Moves feel immediate, focused, and settled into one shared board.",
    mark: "sky",
  },
  {
    title: "Legal Chess",
    description: "The game keeps the rules honest while the interface stays calm.",
    mark: "coral",
  },
] as const;

function FeatureGrid() {
  return (
    <section className="features" aria-labelledby="features-title">
      <div className="features__intro">
        <p className="eyebrow">How it plays</p>
        <h2 id="features-title">
          Built for the small ritual of sending a room link and starting a real
          match.
        </h2>
      </div>

      <div className="features__grid">
        {FEATURES.map((feature) => (
          <FeatureCard
            key={feature.title}
            title={feature.title}
            description={feature.description}
            mark={feature.mark}
          />
        ))}
      </div>
    </section>
  );
}

export default FeatureGrid;
