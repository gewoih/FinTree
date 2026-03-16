export interface DonutAngles {
  startAngle: number;
  endAngle: number;
}

const TOP_CENTER_START_ANGLE = 90;
const FULL_CIRCLE_DEGREES = 360;

export function getTopAnchoredDonutAngles(): DonutAngles {
  return {
    startAngle: TOP_CENTER_START_ANGLE,
    endAngle: TOP_CENTER_START_ANGLE - FULL_CIRCLE_DEGREES,
  };
}
