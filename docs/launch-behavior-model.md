# Launch Behavior Model

This document defines the simulation rules for Dyson Swarm orbit targeting, insertion points, and EM-Rail Ejector availability. The simulator models the game's launching behavior, not the physical trajectory or travel time of a Solar Sail.

## Units and coordinate system

- Internal distance unit: meter (`m`).
- Internal time unit: second (`s`).
- Internal angular unit: radian (`rad`).
- The star is at the origin.
- Orbit planes use the longitude of ascending node and inclination to derive an orthonormal basis `(P, Q)`.
- The orbit normal is `N = P × Q`.
- Looking down from the positive orbit normal toward the star, Solar Sails travel clockwise.

## Dyson Swarm orbit slots

- At most 20 Dyson Swarm orbits exist in a system.
- Orbit slot IDs are integers from `1` to `20`.
- Slot ID `0` means "no target orbit".
- New orbits receive the smallest unused slot ID.
- Deleting an orbit releases its slot ID.
- Existing orbit slots do not renumber when another slot is deleted.
- An unconfigured slot cannot be selected as a target and is skipped by Auto Orbit search.
- The launcher target selector is a 4 by 5 matrix covering slots 1 through 20, with a separate "None" option for slot 0.

## EM-Rail Ejector target settings

Each EM-Rail Ejector stores two independent settings:

- `targetOrbitSlot`: `0` to `20`.
- `autoOrbit`: boolean.

The target can be set while Auto Orbit is enabled. Auto Orbit can also be enabled with target slot `0`.

The "Apply target to all EM-Rail Ejectors on this body" command copies both the target slot and the Auto Orbit flag to every EM-Rail Ejector on the same terrestrial body.

## Tangential insertion point

Each orbit has exactly one candidate insertion point for a given EM-Rail Ejector.

For orbit radius `R` and launcher position `L`:

1. Project `L` onto the orbit plane:

   ```text
   Lp = L - N × dot(L, N)
   ```

2. Build the outward ray from the star through the projected position:

   ```text
   d = normalize(Lp)
   ```

3. Find the orbit intersection on that ray:

   ```text
   A = R × d
   ```

4. Express `A` in the orbit basis and advance 90 degrees in the clockwise direction:

   ```text
   angle = atan2(dot(A, Q), dot(A, P))
   insertion = R × (cos(angle - π/2) × P + sin(angle - π/2) × Q)
   ```

The extension beyond `Lp` is intentional. A planet inside the Dyson Swarm radius still produces a unique intersection.

If `Lp` is zero-length, the orbit has no defined insertion point and is unavailable.

Only the insertion point is checked for elevation and occlusion. The simulator no longer searches arbitrary points around the orbit.

## Orbit candidate validity

An orbit is valid for a launcher at a simulation tick when both conditions hold for its insertion point:

- `5° ≤ elevation ≤ 60°`.
- The finite segment from the launcher to the insertion point does not intersect the star or any other spherical body.

The launcher's own body is not an occluder. Dyson Swarm rings do not occlude each other.

## Global search clock

Auto Orbit search runs on global simulation ticks:

```text
0.0 s, 0.5 s, 1.0 s, 1.5 s, ...
```

One orbit candidate is tested per tick. The global tick grid does not restart when an EM-Rail Ejector loses its current orbit.

## Firing-state machine

Each EM-Rail Ejector maintains:

- `currentOrbitSlot`: the orbit currently being fired at, or `0`.
- `searchAnchorSlot`: the last orbit that was firing before failure.
- `nextCandidateSlot`: the next slot after the search anchor, among configured slots.
- `searchingForOrbit`: whether a failure search is active.
- `checkTargetNext`: whether the next search tick checks the explicit target.

### Initialization

At simulation start:

- If `autoOrbit = false`, the target slot is the fixed candidate. Availability is evaluated on ticks.
- If `autoOrbit = true` and the target is configured and valid, it becomes the current orbit immediately.
- Otherwise no orbit fires initially, and search begins on the next global tick.

Search alternates between the explicit target and the increasing candidate cursor:

```text
target, anchor + 1, target, anchor + 2, target, anchor + 3, ...
```

Example with target slot `5` and failing current orbit `8`:

```text
5, 9, 5, 10, 5, 11, ...
```

If target slot is `0`, only the incrementing candidate sequence is tested.

Slots are visited in numeric order and wrap from `20` to `1`. Unconfigured slots are skipped.

### Tick behavior

On every global tick:

1. Evaluate the current firing orbit, if any.
2. If it remains valid, keep firing it. Do not switch to the explicit target.
3. If it is invalid:
   - With `autoOrbit = false`, evaluate only the explicit target. Slot `0` means no firing.
   - With `autoOrbit = true`, start or continue one alternating search step.
4. If a searched orbit is valid, it becomes the current firing orbit and search stops.
5. If the next target search is unavailable, the next tick advances the increasing candidate cursor.
6. If no tested orbit is valid, the EM-Rail Ejector remains unavailable until a later tick.

The current orbit only changes when it first becomes invalid and a subsequent search finds a valid orbit.

## Availability and CALC windows

Availability is stateful. It is not sufficient to evaluate each timestamp independently.

- Each CALC run initializes its EM-Rail Ejector states at the run interval start.
- Search ticks are aligned to the global 0.5-second grid.
- EM-Rail Ejector availability between ticks is treated as constant.
- Window boundaries therefore have 0.5-second resolution.
- Per-EM-Rail Ejector available time is the total time its state machine has a valid current orbit.
- Aggregate machine availability is the arithmetic mean of all selected EM-Rail Ejectors' available ratios.
- System coverage is the fraction of time at least one selected EM-Rail Ejector is available.

A run snapshots only its selected EM-Rail Ejector IDs and time interval. Target slots and Auto Orbit flags are read from each EM-Rail Ejector configuration.

## Live status scope

The bottom status bar reports instantaneous availability at the current simulation tick:

- Star selected: all EM-Rail Ejectors in the system.
- Terrestrial planet selected: EM-Rail Ejectors on that planet.
- Satellite selected: EM-Rail Ejectors on that satellite.
- Giant planet selected: EM-Rail Ejectors on all direct satellites.
- EM-Rail Ejector selected: that EM-Rail Ejector only.
- Dyson Swarm selected: fixed-target EM-Rail Ejectors assigned to that slot plus EM-Rail Ejectors using Auto Orbit currently firing at that slot.

An EM-Rail Ejector using Auto Orbit counts toward exactly one Dyson Swarm at a time: the orbit it is currently firing at.

## Display behavior

- The 3D aiming line points to the selected insertion point.
- It is only shown while the EM-Rail Ejector has a valid current orbit.
- Orbit highlighting reflects the current firing status; arbitrary visible arcs are no longer meaningful.
- Simulation display scaling never affects physics calculations.

## Precision and limitations

- Solar Sail flight time is not simulated.
- Sail inventory, power, and firing rate are not simulated.
- The 0.5-second state machine is an approximation of the game's two searches per second.
- Occlusion uses spherical bodies and finite line segments.
- Atmospheric effects and terrain are not modeled.
- When configuration changes, live state is reset and CALC results become outdated.
