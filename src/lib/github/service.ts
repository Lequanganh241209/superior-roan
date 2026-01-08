import { Octokit } from "@octokit/rest";

// Helper to get authenticated Octokit
const getOctokit = (accessToken?: string) => {
  const token = accessToken || process.env.GITHUB_PAT;
  if (!token) {
    throw new Error("GitHub Token Missing: No user access token or GITHUB_PAT found.");
  }
  return new Octokit({ auth: token });
};

export interface CreateRepoParams {
  name: string;
  description?: string;
  private?: boolean;
  accessToken?: string; // Optional: Dynamic User Token
}

export async function createRepository({ name, description, private: isPrivate = true, accessToken }: CreateRepoParams) {
  try {
    const octokit = getOctokit(accessToken);
    
    const { data } = await octokit.rest.repos.createForAuthenticatedUser({
      name,
      description,
      private: isPrivate,
      auto_init: true, // Initialize with README
    });
    return { success: true, url: data.html_url, id: data.id };
  } catch (error: any) {
    console.error("GitHub Repo Creation Failed:", error);
    return { success: false, error: error.message };
  }
}

export interface FileChange {
  path: string;
  content: string;
}

export async function createEvolutionPR(
  owner: string,
  repo: string,
  branchName: string,
  title: string,
  body: string,
  changes: FileChange[],
  accessToken?: string // Optional: Dynamic User Token
) {
  try {
    const octokit = getOctokit(accessToken);

    // 1. Get reference to main branch
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: "heads/main",
    });
    const mainSha = refData.object.sha;

    // 2. Create new branch
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: mainSha,
    });

    // 3. Create blobs and tree
    const treeItems = await Promise.all(
      changes.map(async (change) => {
        const { data: blobData } = await octokit.rest.git.createBlob({
          owner,
          repo,
          content: change.content,
          encoding: "utf-8",
        });
        return {
          path: change.path,
          mode: "100644" as const,
          type: "blob" as const,
          sha: blobData.sha,
        };
      })
    );

    const { data: treeData } = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: mainSha,
      tree: treeItems,
    });

    // 4. Create commit
    const { data: commitData } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: title,
      tree: treeData.sha,
      parents: [mainSha],
    });

    // 5. Update branch reference
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branchName}`,
      sha: commitData.sha,
    });

    // 6. Create Pull Request
    const { data: prData } = await octokit.rest.pulls.create({
        owner,
        repo,
        title,
        body,
        head: branchName,
        base: "main",
    });

    return { success: true, prUrl: prData.html_url, prNumber: prData.number };

  } catch (error: any) {
    console.error("GitHub PR Creation Failed:", error);
    return { success: false, error: error.message };
  }
}

export async function pushFilesToRepo(
    owner: string,
    repo: string,
    message: string,
    files: FileChange[],
    accessToken?: string
) {
    try {
        const octokit = getOctokit(accessToken);
        
        // Get latest commit sha
        const { data: refData } = await octokit.rest.git.getRef({
            owner,
            repo,
            ref: "heads/main",
        });
        const latestCommitSha = refData.object.sha;

        // Create blobs
        const treeItems = await Promise.all(
            files.map(async (file) => {
                const { data: blob } = await octokit.rest.git.createBlob({
                    owner,
                    repo,
                    content: file.content,
                    encoding: "utf-8",
                });
                return {
                    path: file.path,
                    mode: "100644" as const,
                    type: "blob" as const,
                    sha: blob.sha,
                };
            })
        );

        // Create tree
        const { data: tree } = await octokit.rest.git.createTree({
            owner,
            repo,
            base_tree: latestCommitSha,
            tree: treeItems,
        });

        // Create commit
        const { data: newCommit } = await octokit.rest.git.createCommit({
            owner,
            repo,
            message,
            tree: tree.sha,
            parents: [latestCommitSha],
        });

        // Update ref
        await octokit.rest.git.updateRef({
            owner,
            repo,
            ref: "heads/main",
            sha: newCommit.sha,
        });

        return { success: true, sha: newCommit.sha };

    } catch (error: any) {
        console.error("Push files error:", error);
        return { success: false, error: error.message };
    }
}

export async function revertCommit(
  owner: string,
  repo: string,
  sha: string,
  accessToken?: string
) {
  try {
    const octokit = getOctokit(accessToken);
    // GitHub API doesn't have a direct "revert" endpoint like git revert.
    // Strategy: 
    // 1. Get the tree of the target commit (SHA) we want to rollback TO.
    // 2. Create a new commit pointing to that tree on top of main.
    
    // However, if we want to revert a SPECIFIC commit (like git revert), it's harder via API.
    // Easier strategy for "Restore Version":
    // 1. Get the Tree of the Commit we want to restore TO.
    // 2. Force push / Update ref to that commit? NO, dangerous.
    // 3. Create a NEW commit that has the SAME tree as the target commit.
    
    const { data: targetCommit } = await octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: sha
    });

    const { data: headRef } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: "heads/main"
    });
    
    const { data: newCommit } = await octokit.rest.git.createCommit({
        owner,
        repo,
        message: `Rollback to version ${sha.substring(0, 7)}`,
        tree: targetCommit.tree.sha,
        parents: [headRef.object.sha]
    });

    await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: "heads/main",
        sha: newCommit.sha
    });

    return { success: true, sha: newCommit.sha };

  } catch (error: any) {
    console.error("Revert error:", error);
    return { success: false, error: error.message };
  }
}

export async function pushFileToRepo(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  accessToken?: string
) {
  return pushFilesToRepo(owner, repo, message, [{ path, content }], accessToken);
}
