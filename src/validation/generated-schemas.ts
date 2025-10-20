// AUTO-GENERATED - DO NOT EDIT
// Generated at 2025-10-20T20:04:06.040Z

import { z } from 'zod';

export const ApplicationUserSchema = z.object({
  active: z.boolean().optional(),
  displayName: z.string().optional(),
  emailAddress: z.string().optional(),
  id: z.number().int().optional(),
  name: z.string().optional(),
  slug: z.string().optional(),
  type: z.enum(['NORMAL', 'SERVICE']).optional(),
});

export type ApplicationUser = z.infer<typeof ApplicationUserSchema>;

export const PageRequestImplSchema = z.object({
  limit: z.number().int().optional(),
  start: z.number().int().optional(),
});

export type PageRequestImpl = z.infer<typeof PageRequestImplSchema>;

export const RestAccessTokenSchema = z.object({
  createdDate: z.string().datetime().optional(),
  id: z.string().optional(),
  name: z.string().optional(),
});

export type RestAccessToken = z.infer<typeof RestAccessTokenSchema>;

export const RestAccessTokenRequestSchema = z.object({
  expiryDays: z.number().int().optional(),
  name: z.string().optional(),
  permissions: z
    .array(z.string())
    .refine((value) => value.length === new Set(value.map((item) => JSON.stringify(item))).size, {
      message: 'Array items must be unique',
    }),
});

export type RestAccessTokenRequest = z.infer<typeof RestAccessTokenRequestSchema>;

export const RestErrorMessageSchema = z.object({
  context: z.string().optional(),
  exceptionName: z.string().optional(),
  message: z.string().optional(),
});

export type RestErrorMessage = z.infer<typeof RestErrorMessageSchema>;

export const RestErrorsSchema = z.object({
  errors: z
    .array(
      z.object({
        context: z.string().optional(),
        exceptionName: z.string().optional(),
        message: z.string().optional(),
      }),
    )
    .optional(),
});

export type RestErrors = z.infer<typeof RestErrorsSchema>;

export const RestRawAccessTokenSchema = z.object({
  createdDate: z.string().datetime().optional(),
  id: z.string().optional(),
  name: z.string().optional(),
  token: z.string().optional(),
});

export type RestRawAccessToken = z.infer<typeof RestRawAccessTokenSchema>;

export const ScopeSchema = z.object({
  resourceId: z.number().int(),
  type: z.enum(['GLOBAL', 'PROJECT', 'REPOSITORY']),
});

export type Scope = z.infer<typeof ScopeSchema>;

export const ProjectSchema = z.object({
  description: z.string().optional(),
  id: z.number().int().optional(),
  key: z.string().optional(),
  name: z.string().optional(),
  public: z.boolean().optional(),
  type: z.enum(['NORMAL', 'PERSONAL']),
});

export type Project = z.infer<typeof ProjectSchema>;

export const RefTypeSchema = z.object({});

export type RefType = z.infer<typeof RefTypeSchema>;

export const RepositorySchema = z.lazy(() => RepositorySchemaDefinition);

const RepositorySchemaDefinition: z.ZodTypeAny = z.object({
  archived: z.boolean().optional(),
  description: z.string().optional(),
  fork: z.boolean().optional(),
  forkable: z.boolean().optional(),
  hierarchyId: z.string(),
  id: z.number().int().optional(),
  local: z.boolean().optional(),
  name: z.string(),
  offline: z.boolean().optional(),
  origin: z
    .object({
      archived: z.boolean().optional(),
      description: z.string().optional(),
      fork: z.boolean().optional(),
      forkable: z.boolean().optional(),
      hierarchyId: z.string(),
      id: z.number().int().optional(),
      local: z.boolean().optional(),
      name: z.string(),
      offline: z.boolean().optional(),
      origin: z.lazy(() => RepositorySchema).optional(),
      partition: z.number().int().optional(),
      project: ProjectSchema,
      public: z.boolean().optional(),
      readOnly: z.boolean().optional(),
      remote: z.boolean().optional(),
      scmId: z.string(),
      slug: z.string(),
      state: z.enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE']),
      statusMessage: z.string(),
    })
    .optional(),
  partition: z.number().int().optional(),
  project: z.object({
    description: z.string().optional(),
    id: z.number().int().optional(),
    key: z.string().optional(),
    name: z.string().optional(),
    public: z.boolean().optional(),
    type: z.enum(['NORMAL', 'PERSONAL']),
  }),
  public: z.boolean().optional(),
  readOnly: z.boolean().optional(),
  remote: z.boolean().optional(),
  scmId: z.string(),
  slug: z.string(),
  state: z.enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE']),
  statusMessage: z.string(),
});

export type Repository = z.infer<typeof RepositorySchema>;

export const RestBranchSchema = z.object({
  default: z.boolean().optional(),
  displayId: z.string().optional(),
  id: z.string().optional(),
  latestChangeset: z.string().optional(),
  latestCommit: z.string().optional(),
  type: z.object({}).optional(),
});

export type RestBranch = z.infer<typeof RestBranchSchema>;

export const RestBranchCreateRequestSchema = z.object({
  name: z.string().optional(),
  startPoint: z.string().max(40).optional(),
});

export type RestBranchCreateRequest = z.infer<typeof RestBranchCreateRequestSchema>;

export const RestBranchDeleteRequestSchema = z.object({
  dryRun: z.boolean().optional(),
  endPoint: z.string().max(40).optional(),
  name: z.string().optional(),
});

export type RestBranchDeleteRequest = z.infer<typeof RestBranchDeleteRequestSchema>;

export const RestMinimalRefSchema = z.object({
  displayId: z.string().optional(),
  id: z.string().optional(),
  type: z.enum(['BRANCH', 'TAG']).optional(),
});

export type RestMinimalRef = z.infer<typeof RestMinimalRefSchema>;

export const RestBulkAddInsightAnnotationRequestSchema = z.object({
  annotations: z
    .array(
      z.object({
        externalId: z.string().min(0).max(450).optional(),
        line: z.number().int().min(0).optional(),
        link: z.string().optional(),
        message: z.string().min(0).max(2000),
        path: z.string().min(0).max(50000).optional(),
        severity: z.string().regex(new RegExp('LOW|MEDIUM|HIGH')),
        type: z.string().regex(new RegExp('VULNERABILITY|CODE_SMELL|BUG')).optional(),
      }),
    )
    .min(1)
    .max(2147483647)
    .optional(),
});

export type RestBulkAddInsightAnnotationRequest = z.infer<
  typeof RestBulkAddInsightAnnotationRequestSchema
>;

export const RestInsightAnnotationSchema = z.object({
  externalId: z.string().optional(),
  line: z.number().int().optional(),
  link: z.string().optional(),
  message: z.string().optional(),
  path: z.string().optional(),
  reportKey: z.string().optional(),
  severity: z.string().optional(),
  type: z.string().optional(),
});

export type RestInsightAnnotation = z.infer<typeof RestInsightAnnotationSchema>;

export const RestInsightAnnotationsResponseSchema = z.object({
  annotations: z
    .array(
      z.object({
        externalId: z.string().optional(),
        line: z.number().int().optional(),
        link: z.string().optional(),
        message: z.string().optional(),
        path: z.string().optional(),
        reportKey: z.string().optional(),
        severity: z.string().optional(),
        type: z.string().optional(),
      }),
    )
    .optional(),
});

export type RestInsightAnnotationsResponse = z.infer<typeof RestInsightAnnotationsResponseSchema>;

export const RestInsightReportSchema = z.object({
  createdDate: z.number().optional(),
  data: z
    .array(
      z.object({
        title: z.string().min(1).optional(),
        type: z
          .string()
          .regex(new RegExp('BOOLEAN|DATE|DURATION|LINK|NUMBER|PERCENTAGE|TEXT'))
          .optional(),
        value: z.object({}).optional(),
      }),
    )
    .optional(),
  details: z.string().optional(),
  key: z.string().optional(),
  link: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  reporter: z.string().optional(),
  result: z.enum(['FAIL', 'PASS']).optional(),
  title: z.string().optional(),
});

export type RestInsightReport = z.infer<typeof RestInsightReportSchema>;

export const RestInsightReportDataSchema = z.object({
  title: z.string().min(1).optional(),
  type: z
    .string()
    .regex(new RegExp('BOOLEAN|DATE|DURATION|LINK|NUMBER|PERCENTAGE|TEXT'))
    .optional(),
  value: z.object({}).optional(),
});

export type RestInsightReportData = z.infer<typeof RestInsightReportDataSchema>;

export const RestSetInsightReportRequestSchema = z.object({
  coverageProviderKey: z.string().optional(),
  createdDate: z.number().int().optional(),
  data: z
    .array(
      z.object({
        title: z.string().min(1).optional(),
        type: z
          .string()
          .regex(new RegExp('BOOLEAN|DATE|DURATION|LINK|NUMBER|PERCENTAGE|TEXT'))
          .optional(),
        value: z.object({}).optional(),
      }),
    )
    .min(0)
    .max(6),
  details: z.string().optional(),
  link: z.string().optional(),
  logoUrl: z.string().optional(),
  reporter: z.string().min(0).max(450).optional(),
  result: z.string().regex(new RegExp('FAIL|PASS')).optional(),
  title: z.string().min(0).max(450),
});

export type RestSetInsightReportRequest = z.infer<typeof RestSetInsightReportRequestSchema>;

export const RestSingleAddInsightAnnotationRequestSchema = z.object({
  externalId: z.string().min(0).max(450).optional(),
  line: z.number().int().min(0).optional(),
  link: z.string().optional(),
  message: z.string().min(0).max(2000),
  path: z.string().min(0).max(50000).optional(),
  severity: z.string().regex(new RegExp('LOW|MEDIUM|HIGH')),
  type: z.string().regex(new RegExp('VULNERABILITY|CODE_SMELL|BUG')).optional(),
});

export type RestSingleAddInsightAnnotationRequest = z.infer<
  typeof RestSingleAddInsightAnnotationRequestSchema
>;

export const RestBuildStatsSchema = z.object({
  cancelled: z.number().int().optional(),
  failed: z.number().int().optional(),
  inProgress: z.number().int().optional(),
  successful: z.number().int().optional(),
  unknown: z.number().int().optional(),
});

export type RestBuildStats = z.infer<typeof RestBuildStatsSchema>;

export const RestBuildStatusSchema = z.object({
  buildNumber: z.string().optional(),
  createdDate: z.number().int().optional(),
  description: z.string().optional(),
  duration: z.number().int().optional(),
  key: z.string().optional(),
  name: z.string().optional(),
  parent: z.string().optional(),
  projectKey: z.string().optional(),
  ref: z.string().optional(),
  repositorySlug: z.string().optional(),
  state: z.enum(['CANCELLED', 'FAILED', 'INPROGRESS', 'SUCCESSFUL', 'UNKNOWN']).optional(),
  testResults: z
    .object({
      failed: z.number().int().optional(),
      skipped: z.number().int().optional(),
      successful: z.number().int().optional(),
    })
    .optional(),
  updatedDate: z.number().int().optional(),
  url: z.string().optional(),
});

export type RestBuildStatus = z.infer<typeof RestBuildStatusSchema>;

export const RestMultipleBuildStatsSchema = z.object({});

export type RestMultipleBuildStats = z.infer<typeof RestMultipleBuildStatsSchema>;

export const RestRefMatcherSchema = z.object({
  displayId: z.string().optional(),
  id: z.string().optional(),
  type: z
    .object({
      id: z.enum(['ANY_REF', 'BRANCH', 'PATTERN', 'MODEL_CATEGORY', 'MODEL_BRANCH']),
      name: z.string(),
    })
    .optional(),
});

export type RestRefMatcher = z.infer<typeof RestRefMatcherSchema>;

export const RestRefMatcherTypeSchema = z.object({
  id: z.enum(['ANY_REF', 'BRANCH', 'PATTERN', 'MODEL_CATEGORY', 'MODEL_BRANCH']).optional(),
  name: z.string().optional(),
});

export type RestRefMatcherType = z.infer<typeof RestRefMatcherTypeSchema>;

export const RestRequiredBuildConditionSchema = z.object({
  buildParentKeys: z.array(z.string()).optional(),
  exemptRefMatcher: z
    .object({
      displayId: z.string().optional(),
      id: z.string().optional(),
      type: z
        .object({
          id: z.enum(['ANY_REF', 'BRANCH', 'PATTERN', 'MODEL_CATEGORY', 'MODEL_BRANCH']),
          name: z.string(),
        })
        .optional(),
    })
    .optional(),
  id: z.number().int().optional(),
  refMatcher: z
    .object({
      displayId: z.string().optional(),
      id: z.string().optional(),
      type: z
        .object({
          id: z.enum(['ANY_REF', 'BRANCH', 'PATTERN', 'MODEL_CATEGORY', 'MODEL_BRANCH']),
          name: z.string(),
        })
        .optional(),
    })
    .optional(),
});

export type RestRequiredBuildCondition = z.infer<typeof RestRequiredBuildConditionSchema>;

export const RestRequiredBuildConditionSetRequestSchema = z.object({
  buildParentKeys: z.array(z.string()).min(0).max(100),
  exemptRefMatcher: z
    .object({
      displayId: z.string().optional(),
      id: z.string().optional(),
      type: z
        .object({
          id: z.enum(['ANY_REF', 'BRANCH', 'PATTERN', 'MODEL_CATEGORY', 'MODEL_BRANCH']),
          name: z.string(),
        })
        .optional(),
    })
    .optional(),
  refMatcher: z.object({
    displayId: z.string().optional(),
    id: z.string().optional(),
    type: z
      .object({
        id: z.enum(['ANY_REF', 'BRANCH', 'PATTERN', 'MODEL_CATEGORY', 'MODEL_BRANCH']),
        name: z.string(),
      })
      .optional(),
  }),
});

export type RestRequiredBuildConditionSetRequest = z.infer<
  typeof RestRequiredBuildConditionSetRequestSchema
>;

export const RestCspSettingsSchema = z.object({
  strictness: z.enum(['STRICT', 'REPORT_ONLY', 'DEFAULT']).optional(),
});

export type RestCspSettings = z.infer<typeof RestCspSettingsSchema>;

export const RestApplicationUserSchema = z.object({
  active: z.boolean().optional(),
  avatarUrl: z.string().optional(),
  displayName: z.string().optional(),
  emailAddress: z.string().optional(),
  id: z.number().int().optional(),
  links: z.object({}).optional(),
  name: z.string().optional(),
  slug: z.string().optional(),
  type: z.enum(['NORMAL', 'SERVICE']).optional(),
});

export type RestApplicationUser = z.infer<typeof RestApplicationUserSchema>;

export const RestDefaultReviewersRequestSchema = z.object({
  requiredApprovals: z.number().int().optional(),
  reviewerGroups: z
    .array(
      z.object({
        avatarUrl: z.string().optional(),
        description: z.string().optional(),
        id: z.number().int().optional(),
        name: z.string().optional(),
        scope: z
          .object({
            resourceId: z.number().int(),
            type: z.enum(['GLOBAL', 'PROJECT', 'REPOSITORY']),
          })
          .optional(),
        users: z.array(ApplicationUserSchema).optional(),
      }),
    )
    .optional(),
  reviewers: z
    .array(
      z.object({
        active: z.boolean().optional(),
        avatarUrl: z.string().optional(),
        displayName: z.string().optional(),
        emailAddress: z.string().optional(),
        id: z.number().int().optional(),
        links: z.object({}).optional(),
        name: z.string().optional(),
        slug: z.string().optional(),
        type: z.enum(['NORMAL', 'SERVICE']).optional(),
      }),
    )
    .optional(),
  sourceMatcher: z
    .object({
      displayId: z.string().optional(),
      id: z.string().optional(),
      type: z
        .object({
          id: z.enum(['ANY_REF', 'BRANCH', 'PATTERN', 'MODEL_CATEGORY', 'MODEL_BRANCH']),
          name: z.string(),
        })
        .optional(),
    })
    .optional(),
  targetMatcher: z
    .object({
      displayId: z.string().optional(),
      id: z.string().optional(),
      type: z
        .object({
          id: z.enum(['ANY_REF', 'BRANCH', 'PATTERN', 'MODEL_CATEGORY', 'MODEL_BRANCH']),
          name: z.string(),
        })
        .optional(),
    })
    .optional(),
});

export type RestDefaultReviewersRequest = z.infer<typeof RestDefaultReviewersRequestSchema>;

export const RestPullRequestConditionSchema = z.object({
  id: z.number().int().optional(),
  requiredApprovals: z.number().int().optional(),
  reviewerGroups: z
    .array(
      z.object({
        avatarUrl: z.string().optional(),
        description: z.string().optional(),
        id: z.number().int().optional(),
        name: z.string().optional(),
        scope: z
          .object({
            resourceId: z.number().int(),
            type: z.enum(['GLOBAL', 'PROJECT', 'REPOSITORY']),
          })
          .optional(),
        users: z.array(ApplicationUserSchema).optional(),
      }),
    )
    .optional(),
  reviewers: z
    .array(
      z.object({
        avatarUrl: z.string().optional(),
        description: z.string().optional(),
        id: z.number().int().optional(),
        name: z.string().optional(),
        scope: z
          .object({
            resourceId: z.number().int(),
            type: z.enum(['GLOBAL', 'PROJECT', 'REPOSITORY']),
          })
          .optional(),
        users: z.array(ApplicationUserSchema).optional(),
      }),
    )
    .optional(),
  scope: z
    .object({
      resourceId: z.number().int(),
      type: z.enum(['GLOBAL', 'PROJECT', 'REPOSITORY']),
    })
    .optional(),
  sourceRefMatcher: z
    .object({
      displayId: z.string().optional(),
      id: z.string().optional(),
      type: z
        .object({
          id: z.enum(['ANY_REF', 'BRANCH', 'PATTERN', 'MODEL_CATEGORY', 'MODEL_BRANCH']),
          name: z.string(),
        })
        .optional(),
    })
    .optional(),
  targetRefMatcher: z
    .object({
      displayId: z.string().optional(),
      id: z.string().optional(),
      type: z
        .object({
          id: z.enum(['ANY_REF', 'BRANCH', 'PATTERN', 'MODEL_CATEGORY', 'MODEL_BRANCH']),
          name: z.string(),
        })
        .optional(),
    })
    .optional(),
});

export type RestPullRequestCondition = z.infer<typeof RestPullRequestConditionSchema>;

export const RestRelatedLinksSchema = z.object({});

export type RestRelatedLinks = z.infer<typeof RestRelatedLinksSchema>;

export const RestReviewerGroupSchema = z.object({
  avatarUrl: z.string().optional(),
  description: z.string().optional(),
  id: z.number().int().optional(),
  name: z.string().optional(),
  scope: z
    .object({
      resourceId: z.number().int(),
      type: z.enum(['GLOBAL', 'PROJECT', 'REPOSITORY']),
    })
    .optional(),
  users: z
    .array(
      z.object({
        active: z.boolean().optional(),
        displayName: z.string().optional(),
        emailAddress: z.string().optional(),
        id: z.number().int().optional(),
        name: z.string().optional(),
        slug: z.string().optional(),
        type: z.enum(['NORMAL', 'SERVICE']).optional(),
      }),
    )
    .optional(),
});

export type RestReviewerGroup = z.infer<typeof RestReviewerGroupSchema>;

export const RestScopeSchema = z.object({
  resourceId: z.number().int().optional(),
  type: z.enum(['GLOBAL', 'PROJECT', 'REPOSITORY']).optional(),
});

export type RestScope = z.infer<typeof RestScopeSchema>;

export const LineNumberRangeSchema = z.object({
  maximum: z.number().int().optional(),
  minimum: z.number().int().optional(),
  singleLine: z.boolean().optional(),
});

export type LineNumberRange = z.infer<typeof LineNumberRangeSchema>;

export const CommentThreadDiffAnchorSchema = z.object({
  diffType: z.enum(['COMMIT', 'EFFECTIVE', 'RANGE']),
  fileAnchor: z.boolean().optional(),
  fileType: z.enum(['FROM', 'TO']),
  fromHash: z.string(),
  line: z.number().int().optional(),
  lineAnchor: z.boolean().optional(),
  lineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']),
  multilineAnchor: z.boolean().optional(),
  multilineDestinationRange: z.object({
    maximum: z.number().int().optional(),
    minimum: z.number().int().optional(),
    singleLine: z.boolean().optional(),
  }),
  multilineSourceRange: z.object({
    maximum: z.number().int().optional(),
    minimum: z.number().int().optional(),
    singleLine: z.boolean().optional(),
  }),
  multilineStartLine: z.number().int(),
  multilineStartLineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']),
  orphaned: z.boolean().optional(),
  path: z.string(),
  srcPath: z.string(),
  toHash: z.string(),
});

export type CommentThreadDiffAnchor = z.infer<typeof CommentThreadDiffAnchorSchema>;

export const CommentOperationsSchema = z.object({
  deletable: z.boolean().optional(),
  editable: z.boolean().optional(),
  transitionable: z.boolean().optional(),
});

export type CommentOperations = z.infer<typeof CommentOperationsSchema>;

export const CommentThreadSchema = z.lazy(() => CommentThreadSchemaDefinition);

const CommentThreadSchemaDefinition: z.ZodTypeAny = z.object({
  anchor: z.object({
    diffType: z.enum(['COMMIT', 'EFFECTIVE', 'RANGE']),
    fileAnchor: z.boolean().optional(),
    fileType: z.enum(['FROM', 'TO']),
    fromHash: z.string(),
    line: z.number().int().optional(),
    lineAnchor: z.boolean().optional(),
    lineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']),
    multilineAnchor: z.boolean().optional(),
    multilineDestinationRange: LineNumberRangeSchema,
    multilineSourceRange: LineNumberRangeSchema,
    multilineStartLine: z.number().int(),
    multilineStartLineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']),
    orphaned: z.boolean().optional(),
    path: z.string(),
    srcPath: z.string(),
    toHash: z.string(),
  }),
  anchored: z.boolean().optional(),
  commentable: z.object({}),
  createdDate: z.string().datetime(),
  id: z.number().int().optional(),
  resolved: z.boolean().optional(),
  resolvedDate: z.string().datetime().optional(),
  resolver: z
    .object({
      active: z.boolean().optional(),
      displayName: z.string().optional(),
      emailAddress: z.string().optional(),
      id: z.number().int().optional(),
      name: z.string().optional(),
      slug: z.string().optional(),
      type: z.enum(['NORMAL', 'SERVICE']).optional(),
    })
    .optional(),
  rootComment: z.object({
    anchor: CommentThreadDiffAnchorSchema,
    author: ApplicationUserSchema,
    comments: z.array(z.lazy(() => CommentSchema)),
    createdDate: z.string().datetime(),
    id: z.number().int().optional(),
    permittedOperations: CommentOperationsSchema,
    properties: z.object({}),
    resolvedDate: z.string().datetime().optional(),
    resolver: ApplicationUserSchema.optional(),
    severity: z.enum(['NORMAL', 'BLOCKER']),
    state: z.enum(['OPEN', 'PENDING', 'RESOLVED']),
    text: z.string(),
    thread: z.lazy(() => CommentThreadSchema),
    updatedDate: z.string().datetime(),
    version: z.number().int().optional(),
  }),
  updatedDate: z.string().datetime(),
});

export type CommentThread = z.infer<typeof CommentThreadSchema>;

export const CommentableSchema = z.object({});

export type Commentable = z.infer<typeof CommentableSchema>;

export const CommentSchema = z.lazy(() => CommentSchemaDefinition);

const CommentSchemaDefinition: z.ZodTypeAny = z.object({
  anchor: z.object({
    diffType: z.enum(['COMMIT', 'EFFECTIVE', 'RANGE']),
    fileAnchor: z.boolean().optional(),
    fileType: z.enum(['FROM', 'TO']),
    fromHash: z.string(),
    line: z.number().int().optional(),
    lineAnchor: z.boolean().optional(),
    lineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']),
    multilineAnchor: z.boolean().optional(),
    multilineDestinationRange: LineNumberRangeSchema,
    multilineSourceRange: LineNumberRangeSchema,
    multilineStartLine: z.number().int(),
    multilineStartLineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']),
    orphaned: z.boolean().optional(),
    path: z.string(),
    srcPath: z.string(),
    toHash: z.string(),
  }),
  author: z.object({
    active: z.boolean().optional(),
    displayName: z.string().optional(),
    emailAddress: z.string().optional(),
    id: z.number().int().optional(),
    name: z.string().optional(),
    slug: z.string().optional(),
    type: z.enum(['NORMAL', 'SERVICE']).optional(),
  }),
  comments: z.array(
    z.object({
      anchor: CommentThreadDiffAnchorSchema,
      author: ApplicationUserSchema,
      comments: z.array(z.lazy(() => CommentSchema)),
      createdDate: z.string().datetime(),
      id: z.number().int().optional(),
      permittedOperations: CommentOperationsSchema,
      properties: z.object({}),
      resolvedDate: z.string().datetime().optional(),
      resolver: ApplicationUserSchema.optional(),
      severity: z.enum(['NORMAL', 'BLOCKER']),
      state: z.enum(['OPEN', 'PENDING', 'RESOLVED']),
      text: z.string(),
      thread: CommentThreadSchema,
      updatedDate: z.string().datetime(),
      version: z.number().int().optional(),
    }),
  ),
  createdDate: z.string().datetime(),
  id: z.number().int().optional(),
  permittedOperations: z.object({
    deletable: z.boolean().optional(),
    editable: z.boolean().optional(),
    transitionable: z.boolean().optional(),
  }),
  properties: z.object({}),
  resolvedDate: z.string().datetime().optional(),
  resolver: z
    .object({
      active: z.boolean().optional(),
      displayName: z.string().optional(),
      emailAddress: z.string().optional(),
      id: z.number().int().optional(),
      name: z.string().optional(),
      slug: z.string().optional(),
      type: z.enum(['NORMAL', 'SERVICE']).optional(),
    })
    .optional(),
  severity: z.enum(['NORMAL', 'BLOCKER']),
  state: z.enum(['OPEN', 'PENDING', 'RESOLVED']),
  text: z.string(),
  thread: z.object({
    anchor: CommentThreadDiffAnchorSchema,
    anchored: z.boolean().optional(),
    commentable: CommentableSchema,
    createdDate: z.string().datetime(),
    id: z.number().int().optional(),
    resolved: z.boolean().optional(),
    resolvedDate: z.string().datetime().optional(),
    resolver: ApplicationUserSchema.optional(),
    rootComment: z.lazy(() => CommentSchema),
    updatedDate: z.string().datetime(),
  }),
  updatedDate: z.string().datetime(),
  version: z.number().int().optional(),
});

export type Comment = z.infer<typeof CommentSchema>;

export const PropertyMapSchema = z.object({});

export type PropertyMap = z.infer<typeof PropertyMapSchema>;

export const PullRequestSchema = z.lazy(() => PullRequestSchemaDefinition);

const PullRequestSchemaDefinition: z.ZodTypeAny = z.object({
  author: z.object({
    approved: z.boolean().optional(),
    lastReviewedCommit: z.string().optional(),
    pullRequest: z.lazy(() => PullRequestSchema),
    role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']),
    status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']),
    user: ApplicationUserSchema,
  }),
  closed: z.boolean().optional(),
  closedDate: z.string().datetime().optional(),
  createdDate: z.string().datetime(),
  crossRepository: z.boolean().optional(),
  description: z.string().optional(),
  draft: z.boolean().optional(),
  fromRef: z.object({
    displayId: z.string(),
    id: z.string(),
    latestCommit: z.string(),
    repository: RepositorySchema,
    type: RefTypeSchema,
  }),
  id: z.number().int().optional(),
  locked: z.boolean().optional(),
  open: z.boolean().optional(),
  participants: z
    .array(
      z.object({
        approved: z.boolean().optional(),
        lastReviewedCommit: z.string().optional(),
        pullRequest: z.lazy(() => PullRequestSchema),
        role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']),
        status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']),
        user: ApplicationUserSchema,
      }),
    )
    .refine((value) => value.length === new Set(value.map((item) => JSON.stringify(item))).size, {
      message: 'Array items must be unique',
    }),
  properties: z.object({}),
  reviewers: z
    .array(
      z.object({
        approved: z.boolean().optional(),
        lastReviewedCommit: z.string().optional(),
        pullRequest: z.lazy(() => PullRequestSchema),
        role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']),
        status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']),
        user: ApplicationUserSchema,
      }),
    )
    .refine((value) => value.length === new Set(value.map((item) => JSON.stringify(item))).size, {
      message: 'Array items must be unique',
    }),
  state: z.enum(['DECLINED', 'MERGED', 'OPEN']),
  title: z.string(),
  toRef: z.object({
    displayId: z.string(),
    id: z.string(),
    latestCommit: z.string(),
    repository: RepositorySchema,
    type: RefTypeSchema,
  }),
  updatedDate: z.string().datetime(),
  version: z.number().int().optional(),
});

export type PullRequest = z.infer<typeof PullRequestSchema>;

export const PullRequestRefSchema = z.object({
  displayId: z.string(),
  id: z.string(),
  latestCommit: z.string(),
  repository: z.object({
    archived: z.boolean().optional(),
    description: z.string().optional(),
    fork: z.boolean().optional(),
    forkable: z.boolean().optional(),
    hierarchyId: z.string(),
    id: z.number().int().optional(),
    local: z.boolean().optional(),
    name: z.string(),
    offline: z.boolean().optional(),
    origin: RepositorySchema.optional(),
    partition: z.number().int().optional(),
    project: ProjectSchema,
    public: z.boolean().optional(),
    readOnly: z.boolean().optional(),
    remote: z.boolean().optional(),
    scmId: z.string(),
    slug: z.string(),
    state: z.enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE']),
    statusMessage: z.string(),
  }),
  type: z.object({}),
});

export type PullRequestRef = z.infer<typeof PullRequestRefSchema>;

export const PullRequestParticipantSchema = z.lazy(() => PullRequestParticipantSchemaDefinition);

const PullRequestParticipantSchemaDefinition: z.ZodTypeAny = z.object({
  approved: z.boolean().optional(),
  lastReviewedCommit: z.string().optional(),
  pullRequest: z.object({
    author: z.lazy(() => PullRequestParticipantSchema),
    closed: z.boolean().optional(),
    closedDate: z.string().datetime().optional(),
    createdDate: z.string().datetime(),
    crossRepository: z.boolean().optional(),
    description: z.string().optional(),
    draft: z.boolean().optional(),
    fromRef: PullRequestRefSchema,
    id: z.number().int().optional(),
    locked: z.boolean().optional(),
    open: z.boolean().optional(),
    participants: z
      .array(z.lazy(() => PullRequestParticipantSchema))
      .refine((value) => value.length === new Set(value.map((item) => JSON.stringify(item))).size, {
        message: 'Array items must be unique',
      }),
    properties: z.object({}),
    reviewers: z
      .array(z.lazy(() => PullRequestParticipantSchema))
      .refine((value) => value.length === new Set(value.map((item) => JSON.stringify(item))).size, {
        message: 'Array items must be unique',
      }),
    state: z.enum(['DECLINED', 'MERGED', 'OPEN']),
    title: z.string(),
    toRef: PullRequestRefSchema,
    updatedDate: z.string().datetime(),
    version: z.number().int().optional(),
  }),
  role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']),
  status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']),
  user: z.object({
    active: z.boolean().optional(),
    displayName: z.string().optional(),
    emailAddress: z.string().optional(),
    id: z.number().int().optional(),
    name: z.string().optional(),
    slug: z.string().optional(),
    type: z.enum(['NORMAL', 'SERVICE']).optional(),
  }),
});

export type PullRequestParticipant = z.infer<typeof PullRequestParticipantSchema>;

export const RestPullRequestParticipantSchema = z.object({
  approved: z.boolean().optional(),
  lastReviewedCommit: z.string().optional(),
  role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
  status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
  user: z
    .object({
      active: z.boolean().optional(),
      avatarUrl: z.string().optional(),
      displayName: z.string(),
      emailAddress: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      name: z.string(),
      slug: z.string(),
      type: z.enum(['NORMAL', 'SERVICE']),
    })
    .optional(),
});

export type RestPullRequestParticipant = z.infer<typeof RestPullRequestParticipantSchema>;

export const RestCommentSchema = z.lazy(() => RestCommentSchemaDefinition);

const RestCommentSchemaDefinition: z.ZodTypeAny = z.object({
  anchor: z
    .object({
      diffType: z.enum(['COMMIT', 'EFFECTIVE', 'RANGE']).optional(),
      fileType: z.enum(['FROM', 'TO']).optional(),
      fromHash: z.string().optional(),
      line: z.number().int().optional(),
      lineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']).optional(),
      multilineMarker: z
        .object({
          startLine: z.number().int().optional(),
          startLineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']),
        })
        .optional(),
      multilineSpan: z
        .object({
          dstSpanEnd: z.number().int(),
          dstSpanStart: z.number().int(),
          srcSpanEnd: z.number().int(),
          srcSpanStart: z.number().int(),
        })
        .optional(),
      path: z
        .object({
          components: z.array(z.string()).optional(),
          extension: z.string().optional(),
          name: z.string().optional(),
          parent: z.string().optional(),
        })
        .optional(),
      pullRequest: z
        .object({
          author: z
            .object({
              approved: z.boolean().optional(),
              lastReviewedCommit: z.string().optional(),
              role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
              status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
              user: z
                .object({
                  active: z.boolean().optional(),
                  avatarUrl: z.string().optional(),
                  displayName: z.string(),
                  emailAddress: z.string().optional(),
                  id: z.number().int().optional(),
                  links: z.object({}).optional(),
                  name: z.string(),
                  slug: z.string(),
                  type: z.enum(['NORMAL', 'SERVICE']),
                })
                .optional(),
            })
            .optional(),
          closed: z.boolean().optional(),
          closedDate: z.number().int().optional(),
          createdDate: z.number().int().optional(),
          description: z.string().optional(),
          descriptionAsHtml: z.string().optional(),
          draft: z.boolean().optional(),
          fromRef: z
            .object({
              displayId: z.string(),
              id: z.string(),
              latestCommit: z.string(),
              repository: z
                .object({
                  archived: z.boolean().optional(),
                  defaultBranch: z.string().optional(),
                  description: z.string().optional(),
                  forkable: z.boolean().optional(),
                  hierarchyId: z.string().optional(),
                  id: z.number().int().optional(),
                  links: z.object({}).optional(),
                  name: z.string().optional(),
                  origin: z
                    .object({
                      archived: z.boolean().optional(),
                      defaultBranch: z.string().optional(),
                      description: z.string().optional(),
                      forkable: z.boolean().optional(),
                      hierarchyId: z.string().optional(),
                      id: z.number().int().optional(),
                      links: z.object({}).optional(),
                      name: z.string().optional(),
                      partition: z.number().int().optional(),
                      project: z
                        .object({
                          avatar: z.string().optional(),
                          avatarUrl: z.string().optional(),
                          description: z.string().optional(),
                          id: z.number().int().optional(),
                          key: z.string(),
                          links: z.object({}).optional(),
                          name: z.string(),
                          public: z.boolean().optional(),
                          scope: z.string().optional(),
                          type: z.enum(['NORMAL', 'PERSONAL']),
                        })
                        .optional(),
                      public: z.boolean().optional(),
                      relatedLinks: z.object({}).optional(),
                      scmId: z.string().optional(),
                      scope: z.string().optional(),
                      slug: z.string().optional(),
                      state: z
                        .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                        .optional(),
                      statusMessage: z.string().optional(),
                    })
                    .optional(),
                  partition: z.number().int().optional(),
                  project: z
                    .object({
                      avatar: z.string().optional(),
                      avatarUrl: z.string().optional(),
                      description: z.string().optional(),
                      id: z.number().int().optional(),
                      key: z.string(),
                      links: z.object({}).optional(),
                      name: z.string(),
                      public: z.boolean().optional(),
                      scope: z.string().optional(),
                      type: z.enum(['NORMAL', 'PERSONAL']),
                    })
                    .optional(),
                  public: z.boolean().optional(),
                  relatedLinks: z.object({}).optional(),
                  scmId: z.string().optional(),
                  scope: z.string().optional(),
                  slug: z.string().optional(),
                  state: z
                    .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                    .optional(),
                  statusMessage: z.string().optional(),
                })
                .optional(),
              type: z.enum(['BRANCH', 'TAG']).optional(),
            })
            .optional(),
          htmlDescription: z.string().optional(),
          id: z.number().int().optional(),
          links: z.object({}).optional(),
          locked: z.boolean().optional(),
          open: z.boolean().optional(),
          participants: z
            .array(
              z.object({
                approved: z.boolean().optional(),
                lastReviewedCommit: z.string().optional(),
                role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
                status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
                user: z
                  .object({
                    active: z.boolean().optional(),
                    avatarUrl: z.string().optional(),
                    displayName: z.string(),
                    emailAddress: z.string().optional(),
                    id: z.number().int().optional(),
                    links: z.object({}).optional(),
                    name: z.string(),
                    slug: z.string(),
                    type: z.enum(['NORMAL', 'SERVICE']),
                  })
                  .optional(),
              }),
            )
            .optional(),
          reviewers: z
            .array(
              z.object({
                approved: z.boolean().optional(),
                lastReviewedCommit: z.string().optional(),
                role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
                status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
                user: z
                  .object({
                    active: z.boolean().optional(),
                    avatarUrl: z.string().optional(),
                    displayName: z.string(),
                    emailAddress: z.string().optional(),
                    id: z.number().int().optional(),
                    links: z.object({}).optional(),
                    name: z.string(),
                    slug: z.string(),
                    type: z.enum(['NORMAL', 'SERVICE']),
                  })
                  .optional(),
              }),
            )
            .optional(),
          state: z.enum(['DECLINED', 'MERGED', 'OPEN']).optional(),
          title: z.string().optional(),
          toRef: z
            .object({
              displayId: z.string(),
              id: z.string(),
              latestCommit: z.string(),
              repository: z
                .object({
                  archived: z.boolean().optional(),
                  defaultBranch: z.string().optional(),
                  description: z.string().optional(),
                  forkable: z.boolean().optional(),
                  hierarchyId: z.string().optional(),
                  id: z.number().int().optional(),
                  links: z.object({}).optional(),
                  name: z.string().optional(),
                  origin: z
                    .object({
                      archived: z.boolean().optional(),
                      defaultBranch: z.string().optional(),
                      description: z.string().optional(),
                      forkable: z.boolean().optional(),
                      hierarchyId: z.string().optional(),
                      id: z.number().int().optional(),
                      links: z.object({}).optional(),
                      name: z.string().optional(),
                      partition: z.number().int().optional(),
                      project: z
                        .object({
                          avatar: z.string().optional(),
                          avatarUrl: z.string().optional(),
                          description: z.string().optional(),
                          id: z.number().int().optional(),
                          key: z.string(),
                          links: z.object({}).optional(),
                          name: z.string(),
                          public: z.boolean().optional(),
                          scope: z.string().optional(),
                          type: z.enum(['NORMAL', 'PERSONAL']),
                        })
                        .optional(),
                      public: z.boolean().optional(),
                      relatedLinks: z.object({}).optional(),
                      scmId: z.string().optional(),
                      scope: z.string().optional(),
                      slug: z.string().optional(),
                      state: z
                        .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                        .optional(),
                      statusMessage: z.string().optional(),
                    })
                    .optional(),
                  partition: z.number().int().optional(),
                  project: z
                    .object({
                      avatar: z.string().optional(),
                      avatarUrl: z.string().optional(),
                      description: z.string().optional(),
                      id: z.number().int().optional(),
                      key: z.string(),
                      links: z.object({}).optional(),
                      name: z.string(),
                      public: z.boolean().optional(),
                      scope: z.string().optional(),
                      type: z.enum(['NORMAL', 'PERSONAL']),
                    })
                    .optional(),
                  public: z.boolean().optional(),
                  relatedLinks: z.object({}).optional(),
                  scmId: z.string().optional(),
                  scope: z.string().optional(),
                  slug: z.string().optional(),
                  state: z
                    .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                    .optional(),
                  statusMessage: z.string().optional(),
                })
                .optional(),
              type: z.enum(['BRANCH', 'TAG']).optional(),
            })
            .optional(),
          updatedDate: z.number().int().optional(),
          version: z.number().int().optional(),
        })
        .optional(),
      srcPath: z
        .object({
          components: z.array(z.string()).optional(),
          extension: z.string().optional(),
          name: z.string().optional(),
          parent: z.string().optional(),
        })
        .optional(),
      toHash: z.string().optional(),
    })
    .optional(),
  anchored: z.boolean().optional(),
  author: z
    .object({
      active: z.boolean().optional(),
      avatarUrl: z.string().optional(),
      displayName: z.string(),
      emailAddress: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      name: z.string(),
      slug: z.string(),
      type: z.enum(['NORMAL', 'SERVICE']),
    })
    .optional(),
  comments: z
    .array(
      z.object({
        anchor: z
          .object({
            diffType: z.enum(['COMMIT', 'EFFECTIVE', 'RANGE']).optional(),
            fileType: z.enum(['FROM', 'TO']).optional(),
            fromHash: z.string().optional(),
            line: z.number().int().optional(),
            lineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']).optional(),
            multilineMarker: z
              .object({
                startLine: z.number().int().optional(),
                startLineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']),
              })
              .optional(),
            multilineSpan: z
              .object({
                dstSpanEnd: z.number().int(),
                dstSpanStart: z.number().int(),
                srcSpanEnd: z.number().int(),
                srcSpanStart: z.number().int(),
              })
              .optional(),
            path: z
              .object({
                components: z.array(z.string()).optional(),
                extension: z.string().optional(),
                name: z.string().optional(),
                parent: z.string().optional(),
              })
              .optional(),
            pullRequest: z
              .object({
                author: z
                  .object({
                    approved: z.boolean().optional(),
                    lastReviewedCommit: z.string().optional(),
                    role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
                    status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
                    user: z
                      .object({
                        active: z.boolean().optional(),
                        avatarUrl: z.string().optional(),
                        displayName: z.string(),
                        emailAddress: z.string().optional(),
                        id: z.number().int().optional(),
                        links: z.object({}).optional(),
                        name: z.string(),
                        slug: z.string(),
                        type: z.enum(['NORMAL', 'SERVICE']),
                      })
                      .optional(),
                  })
                  .optional(),
                closed: z.boolean().optional(),
                closedDate: z.number().int().optional(),
                createdDate: z.number().int().optional(),
                description: z.string().optional(),
                descriptionAsHtml: z.string().optional(),
                draft: z.boolean().optional(),
                fromRef: z
                  .object({
                    displayId: z.string(),
                    id: z.string(),
                    latestCommit: z.string(),
                    repository: z
                      .object({
                        archived: z.boolean().optional(),
                        defaultBranch: z.string().optional(),
                        description: z.string().optional(),
                        forkable: z.boolean().optional(),
                        hierarchyId: z.string().optional(),
                        id: z.number().int().optional(),
                        links: z.object({}).optional(),
                        name: z.string().optional(),
                        origin: z
                          .object({
                            archived: z.boolean().optional(),
                            defaultBranch: z.string().optional(),
                            description: z.string().optional(),
                            forkable: z.boolean().optional(),
                            hierarchyId: z.string().optional(),
                            id: z.number().int().optional(),
                            links: z.object({}).optional(),
                            name: z.string().optional(),
                            partition: z.number().int().optional(),
                            project: z
                              .object({
                                avatar: z.string().optional(),
                                avatarUrl: z.string().optional(),
                                description: z.string().optional(),
                                id: z.number().int().optional(),
                                key: z.string(),
                                links: z.object({}).optional(),
                                name: z.string(),
                                public: z.boolean().optional(),
                                scope: z.string().optional(),
                                type: z.enum(['NORMAL', 'PERSONAL']),
                              })
                              .optional(),
                            public: z.boolean().optional(),
                            relatedLinks: z.object({}).optional(),
                            scmId: z.string().optional(),
                            scope: z.string().optional(),
                            slug: z.string().optional(),
                            state: z
                              .enum([
                                'AVAILABLE',
                                'INITIALISATION_FAILED',
                                'INITIALISING',
                                'OFFLINE',
                              ])
                              .optional(),
                            statusMessage: z.string().optional(),
                          })
                          .optional(),
                        partition: z.number().int().optional(),
                        project: z
                          .object({
                            avatar: z.string().optional(),
                            avatarUrl: z.string().optional(),
                            description: z.string().optional(),
                            id: z.number().int().optional(),
                            key: z.string(),
                            links: z.object({}).optional(),
                            name: z.string(),
                            public: z.boolean().optional(),
                            scope: z.string().optional(),
                            type: z.enum(['NORMAL', 'PERSONAL']),
                          })
                          .optional(),
                        public: z.boolean().optional(),
                        relatedLinks: z.object({}).optional(),
                        scmId: z.string().optional(),
                        scope: z.string().optional(),
                        slug: z.string().optional(),
                        state: z
                          .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                          .optional(),
                        statusMessage: z.string().optional(),
                      })
                      .optional(),
                    type: z.enum(['BRANCH', 'TAG']).optional(),
                  })
                  .optional(),
                htmlDescription: z.string().optional(),
                id: z.number().int().optional(),
                links: z.object({}).optional(),
                locked: z.boolean().optional(),
                open: z.boolean().optional(),
                participants: z.array(RestPullRequestParticipantSchema).optional(),
                reviewers: z.array(RestPullRequestParticipantSchema).optional(),
                state: z.enum(['DECLINED', 'MERGED', 'OPEN']).optional(),
                title: z.string().optional(),
                toRef: z
                  .object({
                    displayId: z.string(),
                    id: z.string(),
                    latestCommit: z.string(),
                    repository: z
                      .object({
                        archived: z.boolean().optional(),
                        defaultBranch: z.string().optional(),
                        description: z.string().optional(),
                        forkable: z.boolean().optional(),
                        hierarchyId: z.string().optional(),
                        id: z.number().int().optional(),
                        links: z.object({}).optional(),
                        name: z.string().optional(),
                        origin: z
                          .object({
                            archived: z.boolean().optional(),
                            defaultBranch: z.string().optional(),
                            description: z.string().optional(),
                            forkable: z.boolean().optional(),
                            hierarchyId: z.string().optional(),
                            id: z.number().int().optional(),
                            links: z.object({}).optional(),
                            name: z.string().optional(),
                            partition: z.number().int().optional(),
                            project: z
                              .object({
                                avatar: z.string().optional(),
                                avatarUrl: z.string().optional(),
                                description: z.string().optional(),
                                id: z.number().int().optional(),
                                key: z.string(),
                                links: z.object({}).optional(),
                                name: z.string(),
                                public: z.boolean().optional(),
                                scope: z.string().optional(),
                                type: z.enum(['NORMAL', 'PERSONAL']),
                              })
                              .optional(),
                            public: z.boolean().optional(),
                            relatedLinks: z.object({}).optional(),
                            scmId: z.string().optional(),
                            scope: z.string().optional(),
                            slug: z.string().optional(),
                            state: z
                              .enum([
                                'AVAILABLE',
                                'INITIALISATION_FAILED',
                                'INITIALISING',
                                'OFFLINE',
                              ])
                              .optional(),
                            statusMessage: z.string().optional(),
                          })
                          .optional(),
                        partition: z.number().int().optional(),
                        project: z
                          .object({
                            avatar: z.string().optional(),
                            avatarUrl: z.string().optional(),
                            description: z.string().optional(),
                            id: z.number().int().optional(),
                            key: z.string(),
                            links: z.object({}).optional(),
                            name: z.string(),
                            public: z.boolean().optional(),
                            scope: z.string().optional(),
                            type: z.enum(['NORMAL', 'PERSONAL']),
                          })
                          .optional(),
                        public: z.boolean().optional(),
                        relatedLinks: z.object({}).optional(),
                        scmId: z.string().optional(),
                        scope: z.string().optional(),
                        slug: z.string().optional(),
                        state: z
                          .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                          .optional(),
                        statusMessage: z.string().optional(),
                      })
                      .optional(),
                    type: z.enum(['BRANCH', 'TAG']).optional(),
                  })
                  .optional(),
                updatedDate: z.number().int().optional(),
                version: z.number().int().optional(),
              })
              .optional(),
            srcPath: z
              .object({
                components: z.array(z.string()).optional(),
                extension: z.string().optional(),
                name: z.string().optional(),
                parent: z.string().optional(),
              })
              .optional(),
            toHash: z.string().optional(),
          })
          .optional(),
        anchored: z.boolean().optional(),
        author: z
          .object({
            active: z.boolean().optional(),
            avatarUrl: z.string().optional(),
            displayName: z.string(),
            emailAddress: z.string().optional(),
            id: z.number().int().optional(),
            links: z.object({}).optional(),
            name: z.string(),
            slug: z.string(),
            type: z.enum(['NORMAL', 'SERVICE']),
          })
          .optional(),
        comments: z.array(z.lazy(() => RestCommentSchema)).optional(),
        createdDate: z.number().int().optional(),
        html: z.string().optional(),
        id: z.number().int().optional(),
        parent: z
          .object({
            anchor: z
              .object({
                diffType: z.enum(['COMMIT', 'EFFECTIVE', 'RANGE']).optional(),
                fileType: z.enum(['FROM', 'TO']).optional(),
                fromHash: z.string().optional(),
                line: z.number().int().optional(),
                lineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']).optional(),
                multilineMarker: z
                  .object({
                    startLine: z.number().int().optional(),
                    startLineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']),
                  })
                  .optional(),
                multilineSpan: z
                  .object({
                    dstSpanEnd: z.number().int(),
                    dstSpanStart: z.number().int(),
                    srcSpanEnd: z.number().int(),
                    srcSpanStart: z.number().int(),
                  })
                  .optional(),
                path: z
                  .object({
                    components: z.array(z.string()).optional(),
                    extension: z.string().optional(),
                    name: z.string().optional(),
                    parent: z.string().optional(),
                  })
                  .optional(),
                pullRequest: z
                  .object({
                    author: z
                      .object({
                        approved: z.boolean().optional(),
                        lastReviewedCommit: z.string().optional(),
                        role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
                        status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
                        user: z
                          .object({
                            active: z.boolean().optional(),
                            avatarUrl: z.string().optional(),
                            displayName: z.string(),
                            emailAddress: z.string().optional(),
                            id: z.number().int().optional(),
                            links: z.object({}).optional(),
                            name: z.string(),
                            slug: z.string(),
                            type: z.enum(['NORMAL', 'SERVICE']),
                          })
                          .optional(),
                      })
                      .optional(),
                    closed: z.boolean().optional(),
                    closedDate: z.number().int().optional(),
                    createdDate: z.number().int().optional(),
                    description: z.string().optional(),
                    descriptionAsHtml: z.string().optional(),
                    draft: z.boolean().optional(),
                    fromRef: z
                      .object({
                        displayId: z.string(),
                        id: z.string(),
                        latestCommit: z.string(),
                        repository: z
                          .object({
                            archived: z.boolean().optional(),
                            defaultBranch: z.string().optional(),
                            description: z.string().optional(),
                            forkable: z.boolean().optional(),
                            hierarchyId: z.string().optional(),
                            id: z.number().int().optional(),
                            links: z.object({}).optional(),
                            name: z.string().optional(),
                            origin: z
                              .object({
                                archived: z.boolean().optional(),
                                defaultBranch: z.string().optional(),
                                description: z.string().optional(),
                                forkable: z.boolean().optional(),
                                hierarchyId: z.string().optional(),
                                id: z.number().int().optional(),
                                links: z.object({}).optional(),
                                name: z.string().optional(),
                                partition: z.number().int().optional(),
                                project: z
                                  .object({
                                    avatar: z.string().optional(),
                                    avatarUrl: z.string().optional(),
                                    description: z.string().optional(),
                                    id: z.number().int().optional(),
                                    key: z.string(),
                                    links: z.object({}).optional(),
                                    name: z.string(),
                                    public: z.boolean().optional(),
                                    scope: z.string().optional(),
                                    type: z.enum(['NORMAL', 'PERSONAL']),
                                  })
                                  .optional(),
                                public: z.boolean().optional(),
                                relatedLinks: z.object({}).optional(),
                                scmId: z.string().optional(),
                                scope: z.string().optional(),
                                slug: z.string().optional(),
                                state: z
                                  .enum([
                                    'AVAILABLE',
                                    'INITIALISATION_FAILED',
                                    'INITIALISING',
                                    'OFFLINE',
                                  ])
                                  .optional(),
                                statusMessage: z.string().optional(),
                              })
                              .optional(),
                            partition: z.number().int().optional(),
                            project: z
                              .object({
                                avatar: z.string().optional(),
                                avatarUrl: z.string().optional(),
                                description: z.string().optional(),
                                id: z.number().int().optional(),
                                key: z.string(),
                                links: z.object({}).optional(),
                                name: z.string(),
                                public: z.boolean().optional(),
                                scope: z.string().optional(),
                                type: z.enum(['NORMAL', 'PERSONAL']),
                              })
                              .optional(),
                            public: z.boolean().optional(),
                            relatedLinks: z.object({}).optional(),
                            scmId: z.string().optional(),
                            scope: z.string().optional(),
                            slug: z.string().optional(),
                            state: z
                              .enum([
                                'AVAILABLE',
                                'INITIALISATION_FAILED',
                                'INITIALISING',
                                'OFFLINE',
                              ])
                              .optional(),
                            statusMessage: z.string().optional(),
                          })
                          .optional(),
                        type: z.enum(['BRANCH', 'TAG']).optional(),
                      })
                      .optional(),
                    htmlDescription: z.string().optional(),
                    id: z.number().int().optional(),
                    links: z.object({}).optional(),
                    locked: z.boolean().optional(),
                    open: z.boolean().optional(),
                    participants: z.array(RestPullRequestParticipantSchema).optional(),
                    reviewers: z.array(RestPullRequestParticipantSchema).optional(),
                    state: z.enum(['DECLINED', 'MERGED', 'OPEN']).optional(),
                    title: z.string().optional(),
                    toRef: z
                      .object({
                        displayId: z.string(),
                        id: z.string(),
                        latestCommit: z.string(),
                        repository: z
                          .object({
                            archived: z.boolean().optional(),
                            defaultBranch: z.string().optional(),
                            description: z.string().optional(),
                            forkable: z.boolean().optional(),
                            hierarchyId: z.string().optional(),
                            id: z.number().int().optional(),
                            links: z.object({}).optional(),
                            name: z.string().optional(),
                            origin: z
                              .object({
                                archived: z.boolean().optional(),
                                defaultBranch: z.string().optional(),
                                description: z.string().optional(),
                                forkable: z.boolean().optional(),
                                hierarchyId: z.string().optional(),
                                id: z.number().int().optional(),
                                links: z.object({}).optional(),
                                name: z.string().optional(),
                                partition: z.number().int().optional(),
                                project: z
                                  .object({
                                    avatar: z.string().optional(),
                                    avatarUrl: z.string().optional(),
                                    description: z.string().optional(),
                                    id: z.number().int().optional(),
                                    key: z.string(),
                                    links: z.object({}).optional(),
                                    name: z.string(),
                                    public: z.boolean().optional(),
                                    scope: z.string().optional(),
                                    type: z.enum(['NORMAL', 'PERSONAL']),
                                  })
                                  .optional(),
                                public: z.boolean().optional(),
                                relatedLinks: z.object({}).optional(),
                                scmId: z.string().optional(),
                                scope: z.string().optional(),
                                slug: z.string().optional(),
                                state: z
                                  .enum([
                                    'AVAILABLE',
                                    'INITIALISATION_FAILED',
                                    'INITIALISING',
                                    'OFFLINE',
                                  ])
                                  .optional(),
                                statusMessage: z.string().optional(),
                              })
                              .optional(),
                            partition: z.number().int().optional(),
                            project: z
                              .object({
                                avatar: z.string().optional(),
                                avatarUrl: z.string().optional(),
                                description: z.string().optional(),
                                id: z.number().int().optional(),
                                key: z.string(),
                                links: z.object({}).optional(),
                                name: z.string(),
                                public: z.boolean().optional(),
                                scope: z.string().optional(),
                                type: z.enum(['NORMAL', 'PERSONAL']),
                              })
                              .optional(),
                            public: z.boolean().optional(),
                            relatedLinks: z.object({}).optional(),
                            scmId: z.string().optional(),
                            scope: z.string().optional(),
                            slug: z.string().optional(),
                            state: z
                              .enum([
                                'AVAILABLE',
                                'INITIALISATION_FAILED',
                                'INITIALISING',
                                'OFFLINE',
                              ])
                              .optional(),
                            statusMessage: z.string().optional(),
                          })
                          .optional(),
                        type: z.enum(['BRANCH', 'TAG']).optional(),
                      })
                      .optional(),
                    updatedDate: z.number().int().optional(),
                    version: z.number().int().optional(),
                  })
                  .optional(),
                srcPath: z
                  .object({
                    components: z.array(z.string()).optional(),
                    extension: z.string().optional(),
                    name: z.string().optional(),
                    parent: z.string().optional(),
                  })
                  .optional(),
                toHash: z.string().optional(),
              })
              .optional(),
            anchored: z.boolean().optional(),
            author: z
              .object({
                active: z.boolean().optional(),
                avatarUrl: z.string().optional(),
                displayName: z.string(),
                emailAddress: z.string().optional(),
                id: z.number().int().optional(),
                links: z.object({}).optional(),
                name: z.string(),
                slug: z.string(),
                type: z.enum(['NORMAL', 'SERVICE']),
              })
              .optional(),
            comments: z.array(z.lazy(() => RestCommentSchema)).optional(),
            createdDate: z.number().int().optional(),
            html: z.string().optional(),
            id: z.number().int().optional(),
            pending: z.boolean().optional(),
            properties: z.object({}).optional(),
            reply: z.boolean().optional(),
            resolvedDate: z.number().int().optional(),
            resolver: z
              .object({
                active: z.boolean().optional(),
                avatarUrl: z.string().optional(),
                displayName: z.string(),
                emailAddress: z.string().optional(),
                id: z.number().int().optional(),
                links: z.object({}).optional(),
                name: z.string(),
                slug: z.string(),
                type: z.enum(['NORMAL', 'SERVICE']),
              })
              .optional(),
            severity: z.string().optional(),
            state: z.string().optional(),
            text: z.string().optional(),
            threadResolved: z.boolean().optional(),
            threadResolvedDate: z.number().int().optional(),
            threadResolver: z
              .object({
                active: z.boolean().optional(),
                avatarUrl: z.string().optional(),
                displayName: z.string(),
                emailAddress: z.string().optional(),
                id: z.number().int().optional(),
                links: z.object({}).optional(),
                name: z.string(),
                slug: z.string(),
                type: z.enum(['NORMAL', 'SERVICE']),
              })
              .optional(),
            updatedDate: z.number().int().optional(),
            version: z.number().int().optional(),
          })
          .optional(),
        pending: z.boolean().optional(),
        properties: z.object({}).optional(),
        reply: z.boolean().optional(),
        resolvedDate: z.number().int().optional(),
        resolver: z
          .object({
            active: z.boolean().optional(),
            avatarUrl: z.string().optional(),
            displayName: z.string(),
            emailAddress: z.string().optional(),
            id: z.number().int().optional(),
            links: z.object({}).optional(),
            name: z.string(),
            slug: z.string(),
            type: z.enum(['NORMAL', 'SERVICE']),
          })
          .optional(),
        severity: z.string().optional(),
        state: z.string().optional(),
        text: z.string().optional(),
        threadResolved: z.boolean().optional(),
        threadResolvedDate: z.number().int().optional(),
        threadResolver: z
          .object({
            active: z.boolean().optional(),
            avatarUrl: z.string().optional(),
            displayName: z.string(),
            emailAddress: z.string().optional(),
            id: z.number().int().optional(),
            links: z.object({}).optional(),
            name: z.string(),
            slug: z.string(),
            type: z.enum(['NORMAL', 'SERVICE']),
          })
          .optional(),
        updatedDate: z.number().int().optional(),
        version: z.number().int().optional(),
      }),
    )
    .optional(),
  createdDate: z.number().int().optional(),
  html: z.string().optional(),
  id: z.number().int().optional(),
  parent: z
    .object({
      anchor: z
        .object({
          diffType: z.enum(['COMMIT', 'EFFECTIVE', 'RANGE']).optional(),
          fileType: z.enum(['FROM', 'TO']).optional(),
          fromHash: z.string().optional(),
          line: z.number().int().optional(),
          lineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']).optional(),
          multilineMarker: z
            .object({
              startLine: z.number().int().optional(),
              startLineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']),
            })
            .optional(),
          multilineSpan: z
            .object({
              dstSpanEnd: z.number().int(),
              dstSpanStart: z.number().int(),
              srcSpanEnd: z.number().int(),
              srcSpanStart: z.number().int(),
            })
            .optional(),
          path: z
            .object({
              components: z.array(z.string()).optional(),
              extension: z.string().optional(),
              name: z.string().optional(),
              parent: z.string().optional(),
            })
            .optional(),
          pullRequest: z
            .object({
              author: z
                .object({
                  approved: z.boolean().optional(),
                  lastReviewedCommit: z.string().optional(),
                  role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
                  status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
                  user: z
                    .object({
                      active: z.boolean().optional(),
                      avatarUrl: z.string().optional(),
                      displayName: z.string(),
                      emailAddress: z.string().optional(),
                      id: z.number().int().optional(),
                      links: z.object({}).optional(),
                      name: z.string(),
                      slug: z.string(),
                      type: z.enum(['NORMAL', 'SERVICE']),
                    })
                    .optional(),
                })
                .optional(),
              closed: z.boolean().optional(),
              closedDate: z.number().int().optional(),
              createdDate: z.number().int().optional(),
              description: z.string().optional(),
              descriptionAsHtml: z.string().optional(),
              draft: z.boolean().optional(),
              fromRef: z
                .object({
                  displayId: z.string(),
                  id: z.string(),
                  latestCommit: z.string(),
                  repository: z
                    .object({
                      archived: z.boolean().optional(),
                      defaultBranch: z.string().optional(),
                      description: z.string().optional(),
                      forkable: z.boolean().optional(),
                      hierarchyId: z.string().optional(),
                      id: z.number().int().optional(),
                      links: z.object({}).optional(),
                      name: z.string().optional(),
                      origin: z
                        .object({
                          archived: z.boolean().optional(),
                          defaultBranch: z.string().optional(),
                          description: z.string().optional(),
                          forkable: z.boolean().optional(),
                          hierarchyId: z.string().optional(),
                          id: z.number().int().optional(),
                          links: z.object({}).optional(),
                          name: z.string().optional(),
                          partition: z.number().int().optional(),
                          project: z
                            .object({
                              avatar: z.string().optional(),
                              avatarUrl: z.string().optional(),
                              description: z.string().optional(),
                              id: z.number().int().optional(),
                              key: z.string(),
                              links: z.object({}).optional(),
                              name: z.string(),
                              public: z.boolean().optional(),
                              scope: z.string().optional(),
                              type: z.enum(['NORMAL', 'PERSONAL']),
                            })
                            .optional(),
                          public: z.boolean().optional(),
                          relatedLinks: z.object({}).optional(),
                          scmId: z.string().optional(),
                          scope: z.string().optional(),
                          slug: z.string().optional(),
                          state: z
                            .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                            .optional(),
                          statusMessage: z.string().optional(),
                        })
                        .optional(),
                      partition: z.number().int().optional(),
                      project: z
                        .object({
                          avatar: z.string().optional(),
                          avatarUrl: z.string().optional(),
                          description: z.string().optional(),
                          id: z.number().int().optional(),
                          key: z.string(),
                          links: z.object({}).optional(),
                          name: z.string(),
                          public: z.boolean().optional(),
                          scope: z.string().optional(),
                          type: z.enum(['NORMAL', 'PERSONAL']),
                        })
                        .optional(),
                      public: z.boolean().optional(),
                      relatedLinks: z.object({}).optional(),
                      scmId: z.string().optional(),
                      scope: z.string().optional(),
                      slug: z.string().optional(),
                      state: z
                        .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                        .optional(),
                      statusMessage: z.string().optional(),
                    })
                    .optional(),
                  type: z.enum(['BRANCH', 'TAG']).optional(),
                })
                .optional(),
              htmlDescription: z.string().optional(),
              id: z.number().int().optional(),
              links: z.object({}).optional(),
              locked: z.boolean().optional(),
              open: z.boolean().optional(),
              participants: z
                .array(
                  z.object({
                    approved: z.boolean().optional(),
                    lastReviewedCommit: z.string().optional(),
                    role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
                    status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
                    user: z
                      .object({
                        active: z.boolean().optional(),
                        avatarUrl: z.string().optional(),
                        displayName: z.string(),
                        emailAddress: z.string().optional(),
                        id: z.number().int().optional(),
                        links: z.object({}).optional(),
                        name: z.string(),
                        slug: z.string(),
                        type: z.enum(['NORMAL', 'SERVICE']),
                      })
                      .optional(),
                  }),
                )
                .optional(),
              reviewers: z
                .array(
                  z.object({
                    approved: z.boolean().optional(),
                    lastReviewedCommit: z.string().optional(),
                    role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
                    status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
                    user: z
                      .object({
                        active: z.boolean().optional(),
                        avatarUrl: z.string().optional(),
                        displayName: z.string(),
                        emailAddress: z.string().optional(),
                        id: z.number().int().optional(),
                        links: z.object({}).optional(),
                        name: z.string(),
                        slug: z.string(),
                        type: z.enum(['NORMAL', 'SERVICE']),
                      })
                      .optional(),
                  }),
                )
                .optional(),
              state: z.enum(['DECLINED', 'MERGED', 'OPEN']).optional(),
              title: z.string().optional(),
              toRef: z
                .object({
                  displayId: z.string(),
                  id: z.string(),
                  latestCommit: z.string(),
                  repository: z
                    .object({
                      archived: z.boolean().optional(),
                      defaultBranch: z.string().optional(),
                      description: z.string().optional(),
                      forkable: z.boolean().optional(),
                      hierarchyId: z.string().optional(),
                      id: z.number().int().optional(),
                      links: z.object({}).optional(),
                      name: z.string().optional(),
                      origin: z
                        .object({
                          archived: z.boolean().optional(),
                          defaultBranch: z.string().optional(),
                          description: z.string().optional(),
                          forkable: z.boolean().optional(),
                          hierarchyId: z.string().optional(),
                          id: z.number().int().optional(),
                          links: z.object({}).optional(),
                          name: z.string().optional(),
                          partition: z.number().int().optional(),
                          project: z
                            .object({
                              avatar: z.string().optional(),
                              avatarUrl: z.string().optional(),
                              description: z.string().optional(),
                              id: z.number().int().optional(),
                              key: z.string(),
                              links: z.object({}).optional(),
                              name: z.string(),
                              public: z.boolean().optional(),
                              scope: z.string().optional(),
                              type: z.enum(['NORMAL', 'PERSONAL']),
                            })
                            .optional(),
                          public: z.boolean().optional(),
                          relatedLinks: z.object({}).optional(),
                          scmId: z.string().optional(),
                          scope: z.string().optional(),
                          slug: z.string().optional(),
                          state: z
                            .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                            .optional(),
                          statusMessage: z.string().optional(),
                        })
                        .optional(),
                      partition: z.number().int().optional(),
                      project: z
                        .object({
                          avatar: z.string().optional(),
                          avatarUrl: z.string().optional(),
                          description: z.string().optional(),
                          id: z.number().int().optional(),
                          key: z.string(),
                          links: z.object({}).optional(),
                          name: z.string(),
                          public: z.boolean().optional(),
                          scope: z.string().optional(),
                          type: z.enum(['NORMAL', 'PERSONAL']),
                        })
                        .optional(),
                      public: z.boolean().optional(),
                      relatedLinks: z.object({}).optional(),
                      scmId: z.string().optional(),
                      scope: z.string().optional(),
                      slug: z.string().optional(),
                      state: z
                        .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                        .optional(),
                      statusMessage: z.string().optional(),
                    })
                    .optional(),
                  type: z.enum(['BRANCH', 'TAG']).optional(),
                })
                .optional(),
              updatedDate: z.number().int().optional(),
              version: z.number().int().optional(),
            })
            .optional(),
          srcPath: z
            .object({
              components: z.array(z.string()).optional(),
              extension: z.string().optional(),
              name: z.string().optional(),
              parent: z.string().optional(),
            })
            .optional(),
          toHash: z.string().optional(),
        })
        .optional(),
      anchored: z.boolean().optional(),
      author: z
        .object({
          active: z.boolean().optional(),
          avatarUrl: z.string().optional(),
          displayName: z.string(),
          emailAddress: z.string().optional(),
          id: z.number().int().optional(),
          links: z.object({}).optional(),
          name: z.string(),
          slug: z.string(),
          type: z.enum(['NORMAL', 'SERVICE']),
        })
        .optional(),
      comments: z
        .array(
          z.object({
            anchor: z
              .object({
                diffType: z.enum(['COMMIT', 'EFFECTIVE', 'RANGE']).optional(),
                fileType: z.enum(['FROM', 'TO']).optional(),
                fromHash: z.string().optional(),
                line: z.number().int().optional(),
                lineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']).optional(),
                multilineMarker: z
                  .object({
                    startLine: z.number().int().optional(),
                    startLineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']),
                  })
                  .optional(),
                multilineSpan: z
                  .object({
                    dstSpanEnd: z.number().int(),
                    dstSpanStart: z.number().int(),
                    srcSpanEnd: z.number().int(),
                    srcSpanStart: z.number().int(),
                  })
                  .optional(),
                path: z
                  .object({
                    components: z.array(z.string()).optional(),
                    extension: z.string().optional(),
                    name: z.string().optional(),
                    parent: z.string().optional(),
                  })
                  .optional(),
                pullRequest: z
                  .object({
                    author: z
                      .object({
                        approved: z.boolean().optional(),
                        lastReviewedCommit: z.string().optional(),
                        role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
                        status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
                        user: z
                          .object({
                            active: z.boolean().optional(),
                            avatarUrl: z.string().optional(),
                            displayName: z.string(),
                            emailAddress: z.string().optional(),
                            id: z.number().int().optional(),
                            links: z.object({}).optional(),
                            name: z.string(),
                            slug: z.string(),
                            type: z.enum(['NORMAL', 'SERVICE']),
                          })
                          .optional(),
                      })
                      .optional(),
                    closed: z.boolean().optional(),
                    closedDate: z.number().int().optional(),
                    createdDate: z.number().int().optional(),
                    description: z.string().optional(),
                    descriptionAsHtml: z.string().optional(),
                    draft: z.boolean().optional(),
                    fromRef: z
                      .object({
                        displayId: z.string(),
                        id: z.string(),
                        latestCommit: z.string(),
                        repository: z
                          .object({
                            archived: z.boolean().optional(),
                            defaultBranch: z.string().optional(),
                            description: z.string().optional(),
                            forkable: z.boolean().optional(),
                            hierarchyId: z.string().optional(),
                            id: z.number().int().optional(),
                            links: z.object({}).optional(),
                            name: z.string().optional(),
                            origin: z
                              .object({
                                archived: z.boolean().optional(),
                                defaultBranch: z.string().optional(),
                                description: z.string().optional(),
                                forkable: z.boolean().optional(),
                                hierarchyId: z.string().optional(),
                                id: z.number().int().optional(),
                                links: z.object({}).optional(),
                                name: z.string().optional(),
                                partition: z.number().int().optional(),
                                project: z
                                  .object({
                                    avatar: z.string().optional(),
                                    avatarUrl: z.string().optional(),
                                    description: z.string().optional(),
                                    id: z.number().int().optional(),
                                    key: z.string(),
                                    links: z.object({}).optional(),
                                    name: z.string(),
                                    public: z.boolean().optional(),
                                    scope: z.string().optional(),
                                    type: z.enum(['NORMAL', 'PERSONAL']),
                                  })
                                  .optional(),
                                public: z.boolean().optional(),
                                relatedLinks: z.object({}).optional(),
                                scmId: z.string().optional(),
                                scope: z.string().optional(),
                                slug: z.string().optional(),
                                state: z
                                  .enum([
                                    'AVAILABLE',
                                    'INITIALISATION_FAILED',
                                    'INITIALISING',
                                    'OFFLINE',
                                  ])
                                  .optional(),
                                statusMessage: z.string().optional(),
                              })
                              .optional(),
                            partition: z.number().int().optional(),
                            project: z
                              .object({
                                avatar: z.string().optional(),
                                avatarUrl: z.string().optional(),
                                description: z.string().optional(),
                                id: z.number().int().optional(),
                                key: z.string(),
                                links: z.object({}).optional(),
                                name: z.string(),
                                public: z.boolean().optional(),
                                scope: z.string().optional(),
                                type: z.enum(['NORMAL', 'PERSONAL']),
                              })
                              .optional(),
                            public: z.boolean().optional(),
                            relatedLinks: z.object({}).optional(),
                            scmId: z.string().optional(),
                            scope: z.string().optional(),
                            slug: z.string().optional(),
                            state: z
                              .enum([
                                'AVAILABLE',
                                'INITIALISATION_FAILED',
                                'INITIALISING',
                                'OFFLINE',
                              ])
                              .optional(),
                            statusMessage: z.string().optional(),
                          })
                          .optional(),
                        type: z.enum(['BRANCH', 'TAG']).optional(),
                      })
                      .optional(),
                    htmlDescription: z.string().optional(),
                    id: z.number().int().optional(),
                    links: z.object({}).optional(),
                    locked: z.boolean().optional(),
                    open: z.boolean().optional(),
                    participants: z.array(RestPullRequestParticipantSchema).optional(),
                    reviewers: z.array(RestPullRequestParticipantSchema).optional(),
                    state: z.enum(['DECLINED', 'MERGED', 'OPEN']).optional(),
                    title: z.string().optional(),
                    toRef: z
                      .object({
                        displayId: z.string(),
                        id: z.string(),
                        latestCommit: z.string(),
                        repository: z
                          .object({
                            archived: z.boolean().optional(),
                            defaultBranch: z.string().optional(),
                            description: z.string().optional(),
                            forkable: z.boolean().optional(),
                            hierarchyId: z.string().optional(),
                            id: z.number().int().optional(),
                            links: z.object({}).optional(),
                            name: z.string().optional(),
                            origin: z
                              .object({
                                archived: z.boolean().optional(),
                                defaultBranch: z.string().optional(),
                                description: z.string().optional(),
                                forkable: z.boolean().optional(),
                                hierarchyId: z.string().optional(),
                                id: z.number().int().optional(),
                                links: z.object({}).optional(),
                                name: z.string().optional(),
                                partition: z.number().int().optional(),
                                project: z
                                  .object({
                                    avatar: z.string().optional(),
                                    avatarUrl: z.string().optional(),
                                    description: z.string().optional(),
                                    id: z.number().int().optional(),
                                    key: z.string(),
                                    links: z.object({}).optional(),
                                    name: z.string(),
                                    public: z.boolean().optional(),
                                    scope: z.string().optional(),
                                    type: z.enum(['NORMAL', 'PERSONAL']),
                                  })
                                  .optional(),
                                public: z.boolean().optional(),
                                relatedLinks: z.object({}).optional(),
                                scmId: z.string().optional(),
                                scope: z.string().optional(),
                                slug: z.string().optional(),
                                state: z
                                  .enum([
                                    'AVAILABLE',
                                    'INITIALISATION_FAILED',
                                    'INITIALISING',
                                    'OFFLINE',
                                  ])
                                  .optional(),
                                statusMessage: z.string().optional(),
                              })
                              .optional(),
                            partition: z.number().int().optional(),
                            project: z
                              .object({
                                avatar: z.string().optional(),
                                avatarUrl: z.string().optional(),
                                description: z.string().optional(),
                                id: z.number().int().optional(),
                                key: z.string(),
                                links: z.object({}).optional(),
                                name: z.string(),
                                public: z.boolean().optional(),
                                scope: z.string().optional(),
                                type: z.enum(['NORMAL', 'PERSONAL']),
                              })
                              .optional(),
                            public: z.boolean().optional(),
                            relatedLinks: z.object({}).optional(),
                            scmId: z.string().optional(),
                            scope: z.string().optional(),
                            slug: z.string().optional(),
                            state: z
                              .enum([
                                'AVAILABLE',
                                'INITIALISATION_FAILED',
                                'INITIALISING',
                                'OFFLINE',
                              ])
                              .optional(),
                            statusMessage: z.string().optional(),
                          })
                          .optional(),
                        type: z.enum(['BRANCH', 'TAG']).optional(),
                      })
                      .optional(),
                    updatedDate: z.number().int().optional(),
                    version: z.number().int().optional(),
                  })
                  .optional(),
                srcPath: z
                  .object({
                    components: z.array(z.string()).optional(),
                    extension: z.string().optional(),
                    name: z.string().optional(),
                    parent: z.string().optional(),
                  })
                  .optional(),
                toHash: z.string().optional(),
              })
              .optional(),
            anchored: z.boolean().optional(),
            author: z
              .object({
                active: z.boolean().optional(),
                avatarUrl: z.string().optional(),
                displayName: z.string(),
                emailAddress: z.string().optional(),
                id: z.number().int().optional(),
                links: z.object({}).optional(),
                name: z.string(),
                slug: z.string(),
                type: z.enum(['NORMAL', 'SERVICE']),
              })
              .optional(),
            comments: z.array(z.lazy(() => RestCommentSchema)).optional(),
            createdDate: z.number().int().optional(),
            html: z.string().optional(),
            id: z.number().int().optional(),
            parent: z
              .object({
                anchor: z
                  .object({
                    diffType: z.enum(['COMMIT', 'EFFECTIVE', 'RANGE']).optional(),
                    fileType: z.enum(['FROM', 'TO']).optional(),
                    fromHash: z.string().optional(),
                    line: z.number().int().optional(),
                    lineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']).optional(),
                    multilineMarker: z
                      .object({
                        startLine: z.number().int().optional(),
                        startLineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']),
                      })
                      .optional(),
                    multilineSpan: z
                      .object({
                        dstSpanEnd: z.number().int(),
                        dstSpanStart: z.number().int(),
                        srcSpanEnd: z.number().int(),
                        srcSpanStart: z.number().int(),
                      })
                      .optional(),
                    path: z
                      .object({
                        components: z.array(z.string()).optional(),
                        extension: z.string().optional(),
                        name: z.string().optional(),
                        parent: z.string().optional(),
                      })
                      .optional(),
                    pullRequest: z
                      .object({
                        author: z
                          .object({
                            approved: z.boolean().optional(),
                            lastReviewedCommit: z.string().optional(),
                            role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
                            status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
                            user: z
                              .object({
                                active: z.boolean().optional(),
                                avatarUrl: z.string().optional(),
                                displayName: z.string(),
                                emailAddress: z.string().optional(),
                                id: z.number().int().optional(),
                                links: z.object({}).optional(),
                                name: z.string(),
                                slug: z.string(),
                                type: z.enum(['NORMAL', 'SERVICE']),
                              })
                              .optional(),
                          })
                          .optional(),
                        closed: z.boolean().optional(),
                        closedDate: z.number().int().optional(),
                        createdDate: z.number().int().optional(),
                        description: z.string().optional(),
                        descriptionAsHtml: z.string().optional(),
                        draft: z.boolean().optional(),
                        fromRef: z
                          .object({
                            displayId: z.string(),
                            id: z.string(),
                            latestCommit: z.string(),
                            repository: z
                              .object({
                                archived: z.boolean().optional(),
                                defaultBranch: z.string().optional(),
                                description: z.string().optional(),
                                forkable: z.boolean().optional(),
                                hierarchyId: z.string().optional(),
                                id: z.number().int().optional(),
                                links: z.object({}).optional(),
                                name: z.string().optional(),
                                origin: z
                                  .object({
                                    archived: z.boolean().optional(),
                                    defaultBranch: z.string().optional(),
                                    description: z.string().optional(),
                                    forkable: z.boolean().optional(),
                                    hierarchyId: z.string().optional(),
                                    id: z.number().int().optional(),
                                    links: z.object({}).optional(),
                                    name: z.string().optional(),
                                    partition: z.number().int().optional(),
                                    project: z
                                      .object({
                                        avatar: z.string().optional(),
                                        avatarUrl: z.string().optional(),
                                        description: z.string().optional(),
                                        id: z.number().int().optional(),
                                        key: z.string(),
                                        links: z.object({}).optional(),
                                        name: z.string(),
                                        public: z.boolean().optional(),
                                        scope: z.string().optional(),
                                        type: z.enum(['NORMAL', 'PERSONAL']),
                                      })
                                      .optional(),
                                    public: z.boolean().optional(),
                                    relatedLinks: z.object({}).optional(),
                                    scmId: z.string().optional(),
                                    scope: z.string().optional(),
                                    slug: z.string().optional(),
                                    state: z
                                      .enum([
                                        'AVAILABLE',
                                        'INITIALISATION_FAILED',
                                        'INITIALISING',
                                        'OFFLINE',
                                      ])
                                      .optional(),
                                    statusMessage: z.string().optional(),
                                  })
                                  .optional(),
                                partition: z.number().int().optional(),
                                project: z
                                  .object({
                                    avatar: z.string().optional(),
                                    avatarUrl: z.string().optional(),
                                    description: z.string().optional(),
                                    id: z.number().int().optional(),
                                    key: z.string(),
                                    links: z.object({}).optional(),
                                    name: z.string(),
                                    public: z.boolean().optional(),
                                    scope: z.string().optional(),
                                    type: z.enum(['NORMAL', 'PERSONAL']),
                                  })
                                  .optional(),
                                public: z.boolean().optional(),
                                relatedLinks: z.object({}).optional(),
                                scmId: z.string().optional(),
                                scope: z.string().optional(),
                                slug: z.string().optional(),
                                state: z
                                  .enum([
                                    'AVAILABLE',
                                    'INITIALISATION_FAILED',
                                    'INITIALISING',
                                    'OFFLINE',
                                  ])
                                  .optional(),
                                statusMessage: z.string().optional(),
                              })
                              .optional(),
                            type: z.enum(['BRANCH', 'TAG']).optional(),
                          })
                          .optional(),
                        htmlDescription: z.string().optional(),
                        id: z.number().int().optional(),
                        links: z.object({}).optional(),
                        locked: z.boolean().optional(),
                        open: z.boolean().optional(),
                        participants: z.array(RestPullRequestParticipantSchema).optional(),
                        reviewers: z.array(RestPullRequestParticipantSchema).optional(),
                        state: z.enum(['DECLINED', 'MERGED', 'OPEN']).optional(),
                        title: z.string().optional(),
                        toRef: z
                          .object({
                            displayId: z.string(),
                            id: z.string(),
                            latestCommit: z.string(),
                            repository: z
                              .object({
                                archived: z.boolean().optional(),
                                defaultBranch: z.string().optional(),
                                description: z.string().optional(),
                                forkable: z.boolean().optional(),
                                hierarchyId: z.string().optional(),
                                id: z.number().int().optional(),
                                links: z.object({}).optional(),
                                name: z.string().optional(),
                                origin: z
                                  .object({
                                    archived: z.boolean().optional(),
                                    defaultBranch: z.string().optional(),
                                    description: z.string().optional(),
                                    forkable: z.boolean().optional(),
                                    hierarchyId: z.string().optional(),
                                    id: z.number().int().optional(),
                                    links: z.object({}).optional(),
                                    name: z.string().optional(),
                                    partition: z.number().int().optional(),
                                    project: z
                                      .object({
                                        avatar: z.string().optional(),
                                        avatarUrl: z.string().optional(),
                                        description: z.string().optional(),
                                        id: z.number().int().optional(),
                                        key: z.string(),
                                        links: z.object({}).optional(),
                                        name: z.string(),
                                        public: z.boolean().optional(),
                                        scope: z.string().optional(),
                                        type: z.enum(['NORMAL', 'PERSONAL']),
                                      })
                                      .optional(),
                                    public: z.boolean().optional(),
                                    relatedLinks: z.object({}).optional(),
                                    scmId: z.string().optional(),
                                    scope: z.string().optional(),
                                    slug: z.string().optional(),
                                    state: z
                                      .enum([
                                        'AVAILABLE',
                                        'INITIALISATION_FAILED',
                                        'INITIALISING',
                                        'OFFLINE',
                                      ])
                                      .optional(),
                                    statusMessage: z.string().optional(),
                                  })
                                  .optional(),
                                partition: z.number().int().optional(),
                                project: z
                                  .object({
                                    avatar: z.string().optional(),
                                    avatarUrl: z.string().optional(),
                                    description: z.string().optional(),
                                    id: z.number().int().optional(),
                                    key: z.string(),
                                    links: z.object({}).optional(),
                                    name: z.string(),
                                    public: z.boolean().optional(),
                                    scope: z.string().optional(),
                                    type: z.enum(['NORMAL', 'PERSONAL']),
                                  })
                                  .optional(),
                                public: z.boolean().optional(),
                                relatedLinks: z.object({}).optional(),
                                scmId: z.string().optional(),
                                scope: z.string().optional(),
                                slug: z.string().optional(),
                                state: z
                                  .enum([
                                    'AVAILABLE',
                                    'INITIALISATION_FAILED',
                                    'INITIALISING',
                                    'OFFLINE',
                                  ])
                                  .optional(),
                                statusMessage: z.string().optional(),
                              })
                              .optional(),
                            type: z.enum(['BRANCH', 'TAG']).optional(),
                          })
                          .optional(),
                        updatedDate: z.number().int().optional(),
                        version: z.number().int().optional(),
                      })
                      .optional(),
                    srcPath: z
                      .object({
                        components: z.array(z.string()).optional(),
                        extension: z.string().optional(),
                        name: z.string().optional(),
                        parent: z.string().optional(),
                      })
                      .optional(),
                    toHash: z.string().optional(),
                  })
                  .optional(),
                anchored: z.boolean().optional(),
                author: z
                  .object({
                    active: z.boolean().optional(),
                    avatarUrl: z.string().optional(),
                    displayName: z.string(),
                    emailAddress: z.string().optional(),
                    id: z.number().int().optional(),
                    links: z.object({}).optional(),
                    name: z.string(),
                    slug: z.string(),
                    type: z.enum(['NORMAL', 'SERVICE']),
                  })
                  .optional(),
                comments: z.array(z.lazy(() => RestCommentSchema)).optional(),
                createdDate: z.number().int().optional(),
                html: z.string().optional(),
                id: z.number().int().optional(),
                pending: z.boolean().optional(),
                properties: z.object({}).optional(),
                reply: z.boolean().optional(),
                resolvedDate: z.number().int().optional(),
                resolver: z
                  .object({
                    active: z.boolean().optional(),
                    avatarUrl: z.string().optional(),
                    displayName: z.string(),
                    emailAddress: z.string().optional(),
                    id: z.number().int().optional(),
                    links: z.object({}).optional(),
                    name: z.string(),
                    slug: z.string(),
                    type: z.enum(['NORMAL', 'SERVICE']),
                  })
                  .optional(),
                severity: z.string().optional(),
                state: z.string().optional(),
                text: z.string().optional(),
                threadResolved: z.boolean().optional(),
                threadResolvedDate: z.number().int().optional(),
                threadResolver: z
                  .object({
                    active: z.boolean().optional(),
                    avatarUrl: z.string().optional(),
                    displayName: z.string(),
                    emailAddress: z.string().optional(),
                    id: z.number().int().optional(),
                    links: z.object({}).optional(),
                    name: z.string(),
                    slug: z.string(),
                    type: z.enum(['NORMAL', 'SERVICE']),
                  })
                  .optional(),
                updatedDate: z.number().int().optional(),
                version: z.number().int().optional(),
              })
              .optional(),
            pending: z.boolean().optional(),
            properties: z.object({}).optional(),
            reply: z.boolean().optional(),
            resolvedDate: z.number().int().optional(),
            resolver: z
              .object({
                active: z.boolean().optional(),
                avatarUrl: z.string().optional(),
                displayName: z.string(),
                emailAddress: z.string().optional(),
                id: z.number().int().optional(),
                links: z.object({}).optional(),
                name: z.string(),
                slug: z.string(),
                type: z.enum(['NORMAL', 'SERVICE']),
              })
              .optional(),
            severity: z.string().optional(),
            state: z.string().optional(),
            text: z.string().optional(),
            threadResolved: z.boolean().optional(),
            threadResolvedDate: z.number().int().optional(),
            threadResolver: z
              .object({
                active: z.boolean().optional(),
                avatarUrl: z.string().optional(),
                displayName: z.string(),
                emailAddress: z.string().optional(),
                id: z.number().int().optional(),
                links: z.object({}).optional(),
                name: z.string(),
                slug: z.string(),
                type: z.enum(['NORMAL', 'SERVICE']),
              })
              .optional(),
            updatedDate: z.number().int().optional(),
            version: z.number().int().optional(),
          }),
        )
        .optional(),
      createdDate: z.number().int().optional(),
      html: z.string().optional(),
      id: z.number().int().optional(),
      pending: z.boolean().optional(),
      properties: z.object({}).optional(),
      reply: z.boolean().optional(),
      resolvedDate: z.number().int().optional(),
      resolver: z
        .object({
          active: z.boolean().optional(),
          avatarUrl: z.string().optional(),
          displayName: z.string(),
          emailAddress: z.string().optional(),
          id: z.number().int().optional(),
          links: z.object({}).optional(),
          name: z.string(),
          slug: z.string(),
          type: z.enum(['NORMAL', 'SERVICE']),
        })
        .optional(),
      severity: z.string().optional(),
      state: z.string().optional(),
      text: z.string().optional(),
      threadResolved: z.boolean().optional(),
      threadResolvedDate: z.number().int().optional(),
      threadResolver: z
        .object({
          active: z.boolean().optional(),
          avatarUrl: z.string().optional(),
          displayName: z.string(),
          emailAddress: z.string().optional(),
          id: z.number().int().optional(),
          links: z.object({}).optional(),
          name: z.string(),
          slug: z.string(),
          type: z.enum(['NORMAL', 'SERVICE']),
        })
        .optional(),
      updatedDate: z.number().int().optional(),
      version: z.number().int().optional(),
    })
    .optional(),
  pending: z.boolean().optional(),
  properties: z.object({}).optional(),
  reply: z.boolean().optional(),
  resolvedDate: z.number().int().optional(),
  resolver: z
    .object({
      active: z.boolean().optional(),
      avatarUrl: z.string().optional(),
      displayName: z.string(),
      emailAddress: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      name: z.string(),
      slug: z.string(),
      type: z.enum(['NORMAL', 'SERVICE']),
    })
    .optional(),
  severity: z.string().optional(),
  state: z.string().optional(),
  text: z.string().optional(),
  threadResolved: z.boolean().optional(),
  threadResolvedDate: z.number().int().optional(),
  threadResolver: z
    .object({
      active: z.boolean().optional(),
      avatarUrl: z.string().optional(),
      displayName: z.string(),
      emailAddress: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      name: z.string(),
      slug: z.string(),
      type: z.enum(['NORMAL', 'SERVICE']),
    })
    .optional(),
  updatedDate: z.number().int().optional(),
  version: z.number().int().optional(),
});

export type RestComment = z.infer<typeof RestCommentSchema>;

export const RestCommentThreadDiffAnchorSchema = z.object({
  diffType: z.enum(['COMMIT', 'EFFECTIVE', 'RANGE']).optional(),
  fileType: z.enum(['FROM', 'TO']).optional(),
  fromHash: z.string().optional(),
  line: z.number().int().optional(),
  lineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']).optional(),
  multilineMarker: z
    .object({
      startLine: z.number().int().optional(),
      startLineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']),
    })
    .optional(),
  multilineSpan: z
    .object({
      dstSpanEnd: z.number().int(),
      dstSpanStart: z.number().int(),
      srcSpanEnd: z.number().int(),
      srcSpanStart: z.number().int(),
    })
    .optional(),
  path: z
    .object({
      components: z.array(z.string()).optional(),
      extension: z.string().optional(),
      name: z.string().optional(),
      parent: z.string().optional(),
    })
    .optional(),
  pullRequest: z
    .object({
      author: z
        .object({
          approved: z.boolean().optional(),
          lastReviewedCommit: z.string().optional(),
          role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
          status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
          user: z
            .object({
              active: z.boolean().optional(),
              avatarUrl: z.string().optional(),
              displayName: z.string(),
              emailAddress: z.string().optional(),
              id: z.number().int().optional(),
              links: z.object({}).optional(),
              name: z.string(),
              slug: z.string(),
              type: z.enum(['NORMAL', 'SERVICE']),
            })
            .optional(),
        })
        .optional(),
      closed: z.boolean().optional(),
      closedDate: z.number().int().optional(),
      createdDate: z.number().int().optional(),
      description: z.string().optional(),
      descriptionAsHtml: z.string().optional(),
      draft: z.boolean().optional(),
      fromRef: z
        .object({
          displayId: z.string(),
          id: z.string(),
          latestCommit: z.string(),
          repository: z
            .object({
              archived: z.boolean().optional(),
              defaultBranch: z.string().optional(),
              description: z.string().optional(),
              forkable: z.boolean().optional(),
              hierarchyId: z.string().optional(),
              id: z.number().int().optional(),
              links: z.object({}).optional(),
              name: z.string().optional(),
              origin: z
                .object({
                  archived: z.boolean().optional(),
                  defaultBranch: z.string().optional(),
                  description: z.string().optional(),
                  forkable: z.boolean().optional(),
                  hierarchyId: z.string().optional(),
                  id: z.number().int().optional(),
                  links: z.object({}).optional(),
                  name: z.string().optional(),
                  partition: z.number().int().optional(),
                  project: z
                    .object({
                      avatar: z.string().optional(),
                      avatarUrl: z.string().optional(),
                      description: z.string().optional(),
                      id: z.number().int().optional(),
                      key: z.string(),
                      links: z.object({}).optional(),
                      name: z.string(),
                      public: z.boolean().optional(),
                      scope: z.string().optional(),
                      type: z.enum(['NORMAL', 'PERSONAL']),
                    })
                    .optional(),
                  public: z.boolean().optional(),
                  relatedLinks: z.object({}).optional(),
                  scmId: z.string().optional(),
                  scope: z.string().optional(),
                  slug: z.string().optional(),
                  state: z
                    .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                    .optional(),
                  statusMessage: z.string().optional(),
                })
                .optional(),
              partition: z.number().int().optional(),
              project: z
                .object({
                  avatar: z.string().optional(),
                  avatarUrl: z.string().optional(),
                  description: z.string().optional(),
                  id: z.number().int().optional(),
                  key: z.string(),
                  links: z.object({}).optional(),
                  name: z.string(),
                  public: z.boolean().optional(),
                  scope: z.string().optional(),
                  type: z.enum(['NORMAL', 'PERSONAL']),
                })
                .optional(),
              public: z.boolean().optional(),
              relatedLinks: z.object({}).optional(),
              scmId: z.string().optional(),
              scope: z.string().optional(),
              slug: z.string().optional(),
              state: z
                .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                .optional(),
              statusMessage: z.string().optional(),
            })
            .optional(),
          type: z.enum(['BRANCH', 'TAG']).optional(),
        })
        .optional(),
      htmlDescription: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      locked: z.boolean().optional(),
      open: z.boolean().optional(),
      participants: z
        .array(
          z.object({
            approved: z.boolean().optional(),
            lastReviewedCommit: z.string().optional(),
            role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
            status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
            user: z
              .object({
                active: z.boolean().optional(),
                avatarUrl: z.string().optional(),
                displayName: z.string(),
                emailAddress: z.string().optional(),
                id: z.number().int().optional(),
                links: z.object({}).optional(),
                name: z.string(),
                slug: z.string(),
                type: z.enum(['NORMAL', 'SERVICE']),
              })
              .optional(),
          }),
        )
        .optional(),
      reviewers: z
        .array(
          z.object({
            approved: z.boolean().optional(),
            lastReviewedCommit: z.string().optional(),
            role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
            status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
            user: z
              .object({
                active: z.boolean().optional(),
                avatarUrl: z.string().optional(),
                displayName: z.string(),
                emailAddress: z.string().optional(),
                id: z.number().int().optional(),
                links: z.object({}).optional(),
                name: z.string(),
                slug: z.string(),
                type: z.enum(['NORMAL', 'SERVICE']),
              })
              .optional(),
          }),
        )
        .optional(),
      state: z.enum(['DECLINED', 'MERGED', 'OPEN']).optional(),
      title: z.string().optional(),
      toRef: z
        .object({
          displayId: z.string(),
          id: z.string(),
          latestCommit: z.string(),
          repository: z
            .object({
              archived: z.boolean().optional(),
              defaultBranch: z.string().optional(),
              description: z.string().optional(),
              forkable: z.boolean().optional(),
              hierarchyId: z.string().optional(),
              id: z.number().int().optional(),
              links: z.object({}).optional(),
              name: z.string().optional(),
              origin: z
                .object({
                  archived: z.boolean().optional(),
                  defaultBranch: z.string().optional(),
                  description: z.string().optional(),
                  forkable: z.boolean().optional(),
                  hierarchyId: z.string().optional(),
                  id: z.number().int().optional(),
                  links: z.object({}).optional(),
                  name: z.string().optional(),
                  partition: z.number().int().optional(),
                  project: z
                    .object({
                      avatar: z.string().optional(),
                      avatarUrl: z.string().optional(),
                      description: z.string().optional(),
                      id: z.number().int().optional(),
                      key: z.string(),
                      links: z.object({}).optional(),
                      name: z.string(),
                      public: z.boolean().optional(),
                      scope: z.string().optional(),
                      type: z.enum(['NORMAL', 'PERSONAL']),
                    })
                    .optional(),
                  public: z.boolean().optional(),
                  relatedLinks: z.object({}).optional(),
                  scmId: z.string().optional(),
                  scope: z.string().optional(),
                  slug: z.string().optional(),
                  state: z
                    .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                    .optional(),
                  statusMessage: z.string().optional(),
                })
                .optional(),
              partition: z.number().int().optional(),
              project: z
                .object({
                  avatar: z.string().optional(),
                  avatarUrl: z.string().optional(),
                  description: z.string().optional(),
                  id: z.number().int().optional(),
                  key: z.string(),
                  links: z.object({}).optional(),
                  name: z.string(),
                  public: z.boolean().optional(),
                  scope: z.string().optional(),
                  type: z.enum(['NORMAL', 'PERSONAL']),
                })
                .optional(),
              public: z.boolean().optional(),
              relatedLinks: z.object({}).optional(),
              scmId: z.string().optional(),
              scope: z.string().optional(),
              slug: z.string().optional(),
              state: z
                .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                .optional(),
              statusMessage: z.string().optional(),
            })
            .optional(),
          type: z.enum(['BRANCH', 'TAG']).optional(),
        })
        .optional(),
      updatedDate: z.number().int().optional(),
      version: z.number().int().optional(),
    })
    .optional(),
  srcPath: z
    .object({
      components: z.array(z.string()).optional(),
      extension: z.string().optional(),
      name: z.string().optional(),
      parent: z.string().optional(),
    })
    .optional(),
  toHash: z.string().optional(),
});

export type RestCommentThreadDiffAnchor = z.infer<typeof RestCommentThreadDiffAnchorSchema>;

export const RestEmoticonSchema = z.object({
  shortcut: z.string().optional(),
  url: z.string().optional(),
  value: z.string().optional(),
});

export type RestEmoticon = z.infer<typeof RestEmoticonSchema>;

export const RestMultilineCommentMarkerSchema = z.object({
  startLine: z.number().int().optional(),
  startLineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']).optional(),
});

export type RestMultilineCommentMarker = z.infer<typeof RestMultilineCommentMarkerSchema>;

export const RestMultilineCommentSpanSchema = z.object({
  dstSpanEnd: z.number().int().optional(),
  dstSpanStart: z.number().int().optional(),
  srcSpanEnd: z.number().int().optional(),
  srcSpanStart: z.number().int().optional(),
});

export type RestMultilineCommentSpan = z.infer<typeof RestMultilineCommentSpanSchema>;

export const RestPathSchema = z.object({
  components: z.array(z.string()).optional(),
  extension: z.string().optional(),
  name: z.string().optional(),
  parent: z.string().optional(),
});

export type RestPath = z.infer<typeof RestPathSchema>;

export const RestProjectSchema = z.object({
  avatar: z.string().optional(),
  avatarUrl: z.string().optional(),
  description: z.string().optional(),
  id: z.number().int().optional(),
  key: z.string().optional(),
  links: z.object({}).optional(),
  name: z.string().optional(),
  public: z.boolean().optional(),
  scope: z.string().optional(),
  type: z.enum(['NORMAL', 'PERSONAL']).optional(),
});

export type RestProject = z.infer<typeof RestProjectSchema>;

export const RestPullRequestSchema = z.object({
  author: z
    .object({
      approved: z.boolean().optional(),
      lastReviewedCommit: z.string().optional(),
      role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
      status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
      user: z
        .object({
          active: z.boolean().optional(),
          avatarUrl: z.string().optional(),
          displayName: z.string(),
          emailAddress: z.string().optional(),
          id: z.number().int().optional(),
          links: z.object({}).optional(),
          name: z.string(),
          slug: z.string(),
          type: z.enum(['NORMAL', 'SERVICE']),
        })
        .optional(),
    })
    .optional(),
  closed: z.boolean().optional(),
  closedDate: z.number().int().optional(),
  createdDate: z.number().int().optional(),
  description: z.string().optional(),
  descriptionAsHtml: z.string().optional(),
  draft: z.boolean().optional(),
  fromRef: z
    .object({
      displayId: z.string(),
      id: z.string(),
      latestCommit: z.string(),
      repository: z
        .object({
          archived: z.boolean().optional(),
          defaultBranch: z.string().optional(),
          description: z.string().optional(),
          forkable: z.boolean().optional(),
          hierarchyId: z.string().optional(),
          id: z.number().int().optional(),
          links: z.object({}).optional(),
          name: z.string().optional(),
          origin: z
            .object({
              archived: z.boolean().optional(),
              defaultBranch: z.string().optional(),
              description: z.string().optional(),
              forkable: z.boolean().optional(),
              hierarchyId: z.string().optional(),
              id: z.number().int().optional(),
              links: z.object({}).optional(),
              name: z.string().optional(),
              partition: z.number().int().optional(),
              project: z
                .object({
                  avatar: z.string().optional(),
                  avatarUrl: z.string().optional(),
                  description: z.string().optional(),
                  id: z.number().int().optional(),
                  key: z.string(),
                  links: z.object({}).optional(),
                  name: z.string(),
                  public: z.boolean().optional(),
                  scope: z.string().optional(),
                  type: z.enum(['NORMAL', 'PERSONAL']),
                })
                .optional(),
              public: z.boolean().optional(),
              relatedLinks: z.object({}).optional(),
              scmId: z.string().optional(),
              scope: z.string().optional(),
              slug: z.string().optional(),
              state: z
                .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                .optional(),
              statusMessage: z.string().optional(),
            })
            .optional(),
          partition: z.number().int().optional(),
          project: z
            .object({
              avatar: z.string().optional(),
              avatarUrl: z.string().optional(),
              description: z.string().optional(),
              id: z.number().int().optional(),
              key: z.string(),
              links: z.object({}).optional(),
              name: z.string(),
              public: z.boolean().optional(),
              scope: z.string().optional(),
              type: z.enum(['NORMAL', 'PERSONAL']),
            })
            .optional(),
          public: z.boolean().optional(),
          relatedLinks: z.object({}).optional(),
          scmId: z.string().optional(),
          scope: z.string().optional(),
          slug: z.string().optional(),
          state: z
            .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
            .optional(),
          statusMessage: z.string().optional(),
        })
        .optional(),
      type: z.enum(['BRANCH', 'TAG']).optional(),
    })
    .optional(),
  htmlDescription: z.string().optional(),
  id: z.number().int().optional(),
  links: z.object({}).optional(),
  locked: z.boolean().optional(),
  open: z.boolean().optional(),
  participants: z
    .array(
      z.object({
        approved: z.boolean().optional(),
        lastReviewedCommit: z.string().optional(),
        role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
        status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
        user: z
          .object({
            active: z.boolean().optional(),
            avatarUrl: z.string().optional(),
            displayName: z.string(),
            emailAddress: z.string().optional(),
            id: z.number().int().optional(),
            links: z.object({}).optional(),
            name: z.string(),
            slug: z.string(),
            type: z.enum(['NORMAL', 'SERVICE']),
          })
          .optional(),
      }),
    )
    .optional(),
  reviewers: z
    .array(
      z.object({
        approved: z.boolean().optional(),
        lastReviewedCommit: z.string().optional(),
        role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
        status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
        user: z
          .object({
            active: z.boolean().optional(),
            avatarUrl: z.string().optional(),
            displayName: z.string(),
            emailAddress: z.string().optional(),
            id: z.number().int().optional(),
            links: z.object({}).optional(),
            name: z.string(),
            slug: z.string(),
            type: z.enum(['NORMAL', 'SERVICE']),
          })
          .optional(),
      }),
    )
    .optional(),
  state: z.enum(['DECLINED', 'MERGED', 'OPEN']).optional(),
  title: z.string().optional(),
  toRef: z
    .object({
      displayId: z.string(),
      id: z.string(),
      latestCommit: z.string(),
      repository: z
        .object({
          archived: z.boolean().optional(),
          defaultBranch: z.string().optional(),
          description: z.string().optional(),
          forkable: z.boolean().optional(),
          hierarchyId: z.string().optional(),
          id: z.number().int().optional(),
          links: z.object({}).optional(),
          name: z.string().optional(),
          origin: z
            .object({
              archived: z.boolean().optional(),
              defaultBranch: z.string().optional(),
              description: z.string().optional(),
              forkable: z.boolean().optional(),
              hierarchyId: z.string().optional(),
              id: z.number().int().optional(),
              links: z.object({}).optional(),
              name: z.string().optional(),
              partition: z.number().int().optional(),
              project: z
                .object({
                  avatar: z.string().optional(),
                  avatarUrl: z.string().optional(),
                  description: z.string().optional(),
                  id: z.number().int().optional(),
                  key: z.string(),
                  links: z.object({}).optional(),
                  name: z.string(),
                  public: z.boolean().optional(),
                  scope: z.string().optional(),
                  type: z.enum(['NORMAL', 'PERSONAL']),
                })
                .optional(),
              public: z.boolean().optional(),
              relatedLinks: z.object({}).optional(),
              scmId: z.string().optional(),
              scope: z.string().optional(),
              slug: z.string().optional(),
              state: z
                .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                .optional(),
              statusMessage: z.string().optional(),
            })
            .optional(),
          partition: z.number().int().optional(),
          project: z
            .object({
              avatar: z.string().optional(),
              avatarUrl: z.string().optional(),
              description: z.string().optional(),
              id: z.number().int().optional(),
              key: z.string(),
              links: z.object({}).optional(),
              name: z.string(),
              public: z.boolean().optional(),
              scope: z.string().optional(),
              type: z.enum(['NORMAL', 'PERSONAL']),
            })
            .optional(),
          public: z.boolean().optional(),
          relatedLinks: z.object({}).optional(),
          scmId: z.string().optional(),
          scope: z.string().optional(),
          slug: z.string().optional(),
          state: z
            .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
            .optional(),
          statusMessage: z.string().optional(),
        })
        .optional(),
      type: z.enum(['BRANCH', 'TAG']).optional(),
    })
    .optional(),
  updatedDate: z.number().int().optional(),
  version: z.number().int().optional(),
});

export type RestPullRequest = z.infer<typeof RestPullRequestSchema>;

export const RestPullRequestRefSchema = z.object({
  displayId: z.string().optional(),
  id: z.string().optional(),
  latestCommit: z.string().optional(),
  repository: z
    .object({
      archived: z.boolean().optional(),
      defaultBranch: z.string().optional(),
      description: z.string().optional(),
      forkable: z.boolean().optional(),
      hierarchyId: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      name: z.string().optional(),
      origin: z
        .object({
          archived: z.boolean().optional(),
          defaultBranch: z.string().optional(),
          description: z.string().optional(),
          forkable: z.boolean().optional(),
          hierarchyId: z.string().optional(),
          id: z.number().int().optional(),
          links: z.object({}).optional(),
          name: z.string().optional(),
          partition: z.number().int().optional(),
          project: z
            .object({
              avatar: z.string().optional(),
              avatarUrl: z.string().optional(),
              description: z.string().optional(),
              id: z.number().int().optional(),
              key: z.string(),
              links: z.object({}).optional(),
              name: z.string(),
              public: z.boolean().optional(),
              scope: z.string().optional(),
              type: z.enum(['NORMAL', 'PERSONAL']),
            })
            .optional(),
          public: z.boolean().optional(),
          relatedLinks: z.object({}).optional(),
          scmId: z.string().optional(),
          scope: z.string().optional(),
          slug: z.string().optional(),
          state: z
            .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
            .optional(),
          statusMessage: z.string().optional(),
        })
        .optional(),
      partition: z.number().int().optional(),
      project: z
        .object({
          avatar: z.string().optional(),
          avatarUrl: z.string().optional(),
          description: z.string().optional(),
          id: z.number().int().optional(),
          key: z.string(),
          links: z.object({}).optional(),
          name: z.string(),
          public: z.boolean().optional(),
          scope: z.string().optional(),
          type: z.enum(['NORMAL', 'PERSONAL']),
        })
        .optional(),
      public: z.boolean().optional(),
      relatedLinks: z.object({}).optional(),
      scmId: z.string().optional(),
      scope: z.string().optional(),
      slug: z.string().optional(),
      state: z.enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE']).optional(),
      statusMessage: z.string().optional(),
    })
    .optional(),
  type: z.enum(['BRANCH', 'TAG']).optional(),
});

export type RestPullRequestRef = z.infer<typeof RestPullRequestRefSchema>;

export const RestRepositorySchema = z.object({
  archived: z.boolean().optional(),
  defaultBranch: z.string().optional(),
  description: z.string().optional(),
  forkable: z.boolean().optional(),
  hierarchyId: z.string().optional(),
  id: z.number().int().optional(),
  links: z.object({}).optional(),
  name: z.string().optional(),
  origin: z
    .object({
      archived: z.boolean().optional(),
      defaultBranch: z.string().optional(),
      description: z.string().optional(),
      forkable: z.boolean().optional(),
      hierarchyId: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      name: z.string().optional(),
      partition: z.number().int().optional(),
      project: z
        .object({
          avatar: z.string().optional(),
          avatarUrl: z.string().optional(),
          description: z.string().optional(),
          id: z.number().int().optional(),
          key: z.string(),
          links: z.object({}).optional(),
          name: z.string(),
          public: z.boolean().optional(),
          scope: z.string().optional(),
          type: z.enum(['NORMAL', 'PERSONAL']),
        })
        .optional(),
      public: z.boolean().optional(),
      relatedLinks: z.object({}).optional(),
      scmId: z.string().optional(),
      scope: z.string().optional(),
      slug: z.string().optional(),
      state: z.enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE']).optional(),
      statusMessage: z.string().optional(),
    })
    .optional(),
  partition: z.number().int().optional(),
  project: z
    .object({
      avatar: z.string().optional(),
      avatarUrl: z.string().optional(),
      description: z.string().optional(),
      id: z.number().int().optional(),
      key: z.string(),
      links: z.object({}).optional(),
      name: z.string(),
      public: z.boolean().optional(),
      scope: z.string().optional(),
      type: z.enum(['NORMAL', 'PERSONAL']),
    })
    .optional(),
  public: z.boolean().optional(),
  relatedLinks: z.object({}).optional(),
  scmId: z.string().optional(),
  scope: z.string().optional(),
  slug: z.string().optional(),
  state: z.enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE']).optional(),
  statusMessage: z.string().optional(),
});

export type RestRepository = z.infer<typeof RestRepositorySchema>;

export const RestUserReactionSchema = z.object({
  comment: z
    .object({
      anchor: z
        .object({
          diffType: z.enum(['COMMIT', 'EFFECTIVE', 'RANGE']).optional(),
          fileType: z.enum(['FROM', 'TO']).optional(),
          fromHash: z.string().optional(),
          line: z.number().int().optional(),
          lineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']).optional(),
          multilineMarker: z
            .object({
              startLine: z.number().int().optional(),
              startLineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']),
            })
            .optional(),
          multilineSpan: z
            .object({
              dstSpanEnd: z.number().int(),
              dstSpanStart: z.number().int(),
              srcSpanEnd: z.number().int(),
              srcSpanStart: z.number().int(),
            })
            .optional(),
          path: z
            .object({
              components: z.array(z.string()).optional(),
              extension: z.string().optional(),
              name: z.string().optional(),
              parent: z.string().optional(),
            })
            .optional(),
          pullRequest: z
            .object({
              author: z
                .object({
                  approved: z.boolean().optional(),
                  lastReviewedCommit: z.string().optional(),
                  role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
                  status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
                  user: z
                    .object({
                      active: z.boolean().optional(),
                      avatarUrl: z.string().optional(),
                      displayName: z.string(),
                      emailAddress: z.string().optional(),
                      id: z.number().int().optional(),
                      links: z.object({}).optional(),
                      name: z.string(),
                      slug: z.string(),
                      type: z.enum(['NORMAL', 'SERVICE']),
                    })
                    .optional(),
                })
                .optional(),
              closed: z.boolean().optional(),
              closedDate: z.number().int().optional(),
              createdDate: z.number().int().optional(),
              description: z.string().optional(),
              descriptionAsHtml: z.string().optional(),
              draft: z.boolean().optional(),
              fromRef: z
                .object({
                  displayId: z.string(),
                  id: z.string(),
                  latestCommit: z.string(),
                  repository: z
                    .object({
                      archived: z.boolean().optional(),
                      defaultBranch: z.string().optional(),
                      description: z.string().optional(),
                      forkable: z.boolean().optional(),
                      hierarchyId: z.string().optional(),
                      id: z.number().int().optional(),
                      links: z.object({}).optional(),
                      name: z.string().optional(),
                      origin: z
                        .object({
                          archived: z.boolean().optional(),
                          defaultBranch: z.string().optional(),
                          description: z.string().optional(),
                          forkable: z.boolean().optional(),
                          hierarchyId: z.string().optional(),
                          id: z.number().int().optional(),
                          links: z.object({}).optional(),
                          name: z.string().optional(),
                          partition: z.number().int().optional(),
                          project: z
                            .object({
                              avatar: z.string().optional(),
                              avatarUrl: z.string().optional(),
                              description: z.string().optional(),
                              id: z.number().int().optional(),
                              key: z.string(),
                              links: z.object({}).optional(),
                              name: z.string(),
                              public: z.boolean().optional(),
                              scope: z.string().optional(),
                              type: z.enum(['NORMAL', 'PERSONAL']),
                            })
                            .optional(),
                          public: z.boolean().optional(),
                          relatedLinks: z.object({}).optional(),
                          scmId: z.string().optional(),
                          scope: z.string().optional(),
                          slug: z.string().optional(),
                          state: z
                            .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                            .optional(),
                          statusMessage: z.string().optional(),
                        })
                        .optional(),
                      partition: z.number().int().optional(),
                      project: z
                        .object({
                          avatar: z.string().optional(),
                          avatarUrl: z.string().optional(),
                          description: z.string().optional(),
                          id: z.number().int().optional(),
                          key: z.string(),
                          links: z.object({}).optional(),
                          name: z.string(),
                          public: z.boolean().optional(),
                          scope: z.string().optional(),
                          type: z.enum(['NORMAL', 'PERSONAL']),
                        })
                        .optional(),
                      public: z.boolean().optional(),
                      relatedLinks: z.object({}).optional(),
                      scmId: z.string().optional(),
                      scope: z.string().optional(),
                      slug: z.string().optional(),
                      state: z
                        .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                        .optional(),
                      statusMessage: z.string().optional(),
                    })
                    .optional(),
                  type: z.enum(['BRANCH', 'TAG']).optional(),
                })
                .optional(),
              htmlDescription: z.string().optional(),
              id: z.number().int().optional(),
              links: z.object({}).optional(),
              locked: z.boolean().optional(),
              open: z.boolean().optional(),
              participants: z
                .array(
                  z.object({
                    approved: z.boolean().optional(),
                    lastReviewedCommit: z.string().optional(),
                    role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
                    status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
                    user: z
                      .object({
                        active: z.boolean().optional(),
                        avatarUrl: z.string().optional(),
                        displayName: z.string(),
                        emailAddress: z.string().optional(),
                        id: z.number().int().optional(),
                        links: z.object({}).optional(),
                        name: z.string(),
                        slug: z.string(),
                        type: z.enum(['NORMAL', 'SERVICE']),
                      })
                      .optional(),
                  }),
                )
                .optional(),
              reviewers: z
                .array(
                  z.object({
                    approved: z.boolean().optional(),
                    lastReviewedCommit: z.string().optional(),
                    role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
                    status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
                    user: z
                      .object({
                        active: z.boolean().optional(),
                        avatarUrl: z.string().optional(),
                        displayName: z.string(),
                        emailAddress: z.string().optional(),
                        id: z.number().int().optional(),
                        links: z.object({}).optional(),
                        name: z.string(),
                        slug: z.string(),
                        type: z.enum(['NORMAL', 'SERVICE']),
                      })
                      .optional(),
                  }),
                )
                .optional(),
              state: z.enum(['DECLINED', 'MERGED', 'OPEN']).optional(),
              title: z.string().optional(),
              toRef: z
                .object({
                  displayId: z.string(),
                  id: z.string(),
                  latestCommit: z.string(),
                  repository: z
                    .object({
                      archived: z.boolean().optional(),
                      defaultBranch: z.string().optional(),
                      description: z.string().optional(),
                      forkable: z.boolean().optional(),
                      hierarchyId: z.string().optional(),
                      id: z.number().int().optional(),
                      links: z.object({}).optional(),
                      name: z.string().optional(),
                      origin: z
                        .object({
                          archived: z.boolean().optional(),
                          defaultBranch: z.string().optional(),
                          description: z.string().optional(),
                          forkable: z.boolean().optional(),
                          hierarchyId: z.string().optional(),
                          id: z.number().int().optional(),
                          links: z.object({}).optional(),
                          name: z.string().optional(),
                          partition: z.number().int().optional(),
                          project: z
                            .object({
                              avatar: z.string().optional(),
                              avatarUrl: z.string().optional(),
                              description: z.string().optional(),
                              id: z.number().int().optional(),
                              key: z.string(),
                              links: z.object({}).optional(),
                              name: z.string(),
                              public: z.boolean().optional(),
                              scope: z.string().optional(),
                              type: z.enum(['NORMAL', 'PERSONAL']),
                            })
                            .optional(),
                          public: z.boolean().optional(),
                          relatedLinks: z.object({}).optional(),
                          scmId: z.string().optional(),
                          scope: z.string().optional(),
                          slug: z.string().optional(),
                          state: z
                            .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                            .optional(),
                          statusMessage: z.string().optional(),
                        })
                        .optional(),
                      partition: z.number().int().optional(),
                      project: z
                        .object({
                          avatar: z.string().optional(),
                          avatarUrl: z.string().optional(),
                          description: z.string().optional(),
                          id: z.number().int().optional(),
                          key: z.string(),
                          links: z.object({}).optional(),
                          name: z.string(),
                          public: z.boolean().optional(),
                          scope: z.string().optional(),
                          type: z.enum(['NORMAL', 'PERSONAL']),
                        })
                        .optional(),
                      public: z.boolean().optional(),
                      relatedLinks: z.object({}).optional(),
                      scmId: z.string().optional(),
                      scope: z.string().optional(),
                      slug: z.string().optional(),
                      state: z
                        .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                        .optional(),
                      statusMessage: z.string().optional(),
                    })
                    .optional(),
                  type: z.enum(['BRANCH', 'TAG']).optional(),
                })
                .optional(),
              updatedDate: z.number().int().optional(),
              version: z.number().int().optional(),
            })
            .optional(),
          srcPath: z
            .object({
              components: z.array(z.string()).optional(),
              extension: z.string().optional(),
              name: z.string().optional(),
              parent: z.string().optional(),
            })
            .optional(),
          toHash: z.string().optional(),
        })
        .optional(),
      anchored: z.boolean().optional(),
      author: z
        .object({
          active: z.boolean().optional(),
          avatarUrl: z.string().optional(),
          displayName: z.string(),
          emailAddress: z.string().optional(),
          id: z.number().int().optional(),
          links: z.object({}).optional(),
          name: z.string(),
          slug: z.string(),
          type: z.enum(['NORMAL', 'SERVICE']),
        })
        .optional(),
      comments: z
        .array(
          z.object({
            anchor: z
              .object({
                diffType: z.enum(['COMMIT', 'EFFECTIVE', 'RANGE']).optional(),
                fileType: z.enum(['FROM', 'TO']).optional(),
                fromHash: z.string().optional(),
                line: z.number().int().optional(),
                lineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']).optional(),
                multilineMarker: z
                  .object({
                    startLine: z.number().int().optional(),
                    startLineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']),
                  })
                  .optional(),
                multilineSpan: z
                  .object({
                    dstSpanEnd: z.number().int(),
                    dstSpanStart: z.number().int(),
                    srcSpanEnd: z.number().int(),
                    srcSpanStart: z.number().int(),
                  })
                  .optional(),
                path: z
                  .object({
                    components: z.array(z.string()).optional(),
                    extension: z.string().optional(),
                    name: z.string().optional(),
                    parent: z.string().optional(),
                  })
                  .optional(),
                pullRequest: z
                  .object({
                    author: z
                      .object({
                        approved: z.boolean().optional(),
                        lastReviewedCommit: z.string().optional(),
                        role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
                        status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
                        user: z
                          .object({
                            active: z.boolean().optional(),
                            avatarUrl: z.string().optional(),
                            displayName: z.string(),
                            emailAddress: z.string().optional(),
                            id: z.number().int().optional(),
                            links: z.object({}).optional(),
                            name: z.string(),
                            slug: z.string(),
                            type: z.enum(['NORMAL', 'SERVICE']),
                          })
                          .optional(),
                      })
                      .optional(),
                    closed: z.boolean().optional(),
                    closedDate: z.number().int().optional(),
                    createdDate: z.number().int().optional(),
                    description: z.string().optional(),
                    descriptionAsHtml: z.string().optional(),
                    draft: z.boolean().optional(),
                    fromRef: z
                      .object({
                        displayId: z.string(),
                        id: z.string(),
                        latestCommit: z.string(),
                        repository: z
                          .object({
                            archived: z.boolean().optional(),
                            defaultBranch: z.string().optional(),
                            description: z.string().optional(),
                            forkable: z.boolean().optional(),
                            hierarchyId: z.string().optional(),
                            id: z.number().int().optional(),
                            links: z.object({}).optional(),
                            name: z.string().optional(),
                            origin: z
                              .object({
                                archived: z.boolean().optional(),
                                defaultBranch: z.string().optional(),
                                description: z.string().optional(),
                                forkable: z.boolean().optional(),
                                hierarchyId: z.string().optional(),
                                id: z.number().int().optional(),
                                links: z.object({}).optional(),
                                name: z.string().optional(),
                                partition: z.number().int().optional(),
                                project: z
                                  .object({
                                    avatar: z.string().optional(),
                                    avatarUrl: z.string().optional(),
                                    description: z.string().optional(),
                                    id: z.number().int().optional(),
                                    key: z.string(),
                                    links: z.object({}).optional(),
                                    name: z.string(),
                                    public: z.boolean().optional(),
                                    scope: z.string().optional(),
                                    type: z.enum(['NORMAL', 'PERSONAL']),
                                  })
                                  .optional(),
                                public: z.boolean().optional(),
                                relatedLinks: z.object({}).optional(),
                                scmId: z.string().optional(),
                                scope: z.string().optional(),
                                slug: z.string().optional(),
                                state: z
                                  .enum([
                                    'AVAILABLE',
                                    'INITIALISATION_FAILED',
                                    'INITIALISING',
                                    'OFFLINE',
                                  ])
                                  .optional(),
                                statusMessage: z.string().optional(),
                              })
                              .optional(),
                            partition: z.number().int().optional(),
                            project: z
                              .object({
                                avatar: z.string().optional(),
                                avatarUrl: z.string().optional(),
                                description: z.string().optional(),
                                id: z.number().int().optional(),
                                key: z.string(),
                                links: z.object({}).optional(),
                                name: z.string(),
                                public: z.boolean().optional(),
                                scope: z.string().optional(),
                                type: z.enum(['NORMAL', 'PERSONAL']),
                              })
                              .optional(),
                            public: z.boolean().optional(),
                            relatedLinks: z.object({}).optional(),
                            scmId: z.string().optional(),
                            scope: z.string().optional(),
                            slug: z.string().optional(),
                            state: z
                              .enum([
                                'AVAILABLE',
                                'INITIALISATION_FAILED',
                                'INITIALISING',
                                'OFFLINE',
                              ])
                              .optional(),
                            statusMessage: z.string().optional(),
                          })
                          .optional(),
                        type: z.enum(['BRANCH', 'TAG']).optional(),
                      })
                      .optional(),
                    htmlDescription: z.string().optional(),
                    id: z.number().int().optional(),
                    links: z.object({}).optional(),
                    locked: z.boolean().optional(),
                    open: z.boolean().optional(),
                    participants: z.array(RestPullRequestParticipantSchema).optional(),
                    reviewers: z.array(RestPullRequestParticipantSchema).optional(),
                    state: z.enum(['DECLINED', 'MERGED', 'OPEN']).optional(),
                    title: z.string().optional(),
                    toRef: z
                      .object({
                        displayId: z.string(),
                        id: z.string(),
                        latestCommit: z.string(),
                        repository: z
                          .object({
                            archived: z.boolean().optional(),
                            defaultBranch: z.string().optional(),
                            description: z.string().optional(),
                            forkable: z.boolean().optional(),
                            hierarchyId: z.string().optional(),
                            id: z.number().int().optional(),
                            links: z.object({}).optional(),
                            name: z.string().optional(),
                            origin: z
                              .object({
                                archived: z.boolean().optional(),
                                defaultBranch: z.string().optional(),
                                description: z.string().optional(),
                                forkable: z.boolean().optional(),
                                hierarchyId: z.string().optional(),
                                id: z.number().int().optional(),
                                links: z.object({}).optional(),
                                name: z.string().optional(),
                                partition: z.number().int().optional(),
                                project: z
                                  .object({
                                    avatar: z.string().optional(),
                                    avatarUrl: z.string().optional(),
                                    description: z.string().optional(),
                                    id: z.number().int().optional(),
                                    key: z.string(),
                                    links: z.object({}).optional(),
                                    name: z.string(),
                                    public: z.boolean().optional(),
                                    scope: z.string().optional(),
                                    type: z.enum(['NORMAL', 'PERSONAL']),
                                  })
                                  .optional(),
                                public: z.boolean().optional(),
                                relatedLinks: z.object({}).optional(),
                                scmId: z.string().optional(),
                                scope: z.string().optional(),
                                slug: z.string().optional(),
                                state: z
                                  .enum([
                                    'AVAILABLE',
                                    'INITIALISATION_FAILED',
                                    'INITIALISING',
                                    'OFFLINE',
                                  ])
                                  .optional(),
                                statusMessage: z.string().optional(),
                              })
                              .optional(),
                            partition: z.number().int().optional(),
                            project: z
                              .object({
                                avatar: z.string().optional(),
                                avatarUrl: z.string().optional(),
                                description: z.string().optional(),
                                id: z.number().int().optional(),
                                key: z.string(),
                                links: z.object({}).optional(),
                                name: z.string(),
                                public: z.boolean().optional(),
                                scope: z.string().optional(),
                                type: z.enum(['NORMAL', 'PERSONAL']),
                              })
                              .optional(),
                            public: z.boolean().optional(),
                            relatedLinks: z.object({}).optional(),
                            scmId: z.string().optional(),
                            scope: z.string().optional(),
                            slug: z.string().optional(),
                            state: z
                              .enum([
                                'AVAILABLE',
                                'INITIALISATION_FAILED',
                                'INITIALISING',
                                'OFFLINE',
                              ])
                              .optional(),
                            statusMessage: z.string().optional(),
                          })
                          .optional(),
                        type: z.enum(['BRANCH', 'TAG']).optional(),
                      })
                      .optional(),
                    updatedDate: z.number().int().optional(),
                    version: z.number().int().optional(),
                  })
                  .optional(),
                srcPath: z
                  .object({
                    components: z.array(z.string()).optional(),
                    extension: z.string().optional(),
                    name: z.string().optional(),
                    parent: z.string().optional(),
                  })
                  .optional(),
                toHash: z.string().optional(),
              })
              .optional(),
            anchored: z.boolean().optional(),
            author: z
              .object({
                active: z.boolean().optional(),
                avatarUrl: z.string().optional(),
                displayName: z.string(),
                emailAddress: z.string().optional(),
                id: z.number().int().optional(),
                links: z.object({}).optional(),
                name: z.string(),
                slug: z.string(),
                type: z.enum(['NORMAL', 'SERVICE']),
              })
              .optional(),
            comments: z.array(RestCommentSchema).optional(),
            createdDate: z.number().int().optional(),
            html: z.string().optional(),
            id: z.number().int().optional(),
            parent: z
              .object({
                anchor: z
                  .object({
                    diffType: z.enum(['COMMIT', 'EFFECTIVE', 'RANGE']).optional(),
                    fileType: z.enum(['FROM', 'TO']).optional(),
                    fromHash: z.string().optional(),
                    line: z.number().int().optional(),
                    lineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']).optional(),
                    multilineMarker: z
                      .object({
                        startLine: z.number().int().optional(),
                        startLineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']),
                      })
                      .optional(),
                    multilineSpan: z
                      .object({
                        dstSpanEnd: z.number().int(),
                        dstSpanStart: z.number().int(),
                        srcSpanEnd: z.number().int(),
                        srcSpanStart: z.number().int(),
                      })
                      .optional(),
                    path: z
                      .object({
                        components: z.array(z.string()).optional(),
                        extension: z.string().optional(),
                        name: z.string().optional(),
                        parent: z.string().optional(),
                      })
                      .optional(),
                    pullRequest: z
                      .object({
                        author: z
                          .object({
                            approved: z.boolean().optional(),
                            lastReviewedCommit: z.string().optional(),
                            role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
                            status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
                            user: z
                              .object({
                                active: z.boolean().optional(),
                                avatarUrl: z.string().optional(),
                                displayName: z.string(),
                                emailAddress: z.string().optional(),
                                id: z.number().int().optional(),
                                links: z.object({}).optional(),
                                name: z.string(),
                                slug: z.string(),
                                type: z.enum(['NORMAL', 'SERVICE']),
                              })
                              .optional(),
                          })
                          .optional(),
                        closed: z.boolean().optional(),
                        closedDate: z.number().int().optional(),
                        createdDate: z.number().int().optional(),
                        description: z.string().optional(),
                        descriptionAsHtml: z.string().optional(),
                        draft: z.boolean().optional(),
                        fromRef: z
                          .object({
                            displayId: z.string(),
                            id: z.string(),
                            latestCommit: z.string(),
                            repository: z
                              .object({
                                archived: z.boolean().optional(),
                                defaultBranch: z.string().optional(),
                                description: z.string().optional(),
                                forkable: z.boolean().optional(),
                                hierarchyId: z.string().optional(),
                                id: z.number().int().optional(),
                                links: z.object({}).optional(),
                                name: z.string().optional(),
                                origin: z
                                  .object({
                                    archived: z.boolean().optional(),
                                    defaultBranch: z.string().optional(),
                                    description: z.string().optional(),
                                    forkable: z.boolean().optional(),
                                    hierarchyId: z.string().optional(),
                                    id: z.number().int().optional(),
                                    links: z.object({}).optional(),
                                    name: z.string().optional(),
                                    partition: z.number().int().optional(),
                                    project: z
                                      .object({
                                        avatar: z.string().optional(),
                                        avatarUrl: z.string().optional(),
                                        description: z.string().optional(),
                                        id: z.number().int().optional(),
                                        key: z.string(),
                                        links: z.object({}).optional(),
                                        name: z.string(),
                                        public: z.boolean().optional(),
                                        scope: z.string().optional(),
                                        type: z.enum(['NORMAL', 'PERSONAL']),
                                      })
                                      .optional(),
                                    public: z.boolean().optional(),
                                    relatedLinks: z.object({}).optional(),
                                    scmId: z.string().optional(),
                                    scope: z.string().optional(),
                                    slug: z.string().optional(),
                                    state: z
                                      .enum([
                                        'AVAILABLE',
                                        'INITIALISATION_FAILED',
                                        'INITIALISING',
                                        'OFFLINE',
                                      ])
                                      .optional(),
                                    statusMessage: z.string().optional(),
                                  })
                                  .optional(),
                                partition: z.number().int().optional(),
                                project: z
                                  .object({
                                    avatar: z.string().optional(),
                                    avatarUrl: z.string().optional(),
                                    description: z.string().optional(),
                                    id: z.number().int().optional(),
                                    key: z.string(),
                                    links: z.object({}).optional(),
                                    name: z.string(),
                                    public: z.boolean().optional(),
                                    scope: z.string().optional(),
                                    type: z.enum(['NORMAL', 'PERSONAL']),
                                  })
                                  .optional(),
                                public: z.boolean().optional(),
                                relatedLinks: z.object({}).optional(),
                                scmId: z.string().optional(),
                                scope: z.string().optional(),
                                slug: z.string().optional(),
                                state: z
                                  .enum([
                                    'AVAILABLE',
                                    'INITIALISATION_FAILED',
                                    'INITIALISING',
                                    'OFFLINE',
                                  ])
                                  .optional(),
                                statusMessage: z.string().optional(),
                              })
                              .optional(),
                            type: z.enum(['BRANCH', 'TAG']).optional(),
                          })
                          .optional(),
                        htmlDescription: z.string().optional(),
                        id: z.number().int().optional(),
                        links: z.object({}).optional(),
                        locked: z.boolean().optional(),
                        open: z.boolean().optional(),
                        participants: z.array(RestPullRequestParticipantSchema).optional(),
                        reviewers: z.array(RestPullRequestParticipantSchema).optional(),
                        state: z.enum(['DECLINED', 'MERGED', 'OPEN']).optional(),
                        title: z.string().optional(),
                        toRef: z
                          .object({
                            displayId: z.string(),
                            id: z.string(),
                            latestCommit: z.string(),
                            repository: z
                              .object({
                                archived: z.boolean().optional(),
                                defaultBranch: z.string().optional(),
                                description: z.string().optional(),
                                forkable: z.boolean().optional(),
                                hierarchyId: z.string().optional(),
                                id: z.number().int().optional(),
                                links: z.object({}).optional(),
                                name: z.string().optional(),
                                origin: z
                                  .object({
                                    archived: z.boolean().optional(),
                                    defaultBranch: z.string().optional(),
                                    description: z.string().optional(),
                                    forkable: z.boolean().optional(),
                                    hierarchyId: z.string().optional(),
                                    id: z.number().int().optional(),
                                    links: z.object({}).optional(),
                                    name: z.string().optional(),
                                    partition: z.number().int().optional(),
                                    project: z
                                      .object({
                                        avatar: z.string().optional(),
                                        avatarUrl: z.string().optional(),
                                        description: z.string().optional(),
                                        id: z.number().int().optional(),
                                        key: z.string(),
                                        links: z.object({}).optional(),
                                        name: z.string(),
                                        public: z.boolean().optional(),
                                        scope: z.string().optional(),
                                        type: z.enum(['NORMAL', 'PERSONAL']),
                                      })
                                      .optional(),
                                    public: z.boolean().optional(),
                                    relatedLinks: z.object({}).optional(),
                                    scmId: z.string().optional(),
                                    scope: z.string().optional(),
                                    slug: z.string().optional(),
                                    state: z
                                      .enum([
                                        'AVAILABLE',
                                        'INITIALISATION_FAILED',
                                        'INITIALISING',
                                        'OFFLINE',
                                      ])
                                      .optional(),
                                    statusMessage: z.string().optional(),
                                  })
                                  .optional(),
                                partition: z.number().int().optional(),
                                project: z
                                  .object({
                                    avatar: z.string().optional(),
                                    avatarUrl: z.string().optional(),
                                    description: z.string().optional(),
                                    id: z.number().int().optional(),
                                    key: z.string(),
                                    links: z.object({}).optional(),
                                    name: z.string(),
                                    public: z.boolean().optional(),
                                    scope: z.string().optional(),
                                    type: z.enum(['NORMAL', 'PERSONAL']),
                                  })
                                  .optional(),
                                public: z.boolean().optional(),
                                relatedLinks: z.object({}).optional(),
                                scmId: z.string().optional(),
                                scope: z.string().optional(),
                                slug: z.string().optional(),
                                state: z
                                  .enum([
                                    'AVAILABLE',
                                    'INITIALISATION_FAILED',
                                    'INITIALISING',
                                    'OFFLINE',
                                  ])
                                  .optional(),
                                statusMessage: z.string().optional(),
                              })
                              .optional(),
                            type: z.enum(['BRANCH', 'TAG']).optional(),
                          })
                          .optional(),
                        updatedDate: z.number().int().optional(),
                        version: z.number().int().optional(),
                      })
                      .optional(),
                    srcPath: z
                      .object({
                        components: z.array(z.string()).optional(),
                        extension: z.string().optional(),
                        name: z.string().optional(),
                        parent: z.string().optional(),
                      })
                      .optional(),
                    toHash: z.string().optional(),
                  })
                  .optional(),
                anchored: z.boolean().optional(),
                author: z
                  .object({
                    active: z.boolean().optional(),
                    avatarUrl: z.string().optional(),
                    displayName: z.string(),
                    emailAddress: z.string().optional(),
                    id: z.number().int().optional(),
                    links: z.object({}).optional(),
                    name: z.string(),
                    slug: z.string(),
                    type: z.enum(['NORMAL', 'SERVICE']),
                  })
                  .optional(),
                comments: z.array(RestCommentSchema).optional(),
                createdDate: z.number().int().optional(),
                html: z.string().optional(),
                id: z.number().int().optional(),
                pending: z.boolean().optional(),
                properties: z.object({}).optional(),
                reply: z.boolean().optional(),
                resolvedDate: z.number().int().optional(),
                resolver: z
                  .object({
                    active: z.boolean().optional(),
                    avatarUrl: z.string().optional(),
                    displayName: z.string(),
                    emailAddress: z.string().optional(),
                    id: z.number().int().optional(),
                    links: z.object({}).optional(),
                    name: z.string(),
                    slug: z.string(),
                    type: z.enum(['NORMAL', 'SERVICE']),
                  })
                  .optional(),
                severity: z.string().optional(),
                state: z.string().optional(),
                text: z.string().optional(),
                threadResolved: z.boolean().optional(),
                threadResolvedDate: z.number().int().optional(),
                threadResolver: z
                  .object({
                    active: z.boolean().optional(),
                    avatarUrl: z.string().optional(),
                    displayName: z.string(),
                    emailAddress: z.string().optional(),
                    id: z.number().int().optional(),
                    links: z.object({}).optional(),
                    name: z.string(),
                    slug: z.string(),
                    type: z.enum(['NORMAL', 'SERVICE']),
                  })
                  .optional(),
                updatedDate: z.number().int().optional(),
                version: z.number().int().optional(),
              })
              .optional(),
            pending: z.boolean().optional(),
            properties: z.object({}).optional(),
            reply: z.boolean().optional(),
            resolvedDate: z.number().int().optional(),
            resolver: z
              .object({
                active: z.boolean().optional(),
                avatarUrl: z.string().optional(),
                displayName: z.string(),
                emailAddress: z.string().optional(),
                id: z.number().int().optional(),
                links: z.object({}).optional(),
                name: z.string(),
                slug: z.string(),
                type: z.enum(['NORMAL', 'SERVICE']),
              })
              .optional(),
            severity: z.string().optional(),
            state: z.string().optional(),
            text: z.string().optional(),
            threadResolved: z.boolean().optional(),
            threadResolvedDate: z.number().int().optional(),
            threadResolver: z
              .object({
                active: z.boolean().optional(),
                avatarUrl: z.string().optional(),
                displayName: z.string(),
                emailAddress: z.string().optional(),
                id: z.number().int().optional(),
                links: z.object({}).optional(),
                name: z.string(),
                slug: z.string(),
                type: z.enum(['NORMAL', 'SERVICE']),
              })
              .optional(),
            updatedDate: z.number().int().optional(),
            version: z.number().int().optional(),
          }),
        )
        .optional(),
      createdDate: z.number().int().optional(),
      html: z.string().optional(),
      id: z.number().int().optional(),
      parent: z
        .object({
          anchor: z
            .object({
              diffType: z.enum(['COMMIT', 'EFFECTIVE', 'RANGE']).optional(),
              fileType: z.enum(['FROM', 'TO']).optional(),
              fromHash: z.string().optional(),
              line: z.number().int().optional(),
              lineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']).optional(),
              multilineMarker: z
                .object({
                  startLine: z.number().int().optional(),
                  startLineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']),
                })
                .optional(),
              multilineSpan: z
                .object({
                  dstSpanEnd: z.number().int(),
                  dstSpanStart: z.number().int(),
                  srcSpanEnd: z.number().int(),
                  srcSpanStart: z.number().int(),
                })
                .optional(),
              path: z
                .object({
                  components: z.array(z.string()).optional(),
                  extension: z.string().optional(),
                  name: z.string().optional(),
                  parent: z.string().optional(),
                })
                .optional(),
              pullRequest: z
                .object({
                  author: z
                    .object({
                      approved: z.boolean().optional(),
                      lastReviewedCommit: z.string().optional(),
                      role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
                      status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
                      user: z
                        .object({
                          active: z.boolean().optional(),
                          avatarUrl: z.string().optional(),
                          displayName: z.string(),
                          emailAddress: z.string().optional(),
                          id: z.number().int().optional(),
                          links: z.object({}).optional(),
                          name: z.string(),
                          slug: z.string(),
                          type: z.enum(['NORMAL', 'SERVICE']),
                        })
                        .optional(),
                    })
                    .optional(),
                  closed: z.boolean().optional(),
                  closedDate: z.number().int().optional(),
                  createdDate: z.number().int().optional(),
                  description: z.string().optional(),
                  descriptionAsHtml: z.string().optional(),
                  draft: z.boolean().optional(),
                  fromRef: z
                    .object({
                      displayId: z.string(),
                      id: z.string(),
                      latestCommit: z.string(),
                      repository: z
                        .object({
                          archived: z.boolean().optional(),
                          defaultBranch: z.string().optional(),
                          description: z.string().optional(),
                          forkable: z.boolean().optional(),
                          hierarchyId: z.string().optional(),
                          id: z.number().int().optional(),
                          links: z.object({}).optional(),
                          name: z.string().optional(),
                          origin: z
                            .object({
                              archived: z.boolean().optional(),
                              defaultBranch: z.string().optional(),
                              description: z.string().optional(),
                              forkable: z.boolean().optional(),
                              hierarchyId: z.string().optional(),
                              id: z.number().int().optional(),
                              links: z.object({}).optional(),
                              name: z.string().optional(),
                              partition: z.number().int().optional(),
                              project: z
                                .object({
                                  avatar: z.string().optional(),
                                  avatarUrl: z.string().optional(),
                                  description: z.string().optional(),
                                  id: z.number().int().optional(),
                                  key: z.string(),
                                  links: z.object({}).optional(),
                                  name: z.string(),
                                  public: z.boolean().optional(),
                                  scope: z.string().optional(),
                                  type: z.enum(['NORMAL', 'PERSONAL']),
                                })
                                .optional(),
                              public: z.boolean().optional(),
                              relatedLinks: z.object({}).optional(),
                              scmId: z.string().optional(),
                              scope: z.string().optional(),
                              slug: z.string().optional(),
                              state: z
                                .enum([
                                  'AVAILABLE',
                                  'INITIALISATION_FAILED',
                                  'INITIALISING',
                                  'OFFLINE',
                                ])
                                .optional(),
                              statusMessage: z.string().optional(),
                            })
                            .optional(),
                          partition: z.number().int().optional(),
                          project: z
                            .object({
                              avatar: z.string().optional(),
                              avatarUrl: z.string().optional(),
                              description: z.string().optional(),
                              id: z.number().int().optional(),
                              key: z.string(),
                              links: z.object({}).optional(),
                              name: z.string(),
                              public: z.boolean().optional(),
                              scope: z.string().optional(),
                              type: z.enum(['NORMAL', 'PERSONAL']),
                            })
                            .optional(),
                          public: z.boolean().optional(),
                          relatedLinks: z.object({}).optional(),
                          scmId: z.string().optional(),
                          scope: z.string().optional(),
                          slug: z.string().optional(),
                          state: z
                            .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                            .optional(),
                          statusMessage: z.string().optional(),
                        })
                        .optional(),
                      type: z.enum(['BRANCH', 'TAG']).optional(),
                    })
                    .optional(),
                  htmlDescription: z.string().optional(),
                  id: z.number().int().optional(),
                  links: z.object({}).optional(),
                  locked: z.boolean().optional(),
                  open: z.boolean().optional(),
                  participants: z
                    .array(
                      z.object({
                        approved: z.boolean().optional(),
                        lastReviewedCommit: z.string().optional(),
                        role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
                        status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
                        user: z
                          .object({
                            active: z.boolean().optional(),
                            avatarUrl: z.string().optional(),
                            displayName: z.string(),
                            emailAddress: z.string().optional(),
                            id: z.number().int().optional(),
                            links: z.object({}).optional(),
                            name: z.string(),
                            slug: z.string(),
                            type: z.enum(['NORMAL', 'SERVICE']),
                          })
                          .optional(),
                      }),
                    )
                    .optional(),
                  reviewers: z
                    .array(
                      z.object({
                        approved: z.boolean().optional(),
                        lastReviewedCommit: z.string().optional(),
                        role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
                        status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
                        user: z
                          .object({
                            active: z.boolean().optional(),
                            avatarUrl: z.string().optional(),
                            displayName: z.string(),
                            emailAddress: z.string().optional(),
                            id: z.number().int().optional(),
                            links: z.object({}).optional(),
                            name: z.string(),
                            slug: z.string(),
                            type: z.enum(['NORMAL', 'SERVICE']),
                          })
                          .optional(),
                      }),
                    )
                    .optional(),
                  state: z.enum(['DECLINED', 'MERGED', 'OPEN']).optional(),
                  title: z.string().optional(),
                  toRef: z
                    .object({
                      displayId: z.string(),
                      id: z.string(),
                      latestCommit: z.string(),
                      repository: z
                        .object({
                          archived: z.boolean().optional(),
                          defaultBranch: z.string().optional(),
                          description: z.string().optional(),
                          forkable: z.boolean().optional(),
                          hierarchyId: z.string().optional(),
                          id: z.number().int().optional(),
                          links: z.object({}).optional(),
                          name: z.string().optional(),
                          origin: z
                            .object({
                              archived: z.boolean().optional(),
                              defaultBranch: z.string().optional(),
                              description: z.string().optional(),
                              forkable: z.boolean().optional(),
                              hierarchyId: z.string().optional(),
                              id: z.number().int().optional(),
                              links: z.object({}).optional(),
                              name: z.string().optional(),
                              partition: z.number().int().optional(),
                              project: z
                                .object({
                                  avatar: z.string().optional(),
                                  avatarUrl: z.string().optional(),
                                  description: z.string().optional(),
                                  id: z.number().int().optional(),
                                  key: z.string(),
                                  links: z.object({}).optional(),
                                  name: z.string(),
                                  public: z.boolean().optional(),
                                  scope: z.string().optional(),
                                  type: z.enum(['NORMAL', 'PERSONAL']),
                                })
                                .optional(),
                              public: z.boolean().optional(),
                              relatedLinks: z.object({}).optional(),
                              scmId: z.string().optional(),
                              scope: z.string().optional(),
                              slug: z.string().optional(),
                              state: z
                                .enum([
                                  'AVAILABLE',
                                  'INITIALISATION_FAILED',
                                  'INITIALISING',
                                  'OFFLINE',
                                ])
                                .optional(),
                              statusMessage: z.string().optional(),
                            })
                            .optional(),
                          partition: z.number().int().optional(),
                          project: z
                            .object({
                              avatar: z.string().optional(),
                              avatarUrl: z.string().optional(),
                              description: z.string().optional(),
                              id: z.number().int().optional(),
                              key: z.string(),
                              links: z.object({}).optional(),
                              name: z.string(),
                              public: z.boolean().optional(),
                              scope: z.string().optional(),
                              type: z.enum(['NORMAL', 'PERSONAL']),
                            })
                            .optional(),
                          public: z.boolean().optional(),
                          relatedLinks: z.object({}).optional(),
                          scmId: z.string().optional(),
                          scope: z.string().optional(),
                          slug: z.string().optional(),
                          state: z
                            .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                            .optional(),
                          statusMessage: z.string().optional(),
                        })
                        .optional(),
                      type: z.enum(['BRANCH', 'TAG']).optional(),
                    })
                    .optional(),
                  updatedDate: z.number().int().optional(),
                  version: z.number().int().optional(),
                })
                .optional(),
              srcPath: z
                .object({
                  components: z.array(z.string()).optional(),
                  extension: z.string().optional(),
                  name: z.string().optional(),
                  parent: z.string().optional(),
                })
                .optional(),
              toHash: z.string().optional(),
            })
            .optional(),
          anchored: z.boolean().optional(),
          author: z
            .object({
              active: z.boolean().optional(),
              avatarUrl: z.string().optional(),
              displayName: z.string(),
              emailAddress: z.string().optional(),
              id: z.number().int().optional(),
              links: z.object({}).optional(),
              name: z.string(),
              slug: z.string(),
              type: z.enum(['NORMAL', 'SERVICE']),
            })
            .optional(),
          comments: z
            .array(
              z.object({
                anchor: z
                  .object({
                    diffType: z.enum(['COMMIT', 'EFFECTIVE', 'RANGE']).optional(),
                    fileType: z.enum(['FROM', 'TO']).optional(),
                    fromHash: z.string().optional(),
                    line: z.number().int().optional(),
                    lineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']).optional(),
                    multilineMarker: z
                      .object({
                        startLine: z.number().int().optional(),
                        startLineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']),
                      })
                      .optional(),
                    multilineSpan: z
                      .object({
                        dstSpanEnd: z.number().int(),
                        dstSpanStart: z.number().int(),
                        srcSpanEnd: z.number().int(),
                        srcSpanStart: z.number().int(),
                      })
                      .optional(),
                    path: z
                      .object({
                        components: z.array(z.string()).optional(),
                        extension: z.string().optional(),
                        name: z.string().optional(),
                        parent: z.string().optional(),
                      })
                      .optional(),
                    pullRequest: z
                      .object({
                        author: z
                          .object({
                            approved: z.boolean().optional(),
                            lastReviewedCommit: z.string().optional(),
                            role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
                            status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
                            user: z
                              .object({
                                active: z.boolean().optional(),
                                avatarUrl: z.string().optional(),
                                displayName: z.string(),
                                emailAddress: z.string().optional(),
                                id: z.number().int().optional(),
                                links: z.object({}).optional(),
                                name: z.string(),
                                slug: z.string(),
                                type: z.enum(['NORMAL', 'SERVICE']),
                              })
                              .optional(),
                          })
                          .optional(),
                        closed: z.boolean().optional(),
                        closedDate: z.number().int().optional(),
                        createdDate: z.number().int().optional(),
                        description: z.string().optional(),
                        descriptionAsHtml: z.string().optional(),
                        draft: z.boolean().optional(),
                        fromRef: z
                          .object({
                            displayId: z.string(),
                            id: z.string(),
                            latestCommit: z.string(),
                            repository: z
                              .object({
                                archived: z.boolean().optional(),
                                defaultBranch: z.string().optional(),
                                description: z.string().optional(),
                                forkable: z.boolean().optional(),
                                hierarchyId: z.string().optional(),
                                id: z.number().int().optional(),
                                links: z.object({}).optional(),
                                name: z.string().optional(),
                                origin: z
                                  .object({
                                    archived: z.boolean().optional(),
                                    defaultBranch: z.string().optional(),
                                    description: z.string().optional(),
                                    forkable: z.boolean().optional(),
                                    hierarchyId: z.string().optional(),
                                    id: z.number().int().optional(),
                                    links: z.object({}).optional(),
                                    name: z.string().optional(),
                                    partition: z.number().int().optional(),
                                    project: z
                                      .object({
                                        avatar: z.string().optional(),
                                        avatarUrl: z.string().optional(),
                                        description: z.string().optional(),
                                        id: z.number().int().optional(),
                                        key: z.string(),
                                        links: z.object({}).optional(),
                                        name: z.string(),
                                        public: z.boolean().optional(),
                                        scope: z.string().optional(),
                                        type: z.enum(['NORMAL', 'PERSONAL']),
                                      })
                                      .optional(),
                                    public: z.boolean().optional(),
                                    relatedLinks: z.object({}).optional(),
                                    scmId: z.string().optional(),
                                    scope: z.string().optional(),
                                    slug: z.string().optional(),
                                    state: z
                                      .enum([
                                        'AVAILABLE',
                                        'INITIALISATION_FAILED',
                                        'INITIALISING',
                                        'OFFLINE',
                                      ])
                                      .optional(),
                                    statusMessage: z.string().optional(),
                                  })
                                  .optional(),
                                partition: z.number().int().optional(),
                                project: z
                                  .object({
                                    avatar: z.string().optional(),
                                    avatarUrl: z.string().optional(),
                                    description: z.string().optional(),
                                    id: z.number().int().optional(),
                                    key: z.string(),
                                    links: z.object({}).optional(),
                                    name: z.string(),
                                    public: z.boolean().optional(),
                                    scope: z.string().optional(),
                                    type: z.enum(['NORMAL', 'PERSONAL']),
                                  })
                                  .optional(),
                                public: z.boolean().optional(),
                                relatedLinks: z.object({}).optional(),
                                scmId: z.string().optional(),
                                scope: z.string().optional(),
                                slug: z.string().optional(),
                                state: z
                                  .enum([
                                    'AVAILABLE',
                                    'INITIALISATION_FAILED',
                                    'INITIALISING',
                                    'OFFLINE',
                                  ])
                                  .optional(),
                                statusMessage: z.string().optional(),
                              })
                              .optional(),
                            type: z.enum(['BRANCH', 'TAG']).optional(),
                          })
                          .optional(),
                        htmlDescription: z.string().optional(),
                        id: z.number().int().optional(),
                        links: z.object({}).optional(),
                        locked: z.boolean().optional(),
                        open: z.boolean().optional(),
                        participants: z.array(RestPullRequestParticipantSchema).optional(),
                        reviewers: z.array(RestPullRequestParticipantSchema).optional(),
                        state: z.enum(['DECLINED', 'MERGED', 'OPEN']).optional(),
                        title: z.string().optional(),
                        toRef: z
                          .object({
                            displayId: z.string(),
                            id: z.string(),
                            latestCommit: z.string(),
                            repository: z
                              .object({
                                archived: z.boolean().optional(),
                                defaultBranch: z.string().optional(),
                                description: z.string().optional(),
                                forkable: z.boolean().optional(),
                                hierarchyId: z.string().optional(),
                                id: z.number().int().optional(),
                                links: z.object({}).optional(),
                                name: z.string().optional(),
                                origin: z
                                  .object({
                                    archived: z.boolean().optional(),
                                    defaultBranch: z.string().optional(),
                                    description: z.string().optional(),
                                    forkable: z.boolean().optional(),
                                    hierarchyId: z.string().optional(),
                                    id: z.number().int().optional(),
                                    links: z.object({}).optional(),
                                    name: z.string().optional(),
                                    partition: z.number().int().optional(),
                                    project: z
                                      .object({
                                        avatar: z.string().optional(),
                                        avatarUrl: z.string().optional(),
                                        description: z.string().optional(),
                                        id: z.number().int().optional(),
                                        key: z.string(),
                                        links: z.object({}).optional(),
                                        name: z.string(),
                                        public: z.boolean().optional(),
                                        scope: z.string().optional(),
                                        type: z.enum(['NORMAL', 'PERSONAL']),
                                      })
                                      .optional(),
                                    public: z.boolean().optional(),
                                    relatedLinks: z.object({}).optional(),
                                    scmId: z.string().optional(),
                                    scope: z.string().optional(),
                                    slug: z.string().optional(),
                                    state: z
                                      .enum([
                                        'AVAILABLE',
                                        'INITIALISATION_FAILED',
                                        'INITIALISING',
                                        'OFFLINE',
                                      ])
                                      .optional(),
                                    statusMessage: z.string().optional(),
                                  })
                                  .optional(),
                                partition: z.number().int().optional(),
                                project: z
                                  .object({
                                    avatar: z.string().optional(),
                                    avatarUrl: z.string().optional(),
                                    description: z.string().optional(),
                                    id: z.number().int().optional(),
                                    key: z.string(),
                                    links: z.object({}).optional(),
                                    name: z.string(),
                                    public: z.boolean().optional(),
                                    scope: z.string().optional(),
                                    type: z.enum(['NORMAL', 'PERSONAL']),
                                  })
                                  .optional(),
                                public: z.boolean().optional(),
                                relatedLinks: z.object({}).optional(),
                                scmId: z.string().optional(),
                                scope: z.string().optional(),
                                slug: z.string().optional(),
                                state: z
                                  .enum([
                                    'AVAILABLE',
                                    'INITIALISATION_FAILED',
                                    'INITIALISING',
                                    'OFFLINE',
                                  ])
                                  .optional(),
                                statusMessage: z.string().optional(),
                              })
                              .optional(),
                            type: z.enum(['BRANCH', 'TAG']).optional(),
                          })
                          .optional(),
                        updatedDate: z.number().int().optional(),
                        version: z.number().int().optional(),
                      })
                      .optional(),
                    srcPath: z
                      .object({
                        components: z.array(z.string()).optional(),
                        extension: z.string().optional(),
                        name: z.string().optional(),
                        parent: z.string().optional(),
                      })
                      .optional(),
                    toHash: z.string().optional(),
                  })
                  .optional(),
                anchored: z.boolean().optional(),
                author: z
                  .object({
                    active: z.boolean().optional(),
                    avatarUrl: z.string().optional(),
                    displayName: z.string(),
                    emailAddress: z.string().optional(),
                    id: z.number().int().optional(),
                    links: z.object({}).optional(),
                    name: z.string(),
                    slug: z.string(),
                    type: z.enum(['NORMAL', 'SERVICE']),
                  })
                  .optional(),
                comments: z.array(RestCommentSchema).optional(),
                createdDate: z.number().int().optional(),
                html: z.string().optional(),
                id: z.number().int().optional(),
                parent: z
                  .object({
                    anchor: z
                      .object({
                        diffType: z.enum(['COMMIT', 'EFFECTIVE', 'RANGE']).optional(),
                        fileType: z.enum(['FROM', 'TO']).optional(),
                        fromHash: z.string().optional(),
                        line: z.number().int().optional(),
                        lineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']).optional(),
                        multilineMarker: z
                          .object({
                            startLine: z.number().int().optional(),
                            startLineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']),
                          })
                          .optional(),
                        multilineSpan: z
                          .object({
                            dstSpanEnd: z.number().int(),
                            dstSpanStart: z.number().int(),
                            srcSpanEnd: z.number().int(),
                            srcSpanStart: z.number().int(),
                          })
                          .optional(),
                        path: z
                          .object({
                            components: z.array(z.string()).optional(),
                            extension: z.string().optional(),
                            name: z.string().optional(),
                            parent: z.string().optional(),
                          })
                          .optional(),
                        pullRequest: z
                          .object({
                            author: z
                              .object({
                                approved: z.boolean().optional(),
                                lastReviewedCommit: z.string().optional(),
                                role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
                                status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
                                user: z
                                  .object({
                                    active: z.boolean().optional(),
                                    avatarUrl: z.string().optional(),
                                    displayName: z.string(),
                                    emailAddress: z.string().optional(),
                                    id: z.number().int().optional(),
                                    links: z.object({}).optional(),
                                    name: z.string(),
                                    slug: z.string(),
                                    type: z.enum(['NORMAL', 'SERVICE']),
                                  })
                                  .optional(),
                              })
                              .optional(),
                            closed: z.boolean().optional(),
                            closedDate: z.number().int().optional(),
                            createdDate: z.number().int().optional(),
                            description: z.string().optional(),
                            descriptionAsHtml: z.string().optional(),
                            draft: z.boolean().optional(),
                            fromRef: z
                              .object({
                                displayId: z.string(),
                                id: z.string(),
                                latestCommit: z.string(),
                                repository: z
                                  .object({
                                    archived: z.boolean().optional(),
                                    defaultBranch: z.string().optional(),
                                    description: z.string().optional(),
                                    forkable: z.boolean().optional(),
                                    hierarchyId: z.string().optional(),
                                    id: z.number().int().optional(),
                                    links: z.object({}).optional(),
                                    name: z.string().optional(),
                                    origin: z
                                      .object({
                                        archived: z.boolean().optional(),
                                        defaultBranch: z.string().optional(),
                                        description: z.string().optional(),
                                        forkable: z.boolean().optional(),
                                        hierarchyId: z.string().optional(),
                                        id: z.number().int().optional(),
                                        links: z.object({}).optional(),
                                        name: z.string().optional(),
                                        partition: z.number().int().optional(),
                                        project: z
                                          .object({
                                            avatar: z.string().optional(),
                                            avatarUrl: z.string().optional(),
                                            description: z.string().optional(),
                                            id: z.number().int().optional(),
                                            key: z.string(),
                                            links: z.object({}).optional(),
                                            name: z.string(),
                                            public: z.boolean().optional(),
                                            scope: z.string().optional(),
                                            type: z.enum(['NORMAL', 'PERSONAL']),
                                          })
                                          .optional(),
                                        public: z.boolean().optional(),
                                        relatedLinks: z.object({}).optional(),
                                        scmId: z.string().optional(),
                                        scope: z.string().optional(),
                                        slug: z.string().optional(),
                                        state: z
                                          .enum([
                                            'AVAILABLE',
                                            'INITIALISATION_FAILED',
                                            'INITIALISING',
                                            'OFFLINE',
                                          ])
                                          .optional(),
                                        statusMessage: z.string().optional(),
                                      })
                                      .optional(),
                                    partition: z.number().int().optional(),
                                    project: z
                                      .object({
                                        avatar: z.string().optional(),
                                        avatarUrl: z.string().optional(),
                                        description: z.string().optional(),
                                        id: z.number().int().optional(),
                                        key: z.string(),
                                        links: z.object({}).optional(),
                                        name: z.string(),
                                        public: z.boolean().optional(),
                                        scope: z.string().optional(),
                                        type: z.enum(['NORMAL', 'PERSONAL']),
                                      })
                                      .optional(),
                                    public: z.boolean().optional(),
                                    relatedLinks: z.object({}).optional(),
                                    scmId: z.string().optional(),
                                    scope: z.string().optional(),
                                    slug: z.string().optional(),
                                    state: z
                                      .enum([
                                        'AVAILABLE',
                                        'INITIALISATION_FAILED',
                                        'INITIALISING',
                                        'OFFLINE',
                                      ])
                                      .optional(),
                                    statusMessage: z.string().optional(),
                                  })
                                  .optional(),
                                type: z.enum(['BRANCH', 'TAG']).optional(),
                              })
                              .optional(),
                            htmlDescription: z.string().optional(),
                            id: z.number().int().optional(),
                            links: z.object({}).optional(),
                            locked: z.boolean().optional(),
                            open: z.boolean().optional(),
                            participants: z.array(RestPullRequestParticipantSchema).optional(),
                            reviewers: z.array(RestPullRequestParticipantSchema).optional(),
                            state: z.enum(['DECLINED', 'MERGED', 'OPEN']).optional(),
                            title: z.string().optional(),
                            toRef: z
                              .object({
                                displayId: z.string(),
                                id: z.string(),
                                latestCommit: z.string(),
                                repository: z
                                  .object({
                                    archived: z.boolean().optional(),
                                    defaultBranch: z.string().optional(),
                                    description: z.string().optional(),
                                    forkable: z.boolean().optional(),
                                    hierarchyId: z.string().optional(),
                                    id: z.number().int().optional(),
                                    links: z.object({}).optional(),
                                    name: z.string().optional(),
                                    origin: z
                                      .object({
                                        archived: z.boolean().optional(),
                                        defaultBranch: z.string().optional(),
                                        description: z.string().optional(),
                                        forkable: z.boolean().optional(),
                                        hierarchyId: z.string().optional(),
                                        id: z.number().int().optional(),
                                        links: z.object({}).optional(),
                                        name: z.string().optional(),
                                        partition: z.number().int().optional(),
                                        project: z
                                          .object({
                                            avatar: z.string().optional(),
                                            avatarUrl: z.string().optional(),
                                            description: z.string().optional(),
                                            id: z.number().int().optional(),
                                            key: z.string(),
                                            links: z.object({}).optional(),
                                            name: z.string(),
                                            public: z.boolean().optional(),
                                            scope: z.string().optional(),
                                            type: z.enum(['NORMAL', 'PERSONAL']),
                                          })
                                          .optional(),
                                        public: z.boolean().optional(),
                                        relatedLinks: z.object({}).optional(),
                                        scmId: z.string().optional(),
                                        scope: z.string().optional(),
                                        slug: z.string().optional(),
                                        state: z
                                          .enum([
                                            'AVAILABLE',
                                            'INITIALISATION_FAILED',
                                            'INITIALISING',
                                            'OFFLINE',
                                          ])
                                          .optional(),
                                        statusMessage: z.string().optional(),
                                      })
                                      .optional(),
                                    partition: z.number().int().optional(),
                                    project: z
                                      .object({
                                        avatar: z.string().optional(),
                                        avatarUrl: z.string().optional(),
                                        description: z.string().optional(),
                                        id: z.number().int().optional(),
                                        key: z.string(),
                                        links: z.object({}).optional(),
                                        name: z.string(),
                                        public: z.boolean().optional(),
                                        scope: z.string().optional(),
                                        type: z.enum(['NORMAL', 'PERSONAL']),
                                      })
                                      .optional(),
                                    public: z.boolean().optional(),
                                    relatedLinks: z.object({}).optional(),
                                    scmId: z.string().optional(),
                                    scope: z.string().optional(),
                                    slug: z.string().optional(),
                                    state: z
                                      .enum([
                                        'AVAILABLE',
                                        'INITIALISATION_FAILED',
                                        'INITIALISING',
                                        'OFFLINE',
                                      ])
                                      .optional(),
                                    statusMessage: z.string().optional(),
                                  })
                                  .optional(),
                                type: z.enum(['BRANCH', 'TAG']).optional(),
                              })
                              .optional(),
                            updatedDate: z.number().int().optional(),
                            version: z.number().int().optional(),
                          })
                          .optional(),
                        srcPath: z
                          .object({
                            components: z.array(z.string()).optional(),
                            extension: z.string().optional(),
                            name: z.string().optional(),
                            parent: z.string().optional(),
                          })
                          .optional(),
                        toHash: z.string().optional(),
                      })
                      .optional(),
                    anchored: z.boolean().optional(),
                    author: z
                      .object({
                        active: z.boolean().optional(),
                        avatarUrl: z.string().optional(),
                        displayName: z.string(),
                        emailAddress: z.string().optional(),
                        id: z.number().int().optional(),
                        links: z.object({}).optional(),
                        name: z.string(),
                        slug: z.string(),
                        type: z.enum(['NORMAL', 'SERVICE']),
                      })
                      .optional(),
                    comments: z.array(RestCommentSchema).optional(),
                    createdDate: z.number().int().optional(),
                    html: z.string().optional(),
                    id: z.number().int().optional(),
                    pending: z.boolean().optional(),
                    properties: z.object({}).optional(),
                    reply: z.boolean().optional(),
                    resolvedDate: z.number().int().optional(),
                    resolver: z
                      .object({
                        active: z.boolean().optional(),
                        avatarUrl: z.string().optional(),
                        displayName: z.string(),
                        emailAddress: z.string().optional(),
                        id: z.number().int().optional(),
                        links: z.object({}).optional(),
                        name: z.string(),
                        slug: z.string(),
                        type: z.enum(['NORMAL', 'SERVICE']),
                      })
                      .optional(),
                    severity: z.string().optional(),
                    state: z.string().optional(),
                    text: z.string().optional(),
                    threadResolved: z.boolean().optional(),
                    threadResolvedDate: z.number().int().optional(),
                    threadResolver: z
                      .object({
                        active: z.boolean().optional(),
                        avatarUrl: z.string().optional(),
                        displayName: z.string(),
                        emailAddress: z.string().optional(),
                        id: z.number().int().optional(),
                        links: z.object({}).optional(),
                        name: z.string(),
                        slug: z.string(),
                        type: z.enum(['NORMAL', 'SERVICE']),
                      })
                      .optional(),
                    updatedDate: z.number().int().optional(),
                    version: z.number().int().optional(),
                  })
                  .optional(),
                pending: z.boolean().optional(),
                properties: z.object({}).optional(),
                reply: z.boolean().optional(),
                resolvedDate: z.number().int().optional(),
                resolver: z
                  .object({
                    active: z.boolean().optional(),
                    avatarUrl: z.string().optional(),
                    displayName: z.string(),
                    emailAddress: z.string().optional(),
                    id: z.number().int().optional(),
                    links: z.object({}).optional(),
                    name: z.string(),
                    slug: z.string(),
                    type: z.enum(['NORMAL', 'SERVICE']),
                  })
                  .optional(),
                severity: z.string().optional(),
                state: z.string().optional(),
                text: z.string().optional(),
                threadResolved: z.boolean().optional(),
                threadResolvedDate: z.number().int().optional(),
                threadResolver: z
                  .object({
                    active: z.boolean().optional(),
                    avatarUrl: z.string().optional(),
                    displayName: z.string(),
                    emailAddress: z.string().optional(),
                    id: z.number().int().optional(),
                    links: z.object({}).optional(),
                    name: z.string(),
                    slug: z.string(),
                    type: z.enum(['NORMAL', 'SERVICE']),
                  })
                  .optional(),
                updatedDate: z.number().int().optional(),
                version: z.number().int().optional(),
              }),
            )
            .optional(),
          createdDate: z.number().int().optional(),
          html: z.string().optional(),
          id: z.number().int().optional(),
          pending: z.boolean().optional(),
          properties: z.object({}).optional(),
          reply: z.boolean().optional(),
          resolvedDate: z.number().int().optional(),
          resolver: z
            .object({
              active: z.boolean().optional(),
              avatarUrl: z.string().optional(),
              displayName: z.string(),
              emailAddress: z.string().optional(),
              id: z.number().int().optional(),
              links: z.object({}).optional(),
              name: z.string(),
              slug: z.string(),
              type: z.enum(['NORMAL', 'SERVICE']),
            })
            .optional(),
          severity: z.string().optional(),
          state: z.string().optional(),
          text: z.string().optional(),
          threadResolved: z.boolean().optional(),
          threadResolvedDate: z.number().int().optional(),
          threadResolver: z
            .object({
              active: z.boolean().optional(),
              avatarUrl: z.string().optional(),
              displayName: z.string(),
              emailAddress: z.string().optional(),
              id: z.number().int().optional(),
              links: z.object({}).optional(),
              name: z.string(),
              slug: z.string(),
              type: z.enum(['NORMAL', 'SERVICE']),
            })
            .optional(),
          updatedDate: z.number().int().optional(),
          version: z.number().int().optional(),
        })
        .optional(),
      pending: z.boolean().optional(),
      properties: z.object({}).optional(),
      reply: z.boolean().optional(),
      resolvedDate: z.number().int().optional(),
      resolver: z
        .object({
          active: z.boolean().optional(),
          avatarUrl: z.string().optional(),
          displayName: z.string(),
          emailAddress: z.string().optional(),
          id: z.number().int().optional(),
          links: z.object({}).optional(),
          name: z.string(),
          slug: z.string(),
          type: z.enum(['NORMAL', 'SERVICE']),
        })
        .optional(),
      severity: z.string().optional(),
      state: z.string().optional(),
      text: z.string().optional(),
      threadResolved: z.boolean().optional(),
      threadResolvedDate: z.number().int().optional(),
      threadResolver: z
        .object({
          active: z.boolean().optional(),
          avatarUrl: z.string().optional(),
          displayName: z.string(),
          emailAddress: z.string().optional(),
          id: z.number().int().optional(),
          links: z.object({}).optional(),
          name: z.string(),
          slug: z.string(),
          type: z.enum(['NORMAL', 'SERVICE']),
        })
        .optional(),
      updatedDate: z.number().int().optional(),
      version: z.number().int().optional(),
    })
    .optional(),
  emoticon: z
    .object({
      shortcut: z.string().optional(),
      url: z.string().optional(),
      value: z.string().optional(),
    })
    .optional(),
  user: z
    .object({
      active: z.boolean().optional(),
      avatarUrl: z.string().optional(),
      displayName: z.string(),
      emailAddress: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      name: z.string(),
      slug: z.string(),
      type: z.enum(['NORMAL', 'SERVICE']),
    })
    .optional(),
});

export type RestUserReaction = z.infer<typeof RestUserReactionSchema>;

export const RestDefaultTaskSchema = z.object({
  description: z.string().optional(),
  html: z.string().optional(),
  id: z.number().int().optional(),
});

export type RestDefaultTask = z.infer<typeof RestDefaultTaskSchema>;

export const RestDefaultTaskRequestSchema = z.object({
  description: z.string(),
  sourceMatcher: z
    .object({
      displayId: z.string().optional(),
      id: z.string().optional(),
      type: z
        .object({
          id: z.enum(['ANY_REF', 'BRANCH', 'PATTERN', 'MODEL_CATEGORY', 'MODEL_BRANCH']),
          name: z.string(),
        })
        .optional(),
    })
    .optional(),
  targetMatcher: z
    .object({
      displayId: z.string().optional(),
      id: z.string().optional(),
      type: z
        .object({
          id: z.enum(['ANY_REF', 'BRANCH', 'PATTERN', 'MODEL_CATEGORY', 'MODEL_BRANCH']),
          name: z.string(),
        })
        .optional(),
    })
    .optional(),
});

export type RestDefaultTaskRequest = z.infer<typeof RestDefaultTaskRequestSchema>;

export const RestGitTagCreateRequestSchema = z.object({
  force: z.boolean().optional(),
  message: z.string().optional(),
  name: z.string().optional(),
  startPoint: z.string().optional(),
  type: z.enum(['ANNOTATED', 'LIGHTWEIGHT']).optional(),
});

export type RestGitTagCreateRequest = z.infer<typeof RestGitTagCreateRequestSchema>;

export const RestPullRequestRebaseRequestSchema = z.object({
  version: z.number().int().optional(),
});

export type RestPullRequestRebaseRequest = z.infer<typeof RestPullRequestRebaseRequestSchema>;

export const RestPullRequestRebaseResultSchema = z.object({
  refChange: z
    .object({
      fromHash: z.string().optional(),
      ref: z
        .object({
          displayId: z.string(),
          id: z.string(),
          type: z.enum(['BRANCH', 'TAG']),
        })
        .optional(),
      refId: z.string().optional(),
      toHash: z.string().optional(),
      type: z.enum(['ADD', 'DELETE', 'UPDATE']).optional(),
    })
    .optional(),
});

export type RestPullRequestRebaseResult = z.infer<typeof RestPullRequestRebaseResultSchema>;

export const RestPullRequestRebaseabilitySchema = z.object({
  vetoes: z
    .array(
      z.object({
        detailedMessage: z.string().optional(),
        summaryMessage: z.string().optional(),
      }),
    )
    .optional(),
});

export type RestPullRequestRebaseability = z.infer<typeof RestPullRequestRebaseabilitySchema>;

export const RestRefChangeSchema = z.object({
  fromHash: z.string().optional(),
  ref: z
    .object({
      displayId: z.string(),
      id: z.string(),
      type: z.enum(['BRANCH', 'TAG']),
    })
    .optional(),
  refId: z.string().optional(),
  toHash: z.string().optional(),
  type: z.enum(['ADD', 'DELETE', 'UPDATE']).optional(),
});

export type RestRefChange = z.infer<typeof RestRefChangeSchema>;

export const RestRepositoryHookVetoSchema = z.object({
  detailedMessage: z.string().optional(),
  summaryMessage: z.string().optional(),
});

export type RestRepositoryHookVeto = z.infer<typeof RestRepositoryHookVetoSchema>;

export const RestTagSchema = z.object({
  displayId: z.string().optional(),
  hash: z.string().optional(),
  id: z.string().optional(),
  latestChangeset: z.string().optional(),
  latestCommit: z.string().optional(),
  type: z.enum(['BRANCH', 'TAG']).optional(),
});

export type RestTag = z.infer<typeof RestTagSchema>;

export const RestGpgKeySchema = z.object({
  emailAddress: z.string().optional(),
  expiryDate: z.number().int().optional(),
  fingerprint: z.string().optional(),
  id: z.string().optional(),
  subKeys: z
    .array(
      z.object({
        expiryDate: z.string().datetime().optional(),
        fingerprint: z.string().optional(),
      }),
    )
    .optional(),
  text: z.string().optional(),
});

export type RestGpgKey = z.infer<typeof RestGpgKeySchema>;

export const RestGpgSubKeySchema = z.object({
  expiryDate: z.string().datetime().optional(),
  fingerprint: z.string().optional(),
});

export type RestGpgSubKey = z.infer<typeof RestGpgSubKeySchema>;

export const ApplicationIdSchema = z.object({});

export type ApplicationId = z.infer<typeof ApplicationIdSchema>;

export const RestChangesetSchema = z.object({
  changes: z
    .object({
      isLastPage: z.boolean().optional(),
      limit: z.number().int().optional(),
      nextPageStart: z.number().int().optional(),
      size: z.number().int().optional(),
      start: z.number().int().optional(),
      values: z.object({}).optional(),
    })
    .optional(),
  fromCommit: z
    .object({
      displayId: z.string().optional(),
      id: z.string().optional(),
    })
    .optional(),
  links: z.object({}).optional(),
  repository: z
    .object({
      archived: z.boolean().optional(),
      defaultBranch: z.string().optional(),
      description: z.string().optional(),
      forkable: z.boolean().optional(),
      hierarchyId: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      name: z.string().optional(),
      origin: z
        .object({
          archived: z.boolean().optional(),
          defaultBranch: z.string().optional(),
          description: z.string().optional(),
          forkable: z.boolean().optional(),
          hierarchyId: z.string().optional(),
          id: z.number().int().optional(),
          links: z.object({}).optional(),
          name: z.string().optional(),
          partition: z.number().int().optional(),
          project: z
            .object({
              avatar: z.string().optional(),
              avatarUrl: z.string().optional(),
              description: z.string().optional(),
              id: z.number().int().optional(),
              key: z.string(),
              links: z.object({}).optional(),
              name: z.string(),
              public: z.boolean().optional(),
              scope: z.string().optional(),
              type: z.enum(['NORMAL', 'PERSONAL']),
            })
            .optional(),
          public: z.boolean().optional(),
          relatedLinks: z.object({}).optional(),
          scmId: z.string().optional(),
          scope: z.string().optional(),
          slug: z.string().optional(),
          state: z
            .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
            .optional(),
          statusMessage: z.string().optional(),
        })
        .optional(),
      partition: z.number().int().optional(),
      project: z
        .object({
          avatar: z.string().optional(),
          avatarUrl: z.string().optional(),
          description: z.string().optional(),
          id: z.number().int().optional(),
          key: z.string(),
          links: z.object({}).optional(),
          name: z.string(),
          public: z.boolean().optional(),
          scope: z.string().optional(),
          type: z.enum(['NORMAL', 'PERSONAL']),
        })
        .optional(),
      public: z.boolean().optional(),
      relatedLinks: z.object({}).optional(),
      scmId: z.string().optional(),
      scope: z.string().optional(),
      slug: z.string().optional(),
      state: z.enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE']).optional(),
      statusMessage: z.string().optional(),
    })
    .optional(),
  toCommit: z
    .object({
      author: z
        .object({
          avatarUrl: z.string().optional(),
          emailAddress: z.string().optional(),
          name: z.string(),
        })
        .optional(),
      authorTimestamp: z.number().int().optional(),
      committer: z
        .object({
          avatarUrl: z.string().optional(),
          emailAddress: z.string().optional(),
          name: z.string(),
        })
        .optional(),
      committerTimestamp: z.number().int().optional(),
      displayId: z.string().optional(),
      id: z.string().optional(),
      message: z.string().optional(),
      parents: z
        .array(
          z.object({
            displayId: z.string().optional(),
            id: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});

export type RestChangeset = z.infer<typeof RestChangesetSchema>;

export const RestCommentJiraIssueSchema = z.object({
  commentId: z.number().int().optional(),
  issueKey: z.string().optional(),
});

export type RestCommentJiraIssue = z.infer<typeof RestCommentJiraIssueSchema>;

export const RestCommitSchema = z.object({
  author: z
    .object({
      avatarUrl: z.string().optional(),
      emailAddress: z.string().optional(),
      name: z.string(),
    })
    .optional(),
  authorTimestamp: z.number().int().optional(),
  committer: z
    .object({
      avatarUrl: z.string().optional(),
      emailAddress: z.string().optional(),
      name: z.string(),
    })
    .optional(),
  committerTimestamp: z.number().int().optional(),
  displayId: z.string().optional(),
  id: z.string().optional(),
  message: z.string().optional(),
  parents: z
    .array(
      z.object({
        displayId: z.string().optional(),
        id: z.string().optional(),
      }),
    )
    .optional(),
});

export type RestCommit = z.infer<typeof RestCommitSchema>;

export const RestEnhancedEntityLinkSchema = z.object({
  applicationLinkId: z.string().optional(),
  displayUrl: z.string().optional(),
  projectId: z.number().int().optional(),
  projectKey: z.string().optional(),
  projectName: z.string().optional(),
});

export type RestEnhancedEntityLink = z.infer<typeof RestEnhancedEntityLinkSchema>;

export const RestJiraIssueSchema = z.object({
  key: z.string().optional(),
  url: z.string().optional(),
});

export type RestJiraIssue = z.infer<typeof RestJiraIssueSchema>;

export const RestMinimalCommitSchema = z.object({
  displayId: z.string().optional(),
  id: z.string().optional(),
});

export type RestMinimalCommit = z.infer<typeof RestMinimalCommitSchema>;

export const RestPageRestChangeSchema = z.object({
  isLastPage: z.boolean().optional(),
  limit: z.number().int().optional(),
  nextPageStart: z.number().int().optional(),
  size: z.number().int().optional(),
  start: z.number().int().optional(),
  values: z.object({}).optional(),
});

export type RestPageRestChange = z.infer<typeof RestPageRestChangeSchema>;

export const RestPersonSchema = z.object({
  avatarUrl: z.string().optional(),
  emailAddress: z.string().optional(),
  name: z.string().optional(),
});

export type RestPerson = z.infer<typeof RestPersonSchema>;

export const RestClusterNodeSchema = z.object({
  address: z
    .object({
      address: z.string().optional(),
      port: z.number().int().optional(),
    })
    .optional(),
  buildVersion: z.string().optional(),
  id: z.string().optional(),
  local: z.boolean().optional(),
  name: z.string().optional(),
});

export type RestClusterNode = z.infer<typeof RestClusterNodeSchema>;

export const RestDelayedSyncRepositorySchema = z.object({
  projectKey: z.string(),
  repositoryId: z.string(),
  repositorySlug: z.string(),
});

export type RestDelayedSyncRepository = z.infer<typeof RestDelayedSyncRepositorySchema>;

export const RestFarmSynchronizationRequestSchema = z.object({
  attempt: z.number().int().optional(),
  createdAt: z.string().optional(),
  externalRepoId: z.string().optional(),
  type: z.enum(['incremental', 'snapshot']).optional(),
});

export type RestFarmSynchronizationRequest = z.infer<typeof RestFarmSynchronizationRequestSchema>;

export const RestMirrorHashesSchema = z.object({
  content: z.string().optional(),
  metadata: z.string().optional(),
});

export type RestMirrorHashes = z.infer<typeof RestMirrorHashesSchema>;

export const RestMirrorRepositorySynchronizationStatusSchema = z.object({
  externalRepoId: z.string().optional(),
  failedSyncCount: z.number().int().optional(),
  hashes: z
    .object({
      content: z.string(),
      metadata: z.string(),
    })
    .optional(),
  initialSyncDate: z.string().datetime().optional(),
  lastSyncDate: z.string().datetime().optional(),
  localProjectId: z.number().int().optional(),
  localRepoId: z.number().int().optional(),
  upstreamId: z.string().optional(),
});

export type RestMirrorRepositorySynchronizationStatus = z.infer<
  typeof RestMirrorRepositorySynchronizationStatusSchema
>;

export const RestMirroredRepositorySchema = z.object({
  available: z.boolean().optional(),
  cloneUrls: z
    .array(
      z.object({
        href: z.string().optional(),
        name: z.string().optional(),
      }),
    )
    .optional(),
  lastUpdated: z.string().datetime().optional(),
  mirrorName: z.string().optional(),
  pushUrls: z
    .array(
      z.object({
        href: z.string().optional(),
        name: z.string().optional(),
      }),
    )
    .optional(),
  repositoryId: z.string().optional(),
  status: z
    .enum(['NOT_MIRRORED', 'INITIALIZING', 'AVAILABLE', 'ERROR_INITIALIZING', 'ERROR_AVAILABLE'])
    .optional(),
});

export type RestMirroredRepository = z.infer<typeof RestMirroredRepositorySchema>;

export const RestNamedLinkSchema = z.object({
  href: z.string().optional(),
  name: z.string().optional(),
});

export type RestNamedLink = z.infer<typeof RestNamedLinkSchema>;

export const RestRefSyncQueueSchema = z.object({
  values: z.array(
    z.object({
      attempt: z.number().int().optional(),
      createdAt: z.string().optional(),
      externalRepoId: z.string().optional(),
      type: z.enum(['incremental', 'snapshot']).optional(),
    }),
  ),
});

export type RestRefSyncQueue = z.infer<typeof RestRefSyncQueueSchema>;

export const RestRepositoryLockOwnerSchema = z.object({
  externalRepositoryId: z.string().optional(),
  lockAcquireTime: z.string().datetime().optional(),
  nodeId: z.string().optional(),
  requestId: z.string().optional(),
  threadName: z.string().optional(),
});

export type RestRepositoryLockOwner = z.infer<typeof RestRepositoryLockOwnerSchema>;

export const RestRollingUpgradeStateSchema = z.object({
  rollingUpgradeEnabled: z.boolean().optional(),
  version: z.string().optional(),
});

export type RestRollingUpgradeState = z.infer<typeof RestRollingUpgradeStateSchema>;

export const RestSyncProgressSchema = z.object({
  discovering: z.boolean().optional(),
  syncedRepos: z.number().int().optional(),
  totalRepos: z.number().int().optional(),
});

export type RestSyncProgress = z.infer<typeof RestSyncProgressSchema>;

export const RestUpstreamServerSchema = z.object({
  baseUrl: z.string().optional(),
  id: z.string().optional(),
  state: z.enum(['INITIALIZING', 'PENDING', 'INSTALLED', 'UNKNOWN', 'REMOVED']).optional(),
});

export type RestUpstreamServer = z.infer<typeof RestUpstreamServerSchema>;

export const RestUpstreamSettingsSchema = z.object({
  mode: z.enum(['ALL_PROJECTS', 'SELECTED_PROJECTS']).optional(),
  projectIds: z
    .array(z.string())
    .refine((value) => value.length === new Set(value.map((item) => JSON.stringify(item))).size, {
      message: 'Array items must be unique',
    })
    .optional(),
});

export type RestUpstreamSettings = z.infer<typeof RestUpstreamSettingsSchema>;

export const CredentialsSchema = z.union([
  z.object({
    password: z.string(),
    username: z.string(),
  }),
  z.object({
    token: z.string(),
  }),
  z.object({
    algorithm: z.string().optional(),
    publicKey: z.string(),
    username: z.string(),
  }),
]);

export type Credentials = z.infer<typeof CredentialsSchema>;

export const EnrichedRepositorySchema = z.object({
  archived: z.boolean().optional(),
  defaultBranch: z.string().optional(),
  description: z.string().optional(),
  forkable: z.boolean().optional(),
  hierarchyId: z.string().optional(),
  id: z.number().int().optional(),
  links: z.object({}).optional(),
  name: z.string().optional(),
  origin: z
    .object({
      archived: z.boolean().optional(),
      defaultBranch: z.string().optional(),
      description: z.string().optional(),
      forkable: z.boolean().optional(),
      hierarchyId: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      name: z.string().optional(),
      partition: z.number().int().optional(),
      project: z
        .object({
          avatar: z.string().optional(),
          avatarUrl: z.string().optional(),
          description: z.string().optional(),
          id: z.number().int().optional(),
          key: z.string(),
          links: z.object({}).optional(),
          name: z.string(),
          public: z.boolean().optional(),
          scope: z.string().optional(),
          type: z.enum(['NORMAL', 'PERSONAL']),
        })
        .optional(),
      public: z.boolean().optional(),
      relatedLinks: z.object({}).optional(),
      scmId: z.string().optional(),
      scope: z.string().optional(),
      slug: z.string().optional(),
      state: z.enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE']).optional(),
      statusMessage: z.string().optional(),
    })
    .optional(),
  partition: z.number().int().optional(),
  project: z
    .object({
      avatar: z.string().optional(),
      avatarUrl: z.string().optional(),
      description: z.string().optional(),
      id: z.number().int().optional(),
      key: z.string(),
      links: z.object({}).optional(),
      name: z.string(),
      public: z.boolean().optional(),
      scope: z.string().optional(),
      type: z.enum(['NORMAL', 'PERSONAL']),
    })
    .optional(),
  properties: z
    .object({
      contentHash: z.string().optional(),
      defaultBranchId: z.string().optional(),
      metadataHash: z.string().optional(),
    })
    .optional(),
  public: z.boolean().optional(),
  relatedLinks: z.object({}).optional(),
  scmId: z.string().optional(),
  scope: z.string().optional(),
  slug: z.string().optional(),
  state: z.enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE']).optional(),
  statusMessage: z.string().optional(),
});

export type EnrichedRepository = z.infer<typeof EnrichedRepositorySchema>;

export const RestAnalyticsSettingsSchema = z.object({
  canCollectAnalytics: z.boolean().optional(),
  serverTime: z.number().int().optional(),
  supportEntitlementNumber: z.string().optional(),
});

export type RestAnalyticsSettings = z.infer<typeof RestAnalyticsSettingsSchema>;

export const RestApplicationUserWithPermissionsSchema = z.object({
  active: z.boolean().optional(),
  avatarUrl: z.string().optional(),
  displayName: z.string().optional(),
  effectivePermissions: z.object({}).optional(),
  emailAddress: z.string().optional(),
  id: z.number().int().optional(),
  links: z.object({}).optional(),
  name: z.string().optional(),
  slug: z.string().optional(),
  type: z.enum(['NORMAL', 'SERVICE']).optional(),
});

export type RestApplicationUserWithPermissions = z.infer<
  typeof RestApplicationUserWithPermissionsSchema
>;

export const RestUsernamePasswordCredentialsSchema = z.object({
  password: z.string(),
  username: z.string(),
});

export type RestUsernamePasswordCredentials = z.infer<typeof RestUsernamePasswordCredentialsSchema>;

export const RestBearerTokenCredentialsSchema = z.object({
  token: z.string(),
});

export type RestBearerTokenCredentials = z.infer<typeof RestBearerTokenCredentialsSchema>;

export const RestSshCredentialsSchema = z.object({
  algorithm: z.string().optional(),
  publicKey: z.string(),
  username: z.string(),
});

export type RestSshCredentials = z.infer<typeof RestSshCredentialsSchema>;

export const RestAuthenticationRequestSchema = z.object({
  credentials: z.union([
    RestUsernamePasswordCredentialsSchema,
    RestBearerTokenCredentialsSchema,
    RestSshCredentialsSchema,
  ]),
  repositoryId: z.number().int().optional(),
});

export type RestAuthenticationRequest = z.infer<typeof RestAuthenticationRequestSchema>;

export const RestMirrorServerSchema = z.object({
  baseUrl: z.string().optional(),
  enabled: z.boolean().optional(),
  id: z.string().optional(),
  lastSeenDate: z.string().datetime().optional(),
  mirrorType: z.enum(['SINGLE', 'FARM']).optional(),
  name: z.string().optional(),
  productVersion: z.string().optional(),
});

export type RestMirrorServer = z.infer<typeof RestMirrorServerSchema>;

export const RestMirrorUpgradeRequestSchema = z.object({
  baseUrl: z.string().optional(),
  productVersion: z.string().optional(),
});

export type RestMirrorUpgradeRequest = z.infer<typeof RestMirrorUpgradeRequestSchema>;

export const RestMirroredRepositoryDescriptorSchema = z.object({
  links: z.object({}).optional(),
  mirrorServer: z
    .object({
      baseUrl: z.string(),
      enabled: z.boolean().optional(),
      id: z.string(),
      lastSeenDate: z.string().datetime(),
      mirrorType: z.enum(['SINGLE', 'FARM']),
      name: z.string(),
      productVersion: z.string(),
    })
    .optional(),
});

export type RestMirroredRepositoryDescriptor = z.infer<
  typeof RestMirroredRepositoryDescriptorSchema
>;

export const RestMirroringRequestSchema = z.object({
  id: z.number().int().optional(),
  mirrorBaseUrl: z.string().optional(),
  mirrorId: z.string().optional(),
  mirrorName: z.string().optional(),
  mirrorType: z.enum(['SINGLE', 'FARM']).optional(),
  productVersion: z.string().optional(),
  state: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']).optional(),
});

export type RestMirroringRequest = z.infer<typeof RestMirroringRequestSchema>;

export const RestPropertiesSchema = z.object({
  contentHash: z.string().optional(),
  defaultBranchId: z.string().optional(),
  metadataHash: z.string().optional(),
});

export type RestProperties = z.infer<typeof RestPropertiesSchema>;

export const RestRepositoryMirrorEventSchema = z.object({
  mirrorRepoId: z.number().int().optional(),
  type: z.enum(['SYNCHRONIZED', 'SYNCHRONIZATION_FAILED']),
  upstreamRepoId: z.string(),
});

export type RestRepositoryMirrorEvent = z.infer<typeof RestRepositoryMirrorEventSchema>;

export const RestRefRestrictionSchema = z.object({
  accessKeys: z
    .array(
      z.object({
        key: z
          .object({
            algorithmType: z.string().optional(),
            bitLength: z.number().int().optional(),
            createdDate: z.string().datetime().optional(),
            expiryDays: z.number().int().optional(),
            fingerprint: z.string().optional(),
            id: z.number().int().optional(),
            label: z.string().optional(),
            lastAuthenticated: z.string().optional(),
            text: z.string().optional(),
            warning: z.string().optional(),
          })
          .optional(),
        permission: z
          .enum([
            'USER_ADMIN',
            'PROJECT_VIEW',
            'REPO_READ',
            'REPO_WRITE',
            'REPO_ADMIN',
            'PROJECT_READ',
            'PROJECT_WRITE',
            'REPO_CREATE',
            'PROJECT_ADMIN',
            'LICENSED_USER',
            'PROJECT_CREATE',
            'ADMIN',
            'SYS_ADMIN',
          ])
          .optional(),
        project: z
          .object({
            avatar: z.string().optional(),
            avatarUrl: z.string().optional(),
            description: z.string().optional(),
            id: z.number().int().optional(),
            key: z.string(),
            links: z.object({}).optional(),
            name: z.string(),
            public: z.boolean().optional(),
            scope: z.string().optional(),
            type: z.enum(['NORMAL', 'PERSONAL']),
          })
          .optional(),
        repository: z
          .object({
            archived: z.boolean().optional(),
            defaultBranch: z.string().optional(),
            description: z.string().optional(),
            forkable: z.boolean().optional(),
            hierarchyId: z.string().optional(),
            id: z.number().int().optional(),
            links: z.object({}).optional(),
            name: z.string().optional(),
            origin: z
              .object({
                archived: z.boolean().optional(),
                defaultBranch: z.string().optional(),
                description: z.string().optional(),
                forkable: z.boolean().optional(),
                hierarchyId: z.string().optional(),
                id: z.number().int().optional(),
                links: z.object({}).optional(),
                name: z.string().optional(),
                partition: z.number().int().optional(),
                project: z
                  .object({
                    avatar: z.string().optional(),
                    avatarUrl: z.string().optional(),
                    description: z.string().optional(),
                    id: z.number().int().optional(),
                    key: z.string(),
                    links: z.object({}).optional(),
                    name: z.string(),
                    public: z.boolean().optional(),
                    scope: z.string().optional(),
                    type: z.enum(['NORMAL', 'PERSONAL']),
                  })
                  .optional(),
                public: z.boolean().optional(),
                relatedLinks: z.object({}).optional(),
                scmId: z.string().optional(),
                scope: z.string().optional(),
                slug: z.string().optional(),
                state: z
                  .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                  .optional(),
                statusMessage: z.string().optional(),
              })
              .optional(),
            partition: z.number().int().optional(),
            project: z
              .object({
                avatar: z.string().optional(),
                avatarUrl: z.string().optional(),
                description: z.string().optional(),
                id: z.number().int().optional(),
                key: z.string(),
                links: z.object({}).optional(),
                name: z.string(),
                public: z.boolean().optional(),
                scope: z.string().optional(),
                type: z.enum(['NORMAL', 'PERSONAL']),
              })
              .optional(),
            public: z.boolean().optional(),
            relatedLinks: z.object({}).optional(),
            scmId: z.string().optional(),
            scope: z.string().optional(),
            slug: z.string().optional(),
            state: z
              .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
              .optional(),
            statusMessage: z.string().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
  groups: z.array(z.string()).optional(),
  id: z.number().int().optional(),
  matcher: z
    .object({
      displayId: z.string().optional(),
      id: z.string().optional(),
      type: z
        .object({
          id: z.enum(['ANY_REF', 'BRANCH', 'PATTERN', 'MODEL_CATEGORY', 'MODEL_BRANCH']),
          name: z.string(),
        })
        .optional(),
    })
    .optional(),
  scope: z
    .object({
      resourceId: z.number().int(),
      type: z.enum(['GLOBAL', 'PROJECT', 'REPOSITORY']),
    })
    .optional(),
  type: z.string().optional(),
  users: z
    .array(
      z.object({
        active: z.boolean().optional(),
        avatarUrl: z.string().optional(),
        displayName: z.string().optional(),
        emailAddress: z.string().optional(),
        id: z.number().int().optional(),
        links: z.object({}).optional(),
        name: z.string().optional(),
        slug: z.string().optional(),
        type: z.enum(['NORMAL', 'SERVICE']).optional(),
      }),
    )
    .optional(),
});

export type RestRefRestriction = z.infer<typeof RestRefRestrictionSchema>;

export const RestRestrictionRequestSchema = z.object({
  accessKeyIds: z.array(z.number().int()),
  accessKeys: z
    .array(
      z.object({
        key: z
          .object({
            algorithmType: z.string().optional(),
            bitLength: z.number().int().optional(),
            createdDate: z.string().datetime().optional(),
            expiryDays: z.number().int().optional(),
            fingerprint: z.string().optional(),
            id: z.number().int().optional(),
            label: z.string().optional(),
            lastAuthenticated: z.string().optional(),
            text: z.string().optional(),
            warning: z.string().optional(),
          })
          .optional(),
        permission: z
          .enum([
            'USER_ADMIN',
            'PROJECT_VIEW',
            'REPO_READ',
            'REPO_WRITE',
            'REPO_ADMIN',
            'PROJECT_READ',
            'PROJECT_WRITE',
            'REPO_CREATE',
            'PROJECT_ADMIN',
            'LICENSED_USER',
            'PROJECT_CREATE',
            'ADMIN',
            'SYS_ADMIN',
          ])
          .optional(),
        project: z
          .object({
            avatar: z.string().optional(),
            avatarUrl: z.string().optional(),
            description: z.string().optional(),
            id: z.number().int().optional(),
            key: z.string(),
            links: z.object({}).optional(),
            name: z.string(),
            public: z.boolean().optional(),
            scope: z.string().optional(),
            type: z.enum(['NORMAL', 'PERSONAL']),
          })
          .optional(),
        repository: z
          .object({
            archived: z.boolean().optional(),
            defaultBranch: z.string().optional(),
            description: z.string().optional(),
            forkable: z.boolean().optional(),
            hierarchyId: z.string().optional(),
            id: z.number().int().optional(),
            links: z.object({}).optional(),
            name: z.string().optional(),
            origin: z
              .object({
                archived: z.boolean().optional(),
                defaultBranch: z.string().optional(),
                description: z.string().optional(),
                forkable: z.boolean().optional(),
                hierarchyId: z.string().optional(),
                id: z.number().int().optional(),
                links: z.object({}).optional(),
                name: z.string().optional(),
                partition: z.number().int().optional(),
                project: z
                  .object({
                    avatar: z.string().optional(),
                    avatarUrl: z.string().optional(),
                    description: z.string().optional(),
                    id: z.number().int().optional(),
                    key: z.string(),
                    links: z.object({}).optional(),
                    name: z.string(),
                    public: z.boolean().optional(),
                    scope: z.string().optional(),
                    type: z.enum(['NORMAL', 'PERSONAL']),
                  })
                  .optional(),
                public: z.boolean().optional(),
                relatedLinks: z.object({}).optional(),
                scmId: z.string().optional(),
                scope: z.string().optional(),
                slug: z.string().optional(),
                state: z
                  .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                  .optional(),
                statusMessage: z.string().optional(),
              })
              .optional(),
            partition: z.number().int().optional(),
            project: z
              .object({
                avatar: z.string().optional(),
                avatarUrl: z.string().optional(),
                description: z.string().optional(),
                id: z.number().int().optional(),
                key: z.string(),
                links: z.object({}).optional(),
                name: z.string(),
                public: z.boolean().optional(),
                scope: z.string().optional(),
                type: z.enum(['NORMAL', 'PERSONAL']),
              })
              .optional(),
            public: z.boolean().optional(),
            relatedLinks: z.object({}).optional(),
            scmId: z.string().optional(),
            scope: z.string().optional(),
            slug: z.string().optional(),
            state: z
              .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
              .optional(),
            statusMessage: z.string().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
  groupNames: z.array(z.string()),
  groups: z.array(z.string()).optional(),
  id: z.number().int().optional(),
  matcher: z
    .object({
      displayId: z.string().optional(),
      id: z.string().optional(),
      type: z
        .object({
          id: z.enum(['ANY_REF', 'BRANCH', 'PATTERN', 'MODEL_CATEGORY', 'MODEL_BRANCH']),
          name: z.string(),
        })
        .optional(),
    })
    .optional(),
  scope: z
    .object({
      resourceId: z.number().int(),
      type: z.enum(['GLOBAL', 'PROJECT', 'REPOSITORY']),
    })
    .optional(),
  type: z.string().optional(),
  userSlugs: z.array(z.string()),
  users: z
    .array(
      z.object({
        active: z.boolean().optional(),
        avatarUrl: z.string().optional(),
        displayName: z.string().optional(),
        emailAddress: z.string().optional(),
        id: z.number().int().optional(),
        links: z.object({}).optional(),
        name: z.string().optional(),
        slug: z.string().optional(),
        type: z.enum(['NORMAL', 'SERVICE']).optional(),
      }),
    )
    .optional(),
});

export type RestRestrictionRequest = z.infer<typeof RestRestrictionRequestSchema>;

export const RestSshAccessKeySchema = z.object({
  key: z
    .object({
      algorithmType: z.string().optional(),
      bitLength: z.number().int().optional(),
      createdDate: z.string().datetime().optional(),
      expiryDays: z.number().int().optional(),
      fingerprint: z.string().optional(),
      id: z.number().int().optional(),
      label: z.string().optional(),
      lastAuthenticated: z.string().optional(),
      text: z.string().optional(),
      warning: z.string().optional(),
    })
    .optional(),
  permission: z
    .enum([
      'USER_ADMIN',
      'PROJECT_VIEW',
      'REPO_READ',
      'REPO_WRITE',
      'REPO_ADMIN',
      'PROJECT_READ',
      'PROJECT_WRITE',
      'REPO_CREATE',
      'PROJECT_ADMIN',
      'LICENSED_USER',
      'PROJECT_CREATE',
      'ADMIN',
      'SYS_ADMIN',
    ])
    .optional(),
  project: z
    .object({
      avatar: z.string().optional(),
      avatarUrl: z.string().optional(),
      description: z.string().optional(),
      id: z.number().int().optional(),
      key: z.string(),
      links: z.object({}).optional(),
      name: z.string(),
      public: z.boolean().optional(),
      scope: z.string().optional(),
      type: z.enum(['NORMAL', 'PERSONAL']),
    })
    .optional(),
  repository: z
    .object({
      archived: z.boolean().optional(),
      defaultBranch: z.string().optional(),
      description: z.string().optional(),
      forkable: z.boolean().optional(),
      hierarchyId: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      name: z.string().optional(),
      origin: z
        .object({
          archived: z.boolean().optional(),
          defaultBranch: z.string().optional(),
          description: z.string().optional(),
          forkable: z.boolean().optional(),
          hierarchyId: z.string().optional(),
          id: z.number().int().optional(),
          links: z.object({}).optional(),
          name: z.string().optional(),
          partition: z.number().int().optional(),
          project: z
            .object({
              avatar: z.string().optional(),
              avatarUrl: z.string().optional(),
              description: z.string().optional(),
              id: z.number().int().optional(),
              key: z.string(),
              links: z.object({}).optional(),
              name: z.string(),
              public: z.boolean().optional(),
              scope: z.string().optional(),
              type: z.enum(['NORMAL', 'PERSONAL']),
            })
            .optional(),
          public: z.boolean().optional(),
          relatedLinks: z.object({}).optional(),
          scmId: z.string().optional(),
          scope: z.string().optional(),
          slug: z.string().optional(),
          state: z
            .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
            .optional(),
          statusMessage: z.string().optional(),
        })
        .optional(),
      partition: z.number().int().optional(),
      project: z
        .object({
          avatar: z.string().optional(),
          avatarUrl: z.string().optional(),
          description: z.string().optional(),
          id: z.number().int().optional(),
          key: z.string(),
          links: z.object({}).optional(),
          name: z.string(),
          public: z.boolean().optional(),
          scope: z.string().optional(),
          type: z.enum(['NORMAL', 'PERSONAL']),
        })
        .optional(),
      public: z.boolean().optional(),
      relatedLinks: z.object({}).optional(),
      scmId: z.string().optional(),
      scope: z.string().optional(),
      slug: z.string().optional(),
      state: z.enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE']).optional(),
      statusMessage: z.string().optional(),
    })
    .optional(),
});

export type RestSshAccessKey = z.infer<typeof RestSshAccessKeySchema>;

export const RestSshKeySchema = z.object({
  algorithmType: z.string().optional(),
  bitLength: z.number().int().optional(),
  createdDate: z.string().datetime().optional(),
  expiryDays: z.number().int().optional(),
  fingerprint: z.string().optional(),
  id: z.number().int().optional(),
  label: z.string().optional(),
  lastAuthenticated: z.string().optional(),
  text: z.string().optional(),
  warning: z.string().optional(),
});

export type RestSshKey = z.infer<typeof RestSshKeySchema>;

export const ContextSchema = z.object({
  commitMessage: z.string().optional(),
});

export type Context = z.infer<typeof ContextSchema>;

export const RestRefSyncRequestSchema = z.object({
  action: z.enum(['DISCARD', 'MERGE', 'REBASE']).optional(),
  context: z
    .object({
      commitMessage: z.string().optional(),
    })
    .optional(),
  refId: z.string().optional(),
});

export type RestRefSyncRequest = z.infer<typeof RestRefSyncRequestSchema>;

export const RestRefSyncStatusSchema = z.object({
  aheadRefs: z
    .object({
      displayId: z.string(),
      id: z.string(),
      state: z.enum(['AHEAD', 'DIVERGED', 'ORPHANED']).optional(),
      tag: z.boolean().optional(),
      type: z.enum(['BRANCH', 'TAG']),
    })
    .optional(),
  available: z.boolean().optional(),
  divergedRefs: z
    .object({
      displayId: z.string(),
      id: z.string(),
      state: z.enum(['AHEAD', 'DIVERGED', 'ORPHANED']).optional(),
      tag: z.boolean().optional(),
      type: z.enum(['BRANCH', 'TAG']),
    })
    .optional(),
  enabled: z.boolean().optional(),
  lastSync: z.number().optional(),
  orphanedRefs: z
    .object({
      displayId: z.string(),
      id: z.string(),
      state: z.enum(['AHEAD', 'DIVERGED', 'ORPHANED']).optional(),
      tag: z.boolean().optional(),
      type: z.enum(['BRANCH', 'TAG']),
    })
    .optional(),
});

export type RestRefSyncStatus = z.infer<typeof RestRefSyncStatusSchema>;

export const RestRejectedRefSchema = z.object({
  displayId: z.string().optional(),
  id: z.string().optional(),
  state: z.enum(['AHEAD', 'DIVERGED', 'ORPHANED']).optional(),
  tag: z.boolean().optional(),
  type: z.enum(['BRANCH', 'TAG']).optional(),
});

export type RestRejectedRef = z.infer<typeof RestRejectedRefSchema>;

export const RestRepositoryPolicySchema = z.object({
  permission: z.enum(['SYS_ADMIN', 'ADMIN', 'PROJECT_ADMIN', 'REPO_ADMIN']).optional(),
});

export type RestRepositoryPolicy = z.infer<typeof RestRepositoryPolicySchema>;

export const RestBrokenIndexStatusRepositorySchema = z.object({
  details: z
    .object({
      indexingError: z.string().optional(),
      lastIndexedCommitId: z.string().optional(),
      lastIndexedTimestamp: z.number().int().optional(),
      projectKey: z.string(),
      repositorySlug: z.string(),
      status: z.enum(['BROKEN', 'INDEXED', 'INDEXING', 'UNKNOWN']),
    })
    .optional(),
  repository: z
    .object({
      archived: z.boolean().optional(),
      defaultBranch: z.string().optional(),
      description: z.string().optional(),
      forkable: z.boolean().optional(),
      hierarchyId: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      name: z.string().optional(),
      origin: z
        .object({
          archived: z.boolean().optional(),
          defaultBranch: z.string().optional(),
          description: z.string().optional(),
          forkable: z.boolean().optional(),
          hierarchyId: z.string().optional(),
          id: z.number().int().optional(),
          links: z.object({}).optional(),
          name: z.string().optional(),
          partition: z.number().int().optional(),
          project: z
            .object({
              avatar: z.string().optional(),
              avatarUrl: z.string().optional(),
              description: z.string().optional(),
              id: z.number().int().optional(),
              key: z.string(),
              links: z.object({}).optional(),
              name: z.string(),
              public: z.boolean().optional(),
              scope: z.string().optional(),
              type: z.enum(['NORMAL', 'PERSONAL']),
            })
            .optional(),
          public: z.boolean().optional(),
          relatedLinks: z.object({}).optional(),
          scmId: z.string().optional(),
          scope: z.string().optional(),
          slug: z.string().optional(),
          state: z
            .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
            .optional(),
          statusMessage: z.string().optional(),
        })
        .optional(),
      partition: z.number().int().optional(),
      project: z
        .object({
          avatar: z.string().optional(),
          avatarUrl: z.string().optional(),
          description: z.string().optional(),
          id: z.number().int().optional(),
          key: z.string(),
          links: z.object({}).optional(),
          name: z.string(),
          public: z.boolean().optional(),
          scope: z.string().optional(),
          type: z.enum(['NORMAL', 'PERSONAL']),
        })
        .optional(),
      public: z.boolean().optional(),
      relatedLinks: z.object({}).optional(),
      scmId: z.string().optional(),
      scope: z.string().optional(),
      slug: z.string().optional(),
      state: z.enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE']).optional(),
      statusMessage: z.string().optional(),
    })
    .optional(),
});

export type RestBrokenIndexStatusRepository = z.infer<typeof RestBrokenIndexStatusRepositorySchema>;

export const RestIndexEventSchema = z.object({
  eventMetadata: z.object({}).optional(),
  eventType: z.enum(['PROJECT', 'REPOSITORY', 'USER', 'OTHER']),
  retries: z.number().int(),
});

export type RestIndexEvent = z.infer<typeof RestIndexEventSchema>;

export const RestIndexEventMetadataSchema = z.object({});

export type RestIndexEventMetadata = z.infer<typeof RestIndexEventMetadataSchema>;

export const RestIndexingIsRepositoryQueuedSchema = z.object({
  queued: z.boolean().optional(),
});

export type RestIndexingIsRepositoryQueued = z.infer<typeof RestIndexingIsRepositoryQueuedSchema>;

export const RestIndexingProcessSchema = z.object({
  currentTask: z.string(),
  event: z.object({
    eventMetadata: z.object({}).optional(),
    eventType: z.enum(['PROJECT', 'REPOSITORY', 'USER', 'OTHER']),
    retries: z.number().int(),
  }),
});

export type RestIndexingProcess = z.infer<typeof RestIndexingProcessSchema>;

export const RestIndexingThreadDetailsSchema = z.object({
  capturedAt: z.number().int(),
  currentProcess: z
    .object({
      currentTask: z.string(),
      event: z.object({
        eventMetadata: z.object({}).optional(),
        eventType: z.enum(['PROJECT', 'REPOSITORY', 'USER', 'OTHER']),
        retries: z.number().int(),
      }),
    })
    .optional(),
  delayedQueueSize: z.number().int(),
  queueSize: z.number().int(),
  state: z.object({
    code: z.enum(['BROKEN', 'IDLE', 'PROCESSING', 'STOPPED', 'UNKNOWN']),
    description: z.string().optional(),
  }),
});

export type RestIndexingThreadDetails = z.infer<typeof RestIndexingThreadDetailsSchema>;

export const RestIndexingThreadStateSchema = z.object({
  code: z.enum(['BROKEN', 'IDLE', 'PROCESSING', 'STOPPED', 'UNKNOWN']),
  description: z.string().optional(),
});

export type RestIndexingThreadState = z.infer<typeof RestIndexingThreadStateSchema>;

export const RestIndexingWorkerRestartRequestSchema = z.object({
  gracefulShutdown: z.boolean().default(false).optional(),
  waitForRestart: z.boolean().default(false).optional(),
});

export type RestIndexingWorkerRestartRequest = z.infer<
  typeof RestIndexingWorkerRestartRequestSchema
>;

export const RestRepositoryIndexingDetailsSchema = z.object({
  indexingError: z.string().optional(),
  lastIndexedCommitId: z.string().optional(),
  lastIndexedTimestamp: z.number().int().optional(),
  projectKey: z.string().optional(),
  repositorySlug: z.string().optional(),
  status: z.enum(['BROKEN', 'INDEXED', 'INDEXING', 'UNKNOWN']).optional(),
});

export type RestRepositoryIndexingDetails = z.infer<typeof RestRepositoryIndexingDetailsSchema>;

export const RestRepositoryIndexingQueueDetailsSchema = z.object({
  capturedAt: z.number().int().optional(),
  nodeId: z.string().optional(),
  queued: z.boolean().optional(),
  queuedAt: z.number().int().optional(),
});

export type RestRepositoryIndexingQueueDetails = z.infer<
  typeof RestRepositoryIndexingQueueDetailsSchema
>;

export const RestRepositorySelectorSchema = z.object({
  projectKey: z.string(),
  slug: z.string(),
});

export type RestRepositorySelector = z.infer<typeof RestRepositorySelectorSchema>;

export const RestSshAccessKeyLocationsSchema = z.object({
  projects: z
    .object({
      avatar: z.string().optional(),
      avatarUrl: z.string().optional(),
      description: z.string().optional(),
      id: z.number().int().optional(),
      key: z.string().optional(),
      links: z.object({}).optional(),
      name: z.string().optional(),
      public: z.boolean().optional(),
      scope: z.string().optional(),
      type: z.enum(['NORMAL', 'PERSONAL']).optional(),
    })
    .optional(),
  repositories: z
    .object({
      archived: z.boolean().optional(),
      defaultBranch: z.string().optional(),
      description: z.string().optional(),
      forkable: z.boolean().optional(),
      hierarchyId: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      name: z.string().optional(),
      origin: z
        .object({
          archived: z.boolean().optional(),
          defaultBranch: z.string().optional(),
          description: z.string().optional(),
          forkable: z.boolean().optional(),
          hierarchyId: z.string().optional(),
          id: z.number().int().optional(),
          links: z.object({}).optional(),
          name: z.string().optional(),
          partition: z.number().int().optional(),
          project: z
            .object({
              avatar: z.string().optional(),
              avatarUrl: z.string().optional(),
              description: z.string().optional(),
              id: z.number().int().optional(),
              key: z.string(),
              links: z.object({}).optional(),
              name: z.string(),
              public: z.boolean().optional(),
              scope: z.string().optional(),
              type: z.enum(['NORMAL', 'PERSONAL']),
            })
            .optional(),
          public: z.boolean().optional(),
          relatedLinks: z.object({}).optional(),
          scmId: z.string().optional(),
          scope: z.string().optional(),
          slug: z.string().optional(),
          state: z
            .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
            .optional(),
          statusMessage: z.string().optional(),
        })
        .optional(),
      partition: z.number().int().optional(),
      project: z
        .object({
          avatar: z.string().optional(),
          avatarUrl: z.string().optional(),
          description: z.string().optional(),
          id: z.number().int().optional(),
          key: z.string(),
          links: z.object({}).optional(),
          name: z.string(),
          public: z.boolean().optional(),
          scope: z.string().optional(),
          type: z.enum(['NORMAL', 'PERSONAL']),
        })
        .optional(),
      public: z.boolean().optional(),
      relatedLinks: z.object({}).optional(),
      scmId: z.string().optional(),
      scope: z.string().optional(),
      slug: z.string().optional(),
      state: z.enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE']).optional(),
      statusMessage: z.string().optional(),
    })
    .optional(),
});

export type RestSshAccessKeyLocations = z.infer<typeof RestSshAccessKeyLocationsSchema>;

export const RestSshKeySettingsSchema = z.object({
  keyTypeRestrictions: z
    .array(
      z.object({
        algorithm: z.string().optional(),
        allowed: z.boolean().optional(),
        minKeyLength: z.number().int().optional(),
      }),
    )
    .optional(),
  maxExpiryDays: z.number().int().optional(),
});

export type RestSshKeySettings = z.infer<typeof RestSshKeySettingsSchema>;

export const RestSshKeyTypeRestrictionSchema = z.object({
  algorithm: z.string().optional(),
  allowed: z.boolean().optional(),
  minKeyLength: z.number().int().optional(),
});

export type RestSshKeyTypeRestriction = z.infer<typeof RestSshKeyTypeRestrictionSchema>;

export const RestSshSettingsSchema = z.object({
  accessKeysEnabled: z.boolean().optional(),
  baseUrl: z.string().optional(),
  enabled: z.boolean().optional(),
  fingerprint: z
    .object({
      algorithm: z.string().optional(),
      value: z.string().optional(),
    })
    .optional(),
  port: z.number().int().optional(),
});

export type RestSshSettings = z.infer<typeof RestSshSettingsSchema>;

export const SimpleSshKeyFingerprintSchema = z.object({
  algorithm: z.string().optional(),
  value: z.string().optional(),
});

export type SimpleSshKeyFingerprint = z.infer<typeof SimpleSshKeyFingerprintSchema>;

export const AdminPasswordUpdateSchema = z.object({
  name: z.string().optional(),
  password: z.string().optional(),
  passwordConfirm: z.string().optional(),
});

export type AdminPasswordUpdate = z.infer<typeof AdminPasswordUpdateSchema>;

export const DiffContentFilterSchema = z.object({});

export type DiffContentFilter = z.infer<typeof DiffContentFilterSchema>;

export const ExampleAvatarMultipartFormDataSchema = z.object({
  avatar: z.string().optional(),
});

export type ExampleAvatarMultipartFormData = z.infer<typeof ExampleAvatarMultipartFormDataSchema>;

export const ExampleCertificateMultipartFormDataSchema = z.object({
  certificate: z.string().optional(),
});

export type ExampleCertificateMultipartFormData = z.infer<
  typeof ExampleCertificateMultipartFormDataSchema
>;

export const ExampleFilesSchema = z.object({
  files: z
    .object({
      latestCommit: z
        .object({
          author: z
            .object({
              avatarUrl: z.string().optional(),
              emailAddress: z.string().optional(),
              name: z.string(),
            })
            .optional(),
          authorTimestamp: z.number().int().optional(),
          committer: z
            .object({
              avatarUrl: z.string().optional(),
              emailAddress: z.string().optional(),
              name: z.string(),
            })
            .optional(),
          committerTimestamp: z.number().int().optional(),
          displayId: z.string().optional(),
          id: z.string().optional(),
          message: z.string().optional(),
          parents: z.array(RestMinimalCommitSchema).optional(),
        })
        .optional(),
      pomXml: z
        .object({
          author: z
            .object({
              avatarUrl: z.string().optional(),
              emailAddress: z.string().optional(),
              name: z.string(),
            })
            .optional(),
          authorTimestamp: z.number().int().optional(),
          committer: z
            .object({
              avatarUrl: z.string().optional(),
              emailAddress: z.string().optional(),
              name: z.string(),
            })
            .optional(),
          committerTimestamp: z.number().int().optional(),
          displayId: z.string().optional(),
          id: z.string().optional(),
          message: z.string().optional(),
          parents: z.array(RestMinimalCommitSchema).optional(),
        })
        .optional(),
      readmeMd: z
        .object({
          author: z
            .object({
              avatarUrl: z.string().optional(),
              emailAddress: z.string().optional(),
              name: z.string(),
            })
            .optional(),
          authorTimestamp: z.number().int().optional(),
          committer: z
            .object({
              avatarUrl: z.string().optional(),
              emailAddress: z.string().optional(),
              name: z.string(),
            })
            .optional(),
          committerTimestamp: z.number().int().optional(),
          displayId: z.string().optional(),
          id: z.string().optional(),
          message: z.string().optional(),
          parents: z.array(RestMinimalCommitSchema).optional(),
        })
        .optional(),
    })
    .optional(),
});

export type ExampleFiles = z.infer<typeof ExampleFilesSchema>;

export const ExampleJsonLastModifiedCallbackSchema = z.object({
  latestCommit: z
    .object({
      author: z
        .object({
          avatarUrl: z.string().optional(),
          emailAddress: z.string().optional(),
          name: z.string(),
        })
        .optional(),
      authorTimestamp: z.number().int().optional(),
      committer: z
        .object({
          avatarUrl: z.string().optional(),
          emailAddress: z.string().optional(),
          name: z.string(),
        })
        .optional(),
      committerTimestamp: z.number().int().optional(),
      displayId: z.string().optional(),
      id: z.string().optional(),
      message: z.string().optional(),
      parents: z
        .array(
          z.object({
            displayId: z.string().optional(),
            id: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  pomXml: z
    .object({
      author: z
        .object({
          avatarUrl: z.string().optional(),
          emailAddress: z.string().optional(),
          name: z.string(),
        })
        .optional(),
      authorTimestamp: z.number().int().optional(),
      committer: z
        .object({
          avatarUrl: z.string().optional(),
          emailAddress: z.string().optional(),
          name: z.string(),
        })
        .optional(),
      committerTimestamp: z.number().int().optional(),
      displayId: z.string().optional(),
      id: z.string().optional(),
      message: z.string().optional(),
      parents: z
        .array(
          z.object({
            displayId: z.string().optional(),
            id: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  readmeMd: z
    .object({
      author: z
        .object({
          avatarUrl: z.string().optional(),
          emailAddress: z.string().optional(),
          name: z.string(),
        })
        .optional(),
      authorTimestamp: z.number().int().optional(),
      committer: z
        .object({
          avatarUrl: z.string().optional(),
          emailAddress: z.string().optional(),
          name: z.string(),
        })
        .optional(),
      committerTimestamp: z.number().int().optional(),
      displayId: z.string().optional(),
      id: z.string().optional(),
      message: z.string().optional(),
      parents: z
        .array(
          z.object({
            displayId: z.string().optional(),
            id: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});

export type ExampleJsonLastModifiedCallback = z.infer<typeof ExampleJsonLastModifiedCallbackSchema>;

export const ExampleMultipartFormDataSchema = z.object({
  branch: z.string().optional(),
  content: z.string().optional(),
  message: z.string().optional(),
  sourceBranch: z.string().optional(),
  sourceCommitId: z.string().optional(),
});

export type ExampleMultipartFormData = z.infer<typeof ExampleMultipartFormDataSchema>;

export const ExamplePostMultipartFormDataSchema = z.object({
  content: z.string().optional(),
  description: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
});

export type ExamplePostMultipartFormData = z.infer<typeof ExamplePostMultipartFormDataSchema>;

export const ExamplePreviewMigrationSchema = z.object({
  repositories: z
    .array(
      z.object({
        archived: z.boolean().optional(),
        defaultBranch: z.string().optional(),
        description: z.string().optional(),
        forkable: z.boolean().optional(),
        hierarchyId: z.string().optional(),
        id: z.number().int().optional(),
        links: z.object({}).optional(),
        name: z.string().optional(),
        origin: z
          .object({
            archived: z.boolean().optional(),
            defaultBranch: z.string().optional(),
            description: z.string().optional(),
            forkable: z.boolean().optional(),
            hierarchyId: z.string().optional(),
            id: z.number().int().optional(),
            links: z.object({}).optional(),
            name: z.string().optional(),
            partition: z.number().int().optional(),
            project: z
              .object({
                avatar: z.string().optional(),
                avatarUrl: z.string().optional(),
                description: z.string().optional(),
                id: z.number().int().optional(),
                key: z.string(),
                links: z.object({}).optional(),
                name: z.string(),
                public: z.boolean().optional(),
                scope: z.string().optional(),
                type: z.enum(['NORMAL', 'PERSONAL']),
              })
              .optional(),
            public: z.boolean().optional(),
            relatedLinks: z.object({}).optional(),
            scmId: z.string().optional(),
            scope: z.string().optional(),
            slug: z.string().optional(),
            state: z
              .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
              .optional(),
            statusMessage: z.string().optional(),
          })
          .optional(),
        partition: z.number().int().optional(),
        project: z
          .object({
            avatar: z.string().optional(),
            avatarUrl: z.string().optional(),
            description: z.string().optional(),
            id: z.number().int().optional(),
            key: z.string(),
            links: z.object({}).optional(),
            name: z.string(),
            public: z.boolean().optional(),
            scope: z.string().optional(),
            type: z.enum(['NORMAL', 'PERSONAL']),
          })
          .optional(),
        public: z.boolean().optional(),
        relatedLinks: z.object({}).optional(),
        scmId: z.string().optional(),
        scope: z.string().optional(),
        slug: z.string().optional(),
        state: z.enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE']).optional(),
        statusMessage: z.string().optional(),
      }),
    )
    .optional(),
});

export type ExamplePreviewMigration = z.infer<typeof ExamplePreviewMigrationSchema>;

export const ExamplePutMultipartFormDataSchema = z.object({
  content: z.string().optional(),
  description: z.string().optional(),
  name: z.string().optional(),
});

export type ExamplePutMultipartFormData = z.infer<typeof ExamplePutMultipartFormDataSchema>;

export const ExampleRequirementsSchema = z.object({
  count: z.string().optional(),
  enabled: z.boolean().optional(),
});

export type ExampleRequirements = z.infer<typeof ExampleRequirementsSchema>;

export const ExampleSettingsSchema = z.object({
  booleanValue: z.boolean().optional(),
  doubleValue: z.number().optional(),
  integerValue: z.number().int().optional(),
  longValue: z.number().int().optional(),
  stringValue: z.string().optional(),
});

export type ExampleSettings = z.infer<typeof ExampleSettingsSchema>;

export const ExampleSettingsMapSchema = z.object({
  'boolean key': z.boolean().optional(),
  'long key': z.number().optional(),
  'string key': z.string().optional(),
});

export type ExampleSettingsMap = z.infer<typeof ExampleSettingsMapSchema>;

export const ExampleSocketAddressSchema = z.object({
  address: z.string().optional(),
  port: z.number().int().optional(),
});

export type ExampleSocketAddress = z.infer<typeof ExampleSocketAddressSchema>;

export const ExampleStatusSchema = z.object({
  currentNumberOfUsers: z.number().int().optional(),
  serverId: z.string().optional(),
});

export type ExampleStatus = z.infer<typeof ExampleStatusSchema>;

export const FileListResourceSchema = z.object({});

export type FileListResource = z.infer<typeof FileListResourceSchema>;

export const FilePartSchema = z.object({
  contentType: z.string().optional(),
  formField: z.boolean().optional(),
  inputStream: z.object({}).optional(),
  name: z.string().optional(),
  size: z.number().int().optional(),
  value: z.string().optional(),
});

export type FilePart = z.infer<typeof FilePartSchema>;

export const GroupSchema = z.object({
  name: z.string().optional(),
});

export type Group = z.infer<typeof GroupSchema>;

export const GroupAndUsersSchema = z.object({
  group: z.string().optional(),
  users: z
    .array(z.string())
    .refine((value) => value.length === new Set(value.map((item) => JSON.stringify(item))).size, {
      message: 'Array items must be unique',
    }),
});

export type GroupAndUsers = z.infer<typeof GroupAndUsersSchema>;

export const GroupPickerContextSchema = z.object({
  context: z.string().optional(),
  itemName: z.string().optional(),
});

export type GroupPickerContext = z.infer<typeof GroupPickerContextSchema>;

export const OptionalBodyBeanParamSchema = z.object({});

export type OptionalBodyBeanParam = z.infer<typeof OptionalBodyBeanParamSchema>;

export const RepositoryHookDetailsSchema = z.object({
  configFormKey: z.string().optional(),
  configFormView: z.string().optional(),
  description: z.string().optional(),
  key: z.string().optional(),
  name: z.string().optional(),
  supportedScopes: z
    .array(z.enum(['GLOBAL', 'PROJECT', 'REPOSITORY']))
    .refine((value) => value.length === new Set(value.map((item) => JSON.stringify(item))).size, {
      message: 'Array items must be unique',
    })
    .optional(),
  type: z.enum(['PRE_RECEIVE', 'PRE_PULL_REQUEST_MERGE', 'POST_RECEIVE']).optional(),
  version: z.string().optional(),
});

export type RepositoryHookDetails = z.infer<typeof RepositoryHookDetailsSchema>;

export const RestAggregateRejectCounterSchema = z.object({
  lastRejectTime: z.number().optional(),
  rejectCount: z.number().int().optional(),
  user: z
    .object({
      active: z.boolean().optional(),
      avatarUrl: z.string().optional(),
      displayName: z.string(),
      emailAddress: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      name: z.string(),
      slug: z.string(),
      type: z.enum(['NORMAL', 'SERVICE']),
    })
    .optional(),
});

export type RestAggregateRejectCounter = z.infer<typeof RestAggregateRejectCounterSchema>;

export const RestAnnouncementBannerSchema = z.object({
  audience: z.enum(['AUTHENTICATED', 'ALL']).optional(),
  enabled: z.boolean().optional(),
  message: z.string().optional(),
});

export type RestAnnouncementBanner = z.infer<typeof RestAnnouncementBannerSchema>;

export const RestApplicationPropertiesSchema = z.object({
  buildDate: z.string().optional(),
  buildNumber: z.string().optional(),
  displayName: z.string().optional(),
  version: z.string().optional(),
});

export type RestApplicationProperties = z.infer<typeof RestApplicationPropertiesSchema>;

export const RestApplySuggestionRequestSchema = z.object({
  commentVersion: z.number().int(),
  commitMessage: z.string().optional(),
  pullRequestVersion: z.number().int(),
  suggestionIndex: z.number().int(),
});

export type RestApplySuggestionRequest = z.infer<typeof RestApplySuggestionRequestSchema>;

export const RestAttachmentMetadataSchema = z.object({
  id: z.number().int().optional(),
  metadata: z.string().optional(),
  url: z.string().optional(),
});

export type RestAttachmentMetadata = z.infer<typeof RestAttachmentMetadataSchema>;

export const RestAutoDeclineSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  inactivityWeeks: z.number().int().optional(),
  scope: z
    .object({
      resourceId: z.number().int(),
      type: z.enum(['GLOBAL', 'PROJECT', 'REPOSITORY']),
    })
    .optional(),
});

export type RestAutoDeclineSettings = z.infer<typeof RestAutoDeclineSettingsSchema>;

export const RestAutoDeclineSettingsRequestSchema = z.object({
  enabled: z.boolean().optional(),
  inactivityWeeks: z.number().int().optional(),
});

export type RestAutoDeclineSettingsRequest = z.infer<typeof RestAutoDeclineSettingsRequestSchema>;

export const RestAutoMergeProcessingResultSchema = z.object({
  autoMergeProcessingStatus: z
    .enum(['CANCELLED', 'VETOED', 'STALE', 'MERGED', 'LOCK_FAILURE', 'UNKNOWN'])
    .optional(),
  pullRequest: z
    .object({
      author: z
        .object({
          approved: z.boolean().optional(),
          lastReviewedCommit: z.string().optional(),
          role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
          status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
          user: z
            .object({
              active: z.boolean().optional(),
              avatarUrl: z.string().optional(),
              displayName: z.string(),
              emailAddress: z.string().optional(),
              id: z.number().int().optional(),
              links: z.object({}).optional(),
              name: z.string(),
              slug: z.string(),
              type: z.enum(['NORMAL', 'SERVICE']),
            })
            .optional(),
        })
        .optional(),
      closed: z.boolean().optional(),
      closedDate: z.number().int().optional(),
      createdDate: z.number().int().optional(),
      description: z.string().optional(),
      descriptionAsHtml: z.string().optional(),
      draft: z.boolean().optional(),
      fromRef: z
        .object({
          displayId: z.string(),
          id: z.string(),
          latestCommit: z.string(),
          repository: z
            .object({
              archived: z.boolean().optional(),
              defaultBranch: z.string().optional(),
              description: z.string().optional(),
              forkable: z.boolean().optional(),
              hierarchyId: z.string().optional(),
              id: z.number().int().optional(),
              links: z.object({}).optional(),
              name: z.string().optional(),
              origin: z
                .object({
                  archived: z.boolean().optional(),
                  defaultBranch: z.string().optional(),
                  description: z.string().optional(),
                  forkable: z.boolean().optional(),
                  hierarchyId: z.string().optional(),
                  id: z.number().int().optional(),
                  links: z.object({}).optional(),
                  name: z.string().optional(),
                  partition: z.number().int().optional(),
                  project: z
                    .object({
                      avatar: z.string().optional(),
                      avatarUrl: z.string().optional(),
                      description: z.string().optional(),
                      id: z.number().int().optional(),
                      key: z.string(),
                      links: z.object({}).optional(),
                      name: z.string(),
                      public: z.boolean().optional(),
                      scope: z.string().optional(),
                      type: z.enum(['NORMAL', 'PERSONAL']),
                    })
                    .optional(),
                  public: z.boolean().optional(),
                  relatedLinks: z.object({}).optional(),
                  scmId: z.string().optional(),
                  scope: z.string().optional(),
                  slug: z.string().optional(),
                  state: z
                    .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                    .optional(),
                  statusMessage: z.string().optional(),
                })
                .optional(),
              partition: z.number().int().optional(),
              project: z
                .object({
                  avatar: z.string().optional(),
                  avatarUrl: z.string().optional(),
                  description: z.string().optional(),
                  id: z.number().int().optional(),
                  key: z.string(),
                  links: z.object({}).optional(),
                  name: z.string(),
                  public: z.boolean().optional(),
                  scope: z.string().optional(),
                  type: z.enum(['NORMAL', 'PERSONAL']),
                })
                .optional(),
              public: z.boolean().optional(),
              relatedLinks: z.object({}).optional(),
              scmId: z.string().optional(),
              scope: z.string().optional(),
              slug: z.string().optional(),
              state: z
                .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                .optional(),
              statusMessage: z.string().optional(),
            })
            .optional(),
          type: z.enum(['BRANCH', 'TAG']).optional(),
        })
        .optional(),
      htmlDescription: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      locked: z.boolean().optional(),
      open: z.boolean().optional(),
      participants: z
        .array(
          z.object({
            approved: z.boolean().optional(),
            lastReviewedCommit: z.string().optional(),
            role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
            status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
            user: z
              .object({
                active: z.boolean().optional(),
                avatarUrl: z.string().optional(),
                displayName: z.string(),
                emailAddress: z.string().optional(),
                id: z.number().int().optional(),
                links: z.object({}).optional(),
                name: z.string(),
                slug: z.string(),
                type: z.enum(['NORMAL', 'SERVICE']),
              })
              .optional(),
          }),
        )
        .optional(),
      reviewers: z
        .array(
          z.object({
            approved: z.boolean().optional(),
            lastReviewedCommit: z.string().optional(),
            role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
            status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
            user: z
              .object({
                active: z.boolean().optional(),
                avatarUrl: z.string().optional(),
                displayName: z.string(),
                emailAddress: z.string().optional(),
                id: z.number().int().optional(),
                links: z.object({}).optional(),
                name: z.string(),
                slug: z.string(),
                type: z.enum(['NORMAL', 'SERVICE']),
              })
              .optional(),
          }),
        )
        .optional(),
      state: z.enum(['DECLINED', 'MERGED', 'OPEN']).optional(),
      title: z.string().optional(),
      toRef: z
        .object({
          displayId: z.string(),
          id: z.string(),
          latestCommit: z.string(),
          repository: z
            .object({
              archived: z.boolean().optional(),
              defaultBranch: z.string().optional(),
              description: z.string().optional(),
              forkable: z.boolean().optional(),
              hierarchyId: z.string().optional(),
              id: z.number().int().optional(),
              links: z.object({}).optional(),
              name: z.string().optional(),
              origin: z
                .object({
                  archived: z.boolean().optional(),
                  defaultBranch: z.string().optional(),
                  description: z.string().optional(),
                  forkable: z.boolean().optional(),
                  hierarchyId: z.string().optional(),
                  id: z.number().int().optional(),
                  links: z.object({}).optional(),
                  name: z.string().optional(),
                  partition: z.number().int().optional(),
                  project: z
                    .object({
                      avatar: z.string().optional(),
                      avatarUrl: z.string().optional(),
                      description: z.string().optional(),
                      id: z.number().int().optional(),
                      key: z.string(),
                      links: z.object({}).optional(),
                      name: z.string(),
                      public: z.boolean().optional(),
                      scope: z.string().optional(),
                      type: z.enum(['NORMAL', 'PERSONAL']),
                    })
                    .optional(),
                  public: z.boolean().optional(),
                  relatedLinks: z.object({}).optional(),
                  scmId: z.string().optional(),
                  scope: z.string().optional(),
                  slug: z.string().optional(),
                  state: z
                    .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                    .optional(),
                  statusMessage: z.string().optional(),
                })
                .optional(),
              partition: z.number().int().optional(),
              project: z
                .object({
                  avatar: z.string().optional(),
                  avatarUrl: z.string().optional(),
                  description: z.string().optional(),
                  id: z.number().int().optional(),
                  key: z.string(),
                  links: z.object({}).optional(),
                  name: z.string(),
                  public: z.boolean().optional(),
                  scope: z.string().optional(),
                  type: z.enum(['NORMAL', 'PERSONAL']),
                })
                .optional(),
              public: z.boolean().optional(),
              relatedLinks: z.object({}).optional(),
              scmId: z.string().optional(),
              scope: z.string().optional(),
              slug: z.string().optional(),
              state: z
                .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                .optional(),
              statusMessage: z.string().optional(),
            })
            .optional(),
          type: z.enum(['BRANCH', 'TAG']).optional(),
        })
        .optional(),
      updatedDate: z.number().int().optional(),
      version: z.number().int().optional(),
    })
    .optional(),
});

export type RestAutoMergeProcessingResult = z.infer<typeof RestAutoMergeProcessingResultSchema>;

export const RestAutoMergeProjectSettingsRequestSchema = z.object({
  enabled: z.boolean().optional(),
  restrictionAction: z.enum(['CREATE', 'DELETE', 'NONE']).optional(),
});

export type RestAutoMergeProjectSettingsRequest = z.infer<
  typeof RestAutoMergeProjectSettingsRequestSchema
>;

export const RestAutoMergeRequestSchema = z.object({
  autoSubject: z.boolean().optional(),
  createdDate: z.number().int().optional(),
  fromHash: z.string().optional(),
  message: z.string().optional(),
  strategyId: z.string().optional(),
  toRefId: z.string().optional(),
});

export type RestAutoMergeRequest = z.infer<typeof RestAutoMergeRequestSchema>;

export const RestAutoMergeRestrictedSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  restrictionState: z.enum(['NONE', 'RESTRICTED_UNMODIFIABLE', 'RESTRICTED_MODIFIABLE']).optional(),
  scope: z
    .object({
      resourceId: z.number().int(),
      type: z.enum(['GLOBAL', 'PROJECT', 'REPOSITORY']),
    })
    .optional(),
});

export type RestAutoMergeRestrictedSettings = z.infer<typeof RestAutoMergeRestrictedSettingsSchema>;

export const RestAutoMergeSettingsRequestSchema = z.object({
  enabled: z.boolean().optional(),
});

export type RestAutoMergeSettingsRequest = z.infer<typeof RestAutoMergeSettingsRequestSchema>;

export const RestBitbucketLicenseSchema = z.object({
  creationDate: z.number().int().optional(),
  daysBeforeExpiry: z.number().int().optional(),
  expiryDate: z.number().int().optional(),
  gracePeriodEndDate: z.number().int().optional(),
  license: z.string().optional(),
  maintenanceExpiryDate: z.number().int().optional(),
  maximumNumberOfUsers: z.number().int().optional(),
  numberOfDaysBeforeExpiry: z.number().int().optional(),
  numberOfDaysBeforeGracePeriodExpiry: z.number().int().optional(),
  numberOfDaysBeforeMaintenanceExpiry: z.number().int().optional(),
  purchaseDate: z.number().int().optional(),
  serverId: z.string().optional(),
  status: z
    .object({
      currentNumberOfUsers: z.number().int().optional(),
      serverId: z.string().optional(),
    })
    .optional(),
  supportEntitlementNumber: z.string().optional(),
  unlimitedNumberOfUsers: z.boolean().optional(),
});

export type RestBitbucketLicense = z.infer<typeof RestBitbucketLicenseSchema>;

export const RestBuildCapabilitiesSchema = z.object({
  buildStatus: z.array(z.string()).optional(),
});

export type RestBuildCapabilities = z.infer<typeof RestBuildCapabilitiesSchema>;

export const RestBuildStatusSetRequestSchema = z.object({
  buildNumber: z.string().min(0).max(255).optional(),
  description: z.string().optional(),
  duration: z.number().int().optional(),
  key: z.string().min(0).max(255),
  lastUpdated: z.number().int().optional(),
  name: z.string().min(0).max(255).optional(),
  parent: z.string().min(0).max(1024).optional(),
  ref: z.string().min(0).max(1024).regex(new RegExp('^refs\\/.*')).optional(),
  state: z.enum(['CANCELLED', 'FAILED', 'INPROGRESS', 'SUCCESSFUL', 'UNKNOWN']),
  testResults: z
    .object({
      failed: z.number().int().optional(),
      skipped: z.number().int().optional(),
      successful: z.number().int().optional(),
    })
    .optional(),
  url: z.string().min(0).max(450),
});

export type RestBuildStatusSetRequest = z.infer<typeof RestBuildStatusSetRequestSchema>;

export const RestBulkUserRateLimitSettingsUpdateRequestSchema = z.object({
  settings: z
    .object({
      capacity: z.number().int().optional(),
      fillRate: z.number().int().optional(),
    })
    .optional(),
  usernames: z
    .array(z.string())
    .refine((value) => value.length === new Set(value.map((item) => JSON.stringify(item))).size, {
      message: 'Array items must be unique',
    }),
  whitelisted: z.boolean().optional(),
});

export type RestBulkUserRateLimitSettingsUpdateRequest = z.infer<
  typeof RestBulkUserRateLimitSettingsUpdateRequestSchema
>;

export const RestChangeSchema = z.object({
  conflict: z
    .object({
      ourChange: z
        .object({
          path: z
            .object({
              components: z.array(z.string()).optional(),
              extension: z.string().optional(),
              name: z.string().optional(),
              parent: z.string().optional(),
            })
            .optional(),
          srcPath: z
            .object({
              components: z.array(z.string()).optional(),
              extension: z.string().optional(),
              name: z.string().optional(),
              parent: z.string().optional(),
            })
            .optional(),
          type: z.enum(['ADD', 'COPY', 'DELETE', 'MODIFY', 'MOVE', 'UNKNOWN']).optional(),
        })
        .optional(),
      theirChange: z
        .object({
          path: z
            .object({
              components: z.array(z.string()).optional(),
              extension: z.string().optional(),
              name: z.string().optional(),
              parent: z.string().optional(),
            })
            .optional(),
          srcPath: z
            .object({
              components: z.array(z.string()).optional(),
              extension: z.string().optional(),
              name: z.string().optional(),
              parent: z.string().optional(),
            })
            .optional(),
          type: z.enum(['ADD', 'COPY', 'DELETE', 'MODIFY', 'MOVE', 'UNKNOWN']).optional(),
        })
        .optional(),
    })
    .optional(),
  contentId: z.string().optional(),
  executable: z.boolean().optional(),
  fromContentId: z.string().optional(),
  links: z.object({}).optional(),
  nodeType: z.enum(['DIRECTORY', 'FILE', 'SUBMODULE']).optional(),
  path: z
    .object({
      components: z.array(z.string()).optional(),
      extension: z.string().optional(),
      name: z.string().optional(),
      parent: z.string().optional(),
    })
    .optional(),
  percentUnchanged: z.number().int().optional(),
  srcExecutable: z.boolean().optional(),
  srcPath: z
    .object({
      components: z.array(z.string()).optional(),
      extension: z.string().optional(),
      name: z.string().optional(),
      parent: z.string().optional(),
    })
    .optional(),
  type: z.enum(['ADD', 'COPY', 'DELETE', 'MODIFY', 'MOVE', 'UNKNOWN']).optional(),
});

export type RestChange = z.infer<typeof RestChangeSchema>;

export const RestClusterInformationSchema = z.object({
  localNode: z
    .object({
      address: z.object({
        address: z.string().optional(),
        port: z.number().int().optional(),
      }),
      buildVersion: z.string(),
      id: z.string(),
      local: z.boolean(),
      name: z.string(),
    })
    .optional(),
  nodes: z
    .array(
      z.object({
        address: z
          .object({
            address: z.string().optional(),
            port: z.number().int().optional(),
          })
          .optional(),
        buildVersion: z.string().optional(),
        id: z.string().optional(),
        local: z.boolean().optional(),
        name: z.string().optional(),
      }),
    )
    .optional(),
  running: z.boolean().optional(),
});

export type RestClusterInformation = z.infer<typeof RestClusterInformationSchema>;

export const RestCommitMessageSuggestionSchema = z.object({
  body: z.string().optional(),
  title: z.string().optional(),
});

export type RestCommitMessageSuggestion = z.infer<typeof RestCommitMessageSuggestionSchema>;

export const RestConflictSchema = z.object({
  ourChange: z
    .object({
      path: z
        .object({
          components: z.array(z.string()).optional(),
          extension: z.string().optional(),
          name: z.string().optional(),
          parent: z.string().optional(),
        })
        .optional(),
      srcPath: z
        .object({
          components: z.array(z.string()).optional(),
          extension: z.string().optional(),
          name: z.string().optional(),
          parent: z.string().optional(),
        })
        .optional(),
      type: z.enum(['ADD', 'COPY', 'DELETE', 'MODIFY', 'MOVE', 'UNKNOWN']).optional(),
    })
    .optional(),
  theirChange: z
    .object({
      path: z
        .object({
          components: z.array(z.string()).optional(),
          extension: z.string().optional(),
          name: z.string().optional(),
          parent: z.string().optional(),
        })
        .optional(),
      srcPath: z
        .object({
          components: z.array(z.string()).optional(),
          extension: z.string().optional(),
          name: z.string().optional(),
          parent: z.string().optional(),
        })
        .optional(),
      type: z.enum(['ADD', 'COPY', 'DELETE', 'MODIFY', 'MOVE', 'UNKNOWN']).optional(),
    })
    .optional(),
});

export type RestConflict = z.infer<typeof RestConflictSchema>;

export const RestConflictChangeSchema = z.object({
  path: z
    .object({
      components: z.array(z.string()).optional(),
      extension: z.string().optional(),
      name: z.string().optional(),
      parent: z.string().optional(),
    })
    .optional(),
  srcPath: z
    .object({
      components: z.array(z.string()).optional(),
      extension: z.string().optional(),
      name: z.string().optional(),
      parent: z.string().optional(),
    })
    .optional(),
  type: z.enum(['ADD', 'COPY', 'DELETE', 'MODIFY', 'MOVE', 'UNKNOWN']).optional(),
});

export type RestConflictChange = z.infer<typeof RestConflictChangeSchema>;

export const RestConnectivitySummarySchema = z.object({
  errorMessage: z.string().optional(),
  reachable: z.boolean().optional(),
  roundTripTime: z.number().int().optional(),
});

export type RestConnectivitySummary = z.infer<typeof RestConnectivitySummarySchema>;

export const RestCreateBranchRequestSchema = z.object({
  message: z.string().optional(),
  name: z.string().optional(),
  startPoint: z.string().optional(),
});

export type RestCreateBranchRequest = z.infer<typeof RestCreateBranchRequestSchema>;

export const RestCreateTagRequestSchema = z.object({
  message: z.string().optional(),
  name: z.string().optional(),
  startPoint: z.string().optional(),
});

export type RestCreateTagRequest = z.infer<typeof RestCreateTagRequestSchema>;

export const RestDefaultBranchSchema = z.object({
  id: z.string().optional(),
});

export type RestDefaultBranch = z.infer<typeof RestDefaultBranchSchema>;

export const RestDeploymentSchema = z.object({
  deploymentSequenceNumber: z.number().int().optional(),
  description: z.string().optional(),
  displayName: z.string().optional(),
  environment: z
    .object({
      displayName: z.string().min(0).max(255),
      key: z.string().min(0).max(255),
      type: z.string().regex(new RegExp('DEVELOPMENT|TESTING|STAGING|PRODUCTION')).optional(),
      url: z.string().min(0).max(1024).optional(),
    })
    .optional(),
  fromCommit: z
    .object({
      displayId: z.string().optional(),
      id: z.string().optional(),
    })
    .optional(),
  key: z.string().optional(),
  lastUpdated: z.number().int().optional(),
  repository: z
    .object({
      archived: z.boolean().optional(),
      defaultBranch: z.string().optional(),
      description: z.string().optional(),
      forkable: z.boolean().optional(),
      hierarchyId: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      name: z.string().optional(),
      origin: z
        .object({
          archived: z.boolean().optional(),
          defaultBranch: z.string().optional(),
          description: z.string().optional(),
          forkable: z.boolean().optional(),
          hierarchyId: z.string().optional(),
          id: z.number().int().optional(),
          links: z.object({}).optional(),
          name: z.string().optional(),
          partition: z.number().int().optional(),
          project: z
            .object({
              avatar: z.string().optional(),
              avatarUrl: z.string().optional(),
              description: z.string().optional(),
              id: z.number().int().optional(),
              key: z.string(),
              links: z.object({}).optional(),
              name: z.string(),
              public: z.boolean().optional(),
              scope: z.string().optional(),
              type: z.enum(['NORMAL', 'PERSONAL']),
            })
            .optional(),
          public: z.boolean().optional(),
          relatedLinks: z.object({}).optional(),
          scmId: z.string().optional(),
          scope: z.string().optional(),
          slug: z.string().optional(),
          state: z
            .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
            .optional(),
          statusMessage: z.string().optional(),
        })
        .optional(),
      partition: z.number().int().optional(),
      project: z
        .object({
          avatar: z.string().optional(),
          avatarUrl: z.string().optional(),
          description: z.string().optional(),
          id: z.number().int().optional(),
          key: z.string(),
          links: z.object({}).optional(),
          name: z.string(),
          public: z.boolean().optional(),
          scope: z.string().optional(),
          type: z.enum(['NORMAL', 'PERSONAL']),
        })
        .optional(),
      public: z.boolean().optional(),
      relatedLinks: z.object({}).optional(),
      scmId: z.string().optional(),
      scope: z.string().optional(),
      slug: z.string().optional(),
      state: z.enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE']).optional(),
      statusMessage: z.string().optional(),
    })
    .optional(),
  state: z
    .enum(['PENDING', 'IN_PROGRESS', 'CANCELLED', 'FAILED', 'ROLLED_BACK', 'SUCCESSFUL', 'UNKNOWN'])
    .optional(),
  toCommit: z
    .object({
      displayId: z.string().optional(),
      id: z.string().optional(),
    })
    .optional(),
  url: z.string().optional(),
});

export type RestDeployment = z.infer<typeof RestDeploymentSchema>;

export const RestDeploymentEnvironmentSchema = z.object({
  displayName: z.string().min(0).max(255).optional(),
  key: z.string().min(0).max(255).optional(),
  type: z.string().regex(new RegExp('DEVELOPMENT|TESTING|STAGING|PRODUCTION')).optional(),
  url: z.string().min(0).max(1024).optional(),
});

export type RestDeploymentEnvironment = z.infer<typeof RestDeploymentEnvironmentSchema>;

export const RestDeploymentSetRequestSchema = z.object({
  deploymentSequenceNumber: z.number().int(),
  description: z.string().min(0).max(255),
  displayName: z.string().min(0).max(255),
  environment: z.object({
    displayName: z.string().min(0).max(255).optional(),
    key: z.string().min(0).max(255).optional(),
    type: z.string().regex(new RegExp('DEVELOPMENT|TESTING|STAGING|PRODUCTION')).optional(),
    url: z.string().min(0).max(1024).optional(),
  }),
  key: z.string().min(0).max(255),
  lastUpdated: z.number().int().min(0).optional(),
  state: z.enum([
    'PENDING',
    'IN_PROGRESS',
    'CANCELLED',
    'FAILED',
    'ROLLED_BACK',
    'SUCCESSFUL',
    'UNKNOWN',
  ]),
  url: z.string().min(0).max(1024),
});

export type RestDeploymentSetRequest = z.infer<typeof RestDeploymentSetRequestSchema>;

export const RestDetailedGroupSchema = z.object({
  deletable: z.boolean().optional(),
  name: z.string().optional(),
});

export type RestDetailedGroup = z.infer<typeof RestDetailedGroupSchema>;

export const RestDetailedInvocationSchema = z.object({
  duration: z.number().int().optional(),
  event: z.string().optional(),
  eventScope: z
    .object({
      id: z.string().optional(),
      type: z.string().optional(),
    })
    .optional(),
  finish: z.number().int().optional(),
  id: z.number().int().optional(),
  request: z.object({}).optional(),
  result: z.object({}).optional(),
  start: z.number().int().optional(),
});

export type RestDetailedInvocation = z.infer<typeof RestDetailedInvocationSchema>;

export const RestDetailedUserSchema = z.object({
  active: z.boolean().optional(),
  avatarUrl: z.string().optional(),
  createdTimestamp: z.number().optional(),
  deletable: z.boolean().optional(),
  directoryName: z.string().optional(),
  displayName: z.string().optional(),
  emailAddress: z.string().optional(),
  id: z.number().int().optional(),
  lastAuthenticationTimestamp: z.number().optional(),
  links: z.object({}).optional(),
  mutableDetails: z.boolean().optional(),
  mutableGroups: z.boolean().optional(),
  name: z.string().optional(),
  slug: z.string().optional(),
  type: z.enum(['NORMAL', 'SERVICE']).optional(),
});

export type RestDetailedUser = z.infer<typeof RestDetailedUserSchema>;

export const RestDiffSegmentSchema = z.object({
  lines: z
    .array(
      z.object({
        commentIds: z.array(z.number().int()).optional(),
        conflictMarker: z.enum(['MARKER', 'OURS', 'THEIRS']).optional(),
        destination: z.number().int().optional(),
        line: z.string().optional(),
        source: z.number().int().optional(),
        truncated: z.boolean().optional(),
      }),
    )
    .optional(),
  truncated: z.boolean().optional(),
  type: z.enum(['ADDED', 'CONTEXT', 'REMOVED']).optional(),
});

export type RestDiffSegment = z.infer<typeof RestDiffSegmentSchema>;

export const RestDiffSchema = z.object({
  binary: z.boolean().optional(),
  destination: z
    .object({
      components: z.array(z.string()).optional(),
      extension: z.string().optional(),
      name: z.string().optional(),
      parent: z.string().optional(),
    })
    .optional(),
  hunks: z
    .array(
      z.object({
        context: z.string().optional(),
        destinationLine: z.number().int().optional(),
        destinationSpan: z.number().int().optional(),
        segments: z.array(RestDiffSegmentSchema).optional(),
        sourceLine: z.number().int().optional(),
        sourceSpan: z.number().int().optional(),
        truncated: z.boolean().optional(),
      }),
    )
    .optional(),
  lineComments: z
    .array(
      z.object({
        anchor: z
          .object({
            diffType: z.enum(['COMMIT', 'EFFECTIVE', 'RANGE']).optional(),
            fileType: z.enum(['FROM', 'TO']).optional(),
            fromHash: z.string().optional(),
            line: z.number().int().optional(),
            lineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']).optional(),
            multilineMarker: z
              .object({
                startLine: z.number().int().optional(),
                startLineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']),
              })
              .optional(),
            multilineSpan: z
              .object({
                dstSpanEnd: z.number().int(),
                dstSpanStart: z.number().int(),
                srcSpanEnd: z.number().int(),
                srcSpanStart: z.number().int(),
              })
              .optional(),
            path: z
              .object({
                components: z.array(z.string()).optional(),
                extension: z.string().optional(),
                name: z.string().optional(),
                parent: z.string().optional(),
              })
              .optional(),
            pullRequest: z
              .object({
                author: z
                  .object({
                    approved: z.boolean().optional(),
                    lastReviewedCommit: z.string().optional(),
                    role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
                    status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
                    user: z
                      .object({
                        active: z.boolean().optional(),
                        avatarUrl: z.string().optional(),
                        displayName: z.string(),
                        emailAddress: z.string().optional(),
                        id: z.number().int().optional(),
                        links: z.object({}).optional(),
                        name: z.string(),
                        slug: z.string(),
                        type: z.enum(['NORMAL', 'SERVICE']),
                      })
                      .optional(),
                  })
                  .optional(),
                closed: z.boolean().optional(),
                closedDate: z.number().int().optional(),
                createdDate: z.number().int().optional(),
                description: z.string().optional(),
                descriptionAsHtml: z.string().optional(),
                draft: z.boolean().optional(),
                fromRef: z
                  .object({
                    displayId: z.string(),
                    id: z.string(),
                    latestCommit: z.string(),
                    repository: z
                      .object({
                        archived: z.boolean().optional(),
                        defaultBranch: z.string().optional(),
                        description: z.string().optional(),
                        forkable: z.boolean().optional(),
                        hierarchyId: z.string().optional(),
                        id: z.number().int().optional(),
                        links: z.object({}).optional(),
                        name: z.string().optional(),
                        origin: z
                          .object({
                            archived: z.boolean().optional(),
                            defaultBranch: z.string().optional(),
                            description: z.string().optional(),
                            forkable: z.boolean().optional(),
                            hierarchyId: z.string().optional(),
                            id: z.number().int().optional(),
                            links: z.object({}).optional(),
                            name: z.string().optional(),
                            partition: z.number().int().optional(),
                            project: z
                              .object({
                                avatar: z.string().optional(),
                                avatarUrl: z.string().optional(),
                                description: z.string().optional(),
                                id: z.number().int().optional(),
                                key: z.string(),
                                links: z.object({}).optional(),
                                name: z.string(),
                                public: z.boolean().optional(),
                                scope: z.string().optional(),
                                type: z.enum(['NORMAL', 'PERSONAL']),
                              })
                              .optional(),
                            public: z.boolean().optional(),
                            relatedLinks: z.object({}).optional(),
                            scmId: z.string().optional(),
                            scope: z.string().optional(),
                            slug: z.string().optional(),
                            state: z
                              .enum([
                                'AVAILABLE',
                                'INITIALISATION_FAILED',
                                'INITIALISING',
                                'OFFLINE',
                              ])
                              .optional(),
                            statusMessage: z.string().optional(),
                          })
                          .optional(),
                        partition: z.number().int().optional(),
                        project: z
                          .object({
                            avatar: z.string().optional(),
                            avatarUrl: z.string().optional(),
                            description: z.string().optional(),
                            id: z.number().int().optional(),
                            key: z.string(),
                            links: z.object({}).optional(),
                            name: z.string(),
                            public: z.boolean().optional(),
                            scope: z.string().optional(),
                            type: z.enum(['NORMAL', 'PERSONAL']),
                          })
                          .optional(),
                        public: z.boolean().optional(),
                        relatedLinks: z.object({}).optional(),
                        scmId: z.string().optional(),
                        scope: z.string().optional(),
                        slug: z.string().optional(),
                        state: z
                          .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                          .optional(),
                        statusMessage: z.string().optional(),
                      })
                      .optional(),
                    type: z.enum(['BRANCH', 'TAG']).optional(),
                  })
                  .optional(),
                htmlDescription: z.string().optional(),
                id: z.number().int().optional(),
                links: z.object({}).optional(),
                locked: z.boolean().optional(),
                open: z.boolean().optional(),
                participants: z.array(RestPullRequestParticipantSchema).optional(),
                reviewers: z.array(RestPullRequestParticipantSchema).optional(),
                state: z.enum(['DECLINED', 'MERGED', 'OPEN']).optional(),
                title: z.string().optional(),
                toRef: z
                  .object({
                    displayId: z.string(),
                    id: z.string(),
                    latestCommit: z.string(),
                    repository: z
                      .object({
                        archived: z.boolean().optional(),
                        defaultBranch: z.string().optional(),
                        description: z.string().optional(),
                        forkable: z.boolean().optional(),
                        hierarchyId: z.string().optional(),
                        id: z.number().int().optional(),
                        links: z.object({}).optional(),
                        name: z.string().optional(),
                        origin: z
                          .object({
                            archived: z.boolean().optional(),
                            defaultBranch: z.string().optional(),
                            description: z.string().optional(),
                            forkable: z.boolean().optional(),
                            hierarchyId: z.string().optional(),
                            id: z.number().int().optional(),
                            links: z.object({}).optional(),
                            name: z.string().optional(),
                            partition: z.number().int().optional(),
                            project: z
                              .object({
                                avatar: z.string().optional(),
                                avatarUrl: z.string().optional(),
                                description: z.string().optional(),
                                id: z.number().int().optional(),
                                key: z.string(),
                                links: z.object({}).optional(),
                                name: z.string(),
                                public: z.boolean().optional(),
                                scope: z.string().optional(),
                                type: z.enum(['NORMAL', 'PERSONAL']),
                              })
                              .optional(),
                            public: z.boolean().optional(),
                            relatedLinks: z.object({}).optional(),
                            scmId: z.string().optional(),
                            scope: z.string().optional(),
                            slug: z.string().optional(),
                            state: z
                              .enum([
                                'AVAILABLE',
                                'INITIALISATION_FAILED',
                                'INITIALISING',
                                'OFFLINE',
                              ])
                              .optional(),
                            statusMessage: z.string().optional(),
                          })
                          .optional(),
                        partition: z.number().int().optional(),
                        project: z
                          .object({
                            avatar: z.string().optional(),
                            avatarUrl: z.string().optional(),
                            description: z.string().optional(),
                            id: z.number().int().optional(),
                            key: z.string(),
                            links: z.object({}).optional(),
                            name: z.string(),
                            public: z.boolean().optional(),
                            scope: z.string().optional(),
                            type: z.enum(['NORMAL', 'PERSONAL']),
                          })
                          .optional(),
                        public: z.boolean().optional(),
                        relatedLinks: z.object({}).optional(),
                        scmId: z.string().optional(),
                        scope: z.string().optional(),
                        slug: z.string().optional(),
                        state: z
                          .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
                          .optional(),
                        statusMessage: z.string().optional(),
                      })
                      .optional(),
                    type: z.enum(['BRANCH', 'TAG']).optional(),
                  })
                  .optional(),
                updatedDate: z.number().int().optional(),
                version: z.number().int().optional(),
              })
              .optional(),
            srcPath: z
              .object({
                components: z.array(z.string()).optional(),
                extension: z.string().optional(),
                name: z.string().optional(),
                parent: z.string().optional(),
              })
              .optional(),
            toHash: z.string().optional(),
          })
          .optional(),
        anchored: z.boolean().optional(),
        author: z
          .object({
            active: z.boolean().optional(),
            avatarUrl: z.string().optional(),
            displayName: z.string(),
            emailAddress: z.string().optional(),
            id: z.number().int().optional(),
            links: z.object({}).optional(),
            name: z.string(),
            slug: z.string(),
            type: z.enum(['NORMAL', 'SERVICE']),
          })
          .optional(),
        comments: z.array(RestCommentSchema).optional(),
        createdDate: z.number().int().optional(),
        html: z.string().optional(),
        id: z.number().int().optional(),
        parent: z
          .object({
            anchor: z
              .object({
                diffType: z.enum(['COMMIT', 'EFFECTIVE', 'RANGE']).optional(),
                fileType: z.enum(['FROM', 'TO']).optional(),
                fromHash: z.string().optional(),
                line: z.number().int().optional(),
                lineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']).optional(),
                multilineMarker: z
                  .object({
                    startLine: z.number().int().optional(),
                    startLineType: z.enum(['ADDED', 'CONTEXT', 'REMOVED']),
                  })
                  .optional(),
                multilineSpan: z
                  .object({
                    dstSpanEnd: z.number().int(),
                    dstSpanStart: z.number().int(),
                    srcSpanEnd: z.number().int(),
                    srcSpanStart: z.number().int(),
                  })
                  .optional(),
                path: z
                  .object({
                    components: z.array(z.string()).optional(),
                    extension: z.string().optional(),
                    name: z.string().optional(),
                    parent: z.string().optional(),
                  })
                  .optional(),
                pullRequest: z
                  .object({
                    author: z
                      .object({
                        approved: z.boolean().optional(),
                        lastReviewedCommit: z.string().optional(),
                        role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
                        status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
                        user: z
                          .object({
                            active: z.boolean().optional(),
                            avatarUrl: z.string().optional(),
                            displayName: z.string(),
                            emailAddress: z.string().optional(),
                            id: z.number().int().optional(),
                            links: z.object({}).optional(),
                            name: z.string(),
                            slug: z.string(),
                            type: z.enum(['NORMAL', 'SERVICE']),
                          })
                          .optional(),
                      })
                      .optional(),
                    closed: z.boolean().optional(),
                    closedDate: z.number().int().optional(),
                    createdDate: z.number().int().optional(),
                    description: z.string().optional(),
                    descriptionAsHtml: z.string().optional(),
                    draft: z.boolean().optional(),
                    fromRef: z
                      .object({
                        displayId: z.string(),
                        id: z.string(),
                        latestCommit: z.string(),
                        repository: z
                          .object({
                            archived: z.boolean().optional(),
                            defaultBranch: z.string().optional(),
                            description: z.string().optional(),
                            forkable: z.boolean().optional(),
                            hierarchyId: z.string().optional(),
                            id: z.number().int().optional(),
                            links: z.object({}).optional(),
                            name: z.string().optional(),
                            origin: z
                              .object({
                                archived: z.boolean().optional(),
                                defaultBranch: z.string().optional(),
                                description: z.string().optional(),
                                forkable: z.boolean().optional(),
                                hierarchyId: z.string().optional(),
                                id: z.number().int().optional(),
                                links: z.object({}).optional(),
                                name: z.string().optional(),
                                partition: z.number().int().optional(),
                                project: z
                                  .object({
                                    avatar: z.string().optional(),
                                    avatarUrl: z.string().optional(),
                                    description: z.string().optional(),
                                    id: z.number().int().optional(),
                                    key: z.string(),
                                    links: z.object({}).optional(),
                                    name: z.string(),
                                    public: z.boolean().optional(),
                                    scope: z.string().optional(),
                                    type: z.enum(['NORMAL', 'PERSONAL']),
                                  })
                                  .optional(),
                                public: z.boolean().optional(),
                                relatedLinks: z.object({}).optional(),
                                scmId: z.string().optional(),
                                scope: z.string().optional(),
                                slug: z.string().optional(),
                                state: z
                                  .enum([
                                    'AVAILABLE',
                                    'INITIALISATION_FAILED',
                                    'INITIALISING',
                                    'OFFLINE',
                                  ])
                                  .optional(),
                                statusMessage: z.string().optional(),
                              })
                              .optional(),
                            partition: z.number().int().optional(),
                            project: z
                              .object({
                                avatar: z.string().optional(),
                                avatarUrl: z.string().optional(),
                                description: z.string().optional(),
                                id: z.number().int().optional(),
                                key: z.string(),
                                links: z.object({}).optional(),
                                name: z.string(),
                                public: z.boolean().optional(),
                                scope: z.string().optional(),
                                type: z.enum(['NORMAL', 'PERSONAL']),
                              })
                              .optional(),
                            public: z.boolean().optional(),
                            relatedLinks: z.object({}).optional(),
                            scmId: z.string().optional(),
                            scope: z.string().optional(),
                            slug: z.string().optional(),
                            state: z
                              .enum([
                                'AVAILABLE',
                                'INITIALISATION_FAILED',
                                'INITIALISING',
                                'OFFLINE',
                              ])
                              .optional(),
                            statusMessage: z.string().optional(),
                          })
                          .optional(),
                        type: z.enum(['BRANCH', 'TAG']).optional(),
                      })
                      .optional(),
                    htmlDescription: z.string().optional(),
                    id: z.number().int().optional(),
                    links: z.object({}).optional(),
                    locked: z.boolean().optional(),
                    open: z.boolean().optional(),
                    participants: z.array(RestPullRequestParticipantSchema).optional(),
                    reviewers: z.array(RestPullRequestParticipantSchema).optional(),
                    state: z.enum(['DECLINED', 'MERGED', 'OPEN']).optional(),
                    title: z.string().optional(),
                    toRef: z
                      .object({
                        displayId: z.string(),
                        id: z.string(),
                        latestCommit: z.string(),
                        repository: z
                          .object({
                            archived: z.boolean().optional(),
                            defaultBranch: z.string().optional(),
                            description: z.string().optional(),
                            forkable: z.boolean().optional(),
                            hierarchyId: z.string().optional(),
                            id: z.number().int().optional(),
                            links: z.object({}).optional(),
                            name: z.string().optional(),
                            origin: z
                              .object({
                                archived: z.boolean().optional(),
                                defaultBranch: z.string().optional(),
                                description: z.string().optional(),
                                forkable: z.boolean().optional(),
                                hierarchyId: z.string().optional(),
                                id: z.number().int().optional(),
                                links: z.object({}).optional(),
                                name: z.string().optional(),
                                partition: z.number().int().optional(),
                                project: z
                                  .object({
                                    avatar: z.string().optional(),
                                    avatarUrl: z.string().optional(),
                                    description: z.string().optional(),
                                    id: z.number().int().optional(),
                                    key: z.string(),
                                    links: z.object({}).optional(),
                                    name: z.string(),
                                    public: z.boolean().optional(),
                                    scope: z.string().optional(),
                                    type: z.enum(['NORMAL', 'PERSONAL']),
                                  })
                                  .optional(),
                                public: z.boolean().optional(),
                                relatedLinks: z.object({}).optional(),
                                scmId: z.string().optional(),
                                scope: z.string().optional(),
                                slug: z.string().optional(),
                                state: z
                                  .enum([
                                    'AVAILABLE',
                                    'INITIALISATION_FAILED',
                                    'INITIALISING',
                                    'OFFLINE',
                                  ])
                                  .optional(),
                                statusMessage: z.string().optional(),
                              })
                              .optional(),
                            partition: z.number().int().optional(),
                            project: z
                              .object({
                                avatar: z.string().optional(),
                                avatarUrl: z.string().optional(),
                                description: z.string().optional(),
                                id: z.number().int().optional(),
                                key: z.string(),
                                links: z.object({}).optional(),
                                name: z.string(),
                                public: z.boolean().optional(),
                                scope: z.string().optional(),
                                type: z.enum(['NORMAL', 'PERSONAL']),
                              })
                              .optional(),
                            public: z.boolean().optional(),
                            relatedLinks: z.object({}).optional(),
                            scmId: z.string().optional(),
                            scope: z.string().optional(),
                            slug: z.string().optional(),
                            state: z
                              .enum([
                                'AVAILABLE',
                                'INITIALISATION_FAILED',
                                'INITIALISING',
                                'OFFLINE',
                              ])
                              .optional(),
                            statusMessage: z.string().optional(),
                          })
                          .optional(),
                        type: z.enum(['BRANCH', 'TAG']).optional(),
                      })
                      .optional(),
                    updatedDate: z.number().int().optional(),
                    version: z.number().int().optional(),
                  })
                  .optional(),
                srcPath: z
                  .object({
                    components: z.array(z.string()).optional(),
                    extension: z.string().optional(),
                    name: z.string().optional(),
                    parent: z.string().optional(),
                  })
                  .optional(),
                toHash: z.string().optional(),
              })
              .optional(),
            anchored: z.boolean().optional(),
            author: z
              .object({
                active: z.boolean().optional(),
                avatarUrl: z.string().optional(),
                displayName: z.string(),
                emailAddress: z.string().optional(),
                id: z.number().int().optional(),
                links: z.object({}).optional(),
                name: z.string(),
                slug: z.string(),
                type: z.enum(['NORMAL', 'SERVICE']),
              })
              .optional(),
            comments: z.array(RestCommentSchema).optional(),
            createdDate: z.number().int().optional(),
            html: z.string().optional(),
            id: z.number().int().optional(),
            pending: z.boolean().optional(),
            properties: z.object({}).optional(),
            reply: z.boolean().optional(),
            resolvedDate: z.number().int().optional(),
            resolver: z
              .object({
                active: z.boolean().optional(),
                avatarUrl: z.string().optional(),
                displayName: z.string(),
                emailAddress: z.string().optional(),
                id: z.number().int().optional(),
                links: z.object({}).optional(),
                name: z.string(),
                slug: z.string(),
                type: z.enum(['NORMAL', 'SERVICE']),
              })
              .optional(),
            severity: z.string().optional(),
            state: z.string().optional(),
            text: z.string().optional(),
            threadResolved: z.boolean().optional(),
            threadResolvedDate: z.number().int().optional(),
            threadResolver: z
              .object({
                active: z.boolean().optional(),
                avatarUrl: z.string().optional(),
                displayName: z.string(),
                emailAddress: z.string().optional(),
                id: z.number().int().optional(),
                links: z.object({}).optional(),
                name: z.string(),
                slug: z.string(),
                type: z.enum(['NORMAL', 'SERVICE']),
              })
              .optional(),
            updatedDate: z.number().int().optional(),
            version: z.number().int().optional(),
          })
          .optional(),
        pending: z.boolean().optional(),
        properties: z.object({}).optional(),
        reply: z.boolean().optional(),
        resolvedDate: z.number().int().optional(),
        resolver: z
          .object({
            active: z.boolean().optional(),
            avatarUrl: z.string().optional(),
            displayName: z.string(),
            emailAddress: z.string().optional(),
            id: z.number().int().optional(),
            links: z.object({}).optional(),
            name: z.string(),
            slug: z.string(),
            type: z.enum(['NORMAL', 'SERVICE']),
          })
          .optional(),
        severity: z.string().optional(),
        state: z.string().optional(),
        text: z.string().optional(),
        threadResolved: z.boolean().optional(),
        threadResolvedDate: z.number().int().optional(),
        threadResolver: z
          .object({
            active: z.boolean().optional(),
            avatarUrl: z.string().optional(),
            displayName: z.string(),
            emailAddress: z.string().optional(),
            id: z.number().int().optional(),
            links: z.object({}).optional(),
            name: z.string(),
            slug: z.string(),
            type: z.enum(['NORMAL', 'SERVICE']),
          })
          .optional(),
        updatedDate: z.number().int().optional(),
        version: z.number().int().optional(),
      }),
    )
    .optional(),
  properties: z.object({}).optional(),
  source: z
    .object({
      components: z.array(z.string()).optional(),
      extension: z.string().optional(),
      name: z.string().optional(),
      parent: z.string().optional(),
    })
    .optional(),
  truncated: z.boolean().optional(),
});

export type RestDiff = z.infer<typeof RestDiffSchema>;

export const RestDiffLineSchema = z.object({
  commentIds: z.array(z.number().int()).optional(),
  conflictMarker: z.enum(['MARKER', 'OURS', 'THEIRS']).optional(),
  destination: z.number().int().optional(),
  line: z.string().optional(),
  source: z.number().int().optional(),
  truncated: z.boolean().optional(),
});

export type RestDiffLine = z.infer<typeof RestDiffLineSchema>;

export const RestDiffHunkSchema = z.object({
  context: z.string().optional(),
  destinationLine: z.number().int().optional(),
  destinationSpan: z.number().int().optional(),
  segments: z
    .array(
      z.object({
        lines: z.array(RestDiffLineSchema).optional(),
        truncated: z.boolean().optional(),
        type: z.enum(['ADDED', 'CONTEXT', 'REMOVED']).optional(),
      }),
    )
    .optional(),
  sourceLine: z.number().int().optional(),
  sourceSpan: z.number().int().optional(),
  truncated: z.boolean().optional(),
});

export type RestDiffHunk = z.infer<typeof RestDiffHunkSchema>;

export const RestDiffStatsSummarySchema = z.object({});

export type RestDiffStatsSummary = z.infer<typeof RestDiffStatsSummarySchema>;

export const RestErasedUserSchema = z.object({
  newIdentifier: z.string().optional(),
});

export type RestErasedUser = z.infer<typeof RestErasedUserSchema>;

export const RestExportRequestSchema = z.object({
  exportLocation: z.string().optional(),
  repositoriesRequest: z.object({
    includes: z
      .array(
        z.object({
          projectKey: z.string(),
          slug: z.string(),
        }),
      )
      .refine((value) => value.length === new Set(value.map((item) => JSON.stringify(item))).size, {
        message: 'Array items must be unique',
      }),
  }),
});

export type RestExportRequest = z.infer<typeof RestExportRequestSchema>;

export const RestHookScriptSchema = z.object({
  createdDate: z.string().datetime().optional(),
  description: z.string().optional(),
  id: z.number().int().optional(),
  name: z.string().optional(),
  pluginKey: z.string().optional(),
  type: z.enum(['POST', 'PRE']).optional(),
  updatedDate: z.string().datetime().optional(),
  version: z.number().int().optional(),
});

export type RestHookScript = z.infer<typeof RestHookScriptSchema>;

export const RestHookScriptConfigSchema = z.object({
  scope: z
    .object({
      resourceId: z.number().int(),
      type: z.enum(['GLOBAL', 'PROJECT', 'REPOSITORY']),
    })
    .optional(),
  script: z
    .object({
      createdDate: z.string().datetime().optional(),
      description: z.string().optional(),
      id: z.number().int().optional(),
      name: z.string().optional(),
      pluginKey: z.string().optional(),
      type: z.enum(['POST', 'PRE']).optional(),
      updatedDate: z.string().datetime().optional(),
      version: z.number().int().optional(),
    })
    .optional(),
  triggerIds: z
    .array(z.string())
    .refine((value) => value.length === new Set(value.map((item) => JSON.stringify(item))).size, {
      message: 'Array items must be unique',
    })
    .optional(),
});

export type RestHookScriptConfig = z.infer<typeof RestHookScriptConfigSchema>;

export const RestHookScriptTriggersSchema = z.object({
  triggerIds: z
    .array(z.string())
    .refine((value) => value.length === new Set(value.map((item) => JSON.stringify(item))).size, {
      message: 'Array items must be unique',
    }),
});

export type RestHookScriptTriggers = z.infer<typeof RestHookScriptTriggersSchema>;

export const RestImportRequestSchema = z.object({
  archivePath: z.string().optional(),
});

export type RestImportRequest = z.infer<typeof RestImportRequestSchema>;

export const RestInvocationHistorySchema = z.object({});

export type RestInvocationHistory = z.infer<typeof RestInvocationHistorySchema>;

export const RestInvocationRequestSchema = z.object({});

export type RestInvocationRequest = z.infer<typeof RestInvocationRequestSchema>;

export const RestInvocationResultSchema = z.object({});

export type RestInvocationResult = z.infer<typeof RestInvocationResultSchema>;

export const RestJobSchema = z.object({
  endDate: z.number().int().optional(),
  id: z.number().int().optional(),
  initiator: z
    .object({
      active: z.boolean().optional(),
      avatarUrl: z.string().optional(),
      displayName: z.string(),
      emailAddress: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      name: z.string(),
      slug: z.string(),
      type: z.enum(['NORMAL', 'SERVICE']),
    })
    .optional(),
  nodeId: z.string().optional(),
  progress: z
    .object({
      message: z.string().optional(),
      percentage: z.number().int().optional(),
    })
    .optional(),
  startDate: z.number().int().optional(),
  state: z
    .enum([
      'INITIALISING',
      'READY',
      'RUNNING',
      'FINALISING',
      'COMPLETED',
      'FAILED',
      'CANCELING',
      'CANCELED',
      'TIMED_OUT',
      'ABORTED',
    ])
    .optional(),
  type: z.string().optional(),
  updatedDate: z.number().int().optional(),
});

export type RestJob = z.infer<typeof RestJobSchema>;

export const RestJobMessageSchema = z.object({
  createdDate: z.string().datetime().optional(),
  id: z.string().optional(),
  severity: z.enum(['INFO', 'WARN', 'ERROR']).optional(),
  subject: z.string().optional(),
  text: z.string().optional(),
});

export type RestJobMessage = z.infer<typeof RestJobMessageSchema>;

export const RestLabelSchema = z.object({
  name: z.string().optional(),
});

export type RestLabel = z.infer<typeof RestLabelSchema>;

export const RestLabelableSchema = z.object({
  archived: z.boolean().optional(),
  defaultBranch: z.string().optional(),
  description: z.string().optional(),
  forkable: z.boolean().optional(),
  hierarchyId: z.string().optional(),
  id: z.number().int().optional(),
  labelableType: z.enum(['REPOSITORY']).optional(),
  links: z.object({}).optional(),
  name: z.string().optional(),
  origin: z
    .object({
      archived: z.boolean().optional(),
      defaultBranch: z.string().optional(),
      description: z.string().optional(),
      forkable: z.boolean().optional(),
      hierarchyId: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      name: z.string().optional(),
      partition: z.number().int().optional(),
      project: z
        .object({
          avatar: z.string().optional(),
          avatarUrl: z.string().optional(),
          description: z.string().optional(),
          id: z.number().int().optional(),
          key: z.string(),
          links: z.object({}).optional(),
          name: z.string(),
          public: z.boolean().optional(),
          scope: z.string().optional(),
          type: z.enum(['NORMAL', 'PERSONAL']),
        })
        .optional(),
      public: z.boolean().optional(),
      relatedLinks: z.object({}).optional(),
      scmId: z.string().optional(),
      scope: z.string().optional(),
      slug: z.string().optional(),
      state: z.enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE']).optional(),
      statusMessage: z.string().optional(),
    })
    .optional(),
  partition: z.number().int().optional(),
  project: z
    .object({
      avatar: z.string().optional(),
      avatarUrl: z.string().optional(),
      description: z.string().optional(),
      id: z.number().int().optional(),
      key: z.string(),
      links: z.object({}).optional(),
      name: z.string(),
      public: z.boolean().optional(),
      scope: z.string().optional(),
      type: z.enum(['NORMAL', 'PERSONAL']),
    })
    .optional(),
  public: z.boolean().optional(),
  relatedLinks: z.object({}).optional(),
  scmId: z.string().optional(),
  scope: z.string().optional(),
  slug: z.string().optional(),
  state: z.enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE']).optional(),
  statusMessage: z.string().optional(),
});

export type RestLabelable = z.infer<typeof RestLabelableSchema>;

export const RestLogLevelSchema = z.object({
  logLevel: z.string().optional(),
});

export type RestLogLevel = z.infer<typeof RestLogLevelSchema>;

export const RestLoggingSettingsSchema = z.object({
  debugLoggingEnabled: z.boolean().optional(),
  profilingEnabled: z.boolean().optional(),
});

export type RestLoggingSettings = z.infer<typeof RestLoggingSettingsSchema>;

export const RestMailConfigurationSchema = z.object({
  authType: z.enum(['BASIC', 'OAUTH2']).optional(),
  hostname: z.string().optional(),
  oauth2ProviderId: z.string().optional(),
  password: z.string().optional(),
  port: z.number().int().optional(),
  protocol: z.enum(['SMTP', 'SMTPS']).optional(),
  requireStartTls: z.boolean().optional(),
  senderAddress: z.string().optional(),
  tokenId: z.string().optional(),
  useStartTls: z.boolean().optional(),
  username: z.string().optional(),
});

export type RestMailConfiguration = z.infer<typeof RestMailConfigurationSchema>;

export const RestMarkupSchema = z.object({
  html: z.string().optional(),
});

export type RestMarkup = z.infer<typeof RestMarkupSchema>;

export const RestNodeConnectivitySummarySchema = z.object({
  node: z
    .object({
      id: z.string(),
      name: z.string(),
      type: z.enum(['BITBUCKET', 'MESH']),
    })
    .optional(),
  summary: z
    .object({
      errorMessage: z.string().optional(),
      reachable: z.boolean().optional(),
      roundTripTime: z.number().int().optional(),
    })
    .optional(),
});

export type RestNodeConnectivitySummary = z.infer<typeof RestNodeConnectivitySummarySchema>;

export const RestMeshConnectivityReportSchema = z.object({
  reports: z
    .array(
      z.object({
        node: z
          .object({
            id: z.string(),
            name: z.string(),
            type: z.enum(['BITBUCKET', 'MESH']),
          })
          .optional(),
        summaries: z.array(RestNodeConnectivitySummarySchema).optional(),
      }),
    )
    .optional(),
});

export type RestMeshConnectivityReport = z.infer<typeof RestMeshConnectivityReportSchema>;

export const RestMeshMigrationQueueStateCountsSchema = z.object({});

export type RestMeshMigrationQueueStateCounts = z.infer<
  typeof RestMeshMigrationQueueStateCountsSchema
>;

export const RestMeshMigrationRequestSchema = z.object({
  all: z.boolean().optional(),
  projectIds: z
    .array(z.number().int())
    .refine((value) => value.length === new Set(value.map((item) => JSON.stringify(item))).size, {
      message: 'Array items must be unique',
    }),
  repositoryIds: z
    .array(z.number().int())
    .refine((value) => value.length === new Set(value.map((item) => JSON.stringify(item))).size, {
      message: 'Array items must be unique',
    }),
});

export type RestMeshMigrationRequest = z.infer<typeof RestMeshMigrationRequestSchema>;

export const RestMeshMigrationSummarySchema = z.object({
  endTime: z.number().int().optional(),
  jobId: z.number().int().optional(),
  progress: z.number().int().optional(),
  queue: z.object({}).optional(),
  startTime: z.number().int().optional(),
  state: z.string().optional(),
});

export type RestMeshMigrationSummary = z.infer<typeof RestMeshMigrationSummarySchema>;

export const RestMeshNodeSchema = z.object({
  availabilityZone: z.string().optional(),
  id: z.string().optional(),
  lastSeenDate: z.number().optional(),
  name: z.string().optional(),
  offline: z.boolean().optional(),
  rpcId: z.string().optional(),
  rpcUrl: z.string().optional(),
  state: z.enum(['AVAILABLE', 'DELETING', 'DISABLED', 'DRAINING', 'OFFLINE']).optional(),
});

export type RestMeshNode = z.infer<typeof RestMeshNodeSchema>;

export const RestMigrationRepositorySchema = z.object({
  migrationState: z
    .enum(['QUEUED', 'STAGING', 'STAGED', 'MIGRATED', 'FAILED', 'CANCELED', 'SKIPPED'])
    .optional(),
  repository: z
    .object({
      archived: z.boolean().optional(),
      defaultBranch: z.string().optional(),
      description: z.string().optional(),
      forkable: z.boolean().optional(),
      hierarchyId: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      name: z.string().optional(),
      origin: z
        .object({
          archived: z.boolean().optional(),
          defaultBranch: z.string().optional(),
          description: z.string().optional(),
          forkable: z.boolean().optional(),
          hierarchyId: z.string().optional(),
          id: z.number().int().optional(),
          links: z.object({}).optional(),
          name: z.string().optional(),
          partition: z.number().int().optional(),
          project: z
            .object({
              avatar: z.string().optional(),
              avatarUrl: z.string().optional(),
              description: z.string().optional(),
              id: z.number().int().optional(),
              key: z.string(),
              links: z.object({}).optional(),
              name: z.string(),
              public: z.boolean().optional(),
              scope: z.string().optional(),
              type: z.enum(['NORMAL', 'PERSONAL']),
            })
            .optional(),
          public: z.boolean().optional(),
          relatedLinks: z.object({}).optional(),
          scmId: z.string().optional(),
          scope: z.string().optional(),
          slug: z.string().optional(),
          state: z
            .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
            .optional(),
          statusMessage: z.string().optional(),
        })
        .optional(),
      partition: z.number().int().optional(),
      project: z
        .object({
          avatar: z.string().optional(),
          avatarUrl: z.string().optional(),
          description: z.string().optional(),
          id: z.number().int().optional(),
          key: z.string(),
          links: z.object({}).optional(),
          name: z.string(),
          public: z.boolean().optional(),
          scope: z.string().optional(),
          type: z.enum(['NORMAL', 'PERSONAL']),
        })
        .optional(),
      public: z.boolean().optional(),
      relatedLinks: z.object({}).optional(),
      scmId: z.string().optional(),
      scope: z.string().optional(),
      slug: z.string().optional(),
      state: z.enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE']).optional(),
      statusMessage: z.string().optional(),
    })
    .optional(),
});

export type RestMigrationRepository = z.infer<typeof RestMigrationRepositorySchema>;

export const RestNodeSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  type: z.enum(['BITBUCKET', 'MESH']).optional(),
});

export type RestNode = z.infer<typeof RestNodeSchema>;

export const RestNodeConnectivityReportSchema = z.object({
  node: z
    .object({
      id: z.string(),
      name: z.string(),
      type: z.enum(['BITBUCKET', 'MESH']),
    })
    .optional(),
  summaries: z
    .array(
      z.object({
        node: z
          .object({
            id: z.string(),
            name: z.string(),
            type: z.enum(['BITBUCKET', 'MESH']),
          })
          .optional(),
        summary: z
          .object({
            errorMessage: z.string().optional(),
            reachable: z.boolean().optional(),
            roundTripTime: z.number().int().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

export type RestNodeConnectivityReport = z.infer<typeof RestNodeConnectivityReportSchema>;

export const RestPermittedSchema = z.object({
  permitted: z.boolean().optional(),
});

export type RestPermitted = z.infer<typeof RestPermittedSchema>;

export const RestPermittedGroupSchema = z.object({
  group: z
    .object({
      name: z.string().optional(),
    })
    .optional(),
  permission: z.string().optional(),
});

export type RestPermittedGroup = z.infer<typeof RestPermittedGroupSchema>;

export const RestPermittedUserSchema = z.object({
  permission: z
    .enum([
      'USER_ADMIN',
      'PROJECT_VIEW',
      'REPO_READ',
      'REPO_WRITE',
      'REPO_ADMIN',
      'PROJECT_READ',
      'PROJECT_WRITE',
      'REPO_CREATE',
      'PROJECT_ADMIN',
      'LICENSED_USER',
      'PROJECT_CREATE',
      'ADMIN',
      'SYS_ADMIN',
    ])
    .optional(),
  user: z
    .object({
      active: z.boolean().optional(),
      avatarUrl: z.string().optional(),
      displayName: z.string(),
      emailAddress: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      name: z.string(),
      slug: z.string(),
      type: z.enum(['NORMAL', 'SERVICE']),
    })
    .optional(),
});

export type RestPermittedUser = z.infer<typeof RestPermittedUserSchema>;

export const RestProgressSchema = z.object({
  message: z.string().optional(),
  percentage: z.number().int().optional(),
});

export type RestProgress = z.infer<typeof RestProgressSchema>;

export const RestProjectSettingsRestrictionSchema = z.object({
  componentKey: z.string().optional(),
  featureKey: z.string().optional(),
  namespace: z.string().optional(),
  processedState: z.enum(['UNPROCESSED', 'PROCESSED', 'FAILED', 'IN_PROGRESS']).optional(),
  project: z
    .object({
      avatar: z.string().optional(),
      avatarUrl: z.string().optional(),
      description: z.string().optional(),
      id: z.number().int().optional(),
      key: z.string(),
      links: z.object({}).optional(),
      name: z.string(),
      public: z.boolean().optional(),
      scope: z.string().optional(),
      type: z.enum(['NORMAL', 'PERSONAL']),
    })
    .optional(),
});

export type RestProjectSettingsRestriction = z.infer<typeof RestProjectSettingsRestrictionSchema>;

export const RestProjectSettingsRestrictionRequestSchema = z.object({
  componentKey: z.string().optional(),
  featureKey: z.string(),
  namespace: z.string(),
});

export type RestProjectSettingsRestrictionRequest = z.infer<
  typeof RestProjectSettingsRestrictionRequestSchema
>;

export const RestPullRequestActivitySchema = z.object({
  action: z
    .enum([
      'APPROVED',
      'AUTO_MERGE_CANCELLED',
      'AUTO_MERGE_REQUESTED',
      'COMMENTED',
      'DECLINED',
      'DELETED',
      'MERGED',
      'OPENED',
      'REOPENED',
      'RESCOPED',
      'REVIEW_COMMENTED',
      'REVIEW_DISCARDED',
      'REVIEW_FINISHED',
      'REVIEWED',
      'UNAPPROVED',
      'UPDATED',
    ])
    .optional(),
  createdDate: z.number().int().optional(),
  id: z.number().int().optional(),
  user: z
    .object({
      active: z.boolean().optional(),
      avatarUrl: z.string().optional(),
      displayName: z.string(),
      emailAddress: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      name: z.string(),
      slug: z.string(),
      type: z.enum(['NORMAL', 'SERVICE']),
    })
    .optional(),
});

export type RestPullRequestActivity = z.infer<typeof RestPullRequestActivitySchema>;

export const RestPullRequestAssignParticipantRoleRequestSchema = z.object({
  role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional(),
  user: z
    .object({
      active: z.boolean().optional(),
      avatarUrl: z.string().optional(),
      displayName: z.string(),
      emailAddress: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      name: z.string(),
      slug: z.string(),
      type: z.enum(['NORMAL', 'SERVICE']),
    })
    .optional(),
});

export type RestPullRequestAssignParticipantRoleRequest = z.infer<
  typeof RestPullRequestAssignParticipantRoleRequestSchema
>;

export const RestPullRequestAssignStatusRequestSchema = z.object({
  lastReviewedCommit: z.string().optional(),
  status: z.enum(['UNAPPROVED', 'NEEDS_WORK', 'APPROVED']).optional(),
});

export type RestPullRequestAssignStatusRequest = z.infer<
  typeof RestPullRequestAssignStatusRequestSchema
>;

export const RestPullRequestCommitMessageTemplateSchema = z.object({
  body: z.string().optional(),
  title: z.string().optional(),
});

export type RestPullRequestCommitMessageTemplate = z.infer<
  typeof RestPullRequestCommitMessageTemplateSchema
>;

export const RestPullRequestDeclineRequestSchema = z.object({
  comment: z.string().optional(),
  version: z.number().int().optional(),
});

export type RestPullRequestDeclineRequest = z.infer<typeof RestPullRequestDeclineRequestSchema>;

export const RestPullRequestDeleteRequestSchema = z.object({
  version: z.number().int().optional(),
});

export type RestPullRequestDeleteRequest = z.infer<typeof RestPullRequestDeleteRequestSchema>;

export const RestPullRequestFinishReviewRequestSchema = z.object({
  commentText: z.string().optional(),
  lastReviewedCommit: z.string().optional(),
  participantStatus: z.string().optional(),
});

export type RestPullRequestFinishReviewRequest = z.infer<
  typeof RestPullRequestFinishReviewRequestSchema
>;

export const RestPullRequestMergeConfigSchema = z.object({
  commitMessageTemplate: z
    .object({
      body: z.string(),
      title: z.string(),
    })
    .optional(),
  commitSummaries: z.number().int().optional(),
  defaultStrategy: z
    .object({
      description: z.string().optional(),
      enabled: z.boolean().optional(),
      flag: z.string(),
      id: z.string().optional(),
      links: z.object({}).optional(),
      name: z.string().optional(),
    })
    .optional(),
  strategies: z
    .array(
      z.object({
        description: z.string().optional(),
        enabled: z.boolean().optional(),
        flag: z.string().optional(),
        id: z.string().optional(),
        links: z.object({}).optional(),
        name: z.string().optional(),
      }),
    )
    .optional(),
  type: z.string().optional(),
});

export type RestPullRequestMergeConfig = z.infer<typeof RestPullRequestMergeConfigSchema>;

export const RestPullRequestMergeRequestSchema = z.object({
  autoMerge: z.boolean().optional(),
  autoSubject: z.string().optional(),
  message: z.string().optional(),
  strategyId: z.string().optional(),
  version: z.number().int().optional(),
});

export type RestPullRequestMergeRequest = z.infer<typeof RestPullRequestMergeRequestSchema>;

export const RestPullRequestMergeStrategySchema = z.object({
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  flag: z.string().optional(),
  id: z.string().optional(),
  links: z.object({}).optional(),
  name: z.string().optional(),
});

export type RestPullRequestMergeStrategy = z.infer<typeof RestPullRequestMergeStrategySchema>;

export const RestPullRequestMergeabilitySchema = z.object({
  conflicted: z.boolean().optional(),
  outcome: z.enum(['CLEAN', 'CONFLICTED', 'UNKNOWN']).optional(),
  vetoes: z
    .array(
      z.object({
        detailedMessage: z.string().optional(),
        summaryMessage: z.string().optional(),
      }),
    )
    .optional(),
});

export type RestPullRequestMergeability = z.infer<typeof RestPullRequestMergeabilitySchema>;

export const RestPullRequestReopenRequestSchema = z.object({
  version: z.number().int().optional(),
});

export type RestPullRequestReopenRequest = z.infer<typeof RestPullRequestReopenRequestSchema>;

export const RestPullRequestSettingsSchema = z.object({
  mergeConfig: z
    .object({
      commitMessageTemplate: z
        .object({
          body: z.string(),
          title: z.string(),
        })
        .optional(),
      commitSummaries: z.number().int().optional(),
      defaultStrategy: z
        .object({
          description: z.string().optional(),
          enabled: z.boolean().optional(),
          flag: z.string(),
          id: z.string().optional(),
          links: z.object({}).optional(),
          name: z.string().optional(),
        })
        .optional(),
      strategies: z.array(
        z.object({
          description: z.string().optional(),
          enabled: z.boolean().optional(),
          flag: z.string().optional(),
          id: z.string().optional(),
          links: z.object({}).optional(),
          name: z.string().optional(),
        }),
      ),
      type: z.string().optional(),
    })
    .optional(),
});

export type RestPullRequestSettings = z.infer<typeof RestPullRequestSettingsSchema>;

export const RestPullRequestSuggestionSchema = z.object({
  changeTme: z.number().int().optional(),
  fromRef: z
    .object({
      displayId: z.string(),
      id: z.string(),
      type: z.enum(['BRANCH', 'TAG']),
    })
    .optional(),
  refChange: z
    .object({
      fromHash: z.string().optional(),
      ref: z
        .object({
          displayId: z.string(),
          id: z.string(),
          type: z.enum(['BRANCH', 'TAG']),
        })
        .optional(),
      refId: z.string().optional(),
      toHash: z.string().optional(),
      type: z.enum(['ADD', 'DELETE', 'UPDATE']).optional(),
    })
    .optional(),
  repository: z
    .object({
      archived: z.boolean().optional(),
      defaultBranch: z.string().optional(),
      description: z.string().optional(),
      forkable: z.boolean().optional(),
      hierarchyId: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      name: z.string().optional(),
      origin: z
        .object({
          archived: z.boolean().optional(),
          defaultBranch: z.string().optional(),
          description: z.string().optional(),
          forkable: z.boolean().optional(),
          hierarchyId: z.string().optional(),
          id: z.number().int().optional(),
          links: z.object({}).optional(),
          name: z.string().optional(),
          partition: z.number().int().optional(),
          project: z
            .object({
              avatar: z.string().optional(),
              avatarUrl: z.string().optional(),
              description: z.string().optional(),
              id: z.number().int().optional(),
              key: z.string(),
              links: z.object({}).optional(),
              name: z.string(),
              public: z.boolean().optional(),
              scope: z.string().optional(),
              type: z.enum(['NORMAL', 'PERSONAL']),
            })
            .optional(),
          public: z.boolean().optional(),
          relatedLinks: z.object({}).optional(),
          scmId: z.string().optional(),
          scope: z.string().optional(),
          slug: z.string().optional(),
          state: z
            .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
            .optional(),
          statusMessage: z.string().optional(),
        })
        .optional(),
      partition: z.number().int().optional(),
      project: z
        .object({
          avatar: z.string().optional(),
          avatarUrl: z.string().optional(),
          description: z.string().optional(),
          id: z.number().int().optional(),
          key: z.string(),
          links: z.object({}).optional(),
          name: z.string(),
          public: z.boolean().optional(),
          scope: z.string().optional(),
          type: z.enum(['NORMAL', 'PERSONAL']),
        })
        .optional(),
      public: z.boolean().optional(),
      relatedLinks: z.object({}).optional(),
      scmId: z.string().optional(),
      scope: z.string().optional(),
      slug: z.string().optional(),
      state: z.enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE']).optional(),
      statusMessage: z.string().optional(),
    })
    .optional(),
  toRef: z
    .object({
      displayId: z.string(),
      id: z.string(),
      type: z.enum(['BRANCH', 'TAG']),
    })
    .optional(),
});

export type RestPullRequestSuggestion = z.infer<typeof RestPullRequestSuggestionSchema>;

export const RestPushRefChangeSchema = z.object({
  fromHash: z.string().optional(),
  ref: z
    .object({
      displayId: z.string(),
      id: z.string(),
      type: z.enum(['BRANCH', 'TAG']),
    })
    .optional(),
  refId: z.string().optional(),
  toHash: z.string().optional(),
  type: z.enum(['ADD', 'DELETE', 'UPDATE']).optional(),
  updatedType: z.enum(['UNKNOWN', 'UNRESOLVED', 'NOT_FORCED', 'FORCED']).optional(),
});

export type RestPushRefChange = z.infer<typeof RestPushRefChangeSchema>;

export const RestRateLimitSettingsSchema = z.object({
  defaultSettings: z
    .object({
      capacity: z.number().int().optional(),
      fillRate: z.number().int().optional(),
    })
    .optional(),
  enabled: z.boolean().optional(),
});

export type RestRateLimitSettings = z.infer<typeof RestRateLimitSettingsSchema>;

export const RestRepositoriesExportRequestSchema = z.object({
  includes: z
    .array(
      z.object({
        projectKey: z.string(),
        slug: z.string(),
      }),
    )
    .refine((value) => value.length === new Set(value.map((item) => JSON.stringify(item))).size, {
      message: 'Array items must be unique',
    }),
});

export type RestRepositoriesExportRequest = z.infer<typeof RestRepositoriesExportRequestSchema>;

export const RestRepositoryHookSchema = z.object({
  configured: z.boolean().optional(),
  details: z
    .object({
      configFormKey: z.string().optional(),
      configFormView: z.string().optional(),
      description: z.string().optional(),
      key: z.string().optional(),
      name: z.string().optional(),
      supportedScopes: z
        .array(z.enum(['GLOBAL', 'PROJECT', 'REPOSITORY']))
        .refine(
          (value) => value.length === new Set(value.map((item) => JSON.stringify(item))).size,
          { message: 'Array items must be unique' },
        )
        .optional(),
      type: z.enum(['PRE_RECEIVE', 'PRE_PULL_REQUEST_MERGE', 'POST_RECEIVE']).optional(),
      version: z.string().optional(),
    })
    .optional(),
  enabled: z.boolean().optional(),
  scope: z
    .object({
      resourceId: z.number().int(),
      type: z.enum(['GLOBAL', 'PROJECT', 'REPOSITORY']),
    })
    .optional(),
});

export type RestRepositoryHook = z.infer<typeof RestRepositoryHookSchema>;

export const RestRepositoryPullRequestSettingsSchema = z.object({
  mergeConfig: z
    .object({
      commitMessageTemplate: z
        .object({
          body: z.string(),
          title: z.string(),
        })
        .optional(),
      commitSummaries: z.number().int().optional(),
      defaultStrategy: z
        .object({
          description: z.string().optional(),
          enabled: z.boolean().optional(),
          flag: z.string(),
          id: z.string().optional(),
          links: z.object({}).optional(),
          name: z.string().optional(),
        })
        .optional(),
      strategies: z.array(
        z.object({
          description: z.string().optional(),
          enabled: z.boolean().optional(),
          flag: z.string().optional(),
          id: z.string().optional(),
          links: z.object({}).optional(),
          name: z.string().optional(),
        }),
      ),
      type: z.string().optional(),
    })
    .optional(),
  requiredAllApprovers: z.boolean().optional(),
  requiredAllTasksComplete: z.boolean().optional(),
  requiredApprovers: z
    .object({
      count: z.string().optional(),
      enabled: z.boolean().optional(),
    })
    .optional(),
  requiredApproversDeprecated: z.number().int().optional(),
  requiredSuccessfulBuilds: z
    .object({
      count: z.string().optional(),
      enabled: z.boolean().optional(),
    })
    .optional(),
  requiredSuccessfulBuildsDeprecated: z.number().int().optional(),
});

export type RestRepositoryPullRequestSettings = z.infer<
  typeof RestRepositoryPullRequestSettingsSchema
>;

export const RestRepositoryRefChangeActivitySchema = z.object({
  createdDate: z.number().int().optional(),
  id: z.number().int().optional(),
  refChange: z
    .object({
      fromHash: z.string().optional(),
      ref: z
        .object({
          displayId: z.string(),
          id: z.string(),
          type: z.enum(['BRANCH', 'TAG']),
        })
        .optional(),
      refId: z.string().optional(),
      toHash: z.string().optional(),
      type: z.enum(['ADD', 'DELETE', 'UPDATE']).optional(),
      updatedType: z.enum(['UNKNOWN', 'UNRESOLVED', 'NOT_FORCED', 'FORCED']).optional(),
    })
    .optional(),
  repository: z
    .object({
      archived: z.boolean().optional(),
      defaultBranch: z.string().optional(),
      description: z.string().optional(),
      forkable: z.boolean().optional(),
      hierarchyId: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      name: z.string().optional(),
      origin: z
        .object({
          archived: z.boolean().optional(),
          defaultBranch: z.string().optional(),
          description: z.string().optional(),
          forkable: z.boolean().optional(),
          hierarchyId: z.string().optional(),
          id: z.number().int().optional(),
          links: z.object({}).optional(),
          name: z.string().optional(),
          partition: z.number().int().optional(),
          project: z
            .object({
              avatar: z.string().optional(),
              avatarUrl: z.string().optional(),
              description: z.string().optional(),
              id: z.number().int().optional(),
              key: z.string(),
              links: z.object({}).optional(),
              name: z.string(),
              public: z.boolean().optional(),
              scope: z.string().optional(),
              type: z.enum(['NORMAL', 'PERSONAL']),
            })
            .optional(),
          public: z.boolean().optional(),
          relatedLinks: z.object({}).optional(),
          scmId: z.string().optional(),
          scope: z.string().optional(),
          slug: z.string().optional(),
          state: z
            .enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE'])
            .optional(),
          statusMessage: z.string().optional(),
        })
        .optional(),
      partition: z.number().int().optional(),
      project: z
        .object({
          avatar: z.string().optional(),
          avatarUrl: z.string().optional(),
          description: z.string().optional(),
          id: z.number().int().optional(),
          key: z.string(),
          links: z.object({}).optional(),
          name: z.string(),
          public: z.boolean().optional(),
          scope: z.string().optional(),
          type: z.enum(['NORMAL', 'PERSONAL']),
        })
        .optional(),
      public: z.boolean().optional(),
      relatedLinks: z.object({}).optional(),
      scmId: z.string().optional(),
      scope: z.string().optional(),
      slug: z.string().optional(),
      state: z.enum(['AVAILABLE', 'INITIALISATION_FAILED', 'INITIALISING', 'OFFLINE']).optional(),
      statusMessage: z.string().optional(),
    })
    .optional(),
  trigger: z.string().optional(),
  user: z
    .object({
      active: z.boolean().optional(),
      avatarUrl: z.string().optional(),
      displayName: z.string(),
      emailAddress: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      name: z.string(),
      slug: z.string(),
      type: z.enum(['NORMAL', 'SERVICE']),
    })
    .optional(),
});

export type RestRepositoryRefChangeActivity = z.infer<typeof RestRepositoryRefChangeActivitySchema>;

export const RestScopesExampleSchema = z.object({
  links: z.object({}).optional(),
  scopes: z.array(z.object({})).optional(),
});

export type RestScopesExample = z.infer<typeof RestScopesExampleSchema>;

export const RestSecretScanningAllowlistRuleSchema = z.object({
  id: z.number().int().optional(),
  lineRegex: z.string().optional(),
  name: z.string().optional(),
  pathRegex: z.string().optional(),
});

export type RestSecretScanningAllowlistRule = z.infer<typeof RestSecretScanningAllowlistRuleSchema>;

export const RestSecretScanningAllowlistRuleSetRequestSchema = z.object({
  lineRegex: z.string().optional(),
  name: z.string().optional(),
  pathRegex: z.string().optional(),
});

export type RestSecretScanningAllowlistRuleSetRequest = z.infer<
  typeof RestSecretScanningAllowlistRuleSetRequestSchema
>;

export const RestSecretScanningRuleSchema = z.object({
  id: z.number().int().optional(),
  lineRegex: z.string().optional(),
  name: z.string().optional(),
  pathRegex: z.string().optional(),
  scope: z
    .object({
      resourceId: z.number().int(),
      type: z.enum(['GLOBAL', 'PROJECT', 'REPOSITORY']),
    })
    .optional(),
});

export type RestSecretScanningRule = z.infer<typeof RestSecretScanningRuleSchema>;

export const RestSecretScanningRuleSetRequestSchema = z.object({
  lineRegex: z.string().optional(),
  name: z.string().optional(),
  pathRegex: z.string().optional(),
});

export type RestSecretScanningRuleSetRequest = z.infer<
  typeof RestSecretScanningRuleSetRequestSchema
>;

export const RestSystemSigningConfigurationSchema = z.object({
  enabled: z.boolean().optional(),
});

export type RestSystemSigningConfiguration = z.infer<typeof RestSystemSigningConfigurationSchema>;

export const RestTestResultsSchema = z.object({
  failed: z.number().int().optional(),
  skipped: z.number().int().optional(),
  successful: z.number().int().optional(),
});

export type RestTestResults = z.infer<typeof RestTestResultsSchema>;

export const RestTokenBucketSettingsSchema = z.object({
  capacity: z.number().int().optional(),
  fillRate: z.number().int().optional(),
});

export type RestTokenBucketSettings = z.infer<typeof RestTokenBucketSettingsSchema>;

export const RestUserDirectorySchema = z.object({
  active: z.boolean().optional(),
  description: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
});

export type RestUserDirectory = z.infer<typeof RestUserDirectorySchema>;

export const RestUserRateLimitSettingsSchema = z.object({
  settings: z
    .object({
      capacity: z.number().int().optional(),
      fillRate: z.number().int().optional(),
    })
    .optional(),
  user: z
    .object({
      active: z.boolean().optional(),
      avatarUrl: z.string().optional(),
      displayName: z.string(),
      emailAddress: z.string().optional(),
      id: z.number().int().optional(),
      links: z.object({}).optional(),
      name: z.string(),
      slug: z.string(),
      type: z.enum(['NORMAL', 'SERVICE']),
    })
    .optional(),
  whitelisted: z.boolean().optional(),
});

export type RestUserRateLimitSettings = z.infer<typeof RestUserRateLimitSettingsSchema>;

export const RestUserRateLimitSettingsUpdateRequestSchema = z.object({
  settings: z
    .object({
      capacity: z.number().int().optional(),
      fillRate: z.number().int().optional(),
    })
    .optional(),
  whitelisted: z.boolean().optional(),
});

export type RestUserRateLimitSettingsUpdateRequest = z.infer<
  typeof RestUserRateLimitSettingsUpdateRequestSchema
>;

export const RestWebhookSchema = z.object({
  active: z.boolean().optional(),
  configuration: z.object({}).optional(),
  credentials: z
    .object({
      password: z.string().optional(),
      username: z.string().optional(),
    })
    .optional(),
  events: z
    .array(z.string())
    .refine((value) => value.length === new Set(value.map((item) => JSON.stringify(item))).size, {
      message: 'Array items must be unique',
    })
    .optional(),
  name: z.string().optional(),
  scopeType: z.string().optional(),
  sslVerificationRequired: z.boolean().optional(),
  statistics: z.object({}).optional(),
  url: z.string().optional(),
});

export type RestWebhook = z.infer<typeof RestWebhookSchema>;

export const RestWebhookCredentialsSchema = z.object({
  password: z.string().optional(),
  username: z.string().optional(),
});

export type RestWebhookCredentials = z.infer<typeof RestWebhookCredentialsSchema>;

export const RestWebhookRequestResponseSchema = z.object({});

export type RestWebhookRequestResponse = z.infer<typeof RestWebhookRequestResponseSchema>;

export const RestWebhookScopeSchema = z.object({
  id: z.string().optional(),
  type: z.string().optional(),
});

export type RestWebhookScope = z.infer<typeof RestWebhookScopeSchema>;

export const RestX509CertificateSchema = z.object({
  fingerprint: z.string().optional(),
  id: z.number().int().optional(),
});

export type RestX509Certificate = z.infer<typeof RestX509CertificateSchema>;

export const UserAndGroupsSchema = z.object({
  groups: z
    .array(z.string())
    .refine((value) => value.length === new Set(value.map((item) => JSON.stringify(item))).size, {
      message: 'Array items must be unique',
    }),
  user: z.string().optional(),
});

export type UserAndGroups = z.infer<typeof UserAndGroupsSchema>;

export const UserPasswordUpdateSchema = z.object({
  oldPassword: z.string().optional(),
  password: z.string().optional(),
  passwordConfirm: z.string().optional(),
});

export type UserPasswordUpdate = z.infer<typeof UserPasswordUpdateSchema>;

export const UserPickerContextSchema = z.object({
  context: z.string().optional(),
  itemName: z.string().optional(),
});

export type UserPickerContext = z.infer<typeof UserPickerContextSchema>;

export const UserRenameSchema = z.object({
  name: z.string().optional(),
  newName: z.string().optional(),
});

export type UserRename = z.infer<typeof UserRenameSchema>;

export const UserUpdateSchema = z.object({
  displayName: z.string().optional(),
  email: z.string().optional(),
  name: z.string().optional(),
});

export type UserUpdate = z.infer<typeof UserUpdateSchema>;

export const UserUpdateWithCredentialsSchema = z.object({
  displayName: z.string().optional(),
  email: z.string().optional(),
  name: z.string().optional(),
  password: z.string().optional(),
});

export type UserUpdateWithCredentials = z.infer<typeof UserUpdateWithCredentialsSchema>;
