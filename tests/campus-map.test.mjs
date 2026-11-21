import assert from "node:assert/strict";
import test from "node:test";

import {
  BUILDING_CODES,
  CAMPUS_BUILDING_SHAPES,
  CAMPUS_MAP_VIEWBOX,
  getBuildingsBoundingCenter,
  isBuildingCode,
} from "../src/features/campus-map/building-shapes.ts";
import {
  centerMapOnPoint,
  clampMapTransform,
  computeBaseScale,
  computeBuildingHitTarget,
  computeBuildingRenderState,
  computeBuildingRenderStates,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  MIN_TOUCH_TARGET_PX,
  zoomAroundPoint,
} from "../src/features/campus-map/map-state.ts";

test("building-shapes provides all 35 KMUTT S1-S15 and N1-N20 polygons inside viewBox bounds", () => {
  assert.equal(BUILDING_CODES.length, 35);
  for (let i = 1; i <= 15; i++) {
    assert.equal(isBuildingCode(`S${i}`), true);
  }
  for (let i = 1; i <= 20; i++) {
    assert.equal(isBuildingCode(`N${i}`), true);
  }
  assert.equal(isBuildingCode("X99"), false);

  for (const code of BUILDING_CODES) {
    const shape = CAMPUS_BUILDING_SHAPES[code];
    assert.equal(shape.code, code);
    assert.match(shape.path, /^M\d+,\d+/);
    assert.ok(shape.labelX >= 0 && shape.labelX <= CAMPUS_MAP_VIEWBOX.width);
    assert.ok(shape.labelY >= 0 && shape.labelY <= CAMPUS_MAP_VIEWBOX.height);
    assert.ok(shape.bbox.width > 0 && shape.bbox.height > 0);
  }
});

test("crowd variants map to green, yellow, red, and selectable light-gray for null crowdLevel", () => {
  const cases = [
    {
      code: "S1",
      crowdLevel: "low",
      expectedVariant: "low",
      expectedFill: "#0daf2b",
    },
    {
      code: "S2",
      crowdLevel: "medium",
      expectedVariant: "medium",
      expectedFill: "#dfdf20",
    },
    {
      code: "N16",
      crowdLevel: "high",
      expectedVariant: "high",
      expectedFill: "#ff0000",
    },
    {
      code: "N1",
      crowdLevel: null,
      expectedVariant: "unknown",
      expectedFill: "#b8bec8",
    },
  ];

  for (const item of cases) {
    const state = computeBuildingRenderState({
      id: `b-${item.code}`,
      code: item.code,
      name: `อาคาร ${item.code}`,
      crowdLevel: item.crowdLevel,
      isActive: true,
    });
    assert.equal(state.variant, item.expectedVariant);
    assert.equal(state.fill, item.expectedFill);
    assert.equal(state.showHighlight, true);
    assert.equal(state.isInteractive, true);
    assert.equal(state.strokeKind, "default");
  }
});

test("inactive buildings (e.g. S7) remain unhighlighted and non-interactive even if referenced", () => {
  const inactive = computeBuildingRenderState(
    {
      id: "b-S7",
      code: "S7",
      name: "อาคารพัฒนาเด็กเล็ก มจธ.",
      crowdLevel: "low",
      isActive: false,
    },
    {
      selectedBuildingId: "b-S7",
      highlightedBuildingIds: ["b-S7"],
      crowdFilter: "low",
    },
  );

  assert.equal(inactive.variant, "inactive");
  assert.equal(inactive.isInteractive, false);
  assert.equal(inactive.showHighlight, false);
  assert.equal(inactive.fill, "transparent");
  assert.equal(inactive.fillOpacity, 0);
  assert.equal(inactive.strokeKind, "none");
  assert.equal(inactive.isSelected, false);
});

test("crowd filter highlights only matching active buildings and clears non-matching ones", () => {
  const markers = [
    { id: "1", code: "S14", name: "อาคาร 190 ปี", crowdLevel: "low" },
    { id: "2", code: "N16", name: "LX", crowdLevel: "high" },
    { id: "3", code: "S1", name: "ศูนย์เรียนรู้", crowdLevel: null },
  ];

  const states = computeBuildingRenderStates(markers, { crowdFilter: "high" });

  assert.equal(states.get("N16")?.showHighlight, true);
  assert.equal(states.get("N16")?.fill, "#ff0000");
  assert.equal(states.get("N16")?.isDimmed, false);

  assert.equal(states.get("S14")?.showHighlight, false);
  assert.equal(states.get("S14")?.isDimmed, true);
  assert.equal(states.get("S14")?.fillOpacity, 0);

  assert.equal(states.get("S1")?.showHighlight, false);
  assert.equal(states.get("S1")?.isDimmed, true);
});

test("nearby search highlight emphasizes matched buildings with orange stroke and dims others", () => {
  const markers = [
    { id: "1", code: "S11", name: "CB5", crowdLevel: "low" },
    { id: "2", code: "S12", name: "CB4", crowdLevel: "medium" },
    { id: "3", code: "N2", name: "อธิการบดี", crowdLevel: "high" },
  ];

  const states = computeBuildingRenderStates(markers, {
    highlightedBuildingIds: ["1", "2"],
  });

  const s11 = states.get("S11");
  assert.equal(s11?.isSearchMatch, true);
  assert.equal(s11?.showHighlight, true);
  assert.equal(s11?.strokeKind, "search-nearby");
  assert.equal(s11?.stroke, "#ff5815");
  assert.equal(s11?.isDimmed, false);

  const n2 = states.get("N2");
  assert.equal(n2?.isSearchMatch, false);
  assert.equal(n2?.showHighlight, false);
  assert.equal(n2?.isDimmed, true);
  assert.ok((n2?.fillOpacity ?? 0) > 0);
});

test("selected building stays highlighted with selected border regardless of filter", () => {
  const state = computeBuildingRenderState(
    { id: "n17", code: "N17", name: "CB2", crowdLevel: "medium" },
    { selectedBuildingId: "n17", crowdFilter: "low" },
  );

  assert.equal(state.isSelected, true);
  assert.equal(state.showHighlight, true);
  assert.equal(state.fill, "#dfdf20");
  assert.equal(state.strokeKind, "selected");
  assert.equal(state.isDimmed, false);
});

test("pan/zoom math centers map at min zoom, clamps bounds, and zooms around anchor", () => {
  const viewportW = 360;
  const viewportH = 480;
  const mapW = CAMPUS_MAP_VIEWBOX.width;
  const mapH = CAMPUS_MAP_VIEWBOX.height;

  const baseScale = computeBaseScale(viewportW, viewportH, mapW, mapH);
  assert.ok(Math.abs(baseScale - viewportW / mapW) < 1e-6);

  const atMinZoom = clampMapTransform(
    { zoom: 0.5, panX: -200, panY: 300 },
    viewportW,
    viewportH,
    mapW,
    mapH,
  );
  assert.equal(atMinZoom.zoom, MAP_MIN_ZOOM);
  assert.equal(atMinZoom.panX, 0);
  const expectedCenterY = (viewportH - mapH * baseScale) / 2;
  assert.ok(Math.abs(atMinZoom.panY - expectedCenterY) < 1e-6);

  const zoomed = zoomAroundPoint(
    atMinZoom,
    MAP_MAX_ZOOM + 2,
    viewportW / 2,
    viewportH / 2,
    viewportW,
    viewportH,
    mapW,
    mapH,
  );
  assert.equal(zoomed.zoom, MAP_MAX_ZOOM);
  assert.ok(zoomed.panX <= 0);
  assert.ok(zoomed.panX >= viewportW - mapW * baseScale * MAP_MAX_ZOOM);
});

test("getBuildingsBoundingCenter and centerMapOnPoint place target buildings at the viewport center", () => {
  const s1Center = getBuildingsBoundingCenter(["S1"]);
  assert.deepEqual(s1Center, {
    x: CAMPUS_BUILDING_SHAPES.S1.labelX,
    y: CAMPUS_BUILDING_SHAPES.S1.labelY,
  });
  assert.equal(getBuildingsBoundingCenter([]), null);

  const multiCenter = getBuildingsBoundingCenter(["S1", "N16"]);
  assert.ok(multiCenter !== null);
  assert.ok(multiCenter.x > CAMPUS_BUILDING_SHAPES.S1.labelX);
  assert.ok(multiCenter.x < CAMPUS_BUILDING_SHAPES.N16.labelX);

  const viewportW = 390;
  const viewportH = 480;
  const mapW = CAMPUS_MAP_VIEWBOX.width;
  const mapH = CAMPUS_MAP_VIEWBOX.height;
  const baseScale = computeBaseScale(viewportW, viewportH, mapW, mapH);

  const centeredN16 = centerMapOnPoint(
    { zoom: 1.4, panX: 0, panY: 0 },
    {
      x: CAMPUS_BUILDING_SHAPES.N16.labelX,
      y: CAMPUS_BUILDING_SHAPES.N16.labelY,
    },
    viewportW,
    viewportH,
    mapW,
    mapH,
    { zoom: 2.2, anchorRatioY: 0.42 },
  );
  assert.equal(centeredN16.zoom, 2.2);
  const scale = baseScale * centeredN16.zoom;
  const screenX = centeredN16.panX + CAMPUS_BUILDING_SHAPES.N16.labelX * scale;
  const screenY = centeredN16.panY + CAMPUS_BUILDING_SHAPES.N16.labelY * scale;
  assert.ok(Math.abs(screenX - viewportW / 2) < 1e-6);
  assert.ok(Math.abs(screenY - viewportH * 0.42) < 1e-6);
});

test("small building hit targets expand to at least 44px on screen around the shape center", () => {
  const scale = 0.12;
  const minMapSize = MIN_TOUCH_TARGET_PX / scale;
  for (const code of ["N8", "S1", "S10"]) {
    const { bbox } = CAMPUS_BUILDING_SHAPES[code];
    const rect = computeBuildingHitTarget(bbox, scale);
    assert.ok(rect, code);
    assert.ok(rect.width * scale >= MIN_TOUCH_TARGET_PX - 1e-9, code);
    assert.ok(rect.height * scale >= MIN_TOUCH_TARGET_PX - 1e-9, code);
    assert.ok(
      Math.abs(rect.x + rect.width / 2 - (bbox.x + bbox.width / 2)) < 1e-9,
    );
    assert.ok(
      Math.abs(rect.y + rect.height / 2 - (bbox.y + bbox.height / 2)) < 1e-9,
    );
    assert.ok(rect.width >= bbox.width && rect.height >= minMapSize - 1e-9);
  }
});

test("hit targets are skipped once the shape already covers 44px and keep the larger side", () => {
  assert.equal(
    computeBuildingHitTarget({ x: 0, y: 0, width: 100, height: 100 }, 1),
    null,
  );
  assert.deepEqual(
    computeBuildingHitTarget({ x: 10, y: 20, width: 80, height: 20 }, 1),
    { x: 10, y: 8, width: 80, height: 44 },
  );
  assert.equal(
    computeBuildingHitTarget({ x: 0, y: 0, width: 1, height: 1 }, 0),
    null,
  );
});
