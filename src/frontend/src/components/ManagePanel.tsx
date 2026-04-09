import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Principal } from "@icp-sdk/core/principal";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  Database,
  Info,
  Key,
  Loader2,
  Plus,
  Server,
  Settings,
  Shield,
  Trash2,
  User,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserRole } from "../backend";
import { loadConfig } from "../config";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  type ApiKey,
  useAddMember,
  useDeleteApiKey,
  useGenerateApiKey,
  useGetMembers,
  useGetStorageStats,
  useListApiKeys,
  useRemoveMember,
} from "../hooks/useQueries";
import { APP_VERSION } from "../lib/appVersion";

export function ManagePanel() {
  const [open, setOpen] = useState(false);
  const [principalId, setPrincipalId] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.user);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<{
    principal: Principal;
    username: string;
  } | null>(null);
  const [apiKeyToDelete, setApiKeyToDelete] = useState<ApiKey | null>(null);
  const [newKeyDescription, setNewKeyDescription] = useState("");
  const [infoKey, setInfoKey] = useState<ApiKey | null>(null);
  const [backendCanisterId, setBackendCanisterId] =
    useState<string>("loading...");

  useEffect(() => {
    loadConfig()
      .then((cfg) => {
        setBackendCanisterId(
          cfg.backend_canister_id || "YOUR_BACKEND_CANISTER_ID",
        );
      })
      .catch(() => {
        setBackendCanisterId("YOUR_BACKEND_CANISTER_ID");
      });
  }, []);

  const {
    data: members,
    isLoading: membersLoading,
    refetch: refetchMembers,
  } = useGetMembers();
  const { data: storageStats, isLoading: statsLoading } = useGetStorageStats();
  const { data: apiKeys, isLoading: apiKeysLoading } = useListApiKeys();
  const addMember = useAddMember();
  const removeMember = useRemoveMember();
  const generateApiKey = useGenerateApiKey();
  const deleteApiKey = useDeleteApiKey();
  const { identity, clear } = useInternetIdentity();
  const queryClient = useQueryClient();

  // First admin is the first member in the list (backend ensures this)
  const firstAdminPrincipal =
    members && members.length > 0 ? members[0].principal.toString() : null;

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedId = principalId.trim();

    if (!trimmedId) {
      toast.error("Please enter a Principal ID");
      return;
    }

    try {
      const principal = Principal.fromText(trimmedId);
      await addMember.mutateAsync({ principal, role: selectedRole });

      // Force immediate refetch to ensure UI updates
      await refetchMembers();

      toast.success("Member added successfully");
      setPrincipalId("");
      setSelectedRole(UserRole.user);
    } catch (error) {
      toast.error("Failed to add member", {
        description:
          error instanceof Error ? error.message : "Invalid Principal ID",
      });
    }
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;

    const deletedPrincipalStr = memberToDelete.principal.toString();
    const currentUserPrincipal = identity?.getPrincipal().toString();

    try {
      await removeMember.mutateAsync(memberToDelete.principal);

      // Force immediate refetch to ensure UI updates
      await refetchMembers();

      toast.success("Member removed successfully", {
        description: `${memberToDelete.username} has been removed`,
      });
      setMemberToDelete(null);

      // If the deleted member is the current user, log them out
      if (currentUserPrincipal === deletedPrincipalStr) {
        // Clear all cached data
        queryClient.clear();
        // Log out the user
        await clear();
        toast.info("You have been removed from the system", {
          description: "Please log in again to set up a new profile",
        });
      }
    } catch (error) {
      toast.error("Failed to remove member", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleDeleteApiKey = async () => {
    if (!apiKeyToDelete) return;
    try {
      await deleteApiKey.mutateAsync(apiKeyToDelete.id);
      toast.success("API key deleted successfully");
      setApiKeyToDelete(null);
    } catch (error) {
      toast.error("Failed to delete API key", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleGenerateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newKeyDescription.trim();
    if (!trimmed) {
      toast.error("Please enter a description");
      return;
    }
    try {
      await generateApiKey.mutateAsync(trimmed);
      toast.success("API key generated successfully");
      setNewKeyDescription("");
    } catch (error) {
      toast.error("Failed to generate API key", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const getShortenedPrincipal = (principal: string) => {
    if (principal.length <= 11) return principal;
    return `${principal.slice(0, 4)}...${principal.slice(-4)}`;
  };

  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(text);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (_error) {
      toast.error(`Failed to copy ${label}`);
    }
  };

  const formatStorageSize = (bytes: bigint): string => {
    const numBytes = Number(bytes);
    if (numBytes === 0) return "0 B";

    const kb = numBytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;

    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(2)} MB`;

    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  };

  const getRoleBadge = (role: UserRole) => {
    if (role === UserRole.admin) {
      return (
        <Badge variant="default" className="gap-1">
          <Shield className="h-3 w-3" />
          Admin
        </Badge>
      );
    }
    if (role === UserRole.user) {
      return (
        <Badge variant="secondary" className="gap-1">
          <User className="h-3 w-3" />
          User
        </Badge>
      );
    }
    return null;
  };

  const getMaskedToken = (token: string) => {
    if (token.length <= 8) return token;
    return `${token.slice(0, 4)}...${token.slice(-4)}`;
  };

  const getInfoSnippets = (key: ApiKey) => {
    const backendId = backendCanisterId;
    const uploadUrl = `https://${backendId}.icp0.io/upload`;
    const snippet1 = `curl -X POST ${uploadUrl} \\
  -H "X-API-Token: ${key.token}" \\
  -H "X-Filename: myfile.txt" \\
  --data-binary @myfile.txt`;
    const snippet2 = `curl -X POST ${uploadUrl} \\
  -H "X-API-Token: ${key.token}" \\
  -H "X-Filename: myfile.txt" \\
  -H "X-Folder: myfolder" \\
  --data-binary @myfile.txt`;
    return { snippet1, snippet2 };
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Manage</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Settings className="h-6 w-6 text-primary" />
              Manage
            </DialogTitle>
            <DialogDescription>
              View storage statistics and manage members
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Storage Statistics */}
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Database className="h-5 w-5 text-blue-500" />
                  Storage Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {statsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : storageStats ? (
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm text-muted-foreground">
                        Used:
                      </span>
                      <span className="text-sm font-semibold text-blue-500">
                        {formatStorageSize(storageStats.totalStorageBytes)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm text-muted-foreground">
                        Folders:
                      </span>
                      <span className="text-sm font-semibold text-yellow-500">
                        {Number(storageStats.totalFolders)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm text-muted-foreground">
                        Files/Encrypted:
                      </span>
                      <span className="text-sm font-semibold">
                        <span className="text-blue-500">
                          {Number(storageStats.totalFiles)}
                        </span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-red-500">
                          {Number(storageStats.totalEncryptedFiles)}
                        </span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Unable to load statistics
                  </p>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* Current Members */}
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-primary" />
                  Current Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                {membersLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : members && members.length > 0 ? (
                  <div className="space-y-2">
                    {members.map((member) => {
                      const principalStr = member.principal.toString();
                      const isCopied = copiedId === principalStr;
                      const isFirstAdmin = principalStr === firstAdminPrincipal;

                      return (
                        <div
                          key={principalStr}
                          className="flex items-center justify-between p-3 rounded-lg bg-background/60"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                              {member.role === UserRole.admin ? (
                                <Shield className="h-4 w-4 text-primary" />
                              ) : (
                                <User className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">
                                  {member.username}
                                </p>
                                {getRoleBadge(member.role)}
                              </div>
                              <p className="text-xs text-muted-foreground font-mono truncate">
                                {getShortenedPrincipal(principalStr)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              onClick={() =>
                                handleCopyText(principalStr, "Principal ID")
                              }
                              size="sm"
                              variant="ghost"
                              className="gap-1.5"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  <span className="text-xs">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5" />
                                  <span className="text-xs">Copy</span>
                                </>
                              )}
                            </Button>
                            {!isFirstAdmin && (
                              <Button
                                onClick={() =>
                                  setMemberToDelete({
                                    principal: member.principal,
                                    username: member.username,
                                  })
                                }
                                size="sm"
                                variant="ghost"
                                className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="text-xs">Delete</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No members found
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Current API Keys */}
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Key className="h-5 w-5 text-yellow-500" />
                  Current API Keys
                </CardTitle>
              </CardHeader>
              <CardContent>
                {apiKeysLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : apiKeys && apiKeys.length > 0 ? (
                  <div className="space-y-2">
                    {apiKeys.map((key) => {
                      const isCopied = copiedId === key.token;
                      return (
                        <div
                          key={key.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-background/60"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">
                              {key.description}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {getMaskedToken(key.token)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              onClick={() =>
                                handleCopyText(key.token, "API token")
                              }
                              size="sm"
                              variant="ghost"
                              className="gap-1.5"
                              data-ocid="apikeys.copy.button"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  <span className="text-xs">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5" />
                                  <span className="text-xs">Copy</span>
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => setInfoKey(key)}
                              size="sm"
                              variant="ghost"
                              className="gap-1.5"
                              data-ocid="apikeys.info.button"
                            >
                              <Info className="h-3.5 w-3.5" />
                              <span className="text-xs">Info</span>
                            </Button>
                            <Button
                              onClick={() => setApiKeyToDelete(key)}
                              size="sm"
                              variant="ghost"
                              className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                              data-ocid="apikeys.delete_button"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="text-xs">Delete</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No API keys yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Add New Member */}
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Server className="h-5 w-5 text-green-500" />
                  Add New Member
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddMember} className="space-y-3">
                  <div className="flex gap-px">
                    <div className="w-32 flex-shrink-0">
                      <Select
                        value={selectedRole}
                        onValueChange={(value) =>
                          setSelectedRole(value as UserRole)
                        }
                        disabled={addMember.isPending}
                      >
                        <SelectTrigger className="rounded-r-none">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UserRole.admin}>
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Admin
                            </div>
                          </SelectItem>
                          <SelectItem value={UserRole.user}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              User
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Input
                        id="principalId"
                        type="text"
                        placeholder="Enter principal ID (e.g., rdmx6-jaaaa-aaaah-qcaiq-cai)"
                        value={principalId}
                        onChange={(e) => setPrincipalId(e.target.value)}
                        disabled={addMember.isPending}
                        className="font-mono text-sm rounded-l-none"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={addMember.isPending || !principalId.trim()}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {addMember.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Add
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Add New API Key */}
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plus className="h-5 w-5 text-green-500" />
                  Add New API Key
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGenerateApiKey} className="space-y-3">
                  <Input
                    type="text"
                    placeholder="e.g. plsak's key"
                    value={newKeyDescription}
                    onChange={(e) => setNewKeyDescription(e.target.value)}
                    disabled={generateApiKey.isPending}
                    data-ocid="apikeys.input"
                  />
                  <Button
                    type="submit"
                    disabled={
                      generateApiKey.isPending || !newKeyDescription.trim()
                    }
                    className="w-full gap-2"
                    size="lg"
                    data-ocid="apikeys.submit_button"
                  >
                    {generateApiKey.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Key className="h-4 w-4" />
                        Generate
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Separator />

            {/* App Version */}
            <Card className="bg-card/50 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">
                    App Version:
                  </span>
                  <span className="text-lg font-semibold text-primary">
                    {APP_VERSION}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Member Confirmation Dialog */}
      <AlertDialog
        open={!!memberToDelete}
        onOpenChange={(open) => !open && setMemberToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{memberToDelete?.username}</strong>? This will remove
              their profile, roles, and approval status. They will be logged out
              and treated as a new user on next login. Their uploaded files and
              folders will remain available to all members.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMember.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMember}
              disabled={removeMember.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMember.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete API Key Confirmation Dialog */}
      <AlertDialog
        open={!!apiKeyToDelete}
        onOpenChange={(open) => !open && setApiKeyToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the API key{" "}
              <strong>{apiKeyToDelete?.description}</strong>? Any scripts or
              integrations using this key will stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteApiKey.isPending}
              data-ocid="apikeys.cancel_button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteApiKey}
              disabled={deleteApiKey.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="apikeys.confirm_button"
            >
              {deleteApiKey.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* API Key Info Dialog */}
      {infoKey && (
        <Dialog
          open={!!infoKey}
          onOpenChange={(open) => !open && setInfoKey(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-yellow-500" />
                API Key Usage
              </DialogTitle>
              <DialogDescription>
                Use these examples to upload files via curl or wget.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div>
                <p className="mb-1 font-medium">Upload a file (&lt; 2 MB):</p>
                <div className="relative">
                  <pre className="bg-muted rounded-md p-3 overflow-x-auto text-xs font-mono whitespace-pre">
                    {getInfoSnippets(infoKey).snippet1}
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-1 right-1 gap-1"
                    onClick={() =>
                      handleCopyText(
                        getInfoSnippets(infoKey).snippet1,
                        "snippet",
                      )
                    }
                  >
                    {copiedId === getInfoSnippets(infoKey).snippet1 ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <p className="mb-1 font-medium">Upload to a specific folder:</p>
                <div className="relative">
                  <pre className="bg-muted rounded-md p-3 overflow-x-auto text-xs font-mono whitespace-pre">
                    {getInfoSnippets(infoKey).snippet2}
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-1 right-1 gap-1"
                    onClick={() =>
                      handleCopyText(
                        getInfoSnippets(infoKey).snippet2,
                        "snippet",
                      )
                    }
                  >
                    {copiedId === getInfoSnippets(infoKey).snippet2 ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                <strong>Note:</strong> CLI-uploaded files are stored directly in
                canister memory, which has limited capacity — avoid uploading
                large files or large numbers of files via CLI. In-app file
                encryption is not available for CLI uploads; you can however
                upload locally encrypted files (e.g. encrypted with gpg) without
                any restrictions.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
