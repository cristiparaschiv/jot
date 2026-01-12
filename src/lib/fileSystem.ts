import {
  readDir,
  mkdir,
  remove,
  rename,
  writeTextFile,
  writeFile,
  exists,
} from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-dialog";
import type { FileNode } from "../store/noteStore";

// Security: Path validation utilities

/**
 * Validates a file/folder name to prevent path traversal attacks
 */
function isValidName(name: string): boolean {
  if (!name || name.trim() === "") return false;
  // Reject path traversal attempts
  if (name.includes("..") || name.includes("/") || name.includes("\\")) return false;
  // Reject names starting with .
  if (name.startsWith(".")) return false;
  // Reject special characters that could cause issues
  if (/[<>:"|?*\x00-\x1f]/.test(name)) return false;
  return true;
}

/**
 * Sanitizes a file name by removing dangerous characters
 */
function sanitizeFileName(name: string): string {
  return name
    .replace(/\.\./g, "") // Remove path traversal
    .replace(/[/\\]/g, "") // Remove path separators
    .replace(/[<>:"|?*\x00-\x1f]/g, "") // Remove special characters
    .trim();
}

export async function selectFolder(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Select Notes Folder",
  });
  return selected as string | null;
}

export async function readNotesDirectory(path: string): Promise<FileNode[]> {
  try {
    const entries = await readDir(path);
    const nodes: FileNode[] = [];

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;

      const fullPath = `${path}/${entry.name}`;
      const node: FileNode = {
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory,
      };

      if (entry.isDirectory) {
        node.children = await readNotesDirectory(fullPath);
      } else if (!entry.name.endsWith(".md")) {
        continue;
      }

      nodes.push(node);
    }

    return nodes.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error("Failed to read directory:", error);
    return [];
  }
}

export async function createNote(
  folder: string,
  name: string
): Promise<string | null> {
  // Security: Validate name to prevent path traversal
  const sanitizedName = sanitizeFileName(name);
  if (!isValidName(sanitizedName)) {
    console.error("Invalid note name:", name);
    return null;
  }

  const fileName = sanitizedName.endsWith(".md") ? sanitizedName : `${sanitizedName}.md`;
  const filePath = `${folder}/${fileName}`;

  try {
    const fileExists = await exists(filePath);
    if (fileExists) {
      throw new Error("File already exists");
    }
    await writeTextFile(filePath, `# ${sanitizedName.replace(".md", "")}\n\n`);
    return filePath;
  } catch (error) {
    console.error("Failed to create note:", error);
    return null;
  }
}

/**
 * Creates or opens a daily note for the specified date
 * Daily notes are stored in a "Daily" folder with format YYYY-MM-DD.md
 */
export async function openDailyNote(
  notesFolder: string,
  date: Date = new Date()
): Promise<{ path: string; isNew: boolean } | null> {
  const dailyFolder = `${notesFolder}/Daily`;

  // Format date as YYYY-MM-DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;
  const fileName = `${dateStr}.md`;
  const filePath = `${dailyFolder}/${fileName}`;

  try {
    // Create Daily folder if it doesn't exist
    const folderExists = await exists(dailyFolder);
    if (!folderExists) {
      await mkdir(dailyFolder);
    }

    // Check if today's note exists
    const fileExists = await exists(filePath);
    if (fileExists) {
      return { path: filePath, isNew: false };
    }

    // Create new daily note with template
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
    const dayName = dayNames[date.getDay()];
    const monthName = monthNames[date.getMonth()];

    const template = `# ${dayName}, ${monthName} ${date.getDate()}, ${year}

## Tasks
- [ ]

## Notes


## Journal

`;

    await writeTextFile(filePath, template);
    return { path: filePath, isNew: true };
  } catch (error) {
    console.error("Failed to create daily note:", error);
    return null;
  }
}

export async function createFolder(
  parentPath: string,
  name: string
): Promise<string | null> {
  // Security: Validate name to prevent path traversal
  const sanitizedName = sanitizeFileName(name);
  if (!isValidName(sanitizedName)) {
    console.error("Invalid folder name:", name);
    return null;
  }

  const folderPath = `${parentPath}/${sanitizedName}`;

  try {
    await mkdir(folderPath);
    return folderPath;
  } catch (error) {
    console.error("Failed to create folder:", error);
    return null;
  }
}

export async function deleteItem(path: string): Promise<boolean> {
  try {
    await remove(path, { recursive: true });
    return true;
  } catch (error) {
    console.error("Failed to delete item:", error);
    return false;
  }
}

export async function renameItem(
  oldPath: string,
  newName: string
): Promise<string | null> {
  // Security: Validate new name to prevent path traversal
  const sanitizedName = sanitizeFileName(newName);
  if (!isValidName(sanitizedName)) {
    console.error("Invalid new name:", newName);
    return null;
  }

  const parentPath = oldPath.substring(0, oldPath.lastIndexOf("/"));
  const newPath = `${parentPath}/${sanitizedName}`;

  try {
    await rename(oldPath, newPath);
    return newPath;
  } catch (error) {
    console.error("Failed to rename item:", error);
    return null;
  }
}

export async function moveItem(
  sourcePath: string,
  targetFolder: string
): Promise<string | null> {
  // Get the file/folder name from the source path
  const itemName = sourcePath.substring(sourcePath.lastIndexOf("/") + 1);

  // Security: Validate the item name
  if (!isValidName(itemName)) {
    console.error("Invalid item name:", itemName);
    return null;
  }

  const newPath = `${targetFolder}/${itemName}`;

  // Prevent moving into itself or its own subdirectory
  if (targetFolder === sourcePath || targetFolder.startsWith(sourcePath + "/")) {
    console.error("Cannot move item into itself or its subdirectory");
    return null;
  }

  // Prevent moving to same location
  if (newPath === sourcePath) {
    console.error("Item is already in this location");
    return null;
  }

  try {
    // Check if target already exists
    const targetExists = await exists(newPath);
    if (targetExists) {
      console.error("An item with this name already exists in the target folder");
      return null;
    }

    await rename(sourcePath, newPath);
    return newPath;
  } catch (error) {
    console.error("Failed to move item:", error);
    return null;
  }
}

export async function saveImage(
  notesFolder: string,
  imageData: Uint8Array,
  fileName: string
): Promise<string | null> {
  // Security: Sanitize filename
  const sanitizedFileName = sanitizeFileName(fileName);
  if (!sanitizedFileName) {
    console.error("Invalid image filename:", fileName);
    return null;
  }

  const assetsFolder = `${notesFolder}/assets`;

  try {
    // Create assets folder if it doesn't exist
    const folderExists = await exists(assetsFolder);
    if (!folderExists) {
      await mkdir(assetsFolder);
    }

    // Generate unique filename if needed
    let finalName = sanitizedFileName;
    let counter = 1;
    while (await exists(`${assetsFolder}/${finalName}`)) {
      const ext = sanitizedFileName.lastIndexOf(".") > 0 ? sanitizedFileName.slice(sanitizedFileName.lastIndexOf(".")) : "";
      const base = sanitizedFileName.lastIndexOf(".") > 0 ? sanitizedFileName.slice(0, sanitizedFileName.lastIndexOf(".")) : sanitizedFileName;
      finalName = `${base}-${counter}${ext}`;
      counter++;
    }

    const filePath = `${assetsFolder}/${finalName}`;
    await writeFile(filePath, imageData);

    // Return relative path for markdown
    return `assets/${finalName}`;
  } catch (error) {
    console.error("Failed to save image:", error);
    return null;
  }
}

export async function saveAttachment(
  notesFolder: string,
  fileData: Uint8Array,
  fileName: string
): Promise<string | null> {
  // Security: Sanitize filename
  const sanitizedFileName = sanitizeFileName(fileName);
  if (!sanitizedFileName) {
    console.error("Invalid attachment filename:", fileName);
    return null;
  }

  const attachmentsFolder = `${notesFolder}/attachments`;

  try {
    // Create attachments folder if it doesn't exist
    const folderExists = await exists(attachmentsFolder);
    if (!folderExists) {
      await mkdir(attachmentsFolder);
    }

    // Generate unique filename if needed
    let finalName = sanitizedFileName;
    let counter = 1;
    while (await exists(`${attachmentsFolder}/${finalName}`)) {
      const ext = sanitizedFileName.lastIndexOf(".") > 0 ? sanitizedFileName.slice(sanitizedFileName.lastIndexOf(".")) : "";
      const base = sanitizedFileName.lastIndexOf(".") > 0 ? sanitizedFileName.slice(0, sanitizedFileName.lastIndexOf(".")) : sanitizedFileName;
      finalName = `${base}-${counter}${ext}`;
      counter++;
    }

    const filePath = `${attachmentsFolder}/${finalName}`;
    await writeFile(filePath, fileData);

    // Return relative path
    return `attachments/${finalName}`;
  } catch (error) {
    console.error("Failed to save attachment:", error);
    return null;
  }
}

export async function selectFile(): Promise<string | null> {
  console.log("selectFile: calling open dialog...");
  try {
    const selected = await open({
      directory: false,
      multiple: false,
      title: "Select File to Attach",
    });
    console.log("selectFile: dialog returned:", selected);
    return selected as string | null;
  } catch (error) {
    console.error("selectFile: error opening dialog:", error);
    throw error;
  }
}
