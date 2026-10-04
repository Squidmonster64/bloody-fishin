NAS packaging uses the existing production UI, weather engine and server. Only `nas/vite.config.ts` rewrites assets/navigation to the authenticated Hope–Johnstone gateway. The public Vite config and Railway runtime remain unchanged.

Build off the NAS, then load the reviewed linux/amd64 image. No ports are published by the internal Fishin service. The suite gateway permits only authenticated GET/HEAD requests; the machine interface is disabled. Weather/geocoding provider reads remain necessary, and failed providers retain the production error handling.

```sh
docker build --platform linux/amd64 -f nas/Dockerfile -t bloody-fishin:REVIEWED_SHA .
```

Do not deploy until the suite handoff's readiness gates pass and David approves. This session has no Docker daemon; container execution is unverified.
