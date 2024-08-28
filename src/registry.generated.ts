export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: any; output: any; }
  JSON: { input: any; output: any; }
  obfuscatedId: { input: any; output: any; }
};

export type AnonymousUser = UserBase & {
  __typename?: 'AnonymousUser';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['obfuscatedId']['output'];
  publicKey: Scalars['String']['output'];
  type: UserType;
  updatedAt: Scalars['DateTime']['output'];
};

export type ClassicUser = UserBase & {
  __typename?: 'ClassicUser';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['obfuscatedId']['output'];
  type: UserType;
  updatedAt: Scalars['DateTime']['output'];
  username: Scalars['String']['output'];
};

export type ClassicUserAnonymousUser = AnonymousUser | ClassicUser;

export type MediaSignalServerConnectionInfo = {
  __typename?: 'MediaSignalServerConnectionInfo';
  hostname: Scalars['String']['output'];
  port: Scalars['Int']['output'];
  token: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Allocate a media server and get connection info */
  allocateMediaServer: MediaSignalServerConnectionInfo;
  /** Binding anonymous identify to a classic identify. Auto register public key if anonymous doesn't exist. */
  bindAnonymousIdentify: Scalars['Boolean']['output'];
  /** Create channel */
  createChannel: Channel;
  /** Create default administrator */
  createDefaultAdmin: ClassicUser;
  /** Create permission_group */
  createPermissionGroup: PermissionGroup;
  /** Create virtual_server */
  createVirtualServer: VirtualServer;
  /** Deallocate a media server. Might occur when room is empty for a period. */
  deallocateMediaServer: Scalars['Boolean']['output'];
  /** Delete channel. */
  deleteChannel: Scalars['Boolean']['output'];
  /** Delete permission_group. */
  deletePermissionGroup: Scalars['Boolean']['output'];
  /** Delete virtual_server. */
  deleteVirtualServer: Scalars['Boolean']['output'];
  /** Login anonymous user. */
  loginAnonymous: SessionToken;
  /** Login classic user */
  loginClassic: SessionToken;
  /** Lookup services with tags */
  lookupServices: ServiceInfoType;
  /** Refresh service ttl */
  refreshService: Scalars['Boolean']['output'];
  /** Register anonymous user. */
  registerAnonymous: AnonymousUser;
  /** Register classic user */
  registerClassic: ClassicUser;
  /** Register a service */
  registerService: ServiceRegistryInfo;
  /** Remove service */
  removeService: Scalars['Boolean']['output'];
  /** Update channel. Create if not exist. */
  updateChannel: Channel;
  /** Update permission_group. Create if not exist. */
  updatePermissionGroup: PermissionGroup;
  /** Update virtual_server. Create if not exist. */
  updateVirtualServer: VirtualServer;
};


export type MutationAllocateMediaServerArgs = {
  channelId: Scalars['obfuscatedId']['input'];
};


export type MutationBindAnonymousIdentifyArgs = {
  nonce: Scalars['String']['input'];
  publicKey: Scalars['String']['input'];
  signature: Scalars['String']['input'];
  timestamp: Scalars['Int']['input'];
};


export type MutationCreateChannelArgs = {
  data: ChannelPartialOptionalInput;
};


export type MutationCreateDefaultAdminArgs = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type MutationCreatePermissionGroupArgs = {
  data: PermissionGroupPartialOptionalInput;
};


export type MutationCreateVirtualServerArgs = {
  data: VirtualServerPartialOptionalInput;
};


export type MutationDeallocateMediaServerArgs = {
  channelId: Scalars['obfuscatedId']['input'];
};


export type MutationDeleteChannelArgs = {
  itemId: Scalars['Int']['input'];
};


export type MutationDeletePermissionGroupArgs = {
  itemId: Scalars['Int']['input'];
};


export type MutationDeleteVirtualServerArgs = {
  itemId: Scalars['Int']['input'];
};


export type MutationLoginAnonymousArgs = {
  nonce: Scalars['String']['input'];
  publicKey: Scalars['String']['input'];
  signature: Scalars['String']['input'];
  timestamp: Scalars['Int']['input'];
};


export type MutationLoginClassicArgs = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type MutationLookupServicesArgs = {
  category: Scalars['String']['input'];
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationRefreshServiceArgs = {
  category: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type MutationRegisterAnonymousArgs = {
  publicKey: Scalars['String']['input'];
};


export type MutationRegisterClassicArgs = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type MutationRegisterServiceArgs = {
  category: Scalars['String']['input'];
  serviceInfo: ServiceInfoInputType;
};


export type MutationRemoveServiceArgs = {
  category: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type MutationUpdateChannelArgs = {
  data: ChannelOptionalInput;
  itemId: Scalars['Int']['input'];
};


export type MutationUpdatePermissionGroupArgs = {
  data: PermissionGroupOptionalInput;
  itemId: Scalars['Int']['input'];
};


export type MutationUpdateVirtualServerArgs = {
  data: VirtualServerOptionalInput;
  itemId: Scalars['Int']['input'];
};

export type Query = {
  __typename?: 'Query';
  /** Decrypt a number */
  decryptNumber: Scalars['Int']['output'];
  /** Encrypt a number */
  encryptNumber: Scalars['String']['output'];
  /** Retrieve paged channel instances. */
  retrieveChannel: Array<Channel>;
  /** Retrieve paged permission_group instances. */
  retrievePermissionGroup: Array<PermissionGroup>;
  /** Retrieve paged virtual_server instances. */
  retrieveVirtualServer: Array<VirtualServer>;
  /** Get self info */
  selfInfo: ClassicUserAnonymousUser;
  /** Get server time */
  serverTime: Scalars['DateTime']['output'];
  /** Get system time */
  serverTimestamp: Scalars['Int']['output'];
  /** Service Registry Info */
  serviceRegistryInfo: ServiceRegistryInfo;
  /** Get user info by id */
  userInfo: ClassicUserAnonymousUser;
};


export type QueryDecryptNumberArgs = {
  encryptedNumber: Scalars['String']['input'];
};


export type QueryEncryptNumberArgs = {
  number: Scalars['Int']['input'];
};


export type QueryRetrieveChannelArgs = {
  page?: Scalars['Int']['input'];
  pageSize?: Scalars['Int']['input'];
};


export type QueryRetrievePermissionGroupArgs = {
  page?: Scalars['Int']['input'];
  pageSize?: Scalars['Int']['input'];
};


export type QueryRetrieveVirtualServerArgs = {
  page?: Scalars['Int']['input'];
  pageSize?: Scalars['Int']['input'];
};


export type QueryUserInfoArgs = {
  uid: Scalars['obfuscatedId']['input'];
};

export type ServiceInfoInputType = {
  hostname?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  ip: Scalars['String']['input'];
  loadFactor: Scalars['Float']['input'];
  port: Scalars['Int']['input'];
  tags: Array<Scalars['String']['input']>;
};

export type ServiceInfoType = {
  __typename?: 'ServiceInfoType';
  hostname?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  ip: Scalars['String']['output'];
  loadFactor: Scalars['Float']['output'];
  port: Scalars['Int']['output'];
  tags: Array<Scalars['String']['output']>;
};

export type ServiceRegistryInfo = {
  __typename?: 'ServiceRegistryInfo';
  publicKey: Scalars['String']['output'];
};

export type SessionToken = {
  __typename?: 'SessionToken';
  token: Scalars['String']['output'];
};

export type UserBase = {
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['obfuscatedId']['output'];
  type: UserType;
  updatedAt: Scalars['DateTime']['output'];
};

export enum UserType {
  Anonymous = 'ANONYMOUS',
  Classic = 'CLASSIC'
}

export type Channel = {
  __typename?: 'channel';
  /** configuration of the channel */
  configuration: Scalars['JSON']['output'];
  /** created_at of the channel */
  createdAt: Scalars['DateTime']['output'];
  /** id of the channel */
  id?: Maybe<Scalars['Int']['output']>;
  /** joinable of the channel */
  joinable: Scalars['Boolean']['output'];
  /** name of the channel */
  name: Scalars['String']['output'];
  /** server_id of the channel */
  serverId: Scalars['Int']['output'];
  /** updated_at of the channel */
  updatedAt: Scalars['DateTime']['output'];
};

export type ChannelOptionalInput = {
  /** configuration of the channel */
  configuration?: InputMaybe<Scalars['JSON']['input']>;
  /** joinable of the channel */
  joinable?: InputMaybe<Scalars['Boolean']['input']>;
  /** name of the channel */
  name?: InputMaybe<Scalars['String']['input']>;
  /** server_id of the channel */
  serverId?: InputMaybe<Scalars['Int']['input']>;
};

export type ChannelPartialOptionalInput = {
  /** configuration of the channel */
  configuration?: InputMaybe<Scalars['JSON']['input']>;
  /** joinable of the channel */
  joinable: Scalars['Boolean']['input'];
  /** name of the channel */
  name: Scalars['String']['input'];
  /** server_id of the channel */
  serverId: Scalars['Int']['input'];
};

export type PermissionGroup = {
  __typename?: 'permissionGroup';
  /** id of the permission_group */
  id?: Maybe<Scalars['Int']['output']>;
  /** name of the permission_group */
  name: Scalars['String']['output'];
  /** permissions of the permission_group */
  permissions: Array<Scalars['String']['output']>;
};

export type PermissionGroupOptionalInput = {
  /** name of the permission_group */
  name?: InputMaybe<Scalars['String']['input']>;
  /** permissions of the permission_group */
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type PermissionGroupPartialOptionalInput = {
  /** name of the permission_group */
  name: Scalars['String']['input'];
  /** permissions of the permission_group */
  permissions: Array<Scalars['String']['input']>;
};

export type VirtualServer = {
  __typename?: 'virtualServer';
  /** configuration of the virtual_server */
  configuration: Scalars['JSON']['output'];
  /** created_at of the virtual_server */
  createdAt: Scalars['DateTime']['output'];
  /** id of the virtual_server */
  id?: Maybe<Scalars['Int']['output']>;
  /** name of the virtual_server */
  name: Scalars['String']['output'];
  /** updated_at of the virtual_server */
  updatedAt: Scalars['DateTime']['output'];
};

export type VirtualServerOptionalInput = {
  /** configuration of the virtual_server */
  configuration?: InputMaybe<Scalars['JSON']['input']>;
  /** name of the virtual_server */
  name?: InputMaybe<Scalars['String']['input']>;
};

export type VirtualServerPartialOptionalInput = {
  /** configuration of the virtual_server */
  configuration?: InputMaybe<Scalars['JSON']['input']>;
  /** name of the virtual_server */
  name: Scalars['String']['input'];
};

export type RegisterServiceMutationVariables = Exact<{
  category: Scalars['String']['input'];
  info: ServiceInfoInputType;
}>;


export type RegisterServiceMutation = { __typename?: 'Mutation', registerService: { __typename?: 'ServiceRegistryInfo', publicKey: string } };
