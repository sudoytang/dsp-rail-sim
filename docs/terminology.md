# DSP Terminology

This simulator follows the terminology used by the game's localization strings and the community-maintained DSP Wiki. Internal identifiers may use shorter engineering names, but user-facing text must use the terminology below.

## Core terms

| Simulator concept | Official Chinese | Official-style English | UI usage |
| --- | --- | --- | --- |
| EM-Rail Ejector | 电磁轨道弹射器 | EM-Rail Ejector | EM-Rail Ejector (primary) / Ejector (compact) |
| Solar Sail | 太阳帆 | Solar Sail | Solar Sail |
| Dyson Swarm | 戴森云 | Dyson Swarm | Dyson Swarm |
| Dyson Swarm orbit | 戴森云轨道 | Dyson Swarm Orbit | Dyson Swarm Orbit |
| Auto Orbit | 自动轨道 | Auto Orbit | Auto Orbit |
| Orbit | 天体轨道 / 轨道 | Orbit | Orbit |
| Satellite | 卫星 | Satellite | Satellite |
| Gas Giant | 气态巨星 | Gas Giant | Giant Planet |
| Ice Giant | 冰巨星 | Ice Giant | Giant Planet |
| Orbit radius | 轨道半径 | Orbit Radius | Orbit radius |
| Orbit inclination | 轨道倾角 | Inclination | Inclination |
| Longitude of ascending node | 升交点黄经 | Longitude of AN | Longitude of AN |
| Orbital period | 公转周期 | Orbital Period | Orbital period |
| Rotation period | 自转周期 | Rotation Period | Rotation period |
| Axial tilt | 地轴倾角 | Axial Tilt | Axial tilt |

Use **EM-Rail Ejector** for page titles, editor headings, object names, and the first mention in prose. Use **Ejector** in compact actions, counts, list labels, and explanatory UI text.

"Giant Planet" is used as the simulator's generic category because the current data model does not distinguish gas giants from ice giants.

"Terrestrial planet" is used for the simulator's non-giant planet category. The game localization uses individual planet type names rather than a single item name for this category.

## Terms intentionally not used

- "Dyson Cloud" → use **Dyson Swarm**.
- "Dyson cloud orbit" → use **Dyson Swarm Orbit**.
- "Rail Ejector" as a standalone item name → use **EM-Rail Ejector**.
- "Ascending node" for the orbit angle → use **Longitude of AN**, corresponding to the official Chinese term **升交点黄经**.
- "Moon" in user-facing text → use **Satellite**.
- "Rocky" in user-facing category labels → use **Terrestrial**.

## Sources

- DSP Wiki, EM-Rail Ejector: <https://dsp-wiki.com/EM-Rail_Ejector>
- DSP Wiki, Stars and planets: <https://dsp-wiki.com/Stars_and_planets>
- Mirrored game localization strings (Traditional Chinese target, simplified source keys):
  - <https://github.com/old-cookie/Dyson-Sphere-Program_zh-HK/blob/main/3076/dictionary.txt>
  - <https://github.com/old-cookie/Dyson-Sphere-Program_zh-HK/blob/main/3076/prototype.txt>
  - <https://github.com/old-cookie/Dyson-Sphere-Program_zh-HK/blob/main/3076/base.txt>

Relevant localization keys include `戴森云`, `电磁轨道弹射器`, `太阳帆`, `自动轨道`, `升交点黄经`, `公转周期`, `自转周期`, `地轴倾角`, `气态巨星`, `冰巨星`, and `卫星`.
