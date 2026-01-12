import { useSettingsStore } from "../../store/settingsStore";
import { selectFolder } from "../../lib/fileSystem";

export function FolderPicker() {
  const { setNotesFolder } = useSettingsStore();

  const handleSelectFolder = async () => {
    const folder = await selectFolder();
    if (folder) {
      await setNotesFolder(folder);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <div className="max-w-md w-full mx-4 p-8 bg-white dark:bg-zinc-800 rounded-xl shadow-lg">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Welcome to Jot
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-8">
            Choose a folder to store your notes. You can change this later in settings.
          </p>

          <button
            onClick={handleSelectFolder}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-800"
          >
            Select Notes Folder
          </button>

          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-500">
            Your notes are stored as Markdown files on your computer.
          </p>
        </div>
      </div>
    </div>
  );
}
