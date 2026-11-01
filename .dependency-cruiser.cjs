/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-no-outward-deps',
      severity: 'error',
      comment:
        'Domain must not depend on Application, Infrastructure, or Presentation',
      from: { path: '^src/domain' },
      to: { path: '^src/(application|infrastructure|presentation)' },
    },
    {
      name: 'application-no-infrastructure-or-presentation',
      severity: 'error',
      comment: 'Application must not depend on Infrastructure or Presentation',
      from: { path: '^src/application' },
      to: { path: '^src/(infrastructure|presentation)' },
    },
    {
      name: 'infrastructure-no-presentation',
      severity: 'error',
      comment: 'Infrastructure must not depend on Presentation',
      from: { path: '^src/infrastructure' },
      to: { path: '^src/presentation' },
    },
    {
      name: 'presentation-no-infrastructure',
      severity: 'error',
      comment:
        'Presentation must go through Application/Domain, not Infrastructure directly. ' +
        '*.module.ts files are exempt: NestJS composition roots are where interface -> ' +
        'implementation DI bindings are registered, per the module wiring the guide itself calls for.',
      from: { path: '^src/presentation', pathNot: '\\.module\\.ts$' },
      to: { path: '^src/infrastructure' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};
