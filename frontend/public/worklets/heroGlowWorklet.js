/**
 * Transix Hero Glow PaintWorklet (CSS Houdini Paint API)
 * Paints an ambient interactive glow and particle constellation behind the hero headline.
 */
class TransixHeroGlowPainter {
  static get inputProperties() {
    return [
      '--pointer-x',
      '--pointer-y',
      '--glow-intensity',
      '--theme-is-dark'
    ];
  }

  paint(ctx, geometry, properties) {
    const { width, height } = geometry;
    const pxRaw = properties.get('--pointer-x');
    const pyRaw = properties.get('--pointer-y');
    const intensityRaw = properties.get('--glow-intensity');
    const isDarkRaw = properties.get('--theme-is-dark');

    const px = pxRaw ? parseFloat(pxRaw.toString()) : width / 2;
    const py = pyRaw ? parseFloat(pyRaw.toString()) : height / 2;
    const intensity = intensityRaw ? parseFloat(intensityRaw.toString()) : 1;
    const isDark = isDarkRaw ? isDarkRaw.toString().trim() === '1' : true;

    // Base subtle radial energy glow centered on pointer
    const maxRadius = Math.max(width, height) * 0.75;
    const radialGrad = ctx.createRadialGradient(px, py, 0, px, py, maxRadius);

    if (isDark) {
      radialGrad.addColorStop(0, `rgba(108, 99, 255, ${0.35 * intensity})`);
      radialGrad.addColorStop(0.35, `rgba(91, 75, 255, ${0.18 * intensity})`);
      radialGrad.addColorStop(0.65, `rgba(0, 184, 217, ${0.08 * intensity})`);
      radialGrad.addColorStop(1, 'rgba(11, 15, 25, 0)');
    } else {
      radialGrad.addColorStop(0, `rgba(91, 75, 255, ${0.22 * intensity})`);
      radialGrad.addColorStop(0.4, `rgba(108, 99, 255, ${0.10 * intensity})`);
      radialGrad.addColorStop(0.7, `rgba(0, 184, 217, ${0.04 * intensity})`);
      radialGrad.addColorStop(1, 'rgba(248, 250, 255, 0)');
    }

    ctx.fillStyle = radialGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle micro-constellation nodes that react to distance from pointer
    const nodeCount = 14;
    for (let i = 0; i < nodeCount; i++) {
      // Deterministic pseudo-random positions based on index
      const seedX = (Math.sin(i * 193.3 + 12.5) * 0.5 + 0.5) * width;
      const seedY = (Math.cos(i * 311.7 + 45.2) * 0.5 + 0.5) * height;

      const dist = Math.hypot(px - seedX, py - seedY);
      const proximity = Math.max(0, 1 - dist / (width * 0.45));

      if (proximity > 0.05) {
        // Soft luminous particle point
        ctx.beginPath();
        const r = 1.0 + proximity * 1.5;
        ctx.arc(seedX, seedY, r, 0, Math.PI * 2);
        ctx.fillStyle = isDark
          ? `rgba(165, 180, 252, ${0.15 + proximity * 0.4})`
          : `rgba(91, 75, 255, ${0.1 + proximity * 0.3})`;
        ctx.fill();
      }
    }
  }
}

// Register paint worklet if supported in this environment
if (typeof registerPaint !== 'undefined') {
  registerPaint('hero-glow', TransixHeroGlowPainter);
}
