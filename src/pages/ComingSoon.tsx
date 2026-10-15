export default function ComingSoon({ title, phase }: { title: string; phase?: number }) {
  return (
    <section>
      <h1>{title}</h1>
      {phase && <p className="muted">{phase}단계에서 만들 예정이에요.</p>}
    </section>
  );
}
