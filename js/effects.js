import * as THREE from "three";

export function createAnimatedFlag() {
  const flagWidth = 1.04;
  const flagHeight = 0.58;
  const poleHeight = 1.22;
  const poleTopClearance = 0.17;

  const geometry = new THREE.PlaneGeometry(flagWidth, flagHeight, 72, 32);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 }
    },
    side: THREE.DoubleSide,
    transparent: true,
    vertexShader: `
      uniform float time;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vec3 p = position;
        float freeEdge = smoothstep(0.0, 1.0, uv.x);

        p.z += sin(uv.x * 11.5 - time * 3.0) * 0.055 * freeEdge;
        p.z += sin(uv.x * 22.0 - time * 4.2) * 0.010 * freeEdge;
        p.y += sin(uv.x * 7.0 - time * 1.8) * 0.012 * freeEdge;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;

      float lineSegment(vec2 p, vec2 a, vec2 b, float width) {
        vec2 pa = p - a;
        vec2 ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return 1.0 - smoothstep(width, width + 0.0025, length(pa - ba * h));
      }

      void main() {
        vec3 saffronTop = vec3(1.0, 0.58, 0.06);
        vec3 saffronBottom = vec3(0.94, 0.32, 0.00);
        vec3 whiteTop = vec3(1.0, 1.0, 1.0);
        vec3 whiteBottom = vec3(0.88, 0.92, 0.94);
        vec3 greenTop = vec3(0.05, 0.60, 0.23);
        vec3 greenBottom = vec3(0.00, 0.34, 0.10);

        vec3 color;

        if (vUv.y > 0.666) {
          float band = (vUv.y - 0.666) / 0.334;
          color = mix(saffronBottom, saffronTop, band);
        } else if (vUv.y > 0.333) {
          float band = (vUv.y - 0.333) / 0.333;
          color = mix(whiteBottom, whiteTop, band);
        } else {
          float band = vUv.y / 0.333;
          color = mix(greenBottom, greenTop, band);
        }

        // Ashoka Chakra: outer ring, centre hub and 24 spokes.
        vec2 p = vUv - vec2(0.50, 0.50);
        p.x *= 1.79;

        float distanceFromCentre = length(p);
        vec3 navy = vec3(0.02, 0.12, 0.48);

        float ring = 1.0 - smoothstep(
          0.006,
          0.011,
          abs(distanceFromCentre - 0.102)
        );

        float hub = 1.0 - smoothstep(
          0.012,
          0.018,
          distanceFromCentre
        );

        float spokes = 0.0;

        for (int i = 0; i < 24; i++) {
          float angle = float(i) * 6.28318530718 / 24.0;
          vec2 endpoint = vec2(cos(angle), sin(angle)) * 0.094;
          spokes = max(
            spokes,
            lineSegment(p, vec2(0.0), endpoint, 0.0032)
          );
        }

        float chakraMask = max(max(ring, hub), spokes)
          * (1.0 - smoothstep(0.108, 0.116, distanceFromCentre));

        color = mix(color, navy, chakraMask);

        // Cloth shading and fold highlights.
        float folds = 0.87 + 0.13 * sin(vUv.x * 24.0);
        float highlight = 0.05 * sin(vUv.x * 48.0 + vUv.y * 5.0);
        color = color * folds + highlight;

        gl_FragColor = vec4(color, 1.0);
      }
    `
  });

  const group = new THREE.Group();

  // The cloth is shifted slightly right so its left edge meets the pole.
  const clothX = 0.18;
  const clothY = 0.13;

  const flag = new THREE.Mesh(geometry, material);
  flag.position.set(clothX, clothY, 0);
  flag.renderOrder = 2;

  const goldMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd7a84d,
    metalness: 0.82,
    roughness: 0.20,
    clearcoat: 0.75,
    clearcoatRoughness: 0.16
  });

  // Align the pole exactly with the cloth's left edge.
  const poleX = clothX - flagWidth / 2 - 0.012;
  const flagTopY = clothY + flagHeight / 2;
  const poleTopY = flagTopY + poleTopClearance;
  const poleCentreY = poleTopY - poleHeight / 2;

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.022, poleHeight, 24),
    goldMaterial
  );
  pole.position.set(poleX, poleCentreY, -0.025);
  pole.castShadow = true;
  pole.receiveShadow = true;

  const finialRadius = 0.045;
  const finial = new THREE.Mesh(
    new THREE.SphereGeometry(finialRadius, 24, 24),
    goldMaterial
  );
  finial.position.set(
    poleX,
    poleTopY + finialRadius * 0.78,
    -0.02
  );
  finial.castShadow = true;

  // A small connector hides any visual gap between cloth and pole.
  const connector = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, flagHeight * 0.96, 0.018),
    goldMaterial
  );
  connector.position.set(
    poleX + 0.015,
    clothY,
    -0.018
  );

  group.add(flag, pole, connector, finial);
  group.userData.flagMaterial = material;
  group.userData.flagMesh = flag;
  group.userData.poleMesh = pole;
  group.userData.finialMesh = finial;

  return group;
}

export function createParticles() {
  const count = 130;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [0xff8a00, 0xffffff, 0x20a653, 0x19b8bd].map((value) => new THREE.Color(value));

  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 2.15;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 1.25;
    positions[i * 3 + 2] = 0.20 + Math.random() * 0.72;
    const color = palette[Math.floor(Math.random() * palette.length)];
    colors.set([color.r, color.g, color.b], i * 3);
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.018,
      vertexColors: true,
      transparent: true,
      opacity: 0.78,
      depthWrite: false
    })
  );
}

export function createTricolorTrails() {
  const group = new THREE.Group();
  const colors = [0xff8a00, 0xffffff, 0x20a653];

  colors.forEach((color, index) => {
    const y = 0.30 - index * 0.075;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.22, y, 0.36),
      new THREE.Vector3(0.56, y + 0.10, 0.42),
      new THREE.Vector3(0.92, y + 0.19, 0.48)
    ]);

    const trail = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 42, 0.012, 8, false),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.80,
        depthWrite: false
      })
    );

    group.add(trail);
  });

  group.position.set(0.18, 0.15, 0.08);
  group.scale.setScalar(0.86);
  return group;
}
