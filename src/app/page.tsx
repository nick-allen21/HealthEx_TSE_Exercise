const setupSteps = [
  "Choose the patient retrieval strategy and lock the initial demo patient.",
  "Fetch at least two supported FHIR resource types from the HealthEx API.",
  "Shape the raw FHIR responses into readable clinical summary sections.",
  "Layer in immunization review and Claude skill support after the history view works.",
];

export default function HomePage() {
  return (
    <main className="app-shell">
      <section className="hero-card">
        <div className="hero-band">
          <p className="hero-eyebrow">Phase 1 Scaffold</p>
          <h1 className="hero-title">HealthEx Clinical History Viewer</h1>
          <p className="hero-copy">
            The app scaffold is now live. Next steps are to connect a patient
            record from the HealthEx FHIR server, normalize the selected
            resource types, and turn that data into a reviewer-friendly
            clinical summary.
          </p>
        </div>

        <div className="hero-body">
          <div className="hero-panel">
            <h2 className="hero-panel-title">Immediate build sequence</h2>
            <ol className="hero-list">
              {setupSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}
