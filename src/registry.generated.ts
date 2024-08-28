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

export type Channel = {
  __typename?: 'Channel';
  /** configuration of the Channel */
  configuration: Scalars['JSON']['output'];
  /** created_at of the Channel */
  createdAt: Scalars['DateTime']['output'];
  /** id of the Channel */
  id?: Maybe<Scalars['Int']['output']>;
  /** joinable of the Channel */
  joinable: Scalars['Boolean']['output'];
  /** name of the Channel */
  name: Scalars['String']['output'];
  /** server_id of the Channel */
  serverId: Scalars['Int']['output'];
  /** updated_at of the Channel */
  updatedAt: Scalars['DateTime']['output'];
};

export type ChannelInput = {
  /** configuration of the Channel */
  configuration: Scalars['JSON']['input'];
  /** created_at of the Channel */
  createdAt: Scalars['DateTime']['input'];
  /** joinable of the Channel */
  joinable: Scalars['Boolean']['input'];
  /** name of the Channel */
  name: Scalars['String']['input'];
  /** server_id of the Channel */
  serverId: Scalars['Int']['input'];
  /** updated_at of the Channel */
  updatedAt: Scalars['DateTime']['input'];
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
  /** Create Channel */
  createChannel: Channel;
  /** Create default administration */
  createDefaultAdmin: ClassicUser;
  /** Create PermissionGroup */
  createPermissiongroup: PermissionGroup;
  /** Deallocate a media server. Might occur when room is empty for a period. */
  deallocateMediaServer: Scalars['Boolean']['output'];
  /** Delete Channel. */
  deleteChannel: Channel;
  /** Delete PermissionGroup. */
  deletePermissiongroup: PermissionGroup;
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
  /** Update Channel. Create if not exist. */
  updateChannel: Channel;
  /** Update PermissionGroup. Create if not exist. */
  updatePermissiongroup: PermissionGroup;
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
  data: ChannelInput;
};


export type MutationCreateDefaultAdminArgs = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type MutationCreatePermissiongroupArgs = {
  data: PermissionGroupInput;
};


export type MutationDeallocateMediaServerArgs = {
  channelId: Scalars['obfuscatedId']['input'];
};


export type MutationDeleteChannelArgs = {
  itemId: Scalars['Int']['input'];
};


export type MutationDeletePermissiongroupArgs = {
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
  data: ChannelInput;
  itemId: Scalars['Int']['input'];
};


export type MutationUpdatePermissiongroupArgs = {
  data: PermissionGroupInput;
  itemId: Scalars['Int']['input'];
};

export type PermissionGroup = {
  __typename?: 'PermissionGroup';
  /** id of the PermissionGroup */
  id?: Maybe<Scalars['Int']['output']>;
  /** name of the PermissionGroup */
  name: Scalars['String']['output'];
  /** permissions of the PermissionGroup */
  permissions: Array<Scalars['String']['output']>;
};

export type PermissionGroupInput = {
  /** name of the PermissionGroup */
  name: Scalars['String']['input'];
  /** permissions of the PermissionGroup */
  permissions: Array<Scalars['String']['input']>;
};

export type Query = {
  __typename?: 'Query';
  /** Decrypt a number */
  decryptNumber: Scalars['Int']['output'];
  /** Encrypt a number */
  encryptNumber: Scalars['String']['output'];
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

export type RegisterServiceMutationVariables = Exact<{
  category: Scalars['String']['input'];
  info: ServiceInfoInputType;
}>;


export type RegisterServiceMutation = { __typename?: 'Mutation', registerService: { __typename?: 'ServiceRegistryInfo', publicKey: string } };
