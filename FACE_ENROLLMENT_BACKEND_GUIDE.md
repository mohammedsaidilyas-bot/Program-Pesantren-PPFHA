# Central Face Descriptor API (prototype)

This branch adds three protected POST actions to Code.gs. They are not yet wired to the browser module.

## Actions (JSON POST to Apps Script web-app endpoint)
All actions require `apiKey` matching Script Property `ADMIN_API_KEY`.

- `faceEnroll`: body `{action:"faceEnroll", apiKey:"...", data:{nis:"...", descriptor:[128 numbers], consent:true, consentAt:"ISO timestamp"}}`
- `faceList`: body `{action:"faceList", apiKey:"..."}` returns enrolled NIS and descriptors.
- `faceDelete`: body `{action:"faceDelete", apiKey:"...", nis:"..."}`

A sheet named `FaceDescriptors` is created on demand with columns NIS, descriptor, consent, consentAt, updatedAt. The server stores numerical face descriptors only—not raw images—and updates an existing enrollment for the same NIS.

## Important before use
This is still a prototype and biometric descriptors are sensitive data. Enrollment must be restricted to authorized staff, and santri (and guardians where appropriate) should give informed, voluntary consent with an alternative attendance method. Do not deploy or use this for real attendance until retention/deletion policy, security review, consent workflow, and liveness/anti-spoofing are implemented. No liveness detection is included.
