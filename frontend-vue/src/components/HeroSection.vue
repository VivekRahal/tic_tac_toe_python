<template>
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero__text">
      <span class="hero__eyebrow">For UK Chartered Surveyors</span>
      <h1 id="hero-title">Create survey experiences clients trust</h1>
      <p>
        SurveyScope wraps your site observations in a polished, SurveyMonkey-style workspace so every report feels consistent
        and ready for clients.
      </p>
      <ul class="hero__bullet-list" role="list">
        <li>
          <span class="hero__bullet-icon" aria-hidden="true"></span>
          <div>
            <strong>Guided capture</strong>
            <p>Structured prompts keep field notes aligned with your methodology.</p>
          </div>
        </li>
        <li>
          <span class="hero__bullet-icon" aria-hidden="true"></span>
          <div>
            <strong>Pre-built narratives</strong>
            <p>Responses reuse the tone survey clients expect from your reports.</p>
          </div>
        </li>
        <li>
          <span class="hero__bullet-icon" aria-hidden="true"></span>
          <div>
            <strong>Shareable insights</strong>
            <p>Deliver branded summaries alongside the data that informed them.</p>
          </div>
        </li>
      </ul>
      <div class="hero__cta-group">
        <button type="button" class="btn-primary">Start a new survey</button>
        <button type="button" class="btn-link">View sample output</button>
      </div>
    </div>

    <div class="hero__illustration" aria-hidden="true">
      <div class="mockup-card">
        <header class="mockup-card__header">
          <div>
            <span class="mockup-card__label">Condition rating 2 • Moisture</span>
            <h3>Rear elevation damp staining</h3>
          </div>
          <span class="mockup-card__pill rating--moderate">Moderate</span>
        </header>
        <p class="mockup-card__summary">
          Recent rainfall has highlighted moisture tracking through hairline cracks to the rendered finish.
        </p>
        <div class="mockup-card__grid">
          <div>
            <h4>Next steps</h4>
            <ul>
              <li>Clear gutters and confirm downpipe discharge.</li>
              <li>Seal cracked render and repoint brickwork beneath sill.</li>
              <li>Monitor moisture readings over the next 4 weeks.</li>
            </ul>
          </div>
          <div>
            <h4>Investigation focus</h4>
            <ul>
              <li>Inspect flashings and parapet details for failed sealant.</li>
              <li>Check internal finishes for ongoing staining or mould.</li>
              <li>Review ventilation strategy to reduce condensation.</li>
            </ul>
          </div>
        </div>
        <footer class="mockup-card__footer">
          <div class="mockup-card__avatars">
            <span class="avatar avatar--primary"></span>
            <span class="avatar avatar--secondary"></span>
          </div>
          <div class="mockup-card__status">
            <strong>97% client clarity score</strong>
            <span>Measured from latest homeowner surveys</span>
          </div>
        </footer>
      </div>
      <div class="hero__floating-card">
        <span class="floating-card__title">Live response rate</span>
        <strong>82%</strong>
        <span class="floating-card__meta">vs. 74% last month</span>
      </div>
    </div>
  </section>
</template>
