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
};

export type AnonymousUser = UserBase & {
  __typename?: 'AnonymousUser';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  publicKey: Scalars['String']['output'];
  type: UserType;
  updatedAt: Scalars['DateTime']['output'];
};

export type ClassicUser = UserBase & {
  __typename?: 'ClassicUser';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  type: UserType;
  updatedAt: Scalars['DateTime']['output'];
  username: Scalars['String']['output'];
};

export type ClassicUserAnonymousUser = AnonymousUser | ClassicUser;

export type Mutation = {
  __typename?: 'Mutation';
  /** Binding anonymous identify to a classic identify. Auto register public key if anonymous doesn't exist. */
  bindAnonymousIdentify: Scalars['Boolean']['output'];
  /** Create default administration */
  createDefaultAdmin: ClassicUser;
  /** Create PermissionGroup */
  createPermissiongroup: PermissionGroup;
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
  /** Update PermissionGroup. Create if not exist. */
  updatePermissiongroup: PermissionGroup;
};


export type MutationBindAnonymousIdentifyArgs = {
  nonce: Scalars['String']['input'];
  publicKey: Scalars['String']['input'];
  signature: Scalars['String']['input'];
  timestamp: Scalars['Int']['input'];
};


export type MutationCreateDefaultAdminArgs = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type MutationCreatePermissiongroupArgs = {
  data: PermissionGroupInput;
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
  serviceId: Scalars['String']['input'];
  serviceInfo: ServiceInfoInputType;
};


export type MutationRemoveServiceArgs = {
  category: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
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


export type QueryUserInfoArgs = {
  uid: Scalars['Int']['input'];
};

export type ServiceInfoInputType = {
  hostname?: InputMaybe<Scalars['String']['input']>;
  ip: Scalars['String']['input'];
  loadFactor: Scalars['Float']['input'];
  port: Scalars['Int']['input'];
  tags: Array<Scalars['String']['input']>;
};

export type ServiceInfoType = {
  __typename?: 'ServiceInfoType';
  hostname?: Maybe<Scalars['String']['output']>;
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
  id: Scalars['Int']['output'];
  type: UserType;
  updatedAt: Scalars['DateTime']['output'];
};

export enum UserType {
  Anonymous = 'ANONYMOUS',
  Classic = 'CLASSIC'
}

export type RegisterServiceMutationVariables = Exact<{
  category: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
  info: ServiceInfoInputType;
}>;


export type RegisterServiceMutation = { __typename?: 'Mutation', registerService: { __typename?: 'ServiceRegistryInfo', publicKey: string } };
