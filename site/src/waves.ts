/** A canvas drawn from custom properties, which change as they are dragged. */
export const WAVES = {
  'index.html': '<canvas></canvas>',
  'style.css': `
    :root {
      --speed: 1;
      --size: 4;
    }

    canvas {
      display: block;
      width: 100%;
      height: 160px;
    }
  `,
  'script.js': `
    const canvas = document.querySelector('canvas');
    const context = canvas.getContext('2d');
    const gap = 16;

    function draw(time) {
      const style = getComputedStyle(canvas);
      const speed = +style.getPropertyValue('--speed');
      const size = +style.getPropertyValue('--size');
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      context.scale(devicePixelRatio, devicePixelRatio);
      context.fillStyle = style.color;
      for (let x = gap / 2; x < width; x += gap) {
        const wave = Math.sin(x / 40 + (time / 1000) * speed);
        context.beginPath();
        context.arc(x, height / 2 + wave * 40, size, 0, Math.PI * 2);
        context.fill();
      }
      requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
  `,
};

export const WAVES_CONTROLS = {
  '--speed': { min: 0, max: 4, step: 0.1 },
  '--size': { min: 1, max: 8 },
  gap: { min: 8, max: 40 },
};
