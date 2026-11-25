import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { launcherState, orbitDirection, orbitalBasis, systemState } from "../simulation/astronomy";
import { LaunchSimulation } from "../simulation/launchSimulation";
import type { BodyParameters, SimulationConfig, SystemState, VisibilityState } from "../simulation/types";
import { displayBodyRadius, displayCloudPoint, displayMoonOrbitRadius, displayOrbitRadius, displayStarRadius, toThree } from "../rendering/sceneScale";
import { highlightedLauncherId } from "../selection";
import { useAppStore } from "../state/store";
import type { Selection } from "../state/store";

const VISIBILITY_REFRESH_MS = 50;

interface WorldObjects {
  root: THREE.Group;
  bodyMeshes: Map<string, THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>>;
  moonOrbits: Map<string, Line2>;
  axes: Map<string, THREE.Line>;
  cloudLines: Map<string, Line2>;
  lineMaterials: LineMaterial[];
  launchers: Map<string, { mesh: THREE.Mesh; upLine: THREE.Line; aimLine: THREE.Line; sails: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> }>;
  pickables: THREE.Object3D[];
  lastColorVisibility: VisibilityState | null;
  lastColorLauncherId: string | null;
}

export function SystemScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const worldRef = useRef<WorldObjects | null>(null);
  const fleetRef = useRef<{ simulation: LaunchSimulation; config: SimulationConfig; lastTime: number } | null>(null);
  const timeRef = useRef(useAppStore.getState().currentTimeSeconds);
  const config = useAppStore((state) => state.config);
  const selection = useAppStore((state) => state.selection);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#05070d");
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 2_000);
    camera.up.set(0, 0, 1);
    camera.position.set(16, -25, 20);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 3;
    controls.maxDistance = 250;
    controls.update();

    scene.add(new THREE.AmbientLight("#5b6f99", 0.48));
    const light = new THREE.PointLight("#fff0d1", 850, 0, 1.6);
    scene.add(light);
    scene.add(createStarfield());
    const grid = new THREE.PolarGridHelper(45, 16, 8, 96, "#1b293c", "#142033");
    grid.rotation.x = Math.PI / 2;
    grid.renderOrder = -100;
    const gridMaterial = grid.material as THREE.LineBasicMaterial;
    gridMaterial.depthWrite = false;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.8;
    scene.add(grid);

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (worldRef.current) updateLineResolution(worldRef.current, width, height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown = { x: 0, y: 0 };
    const onPointerDown = (event: PointerEvent) => { pointerDown = { x: event.clientX, y: event.clientY }; };
    const onPointerUp = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 5) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = worldRef.current ? raycaster.intersectObjects(worldRef.current.pickables, false)[0] : null;
      const data = hit?.object.userData.selection as Selection | undefined;
      if (data) useAppStore.getState().setSelection(data);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    let frame = 0;
    let previousFrame = performance.now();
    let lastPublish = 0;
    let lastVisibility = 0;
    let lastVisibilityTime = 0;
    let visibilityConfig: SimulationConfig | null = null;
    let latestVisibilities: Record<string, VisibilityState> = {};
    const animate = (now: number) => {
      const delta = Math.min((now - previousFrame) / 1000, 0.2);
      previousFrame = now;
      const state = useAppStore.getState();
      if (state.playing) {
        timeRef.current += delta * state.playbackSpeed;
        if (now - lastPublish > 100) {
          state.setCurrentTime(timeRef.current);
          lastPublish = now;
        }
      } else {
        timeRef.current = state.currentTimeSeconds;
      }
      if (worldRef.current) {
        const currentConfig = useAppStore.getState().config;
        if (visibilityConfig !== currentConfig || timeRef.current < lastVisibilityTime) {
          latestVisibilities = {};
          visibilityConfig = currentConfig;
          lastVisibility = 0;
        }
        const system = systemState(currentConfig, timeRef.current);
        const visibilityNeedsRefresh = state.playing || Object.keys(latestVisibilities).length === 0 || Math.abs(timeRef.current - lastVisibilityTime) > 1e-6;
        if (visibilityNeedsRefresh && now - lastVisibility > VISIBILITY_REFRESH_MS) {
          try {
            let fleet = fleetRef.current;
            if (!fleet || fleet.config !== currentConfig || timeRef.current < fleet.lastTime) {
              fleet = { simulation: new LaunchSimulation(currentConfig, 0), config: currentConfig, lastTime: 0 };
              fleetRef.current = fleet;
            }
            latestVisibilities = fleet.simulation.visibilitySnapshot(timeRef.current);
            fleet.lastTime = timeRef.current;
            state.setVisibilities(latestVisibilities);
          } catch {
            state.setPlaying(false);
          }
          lastVisibility = now;
          lastVisibilityTime = timeRef.current;
        }
        updateWorld(worldRef.current, currentConfig, system, timeRef.current, latestVisibilities);
      }
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (worldRef.current) {
      scene.remove(worldRef.current.root);
      disposeObject(worldRef.current.root);
    }
    const width = containerRef.current?.clientWidth || 1;
    const height = containerRef.current?.clientHeight || 1;
    worldRef.current = buildWorld(config, width, height);
    fleetRef.current = null;
    scene.add(worldRef.current.root);
    timeRef.current = useAppStore.getState().currentTimeSeconds;
  }, [config]);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    for (const [id, mesh] of world.bodyMeshes) {
      const active = selection.type === "body" && selection.id === id;
      mesh.material.emissive.set(active ? "#2563eb" : "#000000");
      mesh.material.emissiveIntensity = active ? 0.65 : 0;
    }
  }, [selection, config]);

  return (
    <div className="scene-wrap">
      <div className="scene" ref={containerRef} />
      <div className="scene-topline"><span className="live-pill"><i /> LIVE ORBITAL VIEW</span><span>Display scale · compressed</span></div>
      <div className="scene-help">Drag to orbit · Scroll to zoom · Click an object to inspect</div>
    </div>
  );
}

function buildWorld(config: SimulationConfig, width: number, height: number): WorldObjects {
  const root = new THREE.Group();
  const bodyMeshes = new Map<string, THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>>();
  const moonOrbits = new Map<string, Line2>();
  const axes = new Map<string, THREE.Line>();
  const cloudLines = new Map<string, Line2>();
  const lineMaterials: LineMaterial[] = [];
  const resolution = new THREE.Vector2(width, height);
  const pickables: THREE.Object3D[] = [];

  const star = new THREE.Mesh(
    new THREE.SphereGeometry(displayStarRadius(config), 48, 32),
    new THREE.MeshBasicMaterial({ color: "#ffd58a" }),
  );
  star.userData.selection = { type: "star", id: "star" };
  root.add(star);
  pickables.push(star);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(displayStarRadius(config) * 1.16, 32, 24),
    new THREE.MeshBasicMaterial({ color: "#fb923c", transparent: true, opacity: 0.12, side: THREE.BackSide }),
  );
  root.add(glow);

  for (const body of config.bodies) {
    const basis = orbitalBasis(body.orbit.inclinationDeg, body.orbit.ascendingNodeDeg);
    const radius = body.parentId ? displayMoonOrbitRadius(body.orbit.radiusM) : displayOrbitRadius(body.orbit.radiusM);
    const orbit = createOrbitLine(radius, basis.p, basis.q, body.parentId ? "#3b4d63" : "#35465d", 0.85, resolution, lineMaterials, body.parentId ? 1.4 : 1.5);
    root.add(orbit);
    if (body.parentId) moonOrbits.set(body.id, orbit);
    const material = new THREE.MeshStandardMaterial({
      color: body.kind === "rocky" ? "#6f9fba" : "#c79a72",
      roughness: body.kind === "rocky" ? 0.85 : 0.65,
      metalness: 0.05,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(displayBodyRadius(body), 32, 24), material);
    mesh.userData.selection = { type: "body", id: body.id };
    root.add(mesh);
    bodyMeshes.set(body.id, mesh);
    pickables.push(mesh);
    const axisGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const axis = new THREE.Line(axisGeometry, new THREE.LineBasicMaterial({ color: "#7dd3fc", transparent: true, opacity: 0.5 }));
    root.add(axis);
    axes.set(body.id, axis);
  }

  for (const cloud of config.clouds) {
    const basis = orbitalBasis(cloud.inclinationDeg, cloud.ascendingNodeDeg);
    const geometry = new LineGeometry();
    geometry.setPositions(orbitPositions(displayOrbitRadius(cloud.radiusM), basis.p, basis.q, 360));
    const material = new LineMaterial({ color: cloud.color, linewidth: 2, transparent: true, opacity: 0.9, resolution });
    const line = new Line2(geometry, material);
    line.frustumCulled = false;
    root.add(line);
    lineMaterials.push(material);
    cloudLines.set(cloud.id, line);
  }

  const sailMaterial = new THREE.PointsMaterial({
    color: "#fef3c7",
    size: 0.22,
    map: createSailTexture(),
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const launchers = new Map<string, { mesh: THREE.Mesh; upLine: THREE.Line; aimLine: THREE.Line; sails: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> }>();
  for (const item of config.launchers) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: "#f8fafc" }));
    mesh.userData.selection = { type: "launcher", id: item.id };
    root.add(mesh);
    pickables.push(mesh);
    const upLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: "#e2e8f0" }),
    );
    root.add(upLine);
    const aimLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: "#4ade80", transparent: true, opacity: 0.9 }),
    );
    root.add(aimLine);
    const sailPositions = new Float32Array(6 * 3);
    const sailGeometry = new THREE.BufferGeometry();
    sailGeometry.setAttribute("position", new THREE.BufferAttribute(sailPositions, 3));
    const sails = new THREE.Points(sailGeometry, sailMaterial);
    sails.frustumCulled = false;
    sails.visible = false;
    root.add(sails);
    launchers.set(item.id, { mesh, upLine, aimLine, sails });
  }
  return { root, bodyMeshes, moonOrbits, axes, cloudLines, lineMaterials, launchers, pickables, lastColorVisibility: null, lastColorLauncherId: null };
}

function updateWorld(world: WorldObjects, config: SimulationConfig, system: SystemState, timeSeconds: number, visibilities: Record<string, VisibilityState> | null): void {
  for (const body of config.bodies.filter((item) => item.parentId === null)) updateBody(world, system, body, timeSeconds);
  for (const body of config.bodies.filter((item) => item.parentId !== null)) {
    updateBody(world, system, body, timeSeconds);
    const parentMesh = world.bodyMeshes.get(body.parentId!);
    const orbit = world.moonOrbits.get(body.id);
    if (parentMesh && orbit) orbit.position.copy(parentMesh.position);
  }

  for (const launcher of config.launchers) {
    const visual = world.launchers.get(launcher.id);
    const body = config.bodies.find((item) => item.id === launcher.bodyId);
    const bodyMesh = body ? world.bodyMeshes.get(body.id) : null;
    if (!visual || !body || !bodyMesh) continue;
    const state = launcherState(launcher, system);
    const up = toThree(state.up);
    visual.mesh.position.copy(bodyMesh.position).addScaledVector(up, displayBodyRadius(body) + 0.08);
    visual.upLine.position.copy(visual.mesh.position);
    setLinePoints(visual.upLine, new THREE.Vector3(), up.clone().multiplyScalar(1.25));
    const visibility = visibilities?.[launcher.id];
    const cloud = config.clouds.find((item) => item.id === visibility?.currentCloudId);
    const insertion = visibility?.candidate?.available ? visibility.candidate.insertionPoint : null;
    if (cloud && insertion) {
      const start = visual.mesh.position;
      const end = displayCloudPoint(insertion, cloud.radiusM);
      setLinePoints(visual.aimLine, start, end);
      visual.aimLine.visible = true;
      visual.sails.visible = true;
      const position = visual.sails.geometry.getAttribute("position") as THREE.BufferAttribute;
      const phase = (performance.now() * 0.00045 + hashPhase(launcher.id)) % 1;
      for (let index = 0; index < 6; index += 1) {
        const amount = (phase + index / 6) % 1;
        position.setXYZ(index, start.x + (end.x - start.x) * amount, start.y + (end.y - start.y) * amount, start.z + (end.z - start.z) * amount);
      }
      position.needsUpdate = true;
    } else {
      visual.aimLine.visible = false;
      visual.sails.visible = false;
    }
  }

  const selectedId = highlightedLauncherId(useAppStore.getState().selection);
  const selectedVisibility = selectedId ? visibilities?.[selectedId] ?? null : null;
  if (selectedVisibility !== world.lastColorVisibility || selectedId !== world.lastColorLauncherId) {
    world.lastColorVisibility = selectedVisibility;
    world.lastColorLauncherId = selectedId ?? null;
    for (const [id, line] of world.cloudLines) {
      const item = config.clouds.find((candidate) => candidate.id === id);
      if (!item) continue;
      const base = new THREE.Color(item.color);
      const firing = selectedVisibility?.currentOrbitSlot === item.slot && selectedVisibility.available;
      const color = firing ? new THREE.Color("#34d399") : base.clone().multiplyScalar(0.45);
      line.material.color.copy(color);
      line.material.opacity = firing ? 1 : 0.8;
    }
  }
}

function updateBody(world: WorldObjects, system: SystemState, body: BodyParameters, timeSeconds: number): void {
  const mesh = world.bodyMeshes.get(body.id);
  const state = system.bodies.get(body.id);
  if (!mesh || !state) return;
  const direction = toThree(orbitDirection(body.orbit, timeSeconds));
  const parent = body.parentId ? world.bodyMeshes.get(body.parentId) : null;
  const radius = body.parentId ? displayMoonOrbitRadius(body.orbit.radiusM) : displayOrbitRadius(body.orbit.radiusM);
  mesh.position.copy(direction.multiplyScalar(radius));
  if (parent) mesh.position.add(parent.position);
  const axis = world.axes.get(body.id);
  if (axis) {
    axis.position.copy(mesh.position);
    const directionAxis = toThree(state.axis).multiplyScalar(displayBodyRadius(body) * 1.8);
    setLinePoints(axis, directionAxis.clone().multiplyScalar(-1), directionAxis);
  }
}

function createOrbitLine(radius: number, p: { x: number; y: number; z: number }, q: { x: number; y: number; z: number }, color: string, opacity: number, resolution: THREE.Vector2, materials: LineMaterial[], linewidth: number): Line2 {
  const geometry = new LineGeometry();
  geometry.setPositions(orbitPositions(radius, p, q, 256));
  const material = new LineMaterial({ color, linewidth, transparent: true, opacity, resolution });
  materials.push(material);
  const line = new Line2(geometry, material);
  line.frustumCulled = false;
  return line;
}

function orbitPositions(radius: number, p: { x: number; y: number; z: number }, q: { x: number; y: number; z: number }, segments: number): number[] {
  const positions: number[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    positions.push(
      radius * (Math.cos(angle) * p.x + Math.sin(angle) * q.x),
      radius * (Math.cos(angle) * p.y + Math.sin(angle) * q.y),
      radius * (Math.cos(angle) * p.z + Math.sin(angle) * q.z),
    );
  }
  return positions;
}

function updateLineResolution(world: WorldObjects, width: number, height: number): void {
  for (const material of world.lineMaterials) material.resolution.set(width, height);
}

function setLinePoints(line: THREE.Line, start: THREE.Vector3, end: THREE.Vector3): void {
  const attribute = line.geometry.getAttribute("position") as THREE.BufferAttribute;
  attribute.setXYZ(0, start.x, start.y, start.z);
  attribute.setXYZ(1, end.x, end.y, end.z);
  attribute.needsUpdate = true;
  line.geometry.computeBoundingSphere();
}

function hashPhase(id: string): number {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) % 997;
  return hash / 997;
}

function createSailTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.22, "rgba(255,248,210,0.95)");
  gradient.addColorStop(0.58, "rgba(250,204,21,0.38)");
  gradient.addColorStop(1, "rgba(250,204,21,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createStarfield(): THREE.Points {
  const positions = new Float32Array(1_200 * 3);
  let seed = 42;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let index = 0; index < 1_200; index += 1) {
    const radius = 180 + random() * 300;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[index * 3 + 2] = radius * Math.cos(phi);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ color: "#94a3b8", size: 0.35, sizeAttenuation: true }));
}

function disposeObject(root: THREE.Object3D): void {
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if ("map" in material && material.map instanceof THREE.Texture) textures.add(material.map);
        material.dispose();
      }
    }
  });
  for (const texture of textures) texture.dispose();
}
