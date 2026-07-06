# Questions for the Arena Platform Team — Spy Runner Integration

From Big Run Studios. We're building **Spy Runner** as a full Unity project (Option 1)
for the Arena platform. To get the project set up correctly and start on the integration
layer, we need three things confirmed:

1. **Unity version** — we plan to target the **latest Unity LTS**. Can you confirm that's
   what the Arena shell supports, and the exact version you build against?

2. **Arena Unity package / interface definitions** — can you send the package (or a sample
   project) with the real `IArcadeGame` and `IGameBridge` definitions, any adapter base
   class, an example scene registration, and the **`NotifyGameFinished` payload type**? We
   want our signatures to match yours from the start rather than guess and rework.

3. **Render pipeline** — is URP/HDRP/Built-in required or constrained? We're planning **URP
   with Bloom** for the neon look and want to confirm before we pick the project template.

---

*Deferred until closer to integration/delivery (not blocking us now): full
`gameSpecificDetails` fields, when exactly to call `NotifyGameReady`, `Exit` UI ownership,
orientation + safe-area spec, `gameId` registration, handoff format, Test SDK availability,
and media asset specs.*
