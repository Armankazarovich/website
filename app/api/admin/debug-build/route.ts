export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import fs from "fs";
import path from "path";

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN"];

export async function GET() {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const results: Record<string, any> = {};

  // Check if CRM files exist in .next build output
  const nextDir = path.join(process.cwd(), ".next");
  const crmBuildDir = path.join(nextDir, "server", "app", "admin", "crm");
  const automationBuildDir = path.join(crmBuildDir, "automation");

  results.cwd = process.cwd();
  results.nextExists = fs.existsSync(nextDir);
  results.crmBuildDirExists = fs.existsSync(crmBuildDir);
  results.automationBuildDirExists = fs.existsSync(automationBuildDir);

  // List files in CRM build dir
  if (fs.existsSync(crmBuildDir)) {
    try {
      results.crmBuildFiles = listFilesRecursive(crmBuildDir, 3);
    } catch (e: any) {
      results.crmBuildFilesError = e.message;
    }
  }

  // Check source files
  const srcCrmDir = path.join(process.cwd(), "app", "admin", "crm");
  results.srcCrmDirExists = fs.existsSync(srcCrmDir);
  if (fs.existsSync(srcCrmDir)) {
    try {
      results.srcCrmFiles = listFilesRecursive(srcCrmDir, 3);
    } catch (e: any) {
      results.srcCrmFilesError = e.message;
    }
  }

  // List admin build dirs for comparison
  const adminBuildDir = path.join(nextDir, "server", "app", "admin");
  if (fs.existsSync(adminBuildDir)) {
    try {
      const dirs = fs.readdirSync(adminBuildDir);
      results.adminBuildSubdirs = dirs;
    } catch (e: any) {
      results.adminBuildSubdirsError = e.message;
    }
  }

  return NextResponse.json(results, { status: 200 });
}

function listFilesRecursive(dir: string, maxDepth: number, depth = 0): string[] {
  if (depth >= maxDepth) return [`... (max depth ${maxDepth})`];
  const files: string[] = [];
  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const full = path.join(dir, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        files.push(`${entry}/`);
        const sub = listFilesRecursive(full, maxDepth, depth + 1);
        for (const s of sub) files.push(`  ${entry}/${s}`);
      } else {
        files.push(`${entry} (${stat.size}b)`);
      }
    }
  } catch {}
  return files;
}
