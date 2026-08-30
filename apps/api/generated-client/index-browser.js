
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.BrandScalarFieldEnum = {
  id: 'id',
  name: 'name',
  level: 'level',
  productDesign: 'productDesign',
  logo: 'logo',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  brandId: 'brandId',
  name: 'name',
  userInputFieldName: 'userInputFieldName',
  orderInstructionsLink: 'orderInstructionsLink',
  salePrice: 'salePrice',
  buyPrice: 'buyPrice',
  quantity: 'quantity',
  productType: 'productType',
  accessType: 'accessType',
  logo: 'logo',
  secondaryType: 'secondaryType',
  level: 'level',
  isAuto: 'isAuto',
  isActive: 'isActive',
  productNote: 'productNote',
  slug: 'slug',
  gameCheaterType: 'gameCheaterType',
  hasOrderTimeLimit: 'hasOrderTimeLimit',
  maxOrdersPerWindow: 'maxOrdersPerWindow',
  orderWindowHours: 'orderWindowHours',
  checkUniquePlayerId: 'checkUniquePlayerId',
  isQuantityMinusOnOrder: 'isQuantityMinusOnOrder',
  isQuantityShowUser: 'isQuantityShowUser',
  isPremiumProduct: 'isPremiumProduct',
  minAmountForPremium: 'minAmountForPremium',
  removeCharacters: 'removeCharacters',
  redeemLink: 'redeemLink',
  isResellerProduct: 'isResellerProduct',
  isMysteryBox: 'isMysteryBox',
  description: 'description',
  packageDesign: 'packageDesign',
  serviceId: 'serviceId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PackageScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  name: 'name',
  amount: 'amount',
  salePrice: 'salePrice',
  buyPrice: 'buyPrice',
  commonPriceUsd: 'commonPriceUsd',
  extraFee: 'extraFee',
  level: 'level',
  isAuto: 'isAuto',
  isManual: 'isManual',
  server: 'server',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StockPoolScalarFieldEnum = {
  id: 'id',
  name: 'name',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PackageStockPoolScalarFieldEnum = {
  packageId: 'packageId',
  poolId: 'poolId',
  createdAt: 'createdAt'
};

exports.Prisma.StockCodeScalarFieldEnum = {
  id: 'id',
  poolId: 'poolId',
  codeCiphertext: 'codeCiphertext',
  status: 'status',
  orderId: 'orderId',
  consumedAt: 'consumedAt',
  createdAt: 'createdAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  username: 'username',
  email: 'email',
  passwordHash: 'passwordHash',
  role: 'role',
  status: 'status',
  googleId: 'googleId',
  avatarUrl: 'avatarUrl',
  twoFactorSecret: 'twoFactorSecret',
  twoFactorEnabled: 'twoFactorEnabled',
  apiKeyHash: 'apiKeyHash',
  apiKeyPrefix: 'apiKeyPrefix',
  apiKeyCreatedAt: 'apiKeyCreatedAt',
  isVip: 'isVip',
  phone: 'phone',
  notifyEmail: 'notifyEmail',
  notifyOrderUpdates: 'notifyOrderUpdates',
  notifyPromotions: 'notifyPromotions',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PasswordResetTokenScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  tokenHash: 'tokenHash',
  expiresAt: 'expiresAt',
  usedAt: 'usedAt',
  createdAt: 'createdAt'
};

exports.Prisma.RefreshTokenScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  tokenHash: 'tokenHash',
  expiresAt: 'expiresAt',
  revokedAt: 'revokedAt',
  replacedById: 'replacedById',
  createdByIp: 'createdByIp',
  userAgent: 'userAgent',
  createdAt: 'createdAt'
};

exports.Prisma.WalletScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  balance: 'balance',
  currency: 'currency',
  updatedAt: 'updatedAt'
};

exports.Prisma.WalletTransactionScalarFieldEnum = {
  id: 'id',
  walletId: 'walletId',
  type: 'type',
  amount: 'amount',
  balanceAfter: 'balanceAfter',
  referenceType: 'referenceType',
  referenceId: 'referenceId',
  note: 'note',
  createdAt: 'createdAt'
};

exports.Prisma.IdempotencyKeyScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  key: 'key',
  requestHash: 'requestHash',
  responseJson: 'responseJson',
  createdAt: 'createdAt'
};

exports.Prisma.ProviderScalarFieldEnum = {
  id: 'id',
  name: 'name',
  apiUrl: 'apiUrl',
  apiKeyCiphertext: 'apiKeyCiphertext',
  balance: 'balance',
  status: 'status',
  lastSyncAt: 'lastSyncAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProviderSyncLogScalarFieldEnum = {
  id: 'id',
  providerId: 'providerId',
  action: 'action',
  status: 'status',
  message: 'message',
  createdAt: 'createdAt'
};

exports.Prisma.PaymentGatewayConfigScalarFieldEnum = {
  id: 'id',
  provider: 'provider',
  mode: 'mode',
  credentialsCiphertext: 'credentialsCiphertext',
  enabled: 'enabled',
  autoVerify: 'autoVerify',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentMethodScalarFieldEnum = {
  id: 'id',
  title: 'title',
  gatewayType: 'gatewayType',
  accountType: 'accountType',
  accountNumber: 'accountNumber',
  instructions: 'instructions',
  minAmount: 'minAmount',
  maxAmount: 'maxAmount',
  bonusPercent: 'bonusPercent',
  gatewayProvider: 'gatewayProvider',
  status: 'status',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServiceCategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  platform: 'platform',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt'
};

exports.Prisma.ServiceScalarFieldEnum = {
  id: 'id',
  categoryId: 'categoryId',
  providerId: 'providerId',
  providerServiceId: 'providerServiceId',
  backupProviderId: 'backupProviderId',
  name: 'name',
  description: 'description',
  nameBn: 'nameBn',
  descriptionBn: 'descriptionBn',
  sellPricePer1000: 'sellPricePer1000',
  providerCostPer1000: 'providerCostPer1000',
  minQuantity: 'minQuantity',
  maxQuantity: 'maxQuantity',
  refillEnabled: 'refillEnabled',
  cancelEnabled: 'cancelEnabled',
  status: 'status',
  autoSubmit: 'autoSubmit',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  serviceId: 'serviceId',
  packageId: 'packageId',
  link: 'link',
  quantity: 'quantity',
  charge: 'charge',
  providerCost: 'providerCost',
  startCount: 'startCount',
  remains: 'remains',
  status: 'status',
  mode: 'mode',
  providerOrderId: 'providerOrderId',
  priority: 'priority',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderIntentScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  serviceId: 'serviceId',
  link: 'link',
  quantity: 'quantity',
  charge: 'charge',
  idempotencyKey: 'idempotencyKey',
  status: 'status',
  orderId: 'orderId',
  failureReason: 'failureReason',
  createdAt: 'createdAt',
  expiresAt: 'expiresAt'
};

exports.Prisma.RefillRequestScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  providerRefillId: 'providerRefillId',
  status: 'status',
  note: 'note',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TicketCategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  isAutomated: 'isAutomated',
  enabled: 'enabled',
  sortOrder: 'sortOrder'
};

exports.Prisma.TicketSubcategoryScalarFieldEnum = {
  id: 'id',
  categoryId: 'categoryId',
  name: 'name',
  actionKey: 'actionKey',
  enabled: 'enabled',
  sortOrder: 'sortOrder'
};

exports.Prisma.TicketScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  categoryId: 'categoryId',
  subcategoryId: 'subcategoryId',
  subject: 'subject',
  status: 'status',
  orderIds: 'orderIds',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TicketMessageScalarFieldEnum = {
  id: 'id',
  ticketId: 'ticketId',
  senderId: 'senderId',
  senderRole: 'senderRole',
  body: 'body',
  createdAt: 'createdAt'
};

exports.Prisma.TicketOrderActionScalarFieldEnum = {
  id: 'id',
  ticketId: 'ticketId',
  orderId: 'orderId',
  actionKey: 'actionKey',
  result: 'result',
  detail: 'detail',
  createdAt: 'createdAt'
};

exports.Prisma.DepositScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  method: 'method',
  amount: 'amount',
  reference: 'reference',
  status: 'status',
  reviewedById: 'reviewedById',
  reviewNote: 'reviewNote',
  createdAt: 'createdAt',
  reviewedAt: 'reviewedAt',
  gatewayProvider: 'gatewayProvider',
  gatewayRef: 'gatewayRef',
  gatewayAmount: 'gatewayAmount',
  gatewayCurrency: 'gatewayCurrency',
  paymentMethodId: 'paymentMethodId',
  orderIntentId: 'orderIntentId',
  trxId: 'trxId',
  senderNumber: 'senderNumber',
  bonusAmount: 'bonusAmount',
  couponId: 'couponId'
};

exports.Prisma.AdminAuditLogScalarFieldEnum = {
  id: 'id',
  actorId: 'actorId',
  action: 'action',
  targetType: 'targetType',
  targetId: 'targetId',
  beforeJson: 'beforeJson',
  afterJson: 'afterJson',
  ip: 'ip',
  createdAt: 'createdAt'
};

exports.Prisma.DripFeedScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  serviceId: 'serviceId',
  link: 'link',
  totalCharge: 'totalCharge',
  quantity: 'quantity',
  runs: 'runs',
  interval: 'interval',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.AffiliateScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  code: 'code',
  commissionRate: 'commissionRate',
  visits: 'visits',
  registrations: 'registrations',
  totalEarnings: 'totalEarnings',
  availableEarnings: 'availableEarnings',
  createdAt: 'createdAt'
};

exports.Prisma.ChildPanelScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  domain: 'domain',
  currency: 'currency',
  adminUsername: 'adminUsername',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.CouponScalarFieldEnum = {
  id: 'id',
  code: 'code',
  type: 'type',
  value: 'value',
  maxUses: 'maxUses',
  usedCount: 'usedCount',
  expiresAt: 'expiresAt',
  active: 'active',
  createdAt: 'createdAt'
};

exports.Prisma.CouponRedemptionScalarFieldEnum = {
  id: 'id',
  couponId: 'couponId',
  userId: 'userId',
  amount: 'amount',
  createdAt: 'createdAt'
};

exports.Prisma.SiteSettingsScalarFieldEnum = {
  id: 'id',
  siteName: 'siteName',
  whatsappEnabled: 'whatsappEnabled',
  whatsappNumber: 'whatsappNumber',
  liveChatProvider: 'liveChatProvider',
  liveChatWidgetId: 'liveChatWidgetId',
  howToOrderVideoUrl: 'howToOrderVideoUrl',
  usdToBdtRate: 'usdToBdtRate',
  defaultCurrency: 'defaultCurrency',
  smtpEnabled: 'smtpEnabled',
  smtpHost: 'smtpHost',
  smtpPort: 'smtpPort',
  smtpUser: 'smtpUser',
  smtpPassCiphertext: 'smtpPassCiphertext',
  smtpFromAddress: 'smtpFromAddress',
  updatedAt: 'updatedAt'
};

exports.Prisma.SupportChannelScalarFieldEnum = {
  type: 'type',
  enabled: 'enabled',
  value: 'value',
  label: 'label',
  sortOrder: 'sortOrder',
  updatedAt: 'updatedAt'
};

exports.Prisma.NoticeScalarFieldEnum = {
  id: 'id',
  messageBn: 'messageBn',
  messageEn: 'messageEn',
  level: 'level',
  active: 'active',
  startsAt: 'startsAt',
  endsAt: 'endsAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SiteNoticeScalarFieldEnum = {
  id: 'id',
  titleBn: 'titleBn',
  titleEn: 'titleEn',
  bodyBn: 'bodyBn',
  bodyEn: 'bodyEn',
  isActive: 'isActive',
  updatedAt: 'updatedAt'
};

exports.Prisma.BannerScalarFieldEnum = {
  id: 'id',
  link: 'link',
  image: 'image',
  order: 'order',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PostScalarFieldEnum = {
  id: 'id',
  slug: 'slug',
  category: 'category',
  status: 'status',
  coverImage: 'coverImage',
  youtubeVideoId: 'youtubeVideoId',
  pdfFile: 'pdfFile',
  pdfName: 'pdfName',
  titleEn: 'titleEn',
  titleBn: 'titleBn',
  contentEn: 'contentEn',
  contentBn: 'contentBn',
  publishedAt: 'publishedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.ProductDesignTemplate = exports.$Enums.ProductDesignTemplate = {
  SMALL_STRIP: 'SMALL_STRIP',
  STANDARD_GRID: 'STANDARD_GRID',
  FEATURED_LARGE: 'FEATURED_LARGE'
};

exports.ProductType = exports.$Enums.ProductType = {
  TOPUP: 'TOPUP',
  VOUCHER: 'VOUCHER',
  SMM: 'SMM',
  SUBSCRIPTION: 'SUBSCRIPTION'
};

exports.AccessType = exports.$Enums.AccessType = {
  ALL: 'ALL',
  VIP: 'VIP',
  RESELLER: 'RESELLER'
};

exports.PackageDesignTemplate = exports.$Enums.PackageDesignTemplate = {
  RADIO_LIST: 'RADIO_LIST',
  BOXED_GRID: 'BOXED_GRID'
};

exports.StockCodeStatus = exports.$Enums.StockCodeStatus = {
  AVAILABLE: 'AVAILABLE',
  CONSUMED: 'CONSUMED',
  REVOKED: 'REVOKED'
};

exports.Role = exports.$Enums.Role = {
  USER: 'USER',
  STAFF: 'STAFF',
  ADMIN: 'ADMIN'
};

exports.UserStatus = exports.$Enums.UserStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED'
};

exports.WalletTxType = exports.$Enums.WalletTxType = {
  DEPOSIT: 'DEPOSIT',
  DEPOSIT_BONUS: 'DEPOSIT_BONUS',
  ORDER_DEBIT: 'ORDER_DEBIT',
  ORDER_REFUND: 'ORDER_REFUND',
  ADMIN_ADJUSTMENT: 'ADMIN_ADJUSTMENT',
  AFFILIATE_PAYOUT: 'AFFILIATE_PAYOUT',
  CHILD_PANEL_FEE: 'CHILD_PANEL_FEE'
};

exports.ProviderStatus = exports.$Enums.ProviderStatus = {
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED'
};

exports.PaymentGatewayMode = exports.$Enums.PaymentGatewayMode = {
  SANDBOX: 'SANDBOX',
  LIVE: 'LIVE'
};

exports.PaymentMethodGatewayType = exports.$Enums.PaymentMethodGatewayType = {
  AUTOMATED: 'AUTOMATED',
  MANUAL: 'MANUAL'
};

exports.PaymentMethodAccountType = exports.$Enums.PaymentMethodAccountType = {
  PERSONAL: 'PERSONAL',
  MERCHANT: 'MERCHANT',
  AGENT: 'AGENT'
};

exports.PaymentMethodStatus = exports.$Enums.PaymentMethodStatus = {
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED'
};

exports.ServiceStatus = exports.$Enums.ServiceStatus = {
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED'
};

exports.OrderStatus = exports.$Enums.OrderStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  PARTIAL: 'PARTIAL',
  CANCELED: 'CANCELED',
  FAILED: 'FAILED'
};

exports.OrderMode = exports.$Enums.OrderMode = {
  AUTO: 'AUTO',
  MANUAL: 'MANUAL'
};

exports.OrderIntentStatus = exports.$Enums.OrderIntentStatus = {
  PENDING: 'PENDING',
  FULFILLED: 'FULFILLED',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED'
};

exports.RefillStatus = exports.$Enums.RefillStatus = {
  REQUESTED: 'REQUESTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED'
};

exports.TicketActionKey = exports.$Enums.TicketActionKey = {
  REFILL: 'REFILL',
  CANCEL: 'CANCEL',
  SPEED_UP: 'SPEED_UP',
  RESTART: 'RESTART',
  FAKE_COMPLETE: 'FAKE_COMPLETE',
  OTHER: 'OTHER'
};

exports.TicketStatus = exports.$Enums.TicketStatus = {
  OPEN: 'OPEN',
  PENDING_ADMIN: 'PENDING_ADMIN',
  PENDING_USER: 'PENDING_USER',
  CLOSED: 'CLOSED',
  AI_PROCESSING: 'AI_PROCESSING',
  RESOLVED: 'RESOLVED',
  ESCALATED: 'ESCALATED',
  IN_PROGRESS: 'IN_PROGRESS',
  REPLIED: 'REPLIED'
};

exports.TicketSender = exports.$Enums.TicketSender = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  SYSTEM: 'SYSTEM'
};

exports.TicketOrderActionResult = exports.$Enums.TicketOrderActionResult = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
  ESCALATED: 'ESCALATED',
  PENDING: 'PENDING'
};

exports.DepositStatus = exports.$Enums.DepositStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

exports.ChildPanelStatus = exports.$Enums.ChildPanelStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED'
};

exports.CouponType = exports.$Enums.CouponType = {
  PERCENT: 'PERCENT',
  FIXED: 'FIXED'
};

exports.LiveChatProvider = exports.$Enums.LiveChatProvider = {
  NONE: 'NONE',
  TAWKTO: 'TAWKTO',
  CRISP: 'CRISP'
};

exports.DisplayCurrency = exports.$Enums.DisplayCurrency = {
  USD: 'USD',
  BDT: 'BDT'
};

exports.SupportChannelType = exports.$Enums.SupportChannelType = {
  WHATSAPP: 'WHATSAPP',
  TELEGRAM: 'TELEGRAM',
  MESSENGER: 'MESSENGER',
  CUSTOM: 'CUSTOM',
  TICKET: 'TICKET'
};

exports.NoticeLevel = exports.$Enums.NoticeLevel = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR'
};

exports.PostCategory = exports.$Enums.PostCategory = {
  DOCUMENTATION: 'DOCUMENTATION',
  BLOG: 'BLOG',
  UPDATE: 'UPDATE'
};

exports.PostStatus = exports.$Enums.PostStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED'
};

exports.Prisma.ModelName = {
  Brand: 'Brand',
  Product: 'Product',
  Package: 'Package',
  StockPool: 'StockPool',
  PackageStockPool: 'PackageStockPool',
  StockCode: 'StockCode',
  User: 'User',
  PasswordResetToken: 'PasswordResetToken',
  RefreshToken: 'RefreshToken',
  Wallet: 'Wallet',
  WalletTransaction: 'WalletTransaction',
  IdempotencyKey: 'IdempotencyKey',
  Provider: 'Provider',
  ProviderSyncLog: 'ProviderSyncLog',
  PaymentGatewayConfig: 'PaymentGatewayConfig',
  PaymentMethod: 'PaymentMethod',
  ServiceCategory: 'ServiceCategory',
  Service: 'Service',
  Order: 'Order',
  OrderIntent: 'OrderIntent',
  RefillRequest: 'RefillRequest',
  TicketCategory: 'TicketCategory',
  TicketSubcategory: 'TicketSubcategory',
  Ticket: 'Ticket',
  TicketMessage: 'TicketMessage',
  TicketOrderAction: 'TicketOrderAction',
  Deposit: 'Deposit',
  AdminAuditLog: 'AdminAuditLog',
  DripFeed: 'DripFeed',
  Affiliate: 'Affiliate',
  ChildPanel: 'ChildPanel',
  Coupon: 'Coupon',
  CouponRedemption: 'CouponRedemption',
  SiteSettings: 'SiteSettings',
  SupportChannel: 'SupportChannel',
  Notice: 'Notice',
  SiteNotice: 'SiteNotice',
  Banner: 'Banner',
  Post: 'Post'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
