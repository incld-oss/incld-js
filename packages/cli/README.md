# `@incld/cli`

Scaffold the secure incld server routes and browser provider into an existing
Next.js App Router project.

```bash
npx @incld/cli init
```

The command detects `src/app` or `app`, TypeScript or JavaScript, and the
project's package manager. It installs `@incld/client`, `@incld/react`, and the
selected feature packages. The generated server adapter denies all proxy
operations until you connect it to your application's session and authorization
policy.

The initializer never overwrites an existing file. Preview its complete plan:

```bash
npx @incld/cli init --dry-run
```

Select feature packages or scaffold without installing dependencies:

```bash
npx @incld/cli init --features schedules,approvals
npx @incld/cli init --features none --no-install
```

Node.js 20.9 or newer is required.
