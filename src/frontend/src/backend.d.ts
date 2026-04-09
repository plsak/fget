import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export type Time = bigint;
export interface FileMetadata {
    id: string;
    blob: ExternalBlob;
    name: string;
    createdAt: Time;
    size: bigint;
    updatedAt: Time;
    parentId?: string;
}
export type FileSystemItem = {
    __kind__: "file";
    file: FileMetadata;
} | {
    __kind__: "folder";
    folder: FolderMetadata;
};
export interface FolderSearchResults {
    files: Array<FileMetadata>;
    folders: Array<FolderMetadata>;
}
export interface FolderMetadata {
    id: string;
    name: string;
    createdAt: Time;
    updatedAt: Time;
    parentId?: string;
}
export interface ApiKey {
    id: string;
    token: string;
    ownerId: Principal;
    createdAt: Time;
    description: string;
}
export interface AdminInfo {
    principal: Principal;
    username: string;
    role: UserRole;
}
export interface UserApprovalInfo {
    status: ApprovalStatus;
    principal: Principal;
}
export interface FileMove {
    id: string;
    isFolder: boolean;
    newParentId?: string;
}
export interface UserProfile {
    name: string;
}
export interface StorageStats {
    totalFiles: bigint;
    totalFolders: bigint;
    totalEncryptedFiles: bigint;
    frontendCanisterId: string;
    appVersion: string;
    totalStorageBytes: bigint;
    backendCanisterId: string;
}
export enum ApprovalStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addFile(id: string, name: string, size: bigint, parentId: string | null, blob: ExternalBlob, isEncrypted: boolean): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createFolder(name: string, parentId: string | null): Promise<string>;
    deleteApiKey(id: string): Promise<boolean>;
    deleteFile(id: string): Promise<boolean>;
    deleteFolder(id: string): Promise<boolean>;
    generateApiKey(description: string): Promise<string>;
    getAllFolders(): Promise<Array<FolderMetadata>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getFile(id: string): Promise<FileMetadata | null>;
    getFiles(): Promise<Array<FileMetadata>>;
    getFolder(id: string): Promise<FolderMetadata | null>;
    getFolderContents(folderId: string | null): Promise<Array<FileSystemItem>>;
    getMembers(): Promise<Array<AdminInfo>>;
    getStorageStats(): Promise<StorageStats>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserRole(): Promise<UserRole>;
    http_request(req: {
        url: string;
        method: string;
        body: Uint8Array;
        headers: Array<[string, string]>;
    }): Promise<{
        body: Uint8Array;
        headers: Array<[string, string]>;
        upgrade?: boolean;
        status_code: number;
    }>;
    http_request_update(req: {
        url: string;
        method: string;
        body: Uint8Array;
        headers: Array<[string, string]>;
    }): Promise<{
        body: Uint8Array;
        headers: Array<[string, string]>;
        status_code: number;
    }>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    isUsernameUnique(username: string): Promise<boolean>;
    listApiKeys(): Promise<Array<ApiKey>>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    moveItem(itemId: string, newParentId: string | null, isFolder: boolean): Promise<void>;
    moveItems(moves: Array<FileMove>): Promise<void>;
    removeMember(principal: Principal): Promise<void>;
    requestApproval(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchFiles(searchTerm: string): Promise<Array<FileMetadata>>;
    searchFoldersInSubtree(searchTerm: string, startFolderId: string | null): Promise<FolderSearchResults>;
    searchSubtree(searchTerm: string, startFolderId: string | null): Promise<Array<FileSystemItem>>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    setBackendCanisterId(canisterId: string): Promise<void>;
    setFrontendCanisterId(canisterId: string): Promise<void>;
}
