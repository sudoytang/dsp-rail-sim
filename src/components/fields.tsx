import { useState } from "react";
import { metersToUnit, unitToMeters } from "../simulation/units";
import type { DistanceUnit } from "../simulation/units";

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export function NumberField({ label, value, onChange, suffix, min, max, step = 1, disabled }: NumberFieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <span className="input-with-unit">
        <input
          type="number"
          value={Number.isFinite(value) ? value : ""}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(event) => {
            if (Number.isFinite(event.target.valueAsNumber)) onChange(event.target.valueAsNumber);
          }}
        />
        {suffix && <span>{suffix}</span>}
      </span>
    </label>
  );
}

export function DistanceField({ label, valueM, onChange }: { label: string; valueM: number; onChange: (value: number) => void }) {
  const [unit, setUnit] = useState<DistanceUnit>("AU");
  return (
    <label className="field">
      <span>{label}</span>
      <span className="input-with-unit distance-input">
        <input
          type="number"
          min={0}
          step="any"
          value={Number(metersToUnit(valueM, unit).toPrecision(9))}
          onChange={(event) => {
            if (Number.isFinite(event.target.valueAsNumber)) {
              onChange(unitToMeters(event.target.valueAsNumber, unit));
            }
          }}
        />
        <select value={unit} onChange={(event) => setUnit(event.target.value as DistanceUnit)} aria-label={`${label} unit`}>
          <option value="m">m</option>
          <option value="AU">AU</option>
          <option value="ly">ly</option>
        </select>
      </span>
    </label>
  );
}
