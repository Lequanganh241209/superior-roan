const VERCEL_API_URL = "https://api.vercel.com";

export interface DeployParams {
  name: string;
  repoId?: number; // Optional now
  repoName?: string; // Optional now
  type?: string;
  files?: { path: string; content: string }[]; // New: Direct files
  accessToken?: string;
}

export async function createDeployment({ name, repoId, repoName, type = "github", files, accessToken }: DeployParams) {
  try {
    const token = accessToken || process.env.VERCEL_ACCESS_TOKEN;
    if (!token) throw new Error("VERCEL_ACCESS_TOKEN is missing");

    // Strategy: 
    // If 'files' are provided, use Direct Upload (Robust).
    // If 'files' missing, try Git Linking (Fragile, requires integration).

    if (files && files.length > 0) {
        return await deployWithFiles(name, files, token);
    }

    // Fallback: Git Linking (Original Logic)
    // Allow linking with just repo name if Vercel GitHub App is installed
    if (!repoName) throw new Error("Missing repo info: repoName is required for git deployment");

    const response = await fetch(`${VERCEL_API_URL}/v9/projects`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name,
        framework: "nextjs",
        gitRepository: {
          type: type,
          repo: repoName,
          ...(repoId ? { repoId } : {})
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
        if (data.code === 'conflicting_project_path') {
             // If project exists, we can't easily "link" it if it wasn't linked before.
             // But we can return the existing project info as a fallback?
             // Or throw error.
             throw new Error(`Project ${name} already exists. Please choose a different name.`);
        }
        throw new Error(data.error?.message || "Failed to create Vercel project");
    }

    return {
      success: true,
      projectId: data.id,
      projectName: data.name,
      deployUrl: `https://${data.name}.vercel.app`,
      dashboardUrl: `https://vercel.com/${data.accountId}/${data.name}`
    };

  } catch (error: any) {
    console.error("Vercel Deployment Failed:", error);
    return { success: false, error: error.message };
  }
}

async function deployWithFiles(projectName: string, files: { path: string; content: string }[], token: string) {
    try {
        // 1. Ensure Project Exists (Optional, but good for settings)
        // We try to create it without git repo. If it exists, we ignore error.
        await fetch(`${VERCEL_API_URL}/v9/projects`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: projectName,
                framework: "nextjs"
            }),
        });

        // 2. Prepare Files for Vercel API
        // Vercel expects: { file: "path/to/file", data: "content" }
        // Note: content in 'data' is text. For binary, we need encoding? 
        // Our 'files' are text (source code).
        const vercelFiles = files.map(f => ({
            file: f.path.startsWith('/') ? f.path.substring(1) : f.path, // Remove leading slash
            data: f.content
        }));

        // 3. Create Deployment
        const deployRes = await fetch(`${VERCEL_API_URL}/v13/deployments`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: projectName,
                files: vercelFiles,
                projectSettings: {
                    framework: "nextjs"
                },
                target: "production" // Deploy straight to prod URL
            }),
        });

        const deployData = await deployRes.json();

        if (!deployRes.ok) {
            throw new Error(deployData.error?.message || "Failed to upload deployment");
        }

        // 4. Ensure canonical alias <projectName>.vercel.app points to latest deployment
        try {
            const deploymentId = deployData.id || deployData.deploymentId;
            if (deploymentId) {
                const aliasRes = await fetch(`${VERCEL_API_URL}/v13/deployments/${deploymentId}/aliases`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        alias: `${projectName}.vercel.app`
                    })
                });
                // If alias succeeded, prefer the canonical domain
                if (aliasRes.ok) {
                    // no need to read body; alias is set
                }
            }
        } catch (e) {
            // Non-critical: alias setup may fail if domain already points or permissions differ
        }

        return {
            success: true,
            projectId: deployData.projectId,
            projectName: deployData.name,
            deployUrl: deployData.url ? `https://${deployData.url}` : `https://${deployData.alias?.[0]}`,
            dashboardUrl: `https://vercel.com${deployData.inspectorUrl || ''}`
        };

    } catch (error: any) {
         console.error("Direct Deployment Failed:", error);
         return { success: false, error: error.message };
    }
}

export async function setProjectEnv(projectName: string, envs: Record<string, string>, accessToken?: string) {
  const token = accessToken || process.env.VERCEL_ACCESS_TOKEN;
  if (!token) throw new Error("VERCEL_ACCESS_TOKEN is missing");
  const projRes = await fetch(`${VERCEL_API_URL}/v9/projects/${projectName}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!projRes.ok) throw new Error("Project not found");
  const proj = await projRes.json();
  const listRes = await fetch(`${VERCEL_API_URL}/v9/projects/${proj.id}/env`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const existing = listRes.ok ? await listRes.json() : { envs: [] };
  const map: Record<string, any> = {};
  for (const e of existing.envs || []) {
    map[e.key] = e;
  }
  for (const [key, value] of Object.entries(envs)) {
    if (!value) continue;
    const payload = {
      key,
      value,
      target: ["production", "preview"]
    };
    if (map[key]) {
      const envId = map[key].id;
      await fetch(`${VERCEL_API_URL}/v9/projects/${proj.id}/env/${envId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ value, target: ["production", "preview"] })
      });
    } else {
      await fetch(`${VERCEL_API_URL}/v9/projects/${proj.id}/env`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
    }
  }
  return true;
}

export async function bindCanonicalAlias(projectName: string, accessToken?: string) {
  const token = accessToken || process.env.VERCEL_ACCESS_TOKEN;
  if (!token) throw new Error("VERCEL_ACCESS_TOKEN is missing");
  const projRes = await fetch(`${VERCEL_API_URL}/v9/projects/${projectName}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!projRes.ok) throw new Error("Project not found");
  const proj = await projRes.json();
  const depRes = await fetch(`${VERCEL_API_URL}/v13/deployments?projectId=${proj.id}&limit=1`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!depRes.ok) throw new Error("No deployments found");
  const deps = await depRes.json();
  const first = deps.deployments?.[0];
  const deploymentId = first?.uid || first?.id;
  if (!deploymentId) throw new Error("No deployment id");
  const aliasRes = await fetch(`${VERCEL_API_URL}/v13/deployments/${deploymentId}/aliases`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ alias: `${projectName}.vercel.app` })
  });
  if (!aliasRes.ok) {
    const err = await aliasRes.json().catch(() => ({}));
    throw new Error(err.error?.message || "Alias bind failed");
  }
  return true;
}

export async function disableDeploymentProtection(projectName: string, accessToken?: string) {
  const token = accessToken || process.env.VERCEL_ACCESS_TOKEN;
  if (!token) throw new Error("VERCEL_ACCESS_TOKEN is missing");
  const projRes = await fetch(`${VERCEL_API_URL}/v9/projects/${projectName}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!projRes.ok) throw new Error("Project not found");
  const proj = await projRes.json();
  try {
    await fetch(`${VERCEL_API_URL}/v9/projects/${proj.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        vercelAuth: false,
        passwordProtection: false,
        deploymentProtection: { enabled: false }
      })
    });
  } catch {}
  return true;
}

export async function linkGitRepository(projectName: string, repoFullName: string, accessToken?: string) {
  const token = accessToken || process.env.VERCEL_ACCESS_TOKEN;
  if (!token) throw new Error("VERCEL_ACCESS_TOKEN is missing");
  const projRes = await fetch(`${VERCEL_API_URL}/v9/projects/${projectName}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!projRes.ok) throw new Error("Project not found");
  const proj = await projRes.json();
  const patchRes = await fetch(`${VERCEL_API_URL}/v9/projects/${proj.id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      gitRepository: {
        type: "github",
        repo: repoFullName
      }
    })
  });
  if (!patchRes.ok) {
    const err = await patchRes.json().catch(() => ({}));
    throw new Error(err.error?.message || "Failed to link GitHub repository");
  }
  return true;
}
