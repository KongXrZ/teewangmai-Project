import assert from "node:assert/strict";
import test from "node:test";

import {
  BUILDING_CODES,
  CAMPUS_BUILDING_SHAPES,
  CAMPUS_MAP_VIEWBOX,
  isBuildingCode,
} from "../src/features/campus-map/building-shapes.ts";
import {
  clampMapTransform,
  computeBaseScale,
  computeBuildingRenderState,
  computeBuildingRenderStates,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
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
