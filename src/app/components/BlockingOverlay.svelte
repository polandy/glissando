<script lang="ts">
  /** Only while the next screen cannot exist without the result; title and line are required. */
  let { title, detail }: { title: string; detail: string } = $props();
</script>

<div class="overlay" role="alertdialog" aria-modal="true" aria-busy="true" aria-label={title}>
  <div class="box">
    <div class="ring spinner" aria-hidden="true"></div>
    <h3>{title}</h3>
    <small>{detail}</small>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: grid;
    place-items: center;
    padding: 20px;
    background: var(--gl-backdrop);
    animation: fade 0.15s;
  }
  .box {
    display: grid;
    justify-items: center;
    gap: 6px;
    width: 100%;
    max-width: 380px;
    padding: 24px 20px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
    color: var(--gl-ink);
    box-shadow: var(--gl-shadow);
    text-align: center;
  }
  .spinner {
    width: 36px;
    height: 36px;
    margin-bottom: 8px;
    border-width: 3px;
  }
  h3 {
    margin: 0;
    font-family: var(--gl-font-display);
    font-weight: var(--gl-weight-title);
    font-size: var(--gl-size-name);
    letter-spacing: var(--gl-tracking-title);
  }
  small {
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .overlay {
      animation: none;
    }
  }
</style>
