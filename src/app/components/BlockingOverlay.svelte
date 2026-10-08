<script lang="ts">
  /** Only while the next screen cannot exist without the result; title and line are required. */
  let { title, detail }: { title: string; detail: string } = $props();
</script>

<div class="overlay" role="alertdialog" aria-modal="true" aria-busy="true" aria-label={title}>
  <div class="box">
    <div class="spinner" aria-hidden="true"></div>
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
    background: var(--gl-scrim);
    animation: fade 0.15s;
  }
  .box {
    width: 100%;
    max-width: 380px;
    padding: 22px;
    border-radius: var(--gl-radius);
    background: var(--gl-surface);
    color: var(--gl-text);
    box-shadow: var(--gl-shadow);
    text-align: center;
  }
  .spinner {
    width: 46px;
    height: 46px;
    margin: 0 auto 12px;
    border-radius: 50%;
    border: 5px solid var(--gl-line);
    border-top-color: var(--gl-peach);
    animation: gl-spin 0.9s linear infinite;
  }
  h3 {
    margin: 0 0 8px;
    font-weight: var(--gl-weight-heading);
    font-size: var(--gl-size-title);
  }
  small {
    display: block;
    margin-top: 6px;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
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
    .spinner {
      animation-duration: 3s;
    }
  }
</style>
