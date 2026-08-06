# 3D asset pipeline

Place source `.glb` files outside the runtime bundle, then export production variants here.

- Geometry compression: Draco for compatibility, Meshopt for progressive delivery.
- Textures: KTX2/Basis, maximum 2K for hero assets and 1K for secondary assets.
- Naming: `asset-purpose.lod{0|1|2}.{draco|meshopt}.glb`.
- Budgets: hero LOD0 <= 1.5 MB, mobile LOD1 <= 650 KB, fallback poster <= 120 KB AVIF.

The starter scene is procedural and therefore requires no model download.
