type FeatureCardProps = {
  title: string;
  description: string;
  mark: "grass" | "sky" | "coral";
};

function FeatureCard({ title, description, mark }: FeatureCardProps) {
  return (
    <article className="feature-card">
      <span className={`feature-card__mark feature-card__mark--${mark}`} />
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}

export default FeatureCard;
